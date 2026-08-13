import React, { useState } from 'react';
import { ReservaComItens, EmpresaConfig, AssinaturaGovBrData } from '../types';
import { formatarDataBr, formatarMoeda } from '../utils/whatsappTemplates';
import { FileText, Printer, X, CheckCircle2, CloudLightning, ExternalLink, Loader2, ShieldCheck, Lock, RefreshCw, QrCode } from 'lucide-react';
import { getAccessToken, googleSignIn, createGoogleDoc } from '../lib/googleWorkspace';
import { executeGovBrSignature, maskCpf } from '../lib/govbrSignature';
import { QRCodeSVG } from 'qrcode.react';
import { printElementById } from '../utils/printUtils';

interface ContratoPdfModalProps {
  reservaComItens: ReservaComItens;
  empresaConfig: EmpresaConfig;
  onClose: () => void;
}

export const ContratoPdfModal: React.FC<ContratoPdfModalProps> = ({ reservaComItens, empresaConfig, onClose }) => {
  const { reserva, cliente, itens, valorTotal, diasReserva } = reservaComItens;
  const [isExporting, setIsExporting] = useState(false);
  const [exportedDocUrl, setExportedDocUrl] = useState<string | null>(null);
  const [exportError, setExportError] = useState<string | null>(null);

  // Gov.br Digital Signature Modal & State
  const [assinaturaGovBr, setAssinaturaGovBr] = useState<AssinaturaGovBrData | null>(null);
  const [isGovBrModalOpen, setIsGovBrModalOpen] = useState(false);
  const [signerNameInput, setSignerNameInput] = useState(cliente.nome || '');
  const [signerCpfInput, setSignerCpfInput] = useState(cliente.cpfCnpj || '');
  const [isSigning, setIsSigning] = useState(false);

  const handlePrint = () => {
    printElementById('printable-contrato', {
      title: `Contrato de Locação Nº ${reserva.id}`,
      subtitle: `Locatário: ${cliente.nome} | Locadora: ${empresaConfig.nomeFantasia}`,
    });
  };

  const handleSignWithGovBr = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSigning(true);
    try {
      const docText = `CONTRATO-${reserva.id}-${cliente.nome}-${valorTotal}-${empresaConfig.cnpj}`;
      const signedData = await executeGovBrSignature(
        `CONTRATO-${reserva.id}`,
        docText,
        signerNameInput,
        signerCpfInput,
        empresaConfig.govBrConfig
      );
      setAssinaturaGovBr(signedData);
      setIsGovBrModalOpen(false);
    } catch (err: any) {
      console.error(err);
    } finally {
      setIsSigning(false);
    }
  };

  const handleExportGoogleDocs = async () => {
    setIsExporting(true);
    setExportError(null);
    try {
      let token = await getAccessToken();
      if (!token) {
        const authResult = await googleSignIn();
        if (authResult) {
          token = authResult.accessToken;
        }
      }

      if (!token) {
        throw new Error('Você precisa conectar sua conta Google para continuar.');
      }

      const docTitle = `Contrato de Locacao #${reserva.id} - ${cliente.nome}`;
      const docBody = `CONTRATO DE LOCAÇÃO DE BENS MÓVEIS — Nº ${reserva.id}

LOCADOR:
Razão Social: ${empresaConfig.razaoSocial}
Nome Fantasia: ${empresaConfig.nomeFantasia}
CNPJ: ${empresaConfig.cnpj}
Endereço: ${empresaConfig.enderecoCompleto}
Representante: ${empresaConfig.nomeRepresentante}
Telefone/WhatsApp: ${empresaConfig.telefoneWhatsapp}

LOCATÁRIO:
Nome: ${cliente.nome}
Telefone: ${cliente.telefone}
Código do Cliente: #${cliente.id}

DATA DE RETIRADA: ${formatarDataBr(reserva.dataRetirada)}
DATA DE DEVOLUÇÃO: ${formatarDataBr(reserva.dataDevolucao)}
DURAÇÃO TOTAL: ${diasReserva} dia(s)

ITENS ALUGADOS:
${itens.map((item, index) => `${index + 1}. ${item.nome} (${formatarMoeda(item.precoAluguel)}/dia) - Subtotal (${diasReserva} dias): ${formatarMoeda(item.precoAluguel * diasReserva)}`).join('\n')}

VALOR TOTAL DO CONTRATO: ${formatarMoeda(valorTotal)}

CLÁUSULAS E CONDIÇÕES GERAIS:
CLÁUSULA 1ª: O LOCATÁRIO declara ter recebido os itens descritos neste contrato em perfeitas condições de uso, conservação e funcionamento.
CLÁUSULA 2ª: O LOCATÁRIO compromete-se a devolver os bens na data aprazada. A não devolução acarretará multa diária equivalente a 10% do valor total da locação.
CLÁUSULA 3ª: Em caso de dano, avaria, extravio ou destruição parcial ou total do bem, o LOCATÁRIO arcará com os custos integrais de reparo ou reposição do acervo de acordo com a cotação de mercado.

Assinaturas:

Locador: _____________________________________________
${empresaConfig.nomeRepresentante}
Representante Legal - ${empresaConfig.nomeFantasia}

Locatário: ___________________________________________
${cliente.nome}

Gerado em: ${formatarDataBr(Date.now())}
`;

      const result = await createGoogleDoc(docTitle, docBody, token);
      setExportedDocUrl(result.url);
    } catch (err: any) {
      console.error(err);
      setExportError(err.message || 'Erro ao exportar contrato.');
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-[#0A0A0B]/80 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-[#111113] border border-[#27272A] rounded-2xl max-w-3xl w-full p-6 text-white shadow-2xl space-y-6 my-8">
        {/* Modal Top Actions */}
        <div className="flex items-center justify-between border-b border-[#27272A] pb-4">
          <div className="flex items-center space-x-2">
            <FileText className="text-[#D4AF37]" size={22} />
            <div>
              <h3 className="text-lg font-serif italic text-[#D4AF37]">Contrato de Locação em PDF</h3>
              <p className="text-xs text-[#71717A]">
                Gerado automaticamente com os dados oficiais da locadora
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={() => {
                if (empresaConfig?.govBrConfig?.enabled) {
                  setIsGovBrModalOpen(true);
                }
              }}
              disabled={!empresaConfig?.govBrConfig?.enabled}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all shadow-lg ${
                empresaConfig?.govBrConfig?.enabled
                  ? 'bg-emerald-500/10 border border-emerald-500/30 hover:bg-emerald-500/20 text-emerald-400 cursor-pointer shadow-emerald-500/10'
                  : 'bg-[#18181B] border border-[#27272A] text-[#71717A] cursor-not-allowed opacity-40'
              }`}
              title={empresaConfig?.govBrConfig?.enabled ? "Assinar Contrato digitalmente com Gov.br" : "Módulo de Assinatura Digital inativo nas configurações"}
            >
              <ShieldCheck size={14} />
              <span>Assinar com Gov.br</span>
            </button>

            {empresaConfig.habilitarGoogleDrive !== false && (
              <button
                onClick={handleExportGoogleDocs}
                disabled={isExporting}
                className="flex items-center gap-1.5 bg-[#D4AF37]/10 border border-[#D4AF37]/30 hover:bg-[#D4AF37]/20 text-[#D4AF37] px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer disabled:opacity-50"
              >
                {isExporting ? (
                  <>
                    <Loader2 className="animate-spin" size={14} />
                    <span>Gerando Doc...</span>
                  </>
                ) : (
                  <>
                    <FileText size={14} />
                    <span>Salvar no Google Docs</span>
                  </>
                )}
              </button>
            )}
            <button
              onClick={handlePrint}
              className="flex items-center gap-1.5 bg-[#18181B] border border-[#27272A] hover:bg-[#27272A] text-[#E4E4E7] px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer"
            >
              <Printer size={14} /> Imprimir / PDF
            </button>
            <button
              onClick={onClose}
              className="text-[#71717A] hover:text-white p-1.5 rounded-xl hover:bg-[#18181B] cursor-pointer"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Export Status Notification */}
        {exportedDocUrl && (
          <div className="bg-emerald-500/10 border border-emerald-500/30 p-3.5 rounded-xl text-xs text-emerald-400 flex items-center justify-between gap-2 animate-fadeIn">
            <div className="flex items-center gap-2">
              <CheckCircle2 size={16} className="shrink-0" />
              <span>Contrato criado com sucesso no Google Docs!</span>
            </div>
            <a
              href={exportedDocUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 bg-emerald-500 hover:bg-emerald-600 text-black px-3 py-1 rounded-lg font-bold text-xs transition-all"
            >
              Abrir Documento <ExternalLink size={12} />
            </a>
          </div>
        )}

        {exportError && (
          <div className="bg-red-500/10 border border-red-500/30 p-3.5 rounded-xl text-xs text-red-400 flex items-center gap-2 animate-fadeIn">
            <CloudLightning size={16} className="shrink-0" />
            <span>{exportError}</span>
          </div>
        )}


        {/* Paper Container Preview (A4 styling) */}
        <div id="printable-contrato" className="bg-white text-slate-900 p-8 rounded-xl shadow-2xl border border-slate-200 font-sans text-sm space-y-6 max-h-[65vh] overflow-y-auto print:max-h-none print:p-0">
          {/* Header */}
          <div className="border-b-2 border-amber-600 pb-4 flex justify-between items-start">
            <div className="flex items-center gap-3">
              <div>
                <h1 className="text-xl font-black text-amber-700 tracking-tight uppercase">
                  {empresaConfig.nomeFantasia}
                </h1>
                <p className="text-xs text-slate-500 font-semibold uppercase">
                  Contrato de Locação de Bens Móveis — Nº {reserva.id}
                </p>
              </div>
            </div>
            <div className="text-right">
              <span className="inline-block bg-emerald-100 text-emerald-800 text-xs font-bold px-2.5 py-1 rounded-full">
                Status: {reserva.status}
              </span>
              <p className="text-xs text-slate-400 mt-1">Data: {formatarDataBr(Date.now())}</p>
            </div>
          </div>

          {/* Qualification */}
          <div className="bg-slate-50 p-4 rounded-lg border border-slate-200 space-y-1.5">
            <h4 className="font-bold text-xs uppercase text-slate-500 tracking-wider">Das Partes Contratantes</h4>
            <p className="text-xs leading-relaxed text-slate-700">
              <strong>LOCADOR:</strong> {empresaConfig.razaoSocial} ("{empresaConfig.nomeFantasia}"), inscrita no CNPJ sob nº{' '}
              <span className="font-mono">{empresaConfig.cnpj}</span>, estabelecida em {empresaConfig.enderecoCompleto}, representada neste ato por{' '}
              <strong>{empresaConfig.nomeRepresentante}</strong>, Telefone/WhatsApp: {empresaConfig.telefoneWhatsapp}.
            </p>
            <p className="text-xs leading-relaxed text-slate-700">
              <strong>LOCATÁRIO:</strong> {cliente.nome}, Telefone: {cliente.telefone}, Código: #{cliente.id}.
            </p>
          </div>

          {/* Dates & Period */}
          <div className="grid grid-cols-2 gap-4 text-xs bg-amber-50/60 p-3 rounded-lg border border-amber-100">
            <div>
              <span className="text-slate-500 block font-semibold">Data de Retirada:</span>
              <span className="font-bold text-slate-800">{formatarDataBr(reserva.dataRetirada)}</span>
            </div>
            <div>
              <span className="text-slate-500 block font-semibold">Data de Devolução:</span>
              <span className="font-bold text-slate-800">
                {formatarDataBr(reserva.dataDevolucao)} ({diasReserva} dia(s))
              </span>
            </div>
          </div>

          {/* Items Table */}
          <div>
            <h4 className="font-bold text-xs uppercase text-slate-500 tracking-wider mb-2">
              Dos Itens Alugados e Valores
            </h4>
            <table className="w-full border-collapse text-left text-xs">
              <thead>
                <tr className="bg-slate-100 border-b border-slate-300 font-bold text-slate-700">
                  <th className="py-2 px-3">Item / Equipamento</th>
                  <th className="py-2 px-3 text-right">Valor Diária</th>
                  <th className="py-2 px-3 text-right">Subtotal ({diasReserva}d)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {itens.map((item) => {
                  const subtotal = item.precoAluguel * diasReserva;
                  return (
                    <tr key={item.id}>
                      <td className="py-2 px-3 font-medium text-slate-800">{item.nome}</td>
                      <td className="py-2 px-3 text-right text-slate-600">{formatarMoeda(item.precoAluguel)}</td>
                      <td className="py-2 px-3 text-right font-bold text-slate-900">{formatarMoeda(subtotal)}</td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot>
                <tr className="bg-slate-100 border-t-2 border-slate-300 font-bold">
                  <td colSpan={2} className="py-2 px-3 text-right text-slate-800">
                    VALOR TOTAL DO CONTRATO:
                  </td>
                  <td className="py-2 px-3 text-right text-amber-700 text-sm">{formatarMoeda(valorTotal)}</td>
                </tr>
              </tfoot>
            </table>
          </div>

          {/* Legal Clauses */}
          <div className="space-y-2 border-t border-slate-200 pt-3">
            <h4 className="font-bold text-xs uppercase text-slate-500 tracking-wider">Cláusulas e Condições Gerais</h4>
            <p className="text-[11px] leading-relaxed text-slate-600 justify-text">
              <strong>CLÁUSULA 1ª:</strong> O LOCATÁRIO declara ter recebido os itens descritos neste contrato em
              perfeitas condições de uso e funcionamento.
            </p>
            <p className="text-[11px] leading-relaxed text-slate-600 justify-text">
              <strong>CLÁUSULA 2ª:</strong> O LOCATÁRIO compromete-se a devolver os bens na data aprazada. A não
              devolução acarretará multa diária equivalente a 10% do valor total da locação.
            </p>
            <p className="text-[11px] leading-relaxed text-slate-600 justify-text">
              <strong>CLÁUSULA 3ª:</strong> Em caso de dano, extravio ou destruição parcial ou total do bem, o
              LOCATÁRIO arcará com os custos integrais de reparo ou reposição do acervo.
            </p>
          </div>

          {/* Signatures & Gov.br Stamp */}
          {assinaturaGovBr ? (
            <div className="bg-emerald-50/90 border-2 border-emerald-600 rounded-xl p-4 my-4 text-xs space-y-3 font-mono print:border-emerald-700 shadow-sm">
              <div className="flex items-center justify-between border-b border-emerald-200 pb-2">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-full bg-emerald-600 text-white font-bold flex items-center justify-center text-[10px] shadow-sm">
                    BR
                  </div>
                  <div>
                    <span className="font-bold text-emerald-950 block text-[11px] tracking-tight">
                      ASSINADO DIGITALMENTE — GOV.BR
                    </span>
                    <span className="text-[9px] text-emerald-700 block font-medium">
                      Validade Jurídica Integral (Lei nº 14.063/2020 • ICP-Brasil)
                    </span>
                  </div>
                </div>
                <span className="bg-emerald-200 text-emerald-950 font-bold text-[9px] px-2 py-0.5 rounded uppercase border border-emerald-300">
                  Nível {assinaturaGovBr.certificateLevel}
                </span>
              </div>

              {/* Details Grid + Prominent QR Code for Authentication */}
              <div className="flex flex-col sm:flex-row items-center justify-between gap-4 py-1">
                <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-2 text-[10px] text-slate-700 w-full">
                  <div className="bg-white/70 p-1.5 rounded border border-emerald-200/60">
                    <span className="text-slate-500 block font-sans text-[9px]">Signatário Autenticado:</span>
                    <span className="font-bold text-slate-900">{assinaturaGovBr.signerName}</span>
                  </div>
                  <div className="bg-white/70 p-1.5 rounded border border-emerald-200/60">
                    <span className="text-slate-500 block font-sans text-[9px]">CPF Registrado:</span>
                    <span className="font-bold text-slate-900 font-mono">{assinaturaGovBr.signerCpf}</span>
                  </div>
                  <div className="bg-white/70 p-1.5 rounded border border-emerald-200/60">
                    <span className="text-slate-500 block font-sans text-[9px]">Data e Hora do Carimbo:</span>
                    <span className="font-bold text-slate-900 font-mono">
                      {new Date(assinaturaGovBr.timestamp).toLocaleString('pt-BR')}
                    </span>
                  </div>
                  <div className="bg-white/70 p-1.5 rounded border border-emerald-200/60">
                    <span className="text-slate-500 block font-sans text-[9px]">Token PKCS#7:</span>
                    <span className="font-mono text-emerald-800 text-[9px] truncate block" title={assinaturaGovBr.signatureToken}>
                      {assinaturaGovBr.signatureToken}
                    </span>
                  </div>
                </div>

                {/* Scannable Authentic QR Code Element */}
                <div className="shrink-0 flex flex-col items-center justify-center bg-white p-2.5 rounded-xl border-2 border-emerald-600 shadow-md text-center print:border-emerald-700">
                  <QRCodeSVG 
                    value={`${assinaturaGovBr.verificationUrl}?doc=${assinaturaGovBr.documentId}&hash=${assinaturaGovBr.hashSha256}&token=${assinaturaGovBr.signatureToken}`} 
                    size={92} 
                    level="H" 
                    includeMargin={false}
                    fgColor="#064e3b"
                    bgColor="#ffffff"
                  />
                  <div className="mt-1.5 flex items-center gap-1 text-[9px] font-extrabold text-emerald-950 uppercase tracking-tight">
                    <QrCode size={10} className="text-emerald-700 shrink-0" />
                    <span>Autenticação QR</span>
                  </div>
                  <span className="text-[7.5px] text-slate-500 font-sans font-medium">
                    Validação ITI / Gov.br
                  </span>
                </div>
              </div>

              <div className="border-t border-emerald-200 pt-2 flex items-center justify-between text-[9px] text-slate-600">
                <div className="truncate pr-2">
                  <span className="text-slate-400">SHA-256 Digest:</span>{' '}
                  <span className="font-mono text-slate-800 text-[8px]">{assinaturaGovBr.hashSha256}</span>
                </div>
                <a
                  href={assinaturaGovBr.verificationUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-emerald-700 font-bold hover:underline shrink-0 flex items-center gap-1 font-sans"
                >
                  <ExternalLink size={11} /> Validar no ITI
                </a>
              </div>
            </div>
          ) : (
            <div className="pt-8 border-t border-slate-200">
              <div className="grid grid-cols-2 gap-8 text-center text-xs">
                <div className="space-y-1">
                  <div className="border-b-2 border-slate-400 mb-2 w-48 mx-auto"></div>
                  <p className="font-bold text-slate-900">{empresaConfig.nomeRepresentante}</p>
                  <p className="text-[10px] text-slate-500 font-medium">{empresaConfig.nomeFantasia} (LOCADOR)</p>
                </div>

                <div className="space-y-1">
                  <div className="border-b-2 border-slate-400 mb-2 w-48 mx-auto"></div>
                  <p className="font-bold text-slate-900">{cliente.nome}</p>
                  <p className="text-[10px] text-slate-500 font-medium">LOCATÁRIO(A)</p>
                </div>
              </div>
            </div>
          )}

          {/* Footer Address */}
          <div className="text-[10px] text-slate-500 text-center border-t border-slate-200 pt-2 font-mono">
            {empresaConfig.enderecoCompleto} | Contato: {empresaConfig.telefoneWhatsapp} | CNPJ: {empresaConfig.cnpj}
          </div>
        </div>

        {/* Footer info */}
        <div className="flex items-center justify-between text-xs text-[#71717A] pt-2 border-t border-[#27272A]">
          <span className="flex items-center gap-1 text-emerald-400">
            <CheckCircle2 size={14} /> Contrato oficial pronto para impressão e assinatura
          </span>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-[#D4AF37] hover:bg-[#E5C158] text-[#0A0A0B] rounded-xl font-bold uppercase tracking-wider text-xs transition-all cursor-pointer"
          >
            Fechar Visualização
          </button>
        </div>
      </div>

      {/* Gov.br Authentication & Signature Modal */}
      {isGovBrModalOpen && (
        <div className="fixed inset-0 z-60 bg-black/85 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-[#111113] border border-emerald-500/40 rounded-2xl max-w-md w-full p-6 text-white shadow-2xl space-y-5 animate-fadeIn">
            <div className="flex items-center justify-between border-b border-[#27272A] pb-3">
              <div className="flex items-center gap-2 text-emerald-400">
                <ShieldCheck size={22} />
                <h3 className="font-bold text-base">Assinar via Portal Gov.br</h3>
              </div>
              <button
                type="button"
                onClick={() => setIsGovBrModalOpen(false)}
                className="text-[#71717A] hover:text-white p-1 rounded-lg"
              >
                <X size={18} />
              </button>
            </div>

            <div className="bg-emerald-500/10 border border-emerald-500/30 p-3.5 rounded-xl text-xs space-y-1 text-emerald-300">
              <span className="font-bold block uppercase text-[10px] tracking-wider text-emerald-400">
                Autenticação no Barramento do Governo Federal
              </span>
              <p className="text-[11px] text-slate-300">
                Esta operação irá gerar o carimbo de tempo ICP-Brasil e o hash SHA-256 do contrato com validade jurídica perante o ITI.
              </p>
            </div>

            <form onSubmit={handleSignWithGovBr} className="space-y-4 text-xs">
              <div>
                <label className="block text-[#A1A1AA] font-semibold mb-1">
                  Nome Completo do Signatário (Locatário ou Representante)
                </label>
                <input
                  type="text"
                  required
                  value={signerNameInput}
                  onChange={(e) => setSignerNameInput(e.target.value)}
                  placeholder="Ex: João da Silva Santos"
                  className="w-full bg-[#18181B] border border-[#27272A] rounded-xl px-3.5 py-2.5 text-white focus:outline-none focus:border-emerald-500 font-medium"
                />
              </div>

              <div>
                <label className="block text-[#A1A1AA] font-semibold mb-1">
                  CPF do Signatário
                </label>
                <input
                  type="text"
                  required
                  value={signerCpfInput}
                  onChange={(e) => setSignerCpfInput(e.target.value)}
                  placeholder="000.000.000-00"
                  className="w-full bg-[#18181B] border border-[#27272A] rounded-xl px-3.5 py-2.5 text-white focus:outline-none focus:border-emerald-500 font-mono"
                />
              </div>

              <div className="bg-[#18181B] p-3 rounded-xl border border-[#27272A] space-y-1 font-mono text-[10px] text-[#A1A1AA]">
                <div className="flex justify-between">
                  <span>Documento ID:</span>
                  <span className="text-white font-bold">CONTRATO-#{reserva.id}</span>
                </div>
                <div className="flex justify-between">
                  <span>Ambiente:</span>
                  <span className="text-amber-400 font-bold uppercase">
                    {empresaConfig.govBrConfig?.ambiente || 'Homologação'}
                  </span>
                </div>
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsGovBrModalOpen(false)}
                  className="bg-[#18181B] hover:bg-[#27272A] text-[#A1A1AA] px-4 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSigning}
                  className="flex items-center gap-2 bg-emerald-500 hover:bg-emerald-600 text-black px-5 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer shadow-lg shadow-emerald-500/20 disabled:opacity-50"
                >
                  {isSigning ? (
                    <>
                      <RefreshCw size={14} className="animate-spin" />
                      <span>Assinando via Gov.br...</span>
                    </>
                  ) : (
                    <>
                      <ShieldCheck size={16} />
                      <span>Confirmar Assinatura Gov.br</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

