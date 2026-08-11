import React, { useState } from 'react';
import { FormularioWeb, ItemAcervo, GoogleAccountConfig, Cliente, StatusCicloVenda, EmpresaConfig, ReservaComItens, StatusReserva } from '../types';
import { formatarMoeda, processarTemplateWhatsApp, DEFAULT_TEMPLATES } from '../utils/whatsappTemplates';
import { PhoneInput } from './PhoneInput';
import { showGooglePicker, getAccessToken, googleSignIn } from '../lib/googleWorkspace';
import { getActiveTenantId } from '../lib/firebaseSync';
import {
  Share2,
  Copy,
  Check,
  ExternalLink,
  Send,
  Sparkles,
  CheckCircle2,
  HardDrive,
  Plus,
  X,
  FileSpreadsheet,
  CheckSquare,
  Square,
  Globe,
  FolderOpen,
  File,
  MessageSquare,
  Phone,
  Code2,
  UserCheck,
  LogOut,
  FolderGit2,
  FolderPlus,
  LogIn,
  Folder,
  ChevronRight,
  ChevronDown,
  Loader2,
  Trash2,
  ShieldAlert,
  Key,
  Eye,
  EyeOff,
  AlertTriangle,
  Zap,
  Calendar,
  Clock,
} from 'lucide-react';

interface WebFormModalProps {
  webForms: FormularioWeb[];
  itens: ItemAcervo[];
  googleAccount?: GoogleAccountConfig;
  clientes?: Cliente[];
  onCreateGoogleForm?: (titulo: string, itemIds: number[], percentualCalcao?: number) => void;
  onSimulateCustomerSubmit: (
    formId: string,
    clienteNome: string,
    clienteTelefone: string,
    itemIds: number[],
    dataRetirada: number,
    dataDevolucao: number
  ) => void;
  onUpdateGoogleAccount?: (config: GoogleAccountConfig) => void;
  onDeleteWebForm?: (id: string) => void;
  empresaConfig?: EmpresaConfig;
  hideHeader?: boolean;
}

