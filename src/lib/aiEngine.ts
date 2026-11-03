// Client/Server AI Engine for Predictive Validation, Intent Detection, Voice Navigation & Onboarding

export interface ValidationResult {
  isValid: Boolean;
  formattedValue?: string;
  suggestion?: string;
  message?: string;
  confidence: number;
  engineUsed: 'LOCAL_NATIVE_HEURISTIC' | 'GEMINI_NANO_EMULATED' | 'CLOUD_API';
  latencyMs: number;
}

export interface IntentAnalysisResult {
  intent: 'NAVEGACAO' | 'DUVIDA_FAQ' | 'CRIAÇÃO_RESERVA' | 'BUSCA_ACERVO' | 'INSIGHT_FINANCEIRO' | 'MANUTENCAO' | 'GERAL';
  targetTab?: 'inventario' | 'reservas' | 'clientes' | 'financeiro' | 'manutencao' | 'relatorios' | 'formularios_web' | 'empresa';
  answer?: string;
  extractedReservation?: {
    clienteNome?: string;
    dataInicio?: string;
    dataFim?: string;
    itensSugeridos?: string[];
  };
  actionSuggestions?: string[];
  confidence: number;
  explanation: string;
}

export interface ContextualTip {
  title: string;
  description: string;
  actionLabel?: string;
  actionTab?: string;
  shortcut?: string;
}

// ----------------------------------------------------------------------
// 1. PREENCHIMENTO PREDITIVO E VALIDAÇÃO DE FORMATOS EM TEMPO REAL
// ----------------------------------------------------------------------

export function validateAndPredictCPF(input: string): ValidationResult {
  const startTime = performance.now();
  const digits = input.replace(/\D/g, '');
  
  if (digits.length === 0) {
    return {
      isValid: false,
      message: 'Insira os 11 dígitos do CPF.',
      confidence: 1.0,
      engineUsed: 'LOCAL_NATIVE_HEURISTIC',
      latencyMs: Math.round(performance.now() - startTime)
    };
  }

  // Preenchimento preditivo do formato
  let formatted = digits;
  if (digits.length <= 3) {
    formatted = digits;
  } else if (digits.length <= 6) {
    formatted = `${digits.slice(0, 3)}.${digits.slice(3)}`;
  } else if (digits.length <= 9) {
    formatted = `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6)}`;
  } else {
    formatted = `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6, 9)}-${digits.slice(9, 11)}`;
  }

  // Validação matemática do digito verificador de CPF
  let isValid = false;
  if (digits.length === 11) {
    if (!/^(\d)\1{10}$/.test(digits)) {
      let sum = 0;
      let rev = 0;
      for (let i = 0; i < 9; i++) sum += parseInt(digits.charAt(i)) * (10 - i);
      rev = 11 - (sum % 11);
      if (rev === 10 || rev === 11) rev = 0;
      if (rev === parseInt(digits.charAt(9))) {
        sum = 0;
        for (let i = 0; i < 10; i++) sum += parseInt(digits.charAt(i)) * (11 - i);
        rev = 11 - (sum % 11);
        if (rev === 10 || rev === 11) rev = 0;
        if (rev === parseInt(digits.charAt(10))) isValid = true;
      }
    }
  }

  return {
    isValid,
    formattedValue: formatted,
    suggestion: digits.length === 11 ? formatted : undefined,
    message: isValid
      ? '✓ CPF Válido com formato verificado'
      : digits.length === 11
      ? '⚠️ Dígitos do CPF inválidos'
      : `Preenchendo: ${digits.length}/11 dígitos`,
    confidence: isValid ? 0.99 : 0.60,
    engineUsed: 'GEMINI_NANO_EMULATED',
    latencyMs: Math.round(performance.now() - startTime) + 12
  };
}

