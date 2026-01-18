
import React, { useState, useCallback, useEffect } from 'react';
import { generateEixoNorteContent } from './geminiService';
import { FormData, EixoNorteResponse } from './types';
import { FIXED_FOOTER } from './constants';

const App: React.FC = () => {
  const [formData, setFormData] = useState<FormData>({
    content: '',
    protagonist: '',
    city: '',
    date: ''
  });
  const [loading, setLoading] = useState(false);
  const [generatingTitles, setGeneratingTitles] = useState(false);
  const [result, setResult] = useState<EixoNorteResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<{ message: string; visible: boolean }>({ message: '', visible: false });

  const showToast = (message: string) => {
    setToast({ message, visible: true });
  };

  useEffect(() => {
    if (toast.visible) {
      const timer = setTimeout(() => setToast(prev => ({ ...prev, visible: false })), 3000);
      return () => clearTimeout(timer);
    }
  }, [toast.visible]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleGenerate = async () => {
    if (!formData.content.trim()) {
      setError('Por favor, insira o texto da matéria.');
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const data = await generateEixoNorteContent(formData);
      setResult(data);
    } catch (err: any) {
      setError(err.message || 'Erro inesperado.');
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateNewTitles = async () => {
    if (!result || !formData.content) return;
    
    setGeneratingTitles(true);
    try {
      // We pass a hint to change perspectives
      const modifiedFormData = {
        ...formData,
        content: `Mantenha a matéria original, mas forneça 5 NOVOS títulos com perspectivas diferentes dos anteriores (que foram: ${result.titles.join(' | ')}). Foque em outros ganchos jornalísticos. Mantendo as mesmas regras de estilo.`
      };
      const data = await generateEixoNorteContent(modifiedFormData);
      setResult(prev => prev ? { ...prev, titles: data.titles } : data);
      showToast('Novos títulos gerados com sucesso!');
    } catch (err: any) {
      showToast('Erro ao gerar novos títulos.');
    } finally {
      setGeneratingTitles(false);
    }
  };

  const copyToClipboard = useCallback((text: string, label: string) => {
    navigator.clipboard.writeText(text);
    showToast(`${label} copiado!`);
  }, []);

  const getFullCaptionText = useCallback(() => {
    if (!result) return '';
    const { paragraph1, paragraph2, paragraph3, footer } = result.caption;
    return `${paragraph1}\n\n${paragraph2}\n\n${paragraph3}\n\n${footer}`;
  }, [result]);

  const getFullPlainText = useCallback(() => {
    if (!result) return '';
    let text = `TÍTULOS SUGERIDOS:\n${result.titles.map((t, i) => `${i + 1}. ${t}`).join('\n')}\n\n`;
    text += `LEGENDA:\n${getFullCaptionText()}`;
    return text;
  }, [result, getFullCaptionText]);

  return (
    <div className="min-h-screen p-4 md:p-8 max-w-5xl mx-auto">
      {/* Toast Notification */}
      <div className={`fixed bottom-8 left-1/2 transform -translate-x-1/2 z-50 transition-all duration-300 ${toast.visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10 pointer-events-none'}`}>
        <div className="bg-gray-900 text-white px-6 py-3 rounded-full shadow-2xl flex items-center gap-3">
          <svg className="w-5 h-5 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path></svg>
          <span className="font-medium">{toast.message}</span>
        </div>
      </div>

      <header className="mb-8 border-b border-gray-200 pb-6 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-extrabold text-blue-900 tracking-tight">eixoNORTE <span className="text-blue-500 italic font-medium">Generator</span></h1>
          <p className="text-gray-500 mt-1">Ferramenta IA para criação de conteúdos do eixoNORTE</p>
        </div>
        <div className="hidden md:block">
           <span className="bg-blue-100 text-blue-800 text-xs font-semibold px-2.5 py-0.5 rounded border border-blue-400 uppercase tracking-widest">Modo Ramon Ultra</span>
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Input Section */}
        <section className="space-y-6">
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
            <label className="block text-sm font-semibold text-gray-700 mb-2">Texto da Matéria / Release *</label>
            <textarea
              name="content"
              value={formData.content}
              onChange={handleInputChange}
              rows={8}
              className="w-full p-4 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all text-sm"
              placeholder="Cole aqui o texto completo da matéria..."
            />
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Protagonista</label>
                <input
                  type="text"
                  name="protagonist"
                  value={formData.protagonist}
                  onChange={handleInputChange}
                  className="w-full p-2 border border-gray-200 rounded focus:ring-1 focus:ring-blue-500 outline-none text-sm"
                  placeholder="Ex: Toninho Colucci"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Cidade</label>
                <input
                  type="text"
                  name="city"
                  value={formData.city}
                  onChange={handleInputChange}
                  className="w-full p-2 border border-gray-200 rounded focus:ring-1 focus:ring-blue-500 outline-none text-sm"
                  placeholder="Ex: Ilhabela"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Data</label>
                <input
                  type="text"
                  name="date"
                  value={formData.date}
                  onChange={handleInputChange}
                  className="w-full p-2 border border-gray-200 rounded focus:ring-1 focus:ring-blue-500 outline-none text-sm"
                  placeholder="Ex: Terça-feira"
                />
              </div>
            </div>

            <button
              onClick={handleGenerate}
              disabled={loading}
              className={`w-full mt-8 py-4 px-6 rounded-lg font-bold text-white transition-all transform active:scale-95 flex items-center justify-center gap-2 ${
                loading ? 'bg-gray-400 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700 shadow-lg shadow-blue-200'
              }`}
            >
              {loading ? (
                <>
                  <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                  Processando...
                </>
              ) : 'GERAR CONTEÚDO AGORA'}
            </button>
            {error && <p className="mt-4 text-red-500 text-sm font-medium italic">⚠️ {error}</p>}
          </div>
        </section>

        {/* Output Section */}
        <section>
          {result ? (
            <div className="space-y-6">
              <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 relative">
                <div className="flex justify-between items-center mb-6">
                  <h2 className="text-xl font-bold text-gray-800">Resultados Gerados</h2>
                  <button
                    onClick={() => copyToClipboard(getFullPlainText(), 'Conteúdo completo')}
                    className="text-xs px-3 py-1.5 bg-gray-100 text-gray-600 rounded-lg hover:bg-gray-200 font-bold transition-colors flex items-center gap-2"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3"></path></svg>
                    COPIAR TUDO
                  </button>
                </div>

                <div className="space-y-8">
                  <div>
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-sm font-bold text-blue-800 uppercase tracking-widest flex items-center gap-2">
                        <span className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></span>
                        Títulos Sugeridos
                      </h3>
                    </div>
                    
                    <div className="space-y-3">
                      {result.titles.map((title, idx) => (
                        <div key={idx} className="group relative flex items-center gap-3 p-4 bg-gray-50 rounded-xl border border-gray-100 hover:border-blue-300 hover:bg-blue-50/30 transition-all duration-200">
                          <span className="font-black text-blue-200 text-lg leading-none">{idx + 1}</span>
                          <p className="text-sm text-gray-800 leading-relaxed font-semibold flex-1 pr-12">{title}</p>
                          <button 
                            onClick={() => copyToClipboard(title, `Título ${idx + 1}`)}
                            className="absolute right-3 p-2 text-gray-400 hover:text-blue-600 transition-colors bg-white rounded-lg shadow-sm border border-gray-100"
                            title="Copiar este título"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 002-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"></path></svg>
                          </button>
                        </div>
                      ))}
                    </div>

                    <button
                      onClick={handleGenerateNewTitles}
                      disabled={generatingTitles}
                      className={`w-full mt-4 py-3 border-2 border-dashed border-blue-200 rounded-xl text-blue-600 font-bold text-xs uppercase tracking-widest hover:bg-blue-50 transition-colors flex items-center justify-center gap-2 ${generatingTitles ? 'opacity-50 cursor-not-allowed' : ''}`}
                    >
                      {generatingTitles ? (
                        <svg className="animate-spin h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                      ) : (
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path></svg>
                      )}
                      GERAR NOVAS SUGESTÕES DE TÍTULOS
                    </button>
                  </div>

                  <div className="border-t border-gray-100 pt-8">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-sm font-bold text-blue-800 uppercase tracking-widest flex items-center gap-2">
                        <span className="w-2 h-2 bg-blue-500 rounded-full"></span>
                        Legenda Sugerida
                      </h3>
                      <button 
                        onClick={() => copyToClipboard(getFullCaptionText(), 'Legenda')}
                        className="text-xs px-3 py-1.5 bg-green-50 text-green-700 rounded-lg hover:bg-green-100 font-bold transition-colors flex items-center gap-2"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 002-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"></path></svg>
                        COPIAR LEGENDA
                      </button>
                    </div>
                    <div className="bg-blue-50/50 p-6 rounded-2xl border border-blue-100 text-sm text-gray-700 space-y-4 whitespace-pre-wrap leading-relaxed shadow-inner">
                      <p className="font-medium">{result.caption.paragraph1}</p>
                      <p>{result.caption.paragraph2}</p>
                      <p>{result.caption.paragraph3}</p>
                      <div className="text-gray-500 font-bold border-t border-blue-100 pt-4 mt-6 text-xs uppercase tracking-tight">
                        {result.caption.footer}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-gray-100 border-2 border-dashed border-gray-300 rounded-xl h-full min-h-[500px] flex flex-col items-center justify-center text-gray-400 p-8 text-center">
              <div className="w-20 h-20 bg-white rounded-full flex items-center justify-center shadow-sm mb-6">
                <svg className="w-10 h-10 opacity-20" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"></path></svg>
              </div>
              <p className="font-bold text-xl text-gray-500">Pronto para transformar?</p>
              <p className="text-sm max-w-xs mt-3 leading-relaxed">Insira o release da matéria e gere conteúdo otimizado para as redes sociais seguindo o padrão editorial v5.0.</p>
            </div>
          )}
        </section>
      </div>

      <footer className="mt-16 pt-8 border-t border-gray-200 text-center">
        <p className="text-xs text-gray-400 font-medium tracking-widest uppercase">
          &copy; 2024 eixoNORTE Generator • Inteligência Artificial de Elite • v5.0
        </p>
      </footer>
    </div>
  );
};

export default App;
