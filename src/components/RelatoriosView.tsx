import React, { useState, useRef } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { 
  ModeloContrato, 
  ReservaComItens, 
  EmpresaConfig, 
  Cliente, 
  ItemAcervo, 
  TransacaoFinanceira, 
  StatusReserva 
} from '../types';
import { AVAILABLE_TEMPLATE_TAGS, fillContractTemplate } from '../utils/templateEngine';
import { formatarDataBr, formatarMoeda } from '../utils/whatsappTemplates';
import { getAppLogoUrl, handleLogoError } from '../utils/logoUtils';
import { printHtmlContent, printElementById } from '../utils/printUtils';
import { 
  FileText, 
  FileCheck, 
  Plus, 
  Upload, 
  Edit, 
  Trash2, 
  Printer, 
  Copy, 
  Check, 
  Share2, 
  Search, 
  Filter, 
  Sparkles, 
  Building2, 
  User, 
  Calendar, 
  Package, 
  DollarSign, 
  Download, 
  Eye, 
  FileCode, 
  X, 
  CheckCircle2, 
  BarChart3, 
  TrendingUp, 
  Layers, 
  HardDrive, 
  Tag, 
  AlertCircle, 
  ArrowUpRight,
  Hash,
  MapPin,
  Phone,
  EyeOff
} from 'lucide-react';
import { WebFormModal } from './WebFormModal';
import { FormularioWeb, GoogleAccountConfig } from '../types';
import { AndroidCameraModal } from './AndroidCameraModal';
import { Smartphone } from 'lucide-react';

interface RelatoriosViewProps {
  modelosContratos: ModeloContrato[];
  onSaveModelo: (modelo: ModeloContrato) => void;
  onDeleteModelo: (id: string) => void;
  reservas: ReservaComItens[];
  clientes: Cliente[];
  itens: ItemAcervo[];
  transacoes: TransacaoFinanceira[];
  empresaConfig: EmpresaConfig;
  webForms?: FormularioWeb[];
  googleAccount?: GoogleAccountConfig;
  onCreateGoogleForm?: (titulo: string, itemIds: number[]) => void;
  onSimulateCustomerSubmit?: (
    formId: string,
    clienteNome: string,
    clienteTelefone: string,
    itemIds: number[],
    dataRetirada: number,
    dataDevolucao: number
  ) => void;
  onNavigateToCreateOrcamento?: () => void;
}