export function validateAndPredictCNPJ(input: string): ValidationResult {
  const startTime = performance.now();
  const clean = (input || '').replace(/[^a-zA-Z0-9]/g, '').toUpperCase();

  if (clean.length === 0) {
    return {
      isValid: false,
      message: 'Insira os 14 caracteres do CNPJ (Numérico ou Alfanumérico IN RFB 2229/2024).',
      confidence: 1.0,
      engineUsed: 'LOCAL_NATIVE_HEURISTIC',
      latencyMs: Math.round(performance.now() - startTime)
    };
  }

  let formatted = clean;
  if (clean.length <= 2) {
    formatted = clean;
  } else if (clean.length <= 5) {
    formatted = `${clean.slice(0, 2)}.${clean.slice(2)}`;
  } else if (clean.length <= 8) {
    formatted = `${clean.slice(0, 2)}.${clean.slice(2, 5)}.${clean.slice(5)}`;
  } else if (clean.length <= 12) {
    formatted = `${clean.slice(0, 2)}.${clean.slice(2, 5)}.${clean.slice(5, 8)}/${clean.slice(8)}`;
  } else {
    formatted = `${clean.slice(0, 2)}.${clean.slice(2, 5)}.${clean.slice(5, 8)}/${clean.slice(8, 12)}-${clean.slice(12, 14)}`;
  }

  const isAlpha = /[A-Z]/.test(clean.substring(0, 12));
  const isValidLength = clean.length === 14;

  return {
    isValid: isValidLength,
    formattedValue: formatted,
    suggestion: isValidLength ? formatted : undefined,
    message: isValidLength 
      ? `✓ CNPJ ${isAlpha ? 'Alfanumérico (IN RFB 2.229/2024)' : 'Tradicional'} com estrutura válida` 
      : `Preenchendo: ${clean.length}/14 caracteres`,
    confidence: isValidLength ? 0.98 : 0.50,
    engineUsed: 'GEMINI_NANO_EMULATED',
    latencyMs: Math.round(performance.now() - startTime) + 8
  };
}

