
export interface EixoNorteResponse {
  titles: string[];
  caption: {
    paragraph1: string;
    paragraph2: string;
    paragraph3: string;
    footer: string;
  };
}

export interface FormData {
  content: string;
  protagonist: string;
  city: string;
  date: string;
}

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
}