export const WebFormModal: React.FC<WebFormModalProps> = ({
  webForms,
  itens,
  googleAccount,
  clientes = [],
  onCreateGoogleForm,
  onSimulateCustomerSubmit,
  onUpdateGoogleAccount,
  onDeleteWebForm,
  empresaConfig,
  hideHeader = false,
}) => {
  const isGoogleDriveEnabled = empresaConfig?.habilitarGoogleDrive !== false;
  const isGoogleFormsEnabled = empresaConfig?.habilitarGoogleForms !== false;

  const [selectedFormId, setSelectedFormId] = useState<string>(webForms[0]?.id || '');

  // Delete Budget State & Password Modal
  const [deleteTargetForm, setDeleteTargetForm] = useState<FormularioWeb | null>(null);
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [deleteSuccessNotice, setDeleteSuccessNotice] = useState<string | null>(null);

  const handleConfirmDelete = (e: React.FormEvent) => {
    e.preventDefault();
    if (!deleteTargetForm) return;

    const entered = confirmPassword.trim();
    const expectedMasterPassword = empresaConfig?.senhaAcesso || '123456';
    const isPasswordValid =
      entered === expectedMasterPassword ||
      (entered === '123456' && !empresaConfig?.senhaAcesso);

    if (!isPasswordValid) {
      setPasswordError('Senha incorreta. Verifique sua senha de acesso ao sistema.');
      return;
    }

    if (onDeleteWebForm) {
      onDeleteWebForm(deleteTargetForm.id);
    }

    setDeleteSuccessNotice(`Orçamento #${deleteTargetForm.id} excluído com sucesso!`);
    setDeleteTargetForm(null);
    setConfirmPassword('');
    setPasswordError(null);

    setTimeout(() => setDeleteSuccessNotice(null), 3500);
  };

  // Helper to build and process template dynamically
  const buildAndProcessTemplate = (clientName: string, clientPhone: string, link: string) => {
    const dummyCliente: Cliente = {
      id: 999,
      nome: clientName || 'Cliente',
      telefone: clientPhone || '',
    };

    const dummyReserva: ReservaComItens = {
      reserva: {
        id: 0,
        clienteId: 999,
        dataRetirada: Date.now(),
        dataDevolucao: Date.now() + 86400000,
        status: StatusReserva.PENDENTE,
      },
      cliente: dummyCliente,
      itens: [],
      valorTotal: 0,
      diasReserva: 1,
    };

    const templateStr = empresaConfig?.whatsappTemplates?.[StatusCicloVenda.ENVIO_FORMULARIO_PROPOSTA] || 
      DEFAULT_TEMPLATES[StatusCicloVenda.ENVIO_FORMULARIO_PROPOSTA];

    return processarTemplateWhatsApp(
      templateStr,
      dummyReserva,
      dummyCliente,
      empresaConfig,
      link
    );
  };
  const [copiedLinkId, setCopiedLinkId] = useState<string | null>(null);
  const [copiedLocalLinkId, setCopiedLocalLinkId] = useState<string | null>(null);

  // Google Drive Config Panel State
  const [showDriveConfig, setShowDriveConfig] = useState(false);
  const [isAccountModalOpen, setIsAccountModalOpen] = useState(false);
  const [isFolderModalOpen, setIsFolderModalOpen] = useState(false);
  const [customAccountEmail, setCustomAccountEmail] = useState('');
  const [isLoggingInGoogle, setIsLoggingInGoogle] = useState(false);
  const [driveNotice, setDriveNotice] = useState<string | null>(null);
  const [selectedFolderPath, setSelectedFolderPath] = useState(googleAccount?.driveFolderPath || '/Bora Festar Locações/Formulários');
  const [showCreateFolderInput, setShowCreateFolderInput] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');

  const handleSelectAccount = (email: string, name: string) => {
    if (onUpdateGoogleAccount) {
      onUpdateGoogleAccount({
        isConnected: true,
        email,
        displayName: name,
        connectedAt: Date.now(),
        driveFolderPath: googleAccount?.driveFolderPath || '/Bora Festar Locações/Formulários',
      });
    }
    setIsAccountModalOpen(false);
    setDriveNotice(`Conta alterada para ${email} com sucesso!`);
    setTimeout(() => setDriveNotice(null), 3500);
  };

  const handleSaveSelectedFolder = () => {
    const finalPath = selectedFolderPath.trim() || '/';
    if (onUpdateGoogleAccount) {
      onUpdateGoogleAccount({
        isConnected: googleAccount?.isConnected ?? true,
        email: googleAccount?.email || 'locadora.borafestar@gmail.com',
        displayName: googleAccount?.displayName || 'Bora Festar Locações',
        connectedAt: googleAccount?.connectedAt || Date.now(),
        driveFolderPath: finalPath,
      });
    }
    setIsFolderModalOpen(false);
    setShowCreateFolderInput(false);
    setDriveNotice(`Pasta de destino alterada para "${finalPath}"!`);
    setTimeout(() => setDriveNotice(null), 3500);
  };

  // WhatsApp Share Modal State
  const [isShareWhatsappModalOpen, setIsShareWhatsappModalOpen] = useState(false);
  const [sharingForm, setSharingForm] = useState<FormularioWeb | null>(null);
  const [targetClientName, setTargetClientName] = useState('');
  const [targetClientPhone, setTargetClientPhone] = useState('');
  const [customMessage, setCustomMessage] = useState('');
  const [linkTypeToSend, setLinkTypeToSend] = useState<'google' | 'interactive'>('interactive');

  const getBaseDomain = () => {
    return window.location.origin.includes('localhost') || window.location.origin.includes('ais-dev') || window.location.origin.includes('ais-pre')
      ? window.location.origin
      : 'https://acervus.ai.studio';
  };

  const updateTemplateMessage = (name: string, phone: string, type: 'google' | 'interactive', form: FormularioWeb | null) => {
    if (!form) return;
    const activeTenant = getActiveTenantId();
    const baseDomain = getBaseDomain();
    const useGoogle = type === 'google' && isGoogleFormsEnabled;
    const url = useGoogle
      ? (form.googleFormUrl || `https://docs.google.com/forms/d/e/1FAIpQLSc_${form.id}_${form.googleDriveFileId || 'drive'}/viewform`)
      : `${baseDomain}${window.location.pathname}?proposta=${form.id}&tenant=${activeTenant}`;
    
    setCustomMessage(buildAndProcessTemplate(name, phone, url));
  };

  const handleOpenShareWhatsapp = (form: FormularioWeb, initialType: 'google' | 'interactive' = 'interactive') => {
    setSharingForm(form);
    const effectiveType = isGoogleFormsEnabled ? initialType : 'interactive';
    setLinkTypeToSend(effectiveType);

    let resolvedName = form.clienteNome || '';
    let resolvedPhone = form.clienteTelefone || '';

    if (form.clienteId && clientes && clientes.length > 0) {
      const foundClient = clientes.find(c => c.id === form.clienteId);
      if (foundClient) {
        if (!resolvedName) resolvedName = foundClient.nome;
        if (!resolvedPhone) resolvedPhone = foundClient.telefone;
      }
    }

    setTargetClientName(resolvedName);
    setTargetClientPhone(resolvedPhone);
    
    const activeTenant = getActiveTenantId();
    const baseDomain = getBaseDomain();
    const useGoogle = effectiveType === 'google' && isGoogleFormsEnabled;
    const url = useGoogle
      ? (form.googleFormUrl || `https://docs.google.com/forms/d/e/1FAIpQLSc_${form.id}_${form.googleDriveFileId || 'drive'}/viewform`)
      : `${baseDomain}${window.location.pathname}?proposta=${form.id}&tenant=${activeTenant}`;
      
    const processedMsg = buildAndProcessTemplate(resolvedName, resolvedPhone, url);
    setCustomMessage(processedMsg);
    setIsShareWhatsappModalOpen(true);
  };

  const handleSendWhatsapp = () => {
    if (!targetClientPhone) return;
    const cleanPhone = targetClientPhone.replace(/\D/g, '');
    const encodedText = encodeURIComponent(customMessage);
    const waUrl = `https://api.whatsapp.com/send?phone=${cleanPhone}&text=${encodedText}`;
    window.open(waUrl, '_blank');
    setIsShareWhatsappModalOpen(false);
  };

  // New Google Form Modal State
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [newFormTitle, setNewFormTitle] = useState('Orçamento de Equipamentos para Evento');
  const [newFormPercentualCalcao, setNewFormPercentualCalcao] = useState<number>(() => empresaConfig?.painelConfiguracao?.percentualSinalPadrao ?? 50);
  const [selectedItemIds, setSelectedItemIds] = useState<number[]>(itens.slice(0, 3).map((i) => i.id));
  const [isGeneratingInDrive, setIsGeneratingInDrive] = useState(false);
  const [isSimulatorModalOpen, setIsSimulatorModalOpen] = useState(false);

  // Simulation form inputs
  const [simNome, setSimNome] = useState('Mariana Lima');
  const [simTelefone, setSimTelefone] = useState('5511999887766');
  const [simItemIds, setSimItemIds] = useState<number[]>([]);

  // Google Picker Integration State & Action
  const [selectedDriveFile, setSelectedDriveFile] = useState<{ id: string; name: string; url: string; mimeType: string } | null>(null);
  const [pickerError, setPickerError] = useState<string | null>(null);
  const [isLoadingPicker, setIsLoadingPicker] = useState(false);

  const handleOpenGooglePicker = async () => {
    try {
      setPickerError(null);
      setIsLoadingPicker(true);
      let token = await getAccessToken();
      if (!token) {
        const signInResult = await googleSignIn();
        if (signInResult) {
          token = signInResult.accessToken;
        }
      }
      if (!token) {
        setPickerError('Conecte ao Google Drive primeiro para habilitar o Google Picker.');
        setIsLoadingPicker(false);
        return;
      }
      await showGooglePicker(token, 'all', (selectedItem) => {
        setSelectedDriveFile(selectedItem);
      });
    } catch (err: any) {
      console.error(err);
      setPickerError('Erro ao abrir Google Picker: ' + (err.message || 'Pop-up bloqueado ou sem permissão'));
    } finally {
      setIsLoadingPicker(false);
    }
  };

  const handleFocusScroll = (e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setTimeout(() => {
      e.target.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }, 150);
  };

  const selectedForm = webForms.find((f) => f.id === selectedFormId) || webForms[0];

  const handleCopyLink = (form: FormularioWeb) => {
    const activeTenant = getActiveTenantId();
    const baseDomain = getBaseDomain();
    const linkToCopy = (isGoogleFormsEnabled && form.googleFormUrl)
      ? form.googleFormUrl
      : `${baseDomain}${window.location.pathname}?proposta=${form.id}&tenant=${activeTenant}`;
    navigator.clipboard.writeText(linkToCopy);
    setCopiedLinkId(form.id);
    setTimeout(() => setCopiedLinkId(null), 2000);
  };

  const handleToggleSelectItem = (itemId: number) => {
    if (selectedItemIds.includes(itemId)) {
      setSelectedItemIds(selectedItemIds.filter((id) => id !== itemId));
    } else {
      setSelectedItemIds([...selectedItemIds, itemId]);
    }
  };

  const handleConfirmCreateForm = (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedItemIds.length === 0) return;

    setIsGeneratingInDrive(true);
    setTimeout(() => {
      if (onCreateGoogleForm) {
        onCreateGoogleForm(newFormTitle, selectedItemIds, newFormPercentualCalcao);
      }
      setIsGeneratingInDrive(false);
      setIsCreateModalOpen(false);
    }, 800);
  };

  const handleSimulateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedForm) return;

    const itemsToSubmit = simItemIds.length > 0 ? simItemIds : selectedForm.itens.map((i) => i.id);

    const today = new Date();
    const tRetirada = today.getTime() + 1000 * 60 * 60 * 24 * 2;
    const tDevolucao = today.getTime() + 1000 * 60 * 60 * 24 * 5;

    onSimulateCustomerSubmit(selectedForm.id, simNome, simTelefone, itemsToSubmit, tRetirada, tDevolucao);
    setIsSimulatorModalOpen(false);
  };

  return (
    <div className="space-y-6">
      {/* Top Banner Header */}
      {!hideHeader ? (
        <div className="bg-[#111113] p-5 rounded-2xl border border-[#27272A] flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 shadow-xl">
          <div>
            <h2 className="text-xl font-serif italic text-white flex items-center gap-2">
              <Share2 className="text-[#D4AF37]" size={22} />
              Módulo de Gerenciamento de Orçamentos
            </h2>
            <p className="text-[#A1A1AA] text-xs mt-0.5">
              {localStorage.getItem('modo_desenvolvedor') === 'true' 
                ? 'Crie e gerencie orçamentos com acervo do Google Drive/Firestore e compartilhe propostas interativas via WhatsApp.'
                : 'Crie e compartilhe propostas e orçamentos do seu acervo com links públicos e acompanhamento para clientes.'}
            </p>
          </div>

          <div className="flex flex-col sm:flex-row sm:flex-wrap items-stretch sm:items-center gap-2.5 w-full lg:w-auto">
            <button
              onClick={() => setIsCreateModalOpen(true)}
              className="flex items-center justify-center gap-2 bg-[#D4AF37] hover:bg-[#c4a02e] text-black px-4 py-2.5 sm:py-2 rounded-xl text-xs font-bold transition-all shadow-lg cursor-pointer w-full sm:w-auto shrink-0 whitespace-nowrap"
            >
              <Plus size={16} />
              <span>Gerar Novo Orçamento</span>
            </button>

            {isGoogleDriveEnabled && (
              <button
                onClick={handleOpenGooglePicker}
                disabled={isLoadingPicker}
                className="flex items-center justify-center gap-2 bg-[#18181B] border border-[#27272A] hover:bg-[#27272A] text-white px-4 py-2.5 sm:py-2 rounded-xl text-xs font-bold transition-all cursor-pointer w-full sm:w-auto shrink-0 whitespace-nowrap"
              >
                <FolderOpen size={16} className="text-[#D4AF37]" />
                <span>{isLoadingPicker ? 'Abrindo...' : 'Abrir Google Picker'}</span>
              </button>
            )}
          </div>
        </div>
      ) : (
        <div className="flex flex-col sm:flex-row justify-end items-center gap-2.5">
          <button
            onClick={() => setIsCreateModalOpen(true)}
            className="flex items-center justify-center gap-2 bg-[#D4AF37] hover:bg-[#c4a02e] text-black px-4 py-2.5 sm:py-2 rounded-xl text-xs font-bold transition-all shadow-lg cursor-pointer w-full sm:w-auto shrink-0 whitespace-nowrap"
          >
            <Plus size={16} />
            <span>Gerar Novo Orçamento</span>
          </button>

          {isGoogleDriveEnabled && (
            <button
              onClick={handleOpenGooglePicker}
              disabled={isLoadingPicker}
              className="flex items-center justify-center gap-2 bg-[#18181B] border border-[#27272A] hover:bg-[#27272A] text-white px-4 py-2.5 sm:py-2 rounded-xl text-xs font-bold transition-all cursor-pointer w-full sm:w-auto shrink-0 whitespace-nowrap"
            >
              <FolderOpen size={16} className="text-[#D4AF37]" />
              <span>{isLoadingPicker ? 'Abrindo...' : 'Abrir Google Picker'}</span>
            </button>
          )}
        </div>
      )}

      {/* Google Drive API Connector Card (Exact Instagram Sorteios Connector Pattern) */}
      {isGoogleDriveEnabled && (
        <div className="bg-[#111113] border border-[#27272A] p-5 rounded-2xl space-y-4 shadow-xl">
        <div className="flex items-center justify-between border-b border-[#27272A] pb-3">
          <div className="flex items-center gap-2">
            <HardDrive size={16} className="text-[#D4AF37]" />
            <h3 className="text-sm font-bold text-white uppercase tracking-wider font-mono">
              Conector Google Forms & Drive API
            </h3>
          </div>
          <button
            type="button"
            onClick={() => setShowDriveConfig(!showDriveConfig)}
            className="bg-[#18181B] hover:bg-[#27272A] text-[#D4AF37] border border-[#D4AF37]/20 px-2.5 py-1 rounded-lg text-[10px] font-bold font-mono transition-all cursor-pointer flex items-center gap-1"
          >
            <Code2 size={10} />
            {showDriveConfig ? 'RECOLHER' : 'CONFIGURAR'}
          </button>
        </div>

        {/* Security / Connection Summary Banner */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-3 rounded-xl border bg-[#18181B] border-[#27272A]">
          <div className="flex items-center gap-2">
            <div className={`w-2.5 h-2.5 rounded-full ${googleAccount?.isConnected ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'}`} />
            <span className="text-xs font-mono text-white font-bold">
              {googleAccount?.isConnected 
                ? `Conta Conectada: ${googleAccount.email}`
                : 'Nenhuma conta do Google conectada ao aplicativo'
              }
            </span>
          </div>
          <span className="text-[11px] text-[#A1A1AA] font-mono">
            Pasta: <strong className="text-white">{googleAccount?.driveFolderPath || '/Bora Festar Locações/Formulários'}</strong>
          </span>
        </div>

        {/* Expanded Configuration Panel */}
        {showDriveConfig && (
          <div className="pt-2 space-y-4 border-t border-[#27272A] animate-fadeIn">
            {/* Notification Banner */}
            {driveNotice && (
              <div className="bg-[#D4AF37]/10 border border-[#D4AF37]/40 p-3 rounded-xl text-xs text-[#D4AF37] flex items-center gap-2 animate-fadeIn">
                <CheckCircle2 size={16} className="shrink-0" />
                <span>{driveNotice}</span>
              </div>
            )}

            {/* Account & Folder Status Details */}
            {googleAccount?.isConnected ? (
              <div className="bg-[#18181B] border border-[#27272A] p-4.5 rounded-2xl space-y-4">
                {/* Connected Account Info Row */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#27272A]">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-[#D4AF37]/20 text-[#D4AF37] flex items-center justify-center font-bold text-sm border border-[#D4AF37]/30 shrink-0">
                      G
                    </div>
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <h4 className="text-white text-xs font-bold">
                          {googleAccount.email || 'locadora.borafestar@gmail.com'}
                        </h4>
                        <span className="bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-[10px] px-2 py-0.5 rounded-full font-medium flex items-center gap-1">
                          <CheckCircle2 size={11} /> Conta Conectada
                        </span>
                      </div>
                      <p className="text-[#A1A1AA] text-[11px] mt-0.5">
                        {googleAccount.displayName || 'Bora Festar Locações'}
                      </p>
                    </div>
                  </div>

                  {/* Account Action Buttons */}
                  <div className="flex items-center gap-2 flex-wrap">
                    <button
                      type="button"
                      onClick={() => setIsAccountModalOpen(true)}
                      className="flex items-center justify-center gap-1.5 bg-[#27272A] hover:bg-[#3F3F46] text-white border border-[#3F3F46] px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer"
                    >
                      <UserCheck size={14} className="text-[#D4AF37]" />
                      <span>Alterar Conta</span>
                    </button>

                    <button
                      type="button"
                      onClick={() =>
                        onUpdateGoogleAccount &&
                        onUpdateGoogleAccount({
                          ...googleAccount,
                          isConnected: false,
                        })
                      }
                      className="flex items-center justify-center gap-1.5 bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/30 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer shrink-0"
                    >
                      <LogOut size={14} />
                      <span>Desconectar</span>
                    </button>
                  </div>
                </div>

                {/* Destination Folder Row */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-[#111113] p-3.5 rounded-xl border border-[#27272A]">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-xl bg-[#D4AF37]/10 text-[#D4AF37] border border-[#D4AF37]/20 shrink-0">
                      <FolderGit2 size={16} />
                    </div>
                    <div>
                      <span className="text-[10px] text-[#A1A1AA] uppercase font-bold tracking-wider block">
                        Pasta de Destino no Google Drive
                      </span>
                      <span className="text-white text-xs font-semibold font-mono mt-0.5 block">
                        {googleAccount.driveFolderPath || '/Bora Festar Locações/Formulários'}
                      </span>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => setIsFolderModalOpen(true)}
                    className="flex items-center justify-center gap-1.5 bg-[#18181B] hover:bg-[#27272A] text-white border border-[#3F3F46] px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer shrink-0"
                  >
                    <FolderPlus size={14} className="text-[#D4AF37]" />
                    <span>Alterar Pasta</span>
                  </button>
                </div>
              </div>
            ) : (
              <div className="bg-[#18181B] border border-[#27272A] p-5 rounded-2xl text-center space-y-3">
                <div className="w-10 h-10 rounded-full bg-[#D4AF37]/10 text-[#D4AF37] mx-auto flex items-center justify-center">
                  <HardDrive size={20} />
                </div>
                <div>
                  <h4 className="text-white text-xs font-bold">Nenhuma Conta Conectada</h4>
                  <p className="text-[#A1A1AA] text-xs max-w-md mx-auto mt-1">
                    Conecte sua conta do Google para armazenar automaticamente formulários e contratos no Google Drive.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setCustomAccountEmail(googleAccount?.email || '');
                    setIsAccountModalOpen(true);
                  }}
                  className="inline-flex items-center justify-center gap-2 bg-[#D4AF37] hover:bg-[#c4a02e] text-black px-4 py-2 rounded-xl text-xs font-bold transition-all shadow-lg cursor-pointer"
                >
                  <LogIn size={15} />
                  <span>Conectar Conta do Google</span>
                </button>
              </div>
            )}
          </div>
        )}
      </div>
      )}

      {pickerError && (
        <div className="bg-red-500/10 border border-red-500/30 p-4 rounded-2xl text-xs text-red-400 flex items-center justify-between">
          <span>{pickerError}</span>
          <button onClick={() => setPickerError(null)} className="text-red-400 hover:text-white">
            <X size={14} />
          </button>
        </div>
      )}

      {selectedDriveFile && (
        <div className="bg-[#D4AF37]/5 border border-[#D4AF37]/30 p-4 rounded-2xl flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 shadow-xl border-dashed">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#D4AF37]/10 border border-[#D4AF37]/30 flex items-center justify-center text-[#D4AF37]">
              <File size={20} />
            </div>
            <div>
              <span className="text-[10px] font-bold text-[#D4AF37] uppercase tracking-wider block">Arquivo Selecionado do Google Drive</span>
              <span className="text-white font-serif italic text-sm font-semibold">{selectedDriveFile.name}</span>
              {localStorage.getItem('modo_desenvolvedor') === 'true' && (
                <span className="text-[11px] text-[#A1A1AA] block font-mono mt-0.5">MimeType: {selectedDriveFile.mimeType} • ID: {selectedDriveFile.id}</span>
              )}
            </div>
          </div>
          <div className="flex gap-2 w-full sm:w-auto">
            <a
              href={selectedDriveFile.url}
              target="_blank"
              rel="noreferrer"
              className="flex-1 sm:flex-initial px-4 py-2 bg-[#18181B] border border-[#27272A] hover:bg-[#27272A] text-white text-xs font-bold rounded-xl flex items-center justify-center gap-1.5 transition-all"
            >
              <ExternalLink size={14} />
              <span>Visualizar</span>
            </a>
            <button
              onClick={() => {
                navigator.clipboard.writeText(selectedDriveFile.url);
                alert('URL copiada para a área de transferência!');
              }}
              className="flex-1 sm:flex-initial px-4 py-2 bg-[#D4AF37] text-black text-xs font-bold rounded-xl flex items-center justify-center gap-1.5 transition-all cursor-pointer"
            >
              <Copy size={14} />
              <span>Copiar Link</span>
            </button>
            <button
              onClick={() => setSelectedDriveFile(null)}
              className="p-2 bg-[#18181B] border border-[#27272A] text-[#71717A] hover:text-white rounded-xl transition-all cursor-pointer"
            >
              <X size={14} />
            </button>
          </div>
        </div>
      )}

      <div className="w-full max-w-4xl mx-auto">
        {/* Left: Form Links List */}
        <div className="bg-[#111113] border border-[#27272A] rounded-2xl p-6 shadow-xl space-y-4">
          <div className="flex items-center justify-between border-b border-[#27272A] pb-3">
            <h3 className="font-serif italic text-white text-base flex items-center gap-2">
              <Sparkles className="text-[#D4AF37]" size={18} />
              Orçamentos Registrados ({webForms.length})
            </h3>
            <span className="text-[11px] text-[#A1A1AA]">Histórico de Orçamentos</span>
          </div>

          {deleteSuccessNotice && (
            <div className="bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 px-3.5 py-2 rounded-xl text-xs flex items-center gap-2 font-medium animate-fade-in">
              <CheckCircle2 size={16} className="shrink-0" />
              <span>{deleteSuccessNotice}</span>
            </div>
          )}

          <div className="space-y-3">
            {webForms.map((form) => {
              const isSelected = form.id === selectedFormId;
              const activeTenant = getActiveTenantId();
              const baseDomain = getBaseDomain();
              const formUrl = (isGoogleFormsEnabled && form.googleFormUrl)
                ? form.googleFormUrl
                : `${baseDomain}${window.location.pathname}?proposta=${form.id}&tenant=${activeTenant}`;

              return (
                <div
                  key={form.id}
                  onClick={() => setSelectedFormId(form.id)}
                  className={`p-4 rounded-xl border text-sm cursor-pointer transition-all space-y-3 ${
                    isSelected
                      ? 'bg-[#18181B] border-[#D4AF37] text-white shadow-lg'
                      : 'bg-[#0A0A0B] border-[#27272A] text-[#A1A1AA] hover:border-[#3F3F46]'
                  }`}
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div className="space-y-1 min-w-0 flex-1">
                      <span className="font-semibold text-[#D4AF37] flex items-center gap-1.5 truncate">
                        <FileSpreadsheet size={15} className="shrink-0" />
                        <span className="truncate">{form.titulo}</span>
                      </span>

                      {/* DATA E HORA DE GERAÇÃO DO ORÇAMENTO */}
                      <div className="flex items-center gap-1.5 text-xs text-[#A1A1AA] font-mono">
                        <Calendar size={13} className="text-[#D4AF37] shrink-0" />
                        <span>
                          {form.criadoEm
                            ? `Gerado em: ${new Date(form.criadoEm).toLocaleDateString('pt-BR')} às ${new Date(form.criadoEm).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`
                            : 'Data de geração não informada'}
                        </span>
                      </div>
                    </div>

                    {form.respondido ? (
                      <span className="bg-[#18181B] border border-emerald-500/30 text-emerald-400 text-xs px-2.5 py-0.5 rounded-full font-semibold flex items-center gap-1 w-fit shrink-0">
                        <CheckCircle2 size={12} /> Respondido
                      </span>
                    ) : (
                      <span className="bg-[#18181B] border border-[#D4AF37]/30 text-[#D4AF37] text-xs px-2.5 py-0.5 rounded-full font-semibold w-fit shrink-0">
                        Aguardando Resposta
                      </span>
                    )}
                  </div>

                  <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                    <p className="text-[#71717A] line-clamp-1 flex-1">
                      Equipamentos inclusos: {form.itens.map((i) => i.nome).join(', ')}
                    </p>
                    <span className="bg-[#D4AF37]/10 text-[#D4AF37] border border-[#D4AF37]/30 text-[10px] px-2 py-0.5 rounded-full font-mono font-bold shrink-0">
                      Calção Garantia: {form.percentualCalcao !== undefined ? form.percentualCalcao : 30}%
                    </span>
                  </div>

                  {/* Google Drive File & Form URL Box */}
                  {isGoogleFormsEnabled && (
                    <div className="bg-[#111113] p-2.5 rounded-lg border border-[#27272A] text-[11px] font-mono space-y-1 overflow-hidden">
                      <div className="flex items-center justify-between text-[#D4AF37]">
                        <span className="flex items-center gap-1 w-full min-w-0">
                          <Globe size={13} className="shrink-0" />
                          <a
                            href={formUrl}
                            target="_blank"
                            rel="noreferrer"
                            onClick={(e) => e.stopPropagation()}
                            className="hover:underline truncate block w-full"
                          >
                            {formUrl}
                          </a>
                        </span>
                      </div>
                      {form.googleDriveFileId && (
                        <p className="text-[10px] text-[#71717A] flex items-center gap-1 truncate">
                          <HardDrive size={11} className="shrink-0" />{' '}
                          {localStorage.getItem('modo_desenvolvedor') === 'true' 
                            ? `Arquivo Drive: ${form.googleDriveFileId}` 
                            : 'Documento Vinculado no Google Drive'}
                        </p>
                      )}
                    </div>
                  )}

                  {/* Custom Interactive Proposal Links */}
                  <div className="bg-[#18181B] border border-[#27272A]/80 p-3 rounded-xl space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold text-[#D4AF37] uppercase tracking-wider flex items-center gap-1">
                        <Sparkles size={11} /> Proposta Interativa Acervus
                      </span>
                      <span className="bg-[#D4AF37]/10 text-[#D4AF37] text-[8px] px-1.5 py-0.5 rounded border border-[#D4AF37]/20 font-mono font-bold">AUTOMÁTICO</span>
                    </div>
                    <div className="flex flex-wrap items-center gap-2.5">
                      <a
                        href={`${window.location.origin}${window.location.pathname}?proposta=${form.id}&tenant=${getActiveTenantId()}`}
                        target="_blank"
                        rel="noreferrer"
                        onClick={(e) => e.stopPropagation()}
                        className="text-xs bg-[#D4AF37]/10 hover:bg-[#D4AF37]/25 text-white border border-[#D4AF37]/30 px-2.5 py-1 rounded-lg flex items-center gap-1 font-bold transition-all"
                      >
                        <ExternalLink size={12} className="text-[#D4AF37]" />
                        <span>Visualizar Link do Cliente</span>
                      </a>

                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          const localProposalUrl = `${window.location.origin}${window.location.pathname}?proposta=${form.id}&tenant=${getActiveTenantId()}`;
                          navigator.clipboard.writeText(localProposalUrl);
                          setCopiedLocalLinkId(form.id);
                          setTimeout(() => setCopiedLocalLinkId(null), 2000);
                        }}
                        className="text-xs text-white hover:text-[#D4AF37] flex items-center gap-1 cursor-pointer transition-colors"
                      >
                        {copiedLocalLinkId === form.id ? <Check size={12} className="text-emerald-400" /> : <Copy size={12} />}
                        <span>{copiedLocalLinkId === form.id ? 'Copiado!' : 'Copiar Link'}</span>
                      </button>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-[#27272A]">
                    <span className="text-[11px] text-[#71717A]">Código: #{form.id}</span>

                    <div className="flex items-center gap-2.5">
                      <a
                        href={formUrl}
                        target="_blank"
                        rel="noreferrer"
                        onClick={(e) => e.stopPropagation()}
                        className="text-xs text-[#71717A] hover:text-[#D4AF37] flex items-center gap-1 transition-colors"
                      >
                        <ExternalLink size={12} />
                        <span>Form</span>
                      </a>

                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleCopyLink(form);
                        }}
                        className="text-xs text-[#71717A] hover:text-[#D4AF37] flex items-center gap-1 cursor-pointer transition-colors"
                      >
                        {copiedLinkId === form.id ? <Check size={12} /> : <Copy size={12} />}
                        <span>{copiedLinkId === form.id ? 'Copiado' : 'Copiar URL'}</span>
                      </button>

                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedFormId(form.id);
                          setIsSimulatorModalOpen(true);
                        }}
                        className="text-xs text-[#D4AF37] hover:underline flex items-center gap-1 cursor-pointer transition-colors font-semibold"
                        title="Simular resposta do cliente em modo modal"
                      >
                        <Zap size={12} />
                        <span>Simular Resposta</span>
                      </button>

                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleOpenShareWhatsapp(form, 'interactive');
                        }}
                        className="text-xs text-emerald-400 hover:text-emerald-300 flex items-center gap-1 cursor-pointer font-bold transition-colors"
                      >
                        <MessageSquare size={12} />
                        <span>Compartilhar</span>
                      </button>

                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setDeleteTargetForm(form);
                          setConfirmPassword('');
                          setPasswordError(null);
                        }}
                        className="text-xs text-red-400 hover:text-red-300 flex items-center gap-1 cursor-pointer font-semibold transition-colors px-2 py-0.5 rounded bg-red-500/10 border border-red-500/20 hover:bg-red-500/20"
                        title="Excluir Orçamento mediante confirmação de senha"
                      >
                        <Trash2 size={12} />
                        <span>Excluir</span>
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* CREATE NEW GOOGLE FORM MODAL */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#111113] border border-[#27272A] rounded-2xl max-w-md w-full p-6 space-y-5 shadow-2xl relative">
            <div className="flex justify-between items-center border-b border-[#27272A] pb-3">
              <h3 className="font-serif italic text-white text-lg flex items-center gap-2">
                <HardDrive className="text-[#D4AF37]" size={20} />
                Gerar Google Form no Drive
              </h3>
              <button
                onClick={() => setIsCreateModalOpen(false)}
                className="text-[#A1A1AA] hover:text-white cursor-pointer"
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleConfirmCreateForm} className="space-y-4 text-xs">
              <div>
                <label className="block text-[#A1A1AA] font-bold mb-1">Título do Formulário</label>
                <input
                  type="text"
                  required
                  value={newFormTitle}
                  onChange={(e) => setNewFormTitle(e.target.value)}
                  onFocus={handleFocusScroll}
                  className="w-full px-3 py-2 bg-[#18181B] border border-[#27272A] rounded-xl text-white focus:border-[#D4AF37] focus:outline-none"
                  placeholder="Ex: Formulário de Seleção para Aniversário"
                />
              </div>

              {/* CALÇÃO DE GARANTIA DE RESERVA */}
              <div className="bg-[#18181B] p-3 rounded-xl border border-[#D4AF37]/30 space-y-2">
                <label className="block text-xs font-bold text-[#D4AF37] uppercase tracking-wider flex items-center justify-between">
                  <span>Percentual de Calção (Garantia de Reserva)</span>
                  <span className="text-[#D4AF37] font-mono text-sm">{newFormPercentualCalcao}%</span>
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={newFormPercentualCalcao}
                    onChange={(e) => setNewFormPercentualCalcao(Math.max(0, Math.min(100, Number(e.target.value) || 0)))}
                    onFocus={handleFocusScroll}
                    className="w-24 px-3 py-2 bg-[#111113] border border-[#27272A] rounded-xl text-white font-mono text-center font-bold focus:border-[#D4AF37] focus:outline-none"
                  />
                  <div className="flex items-center gap-1.5 flex-wrap">
                    {[10, 20, 30, 50, 100].map((pct) => (
                      <button
                        key={pct}
                        type="button"
                        onClick={() => setNewFormPercentualCalcao(pct)}
                        className={`px-2.5 py-1.5 rounded-lg border text-[11px] font-bold cursor-pointer transition-all ${
                          newFormPercentualCalcao === pct
                            ? 'bg-[#D4AF37] text-black border-[#D4AF37]'
                            : 'bg-[#111113] text-[#A1A1AA] border-[#27272A] hover:text-white'
                        }`}
                      >
                        {pct}%
                      </button>
                    ))}
                  </div>
                </div>
                <p className="text-[10px] text-[#71717A]">
                  Este percentual será aplicado sobre o valor total do orçamento para garantia e reserva dos itens pelo cliente.
                </p>
              </div>

              <div>
                <label className="block text-[#A1A1AA] font-bold mb-2">Selecione os Equipamentos Inclusos</label>
                <div className="max-h-48 overflow-y-auto space-y-1.5 pr-1">
                  {itens.map((item) => {
                    const isChecked = selectedItemIds.includes(item.id);
                    return (
                      <div
                        key={item.id}
                        onClick={() => handleToggleSelectItem(item.id)}
                        className={`p-2.5 rounded-xl border flex items-center justify-between cursor-pointer transition-all ${
                          isChecked
                            ? 'bg-[#18181B] border-[#D4AF37] text-white'
                            : 'bg-[#0A0A0B] border-[#27272A] text-[#A1A1AA]'
                        }`}
                      >
                        <div className="flex items-center gap-2 truncate">
                          {isChecked ? (
                            <CheckSquare size={16} className="text-[#D4AF37] shrink-0" />
                          ) : (
                            <Square size={16} className="text-[#71717A] shrink-0" />
                          )}
                          <span className="truncate">{item.nome}</span>
                        </div>
                        <span className="font-serif italic text-[#D4AF37] text-[11px] shrink-0">
                          {formatarMoeda(item.precoAluguel)}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {localStorage.getItem('modo_desenvolvedor') === 'true' ? (
                <div className="bg-[#18181B] p-3 rounded-xl border border-[#27272A] text-[11px] font-mono text-[#A1A1AA] space-y-1">
                  <span className="text-white font-bold block">Escopo Google OAuth: DRIVE_FILE</span>
                  <p>O formulário será criado na pasta oficial do Google Drive da sua conta conectada.</p>
                </div>
              ) : (
                <div className="bg-[#18181B] p-3 rounded-xl border border-[#27272A] text-xs text-[#A1A1AA]">
                  <p>O formulário de orçamento será gerado e guardado de forma segura na sua pasta integrada do Google Drive.</p>
                </div>
              )}

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="px-4 py-2 bg-[#18181B] text-[#A1A1AA] hover:text-white rounded-xl cursor-pointer"
                >
                  Cancelar
                </button>

                <button
                  type="submit"
                  disabled={isGeneratingInDrive || selectedItemIds.length === 0}
                  className="px-5 py-2 bg-[#D4AF37] hover:bg-[#c4a02e] disabled:opacity-40 text-black font-bold uppercase tracking-wider text-xs rounded-xl shadow-lg flex items-center gap-2 cursor-pointer"
                >
                  {isGeneratingInDrive ? (
                    <>
                      <div className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin" />
                      <span>Criando no Drive...</span>
                    </>
                  ) : (
                    <>
                      <HardDrive size={15} />
                      <span>Criar no Google Drive</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* SHARE VIA WHATSAPP MODAL */}
      {isShareWhatsappModalOpen && sharingForm && (
        <div className="fixed inset-0 bg-black/85 backdrop-blur-md z-50 flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-[#18181B] border border-[#27272A] w-full max-w-md rounded-2xl p-6 space-y-5 shadow-2xl relative">
            <button
              onClick={() => setIsShareWhatsappModalOpen(false)}
              className="absolute top-4 right-4 text-[#A1A1AA] hover:text-white transition-colors cursor-pointer"
            >
              <X size={18} />
            </button>

            <div className="flex items-center gap-3 border-b border-[#27272A] pb-4">
              <div className="w-10 h-10 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold text-sm border border-emerald-500/30 shrink-0">
                <MessageSquare size={18} />
              </div>
              <div>
                <h3 className="text-white text-sm font-bold">Enviar Formulário por WhatsApp</h3>
                <p className="text-[#A1A1AA] text-xs">
                  Envie o link do orçamento diretamente para o WhatsApp do seu cliente.
                </p>
              </div>
            </div>

            <div className="space-y-4 text-xs">
              {/* LINK TYPE SELECTOR (Android MD3-style Segmented Buttons) */}
              <div>
                <label className="block text-xs font-semibold text-[#E4E4E7] mb-2">
                  Qual link deseja enviar para o cliente?
                </label>
                <div className={`grid ${isGoogleFormsEnabled ? 'grid-cols-2' : 'grid-cols-1'} gap-2`}>
                  <button
                    type="button"
                    onClick={() => {
                      setLinkTypeToSend('interactive');
                      updateTemplateMessage(targetClientName, targetClientPhone, 'interactive', sharingForm);
                    }}
                    className={`p-3 rounded-xl border text-left flex flex-col justify-between gap-1 transition-all cursor-pointer ${
                      linkTypeToSend === 'interactive' || !isGoogleFormsEnabled
                        ? 'bg-[#D4AF37]/10 border-[#D4AF37] text-white font-bold'
                        : 'bg-[#111113] border-[#27272A] text-[#A1A1AA] hover:border-[#3F3F46]'
                    }`}
                  >
                    <div className="flex items-center gap-1.5">
                      <Sparkles size={14} className={linkTypeToSend === 'interactive' || !isGoogleFormsEnabled ? 'text-[#D4AF37]' : 'text-[#71717A]'} />
                      <span className="text-xs">Link Interativo da Proposta</span>
                    </div>
                    <span className="text-[10px] text-[#71717A] font-normal leading-normal">
                      Aprovação online e reserva imediata no aplicativo.
                    </span>
                  </button>

                  {isGoogleFormsEnabled && (
                    <button
                      type="button"
                      onClick={() => {
                        setLinkTypeToSend('google');
                        updateTemplateMessage(targetClientName, targetClientPhone, 'google', sharingForm);
                      }}
                      className={`p-3 rounded-xl border text-left flex flex-col justify-between gap-1 transition-all cursor-pointer ${
                        linkTypeToSend === 'google'
                          ? 'bg-purple-500/10 border-purple-500/40 text-white font-bold'
                          : 'bg-[#111113] border-[#27272A] text-[#A1A1AA] hover:border-[#3F3F46]'
                      }`}
                    >
                      <div className="flex items-center gap-1.5">
                        <FileSpreadsheet size={14} className={linkTypeToSend === 'google' ? 'text-purple-400' : 'text-[#71717A]'} />
                        <span className="text-xs">Google Form</span>
                      </div>
                      <span className="text-[10px] text-[#71717A] font-normal leading-normal">
                        Formulário de preenchimento convencional do Google.
                      </span>
                    </button>
                  )}
                </div>
              </div>

              {/* Client Selector Dropdown */}
              {clientes && clientes.length > 0 && (
                <div>
                  <label className="block text-xs font-semibold text-[#E4E4E7] mb-1.5">
                    Selecionar Cliente Cadastrado:
                  </label>
                  <select
                    onChange={(e) => {
                      const selectedId = e.target.value;
                      if (selectedId) {
                        const cli = clientes.find((c) => String(c.id) === selectedId);
                        if (cli) {
                          setTargetClientName(cli.nome);
                          setTargetClientPhone(cli.telefone);
                          updateTemplateMessage(cli.nome, cli.telefone, linkTypeToSend, sharingForm);
                        }
                      } else {
                        setTargetClientName('');
                        setTargetClientPhone('');
                        updateTemplateMessage('', '', linkTypeToSend, sharingForm);
                      }
                    }}
                    className="w-full px-3 py-2.5 bg-[#111113] border border-[#27272A] rounded-xl text-xs text-white focus:border-[#D4AF37] focus:outline-none"
                  >
                    <option value="">-- Digitar número manualmente --</option>
                    {clientes.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.nome} ({c.telefone})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Manual Input Fields */}
              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-semibold text-[#E4E4E7] mb-1.5">
                    Nome do Cliente
                  </label>
                  <input
                    type="text"
                    placeholder="Nome do cliente"
                    value={targetClientName}
                    onChange={(e) => {
                      const newName = e.target.value;
                      setTargetClientName(newName);
                      updateTemplateMessage(newName, targetClientPhone, linkTypeToSend, sharingForm);
                    }}
                    className="w-full px-3 py-2 bg-[#111113] border border-[#27272A] rounded-xl text-xs text-white focus:border-[#D4AF37] focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#E4E4E7] mb-1.5">
                    Número de WhatsApp
                  </label>
                  <PhoneInput
                    value={targetClientPhone}
                    onChange={(val) => {
                      setTargetClientPhone(val);
                      updateTemplateMessage(targetClientName, val, linkTypeToSend, sharingForm);
                    }}
                    placeholder="11 99999-8888"
                  />
                </div>
              </div>

              {/* Message Textarea */}
              <div>
                <label className="block text-xs font-semibold text-[#E4E4E7] mb-1.5">
                  Mensagem Personalizada:
                </label>
                <textarea
                  rows={4}
                  value={customMessage}
                  onChange={(e) => setCustomMessage(e.target.value)}
                  className="w-full px-3 py-2 bg-[#111113] border border-[#27272A] rounded-xl text-xs text-white focus:border-[#D4AF37] focus:outline-none leading-relaxed font-mono"
                />
              </div>

              {/* Action buttons */}
              <div className="flex justify-end gap-3 pt-2 border-t border-[#27272A]">
                <button
                  type="button"
                  onClick={() => setIsShareWhatsappModalOpen(false)}
                  className="px-4 py-2 bg-[#18181B] text-[#A1A1AA] hover:text-white rounded-xl cursor-pointer"
                >
                  Cancelar
                </button>

                <button
                  type="button"
                  onClick={handleSendWhatsapp}
                  disabled={!targetClientPhone}
                  className="px-5 py-2 bg-emerald-500 hover:bg-emerald-600 disabled:opacity-40 text-black font-bold uppercase tracking-wider text-xs rounded-xl shadow-lg flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <Send size={14} />
                  <span>Enviar via WhatsApp</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* SIMULATOR MODAL */}
      {isSimulatorModalOpen && selectedForm && (
        <div className="fixed inset-0 bg-black/85 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-[#111113] border border-[#27272A] w-full max-w-md rounded-2xl p-6 space-y-5 shadow-2xl relative">
            <button
              onClick={() => setIsSimulatorModalOpen(false)}
              className="absolute top-4 right-4 text-[#A1A1AA] hover:text-white transition-colors cursor-pointer"
            >
              <X size={18} />
            </button>

            <div className="flex items-center gap-3 border-b border-[#27272A] pb-4 shrink-0">
              <div className="w-10 h-10 rounded-full bg-[#D4AF37]/20 text-[#D4AF37] flex items-center justify-center font-bold text-sm border border-[#D4AF37]/30 shrink-0">
                <Zap size={18} />
              </div>
              <div>
                <h3 className="text-white text-sm font-bold">Simulador de Resposta do Cliente</h3>
                <p className="text-[#A1A1AA] text-xs">
                  {localStorage.getItem('modo_desenvolvedor') === 'true'
                    ? 'Simule o recebimento de uma resposta via Google Forms API.'
                    : 'Preencha os dados abaixo para simular a resposta de um orçamento.'}
                </p>
              </div>
            </div>

            <div className="bg-[#18181B] p-3 rounded-xl border border-[#27272A] text-xs space-y-1.5">
              <span className="text-[10px] text-[#71717A] font-bold uppercase tracking-wider block">Orçamento Selecionado</span>
              <p className="text-white font-serif italic text-sm">{selectedForm.titulo}</p>
              <p className="text-[#A1A1AA] text-[11px]">Código: #{selectedForm.id}</p>
            </div>

            <form onSubmit={handleSimulateSubmit} className="space-y-4 text-xs">
              <div className="space-y-1.5">
                <label className="block text-[#A1A1AA] font-semibold">Seu Nome Completo</label>
                <input
                  type="text"
                  required
                  value={simNome}
                  onChange={(e) => setSimNome(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-[#18181B] border border-[#27272A] rounded-xl text-white placeholder-[#71717A] focus:border-[#D4AF37] focus:outline-none text-xs"
                  placeholder="Ex: Mariana Lima"
                />
              </div>

              <div className="space-y-1.5">
                <label className="block text-[#A1A1AA] font-semibold">Seu WhatsApp</label>
                <PhoneInput
                  value={simTelefone}
                  onChange={(val) => setSimTelefone(val)}
                  required
                  placeholder="11 99999-8888"
                />
              </div>

              <div className="space-y-1.5">
                <label className="block text-[#A1A1AA] font-semibold">Itens do Orçamento</label>
                <div className="space-y-1.5 max-h-[160px] overflow-y-auto custom-scrollbar pr-1 bg-[#0A0A0B] p-3 rounded-xl border border-[#27272A]">
                  {selectedForm.itens.map((item) => (
                    <div
                      key={item.id}
                      className="bg-[#18181B] p-2 py-1.5 rounded-lg border border-[#27272A] flex justify-between items-center text-[11px]"
                    >
                      <span className="text-white font-medium truncate max-w-[200px]">{item.nome}</span>
                      <span className="text-[#D4AF37] font-serif italic shrink-0">{formatarMoeda(item.precoAluguel)} / dia</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex items-center gap-3 pt-3 border-t border-[#27272A] shrink-0">
                <button
                  type="button"
                  onClick={() => setIsSimulatorModalOpen(false)}
                  className="flex-1 bg-[#111113] hover:bg-[#27272A] text-[#A1A1AA] hover:text-white border border-[#27272A] py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer text-center"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={selectedForm.respondido}
                  className="flex-1 bg-[#D4AF37] hover:bg-[#E5C158] disabled:opacity-40 text-[#0A0A0B] py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-2 shadow-lg shadow-[#D4AF37]/10 uppercase tracking-wider"
                >
                  <Send size={14} />
                  <span>{selectedForm.respondido ? 'Respondido' : 'Enviar Resposta'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* GOOGLE ACCOUNT SWITCHER MODAL */}
      {isGoogleDriveEnabled && isAccountModalOpen && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-[#18181B] border border-[#27272A] w-full max-w-md rounded-2xl p-6 space-y-5 shadow-2xl relative">
            <button
              onClick={() => setIsAccountModalOpen(false)}
              className="absolute top-4 right-4 text-[#A1A1AA] hover:text-white transition-colors cursor-pointer"
            >
              <X size={18} />
            </button>

            <div className="flex items-center gap-3 border-b border-[#27272A] pb-4">
              <div className="w-10 h-10 rounded-full bg-[#D4AF37]/20 text-[#D4AF37] flex items-center justify-center font-bold text-sm border border-[#D4AF37]/30 shrink-0">
                G
              </div>
              <div>
                <h3 className="text-white text-sm font-bold">Vincular Conta do Google Drive</h3>
                <p className="text-[#A1A1AA] text-xs">
                  Conecte sua conta de forma segura para usar o Google Picker e salvar formulários.
                </p>
              </div>
            </div>

            <div className="space-y-4">
              {/* Opção 1: Login OAuth Real (Recomendado) */}
              <div className="bg-[#111113] p-4 rounded-xl border border-emerald-500/10 space-y-3">
                <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider block">Conexão Segura Oficial</span>
                <p className="text-[11px] text-[#A1A1AA] leading-relaxed">
                  Recomendado para autorizar o acesso direto ao seu Google Drive, permitindo o uso do Google Picker de arquivos e pastas.
                </p>
                <button
                  type="button"
                  disabled={isLoggingInGoogle}
                  onClick={async () => {
                    try {
                      setIsLoggingInGoogle(true);
                      console.log('[WebFormModal] Starting Google OAuth login popup flow...');
                      const result = await googleSignIn();
                      if (result && result.user) {
                        console.log('[WebFormModal] Google Sign-in successful! User:', result.user.email);
                        handleSelectAccount(result.user.email || 'conta.google@gmail.com', result.user.displayName || 'Usuário Google');
                      }
                    } catch (err: any) {
                      console.error('[WebFormModal] Google Auth popup error:', err);
                      alert('Não foi possível conectar com o Google: ' + (err.message || 'Pop-up bloqueado ou erro de rede.'));
                    } finally {
                      setIsLoggingInGoogle(false);
                    }
                  }}
                  className="w-full flex items-center justify-center gap-2 bg-emerald-500 hover:bg-emerald-600 text-white p-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer disabled:opacity-50"
                >
                  <LogIn size={15} />
                  <span>{isLoggingInGoogle ? 'Conectando...' : 'Fazer Login Real com Google'}</span>
                </button>
              </div>

              {/* Divisor Visual */}
              <div className="relative flex py-1 items-center">
                <div className="flex-grow border-t border-[#27272A]"></div>
                <span className="flex-shrink mx-3 text-[#71717A] text-[10px] font-bold uppercase tracking-wider">ou simular conta</span>
                <div className="flex-grow border-t border-[#27272A]"></div>
              </div>

              {/* Opção 2: Simulação Manual (Para testes sem popup) */}
              <div className="space-y-3">
                <div>
                  <label className="block text-[11px] font-semibold text-[#A1A1AA] mb-1.5">
                    E-mail da Conta para Simulação
                  </label>
                  <input
                    type="email"
                    placeholder="ex: suaempresa@gmail.com"
                    value={customAccountEmail}
                    onChange={(e) => setCustomAccountEmail(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-[#111113] border border-[#27272A] rounded-xl text-xs text-white focus:border-[#D4AF37] focus:outline-none placeholder-[#71717A]"
                  />
                </div>

                <button
                  type="button"
                  onClick={() => {
                    if (customAccountEmail.trim() && customAccountEmail.includes('@')) {
                      const email = customAccountEmail.trim();
                      const prefix = email.split('@')[0];
                      const displayName = prefix
                        .split('.')
                        .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
                        .join(' ');
                      
                      handleSelectAccount(email, displayName);
                    } else {
                      alert('Por favor, informe um e-mail válido para a simulação.');
                    }
                  }}
                  className="w-full flex items-center justify-center gap-2 bg-[#27272A] hover:bg-[#3F3F46] text-white p-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer border border-[#3F3F46]"
                >
                  <span>Vincular Manualmente (Simulado)</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* GOOGLE DRIVE FOLDER SELECTOR MODAL */}
      {isGoogleDriveEnabled && isFolderModalOpen && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-[#18181B] border border-[#27272A] w-full max-w-lg rounded-2xl p-6 space-y-5 shadow-2xl relative flex flex-col max-h-[90vh]">
            <button
              onClick={() => setIsFolderModalOpen(false)}
              className="absolute top-4 right-4 text-[#A1A1AA] hover:text-white transition-colors cursor-pointer"
            >
              <X size={18} />
            </button>

            <div className="flex items-center gap-3 border-b border-[#27272A] pb-4 shrink-0">
              <div className="w-10 h-10 rounded-full bg-[#D4AF37]/20 text-[#D4AF37] flex items-center justify-center font-bold text-sm border border-[#D4AF37]/30 shrink-0">
                <FolderGit2 size={18} />
              </div>
              <div>
                <h3 className="text-white text-sm font-bold">Pasta do Google Drive para Formulários</h3>
                <p className="text-[#A1A1AA] text-xs">
                  Insira o caminho de pasta de destino ou escolha entre as opções predefinidas.
                </p>
              </div>
            </div>

            {/* Quick Preset Options */}
            <div className="space-y-2 shrink-0">
              <label className="text-xs font-bold text-white block">Atalhos de Pastas Recomendadas:</label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {[
                  '/Bora Festar Locações/Formulários',
                  '/Meu Drive/Orçamentos Clientes',
                  '/Google Forms/Eventos e Locações',
                  '/Atendimento WhatsApp/Formulários',
                ].map((path) => (
                  <button
                    key={path}
                    type="button"
                    onClick={() => setSelectedFolderPath(path)}
                    className={`p-2.5 rounded-xl border text-left transition-all text-xs font-mono flex items-center gap-2 cursor-pointer ${
                      selectedFolderPath === path
                        ? 'bg-[#D4AF37]/10 border-[#D4AF37] text-white font-bold'
                        : 'bg-[#111113] border-[#27272A] text-[#A1A1AA] hover:border-[#3F3F46]'
                    }`}
                  >
                    <FolderOpen size={14} className={selectedFolderPath === path ? 'text-[#D4AF37]' : 'text-[#71717A]'} />
                    <span className="truncate">{path}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Path Text Input */}
            <div className="space-y-2 shrink-0">
              <div className="flex justify-between items-center">
                <label className="text-xs font-bold text-white block">
                  Caminho do Diretório Destino:
                </label>
                <span className="text-[10px] text-[#A1A1AA]">Digite livremente o caminho</span>
              </div>
              <input
                type="text"
                value={selectedFolderPath}
                onChange={(e) => setSelectedFolderPath(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-[#111113] border border-[#27272A] rounded-xl text-xs text-white focus:border-[#D4AF37] focus:outline-none placeholder-[#71717A] font-mono tracking-wide shadow-inner"
                placeholder="Ex: /Bora Festar Locações/Formulários"
              />
            </div>

            {/* Action Buttons */}
            <div className="flex items-center gap-3 pt-3 border-t border-[#27272A] shrink-0">
              <button
                type="button"
                onClick={() => setIsFolderModalOpen(false)}
                className="flex-1 bg-[#111113] hover:bg-[#27272A] text-[#A1A1AA] hover:text-white border border-[#27272A] py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer text-center"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleSaveSelectedFolder}
                className="flex-1 bg-[#D4AF37] hover:bg-[#E5C158] text-black py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-2 shadow-lg shadow-[#D4AF37]/10"
              >
                <CheckCircle2 size={15} />
                <span>Confirmar Pasta</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Confirmação de Exclusão com Senha do Usuário */}
      {deleteTargetForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-fade-in">
          <div className="bg-[#111113] border border-red-500/40 rounded-2xl w-full max-w-md shadow-2xl p-6 space-y-5">
            <div className="flex items-center gap-3 border-b border-[#27272A] pb-3">
              <div className="p-2.5 bg-red-500/10 text-red-400 rounded-xl border border-red-500/30">
                <ShieldAlert size={22} />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">Confirmação de Segurança</h3>
                <p className="text-xs text-[#A1A1AA]">Exclusão Protegida de Orçamento</p>
              </div>
            </div>

            <div className="space-y-2 text-xs text-[#E4E4E7]">
              <p>
                Você está prestes a excluir o orçamento <strong className="text-white font-semibold">"{deleteTargetForm.titulo}"</strong> (<span className="font-mono text-[#D4AF37]">#{deleteTargetForm.id}</span>).
              </p>
              <p className="text-[#A1A1AA]">
                Esta ação é irreversível. Por motivos de segurança, informe a <strong className="text-white">senha de acesso ao sistema</strong> para autorizar a exclusão.
              </p>
            </div>

            <form onSubmit={handleConfirmDelete} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-[#A1A1AA] uppercase tracking-wider flex items-center gap-1">
                  <Key size={12} className="text-[#D4AF37]" /> Senha do Usuário / Sistema
                </label>
                <div className="relative">
                  <input
                    type="password"
                    autoFocus
                    value={confirmPassword}
                    onChange={(e) => {
                      setConfirmPassword(e.target.value);
                      setPasswordError(null);
                    }}
                    placeholder="Digite sua senha de acesso..."
                    className="w-full px-3.5 py-2.5 bg-[#18181B] border border-[#27272A] rounded-xl text-white text-xs font-mono focus:border-red-500 focus:outline-none"
                  />
                </div>
                {passwordError && (
                  <p className="text-xs text-red-400 font-medium flex items-center gap-1 mt-1">
                    <AlertTriangle size={12} className="shrink-0" /> {passwordError}
                  </p>
                )}
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-[#27272A]">
                <button
                  type="button"
                  onClick={() => {
                    setDeleteTargetForm(null);
                    setConfirmPassword('');
                    setPasswordError(null);
                  }}
                  className="px-4 py-2 bg-[#18181B] hover:bg-[#27272A] text-white border border-[#27272A] rounded-xl text-xs font-bold transition-all cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={!confirmPassword.trim()}
                  className="px-4 py-2 bg-red-600 hover:bg-red-500 disabled:opacity-40 text-white rounded-xl text-xs font-bold transition-all cursor-pointer shadow-md flex items-center gap-1.5"
                >
                  <Trash2 size={14} />
                  <span>Confirmar Exclusão</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
