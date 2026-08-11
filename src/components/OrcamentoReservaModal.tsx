import React, { useState } from 'react';
import { ReservaComItens, FormularioWeb, EmpresaConfig, StatusCicloVenda } from '../types';
import { formatarMoeda, formatarDataBr, processarTemplateWhatsApp, DEFAULT_TEMPLATES } from '../utils/whatsappTemplates';
import { sendWhatsAppMessageAuto } from '../lib/whatsappApi';
import { getActiveTenantId } from '../lib/firebaseSync';
import {
  Sparkles,
  Copy,
  Check,
  ExternalLink,
  MessageSquare,
  Calendar,
  User,
  DollarSign,
  X,
  ShoppingBag,
  CheckCircle2,
  Clock,
  Send,
  FileText,
  Phone,
  Printer,
  ShieldCheck,
} from 'lucide-react';
import { printElementById } from '../utils/printUtils';

interface OrcamentoReservaModalProps {
  reservaComItens: ReservaComItens;
  webForms?: FormularioWeb[];
  empresaConfig?: EmpresaConfig;
  onClose: () => void;
}

export const OrcamentoReservaModal: React.FC<OrcamentoReservaModalProps> = ({
  reservaComItens,
  webForms = [],
  empresaConfig,
  onClose,
}) => {
  const { reserva, cliente, itens, valorTotal, diasReserva } = reservaComItens;
  const [copiedLink, setCopiedLink] = useState(false);
  const [sendingWhatsApp, setSendingWhatsApp] = useState(false);
  const [whatsAppNotice, setWhatsAppNotice] = useState<string | null>(null);

  // Find linked webForm by origemPropostaId or client matching
  const matchingForm = webForms.find((f) => {
    if (reserva.origemPropostaId && (f.id === reserva.origemPropostaId || f.id.endsWith(reserva.origemPropostaId))) {
      return true;
    }
    if (f.clienteId && f.clienteId === cliente.id) return true;
    if (f.clienteTelefone && cliente.telefone && f.clienteTelefone.replace(/\D/g, '') === cliente.telefone.replace(/\D/g, '')) return true;
    if (f.clienteNome && cliente.nome && f.clienteNome.toLowerCase().trim() === cliente.nome.toLowerCase().trim()) return true;
    return false;
  });

  const proposalId = matchingForm?.id || `ORC-${reserva.id}`;
  const percentualCalcao = matchingForm?.percentualCalcao ?? reserva.percentualCalcao ?? empresaConfig?.painelConfiguracao?.percentualSinalPadrao ?? 50;
  const valorCalcao = reserva.valorCalcao ?? (valorTotal * percentualCalcao) / 100;
  const saldoRestante = Math.max(0, valorTotal - valorCalcao);
  
  // Construct proposal public URL
  const isGoogleFormsEnabled = empresaConfig?.habilitarGoogleForms !== false;
  const baseDomain = window.location.origin.includes('localhost') || window.location.origin.includes('ais-dev') || window.location.origin.includes('ais-pre')
    ? window.location.origin
    : 'https://acervus.ai.studio';
  const activeTenant = getActiveTenantId();
  const proposalUrl = (isGoogleFormsEnabled && matchingForm?.googleFormUrl) || `${baseDomain}${window.location.pathname}?proposta=${proposalId}&tenant=${activeTenant}`;

  const handleCopyLink = () => {
    navigator.clipboard.writeText(proposalUrl);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2500);
  };

  const handlePrint = () => {
    printElementById('printable-orcamento', {
      title: `Orçamento de Locação Nº ${proposalId}`,
      subtitle: `Cliente: ${cliente.nome} | Locadora: ${empresaConfig?.nomeFantasia || 'Acervus Locadora'}`,
    });
  };

  const handleSendWhatsApp = async () => {
    setSendingWhatsApp(true);
    setWhatsAppNotice(null);

    const defaultTemplate =
      empresaConfig?.whatsappTemplates?.[StatusCicloVenda.ENVIO_FORMULARIO_PROPOSTA] ||
      DEFAULT_TEMPLATES[StatusCicloVenda.ENVIO_FORMULARIO_PROPOSTA] ||
      `Olá *{cliente_nome}*! 👋\n\nSegue o link do seu orçamento gerado na *{empresa_nome}*:\n\n🔗 *Link do Orçamento:* {link_formulario}\n\nFicamos à disposição!`;

    const mensagem = processarTemplateWhatsApp(
      defaultTemplate,
      reservaComItens,
      cliente,
      empresaConfig,
      proposalUrl
    );

    const result = await sendWhatsAppMessageAuto(cliente.telefone, mensagem, empresaConfig);
    setSendingWhatsApp(false);
    setWhatsAppNotice(result.message);
    setTimeout(() => setWhatsAppNotice(null), 4000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 overflow-y-auto animate-fade-in">
      <div className="bg-[#111113] border border-[#D4AF37]/50 rounded-2xl w-full max-w-2xl shadow-2xl overflow-hidden my-8 flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="bg-gradient-to-r from-[#18181B] via-[#111113] to-[#18181B] p-5 border-b border-[#27272A] flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-mono uppercase font-bold tracking-widest text-[#D4AF37] bg-[#D4AF37]/10 px-2 py-0.5 rounded border border-[#D4AF37]/30 flex items-center gap-1">
                  <Sparkles size={11} />
                  Orçamento de Reserva
                </span>
                <span className="text-xs font-mono text-[#71717A]">#{proposalId}</span>
              </div>
              <h2 className="text-base font-bold text-white mt-0.5">
                Orçamento de Aluguel Enviado ao Cliente
              </h2>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 text-[#71717A] hover:text-white bg-[#18181B] hover:bg-[#27272A] rounded-xl transition-all cursor-pointer border border-[#27272A]"
            title="Fechar"
          >
            <X size={18} />
          </button>
        </div>

        {/* Modal Body */}
        <div id="printable-orcamento" className="p-6 space-y-6 overflow-y-auto custom-scrollbar flex-1">
          {/* Status Badge & Meta Info */}
          <div className="bg-[#18181B] border border-[#27272A] p-4 rounded-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div className="space-y-1">
              <span className="text-[11px] font-bold uppercase tracking-wider text-[#71717A]">Status da Proposta</span>
              <div className="flex items-center gap-2">
                {reserva.propostaAprovada || matchingForm?.respondido ? (
                  <span className="inline-flex items-center gap-1.5 bg-emerald-500/15 border border-emerald-500/40 text-emerald-400 text-xs font-bold px-3 py-1 rounded-full">
                    <CheckCircle2 size={14} /> Proposta Aprovada / Confirmada
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5 bg-[#D4AF37]/15 border border-[#D4AF37]/40 text-[#D4AF37] text-xs font-bold px-3 py-1 rounded-full">
                    <Clock size={14} /> Aguardando Resposta do Cliente
                  </span>
                )}
              </div>
            </div>

            {matchingForm?.criadoEm && (() => {
              const validadeDias = matchingForm.validadeDias || empresaConfig?.painelConfiguracao?.validadeOrcamentoDias || 7;
              const dataGeracao = new Date(matchingForm.criadoEm);
              const dataExpiracao = new Date(matchingForm.criadoEm + validadeDias * 86400000);
              const isExpirado = Date.now() > dataExpiracao.getTime();

              return (
                <div className="text-right text-xs font-mono space-y-0.5">
                  <div className="text-[#A1A1AA]">
                    Gerado em: {dataGeracao.toLocaleDateString('pt-BR')} às{' '}
                    {dataGeracao.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                  </div>
                  <div className={isExpirado ? 'text-red-400 font-semibold' : 'text-[#D4AF37]'}>
                    Validade: {validadeDias} dia(s) ({isExpirado ? `Expirou em ${dataExpiracao.toLocaleDateString('pt-BR')}` : `Válida até ${dataExpiracao.toLocaleDateString('pt-BR')}`})
                  </div>
                </div>
              );
            })()}
          </div>

          {/* Client Details Box */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="bg-[#18181B]/80 border border-[#27272A] p-4 rounded-xl space-y-2">
              <div className="flex items-center gap-2 text-xs font-bold text-[#D4AF37] uppercase tracking-wider">
                <User size={14} /> Dados do Locatário
              </div>
              <div className="text-sm font-bold text-white">{cliente.nome}</div>
              <div className="text-xs text-[#A1A1AA] flex items-center gap-1 font-mono">
                <Phone size={12} className="text-emerald-400" /> {cliente.telefone || 'Sem telefone'}
              </div>
              {cliente.cpfCnpj && (
                <div className="text-[11px] text-[#71717A] font-mono">CPF/CNPJ: {cliente.cpfCnpj}</div>
              )}
            </div>

            <div className="bg-[#18181B]/80 border border-[#27272A] p-4 rounded-xl space-y-2">
              <div className="flex items-center gap-2 text-xs font-bold text-[#D4AF37] uppercase tracking-wider">
                <Calendar size={14} /> Período Solicitado
              </div>
              <div className="text-xs text-white">
                <span className="font-semibold text-emerald-400">{formatarDataBr(reserva.dataRetirada)}</span> até{' '}
                <span className="font-semibold text-emerald-400">{formatarDataBr(reserva.dataDevolucao)}</span>
              </div>
              <div className="text-[11px] text-[#71717A]">
                Duração total: <strong className="text-white">{diasReserva} dia(s)</strong> de locação
              </div>
            </div>
          </div>

          {/* Items List */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold text-[#A1A1AA] uppercase tracking-wider flex items-center gap-2">
                <ShoppingBag size={14} className="text-[#D4AF37]" />
                Itens Incluídos no Orçamento ({itens.length})
              </h3>
              <span className="text-xs text-[#71717A]">Valores unitários da época</span>
            </div>

            <div className="bg-[#18181B] border border-[#27272A] rounded-xl overflow-hidden divide-y divide-[#27272A]">
              {itens.map((item) => (
                <div key={item.id} className="p-3 flex items-center justify-between hover:bg-[#27272A]/30 transition-colors">
                  <div className="flex items-center gap-3">
                    {item.imageUrl ? (
                      <img src={item.imageUrl} alt={item.nome} className="w-10 h-10 rounded-lg object-cover border border-[#27272A]" />
                    ) : (
                      <div className="w-10 h-10 rounded-lg bg-[#27272A] flex items-center justify-center text-[#71717A]">
                        <ShoppingBag size={16} />
                      </div>
                    )}
                    <div>
                      <div className="text-xs font-bold text-white">{item.nome}</div>
                      {item.categoria && <div className="text-[10px] text-[#71717A]">{item.categoria}</div>}
                    </div>
                  </div>

                  <div className="text-right">
                    <div className="text-xs font-mono font-bold text-[#D4AF37]">{formatarMoeda(item.precoAluguel)}</div>
                    <div className="text-[10px] text-[#71717A]">diária</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Customer Response Info if available */}
          {matchingForm?.resposta && (
            <div className="bg-emerald-950/20 border border-emerald-500/30 p-4 rounded-xl space-y-2">
              <div className="text-xs font-bold text-emerald-400 uppercase tracking-wider flex items-center gap-2">
                <CheckCircle2 size={14} /> Resposta Confirmada pelo Cliente
              </div>
              <div className="text-xs text-[#E4E4E7] space-y-1">
                <div>
                  <strong>Nome informado:</strong> {matchingForm.resposta.clienteNome}
                </div>
                <div>
                  <strong>Telefone de contato:</strong> {matchingForm.resposta.clienteTelefone}
                </div>
                {matchingForm.resposta.observacoes && (
                  <div>
                    <strong>Observações:</strong> "{matchingForm.resposta.observacoes}"
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Summary Box */}
          <div className="bg-gradient-to-r from-[#18181B] to-[#111113] border-2 border-[#D4AF37]/60 p-4 rounded-xl space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-[10px] uppercase font-bold tracking-widest text-[#71717A]">Valor Total do Orçamento</span>
                <div className="text-xs text-[#A1A1AA]">{itens.length} item(ns) x {diasReserva} dia(s)</div>
              </div>
              <div className="text-xl font-mono font-bold text-[#D4AF37]">
                {formatarMoeda(valorTotal)}
              </div>
            </div>

            {percentualCalcao > 0 && (
              <div className="bg-[#111113] p-2.5 rounded-lg border border-[#D4AF37]/30 flex items-center justify-between text-xs pt-2">
                <div>
                  <span className="text-[#D4AF37] font-bold flex items-center gap-1 text-[11px]">
                    <ShieldCheck size={13} /> Calção de Garantia ({percentualCalcao}%):
                  </span>
                  <span className="text-[10px] text-[#71717A]">Sinal exigido para reserva</span>
                </div>
                <span className="text-[#D4AF37] font-mono font-bold">{formatarMoeda(valorCalcao)}</span>
              </div>
            )}
          </div>

          {/* Public Proposal URL Box */}
          <div className="space-y-1">
            <label className="text-[11px] font-bold text-[#A1A1AA] uppercase tracking-wider">
              Link de Acesso Público do Orçamento
            </label>
            <div className="flex items-center gap-2">
              <input
                type="text"
                readOnly
                value={proposalUrl}
                className="w-full px-3.5 py-2.5 bg-[#18181B] border border-[#27272A] rounded-xl text-xs font-mono text-[#D4AF37] select-all focus:outline-none"
              />
              <button
                onClick={handleCopyLink}
                className={`px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer shrink-0 flex items-center gap-1.5 border ${
                  copiedLink
                    ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                    : 'bg-[#27272A] hover:bg-[#3F3F46] text-white border-[#3F3F46]'
                }`}
              >
                {copiedLink ? <Check size={14} /> : <Copy size={14} />}
                <span>{copiedLink ? 'Copiado!' : 'Copiar'}</span>
              </button>
            </div>
          </div>

          {/* Notification Alert */}
          {whatsAppNotice && (
            <div className="bg-emerald-500/10 border border-emerald-500/30 p-3 rounded-xl text-xs text-emerald-400 font-medium flex items-center gap-2 animate-fade-in">
              <CheckCircle2 size={16} />
              <span>{whatsAppNotice}</span>
            </div>
          )}
        </div>

        {/* Modal Footer Actions */}
        <div className="p-4 bg-[#0A0A0B] border-t border-[#27272A] flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0">
          <a
            href={proposalUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 bg-[#18181B] hover:bg-[#27272A] text-white border border-[#27272A] px-4 py-2.5 rounded-xl text-xs font-bold transition-all"
          >
            <ExternalLink size={14} className="text-[#D4AF37]" />
            <span>Visualizar como Cliente</span>
          </a>

          <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto justify-end">
            <button
              type="button"
              onClick={handlePrint}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 bg-[#18181B] hover:bg-[#27272A] text-white border border-[#27272A] px-4 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer"
            >
              <Printer size={14} className="text-[#D4AF37]" />
              <span>Imprimir / PDF</span>
            </button>

            <button
              type="button"
              onClick={handleSendWhatsApp}
              disabled={sendingWhatsApp}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-2.5 rounded-xl text-xs font-bold transition-all shadow-md cursor-pointer disabled:opacity-50"
            >
              <MessageSquare size={14} />
              <span>{sendingWhatsApp ? 'Enviando...' : 'Reenviar no WhatsApp'}</span>
            </button>

            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 bg-[#27272A] hover:bg-[#3F3F46] text-white text-xs font-bold rounded-xl transition-all cursor-pointer"
            >
              Fechar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
