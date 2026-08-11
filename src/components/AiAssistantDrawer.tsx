import React, { useState, useEffect, useRef } from 'react';
import {
  Sparkles,
  Mic,
  MicOff,
  Send,
  X,
  Bot,
  User,
  Zap,
  HelpCircle,
  CheckCircle2,
  Volume2,
  VolumeX,
  Compass,
  ArrowRight,
  Brain,
  ShieldCheck,
  Check,
  AlertCircle,
  Sliders,
  Play,
  Square as SquareIcon,
  Radio
} from 'lucide-react';
import {
  analyzeUserIntent,
  getScreenContextTips,
  isVoiceSupported,
  startVoiceRecognition,
  speakText,
  stopSpeech,
  getVoiceSettings,
  saveVoiceSettings,
  getAvailablePtVoices,
  VoiceSettings,
  validateAndPredictCPF,
  validateAndPredictCNPJ,
  validateAndPredictPhone,
  IntentAnalysisResult,
  ContextualTip
} from '../lib/aiEngine';

interface AiAssistantDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  currentTab: string;
  onNavigateTab: (tab: string) => void;
  onOpenNovaReserva?: (clienteNome?: string) => void;
}

interface ChatMessage {
  id: string;
  sender: 'user' | 'ai';
  text: string;
  intentResult?: IntentAnalysisResult;
  timestamp: string;
}