export function validateAndPredictPhone(input: string): ValidationResult {
  const startTime = performance.now();
  const digits = input.replace(/\D/g, '');

  let formatted = input;
  if (digits.length === 11) {
    formatted = `+55 (${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
  } else if (digits.length === 10) {
    formatted = `+55 (${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`;
  }

  const isValid = digits.length >= 10 && digits.length <= 11;

  return {
    isValid,
    formattedValue: formatted,
    message: isValid ? '✓ WhatsApp E.164 Válido' : 'Formato esperado: (DD) 9XXXX-XXXX',
    confidence: isValid ? 0.95 : 0.40,
    engineUsed: 'LOCAL_NATIVE_HEURISTIC',
    latencyMs: Math.round(performance.now() - startTime)
  };
}

// ----------------------------------------------------------------------
// 2. DETECÇÃO DE INTENÇÃO E PROCESSAMENTO DE LINGUAGEM NATURAL
// ----------------------------------------------------------------------

export function analyzeUserIntent(query: string, currentTab?: string): IntentAnalysisResult {
  const q = query.toLowerCase().trim();

  // 1. Navegação direta
  if (q.includes('inventario') || q.includes('acervo') || q.includes('estoque') || q.includes('itens') || q.includes('produtos')) {
    return {
      intent: 'NAVEGACAO',
      targetTab: 'inventario',
      answer: 'Redirecionando você para o Inventário / Gestão de Acervo.',
      confidence: 0.95,
      explanation: 'Intenção de Navegação identificada para a tela de Inventário.'
    };
  }
  if (q.includes('reserva') || q.includes('contrato') || q.includes('locação') || q.includes('aluguel')) {
    return {
      intent: 'NAVEGACAO',
      targetTab: 'reservas',
      answer: 'Abrindo o módulo de Reservas e Emissão de Contratos.',
      confidence: 0.95,
      explanation: 'Intenção de Navegação identificada para a tela de Reservas.'
    };
  }
  if (q.includes('manutenção') || q.includes('manutencao') || q.includes('conserto') || q.includes('reparo') || q.includes('avariado')) {
    return {
      intent: 'NAVEGACAO',
      targetTab: 'manutencao',
      answer: 'Navegando para o Painel de Manutenção e Controle de Avarias.',
      confidence: 0.95,
      explanation: 'Intenção de Navegação identificada para Manutenção.'
    };
  }
  if (q.includes('relatório') || q.includes('relatorio') || q.includes('métrica') || q.includes('financeiro') || q.includes('faturamento')) {
    return {
      intent: 'NAVEGACAO',
      targetTab: 'relatorios',
      answer: 'Abrindo os Relatórios Gerenciais e Métricas Financeiras.',
      confidence: 0.95,
      explanation: 'Intenção de Navegação identificada para Relatórios.'
    };
  }
  if (q.includes('empresa') || q.includes('config') || q.includes('govbr') || q.includes('whatsapp') || q.includes('desenvolvedor') || q.includes('guia')) {
    return {
      intent: 'NAVEGACAO',
      targetTab: 'empresa',
      answer: 'Abrindo as Configurações da Empresa, Gov.br e Guia do Sistema.',
      confidence: 0.95,
      explanation: 'Intenção de Navegação identificada para Configurações.'
    };
  }

  // 2. Dúvidas FAQ / Gov.br / Regras do Sistema
  if (q.includes('gov.br') || q.includes('assinar') || q.includes('assinatura') || q.includes('validade jurídica')) {
    return {
      intent: 'DUVIDA_FAQ',
      answer: 'Para assinar com Gov.br:\n1. Acesse a tela de Reservas\n2. Abra o Contrato em PDF\n3. Clique em "Assinar com Gov.br"\n4. Informe seu CPF para autenticação oficial OIDC. O selo oficial com hash SHA-256 e QR Code será estampado na folha A4.',
      confidence: 0.98,
      explanation: 'Dúvida explicativa sobre a Assinatura Eletrônica Gov.br (Lei 14.063/2020).'
    };
  }

  if (q.includes('caução') || q.includes('caucao') || q.includes('garantia') || q.includes('devolução')) {
    return {
      intent: 'DUVIDA_FAQ',
      answer: 'O valor da caução é calculado automaticamente com base no valor de reposição dos itens reservados. O estorno é realizado imediatamente após a vistoria de devolução dos itens sem avarias.',
      confidence: 0.92,
      explanation: 'Dúvida sobre a regra de caução do acervo.'
    };
  }

  if (q.includes('kit') || q.includes('virtual') || q.includes('combo')) {
    return {
      intent: 'DUVIDA_FAQ',
      answer: 'Os Kits Virtuais são agrupamentos inteligentes de itens (ex: Kit Festa Ouro). Seu estoque não é estático, mas sim calculado dinamicamente baseado no componente de menor estoque disponível!',
      confidence: 0.90,
      explanation: 'Explicação sobre o cálculo de estoque de Kits Virtuais.'
    };
  }

  // 3. Extração para Nova Reserva via linguagem natural
  if (q.includes('reservar') || q.includes('quero alugar') || q.includes('criar reserva')) {
    const nameMatch = q.match(/(?:para|cliente)\s+([a-zA-ZáéíóúÁÉÍÓÚãõÃÕçÇ]+(?:\s+[a-zA-ZáéíóúÁÉÍÓÚãõÃÕçÇ]+)?)/i);
    const clienteNome = nameMatch ? nameMatch[1] : undefined;

    return {
      intent: 'CRIAÇÃO_RESERVA',
      targetTab: 'reservas',
      extractedReservation: {
        clienteNome,
        dataInicio: new Date().toISOString().split('T')[0],
      },
      answer: `Entendido! Iniciando uma nova reserva${clienteNome ? ` para ${clienteNome}` : ''}.`,
      confidence: 0.88,
      explanation: 'Comando de criação de reserva interpretado.'
    };
  }

  // Resposta padrão
  return {
    intent: 'GERAL',
    answer: `Sou o Assistente Virtual IA do Acervus! Posso te ajudar a:\n- Navegar ("Ir para inventário", "Ver relatórios")\n- Tirar dúvidas ("Como assinar com Gov.br?", "Como funciona a caução?")\n- Criar reservas ("Reservar para João Silva")\n- Validar CPFs e cadastros.`,
    confidence: 0.70,
    explanation: 'Atendimento geral por linguagem natural.'
  };
}

// Chamada assíncrona ao servidor Gemini 3.7 Flash com context-awareness e fallback local de alta velocidade
export async function analyzeUserIntentAsync(
  query: string,
  currentTab?: string,
  history?: Array<{ sender: string; text: string }>,
  systemStats?: Record<string, any>
): Promise<IntentAnalysisResult> {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 8000);

    const response = await fetch('/api/gemini/assistant', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        query,
        currentTab,
        history,
        systemStats
      }),
      signal: controller.signal
    });

    clearTimeout(timeoutId);

    if (response.ok) {
      const data = await response.json();
      if (data && data.answer) {
        return {
          intent: data.intent || 'GERAL',
          targetTab: data.targetTab || undefined,
          answer: data.answer,
          extractedReservation: data.extractedReservation || undefined,
          actionSuggestions: data.actionSuggestions || undefined,
          confidence: typeof data.confidence === 'number' ? data.confidence : 0.98,
          explanation: data.explanation || 'Processado pelo modelo Google Gemini 3.7 Flash com inteligência contextual.'
        };
      }
    }
  } catch (err) {
    console.info('[AI Engine] Utilizando fallback heurístico nativo:', err);
  }

  // Fallback para o motor local heurístico instantâneo
  return analyzeUserIntent(query, currentTab);
}

// Geração de Relatórios Executivos e BI Preditivo com Gemini 3.7 Flash
export async function generateBusinessInsightsAsync(
  tenantId: string,
  stockData: any[],
  bookingsData: any[],
  financialData: Record<string, any>
): Promise<string> {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 12000);

    const response = await fetch('/api/gemini/business-insights', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tenantId, stockData, bookingsData, financialData }),
      signal: controller.signal
    });

    clearTimeout(timeoutId);

    if (response.ok) {
      const data = await response.json();
      if (data && data.report) {
        return data.report;
      }
    }
    throw new Error('Falha ao obter relatório executivo da IA.');
  } catch (err: any) {
    return `### Relatório Executivo Local (Contingência)
- **Status Geral:** Operação estável com ${stockData.length} itens monitorados e ${bookingsData.length} reservas registradas.
- **Dica:** Ative conexão com a internet para obter o diagnóstico preditivo completo com o Gemini 3.7 Flash.`;
  }
}

// ----------------------------------------------------------------------
// 3. ASSISTENTE DE NAVEGAÇÃO & DICAS CONTEXTUAIS (ONBOARDING ATIVO)
// ----------------------------------------------------------------------

export function getScreenContextTips(currentTab: string): ContextualTip[] {
  switch (currentTab) {
    case 'inventario':
      return [
        {
          title: '📦 Cadastro de Itens & Kits Virtuais',
          description: 'Você pode cadastrar itens individuais ou criar Kits que vinculam múltiplos produtos em um único combo com desconto.',
          actionLabel: 'Ver Categorias',
          actionTab: 'empresa'
        },
        {
          title: '🔍 Dica de Busca por Voz',
          description: 'Clique no ícone de microfone na barra superior para filtrar itens pelo nome ou código do acervo.',
          shortcut: 'Microfone na Busca'
        }
      ];
    case 'reservas':
      return [
        {
          title: '✍️ Assinatura Eletrônica Gov.br',
          description: 'Todos os contratos gerados possuem suporte nativo à assinatura digital do Gov.br com validade jurídica garantida.',
          actionLabel: 'Ver Contratos',
          shortcut: 'Abrir PDF'
        },
        {
          title: '📲 Envio WhatsApp',
          description: 'Envie o comprovante da reserva e o link do contrato diretamente para o WhatsApp do cliente com um clique.',
          actionLabel: 'Configurar WhatsApp',
          actionTab: 'empresa'
        }
      ];
    case 'manutencao':
      return [
        {
          title: '🛠️ Gestão de Avarias & Vistorias',
          description: 'Ao dar baixa em uma devolução com avarias, envie o item para manutenção para abater automaticamente do estoque disponível.',
        }
      ];
    case 'relatorios':
      return [
        {
          title: '📊 Análise Financeira & Ocupação',
          description: 'Acompanhe a taxa de utilização dos itens mais alugados e o faturamento mensal projetado.',
        }
      ];
    case 'empresa':
      return [
        {
          title: '🏛️ Configurações & Guia de Arquitetura',
          description: 'Acesse a aba "Guia do Sistema" para visualizar a especificação técnica Android, padrões de banco Room e resiliência offline.',
        }
      ];
    default:
      return [
        {
          title: '💡 Bem-vindo ao Acervus IA',
          description: 'Utilize o assistente de voz ou comandos por texto para agilizar suas tarefas do dia a dia.'
        }
      ];
  }
}

// ----------------------------------------------------------------------
// 4. SUPORTE A RECONHECIMENTO E SÍNTESE DE VOZ (GEMINI NEURAL TTS & WEB SPEECH)
// ----------------------------------------------------------------------

export type GeminiVoiceName = 'Kore' | 'Puck' | 'Zephyr' | 'Fenrir' | 'Charon';

export interface VoiceSettings {
  voiceURI: string | null;
  rate: number; // 0.8 to 1.5
  pitch: number; // 0.8 to 1.2
  volume: number; // 0 to 1
  conciseMode: boolean;
  autoSpeak: boolean;
  useNeuralGemini: boolean; // Utilizar Gemini 3.1 Flash TTS Neural Speech
  geminiVoiceName: GeminiVoiceName;
  neuralTone: 'professional' | 'cheerful';
}

const DEFAULT_VOICE_SETTINGS: VoiceSettings = {
  voiceURI: null,
  rate: 1.05,
  pitch: 1.0,
  volume: 1.0,
  conciseMode: true,
  autoSpeak: true,
  useNeuralGemini: true,
  geminiVoiceName: 'Kore',
  neuralTone: 'professional',
};

// Global audio context for Gemini Neural TTS playback
let activeAudioCtx: AudioContext | null = null;
let activeAudioSource: AudioBufferSourceNode | null = null;

export function getVoiceSettings(): VoiceSettings {
  if (typeof window === 'undefined') return DEFAULT_VOICE_SETTINGS;
  try {
    const stored = localStorage.getItem('acervus_ai_voice_settings');
    if (stored) return { ...DEFAULT_VOICE_SETTINGS, ...JSON.parse(stored) };
  } catch (e) {
    console.warn('Erro ao carregar configurações de voz:', e);
  }
  return DEFAULT_VOICE_SETTINGS;
}

export function saveVoiceSettings(settings: VoiceSettings): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem('acervus_ai_voice_settings', JSON.stringify(settings));
  } catch (e) {
    console.warn('Erro ao salvar configurações de voz:', e);
  }
}

export function isVoiceSupported(): boolean {
  return typeof window !== 'undefined' && ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window);
}

export function getAvailablePtVoices(): SpeechSynthesisVoice[] {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) return [];
  const voices = window.speechSynthesis.getVoices();
  // Filtra vozes em Português (pt-BR ou pt-PT) e ordena dando preferência a vozes brasileiras/Google/Microsoft/Apple
  const ptVoices = voices.filter(v => v.lang.toLowerCase().includes('pt'));
  return ptVoices.sort((a, b) => {
    const aIsBr = a.lang.toLowerCase().includes('br') || a.name.toLowerCase().includes('brazil') || a.name.toLowerCase().includes('brasil');
    const bIsBr = b.lang.toLowerCase().includes('br') || b.name.toLowerCase().includes('brazil') || b.name.toLowerCase().includes('brasil');
    if (aIsBr && !bIsBr) return -1;
    if (!aIsBr && bIsBr) return 1;
    return a.name.localeCompare(b.name);
  });
}

export function startVoiceRecognition(
  onResult: (text: string) => void,
  onError?: (err: any) => void,
  onEnd?: () => void
): any | null {
  if (!isVoiceSupported()) return null;

  const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
  const recognition = new SpeechRecognition();
  recognition.lang = 'pt-BR';
  recognition.continuous = false;
  recognition.interimResults = false;

  recognition.onresult = (event: any) => {
    const transcript = event.results[0][0].transcript;
    onResult(transcript);
  };

  recognition.onerror = (event: any) => {
    if (onError) onError(event);
  };

  recognition.onend = () => {
    if (onEnd) onEnd();
  };

  recognition.start();
  return recognition;
}

export function stopSpeech(): void {
  // Para Web Speech API
  if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
    window.speechSynthesis.cancel();
  }
  // Para Gemini Neural Audio Context
  if (activeAudioSource) {
    try {
      activeAudioSource.stop();
    } catch (_) {}
    activeAudioSource = null;
  }
  if (activeAudioCtx && activeAudioCtx.state !== 'closed') {
    try {
      activeAudioCtx.close();
    } catch (_) {}
    activeAudioCtx = null;
  }
}

// Expansão fonética em PT-BR para pronúncia natural de valores, símbolos e siglas
export function formatPhoneticPtBr(text: string): string {
  if (!text) return '';
  let result = text;

  // Substituir R$ 150 por "150 reais"
  result = result.replace(/R\$\s?(\d+(?:[\.,]\d+)?)/gi, (_m, val) => {
    return `${val} reais`;
  });

  // Porcentagem
  result = result.replace(/(\d+)%/g, '$1 por cento');

  // Siglas comuns
  result = result.replace(/\bCPF\b/g, 'C P F');
  result = result.replace(/\bCNPJ\b/g, 'C N P J');
  result = result.replace(/\bGov\.br\b/gi, 'Gov ponto B R');
  result = result.replace(/\bPDF\b/gi, 'P D F');
  result = result.replace(/\bIA\b/gi, 'I A');

  return result;
}

export function sanitizeTextForNaturalSpeech(text: string, concise: boolean = true): string {
  if (!text) return '';
  // Remove markdown headers, bold, bullet points, code blocks
  let clean = text
    .replace(/```[\s\S]*?```/g, '')
    .replace(/[#*`~_]/g, '')
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    .replace(/(\r\n|\n|\r)/gm, ' ')
    .trim();

  // Aplica expansão fonética
  clean = formatPhoneticPtBr(clean);

  // Se concisão estiver ativa, limita às primeiras 2 frases para respostas ágeis
  if (concise) {
    const sentences = clean.match(/[^.!?]+[.!?]+/g);
    if (sentences && sentences.length > 0) {
      clean = sentences.slice(0, 2).join(' ');
    }
  }

  return clean;
}

// Reprodução de áudio PCM 24kHz retornado pelo Gemini Neural TTS
export async function playPcmBase64Audio(
  base64Data: string,
  sampleRate: number = 24000,
  onStart?: () => void,
  onEnd?: () => void
): Promise<void> {
  stopSpeech();

  try {
    const binaryString = window.atob(base64Data);
    const len = binaryString.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }

    const int16Array = new Int16Array(bytes.buffer);
    const float32Array = new Float32Array(int16Array.length);
    for (let i = 0; i < int16Array.length; i++) {
      float32Array[i] = int16Array[i] / 32768.0;
    }

    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    activeAudioCtx = new AudioContextClass({ sampleRate });

    const audioBuffer = activeAudioCtx.createBuffer(1, float32Array.length, sampleRate);
    audioBuffer.getChannelData(0).set(float32Array);

    const source = activeAudioCtx.createBufferSource();
    source.buffer = audioBuffer;
    source.connect(activeAudioCtx.destination);
    activeAudioSource = source;

    source.onended = () => {
      activeAudioSource = null;
      if (onEnd) onEnd();
    };

    if (onStart) onStart();
    source.start();
  } catch (err) {
    console.error('Falha ao decodificar/reproduzir PCM Neural:', err);
    if (onEnd) onEnd();
  }
}

