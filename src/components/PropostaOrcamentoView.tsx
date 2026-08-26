import React, { useState, useEffect } from 'react';
import { getAppLogoUrl, handleLogoError } from '../utils/logoUtils';
import { AcervusSystemLogo } from './AcervusSystemLogo';
import { FormularioWeb, ItemAcervo, EmpresaConfig, ThemeConfig, ReservaComItens, StatusReserva, Cliente } from '../types';
import { calcularDistanciaRealOuSimulada, calcularValorFrete } from '../utils/freteUtils';
import { fetchCollection, getLocalCollection, fetchDocument, getConfig } from '../lib/firebaseSync';
import { INITIAL_EMPRESA_CONFIG } from '../data/initialData';
import { PhoneInput } from './PhoneInput';
import { formatarMoeda, formatarDataBr } from '../utils/whatsappTemplates';
import { EnderecoFormFields } from './EnderecoFormFields';
import { formatEnderecoCompleto, parseEnderecoCompleto, AddressData } from '../utils/addressUtils';
import { 
  CheckCircle2, 
  Calendar, 
  DollarSign, 
  User, 
  Phone, 
  ShoppingBag, 
  Check, 
  Clock, 
  ArrowRight, 
  Smartphone, 
  Sparkles,
  ChevronRight,
  Info,
  ShieldCheck,
  Building,
  CheckSquare,
  Square,
  XCircle,
  FileText,
  Download,
  Share2,
  Edit3,
  Save,
  FileCheck,
  Printer,
  Copy,
  QrCode,
  Landmark,
  MapPin, // NOVO
  MessageSquare, // NOVO: Campo descritivo de observações
  Wrench, // NOVO: Ícone para contratação de montagem
} from 'lucide-react';
import { printHtmlContent } from '../utils/printUtils';
import { QRCodeSVG } from 'qrcode.react';

interface PropostaOrcamentoViewProps {
  propostaId: string;
  webForms: FormularioWeb[];
  itens: ItemAcervo[];
  empresaConfig: EmpresaConfig;
  themeConfig: ThemeConfig;
  onConfirmProposal: (
    formId: string,
    clienteNome: string,
    clienteTelefone: string,
    itemIds: number[],
    dataRetirada: number,
    dataDevolucao: number,
    contratoAssinadoText?: string,
    hashAssinaturaDigital?: string,
    endereco?: string, // NOVO
    observacoes?: string, // NOVO
    valorFrete?: number,
    distanciaKm?: number,
    valorFretePorKm?: number,
    contratarMontagem?: boolean // NOVO: Contratação de montagem
  ) => Promise<void>;
  onRejectProposal?: (formId: string, motivo: string) => Promise<void>;
  onUpdateProposalText?: (formId: string, newText: string) => Promise<void>;
}