export const AiAssistantDrawer: React.FC<AiAssistantDrawerProps> = ({
  isOpen,
  onClose,
  currentTab,
  onNavigateTab,
  onOpenNovaReserva
}) => {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: '1',
      sender: 'ai',
      text: 'Olá! Sou o Assistente IA do Acervus. Posso te ajudar com preenchimento preditivo, navegação por voz, tirar dúvidas sobre o Gov.br ou criar reservas por texto!',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    }
  ]);
  const [inputText, setInputText] = useState('');
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [ttsEnabled, setTtsEnabled] = useState(true);
  const [activeSubView, setActiveSubView] = useState<'chat' | 'voice' | 'tips' | 'playground'>('chat');

  // Voice Settings State
  const [voiceConfig, setVoiceConfig] = useState<VoiceSettings>(getVoiceSettings());
  const [availableVoices, setAvailableVoices] = useState<SpeechSynthesisVoice[]>([]);

  // Playground state
  const [testCpf, setTestCpf] = useState('');
  const [testCnpj, setTestCnpj] = useState('');
  const [testPhone, setTestPhone] = useState('');

  const chatEndRef = useRef<HTMLDivElement>(null);
  const tips = getScreenContextTips(currentTab);

  // Carrega vozes do sistema
  useEffect(() => {
    const loadVoices = () => {
      const ptVoices = getAvailablePtVoices();
      setAvailableVoices(ptVoices);
    };

    loadVoices();
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.onvoiceschanged = loadVoices;
    }
  }, []);

  useEffect(() => {
    if (chatEndRef.current) {
      chatEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, activeSubView]);

  if (!isOpen) return null;

  const updateVoiceSettings = (updated: Partial<VoiceSettings>) => {
    const newConfig = { ...voiceConfig, ...updated };
    setVoiceConfig(newConfig);
    saveVoiceSettings(newConfig);
  };

  const handleTestVoice = () => {
    stopSpeech();
    setIsSpeaking(true);
    speakText(
      'Olá! Esta é uma demonstração da voz humanizada e expressiva do sistema Acervus. Como posso ajudar com seu acervo hoje?',
      voiceConfig,
      () => setIsSpeaking(true),
      () => setIsSpeaking(false)
    );
  };

  const handleSendMessage = (textToSend?: string) => {
    const query = (textToSend || inputText).trim();
    if (!query) return;

    // Barge-in: Para qualquer áudio em andamento imediatamente
    stopSpeech();
    setIsSpeaking(false);

    const userMsg: ChatMessage = {
      id: Date.now().toString(),
      sender: 'user',
      text: query,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    setMessages(prev => [...prev, userMsg]);
    if (!textToSend) setInputText('');

    // Analisa intenção usando o Motor de IA
    setTimeout(() => {
      const intentRes = analyzeUserIntent(query, currentTab);

      const aiMsg: ChatMessage = {
        id: (Date.now() + 1).toString(),
        sender: 'ai',
        text: intentRes.answer || 'Como posso te ajudar?',
        intentResult: intentRes,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };

      setMessages(prev => [...prev, aiMsg]);

      // Síntese de voz se ativada
      if (ttsEnabled && intentRes.answer) {
        setIsSpeaking(true);
        speakText(
          intentRes.answer,
          voiceConfig,
          () => setIsSpeaking(true),
          () => setIsSpeaking(false)
        );
      }

      // Se for intenção de navegação
      if (intentRes.intent === 'NAVEGACAO' && intentRes.targetTab) {
        onNavigateTab(intentRes.targetTab);
      } else if (intentRes.intent === 'CRIAÇÃO_RESERVA' && onOpenNovaReserva) {
        onOpenNovaReserva(intentRes.extractedReservation?.clienteNome);
      }
    }, 350);
  };

  const toggleVoiceInput = () => {
    if (!isVoiceSupported()) {
      alert('Seu navegador não possui suporte nativo para entrada por voz via Web Speech API.');
      return;
    }

    if (isListening) {
      setIsListening(false);
      return;
    }

    // Barge-in: Interrupt any ongoing TTS immediately when user initiates voice
    stopSpeech();
    setIsSpeaking(false);

    setIsListening(true);
    startVoiceRecognition(
      (transcript) => {
        setIsListening(false);
        setInputText(transcript);
        handleSendMessage(transcript);
      },
      (err) => {
        console.warn('Erro na captura de voz:', err);
        setIsListening(false);
      },
      () => {
        setIsListening(false);
      }
    );
  };

  const cpfResult = validateAndPredictCPF(testCpf);
  const cnpjResult = validateAndPredictCNPJ(testCnpj);
  const phoneResult = validateAndPredictPhone(testPhone);

  return (
    <div className="fixed inset-y-0 right-0 w-full sm:w-[460px] bg-[#0A0A0B] border-l border-[#27272A] shadow-2xl z-50 flex flex-col animate-slideLeft">
      {/* Drawer Header */}
      <div className="p-4 bg-[#111113] border-b border-[#27272A] flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#D4AF37] to-[#8B7326] flex items-center justify-center text-black font-bold shadow-lg shadow-[#D4AF37]/20">
            <Sparkles size={20} />
          </div>
          <div>
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              Assistente IA Acervus
              <span className="text-[10px] bg-emerald-500/10 text-emerald-400 px-2 py-0.5 rounded border border-emerald-500/20 font-mono">
                Audio Engine v2
              </span>
            </h3>
            <p className="text-[11px] text-[#A1A1AA]">Predição, Voz Expressiva & Barge-In</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              if (ttsEnabled) {
                stopSpeech();
                setIsSpeaking(false);
              }
              setTtsEnabled(!ttsEnabled);
            }}
            title={ttsEnabled ? "Voz ativada (clique para silenciar)" : "Voz desativada (clique para ativar)"}
            className={`p-2 rounded-lg border transition-colors ${
              ttsEnabled
                ? 'bg-[#18181B] border-[#D4AF37]/40 text-[#D4AF37]'
                : 'bg-[#18181B] border-[#27272A] text-[#71717A]'
            }`}
          >
            {ttsEnabled ? <Volume2 size={16} /> : <VolumeX size={16} />}
          </button>

          <button
            onClick={() => {
              stopSpeech();
              setIsSpeaking(false);
              onClose();
            }}
            className="p-2 text-[#71717A] hover:text-white rounded-lg hover:bg-[#18181B] transition-colors"
          >
            <X size={18} />
          </button>
        </div>
      </div>

      {/* Dynamic Waveform Visualizer Bar (Visible when Speaking or Listening) */}
      {(isSpeaking || isListening) && (
        <div className={`px-4 py-2 border-b flex items-center justify-between transition-all ${
          isSpeaking 
            ? 'bg-[#D4AF37]/10 border-[#D4AF37]/30 text-[#D4AF37]' 
            : 'bg-red-500/10 border-red-500/30 text-red-400'
        }`}>
          <div className="flex items-center gap-2 text-xs font-mono font-bold">
            <Radio size={14} className="animate-pulse" />
            <span>{isSpeaking ? 'IA Falando...' : 'Escutando Voz (Barge-In Ativo)...'}</span>
          </div>

          {/* Animated Equalizer Waveform Bars */}
          <div className="flex items-end gap-1 h-4">
            <span className="w-1 bg-current rounded-full animate-bounce h-2" style={{ animationDelay: '0ms' }}></span>
            <span className="w-1 bg-current rounded-full animate-bounce h-4" style={{ animationDelay: '150ms' }}></span>
            <span className="w-1 bg-current rounded-full animate-bounce h-3" style={{ animationDelay: '300ms' }}></span>
            <span className="w-1 bg-current rounded-full animate-bounce h-4" style={{ animationDelay: '450ms' }}></span>
            <span className="w-1 bg-current rounded-full animate-bounce h-2" style={{ animationDelay: '200ms' }}></span>
          </div>

          <button
            onClick={() => {
              stopSpeech();
              setIsSpeaking(false);
              setIsListening(false);
            }}
            className="text-[10px] font-mono underline hover:opacity-80"
          >
            Interromper
          </button>
        </div>
      )}

      {/* Sub Tabs Selector */}
      <div className="flex items-center justify-between px-2 py-2 bg-[#111113]/80 border-b border-[#27272A] text-[11px] font-mono overflow-x-auto no-scrollbar">
        <button
          onClick={() => setActiveSubView('chat')}
          className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg font-bold transition-all shrink-0 ${
            activeSubView === 'chat'
              ? 'bg-[#D4AF37]/10 text-[#D4AF37] border border-[#D4AF37]/30'
              : 'text-[#A1A1AA] hover:text-white'
          }`}
        >
          <Bot size={13} /> Conversa
        </button>

        <button
          onClick={() => setActiveSubView('voice')}
          className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg font-bold transition-all shrink-0 ${
            activeSubView === 'voice'
              ? 'bg-[#D4AF37]/10 text-[#D4AF37] border border-[#D4AF37]/30'
              : 'text-[#A1A1AA] hover:text-white'
          }`}
        >
          <Sliders size={13} /> Voz e Áudio
        </button>

        <button
          onClick={() => setActiveSubView('tips')}
          className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg font-bold transition-all shrink-0 ${
            activeSubView === 'tips'
              ? 'bg-[#D4AF37]/10 text-[#D4AF37] border border-[#D4AF37]/30'
              : 'text-[#A1A1AA] hover:text-white'
          }`}
        >
          <Compass size={13} /> Dicas
        </button>

        <button
          onClick={() => setActiveSubView('playground')}
          className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg font-bold transition-all shrink-0 ${
            activeSubView === 'playground'
              ? 'bg-[#D4AF37]/10 text-[#D4AF37] border border-[#D4AF37]/30'
              : 'text-[#A1A1AA] hover:text-white'
          }`}
        >
          <Zap size={13} /> Validador
        </button>
      </div>

      {/* Drawer Body */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* SUBVIEW 1: CHAT & VOICE */}
        {activeSubView === 'chat' && (
          <div className="space-y-4">
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex gap-3 ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                {msg.sender === 'ai' && (
                  <div className="w-7 h-7 rounded-lg bg-[#D4AF37]/10 border border-[#D4AF37]/30 text-[#D4AF37] flex items-center justify-center shrink-0 mt-0.5">
                    <Bot size={15} />
                  </div>
                )}

                <div className={`max-w-[85%] space-y-2`}>
                  <div
                    className={`p-3.5 rounded-2xl text-xs leading-relaxed ${
                      msg.sender === 'user'
                        ? 'bg-[#D4AF37] text-black font-medium rounded-tr-none shadow-md'
                        : 'bg-[#18181B] text-[#E4E4E7] border border-[#27272A] rounded-tl-none whitespace-pre-line'
                    }`}
                  >
                    {msg.text}
                  </div>

                  {/* Intent Action Pill if recognized */}
                  {msg.intentResult && msg.intentResult.targetTab && (
                    <div className="flex items-center gap-2 pt-1">
                      <button
                        onClick={() => onNavigateTab(msg.intentResult!.targetTab!)}
                        className="text-[11px] font-mono bg-[#111113] hover:bg-[#27272A] text-[#D4AF37] px-3 py-1.5 rounded-xl border border-[#D4AF37]/30 flex items-center gap-1.5 transition-all shadow-sm"
                      >
                        <span>Ir para {msg.intentResult.targetTab.toUpperCase()}</span>
                        <ArrowRight size={12} />
                      </button>
                    </div>
                  )}

                  {msg.intentResult && msg.intentResult.extractedReservation && onOpenNovaReserva && (
                    <div className="flex items-center gap-2 pt-1">
                      <button
                        onClick={() => onOpenNovaReserva(msg.intentResult?.extractedReservation?.clienteNome)}
                        className="text-[11px] font-mono bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 px-3 py-1.5 rounded-xl border border-emerald-500/30 flex items-center gap-1.5 transition-all shadow-sm"
                      >
                        <span>Abrir Form de Reserva</span>
                        <ArrowRight size={12} />
                      </button>
                    </div>
                  )}

                  <span className="text-[10px] text-[#71717A] font-mono block px-1">
                    {msg.timestamp}
                  </span>
                </div>

                {msg.sender === 'user' && (
                  <div className="w-7 h-7 rounded-lg bg-[#27272A] text-white flex items-center justify-center shrink-0 mt-0.5">
                    <User size={15} />
                  </div>
                )}
              </div>
            ))}
            <div ref={chatEndRef} />
          </div>
        )}

        {/* SUBVIEW 2: VOICE & AUDIO ENGINE CONFIGURATION */}
        {activeSubView === 'voice' && (
          <div className="space-y-4 animate-fadeIn">
            <div className="bg-[#111113] border border-[#D4AF37]/30 p-4 rounded-xl space-y-2">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold text-white flex items-center gap-2">
                  <Sliders className="text-[#D4AF37]" size={16} /> Configurações de Voz e Prosódia
                </h4>
                <span className="text-[10px] bg-[#D4AF37]/10 text-[#D4AF37] px-2 py-0.5 rounded font-mono border border-[#D4AF37]/20">
                  Audio Engine v2
                </span>
              </div>
              <p className="text-[11px] text-[#A1A1AA]">
                Personalize o timbre, velocidade de fala e respostas sintetizadas para navegação por voz.
              </p>
            </div>

            {/* Test Voice Control */}
            <div className="bg-[#18181B] border border-[#27272A] p-4 rounded-xl space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-white">Demonstração da Voz</span>
                <button
                  onClick={handleTestVoice}
                  className="flex items-center gap-1.5 bg-gradient-to-r from-[#D4AF37] to-[#8B7326] text-black font-bold px-3 py-1.5 rounded-lg text-xs transition-all shadow cursor-pointer active:scale-95"
                >
                  <Play size={13} />
                  <span>Testar Voz da IA</span>
                </button>
              </div>
            </div>

            {/* Voice Engine Selector */}
            <div className="bg-[#18181B] border border-[#27272A] p-4 rounded-xl space-y-2">
              <label className="text-xs font-bold text-white block">
                Sintetizador de Voz (Engine)
              </label>
              <select
                value={voiceConfig.voiceURI || ''}
                onChange={(e) => updateVoiceSettings({ voiceURI: e.target.value || null })}
                className="w-full bg-[#0A0A0B] border border-[#27272A] focus:border-[#D4AF37] text-xs text-white p-2.5 rounded-lg outline-none font-mono"
              >
                <option value="">-- Padrão do Sistema (Mais Natural) --</option>
                {availableVoices.map((v) => (
                  <option key={v.voiceURI} value={v.voiceURI}>
                    {v.name} ({v.lang})
                  </option>
                ))}
              </select>
              <p className="text-[10px] text-[#71717A]">
                Detectadas {availableVoices.length} vozes no idioma Português no dispositivo.
              </p>
            </div>

            {/* Speech Rate Slider */}
            <div className="bg-[#18181B] border border-[#27272A] p-4 rounded-xl space-y-2">
              <div className="flex justify-between items-center text-xs font-bold text-white">
                <span>Velocidade de Fala (Cadência)</span>
                <span className="font-mono text-[#D4AF37]">{voiceConfig.rate.toFixed(2)}x</span>
              </div>
              <input
                type="range"
                min="0.8"
                max="1.4"
                step="0.05"
                value={voiceConfig.rate}
                onChange={(e) => updateVoiceSettings({ rate: parseFloat(e.target.value) })}
                className="w-full accent-[#D4AF37] cursor-pointer"
              />
              <div className="flex justify-between text-[10px] text-[#71717A] font-mono">
                <span>Lenta (0.8x)</span>
                <span>Normal (1.0x)</span>
                <span>Rápida (1.4x)</span>
              </div>
            </div>

            {/* Pitch Slider */}
            <div className="bg-[#18181B] border border-[#27272A] p-4 rounded-xl space-y-2">
              <div className="flex justify-between items-center text-xs font-bold text-white">
                <span>Tom de Voz (Pitch)</span>
                <span className="font-mono text-[#D4AF37]">{voiceConfig.pitch.toFixed(1)}</span>
              </div>
              <input
                type="range"
                min="0.8"
                max="1.2"
                step="0.1"
                value={voiceConfig.pitch}
                onChange={(e) => updateVoiceSettings({ pitch: parseFloat(e.target.value) })}
                className="w-full accent-[#D4AF37] cursor-pointer"
              />
              <div className="flex justify-between text-[10px] text-[#71717A] font-mono">
                <span>Grave (0.8)</span>
                <span>Natural (1.0)</span>
                <span>Agudo (1.2)</span>
              </div>
            </div>

            {/* Concise Responses Toggle */}
            <div className="bg-[#18181B] border border-[#27272A] p-4 rounded-xl flex items-center justify-between">
              <div>
                <h5 className="text-xs font-bold text-white">Respostas Curtas e Objetivas</h5>
                <p className="text-[10px] text-[#71717A]">
                  Limita respostas por voz às 2 primeiras frases cruciais para maior agilidade.
                </p>
              </div>
              <input
                type="checkbox"
                checked={voiceConfig.conciseMode}
                onChange={(e) => updateVoiceSettings({ conciseMode: e.target.checked })}
                className="w-4 h-4 accent-[#D4AF37] rounded cursor-pointer"
              />
            </div>
          </div>
        )}

        {/* SUBVIEW 3: CONTEXTUAL TIPS & ONBOARDING */}
        {activeSubView === 'tips' && (
          <div className="space-y-4 animate-fadeIn">
            <div className="bg-[#111113] border border-[#27272A] p-4 rounded-xl space-y-2">
              <span className="text-[10px] font-mono text-[#D4AF37] uppercase font-bold">
                Contexto Atual da Tela
              </span>
              <h4 className="text-sm font-bold text-white capitalize">
                Módulo: {currentTab}
              </h4>
              <p className="text-xs text-[#A1A1AA]">
                O assistente identificou a aba ativa e separou as principais dicas de navegação e automação.
              </p>
            </div>

            <div className="space-y-3">
              {tips.map((tip, idx) => (
                <div
                  key={idx}
                  className="bg-[#18181B] border border-[#27272A] p-4 rounded-xl space-y-2 hover:border-[#D4AF37]/40 transition-all"
                >
                  <h5 className="text-xs font-bold text-white flex items-center justify-between">
                    <span>{tip.title}</span>
                    {tip.shortcut && (
                      <span className="text-[9px] font-mono bg-[#0A0A0B] text-[#D4AF37] px-2 py-0.5 rounded border border-[#27272A]">
                        {tip.shortcut}
                      </span>
                    )}
                  </h5>
                  <p className="text-xs text-[#A1A1AA] leading-relaxed">
                    {tip.description}
                  </p>

                  {tip.actionTab && (
                    <button
                      onClick={() => onNavigateTab(tip.actionTab!)}
                      className="text-[11px] font-mono text-[#D4AF37] hover:underline flex items-center gap-1 pt-1"
                    >
                      <span>{tip.actionLabel || 'Acessar Módulo'}</span>
                      <ArrowRight size={12} />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* SUBVIEW 4: PREDICTIVE VALIDATOR PLAYGROUND */}
        {activeSubView === 'playground' && (
          <div className="space-y-4 animate-fadeIn">
            <div className="bg-[#111113] border border-[#27272A] p-4 rounded-xl space-y-2">
              <h4 className="text-xs font-bold text-white flex items-center gap-2">
                <Brain className="text-[#D4AF37]" size={16} /> Playground do Motor de Validação Preditiva
              </h4>
              <p className="text-[11px] text-[#A1A1AA]">
                Digite números abaixo para ver o preenchimento preditivo e a validação em tempo real simulados via motor de IA local.
              </p>
            </div>

            {/* Teste CPF */}
            <div className="bg-[#18181B] border border-[#27272A] p-4 rounded-xl space-y-2">
              <label className="text-xs font-bold text-white flex items-center justify-between">
                <span>1. Validação de CPF</span>
                <span className="text-[10px] font-mono text-[#D4AF37]">{cpfResult.engineUsed}</span>
              </label>
              <input
                type="text"
                value={testCpf}
                onChange={(e) => setTestCpf(e.target.value)}
                placeholder="Digite o CPF (ex: 12345678901)"
                className="w-full bg-[#0A0A0B] border border-[#27272A] focus:border-[#D4AF37] text-xs text-white p-2.5 rounded-lg outline-none font-mono"
              />
              {cpfResult.formattedValue && (
                <div className="flex items-center justify-between text-[11px] font-mono bg-[#0A0A0B] p-2 rounded border border-[#27272A]">
                  <span className="text-[#71717A]">Formatado Preditivo:</span>
                  <span className="text-emerald-400 font-bold">{cpfResult.formattedValue}</span>
                </div>
              )}
              <div className="flex items-center gap-2 text-[11px] font-mono">
                {cpfResult.isValid ? (
                  <span className="text-emerald-400 flex items-center gap-1">
                    <CheckCircle2 size={13} /> {cpfResult.message}
                  </span>
                ) : (
                  <span className="text-amber-400 flex items-center gap-1">
                    <AlertCircle size={13} /> {cpfResult.message}
                  </span>
                )}
                <span className="text-[10px] text-[#71717A] ml-auto">{cpfResult.latencyMs}ms</span>
              </div>
            </div>

            {/* Teste CNPJ */}
            <div className="bg-[#18181B] border border-[#27272A] p-4 rounded-xl space-y-2">
              <label className="text-xs font-bold text-white flex items-center justify-between">
                <span>2. Validação de CNPJ</span>
                <span className="text-[10px] font-mono text-[#D4AF37]">{cnpjResult.engineUsed}</span>
              </label>
              <input
                type="text"
                value={testCnpj}
                onChange={(e) => setTestCnpj(e.target.value)}
                placeholder="Digite o CNPJ (ex: 12345678000195)"
                className="w-full bg-[#0A0A0B] border border-[#27272A] focus:border-[#D4AF37] text-xs text-white p-2.5 rounded-lg outline-none font-mono"
              />
              {cnpjResult.formattedValue && (
                <div className="flex items-center justify-between text-[11px] font-mono bg-[#0A0A0B] p-2 rounded border border-[#27272A]">
                  <span className="text-[#71717A]">Formatado Preditivo:</span>
                  <span className="text-cyan-400 font-bold">{cnpjResult.formattedValue}</span>
                </div>
              )}
            </div>

            {/* Teste WhatsApp E.164 */}
            <div className="bg-[#18181B] border border-[#27272A] p-4 rounded-xl space-y-2">
              <label className="text-xs font-bold text-white flex items-center justify-between">
                <span>3. Validação de Telefone / E.164</span>
                <span className="text-[10px] font-mono text-[#D4AF37]">{phoneResult.engineUsed}</span>
              </label>
              <input
                type="text"
                value={testPhone}
                onChange={(e) => setTestPhone(e.target.value)}
                placeholder="Digite o telefone (ex: 11999998888)"
                className="w-full bg-[#0A0A0B] border border-[#27272A] focus:border-[#D4AF37] text-xs text-white p-2.5 rounded-lg outline-none font-mono"
              />
              {phoneResult.formattedValue && (
                <div className="flex items-center justify-between text-[11px] font-mono bg-[#0A0A0B] p-2 rounded border border-[#27272A]">
                  <span className="text-[#71717A]">E.164 Internacional:</span>
                  <span className="text-emerald-400 font-bold">{phoneResult.formattedValue}</span>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Drawer Input Footer */}
      {activeSubView === 'chat' && (
        <div className="p-3 bg-[#111113] border-t border-[#27272A] shrink-0 space-y-2">
          {/* Quick Prompts */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-[11px] font-mono scrollbar-none">
            <button
              onClick={() => handleSendMessage('Como assinar com Gov.br?')}
              className="bg-[#18181B] hover:bg-[#27272A] text-[#A1A1AA] hover:text-white px-2.5 py-1 rounded-lg border border-[#27272A] whitespace-nowrap shrink-0"
            >
              Como assinar com Gov.br?
            </button>
            <button
              onClick={() => handleSendMessage('Ir para inventário')}
              className="bg-[#18181B] hover:bg-[#27272A] text-[#A1A1AA] hover:text-white px-2.5 py-1 rounded-lg border border-[#27272A] whitespace-nowrap shrink-0"
            >
              Ir para Inventário
            </button>
            <button
              onClick={() => handleSendMessage('Como funciona a caução?')}
              className="bg-[#18181B] hover:bg-[#27272A] text-[#A1A1AA] hover:text-white px-2.5 py-1 rounded-lg border border-[#27272A] whitespace-nowrap shrink-0"
            >
              Regra da Caução
            </button>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={toggleVoiceInput}
              title={isListening ? "Escutando... (clique para parar)" : "Digitar por voz"}
              className={`p-2.5 rounded-xl border transition-all cursor-pointer ${
                isListening
                  ? 'bg-red-500/20 border-red-500 text-red-400 animate-pulse'
                  : 'bg-[#18181B] border-[#27272A] text-[#A1A1AA] hover:text-white hover:border-[#D4AF37]/50'
              }`}
            >
              {isListening ? <MicOff size={18} /> : <Mic size={18} />}
            </button>

            <input
              type="text"
              value={inputText}
              onChange={(e) => {
                if (isSpeaking) {
                  stopSpeech();
                  setIsSpeaking(false);
                }
                setInputText(e.target.value);
              }}
              onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
              placeholder={isListening ? "Escutando sua voz..." : "Pergunte ou comande por texto..."}
              className="flex-1 bg-[#18181B] border border-[#27272A] focus:border-[#D4AF37] text-xs text-white px-3 py-2.5 rounded-xl outline-none"
            />

            <button
              onClick={() => handleSendMessage()}
              className="p-2.5 bg-[#D4AF37] hover:bg-[#B8962E] text-black font-bold rounded-xl transition-all shadow-md shadow-[#D4AF37]/20 cursor-pointer active:scale-95"
            >
              <Send size={18} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