export const RelatoriosView: React.FC<RelatoriosViewProps> = ({
  modelosContratos,
  onSaveModelo,
  onDeleteModelo,
  reservas,
  clientes,
  itens,
  transacoes,
  empresaConfig,
  webForms = [],
  googleAccount,
  onCreateGoogleForm,
  onSimulateCustomerSubmit = () => {},
  onNavigateToCreateOrcamento,
}) => {
  const [activeSubTab, setActiveSubTab] = useState<'contratos' | 'reservas' | 'acervo'>('contratos');
  const [fillModalMode, setFillModalMode] = useState<'editar' | 'visualizar'>('editar');

  // Filter & Search states
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('TODOS');

  // Modals & Active Selections
  const [isEditorModalOpen, setIsEditorModalOpen] = useState(false);
  const [editingModelo, setEditingModelo] = useState<ModeloContrato | null>(null);

  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [isCameraImportOpen, setIsCameraImportOpen] = useState(false);
  const [importText, setImportText] = useState('');
  const [importFileName, setImportFileName] = useState('');

  const [isFillModalOpen, setIsFillModalOpen] = useState(false);
  const [selectedReservaId, setSelectedReservaId] = useState<number | null>(reservas[0]?.reserva.id || null);
  const [selectedModeloId, setSelectedModeloId] = useState<string>(modelosContratos[0]?.id || 'MODELO-CONTRATO-PADRAO');
  
  // Real-time edited filled document text
  const [filledDocumentText, setFilledDocumentText] = useState<string>('');
  const [copiedNotice, setCopiedNotice] = useState(false);

  // Form Data for Editor
  const [formData, setFormData] = useState<{
    titulo: string;
    categoria: 'CONTRATO' | 'VISTORIA' | 'ORCAMENTO' | 'RECIBO' | 'OUTROS';
    descricao: string;
    conteudo: string;
  }>({
    titulo: '',
    categoria: 'CONTRATO',
    descricao: '',
    conteudo: '',
  });

  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleFocusScroll = (e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setTimeout(() => {
      e.target.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }, 150);
  };

  // Open Create/Edit Editor
  const handleOpenEditor = (modelo?: ModeloContrato) => {
    if (modelo) {
      setEditingModelo(modelo);
      setFormData({
        titulo: modelo.titulo,
        categoria: modelo.categoria,
        descricao: modelo.descricao || '',
        conteudo: modelo.conteudo,
      });
    } else {
      setEditingModelo(null);
      setFormData({
        titulo: '',
        categoria: 'CONTRATO',
        descricao: '',
        conteudo: `CONTRATO DE LOCAÇÃO DE BENS MÓVEIS — RESERVA {ID_RESERVA}\n\nLOCADOR: {RAZAO_SOCIAL} ({CNPJ})\nLOCATÁRIO: {NOME_CLIENTE} ({CPF_CNPJ_CLIENTE})\n\nITENS:\n{LISTA_ITENS}\n\nVALOR TOTAL: {VALOR_TOTAL}\n\nData: {DATA_HOJE}`,
      });
    }
    setIsEditorModalOpen(true);
  };

  // Insert tag chip into editor textarea
  const handleInsertTag = (tag: string) => {
    if (!textareaRef.current) {
      setFormData((prev) => ({ ...prev, conteudo: prev.conteudo + ' ' + tag }));
      return;
    }

    const start = textareaRef.current.selectionStart;
    const end = textareaRef.current.selectionEnd;
    const text = formData.conteudo;
    const before = text.substring(0, start);
    const after = text.substring(end);

    const updated = before + tag + after;
    setFormData((prev) => ({ ...prev, conteudo: updated }));

    setTimeout(() => {
      if (textareaRef.current) {
        textareaRef.current.selectionStart = start + tag.length;
        textareaRef.current.selectionEnd = start + tag.length;
        textareaRef.current.focus();
      }
    }, 50);
  };

  // Save Editor Submit
  const handleSubmitEditor = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.titulo.trim() || !formData.conteudo.trim()) return;

    const id = editingModelo ? editingModelo.id : `MODELO-CUSTOM-${Date.now()}`;
    const modeloObj: ModeloContrato = {
      id,
      titulo: formData.titulo.trim(),
      categoria: formData.categoria,
      descricao: formData.descricao.trim(),
      conteudo: formData.conteudo,
      criadoEm: editingModelo ? editingModelo.criadoEm : Date.now(),
      atualizadoEm: Date.now(),
      isPadrao: editingModelo ? editingModelo.isPadrao : false,
      origemImportacao: editingModelo ? editingModelo.origemImportacao : 'Manual',
    };

    onSaveModelo(modeloObj);
    setIsEditorModalOpen(false);
  };

  // Handle File Upload Import
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setImportFileName(file.name);
    const reader = new FileReader();
    reader.onload = (evt) => {
      const content = evt.target?.result as string;
      if (content) {
        setImportText(content);
      }
    };
    reader.readAsText(file);
  };

  // Process Imported File into editable template
  const handleConfirmImport = () => {
    if (!importText.trim()) return;

    const id = `MODELO-IMP-${Date.now()}`;
    const cleanTitle = importFileName
      ? importFileName.replace(/\.[^/.]+$/, '').replace(/[-_]/g, ' ')
      : `Modelo Importado ${new Date().toLocaleDateString()}`;

    const newModelo: ModeloContrato = {
      id,
      titulo: cleanTitle,
      categoria: 'CONTRATO',
      descricao: `Importado de "${importFileName || 'Arquivo'}" — Pronta para edição`,
      conteudo: importText,
      criadoEm: Date.now(),
      atualizadoEm: Date.now(),
      isPadrao: false,
      origemImportacao: `Importado (${importFileName || 'Upload'})`,
    };

    onSaveModelo(newModelo);
    setIsImportModalOpen(false);
    setImportText('');
    setImportFileName('');

    // Open immediately for editing
    handleOpenEditor(newModelo);
  };

  // Open Fill Document Modal
  const handleOpenFillModal = (modeloId?: string, reservaId?: number) => {
    const mId = modeloId || selectedModeloId || modelosContratos[0]?.id;
    const rId = reservaId || selectedReservaId || reservas[0]?.reserva.id;

    setSelectedModeloId(mId);
    if (rId) setSelectedReservaId(rId);

    const currentModelo = modelosContratos.find((m) => m.id === mId) || modelosContratos[0];
    const currentReserva = reservas.find((r) => r.reserva.id === rId) || reservas[0];

    if (currentModelo) {
      const filled = fillContractTemplate(currentModelo.conteudo, {
        empresaConfig,
        reservaComItens: currentReserva || null,
        cliente: currentReserva?.cliente || clientes[0] || null,
      });
      setFilledDocumentText(filled);
    }

    setIsFillModalOpen(true);
  };

  // Update Dynamic Fill Preview on Selection Change
  const handleFillSelectionChange = (mId: string, rId: number | null) => {
    setSelectedModeloId(mId);
    setSelectedReservaId(rId);

    const currentModelo = modelosContratos.find((m) => m.id === mId);
    const currentReserva = reservas.find((r) => r.reserva.id === rId);

    if (currentModelo) {
      const filled = fillContractTemplate(currentModelo.conteudo, {
        empresaConfig,
        reservaComItens: currentReserva || null,
        cliente: currentReserva?.cliente || clientes[0] || null,
      });
      setFilledDocumentText(filled);
    }
  };

  // Copy Filled Text
  const handleCopyText = () => {
    navigator.clipboard.writeText(filledDocumentText);
    setCopiedNotice(true);
    setTimeout(() => setCopiedNotice(false), 2500);
  };

  // Print Filled Document
  const handlePrintDocument = () => {
    const currentModelo = modelosContratos.find((m) => m.id === selectedModeloId);
    printHtmlContent(`<pre style="font-family: Arial, sans-serif; font-size: 13px; white-space: pre-wrap; line-height: 1.6;">${filledDocumentText}</pre>`, {
      title: `Documento de Locação — ${empresaConfig.nomeFantasia}`,
      subtitle: currentModelo ? `Modelo: ${currentModelo.titulo}` : 'Minuta Contratual / Documento Preenchido',
    });
  };

  // Print Synthetic Report
  const handlePrintSintetico = () => {
    printElementById('printable-relatorio-sintetico', {
      title: 'Relatório Sintético de Contratações e Reservas',
      subtitle: `LocadoraPro - ${empresaConfig.nomeFantasia} | Total de ${reservas.length} reservas`,
    });
  };

  // Filtered Modelos
  const filteredModelos = modelosContratos.filter((m) => {
    const matchesSearch =
      m.titulo.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (m.descricao && m.descricao.toLowerCase().includes(searchTerm.toLowerCase())) ||
      m.conteudo.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesCategory = categoryFilter === 'TODOS' || m.categoria === categoryFilter;

    return matchesSearch && matchesCategory;
  });

  // Calculate Reservation Metrics for Reports
  const totalReceita = reservas.reduce((acc, r) => acc + r.valorTotal, 0);
  const totalReservasCount = reservas.length;
  const ticketMedio = totalReservasCount > 0 ? totalReceita / totalReservasCount : 0;
  const reservasConfirmadas = reservas.filter(
    (r) => r.reserva.status === StatusReserva.CONFIRMADA || r.reserva.status === StatusReserva.EM_ANDAMENTO
  ).length;

  // Items performance metrics
  const totalItensCount = itens.reduce((acc, i) => acc + i.quantidadeTotal, 0);
  const totalCategoriasCount = Array.from(new Set(itens.map((i) => i.categoria))).length;

  return (
    <div className="space-y-6 pb-12">
      {/* Header Section */}
      <div className="bg-[#111113] border border-[#27272A] rounded-2xl p-6 shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-[#D4AF37]/5 rounded-full blur-3xl -mr-20 -mt-20 pointer-events-none" />
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 relative z-10">
          <div>
            <div className="flex items-center gap-2 text-[#D4AF37] text-xs font-bold uppercase tracking-wider mb-1">
              <BarChart3 size={16} />
              <span>Módulo de Gestão & Relatórios</span>
            </div>
            <h2 className="text-2xl font-serif italic text-white font-semibold">
              Relatórios e Modelos de Contrato
            </h2>
            <p className="text-xs text-[#A1A1AA] mt-1">
              Gerencie contratos dinâmicos, importação de documentos, relatórios sintéticos de reservas e análise do acervo.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row sm:flex-wrap items-stretch sm:items-center gap-2 w-full lg:w-auto">
            <button
              onClick={() => setIsCameraImportOpen(true)}
              className="flex items-center justify-center gap-2 bg-[#18181B] hover:bg-[#27272A] hover:border-[#D4AF37]/30 text-white border border-[#3F3F46] px-4 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer shadow-md w-full sm:w-auto shrink-0"
            >
              <Smartphone size={15} className="text-[#D4AF37] animate-pulse" />
              <span>Importar via Câmera</span>
            </button>
            <button
              onClick={() => setIsImportModalOpen(true)}
              className="flex items-center justify-center gap-2 bg-[#18181B] hover:bg-[#27272A] text-white border border-[#3F3F46] px-4 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer shadow-md w-full sm:w-auto shrink-0"
            >
              <Upload size={15} className="text-[#D4AF37]" />
              <span>Importar Arquivo</span>
            </button>
            <button
              onClick={() => handleOpenEditor()}
              className="flex items-center justify-center gap-2 bg-gradient-to-r from-[#D4AF37] to-[#E5C158] hover:opacity-95 text-[#0A0A0B] px-4 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider transition-all cursor-pointer shadow-lg shadow-[#D4AF37]/15 w-full sm:w-auto shrink-0"
            >
              <Plus size={16} />
              <span>Novo Modelo</span>
            </button>
          </div>
        </div>

        {/* SubTab Navigation */}
        <div className="flex flex-nowrap overflow-x-auto max-w-full items-center p-1.5 bg-[#0A0A0B] border border-[#27272A] rounded-2xl text-xs gap-1 mt-6 no-scrollbar">
          <button
            onClick={() => setActiveSubTab('contratos')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-semibold transition-all cursor-pointer whitespace-nowrap shrink-0 select-none ${
              activeSubTab === 'contratos'
                ? 'bg-[#18181B] text-white border border-[#D4AF37]/50 shadow-md shadow-black/40 font-bold'
                : 'text-[#A1A1AA] hover:bg-[#18181B]/60 hover:text-white border border-transparent'
            }`}
          >
            <FileText size={16} className={activeSubTab === 'contratos' ? 'text-[#D4AF37]' : 'text-[#71717A]'} />
            <span>Contratos & Modelos Dinâmicos</span>
            {activeSubTab === 'contratos' && <span className="w-1.5 h-1.5 rounded-full bg-[#D4AF37]" />}
          </button>

          <button
            onClick={() => setActiveSubTab('reservas')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-semibold transition-all cursor-pointer whitespace-nowrap shrink-0 select-none ${
              activeSubTab === 'reservas'
                ? 'bg-[#18181B] text-white border border-[#D4AF37]/50 shadow-md shadow-black/40 font-bold'
                : 'text-[#A1A1AA] hover:bg-[#18181B]/60 hover:text-white border border-transparent'
            }`}
          >
            <TrendingUp size={16} className={activeSubTab === 'reservas' ? 'text-[#D4AF37]' : 'text-[#71717A]'} />
            <span>Relatório de Reservas & Faturamento</span>
            {activeSubTab === 'reservas' && <span className="w-1.5 h-1.5 rounded-full bg-[#D4AF37]" />}
          </button>

          <button
            onClick={() => setActiveSubTab('acervo')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-semibold transition-all cursor-pointer whitespace-nowrap shrink-0 select-none ${
              activeSubTab === 'acervo'
                ? 'bg-[#18181B] text-white border border-[#D4AF37]/50 shadow-md shadow-black/40 font-bold'
                : 'text-[#A1A1AA] hover:bg-[#18181B]/60 hover:text-white border border-transparent'
            }`}
          >
            <Layers size={16} className={activeSubTab === 'acervo' ? 'text-[#D4AF37]' : 'text-[#71717A]'} />
            <span>Relatório do Acervo & Estoque</span>
            {activeSubTab === 'acervo' && <span className="w-1.5 h-1.5 rounded-full bg-[#D4AF37]" />}
          </button>


        </div>
      </div>

      {/* SUBTAB 1: CONTRATOS & MODELOS DINÂMICOS */}
      {activeSubTab === 'contratos' && (
        <div className="space-y-6">
          {/* Controls Bar */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-[#111113] p-4 rounded-2xl border border-[#27272A]">
            {/* Search Input */}
            <div className="relative w-full sm:w-80">
              <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#71717A]" />
              <input
                type="text"
                placeholder="Buscar modelo de contrato..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                onFocus={handleFocusScroll}
                className="w-full pl-10 pr-4 py-2 bg-[#18181B] border border-[#27272A] rounded-xl text-xs text-white placeholder-[#71717A] focus:border-[#D4AF37] focus:outline-none"
              />
            </div>

            {/* Category Filter Pills */}
            <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto no-scrollbar">
              {['TODOS', 'CONTRATO', 'VISTORIA', 'ORCAMENTO', 'RECIBO', 'OUTROS'].map((cat) => (
                <button
                  key={cat}
                  onClick={() => setCategoryFilter(cat)}
                  className={`px-3 py-1.5 rounded-lg text-[11px] font-bold tracking-wider transition-all cursor-pointer whitespace-nowrap ${
                    categoryFilter === cat
                      ? 'bg-[#D4AF37] text-[#0A0A0B]'
                      : 'bg-[#18181B] text-[#A1A1AA] hover:text-white border border-[#27272A]'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          {/* Split Screen Layout */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Left: Models list (7 cols) */}
            <div className="lg:col-span-7 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {filteredModelos.map((modelo) => {
                  const isPadrao = modelo.isPadrao;
                  return (
                    <div
                      key={modelo.id}
                      className={`bg-[#111113] border rounded-2xl p-5 flex flex-col justify-between transition-all duration-200 hover:border-[#D4AF37]/50 shadow-xl relative overflow-hidden group ${
                        isPadrao ? 'border-[#D4AF37]/40 bg-gradient-to-b from-[#18181B] to-[#111113]' : 'border-[#27272A]'
                      }`}
                    >
                      <div>
                        <div className="flex items-start justify-between gap-3 mb-2">
                          <div className="flex items-center gap-2">
                            <span
                              className={`text-[10px] font-bold px-2.5 py-1 rounded-full uppercase tracking-wider ${
                                modelo.categoria === 'CONTRATO'
                                  ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                                  : modelo.categoria === 'VISTORIA'
                                  ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20'
                                  : modelo.categoria === 'ORCAMENTO'
                                  ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                                  : 'bg-purple-500/10 text-purple-400 border border-purple-500/20'
                              }`}
                            >
                              {modelo.categoria}
                            </span>
                            {isPadrao && (
                              <span className="text-[10px] font-bold bg-[#D4AF37]/20 text-[#D4AF37] border border-[#D4AF37]/40 px-2.5 py-1 rounded-full flex items-center gap-1">
                                <Sparkles size={11} /> Modelo Padrão
                              </span>
                            )}
                          </div>

                          <span className="text-[10px] text-[#71717A] font-mono">
                            {formatarDataBr(modelo.atualizadoEm)}
                          </span>
                        </div>

                        <h3 className="text-base font-serif italic text-white font-semibold group-hover:text-[#D4AF37] transition-colors">
                          {modelo.titulo}
                        </h3>

                        <p className="text-xs text-[#A1A1AA] mt-1.5 line-clamp-2">
                          {modelo.descricao || 'Modelo dinâmico configurável com tags automáticas de clientes e reservas.'}
                        </p>

                        {modelo.origemImportacao && (
                          <p className="text-[10px] text-[#71717A] mt-2 flex items-center gap-1 italic">
                            <Tag size={12} className="text-[#D4AF37]" /> {modelo.origemImportacao}
                          </p>
                        )}
                      </div>

                      {/* Model Card Actions */}
                      <div className="flex items-center justify-between border-t border-[#27272A] pt-4 mt-4 font-sans">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleOpenEditor(modelo)}
                            className="flex items-center gap-1.5 bg-[#18181B] hover:bg-[#27272A] text-white border border-[#3F3F46] px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer"
                          >
                            <Edit size={13} className="text-[#D4AF37]" />
                            <span>Editar Texto</span>
                          </button>

                          {!isPadrao && (
                            <button
                              onClick={() => onDeleteModelo(modelo.id)}
                              className="p-1.5 text-[#71717A] hover:text-rose-400 hover:bg-rose-500/10 rounded-xl transition-all cursor-pointer"
                              title="Excluir Modelo"
                            >
                              <Trash2 size={15} />
                            </button>
                          )}
                        </div>

                        <button
                          onClick={() => handleOpenFillModal(modelo.id)}
                          className="flex items-center gap-1.5 bg-[#D4AF37]/10 hover:bg-[#D4AF37]/20 text-[#D4AF37] border border-[#D4AF37]/30 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer"
                        >
                          <Sparkles size={13} />
                          <span>Gerar / Preencher</span>
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Right: Live PDF Document Preview Simulator (5 cols) */}
            <div className="lg:col-span-5 space-y-4">
              <div className="bg-[#111113] border border-[#27272A] rounded-2xl p-5 shadow-xl space-y-4">
                <div className="flex items-center justify-between border-b border-[#27272A] pb-3">
                  <h3 className="font-serif italic text-white text-base flex items-center gap-2">
                    <FileText className="text-[#D4AF37]" size={18} />
                    Prévia Dinâmica do Contrato PDF
                  </h3>
                  <span className="text-[10px] font-mono bg-[#18181B] border border-[#27272A] text-[#D4AF37] px-2.5 py-1 rounded-md">
                    Modelo Oficial
                  </span>
                </div>

                {/* Live A4 Paper Mockup */}
                <div className="bg-white text-slate-900 p-5 rounded-xl border border-slate-300 shadow-inner font-sans text-xs space-y-4 leading-relaxed">
                  {/* Header */}
                  <div className="border-b-2 border-amber-600 pb-3 flex justify-between items-center gap-3">
                    <div className="flex items-center gap-2.5">
                      {!!getAppLogoUrl(empresaConfig?.logoUrl) && (
                        <img
                          src={getAppLogoUrl(empresaConfig?.logoUrl)}
                          alt="Logo da Empresa"
                          onError={handleLogoError}
                          className="h-10 w-auto object-contain shrink-0"
                        />
                      )}
                      <div>
                        <h4 className="font-black text-base text-amber-700 tracking-tight uppercase">
                          {empresaConfig.nomeFantasia || 'NOME FANTASIA DA EMPRESA'}
                        </h4>
                        <p className="text-[10px] text-slate-500 font-semibold uppercase font-sans">
                          Contrato de Locação de Bens Móveis
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <span className="bg-emerald-100 text-emerald-800 text-[10px] font-bold px-2 py-0.5 rounded-full font-sans">
                        Sincronizado
                      </span>
                    </div>
                  </div>

                  {/* Qualificação do Locador */}
                  <div className="bg-slate-50 p-3 rounded border border-slate-200 text-[11px] space-y-1 font-sans">
                    <span className="font-bold text-slate-600 block text-[10px] uppercase">
                      Qualificação do Locador:
                    </span>
                    <p className="text-slate-700">
                      <strong>LOCADOR:</strong> {empresaConfig.razaoSocial || 'Razão Social da Empresa'} (
                      <em>"{empresaConfig.nomeFantasia || 'Nome Fantasia'}"</em>), inscrita no CNPJ sob nº{' '}
                      <span className="font-mono">{empresaConfig.cnpj || '00.000.000/0001-00'}</span>, estabelecida em{' '}
                      {empresaConfig.enderecoCompleto || 'Endereço Completo'}, representada por{' '}
                      <strong>{empresaConfig.nomeRepresentante || 'Nome do Representante'}</strong>.
                    </p>
                  </div>

                  {/* Assinatura Mockup */}
                  <div className="pt-2 border-t border-slate-200 grid grid-cols-2 gap-3 text-center text-[10px] font-sans">
                    <div>
                      <div className="border-b border-slate-400 mb-1 w-28 mx-auto"></div>
                      <p className="font-bold text-slate-800 text-[9px] truncate">{empresaConfig.nomeRepresentante || 'Representante Legal'}</p>
                      <p className="text-[8px] text-slate-500">{empresaConfig.nomeFantasia || 'Empresa Locadora'} (LOCADOR)</p>
                    </div>

                    <div>
                      <div className="border-b border-slate-400 mb-1 w-28 mx-auto"></div>
                      <p className="font-bold text-slate-800 text-[9px]">LOCATÁRIO(A)</p>
                      <p className="text-[8px] text-slate-500">Cliente Contratante</p>
                    </div>
                  </div>

                  {/* Rodapé */}
                  <div className="text-[9px] text-slate-400 text-center border-t border-slate-100 pt-1.5 font-mono">
                    {empresaConfig.enderecoCompleto || 'Endereço'} | Tel: {empresaConfig.telefoneWhatsapp || 'Telefone'}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* SUBTAB 2: RELATÓRIO DE RESERVAS & FATURAMENTO */}
      {activeSubTab === 'reservas' && (
        <div className="space-y-6">
          {/* Summary Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-[#111113] border border-[#27272A] p-5 rounded-2xl shadow-xl">
              <span className="text-xs text-[#A1A1AA] uppercase tracking-wider block mb-1">Receita Total Bruta</span>
              <div className="text-2xl font-bold font-mono text-emerald-400">{formatarMoeda(totalReceita)}</div>
              <span className="text-[10px] text-[#71717A] mt-1 block">Acumulado em todas as reservas</span>
            </div>

            <div className="bg-[#111113] border border-[#27272A] p-5 rounded-2xl shadow-xl">
              <span className="text-xs text-[#A1A1AA] uppercase tracking-wider block mb-1">Total de Reservas</span>
              <div className="text-2xl font-bold text-white">{totalReservasCount}</div>
              <span className="text-[10px] text-[#71717A] mt-1 block">{reservasConfirmadas} ativas/confirmadas</span>
            </div>

            <div className="bg-[#111113] border border-[#27272A] p-5 rounded-2xl shadow-xl">
              <span className="text-xs text-[#A1A1AA] uppercase tracking-wider block mb-1">Ticket Médio por Reserva</span>
              <div className="text-2xl font-bold font-mono text-[#D4AF37]">{formatarMoeda(ticketMedio)}</div>
              <span className="text-[10px] text-[#71717A] mt-1 block">Média por contratação de cliente</span>
            </div>

            <div className="bg-[#111113] border border-[#27272A] p-5 rounded-2xl shadow-xl">
              <span className="text-xs text-[#A1A1AA] uppercase tracking-wider block mb-1">Base de Clientes</span>
              <div className="text-2xl font-bold text-white">{clientes.length}</div>
              <span className="text-[10px] text-[#71717A] mt-1 block">Cadastros ativos no sistema</span>
            </div>
          </div>

          {/* Table of Reservations */}
          <div id="printable-relatorio-sintetico" className="bg-[#111113] border border-[#27272A] rounded-2xl p-6 shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b border-[#27272A] pb-4">
              <h3 className="text-base font-serif italic text-white font-semibold">
                Relatório Sintético de Contratações e Reservas
              </h3>
              <button
                type="button"
                onClick={handlePrintSintetico}
                className="flex items-center gap-1.5 bg-[#18181B] border border-[#27272A] hover:bg-[#27272A] text-white px-3 py-1.5 rounded-xl text-xs font-semibold cursor-pointer no-print"
              >
                <Printer size={14} /> Relatório Impresso
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-white">
                <thead className="bg-[#18181B] text-[#A1A1AA] uppercase font-mono text-[10px]">
                  <tr>
                    <th className="p-3 rounded-l-xl">Reserva</th>
                    <th className="p-3">Cliente</th>
                    <th className="p-3">Período de Locação</th>
                    <th className="p-3">Status</th>
                    <th className="p-3 text-right">Valor Total</th>
                    <th className="p-3 text-right rounded-r-xl">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#27272A]/50">
                  {reservas.map((res) => (
                    <tr key={res.reserva.id} className="hover:bg-[#18181B]/50 transition-colors">
                      <td className="p-3 font-mono text-[#D4AF37] font-bold">#{res.reserva.id}</td>
                      <td className="p-3 font-semibold">{res.cliente.nome}</td>
                      <td className="p-3 text-[#A1A1AA]">
                        {formatarDataBr(res.reserva.dataRetirada)} até {formatarDataBr(res.reserva.dataDevolucao)} ({res.diasReserva}d)
                      </td>
                      <td className="p-3">
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                          {res.reserva.status}
                        </span>
                      </td>
                      <td className="p-3 text-right font-mono font-bold text-white">
                        {formatarMoeda(res.valorTotal)}
                      </td>
                      <td className="p-3 text-right">
                        <button
                          onClick={() => handleOpenFillModal(undefined, res.reserva.id)}
                          className="text-[#D4AF37] hover:underline font-bold text-[11px] cursor-pointer"
                        >
                          Gerar Contrato
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* SUBTAB 3: RELATÓRIO DO ACERVO & ESTOQUE */}
      {activeSubTab === 'acervo' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-[#111113] border border-[#27272A] p-5 rounded-2xl shadow-xl">
              <span className="text-xs text-[#A1A1AA] uppercase tracking-wider block mb-1">Total de Peças / Peças em Estoque</span>
              <div className="text-2xl font-bold text-white">{totalItensCount} un</div>
              <span className="text-[10px] text-[#71717A] mt-1 block">Distribuídas em {itens.length} modelos de itens</span>
            </div>

            <div className="bg-[#111113] border border-[#27272A] p-5 rounded-2xl shadow-xl">
              <span className="text-xs text-[#A1A1AA] uppercase tracking-wider block mb-1">Categorias Ativas</span>
              <div className="text-2xl font-bold text-[#D4AF37]">{totalCategoriasCount}</div>
              <span className="text-[10px] text-[#71717A] mt-1 block">Painéis, Móveis, Vasos, Iluminação, etc.</span>
            </div>

            <div className="bg-[#111113] border border-[#27272A] p-5 rounded-2xl shadow-xl">
              <span className="text-xs text-[#A1A1AA] uppercase tracking-wider block mb-1">Valor do Acervo (Estimado)</span>
              <div className="text-2xl font-bold font-mono text-emerald-400">
                {formatarMoeda(itens.reduce((acc, i) => acc + i.precoAluguel * i.quantidadeTotal, 0))}
              </div>
              <span className="text-[10px] text-[#71717A] mt-1 block">Capacidade total de receita diária</span>
            </div>
          </div>

          <div className="bg-[#111113] border border-[#27272A] rounded-2xl p-6 shadow-xl space-y-4">
            <h3 className="text-base font-serif italic text-white font-semibold border-b border-[#27272A] pb-3">
              Análise de Peças do Acervo e Preço de Diária
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {itens.map((item) => (
                <div key={item.id} className="bg-[#18181B] border border-[#27272A] rounded-xl p-4 flex gap-3 items-center">
                  <img
                    src={item.imageUrl}
                    alt={item.nome}
                    className="w-14 h-14 object-cover rounded-lg border border-[#27272A] shrink-0"
                  />
                  <div className="overflow-hidden">
                    <h4 className="text-sm font-semibold text-white truncate">{item.nome}</h4>
                    <p className="text-[11px] text-[#A1A1AA]">{item.categoria}</p>
                    <div className="flex items-center gap-3 mt-1.5 text-xs font-mono">
                      <span className="text-[#D4AF37] font-bold">{formatarMoeda(item.precoAluguel)}/dia</span>
                      <span className="text-[#71717A]">{item.quantidadeTotal} em estoque</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}



      {/* MODAL 1: EDITOR DE MODELOS COM INSERÇÃO DE TAGS DINÂMICAS */}
      {isEditorModalOpen && (
        <div className="fixed inset-0 z-50 bg-[#0A0A0B]/85 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-[#111113] border border-[#27272A] rounded-2xl max-w-4xl w-full max-h-[92vh] flex flex-col text-white shadow-2xl overflow-hidden my-auto">
            {/* Modal Header */}
            <div className="sticky top-0 z-20 bg-[#111113] border-b border-[#27272A] p-4 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2">
                <FileCode size={20} className="text-[#D4AF37]" />
                <h3 className="text-lg font-serif italic text-[#D4AF37]">
                  {editingModelo ? 'Editar Modelo de Contrato' : 'Criar Novo Modelo de Contrato'}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsEditorModalOpen(false)}
                className="text-[#71717A] hover:text-white p-1 rounded-lg cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleSubmitEditor} className="flex flex-col flex-1 overflow-hidden">
              <div className="flex-1 overflow-y-auto p-5 space-y-4 custom-scrollbar">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="md:col-span-2">
                    <label className="block text-xs font-medium text-[#A1A1AA] mb-1">Título do Documento / Modelo</label>
                    <input
                      type="text"
                      required
                      value={formData.titulo}
                      onChange={(e) => setFormData({ ...formData, titulo: e.target.value })}
                      onFocus={handleFocusScroll}
                      className="w-full px-3.5 py-2 bg-[#18181B] border border-[#27272A] rounded-xl text-white text-xs focus:border-[#D4AF37] focus:outline-none"
                      placeholder="Ex: Contrato de Locação para Eventos Grandes"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-[#A1A1AA] mb-1">Categoria do Documento</label>
                    <select
                      value={formData.categoria}
                      onChange={(e) => setFormData({ ...formData, categoria: e.target.value as any })}
                      onFocus={handleFocusScroll}
                      className="w-full px-3.5 py-2 bg-[#18181B] border border-[#27272A] rounded-xl text-white text-xs focus:border-[#D4AF37] focus:outline-none"
                    >
                      <option value="CONTRATO">Contrato de Locação</option>
                      <option value="VISTORIA">Termo de Vistoria</option>
                      <option value="ORCAMENTO">Orçamento Oficial</option>
                      <option value="RECIBO">Recibo e Quitação</option>
                      <option value="OUTROS">Outros Documentos</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-[#A1A1AA] mb-1">Descrição Curta</label>
                  <input
                    type="text"
                    value={formData.descricao}
                    onChange={(e) => setFormData({ ...formData, descricao: e.target.value })}
                    onFocus={handleFocusScroll}
                    className="w-full px-3.5 py-2 bg-[#18181B] border border-[#27272A] rounded-xl text-white text-xs focus:border-[#D4AF37] focus:outline-none"
                    placeholder="Resumo do propósito deste modelo..."
                  />
                </div>

                {/* Variable Tags Insertion Toolbar */}
                <div className="bg-[#18181B] border border-[#27272A] rounded-xl p-3 space-y-2">
                  <div className="flex items-center justify-between text-xs text-[#D4AF37] font-semibold">
                    <span className="flex items-center gap-1.5">
                      <Sparkles size={14} /> Inserir Variáveis Dinâmicas
                    </span>
                    <span className="text-[10px] text-[#71717A]">Clique em uma tag para inserir no texto</span>
                  </div>

                  <div className="flex flex-wrap gap-1.5 max-h-28 overflow-y-auto custom-scrollbar pt-1">
                    {AVAILABLE_TEMPLATE_TAGS.map((tag) => (
                      <button
                        key={tag.tag}
                        type="button"
                        onClick={() => handleInsertTag(tag.tag)}
                        title={`${tag.description} (Ex: ${tag.example})`}
                        className="px-2.5 py-1 bg-[#27272A] hover:bg-[#D4AF37] hover:text-[#0A0A0B] text-[#E4E4E7] rounded-lg text-[10px] font-mono transition-all cursor-pointer flex items-center gap-1 border border-[#3F3F46]"
                      >
                        <span>{tag.tag}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Content Editor Textarea */}
                <div>
                  <label className="block text-xs font-medium text-[#A1A1AA] mb-1">
                    Conteúdo do Documento (Com Tags Dinâmicas)
                  </label>
                  <textarea
                    ref={textareaRef}
                    required
                    rows={12}
                    value={formData.conteudo}
                    onChange={(e) => setFormData({ ...formData, conteudo: e.target.value })}
                    onFocus={handleFocusScroll}
                    className="w-full px-4 py-3 bg-[#18181B] border border-[#27272A] rounded-xl text-white font-mono text-xs leading-relaxed focus:border-[#D4AF37] focus:outline-none custom-scrollbar"
                    placeholder="Digite o modelo de contrato..."
                  />
                </div>
              </div>

              {/* Modal Footer */}
              <div className="sticky bottom-0 z-20 bg-[#111113]/95 backdrop-blur-md border-t border-[#27272A] p-4 flex items-center justify-end gap-3 shrink-0">
                <button
                  type="button"
                  onClick={() => setIsEditorModalOpen(false)}
                  className="px-4 py-2 bg-[#18181B] hover:bg-[#27272A] text-[#A1A1AA] hover:text-white rounded-xl text-xs font-semibold cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 bg-[#D4AF37] hover:bg-[#E5C158] text-[#0A0A0B] rounded-xl text-xs font-bold uppercase tracking-wider shadow-md cursor-pointer flex items-center gap-1.5"
                >
                  <CheckCircle2 size={14} />
                  <span>Salvar Modelo</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: IMPORTAR MODELO DE ARQUIVO */}
      {isImportModalOpen && (
        <div className="fixed inset-0 z-50 bg-[#0A0A0B]/85 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-[#111113] border border-[#27272A] rounded-2xl max-w-2xl w-full flex flex-col text-white shadow-2xl overflow-hidden my-auto">
            <div className="bg-[#111113] border-b border-[#27272A] p-4 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2">
                <Upload size={20} className="text-[#D4AF37]" />
                <h3 className="text-lg font-serif italic text-[#D4AF37]">Importar Modelo de Arquivo</h3>
              </div>
              <button
                type="button"
                onClick={() => setIsImportModalOpen(false)}
                className="text-[#71717A] hover:text-white p-1 rounded-lg cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div className="border-2 border-dashed border-[#27272A] hover:border-[#D4AF37] rounded-2xl p-6 text-center transition-all bg-[#18181B]/50">
                <Upload size={32} className="mx-auto text-[#D4AF37] mb-2" />
                <p className="text-xs text-white font-semibold">
                  Selecione um arquivo de modelo (.txt, .doc, .docx, .html, .md)
                </p>
                <p className="text-[10px] text-[#71717A] mt-1">
                  O conteúdo do arquivo será extraído e disponibilizado para edição imediata
                </p>

                <input
                  type="file"
                  accept=".txt,.html,.md,.doc,.docx"
                  onChange={handleFileUpload}
                  className="hidden"
                  id="file-import-input"
                />
                <label
                  htmlFor="file-import-input"
                  className="inline-block mt-4 px-4 py-2 bg-[#27272A] hover:bg-[#3F3F46] text-white rounded-xl text-xs font-bold transition-all cursor-pointer"
                >
                  Escolher Arquivo do Computador
                </label>
              </div>

              {importFileName && (
                <div className="bg-emerald-500/10 border border-emerald-500/20 p-3 rounded-xl flex items-center gap-2 text-emerald-400 text-xs">
                  <CheckCircle2 size={16} />
                  <span>Arquivo carregado: <strong>{importFileName}</strong></span>
                </div>
              )}

              <div>
                <label className="block text-xs font-medium text-[#A1A1AA] mb-1">
                  Ou Cole o Texto do Modelo Aqui Directamente
                </label>
                <textarea
                  rows={8}
                  value={importText}
                  onChange={(e) => setImportText(e.target.value)}
                  onFocus={handleFocusScroll}
                  className="w-full px-3.5 py-2.5 bg-[#18181B] border border-[#27272A] rounded-xl text-white font-mono text-xs focus:border-[#D4AF37] focus:outline-none custom-scrollbar"
                  placeholder="Cole o conteúdo do contrato aqui..."
                />
              </div>
            </div>

            <div className="bg-[#111113]/95 border-t border-[#27272A] p-4 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setIsImportModalOpen(false)}
                className="px-4 py-2 bg-[#18181B] text-[#A1A1AA] hover:text-white rounded-xl text-xs font-semibold cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={!importText.trim()}
                onClick={handleConfirmImport}
                className="px-5 py-2.5 bg-[#D4AF37] hover:bg-[#E5C158] text-[#0A0A0B] rounded-xl text-xs font-bold uppercase tracking-wider shadow-md cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1.5"
              >
                <Edit size={14} />
                <span>Processar e Editar Modelo</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 3: GERADOR & PREENCHEDOR DINÂMICO COM EDIÇÃO INLINE DO DOCUMENTO */}
      {isFillModalOpen && (
        <div className="fixed inset-0 z-50 bg-[#0A0A0B]/85 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-[#111113] border border-[#27272A] rounded-2xl max-w-4xl w-full max-h-[92vh] flex flex-col text-white shadow-2xl overflow-hidden my-auto">
            {/* Header */}
            <div className="sticky top-0 z-20 bg-[#111113] border-b border-[#27272A] p-4 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2">
                <Sparkles size={20} className="text-[#D4AF37]" />
                <div>
                  <h3 className="text-lg font-serif italic text-[#D4AF37]">Documento Dinâmico Preenchido</h3>
                  <p className="text-[11px] text-[#A1A1AA]">
                    O modelo foi populado automaticamente com os dados do cadastro. Você pode editar o texto abaixo antes de imprimir.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsFillModalOpen(false)}
                className="text-[#71717A] hover:text-white p-1 rounded-lg cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            {/* Selectors Bar */}
            <div className="p-4 bg-[#18181B] border-b border-[#27272A] grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-[#A1A1AA] mb-1">Modelo de Documento</label>
                <select
                  value={selectedModeloId}
                  onChange={(e) => handleFillSelectionChange(e.target.value, selectedReservaId)}
                  onFocus={handleFocusScroll}
                  className="w-full px-3 py-2 bg-[#111113] border border-[#27272A] rounded-xl text-white text-xs focus:border-[#D4AF37] focus:outline-none"
                >
                  {modelosContratos.map((m) => (
                    <option key={m.id} value={m.id}>
                      [{m.categoria}] {m.titulo}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-[#A1A1AA] mb-1">
                  Selecione a Reserva / Cliente
                </label>
                <select
                  value={selectedReservaId || ''}
                  onChange={(e) => handleFillSelectionChange(selectedModeloId, Number(e.target.value))}
                  onFocus={handleFocusScroll}
                  className="w-full px-3 py-2 bg-[#111113] border border-[#27272A] rounded-xl text-white text-xs focus:border-[#D4AF37] focus:outline-none"
                >
                  {reservas.map((r) => (
                    <option key={r.reserva.id} value={r.reserva.id}>
                      Reserva #{r.reserva.id} — {r.cliente.nome} ({formatarMoeda(r.valorTotal)})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Editable / Viewer Paper Body */}
            <div className="flex-1 overflow-y-auto p-6 bg-[#0A0A0B] custom-scrollbar">
              <div className="bg-white text-slate-900 p-8 rounded-xl shadow-2xl border border-slate-200 space-y-4 font-sans text-xs">
                <div className="flex items-center justify-between border-b border-slate-300 pb-2 mb-4 text-slate-500 text-[10px] uppercase tracking-wider font-semibold">
                  <div className="flex items-center bg-slate-100 p-0.5 rounded-lg border border-slate-200">
                    <button
                      type="button"
                      onClick={() => setFillModalMode('editar')}
                      className={`px-3 py-1 rounded-md text-[10px] font-bold transition-all cursor-pointer ${
                        fillModalMode === 'editar'
                          ? 'bg-white text-slate-800 shadow-sm'
                          : 'text-slate-400 hover:text-slate-600'
                      }`}
                    >
                      Editar Texto
                    </button>
                    <button
                      type="button"
                      onClick={() => setFillModalMode('visualizar')}
                      className={`px-3 py-1 rounded-md text-[10px] font-bold transition-all cursor-pointer ${
                        fillModalMode === 'visualizar'
                          ? 'bg-white text-slate-800 shadow-sm'
                          : 'text-slate-400 hover:text-slate-600'
                      }`}
                    >
                      Visualizar
                    </button>
                  </div>
                  <span>{empresaConfig.nomeFantasia}</span>
                </div>

                {fillModalMode === 'editar' ? (
                  <textarea
                    rows={18}
                    value={filledDocumentText}
                    onChange={(e) => setFilledDocumentText(e.target.value)}
                    onFocus={handleFocusScroll}
                    className="w-full bg-transparent text-slate-900 font-mono text-xs leading-relaxed focus:outline-none resize-none"
                  />
                ) : (
                  <div className="w-full bg-transparent text-slate-900 font-sans text-xs leading-relaxed whitespace-pre-wrap select-all min-h-[300px] border border-transparent p-1">
                    {filledDocumentText}
                  </div>
                )}
              </div>
            </div>

            {/* Footer Actions */}
            <div className="sticky bottom-0 z-20 bg-[#111113] border-t border-[#27272A] p-4 flex flex-wrap items-center justify-between gap-3 shrink-0">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleCopyText}
                  className="flex items-center gap-1.5 bg-[#18181B] hover:bg-[#27272A] text-white border border-[#3F3F46] px-3.5 py-2 rounded-xl text-xs font-semibold cursor-pointer"
                >
                  {copiedNotice ? <Check size={14} className="text-emerald-400" /> : <Copy size={14} />}
                  <span>{copiedNotice ? 'Copiado!' : 'Copiar Texto'}</span>
                </button>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handlePrintDocument}
                  className="flex items-center gap-1.5 bg-gradient-to-r from-[#D4AF37] to-[#E5C158] hover:opacity-95 text-[#0A0A0B] px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider cursor-pointer shadow-md"
                >
                  <Printer size={15} />
                  <span>Imprimir / Gerar PDF</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {isCameraImportOpen && (
        <AndroidCameraModal
          isOpen={isCameraImportOpen}
          onClose={() => setIsCameraImportOpen(false)}
          onSaveExtractedModelo={(newModelo) => {
            onSaveModelo(newModelo);
            // Open immediately for editing
            handleOpenEditor(newModelo);
          }}
        />
      )}
    </div>
  );
};
