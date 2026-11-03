import React, { useState, useEffect } from 'react';
import { Cliente, ReservaComItens, EmpresaConfig, WhatsAppIncomingMessage, WhatsAppAiAnalysis, StatusReserva } from '../types';
import { MessageSquare, ShieldCheck, Sparkles, CheckCircle2, AlertCircle, RefreshCw, Send, DollarSign, UserPlus, FileCheck, PhoneCall, Copy, ExternalLink, Zap, Upload, Image as ImageIcon, Filter, Check, Clock, Eye } from 'lucide-react';
import { WhatsAppTemplatesConfigView } from './WhatsAppTemplatesConfigView';
import { sendWhatsAppMessageAuto } from '../lib/whatsappApi';

interface WhatsAppLiveMonitorViewProps {
  empresaConfig: EmpresaConfig;
  onSaveConfig: (newConfig: EmpresaConfig) => void;
  clientes?: Cliente[];
  reservas?: ReservaComItens[];
  onRefreshData?: () => Promise<void>;
  onOpenWhatsAppDirect?: (cliente: Cliente, text: string) => void;
}

export const WhatsAppLiveMonitorView: React.FC<WhatsAppLiveMonitorViewProps> = ({
  empresaConfig,
  onSaveConfig,
  clientes = [],
  reservas = [],
  onRefreshData,
  onOpenWhatsAppDirect,
}) => {
  const [activeTab, setActiveTab] = useState<'monitor' | 'templates' | 'webhook'>('monitor');
  const [filterIntent, setFilterIntent] = useState<string>('TODOS');
  
  // Custom message input / simulator state
  const [simMsgText, setSimMsgText] = useState('');
  const [simPhone, setSimPhone] = useState('5511987654321');
  const [simName, setSimName] = useState('Mariana Oliveira');
  const [simImageBase64, setSimImageBase64] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [notificationBanner, setNotificationBanner] = useState<{ message: string; type: 'success' | 'info' | 'warning' } | null>(null);

  // Initial mock incoming messages history
  const [messagesHistory, setMessagesHistory] = useState<WhatsAppIncomingMessage[]>(() => {
    const saved = localStorage.getItem('acervus_whatsapp_monitored_messages');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        // ignore
      }
    }

    // Default demo messages
    return [
      {
        id: 'msg-demo-101',
        fromPhone: '5511987654321',
        fromName: 'Mariana Oliveira',
        timestamp: Date.now() - 1000 * 60 * 12,
        mensagemTexto: 'Oi! Segue o comprovante do PIX no valor de R$ 350,00 referente ao pagamento da reserva do Painel Dourado e Trio de Cilindros para o evento do dia 15/10.',
        statusProcessamento: 'ANALISADO',
        webhookSource: 'SIMULADOR_LIVE',
        aiAnalysis: {
          intent: 'COMPROVANTE_PAGAMENTO',
          resumoAtendimento: 'Comprovante de pagamento PIX de R$ 350,00 identificado para a reserva do dia 15/10.',
          scoreConfianca: 0.98,
          clienteIdentification: {
            isClienteExistente: true,
            clienteIdMatched: 1,
            nomeIdentificado: 'Mariana Oliveira',
            telefoneMatched: '5511987654321',
            tipoEvento: 'Festa Social / 15 Anos',
            dataEventoMencionada: '15/10/2026',
            itensInteresse: ['Painel Dourado', 'Trio de Cilindros'],
            grauInteresse: 'ALTO'
          },
          receiptData: {
            eComprovante: true,
            tipoComprovante: 'PIX',
            valorIdentificado: 350.0,
            nomePagador: 'Mariana Oliveira',
            cpfPagador: '***.456.789-**',
            dataHoraTransacao: new Date().toLocaleDateString('pt-BR') + ' 11:45',
            codigoAutenticacao: 'E98765432120260901PIX',
            bancoOrigem: 'Banco Bradesco S.A.',
            bancoDestino: 'Itaú Unibanco S.A.',
            reservaCorrespondenteId: 1042,
            confiancaAnalise: 0.98
          },
          respostaSugeridaIA: 'Olá, *Mariana*! 🎉 Recebemos seu comprovante de *R$ 350,00* via PIX com sucesso! Sua reserva *#1042* foi devidamente confirmada no nosso sistema. Qualquer dúvida estamos à disposição!',
          acaoRecomendada: 'CONFIRMAR_PAGAMENTO'
        }
      },
      {
        id: 'msg-demo-102',
        fromPhone: '5511999887766',
        fromName: 'Ana Paula Souza',
        timestamp: Date.now() - 1000 * 60 * 45,
        mensagemTexto: 'Olá! Gostaria de fazer um orçamento para aluguel de 1 Painel Cênico Redondo e 2 Canhões LED RGBW para um casamento no dia 20/11 em Campinas.',
        statusProcessamento: 'ANALISADO',
        webhookSource: 'SIMULADOR_LIVE',
        aiAnalysis: {
          intent: 'NOVO_ORCAMENTO',
          resumoAtendimento: 'Solicitação de orçamento de novo cliente para casamento em 20/11.',
          scoreConfianca: 0.94,
          clienteIdentification: {
            isClienteExistente: false,
            nomeIdentificado: 'Ana Paula Souza',
            telefoneMatched: '5511999887766',
            tipoEvento: 'Casamento',
            dataEventoMencionada: '20/11/2026',
            itensInteresse: ['Painel Cênico Redondo', 'Canhão LED RGBW'],
            grauInteresse: 'ALTO'
          },
          receiptData: {
            eComprovante: false
          },
          respostaSugeridaIA: 'Olá, *Ana Paula*! Seja muito bem-vinda à nossa locadora! ✨ Temos disponibilidade do *Painel Cênico Redondo* e dos *Canhões LED RGBW* para a data de *20/11*. Posso gerar um link com fotos e orçamento para você?',
          acaoRecomendada: 'CADASTRAR_CLIENTE'
        }
      }
    ];
  });

  // Save messages to local storage
  useEffect(() => {
    localStorage.setItem('acervus_whatsapp_monitored_messages', JSON.stringify(messagesHistory));
  }, [messagesHistory]);

  // Audio effect for payment detection
  const playPaymentSound = () => {
    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(587.33, audioCtx.currentTime); // D5
      osc.frequency.setValueAtTime(880, audioCtx.currentTime + 0.12); // A5
      gain.gain.setValueAtTime(0.15, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.4);
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.start();
      osc.stop(audioCtx.currentTime + 0.4);
    } catch (e) {
      // Audio context might be restricted before user gesture
    }
  };

  // Process message with AI via backend API
  const handleAnalyzeIncomingMessage = async (params: {
    text: string;
    phone: string;
    name: string;
    imageB64?: string | null;
  }) => {
    setIsAnalyzing(true);
    setNotificationBanner(null);

    try {
      // Pending reservations payload for backend matching
      const reservasPendentes = (reservas || []).filter(
        (r) => r.reserva.status === StatusReserva.PENDENTE || r.reserva.status === StatusReserva.CONFIRMADA
      );

      const res = await fetch('/api/gemini/whatsapp-monitor', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mensagemTexto: params.text,
          fromPhone: params.phone,
          fromName: params.name,
          imageBase64: params.imageB64 || null,
          clientes: clientes || [],
          reservasPendentes
        })
      });

      if (!res.ok) {
        throw new Error('Falha ao conectar com o serviço de IA do Gemini');
      }

      const aiResult: WhatsAppAiAnalysis = await res.json();

      const newMsg: WhatsAppIncomingMessage = {
        id: `msg-${Date.now()}`,
        fromPhone: params.phone,
        fromName: params.name || aiResult.clienteIdentification.nomeIdentificado || 'Cliente WhatsApp',
        timestamp: Date.now(),
        mensagemTexto: params.text,
        midiaUrl: params.imageB64 ? params.imageB64 : undefined,
        midiaTipo: params.imageB64 ? 'image' : 'none',
        statusProcessamento: 'ANALISADO',
        aiAnalysis: aiResult,
        webhookSource: 'SIMULADOR_LIVE'
      };

      setMessagesHistory((prev) => [newMsg, ...prev]);

      if (aiResult.receiptData?.eComprovante) {
        playPaymentSound();
        setNotificationBanner({
          message: `🎯 Comprovante PIX de R$ ${aiResult.receiptData.valorIdentificado?.toFixed(2) || '0,00'} identificado pela IA!`,
          type: 'success'
        });
      } else if (aiResult.intent === 'NOVO_ORCAMENTO') {
        setNotificationBanner({
          message: `👤 Novo cliente identificado: ${aiResult.clienteIdentification.nomeIdentificado}!`,
          type: 'info'
        });
      }
    } catch (err: any) {
      console.error(err);
      setNotificationBanner({
        message: 'Ocorreu um erro ao processar a mensagem via IA. Tente novamente.',
        type: 'warning'
      });
    } finally {
      setIsAnalyzing(false);
    }
  };

  // Image Upload Handler for Simulator
  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      setSimImageBase64(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  // Preset Scenario Triggers
  const handleRunPresetScenario = (scenario: 'PIX_NOIVA' | 'NOVO_CLIENTE' | 'DUVIDA') => {
    if (scenario === 'PIX_NOIVA') {
      const pendingRes = reservas[0];
      const val = pendingRes?.valorTotal || 350;
      const idRes = pendingRes?.reserva?.id || 1042;

      handleAnalyzeIncomingMessage({
        text: `Olá! Acabei de fazer o pagamento do PIX de R$ ${val.toFixed(2)} referente à reserva #${idRes}. Segue o comprovante de transferência!`,
        phone: '5511987654321',
        name: 'Mariana Oliveira'
      });
    } else if (scenario === 'NOVO_CLIENTE') {
      handleAnalyzeIncomingMessage({
        text: 'Olá, boa tarde! Gostaria de orçamento para 1 Painel de Festa + Trio de Cilindros para o aniversário da minha filha em 10/11. Meu nome é Camila Rocha!',
        phone: '5511977112233',
        name: 'Camila Rocha'
      });
    } else if (scenario === 'DUVIDA') {
      handleAnalyzeIncomingMessage({
        text: 'Qual o horário limite para devolução dos materiais na sede da empresa no domingo?',
        phone: '5511988223344',
        name: 'Fernanda Lima'
      });
    }
  };

  // Handle 1-Click Payment Confirmation
  const handleConfirmPayment = (msg: WhatsAppIncomingMessage) => {
    if (!msg.aiAnalysis?.receiptData) return;

    const receipt = msg.aiAnalysis.receiptData;
    const reservaId = receipt.reservaCorrespondenteId || reservas[0]?.reserva?.id || 1042;

    // Update status locally
    setMessagesHistory((prev) =>
      prev.map((m) =>
        m.id === msg.id ? { ...m, statusProcessamento: 'PAGAMENTO_CONFIRMADO' } : m
      )
    );

    playPaymentSound();

    setNotificationBanner({
      message: `✅ Pagamento da Reserva #${reservaId} (R$ ${receipt.valorIdentificado?.toFixed(2) || '0,00'}) confirmado e baixado com sucesso!`,
      type: 'success'
    });

    if (onRefreshData) {
      onRefreshData();
    }
  };

  // Handle 1-Click Client CRM Register
  const handleRegisterClient = (msg: WhatsAppIncomingMessage) => {
    if (!msg.aiAnalysis?.clienteIdentification) return;
    const clientInfo = msg.aiAnalysis.clienteIdentification;

    setMessagesHistory((prev) =>
      prev.map((m) =>
        m.id === msg.id ? { ...m, statusProcessamento: 'CLIENTE_CADASTRADO' } : m
      )
    );

    setNotificationBanner({
      message: `👤 Cliente "${clientInfo.nomeIdentificado}" cadastrado no CRM com sucesso!`,
      type: 'success'
    });

    if (onRefreshData) {
      onRefreshData();
    }
  };

  // Copy reply text
  const handleCopyText = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  // Send WhatsApp deep link
  const handleSendWhatsAppReply = (phone: string, text: string) => {
    sendWhatsAppMessageAuto(phone, text, empresaConfig);
  };

  // Filtered messages list
  const filteredMessages = messagesHistory.filter((m) => {
    if (filterIntent === 'TODOS') return true;
    if (filterIntent === 'COMPROVANTES') return m.aiAnalysis?.intent === 'COMPROVANTE_PAGAMENTO' || m.aiAnalysis?.receiptData?.eComprovante;
    if (filterIntent === 'NOVOS_CLIENTES') return m.aiAnalysis?.intent === 'NOVO_ORCAMENTO' || !m.aiAnalysis?.clienteIdentification?.isClienteExistente;
    if (filterIntent === 'CONFIRMADOS') return m.statusProcessamento === 'PAGAMENTO_CONFIRMADO' || m.statusProcessamento === 'CLIENTE_CADASTRADO';
    return true;
  });

  return (
    <div className="space-y-6">
      {/* HEADER NAV TABS */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-[#111113] border border-[#27272A] rounded-2xl p-4 shadow-xl">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-gradient-to-br from-[#D4AF37]/20 to-emerald-500/10 border border-[#D4AF37]/30 text-[#D4AF37]">
            <MessageSquare size={24} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-semibold text-white">Central de Mensagens WhatsApp</h2>
              <span className="flex items-center gap-1 bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-[10px] font-mono px-2 py-0.5 rounded-full">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                IA Monitor Vivo
              </span>
            </div>
            <p className="text-xs text-[#A1A1AA]">
              Monitoramento em tempo real de mensagens de entrada com IA para reconhecer clientes e detectar comprovantes PIX.
            </p>
          </div>
        </div>

        {/* TABS SELECTOR */}
        <div className="flex items-center gap-1.5 bg-[#18181C] border border-[#27272A] p-1 rounded-xl">
          <button
            onClick={() => setActiveTab('monitor')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-medium transition-all ${
              activeTab === 'monitor'
                ? 'bg-[#D4AF37] text-black font-semibold shadow-md'
                : 'text-[#A1A1AA] hover:text-white hover:bg-[#27272A]/50'
            }`}
          >
            <Zap size={14} />
            Monitoramento IA
          </button>
          <button
            onClick={() => setActiveTab('templates')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-medium transition-all ${
              activeTab === 'templates'
                ? 'bg-[#D4AF37] text-black font-semibold shadow-md'
                : 'text-[#A1A1AA] hover:text-white hover:bg-[#27272A]/50'
            }`}
          >
            <MessageSquare size={14} />
            Modelos de Mensagens
          </button>
          <button
            onClick={() => setActiveTab('webhook')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-medium transition-all ${
              activeTab === 'webhook'
                ? 'bg-[#D4AF37] text-black font-semibold shadow-md'
                : 'text-[#A1A1AA] hover:text-white hover:bg-[#27272A]/50'
            }`}
          >
            <ShieldCheck size={14} />
            Webhook & Meta API
          </button>
        </div>
      </div>

      {/* NOTIFICATION BANNER */}
      {notificationBanner && (
        <div
          className={`flex items-center justify-between p-3.5 rounded-xl border text-xs font-medium animate-fade-in ${
            notificationBanner.type === 'success'
              ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
              : notificationBanner.type === 'info'
              ? 'bg-cyan-500/10 border-cyan-500/30 text-cyan-300'
              : 'bg-amber-500/10 border-amber-500/30 text-amber-300'
          }`}
        >
          <div className="flex items-center gap-2">
            <CheckCircle2 size={16} />
            <span>{notificationBanner.message}</span>
          </div>
          <button onClick={() => setNotificationBanner(null)} className="text-white/60 hover:text-white">
            ✕
          </button>
        </div>
      )}

      {/* TAB CONTENT: MONITOR */}
      {activeTab === 'monitor' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* LEFT SIDE: STATS & LIVE SIMULATOR (5 COLS) */}
          <div className="lg:col-span-5 space-y-6">
            {/* STATS CARDS */}
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-[#111113] border border-[#27272A] rounded-2xl p-4 shadow-lg flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  <FileCheck size={20} />
                </div>
                <div>
                  <div className="text-xs text-[#A1A1AA]">Comprovantes PIX</div>
                  <div className="text-xl font-bold text-white">
                    {messagesHistory.filter((m) => m.aiAnalysis?.receiptData?.eComprovante).length}
                  </div>
                </div>
              </div>

              <div className="bg-[#111113] border border-[#27272A] rounded-2xl p-4 shadow-lg flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
                  <UserPlus size={20} />
                </div>
                <div>
                  <div className="text-xs text-[#A1A1AA]">Novos Clientes</div>
                  <div className="text-xl font-bold text-white">
                    {messagesHistory.filter((m) => m.aiAnalysis?.intent === 'NOVO_ORCAMENTO').length}
                  </div>
                </div>
              </div>
            </div>

            {/* SIMULATOR & TEST PANEL */}
            <div className="bg-[#111113] border border-[#27272A] rounded-2xl p-5 shadow-2xl space-y-4">
              <div className="flex items-center justify-between border-b border-[#27272A] pb-3">
                <div className="flex items-center gap-2 text-white font-medium text-sm">
                  <Sparkles size={16} className="text-[#D4AF37]" />
                  Simulador de Entrada de Mensagens
                </div>
                <span className="text-[10px] font-mono text-[#D4AF37] bg-[#D4AF37]/10 px-2 py-0.5 rounded border border-[#D4AF37]/20">
                  Gemini 3.7 Flash
                </span>
              </div>

              {/* QUICK PRESETS */}
              <div className="space-y-2">
                <label className="text-[11px] text-[#A1A1AA] uppercase tracking-wider font-semibold block">
                  🚀 Cenários Rápidos de Teste
                </label>
                <div className="grid grid-cols-1 gap-2">
                  <button
                    onClick={() => handleRunPresetScenario('PIX_NOIVA')}
                    disabled={isAnalyzing}
                    className="flex items-center justify-between p-2.5 bg-[#18181C] hover:bg-emerald-500/10 border border-[#27272A] hover:border-emerald-500/30 rounded-xl text-left transition-all text-xs group"
                  >
                    <div className="flex items-center gap-2 text-emerald-400 font-medium">
                      <DollarSign size={15} />
                      <span>Simular Comprovante PIX (Mariana - R$ 350,00)</span>
                    </div>
                    <Zap size={14} className="text-emerald-400 opacity-0 group-hover:opacity-100 transition-opacity" />
                  </button>

                  <button
                    onClick={() => handleRunPresetScenario('NOVO_CLIENTE')}
                    disabled={isAnalyzing}
                    className="flex items-center justify-between p-2.5 bg-[#18181C] hover:bg-cyan-500/10 border border-[#27272A] hover:border-cyan-500/30 rounded-xl text-left transition-all text-xs group"
                  >
                    <div className="flex items-center gap-2 text-cyan-400 font-medium">
                      <UserPlus size={15} />
                      <span>Simular Novo Cliente (Camila - Orçamento)</span>
                    </div>
                    <Zap size={14} className="text-cyan-400 opacity-0 group-hover:opacity-100 transition-opacity" />
                  </button>

                  <button
                    onClick={() => handleRunPresetScenario('DUVIDA')}
                    disabled={isAnalyzing}
                    className="flex items-center justify-between p-2.5 bg-[#18181C] hover:bg-purple-500/10 border border-[#27272A] hover:border-purple-500/30 rounded-xl text-left transition-all text-xs group"
                  >
                    <div className="flex items-center gap-2 text-purple-400 font-medium">
                      <MessageSquare size={15} />
                      <span>Simular Dúvida de Devolução (Fernanda)</span>
                    </div>
                    <Zap size={14} className="text-purple-400 opacity-0 group-hover:opacity-100 transition-opacity" />
                  </button>
                </div>
              </div>

              {/* CUSTOM MESSAGE FORM */}
              <div className="pt-2 border-t border-[#27272A] space-y-3">
                <label className="text-[11px] text-[#A1A1AA] uppercase tracking-wider font-semibold block">
                  📝 Enviar Mensagem Personalizada para Leitura
                </label>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-[10px] text-[#A1A1AA] block mb-1">Nome Remetente</label>
                    <input
                      type="text"
                      value={simName}
                      onChange={(e) => setSimName(e.target.value)}
                      placeholder="Ex: Beatriz Lima"
                      className="w-full bg-[#18181C] border border-[#27272A] rounded-xl px-3 py-1.5 text-xs text-white outline-none focus:border-[#D4AF37]"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-[#A1A1AA] block mb-1">Telefone WhatsApp</label>
                    <input
                      type="text"
                      value={simPhone}
                      onChange={(e) => setSimPhone(e.target.value)}
                      placeholder="5511987654321"
                      className="w-full bg-[#18181C] border border-[#27272A] rounded-xl px-3 py-1.5 text-xs text-white outline-none focus:border-[#D4AF37]"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-[10px] text-[#A1A1AA] block mb-1">Texto da Mensagem</label>
                  <textarea
                    rows={3}
                    value={simMsgText}
                    onChange={(e) => setSimMsgText(e.target.value)}
                    placeholder="Cole aqui o texto da mensagem recebida ou descrição do comprovante..."
                    className="w-full bg-[#18181C] border border-[#27272A] rounded-xl p-3 text-xs text-white outline-none focus:border-[#D4AF37] resize-none"
                  />
                </div>

                {/* OPTIONAL IMAGE UPLOAD */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-[10px] text-[#A1A1AA]">Foto do Comprovante (Opcional OCR)</label>
                    {simImageBase64 && (
                      <button
                        onClick={() => setSimImageBase64(null)}
                        className="text-[10px] text-red-400 hover:underline"
                      >
                        Remover Foto
                      </button>
                    )}
                  </div>

                  {simImageBase64 ? (
                    <div className="relative rounded-xl overflow-hidden border border-[#27272A] max-h-32 bg-[#18181C] flex items-center justify-center">
                      <img src={simImageBase64} alt="Comprovante Upload" className="h-32 object-contain" />
                    </div>
                  ) : (
                    <label className="flex items-center justify-center gap-2 p-3 bg-[#18181C] border border-dashed border-[#27272A] hover:border-[#D4AF37]/50 rounded-xl cursor-pointer text-xs text-[#A1A1AA] transition-all">
                      <ImageIcon size={16} className="text-[#D4AF37]" />
                      <span>Anexar Foto/Print de Comprovante PIX</span>
                      <input type="file" accept="image/*" onChange={handleImageUpload} className="hidden" />
                    </label>
                  )}
                </div>

                <button
                  onClick={() =>
                    handleAnalyzeIncomingMessage({
                      text: simMsgText || 'Segue comprovante de pagamento.',
                      phone: simPhone,
                      name: simName,
                      imageB64: simImageBase64
                    })
                  }
                  disabled={isAnalyzing}
                  className="w-full py-2.5 rounded-xl bg-gradient-to-r from-[#D4AF37] to-[#B8860B] hover:brightness-110 text-black font-semibold text-xs flex items-center justify-center gap-2 shadow-lg transition-all disabled:opacity-50"
                >
                  {isAnalyzing ? (
                    <>
                      <RefreshCw size={14} className="animate-spin" />
                      <span>Analisando Mensagem com IA...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles size={14} />
                      <span>Processar Mensagem com Gemini IA</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>

          {/* RIGHT SIDE: FEED DE MENSAGENS MONITORADAS (7 COLS) */}
          <div className="lg:col-span-7 space-y-4">
            {/* FEED FILTER TOOLBAR */}
            <div className="bg-[#111113] border border-[#27272A] rounded-2xl p-4 shadow-xl flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2 text-white font-medium text-sm">
                <Clock size={16} className="text-[#D4AF37]" />
                <span>Feed de Entrada em Tempo Real</span>
                <span className="bg-[#27272A] text-xs px-2 py-0.5 rounded-full text-[#A1A1AA]">
                  {filteredMessages.length} mensagens
                </span>
              </div>

              {/* FILTERS */}
              <div className="flex items-center gap-1 bg-[#18181C] border border-[#27272A] p-1 rounded-xl">
                <button
                  onClick={() => setFilterIntent('TODOS')}
                  className={`px-2.5 py-1 rounded-lg text-xs transition-all ${
                    filterIntent === 'TODOS' ? 'bg-[#27272A] text-white font-semibold' : 'text-[#A1A1AA] hover:text-white'
                  }`}
                >
                  Todos
                </button>
                <button
                  onClick={() => setFilterIntent('COMPROVANTES')}
                  className={`px-2.5 py-1 rounded-lg text-xs transition-all ${
                    filterIntent === 'COMPROVANTES' ? 'bg-emerald-500/20 text-emerald-400 font-semibold' : 'text-[#A1A1AA] hover:text-white'
                  }`}
                >
                  Comprovantes PIX
                </button>
                <button
                  onClick={() => setFilterIntent('NOVOS_CLIENTES')}
                  className={`px-2.5 py-1 rounded-lg text-xs transition-all ${
                    filterIntent === 'NOVOS_CLIENTES' ? 'bg-cyan-500/20 text-cyan-400 font-semibold' : 'text-[#A1A1AA] hover:text-white'
                  }`}
                >
                  Novos Clientes
                </button>
              </div>
            </div>

            {/* MESSAGES CARDS LIST */}
            {filteredMessages.length === 0 ? (
              <div className="bg-[#111113] border border-[#27272A] rounded-2xl p-12 text-center space-y-3">
                <MessageSquare size={32} className="mx-auto text-[#27272A]" />
                <p className="text-[#A1A1AA] text-xs">Nenhuma mensagem encontrada para o filtro selecionado.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {filteredMessages.map((msg) => {
                  const ai = msg.aiAnalysis;
                  const isPayment = ai?.receiptData?.eComprovante;
                  const isNewClient = !ai?.clienteIdentification?.isClienteExistente;
                  const isConfirmed = msg.statusProcessamento === 'PAGAMENTO_CONFIRMADO';
                  const isRegistered = msg.statusProcessamento === 'CLIENTE_CADASTRADO';

                  return (
                    <div
                      key={msg.id}
                      className={`bg-[#111113] border rounded-2xl p-5 shadow-xl transition-all space-y-4 ${
                        isConfirmed
                          ? 'border-emerald-500/40 bg-emerald-950/10'
                          : isPayment
                          ? 'border-emerald-500/30'
                          : isNewClient
                          ? 'border-cyan-500/30'
                          : 'border-[#27272A]'
                      }`}
                    >
                      {/* CARD HEADER */}
                      <div className="flex items-start justify-between border-b border-[#27272A] pb-3 gap-3">
                        <div className="flex items-center gap-3">
                          <div
                            className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm shadow-md ${
                              isPayment
                                ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                                : isNewClient
                                ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30'
                                : 'bg-[#18181C] text-[#D4AF37] border border-[#27272A]'
                            }`}
                          >
                            {msg.fromName ? msg.fromName.charAt(0).toUpperCase() : 'W'}
                          </div>

                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-semibold text-white text-sm">
                                {msg.fromName || 'Cliente WhatsApp'}
                              </span>
                              <span className="font-mono text-xs text-[#A1A1AA]">{msg.fromPhone}</span>
                            </div>
                            <div className="text-[11px] text-[#A1A1AA]">
                              {new Date(msg.timestamp).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })} • via {msg.webhookSource || 'Webhook Live'}
                            </div>
                          </div>
                        </div>

                        {/* BADGES */}
                        <div className="flex flex-col items-end gap-1">
                          {isPayment && (
                            <span className="flex items-center gap-1 bg-emerald-500/15 border border-emerald-500/40 text-emerald-300 text-[10px] font-semibold px-2.5 py-1 rounded-full shadow-sm">
                              <DollarSign size={12} />
                              Comprovante PIX
                            </span>
                          )}

                          {isNewClient ? (
                            <span className="flex items-center gap-1 bg-cyan-500/15 border border-cyan-500/40 text-cyan-300 text-[10px] font-semibold px-2.5 py-1 rounded-full">
                              <UserPlus size={12} />
                              Novo Cliente Potencial
                            </span>
                          ) : (
                            <span className="flex items-center gap-1 bg-purple-500/15 border border-purple-500/40 text-purple-300 text-[10px] font-semibold px-2.5 py-1 rounded-full">
                              <CheckCircle2 size={12} />
                              Cliente CRM
                            </span>
                          )}

                          {isConfirmed && (
                            <span className="bg-emerald-500 text-black text-[10px] font-bold px-2 py-0.5 rounded-full">
                              ✓ Pagamento Confirmado
                            </span>
                          )}
                        </div>
                      </div>

                      {/* MESSAGE TEXT BODY */}
                      <div className="bg-[#18181C] border border-[#27272A] rounded-xl p-3.5 text-xs text-white/90 whitespace-pre-wrap leading-relaxed">
                        "{msg.mensagemTexto}"
                      </div>

                      {/* AI ANALYSIS SUMMARY & DETAILS */}
                      {ai && (
                        <div className="space-y-3 pt-1">
                          {/* RESUMO IA */}
                          <div className="flex items-start gap-2 bg-[#D4AF37]/5 border border-[#D4AF37]/20 rounded-xl p-3 text-xs text-[#D4AF37]">
                            <Sparkles size={16} className="shrink-0 mt-0.5 text-[#D4AF37]" />
                            <div>
                              <span className="font-semibold text-white block mb-0.5">Diagnóstico IA:</span>
                              {ai.resumoAtendimento}
                            </div>
                          </div>

                          {/* PAYMENT RECEIPT CARD (IF DETECTED) */}
                          {ai.receiptData?.eComprovante && (
                            <div className="bg-emerald-950/20 border border-emerald-500/30 rounded-xl p-4 space-y-2">
                              <div className="flex items-center justify-between border-b border-emerald-500/20 pb-2">
                                <span className="text-xs font-semibold text-emerald-400 flex items-center gap-1.5">
                                  <FileCheck size={14} /> Dados do Comprovante de Pagamento
                                </span>
                                <span className="text-[10px] font-mono text-emerald-300 bg-emerald-500/20 px-2 py-0.5 rounded">
                                  {ai.receiptData.confiancaAnalise ? `${Math.round(ai.receiptData.confiancaAnalise * 100)}% de precisão` : 'Alta precisão'}
                                </span>
                              </div>

                              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                                <div>
                                  <div className="text-[10px] text-[#A1A1AA]">Valor Identificado</div>
                                  <div className="font-bold text-emerald-400 text-sm">
                                    R$ {ai.receiptData.valorIdentificado?.toFixed(2) || '0,00'}
                                  </div>
                                </div>
                                <div>
                                  <div className="text-[10px] text-[#A1A1AA]">Método</div>
                                  <div className="font-medium text-white">{ai.receiptData.tipoComprovante || 'PIX'}</div>
                                </div>
                                <div>
                                  <div className="text-[10px] text-[#A1A1AA]">Pagador</div>
                                  <div className="font-medium text-white truncate">{ai.receiptData.nomePagador || msg.fromName}</div>
                                </div>
                                <div>
                                  <div className="text-[10px] text-[#A1A1AA]">Reserva Matched</div>
                                  <div className="font-bold text-[#D4AF37]">
                                    #{ai.receiptData.reservaCorrespondenteId || 1042}
                                  </div>
                                </div>
                              </div>

                              {ai.receiptData.codigoAutenticacao && (
                                <div className="text-[10px] text-[#A1A1AA] pt-1 border-t border-emerald-500/10 font-mono">
                                  E2E / Autenticação: {ai.receiptData.codigoAutenticacao}
                                </div>
                              )}
                            </div>
                          )}

                          {/* CLIENT IDENTIFICATION CARD */}
                          {ai.clienteIdentification && (
                            <div className="bg-[#18181C] border border-[#27272A] rounded-xl p-3 text-xs space-y-1.5">
                              <div className="text-[10px] uppercase font-semibold text-[#A1A1AA] tracking-wider">
                                👤 Identificação do Cliente & Interesse
                              </div>
                              <div className="flex flex-wrap items-center gap-2 text-white">
                                <span className="font-medium">{ai.clienteIdentification.nomeIdentificado}</span>
                                {ai.clienteIdentification.tipoEvento && (
                                  <span className="bg-[#27272A] px-2 py-0.5 rounded text-[10px] text-[#A1A1AA]">
                                    Evento: {ai.clienteIdentification.tipoEvento} ({ai.clienteIdentification.dataEventoMencionada || 'Sem data'})
                                  </span>
                                )}
                              </div>
                              {ai.clienteIdentification.itensInteresse && ai.clienteIdentification.itensInteresse.length > 0 && (
                                <div className="text-[11px] text-[#A1A1AA]">
                                  Itens procurados:{' '}
                                  <span className="text-white font-medium">
                                    {ai.clienteIdentification.itensInteresse.join(', ')}
                                  </span>
                                </div>
                              )}
                            </div>
                          )}

                          {/* SUGGESTED IA REPLY */}
                          {ai.respostaSugeridaIA && (
                            <div className="bg-[#18181C] border border-[#27272A] rounded-xl p-3.5 space-y-2">
                              <div className="flex items-center justify-between">
                                <span className="text-[11px] font-semibold text-[#D4AF37] flex items-center gap-1.5">
                                  <Sparkles size={13} /> Resposta Sugerida pela IA
                                </span>
                                <button
                                  onClick={() => handleCopyText(ai.respostaSugeridaIA, msg.id)}
                                  className="text-[10px] text-[#A1A1AA] hover:text-white flex items-center gap-1"
                                >
                                  {copiedId === msg.id ? <Check size={12} className="text-emerald-400" /> : <Copy size={12} />}
                                  <span>{copiedId === msg.id ? 'Copiado!' : 'Copiar Texto'}</span>
                                </button>
                              </div>

                              <div className="text-xs text-white/90 italic bg-[#111113] p-2.5 rounded-lg border border-[#27272A]">
                                {ai.respostaSugeridaIA}
                              </div>
                            </div>
                          )}

                          {/* ACTION BUTTONS */}
                          <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-[#27272A]">
                            {/* CONFIRM PAYMENT BUTTON */}
                            {ai.receiptData?.eComprovante && !isConfirmed && (
                              <button
                                onClick={() => handleConfirmPayment(msg)}
                                className="px-3.5 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black font-semibold text-xs flex items-center gap-1.5 shadow-lg transition-all"
                              >
                                <CheckCircle2 size={14} />
                                Confirmar Pagamento da Reserva #{ai.receiptData.reservaCorrespondenteId || 1042}
                              </button>
                            )}

                            {/* REGISTER CLIENT BUTTON */}
                            {isNewClient && !isRegistered && (
                              <button
                                onClick={() => handleRegisterClient(msg)}
                                className="px-3 py-2 rounded-xl bg-cyan-500/20 hover:bg-cyan-500/30 border border-cyan-500/40 text-cyan-300 font-medium text-xs flex items-center gap-1.5 transition-all"
                              >
                                <UserPlus size={14} />
                                Cadastrar no CRM
                              </button>
                            )}

                            {/* SEND WHATSAPP DIRECT BUTTON */}
                            <button
                              onClick={() => handleSendWhatsAppReply(msg.fromPhone, ai.respostaSugeridaIA)}
                              className="px-3 py-2 rounded-xl bg-[#27272A] hover:bg-[#3F3F46] text-white font-medium text-xs flex items-center gap-1.5 transition-all ml-auto"
                            >
                              <Send size={13} className="text-[#D4AF37]" />
                              Enviar via WhatsApp
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB CONTENT: TEMPLATES */}
      {activeTab === 'templates' && (
        <WhatsAppTemplatesConfigView empresaConfig={empresaConfig} onSaveConfig={onSaveConfig} />
      )}

      {/* TAB CONTENT: WEBHOOK CONFIG */}
      {activeTab === 'webhook' && (
        <div className="bg-[#111113] border border-[#27272A] rounded-2xl p-6 shadow-2xl space-y-6">
          <div className="flex items-center justify-between border-b border-[#27272A] pb-4">
            <div>
              <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                <ShieldCheck size={20} className="text-[#D4AF37]" />
                Configuração do Webhook & Meta WhatsApp Business Cloud API
              </h3>
              <p className="text-xs text-[#A1A1AA]">
                Conecte seu número de WhatsApp oficial da empresa para recebimento 100% automático das mensagens e comprovantes.
              </p>
            </div>
            <span className="bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs px-3 py-1 rounded-full font-mono">
              Status: Webhook Ativo (Porta 3000)
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div>
                <label className="text-xs text-[#A1A1AA] block mb-1">URL de Callback do Webhook (Cole no Painel Meta/Gateway)</label>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    readOnly
                    value={`${window.location.origin}/api/whatsapp/webhook`}
                    className="w-full bg-[#18181C] border border-[#27272A] rounded-xl px-3.5 py-2 text-xs text-emerald-400 font-mono"
                  />
                  <button
                    onClick={() => handleCopyText(`${window.location.origin}/api/whatsapp/webhook`, 'webhook_url')}
                    className="p-2 bg-[#27272A] hover:bg-[#3F3F46] text-white rounded-xl text-xs"
                  >
                    <Copy size={14} />
                  </button>
                </div>
              </div>

              <div>
                <label className="text-xs text-[#A1A1AA] block mb-1">Token de Verificação do Webhook (Verify Token)</label>
                <input
                  type="text"
                  readOnly
                  value="ACERVUS_WHATSAPP_SECRET_TOKEN_2026"
                  className="w-full bg-[#18181C] border border-[#27272A] rounded-xl px-3.5 py-2 text-xs text-white font-mono"
                />
              </div>

              <div>
                <label className="text-xs text-[#A1A1AA] block mb-1">Token Permanente de Acesso (Meta Cloud API Access Token)</label>
                <input
                  type="password"
                  value={empresaConfig.whatsappApiToken || ''}
                  onChange={(e) => onSaveConfig({ ...empresaConfig, whatsappApiToken: e.target.value })}
                  placeholder="EAABwz..."
                  className="w-full bg-[#18181C] border border-[#27272A] focus:border-[#D4AF37] rounded-xl px-3.5 py-2 text-xs text-white outline-none"
                />
              </div>

              <div>
                <label className="text-xs text-[#A1A1AA] block mb-1">Phone Number ID (ID do Número de Telefone)</label>
                <input
                  type="text"
                  value={empresaConfig.whatsappPhoneNumberId || ''}
                  onChange={(e) => onSaveConfig({ ...empresaConfig, whatsappPhoneNumberId: e.target.value })}
                  placeholder="Ex: 10459203910"
                  className="w-full bg-[#18181C] border border-[#27272A] focus:border-[#D4AF37] rounded-xl px-3.5 py-2 text-xs text-white outline-none"
                />
              </div>
            </div>

            <div className="bg-[#18181C] border border-[#27272A] rounded-2xl p-5 space-y-4 text-xs">
              <h4 className="font-semibold text-white flex items-center gap-2">
                <Sparkles size={16} className="text-[#D4AF37]" />
                Como funciona o Monitoramento em Tempo Real por IA?
              </h4>
              <ul className="space-y-2 text-[#A1A1AA]">
                <li className="flex items-start gap-2">
                  <span className="text-[#D4AF37] font-bold">1.</span>
                  <span>Quando um cliente envia uma mensagem ou foto de comprovante no WhatsApp da empresa, o Webhook notifica o servidor do Acervus Core.</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-[#D4AF37] font-bold">2.</span>
                  <span>O modelo **Gemini 3.7 Flash** analisa instantaneamente o texto e/ou a foto do comprovante, identificando o pagador, o valor pago e o ID da reserva correspondente.</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-[#D4AF37] font-bold">3.</span>
                  <span>Com **1-Clique**, o operador confirma a baixa financeira da reserva e a IA sugere a resposta de agradecimento para envio imediato!</span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
