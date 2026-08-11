import React, { useState, useEffect } from 'react';
import { Cliente, ReservaComItens, StatusCicloVenda, EmpresaConfig } from '../types';
import { gerarMensagemWhatsApp, sanitizarTelefone } from '../utils/whatsappTemplates';
import { MessageSquare, Copy, ExternalLink, Check, X, Send, RotateCcw, Building2, User, Calendar, Edit3 } from 'lucide-react';

interface WhatsAppModalProps {
  reservaComItens: ReservaComItens;
  cliente: Cliente;
  empresaConfig?: EmpresaConfig;
  initialStatus?: StatusCicloVenda;
  onClose: () => void;
  onOpenTemplatesConfig?: () => void;
}

export const WhatsAppModal: React.FC<WhatsAppModalProps> = ({
  reservaComItens,
  cliente,
  empresaConfig,
  initialStatus = StatusCicloVenda.RESERVA_CONFIRMADA,
  onClose,
  onOpenTemplatesConfig,
}) => {
  const [selectedStatus, setSelectedStatus] = useState<StatusCicloVenda>(initialStatus);
  const [messageText, setMessageText] = useState<string>('');
  const [copied, setCopied] = useState(false);

  const rawPhone = cliente.telefone;
  const formattedPhone = sanitizarTelefone(rawPhone);

  // Generate initial message text whenever status or reservation/cliente changes
  useEffect(() => {
    const generated = gerarMensagemWhatsApp(selectedStatus, reservaComItens, cliente, empresaConfig);
    setMessageText(generated);
  }, [selectedStatus, reservaComItens, cliente, empresaConfig]);

  const handleResetText = () => {
    const generated = gerarMensagemWhatsApp(selectedStatus, reservaComItens, cliente, empresaConfig);
    setMessageText(generated);
  };

  const encodedText = encodeURIComponent(messageText);
  const whatsappUrl = `https://api.whatsapp.com/send?phone=${formattedPhone}&text=${encodedText}`;

  const handleCopy = () => {
    navigator.clipboard.writeText(messageText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleOpenWhatsApp = () => {
    window.open(whatsappUrl, '_blank');
  };

  const cycleOptions = [
    { value: StatusCicloVenda.ORCAMENTO_SOLICITADO, label: '1. Orçamento / Primeiro Contato' },
    { value: StatusCicloVenda.RESERVA_CONFIRMADA, label: '2. Confirmação de Reserva' },
    { value: StatusCicloVenda.LEMBRETE_RETIRADA, label: '3. Lembrete de Retirada (Véspera)' },
    { value: StatusCicloVenda.EM_ANDAMENTO, label: '4. Em Andamento (Uso)' },
    { value: StatusCicloVenda.LEMBRETE_DEVOLUCAO, label: '5. Lembrete de Devolução' },
    { value: StatusCicloVenda.CONCLUIDO_COM_SUCESSO, label: '6. Conclusão & Encerrado' },
    { value: StatusCicloVenda.POS_VENDA_NPS, label: '7. Pós-venda & NPS' },
    { value: StatusCicloVenda.CANCELADO, label: '8. Cancelamento / Recuperação' },
    { 
      value: StatusCicloVenda.ENVIO_FORMULARIO_PROPOSTA, 
      label: empresaConfig?.habilitarGoogleForms !== false 
        ? '9. Envio de Proposta (Google Forms)' 
        : '9. Envio de Proposta de Orçamento' 
    },
  ];

  return (
    <div className="fixed inset-0 z-50 bg-[#0A0A0B]/85 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-[#111113] border border-[#27272A] rounded-2xl max-w-xl w-full p-6 text-white shadow-2xl space-y-5 my-8 animate-fadeIn">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[#27272A] pb-4">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 flex items-center justify-center shadow-lg shadow-emerald-500/10">
              <MessageSquare size={20} />
            </div>
            <div>
              <h3 className="text-lg font-serif italic text-white flex items-center gap-2">
                Enviar Mensagem via WhatsApp
              </h3>
              <p className="text-xs text-[#71717A] flex items-center gap-2 mt-0.5">
                <span>Cliente: <strong className="text-white">{cliente.nome}</strong></span>
                <span>•</span>
                <span className="font-mono text-emerald-400">+{formattedPhone}</span>
              </p>
            </div>
          </div>
          <button onClick={onClose} className="text-[#71717A] hover:text-white p-1 rounded-lg transition-colors cursor-pointer">
            <X size={20} />
          </button>
        </div>

        {/* Company & Order Info Summary Chip */}
        <div className="bg-[#18181B] border border-[#27272A] p-3 rounded-xl flex items-center justify-between text-xs text-[#A1A1AA]">
          <div className="flex items-center gap-2">
            <Building2 size={14} className="text-[#D4AF37]" />
            <span className="text-white font-medium">{empresaConfig?.nomeFantasia || 'Bora Festar Locações'}</span>
          </div>
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1 text-[#E4E4E7]">
              <Calendar size={13} className="text-[#D4AF37]" /> Reserva #{reservaComItens.reserva.id}
            </span>
            {onOpenTemplatesConfig && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onOpenTemplatesConfig();
                }}
                className="text-[11px] text-[#D4AF37] hover:underline flex items-center gap-1 cursor-pointer font-semibold"
              >
                <Edit3 size={11} /> Modelos Padrão
              </button>
            )}
          </div>
        </div>

        {/* Template Selector */}
        <div>
          <label className="block text-xs font-semibold text-[#A1A1AA] mb-1.5 uppercase tracking-wider">
            Selecione o Estágio do Ciclo de Vendas:
          </label>
          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value as StatusCicloVenda)}
            className="w-full px-3.5 py-2.5 bg-[#18181B] border border-[#3F3F46] rounded-xl text-white text-sm focus:border-emerald-500 focus:outline-none cursor-pointer"
          >
            {cycleOptions.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>

        {/* Editable Message Box */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-xs font-semibold text-[#A1A1AA]">
            <span className="flex items-center gap-1.5">
              <span>Texto Gerado Dinamicamente (Editável)</span>
            </span>
            <button
              type="button"
              onClick={handleResetText}
              className="text-[11px] text-[#71717A] hover:text-[#D4AF37] transition-colors flex items-center gap-1 cursor-pointer font-normal"
              title="Restaurar o texto gerado a partir do modelo padrão"
            >
              <RotateCcw size={12} />
              <span>Restaurar Texto</span>
            </button>
          </div>

          <textarea
            rows={8}
            value={messageText}
            onChange={(e) => setMessageText(e.target.value)}
            className="w-full bg-[#0A0A0B] border border-[#27272A] focus:border-emerald-500 rounded-xl p-3.5 font-sans text-xs text-[#E4E4E7] leading-relaxed focus:outline-none transition-all border-l-4 border-l-emerald-500 custom-scrollbar shadow-inner"
            placeholder="Digite ou edite o texto antes de enviar..."
          />

          <div className="flex justify-between text-[10px] text-[#71717A] px-1 font-mono">
            <span>Variáveis do cadastro aplicadas</span>
            <span>{messageText.length} caracteres</span>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-between pt-3 border-t border-[#27272A] gap-3">
          <button
            onClick={handleCopy}
            className="flex items-center gap-1.5 px-4 py-2.5 bg-[#18181B] border border-[#27272A] hover:bg-[#27272A] text-[#E4E4E7] rounded-xl text-xs font-semibold transition-all cursor-pointer"
          >
            {copied ? <Check size={14} className="text-emerald-400" /> : <Copy size={14} />}
            <span>{copied ? 'Copiado!' : 'Copiar Texto'}</span>
          </button>

          <button
            onClick={handleOpenWhatsApp}
            className="flex items-center gap-2 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl text-xs uppercase tracking-wider shadow-lg shadow-emerald-600/20 transition-all cursor-pointer active:scale-95"
          >
            <Send size={15} />
            <span>Disparar no WhatsApp</span>
            <ExternalLink size={13} className="opacity-70" />
          </button>
        </div>
      </div>
    </div>
  );
};
