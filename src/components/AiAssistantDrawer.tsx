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
  CheckCircle2,
  Volume2,
  VolumeX,
  Compass,
  ArrowRight,
  Brain,
  ShieldCheck,
  AlertCircle,
  Sliders,
  Play,
  Square as SquareIcon,
  Radio,
  Palette,
  Camera,
  Upload,
  Image as ImageIcon,
  FileText,
  Check,
  Loader2,
  Wand2,
  Layers,
  DollarSign,
  Download,
  SlidersHorizontal,
  RefreshCw,
  Eye,
  Maximize2
} from 'lucide-react';
import {
  analyzeUserIntent,
  analyzeUserIntentAsync,
  getScreenContextTips,
  isVoiceSupported,
  startVoiceRecognition,
  speakText,
  stopSpeech,
  getVoiceSettings,
  saveVoiceSettings,
  getAvailablePtVoices,
  VoiceSettings,
  GeminiVoiceName,
  validateAndPredictCPF,
  validateAndPredictCNPJ,
  validateAndPredictPhone,
  IntentAnalysisResult,
  ContextualTip,
  askDecorAdvisorAsync,
  DecorAdvisorResponse,
  inspectDamageAsync,
  DamageInspectionResponse,
  generateWhatsAppPitchAsync,
  enhancePhotoAsync,
  generateScenicPromptAsync,
  PhotoEnhanceMode,
  PhotoEnhanceResponse,
  ScenicPromptAnalysis,
  CenarioFundoType
} from '../lib/aiEngine';
import { ItemAcervo, Cliente } from '../types';
import { formatarMoeda } from '../utils/whatsappTemplates';

