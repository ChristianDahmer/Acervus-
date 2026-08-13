import React, { useState, useRef } from 'react';
import { StatusCicloVenda, EmpresaConfig, WhatsAppTemplatesConfig, Cliente, ReservaComItens, StatusReserva } from '../types';
import { WHATSAPP_PLACEHOLDERS, DEFAULT_TEMPLATES, processarTemplateWhatsApp } from '../utils/whatsappTemplates';
import { MessageSquare, Save, RotateCcw, CheckCircle, Sparkles, Copy, Eye, EyeOff, Code2, Info, Building2, User, Calendar, Key, Globe, Send, ShieldCheck } from 'lucide-react';

interface WhatsAppTemplatesConfigViewProps {
  empresaConfig: EmpresaConfig;
  onSaveConfig: (newConfig: EmpresaConfig) => void;
  clienteAmostra?: Cliente;
  reservaAmostra?: ReservaComItens;
}

export const WhatsAppTemplatesConfigView: React.FC<WhatsAppTemplatesConfigViewProps> = ({
  empresaConfig,
  onSaveConfig,
  clienteAmostra,
  reservaAmostra,
}) => {
  const [selectedStage, setSelectedStage] = useState<StatusCicloVenda>(StatusCicloVenda.RESERVA_CONFIRMADA);
  
  // Local state for all templates (initialized with current config or default)
  const [templatesState, setTemplatesState] = useState<WhatsAppTemplatesConfig>(() => {
    return {
      ...DEFAULT_TEMPLATES,
      ...(empresaConfig.whatsappTemplates || {}),
    };
  });

  const [activePlaceholderCategory, setActivePlaceholderCategory] = useState<'Cliente' | 'Reserva' | 'Empresa'>('Reserva');
  const [isSavedNotice, setIsSavedNotice] = useState(false);
  const [copiedPreview, setCopiedPreview] = useState(false);

  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  // Sample data fallback if no real reservation exists
  const mockCliente: Cliente = clienteAmostra || {
    id: 1,
    nome: 'Mariana Oliveira',
    telefone: '5511987654321',
    email: 'mariana.oliveira@email.com',
  };

  const mockReserva: ReservaComItens = reservaAmostra || {
    reserva: {
      id: 1042,
      clienteId: 1,
      dataRetirada: Date.now() + 86400000, // tomorrow
      dataDevolucao: Date.now() + 86400000 * 4, // in 4 days
      status: StatusReserva.CONFIRMADA,
    },
    cliente: mockCliente,
    itens: [
      { id: 101, nome: 'Painel Redondo Dourado Luxo', quantidadeTotal: 5, precoAluguel: 180, imageUrl: '', categoria: 'Painéis' },
      { id: 102, nome: 'Trio de Cilindros Rústico MDF', quantidadeTotal: 3, precoAluguel: 120, imageUrl: '', categoria: 'Móveis' },
      { id: 103, nome: 'Canhão LED Cênico RGBW', quantidadeTotal: 8, precoAluguel: 45, imageUrl: '', categoria: 'Iluminação' },
    ],
    valorTotal: 1035,
    diasReserva: 3,
  };

  const currentTemplate = templatesState[selectedStage] ?? DEFAULT_TEMPLATES[selectedStage] ?? '';

  const handleTemplateTextChange = (text: string) => {
    setTemplatesState((prev) => ({
      ...prev,
      [selectedStage]: text,
    }));
  };

  const handleInsertPlaceholder = (tag: string) => {
    if (!textareaRef.current) {
      handleTemplateTextChange(currentTemplate + ' ' + tag);
      return;
    }

    const textarea = textareaRef.current;
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;

    const textBefore = currentTemplate.substring(0, start);
    const textAfter = currentTemplate.substring(end);

    const newText = textBefore + tag + textAfter;
    handleTemplateTextChange(newText);

    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(start + tag.length, start + tag.length);
    }, 50);
  };

  const handleResetCurrentStage = () => {
    const defaultText = DEFAULT_TEMPLATES[selectedStage];
    setTemplatesState((prev) => ({
      ...prev,
      [selectedStage]: defaultText,
    }));
  };

  const handleResetAllStages = () => {
    setTemplatesState({ ...DEFAULT_TEMPLATES });
  };

  const handleSaveAllTemplates = () => {
    const updatedConfig: EmpresaConfig = {
      ...empresaConfig,
      whatsappTemplates: templatesState,
    };
    onSaveConfig(updatedConfig);
    setIsSavedNotice(true);
    setTimeout(() => setIsSavedNotice(false), 3000);
  };

  // Compute live preview text using real company data
  const livePreviewText = processarTemplateWhatsApp(
    currentTemplate,
    mockReserva,
    mockCliente,
    empresaConfig,
    'https://forms.gle/exemplo_formulario_proposta'
  );

  const handleCopyPreview = () => {
    navigator.clipboard.writeText(livePreviewText);
    setCopiedPreview(true);
    setTimeout(() => setCopiedPreview(false), 2000);
  };

  const cycleOptions = [
    { value: StatusCicloVenda.ORCAMENTO_SOLICITADO, label: '1. Orçamento / Primeiro Contato' },
    { value: StatusCicloVenda.RESERVA_CONFIRMADA, label: '2. Confirmação de Reserva' },
    { value: StatusCicloVenda.LEMBRETE_RETIRADA, label: '3. Lembrete de Retirada (Véspera)' },
    { value: StatusCicloVenda.EM_ANDAMENTO, label: '4. Em Andamento (Uso do Acervo)' },
    { value: StatusCicloVenda.LEMBRETE_DEVOLUCAO, label: '5. Lembrete de Devolução' },
    { value: StatusCicloVenda.CONCLUIDO_COM_SUCESSO, label: '6. Conclusão & Encerramento' },
    { value: StatusCicloVenda.POS_VENDA_NPS, label: '7. Pós-venda & Avaliação NPS' },
    { value: StatusCicloVenda.CANCELADO, label: '8. Cancelamento de Pedido' },
    { value: StatusCicloVenda.ENVIO_FORMULARIO_PROPOSTA, label: '9. Envio de Proposta (Google Forms)' },
  ];

  return (
    <div className="space-y-6">
      {/* Header Info */}
      <div className="bg-[#111113] border border-[#27272A] rounded-2xl p-6 shadow-xl flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h3 className="text-xl font-serif italic text-white flex items-center gap-2">
            <MessageSquare size={20} className="text-[#D4AF37]" /> Modelos de Mensagens
          </h3>
          <p className="text-[#A1A1AA] text-xs mt-1 max-w-2xl">
            Configure mensagens personalizadas para cada etapa da locação. Os dados da sua empresa (<strong>{empresaConfig.nomeFantasia}</strong>), do cliente e do contrato de reserva serão preenchidos dinamicamente no momento do envio!
          </p>
        </div>

        {isSavedNotice && (
          <span className="flex items-center gap-1.5 bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 px-4 py-2 rounded-xl text-xs font-bold animate-fade-in">
            <CheckCircle size={16} /> Modelos Salvos no Cadastro!
          </span>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Stage Selector & Template Editor (7 cols) */}
        <div className="lg:col-span-7 space-y-5">
          {/* Stage Selector */}
          <div className="bg-[#111113] border border-[#27272A] rounded-2xl p-5 space-y-3">
            <label className="block text-xs font-semibold text-[#A1A1AA] uppercase tracking-wider">
              Selecione o Estágio do Ciclo para Editar:
            </label>
            <select
              value={selectedStage}
              onChange={(e) => setSelectedStage(e.target.value as StatusCicloVenda)}
              className="w-full px-4 py-3 bg-[#18181B] border border-[#3F3F46] rounded-xl text-white text-sm font-semibold focus:border-emerald-500 focus:outline-none cursor-pointer"
            >
              {cycleOptions.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          {/* Placeholders / Dynamic Tags Selector */}
          <div className="bg-[#111113] border border-[#27272A] rounded-2xl p-5 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-[#A1A1AA] flex items-center gap-1.5 uppercase tracking-wider">
                <Code2 size={15} className="text-[#D4AF37]" /> Clique para Inserir Variáveis Dinâmicas
              </span>
              <div className="flex bg-[#18181B] p-1 rounded-xl border border-[#27272A] text-xs gap-1">
                {(['Reserva', 'Cliente', 'Empresa'] as const).map((cat) => (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => setActivePlaceholderCategory(cat)}
                    className={`px-3 py-1 rounded-lg font-semibold transition-all cursor-pointer ${
                      activePlaceholderCategory === cat
                        ? 'bg-[#27272A] text-[#D4AF37] shadow-sm'
                        : 'text-[#71717A] hover:text-white'
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </div>

            {/* Chip Chips */}
            <div className="flex flex-wrap gap-2 pt-1">
              {WHATSAPP_PLACEHOLDERS.filter((p) => p.category === activePlaceholderCategory).map((p) => (
                <button
                  key={p.tag}
                  type="button"
                  onClick={() => handleInsertPlaceholder(p.tag)}
                  title={p.description}
                  className="flex items-center gap-1 px-2.5 py-1.5 bg-[#18181B] hover:bg-[#27272A] text-emerald-400 border border-emerald-500/30 hover:border-emerald-500 rounded-lg text-xs font-mono font-semibold transition-all cursor-pointer active:scale-95 shadow-sm"
                >
                  <span>{p.tag}</span>
                  <span className="text-[10px] text-[#A1A1AA] font-sans font-normal">({p.label})</span>
                </button>
              ))}
            </div>
          </div>

          {/* Editor Textarea */}
          <div className="bg-[#111113] border border-[#27272A] rounded-2xl p-5 space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-white flex items-center gap-2">
                <MessageSquare size={15} className="text-emerald-400" />
                <span>Corpo do Modelo (Suporta *Negrito*, _Itálico_ e Emojis)</span>
              </label>
              <button
                type="button"
                onClick={handleResetCurrentStage}
                className="flex items-center gap-1 text-[11px] text-[#A1A1AA] hover:text-[#D4AF37] transition-colors cursor-pointer"
                title="Restaurar modelo padrão do sistema para este estágio"
              >
                <RotateCcw size={12} />
                <span>Restaurar Padrão</span>
              </button>
            </div>

            <textarea
              ref={textareaRef}
              rows={11}
              value={currentTemplate}
              onChange={(e) => handleTemplateTextChange(e.target.value)}
              placeholder="Digite o texto do modelo de mensagem..."
              className="w-full px-4 py-3 bg-[#0A0A0B] border border-[#27272A] focus:border-emerald-500 rounded-xl text-white font-sans text-xs leading-relaxed focus:outline-none transition-all shadow-inner custom-scrollbar"
            />

            {/* Actions Bar */}
            <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-[#27272A]">
              <button
                type="button"
                onClick={handleResetAllStages}
                className="text-xs text-[#71717A] hover:text-rose-400 transition-colors cursor-pointer"
              >
                Restaurar TODOS os Modelos do Sistema
              </button>

              <button
                type="button"
                onClick={handleSaveAllTemplates}
                className="flex items-center gap-2 px-6 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl text-xs uppercase tracking-wider shadow-lg shadow-emerald-600/20 transition-all cursor-pointer active:scale-95"
              >
                <Save size={16} />
                <span>Salvar Modelos de WhatsApp</span>
              </button>
            </div>
          </div>
        </div>

        {/* Right Column: Live Mobile Preview Box (5 cols) */}
        <div className="lg:col-span-5 space-y-4">
          <div className="bg-[#111113] border border-[#27272A] rounded-2xl p-5 shadow-2xl space-y-4 sticky top-6">
            <div className="flex items-center justify-between border-b border-[#27272A] pb-3">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 flex items-center justify-center">
                  <Eye size={15} />
                </div>
                <div>
                  <h4 className="font-serif italic text-white text-sm">Prévia em Tempo Real</h4>
                  <p className="text-[10px] text-[#71717A]">Preenchimento automático com dados do cadastro</p>
                </div>
              </div>

              <button
                type="button"
                onClick={handleCopyPreview}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-[#18181B] border border-[#27272A] hover:bg-[#27272A] text-xs text-[#E4E4E7] rounded-lg transition-all cursor-pointer"
              >
                {copiedPreview ? <CheckCircle size={13} className="text-emerald-400" /> : <Copy size={13} />}
                <span>{copiedPreview ? 'Copiado!' : 'Copiar'}</span>
              </button>
            </div>

            {/* Dynamic Data Legend Box */}
            <div className="bg-[#18181B] border border-[#27272A] p-3 rounded-xl text-[11px] space-y-1.5 text-[#A1A1AA]">
              <div className="flex items-center justify-between text-white font-semibold">
                <span className="flex items-center gap-1">
                  <Building2 size={12} className="text-[#D4AF37]" /> {empresaConfig.nomeFantasia}
                </span>
                <span className="font-mono text-[10px] text-[#71717A]">{empresaConfig.cnpj}</span>
              </div>
              <div className="flex items-center justify-between text-[#E4E4E7]">
                <span className="flex items-center gap-1">
                  <User size={12} className="text-emerald-400" /> {mockCliente.nome}
                </span>
                <span className="font-mono text-[10px] text-emerald-400">Reserva #{mockReserva.reserva.id}</span>
              </div>
            </div>

            {/* WhatsApp Phone Frame Mockup */}
            <div className="bg-[#0b141a] border border-[#202c33] rounded-2xl p-4 shadow-2xl relative overflow-hidden">
              <div className="bg-[#111b21] px-3 py-2.5 rounded-xl border border-[#222d34] flex items-center gap-2.5 mb-3">
                <div className="w-8 h-8 rounded-full bg-emerald-700 text-white flex items-center justify-center font-bold text-xs">
                  {mockCliente.nome.substring(0, 2).toUpperCase()}
                </div>
                <div>
                  <span className="text-xs font-semibold text-white block leading-tight">{mockCliente.nome}</span>
                  <span className="text-[10px] text-emerald-400 font-mono">+55 {mockCliente.telefone}</span>
                </div>
              </div>

              {/* Chat Bubble */}
              <div className="bg-[#005c4b] text-white p-3.5 rounded-xl text-xs whitespace-pre-wrap leading-relaxed shadow-md border border-[#026c59] relative max-h-[380px] overflow-y-auto custom-scrollbar font-sans">
                {livePreviewText || <span className="italic text-slate-300">Digite um modelo ao lado...</span>}
              </div>

              <div className="mt-2 text-[10px] text-right text-emerald-400/80 font-mono">
                ✓✓ Enviado via WhatsApp API
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