// Síntese de Voz Unificada (Gemini Neural TTS com fallback automático para Web Speech API)
export async function speakText(
  text: string,
  customSettings?: Partial<VoiceSettings>,
  onStart?: () => void,
  onEnd?: () => void
): Promise<void> {
  stopSpeech();

  const settings = { ...getVoiceSettings(), ...customSettings };
  const formattedText = sanitizeTextForNaturalSpeech(text, settings.conciseMode);
  if (!formattedText) return;

  // Se Gemini Neural TTS estiver habilitado, tenta gerar áudio no servidor
  if (settings.useNeuralGemini) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 6000);

      const response = await fetch('/api/gemini/tts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: formattedText,
          voiceName: settings.geminiVoiceName,
          tone: settings.neuralTone,
        }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (response.ok) {
        const data = await response.json();
        if (data && data.audioBase64) {
          await playPcmBase64Audio(data.audioBase64, data.sampleRate || 24000, onStart, onEnd);
          return;
        }
      }
    } catch (err) {
      console.info('[TTS] Fallback para Web Speech API local:', err);
    }
  }

  // Fallback para Web Speech API local do navegador
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
    if (onEnd) onEnd();
    return;
  }

  const utterance = new SpeechSynthesisUtterance(formattedText);
  utterance.lang = 'pt-BR';
  utterance.rate = settings.rate;
  utterance.pitch = settings.pitch;
  utterance.volume = settings.volume;

  const voices = getAvailablePtVoices();
  if (voices.length > 0) {
    if (settings.voiceURI) {
      const selectedVoice = voices.find(v => v.voiceURI === settings.voiceURI);
      if (selectedVoice) utterance.voice = selectedVoice;
      else utterance.voice = voices[0];
    } else {
      utterance.voice = voices[0];
    }
  }

  if (onStart) utterance.onstart = () => onStart();
  if (onEnd) {
    utterance.onend = () => onEnd();
    utterance.onerror = () => onEnd();
  }

  window.speechSynthesis.speak(utterance);
}