interface AiAssistantDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  currentTab: string;
  onNavigateTab: (tab: string) => void;
  onOpenNovaReserva?: (clienteNome?: string) => void;
  itens?: ItemAcervo[];
  clientes?: Cliente[];
  onEditItem?: (item: ItemAcervo) => void;
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
  onOpenNovaReserva,
  itens = [],
  clientes = [],
  onEditItem
}) => {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: '1',
      sender: 'ai',
      text: 'Olá! Sou o Copiloto IA do Acervus. Posso navegar por voz, sugerir decorações para eventos, auditar avarias por foto, realçar fotos de acervo em estúdio virtual e criar orçamentos instantaneamente!',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    }
  ]);
  const [inputText, setInputText] = useState('');
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isThinking, setIsThinking] = useState(false);
  const [ttsEnabled, setTtsEnabled] = useState(true);
  const [activeSubView, setActiveSubView] = useState<'chat' | 'voice' | 'decor' | 'inspection' | 'photo_enhance' | 'tips' | 'playground'>('chat');

  // Voice Settings State
  const [voiceConfig, setVoiceConfig] = useState<VoiceSettings>(getVoiceSettings());
  const [availableVoices, setAvailableVoices] = useState<SpeechSynthesisVoice[]>([]);

  // Decor Advisor State
  const [decorTema, setDecorTema] = useState('Casamento Rústico Chic');
  const [decorConvidados, setDecorConvidados] = useState(80);
  const [decorEspaco, setDecorEspaco] = useState('Chácara ao ar livre com tenda');
  const [decorPaleta, setDecorPaleta] = useState('Madeira nobre, verde eucalipto e dourado');
  const [decorLoading, setDecorLoading] = useState(false);
  const [decorResult, setDecorResult] = useState<DecorAdvisorResponse | null>(null);

  // Damage Inspection State
  const [inspectImage, setInspectImage] = useState<string | null>(null);
  const [inspectItemNome, setInspectItemNome] = useState(itens[0]?.nome || 'Mesa Rústica Imperial 3m');
  const [inspectCaucao, setInspectCaucao] = useState('R$ 300,00');
  const [inspectLoading, setInspectLoading] = useState(false);
  const [inspectResult, setInspectResult] = useState<DamageInspectionResponse | null>(null);

  // Photo Enhancement & Scenic Composition State
  const [photoSourceImage, setPhotoSourceImage] = useState<string | null>(null);
  const [photoItemNome, setPhotoItemNome] = useState<string>(itens[0]?.nome || 'Mesa Rústica Imperial');
  const [photoDescritivo, setPhotoDescritivo] = useState<string>(itens[0]?.descricao || 'Mesa rústica em madeira maciça com acabamento nobre, ideal para casamentos e eventos ao ar livre.');
  const [photoEnhanceMode, setPhotoEnhanceMode] = useState<PhotoEnhanceMode>('event_staging');
  const [photoCenarioFundo, setPhotoCenarioFundo] = useState<CenarioFundoType>('jardim_por_do_sol');
  const [photoCenarioCustomText, setPhotoCenarioCustomText] = useState('');
  const [photoElementosDecorativos, setPhotoElementosDecorativos] = useState<string[]>(['arranjos_florais', 'velas_lustres']);
  const [photoElementosCustomText, setPhotoElementosCustomText] = useState('');
  const [photoEstiloIluminacao, setPhotoEstiloIluminacao] = useState('Dourada suave de fim de tarde (Golden Hour) com reflexos quentes');
  const [photoCustomPrompt, setPhotoCustomPrompt] = useState('');
  const [photoAspectRatio, setPhotoAspectRatio] = useState('1:1');
  const [photoLoading, setPhotoLoading] = useState(false);
  const [scenicAnalysisLoading, setScenicAnalysisLoading] = useState(false);
  const [scenicAnalysisResult, setScenicAnalysisResult] = useState<ScenicPromptAnalysis | null>(null);
  const [photoResult, setPhotoResult] = useState<PhotoEnhanceResponse | null>(null);
  const [photoComparisonMode, setPhotoComparisonMode] = useState<'split' | 'side_by_side' | 'enhanced_only' | 'original_only'>('split');
  const [splitSliderPos, setSplitSliderPos] = useState(50);
  const [selectedTargetItemId, setSelectedTargetItemId] = useState<number | null>(itens[0]?.id || null);
  const [applySuccessNotice, setApplySuccessNotice] = useState<string | null>(null);

  // Playground state
  const [testCpf, setTestCpf] = useState('');
  const [testCnpj, setTestCnpj] = useState('');
  const [testPhone, setTestPhone] = useState('');

  const chatEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const photoFileInputRef = useRef<HTMLInputElement>(null);
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

  const handleTestVoice = async () => {
    stopSpeech();
    setIsSpeaking(true);
    await speakText(
      'Olá! Esta é uma demonstração da voz neural do Google Gemini no Acervus Core. Pronta para otimizar suas locações e eventos!',
      voiceConfig,
      () => setIsSpeaking(true),
      () => setIsSpeaking(false)
    );
  };

  const handleSendMessage = async (textToSend?: string) => {
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
    setIsThinking(true);

    try {
      const history = messages.slice(-6).map(m => ({ sender: m.sender, text: m.text }));
      const systemStats = {
        totalItens: itens.length,
        totalClientes: clientes.length,
        moduloAtual: currentTab
      };
      const intentRes = await analyzeUserIntentAsync(query, currentTab, history, systemStats);

      const aiMsg: ChatMessage = {
        id: (Date.now() + 1).toString(),
        sender: 'ai',
        text: intentRes.answer || 'Como posso te ajudar?',
        intentResult: intentRes,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };

      setMessages(prev => [...prev, aiMsg]);
      setIsThinking(false);

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
    } catch (err) {
      console.error('Erro ao processar mensagem com IA:', err);
      setIsThinking(false);
    }
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

  // Handler para Execução do Consultor de Decoração
  const handleConsultarDecoracao = async () => {
    if (!decorTema.trim()) return;
    setDecorLoading(true);
    setDecorResult(null);

    try {
      const res = await askDecorAdvisorAsync({
        temaEvento: decorTema,
        numConvidados: decorConvidados,
        tipoEspaco: decorEspaco,
        paletaCores: decorPaleta,
        itensDisponiveis: itens
      });
      setDecorResult(res);

      if (ttsEnabled && res.conceitoEstetico) {
        setIsSpeaking(true);
        speakText(
          `Para o tema ${res.temaFormatado}, criei uma proposta visual com ${res.itensRecomendados.length} recomendações de mobiliário. ${res.conceitoEstetico.slice(0, 180)}`,
          voiceConfig,
          () => setIsSpeaking(true),
          () => setIsSpeaking(false)
        );
      }
    } catch (err: any) {
      alert(err.message || 'Erro ao gerar composição de decoração.');
    } finally {
      setDecorLoading(false);
    }
  };

  // Handler para Upload de Imagem de Vistoria
  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setInspectImage(reader.result as string);
        setInspectResult(null);
      };
      reader.readAsDataURL(file);
    }
  };

  // Handler para Vistoria com Visão Computacional
  const handleExecutarVistoria = async () => {
    if (!inspectImage) {
      alert('Por favor, carregue uma foto da peça para análise pericial.');
      return;
    }
    setInspectLoading(true);
    setInspectResult(null);

    try {
      const res = await inspectDamageAsync({
        imageBase64: inspectImage,
        itemNome: inspectItemNome,
        valorCaucao: inspectCaucao,
        valorItem: 'R$ 650,00'
      });
      setInspectResult(res);

      if (ttsEnabled && res.laudoPericial) {
        setIsSpeaking(true);
        const fala = res.possuiAvaria 
          ? `Vistoria concluída com diagnóstico de avaria ${res.classificacaoGravidade}. ${res.acaoRecomendada}` 
          : 'Vistoria concluída. A peça está íntegra, liberação de caução recomendada.';
        speakText(
          fala,
          voiceConfig,
          () => setIsSpeaking(true),
          () => setIsSpeaking(false)
        );
      }
    } catch (err: any) {
      alert(err.message || 'Erro ao realizar vistoria com IA.');
    } finally {
      setInspectLoading(false);
    }
  };

  // Handler para Upload de Foto para Realce com IA
  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setPhotoSourceImage(reader.result as string);
        setPhotoResult(null);
        setApplySuccessNotice(null);
      };
      reader.readAsDataURL(file);
    }
  };

  // Handler para Seleção de Item Existente para Realce
  const handleSelectExistingItemForEnhance = (itemId: number) => {
    const item = itens.find(i => i.id === itemId);
    if (item) {
      setSelectedTargetItemId(item.id);
      setPhotoItemNome(item.nome);
      setPhotoDescritivo(item.descricao || `${item.nome} (${item.categoria}) - Peça nobre para ambientação de eventos.`);
      if (item.imageUrl) {
        setPhotoSourceImage(item.imageUrl);
        setPhotoResult(null);
        setApplySuccessNotice(null);
      }
    }
  };

  // Handler para Analisar Descritivo do Item e Sugerir Cenografia Completa
  const handleAnalisarDescritivoCenografia = async () => {
    if (!photoItemNome && !photoDescritivo) {
      alert('Por favor, informe o nome ou descritivo da peça para a IA analisar a cenografia.');
      return;
    }
    setScenicAnalysisLoading(true);
    try {
      const selectedItem = itens.find(i => i.id === selectedTargetItemId);
      const analysis = await generateScenicPromptAsync({
        itemNome: photoItemNome || 'Peça de Acervo',
        descritivo: photoDescritivo,
        categoria: selectedItem?.categoria || 'Mobiliário'
      });
      setScenicAnalysisResult(analysis);
      if (analysis.fundoSugeridoId) {
        setPhotoCenarioFundo(analysis.fundoSugeridoId);
      }
      if (analysis.elementosDecorativosSugeridos && analysis.elementosDecorativosSugeridos.length > 0) {
        setPhotoElementosCustomText(analysis.elementosDecorativosSugeridos.join(', '));
      }
      if (analysis.estiloIluminacao) {
        setPhotoEstiloIluminacao(analysis.estiloIluminacao);
      }
      if (analysis.promptComposicaoCompleta) {
        setPhotoCustomPrompt(analysis.promptComposicaoCompleta);
      }
      if (ttsEnabled) {
        speakText(
          `Cenografia planejada com sucesso para ${photoItemNome}. Fundo sugerido: ${analysis.fundoSugeridoNome}. ${analysis.dicasCuradoria?.[0] || ''}`,
          voiceConfig,
          () => setIsSpeaking(true),
          () => setIsSpeaking(false)
        );
      }
    } catch (err: any) {
      alert(err.message || 'Erro ao analisar descritivo e cenografia.');
    } finally {
      setScenicAnalysisLoading(false);
    }
  };

  // Handler para Alternar Elemento Decorativo Predefinido
  const handleToggleElementoDecorativo = (id: string) => {
    setPhotoElementosDecorativos((prev) =>
      prev.includes(id) ? prev.filter((el) => el !== id) : [...prev, id]
    );
  };

  // Handler para Executar Realce de Fotografia e Cenografia com Gemini
  const handleExecutarRealceFoto = async () => {
    if (!photoSourceImage) {
      alert('Por favor, carregue ou selecione uma foto de peça do acervo para realçar.');
      return;
    }
    setPhotoLoading(true);
    setPhotoResult(null);
    setApplySuccessNotice(null);

    try {
      const res = await enhancePhotoAsync({
        imageBase64: photoSourceImage,
        mode: photoEnhanceMode,
        itemNome: photoItemNome,
        descritivoItem: photoDescritivo,
        cenarioFundo: photoCenarioFundo,
        cenarioCustomText: photoCenarioCustomText.trim() || undefined,
        elementosDecorativos: photoElementosDecorativos,
        elementosCustomText: photoElementosCustomText.trim() || undefined,
        estiloIluminacao: photoEstiloIluminacao.trim() || undefined,
        customPrompt: photoCustomPrompt.trim() || undefined,
        aspectRatio: photoAspectRatio
      });
      setPhotoResult(res);

      if (ttsEnabled && res.audit) {
        setIsSpeaking(true);
        const fala = `Cenografia e fotografia aprimoradas com sucesso. Fundo aplicado: ${res.cenarioFundoAplicado || 'Estúdio'}. Score de qualidade: ${res.audit.scoreQualidade} de 100. ${res.audit.resumoMelhoriaAplicada}`;
        speakText(
          fala,
          voiceConfig,
          () => setIsSpeaking(true),
          () => setIsSpeaking(false)
        );
      }
    } catch (err: any) {
      alert(err.message || 'Erro ao realçar fotografia e cenografia com IA.');
    } finally {
      setPhotoLoading(false);
    }
  };

  // Handler para Aplicar Foto Realçada ao Item do Acervo
  const handleApplyPhotoToItem = () => {
    if (!photoResult?.enhancedImageUrl || !selectedTargetItemId || !onEditItem) {
      return;
    }
    const targetItem = itens.find(i => i.id === selectedTargetItemId);
    if (!targetItem) return;

    const updatedItem: ItemAcervo = {
      ...targetItem,
      imageUrl: photoResult.enhancedImageUrl
    };

    onEditItem(updatedItem);
    setApplySuccessNotice(`Foto aprimorada aplicada com sucesso ao item "${targetItem.nome}" no inventário!`);
    setTimeout(() => setApplySuccessNotice(null), 5000);
  };

  // Handler para Baixar Foto Otimizada
  const handleDownloadEnhancedPhoto = () => {
    if (!photoResult?.enhancedImageUrl) return;
    const a = document.createElement('a');
    a.href = photoResult.enhancedImageUrl;
    a.download = `acervus_${photoItemNome.toLowerCase().replace(/[^a-z0-9]/g, '_')}_enhanced.png`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const cpfResult = validateAndPredictCPF(testCpf);
  const cnpjResult = validateAndPredictCNPJ(testCnpj);
  const phoneResult = validateAndPredictPhone(testPhone);

  return (
    <div className="fixed inset-y-0 right-0 w-full sm:w-[500px] bg-[#0A0A0B] border-l border-[#27272A] shadow-2xl z-50 flex flex-col animate-slideLeft">
      {/* Drawer Header */}
      <div className="p-4 bg-[#111113] border-b border-[#27272A] flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#D4AF37] to-[#8B7326] flex items-center justify-center text-black font-bold shadow-lg shadow-[#D4AF37]/20">
            <Sparkles size={20} />
          </div>
          <div>
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              Copiloto IA Acervus
              <span className="text-[10px] bg-[#D4AF37]/10 text-[#D4AF37] px-2 py-0.5 rounded border border-[#D4AF37]/30 font-mono font-bold">
                Gemini 3.7 + Neural TTS
              </span>
            </h3>
            <p className="text-[11px] text-[#A1A1AA]">Voz Neural, Decoração, Vistoria & Ações</p>
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
            <span>{isSpeaking ? 'Voz Neural Ativa...' : 'Escutando Microfone (Barge-In)...'}</span>
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
            className="text-[10px] font-mono underline hover:opacity-80 cursor-pointer"
          >
            Parar Áudio
          </button>
        </div>
      )}

      {/* Sub Tabs Selector */}
      <div className="flex items-center gap-1 px-3 py-2 bg-[#111113]/90 border-b border-[#27272A] text-[11px] font-mono overflow-x-auto no-scrollbar">
        <button
          onClick={() => setActiveSubView('chat')}
          className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg font-bold transition-all shrink-0 ${
            activeSubView === 'chat'
              ? 'bg-[#D4AF37]/15 text-[#D4AF37] border border-[#D4AF37]/40'
              : 'text-[#A1A1AA] hover:text-white'
          }`}
        >
          <Bot size={13} /> Chat & Voz
        </button>

        <button
          onClick={() => setActiveSubView('voice')}
          className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg font-bold transition-all shrink-0 ${
            activeSubView === 'voice'
              ? 'bg-[#D4AF37]/15 text-[#D4AF37] border border-[#D4AF37]/40'
              : 'text-[#A1A1AA] hover:text-white'
          }`}
        >
          <Sliders size={13} /> Voz Neural
        </button>

        <button
          onClick={() => setActiveSubView('decor')}
          className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg font-bold transition-all shrink-0 ${
            activeSubView === 'decor'
              ? 'bg-[#D4AF37]/15 text-[#D4AF37] border border-[#D4AF37]/40'
              : 'text-[#A1A1AA] hover:text-white'
          }`}
        >
          <Palette size={13} /> Decorações & Kits
        </button>

        <button
          onClick={() => setActiveSubView('inspection')}
          className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg font-bold transition-all shrink-0 ${
            activeSubView === 'inspection'
              ? 'bg-[#D4AF37]/15 text-[#D4AF37] border border-[#D4AF37]/40'
              : 'text-[#A1A1AA] hover:text-white'
          }`}
        >
          <Camera size={13} /> Vistoria com Foto
        </button>

        <button
          onClick={() => setActiveSubView('photo_enhance')}
          className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg font-bold transition-all shrink-0 ${
            activeSubView === 'photo_enhance'
              ? 'bg-gradient-to-r from-[#D4AF37]/20 to-amber-500/20 text-[#D4AF37] border border-[#D4AF37]/50 shadow-sm'
              : 'text-[#A1A1AA] hover:text-white'
          }`}
        >
          <Sparkles size={13} className="text-[#D4AF37]" /> Realce de Fotos (IA)
        </button>

        <button
          onClick={() => setActiveSubView('playground')}
          className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg font-bold transition-all shrink-0 ${
            activeSubView === 'playground'
              ? 'bg-[#D4AF37]/15 text-[#D4AF37] border border-[#D4AF37]/40'
              : 'text-[#A1A1AA] hover:text-white'
          }`}
        >
          <Zap size={13} /> Validador
        </button>

        <button
          onClick={() => setActiveSubView('tips')}
          className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg font-bold transition-all shrink-0 ${
            activeSubView === 'tips'
              ? 'bg-[#D4AF37]/15 text-[#D4AF37] border border-[#D4AF37]/40'
              : 'text-[#A1A1AA] hover:text-white'
          }`}
        >
          <Compass size={13} /> Dicas
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
                    <div className="flex items-center gap-2 pt-1 flex-wrap">
                      <button
                        onClick={() => onNavigateTab(msg.intentResult!.targetTab!)}
                        className="text-[11px] font-mono bg-[#111113] hover:bg-[#27272A] text-[#D4AF37] px-3 py-1.5 rounded-xl border border-[#D4AF37]/30 flex items-center gap-1.5 transition-all shadow-sm cursor-pointer"
                      >
                        <span>Ir para {msg.intentResult.targetTab.toUpperCase()}</span>
                        <ArrowRight size={12} />
                      </button>
                    </div>
                  )}

                  {msg.intentResult && msg.intentResult.extractedReservation && onOpenNovaReserva && (
                    <div className="flex items-center gap-2 pt-1 flex-wrap">
                      <button
                        onClick={() => onOpenNovaReserva(msg.intentResult?.extractedReservation?.clienteNome)}
                        className="text-[11px] font-mono bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 px-3 py-1.5 rounded-xl border border-emerald-500/30 flex items-center gap-1.5 transition-all shadow-sm cursor-pointer"
                      >
                        <span>Abrir Form de Reserva</span>
                        <ArrowRight size={12} />
                      </button>
                    </div>
                  )}

                  {/* Action Suggestions Chips */}
                  {msg.intentResult && msg.intentResult.actionSuggestions && msg.intentResult.actionSuggestions.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 pt-1">
                      {msg.intentResult.actionSuggestions.map((suggestion, sIdx) => (
                        <button
                          key={sIdx}
                          onClick={() => handleSendMessage(suggestion)}
                          className="text-[10.5px] bg-[#27272A]/70 hover:bg-[#D4AF37]/20 hover:text-[#D4AF37] text-[#A1A1AA] px-2.5 py-1 rounded-lg border border-[#3F3F46]/40 transition-all cursor-pointer text-left"
                        >
                          💬 {suggestion}
                        </button>
                      ))}
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
            {isThinking && (
              <div className="flex gap-3 justify-start animate-fadeIn">
                <div className="w-7 h-7 rounded-lg bg-[#D4AF37]/10 border border-[#D4AF37]/30 text-[#D4AF37] flex items-center justify-center shrink-0 mt-0.5 animate-pulse">
                  <Sparkles size={15} />
                </div>
                <div className="p-3 bg-[#18181B] border border-[#27272A] rounded-2xl rounded-tl-none flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-[#D4AF37] animate-bounce" style={{ animationDelay: '0ms' }}></span>
                  <span className="w-2 h-2 rounded-full bg-[#D4AF37] animate-bounce" style={{ animationDelay: '150ms' }}></span>
                  <span className="w-2 h-2 rounded-full bg-[#D4AF37] animate-bounce" style={{ animationDelay: '300ms' }}></span>
                  <span className="text-[11px] text-[#A1A1AA] font-mono ml-2">Consultando Gemini 3.7 Flash...</span>
                </div>
              </div>
            )}
            <div ref={chatEndRef} />
          </div>
        )}

        {/* SUBVIEW 2: VOICE & NEURAL TTS CONFIGURATION */}
        {activeSubView === 'voice' && (
          <div className="space-y-4 animate-fadeIn">
            <div className="bg-[#111113] border border-[#D4AF37]/30 p-4 rounded-xl space-y-2">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold text-white flex items-center gap-2">
                  <Sliders className="text-[#D4AF37]" size={16} /> Motor de Voz & Prosódia Neural
                </h4>
                <span className="text-[10px] bg-[#D4AF37]/10 text-[#D4AF37] px-2 py-0.5 rounded font-mono border border-[#D4AF37]/20 font-bold">
                  Gemini TTS v3.1
                </span>
              </div>
              <p className="text-[11px] text-[#A1A1AA]">
                Alterne entre vozes neurais ultra-realistas com inteligência emocional ou a síntese local do navegador.
              </p>
            </div>

            {/* Neural Gemini TTS Toggle */}
            <div className="bg-[#18181B] border border-[#27272A] p-4 rounded-xl flex items-center justify-between">
              <div>
                <h5 className="text-xs font-bold text-white flex items-center gap-1.5">
                  <Sparkles size={14} className="text-[#D4AF37]" />
                  Voz Neural do Google Gemini (Alta Fidelidade)
                </h5>
                <p className="text-[10px] text-[#71717A]">
                  Utiliza o modelo neural <code className="text-[#D4AF37]">gemini-3.1-flash-tts-preview</code> a 24kHz.
                </p>
              </div>
              <input
                type="checkbox"
                checked={voiceConfig.useNeuralGemini}
                onChange={(e) => updateVoiceSettings({ useNeuralGemini: e.target.checked })}
                className="w-4 h-4 accent-[#D4AF37] rounded cursor-pointer"
              />
            </div>

            {/* Neural Voice Persona Selector */}
            {voiceConfig.useNeuralGemini && (
              <div className="bg-[#18181B] border border-[#27272A] p-4 rounded-xl space-y-3">
                <label className="text-xs font-bold text-white block">
                  Personas de Voz Neural (Gemini)
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { id: 'Kore', label: 'Kore (Feminina Executiva)', desc: 'Clara, técnica e polida' },
                    { id: 'Zephyr', label: 'Zephyr (Feminina Expressiva)', desc: 'Calorosa e empática' },
                    { id: 'Puck', label: 'Puck (Masculina Dinâmica)', desc: 'Ágil e moderna' },
                    { id: 'Fenrir', label: 'Fenrir (Masculina Imponente)', desc: 'Grave e segura' },
                    { id: 'Charon', label: 'Charon (Masculina Formal)', desc: 'Séria e institucional' },
                  ].map((persona) => (
                    <button
                      key={persona.id}
                      onClick={() => updateVoiceSettings({ geminiVoiceName: persona.id as GeminiVoiceName })}
                      className={`p-2.5 rounded-xl border text-left transition-all ${
                        voiceConfig.geminiVoiceName === persona.id
                          ? 'bg-[#D4AF37]/15 border-[#D4AF37] text-white'
                          : 'bg-[#0A0A0B] border-[#27272A] text-[#A1A1AA] hover:border-[#3F3F46]'
                      }`}
                    >
                      <div className="text-xs font-bold text-white">{persona.label}</div>
                      <div className="text-[10px] text-[#71717A]">{persona.desc}</div>
                    </button>
                  ))}
                </div>

                {/* Tone selector */}
                <div className="pt-2">
                  <label className="text-[11px] font-bold text-white block mb-1">
                    Tom da Conversa
                  </label>
                  <div className="flex gap-2">
                    <button
                      onClick={() => updateVoiceSettings({ neuralTone: 'professional' })}
                      className={`flex-1 py-1.5 text-xs rounded-lg border font-mono transition-all ${
                        voiceConfig.neuralTone === 'professional'
                          ? 'bg-[#D4AF37]/20 border-[#D4AF37] text-[#D4AF37] font-bold'
                          : 'bg-[#0A0A0B] border-[#27272A] text-[#71717A]'
                      }`}
                    >
                      👔 Profissional
                    </button>
                    <button
                      onClick={() => updateVoiceSettings({ neuralTone: 'cheerful' })}
                      className={`flex-1 py-1.5 text-xs rounded-lg border font-mono transition-all ${
                        voiceConfig.neuralTone === 'cheerful'
                          ? 'bg-[#D4AF37]/20 border-[#D4AF37] text-[#D4AF37] font-bold'
                          : 'bg-[#0A0A0B] border-[#27272A] text-[#71717A]'
                      }`}
                    >
                      🌟 Acolhedor / Animado
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Test Voice Control */}
            <div className="bg-[#18181B] border border-[#27272A] p-4 rounded-xl flex items-center justify-between">
              <div>
                <span className="text-xs font-bold text-white block">Testar Áudio em Tempo Real</span>
                <span className="text-[10px] text-[#71717A]">
                  Ouvir síntese fonética configurada
                </span>
              </div>
              <button
                onClick={handleTestVoice}
                className="flex items-center gap-1.5 bg-gradient-to-r from-[#D4AF37] to-[#8B7326] text-black font-bold px-3.5 py-2 rounded-xl text-xs transition-all shadow cursor-pointer active:scale-95"
              >
                <Play size={14} />
                <span>Testar Voz Agora</span>
              </button>
            </div>

            {/* Concise Responses Toggle */}
            <div className="bg-[#18181B] border border-[#27272A] p-4 rounded-xl flex items-center justify-between">
              <div>
                <h5 className="text-xs font-bold text-white">Respostas Curtas e Objetivas</h5>
                <p className="text-[10px] text-[#71717A]">
                  Limita respostas por voz às frases prioritárias para maior agilidade operacional.
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

        {/* SUBVIEW 3: CONSULTOR DE DECORAÇÃO & KITS POR TEMA */}
        {activeSubView === 'decor' && (
          <div className="space-y-4 animate-fadeIn">
            <div className="bg-[#111113] border border-[#D4AF37]/30 p-4 rounded-xl space-y-2">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold text-white flex items-center gap-2">
                  <Palette className="text-[#D4AF37]" size={16} /> Consultor de Decorações & Kits de Eventos
                </h4>
                <span className="text-[10px] bg-[#D4AF37]/10 text-[#D4AF37] px-2 py-0.5 rounded font-mono border border-[#D4AF37]/20 font-bold">
                  IA de Cenografia
                </span>
              </div>
              <p className="text-[11px] text-[#A1A1AA]">
                Crie composições harmônicas e kits personalizados cruzando o tema com o estoque real de acervo.
              </p>
            </div>

            {/* Inputs */}
            <div className="bg-[#18181B] border border-[#27272A] p-4 rounded-xl space-y-3">
              <div>
                <label className="text-xs font-bold text-white block mb-1">Tema ou Estilo do Evento</label>
                <input
                  type="text"
                  value={decorTema}
                  onChange={(e) => setDecorTema(e.target.value)}
                  placeholder="Ex: Casamento Boho Chic, Debutante Rose Gold, Infantil Safari"
                  className="w-full bg-[#0A0A0B] border border-[#27272A] focus:border-[#D4AF37] text-xs text-white p-2.5 rounded-lg outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-xs font-bold text-white block mb-1">Qtd Convidados</label>
                  <input
                    type="number"
                    value={decorConvidados}
                    onChange={(e) => setDecorConvidados(parseInt(e.target.value) || 0)}
                    className="w-full bg-[#0A0A0B] border border-[#27272A] focus:border-[#D4AF37] text-xs text-white p-2.5 rounded-lg outline-none font-mono"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-white block mb-1">Tipo de Espaço</label>
                  <input
                    type="text"
                    value={decorEspaco}
                    onChange={(e) => setDecorEspaco(e.target.value)}
                    placeholder="Ex: Praia, Salão Fechado"
                    className="w-full bg-[#0A0A0B] border border-[#27272A] focus:border-[#D4AF37] text-xs text-white p-2.5 rounded-lg outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-white block mb-1">Paleta de Cores Preferida</label>
                <input
                  type="text"
                  value={decorPaleta}
                  onChange={(e) => setDecorPaleta(e.target.value)}
                  placeholder="Ex: Tons terrosos, dourado e fendi"
                  className="w-full bg-[#0A0A0B] border border-[#27272A] focus:border-[#D4AF37] text-xs text-white p-2.5 rounded-lg outline-none"
                />
              </div>

              <button
                onClick={handleConsultarDecoracao}
                disabled={decorLoading}
                className="w-full py-2.5 bg-gradient-to-r from-[#D4AF37] to-[#8B7326] text-black font-bold rounded-xl text-xs flex items-center justify-center gap-2 transition-all shadow-md shadow-[#D4AF37]/20 disabled:opacity-50 cursor-pointer active:scale-95"
              >
                {decorLoading ? (
                  <>
                    <Loader2 size={15} className="animate-spin" />
                    <span>Calculando Proporções e Mobílias com IA...</span>
                  </>
                ) : (
                  <>
                    <Wand2 size={15} />
                    <span>Gerar Composição & Recomendar Kits</span>
                  </>
                )}
              </button>
            </div>

            {/* Results */}
            {decorResult && (
              <div className="bg-[#18181B] border border-[#D4AF37]/40 p-4 rounded-xl space-y-4 animate-fadeIn">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <h5 className="text-sm font-bold text-white">{decorResult.temaFormatado}</h5>
                    {decorResult.estimativaPrecoSugeridoTotal && (
                      <span className="text-xs font-mono text-emerald-400 font-bold bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                        {decorResult.estimativaPrecoSugeridoTotal}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-[#A1A1AA] leading-relaxed">{decorResult.conceitoEstetico}</p>
                </div>

                {/* Color Palette Chips */}
                <div>
                  <span className="text-[11px] font-mono text-[#D4AF37] font-bold block mb-1.5">
                    Paleta Sugerida:
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {decorResult.paletaSugerida.map((cor, cIdx) => (
                      <span
                        key={cIdx}
                        className="text-[11px] bg-[#0A0A0B] text-white px-2.5 py-1 rounded-lg border border-[#27272A] font-mono"
                      >
                        🎨 {cor}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Recommended Items */}
                <div className="space-y-2">
                  <span className="text-[11px] font-mono text-[#D4AF37] font-bold block">
                    Mobílias e Peças do Acervo Recomendadas:
                  </span>
                  <div className="space-y-2">
                    {decorResult.itensRecomendados.map((item, iIdx) => (
                      <div
                        key={iIdx}
                        className="bg-[#0A0A0B] p-3 rounded-xl border border-[#27272A] space-y-1"
                      >
                        <div className="flex items-center justify-between text-xs font-bold text-white">
                          <span>{item.nomeItem}</span>
                          <span className="font-mono text-[#D4AF37] bg-[#D4AF37]/10 px-2 py-0.5 rounded">
                            Qtd: {item.quantidadeSugerida}
                          </span>
                        </div>
                        <p className="text-[11px] text-[#71717A]">{item.justificativa}</p>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Scenography Tips */}
                <div className="bg-[#111113] p-3 rounded-xl border border-[#27272A] space-y-1">
                  <span className="text-[11px] font-mono text-cyan-400 font-bold block">
                    💡 Dicas de Cenografia & Iluminação:
                  </span>
                  <ul className="text-xs text-[#A1A1AA] space-y-1 list-disc list-inside">
                    {decorResult.dicasCenografia.map((dica, dIdx) => (
                      <li key={dIdx}>{dica}</li>
                    ))}
                  </ul>
                </div>
              </div>
            )}
          </div>
        )}

        {/* SUBVIEW 4: VISTORIA DE AVARIAS COM FOTO (COMPUTER VISION) */}
        {activeSubView === 'inspection' && (
          <div className="space-y-4 animate-fadeIn">
            <div className="bg-[#111113] border border-[#D4AF37]/30 p-4 rounded-xl space-y-2">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold text-white flex items-center gap-2">
                  <Camera className="text-[#D4AF37]" size={16} /> Vistoria Pericial de Avarias por Foto
                </h4>
                <span className="text-[10px] bg-red-500/10 text-red-400 px-2 py-0.5 rounded font-mono border border-red-500/20 font-bold">
                  OCR & Visão
                </span>
              </div>
              <p className="text-[11px] text-[#A1A1AA]">
                Fotografe ou anexe a imagem da mobília na devolução para emitir laudo e calcular retenção do caução.
              </p>
            </div>

            <div className="bg-[#18181B] border border-[#27272A] p-4 rounded-xl space-y-3">
              <div>
                <label className="text-xs font-bold text-white block mb-1">Item em Vistoria</label>
                <select
                  value={inspectItemNome}
                  onChange={(e) => setInspectItemNome(e.target.value)}
                  className="w-full bg-[#0A0A0B] border border-[#27272A] focus:border-[#D4AF37] text-xs text-white p-2.5 rounded-lg outline-none font-mono"
                >
                  {itens.map((it) => (
                    <option key={it.id} value={it.nome}>
                      {it.nome} ({it.categoria}) - Diária: {formatarMoeda(it.valorDiaria)}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs font-bold text-white block mb-1">Caução de Garantia Retido</label>
                <input
                  type="text"
                  value={inspectCaucao}
                  onChange={(e) => setInspectCaucao(e.target.value)}
                  placeholder="Ex: R$ 300,00"
                  className="w-full bg-[#0A0A0B] border border-[#27272A] focus:border-[#D4AF37] text-xs text-white p-2.5 rounded-lg outline-none font-mono"
                />
              </div>

              {/* Photo Upload Area */}
              <div>
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleImageUpload}
                  accept="image/*"
                  className="hidden"
                />
                {inspectImage ? (
                  <div className="relative rounded-xl overflow-hidden border border-[#D4AF37]/50 max-h-48 group">
                    <img src={inspectImage} alt="Vistoria" className="w-full object-cover" />
                    <button
                      onClick={() => setInspectImage(null)}
                      className="absolute top-2 right-2 bg-black/80 text-white p-1.5 rounded-lg hover:bg-red-500 transition-colors"
                    >
                      <X size={14} />
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="w-full py-8 border-2 border-dashed border-[#27272A] hover:border-[#D4AF37]/50 rounded-xl flex flex-col items-center justify-center gap-2 bg-[#0A0A0B] text-[#71717A] hover:text-white transition-all cursor-pointer"
                  >
                    <Upload size={24} className="text-[#D4AF37]" />
                    <span className="text-xs font-medium">Carregar Foto da Mobília para Vistoria</span>
                    <span className="text-[10px] text-[#71717A]">Suporta JPEG, PNG de celular ou câmera</span>
                  </button>
                )}
              </div>

              <button
                onClick={handleExecutarVistoria}
                disabled={inspectLoading || !inspectImage}
                className="w-full py-2.5 bg-gradient-to-r from-red-600 to-amber-600 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-2 transition-all shadow-md disabled:opacity-50 cursor-pointer active:scale-95"
              >
                {inspectLoading ? (
                  <>
                    <Loader2 size={15} className="animate-spin" />
                    <span>Auditoria Pericial Multimodal em Andamento...</span>
                  </>
                ) : (
                  <>
                    <Camera size={15} />
                    <span>Analisar Avarias & Gerar Laudo</span>
                  </>
                )}
              </button>
            </div>

            {/* Inspection Results */}
            {inspectResult && (
              <div className="bg-[#18181B] border border-red-500/30 p-4 rounded-xl space-y-3 animate-fadeIn">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-white">Resultado da Perícia Visual</span>
                  <span className={`text-[10px] font-mono px-2 py-0.5 rounded font-bold uppercase border ${
                    inspectResult.possuiAvaria 
                      ? 'bg-red-500/20 text-red-400 border-red-500/30' 
                      : 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
                  }`}>
                    {inspectResult.classificacaoGravidade}
                  </span>
                </div>

                <p className="text-xs text-[#E4E4E7] leading-relaxed bg-[#0A0A0B] p-3 rounded-lg border border-[#27272A]">
                  {inspectResult.descricaoAvaria}
                </p>

                {inspectResult.possuiAvaria && (
                  <div className="grid grid-cols-2 gap-2 text-xs font-mono">
                    <div className="bg-[#0A0A0B] p-2 rounded border border-[#27272A]">
                      <span className="text-[#71717A] block text-[10px]">Custo Reparo:</span>
                      <span className="text-amber-400 font-bold">{inspectResult.custoEstimadoReparo}</span>
                    </div>
                    <div className="bg-[#0A0A0B] p-2 rounded border border-[#27272A]">
                      <span className="text-[#71717A] block text-[10px]">Retenção Caução:</span>
                      <span className="text-red-400 font-bold">{inspectResult.retencaoCaucaoSugerida}</span>
                    </div>
                  </div>
                )}

                <div className="bg-[#111113] p-3 rounded-xl border border-[#27272A] space-y-1">
                  <span className="text-[11px] font-mono text-[#D4AF37] font-bold block">
                    📄 Texto para Laudo / WhatsApp do Cliente:
                  </span>
                  <p className="text-xs text-[#A1A1AA] italic leading-relaxed">
                    "{inspectResult.laudoPericial}"
                  </p>
                </div>
              </div>
            )}
          </div>
        )}

        {/* SUBVIEW: REALCE E MELHORIA DE FOTOS COM IA (GEMINI IMAGE & VISION) */}
        {activeSubView === 'photo_enhance' && (
          <div className="space-y-4 animate-fadeIn">
            {/* Header / Intro Card */}
            <div className="bg-[#111113] border border-[#27272A] p-4 rounded-xl space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-mono text-[#D4AF37] uppercase font-bold flex items-center gap-1.5">
                  <Sparkles size={13} /> Estúdio Virtual de Catálogo
                </span>
                <span className="text-[9px] font-mono bg-[#D4AF37]/10 text-[#D4AF37] border border-[#D4AF37]/30 px-2 py-0.5 rounded-full font-bold">
                  Gemini 3.1 Image
                </span>
              </div>
              <h4 className="text-sm font-bold text-white">
                Realce & Tratamento Fotográfico com IA
              </h4>
              <p className="text-xs text-[#A1A1AA] leading-relaxed">
                Transforme fotos caseiras tiradas no galpão em imagens comerciais de alto padrão com iluminação de estúdio, remoção de fundos desordenados ou cenografia virtual de eventos.
              </p>
            </div>

            {/* Notification toast when applied */}
            {applySuccessNotice && (
              <div className="bg-emerald-500/10 border border-emerald-500/40 p-3 rounded-xl text-xs text-emerald-400 flex items-center gap-2 animate-fadeIn">
                <CheckCircle2 size={16} className="shrink-0 text-emerald-400" />
                <span className="font-medium">{applySuccessNotice}</span>
              </div>
            )}

            {/* Controls & Configuration */}
            <div className="bg-[#18181B] border border-[#27272A] p-4 rounded-xl space-y-4">
              
              {/* PASSO 1: SELEÇÃO DA PEÇA & LEITURA DO DESCRITIVO */}
              <div className="space-y-3 pb-3 border-b border-[#27272A]">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-white flex items-center gap-1.5">
                    <span className="w-5 h-5 rounded-full bg-[#D4AF37] text-black text-[10px] font-extrabold flex items-center justify-center">1</span>
                    Peça do Acervo & Descritivo
                  </label>
                  {selectedTargetItemId && (
                    <span className="text-[10px] text-emerald-400 font-mono flex items-center gap-1">
                      <CheckCircle2 size={11} /> Item Vinculado
                    </span>
                  )}
                </div>

                {/* Select Existing Item */}
                <select
                  value={selectedTargetItemId || ''}
                  onChange={(e) => handleSelectExistingItemForEnhance(Number(e.target.value))}
                  className="w-full bg-[#0A0A0B] border border-[#27272A] focus:border-[#D4AF37] text-xs text-white p-2.5 rounded-lg outline-none font-mono"
                >
                  <option value="">Selecione uma peça do inventário...</option>
                  {itens.map((it) => (
                    <option key={it.id} value={it.id}>
                      {it.nome} ({it.categoria})
                    </option>
                  ))}
                </select>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <div>
                    <label className="text-[10px] text-[#71717A] uppercase font-bold block mb-1">
                      Nome / Título da Peça
                    </label>
                    <input
                      type="text"
                      value={photoItemNome}
                      onChange={(e) => setPhotoItemNome(e.target.value)}
                      placeholder="Ex: Mesa de Madeira Maciça"
                      className="w-full bg-[#0A0A0B] border border-[#27272A] focus:border-[#D4AF37] text-xs text-white p-2 rounded-lg outline-none"
                    />
                  </div>

                  <div>
                    <label className="text-[10px] text-[#71717A] uppercase font-bold block mb-1">
                      Formato / Proporção
                    </label>
                    <select
                      value={photoAspectRatio}
                      onChange={(e) => setPhotoAspectRatio(e.target.value)}
                      className="w-full bg-[#0A0A0B] border border-[#27272A] focus:border-[#D4AF37] text-xs text-white p-2 rounded-lg outline-none font-mono"
                    >
                      <option value="1:1">1:1 (Quadrado / Catálogo)</option>
                      <option value="4:3">4:3 (Retrato Comercial)</option>
                      <option value="16:9">16:9 (Panorâmico)</option>
                    </select>
                  </div>
                </div>

                {/* Textarea para Leitura do Descritivo */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-[10px] text-[#71717A] uppercase font-bold">
                      Descritivo Detalhado da Peça
                    </label>
                    <span className="text-[10px] text-[#D4AF37] font-mono">IA lê e interpreta</span>
                  </div>
                  <textarea
                    rows={2}
                    value={photoDescritivo}
                    onChange={(e) => setPhotoDescritivo(e.target.value)}
                    placeholder="Ex: Mesa rústica de peroba rosa de 3 metros, com acabamento acetinado e nós naturais na madeira, ideal para casamento no campo..."
                    className="w-full bg-[#0A0A0B] border border-[#27272A] focus:border-[#D4AF37] text-xs text-white p-2.5 rounded-lg outline-none resize-none leading-relaxed"
                  />
                </div>

                {/* Botão de Leitura Inteligente do Descritivo */}
                <button
                  type="button"
                  onClick={handleAnalisarDescritivoCenografia}
                  disabled={scenicAnalysisLoading || (!photoItemNome && !photoDescritivo)}
                  className="w-full py-2 px-3 bg-[#D4AF37]/15 hover:bg-[#D4AF37]/25 border border-[#D4AF37]/40 text-[#D4AF37] rounded-lg text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer shadow-sm disabled:opacity-50"
                  title="Analisar texto e propor cenário, elementos e iluminação harmoniosa"
                >
                  {scenicAnalysisLoading ? (
                    <>
                      <Loader2 size={14} className="animate-spin text-[#D4AF37]" />
                      <span>Lendo descritivo & planejando cenografia...</span>
                    </>
                  ) : (
                    <>
                      <Brain size={14} className="text-[#D4AF37]" />
                      <span>🧠 Ler Descritivo & Sugerir Cenografia (IA)</span>
                    </>
                  )}
                </button>

                {/* Resumo da Análise Cenográfica da IA */}
                {scenicAnalysisResult && (
                  <div className="bg-[#0A0A0B] border border-[#D4AF37]/30 p-3 rounded-xl space-y-2 text-xs animate-fadeIn">
                    <div className="flex items-center justify-between border-b border-[#27272A] pb-2">
                      <span className="font-bold text-white flex items-center gap-1.5 text-[11px]">
                        <Sparkles size={13} className="text-[#D4AF37]" /> Cenografia Sugerida: {scenicAnalysisResult.fundoSugeridoNome}
                      </span>
                      <span className="text-[10px] bg-[#D4AF37]/20 text-[#D4AF37] px-2 py-0.5 rounded font-mono font-bold">
                        {scenicAnalysisResult.temaCenografico}
                      </span>
                    </div>

                    <p className="text-[#A1A1AA] text-[11px] leading-relaxed">
                      {scenicAnalysisResult.analiseCompatibilidade}
                    </p>

                    {scenicAnalysisResult.paletaSugerida && scenicAnalysisResult.paletaSugerida.length > 0 && (
                      <div className="flex items-center gap-1.5 flex-wrap pt-1">
                        <span className="text-[10px] text-[#71717A] font-mono uppercase font-bold">Paleta:</span>
                        {scenicAnalysisResult.paletaSugerida.map((cor, i) => (
                          <span key={i} className="text-[10px] bg-[#18181B] border border-[#27272A] text-white px-2 py-0.5 rounded-md">
                            {cor}
                          </span>
                        ))}
                      </div>
                    )}

                    {scenicAnalysisResult.dicasCuradoria && scenicAnalysisResult.dicasCuradoria.length > 0 && (
                      <div className="pt-1 text-[10px] text-[#D4AF37] space-y-0.5">
                        <span className="font-bold block uppercase">💡 Dica de Ambientação:</span>
                        <p className="text-[#A1A1AA] italic">{scenicAnalysisResult.dicasCuradoria[0]}</p>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* PASSO 2: MODIFICAR FUNDOS (CENÁRIOS VIRTUAIS) */}
              <div className="space-y-2 pb-3 border-b border-[#27272A]">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-white flex items-center gap-1.5">
                    <span className="w-5 h-5 rounded-full bg-[#D4AF37] text-black text-[10px] font-extrabold flex items-center justify-center">2</span>
                    Modificar Cenário de Fundo
                  </label>
                  <span className="text-[10px] text-[#71717A] font-mono">Escolha o ambiente</span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setPhotoCenarioFundo('jardim_por_do_sol');
                      setPhotoEnhanceMode('event_staging');
                    }}
                    className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between space-y-1 ${
                      photoCenarioFundo === 'jardim_por_do_sol'
                        ? 'bg-[#D4AF37]/15 border-[#D4AF37] text-white shadow-sm'
                        : 'bg-[#0A0A0B] border-[#27272A] text-[#A1A1AA] hover:border-[#3F3F46]'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-white flex items-center gap-1">
                        <span>🌸</span> Jardim & Pôr do Sol
                      </span>
                      {photoCenarioFundo === 'jardim_por_do_sol' && <Check size={12} className="text-[#D4AF37]" />}
                    </div>
                    <span className="text-[9px] text-[#71717A] leading-tight">
                      Gramado verde, golden hour e céu aberto.
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setPhotoCenarioFundo('salao_imperial');
                      setPhotoEnhanceMode('event_staging');
                    }}
                    className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between space-y-1 ${
                      photoCenarioFundo === 'salao_imperial'
                        ? 'bg-[#D4AF37]/15 border-[#D4AF37] text-white shadow-sm'
                        : 'bg-[#0A0A0B] border-[#27272A] text-[#A1A1AA] hover:border-[#3F3F46]'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-white flex items-center gap-1">
                        <span>🏰</span> Salão Imperial
                      </span>
                      {photoCenarioFundo === 'salao_imperial' && <Check size={12} className="text-[#D4AF37]" />}
                    </div>
                    <span className="text-[9px] text-[#71717A] leading-tight">
                      Lustres clássicos, cortinas e piso nobre.
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setPhotoCenarioFundo('boho_chic');
                      setPhotoEnhanceMode('event_staging');
                    }}
                    className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between space-y-1 ${
                      photoCenarioFundo === 'boho_chic'
                        ? 'bg-[#D4AF37]/15 border-[#D4AF37] text-white shadow-sm'
                        : 'bg-[#0A0A0B] border-[#27272A] text-[#A1A1AA] hover:border-[#3F3F46]'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-white flex items-center gap-1">
                        <span>🌿</span> Rústico Boho Chic
                      </span>
                      {photoCenarioFundo === 'boho_chic' && <Check size={12} className="text-[#D4AF37]" />}
                    </div>
                    <span className="text-[9px] text-[#71717A] leading-tight">
                      Madeira, folhagens secas e eucalipto.
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setPhotoCenarioFundo('black_tie');
                      setPhotoEnhanceMode('hdr_vibrant');
                    }}
                    className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between space-y-1 ${
                      photoCenarioFundo === 'black_tie'
                        ? 'bg-[#D4AF37]/15 border-[#D4AF37] text-white shadow-sm'
                        : 'bg-[#0A0A0B] border-[#27272A] text-[#A1A1AA] hover:border-[#3F3F46]'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-white flex items-center gap-1">
                        <span>🖤</span> Black Tie Gala
                      </span>
                      {photoCenarioFundo === 'black_tie' && <Check size={12} className="text-[#D4AF37]" />}
                    </div>
                    <span className="text-[9px] text-[#71717A] leading-tight">
                      Fundo escuro, cristais e luxo noturno.
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setPhotoCenarioFundo('estudio_minimalista');
                      setPhotoEnhanceMode('studio');
                    }}
                    className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between space-y-1 ${
                      photoCenarioFundo === 'estudio_minimalista'
                        ? 'bg-[#D4AF37]/15 border-[#D4AF37] text-white shadow-sm'
                        : 'bg-[#0A0A0B] border-[#27272A] text-[#A1A1AA] hover:border-[#3F3F46]'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-white flex items-center gap-1">
                        <span>🏛️</span> Estúdio Pro
                      </span>
                      {photoCenarioFundo === 'estudio_minimalista' && <Check size={12} className="text-[#D4AF37]" />}
                    </div>
                    <span className="text-[9px] text-[#71717A] leading-tight">
                      Fundo neutro, luz softbox e foco no produto.
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setPhotoCenarioFundo('praia_tropical');
                      setPhotoEnhanceMode('event_staging');
                    }}
                    className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between space-y-1 ${
                      photoCenarioFundo === 'praia_tropical'
                        ? 'bg-[#D4AF37]/15 border-[#D4AF37] text-white shadow-sm'
                        : 'bg-[#0A0A0B] border-[#27272A] text-[#A1A1AA] hover:border-[#3F3F46]'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-white flex items-center gap-1">
                        <span>🌊</span> Praia & Deck
                      </span>
                      {photoCenarioFundo === 'praia_tropical' && <Check size={12} className="text-[#D4AF37]" />}
                    </div>
                    <span className="text-[9px] text-[#71717A] leading-tight">
                      Deck de madeira nobre à beira-mar.
                    </span>
                  </button>
                </div>

                {/* Opção de Fundo Personalizado */}
                <div className="pt-1">
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setPhotoCenarioFundo(photoCenarioFundo === 'custom' ? 'jardim_por_do_sol' : 'custom')}
                      className={`text-xs px-2.5 py-1.5 rounded-lg border font-mono transition-all cursor-pointer flex items-center gap-1.5 ${
                        photoCenarioFundo === 'custom'
                          ? 'bg-[#D4AF37] text-black font-bold border-[#D4AF37]'
                          : 'bg-[#0A0A0B] text-[#A1A1AA] border-[#27272A] hover:text-white'
                      }`}
                    >
                      <Palette size={13} /> Fundo Customizado
                    </button>
                    {photoCenarioFundo === 'custom' && (
                      <input
                        type="text"
                        value={photoCenarioCustomText}
                        onChange={(e) => setPhotoCenarioCustomText(e.target.value)}
                        placeholder="Ex: Terraço de cobertura moderna com vista para a cidade..."
                        className="flex-1 bg-[#0A0A0B] border border-[#D4AF37] text-xs text-white p-1.5 rounded-lg outline-none font-mono"
                      />
                    )}
                  </div>
                </div>
              </div>

              {/* PASSO 3: CRIAR ELEMENTOS DECORATIVOS */}
              <div className="space-y-2 pb-3 border-b border-[#27272A]">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-white flex items-center gap-1.5">
                    <span className="w-5 h-5 rounded-full bg-[#D4AF37] text-black text-[10px] font-extrabold flex items-center justify-center">3</span>
                    Criar Elementos Decorativos & Ambientação
                  </label>
                  <span className="text-[10px] text-[#D4AF37] font-mono">Composição Cênica</span>
                </div>

                {/* Chips de Elementos Predefinidos */}
                <div className="flex flex-wrap gap-1.5">
                  {[
                    { id: 'arranjos_florais', label: '💐 Arranjos Florais Nobres' },
                    { id: 'velas_lustres', label: '🕯️ Velas & Lustres' },
                    { id: 'mesa_posta', label: '🍽️ Mesa Posta & Taças' },
                    { id: 'tapete_nobre', label: '🧶 Tapete Nobre & Pedestais' },
                    { id: 'baloes_organicos', label: '🎈 Arcos Orgânicos' },
                    { id: 'luzes_cenicas', label: '✨ Luzes Cênicas (Fairy)' },
                  ].map((el) => {
                    const isSelected = photoElementosDecorativos.includes(el.id);
                    return (
                      <button
                        key={el.id}
                        type="button"
                        onClick={() => handleToggleElementoDecorativo(el.id)}
                        className={`text-xs px-2.5 py-1 rounded-lg border transition-all cursor-pointer flex items-center gap-1.5 ${
                          isSelected
                            ? 'bg-[#D4AF37]/20 border-[#D4AF37] text-[#D4AF37] font-bold shadow-sm'
                            : 'bg-[#0A0A0B] border-[#27272A] text-[#A1A1AA] hover:text-white'
                        }`}
                      >
                        {isSelected && <Check size={11} />}
                        <span>{el.label}</span>
                      </button>
                    );
                  })}
                </div>

                {/* Elementos Decorativos Customizados */}
                <div className="pt-1">
                  <label className="text-[10px] text-[#71717A] uppercase font-bold block mb-1">
                    Elementos Adicionais a Criar na Cena
                  </label>
                  <input
                    type="text"
                    value={photoElementosCustomText}
                    onChange={(e) => setPhotoElementosCustomText(e.target.value)}
                    placeholder="Ex: Bolo cenográfico 4 andares, castiçais de prata, doces finos..."
                    className="w-full bg-[#0A0A0B] border border-[#27272A] focus:border-[#D4AF37] text-xs text-white p-2 rounded-lg outline-none"
                  />
                </div>
              </div>

              {/* PASSO 4: FOTO DE ORIGEM & ILUMINAÇÃO */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-white flex items-center gap-1.5">
                    <span className="w-5 h-5 rounded-full bg-[#D4AF37] text-black text-[10px] font-extrabold flex items-center justify-center">4</span>
                    Carregue a Foto da Peça do Acervo
                  </label>
                </div>

                {/* Photo Upload Area */}
                <div>
                  <input
                    type="file"
                    ref={photoFileInputRef}
                    onChange={handlePhotoUpload}
                    accept="image/*"
                    className="hidden"
                  />

                  {photoSourceImage ? (
                    <div className="relative rounded-xl overflow-hidden border border-[#D4AF37]/50 max-h-48 group bg-[#0A0A0B] flex items-center justify-center">
                      <img
                        src={photoSourceImage}
                        alt="Origem para Realce"
                        className="max-h-48 w-full object-contain"
                      />
                      <div className="absolute top-2 left-2 bg-black/80 backdrop-blur-md px-2.5 py-1 rounded-lg text-[10px] font-mono text-white border border-[#27272A] flex items-center gap-1.5">
                        <ImageIcon size={12} className="text-[#D4AF37]" /> Foto Original Carregada
                      </div>
                      <div className="absolute top-2 right-2 flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => photoFileInputRef.current?.click()}
                          className="bg-black/80 hover:bg-[#27272A] text-white p-1.5 rounded-lg border border-[#27272A] transition-colors cursor-pointer"
                          title="Substituir foto"
                        >
                          <RefreshCw size={13} />
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setPhotoSourceImage(null);
                            setPhotoResult(null);
                          }}
                          className="bg-black/80 hover:bg-red-500 text-white p-1.5 rounded-lg border border-[#27272A] transition-colors cursor-pointer"
                          title="Remover foto"
                        >
                          <X size={13} />
                        </button>
                      </div>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => photoFileInputRef.current?.click()}
                      className="w-full py-6 border-2 border-dashed border-[#27272A] hover:border-[#D4AF37]/50 rounded-xl flex flex-col items-center justify-center gap-1.5 bg-[#0A0A0B] text-[#71717A] hover:text-white transition-all cursor-pointer"
                    >
                      <Upload size={22} className="text-[#D4AF37]" />
                      <span className="text-xs font-semibold text-white">Carregar Foto do Galpão ou Peça</span>
                      <span className="text-[10px] text-[#71717A]">Suporta JPEG, PNG de celular ou câmera fotográfica</span>
                    </button>
                  )}
                </div>

                {/* Iluminação & Instruções Adicionais */}
                <div>
                  <label className="text-[10px] text-[#71717A] uppercase font-bold block mb-1">
                    Estilo de Iluminação & Toques Finais
                  </label>
                  <input
                    type="text"
                    value={photoEstiloIluminacao}
                    onChange={(e) => setPhotoEstiloIluminacao(e.target.value)}
                    placeholder="Ex: Luz quente dourada com sombras suaves e realce de texturas..."
                    className="w-full bg-[#0A0A0B] border border-[#27272A] focus:border-[#D4AF37] text-xs text-white p-2 rounded-lg outline-none"
                  />
                </div>

                {/* Botão de Execução Principal */}
                <button
                  type="button"
                  onClick={handleExecutarRealceFoto}
                  disabled={photoLoading || !photoSourceImage}
                  className="w-full py-3.5 bg-gradient-to-r from-[#D4AF37] to-[#8B7326] hover:from-[#E5C158] hover:to-[#A38930] text-black font-extrabold rounded-xl text-xs flex items-center justify-center gap-2 transition-all shadow-lg shadow-[#D4AF37]/20 disabled:opacity-50 cursor-pointer active:scale-95 uppercase tracking-wider"
                >
                  {photoLoading ? (
                    <>
                      <Loader2 size={16} className="animate-spin text-black" />
                      <span>Compondo Cenário & Realçando Imagem com IA...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles size={16} className="text-black" />
                      <span>✨ Realçar Fotografia & Compor Cenografia (IA)</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Enhanced Result Container */}
            {photoResult && (
              <div className="bg-[#18181B] border border-[#D4AF37]/40 p-4 rounded-xl space-y-4 animate-fadeIn">
                {/* Result Header & View Modes */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#27272A] pb-3">
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs font-bold text-white flex items-center gap-2">
                        <Sparkles size={14} className="text-[#D4AF37]" /> Foto Realçada & Cenografia Aplicada
                      </span>
                      {photoResult.cenarioFundoAplicado && (
                        <span className="text-[9px] bg-[#D4AF37]/20 border border-[#D4AF37]/40 text-[#D4AF37] px-2 py-0.5 rounded-full font-mono font-bold">
                          Fundo: {photoResult.cenarioFundoAplicado}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 text-[10px] text-[#71717A] font-mono mt-0.5 flex-wrap">
                      <span>Modo: {photoResult.modeApplied.toUpperCase()}</span>
                      <span>•</span>
                      <span>{new Date(photoResult.timestamp).toLocaleTimeString()}</span>
                      {(photoResult.elementosCriados || (photoResult.elementosAdicionados && photoResult.elementosAdicionados.length > 0)) && (
                        <>
                          <span>•</span>
                          <span className="text-emerald-400">
                            Elementos: {photoResult.elementosCriados || photoResult.elementosAdicionados?.join(', ')}
                          </span>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Comparison Mode Toggles */}
                  <div className="flex items-center gap-1 bg-[#0A0A0B] p-1 rounded-lg border border-[#27272A] text-[10px] font-mono">
                    <button
                      type="button"
                      onClick={() => setPhotoComparisonMode('split')}
                      className={`px-2 py-1 rounded transition-all cursor-pointer ${
                        photoComparisonMode === 'split'
                          ? 'bg-[#D4AF37] text-black font-bold'
                          : 'text-[#A1A1AA] hover:text-white'
                      }`}
                      title="Comparador Dividido Interativo"
                    >
                      Dividido
                    </button>
                    <button
                      type="button"
                      onClick={() => setPhotoComparisonMode('side_by_side')}
                      className={`px-2 py-1 rounded transition-all cursor-pointer ${
                        photoComparisonMode === 'side_by_side'
                          ? 'bg-[#D4AF37] text-black font-bold'
                          : 'text-[#A1A1AA] hover:text-white'
                      }`}
                      title="Lado a Lado"
                    >
                      Lado a Lado
                    </button>
                    <button
                      type="button"
                      onClick={() => setPhotoComparisonMode('enhanced_only')}
                      className={`px-2 py-1 rounded transition-all cursor-pointer ${
                        photoComparisonMode === 'enhanced_only'
                          ? 'bg-[#D4AF37] text-black font-bold'
                          : 'text-[#A1A1AA] hover:text-white'
                      }`}
                      title="Apenas Realçada"
                    >
                      Realçada
                    </button>
                  </div>
                </div>

                {/* Interactive Visual Comparison Stage */}
                <div className="relative rounded-xl overflow-hidden bg-[#0A0A0B] border border-[#27272A]">
                  {/* Mode 1: Interactive Split Slider */}
                  {photoComparisonMode === 'split' && photoSourceImage && (
                    <div className="relative w-full h-64 sm:h-72 select-none overflow-hidden flex items-center justify-center">
                      {/* Enhanced (Underneath / Right side) */}
                      <img
                        src={photoResult.enhancedImageUrl}
                        alt="Realçada"
                        className="absolute inset-0 w-full h-full object-contain"
                      />
                      <div className="absolute top-2 right-2 bg-black/80 backdrop-blur-md px-2 py-0.5 rounded text-[10px] font-mono text-[#D4AF37] font-bold border border-[#D4AF37]/30 z-10">
                        Realçada (IA)
                      </div>

                      {/* Original (Clipped on Left side) */}
                      <div
                        className="absolute inset-0 overflow-hidden"
                        style={{ clipPath: `inset(0 ${100 - splitSliderPos}% 0 0)` }}
                      >
                        <img
                          src={photoSourceImage}
                          alt="Original"
                          className="absolute inset-0 w-full h-full object-contain"
                        />
                        <div className="absolute top-2 left-2 bg-black/80 backdrop-blur-md px-2 py-0.5 rounded text-[10px] font-mono text-[#A1A1AA] font-bold border border-[#27272A] z-10">
                          Original
                        </div>
                      </div>

                      {/* Split Divider Line */}
                      <div
                        className="absolute top-0 bottom-0 w-0.5 bg-[#D4AF37] shadow-lg pointer-events-none z-20"
                        style={{ left: `${splitSliderPos}%` }}
                      >
                        <div className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-6 h-6 rounded-full bg-[#D4AF37] text-black flex items-center justify-center shadow-md text-[10px] font-bold">
                          ↔
                        </div>
                      </div>

                      {/* Interactive Range Input Overlay */}
                      <input
                        type="range"
                        min="0"
                        max="100"
                        value={splitSliderPos}
                        onChange={(e) => setSplitSliderPos(Number(e.target.value))}
                        className="absolute inset-0 w-full h-full opacity-0 cursor-ew-resize z-30"
                      />
                    </div>
                  )}

                  {/* Mode 2: Side by Side */}
                  {photoComparisonMode === 'side_by_side' && photoSourceImage && (
                    <div className="grid grid-cols-2 gap-2 p-2 bg-[#0A0A0B]">
                      <div className="space-y-1">
                        <span className="text-[10px] font-mono text-[#71717A] block text-center">Original</span>
                        <div className="h-44 rounded-lg overflow-hidden border border-[#27272A] bg-black flex items-center justify-center">
                          <img src={photoSourceImage} alt="Original" className="max-h-44 object-contain" />
                        </div>
                      </div>
                      <div className="space-y-1">
                        <span className="text-[10px] font-mono text-[#D4AF37] block text-center font-bold">Realçada com IA</span>
                        <div className="h-44 rounded-lg overflow-hidden border border-[#D4AF37]/50 bg-black flex items-center justify-center">
                          <img src={photoResult.enhancedImageUrl} alt="Realçada" className="max-h-44 object-contain" />
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Mode 3: Enhanced Only */}
                  {photoComparisonMode === 'enhanced_only' && (
                    <div className="relative w-full h-64 flex items-center justify-center p-2">
                      <img
                        src={photoResult.enhancedImageUrl}
                        alt="Realçada"
                        className="max-h-60 w-full object-contain"
                      />
                      <div className="absolute top-2 right-2 bg-black/80 backdrop-blur-md px-2 py-0.5 rounded text-[10px] font-mono text-[#D4AF37] font-bold border border-[#D4AF37]/30">
                        Realçada (IA)
                      </div>
                    </div>
                  )}
                </div>

                {/* Actions Toolbar */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={handleDownloadEnhancedPhoto}
                    className="py-2 px-3 bg-[#27272A] hover:bg-[#3F3F46] border border-[#3F3F46] text-white rounded-xl text-xs font-semibold flex items-center justify-center gap-2 transition-all cursor-pointer"
                  >
                    <Download size={14} className="text-[#D4AF37]" />
                    <span>Baixar Imagem (PNG)</span>
                  </button>

                  {selectedTargetItemId && onEditItem && (
                    <button
                      type="button"
                      onClick={handleApplyPhotoToItem}
                      className="py-2 px-3 bg-[#D4AF37]/20 hover:bg-[#D4AF37]/30 border border-[#D4AF37]/50 text-[#D4AF37] rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer shadow-sm"
                    >
                      <CheckCircle2 size={14} />
                      <span>Salvar no Inventário</span>
                    </button>
                  )}
                </div>

                {/* Photographic Technical Audit (Gemini 3.7 Vision) */}
                {photoResult.audit && (
                  <div className="bg-[#111113] p-4 rounded-xl border border-[#27272A] space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-white flex items-center gap-1.5">
                        <Camera size={14} className="text-[#D4AF37]" /> Auditoria Fotográfica & Comercial
                      </span>
                      <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded uppercase border ${
                        photoResult.audit.apeloComercial === 'EXCELENTE'
                          ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40'
                          : photoResult.audit.apeloComercial === 'BOM'
                          ? 'bg-cyan-500/20 text-cyan-400 border-cyan-500/40'
                          : 'bg-amber-500/20 text-amber-400 border-amber-500/40'
                      }`}>
                        Apelo: {photoResult.audit.apeloComercial}
                      </span>
                    </div>

                    {/* Score Bar */}
                    <div className="space-y-1">
                      <div className="flex justify-between text-[11px] font-mono">
                        <span className="text-[#71717A]">Índice de Qualidade de Catálogo:</span>
                        <span className="text-[#D4AF37] font-bold">{photoResult.audit.scoreQualidade}/100</span>
                      </div>
                      <div className="w-full bg-[#18181B] rounded-full h-2 overflow-hidden border border-[#27272A]">
                        <div
                          className="bg-gradient-to-r from-amber-500 to-emerald-400 h-full transition-all duration-500 rounded-full"
                          style={{ width: `${photoResult.audit.scoreQualidade}%` }}
                        />
                      </div>
                    </div>

                    {/* Technical Diagnostic Grid */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs font-mono">
                      <div className="bg-[#0A0A0B] p-2.5 rounded-lg border border-[#27272A] space-y-0.5">
                        <span className="text-[#71717A] text-[10px] block">Iluminação & Sombras:</span>
                        <span className="text-white text-[11px]">{photoResult.audit.diagnosticoIluminacao}</span>
                      </div>
                      <div className="bg-[#0A0A0B] p-2.5 rounded-lg border border-[#27272A] space-y-0.5">
                        <span className="text-[#71717A] text-[10px] block">Nitidez & Texturas:</span>
                        <span className="text-white text-[11px]">{photoResult.audit.diagnosticoNitidez}</span>
                      </div>
                    </div>

                    {/* Recommendations */}
                    {photoResult.audit.dicasParaFotografia && photoResult.audit.dicasParaFotografia.length > 0 && (
                      <div className="space-y-1.5 pt-1">
                        <span className="text-[10px] font-mono text-[#D4AF37] font-bold block uppercase">
                          💡 Dicas do Especialista para Fotos do Acervo:
                        </span>
                        <ul className="space-y-1 text-xs text-[#A1A1AA]">
                          {photoResult.audit.dicasParaFotografia.map((dica, i) => (
                            <li key={i} className="flex items-start gap-1.5">
                              <span className="text-[#D4AF37] shrink-0">•</span>
                              <span className="leading-snug">{dica}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* SUBVIEW 5: CONTEXTUAL TIPS & ONBOARDING */}
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

        {/* SUBVIEW 6: PREDICTIVE VALIDATOR PLAYGROUND */}
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
              placeholder={isListening ? "Escutando sua voz..." : "Pergunte ou comande por texto ou voz..."}
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
