import React, { useState } from 'react';
import { EmpresaConfig, PlanoAssinatura, PlanoSuporte, AssinaturaAtual, FaturaAssinatura, ChamadoSuporte } from '../types';
import {
  ShieldCheck,
  Zap,
  CheckCircle2,
  Crown,
  Clock,
  HelpCircle,
  CreditCard,
  QrCode,
  FileText,
  MessageSquare,
  Sparkles,
  Headphones,
  ArrowRight,
  Send,
  AlertTriangle,
  RefreshCw,
  Download,
  Building,
  Check,
  ChevronDown,
  ChevronUp,
  X,
  PhoneCall,
  Mail,
  LifeBuoy,
  BadgePercent,
  Calendar,
  Lock,
  DollarSign,
  Plus
} from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';

interface PlanoAssinaturaSuporteViewProps {
  empresaConfig: EmpresaConfig;
  onSaveConfig: (updatedConfig: EmpresaConfig) => void;
}

// Planos Padrão do Acervus Core
const PLANOS_DISPONIVEIS: PlanoAssinatura[] = [
  {
    id: 'plano_bronze',
    nome: 'Bronze (Starter)',
    nivel: 'BRONZE',
    valorMensal: 149,
    valorAnualMensalizado: 129,
    descricao: 'Ideal para pequenas locadoras iniciando a digitalização do galpão.',
    limiteOperadores: 'Até 3 operadores',
    limiteItensAcervo: 'Até 1.000 itens',
    recursosInclusos: [
      'Gestão de Acervo com Fotos e Categorias',
      'Controle de Disponibilidade por Calendário',
      'Propostas no WhatsApp com Assinatura Digital',
      'Leitura de QR Code e Código de Barras no Galpão',
      'App Android para Operadores (3 licenças)',
    ],
    incluiIaGemini: false,
    emissaoNfseInclusa: true,
  },
  {
    id: 'plano_prata',
    nome: 'Prata (Profissional)',
    nivel: 'PRATA',
    valorMensal: 299,
    valorAnualMensalizado: 249,
    descricao: 'Para locadoras ativas que buscam cenografia virtual e contrato digital completo.',
    limiteOperadores: 'Até 10 operadores',
    limiteItensAcervo: 'Itens ilimitados',
    recursosInclusos: [
      'Tudo do Plano Bronze',
      'IA Gemini de Cenografia Virtual 3D e Vistoria',
      'Gerador de Pitch Comercial e WhatsApp Automático',
      'Emissão Ilimitada de NFS-e (SEFIN / Gov.br)',
      'Laudo Fotográfico de Avarias e Manutenção',
      'Módulo de Kits e Componentes de Locação',
      'App Android para Operadores (10 licenças)',
    ],
    incluiIaGemini: true,
    emissaoNfseInclusa: true,
    recomendado: true,
  },
  {
    id: 'plano_ouro',
    nome: 'Ouro (Enterprise Multi-Tenant)',
    nivel: 'OURO',
    valorMensal: 599,
    valorAnualMensalizado: 499,
    descricao: 'Para grandes redes de locação e galpões com alta demanda de logísticas simultâneas.',
    limiteOperadores: 'Operadores Ilimitados',
    limiteItensAcervo: 'Itens Ilimitados',
    recursosInclusos: [
      'Tudo do Plano Prata',
      'Usuários e Terminais Android Ilimitados',
      'Servidor Dedicado Cloud SQL PostgreSQL com Backup Diário',
      'Sincronização em Tempo Real (WorkManager + Offline)',
      'Relatórios Avançados de BI e Previsão de Demandas',
      'Múltiplos Representantes Comerciais e Permissões',
    ],
    incluiIaGemini: true,
    emissaoNfseInclusa: true,
  },
];

const PLANOS_SUPORTE_DISPONIVEIS: PlanoSuporte[] = [
  {
    id: 'sup_basico',
    nome: 'Suporte Padrão (Incluso)',
    nivel: 'BASICO',
    valorMensal: 0,
    tempoRespostaSla: 'Em até 24 horas úteis',
    canaisAtendimento: ['Atendimento via Ticket / E-mail', 'Base de Conhecimento e Vídeos'],
    descricao: 'Incluso gratuitamente em todas as licenças do sistema.',
  },
  {
    id: 'sup_vip',
    nome: 'Suporte Prioritário VIP',
    nivel: 'PRIORITARIO_VIP',
    valorMensal: 89,
    tempoRespostaSla: 'Em até 15 minutos (Horário Comercial)',
    canaisAtendimento: ['Canal Direto no WhatsApp com Técnico Dedicado', 'Suporte em Certificados Digitais e NFS-e', 'Treinamento de Equipe em Vídeo'],
    descricao: 'Recomendado para operações que necessitam de resposta imediata no galpão.',
    destaque: true,
  },
  {
    id: 'sup_247',
    nome: 'Assistência Nuvem 24/7 & Consultoria',
    nivel: 'TECNICO_247',
    valorMensal: 199,
    tempoRespostaSla: 'Atendimento Imediato 24/7 (SLA 30 min)',
    canaisAtendimento: ['Linha Direta de Emergência 24h', 'Acompanhamento de Backups no Google Cloud', 'Otimização de Banco de Dados e Consultoria de Processos'],
    descricao: 'Para empresas com operações críticas aos finais de semana e madrugadas.',
  },
];