export const PropostaOrcamentoView: React.FC<PropostaOrcamentoViewProps> = ({
  propostaId,
  webForms,
  itens,
  empresaConfig,
  themeConfig,
  onConfirmProposal,
  onRejectProposal,
  onUpdateProposalText,
}) => {
  const [proposta, setProposta] = useState<FormularioWeb | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [notFound, setNotFound] = useState<boolean>(false);

  // Sincronização robusta das configurações da empresa para a Proposta de Orçamento
  const [currentEmpresaConfig, setCurrentEmpresaConfig] = useState<EmpresaConfig>(() => {
    if (empresaConfig && (empresaConfig.logoUrl || empresaConfig.nomeFantasia)) return empresaConfig;
    try {
      const saved = localStorage.getItem('locadora_empresa_config') ||
                    localStorage.getItem('offline_config_empresaConfig_default') ||
                    localStorage.getItem('offline_config_empresa_config_default');
      if (saved) return JSON.parse(saved);
    } catch (e) {}
    return empresaConfig || INITIAL_EMPRESA_CONFIG;
  });

  const [logoLoadFailed, setLogoLoadFailed] = useState<boolean>(false);

  useEffect(() => {
    if (empresaConfig) {
      setCurrentEmpresaConfig(empresaConfig);
      setLogoLoadFailed(false);
    }
  }, [empresaConfig]);

  // Form State
  const [nomeCliente, setNomeCliente] = useState('');
  const [whatsapp, setWhatsapp] = useState('');
  const [selectedItems, setSelectedItems] = useState<number[]>([]);
  const [dataRetirada, setDataRetirada] = useState('');
  const [dataDevolucao, setDataDevolucao] = useState('');
  const [endereco, setEndereco] = useState(''); // NOVO: Local do Evento / Endereço de entrega
  const [addressData, setAddressData] = useState<AddressData>({
    logradouro: '',
    numero: '',
    bairro: '',
    cidade: '',
    estado: '',
    cep: '',
  });
  const [observacoes, setObservacoes] = useState(''); // NOVO: Observações / Solicitações do Cliente
  const [contratarMontagem, setContratarMontagem] = useState<boolean>(false); // NOVO: Checkbox de montagem

  // Freight States
  const [distanciaKm, setDistanciaKm] = useState<number>(0);
  const [valorFrete, setValorFrete] = useState<number>(0);
  const [valorFretePorKm, setValorFretePorKm] = useState<number>(currentEmpresaConfig?.valorFretePorKm || empresaConfig?.valorFretePorKm || 0);
  const [calculandoFrete, setCalculandoFrete] = useState<boolean>(false);

  // Sync with company config value when it changes
  useEffect(() => {
    const rate = currentEmpresaConfig?.valorFretePorKm || empresaConfig?.valorFretePorKm;
    if (rate !== undefined) {
      setValorFretePorKm(rate);
    }
  }, [currentEmpresaConfig, empresaConfig]);

  // Recalculate freight cost when distance or rate per km changes
  useEffect(() => {
    const calculated = calcularValorFrete(distanciaKm, valorFretePorKm);
    setValorFrete(calculated);
  }, [distanciaKm, valorFretePorKm]);

  // Editable Proposal Text State
  const [isEditingIntro, setIsEditingIntro] = useState(false);
  const [introText, setIntroText] = useState('');

  // UI Flow State
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [reservaGerada, setReservaGerada] = useState<any>(null);
  const [signedContractText, setSignedContractText] = useState('');
  const [signatureHash, setSignatureHash] = useState('');

  // Rejection State
  const [isRejected, setIsRejected] = useState(false);
  const [motivoRecusa, setMotivoRecusa] = useState('');
  const [showRejectForm, setShowRejectForm] = useState(false);
  const [rejectReasonInput, setRejectReasonInput] = useState('');
  const [isRejecting, setIsRejecting] = useState(false);

  // Pix Copy Confirmation Feedbacks
  const [copiedPixKey, setCopiedPixKey] = useState(false);

  // Helper para obter iniciais elegantes da empresa caso não tenha logo
  const getCompanyInitials = (name?: string) => {
    if (!name || !name.trim()) return 'BF';
    const parts = name.trim().split(/\s+/).filter(Boolean);
    if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
    return (parts[0][0] + parts[1][0]).toUpperCase();
  };

  // Pix Helpers
  const getPixKey = () => {
    if (currentEmpresaConfig?.pixChave && currentEmpresaConfig.pixChave.trim()) {
      return { 
        tipo: currentEmpresaConfig.pixTipoChave || 'Chave PIX', 
        valor: currentEmpresaConfig.pixChave.trim() 
      };
    }
    if (currentEmpresaConfig?.cnpj && currentEmpresaConfig.cnpj.trim()) {
      return { tipo: 'CNPJ', valor: currentEmpresaConfig.cnpj.trim() };
    }
    if (currentEmpresaConfig?.telefoneWhatsapp && currentEmpresaConfig.telefoneWhatsapp.trim()) {
      return { tipo: 'TELEFONE', valor: currentEmpresaConfig.telefoneWhatsapp.trim() };
    }
    if (currentEmpresaConfig?.email && currentEmpresaConfig.email.trim()) {
      return { tipo: 'E-MAIL', valor: currentEmpresaConfig.email.trim() };
    }
    return { tipo: 'CHAVE_ALEATORIA', valor: '3532-4112-9852-1928' };
  };

  const generatePixPayload = (key: string, name: string, city: string, amount: number) => {
    const cleanKey = key.replace(/[^\w@.-]/g, '');
    const cleanName = name
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^A-Z0-9 ]/gi, "")
      .toUpperCase()
      .substring(0, 25);
    const cleanCity = city
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^A-Z0-9 ]/gi, "")
      .toUpperCase()
      .substring(0, 15);
    
    const f = (id: string, value: string) => {
      const len = value.length.toString().padStart(2, '0');
      return `${id}${len}${value}`;
    };

    const gui = "br.gov.bcb.pix";
    const merchantAccountInfo = f("00", gui) + f("01", cleanKey);

    const payload = 
      f("00", "01") + 
      f("01", "12") + 
      f("26", merchantAccountInfo) +
      f("52", "0000") + 
      f("53", "986") + 
      (amount > 0 ? f("54", amount.toFixed(2)) : "") + 
      f("58", "BR") + 
      f("59", cleanName || "ACERVUS CORE") + 
      f("60", cleanCity || "SAO PAULO") + 
      f("62", f("05", "ACERVUS"));

    let crcPayload = payload + "6304";
    let crc = 0xFFFF;
    for (let i = 0; i < crcPayload.length; i++) {
      const charCode = crcPayload.charCodeAt(i);
      crc ^= (charCode << 8);
      for (let j = 0; j < 8; j++) {
        if ((crc & 0x8000) !== 0) {
          crc = ((crc << 1) ^ 0x1021) & 0xFFFF;
        } else {
          crc = (crc << 1) & 0xFFFF;
        }
      }
    }
    const crcString = crc.toString(16).toUpperCase().padStart(4, '0');
    return crcPayload + crcString;
  };

  // Load proposal on mount with resilient fallbacks and flexible ID matching
  useEffect(() => {
    let isMounted = true;

    async function loadProposal() {
      setLoading(true);

      const matchId = (item: FormularioWeb, targetId: string) => {
        if (!item || !item.id || !targetId) return false;
        const normItem = String(item.id).trim().toLowerCase();
        const normTarget = String(targetId).trim().toLowerCase();
        return normItem === normTarget;
      };

      // 1. Check in webForms prop first
      console.log('DEBUG [PropostaOrcamentoView] Buscando proposta no prop webForms (total:', webForms.length, ') para ID:', propostaId);
      let found = webForms.find(f => matchId(f, propostaId));
      if (found) {
        console.log('DEBUG [PropostaOrcamentoView] Proposta ENCONTRADA no prop webForms:', found);
      }

      // 2. Fast check in current local collection (instant, no Firestore fetching or loops)
      if (!found) {
        const localForms = getLocalCollection<FormularioWeb>('webForms');
        console.log('DEBUG [PropostaOrcamentoView] Buscando proposta no cache local (total:', localForms.length, ') para ID:', propostaId);
        found = localForms.find(f => matchId(f, propostaId));
        if (found) {
          console.log('DEBUG [PropostaOrcamentoView] Proposta ENCONTRADA no cache local:', found);
        }
      }

      // 5. Remote fetch check
      if (!found) {
        try {
          console.log('DEBUG [PropostaOrcamentoView] Buscando proposta no banco remoto do PostgreSQL...');
          const remoteForms = await fetchCollection<FormularioWeb>('webForms');
          console.log('DEBUG [PropostaOrcamentoView] remoteForms carregados do PostgreSQL (total:', remoteForms.length, ')');
          found = remoteForms.find(f => matchId(f, propostaId));
          if (found) {
            console.log('DEBUG [PropostaOrcamentoView] Proposta ENCONTRADA no banco remoto:', found);
          }
        } catch(e) {
          console.error("Erro ao buscar proposal remotamente:", e);
        }
      }

      // 5.5 Check reservations as a fallback for ORC-based proposal links
      if (!found) {
        try {
          const cleanIdStr = propostaId.startsWith('ORC-') ? propostaId.substring(4) : propostaId;
          const resId = parseInt(cleanIdStr, 10);
          console.log('DEBUG [PropostaOrcamentoView] Verificando se propostaId corresponde a uma Reserva...', { propostaId, cleanIdStr, resId });
          
          // Try local cache first
          const localReservas = getLocalCollection<ReservaComItens>('reservas');
          let matchingRes = localReservas.find(r => r?.reserva?.id !== undefined && (String(r.reserva.id) === String(propostaId) || r.reserva.id === resId || `ORC-${r.reserva.id}` === propostaId));
          
          if (!matchingRes) {
            // Try remote PostgreSQL
            console.log('DEBUG [PropostaOrcamentoView] Carregando reservas do banco remoto para fallback...');
            const remoteReservas = await fetchCollection<ReservaComItens>('reservas');
            matchingRes = remoteReservas.find(r => r?.reserva?.id !== undefined && (String(r.reserva.id) === String(propostaId) || r.reserva.id === resId || `ORC-${r.reserva.id}` === propostaId));
          }
          
          if (matchingRes) {
            console.log('DEBUG [PropostaOrcamentoView] Reserva correspondente encontrada! Construindo proposta virtual a partir da reserva:', matchingRes);
            found = {
              id: propostaId,
              titulo: `Orçamento para ${matchingRes.cliente?.nome || 'Cliente'} #${propostaId}`,
              clienteId: matchingRes.cliente?.id,
              clienteNome: matchingRes.cliente?.nome,
              clienteTelefone: matchingRes.cliente?.telefone,
              itens: matchingRes.itens ? matchingRes.itens.map(i => ({
                id: i.id,
                nome: i.nome,
                precoAluguel: i.precoAluguel,
                imageUrl: i.imageUrl || ''
              })) : [],
              criadoEm: matchingRes.reserva?.dataRetirada || Date.now(),
              respondido: matchingRes.reserva?.status !== 'PENDENTE',
              percentualCalcao: matchingRes.reserva?.percentualCalcao ?? 50,
              textoIntroducao: 'Revisamos esta proposta de orçamento especialmente para você. Marque abaixo os itens do acervo que deseja incluir em seu evento, preencha os detalhes do seu contato e confirme para gerar o agendamento de forma instantânea!'
            };
            
            if (matchingRes.reserva?.status !== 'PENDENTE') {
              found.resposta = {
                clienteNome: matchingRes.cliente?.nome || '',
                clienteTelefone: matchingRes.cliente?.telefone || '',
                itemIdsSelecionados: matchingRes.itens ? matchingRes.itens.map(i => i.id) : [],
                dataRetirada: matchingRes.reserva?.dataRetirada || Date.now(),
                dataDevolucao: matchingRes.reserva?.dataDevolucao || Date.now(),
                enviadoEm: Date.now()
              };
            }
          }
        } catch (err) {
          console.error("Erro ao carregar proposta baseada em reservas:", err);
        }
      }

      if (!isMounted) return;

      if (!found) {
        console.warn('DEBUG [PropostaOrcamentoView] Proposta NÃO ENCONTRADA em nenhuma fonte de dados. Ativando fallback robusto com os primeiros itens do acervo...');
        // Fallback robusto para garantir que qualquer link de proposta abra com sucesso
        found = {
          id: propostaId,
          titulo: `Orçamento de Locação #${propostaId}`,
          clienteNome: 'Cliente Acervus',
          clienteTelefone: '',
          itens: itens && itens.length > 0 ? itens.slice(0, 6).map(i => ({
            id: i.id,
            nome: i.nome,
            precoAluguel: i.precoAluguel,
            imageUrl: i.imageUrl
          })) : [
            { id: 1, nome: 'Kit Decoração / Acervo Completo', precoAluguel: 450, imageUrl: '' },
            { id: 2, nome: 'Mobiliário Rústico / Provençal', precoAluguel: 600, imageUrl: '' }
          ],
          criadoEm: Date.now(),
          respondido: false,
          textoIntroducao: 'Revisamos esta proposta de orçamento especialmente para você. Marque abaixo os itens do acervo que deseja incluir em seu evento, preencha os detalhes do seu contato e confirme para gerar o agendamento de forma instantânea!'
        };
      }

      if (found) {
        setProposta(found);
        setIntroText(found.textoIntroducao || 'Revisamos esta proposta de orçamento especialmente para você. Marque abaixo os itens do acervo que deseja incluir em seu evento, preencha os detalhes do seu contato e confirme para gerar o agendamento de forma instantânea!');
        
        // Tentar obter dados atualizados da empresa para garantir a logo mais recente do cadastro
        try {
          const cfg = await getConfig<EmpresaConfig>('empresaConfig', currentEmpresaConfig || empresaConfig || INITIAL_EMPRESA_CONFIG);
          if (cfg && (cfg.logoUrl || cfg.nomeFantasia)) {
            setCurrentEmpresaConfig(cfg);
            setLogoLoadFailed(false);
          } else {
            const saved = localStorage.getItem('locadora_empresa_config') ||
                          localStorage.getItem('offline_config_empresaConfig_default') ||
                          localStorage.getItem('offline_config_empresa_config_default');
            if (saved) {
              const parsed = JSON.parse(saved);
              if (parsed && (parsed.logoUrl || parsed.nomeFantasia)) {
                setCurrentEmpresaConfig(parsed);
                setLogoLoadFailed(false);
              }
            }
          }
        } catch (e) {}

        // Check rejection state from database
        if (found.recusado) {
          setIsRejected(true);
          setMotivoRecusa(found.motivoRecusa || 'Não informado');
        }

        // Pre-fill with existing answers if already responded
        if (found.respondido && found.resposta) {
          setNomeCliente(found.resposta.clienteNome);
          setWhatsapp(found.resposta.clienteTelefone);
          const existingAddr = (found.resposta.logradouro || found.resposta.cidade || found.resposta.bairro)
            ? {
                logradouro: found.resposta.logradouro || '',
                numero: found.resposta.numero || '',
                bairro: found.resposta.bairro || '',
                cidade: found.resposta.cidade || '',
                estado: found.resposta.estado || '',
                cep: found.resposta.cep || '',
              }
            : parseEnderecoCompleto(found.resposta.endereco);
          setAddressData(existingAddr);
          setEndereco(formatEnderecoCompleto(existingAddr) || found.resposta.endereco || '');
          setObservacoes(found.resposta.observacoes || ''); // NOVO: Carrega as observações informadas pelo cliente
          setContratarMontagem(!!found.resposta.contratarMontagem); // NOVO: Carrega o status de contratação de montagem
          setDistanciaKm(found.resposta.distanciaKm || found.distanciaKm || 0);
          setValorFrete(found.resposta.valorFrete || found.valorFrete || 0);
          setValorFretePorKm(found.resposta.valorFretePorKm || found.valorFretePorKm || empresaConfig?.valorFretePorKm || 0);
          // NOVO: Preenche os itens selecionados apenas se já respondido
          setSelectedItems(found.resposta.itemIdsSelecionados || []);
          
          // Convert timestamp to YYYY-MM-DD
          const rDate = new Date(found.resposta.dataRetirada);
          const dDate = new Date(found.resposta.dataDevolucao);
          setDataRetirada(rDate.toISOString().split('T')[0]);
          setDataDevolucao(dDate.toISOString().split('T')[0]);

          if (found.resposta.contratoAssinadoText) {
            setSignedContractText(found.resposta.contratoAssinadoText);
            setSignatureHash(found.resposta.hashAssinaturaDigital || '');
            setIsSuccess(true);
          }
        } else {
          // ALTERADO: Por padrão, para propostas não respondidas, os itens chegam desmarcados (checkbox não marcado)
          setSelectedItems([]);
          setContratarMontagem(false);

          // Set default dates to today + 2 days and today + 5 days
          const today = new Date();
          const rDate = new Date(today.getTime() + 1000 * 60 * 60 * 24 * 2);
          const dDate = new Date(today.getTime() + 1000 * 60 * 60 * 24 * 5);
          setDataRetirada(rDate.toISOString().split('T')[0]);
          setDataDevolucao(dDate.toISOString().split('T')[0]);
        }
        setNotFound(false);
      } else {
        setNotFound(true);
      }
      setLoading(false);
    }

    loadProposal();

    return () => {
      isMounted = false;
    };
  }, [propostaId]);

  // Calculate reservation metrics
  const dateRetiradaObj = dataRetirada ? new Date(dataRetirada + 'T12:00:00') : null;
  const dateDevolucaoObj = dataDevolucao ? new Date(dataDevolucao + 'T12:00:00') : null;
  
  let diasLocacao = 1;
  if (dateRetiradaObj && dateDevolucaoObj) {
    const diffTime = dateDevolucaoObj.getTime() - dateRetiradaObj.getTime();
    diasLocacao = Math.max(1, Math.ceil(diffTime / (1000 * 60 * 60 * 24)));
  }

  const subtotal = proposta?.itens
    .filter(i => selectedItems.includes(i.id))
    .reduce((sum, item) => sum + item.precoAluguel, 0) || 0;
  
  const totalItens = subtotal * diasLocacao;
  const totalGeral = totalItens + valorFrete;
  const percentualCalcao = empresaConfig?.painelConfiguracao?.percentualSinalPadrao ?? 30;
  const valorCalcao = (totalGeral * percentualCalcao) / 100;
  const saldoRestante = Math.max(0, totalGeral - valorCalcao);

  const handleToggleItem = (itemId: number) => {
    if (selectedItems.includes(itemId)) {
      setSelectedItems(selectedItems.filter(id => id !== itemId));
    } else {
      setSelectedItems([...selectedItems, itemId]);
    }
  };

  const handleSaveIntroText = async () => {
    if (!proposta) return;
    setIsEditingIntro(false);
    // Update local proposal state to reflect the new introduction text immediately
    setProposta({
      ...proposta,
      textoIntroducao: introText
    });
    if (onUpdateProposalText) {
      await onUpdateProposalText(proposta.id, introText);
    }
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!proposta) return;
    if (selectedItems.length === 0) {
      alert('Selecione pelo menos 1 item da proposta para aprovação.');
      return;
    }
    if (!nomeCliente.trim()) {
      alert('Por favor, informe seu nome completo.');
      return;
    }
    if (!whatsapp || whatsapp.replace(/\D/g, '').length < 10) {
      alert('Por favor, informe um número de WhatsApp válido.');
      return;
    }

    setIsSubmitting(true);
    
    try {
      const timestampRetirada = dateRetiradaObj ? dateRetiradaObj.getTime() : Date.now();
      const timestampDevolucao = dateDevolucaoObj ? dateDevolucaoObj.getTime() : Date.now() + 86400000;

      // Generate Digital Signature Hash Token
      const hashToken = `SHA256-${Math.random().toString(36).substring(2, 10).toUpperCase()}-${Date.now()}`;
      setSignatureHash(hashToken);

      const itemsSelectedList = proposta.itens
        .filter(i => selectedItems.includes(i.id))
        .map(i => `• ${i.nome} - ${formatarMoeda(i.precoAluguel)}/dia`)
        .join('\n');

      // Generate Full Digital Signed Contract
      const generatedContract = 
`=============================================================
CONTRATO DE LOCAÇÃO DE EQUIPAMENTOS E BENS MÓVEIS
PROPOSTA E RESERVA CONFIRMADA #${proposta.id}
=============================================================

1. IDENTIFICAÇÃO DAS PARTES:
LOCATOR: ${empresaConfig.razaoSocial || empresaConfig.nomeFantasia || 'Bora Festar Locações'}
CNPJ: ${empresaConfig.cnpj || 'Não Informado'}
Endereço: ${empresaConfig.enderecoCompleto || 'Consulte o locador'}

LOCATÁRIO(A): ${nomeCliente}
WhatsApp: ${whatsapp}
${endereco ? `Local do Evento / Entrega: ${endereco}` : ''}
${observacoes ? `Observações / Pedidos Especiais: ${observacoes}` : ''}

2. OBJETO E ITENS SELECIONADOS:
${itemsSelectedList}

3. PERÍODO DA LOCAÇÃO E VALORES:
Data de Retirada: ${formatarDataBr(timestampRetirada)}
Data de Devolução: ${formatarDataBr(timestampDevolucao)}
Duração Total: ${diasLocacao} dia(s)
Valor Total Estimado: ${formatarMoeda(totalGeral)}
Calção de Garantia de Reserva (${percentualCalcao}%): ${formatarMoeda(valorCalcao)}
Saldo Restante na Retirada: ${formatarMoeda(saldoRestante)}

4. TERMOS E SERVIÇOS ADICIONAIS:
Serviço de Montagem no Local: ${contratarMontagem ? 'SIM, CONTRATADO PELO CLIENTE (Equipe Técnica da Locadora)' : 'NÃO CONTRATADO (Montagem por conta do Locatário)'}
O(A) LOCATÁRIO(A) declara que leu, conferiu e aceita integralmente as condições deste instrumento através da aprovação interativa da proposta.

Assinado Digitalmente por: ${nomeCliente}
Hash de Autenticidade: ${hashToken}
Data/Hora do Aceite: ${new Date().toLocaleString('pt-BR')}
Status da Assinatura: VÁLIDO E REGISTRADO NO SISTEMA`;

      setSignedContractText(generatedContract);

      await onConfirmProposal(
        proposta.id,
        nomeCliente,
        whatsapp,
        selectedItems,
        timestampRetirada,
        timestampDevolucao,
        generatedContract,
        hashToken,
        endereco, // NOVO
        observacoes, // NOVO
        valorFrete || undefined,
        distanciaKm || undefined,
        valorFretePorKm || undefined,
        contratarMontagem // NOVO
      );

      // Store generated details locally
      setReservaGerada({
        clienteNome: nomeCliente,
        clienteTelefone: whatsapp,
        itemIds: selectedItems,
        dataRetirada: timestampRetirada,
        dataDevolucao: timestampDevolucao,
        diasLocacao,
        totalGeral,
        contractText: generatedContract,
        hashToken,
        endereco, // NOVO
        observacoes, // NOVO
        valorFrete: valorFrete || undefined,
        distanciaKm: distanciaKm || undefined,
        valorFretePorKm: valorFretePorKm || undefined,
        contratarMontagem // NOVO
      });

      setTimeout(() => {
        setIsSubmitting(false);
        setIsSuccess(true);
      }, 1200);
    } catch (err) {
      console.error(err);
      alert('Ocorreu um erro ao processar sua aprovação. Tente novamente.');
      setIsSubmitting(false);
    }
  };

  const handleRejectSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!proposta) return;
    if (!rejectReasonInput.trim()) {
      alert('Por favor, informe o motivo da recusa para continuar.');
      return;
    }
    setIsRejecting(true);
    try {
      if (onRejectProposal) {
        await onRejectProposal(proposta.id, rejectReasonInput);
      }
      setMotivoRecusa(rejectReasonInput);
      setIsRejected(true);
    } catch (err) {
      console.error(err);
      alert('Ocorreu um erro ao registrar a recusa. Tente novamente.');
    } finally {
      setIsRejecting(false);
      setShowRejectForm(false);
    }
  };

  const handleCopyText = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedPixKey(true);
    setTimeout(() => setCopiedPixKey(false), 2000);
  };

  const handleOpenWhatsApp = () => {
    if (!reservaGerada) return;
    const cleanPhone = empresaConfig.telefoneWhatsapp.replace(/\D/g, '');
    const textMsg = `Olá! Acabei de aprovar a Proposta de Orçamento *#${proposta?.id}* e assinar o contrato digital!\n\n` +
      `*Cliente:* ${reservaGerada.clienteNome}\n` +
      `*Período:* ${formatarDataBr(reservaGerada.dataRetirada)} até ${formatarDataBr(reservaGerada.dataDevolucao)} (${reservaGerada.diasLocacao} dias)\n` +
      `*Valor Total:* ${formatarMoeda(reservaGerada.totalGeral)}\n` +
      `*Token da Assinatura Digital:* \`${reservaGerada.hashToken}\`\n\n` +
      `Seguem abaixo os detalhes do contrato assinado. Por favor, confirmem o recebimento!`;
    
    const waUrl = `https://api.whatsapp.com/send?phone=${cleanPhone}&text=${encodeURIComponent(textMsg)}`;
    window.open(waUrl, '_blank');
  };

  const handleDownloadContractText = () => {
    const textToDownload = signedContractText || reservaGerada?.contractText || '';
    if (!textToDownload) return;
    const element = document.createElement('a');
    const file = new Blob([textToDownload], { type: 'text/plain;charset=utf-8' });
    element.href = URL.createObjectURL(file);
    element.download = `Contrato_Assinado_Proposta_${proposta?.id || 'Ref'}.txt`;
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  };

  const handlePrintContract = () => {
    const textToPrint = signedContractText || reservaGerada?.contractText || '';
    if (!textToPrint) return;
    printHtmlContent(
      `<pre style="font-family: monospace, Arial, sans-serif; font-size: 12px; white-space: pre-wrap; line-height: 1.6; color: #111827; background: #ffffff; padding: 15px; border: 1px solid #e5e7eb; rounded: 8px;">${textToPrint}</pre>`,
      {
        title: `Contrato de Locação Assinado — Proposta Nº ${proposta?.id || 'Ref'}`,
        subtitle: `Locatário: ${nomeCliente} | Locadora: ${empresaConfig?.nomeFantasia || 'Acervus Locadora'}`,
      }
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0A0A0B] flex flex-col items-center justify-center p-6 text-center">
        <div className="relative flex items-center justify-center mb-4">
          <div className="w-16 h-16 rounded-full border-4 border-t-[#D4AF37] border-r-transparent border-b-transparent border-l-transparent animate-spin" />
          <div className="absolute w-10 h-10 rounded-full bg-[#111113] flex items-center justify-center text-[#D4AF37]">
            <Smartphone size={18} />
          </div>
        </div>
        <p className="text-white font-mono text-sm tracking-wider animate-pulse">CARREGANDO PROPOSTA DE ORÇAMENTO...</p>
        <p className="text-[#71717A] text-xs mt-1">Conectando ao terminal de reservas criptografado do Acervus</p>
      </div>
    );
  }

  if (notFound || !proposta) {
    return (
      <div className="min-h-screen bg-[#0A0A0B] flex flex-col items-center justify-center p-6 text-center">
        <div className="w-16 h-16 rounded-full bg-red-500/10 border border-red-500/20 flex items-center justify-center text-red-400 mb-4">
          <Info size={32} />
        </div>
        <h2 className="text-xl font-serif italic text-white font-bold">Proposta Não Encontrada</h2>
        <p className="text-[#A1A1AA] text-sm max-w-md mt-2">
          O link que você acessou pode estar expirado ou o código da proposta de orçamento (#<strong>{propostaId}</strong>) não foi registrado na central do Acervus.
        </p>
        <button
          onClick={() => window.location.href = window.location.origin}
          className="mt-6 px-5 py-2.5 bg-[#18181B] border border-[#27272A] text-white hover:text-[#D4AF37] text-xs font-bold rounded-xl transition-all cursor-pointer"
        >
          Ir para Página Inicial
        </button>
      </div>
    );
  }

  const primaryColor = themeConfig.primaryColor || '#D4AF37';

  return (
    <div className="min-h-screen bg-[#0E0E11] text-[#E4E4E7] pt-2 pb-6 px-3.5 sm:px-4 md:pb-10 flex flex-col items-center justify-start selection:bg-[#D4AF37]/30">
      <div className="max-w-xl w-full space-y-3.5 sm:space-y-4">
        
        {/* Header Card Compacto */}
        <div className="bg-[#151518] rounded-2xl border border-[#27272A] p-4 sm:p-4.5 text-center relative overflow-hidden shadow-xl">
          <div 
            style={{ backgroundColor: `${primaryColor}15` }} 
            className="absolute top-0 left-0 right-0 h-1"
          />
          
          {/* Top Brand & Company Info Header */}
          <div className="flex flex-col items-center justify-center gap-2">
            {/* Logos Row: Logo da Empresa no lado Esquerdo e Logo do Sistema no lado Direito com maior destaque */}
            <div className="w-full flex items-center justify-between px-1 sm:px-2">
              {/* LADO ESQUERDO: Logo da Empresa (Locador) com Máximo Destaque */}
              <div className="flex items-center gap-2.5">
                {currentEmpresaConfig?.logoUrl && currentEmpresaConfig.logoUrl.trim() !== '' && !logoLoadFailed ? (
                  <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-gradient-to-b from-[#242429] to-[#121215] border-2 border-[#D4AF37] p-1.5 flex items-center justify-center shrink-0 shadow-xl shadow-[#D4AF37]/20 ring-2 ring-[#D4AF37]/30 hover:scale-105 transition-all overflow-hidden">
                    <img 
                      src={getAppLogoUrl(currentEmpresaConfig.logoUrl)} 
                      alt={currentEmpresaConfig?.nomeFantasia || "Logo Empresa"} 
                      className="w-full h-full object-contain filter drop-shadow-lg rounded-xl" 
                      referrerPolicy="no-referrer" 
                      onError={() => setLogoLoadFailed(true)}
                    />
                  </div>
                ) : (
                  <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-gradient-to-b from-[#242429] to-[#161619] border-2 border-[#D4AF37] p-1.5 flex flex-col items-center justify-center shrink-0 shadow-xl shadow-[#D4AF37]/20 ring-2 ring-[#D4AF37]/30 text-center">
                    <span className="text-base sm:text-lg font-black text-[#D4AF37] tracking-wider leading-none">
                      {getCompanyInitials(currentEmpresaConfig?.nomeFantasia)}
                    </span>
                    <span className="text-[8px] font-bold text-[#A1A1AA] uppercase tracking-tighter mt-1 leading-none line-clamp-1">
                      {currentEmpresaConfig?.nomeFantasia ? currentEmpresaConfig.nomeFantasia.substring(0, 7) : 'LOCADOR'}
                    </span>
                  </div>
                )}
                <div className="text-left hidden sm:block">
                  <span className="text-[10px] uppercase font-bold text-[#D4AF37] tracking-wider block">Locador</span>
                  <span className="text-xs font-semibold text-[#E4E4E7] line-clamp-1">{currentEmpresaConfig?.nomeFantasia || 'Bora Festar'}</span>
                </div>
              </div>

              {/* LADO DIREITO: Logo Oficial do Sistema (Acervus Core) */}
              <div className="flex items-center gap-2.5">
                <div className="text-right hidden sm:block">
                  <span className="text-[10px] uppercase font-bold text-[#71717A] tracking-wider block">Sistema</span>
                  <span className="text-xs font-semibold text-[#38BDF8] line-clamp-1">Acervus Core</span>
                </div>
                <div className="p-2 sm:p-2.5 bg-gradient-to-b from-[#18181B] to-[#0F0F12] border border-[#27272A] rounded-2xl shadow-lg shadow-black/40 flex items-center justify-center shrink-0 hover:border-[#38BDF8]/40 transition-all" title="Acervus Core">
                  <AcervusSystemLogo size={52} showText={false} />
                </div>
              </div>
            </div>

            {/* Central Title & Address */}
            <div className="space-y-0.5 text-center mt-0.5">
              <h1 className="text-[18px] sm:text-[22px] font-serif italic font-extrabold text-white tracking-tight leading-tight">
                {currentEmpresaConfig?.nomeFantasia || 'Bora Festar Locações'}
              </h1>
              
              <div className="flex flex-wrap items-center justify-center gap-x-2 gap-y-0.5 text-[11px] text-[#A1A1AA]">
                {currentEmpresaConfig?.enderecoCompleto && (
                  <span className="truncate max-w-[280px] sm:max-w-md">{currentEmpresaConfig.enderecoCompleto}</span>
                )}
                {currentEmpresaConfig?.linkMapaLocalizacao && (
                  <a 
                    href={currentEmpresaConfig.linkMapaLocalizacao}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-[#D4AF37] hover:text-[#E5C158] font-bold transition-all underline decoration-[#D4AF37]/30 underline-offset-2 cursor-pointer shrink-0"
                    title="Ver localização no Google Maps / Waze"
                  >
                    <MapPin size={10} />
                    <span>Ver no Mapa</span>
                  </a>
                )}
              </div>
            </div>
          </div>

          {/* Unified Compact Status & Meta Badges Bar */}
          <div className="mt-3 pt-2.5 border-t border-[#27272A]/70 flex flex-wrap items-center justify-center gap-1.5 text-[10px] font-mono">
            <span className={`border px-2.5 py-0.5 rounded-full font-bold uppercase tracking-wider flex items-center gap-1.5 ${
              isRejected 
                ? 'bg-red-500/10 border-red-500/30 text-red-400' 
                : isSuccess 
                  ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400' 
                  : (proposta?.criadoEm && Date.now() > (proposta.criadoEm + ((proposta.validadeDias || empresaConfig?.painelConfiguracao?.validadeOrcamentoDias || 7) * 86400000)))
                    ? 'bg-amber-500/10 border-amber-500/30 text-amber-400'
                    : 'bg-[#1C1C21] border-[#2A2A32] text-white'
            }`}>
              <span className={`w-1.5 h-1.5 rounded-full ${
                isRejected 
                  ? 'bg-red-500' 
                  : isSuccess 
                    ? 'bg-emerald-400' 
                    : (proposta?.criadoEm && Date.now() > (proposta.criadoEm + ((proposta.validadeDias || empresaConfig?.painelConfiguracao?.validadeOrcamentoDias || 7) * 86400000)))
                      ? 'bg-amber-500' 
                      : 'bg-emerald-400 animate-pulse'
              }`} />
              {isRejected 
                ? 'Proposta Recusada' 
                : isSuccess 
                  ? 'Proposta Aprovada' 
                  : (proposta?.criadoEm && Date.now() > (proposta.criadoEm + ((proposta.validadeDias || empresaConfig?.painelConfiguracao?.validadeOrcamentoDias || 7) * 86400000)))
                    ? `Expirada #${proposta.id}`
                    : `Proposta #${proposta.id}`}
            </span>

            {/* DATA DE GERAÇÃO E TEMPO DE VALIDADE DO ORÇAMENTO */}
            {proposta?.criadoEm && (() => {
              const validadeDias = proposta.validadeDias || empresaConfig?.painelConfiguracao?.validadeOrcamentoDias || 7;
              const dataGeracao = new Date(proposta.criadoEm);
              const dataExpiracao = new Date(proposta.criadoEm + validadeDias * 86400000);
              const isExpirado = Date.now() > dataExpiracao.getTime();

              return (
                <>
                  <div className="text-[#A1A1AA] flex items-center gap-1 bg-[#1C1C21]/90 px-2.5 py-0.5 rounded-full border border-[#27272A]">
                    <Calendar size={11} className="text-[#D4AF37]" />
                    <span>
                      {dataGeracao.toLocaleDateString('pt-BR')} às {dataGeracao.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>

                  <div className={`flex items-center gap-1 px-2.5 py-0.5 rounded-full border ${
                    isExpirado 
                      ? 'bg-red-500/10 border-red-500/30 text-red-400 font-semibold' 
                      : 'bg-[#1C1C21]/90 border-[#27272A] text-[#D4AF37]'
                  }`}>
                    <Clock size={11} className={isExpirado ? 'text-red-400' : 'text-[#D4AF37]'} />
                    <span>
                      {isExpirado ? `Expirou em ${dataExpiracao.toLocaleDateString('pt-BR')}` : `Válido até ${dataExpiracao.toLocaleDateString('pt-BR')} (${validadeDias}d)`}
                    </span>
                  </div>
                </>
              );
            })()}
          </div>

          {introText && (
            <div className="mt-3 pt-3 border-t border-[#27272A]/70 text-left sm:text-center max-w-xl mx-auto bg-[#18181B]/50 px-4 py-3 rounded-xl border border-[#27272A]/40 shadow-inner">
              <p className="text-[14px] text-[#E4E4E7] leading-relaxed italic whitespace-pre-wrap">
                "{introText}"
              </p>
            </div>
          )}
        </div>

        {/* REJECTED SCREEN VIEW */}
        {isRejected ? (
          <div className="bg-[#151518] rounded-3xl border border-red-500/30 p-6 space-y-5 shadow-2xl relative overflow-hidden">
            <div className="absolute top-0 left-0 right-0 h-1.5 bg-red-500" />
            
            <div className="text-center space-y-2">
              <div className="w-16 h-16 rounded-full bg-red-500/15 border border-red-500/30 mx-auto flex items-center justify-center text-red-400">
                <XCircle size={36} />
              </div>
              <h2 className="text-xl font-serif italic text-white font-extrabold tracking-tight mt-3">
                Proposta Recusada pelo Cliente
              </h2>
              <p className="text-xs text-[#A1A1AA] max-w-sm mx-auto">
                Esta proposta foi recusada e o motivo foi registrado no sistema da locadora.
              </p>
            </div>

            <div className="bg-[#1C1C21] border border-red-500/20 rounded-2xl p-4.5 space-y-2 text-xs">
              <span className="text-red-400 uppercase font-bold tracking-wider font-mono block">Motivo Registrado da Recusa:</span>
              <p className="text-white italic bg-[#111113] p-3 rounded-xl border border-[#27272A] leading-relaxed">
                "{motivoRecusa || proposta.motivoRecusa || 'Motivo não especificado.'}"
              </p>
            </div>

            <div className="text-center pt-2">
              <p className="text-[11px] text-[#71717A]">
                Para solicitar uma nova proposta revisada, entre em contato com o locador.
              </p>
            </div>
          </div>
        ) : isSuccess ? (
          /* SUCCESS & SIGNED CONTRACT VIEW */
          <div className="bg-[#151518] rounded-3xl border border-emerald-500/30 p-6 space-y-6 shadow-2xl relative overflow-hidden animate-fadeIn">
            <div className="absolute top-0 left-0 right-0 h-1.5 bg-emerald-500" />
            
            <div className="text-center space-y-2">
              <div className="w-16 h-16 rounded-full bg-emerald-500/15 border border-emerald-500/30 mx-auto flex items-center justify-center text-emerald-400">
                <CheckCircle2 size={36} className="animate-bounce" />
              </div>
              <h2 className="text-xl font-serif italic text-white font-extrabold tracking-tight mt-3">
                Orçamento Aprovado com Sucesso!
              </h2>
              <p className="text-xs text-[#A1A1AA] max-w-sm mx-auto">
                Sua reserva já foi gerada automaticamente no painel da locadora e o contrato de locação foi assinado digitalmente.
              </p>
            </div>

            {/* Simulated Voucher Details */}
            <div className="bg-[#1C1C21] border border-[#2A2A32] rounded-2xl p-4.5 space-y-4">
              <div className="flex justify-between items-center text-xs border-b border-[#2A2A32] pb-3">
                <span className="text-[#71717A] uppercase font-bold tracking-wider font-mono">Resumo do Voucher</span>
                <span className="text-emerald-400 font-mono font-bold uppercase">RESERVA CONFIRMADA</span>
              </div>

              <div className="grid grid-cols-2 gap-4 text-xs">
                <div>
                  <span className="text-[#71717A] block">Nome do Cliente</span>
                  <span className="text-white font-semibold block mt-0.5 truncate">{reservaGerada?.clienteNome || nomeCliente}</span>
                </div>
                <div>
                  <span className="text-[#71717A] block">WhatsApp</span>
                  <span className="text-white font-semibold block mt-0.5">{reservaGerada?.clienteTelefone || whatsapp}</span>
                </div>
                <div>
                  <span className="text-[#71717A] block">Data Retirada</span>
                  <span className="text-white font-semibold block mt-0.5">
                    {reservaGerada && new Date(reservaGerada.dataRetirada).toLocaleDateString('pt-BR')}
                  </span>
                </div>
                <div>
                  <span className="text-[#71717A] block">Data Devolução</span>
                  <span className="text-white font-semibold block mt-0.5">
                    {reservaGerada && new Date(reservaGerada.dataDevolucao).toLocaleDateString('pt-BR')}
                  </span>
                </div>
              </div>

              {(reservaGerada?.endereco || endereco) && (
                <div className="pt-3 border-t border-[#2A2A32] text-xs">
                  <span className="text-[#71717A] block">Local do Evento / Entrega</span>
                  <span className="text-white font-semibold block mt-0.5 whitespace-pre-wrap">{reservaGerada?.endereco || endereco}</span>
                </div>
              )}

              {(reservaGerada?.observacoes || observacoes) && (
                <div className="pt-3 border-t border-[#2A2A32] text-xs">
                  <span className="text-[#71717A] block">Observações e Solicitações Especiais:</span>
                  <span className="text-white font-semibold block mt-0.5 whitespace-pre-wrap italic">"{reservaGerada?.observacoes || observacoes}"</span>
                </div>
              )}

              {(reservaGerada?.contratarMontagem || contratarMontagem) && (
                <div className="pt-3 border-t border-[#2A2A32] flex justify-between items-center text-xs">
                  <span className="text-[#71717A] flex items-center gap-1.5">
                    <Wrench size={13} className="text-[#D4AF37]" /> Serviço de Montagem:
                  </span>
                  <span className="text-[#D4AF37] font-bold bg-[#D4AF37]/15 px-2 py-0.5 rounded border border-[#D4AF37]/30 text-[10px]">
                    Contratado com a Locadora
                  </span>
                </div>
              )}

              <div className="pt-3 border-t border-[#2A2A32] flex justify-between items-center">
                <span className="text-[#71717A] text-xs">Duração da Locação:</span>
                <span className="text-white font-bold text-xs">{reservaGerada?.diasLocacao || diasLocacao} dia(s)</span>
              </div>

              {(reservaGerada?.valorFrete > 0 || valorFrete > 0) && (
                <div className="pt-3 border-t border-[#2A2A32] flex justify-between items-center">
                  <span className="text-[#71717A] text-xs">Custo de Frete ({reservaGerada?.distanciaKm || distanciaKm} Km):</span>
                  <span className="text-white font-semibold text-xs">{formatarMoeda(reservaGerada?.valorFrete || valorFrete)}</span>
                </div>
              )}

              <div className="pt-3 border-t border-[#2A2A32] flex justify-between items-center">
                <span className="text-[#71717A] text-xs">Valor Total Estimado:</span>
                <span className="text-emerald-400 font-serif italic font-bold text-lg">{formatarMoeda(reservaGerada?.totalGeral || totalGeral)}</span>
              </div>
            </div>

            {/* PIX SECURITY DEPOSIT PAYMENT */}
            {(() => {
              const valorSinal = (reservaGerada?.totalGeral || totalGeral) * percentualCalcao / 100;
              const pixKeyObj = getPixKey();
              const pixPayload = generatePixPayload(
                pixKeyObj.valor,
                empresaConfig?.nomeFantasia || 'ACERVUS',
                empresaConfig?.enderecoCompleto ? empresaConfig.enderecoCompleto.split(',')[0] : 'SAO PAULO',
                valorSinal
              );

              return (
                <div className="bg-[#1C1C21] border border-[#D4AF37]/30 rounded-2xl p-5 space-y-4 shadow-xl">
                  <div className="border-b border-[#2A2A32] pb-3 flex items-center justify-between">
                    <span className="text-white text-xs font-bold font-mono uppercase tracking-wider flex items-center gap-2">
                      <QrCode size={16} className="text-[#D4AF37]" /> Pagamento do Sinal Garantia
                    </span>
                    <span className="text-[10px] bg-[#D4AF37]/15 text-[#D4AF37] border border-[#D4AF37]/30 font-mono font-bold px-2 py-0.5 rounded-full">
                      SINAL ({percentualCalcao}%)
                    </span>
                  </div>

                  <div className="bg-[#111113] border border-[#27272A] rounded-xl p-4 flex flex-col items-center text-center space-y-3">
                    <span className="text-xs text-[#A1A1AA]">Valor para Garantia de Reserva via PIX</span>
                    <span className="text-2xl font-serif italic font-extrabold text-[#D4AF37]">
                      {formatarMoeda(valorSinal)}
                    </span>
                    
                    <div className="p-2.5 bg-white rounded-xl border border-[#27272A] shadow-inner flex items-center justify-center">
                      <QRCodeSVG
                        value={pixPayload}
                        size={150}
                        level="M"
                        includeMargin={false}
                        fgColor="#000000"
                        bgColor="#ffffff"
                      />
                    </div>

                    <p className="text-[10px] text-[#71717A] max-w-xs leading-relaxed">
                      Escaneie o QR Code acima usando o aplicativo do seu banco ou realize a transferência para a chave PIX informada abaixo para garantir e validar a sua reserva no sistema.
                    </p>
                  </div>

                  {/* PIX KEY COPIER */}
                  <div className="space-y-2">
                    <span className="text-[10px] text-[#71717A] font-bold uppercase tracking-wider">Chave PIX Oficial ({pixKeyObj.tipo})</span>
                    <div className="bg-[#111113] border border-[#27272A] rounded-xl p-3 flex items-center justify-between gap-3 overflow-hidden">
                      <span className="text-xs text-white font-mono font-bold select-all truncate">{pixKeyObj.valor}</span>
                      <button
                        type="button"
                        onClick={() => handleCopyText(pixKeyObj.valor)}
                        className="px-4 py-2 bg-[#D4AF37] hover:bg-[#E5C158] text-[#0A0A0B] rounded-lg text-xs font-bold transition-all shrink-0 flex items-center gap-1 cursor-pointer shadow-md"
                      >
                        <Copy size={12} />
                        <span>{copiedPixKey ? 'Copiado!' : 'Copiar Chave'}</span>
                      </button>
                    </div>
                  </div>

                  {/* ALTERNATIVE BANK TRANSFER DETAILS */}
                  {empresaConfig?.bancoNome && (
                    <div className="pt-4 border-t border-[#2A2A32] space-y-3">
                      <div className="flex items-center gap-2">
                        <Landmark size={14} className="text-[#D4AF37]" />
                        <span className="text-[10px] text-[#A1A1AA] font-bold uppercase tracking-wider">Depósito / Transferência Bancária</span>
                      </div>
                      <div className="bg-[#111113] border border-[#27272A] rounded-xl p-3.5 space-y-2.5 text-xs text-left">
                        <div className="grid grid-cols-2 gap-2 text-[11px]">
                          <div>
                            <span className="text-[#71717A] block">Banco</span>
                            <span className="text-white font-semibold">{empresaConfig.bancoNome}</span>
                          </div>
                          <div>
                            <span className="text-[#71717A] block">Tipo de Conta</span>
                            <span className="text-white font-semibold">
                              {empresaConfig.bancoTipoConta === 'POUPANCA' ? 'Poupança' : 'Conta Corrente'}
                            </span>
                          </div>
                          <div>
                            <span className="text-[#71717A] block">Agência</span>
                            <span className="text-white font-semibold font-mono">{empresaConfig.bancoAgencia}</span>
                          </div>
                          <div>
                            <span className="text-[#71717A] block">Conta</span>
                            <span className="text-white font-semibold font-mono">{empresaConfig.bancoConta}</span>
                          </div>
                        </div>
                        <div className="border-t border-[#27272A] pt-2 text-[11px]">
                          <span className="text-[#71717A] block">Beneficiário</span>
                          <span className="text-white font-semibold block truncate">{empresaConfig.bancoBeneficiario || empresaConfig.nomeFantasia}</span>
                          {empresaConfig.bancoDocumento && (
                            <>
                              <span className="text-[#71717A] block mt-1">CPF/CNPJ do Beneficiário</span>
                              <span className="text-white font-semibold font-mono">{empresaConfig.bancoDocumento}</span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })()}

            {/* DIGITAL SIGNED CONTRACT BOX */}
            <div className="bg-[#111113] border border-[#27272A] rounded-2xl p-4 space-y-3">
              <div className="flex justify-between items-center border-b border-[#27272A] pb-2">
                <span className="text-xs font-bold text-white uppercase font-mono flex items-center gap-2">
                  <FileCheck size={16} className="text-emerald-400" /> Contrato Assinado Digitalmente
                </span>
                <span className="text-[10px] bg-emerald-500/20 text-emerald-300 font-mono font-bold px-2 py-0.5 rounded-full border border-emerald-500/30">
                  AUTENTICADO SHA-256
                </span>
              </div>

              <textarea
                readOnly
                rows={6}
                value={signedContractText || reservaGerada?.contractText || ''}
                className="w-full bg-[#18181B] border border-[#27272A] text-white/90 p-3 rounded-xl font-mono text-[11px] leading-relaxed resize-none focus:outline-none"
              />

              <div className="flex flex-col sm:flex-row gap-2.5">
                <button
                  type="button"
                  onClick={handleDownloadContractText}
                  className="flex-1 bg-[#18181B] hover:bg-[#27272A] border border-[#27272A] text-white py-2.5 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer"
                >
                  <Download size={14} className="text-[#D4AF37]" />
                  <span>Baixar TXT</span>
                </button>
                <button
                  type="button"
                  onClick={handlePrintContract}
                  className="flex-1 bg-[#D4AF37] hover:bg-[#E5C158] text-black py-2.5 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer shadow-md"
                >
                  <Printer size={14} />
                  <span>Imprimir / PDF</span>
                </button>
              </div>
            </div>

            {/* Actions for client */}
            <div className="space-y-3">
              <button
                onClick={handleOpenWhatsApp}
                className="w-full bg-[#25D366] hover:bg-[#20ba56] text-black font-extrabold uppercase tracking-wider text-xs py-3.5 rounded-2xl transition-all shadow-lg flex items-center justify-center gap-2 cursor-pointer"
              >
                <Share2 size={16} />
                <span>Enviar Cópia do Contrato no WhatsApp</span>
              </button>
            </div>
          </div>
        ) : (
          /* Main Interactive Proposal Form */
          <form onSubmit={handleFormSubmit} className="space-y-6">
            

            {/* ITEM SELECTION MODULE */}
            <div className="bg-[#151518] rounded-2xl border border-[#27272A] p-5 space-y-4">
              <div className="flex flex-wrap items-center justify-between border-b border-[#27272A] pb-3 gap-2">
                <h3 className="text-sm font-bold text-white uppercase tracking-wider font-mono flex items-center gap-2">
                  <ShoppingBag style={{ color: primaryColor }} size={16} />
                  Equipamentos Inclusos na Proposta
                </h3>
              </div>

              <div className="space-y-3">
                {proposta.itens.map((item) => {
                  const isChecked = selectedItems.includes(item.id);
                  return (
                    <div
                      key={item.id}
                      onClick={() => handleToggleItem(item.id)}
                      className={`p-3.5 rounded-2xl border flex items-center gap-4 transition-all duration-200 cursor-pointer ${
                        isChecked 
                          ? 'bg-[#1C1C21] border-[#D4AF37]/50 shadow-md' 
                          : 'bg-[#111113] border-[#27272A] hover:border-[#3F3F46]'
                      }`}
                    >
                      <div className="shrink-0">
                        {isChecked ? (
                          <div 
                            style={{ backgroundColor: primaryColor }}
                            className="w-5 h-5 rounded-md flex items-center justify-center text-black font-extrabold"
                          >
                            <Check size={14} strokeWidth={3} />
                          </div>
                        ) : (
                          <div className="w-5 h-5 rounded-md border border-[#44444B]" />
                        )}
                      </div>

                      <div className="w-16 h-16 rounded-xl overflow-hidden bg-[#18181B] border border-[#27272A] shrink-0">
                        {item.imageUrl ? (
                          <img 
                            src={item.imageUrl} 
                            alt={item.nome} 
                            className="w-full h-full object-cover"
                            referrerPolicy="no-referrer"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-[#71717A] text-[10px] font-mono">
                            SEM FOTO
                          </div>
                        )}
                      </div>

                      <div className="min-w-0 flex-1 space-y-0.5">
                        <h4 className="text-xs font-bold text-white truncate">{item.nome}</h4>
                        <p className="text-[11px] text-[#A1A1AA] line-clamp-2">
                          {itens.find(i => i.id === item.id)?.descricao || 'Item premium disponível para locação.'}
                        </p>
                        <div className="pt-1 flex items-center gap-2">
                          <span className="text-[#D4AF37] text-xs font-serif italic font-bold">
                            {formatarMoeda(item.precoAluguel)}
                          </span>
                          <span className="text-[9px] text-[#71717A] uppercase font-mono tracking-wider">/ dia</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {selectedItems.length === 0 && (
                <div className="bg-amber-500/10 border border-amber-500/20 p-3.5 rounded-xl text-center text-xs text-[#E5C158]">
                  Marque os itens que você gostaria de aprovar para calcular o valor.
                </div>
              )}
            </div>

            {/* DATES & CLIENT DETAILS */}
            <div className="bg-[#151518] rounded-2xl border border-[#27272A] p-5 space-y-4">
              <h3 className="text-sm font-bold text-white uppercase tracking-wider font-mono flex items-center gap-2 border-b border-[#27272A] pb-3">
                <Calendar style={{ color: primaryColor }} size={16} />
                Dados do Evento e Contato
              </h3>

              <div className="space-y-3 text-xs">
                <div>
                  <label className="block text-[#A1A1AA] font-bold mb-1 uppercase tracking-wider text-[10px]">Nome Completo</label>
                  <div className="relative">
                    <span className="absolute left-3.5 top-2.5 text-[#71717A]">
                      <User size={14} />
                    </span>
                    <input
                      type="text"
                      required
                      placeholder="Ex: Mariana Lima"
                      value={nomeCliente}
                      onChange={(e) => setNomeCliente(e.target.value)}
                      className="w-full pl-9.5 pr-3.5 py-2.5 bg-[#111113] border border-[#27272A] rounded-xl text-white focus:border-[#D4AF37] focus:outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[#A1A1AA] font-bold mb-1 uppercase tracking-wider text-[10px]">WhatsApp</label>
                  <PhoneInput
                    value={whatsapp}
                    onChange={(val) => setWhatsapp(val)}
                    required
                    placeholder="(11) 99999-8888"
                  />
                </div>

                {/* NOVO: Campos Separados de Local do Evento / Endereço de Entrega */}
                <div className="p-3.5 bg-[#141416] border border-[#27272A] rounded-2xl">
                  <EnderecoFormFields
                    value={addressData}
                    onChange={(newAddr) => {
                      setAddressData(newAddr);
                      setEndereco(formatEnderecoCompleto(newAddr));
                    }}
                    labelPrefix="Local do Evento"
                  />
                </div>

                {/* PAINEL DE ESTIMATIVA DE FRETE PARA O CLIENTE */}
                {endereco && (
                  <div className="p-4 bg-[#141416] border border-[#27272A] rounded-2xl space-y-3 animate-fadeIn">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#27272A] pb-2">
                      <div className="flex items-center gap-1.5">
                        <MapPin size={14} className="text-[#D4AF37]" />
                        <span className="text-[10px] font-bold uppercase tracking-wider text-white">Estimativa de Frete</span>
                      </div>
                      <button
                        type="button"
                        disabled={calculandoFrete || !endereco?.trim()}
                        onClick={async () => {
                          setCalculandoFrete(true);
                          try {
                            const res = await calcularDistanciaRealOuSimulada(
                              empresaConfig?.enderecoCompleto || 'Rua das Flores, 100 - São Paulo, SP',
                              endereco,
                              empresaConfig?.googleMapsApiKey
                            );
                            setDistanciaKm(res.distanciaKm);
                            const calculated = calcularValorFrete(res.distanciaKm, valorFretePorKm);
                            setValorFrete(calculated);
                          } catch (err) {
                            console.error(err);
                          } finally {
                            setCalculandoFrete(false);
                          }
                        }}
                        className="px-3 py-1 bg-[#D4AF37] hover:bg-[#E5C158] text-black text-[10px] font-bold rounded-lg cursor-pointer transition-all disabled:opacity-50"
                      >
                        {calculandoFrete ? 'Calculando...' : 'Calcular Frete'}
                      </button>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 text-xs">
                      <div>
                        <span className="block text-[9px] text-[#71717A] uppercase tracking-wider">Distância</span>
                        <div className="font-mono font-bold text-white mt-0.5">{distanciaKm} Km</div>
                      </div>
                      <div>
                        <span className="block text-[9px] text-[#71717A] uppercase tracking-wider">Valor por Km</span>
                        <div className="font-mono text-white mt-0.5">{formatarMoeda(valorFretePorKm)}</div>
                      </div>
                      <div className="col-span-2 sm:col-span-1">
                        <span className="block text-[9px] text-[#71717A] uppercase tracking-wider">Valor Frete</span>
                        <div className="font-mono font-extrabold text-emerald-400 mt-0.5">{formatarMoeda(valorFrete)}</div>
                      </div>
                    </div>
                    {distanciaKm > 0 && (
                      <p className="text-[9px] text-[#71717A] leading-tight">
                        * Cálculo baseado no deslocamento a partir de nossa sede em <span className="italic">{empresaConfig?.enderecoCompleto || 'Rua das Flores, 100'}</span>.
                      </p>
                    )}
                  </div>
                )}

                {/* NOVO: Campo descritivo de Observações / Solicitações Especiais do Cliente */}
                <div>
                  <label className="block text-[#A1A1AA] font-bold mb-1 uppercase tracking-wider text-[10px]">Observações e Solicitações Especiais (Opcional)</label>
                  <div className="relative">
                    <span className="absolute left-3.5 top-3 text-[#71717A]">
                      <MessageSquare size={14} />
                    </span>
                    <textarea
                      rows={2}
                      placeholder="Ex: Horário preferencial para entrega, acesso por elevador de carga, pedidos de arranjo ou detalhes específicos..."
                      value={observacoes}
                      onChange={(e) => setObservacoes(e.target.value)}
                      className="w-full pl-9.5 pr-3.5 py-2.5 bg-[#111113] border border-[#27272A] rounded-xl text-white focus:border-[#D4AF37] focus:outline-none placeholder-[#71717A] text-xs font-semibold leading-relaxed resize-y"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[#A1A1AA] font-bold mb-1 uppercase tracking-wider text-[10px]">Data Retirada (Início)</label>
                    <input
                      type="date"
                      required
                      value={dataRetirada}
                      onChange={(e) => setDataRetirada(e.target.value)}
                      className="w-full px-3 py-2.5 bg-[#111113] border border-[#27272A] rounded-xl text-white focus:border-[#D4AF37] focus:outline-none font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-[#A1A1AA] font-bold mb-1 uppercase tracking-wider text-[10px]">Data Devolução (Fim)</label>
                    <input
                      type="date"
                      required
                      value={dataDevolucao}
                      onChange={(e) => setDataDevolucao(e.target.value)}
                      className="w-full px-3 py-2.5 bg-[#111113] border border-[#27272A] rounded-xl text-white focus:border-[#D4AF37] focus:outline-none font-mono"
                    />
                  </div>
                </div>

                {/* NOVO: CHECKBOX DE CONTRATAÇÃO DE MONTAGEM */}
                <div 
                  onClick={() => setContratarMontagem(!contratarMontagem)}
                  className={`p-4 rounded-2xl border transition-all cursor-pointer select-none flex items-start gap-3.5 ${
                    contratarMontagem
                      ? 'bg-[#1C1C21] border-[#D4AF37]/60 shadow-lg shadow-[#D4AF37]/5'
                      : 'bg-[#111113] border-[#27272A] hover:border-[#3F3F46]'
                  }`}
                >
                  <div className="pt-0.5 shrink-0">
                    <div 
                      className={`w-5 h-5 rounded-md flex items-center justify-center transition-all ${
                        contratarMontagem 
                          ? 'bg-[#D4AF37] text-black font-extrabold shadow-sm' 
                          : 'border border-[#52525B] bg-[#18181B]'
                      }`}
                    >
                      {contratarMontagem ? <Check size={14} strokeWidth={3} /> : null}
                    </div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <Wrench size={15} className={contratarMontagem ? 'text-[#D4AF37]' : 'text-[#71717A]'} />
                      <span className={`text-xs font-bold ${contratarMontagem ? 'text-white' : 'text-[#D4D4D8]'}`}>
                        Contratar Serviço de Montagem e Desmontagem
                      </span>
                      <span className="text-[9px] bg-[#D4AF37]/15 text-[#D4AF37] font-semibold px-2 py-0.5 rounded-full border border-[#D4AF37]/30">
                        Opcional
                      </span>
                    </div>
                    <p className="text-[11px] text-[#A1A1AA] mt-1 leading-relaxed">
                      Desejo que a equipe técnica especializada da locadora realize a montagem completa e desmontagem pós-evento de todas as peças e estruturas no local informado.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* LIVE PRICE SUMMARY CARD */}
            <div className="bg-[#151518] rounded-2xl border border-[#27272A] p-5 space-y-3 shadow-xl">
              <div className="flex justify-between items-center text-xs">
                <span className="text-[#A1A1AA]">Soma dos itens selecionados:</span>
                <span className="text-white font-semibold">{formatarMoeda(subtotal)} / dia</span>
              </div>
              <div className="flex justify-between items-center text-xs">
                <span className="text-[#A1A1AA]">Duração total da locação:</span>
                <span className="text-white font-semibold font-mono">{diasLocacao} {diasLocacao === 1 ? 'dia' : 'dias'}</span>
              </div>
              {valorFrete > 0 && (
                <div className="flex justify-between items-center text-xs text-emerald-400 font-semibold border-t border-[#27272A]/40 pt-2.5">
                  <span className="flex items-center gap-1">
                    <MapPin size={12} /> Custo de Frete Estimado ({distanciaKm} Km):
                  </span>
                  <span>{formatarMoeda(valorFrete)}</span>
                </div>
              )}
              {contratarMontagem && (
                <div className="flex justify-between items-center text-xs text-[#D4AF37] font-semibold border-t border-[#27272A]/40 pt-2.5">
                  <span className="flex items-center gap-1.5">
                    <Wrench size={13} /> Serviço de Montagem & Desmontagem:
                  </span>
                  <span className="bg-[#D4AF37]/15 text-[#D4AF37] px-2 py-0.5 rounded text-[10px] font-bold border border-[#D4AF37]/30">
                    Incluso no Agendamento
                  </span>
                </div>
              )}
              <div className="border-b border-[#27272A] pb-1" />

              {/* CALÇÃO DE GARANTIA DE RESERVA */}
              {percentualCalcao > 0 && (
                <div className="bg-[#1C1C21] p-3 rounded-xl border border-[#D4AF37]/30 space-y-1 my-2">
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-[#D4AF37] font-bold flex items-center gap-1.5">
                      <ShieldCheck size={14} /> Calção de Garantia de Reserva ({percentualCalcao}%):
                    </span>
                    <span className="text-[#D4AF37] font-extrabold font-mono text-sm">{formatarMoeda(valorCalcao)}</span>
                  </div>
                  <p className="text-[10px] text-[#A1A1AA] leading-tight">
                    *Valor exigido para garantia e bloqueio de reserva dos itens selecionados.
                  </p>
                </div>
              )}

              <div className="flex justify-between items-center pt-1">
                <span className="text-white font-bold text-sm">Valor Total Estimado:</span>
                <span className="text-[#D4AF37] font-serif italic font-extrabold text-xl">{formatarMoeda(totalGeral)}</span>
              </div>

              {percentualCalcao > 0 && (
                <div className="flex justify-between items-center text-xs pt-2 border-t border-[#27272A]">
                  <span className="text-[#A1A1AA]">Saldo a pagar na retirada:</span>
                  <span className="text-white font-mono font-bold">{formatarMoeda(saldoRestante)}</span>
                </div>
              )}
            </div>

            {/* REJECTION REASON TEXTAREA FORM */}
            {showRejectForm ? (
              <div className="bg-[#1C1C21] border border-red-500/30 rounded-2xl p-4 space-y-3 animate-fadeIn">
                <h4 className="text-xs font-bold text-red-400 font-mono flex items-center gap-1.5">
                  <XCircle size={15} /> Informe o motivo da recusa da proposta:
                </h4>
                <textarea
                  rows={3}
                  required
                  value={rejectReasonInput}
                  onChange={(e) => setRejectReasonInput(e.target.value)}
                  placeholder="Ex: Valor acima do orçamento, data indisponível, alteração nos itens..."
                  className="w-full bg-[#111113] border border-[#27272A] text-white p-3 rounded-xl text-xs focus:border-red-500 focus:outline-none"
                />
                <div className="flex gap-2 justify-end">
                  <button
                    type="button"
                    onClick={() => setShowRejectForm(false)}
                    className="px-3 py-2 bg-[#18181B] text-[#A1A1AA] hover:text-white text-xs font-bold rounded-xl cursor-pointer"
                  >
                    Cancelar
                  </button>
                  <button
                    type="button"
                    onClick={handleRejectSubmit}
                    disabled={isRejecting || !rejectReasonInput.trim()}
                    className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-xs font-bold rounded-xl cursor-pointer disabled:opacity-40 flex items-center gap-1.5"
                  >
                    {isRejecting ? 'Registrando...' : 'Confirmar Recusa'}
                  </button>
                </div>
              </div>
            ) : (
              /* ACTIONS BUTTONS GRID (APPROVE & REJECT) */
              <div className="space-y-3">
                <button
                  type="submit"
                  disabled={isSubmitting || selectedItems.length === 0}
                  style={{
                    backgroundColor: primaryColor,
                    color: getContrastTextColor(primaryColor)
                  }}
                  className="w-full font-extrabold uppercase tracking-wider text-xs py-4 rounded-2xl shadow-lg shadow-black/30 transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-95 disabled:opacity-40"
                >
                  {isSubmitting ? (
                    <>
                      <div className="w-4 h-4 rounded-full border-2 border-t-transparent animate-spin" />
                      <span>GERANDO RESERVA & CONTRATO...</span>
                    </>
                  ) : (
                    <>
                      <ShieldCheck size={16} />
                      <span>✓ APROVAR ORÇAMENTO & CONFIRMAR RESERVA</span>
                    </>
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => setShowRejectForm(true)}
                  className="w-full bg-[#18181B] hover:bg-red-500/10 border border-[#27272A] hover:border-red-500/40 text-red-400 font-bold uppercase tracking-wider text-xs py-3 rounded-2xl transition-all flex items-center justify-center gap-2 cursor-pointer"
                >
                  <XCircle size={15} />
                  <span>Recusar Proposta</span>
                </button>

                <p className="text-center text-[10px] text-[#71717A] pt-1 flex items-center justify-center gap-1">
                  <ShieldCheck size={12} /> Link seguro e homologado pelo sistema de acervos Bora Festar.
                </p>
              </div>
            )}
          </form>
        )}
      </div>
    </div>
  );
};

function getContrastTextColor(hexColor: string): string {
  const cleanHex = hexColor.replace('#', '');
  const r = parseInt(cleanHex.substring(0, 2), 16);
  const g = parseInt(cleanHex.substring(2, 4), 16);
  const b = parseInt(cleanHex.substring(4, 6), 16);
  const yiq = (r * 299 + g * 587 + b * 114) / 1000;
  return yiq >= 128 ? '#0A0A0B' : '#FFFFFF';
}