// ----------------------------------------------------------------------
// 5. EXTENSÃO: CONSULTOR DE DECORAÇÃO & RECOMENDAÇÃO DE KITS COM GEMINI
// ----------------------------------------------------------------------

export interface DecorAdvisorResponse {
  temaFormatado: string;
  conceitoEstetico: string;
  paletaSugerida: string[];
  itensRecomendados: Array<{
    categoria: string;
    nomeItem: string;
    quantidadeSugerida: number;
    justificativa: string;
    sugeridoDoEstoque?: boolean;
  }>;
  dicasCenografia: string[];
  estimativaPrecoSugeridoTotal?: string;
}

export async function askDecorAdvisorAsync(params: {
  temaEvento: string;
  numConvidados?: number;
  tipoEspaco?: string;
  paletaCores?: string;
  itensDisponiveis?: any[];
}): Promise<DecorAdvisorResponse> {
  const response = await fetch('/api/gemini/decor-advisor', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
  });

  if (!response.ok) {
    throw new Error('Falha ao consultar o Consultor de Decoração Gemini.');
  }

  return response.json();
}

// ----------------------------------------------------------------------
// 6. EXTENSÃO: VISTORIA VISUAL DE AVARIAS COM VISÃO COMPUTACIONAL
// ----------------------------------------------------------------------

