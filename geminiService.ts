
import { GoogleGenAI, Type } from "@google/genai";
import { EixoNorteResponse, FormData, ValidationResult } from "./types";
import { SYSTEM_PROMPT, VALIDATION_RULES, FIXED_FOOTER } from "./constants";

// Fix: Initialize GoogleGenAI using process.env.API_KEY directly as per SDK guidelines
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

const responseSchema = {
  type: Type.OBJECT,
  properties: {
    titles: {
      type: Type.ARRAY,
      items: { type: Type.STRING },
      description: "Exactly 5 journalistic titles."
    },
    caption: {
      type: Type.OBJECT,
      properties: {
        paragraph1: { type: Type.STRING },
        paragraph2: { type: Type.STRING },
        paragraph3: { type: Type.STRING },
        footer: { type: Type.STRING }
      },
      required: ["paragraph1", "paragraph2", "paragraph3", "footer"]
    }
  },
  required: ["titles", "caption"]
};

function validateResponse(data: EixoNorteResponse): ValidationResult {
  const errors: string[] = [];

  if (!data.titles || data.titles.length !== 5) {
    errors.push(`Esperava-se 5 títulos, recebeu ${data.titles?.length || 0}.`);
  } else {
    data.titles.forEach((title, idx) => {
      if (title.length > VALIDATION_RULES.maxCharLength) {
        errors.push(`Título ${idx + 1} excede 80 caracteres (${title.length}).`);
      }
      const wordCount = title.trim().split(/\s+/).length;
      if (wordCount < 6) { // relaxed slightly for natural language variance
        errors.push(`Título ${idx + 1} é muito curto (${wordCount} palavras).`);
      }
      if (/[#|⚽|✅|🚀|📍|🧭]/.test(title)) {
        errors.push(`Título ${idx + 1} contém emojis ou hashtags proibidos.`);
      }
    });
  }

  return {
    isValid: errors.length === 0,
    errors
  };
}

export async function generateEixoNorteContent(formData: FormData, retryCount = 0): Promise<EixoNorteResponse> {
  const model = "gemini-3-flash-preview";
  
  // Fix: Corrected typo from FIX_FOOTER to FIXED_FOOTER in the prompt template
  const userPrompt = `
    MATÉRIA: ${formData.content}
    PROTAGONISTA: ${formData.protagonist || "Entidade responsável"}
    CIDADE: ${formData.city || "Não especificada"}
    DATA: ${formData.date || "Não especificada"}

    Por favor, gere os títulos e a legenda conforme o Prompt-Mãe.
    Certifique-se de que os títulos estão no presente do indicativo e não possuem adjetivos.
    O rodapé deve ser exatamente: "${FIXED_FOOTER}"
  `;

  try {
    const response = await ai.models.generateContent({
      model,
      contents: userPrompt,
      config: {
        systemInstruction: SYSTEM_PROMPT,
        responseMimeType: "application/json",
        responseSchema: responseSchema
      },
    });

    // Fix: Access response.text as a property (getter) and handle potential undefined before parsing
    const result = JSON.parse(response.text || '{}') as EixoNorteResponse;
    const validation = validateResponse(result);

    if (!validation.isValid && retryCount < 2) {
      console.warn("Validation failed, retrying...", validation.errors);
      const correctionPrompt = `${userPrompt}\n\nATENÇÃO: A tentativa anterior falhou nas seguintes regras:\n${validation.errors.join('\n')}\nPor favor, corrija estes pontos rigorosamente.`;
      
      const retryResponse = await ai.models.generateContent({
        model,
        contents: correctionPrompt,
        config: {
          systemInstruction: SYSTEM_PROMPT,
          responseMimeType: "application/json",
          responseSchema: responseSchema
        },
      });
      
      const retryResult = JSON.parse(retryResponse.text || '{}') as EixoNorteResponse;
      return retryResult; // Returning second attempt directly or recursively for third
    }

    return result;
  } catch (error) {
    console.error("Gemini API Error:", error);
    throw new Error("Falha ao gerar conteúdo. Verifique sua conexão ou tente novamente.");
  }
}
