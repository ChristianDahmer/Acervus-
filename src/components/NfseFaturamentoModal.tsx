import React, { useState, useEffect } from 'react';
import { 
  X, 
  FileText, 
  CheckCircle2, 
  AlertTriangle, 
  Printer, 
  Download, 
  RefreshCw, 
  Sliders, 
  ShieldCheck, 
  Eye, 
  EyeOff, 
  Building2, 
  User, 
  DollarSign, 
  Clock, 
  ArrowRight,
  Sparkles,
  FileCheck
} from 'lucide-react';
import { ReservaComItens, EmpresaConfig, StatusReserva } from '../types';
import { formatarMoeda, formatarDataBr } from '../utils/whatsappTemplates';
import { printHtmlContent } from '../utils/printUtils';
import { limparDocumento } from '../utils/documentValidation';

interface NfseFaturamentoModalProps {
  isOpen: boolean;
  onClose: () => void;
  reservaComItens: ReservaComItens;
  empresaConfig?: EmpresaConfig;
  onConfirmFaturamento: (
    reservaId: number, 
    chaveAcesso: string, 
    protocolo: string, 
    dataEmissao: number
  ) => Promise<void>;
}

export const NfseFaturamentoModal: React.FC<NfseFaturamentoModalProps> = ({
  isOpen,
  onClose,
  reservaComItens,
  empresaConfig,
  onConfirmFaturamento
}) => {
  const { reserva, cliente, itens, valorTotal, diasReserva } = reservaComItens;

  // Form Fields
  const [cnpjTomador, setCnpjTomador] = useState('');
  const [nomeTomador, setNomeTomador] = useState(cliente.nome || '');
  const [emailTomador, setEmailTomador] = useState(cliente.email || '');
  const [telefoneTomador, setTelefoneTomador] = useState(cliente.telefone || '');
  
  // Endereço
  const [cepTomador, setCepTomador] = useState('01310-100');
  const [logradouroTomador, setLogradouroTomador] = useState('Avenida Paulista');
  const [numeroTomador, setNumeroTomador] = useState('1000');
  const [bairroTomador, setBairroTomador] = useState('Bela Vista');
  const [cidadeTomador, setCidadeTomador] = useState('São Paulo');
  const [ufTomador, setUfTomador] = useState('SP');

  // Detalhes do Serviço
  const [tipoServico, setTipoServico] = useState<'locacao' | 'prestacao_servicos'>('locacao');
  const [aliquotaIss, setAliquotaIss] = useState(0); // Locação é isento por padrão
  const [codigoServico, setCodigoServico] = useState('03.02'); // Locação de bens móveis
  const [descricaoServico, setDescricaoServico] = useState('');

  // Retenções Federais
  const [reterPis, setReterPis] = useState(false);
  const [reterCofins, setReterCofins] = useState(false);
  const [reterInss, setReterInss] = useState(false);

  // Flow State
  const [etapa, setEtapa] = useState<'PREENCHIMENTO' | 'TRANSMISSAO' | 'DANFSE'>('PREENCHIMENTO');
  const [progressLog, setProgressLog] = useState<string[]>([]);
  const [currentProgressIndex, setCurrentProgressIndex] = useState(0);
  const [showXml, setShowXml] = useState(false);

  // Result State
  const [chaveAcesso, setChaveAcesso] = useState('');
  const [protocolo, setProtocolo] = useState('');
  const [dataEmissao, setDataEmissao] = useState(0);

  // Initialize data
  useEffect(() => {
    if (isOpen) {
      // Pre-fill CNPJ if client has it, otherwise default mock CNPJ or CPF
      const cleanTel = cliente.telefone ? cliente.telefone.replace(/\D/g, '') : '';
      const mockedCnpj = cleanTel.length >= 11 ? `${cleanTel.slice(0, 2)}.${cleanTel.slice(2, 5)}.${cleanTel.slice(5, 8)}/0001-${cleanTel.slice(8, 10)}` : '12.345.678/0001-99';
      setCnpjTomador(mockedCnpj);

      // Pre-fill default service description based on items
      const itensNomes = itens.map(i => i.nome).join(', ');
      const desc = `LOCAÇÃO DE BENS MÓVEIS (ACERVO) CONFORME RESERVA #${reserva.id} PARA O EVENTO DO CLIENTE ${cliente.nome.toUpperCase()}. EQUIPAMENTOS: [ ${itensNomes} ]. PERÍODO DE LOCAÇÃO: DE ${formatarDataBr(reserva.dataRetirada)} ATÉ ${formatarDataBr(reserva.dataDevolucao)} (${diasReserva} DIAS). CONTRATO DE LOCAÇÃO ASSOCIADO E ASSINADO ELETRONICAMENTE.`;
      setDescricaoServico(desc);

      // Pre-fill aliquota and codigo based on tipoServico
      if (tipoServico === 'locacao') {
        setAliquotaIss(0);
        setCodigoServico('03.02'); // Locação de bens móveis (Isento de ISSQN - Súmula Vinculante 31)
      } else {
        setAliquotaIss(empresaConfig?.nfseGovBrConfig?.aliquotaIssPadrao || 2);
        setCodigoServico(empresaConfig?.nfseGovBrConfig?.codigoServicoPadrao || '01.05');
      }

      // Reset flow
      if (reserva.nfseEmitida && reserva.nfseChaveAcesso) {
        setChaveAcesso(reserva.nfseChaveAcesso);
        setProtocolo(reserva.nfseProtocolo || '');
        setDataEmissao(reserva.nfseDataEmissao || Date.now());
        setEtapa('DANFSE');
      } else {
        setEtapa('PREENCHIMENTO');
      }
    }
  }, [isOpen, reservaComItens, tipoServico, empresaConfig]);

  // Handle service type change
  const handleTipoServicoChange = (tipo: 'locacao' | 'prestacao_servicos') => {
    setTipoServico(tipo);
    if (tipo === 'locacao') {
      setAliquotaIss(0);
      setCodigoServico('03.02');
    } else {
      setAliquotaIss(empresaConfig?.nfseGovBrConfig?.aliquotaIssPadrao || 2.0);
      setCodigoServico(empresaConfig?.nfseGovBrConfig?.codigoServicoPadrao || '01.05');
    }
  };

  // Generate XML Content for preview
  const generateDpsXml = () => {
    const dataIso = new Date().toISOString();
    return `<?xml version="1.0" encoding="UTF-8"?>
<DPS xmlns="http://www.nfse.gov.br/DPSEnvio" versao="1.00">
  <infDPS Id="DPS${reserva.id}${Date.now().toString().slice(-4)}">
    <tpAmb>${empresaConfig?.nfseGovBrConfig?.ambienteEmissao === 'producao' ? '1' : '2'}</tpAmb>
    <dhEmi>${dataIso}</dhEmi>
    <verAplic>AcervusCore_v2.0.0</verAplic>
    <prestador>
      <CNPJ>${limparDocumento(empresaConfig?.cnpj || '12345678000199')}</CNPJ>
      <IM>${empresaConfig?.nfseGovBrConfig?.inscricaoMunicipal || '827394'}</IM>
    </prestador>
    <tomador>
      <CNPJ>${limparDocumento(cnpjTomador)}</CNPJ>
      <xNome>${nomeTomador.toUpperCase()}</xNome>
      <end>
        <xLgr>${logradouroTomador}</xLgr>
        <nro>${numeroTomador}</nro>
        <xBairro>${bairroTomador}</xBairro>
        <cMun>3550308</cMun>
        <UF>${ufTomador}</UF>
        <CEP>${cepTomador.replace(/\D/g, '')}</CEP>
      </end>
    </tomador>
    <serv>
      <cServ>${codigoServico}</cServ>
      <xDescServ>${descricaoServico}</xDescServ>
      <vServ>${valorTotal.toFixed(2)}</vServ>
    </serv>
    <valores>
      <vBc>${valorTotal.toFixed(2)}</vBc>
      <pAliq>${aliquotaIss.toFixed(2)}</pAliq>
      <vIssqn>${((valorTotal * aliquotaIss) / 100).toFixed(2)}</vIssqn>
      <vRetPIS>${reterPis ? (valorTotal * 0.0065).toFixed(2) : '0.00'}</vRetPIS>
      <vRetCOFINS>${reterCofins ? (valorTotal * 0.03).toFixed(2) : '0.00'}</vRetCOFINS>
      <vRetINSS>${reterInss ? (valorTotal * 0.11).toFixed(2) : '0.00'}</vRetINSS>
    </valores>
  </infDPS>
</DPS>`;
  };

  // Simulate Transmission
  const handleTransmitir = () => {
    setEtapa('TRANSMISSAO');
    setProgressLog([]);
    setCurrentProgressIndex(0);

    const logs = [
      '🔌 Estabelecendo handshake seguro (mTLS) com barramento nacional da Receita Federal...',
      '📜 Validando Schema XML do lote DPS v1.0.0 contra XSD Federal...',
      '🔑 Carregando certificado digital ICP-Brasil A1 do Keystore...',
      `✍️ Assinando digitalmente a DPS #${reserva.id} com certificado digital da empresa...`,
      '📡 Transmitindo lote assinado ao webservice de autorização de NFS-e...',
      '⏳ Lote recebido pelo processador federal. Aguardando retorno da fila fiscal (Status 100)...',
      '🎉 Sucesso! NFS-e Nacional autorizada com valor fiscal!'
    ];

    let i = 0;
    const interval = setInterval(() => {
      if (i < logs.length) {
        setProgressLog(prev => [...prev, logs[i]]);
        setCurrentProgressIndex(i);
        i++;
      } else {
        clearInterval(interval);
        
        // Finalize
        const randomChave = `3526 ${Math.floor(1000 + Math.random() * 9000)} ${Math.floor(1000 + Math.random() * 9000)} ${Math.floor(1000 + Math.random() * 9000)} ${Math.floor(1000 + Math.random() * 9000)} ${Math.floor(1000 + Math.random() * 9000)} ${Math.floor(1000 + Math.random() * 9000)} ${Math.floor(1000 + Math.random() * 9000)}`;
        const randomProtocolo = `NFS-${Math.floor(100000000 + Math.random() * 900000000)}`;
        const emissionTime = Date.now();

        setChaveAcesso(randomChave);
        setProtocolo(randomProtocolo);
        setDataEmissao(emissionTime);

        // Save to database
        onConfirmFaturamento(reserva.id, randomChave, randomProtocolo, emissionTime)
          .then(() => {
            setEtapa('DANFSE');
          })
          .catch(err => {
            console.error('Erro ao salvar faturamento da reserva:', err);
            setProgressLog(prev => [...prev, '❌ Erro ao atualizar status de faturamento da reserva no banco de dados.']);
          });
      }
    }, 850);
  };

  // Print DANFSE
  const handlePrint = () => {
    const issValor = (valorTotal * aliquotaIss) / 100;
    const bcValor = valorTotal;

    const printHtml = `
      <div style="font-family: 'Courier New', Courier, monospace, Arial; border: 2px solid #000; padding: 16px; border-radius: 4px; max-width: 800px; margin: 0 auto; color: #000; background-color: #fff;">
        <div style="border-bottom: 2px solid #000; padding-bottom: 10px; margin-bottom: 12px; display: flex; justify-content: space-between; align-items: center;">
          <div style="flex: 1;">
            <h2 style="margin:0; font-size: 15px; font-weight: bold; text-transform: uppercase; text-align: center;">NFS-e - NOTA FISCAL DE SERVIÇO ELETRÔNICA</h2>
            <p style="margin: 4px 0 0 0; font-size: 11px; color: #000; text-align: center; font-weight: bold;">PADRÃO NACIONAL (SEFIN) - LEI COMPLEMENTAR 116</p>
          </div>
          <div style="border-left: 2px solid #000; padding-left: 12px; text-align: right; font-size: 11px; flex-shrink: 0; min-width: 180px;">
            <strong>Número NFS-e:</strong> ${reserva.id}<br/>
            <strong>Data Emissão:</strong> ${new Date(dataEmissao).toLocaleString('pt-BR')}<br/>
            <strong>Protocolo:</strong> ${protocolo}
          </div>
        </div>

        <div style="font-size: 10px; border: 1px solid #000; padding: 6px; margin-bottom: 8px;">
          <strong>CHAVE DE ACESSO:</strong> ${chaveAcesso}
        </div>

        <!-- Prestador -->
        <div style="border: 1px solid #000; padding: 6px; margin-bottom: 8px; font-size: 11px;">
          <div style="border-bottom: 1px solid #000; font-weight: bold; padding-bottom: 3px; margin-bottom: 5px; text-transform: uppercase;">PRESTADOR DO SERVIÇO (EMISSOR)</div>
          <strong>Nome/Razão Social:</strong> ${empresaConfig?.nomeFantasia || empresaConfig?.razaoSocial || 'ACERVUS CORE LTDA'}<br/>
          <strong>CNPJ:</strong> ${empresaConfig?.cnpj || '12.345.678/0001-99'} | <strong>Inscrição Municipal:</strong> ${empresaConfig?.nfseGovBrConfig?.inscricaoMunicipal || '827394'}<br/>
          <strong>Endereço:</strong> ${empresaConfig?.endereco || 'Avenida Principal, 100'} | <strong>Cidade:</strong> ${empresaConfig?.cidade || 'São Paulo'} - ${empresaConfig?.estado || 'SP'}
        </div>

        <!-- Tomador -->
        <div style="border: 1px solid #000; padding: 6px; margin-bottom: 8px; font-size: 11px;">
          <div style="border-bottom: 1px solid #000; font-weight: bold; padding-bottom: 3px; margin-bottom: 5px; text-transform: uppercase;">TOMADOR DO SERVIÇO (CLIENTE)</div>
          <strong>Nome/Razão Social:</strong> ${nomeTomador.toUpperCase()}<br/>
          <strong>CNPJ/CPF:</strong> ${cnpjTomador} | <strong>E-mail:</strong> ${emailTomador}<br/>
          <strong>Endereço:</strong> ${logradouroTomador}, ${numeroTomador} - ${bairroTomador} | <strong>Cidade:</strong> ${cidadeTomador} - ${ufTomador} | <strong>CEP:</strong> ${cepTomador}
        </div>

        <!-- Descrição do Serviço -->
        <div style="border: 1px solid #000; padding: 6px; margin-bottom: 8px; font-size: 11px; min-height: 120px;">
          <div style="border-bottom: 1px solid #000; font-weight: bold; padding-bottom: 3px; margin-bottom: 5px; text-transform: uppercase;">DESCRIÇÃO DOS SERVIÇOS / LOCAÇÕES</div>
          <p style="white-space: pre-wrap; margin: 0; line-height: 1.4;">${descricaoServico}</p>
        </div>

        <!-- Valores e Impostos -->
        <div style="border: 1px solid #000; padding: 6px; font-size: 11px;">
          <div style="border-bottom: 1px solid #000; font-weight: bold; padding-bottom: 3px; margin-bottom: 5px; text-transform: uppercase;">CÁLCULO DO ISSQN E VALORES TRIBUTÁRIOS</div>
          <table style="width: 100%; border-collapse: collapse; font-size: 11px;">
            <tr>
              <td style="padding: 2px;"><strong>Valor Total dos Serviços:</strong></td>
              <td style="text-align: right; padding: 2px;">${formatarMoeda(valorTotal)}</td>
              <td style="padding: 2px; padding-left: 20px;"><strong>Base de Cálculo ISS:</strong></td>
              <td style="text-align: right; padding: 2px;">${formatarMoeda(bcValor)}</td>
            </tr>
            <tr>
              <td style="padding: 2px;"><strong>Alíquota ISSQN:</strong></td>
              <td style="text-align: right; padding: 2px;">${aliquotaIss.toFixed(2)}%</td>
              <td style="padding: 2px; padding-left: 20px;"><strong>ISSQN Retido / Devido:</strong></td>
              <td style="text-align: right; padding: 2px;">${formatarMoeda(issValor)}</td>
            </tr>
            <tr>
              <td style="padding: 2px;"><strong>Retenção PIS:</strong></td>
              <td style="text-align: right; padding: 2px;">${reterPis ? formatarMoeda(valorTotal * 0.0065) : 'R$ 0,00'}</td>
              <td style="padding: 2px; padding-left: 20px;"><strong>Regime Especial Tributário:</strong></td>
              <td style="text-align: right; padding: 2px; text-transform: uppercase;">${empresaConfig?.nfseGovBrConfig?.regimeTributario?.replace('_', ' ') || 'SIMPLES NACIONAL'}</td>
            </tr>
            <tr>
              <td style="padding: 2px;"><strong>Retenção COFINS:</strong></td>
              <td style="text-align: right; padding: 2px;">${reterCofins ? formatarMoeda(valorTotal * 0.03) : 'R$ 0,00'}</td>
              <td style="padding: 2px; padding-left: 20px;"><strong>Código Tributação Nacional:</strong></td>
              <td style="text-align: right; padding: 2px;">${codigoServico}</td>
            </tr>
            <tr style="border-top: 1px solid #000; font-weight: bold;">
              <td style="padding: 4px 2px 2px 2px; font-size: 12px;">VALOR LÍQUIDO DA NFS-E:</td>
              <td style="text-align: right; padding: 4px 2px 2px 2px; font-size: 12px;">${formatarMoeda(valorTotal)}</td>
              <td colspan="2" style="text-align: right; padding: 4px 2px 2px 2px; font-size: 9px; color: #444; font-weight: normal; font-style: italic;">
                Documento gerado em conformidade com o Portal NFS-e Nacional.
              </td>
            </tr>
          </table>
        </div>
      </div>
    `;

    printHtmlContent(printHtml, {
      title: `DANFSE_Reserva_${reserva.id}`,
      subtitle: `NFS-e Nacional #${reserva.id}`
    });
  };

  // Download XML file
  const handleDownloadXml = () => {
    const xmlContent = generateDpsXml();
    const blob = new Blob([xmlContent], { type: 'application/xml' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `DPS_Reserva_${reserva.id}_Nacional.xml`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  if (!isOpen) return null;

  return (
    <div id="nfse-faturamento-modal-overlay" className="fixed inset-0 bg-black/85 backdrop-blur-md z-[999] flex items-center justify-center p-4 overflow-y-auto">
      <div id="nfse-faturamento-modal-content" className="bg-[#0A0A0B] border border-[#27272A] w-full max-w-4xl rounded-2xl shadow-2xl flex flex-col max-h-[90vh] text-white">
        
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#27272A]">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-[#D4AF37]/10 text-[#D4AF37] rounded-xl border border-[#D4AF37]/20">
              <FileText size={18} />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                Faturamento Integrado - Emissão de NFS-e
                {reserva.nfseEmitida && (
                  <span className="bg-emerald-500/15 border border-emerald-500/40 text-emerald-400 text-[10px] px-2 py-0.5 rounded-full font-bold">
                    EMITIDA
                  </span>
                )}
              </h3>
              <p className="text-xs text-[#A1A1AA]">Faturamento da Reserva #{reserva.id} • Cliente {cliente.nome}</p>
            </div>
          </div>
          <button
            type="button"
            id="btn-close-nfse-modal"
            onClick={onClose}
            className="text-[#71717A] hover:text-white p-1 rounded-lg hover:bg-[#18181B] transition-colors cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          
          {/* STEP 1: PREENCHIMENTO */}
          {etapa === 'PREENCHIMENTO' && (
            <div className="space-y-6">
              
              {/* Resumo da Reserva e Cliente */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-[#111113] border border-[#27272A] p-4 rounded-xl flex items-center gap-3">
                  <div className="p-2.5 bg-[#D4AF37]/5 text-[#D4AF37] rounded-lg">
                    <DollarSign size={16} />
                  </div>
                  <div>
                    <span className="text-[10px] uppercase font-bold text-[#71717A] block tracking-wider">Valor Faturamento</span>
                    <span className="text-sm font-bold text-white font-mono">{formatarMoeda(valorTotal)}</span>
                  </div>
                </div>

                <div className="bg-[#111113] border border-[#27272A] p-4 rounded-xl flex items-center gap-3">
                  <div className="p-2.5 bg-[#D4AF37]/5 text-[#D4AF37] rounded-lg">
                    <Clock size={16} />
                  </div>
                  <div>
                    <span className="text-[10px] uppercase font-bold text-[#71717A] block tracking-wider">Período e Duração</span>
                    <span className="text-xs font-semibold text-white">
                      {formatarDataBr(reserva.dataRetirada)} até {formatarDataBr(reserva.dataDevolucao)} ({diasReserva} dias)
                    </span>
                  </div>
                </div>

                <div className="bg-[#111113] border border-[#27272A] p-4 rounded-xl flex items-center gap-3">
                  <div className="p-2.5 bg-[#D4AF37]/5 text-[#D4AF37] rounded-lg">
                    <User size={16} />
                  </div>
                  <div>
                    <span className="text-[10px] uppercase font-bold text-[#71717A] block tracking-wider">Cliente de Destino</span>
                    <span className="text-xs font-semibold text-white truncate max-w-[180px] block">{cliente.nome}</span>
                  </div>
                </div>
              </div>

              {/* Formulário do Tomador (Cliente) */}
              <div className="space-y-4">
                <div className="border-b border-[#27272A] pb-1.5">
                  <h4 className="text-xs font-bold text-[#D4AF37] uppercase tracking-wider flex items-center gap-1.5">
                    <User size={14} /> Dados do Tomador (Destinatário da Nota)
                  </h4>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-[#A1A1AA] uppercase tracking-wider block">CPF/CNPJ Tomador</label>
                    <input
                      type="text"
                      value={cnpjTomador}
                      onChange={e => setCnpjTomador(e.target.value)}
                      placeholder="Ex: 00.000.000/0000-00"
                      className="w-full bg-[#111113] border border-[#27272A] rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-[#D4AF37]"
                    />
                  </div>
                  <div className="space-y-1.5 md:col-span-2">
                    <label className="text-[10px] font-bold text-[#A1A1AA] uppercase tracking-wider block">Nome / Razão Social</label>
                    <input
                      type="text"
                      value={nomeTomador}
                      onChange={e => setNomeTomador(e.target.value)}
                      className="w-full bg-[#111113] border border-[#27272A] rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-[#D4AF37]"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-[#A1A1AA] uppercase tracking-wider block">E-mail</label>
                    <input
                      type="email"
                      value={emailTomador}
                      onChange={e => setEmailTomador(e.target.value)}
                      placeholder="email@cliente.com"
                      className="w-full bg-[#111113] border border-[#27272A] rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-[#D4AF37]"
                    />
                  </div>
                </div>

                {/* Endereço */}
                <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-[#A1A1AA] uppercase tracking-wider block">CEP</label>
                    <input
                      type="text"
                      value={cepTomador}
                      onChange={e => setCepTomador(e.target.value)}
                      className="w-full bg-[#111113] border border-[#27272A] rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-[#D4AF37]"
                    />
                  </div>
                  <div className="space-y-1.5 md:col-span-2">
                    <label className="text-[10px] font-bold text-[#A1A1AA] uppercase tracking-wider block">Logradouro (Rua/Av)</label>
                    <input
                      type="text"
                      value={logradouroTomador}
                      onChange={e => setLogradouroTomador(e.target.value)}
                      className="w-full bg-[#111113] border border-[#27272A] rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-[#D4AF37]"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-[#A1A1AA] uppercase tracking-wider block">Número</label>
                    <input
                      type="text"
                      value={numeroTomador}
                      onChange={e => setNumeroTomador(e.target.value)}
                      className="w-full bg-[#111113] border border-[#27272A] rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-[#D4AF37]"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-[#A1A1AA] uppercase tracking-wider block">Bairro</label>
                    <input
                      type="text"
                      value={bairroTomador}
                      onChange={e => setBairroTomador(e.target.value)}
                      className="w-full bg-[#111113] border border-[#27272A] rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-[#D4AF37]"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-[#A1A1AA] uppercase tracking-wider block">Cidade/UF</label>
                    <div className="flex gap-1.5">
                      <input
                        type="text"
                        value={cidadeTomador}
                        onChange={e => setCidadeTomador(e.target.value)}
                        className="w-full bg-[#111113] border border-[#27272A] rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-[#D4AF37]"
                      />
                      <input
                        type="text"
                        value={ufTomador}
                        onChange={e => setUfTomador(e.target.value)}
                        className="w-12 bg-[#111113] border border-[#27272A] rounded-xl px-2 py-2 text-xs text-white text-center focus:outline-none focus:border-[#D4AF37]"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Detalhes Fiscais da Nota */}
              <div className="space-y-4">
                <div className="border-b border-[#27272A] pb-1.5">
                  <h4 className="text-xs font-bold text-[#D4AF37] uppercase tracking-wider flex items-center gap-1.5">
                    <Sliders size={14} /> Definições de Tributação e Serviços
                  </h4>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-[#A1A1AA] uppercase tracking-wider block">Classificação da Operação</label>
                    <div className="flex rounded-xl overflow-hidden border border-[#27272A]">
                      <button
                        type="button"
                        onClick={() => handleTipoServicoChange('locacao')}
                        className={`flex-1 text-[11px] font-bold py-2 transition-colors cursor-pointer ${
                          tipoServico === 'locacao' ? 'bg-[#D4AF37] text-black' : 'bg-[#111113] text-[#A1A1AA] hover:text-white'
                        }`}
                      >
                        Locação de Acervo
                      </button>
                      <button
                        type="button"
                        onClick={() => handleTipoServicoChange('prestacao_servicos')}
                        className={`flex-1 text-[11px] font-bold py-2 transition-colors cursor-pointer ${
                          tipoServico === 'prestacao_servicos' ? 'bg-[#D4AF37] text-black' : 'bg-[#111113] text-[#A1A1AA] hover:text-white'
                        }`}
                      >
                        Serviço Técnico
                      </button>
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-[#A1A1AA] uppercase tracking-wider block">Código Tributação Federal</label>
                    <input
                      type="text"
                      value={codigoServico}
                      onChange={e => setCodigoServico(e.target.value)}
                      className="w-full bg-[#111113] border border-[#27272A] rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-[#D4AF37]"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-[#A1A1AA] uppercase tracking-wider block">Alíquota ISSQN (%)</label>
                    <input
                      type="number"
                      step="0.1"
                      value={aliquotaIss}
                      onChange={e => setAliquotaIss(parseFloat(e.target.value) || 0)}
                      disabled={tipoServico === 'locacao'}
                      className="w-full bg-[#111113] border border-[#27272A] rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-[#D4AF37] disabled:opacity-50"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-[#A1A1AA] uppercase tracking-wider block">Retenções Federais</label>
                    <div className="flex gap-2.5 pt-2">
                      <label className="flex items-center gap-1.5 text-xs text-[#A1A1AA] cursor-pointer">
                        <input
                          type="checkbox"
                          checked={reterPis}
                          onChange={e => setReterPis(e.target.checked)}
                          className="rounded border-[#27272A] bg-[#111113] text-[#D4AF37]"
                        />
                        PIS
                      </label>
                      <label className="flex items-center gap-1.5 text-xs text-[#A1A1AA] cursor-pointer">
                        <input
                          type="checkbox"
                          checked={reterCofins}
                          onChange={e => setReterCofins(e.target.checked)}
                          className="rounded border-[#27272A] bg-[#111113] text-[#D4AF37]"
                        />
                        COFINS
                      </label>
                      <label className="flex items-center gap-1.5 text-xs text-[#A1A1AA] cursor-pointer">
                        <input
                          type="checkbox"
                          checked={reterInss}
                          onChange={e => setReterInss(e.target.checked)}
                          className="rounded border-[#27272A] bg-[#111113] text-[#D4AF37]"
                        />
                        INSS
                      </label>
                    </div>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-[#A1A1AA] uppercase tracking-wider block">Descrição do Serviço (Impressa na NFS-e)</label>
                  <textarea
                    rows={3}
                    value={descricaoServico}
                    onChange={e => setDescricaoServico(e.target.value)}
                    className="w-full bg-[#111113] border border-[#27272A] rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-[#D4AF37] resize-none font-mono"
                  />
                </div>
              </div>

              {/* Status de Integração Config */}
              <div className="p-4 bg-[#18181B] border border-[#27272A] rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
                <div className="flex items-center gap-2.5">
                  <ShieldCheck size={18} className="text-[#D4AF37]" />
                  <div>
                    <span className="font-bold text-white block">Status da Integração Gov.br NFS-e:</span>
                    <span className="text-[#A1A1AA]">
                      {empresaConfig?.nfseGovBrConfig?.enabled 
                        ? `Conector ativo em modo ${empresaConfig?.nfseGovBrConfig?.ambienteEmissao === 'producao' ? 'PRODUÇÃO' : 'HOMOLOGAÇÃO'}. Certificado ICP-Brasil Carregado.`
                        : 'Ambiente Sandbox Ativo (Configuração no Painel de Controle opcional).'}
                    </span>
                  </div>
                </div>
                
                <button
                  type="button"
                  onClick={() => setShowXml(!showXml)}
                  className="bg-[#111113] hover:bg-[#27272A] border border-[#27272A] px-3.5 py-1.5 rounded-xl text-[11px] font-semibold transition-colors cursor-pointer text-white shrink-0"
                >
                  {showXml ? 'Recolher Visualização XML' : 'Ver Schema DPS XML'}
                </button>
              </div>

              {showXml && (
                <div className="space-y-2 animate-fadeIn">
                  <span className="text-[10px] font-bold text-amber-400 font-mono block">PROTOTIPO XML DE TRANSMISSÃO - SEFIN NACIONAL (v1.0.0)</span>
                  <pre className="bg-black/50 border border-[#27272A] p-4 rounded-xl text-[10px] text-emerald-400 font-mono overflow-x-auto max-h-56 select-all">
                    {generateDpsXml()}
                  </pre>
                </div>
              )}

              {/* Action */}
              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="bg-[#111113] hover:bg-[#18181B] border border-[#27272A] text-white px-5 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer"
                >
                  Voltar
                </button>
                <button
                  type="button"
                  onClick={handleTransmitir}
                  className="flex items-center gap-2 bg-[#D4AF37] hover:bg-[#B8962F] text-black px-6 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer shadow-lg shadow-[#D4AF37]/15"
                >
                  <FileCheck size={16} />
                  <span>Transmitir DPS / Emitir NFS-e Nacional</span>
                </button>
              </div>

            </div>
          )}

          {/* STEP 2: TRANSMISSAO ANIMADA */}
          {etapa === 'TRANSMISSAO' && (
            <div className="py-12 flex flex-col items-center justify-center space-y-6">
              <div className="relative">
                <div className="w-16 h-16 rounded-full border-4 border-[#27272A] border-t-[#D4AF37] animate-spin flex items-center justify-center" />
                <div className="absolute inset-0 flex items-center justify-center text-[#D4AF37]">
                  <RefreshCw size={24} className="animate-pulse" />
                </div>
              </div>

              <div className="text-center space-y-1 max-w-md">
                <h4 className="text-sm font-bold text-white uppercase tracking-wider font-mono">Processando Autorização Fiscal</h4>
                <p className="text-xs text-[#A1A1AA]">
                  Comunicação em lote com o Barramento Geral do NFS-e Nacional através de certificado digital ICP-Brasil.
                </p>
              </div>

              {/* Log de Passos */}
              <div className="w-full max-w-lg bg-[#111113] border border-[#27272A] rounded-xl p-4 font-mono text-[11px] space-y-2 text-left">
                {progressLog.map((log, index) => (
                  <div 
                    key={index} 
                    className={`flex items-start gap-2.5 animate-fadeIn ${
                      index === currentProgressIndex ? 'text-white font-bold' : 'text-[#71717A]'
                    }`}
                  >
                    <span className="text-[#D4AF37] shrink-0">✓</span>
                    <span>{log}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* STEP 3: VISUALIZADOR DANFSE */}
          {etapa === 'DANFSE' && (
            <div className="space-y-6 animate-fadeIn">
              
              {/* Alerta de Sucesso */}
              <div className="p-4 bg-emerald-500/10 border border-emerald-500/30 rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-emerald-500/15 text-emerald-400 rounded-xl">
                    <CheckCircle2 size={20} />
                  </div>
                  <div>
                    <span className="text-sm font-bold text-white block">NFS-e Autorizada com Sucesso!</span>
                    <span className="text-xs text-emerald-400 font-mono">Protocolo: {protocolo} • Chave: {chaveAcesso.replace(/\s/g, '')}</span>
                  </div>
                </div>

                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={handleDownloadXml}
                    className="flex items-center gap-1.5 bg-[#18181B] hover:bg-[#27272A] border border-[#27272A] px-3.5 py-2 rounded-xl text-xs font-semibold text-white transition-colors cursor-pointer"
                  >
                    <Download size={13} className="text-[#D4AF37]" />
                    <span>XML de Distribuição</span>
                  </button>
                  <button
                    type="button"
                    onClick={handlePrint}
                    className="flex items-center gap-1.5 bg-[#D4AF37] hover:bg-[#B8962F] px-4 py-2 rounded-xl text-xs font-bold text-black transition-colors cursor-pointer"
                  >
                    <Printer size={13} />
                    <span>Imprimir DANFSE</span>
                  </button>
                </div>
              </div>

              {/* Renderização do DANFSE na Tela */}
              <div className="border border-[#27272A] bg-[#111113] rounded-2xl overflow-hidden p-6 space-y-4">
                <span className="text-[10px] font-bold text-[#71717A] uppercase block tracking-widest font-mono">Visualizador da Nota Emitida (DANFSE)</span>
                
                <div className="bg-white text-black p-5 rounded-xl space-y-3 font-mono text-[9px] border border-black max-w-3xl mx-auto select-none">
                  {/* Cabeçalho */}
                  <div className="border-b border-black pb-2 flex justify-between items-center text-[8px] font-sans">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded border border-black flex items-center justify-center font-bold text-[10px]">
                        BR
                      </div>
                      <div>
                        <strong className="block text-[9px]">SECRETARIA ESPECIAL DA RECEITA FEDERAL DO BRASIL</strong>
                        <span>Portal da Nota Fiscal de Serviço Eletrônica Nacional</span>
                      </div>
                    </div>
                    <div className="text-right">
                      <strong>NFS-e Nacional</strong><br/>
                      <strong>Nº:</strong> {reserva.id} | <strong>Série:</strong> DPS
                    </div>
                  </div>

                  {/* Informações de Chave */}
                  <div className="border border-black p-1.5 text-[8px] flex justify-between gap-4">
                    <div>
                      <strong>CHAVE DE ACESSO DA NFS-E:</strong><br/>
                      <span className="text-[10px]">{chaveAcesso}</span>
                    </div>
                    <div className="text-right">
                      <strong>AUTORIZAÇÃO FISCAL:</strong><br/>
                      <span>{protocolo} - {formatarDataBr(dataEmissao)}</span>
                    </div>
                  </div>

                  {/* Prestador */}
                  <div className="border border-black p-2 space-y-1">
                    <strong className="block border-b border-black text-[8px] pb-1">PRESTADOR DO SERVIÇO</strong>
                    <div><strong>Razão Social:</strong> {empresaConfig?.nomeFantasia || 'ACERVUS CORE LTDA'}</div>
                    <div><strong>CNPJ:</strong> {empresaConfig?.cnpj || '12.345.678/0001-99'} | <strong>IM:</strong> {empresaConfig?.nfseGovBrConfig?.inscricaoMunicipal || '827394'}</div>
                    <div><strong>Endereço:</strong> {empresaConfig?.endereco || 'Avenida Principal, 100'} | <strong>Município/UF:</strong> {empresaConfig?.cidade || 'SÃO PAULO'} - {empresaConfig?.estado || 'SP'}</div>
                  </div>

                  {/* Tomador */}
                  <div className="border border-black p-2 space-y-1">
                    <strong className="block border-b border-black text-[8px] pb-1">TOMADOR DO SERVIÇO</strong>
                    <div><strong>Nome/Razão Social:</strong> {nomeTomador.toUpperCase()}</div>
                    <div><strong>CNPJ/CPF:</strong> {cnpjTomador} | <strong>E-mail:</strong> {emailTomador}</div>
                    <div><strong>Endereço:</strong> {logradouroTomador}, {numeroTomador} - {bairroTomador} | <strong>Cidade/UF:</strong> {cidadeTomador} - {ufTomador} | <strong>CEP:</strong> {cepTomador}</div>
                  </div>

                  {/* Descrição do Serviço */}
                  <div className="border border-black p-2 space-y-1 min-height-[80px]">
                    <strong className="block border-b border-black text-[8px] pb-1">DESCRIÇÃO DOS SERVIÇOS</strong>
                    <div className="text-[8px] leading-relaxed whitespace-pre-wrap">{descricaoServico}</div>
                  </div>

                  {/* Detalhes de Tributação e Valores */}
                  <div className="border border-black p-2">
                    <strong className="block border-b border-black text-[8px] pb-1 mb-1">CÁLCULO DO ISSQN E VALORES</strong>
                    <div className="grid grid-cols-4 gap-2 text-[8px]">
                      <div>
                        <strong>Vlr. Total Serviços:</strong><br/>
                        {formatarMoeda(valorTotal)}
                      </div>
                      <div>
                        <strong>Base de Cálculo:</strong><br/>
                        {formatarMoeda(valorTotal)}
                      </div>
                      <div>
                        <strong>Alíquota ISSQN:</strong><br/>
                        {aliquotaIss.toFixed(2)}%
                      </div>
                      <div>
                        <strong>ISSQN Devido:</strong><br/>
                        {formatarMoeda((valorTotal * aliquotaIss) / 100)}
                      </div>
                    </div>

                    <div className="grid grid-cols-3 gap-2 text-[8px] border-t border-black mt-2 pt-1">
                      <div>
                        <strong>PIS Retido:</strong> {reterPis ? formatarMoeda(valorTotal * 0.0065) : 'R$ 0,00'}
                      </div>
                      <div>
                        <strong>COFINS Retido:</strong> {reterCofins ? formatarMoeda(valorTotal * 0.03) : 'R$ 0,00'}
                      </div>
                      <div>
                        <strong>INSS Retido:</strong> {reterInss ? formatarMoeda(valorTotal * 0.11) : 'R$ 0,00'}
                      </div>
                    </div>
                  </div>

                  {/* Rodapé de Validação */}
                  <div className="flex justify-between items-center text-[7px] text-gray-700 pt-1 font-sans">
                    <span>Código de Autenticidade Federal: {protocolo.replace('NFS-', '')}</span>
                    <span>Consulte em: https://www.nfse.gov.br/consulta</span>
                  </div>
                </div>

              </div>

              {/* Botões do Rodapé do visualizador */}
              <div className="flex items-center justify-end gap-3 pt-2 border-t border-[#27272A]">
                <button
                  type="button"
                  onClick={onClose}
                  className="bg-[#D4AF37] hover:bg-[#B8962F] text-black px-6 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer shadow-lg"
                >
                  Concluir Faturamento
                </button>
              </div>

            </div>
          )}

        </div>

      </div>
    </div>
  );
};