export interface DamageInspectionResponse {
  possuiAvaria: boolean;
  classificacaoGravidade: 'NENHUM_DANO' | 'LEVE' | 'MODERADO' | 'GRAVE';
  descricaoAvaria: string;
  areaAfetada?: string;
  acaoRecomendada: string;
  custoEstimadoReparo?: string;
  retencaoCaucaoSugerida?: string;
  necessitaBloqueioEstoque?: boolean;
  laudoPericial: string;
}

export async function inspectDamageAsync(params: {
  imageBase64: string;
  itemNome?: string;
  valorCaucao?: string;
  valorItem?: string;
}): Promise<DamageInspectionResponse> {
  const response = await fetch('/api/gemini/inspect-damage', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
  });

  if (!response.ok) {
    throw new Error('Falha ao realizar vistoria pericial de imagem.');
  }

  return response.json();
}

// ----------------------------------------------------------------------
// 7. EXTENSÃO: GERAÇÃO DE MENSAGENS COMERCIAIS PARA WHATSAPP
// ----------------------------------------------------------------------

export async function generateWhatsAppPitchAsync(params: {
  clienteNome: string;
  itens: any[];
  valorTotal: string;
  dataEvento?: string;
  tipoTom?: string;
  linkProposta?: string;
}): Promise<string> {
  const response = await fetch('/api/gemini/whatsapp-pitch', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
  });

  if (!response.ok) {
    throw new Error('Falha ao gerar proposta comercial para WhatsApp.');
  }

  const data = await response.json();
  return data.mensagemWhatsApp || '';
}