export const PlanoAssinaturaSuporteView: React.FC<PlanoAssinaturaSuporteViewProps> = ({
  empresaConfig,
  onSaveConfig,
}) => {
  const [activeTab, setActiveTab] = useState<'visao_geral' | 'planos_licenca' | 'planos_suporte' | 'faturas' | 'chamados'>('visao_geral');
  const [cicloAnual, setCicloAnual] = useState<boolean>(true);

  // Assinatura atual do estado ou fallback padrão de simulação
  const assinaturaAtual: AssinaturaAtual = empresaConfig.assinaturaAtiva || {
    planoId: 'plano_prata',
    planoSuporteId: 'sup_vip',
    cicloPagamento: 'ANUAL',
    status: 'ATIVO',
    dataInicio: Date.now() - 30 * 24 * 60 * 60 * 1000,
    dataProximaRenovacao: Date.now() + 335 * 24 * 60 * 60 * 1000,
    valorTotalRecorrente: 338, // 249 (Plano Prata anual) + 89 (Suporte VIP)
    metodoPagamentoPadrao: 'PIX',
    autoRenovacao: true,
  };

  const faturas: FaturaAssinatura[] = empresaConfig.historicoFaturas || [
    {
      id: 'fat_001',
      codigoFatura: 'FAT-2026-08',
      dataEmissao: Date.now() - 5 * 24 * 60 * 60 * 1000,
      dataVencimento: Date.now() + 25 * 24 * 60 * 60 * 1000,
      dataPagamento: Date.now() - 4 * 24 * 60 * 60 * 1000,
      valor: 338.00,
      descricao: 'Licença Prata (Anual) + Suporte VIP WhatsApp',
      status: 'PAGO',
      metodoPagamento: 'PIX',
      qrcodePixCode: '00020126580014br.gov.bcb.pix0136acervuscore-pagamentos-61234567895204000053039865406338.005802BR5925ACERVUS CORE SISTEMAS6009SAO PAULO62070503***6304D1A4',
    },
    {
      id: 'fat_000',
      codigoFatura: 'FAT-2026-07',
      dataEmissao: Date.now() - 35 * 24 * 60 * 60 * 1000,
      dataVencimento: Date.now() - 5 * 24 * 60 * 60 * 1000,
      dataPagamento: Date.now() - 34 * 24 * 60 * 60 * 1000,
      valor: 338.00,
      descricao: 'Licença Prata (Anual) + Suporte VIP WhatsApp',
      status: 'PAGO',
      metodoPagamento: 'PIX',
    },
  ];

  const chamados: ChamadoSuporte[] = empresaConfig.chamadosSuporte || [
    {
      id: 'chm_101',
      protocolo: 'SUP-8912',
      assunto: 'Dúvida sobre emissão de NFS-e no ambiente de produção',
      prioridade: 'ALTA',
      moduloRelacionado: 'NFS-e / Faturamento',
      descricao: 'Preciso validar se o certificado A1 enviado para o Gov.br já está ativo para emissão de notas fiscais de locação.',
      status: 'CONCLUIDO',
      dataAbertura: Date.now() - 2 * 24 * 60 * 60 * 1000,
      respostas: [
        {
          id: 'resp_1',
          autor: 'Equipe de Suporte Acervus Core',
          isEquipeSuporte: true,
          mensagem: 'Olá! Validamos seu certificado A1 via SEFIN Gov.br. A comunicação está 100% autorizada no ambiente de produção. Você já pode emitir notas fiscais pelo sistema.',
          data: Date.now() - 1 * 24 * 60 * 60 * 1000,
        }
      ]
    }
  ];

  // Modal para Troca / Contratação de Plano
  const [selectedPlanoModal, setSelectedPlanoModal] = useState<PlanoAssinatura | null>(null);
  const [isCheckoutModalOpen, setIsCheckoutModalOpen] = useState(false);
  const [checkoutMetodo, setCheckoutMetodo] = useState<'PIX' | 'CARTAO' | 'BOLETO'>('PIX');
  const [copiedPix, setCopiedPix] = useState(false);
  const [paymentSuccessNotice, setPaymentSuccessNotice] = useState<string | null>(null);

  // Modal para Novo Chamado de Suporte
  const [isNovoChamadoModalOpen, setIsNovoChamadoModalOpen] = useState(false);
  const [novoAssunto, setNovoAssunto] = useState('');
  const [novaPrioridade, setNovaPrioridade] = useState<'BAIXA' | 'MEDIA' | 'ALTA' | 'URGENTE'>('MEDIA');
  const [novoModulo, setNovoModulo] = useState('Geral / Dúvidas');
  const [novaDescricao, setNovaDescricao] = useState('');

  const planoAtivoInfo = PLANOS_DISPONIVEIS.find(p => p.id === assinaturaAtual.planoId) || PLANOS_DISPONIVEIS[1];
  const suporteAtivoInfo = PLANOS_SUPORTE_DISPONIVEIS.find(s => s.id === assinaturaAtual.planoSuporteId) || PLANOS_SUPORTE_DISPONIVEIS[1];

  // Handlers para Atualizar Assinatura
  const handleConfirmChangePlano = (novoPlanoId: string, novoSuporteId?: string) => {
    const targetPlano = PLANOS_DISPONIVEIS.find(p => p.id === novoPlanoId) || planoAtivoInfo;
    const targetSuporte = PLANOS_SUPORTE_DISPONIVEIS.find(s => s.id === (novoSuporteId || assinaturaAtual.planoSuporteId)) || suporteAtivoInfo;

    const vPlano = cicloAnual ? targetPlano.valorAnualMensalizado : targetPlano.valorMensal;
    const vSuporte = targetSuporte.valorMensal;
    const totalRecorrente = vPlano + vSuporte;

    const novaAssinatura: AssinaturaAtual = {
      ...assinaturaAtual,
      planoId: targetPlano.id,
      planoSuporteId: targetSuporte.id,
      cicloPagamento: cicloAnual ? 'ANUAL' : 'MENSAL',
      valorTotalRecorrente: totalRecorrente,
      status: 'ATIVO',
      dataInicio: Date.now(),
      dataProximaRenovacao: Date.now() + (cicloAnual ? 365 : 30) * 24 * 60 * 60 * 1000,
    };

    // Nova Fatura
    const novaFatura: FaturaAssinatura = {
      id: 'fat_' + Date.now(),
      codigoFatura: 'FAT-' + new Date().getFullYear() + '-' + String(new Date().getMonth() + 1).padStart(2, '0'),
      dataEmissao: Date.now(),
      dataVencimento: Date.now() + 5 * 24 * 60 * 60 * 1000,
      valor: totalRecorrente,
      descricao: `Upgrade Licença ${targetPlano.nome} (${cicloAnual ? 'Anual' : 'Mensal'}) + ${targetSuporte.nome}`,
      status: 'PAGO',
      dataPagamento: Date.now(),
      metodoPagamento: checkoutMetodo,
    };

    const newConfig: EmpresaConfig = {
      ...empresaConfig,
      assinaturaAtiva: novaAssinatura,
      historicoFaturas: [novaFatura, ...(empresaConfig.historicoFaturas || faturas)],
    };

    onSaveConfig(newConfig);
    setIsCheckoutModalOpen(false);
    setSelectedPlanoModal(null);
    setPaymentSuccessNotice(`Plano atualizado com sucesso para ${targetPlano.nome}! Sua licença e benefícios já estão ativos.`);
    setTimeout(() => setPaymentSuccessNotice(null), 5000);
  };

  // Handler para Trocar Plano de Suporte
  const handleSelectSuporte = (suporteId: string) => {
    const targetSuporte = PLANOS_SUPORTE_DISPONIVEIS.find(s => s.id === suporteId);
    if (!targetSuporte) return;

    const vPlano = cicloAnual ? planoAtivoInfo.valorAnualMensalizado : planoAtivoInfo.valorMensal;
    const totalRecorrente = vPlano + targetSuporte.valorMensal;

    const novaAssinatura: AssinaturaAtual = {
      ...assinaturaAtual,
      planoSuporteId: targetSuporte.id,
      valorTotalRecorrente: totalRecorrente,
    };

    const newConfig: EmpresaConfig = {
      ...empresaConfig,
      assinaturaAtiva: novaAssinatura,
    };

    onSaveConfig(newConfig);
    setPaymentSuccessNotice(`Plano de Suporte atualizado para: ${targetSuporte.nome}.`);
    setTimeout(() => setPaymentSuccessNotice(null), 4000);
  };

  // Handler para Novo Chamado de Suporte
  const handleCriarChamado = (e: React.FormEvent) => {
    e.preventDefault();
    if (!novoAssunto.trim() || !novaDescricao.trim()) return;

    const novoChamado: ChamadoSuporte = {
      id: 'chm_' + Date.now(),
      protocolo: 'SUP-' + Math.floor(1000 + Math.random() * 9000),
      assunto: novoAssunto,
      prioridade: novaPrioridade,
      moduloRelacionado: novoModulo,
      descricao: novaDescricao,
      status: 'ABERTO',
      dataAbertura: Date.now(),
      respostas: [
        {
          id: 'resp_init',
          autor: empresaConfig.nomeRepresentante || 'Operador',
          isEquipeSuporte: false,
          mensagem: novaDescricao,
          data: Date.now(),
        }
      ]
    };

    const novosChamados = [novoChamado, ...(empresaConfig.chamadosSuporte || chamados)];
    onSaveConfig({
      ...empresaConfig,
      chamadosSuporte: novosChamados,
    });

    setNovoAssunto('');
    setNovaDescricao('');
    setIsNovoChamadoModalOpen(false);
    setPaymentSuccessNotice(`Chamado ${novoChamado.protocolo} aberto com sucesso! Nossa equipe técnica responderá em breve.`);
    setTimeout(() => setPaymentSuccessNotice(null), 5000);
  };

  const copyPixKey = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedPix(true);
    setTimeout(() => setCopiedPix(false), 3000);
  };

  return (
    <div className="space-[#E4E4E7] space-y-6">
      {paymentSuccessNotice && (
        <div className="bg-emerald-950/60 border border-emerald-500/50 p-4 rounded-xl text-emerald-300 text-sm font-semibold flex items-center justify-between gap-3 animate-fade-in shadow-lg shadow-emerald-950/40">
          <div className="flex items-center gap-3">
            <CheckCircle2 className="text-emerald-400 shrink-0" size={20} />
            <span>{paymentSuccessNotice}</span>
          </div>
          <button onClick={() => setPaymentSuccessNotice(null)} className="text-emerald-400 hover:text-white">
            <X size={16} />
          </button>
        </div>
      )}

      {/* PAINEL PRINCIPAL DE STATUS DA ASSINATURA */}
      <div className="bg-gradient-to-r from-[#18181B] via-[#1F1F23] to-[#18181B] border border-[#27272A] rounded-2xl p-6 shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-[#D4AF37]/5 rounded-full blur-3xl pointer-events-none"></div>

        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 relative z-10">
          <div className="space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              <span className="px-3 py-1 bg-[#D4AF37]/15 border border-[#D4AF37]/40 text-[#D4AF37] rounded-full text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 shadow-sm">
                <Crown size={13} /> {planoAtivoInfo.nome}
              </span>
              <span className="px-3 py-1 bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 rounded-full text-xs font-bold uppercase tracking-wider flex items-center gap-1.5">
                <CheckCircle2 size={13} /> Status: {assinaturaAtual.status}
              </span>
              <span className="px-3 py-1 bg-sky-500/15 border border-sky-500/30 text-sky-400 rounded-full text-xs font-bold uppercase tracking-wider flex items-center gap-1.5">
                <Headphones size={13} /> {suporteAtivoInfo.nome}
              </span>
            </div>

            <h2 className="text-2xl font-extrabold text-white tracking-tight flex items-center gap-2">
              Gestão de Licença, Planos & Assistência Técnica
            </h2>
            <p className="text-sm text-[#A1A1AA] max-w-2xl leading-relaxed">
              Mantenha seu sistema Acervus Core ativo, com suporte técnico garantido e backups em nuvem sincronizados no Google Cloud.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 shrink-0">
            <button
              onClick={() => setActiveTab('planos_licenca')}
              className="px-4 py-2.5 bg-gradient-to-r from-[#D4AF37] to-[#AA820A] text-black font-bold text-xs rounded-xl shadow-lg hover:brightness-110 transition-all flex items-center justify-center gap-2"
            >
              <Zap size={15} /> Alterar ou Fazer Upgrade
            </button>
            <button
              onClick={() => setIsNovoChamadoModalOpen(true)}
              className="px-4 py-2.5 bg-[#27272A] hover:bg-[#3F3F46] text-white font-bold text-xs rounded-xl transition-all flex items-center justify-center gap-2 border border-[#3F3F46]"
            >
              <LifeBuoy size={15} /> Abrir Chamado / Suporte
            </button>
          </div>
        </div>

        {/* METRICAS CHAVE DA CONTA */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mt-6 pt-6 border-t border-[#27272A]">
          <div className="bg-[#111113]/80 border border-[#27272A] p-3.5 rounded-xl">
            <span className="text-[10px] font-bold uppercase text-[#71717A] tracking-wider block">Ciclo & Renovação</span>
            <span className="text-sm font-bold text-white mt-1 block flex items-center gap-1.5">
              <Calendar size={14} className="text-[#D4AF37]" />
              {new Date(assinaturaAtual.dataProximaRenovacao).toLocaleDateString('pt-BR')} ({assinaturaAtual.cicloPagamento})
            </span>
          </div>

          <div className="bg-[#111113]/80 border border-[#27272A] p-3.5 rounded-xl">
            <span className="text-[10px] font-bold uppercase text-[#71717A] tracking-wider block">Valor Recorrente</span>
            <span className="text-sm font-bold text-emerald-400 mt-1 block flex items-center gap-1.5">
              <DollarSign size={14} className="text-emerald-400" />
              R$ {assinaturaAtual.valorTotalRecorrente.toFixed(2)} / mês
            </span>
          </div>

          <div className="bg-[#111113]/80 border border-[#27272A] p-3.5 rounded-xl">
            <span className="text-[10px] font-bold uppercase text-[#71717A] tracking-wider block">Forma de Pagamento</span>
            <span className="text-sm font-bold text-white mt-1 block flex items-center gap-1.5">
              {assinaturaAtual.metodoPagamentoPadrao === 'PIX' ? <QrCode size={14} className="text-emerald-400" /> : <CreditCard size={14} className="text-sky-400" />}
              {assinaturaAtual.metodoPagamentoPadrao} (Desconto de 5% no PIX)
            </span>
          </div>

          <div className="bg-[#111113]/80 border border-[#27272A] p-3.5 rounded-xl">
            <span className="text-[10px] font-bold uppercase text-[#71717A] tracking-wider block">SLA de Atendimento</span>
            <span className="text-sm font-bold text-sky-400 mt-1 block flex items-center gap-1.5">
              <Clock size={14} />
              {suporteAtivoInfo.tempoRespostaSla}
            </span>
          </div>
        </div>
      </div>

      {/* ABAS DE NAVEGAÇÃO DA SEÇÃO */}
      <div className="flex border-b border-[#27272A] overflow-x-auto no-scrollbar gap-1">
        <button
          onClick={() => setActiveTab('visao_geral')}
          className={`px-4 py-3 text-xs font-bold border-b-2 transition-all whitespace-nowrap flex items-center gap-2 ${
            activeTab === 'visao_geral'
              ? 'border-[#D4AF37] text-[#D4AF37] bg-[#D4AF37]/5'
              : 'border-transparent text-[#A1A1AA] hover:text-white'
          }`}
        >
          <ShieldCheck size={15} /> Visão Geral da Conta
        </button>

        <button
          onClick={() => setActiveTab('planos_licenca')}
          className={`px-4 py-3 text-xs font-bold border-b-2 transition-all whitespace-nowrap flex items-center gap-2 ${
            activeTab === 'planos_licenca'
              ? 'border-[#D4AF37] text-[#D4AF37] bg-[#D4AF37]/5'
              : 'border-transparent text-[#A1A1AA] hover:text-white'
          }`}
        >
          <Crown size={15} /> Planos de Licença
        </button>

        <button
          onClick={() => setActiveTab('planos_suporte')}
          className={`px-4 py-3 text-xs font-bold border-b-2 transition-all whitespace-nowrap flex items-center gap-2 ${
            activeTab === 'planos_suporte'
              ? 'border-[#D4AF37] text-[#D4AF37] bg-[#D4AF37]/5'
              : 'border-transparent text-[#A1A1AA] hover:text-white'
          }`}
        >
          <Headphones size={15} /> Planos de Suporte & Assistência
        </button>

        <button
          onClick={() => setActiveTab('faturas')}
          className={`px-4 py-3 text-xs font-bold border-b-2 transition-all whitespace-nowrap flex items-center gap-2 ${
            activeTab === 'faturas'
              ? 'border-[#D4AF37] text-[#D4AF37] bg-[#D4AF37]/5'
              : 'border-transparent text-[#A1A1AA] hover:text-white'
          }`}
        >
          <FileText size={15} /> Faturas & Histórico ({faturas.length})
        </button>

        <button
          onClick={() => setActiveTab('chamados')}
          className={`px-4 py-3 text-xs font-bold border-b-2 transition-all whitespace-nowrap flex items-center gap-2 ${
            activeTab === 'chamados'
              ? 'border-[#D4AF37] text-[#D4AF37] bg-[#D4AF37]/5'
              : 'border-transparent text-[#A1A1AA] hover:text-white'
          }`}
        >
          <LifeBuoy size={15} /> Suporte Técnico & Chamados ({chamados.length})
        </button>
      </div>

      {/* CONTEÚDO DA ABA 1: VISÃO GERAL */}
      {activeTab === 'visao_geral' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-fade-in">
          <div className="lg:col-col-span-2 space-y-6">
            <div className="bg-[#18181B] border border-[#27272A] p-6 rounded-2xl space-y-4">
              <h3 className="text-base font-bold text-white flex items-center gap-2 border-b border-[#27272A] pb-3">
                <Sparkles className="text-[#D4AF37]" size={18} /> Recursos Inclusos na Sua Licença Atual ({planoAtivoInfo.nome})
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                {planoAtivoInfo.recursosInclusos.map((rec, idx) => (
                  <div key={idx} className="flex items-start gap-2.5 p-2.5 bg-[#111113] border border-[#27272A] rounded-xl text-xs text-[#E4E4E7]">
                    <CheckCircle2 size={16} className="text-emerald-400 shrink-0 mt-0.5" />
                    <span className="font-medium">{rec}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-[#18181B] border border-[#27272A] p-6 rounded-2xl space-y-4">
              <h3 className="text-base font-bold text-white flex items-center gap-2 border-b border-[#27272A] pb-3">
                <Headphones className="text-sky-400" size={18} /> Detalhes da Assistência Técnica Ativa ({suporteAtivoInfo.nome})
              </h3>

              <p className="text-xs text-[#A1A1AA] leading-relaxed">
                {suporteAtivoInfo.descricao}
              </p>

              <div className="space-y-2">
                {suporteAtivoInfo.canaisAtendimento.map((canal, idx) => (
                  <div key={idx} className="flex items-center gap-2 text-xs font-semibold text-sky-300 bg-sky-950/30 border border-sky-800/40 p-2.5 rounded-xl">
                    <Check size={14} className="text-sky-400" />
                    <span>{canal}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="space-y-6">
            <div className="bg-[#18181B] border border-[#27272A] p-6 rounded-2xl space-y-4">
              <h3 className="text-sm font-bold text-white flex items-center gap-2 uppercase tracking-wider text-[#A1A1AA]">
                <Lock size={15} className="text-[#D4AF37]" /> Garantia de Dados & Isolamento
              </h3>

              <div className="text-xs text-[#A1A1AA] space-y-3 leading-relaxed">
                <p>
                  Sua empresa opera em ambiente <strong>Multi-Tenant isolado</strong> no Google Cloud Firestore com chave do tenant <code>{empresaConfig.cnpj || 'CADASTRO'}</code>.
                </p>
                <p>
                  Todos os backups operacionais e registros do app Android são protegidos contra perdas com retenção automatizada.
                </p>
              </div>

              <div className="pt-2 border-t border-[#27272A]">
                <button
                  onClick={() => setIsNovoChamadoModalOpen(true)}
                  className="w-full py-2.5 bg-[#27272A] hover:bg-[#3F3F46] text-white font-bold text-xs rounded-xl transition-all flex items-center justify-center gap-2"
                >
                  <MessageSquare size={14} /> Falar com Consultor de Suporte
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* CONTEÚDO DA ABA 2: PLANOS DE LICENÇA */}
      {activeTab === 'planos_licenca' && (
        <div className="space-y-6 animate-fade-in">
          {/* SELETOR MENSAL vs ANUAL */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 bg-[#18181B] border border-[#27272A] p-4 rounded-2xl max-w-xl mx-auto shadow-inner">
            <span className={`text-xs font-bold ${!cicloAnual ? 'text-[#D4AF37]' : 'text-[#A1A1AA]'}`}>
              Cobrança Mensal
            </span>

            <button
              onClick={() => setCicloAnual(!cicloAnual)}
              className="relative inline-flex h-7 w-14 shrink-0 cursor-pointer rounded-full border-2 border-transparent bg-[#27272A] transition-colors duration-200 ease-in-out focus:outline-none"
            >
              <span
                className={`pointer-events-none inline-block h-6 w-6 transform rounded-full bg-[#D4AF37] shadow-lg ring-0 transition duration-200 ease-in-out ${
                  cicloAnual ? 'translate-x-7' : 'translate-x-0'
                }`}
              />
            </button>

            <div className="flex items-center gap-1.5">
              <span className={`text-xs font-bold ${cicloAnual ? 'text-[#D4AF37]' : 'text-[#A1A1AA]'}`}>
                Cobrança Anual
              </span>
              <span className="px-2 py-0.5 bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-[10px] font-extrabold rounded-full animate-pulse">
                ECONOMIZE 15%
              </span>
            </div>
          </div>

          {/* GRID DE CARDS DOS PLANOS */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {PLANOS_DISPONIVEIS.map((plano) => {
              const isAtual = assinaturaAtual.planoId === plano.id;
              const valorExibido = cicloAnual ? plano.valorAnualMensalizado : plano.valorMensal;

              return (
                <div
                  key={plano.id}
                  className={`bg-[#18181B] border rounded-2xl p-6 flex flex-col justify-between transition-all relative ${
                    plano.recomendado
                      ? 'border-[#D4AF37] shadow-2xl shadow-[#D4AF37]/10 bg-gradient-to-b from-[#1F1F23] to-[#18181B]'
                      : 'border-[#27272A] hover:border-[#3F3F46]'
                  }`}
                >
                  {plano.recomendado && (
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 bg-gradient-to-r from-[#D4AF37] to-[#AA820A] text-black text-[10px] font-black uppercase tracking-wider rounded-full shadow-md flex items-center gap-1">
                      <Sparkles size={12} /> Mais Escolhido para Locadoras
                    </div>
                  )}

                  <div className="space-y-4">
                    <div className="flex justify-between items-start">
                      <div>
                        <h4 className="text-lg font-bold text-white">{plano.nome}</h4>
                        <p className="text-xs text-[#A1A1AA] mt-1">{plano.descricao}</p>
                      </div>
                    </div>

                    <div className="pt-2">
                      <div className="flex items-baseline gap-1">
                        <span className="text-xs text-[#A1A1AA]">R$</span>
                        <span className="text-3xl font-black text-white">{valorExibido}</span>
                        <span className="text-xs text-[#A1A1AA]">/ mês</span>
                      </div>
                      <span className="text-[10px] text-[#71717A] block mt-0.5">
                        {cicloAnual ? `Faturado R$ ${valorExibido * 12}/ano` : 'Cobrança mensal recorrente'}
                      </span>
                    </div>

                    <div className="space-y-2 pt-2 border-t border-[#27272A] text-xs text-[#E4E4E7]">
                      <div className="flex items-center gap-2 font-bold text-[#D4AF37]">
                        <Building size={14} /> {plano.limiteOperadores}
                      </div>
                      <div className="flex items-center gap-2 font-bold text-sky-400">
                        <Zap size={14} /> {plano.limiteItensAcervo}
                      </div>
                    </div>

                    <div className="space-y-2 pt-3 border-t border-[#27272A]">
                      <span className="text-[10px] font-bold uppercase text-[#71717A] tracking-wider block">O que está incluso:</span>
                      {plano.recursosInclusos.map((rec, i) => (
                        <div key={i} className="flex items-start gap-2 text-xs text-[#A1A1AA]">
                          <Check size={14} className="text-emerald-400 shrink-0 mt-0.5" />
                          <span>{rec}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="pt-6 mt-4 border-t border-[#27272A]">
                    {isAtual ? (
                      <button
                        disabled
                        className="w-full py-2.5 bg-emerald-500/15 border border-emerald-500/40 text-emerald-400 font-bold text-xs rounded-xl flex items-center justify-center gap-2 cursor-default"
                      >
                        <CheckCircle2 size={15} /> Seu Plano Atual
                      </button>
                    ) : (
                      <button
                        onClick={() => {
                          setSelectedPlanoModal(plano);
                          setIsCheckoutModalOpen(true);
                        }}
                        className={`w-full py-2.5 text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-2 shadow-md ${
                          plano.recomendado
                            ? 'bg-gradient-to-r from-[#D4AF37] to-[#AA820A] text-black hover:brightness-110'
                            : 'bg-[#27272A] hover:bg-[#3F3F46] text-white border border-[#3F3F46]'
                        }`}
                      >
                        Selecionar {plano.nome} <ArrowRight size={14} />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* CONTEÚDO DA ABA 3: PLANOS DE SUPORTE E ASSISTÊNCIA */}
      {activeTab === 'planos_suporte' && (
        <div className="space-y-6 animate-fade-in">
          <div className="bg-[#18181B] border border-[#27272A] p-6 rounded-2xl">
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <Headphones className="text-[#D4AF37]" size={20} /> Escolha o Nível de Assistência Técnica para seu Galpão
            </h3>
            <p className="text-xs text-[#A1A1AA] mt-1">
              Garanta que sua equipe no galpão e no atendimento comercial receba suporte prioritário quando mais precisar.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {PLANOS_SUPORTE_DISPONIVEIS.map((sup) => {
              const isAtual = assinaturaAtual.planoSuporteId === sup.id;

              return (
                <div
                  key={sup.id}
                  className={`bg-[#18181B] border rounded-2xl p-6 flex flex-col justify-between transition-all ${
                    sup.destaque
                      ? 'border-sky-500/50 bg-gradient-to-b from-[#1F1F23] to-[#18181B] shadow-xl shadow-sky-950/20'
                      : 'border-[#27272A]'
                  }`}
                >
                  <div className="space-y-4">
                    <div>
                      <h4 className="text-lg font-bold text-white flex items-center gap-2">
                        {sup.nome}
                      </h4>
                      <p className="text-xs text-[#A1A1AA] mt-1">{sup.descricao}</p>
                    </div>

                    <div className="pt-2">
                      <div className="flex items-baseline gap-1">
                        <span className="text-xs text-[#A1A1AA]">R$</span>
                        <span className="text-3xl font-black text-white">{sup.valorMensal}</span>
                        <span className="text-xs text-[#A1A1AA]">/ mês</span>
                      </div>
                    </div>

                    <div className="p-3 bg-[#111113] border border-[#27272A] rounded-xl text-xs space-y-1">
                      <span className="text-[10px] font-bold text-[#71717A] uppercase tracking-wider block">Tempo de Resposta (SLA):</span>
                      <span className="font-bold text-sky-400 flex items-center gap-1.5">
                        <Clock size={14} /> {sup.tempoRespostaSla}
                      </span>
                    </div>

                    <div className="space-y-2 pt-2">
                      <span className="text-[10px] font-bold uppercase text-[#71717A] tracking-wider block">Canais inclusos:</span>
                      {sup.canaisAtendimento.map((canal, idx) => (
                        <div key={idx} className="flex items-start gap-2 text-xs text-[#E4E4E7]">
                          <Check size={14} className="text-emerald-400 shrink-0 mt-0.5" />
                          <span>{canal}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="pt-6 mt-4 border-t border-[#27272A]">
                    {isAtual ? (
                      <button
                        disabled
                        className="w-full py-2.5 bg-emerald-500/15 border border-emerald-500/40 text-emerald-400 font-bold text-xs rounded-xl flex items-center justify-center gap-2 cursor-default"
                      >
                        <CheckCircle2 size={15} /> Atendimento Ativo
                      </button>
                    ) : (
                      <button
                        onClick={() => handleSelectSuporte(sup.id)}
                        className="w-full py-2.5 bg-[#27272A] hover:bg-[#3F3F46] text-white font-bold text-xs rounded-xl transition-all flex items-center justify-center gap-2 border border-[#3F3F46]"
                      >
                        Ativar {sup.nome}
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* CONTEÚDO DA ABA 4: HISTÓRICO DE FATURAS */}
      {activeTab === 'faturas' && (
        <div className="space-y-6 animate-fade-in">
          <div className="bg-[#18181B] border border-[#27272A] rounded-2xl overflow-hidden shadow-lg">
            <div className="p-5 border-b border-[#27272A] flex justify-between items-center">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <FileText className="text-[#D4AF37]" size={18} /> Histórico de Faturas & Recibos da Licença
              </h3>
            </div>

            <div className="divide-y divide-[#27272A]">
              {faturas.map((fat) => (
                <div key={fat.id} className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-[#1F1F23] transition-all">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold text-white text-sm">{fat.codigoFatura}</span>
                      <span className="px-2.5 py-0.5 bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 rounded-full text-[10px] font-bold uppercase">
                        {fat.status}
                      </span>
                    </div>
                    <p className="text-xs text-[#A1A1AA]">{fat.descricao}</p>
                    <div className="flex items-center gap-4 text-[11px] text-[#71717A] pt-1">
                      <span>Emissão: {new Date(fat.dataEmissao).toLocaleDateString('pt-BR')}</span>
                      <span>Pagamento: {fat.dataPagamento ? new Date(fat.dataPagamento).toLocaleDateString('pt-BR') : '-'}</span>
                      <span>Forma: {fat.metodoPagamento}</span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between sm:justify-end gap-4 shrink-0">
                    <span className="text-base font-extrabold text-emerald-400">
                      R$ {fat.valor.toFixed(2)}
                    </span>

                    <button
                      onClick={() => {
                        window.print();
                      }}
                      className="px-3 py-1.5 bg-[#27272A] hover:bg-[#3F3F46] text-white text-xs font-bold rounded-lg transition-all flex items-center gap-1.5"
                    >
                      <Download size={13} /> Recibo / PDF
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* CONTEÚDO DA ABA 5: SUPORTE TÉCNICO & CHAMADOS */}
      {activeTab === 'chamados' && (
        <div className="space-y-6 animate-fade-in">
          <div className="flex justify-between items-center bg-[#18181B] border border-[#27272A] p-5 rounded-2xl">
            <div>
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <LifeBuoy className="text-sky-400" size={18} /> Central de Chamados & Suporte Técnico
              </h3>
              <p className="text-xs text-[#A1A1AA] mt-0.5">
                Abra chamados diretos com a equipe de engenharia do Acervus Core para tirar dúvidas, solicitar treinamentos ou relatar melhorias.
              </p>
            </div>

            <button
              onClick={() => setIsNovoChamadoModalOpen(true)}
              className="px-4 py-2.5 bg-gradient-to-r from-[#D4AF37] to-[#AA820A] text-black font-bold text-xs rounded-xl shadow-lg hover:brightness-110 transition-all flex items-center gap-2"
            >
              <Plus size={15} /> Novo Chamado
            </button>
          </div>

          <div className="space-y-4">
            {chamados.map((chm) => (
              <div key={chm.id} className="bg-[#18181B] border border-[#27272A] p-5 rounded-2xl space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#27272A] pb-3">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs font-bold text-[#D4AF37] bg-[#D4AF37]/10 px-2.5 py-1 rounded-md border border-[#D4AF37]/20">
                      {chm.protocolo}
                    </span>
                    <h4 className="text-sm font-bold text-white">{chm.assunto}</h4>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="px-2.5 py-0.5 bg-emerald-500/20 text-emerald-400 text-[10px] font-bold rounded-full border border-emerald-500/30">
                      {chm.status}
                    </span>
                    <span className="text-xs text-[#71717A]">
                      {new Date(chm.dataAbertura).toLocaleDateString('pt-BR')}
                    </span>
                  </div>
                </div>

                <p className="text-xs text-[#E4E4E7] leading-relaxed bg-[#111113] p-3 rounded-xl border border-[#27272A]">
                  {chm.descricao}
                </p>

                {/* HISTÓRICO DE RESPOSTAS */}
                {chm.respostas.length > 0 && (
                  <div className="pt-2 space-y-2">
                    <span className="text-[10px] font-bold uppercase text-[#71717A] tracking-wider block">Respostas e Interações:</span>
                    {chm.respostas.map((resp) => (
                      <div
                        key={resp.id}
                        className={`p-3 rounded-xl text-xs space-y-1 ${
                          resp.isEquipeSuporte
                            ? 'bg-sky-950/30 border border-sky-800/40 text-sky-200'
                            : 'bg-[#27272A]/50 border border-[#3F3F46] text-[#E4E4E7]'
                        }`}
                      >
                        <div className="flex justify-between items-center text-[10px] font-bold">
                          <span className={resp.isEquipeSuporte ? 'text-sky-400' : 'text-[#D4AF37]'}>
                            {resp.autor}
                          </span>
                          <span className="text-[#71717A]">
                            {new Date(resp.data).toLocaleDateString('pt-BR')} às {new Date(resp.data).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                        <p className="leading-relaxed">{resp.mensagem}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* MODAL DE CHECKOUT / PAGAMENTO PIX */}
      {isCheckoutModalOpen && selectedPlanoModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-[#18181B] border border-[#27272A] rounded-2xl max-w-lg w-full p-6 space-y-5 shadow-2xl relative">
            <button
              onClick={() => setIsCheckoutModalOpen(false)}
              className="absolute top-4 right-4 text-[#A1A1AA] hover:text-white"
            >
              <X size={18} />
            </button>

            <div className="space-y-1">
              <h3 className="text-lg font-extrabold text-white flex items-center gap-2">
                <Crown className="text-[#D4AF37]" size={20} /> Checkout de Licença - {selectedPlanoModal.nome}
              </h3>
              <p className="text-xs text-[#A1A1AA]">
                Selecione a forma de pagamento para ativar a alteração do seu plano.
              </p>
            </div>

            {/* RESUMO DE VALOR */}
            <div className="bg-[#111113] border border-[#27272A] p-4 rounded-xl space-y-2">
              <div className="flex justify-between text-xs text-[#A1A1AA]">
                <span>Plano Selecionado:</span>
                <span className="font-bold text-white">{selectedPlanoModal.nome}</span>
              </div>
              <div className="flex justify-between text-xs text-[#A1A1AA]">
                <span>Ciclo Escolhido:</span>
                <span className="font-bold text-[#D4AF37]">{cicloAnual ? 'Anual (15% OFF)' : 'Mensal'}</span>
              </div>
              <div className="flex justify-between text-sm font-bold text-white pt-2 border-t border-[#27272A]">
                <span>Total a Pagar:</span>
                <span className="text-emerald-400">
                  R$ {(cicloAnual ? selectedPlanoModal.valorAnualMensalizado * 12 : selectedPlanoModal.valorMensal).toFixed(2)}
                </span>
              </div>
            </div>

            {/* SELETOR DE MÉTODO */}
            <div className="grid grid-cols-3 gap-2">
              <button
                onClick={() => setCheckoutMetodo('PIX')}
                className={`py-2.5 text-xs font-bold rounded-xl border flex flex-col items-center gap-1 transition-all ${
                  checkoutMetodo === 'PIX'
                    ? 'border-emerald-500 bg-emerald-950/30 text-emerald-400'
                    : 'border-[#27272A] bg-[#111113] text-[#A1A1AA]'
                }`}
              >
                <QrCode size={16} /> PIX (Imediato)
              </button>

              <button
                onClick={() => setCheckoutMetodo('CARTAO')}
                className={`py-2.5 text-xs font-bold rounded-xl border flex flex-col items-center gap-1 transition-all ${
                  checkoutMetodo === 'CARTAO'
                    ? 'border-sky-500 bg-sky-950/30 text-sky-400'
                    : 'border-[#27272A] bg-[#111113] text-[#A1A1AA]'
                }`}
              >
                <CreditCard size={16} /> Cartão
              </button>

              <button
                onClick={() => setCheckoutMetodo('BOLETO')}
                className={`py-2.5 text-xs font-bold rounded-xl border flex flex-col items-center gap-1 transition-all ${
                  checkoutMetodo === 'BOLETO'
                    ? 'border-[#D4AF37] bg-[#D4AF37]/10 text-[#D4AF37]'
                    : 'border-[#27272A] bg-[#111113] text-[#A1A1AA]'
                }`}
              >
                <FileText size={16} /> Boleto
              </button>
            </div>

            {/* PIX AREA */}
            {checkoutMetodo === 'PIX' && (
              <div className="bg-[#111113] border border-[#27272A] p-4 rounded-xl flex flex-col items-center text-center space-y-3">
                <div className="bg-white p-3 rounded-xl shadow-md">
                  <QRCodeSVG
                    value="00020126580014br.gov.bcb.pix0136acervuscore-pagamentos-61234567895204000053039865406338.005802BR5925ACERVUS CORE SISTEMAS6009SAO PAULO62070503***6304D1A4"
                    size={130}
                  />
                </div>
                <button
                  onClick={() => copyPixKey('00020126580014br.gov.bcb.pix0136acervuscore-pagamentos-61234567895204000053039865406338.005802BR5925ACERVUS CORE SISTEMAS6009SAO PAULO62070503***6304D1A4')}
                  className="w-full py-2 bg-[#27272A] hover:bg-[#3F3F46] text-white text-xs font-bold rounded-xl flex items-center justify-center gap-2 border border-[#3F3F46]"
                >
                  <QrCode size={14} /> {copiedPix ? 'Copiado para Área de Transferência!' : 'Copiar Chave PIX Copia e Cola'}
                </button>
              </div>
            )}

            <button
              onClick={() => handleConfirmChangePlano(selectedPlanoModal.id)}
              className="w-full py-3 bg-gradient-to-r from-[#D4AF37] to-[#AA820A] text-black font-extrabold text-xs rounded-xl shadow-lg hover:brightness-110 transition-all flex items-center justify-center gap-2"
            >
              <CheckCircle2 size={16} /> Confirmar Ativação do Plano
            </button>
          </div>
        </div>
      )}

      {/* MODAL NOVO CHAMADO DE SUPORTE */}
      {isNovoChamadoModalOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-4 animate-fade-in">
          <form onSubmit={handleCriarChamado} className="bg-[#18181B] border border-[#27272A] rounded-2xl max-w-lg w-full p-6 space-y-4 shadow-2xl relative">
            <button
              type="button"
              onClick={() => setIsNovoChamadoModalOpen(false)}
              className="absolute top-4 right-4 text-[#A1A1AA] hover:text-white"
            >
              <X size={18} />
            </button>

            <div className="space-y-1">
              <h3 className="text-lg font-extrabold text-white flex items-center gap-2">
                <LifeBuoy className="text-sky-400" size={20} /> Abrir Chamado de Suporte Técnico
              </h3>
              <p className="text-xs text-[#A1A1AA]">
                Preencha os detalhes da sua solicitação. Resposta imediata para planos VIP e 24/7.
              </p>
            </div>

            <div className="space-y-3 pt-2">
              <div>
                <label className="block text-[10px] font-bold text-[#A1A1AA] uppercase tracking-wider mb-1">Assunto Principal</label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Dúvida sobre configuração do certificado A1 na NFS-e"
                  value={novoAssunto}
                  onChange={(e) => setNovoAssunto(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-[#111113] border border-[#27272A] rounded-xl text-white text-xs focus:border-[#D4AF37] focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-bold text-[#A1A1AA] uppercase tracking-wider mb-1">Módulo do Sistema</label>
                  <select
                    value={novoModulo}
                    onChange={(e) => setNovoModulo(e.target.value)}
                    className="w-full px-3 py-2 bg-[#111113] border border-[#27272A] rounded-xl text-white text-xs focus:border-[#D4AF37] focus:outline-none"
                  >
                    <option value="Geral / Dúvidas">Geral / Dúvidas</option>
                    <option value="NFS-e / Faturamento">NFS-e / Faturamento</option>
                    <option value="App Android Galpão">App Android Galpão</option>
                    <option value="Propostas WhatsApp">Propostas WhatsApp</option>
                    <option value="Gemini IA Cenografia">Gemini IA Cenografia</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-[#A1A1AA] uppercase tracking-wider mb-1">Prioridade</label>
                  <select
                    value={novaPrioridade}
                    onChange={(e) => setNovaPrioridade(e.target.value as any)}
                    className="w-full px-3 py-2 bg-[#111113] border border-[#27272A] rounded-xl text-white text-xs focus:border-[#D4AF37] focus:outline-none"
                  >
                    <option value="BAIXA">Baixa</option>
                    <option value="MEDIA">Média</option>
                    <option value="ALTA">Alta</option>
                    <option value="URGENTE">Urgente (Bloqueio no Galpão)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-[#A1A1AA] uppercase tracking-wider mb-1">Descrição Detalhada</label>
                <textarea
                  rows={4}
                  required
                  placeholder="Descreva com detalhes a sua dúvida ou necessidade de suporte..."
                  value={novaDescricao}
                  onChange={(e) => setNovaDescricao(e.target.value)}
                  className="w-full p-3 bg-[#111113] border border-[#27272A] rounded-xl text-white text-xs focus:border-[#D4AF37] focus:outline-none leading-relaxed"
                />
              </div>
            </div>

            <div className="pt-2 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setIsNovoChamadoModalOpen(false)}
                className="px-4 py-2 bg-[#27272A] text-white text-xs font-bold rounded-xl"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="px-5 py-2 bg-gradient-to-r from-[#D4AF37] to-[#AA820A] text-black text-xs font-bold rounded-xl flex items-center gap-1.5 shadow-md hover:brightness-110"
              >
                <Send size={14} /> Enviar Chamado
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