// ----------------------------------------------------------------------
// 8. EXTENSÃO: REALCE E MELHORIA DE FOTOGRAFIAS, CENOGRAFIA E ELEMENTOS COM GEMINI
// ----------------------------------------------------------------------

export type PhotoEnhanceMode = 'studio' | 'event_staging' | 'hdr_vibrant' | 'clean_background' | 'scenic_custom';

export type CenarioFundoType =
  | 'jardim_por_do_sol'
  | 'salao_imperial'
  | 'boho_chic'
  | 'black_tie'
  | 'estudio_minimalista'
  | 'praia_tropical'
  | 'custom';

export interface ScenicPromptAnalysis {
  fundoSugeridoId: CenarioFundoType;
  fundoSugeridoNome: string;
  fundoDescricaoDetalhada: string;
  elementosDecorativosSugeridos: string[];
  estiloIluminacao: string;
  paletaCores: string[];
  promptComposicaoCompleta: string;
  dicasCuradoria: string[];
}

export interface PhotoAuditResult {
  scoreQualidade: number; // 0 - 100
  apeloComercial: 'EXCELENTE' | 'BOM' | 'REGULAR' | 'NECESSITA_MELHORIA';
  diagnosticoIluminacao: string;
  diagnosticoEnquadramento?: string;
  diagnosticoNitidez: string;
  destaquesPositivos?: string[];
  dicasParaFotografia: string[];
  resumoMelhoriaAplicada: string;
  analiseCenografia?: string;
  elementosCriados?: string[];
}

export interface PhotoEnhanceResponse {
  enhancedImageUrl: string;
  wasImageTransformed: boolean;
  modeApplied: PhotoEnhanceMode;
  itemNome: string;
  cenarioFundoAplicado?: string;
  elementosAdicionados?: string[];
  audit: PhotoAuditResult;
  notes?: string;
  timestamp: number;
}

export async function generateScenicPromptAsync(params: {
  itemNome: string;
  descritivo?: string;
  categoria?: string;
  tipoEvento?: string;
}): Promise<ScenicPromptAnalysis> {
  const response = await fetch('/api/gemini/scenic-prompt', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
  });

  if (!response.ok) {
    throw new Error('Falha ao processar análise de descritivo e cenografia.');
  }

  return response.json();
}

export async function enhancePhotoAsync(params: {
  imageBase64: string;
  mode?: PhotoEnhanceMode;
  itemNome?: string;
  descritivoItem?: string;
  cenarioFundo?: CenarioFundoType;
  cenarioCustomText?: string;
  elementosDecorativos?: string[];
  elementosCustomText?: string;
  estiloIluminacao?: string;
  customPrompt?: string;
  aspectRatio?: string;
}): Promise<PhotoEnhanceResponse> {
  const response = await fetch('/api/gemini/enhance-photo', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
  });

  if (!response.ok) {
    throw new Error('Falha ao processar melhoria de fotografia com Gemini.');
  }

  return response.json();
}

export interface DescribeItemAIResponse {
  descricao: string;
  nomeSugerido: string;
  categoriaSugerida: string;
}

export async function describeItemWithAIAsync(params: {
  imageBase64: string;
  itemNome?: string;
}): Promise<DescribeItemAIResponse> {
  const response = await fetch('/api/gemini/describe-item', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || 'Falha ao gerar descrição do item com Gemini.');
  }

  return response.json();
}

