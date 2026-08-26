import React, { useState, useEffect } from 'react';
import { googleSignIn } from '../lib/googleWorkspace';
import { EmpresaConfig, ThemeConfig, GoogleAccountConfig, CategoriaItem, ItemAcervo, ListVisibilityConfig, DispositivoAutorizado, FormularioWeb, Cliente, ReservaComItens, GovBrConfig, RAMOS_ATUACAO_LOCACAO } from '../types';
import { GOVBR_ENDPOINTS } from '../lib/govbrSignature';
import { COLOR_PRESETS, THEME_MODE_PRESETS, getContrastTextColor } from '../utils/themeUtils';
import { CategoriasView } from './CategoriasView';
import { WhatsAppTemplatesConfigView } from './WhatsAppTemplatesConfigView';
import { WorkManagerSimModal } from './WorkManagerSimModal';
import { PhoneInput } from './PhoneInput';
import { DeveloperTestPanel } from './DeveloperTestPanel';
import { InstagramSorteioModule } from './InstagramSorteioModule';
import { WebFormModal } from './WebFormModal';
import { PersonalizacaoAbasView } from './PersonalizacaoAbasView';
import { PainelConfiguracaoView } from './PainelConfiguracaoView';
import { PlanoAssinaturaSuporteView } from './PlanoAssinaturaSuporteView';
import { GuiaSistemaArquiteturaView } from './GuiaSistemaArquiteturaView';
import { saveDocument, getActiveTenantId } from '../lib/firebaseSync';
import { getAppLogoUrl, handleLogoError } from '../utils/logoUtils';
import { formatCurrencyBRL, parseCurrencyBRLToNumber } from '../utils/currencyMask';
import { EnderecoFormFields } from './EnderecoFormFields';
import { formatEnderecoCompleto, parseEnderecoCompleto, AddressData } from '../utils/addressUtils';
import {
  Building2,
  Crown,
  FileSpreadsheet,
  Save,
  CheckCircle,
  FileText,
  MessageSquare,
  ArrowUpRight,
  Database,
  ShieldCheck,
  MapPin,
  Phone,
  Mail,
  User,
  Plug,
  Hash,
  Sparkles,
  Palette,
  Eye,
  EyeOff,
  Package,
  Users,
  Calendar,
  Sliders,
  SunMoon,
  Check,
  Code2,
  HardDrive,
  LogOut,
  LogIn,
  FolderGit2,
  ExternalLink,
  Layers,
  CheckCircle2,
  Lock,
  Camera,
  Upload,
  Image as ImageIcon,
  Bell,
  Clock,
  Smartphone,
  Key,
  ToggleLeft,
  DollarSign,
  Wrench,
  ToggleRight,
  RefreshCw,
  AlertCircle,
  XCircle,
  Info,
  ShieldAlert,
  UserCheck,
  FolderPlus,
  Folder,
  FolderOpen,
  Plus,
  X,
  ChevronRight,
  ChevronDown,
  UserPlus,
  FolderKanban,
  BookOpen,
  Cpu,
  Instagram,
  Terminal,
  Radio,
  QrCode,
  Landmark,
} from 'lucide-react';

interface EmpresaConfigViewProps {
  empresaConfig: EmpresaConfig;
  onSaveConfig: (newConfig: EmpresaConfig) => void;
  themeConfig: ThemeConfig;
  onSaveTheme: (newTheme: ThemeConfig) => void;
  googleAccount: GoogleAccountConfig;
  onUpdateGoogleAccount: (account: GoogleAccountConfig) => void;
  categorias?: CategoriaItem[];
  itens?: ItemAcervo[];
  onSaveCategoria?: (categoria: CategoriaItem) => void;
  onDeleteCategoria?: (id: string) => void;
  onUpdateItemCategoria?: (oldName: string, newName: string) => void;
  onBatchRemapCategory?: (sourceName: string, targetName: string) => void;
  initialSubTab?: 'empresa' | 'planos_assinatura' | 'painel_configuracao' | 'categorias' | 'personalizacao_abas' | 'whatsapp' | 'tema' | 'google_forms' | 'govbr' | 'permissoes' | 'dispositivos' | 'sincronizacao' | 'developer' | 'instagram_sorteio' | 'admin_dados' | 'guia_arquitetura';
  dispositivos?: DispositivoAutorizado[];
  onUpdateDispositivoStatus?: (id: string, newStatus: 'PENDENTE' | 'APROVADO' | 'REJEITADO' | 'REVOGADO', extraData?: Partial<DispositivoAutorizado>) => void;
  onDeleteDispositivo?: (id: string) => void;
  isNewClientWelcome?: boolean;
  webForms?: FormularioWeb[];
  onDeleteWebForm?: (id: string) => void;
  onTriggerWorkerSync?: () => void;
  onNavigateToRelatorios?: () => void;
  clientes?: Cliente[];
  reservas?: ReservaComItens[];
  onRefreshData?: () => Promise<void>;
  onCreateGoogleForm?: (titulo: string, itemIds: number[]) => void;
  onSimulateCustomerSubmit?: (
    formId: string,
    clienteNome: string,
    clienteTelefone: string,
    itemIds: number[],
    dataRetirada: number,
    dataDevolucao: number
  ) => void;
  authenticatedDevice?: DispositivoAutorizado | null;
  onNavigateToCreateOrcamento?: () => void;
  onOpenOnboardingWizard?: () => void;
}

export const EmpresaConfigView: React.FC<EmpresaConfigViewProps> = ({
  authenticatedDevice = null,
  empresaConfig,
  onSaveConfig,
  themeConfig,
  onSaveTheme,
  googleAccount,
  onUpdateGoogleAccount,
  categorias = [],
  itens = [],
  onSaveCategoria = () => {},
  onDeleteCategoria = () => {},
  onUpdateItemCategoria = () => {},
  onBatchRemapCategory = () => {},
  initialSubTab = 'empresa',
  dispositivos = [],
  onUpdateDispositivoStatus = (id, status, extra?: any) => {},
  onDeleteDispositivo = (id) => {},
  isNewClientWelcome = false,
  webForms = [],
  onDeleteWebForm,
  onTriggerWorkerSync = () => {},
  onNavigateToRelatorios = () => {},
  clientes = [],
  reservas = [],
  onRefreshData = async () => {},
  onCreateGoogleForm = () => {},
  onSimulateCustomerSubmit = () => {},
  onNavigateToCreateOrcamento,
  onOpenOnboardingWizard,
}) => {
  const [activeSubTab, setActiveSubTab] = useState<'empresa' | 'planos_assinatura' | 'painel_configuracao' | 'categorias' | 'personalizacao_abas' | 'whatsapp' | 'tema' | 'google_forms' | 'govbr' | 'permissoes' | 'dispositivos' | 'sincronizacao' | 'developer' | 'instagram_sorteio' | 'admin_dados' | 'guia_arquitetura'>(
    initialSubTab
  );

  // Isolamento Multi-Tenant estrito para dispositivos/operadores:
  const tenantCnpjClean = (empresaConfig?.cnpj || '').replace(/\D/g, '');
  const filteredDispositivos = dispositivos.filter(d => {
    const devCnpjClean = (d.cnpjEmpresa || '').replace(/\D/g, '');
    return devCnpjClean === tenantCnpjClean;
  });

  useEffect(() => {
    if (initialSubTab) {
      setActiveSubTab(initialSubTab);
    }
  }, [initialSubTab]);

  const subTabMeta: Record<typeof activeSubTab, { title: string; subtitle: string; icon: any }> = {
    empresa: {
      title: 'Dados Cadastrais da Empresa',
      subtitle: 'Gerencie as informações oficiais, CNPJ, representante legal e endereço da empresa.',
      icon: Building2,
    },
    planos_assinatura: {
      title: 'Planos de Licença & Assistência Técnica',
      subtitle: 'Gerencie sua assinatura, faturas recorrentes, níveis de suporte prioritário e chamados.',
      icon: Crown,
    },
    painel_configuracao: {
      title: 'Painel de Configuração Geral',
      subtitle: 'Controle parâmetros operacionais do sistema, limites financeiros, alertas de estoque e rotinas de backup.',
      icon: Sliders,
    },
    categorias: {
      title: 'Categorias do Acervo',
      subtitle: 'Estruture as categorias do inventário e faça remanejamentos ou mesclagem em lote.',
      icon: FolderKanban,
    },
    personalizacao_abas: {
      title: 'Personalização de Abas & Tela Principal',
      subtitle: 'Escolha qual aba deve abrir por padrão ao iniciar o app, fixe os módulos prioritários e personalize a barra de navegação.',
      icon: Layers,
    },
    whatsapp: {
      title: 'Modelos de Mensagens',
      subtitle: 'Customize as mensagens e templates automáticos enviados aos clientes via WhatsApp API.',
      icon: MessageSquare,
    },
    tema: {
      title: 'Personalização & Tema Visual',
      subtitle: 'Defina a paleta de cores primária e o modo de exibição claro ou escuro com contraste inteligente.',
      icon: Palette,
    },
    google_forms: {
      title: 'Gerenciador de Orçamentos',
      subtitle: 'Gerencie orçamentos compartilhados, propostas de acervo e links enviados aos clientes.',
      icon: FileSpreadsheet,
    },
    govbr: {
      title: 'Assinatura Eletrônica Gov.br',
      subtitle: 'Habilite e integre assinaturas de contratos validadas legalmente pelo Gov.br e ICP-Brasil.',
      icon: FileText,
    },
    permissoes: {
      title: 'Permissões de Acesso',
      subtitle: 'Controle corporativo de acessos, operadores e permissões de usuários do sistema.',
      icon: Users,
    },
    dispositivos: {
      title: 'Usuários Acesso',
      subtitle: 'Monitore, aprove ou revogue acessos de tablets e smartphones Android autorizados na locadora.',
      icon: Smartphone,
    },
    sincronizacao: {
      title: 'Sincronização & Worker Background',
      subtitle: 'Acompanhe as tarefas em background do Android WorkManager e simulações do Firestore Sync.',
      icon: Cpu,
    },
    instagram_sorteio: {
      title: 'Integração Sorteios Instagram',
      subtitle: 'Importe comentários e realize sorteios em tempo real de campanhas promocionais do seu acervo.',
      icon: Instagram,
    },
    admin_dados: {
      title: 'Gestão de Dados DB (Cloud SQL)',
      subtitle: 'Administração direta das tabelas relacionais no Cloud SQL PostgreSQL com isolamento Multi-Tenant.',
      icon: Database,
    },
    developer: {
      title: 'Painel do Desenvolvedor Android',
      subtitle: 'Área restrita para injeção de latência simulada, simulação de erros SQLite e testes rápidos.',
      icon: Code2,
    },
    guia_arquitetura: {
      title: 'Guia do Sistema & Arquitetura',
      subtitle: 'Documentação técnica oficial, Clean Architecture, persistência Room/SQLite e especificações do Acervus Core.',
      icon: BookOpen,
    },
  };

  // Google Drive Modal States & Options
  const [isFolderModalOpen, setIsFolderModalOpen] = useState(false);
  const [driveNotice, setDriveNotice] = useState<string | null>(null);
  const [isLoggingInGoogle, setIsLoggingInGoogle] = useState(false);

  const [customAccountEmail, setCustomAccountEmail] = useState('');

  // STATEFUL REALISTIC GOOGLE DRIVE DIRECTORY TREE (Dynamic & Expandable)
  const [folderTree, setFolderTree] = useState<Record<string, {
    id: string;
    name: string;
    path: string;
    parentId: string | null;
    childIds: string[];
    isExpanded: boolean;
    isLoading: boolean;
  }>>({
    'root': { id: 'root', name: 'Google Drive', path: '/', parentId: null, childIds: ['meu-drive', 'compartilhados', 'drives-equipe'], isExpanded: true, isLoading: false },
    'meu-drive': { id: 'meu-drive', name: 'Meu Drive', path: '/Meu Drive', parentId: 'root', childIds: ['bora-festar', 'fotos-eventos', 'docs-adm', 'modelos-pdf'], isExpanded: true, isLoading: false },
    'bora-festar': { id: 'bora-festar', name: 'Bora Festar Locações', path: '/Meu Drive/Bora Festar Locações', parentId: 'meu-drive', childIds: ['bora-formularios', 'bora-contratos', 'bora-orcamentos'], isExpanded: false, isLoading: false },
    'bora-formularios': { id: 'bora-formularios', name: 'Formulários', path: '/Meu Drive/Bora Festar Locações/Formulários', parentId: 'bora-festar', childIds: [], isExpanded: false, isLoading: false },
    'bora-contratos': { id: 'bora-contratos', name: 'Contratos de Locação', path: '/Meu Drive/Bora Festar Locações/Contratos de Locação', parentId: 'bora-festar', childIds: [], isExpanded: false, isLoading: false },
    'bora-orcamentos': { id: 'bora-orcamentos', name: 'Orçamentos e Fichas', parentId: 'bora-festar', path: '/Meu Drive/Bora Festar Locações/Orçamentos e Fichas', childIds: [], isExpanded: false, isLoading: false },
    'fotos-eventos': { id: 'fotos-eventos', name: 'Fotos Eventos', path: '/Meu Drive/Fotos Eventos', parentId: 'meu-drive', childIds: [], isExpanded: false, isLoading: false },
    'docs-adm': { id: 'docs-adm', name: 'Documentos Administrativos', path: '/Meu Drive/Documentos Administrativos', parentId: 'meu-drive', childIds: [], isExpanded: false, isLoading: false },
    'modelos-pdf': { id: 'modelos-pdf', name: 'Modelos de PDF', path: '/Meu Drive/Modelos de PDF', parentId: 'meu-drive', childIds: [], isExpanded: false, isLoading: false },
    'compartilhados': { id: 'compartilhados', name: 'Compartilhados comigo', path: '/Compartilhados comigo', parentId: 'root', childIds: ['modelos-corp'], isExpanded: false, isLoading: false },
    'modelos-corp': { id: 'modelos-corp', name: 'Modelos Corporativos', path: '/Compartilhados comigo/Modelos Corporativos', parentId: 'compartilhados', childIds: [], isExpanded: false, isLoading: false },
    'drives-equipe': { id: 'drives-equipe', name: 'Drives de Equipe', path: '/Drives de Equipe', parentId: 'root', childIds: ['acervo-geral'], isExpanded: false, isLoading: false },
    'acervo-geral': { id: 'acervo-geral', name: 'Acervo Geral', path: '/Drives de Equipe/Acervo Geral', parentId: 'drives-equipe', childIds: ['som', 'iluminacao'], isExpanded: false, isLoading: false },
    'som': { id: 'som', name: 'Equipamentos de Som', path: '/Drives de Equipe/Acervo Geral/Equipamentos de Som', parentId: 'acervo-geral', childIds: [], isExpanded: false, isLoading: false },
    'iluminacao': { id: 'iluminacao', name: 'Iluminação Cênica', path: '/Drives de Equipe/Acervo Geral/Iluminação Cênica', parentId: 'acervo-geral', childIds: [], isExpanded: false, isLoading: false },
  });

  const [selectedFolderPath, setSelectedFolderPath] = useState<string>('');
  const [newFolderName, setNewFolderName] = useState('');
  const [showCreateFolderInput, setShowCreateFolderInput] = useState(false);

  // Novo Usuário Modal State (Segurança & Terminais MDM)
  const [isNovoUsuarioModalOpen, setIsNovoUsuarioModalOpen] = useState(false);
  const [novoUsuarioNome, setNovoUsuarioNome] = useState('');
  const [novoUsuarioEmail, setNovoUsuarioEmail] = useState('');
  const [novoUsuarioTelefone, setNovoUsuarioTelefone] = useState('');
  const [novoUsuarioCnpj, setNovoUsuarioCnpj] = useState('');
  const [novoUsuarioNivel, setNovoUsuarioNivel] = useState<'OPERADOR' | 'GERENTE' | 'ADMINISTRADOR' | 'DESENVOLVEDOR'>('OPERADOR');
  const [novoUsuarioAparelho, setNovoUsuarioAparelho] = useState('');
  const [novoUsuarioSenha, setNovoUsuarioSenha] = useState('');
  const [novoUsuarioUuid, setNovoUsuarioUuid] = useState('');
  const [novoUsuarioCreatedSeed, setNovoUsuarioCreatedSeed] = useState<string | null>(null);

  const handleCadastrarNovoUsuarioMDM = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!novoUsuarioNome.trim() || !novoUsuarioEmail.trim()) {
      alert('Nome e E-mail são obrigatórios para cadastrar novo usuário.');
      return;
    }

    const generatedSeed = 'SEED-' + Math.floor(100000 + Math.random() * 900000);
    const newDevId = novoUsuarioUuid.trim() || ('USR-' + Math.random().toString(36).substring(2, 11).toUpperCase());

    const novoDispositivo: DispositivoAutorizado = {
      id: newDevId,
      imei: newDevId,
      nomeDispositivo: novoUsuarioAparelho.trim() || 'Aparelho Cadastrado MDM',
      cnpjEmpresa: novoUsuarioCnpj.trim() || empresaConfig?.cnpj || '45.678.910/0001-23',
      usuario: novoUsuarioNome.trim(),
      email: novoUsuarioEmail.trim(),
      senha: novoUsuarioSenha.trim() || '123456',
      emailConfirmationSeed: generatedSeed,
      isEmailVerified: false,
      telefone: novoUsuarioTelefone.trim() || empresaConfig?.telefoneWhatsapp || '',
      status: 'APROVADO',
      nivelAcesso: novoUsuarioNivel,
      dataSolicitacao: Date.now(),
      dataAtualizacao: Date.now(),
      ultimoAcesso: Date.now(),
    };

    try {
      await saveDocument('dispositivos_autorizados', newDevId, novoDispositivo);
      if (onRefreshData) {
        await onRefreshData();
      }
      setNovoUsuarioCreatedSeed(generatedSeed);
    } catch (err) {
      console.error('Erro ao salvar novo usuário no MDM:', err);
      alert('Usuário cadastrado em cache local.');
    }
  };
  
  // Access delegation and permission state for devices MDM
  const [editingPermissionsDev, setEditingPermissionsDev] = useState<DispositivoAutorizado | null>(null);
  const [editingNivelAcesso, setEditingNivelAcesso] = useState<'OPERADOR' | 'GERENTE' | 'ADMINISTRADOR' | 'DESENVOLVEDOR'>('OPERADOR');
  const [editingPermissoes, setEditingPermissoes] = useState<string[]>([]);
  const [editingUsuario, setEditingUsuario] = useState<string>('');
  const [editingNomeDispositivo, setEditingNomeDispositivo] = useState<string>('');
  const [editingTelefone, setEditingTelefone] = useState<string>('');
  const [editingCnpjEmpresa, setEditingCnpjEmpresa] = useState<string>('');
  const [editingSenha, setEditingSenha] = useState<string>('');
  // NOVO: Controle de visibilidade segura da senha (oculta por padrão)
  const [showEditingSenha, setShowEditingSenha] = useState<boolean>(false);
  const [showNovoUsuarioSenha, setShowNovoUsuarioSenha] = useState<boolean>(false);

  useEffect(() => {
    if (editingPermissionsDev) {
      setEditingNivelAcesso(editingPermissionsDev.nivelAcesso || 'OPERADOR');
      setEditingPermissoes(editingPermissionsDev.permissoesModulos || ['inventario', 'reservas', 'clientes']);
      setEditingUsuario(editingPermissionsDev.usuario || '');
      setEditingNomeDispositivo(editingPermissionsDev.nomeDispositivo || '');
      setEditingTelefone(editingPermissionsDev.telefone || '');
      setEditingCnpjEmpresa(editingPermissionsDev.cnpjEmpresa || empresaConfig?.cnpj || '');
      setEditingSenha(editingPermissionsDev.senha || '');
      setShowEditingSenha(false); // NOVO: Garante senha oculta ao abrir
    }
  }, [editingPermissionsDev, empresaConfig?.cnpj]);

  const handleFocusScroll = (e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setTimeout(() => {
      e.target.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }, 150);
  };

  // Synchronize selected path when opening modal
  useEffect(() => {
    if (isFolderModalOpen) {
      setSelectedFolderPath(googleAccount.driveFolderPath || '/Meu Drive/Bora Festar Locações/Formulários');
    }
  }, [isFolderModalOpen, googleAccount.driveFolderPath]);

  const handleSelectAccount = (email: string, name: string) => {
    onUpdateGoogleAccount({
      ...googleAccount,
      isConnected: true,
      email,
      displayName: name,
      connectedAt: Date.now(),
    });
    setDriveNotice(`Conta alterada para ${email} com sucesso!`);
    setTimeout(() => setDriveNotice(null), 3500);
  };

  const handleSaveSelectedFolder = () => {
    const finalPath = selectedFolderPath.trim() || '/';
    onUpdateGoogleAccount({
      ...googleAccount,
      driveFolderPath: finalPath,
    });
    setIsFolderModalOpen(false);
    setShowCreateFolderInput(false);
    setDriveNotice(`Pasta de destino alterada para "${finalPath}"!`);
    setTimeout(() => setDriveNotice(null), 3500);
  };

  const handleToggleExpand = (nodeId: string) => {
    const node = folderTree[nodeId];
    if (!node) return;

    if (!node.isExpanded && !node.isLoading) {
      // Simulate real-time API call for loading folders
      setFolderTree((prev) => ({
        ...prev,
        [nodeId]: { ...prev[nodeId], isLoading: true },
      }));

      setTimeout(() => {
        setFolderTree((prev) => ({
          ...prev,
          [nodeId]: { ...prev[nodeId], isLoading: false, isExpanded: true },
        }));
      }, 450);
    } else {
      setFolderTree((prev) => ({
        ...prev,
        [nodeId]: { ...prev[nodeId], isExpanded: !prev[nodeId].isExpanded },
      }));
    }
  };

  const handleCreateNewFolder = () => {
    if (!newFolderName.trim()) return;
    const cleanName = newFolderName.trim();

    // Determine current parent based on selection, default to meu-drive
    let parentNodeId = 'meu-drive';
    for (const [key, val] of Object.entries(folderTree)) {
      const node = val as any;
      if (node && node.path === selectedFolderPath) {
        parentNodeId = key;
        break;
      }
    }

    const parentNode = folderTree[parentNodeId];
    const newPath = parentNode.path === '/' ? `/${cleanName}` : `${parentNode.path}/${cleanName}`;
    const newId = `custom-folder-${Date.now()}`;

    setFolderTree((prev) => {
      const parent = prev[parentNodeId];
      if (!parent) return prev;
      return {
        ...prev,
        [parentNodeId]: {
          ...parent,
          childIds: [...parent.childIds, newId],
          isExpanded: true,
        },
        [newId]: {
          id: newId,
          name: cleanName,
          path: newPath,
          parentId: parentNodeId,
          childIds: [],
          isExpanded: false,
          isLoading: false,
        },
      };
    });

    setSelectedFolderPath(newPath);
    setNewFolderName('');
    setShowCreateFolderInput(false);
  };

  // RECURSIVE FOLDER NODE RENDERING (Perfectly Aligned UX)
  const renderFolderNode = (nodeId: string, depth: number = 0) => {
    const node = folderTree[nodeId];
    if (!node) return null;

    const isSelected = selectedFolderPath === node.path;
    const hasChildren = node.childIds.length > 0;

    return (
      <div key={node.id} className="select-none">
        <div
          style={{ paddingLeft: `${depth * 14}px` }}
          className={`group flex items-center gap-2 py-2 px-3 rounded-xl transition-all duration-150 border ${
            isSelected
              ? 'bg-[#D4AF37]/10 text-white border-[#D4AF37]/40'
              : 'text-[#E4E4E7] hover:bg-[#27272A]/50 border-transparent'
          }`}
        >
          {/* Expand Toggle Chevron */}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              handleToggleExpand(node.id);
            }}
            className={`p-1 rounded-lg hover:bg-[#18181B] transition-colors ${
              hasChildren ? 'opacity-100 cursor-pointer text-[#A1A1AA] hover:text-white' : 'opacity-20 cursor-default text-[#71717A]'
            }`}
            disabled={!hasChildren}
          >
            {node.isLoading ? (
              <RefreshCw size={12} className="animate-spin text-[#D4AF37]" />
            ) : node.isExpanded ? (
              <ChevronDown size={14} />
            ) : (
              <ChevronRight size={14} />
            )}
          </button>

          {/* Selector Button */}
          <button
            type="button"
            onClick={() => setSelectedFolderPath(node.path)}
            className="flex-1 flex items-center gap-2.5 text-left text-xs font-semibold focus:outline-none cursor-pointer"
          >
            {node.isExpanded ? (
              <FolderOpen size={16} className={isSelected ? 'text-[#D4AF37]' : 'text-[#A1A1AA]'} />
            ) : (
              <Folder size={16} className={isSelected ? 'text-[#D4AF37]' : 'text-[#A1A1AA]'} />
            )}
            <span className="truncate">{node.name}</span>
            {isSelected && (
              <span className="text-[10px] bg-[#D4AF37] text-black font-bold px-2 py-0.5 rounded-full ml-auto">
                Selecionada
              </span>
            )}
          </button>
        </div>

        {/* Child Subfolders */}
        {node.isExpanded && hasChildren && (
          <div className="mt-1 space-y-1 border-l border-[#27272A]/80 ml-4 pl-2">
            {node.childIds.map((childId) => renderFolderNode(childId, depth + 1))}
          </div>
        )}
      </div>
    );
  };

  // Permissions Control Panel State (All enabled by default)
  const [androidPermissions, setAndroidPermissions] = useState(() => {
    const saved = localStorage.getItem('android_permissions_state');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed;
        }
      } catch (e) {
        // fallback
      }
    }
    return [
      {
        id: 'camera',
        name: 'Acesso à Câmera',
        label: 'Câmera do Dispositivo',
        description: 'Permite capturar fotos dos itens do acervo diretamente pela câmera.',
        granted: true,
        category: 'Hardware',
      },
      {
        id: 'media',
        name: 'Galeria de Fotos',
        label: 'Acesso à Galeria de Fotos',
        description: 'Permite escolher fotos da galeria do dispositivo para associar aos produtos do inventário.',
        granted: true,
        category: 'Armazenamento',
      },
      {
        id: 'notifications',
        name: 'Alertas e Notificações',
        label: 'Notificações de Reservas',
        description: 'Alertas sobre vencimento de contratos, devoluções e confirmações.',
        granted: true,
        category: 'Sistema',
      },
      {
        id: 'alarm',
        name: 'Lembretes Agendados',
        label: 'Lembretes de Devolução',
        description: 'Dispara lembretes de devolução de equipamentos e montagem de eventos.',
        granted: true,
        category: 'Sistema',
      },
      {
        id: 'storage',
        name: 'Armazenamento de Arquivos',
        label: 'Exportação de Contratos PDF',
        description: 'Permite salvar relatórios e contratos PDF na memória do dispositivo.',
        granted: true,
        category: 'Armazenamento',
      },
      {
        id: 'contacts',
        name: 'Agenda de Contatos',
        label: 'Acesso aos Contatos',
        description: 'Permite buscar e importar clientes da agenda do celular Android.',
        granted: true,
        category: 'Privacidade',
      },
    ];
  });

  const [permissionNotice, setPermissionNotice] = useState<string | null>(null);

  const handleTogglePermission = (id: string) => {
    setAndroidPermissions((prev) => {
      const updated = prev.map((perm) => {
        if (perm.id === id) {
          const newStatus = !perm.granted;
          setPermissionNotice(
            `Status da permissão ${perm.name} alterado para ${newStatus ? 'CONCEDIDO (GRANTED)' : 'REVOGADO (DENIED)'}`
          );
          setTimeout(() => setPermissionNotice(null), 3500);
          return { ...perm, granted: newStatus };
        }
        return perm;
      });
      localStorage.setItem('android_permissions_state', JSON.stringify(updated));
      return updated;
    });
  };

  const handleGrantAllPermissions = () => {
    setAndroidPermissions((prev) => {
      const updated = prev.map((perm) => ({ ...perm, granted: true }));
      localStorage.setItem('android_permissions_state', JSON.stringify(updated));
      return updated;
    });
    setPermissionNotice('Todas as permissões foram ATIVADAS de uma vez.');
    setTimeout(() => setPermissionNotice(null), 3500);
  };

  const handleRevokeAllPermissions = () => {
    setAndroidPermissions((prev) => {
      const updated = prev.map((perm) => ({ ...perm, granted: false }));
      localStorage.setItem('android_permissions_state', JSON.stringify(updated));
      return updated;
    });
    setPermissionNotice('Todas as permissões foram REVOGADAS de uma vez.');
    setTimeout(() => setPermissionNotice(null), 3500);
  };

  // Empresa Form state
  const [empresaData, setEmpresaData] = useState<EmpresaConfig>({ ...empresaConfig });
  const [isEmpresaSaved, setIsEmpresaSaved] = useState(false);

  useEffect(() => {
    setEmpresaData({ ...empresaConfig });
  }, [empresaConfig]);

  // Theme Form state
  const [themeData, ThemeData] = useState<ThemeConfig>({ ...themeConfig });
  const [isThemeSaved, setIsThemeSaved] = useState(false);

  useEffect(() => {
    ThemeData({ ...themeConfig });
  }, [themeConfig]);

  const [isDevMode, setIsDevMode] = useState<boolean>(
    () => localStorage.getItem('modo_desenvolvedor') === 'true'
  );

  const handleToggleDevMode = () => {
    const newVal = !isDevMode;
    setIsDevMode(newVal);
    localStorage.setItem('modo_desenvolvedor', newVal ? 'true' : 'false');
    
    // Auto-toggle architecture guide visibility to sync
    const updatedTheme = { ...themeData, exibirGuiaArquitetura: newVal };
    ThemeData(updatedTheme);
    onSaveTheme(updatedTheme);
    setIsThemeSaved(true);
    setTimeout(() => setIsThemeSaved(false), 2000);
  };

  const [govBrConfig, setGovBrConfig] = useState<GovBrConfig>(
    empresaConfig.govBrConfig || {
      clientId: 'locadora_acervus_app',
      clientSecret: '••••••••••••••••',
      ambiente: 'homologacao',
      redirectUri: `${window.location.origin}/govbr-callback`,
      enabled: true,
    }
  );
  const [isGovBrTestSuccess, setIsGovBrTestSuccess] = useState(false);
  const [isGovBrTesting, setIsGovBrTesting] = useState(false);

  const handleGovBrChange = (field: keyof GovBrConfig, value: any) => {
    setGovBrConfig((prev) => ({ ...prev, [field]: value }));
    setIsEmpresaSaved(false);
  };

  const handleSaveGovBr = () => {
    const updated = {
      ...empresaData,
      govBrConfig,
    };
    setEmpresaData(updated);
    onSaveConfig(updated);
    setIsEmpresaSaved(true);
    setTimeout(() => setIsEmpresaSaved(false), 3000);
  };

  const handleTestGovBrConnection = () => {
    setIsGovBrTesting(true);
    setIsGovBrTestSuccess(false);
    setTimeout(() => {
      setIsGovBrTesting(false);
      setIsGovBrTestSuccess(true);
    }, 1200);
  };

  const handleEmpresaChange = (field: keyof EmpresaConfig, value: any) => {
    setEmpresaData((prev) => ({ ...prev, [field]: value }));
    setIsEmpresaSaved(false);
  };

  const handlePixTipoChaveChange = (novoTipo: string) => {
    let novaChave = empresaData.pixChave || '';

    if (novoTipo === 'CNPJ' && empresaData.cnpj) {
      novaChave = empresaData.cnpj;
    } else if (novoTipo === 'TELEFONE' && empresaData.telefoneWhatsapp) {
      novaChave = empresaData.telefoneWhatsapp;
    } else if (novoTipo === 'CPF') {
      if (empresaData.bancoDocumento && empresaData.bancoDocumento.length <= 14) {
        novaChave = empresaData.bancoDocumento;
      }
    } else if (novoTipo === 'E-MAIL') {
      if (googleAccount?.email && googleAccount.email !== 'Não Conectado') {
        novaChave = googleAccount.email;
      }
    } else if (novoTipo === 'CHAVE_ALEATORIA') {
      if (!novaChave || novaChave === empresaData.cnpj || novaChave === empresaData.telefoneWhatsapp) {
        novaChave = 'a1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d';
      }
    }

    setEmpresaData((prev) => ({
      ...prev,
      pixTipoChave: novoTipo as any,
      pixChave: novaChave,
    }));
    setIsEmpresaSaved(false);
  };

  const handleEmpresaSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSaveConfig(empresaData);
    setIsEmpresaSaved(true);
    setTimeout(() => {
      setIsEmpresaSaved(false);
      setActiveSubTab('painel_configuracao'); // Fecha o modal ao salvar e retorna ao painel
    }, 1000);
  };


  const handleThemeColorChange = (colorHex: string) => {
    const updated = { ...themeData, primaryColor: colorHex };
    ThemeData(updated);
    onSaveTheme(updated); // Immediate live feedback
    setIsThemeSaved(true);
    setTimeout(() => setIsThemeSaved(false), 2000);
  };

  const handleThemeModeChange = (modeId: ThemeConfig['themeMode']) => {
    const updated = { ...themeData, themeMode: modeId };
    ThemeData(updated);
    onSaveTheme(updated); // Immediate live feedback
    setIsThemeSaved(true);
    setTimeout(() => setIsThemeSaved(false), 2000);
  };

  const handleToggleContrast = () => {
    const updated = { ...themeData, highContrastText: !themeData.highContrastText };
    ThemeData(updated);
    onSaveTheme(updated);
    setIsThemeSaved(true);
    setTimeout(() => setIsThemeSaved(false), 2000);
  };

  const handleToggleExibirGuia = () => {
    const updated = { ...themeData, exibirGuiaArquitetura: !themeData.exibirGuiaArquitetura };
    ThemeData(updated);
    onSaveTheme(updated);
    setIsThemeSaved(true);
    setTimeout(() => setIsThemeSaved(false), 2000);
  };

  const contrastText = getContrastTextColor(themeData.primaryColor);

  return (
    <div className="space-y-6">
      {/* Top Banner Header */}
      <div className="bg-[#111113] p-6 rounded-2xl border border-[#27272A] flex flex-col md:flex-row justify-between items-start md:items-center gap-4 shadow-xl">
        <div>
          <div className="flex items-center space-x-2 text-[#D4AF37] text-xs font-bold uppercase tracking-wider mb-1">
            <Database size={16} /> Configurações & Personalização
          </div>
          <h2 className="text-2xl font-serif italic text-white flex items-center gap-2.5">
            {React.createElement(subTabMeta[activeSubTab]?.icon || Building2, { className: "text-[#D4AF37]", size: 26 })}
            {subTabMeta[activeSubTab]?.title || "Dados da Empresa e Tema"}
          </h2>
          <p className="text-[#A1A1AA] text-xs mt-1">
            {subTabMeta[activeSubTab]?.subtitle || "Gerencie as informações oficiais da locadora e customize a paleta visual do aplicativo com ajuste automático de contraste."}
          </p>
        </div>
        <div id="subtab-header-actions" className="flex items-center gap-3 w-full md:w-auto shrink-0">
          {activeSubTab === 'google_forms' && onNavigateToCreateOrcamento && (
            <button
              onClick={onNavigateToCreateOrcamento}
              className="flex items-center justify-center gap-2 bg-[#D4AF37] hover:bg-[#c4a02e] text-black px-4 py-2.5 rounded-xl text-xs font-bold transition-all shadow-lg cursor-pointer w-full md:w-auto shrink-0 whitespace-nowrap animate-fade-in"
            >
              <Plus size={15} />
              <span>Gerar Novo Orçamento</span>
            </button>
          )}
        </div>
      </div>

      {/* TAB 1: DADOS DA EMPRESA (MODAL) */}
      {activeSubTab === 'empresa' && (
        <div className="fixed inset-0 bg-black/85 backdrop-blur-md z-50 flex items-center justify-center p-4 overflow-y-auto animate-fadeIn">
          <div className="bg-[#111113] border border-[#27272A] rounded-3xl p-6 md:p-8 shadow-2xl max-w-4xl w-full max-h-[92vh] overflow-y-auto relative space-y-6">
            <button
              onClick={() => setActiveSubTab('painel_configuracao')}
              className="absolute top-6 right-6 p-2 rounded-xl bg-[#18181B] hover:bg-[#27272A] text-[#A1A1AA] hover:text-white transition-all cursor-pointer border border-[#27272A] z-10"
              title="Fechar"
            >
              <X size={18} />
            </button>

            {onOpenOnboardingWizard && (
              <div className="bg-gradient-to-r from-[#18181C] via-[#1E1E24] to-[#18181C] border border-[#D4AF37]/30 p-4 rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-3 shadow-lg">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-[#D4AF37]/10 border border-[#D4AF37]/30 flex items-center justify-center shrink-0">
                    <Sparkles className="text-[#D4AF37] animate-pulse" size={20} />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-white uppercase tracking-wider font-mono">Assistente de Configuração Inteligente (IA)</h4>
                    <p className="text-[11px] text-[#A1A1AA]">Prefere configurar sua empresa com auxílio passo-a-passo da Inteligência Artificial?</p>
                  </div>
                </div>
                <button
                  onClick={onOpenOnboardingWizard}
                  className="bg-gradient-to-r from-[#D4AF37] to-[#8B7326] text-black font-bold text-xs px-4 py-2 rounded-xl flex items-center gap-2 hover:scale-105 active:scale-95 transition-all shadow-md shadow-[#D4AF37]/20 cursor-pointer whitespace-nowrap"
                >
                  <Sparkles size={14} /> Iniciar Assistente IA
                </button>
              </div>
            )}

            {isNewClientWelcome && (
              <div className="bg-gradient-to-r from-[#D4AF37]/20 via-[#D4AF37]/10 to-[#D4AF37]/20 border-2 border-[#D4AF37] p-5 rounded-2xl text-white shadow-2xl space-y-2 animate-fadeIn">
                <div className="flex items-center gap-2 text-[#D4AF37] font-bold text-sm uppercase tracking-wider">
                  <Sparkles size={18} /> ✨ Novo Cliente Detectado! Seja Bem-vindo!
                </div>
                <p className="text-xs text-[#E4E4E7] leading-relaxed">
                  Identificamos um <strong>novo CNPJ e Usuário ({empresaData.cnpj || 'Inédito'})</strong> no sistema. Por favor, complete as informações oficiais do cliente e do seu representante abaixo para personalizar a conta e os contratos.
                </p>
              </div>
            )}

            <div className="bg-[#111113] border border-[#27272A] rounded-2xl p-6 shadow-2xl space-y-5">
            <div className="flex items-center justify-between border-b border-[#27272A] pb-4">
              <h3 className="font-serif italic text-white text-lg flex items-center gap-2">
                <Sparkles className="text-[#D4AF37]" size={18} />
                Dados Cadastrais da Empresa
              </h3>
              {isEmpresaSaved && (
                <span className="flex items-center gap-1.5 bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 px-3 py-1 rounded-full text-xs font-semibold animate-fade-in">
                  <CheckCircle size={14} /> Salvo e Fechado com Sucesso!
                </span>
              )}
            </div>

            <form onSubmit={handleEmpresaSubmit} className="space-y-4 text-xs">
              {/* Nome Fantasia (em uma linha) */}
              <div>
                <label className="block font-medium text-[#A1A1AA] mb-1.5 flex items-center gap-1">
                  <Building2 size={14} className="text-[#D4AF37]" /> Nome Fantasia
                </label>
                <input
                  type="text"
                  required
                  value={empresaData.nomeFantasia}
                  onChange={(e) => handleEmpresaChange('nomeFantasia', e.target.value)}
                  onFocus={handleFocusScroll}
                  placeholder="Ex: Bora Festar Locações"
                  className="w-full px-3.5 py-2.5 bg-[#18181B] border border-[#27272A] rounded-xl text-white text-sm focus:border-[#D4AF37] focus:outline-none transition-all"
                />
              </div>

              {/* Razão Social (em uma linha) */}
              <div>
                <label className="block font-medium text-[#A1A1AA] mb-1.5 flex items-center gap-1">
                  <Building2 size={14} className="text-[#D4AF37]" /> Razão Social
                </label>
                <input
                  type="text"
                  required
                  value={empresaData.razaoSocial}
                  onChange={(e) => handleEmpresaChange('razaoSocial', e.target.value)}
                  onFocus={handleFocusScroll}
                  placeholder="Ex: Bora Festar Eventos LTDA"
                  className="w-full px-3.5 py-2.5 bg-[#18181B] border border-[#27272A] rounded-xl text-white text-sm focus:border-[#D4AF37] focus:outline-none transition-all"
                />
              </div>

              {/* CNPJ (em uma linha) */}
              <div>
                <label className="block font-medium text-[#A1A1AA] mb-1.5 flex items-center gap-1">
                  <Hash size={14} className="text-[#D4AF37]" /> CNPJ
                </label>
                <input
                  type="text"
                  required
                  value={empresaData.cnpj}
                  onChange={(e) => handleEmpresaChange('cnpj', e.target.value)}
                  onFocus={handleFocusScroll}
                  placeholder="00.000.000/0001-00"
                  className="w-full px-3.5 py-2.5 bg-[#18181B] border border-[#27272A] rounded-xl text-white text-sm focus:border-[#D4AF37] focus:outline-none transition-all font-mono"
                />
              </div>

              {/* Ramo de Atuação da Empresa (Combobox com ramos de locação) */}
              <div>
                <label className="block font-medium text-[#A1A1AA] mb-1.5 flex items-center justify-between">
                  <span className="flex items-center gap-1">
                    <Layers size={14} className="text-[#D4AF37]" /> Ramo de Atuação (Segmento de Locação)
                  </span>
                  <span className="text-[10px] text-[#D4AF37] bg-[#D4AF37]/10 px-2 py-0.5 rounded border border-[#D4AF37]/30">
                    Expansão Multi-Locadora
                  </span>
                </label>
                <div className="relative">
                  <select
                    value={empresaData.ramoAtuacao || RAMOS_ATUACAO_LOCACAO[0]}
                    onChange={(e) => handleEmpresaChange('ramoAtuacao', e.target.value)}
                    onFocus={handleFocusScroll}
                    className="w-full px-3.5 py-2.5 bg-[#18181B] border border-[#27272A] rounded-xl text-white text-sm focus:border-[#D4AF37] focus:outline-none transition-all appearance-none cursor-pointer pr-10"
                  >
                    {RAMOS_ATUACAO_LOCACAO.map((ramo) => (
                      <option key={ramo} value={ramo} className="bg-[#18181B] text-white py-1">
                        {ramo}
                      </option>
                    ))}
                  </select>
                  <div className="absolute inset-y-0 right-0 flex items-center px-3 pointer-events-none text-[#71717A]">
                    <ChevronDown size={16} />
                  </div>
                </div>
                <p className="text-[11px] text-[#71717A] mt-1.5">
                  Define o segmento de mercado e parametrização de acervo da sua empresa locadora.
                </p>
              </div>

              {/* Telefone / WhatsApp da Empresa e Telefones Adicionais (em uma linha com botão de adicão) */}
              <div className="space-y-3">
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="block font-medium text-[#A1A1AA] flex items-center gap-1">
                      <Phone size={14} className="text-[#D4AF37]" /> Telefone / WhatsApp da Empresa
                    </label>
                    <button
                      type="button"
                      id="btn-add-telefone"
                      onClick={() => {
                        const currentList = empresaData.telefonesAdicionais || [];
                        handleEmpresaChange('telefonesAdicionais', [...currentList, '']);
                      }}
                      className="flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-[#D4AF37] bg-[#D4AF37]/10 hover:bg-[#D4AF37]/20 border border-[#D4AF37]/30 rounded-lg transition-all cursor-pointer"
                      title="Adicionar Novo Telefone"
                    >
                      <Plus size={14} />
                      <span>Telefone</span>
                    </button>
                  </div>
                  <PhoneInput
                    value={empresaData.telefoneWhatsapp}
                    onChange={(val) => handleEmpresaChange('telefoneWhatsapp', val)}
                    required
                    placeholder="11 99999-8888"
                  />
                </div>

                {/* Campos para Telefones Adicionais */}
                {(empresaData.telefonesAdicionais || []).map((tel, index) => (
                  <div key={index} className="space-y-1.5 animate-fadeIn">
                    <div className="flex items-center justify-between">
                      <label className="block font-medium text-[#A1A1AA] flex items-center gap-1">
                        <Phone size={14} className="text-[#A1A1AA]" /> Novo Telefone #{index + 1}
                      </label>
                      <button
                        type="button"
                        onClick={() => {
                          const currentList = [...(empresaData.telefonesAdicionais || [])];
                          currentList.splice(index, 1);
                          handleEmpresaChange('telefonesAdicionais', currentList);
                        }}
                        className="flex items-center gap-1 px-1.5 py-0.5 text-[10px] font-bold text-red-400 bg-red-400/10 hover:bg-red-400/20 border border-red-400/20 rounded transition-all cursor-pointer"
                        title="Remover Telefone"
                      >
                        <X size={12} />
                        <span>Remover</span>
                      </button>
                    </div>
                    <PhoneInput
                      value={tel}
                      onChange={(val) => {
                        const currentList = [...(empresaData.telefonesAdicionais || [])];
                        currentList[index] = val;
                        handleEmpresaChange('telefonesAdicionais', currentList);
                      }}
                      placeholder="11 99999-8888"
                    />
                  </div>
                ))}
              </div>

              {/* Nome do Representante */}
              <div className="space-y-3">
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="block font-medium text-[#A1A1AA] flex items-center gap-1">
                      <User size={14} className="text-[#D4AF37]" /> Nome do Representante Legal
                    </label>
                    <button
                      type="button"
                      id="btn-add-representante"
                      onClick={() => {
                        const currentList = empresaData.representantesAdicionais || [];
                        handleEmpresaChange('representantesAdicionais', [...currentList, '']);
                      }}
                      className="flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-[#D4AF37] bg-[#D4AF37]/10 hover:bg-[#D4AF37]/20 border border-[#D4AF37]/30 rounded-lg transition-all cursor-pointer"
                      title="Adicionar Novo Responsável"
                    >
                      <Plus size={14} />
                      <span>Responsável</span>
                    </button>
                  </div>
                  <input
                    type="text"
                    required
                    value={empresaData.nomeRepresentante}
                    onChange={(e) => handleEmpresaChange('nomeRepresentante', e.target.value)}
                    onFocus={handleFocusScroll}
                    placeholder="Nome do Sócio ou Gestor do Contrato"
                    className="w-full px-3.5 py-2.5 bg-[#18181B] border border-[#27272A] rounded-xl text-white text-sm focus:border-[#D4AF37] focus:outline-none transition-all"
                  />
                </div>

                {/* Campos para Responsáveis Adicionais */}
                {(empresaData.representantesAdicionais || []).map((rep, index) => (
                  <div key={index} className="space-y-1.5 animate-fadeIn">
                    <div className="flex items-center justify-between">
                      <label className="block font-medium text-[#A1A1AA] flex items-center gap-1">
                        <User size={14} className="text-[#A1A1AA]" /> Novo Responsável #{index + 1}
                      </label>
                      <button
                        type="button"
                        onClick={() => {
                          const currentList = [...(empresaData.representantesAdicionais || [])];
                          currentList.splice(index, 1);
                          handleEmpresaChange('representantesAdicionais', currentList);
                        }}
                        className="flex items-center gap-1 px-1.5 py-0.5 text-[10px] font-bold text-red-400 bg-red-400/10 hover:bg-red-400/20 border border-red-400/20 rounded transition-all cursor-pointer"
                        title="Remover Responsável"
                      >
                        <X size={12} />
                        <span>Remover</span>
                      </button>
                    </div>
                    <input
                      type="text"
                      required
                      value={rep}
                      onChange={(e) => {
                        const currentList = [...(empresaData.representantesAdicionais || [])];
                        currentList[index] = e.target.value;
                        handleEmpresaChange('representantesAdicionais', currentList);
                      }}
                      onFocus={handleFocusScroll}
                      placeholder="Nome do Novo Responsável"
                      className="w-full px-3.5 py-2.5 bg-[#18181B] border border-[#27272A] rounded-xl text-white text-sm focus:border-[#D4AF37] focus:outline-none transition-all"
                    />
                  </div>
                ))}
              </div>

              {/* Endereço Separado da Sede da Empresa */}
              <div className="bg-[#18181C] p-4 rounded-xl border border-[#27272A] space-y-3">
                <EnderecoFormFields
                  value={{
                    logradouro: empresaData.logradouro || parseEnderecoCompleto(empresaData.enderecoCompleto).logradouro || '',
                    numero: empresaData.numero || parseEnderecoCompleto(empresaData.enderecoCompleto).numero || '',
                    bairro: empresaData.bairro || parseEnderecoCompleto(empresaData.enderecoCompleto).bairro || '',
                    cidade: empresaData.cidade || parseEnderecoCompleto(empresaData.enderecoCompleto).cidade || '',
                    estado: empresaData.estado || parseEnderecoCompleto(empresaData.enderecoCompleto).estado || '',
                    cep: empresaData.cep || '',
                  }}
                  onChange={(newAddr) => {
                    const fullFormatted = formatEnderecoCompleto(newAddr);
                    const constructedUrl = fullFormatted ? `https://maps.google.com/?q=${encodeURIComponent(fullFormatted)}` : '';
                    setEmpresaData((prev) => ({
                      ...prev,
                      logradouro: newAddr.logradouro,
                      numero: newAddr.numero,
                      bairro: newAddr.bairro,
                      cidade: newAddr.cidade,
                      estado: newAddr.estado,
                      cep: newAddr.cep,
                      enderecoCompleto: fullFormatted,
                      linkMapaLocalizacao: constructedUrl || prev.linkMapaLocalizacao,
                    }));
                    setIsEmpresaSaved(false);
                  }}
                  onFocus={handleFocusScroll}
                  labelPrefix="Sede da Empresa"
                />
              </div>

              {/* Link do Mapa de Localização */}
              <div>
                <label className="block font-medium text-[#A1A1AA] mb-1.5 flex items-center gap-1">
                  <ExternalLink size={14} className="text-[#D4AF37]" /> Link do Mapa de Localização (Google Maps / Waze)
                </label>
                <input
                  type="url"
                  value={empresaData.linkMapaLocalizacao || ''}
                  onChange={(e) => handleEmpresaChange('linkMapaLocalizacao', e.target.value)}
                  onFocus={handleFocusScroll}
                  placeholder="Ex: https://maps.app.goo.gl/JnL8m"
                  className="w-full px-3.5 py-2.5 bg-[#18181B] border border-[#27272A] rounded-xl text-white text-sm focus:border-[#D4AF37] focus:outline-none transition-all"
                />
              </div>

              {/* Identidade Visual & Logotipo da Empresa */}
              <div className="bg-[#18181B] border border-[#27272A] rounded-2xl p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <label className="block font-medium text-white flex items-center gap-2 text-sm">
                    <ImageIcon size={16} className="text-[#D4AF37]" /> Identidade Visual & Logotipo da Empresa
                  </label>
                  <span className="text-[10px] text-[#D4AF37] bg-[#D4AF37]/10 border border-[#D4AF37]/30 px-2.5 py-0.5 rounded-full font-semibold">
                    Propostas & Relatórios PDF
                  </span>
                </div>
                <p className="text-xs text-[#A1A1AA] leading-relaxed">
                  Carregue a imagem da sua marca ou informe uma URL direta. Esta marca será exibida no cabeçalho das <strong>Propostas de Orçamento</strong>, <strong>Contratos em PDF</strong> e <strong>Relatórios Impressos</strong> da sua empresa.
                </p>

                <div className="flex flex-col sm:flex-row items-center gap-4 pt-1">
                  {/* Image Preview Box */}
                  <div className="relative w-28 h-28 bg-[#09090B] border-2 border-dashed border-[#3F3F46] rounded-xl flex items-center justify-center overflow-hidden shrink-0 group">
                    {empresaData.logoUrl ? (
                      <img
                        src={getAppLogoUrl(empresaData.logoUrl)}
                        alt="Logotipo da Empresa"
                        onError={handleLogoError}
                        className="w-full h-full object-contain p-2"
                      />
                    ) : (
                      <div className="text-center p-2 text-[#71717A]">
                        <ImageIcon size={24} className="mx-auto mb-1 opacity-50" />
                        <span className="text-[10px] block font-mono">Sem Logo</span>
                      </div>
                    )}
                  </div>

                  {/* Controls: Upload File + URL Input */}
                  <div className="space-y-2.5 w-full">
                    <div className="flex flex-wrap items-center gap-2">
                      <label className="flex items-center gap-1.5 px-3.5 py-2 bg-[#D4AF37] hover:bg-[#E5C158] text-[#0A0A0B] rounded-xl font-bold text-xs cursor-pointer transition-all shadow-md">
                        <Upload size={14} />
                        <span>Enviar Imagem (PNG/JPG)</span>
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) {
                              if (file.size > 3 * 1024 * 1024) {
                                alert("A imagem selecionada excede o tamanho recomendado de 3MB.");
                              }
                              const reader = new FileReader();
                              reader.onloadend = () => {
                                if (typeof reader.result === 'string') {
                                  handleEmpresaChange('logoUrl', reader.result);
                                }
                              };
                              reader.readAsDataURL(file);
                            }
                          }}
                        />
                      </label>

                      {empresaData.logoUrl && (
                        <button
                          type="button"
                          onClick={() => handleEmpresaChange('logoUrl', '')}
                          className="flex items-center gap-1 px-3 py-2 bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/30 rounded-xl text-xs font-semibold transition-all cursor-pointer"
                          title="Remover logotipo personalizado"
                        >
                          <X size={14} />
                          <span>Remover Logo</span>
                        </button>
                      )}
                    </div>

                    <div className="space-y-1">
                      <label className="text-[11px] text-[#A1A1AA] block">Ou insira a URL direta do logotipo:</label>
                      <input
                        type="url"
                        value={empresaData.logoUrl || ''}
                        onChange={(e) => handleEmpresaChange('logoUrl', e.target.value)}
                        onFocus={handleFocusScroll}
                        placeholder="https://exemplo.com/sua-logo.png"
                        className="w-full px-3 py-2 bg-[#09090B] border border-[#27272A] rounded-xl text-white text-xs focus:border-[#D4AF37] focus:outline-none font-mono"
                      />
                    </div>
                    <p className="text-[10px] text-[#71717A]">
                      Formatos aceitos: PNG, JPG, WebP ou SVG. Recomendado fundo transparente.
                    </p>
                  </div>
                </div>
              </div>

              {/* Valor por Quilômetro do Frete & Chave Google Maps */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block font-medium text-[#A1A1AA] mb-1.5 flex items-center gap-1">
                    <DollarSign size={14} className="text-[#D4AF37]" /> Valor por Quilômetro do Frete (R$/Km)
                  </label>
                  <input
                    type="text"
                    value={formatCurrencyBRL(empresaData.valorFretePorKm)}
                    onChange={(e) => handleEmpresaChange('valorFretePorKm', parseCurrencyBRLToNumber(e.target.value))}
                    onFocus={handleFocusScroll}
                    placeholder="R$ 0,00"
                    className="w-full px-3.5 py-2.5 bg-[#18181B] border border-[#27272A] rounded-xl text-white text-sm focus:border-[#D4AF37] focus:outline-none transition-all font-mono"
                  />
                </div>

                <div>
                  <label className="block font-medium text-[#A1A1AA] mb-1.5 flex items-center gap-1">
                    <MapPin size={14} className="text-[#D4AF37]" /> Chave Google Maps API (Distance Matrix)
                  </label>
                  <input
                    type="text"
                    value={empresaData.googleMapsApiKey || ''}
                    onChange={(e) => handleEmpresaChange('googleMapsApiKey', e.target.value)}
                    onFocus={handleFocusScroll}
                    placeholder="Opcional (Ex: AIzaSy...)"
                    className="w-full px-3.5 py-2.5 bg-[#18181B] border border-[#27272A] rounded-xl text-white text-sm focus:border-[#D4AF37] focus:outline-none transition-all font-mono"
                  />
                  <p className="text-[10px] text-[#71717A] mt-1">
                    Usado para cálculo exato de rotas. Se omitido, o sistema utiliza o simulador de distância.
                  </p>
                </div>
              </div>

              {/* Configuração de Pagamento PIX */}
              <div className="border-t border-[#27272A] pt-5 mt-4 space-y-4">
                <h4 className="font-serif italic text-white text-sm flex items-center gap-2">
                  <QrCode size={16} className="text-[#D4AF37]" />
                  Dados de Recebimento PIX (Sinal do Orçamento)
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block font-medium text-[#A1A1AA] mb-1.5">
                      Tipo de Chave PIX
                    </label>
                    <select
                      value={empresaData.pixTipoChave || 'CNPJ'}
                      onChange={(e) => handlePixTipoChaveChange(e.target.value)}
                      className="w-full px-3.5 py-2.5 bg-[#18181B] border border-[#27272A] rounded-xl text-white text-sm focus:border-[#D4AF37] focus:outline-none transition-all cursor-pointer"
                    >
                      <option value="CNPJ">CNPJ</option>
                      <option value="CPF">CPF</option>
                      <option value="E-MAIL">E-mail</option>
                      <option value="TELEFONE">Celular / Telefone</option>
                      <option value="CHAVE_ALEATORIA">Chave Aleatória</option>
                    </select>
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="block font-medium text-[#A1A1AA]">
                        Chave PIX
                      </label>
                      <button
                        type="button"
                        onClick={() => handlePixTipoChaveChange(empresaData.pixTipoChave || 'CNPJ')}
                        className="text-[10px] text-[#D4AF37] hover:underline flex items-center gap-1 cursor-pointer"
                        title="Preencher automaticamente com base nos dados do cadastro"
                      >
                        <RefreshCw size={10} /> Auto-preencher
                      </button>
                    </div>
                    <input
                      type="text"
                      value={empresaData.pixChave || ''}
                      onChange={(e) => handleEmpresaChange('pixChave', e.target.value)}
                      onFocus={handleFocusScroll}
                      placeholder="Insira a sua chave PIX oficial"
                      className="w-full px-3.5 py-2.5 bg-[#18181B] border border-[#27272A] rounded-xl text-white text-sm focus:border-[#D4AF37] focus:outline-none transition-all font-mono"
                    />
                    <p className="text-[10px] text-[#71717A] mt-1">
                      Chave atualizada automaticamente ao alterar o tipo ({empresaData.pixTipoChave || 'CNPJ'}).
                    </p>
                  </div>
                </div>
              </div>

              {/* Configuração de Dados Bancários da Empresa */}
              <div className="border-t border-[#27272A] pt-5 mt-4 space-y-4">
                <h4 className="font-serif italic text-white text-sm flex items-center gap-2">
                  <Landmark size={16} className="text-[#D4AF37]" />
                  Dados Bancários da Empresa (Depósitos / Transferência)
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="sm:col-span-2">
                    <label className="block font-medium text-[#A1A1AA] mb-1.5">
                      Nome do Banco
                    </label>
                    <input
                      type="text"
                      value={empresaData.bancoNome || ''}
                      onChange={(e) => handleEmpresaChange('bancoNome', e.target.value)}
                      onFocus={handleFocusScroll}
                      placeholder="Ex: Banco Itaú Unibanco S.A."
                      className="w-full px-3.5 py-2.5 bg-[#18181B] border border-[#27272A] rounded-xl text-white text-sm focus:border-[#D4AF37] focus:outline-none transition-all"
                    />
                  </div>

                  <div>
                    <label className="block font-medium text-[#A1A1AA] mb-1.5">
                      Agência
                    </label>
                    <input
                      type="text"
                      value={empresaData.bancoAgencia || ''}
                      onChange={(e) => handleEmpresaChange('bancoAgencia', e.target.value)}
                      onFocus={handleFocusScroll}
                      placeholder="Ex: 0001"
                      className="w-full px-3.5 py-2.5 bg-[#18181B] border border-[#27272A] rounded-xl text-white text-sm focus:border-[#D4AF37] focus:outline-none transition-all font-mono"
                    />
                  </div>

                  <div>
                    <label className="block font-medium text-[#A1A1AA] mb-1.5">
                      Número da Conta
                    </label>
                    <input
                      type="text"
                      value={empresaData.bancoConta || ''}
                      onChange={(e) => handleEmpresaChange('bancoConta', e.target.value)}
                      onFocus={handleFocusScroll}
                      placeholder="Ex: 12345-6"
                      className="w-full px-3.5 py-2.5 bg-[#18181B] border border-[#27272A] rounded-xl text-white text-sm focus:border-[#D4AF37] focus:outline-none transition-all font-mono"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label className="block font-medium text-[#A1A1AA] mb-1.5">
                      Tipo de Conta
                    </label>
                    <select
                      value={empresaData.bancoTipoConta || 'CORRENTE'}
                      onChange={(e) => handleEmpresaChange('bancoTipoConta', e.target.value)}
                      className="w-full px-3.5 py-2.5 bg-[#18181B] border border-[#27272A] rounded-xl text-white text-sm focus:border-[#D4AF37] focus:outline-none transition-all cursor-pointer"
                    >
                      <option value="CORRENTE">Conta Corrente</option>
                      <option value="POUPANCA">Conta Poupança</option>
                    </select>
                  </div>

                  <div>
                    <label className="block font-medium text-[#A1A1AA] mb-1.5">
                      Nome do Beneficiário
                    </label>
                    <input
                      type="text"
                      value={empresaData.bancoBeneficiario || ''}
                      onChange={(e) => handleEmpresaChange('bancoBeneficiario', e.target.value)}
                      onFocus={handleFocusScroll}
                      placeholder="Ex: Bora Festar Locações LTDA"
                      className="w-full px-3.5 py-2.5 bg-[#18181B] border border-[#27272A] rounded-xl text-white text-sm focus:border-[#D4AF37] focus:outline-none transition-all"
                    />
                  </div>

                  <div>
                    <label className="block font-medium text-[#A1A1AA] mb-1.5">
                      Documento (CPF ou CNPJ)
                    </label>
                    <input
                      type="text"
                      value={empresaData.bancoDocumento || ''}
                      onChange={(e) => handleEmpresaChange('bancoDocumento', e.target.value)}
                      onFocus={handleFocusScroll}
                      placeholder="Ex: 45.678.910/0001-23"
                      className="w-full px-3.5 py-2.5 bg-[#18181B] border border-[#27272A] rounded-xl text-white text-sm focus:border-[#D4AF37] focus:outline-none transition-all font-mono"
                    />
                  </div>
                </div>
              </div>

              {/* Sticky Always-Visible Save Button */}
              <div className="pt-3 border-t border-[#27272A] sticky bottom-3 z-30 bg-[#111113]/95 backdrop-blur-md p-3 rounded-2xl border border-[#27272A] shadow-2xl flex items-center justify-between gap-4">
                <span className="text-[11px] text-[#A1A1AA] hidden sm:inline">Altera os dados do contrato e orçamentos</span>
                <button
                  type="submit"
                  className="w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-3 bg-[#D4AF37] hover:bg-[#E5C158] text-[#0A0A0B] rounded-xl text-xs font-bold uppercase tracking-wider shadow-lg shadow-[#D4AF37]/10 transition-all cursor-pointer active:scale-95"
                >
                  <Save size={16} />
                  <span>Salvar Dados Cadastrais</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
      )}

      {/* TAB 1.2: PLANOS DE ASSINATURA & SUPORTE */}
      {activeSubTab === 'planos_assinatura' && (
        <PlanoAssinaturaSuporteView
          empresaConfig={empresaData}
          onSaveConfig={onSaveConfig}
        />
      )}

      {/* TAB 1.5: PAINEL DE CONFIGURAÇÃO */}
      {activeSubTab === 'painel_configuracao' && (
        <PainelConfiguracaoView
          empresaConfig={empresaData}
          onSaveConfig={onSaveConfig}
          authenticatedDevice={authenticatedDevice}
          googleAccount={googleAccount}
          onUpdateGoogleAccount={onUpdateGoogleAccount}
        />
      )}

      {/* TAB 2: GESTÃO DE CATEGORIAS DO ACERVO */}
      {activeSubTab === 'categorias' && (
        <CategoriasView
          categorias={categorias}
          itens={itens}
          onSaveCategoria={onSaveCategoria}
          onDeleteCategoria={onDeleteCategoria}
          onUpdateItemCategoria={onUpdateItemCategoria}
          onBatchRemapCategory={onBatchRemapCategory}
          listVisibility={empresaConfig.listVisibility}
          hideHeader
        />
      )}

      {/* TAB 2.2: PERSONALIZAÇÃO DE ABAS & TELA PRINCIPAL */}
      {activeSubTab === 'personalizacao_abas' && (
        <PersonalizacaoAbasView
          empresaConfig={empresaConfig}
          onSaveConfig={onSaveConfig}
          setActiveTab={() => {}}
        />
      )}

      {/* TAB 2.5: MODELOS DE MENSAGENS WHATSAPP */}
      {activeSubTab === 'whatsapp' && (
        <WhatsAppTemplatesConfigView
          empresaConfig={empresaData}
          onSaveConfig={onSaveConfig}
        />
      )}

      {/* TAB 3: PERSONALIZAÇÃO DE TEMA & CORES */}
      {activeSubTab === 'tema' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left Panel: Color Controls (7 cols) */}
          <div className="lg:col-span-7 bg-[#111113] border border-[#27272A] rounded-2xl p-6 shadow-2xl space-y-6">
            <div className="flex items-center justify-between border-b border-[#27272A] pb-4">
              <div>
                <h3 className="font-serif italic text-white text-lg flex items-center gap-2">
                  <Palette style={{ color: themeData.primaryColor }} size={20} />
                  Personalização da Paleta de Cores
                </h3>
                <p className="text-[#A1A1AA] text-xs">
                  Escolha uma paleta de destaque para menus, botões, ícones e destaques visuais do acervo.
                </p>
              </div>
              {isThemeSaved && (
                <span className="flex items-center gap-1.5 bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 px-3 py-1 rounded-full text-xs font-semibold animate-fade-in">
                  <CheckCircle size={14} /> Tema Aplicado!
                </span>
              )}
            </div>

            {/* Presets Grid */}
            <div className="space-y-3">
              <label className="block text-xs font-semibold text-[#E4E4E7] flex items-center justify-between">
                <span>Paletas de Destaque Recomendadas</span>
                <span className="text-[10px] text-[#A1A1AA] font-mono">Material 3 Color Schemes</span>
              </label>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                {COLOR_PRESETS.map((preset) => {
                  const isSelected = themeData.primaryColor.toLowerCase() === preset.hex.toLowerCase();
                  return (
                    <button
                      key={preset.hex}
                      type="button"
                      onClick={() => handleThemeColorChange(preset.hex)}
                      className={`relative flex items-center gap-2.5 p-3 rounded-xl border transition-all text-left cursor-pointer ${
                        isSelected
                          ? 'bg-[#18181B] border-white/40 shadow-lg scale-[1.02]'
                          : 'bg-[#141416] border-[#27272A] hover:bg-[#18181B] hover:border-[#3F3F46]'
                      }`}
                    >
                      <div
                        className="w-5 h-5 rounded-full shrink-0 shadow-inner flex items-center justify-center border border-white/20"
                        style={{ backgroundColor: preset.hex }}
                      >
                        {isSelected && <Check size={12} style={{ color: getContrastTextColor(preset.hex) }} />}
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-medium text-white truncate">{preset.name}</p>
                        <p className="text-[10px] text-[#71717A] font-mono uppercase">{preset.hex}</p>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Custom Hex Color Picker */}
            <div className="bg-[#18181B] p-4 rounded-xl border border-[#27272A] space-y-3">
              <label className="block text-xs font-medium text-[#E4E4E7] flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <Sliders size={14} style={{ color: themeData.primaryColor }} />
                  Cor Primária Personalizada
                </span>
                <span className="text-[10px] text-[#A1A1AA] font-mono">
                  Texto no Botão: {contrastText === '#000000' ? 'Escuro (#000)' : 'Claro (#FFF)'}
                </span>
              </label>

              <div className="flex items-center gap-3">
                <input
                  type="color"
                  value={themeData.primaryColor}
                  onChange={(e) => handleThemeColorChange(e.target.value)}
                  className="w-12 h-10 rounded-lg cursor-pointer bg-transparent border-none"
                />
                <input
                  type="text"
                  value={themeData.primaryColor}
                  onChange={(e) => handleThemeColorChange(e.target.value)}
                  placeholder="#D4AF37"
                  className="px-3.5 py-2 bg-[#111113] border border-[#27272A] rounded-xl text-white font-mono text-sm uppercase focus:border-white focus:outline-none w-32"
                />
                <div
                  className="px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider shadow-md transition-all flex items-center justify-center"
                  style={{ backgroundColor: themeData.primaryColor, color: contrastText }}
                >
                  Amostra Botão
                </div>
              </div>
            </div>

            {/* Background Theme Selector */}
            <div className="space-y-3 pt-2 border-t border-[#27272A]">
              <label className="block text-xs font-semibold text-[#E4E4E7] flex items-center gap-2">
                <SunMoon size={16} className="text-[#A1A1AA]" />
                Estilo do Fundo e Superfícies
              </label>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {THEME_MODE_PRESETS.map((mode) => {
                  const isSelected = themeData.themeMode === mode.id;
                  return (
                    <button
                      key={mode.id}
                      type="button"
                      onClick={() => handleThemeModeChange(mode.id)}
                      className={`p-3.5 rounded-xl border text-left transition-all cursor-pointer flex items-center justify-between ${
                        isSelected
                          ? 'bg-[#18181B] border-white/40 shadow-xl'
                          : 'bg-[#141416] border-[#27272A] hover:bg-[#18181B]'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        {/* Miniature Canvas Preview */}
                        <div
                          className="w-8 h-8 rounded-lg border border-white/10 flex items-center justify-center shadow-inner"
                          style={{ backgroundColor: mode.bg }}
                        >
                          <div
                            className="w-4 h-4 rounded border border-white/20"
                            style={{ backgroundColor: mode.surface }}
                          ></div>
                        </div>
                        <div>
                          <p className="text-xs font-bold text-white">{mode.name}</p>
                          <p className="text-[10px] text-[#71717A] font-mono">Fundo: {mode.bg}</p>
                        </div>
                      </div>
                      {isSelected && <Check size={16} style={{ color: themeData.primaryColor }} />}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Accessibility Contrast Option */}
            <div className="bg-[#18181B] p-4 rounded-xl border border-[#27272A] flex items-center justify-between">
              <div>
                <p className="text-xs font-bold text-white flex items-center gap-1.5">
                  <Eye size={16} className="text-emerald-400" />
                  Acessibilidade: Ajuste Automático de Contraste
                </p>
                <p className="text-[11px] text-[#A1A1AA]">
                  Garante que o texto dos botões altere automaticamente entre preto e branco de acordo com a luminosidade do fundo.
                </p>
              </div>

              <button
                type="button"
                onClick={handleToggleContrast}
                className={`w-12 h-6 rounded-full p-1 transition-colors duration-200 cursor-pointer ${
                  themeData.highContrastText ? 'bg-emerald-500' : 'bg-[#3F3F46]'
                }`}
              >
                <div
                  className={`w-4 h-4 rounded-full bg-white transition-transform duration-200 ${
                    themeData.highContrastText ? 'translate-x-6' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>
          </div>

          {/* Right Panel: Live App Preview Mockup (5 cols) */}
          <div className="lg:col-span-5 space-y-4">
            <div className="bg-[#111113] border border-[#27272A] rounded-2xl p-5 shadow-xl space-y-4">
              <div className="flex items-center justify-between border-b border-[#27272A] pb-3">
                <h3 className="font-serif italic text-white text-base flex items-center gap-2">
                  <Sparkles size={18} style={{ color: themeData.primaryColor }} />
                  Prévia em Tempo Real da Interface
                </h3>
                <span className="text-[10px] font-mono bg-[#18181B] border border-[#27272A] text-white px-2.5 py-1 rounded-md">
                  Material 3 Dynamic
                </span>
              </div>

              {/* Simulated Mobile Card Interface */}
              <div
                className="p-5 rounded-2xl border transition-all duration-300 space-y-4 shadow-2xl"
                style={{
                  backgroundColor: THEME_MODE_PRESETS.find((m) => m.id === themeData.themeMode)?.bg || '#0A0A0B',
                  borderColor: THEME_MODE_PRESETS.find((m) => m.id === themeData.themeMode)?.border || '#27272A',
                }}
              >
                {/* Navbar Simulator Header */}
                <div
                  className="p-3.5 rounded-xl border flex justify-between items-center"
                  style={{
                    backgroundColor: THEME_MODE_PRESETS.find((m) => m.id === themeData.themeMode)?.surface || '#111113',
                    borderColor: THEME_MODE_PRESETS.find((m) => m.id === themeData.themeMode)?.border || '#27272A',
                  }}
                >
                  <div className="flex items-center gap-2">
                    <div
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: themeData.primaryColor }}
                    ></div>
                    <span className="font-serif italic font-bold text-sm text-white">Locadora Pro</span>
                  </div>
                  <span
                    className="text-[10px] font-bold uppercase px-2.5 py-0.5 rounded-full"
                    style={{
                      backgroundColor: `${themeData.primaryColor}20`,
                      color: themeData.primaryColor,
                      border: `1px solid ${themeData.primaryColor}40`,
                    }}
                  >
                    Ativo
                  </span>
                </div>

                {/* Acervo Item Card Simulator */}
                <div
                  className="p-4 rounded-xl border space-y-3"
                  style={{
                    backgroundColor: THEME_MODE_PRESETS.find((m) => m.id === themeData.themeMode)?.surface || '#111113',
                    borderColor: THEME_MODE_PRESETS.find((m) => m.id === themeData.themeMode)?.border || '#27272A',
                  }}
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <h4 className="font-bold text-white text-sm">Painel Redondo Dourado</h4>
                      <p className="text-[11px] text-[#A1A1AA]">Decoração & Cenário</p>
                    </div>
                    <span
                      className="font-bold font-mono text-sm"
                      style={{ color: themeData.primaryColor }}
                    >
                      R$ 50,00
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-xs pt-2 border-t border-white/5">
                    <span className="text-[#71717A]">Disponível: 10 un.</span>
                    <button
                      type="button"
                      className="px-3.5 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider transition-all shadow-md"
                      style={{
                        backgroundColor: themeData.primaryColor,
                        color: contrastText,
                      }}
                    >
                      Reservar
                    </button>
                  </div>
                </div>

                {/* Status Badges Row Simulator */}
                <div className="flex gap-2 text-[10px] font-bold">
                  <span
                    className="px-3 py-1 rounded-full uppercase"
                    style={{
                      backgroundColor: `${themeData.primaryColor}25`,
                      color: themeData.primaryColor,
                      border: `1px solid ${themeData.primaryColor}50`,
                    }}
                  >
                    Destaque
                  </span>
                  <span className="px-3 py-1 rounded-full uppercase bg-emerald-500/20 text-emerald-400 border border-emerald-500/40">
                    Confirmado
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 6: GOV.BR DIGITAL SIGNATURE */}
      {activeSubTab === 'govbr' && (
        <div className="bg-[#111113] border border-[#27272A] rounded-2xl p-6 shadow-xl space-y-6">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pb-5 border-b border-[#27272A]">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
                <FileText size={26} />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-serif italic text-white text-lg">
                    Assinatura Eletrônica Gov.br
                  </h3>
                  <span className="bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-[10px] px-2.5 py-0.5 rounded-full font-bold uppercase tracking-wider">
                    Lei nº 14.063/2020
                  </span>
                </div>
                <p className="text-[#A1A1AA] text-xs mt-0.5">
                  Configure as credenciais do SSO Gov.br e da API de Assinatura do ITI (Instituto Nacional de Tecnologia da Informação).
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => handleGovBrChange('enabled', !govBrConfig.enabled)}
                className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer border ${
                  govBrConfig.enabled
                    ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                    : 'bg-[#18181B] text-[#71717A] border-[#27272A]'
                }`}
              >
                {govBrConfig.enabled ? <ToggleRight size={18} /> : <ToggleLeft size={18} />}
                <span>{govBrConfig.enabled ? 'Módulo Ativo' : 'Módulo Inativo'}</span>
              </button>

              <button
                type="button"
                onClick={handleSaveGovBr}
                className="flex items-center gap-1.5 bg-[#D4AF37] hover:bg-[#E5C158] text-black px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer shadow-lg shadow-[#D4AF37]/20"
              >
                <Save size={15} />
                <span>Salvar Credenciais</span>
              </button>
            </div>
          </div>

          {/* Integration Status Banner */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-[#18181B] border border-[#27272A] p-4 rounded-xl flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 shrink-0">
                <CheckCircle2 size={20} />
              </div>
              <div>
                <span className="text-[10px] text-[#A1A1AA] uppercase font-bold tracking-wider block">Validade Jurídica</span>
                <span className="text-white text-xs font-bold">Assinatura Avançada / Qualificada</span>
              </div>
            </div>

            <div className="bg-[#18181B] border border-[#27272A] p-4 rounded-xl flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-[#D4AF37]/10 text-[#D4AF37] border border-[#D4AF37]/20 shrink-0">
                <ShieldCheck size={20} />
              </div>
              <div>
                <span className="text-[10px] text-[#A1A1AA] uppercase font-bold tracking-wider block">Padrão de Criptografia</span>
                <span className="text-white text-xs font-bold">SHA-256 + PKCS#7 / ITI</span>
              </div>
            </div>

            <div className="bg-[#18181B] border border-[#27272A] p-4 rounded-xl flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-blue-500/10 text-blue-400 border border-blue-500/20 shrink-0">
                <ExternalLink size={20} />
              </div>
              <div>
                <span className="text-[10px] text-[#A1A1AA] uppercase font-bold tracking-wider block">Verificador de Assinaturas</span>
                <a
                  href="https://validar.iti.gov.br"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-400 hover:underline text-xs font-bold flex items-center gap-1"
                >
                  validar.iti.gov.br <ExternalLink size={10} />
                </a>
              </div>
            </div>
          </div>

          {/* Configuration Form */}
          <div className="space-y-5">
            {/* Environment Selector */}
            <div>
              <label className="block text-xs font-bold text-[#E4E4E7] uppercase tracking-wider mb-2">
                Ambiente de Execução da API Gov.br
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <button
                  type="button"
                  onClick={() => handleGovBrChange('ambiente', 'homologacao')}
                  className={`p-4 rounded-xl border text-left transition-all cursor-pointer ${
                    govBrConfig.ambiente === 'homologacao'
                      ? 'bg-amber-500/10 border-amber-500/50 text-white'
                      : 'bg-[#18181B] border-[#27272A] text-[#A1A1AA] hover:border-[#3F3F46]'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-bold text-xs uppercase tracking-wider text-amber-400">Homologação (Staging)</span>
                    {govBrConfig.ambiente === 'homologacao' && (
                      <span className="w-2 h-2 rounded-full bg-amber-400" />
                    )}
                  </div>
                  <p className="text-[11px] text-[#A1A1AA]">
                    Para testes sem validade fiscal com contas do ambiente de testes da SSO Gov.br.
                  </p>
                  <code className="block mt-2 font-mono text-[10px] text-amber-300/80">
                    https://sso.staging.acesso.gov.br
                  </code>
                </button>

                <button
                  type="button"
                  onClick={() => handleGovBrChange('ambiente', 'producao')}
                  className={`p-4 rounded-xl border text-left transition-all cursor-pointer ${
                    govBrConfig.ambiente === 'producao'
                      ? 'bg-emerald-500/10 border-emerald-500/50 text-white'
                      : 'bg-[#18181B] border-[#27272A] text-[#A1A1AA] hover:border-[#3F3F46]'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-bold text-xs uppercase tracking-wider text-emerald-400">Produção Oficial</span>
                    {govBrConfig.ambiente === 'producao' && (
                      <span className="w-2 h-2 rounded-full bg-emerald-400" />
                    )}
                  </div>
                  <p className="text-[11px] text-[#A1A1AA]">
                    Ambiente oficial da Secretaria de Governo Digital (SGD) para contratos reais.
                  </p>
                  <code className="block mt-2 font-mono text-[10px] text-emerald-300/80">
                    https://sso.acesso.gov.br
                  </code>
                </button>
              </div>
            </div>

            {/* Client ID & Secret */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-[#A1A1AA] mb-1.5">
                  Client ID (SSO Gov.br)
                </label>
                <div className="relative">
                  <Key size={16} className="absolute left-3.5 top-3 text-[#71717A]" />
                  <input
                    type="text"
                    value={govBrConfig.clientId}
                    onChange={(e) => handleGovBrChange('clientId', e.target.value)}
                    placeholder="Ex: locadora_acervus_app"
                    className="w-full bg-[#18181B] border border-[#27272A] rounded-xl pl-10 pr-4 py-2.5 text-xs text-white focus:outline-none focus:border-emerald-500 font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#A1A1AA] mb-1.5">
                  Client Secret (Chave Privada)
                </label>
                <div className="relative">
                  <Lock size={16} className="absolute left-3.5 top-3 text-[#71717A]" />
                  <input
                    type="password"
                    value={govBrConfig.clientSecret}
                    onChange={(e) => handleGovBrChange('clientSecret', e.target.value)}
                    placeholder="••••••••••••••••"
                    className="w-full bg-[#18181B] border border-[#27272A] rounded-xl pl-10 pr-4 py-2.5 text-xs text-white focus:outline-none focus:border-emerald-500 font-mono"
                  />
                </div>
              </div>
            </div>

            {/* Redirect URI */}
            <div>
              <label className="block text-xs font-semibold text-[#A1A1AA] mb-1.5">
                URI de Redirecionamento Cadastrada (Callback Redirect URI)
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={govBrConfig.redirectUri}
                  onChange={(e) => handleGovBrChange('redirectUri', e.target.value)}
                  className="w-full bg-[#18181B] border border-[#27272A] rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-emerald-500 font-mono"
                />
              </div>
              <p className="text-[11px] text-[#71717A] mt-1">
                Certifique-se de que esta mesma URL esteja autorizada no cadastro da sua aplicação no portal Gov.br.
              </p>
            </div>

            {/* Test Connection Button & Indicator */}
            <div className="pt-2 flex flex-col sm:flex-row items-center justify-between gap-4 border-t border-[#27272A]">
              <button
                type="button"
                onClick={handleTestGovBrConnection}
                disabled={isGovBrTesting}
                className="flex items-center gap-2 bg-[#18181B] hover:bg-[#27272A] border border-[#3F3F46] text-white px-4 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer disabled:opacity-50"
              >
                {isGovBrTesting ? (
                  <>
                    <RefreshCw size={14} className="animate-spin text-emerald-400" />
                    <span>Testando Handshake SSO...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 size={14} className="text-emerald-400" />
                    <span>Testar Conexão com SSO Gov.br</span>
                  </>
                )}
              </button>

              {isGovBrTestSuccess && (
                <div className="bg-emerald-500/10 border border-emerald-500/30 px-3.5 py-2 rounded-xl text-xs text-emerald-400 flex items-center gap-2 animate-fadeIn">
                  <CheckCircle2 size={16} />
                  <span>Conexão bem sucedida com o servidor SSO Gov.br ({govBrConfig.ambiente.toUpperCase()})</span>
                </div>
              )}
            </div>

            {/* API Endpoint Reference Box */}
            <div className="bg-[#0A0A0B] border border-[#27272A] p-4 rounded-xl space-y-3 font-mono text-[11px]">
              <span className="text-[#A1A1AA] uppercase font-bold text-[10px] tracking-wider block">
                URLs do Barramento da API Gov.br / ITI ({govBrConfig.ambiente})
              </span>
              <div className="space-y-1 text-[#D4AF37]">
                <div>• SSO Authorize: <span className="text-white">{GOVBR_ENDPOINTS[govBrConfig.ambiente].ssoAuthorize}</span></div>
                <div>• SSO Token: <span className="text-white">{GOVBR_ENDPOINTS[govBrConfig.ambiente].ssoToken}</span></div>
                <div>• Assinador PKCS7: <span className="text-white">{GOVBR_ENDPOINTS[govBrConfig.ambiente].assinadorApi}</span></div>
                <div>• Verificador Oficial ITI: <span className="text-white">{GOVBR_ENDPOINTS[govBrConfig.ambiente].verificador}</span></div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 4: PAINEL DE CONTROLE DE PERMISSÕES */}
      {activeSubTab === 'permissoes' && (
        <div className="space-y-6">
          <div className="bg-[#111113] border border-[#27272A] rounded-2xl p-6 shadow-xl space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pb-5 border-b border-[#27272A]">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-[#18181B] border border-[#27272A] flex items-center justify-center text-[#D4AF37]">
                  <ShieldCheck size={26} />
                </div>
                <div>
                  <h3 className="font-serif italic text-white text-lg flex items-center gap-2">
                    Permissões de Acesso
                  </h3>
                  <p className="text-[#A1A1AA] text-xs mt-0.5">
                    Grupo único e unificado de controle de acessos às funcionalidades e recursos do aplicativo.
                  </p>
                </div>
              </div>

              <span className="bg-[#D4AF37]/10 text-[#D4AF37] border border-[#D4AF37]/30 text-xs px-3 py-1 rounded-full font-bold flex items-center gap-1.5 shrink-0">
                <ShieldCheck size={14} />
                <span>Grupo Unificado</span>
              </span>
            </div>

            {/* Notification Toast */}
            {permissionNotice && (
              <div className="bg-[#D4AF37]/10 border border-[#D4AF37]/40 p-3.5 rounded-xl text-xs text-[#D4AF37] flex items-center gap-2 animate-fadeIn">
                <Info size={16} className="shrink-0" />
                <span>{permissionNotice}</span>
              </div>
            )}

            {/* Banner Informativo do Grupo Unificado */}
            <div className="bg-[#18181B] border border-[#27272A] p-4 rounded-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-[#111113] border border-[#27272A] flex items-center justify-center text-[#D4AF37] shrink-0">
                  <ShieldCheck size={16} />
                </div>
                <div>
                  <h4 className="text-white text-xs font-bold">Grupo Geral de Permissões de Acesso</h4>
                  <p className="text-[11px] text-[#A1A1AA]">Todas as permissões do aplicativo unificadas em uma estrutura única</p>
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={handleGrantAllPermissions}
                  className="px-3 py-1.5 bg-[#D4AF37] hover:bg-[#c4a02e] text-black text-xs font-bold rounded-lg shadow-md transition-all cursor-pointer flex items-center gap-1.5"
                  title="Ativar todas as permissões de uma vez só"
                >
                  <ToggleRight size={15} />
                  <span>Ativar Todas</span>
                </button>
                <button
                  type="button"
                  onClick={handleRevokeAllPermissions}
                  className="px-3 py-1.5 bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/30 text-xs font-bold rounded-lg transition-all cursor-pointer flex items-center gap-1.5"
                  title="Revogar todas as permissões de uma vez só"
                >
                  <ToggleLeft size={15} />
                  <span>Revogar Todas</span>
                </button>
                <span className="text-[10px] text-[#D4AF37] bg-[#111113] px-2.5 py-1 rounded-lg border border-[#27272A] font-mono font-bold shrink-0">
                  {androidPermissions.length} Permissões
                </span>
              </div>
            </div>

            {/* Permissions Grid - Single Unified Group */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {androidPermissions.map((perm) => {
                let PermIcon = ShieldCheck;
                if (perm.id === 'camera') PermIcon = Camera;
                if (perm.id === 'media') PermIcon = ImageIcon;
                if (perm.id === 'notifications') PermIcon = Bell;
                if (perm.id === 'alarm') PermIcon = Clock;
                if (perm.id === 'storage') PermIcon = HardDrive;
                if (perm.id === 'contacts') PermIcon = Users;

                return (
                  <div
                    key={perm.id}
                    className="bg-[#18181B] border border-[#27272A] p-4 rounded-xl space-y-3 transition-all hover:border-[#3F3F46]"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2.5">
                        <div className="w-9 h-9 rounded-xl bg-[#111113] border border-[#27272A] flex items-center justify-center text-[#D4AF37] shrink-0">
                          <PermIcon size={18} />
                        </div>
                        <div>
                          <h4 className="text-white text-xs font-bold">{perm.label}</h4>
                          <p className="text-[11px] text-[#A1A1AA]">
                            {perm.name}
                          </p>
                        </div>
                      </div>

                      <span
                        className={`text-[10px] px-2.5 py-0.5 rounded-full border flex items-center gap-1 shrink-0 font-medium ${
                          perm.granted
                            ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                            : 'bg-amber-500/10 text-amber-400 border-amber-500/30'
                        }`}
                      >
                        {perm.granted ? <CheckCircle2 size={12} /> : <XCircle size={12} />}
                        {perm.granted ? 'Concedido' : 'Pendente'}
                      </span>
                    </div>

                    <p className="text-[#A1A1AA] text-xs">{perm.description}</p>

                    <div className="flex justify-between items-center pt-2 border-t border-[#27272A]">
                      <span className="bg-[#111113] text-[#D4AF37] text-[10px] px-2.5 py-0.5 rounded-full border border-[#27272A] font-semibold">
                        Grupo Unificado
                      </span>

                      <button
                        type="button"
                        onClick={() => handleTogglePermission(perm.id)}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                          perm.granted
                            ? 'bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/30'
                            : 'bg-[#D4AF37] hover:bg-[#c4a02e] text-black shadow-md'
                        }`}
                      >
                        {perm.granted ? <ToggleRight size={16} /> : <ToggleLeft size={16} />}
                        <span>{perm.granted ? 'Revogar Permissão' : 'Solicitar Permissão'}</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* TAB 5: GERENCIAMENTO DE DISPOSITIVOS & SEGURANÇA */}
      {activeSubTab === 'dispositivos' && (
        <div className="space-y-6">
          <div className="bg-[#111113] border border-[#27272A] rounded-2xl p-6 shadow-xl space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pb-5 border-b border-[#27272A]">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-[#18181B] border border-[#27272A] flex items-center justify-center text-[#D4AF37]">
                  <Smartphone size={26} />
                </div>
                <div>
                  <h3 className="font-serif italic text-white text-lg flex items-center gap-2">
                    Controle de Dispositivos e Segurança (CNPJ / Telefone)
                  </h3>
                  <p className="text-[#A1A1AA] text-xs mt-0.5">
                    Gerencie, autorize e revogue novos aparelhos ou trocas de dispositivos de funcionários em tempo real com o Firebase.
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => {
                  setNovoUsuarioNome('');
                  setNovoUsuarioEmail('');
                  setNovoUsuarioNivel('OPERADOR');
                  setNovoUsuarioAparelho('');
                  setNovoUsuarioSenha('');
                  setShowNovoUsuarioSenha(false);
                  setNovoUsuarioCreatedSeed(null);
                  setNovoUsuarioUuid('DEV-89A-' + Math.random().toString(36).substring(2, 8).toUpperCase());
                  setNovoUsuarioCnpj(empresaConfig?.cnpj || '');
                  setNovoUsuarioTelefone('');
                  setIsNovoUsuarioModalOpen(true);
                }}
                className="px-4 py-2.5 bg-[#D4AF37] hover:bg-[#E5C158] text-[#0A0A0B] rounded-xl text-xs font-bold uppercase tracking-wider transition-all cursor-pointer flex items-center gap-2 shrink-0 shadow-lg shadow-[#D4AF37]/10"
              >
                <UserPlus size={16} />
                <span>Cadastrar Novo Usuário</span>
              </button>
            </div>

            {/* List and Actions */}
            {filteredDispositivos.length === 0 ? (
              <div className="text-center py-12 border border-dashed border-[#27272A] rounded-xl text-[#A1A1AA] text-sm space-y-2">
                <Smartphone size={32} className="mx-auto text-[#71717A] animate-pulse" />
                <p className="font-semibold text-white">Nenhum aparelho registrado ou solicitando acesso</p>
                <p className="text-xs max-w-sm mx-auto">
                  Aparelhos pendentes aparecerão aqui quando tentarem autenticar usando o CNPJ, Telefone e UUID do aparelho.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {/* Stats cards for devices */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="bg-[#18181B] border border-[#27272A] p-4 rounded-xl flex items-center justify-between">
                    <div>
                      <span className="text-[10px] text-[#A1A1AA] font-bold uppercase block">Dispositivos Ativos</span>
                      <span className="text-xl font-bold text-white">{filteredDispositivos.filter(d => d.status === 'APROVADO').length}</span>
                    </div>
                    <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400">
                      <CheckCircle size={18} />
                    </div>
                  </div>
                  <div className="bg-[#18181B] border border-[#27272A] p-4 rounded-xl flex items-center justify-between">
                    <div>
                      <span className="text-[10px] text-[#A1A1AA] font-bold uppercase block">Solicitações Pendentes</span>
                      <span className="text-xl font-bold text-white">{filteredDispositivos.filter(d => d.status === 'PENDENTE').length}</span>
                    </div>
                    <div className="p-2 rounded-lg bg-amber-500/10 text-amber-400">
                      <Clock size={18} />
                    </div>
                  </div>
                  <div className="bg-[#18181B] border border-[#27272A] p-4 rounded-xl flex items-center justify-between">
                    <div>
                      <span className="text-[10px] text-[#A1A1AA] font-bold uppercase block">Total de Dispositivos</span>
                      <span className="text-xl font-bold text-white">{filteredDispositivos.length}</span>
                    </div>
                    <div className="p-2 rounded-lg bg-[#D4AF37]/10 text-[#D4AF37]">
                      <Smartphone size={18} />
                    </div>
                  </div>
                </div>

                {/* Device table/list */}
                <div className="overflow-x-auto border border-[#27272A] rounded-xl bg-[#0A0A0B]">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="border-b border-[#27272A] bg-[#111113] text-[#A1A1AA] font-semibold uppercase tracking-wider text-[10px]">
                        <th className="p-4">Aparelho / IMEI Hardware</th>
                        <th className="p-4">Usuário Responsável</th>
                        <th className="p-4">Nível de Acesso</th>
                        <th className="p-4">CNPJ Empresa</th>
                        <th className="p-4">Telefone / Celular</th>
                        <th className="p-4">Data Solicitação</th>
                        <th className="p-4">Status</th>
                        <th className="p-4 text-right">Ações de Segurança</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#27272A]">
                      {filteredDispositivos.map((dev, idx) => (
                        <tr key={`${dev.id || 'dev'}-${idx}`} className="hover:bg-[#111113]/40 transition-colors">
                          <td className="p-4 space-y-1">
                            <div className="flex items-center gap-2">
                              <Smartphone size={14} className="text-[#D4AF37]" />
                              <span className="font-bold text-white text-sm">{dev.nomeDispositivo}</span>
                            </div>
                            <div className="font-mono text-[10px] text-[#71717A] max-w-xs truncate" title={dev.imei || dev.id}>
                              IMEI / UUID: <span className="text-[#D4AF37]">{dev.imei || dev.id}</span>
                            </div>
                          </td>
                          <td className="p-4 font-medium text-white">
                            <div className="flex items-center gap-1.5">
                              {true && (
                                <Plug
                                  size={13}
                                  className={`${
                                    dev.ultimoAcesso && Date.now() - dev.ultimoAcesso < 60 * 1000
                                      ? 'text-emerald-500'
                                      : 'text-gray-600'
                                  }`}
                                />
                              )}
                              <User size={13} className="text-[#D4AF37]" />
                              <span>{dev.usuario || empresaData.nomeRepresentante || 'Representante Legal'}</span>
                            </div>
                          </td>
                          <td className="p-4">
                            <div className="space-y-1">
                              <span className={`px-2 py-0.5 rounded text-[10px] font-extrabold uppercase border ${
                                dev.nivelAcesso === 'DESENVOLVEDOR' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' :
                                dev.nivelAcesso === 'ADMINISTRADOR' ? 'bg-amber-500/10 text-amber-400 border-amber-500/20' :
                                dev.nivelAcesso === 'GERENTE' ? 'bg-sky-500/10 text-sky-400 border-sky-500/20' :
                                'bg-zinc-500/10 text-zinc-400 border-zinc-500/20'
                              }`}>
                                {dev.nivelAcesso || 'OPERADOR'}
                              </span>
                              <div className="text-[10px] text-[#71717A] font-medium truncate max-w-[150px]" title={
                                dev.nivelAcesso === 'DESENVOLVEDOR' ? 'Acesso Total Irrestrito (Desenvolvedor)' :
                                dev.nivelAcesso === 'ADMINISTRADOR' ? 'Acesso Total' :
                                dev.permissoesModulos && dev.permissoesModulos.length > 0 ? dev.permissoesModulos.join(', ') : 'Módulos Padrão'
                              }>
                                {dev.nivelAcesso === 'DESENVOLVEDOR' ? 'Acesso total irrestrito (Dev)' :
                                 dev.nivelAcesso === 'ADMINISTRADOR' ? 'Acesso total irrestrito' :
                                 dev.permissoesModulos && dev.permissoesModulos.length > 0 ? `${dev.permissoesModulos.length} módulos ativos` :
                                 dev.nivelAcesso === 'GERENTE' ? 'Exceto segurança' : 'Inventário, reservas, clientes'}
                              </div>
                            </div>
                          </td>
                          <td className="p-4 font-mono text-[#E4E4E7]">{dev.cnpjEmpresa}</td>
                          <td className="p-4 font-mono text-[#E4E4E7]">{dev.telefone}</td>
                          <td className="p-4 text-[#A1A1AA] font-mono">
                            {new Date(dev.dataSolicitacao).toLocaleDateString('pt-BR', {
                              day: '2-digit',
                              month: '2-digit',
                              year: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </td>
                          <td className="p-4">
                            <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase border ${
                              dev.status === 'APROVADO' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' :
                              dev.status === 'PENDENTE' ? 'bg-amber-500/10 text-amber-400 border-amber-500/20 animate-pulse' :
                              'bg-red-500/10 text-red-400 border-red-500/20'
                            }`}>
                              {dev.status === 'APROVADO' ? 'Aprovado' :
                               dev.status === 'PENDENTE' ? 'Pendente' :
                               dev.status === 'REJEITADO' ? 'Rejeitado' : 'Revogado'}
                            </span>
                          </td>
                          <td className="p-4 text-right">
                            <div className="flex justify-end gap-2">
                              {dev.status === 'PENDENTE' && (
                                <>
                                  <button
                                    onClick={() => onUpdateDispositivoStatus(dev.id, 'APROVADO')}
                                    className="bg-emerald-500 hover:bg-emerald-600 text-black px-2.5 py-1 rounded-lg text-[11px] font-bold uppercase cursor-pointer"
                                  >
                                    Aprovar
                                  </button>
                                  <button
                                    onClick={() => onUpdateDispositivoStatus(dev.id, 'REJEITADO')}
                                    className="bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 px-2.5 py-1 rounded-lg text-[11px] font-bold uppercase cursor-pointer"
                                  >
                                    Rejeitar
                                  </button>
                                </>
                              )}

                              {dev.status === 'APROVADO' && (
                                <div className="flex items-center gap-2 justify-end">
                                  <button
                                    onClick={() => onUpdateDispositivoStatus(dev.id, 'REVOGADO')}
                                    className="bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 px-2.5 py-1 rounded-lg text-[11px] font-bold uppercase cursor-pointer"
                                  >
                                    Revogar Acesso
                                  </button>
                                  <button
                                    onClick={() => onUpdateDispositivoStatus(dev.id, 'APROVADO', { isTerminalBlocked: !dev.isTerminalBlocked })}
                                    className={`${dev.isTerminalBlocked ? 'bg-red-500 text-white' : 'bg-gray-700 text-gray-300'} hover:opacity-90 px-2.5 py-1 rounded-lg text-[11px] font-bold uppercase cursor-pointer`}
                                  >
                                    {dev.isTerminalBlocked ? 'Desbloquear Term.' : 'Bloquear Term.'}
                                  </button>
                                  <button
                                    onClick={() => onUpdateDispositivoStatus(dev.id, 'APROVADO', { isUserBlocked: !dev.isUserBlocked })}
                                    className={`${dev.isUserBlocked ? 'bg-orange-500 text-white' : 'bg-gray-700 text-gray-300'} hover:opacity-90 px-2.5 py-1 rounded-lg text-[11px] font-bold uppercase cursor-pointer`}
                                    title="Alterna o estado de bloqueio de acesso deste operador (Gestão administrativa)."
                                  >
                                    {dev.isUserBlocked ? 'Desbloquear Usuário' : 'Bloquear Usuário'}
                                  </button>
                                  <button
                                    onClick={() => onUpdateDispositivoStatus(dev.id, dev.status, { usuario: undefined, email: undefined, senha: undefined })}
                                    className="bg-yellow-500/10 hover:bg-yellow-500/20 text-yellow-400 border border-yellow-500/20 px-2.5 py-1 rounded-lg text-[11px] font-bold uppercase cursor-pointer"
                                    title="Encerra a sessão ativa deste operador imediatamente (Ação direta de emergência)."
                                  >
                                    Encerrar Sessão
                                  </button>
                                </div>
                              )}

                              {(dev.status === 'REVOGADO' || dev.status === 'REJEITADO') && (
                                <button
                                  onClick={() => onUpdateDispositivoStatus(dev.id, 'APROVADO')}
                                  className="bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/20 px-2.5 py-1 rounded-lg text-[11px] font-bold uppercase cursor-pointer"
                                >
                                  Re-aprovar
                                </button>
                              )}

                              <button
                                onClick={() => setEditingPermissionsDev(dev)}
                                className="bg-[#18181B] hover:bg-[#27272A] border border-[#27272A] p-1.5 rounded-lg text-[#D4AF37] hover:text-[#E5C158] transition-colors cursor-pointer"
                                title="Editar Dados do Usuário, Nível de Acesso e Permissões"
                              >
                                <Sliders size={14} />
                              </button>

                              <button
                                onClick={() => onDeleteDispositivo(dev.id)}
                                className="bg-[#18181B] hover:bg-[#27272A] border border-[#27272A] p-1.5 rounded-lg text-[#71717A] hover:text-red-400 transition-colors cursor-pointer"
                                title="Excluir Registro"
                              >
                                <X size={14} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 11: FORMULÁRIOS GOOGLE FORMS E ORÇAMENTOS */}
      {activeSubTab === 'google_forms' && (
        <div className="space-y-6">
          <WebFormModal
            webForms={webForms}
            itens={itens}
            googleAccount={googleAccount}
            clientes={clientes}
            onCreateGoogleForm={onCreateGoogleForm}
            onSimulateCustomerSubmit={onSimulateCustomerSubmit}
            onUpdateGoogleAccount={onUpdateGoogleAccount}
            onDeleteWebForm={onDeleteWebForm}
            empresaConfig={empresaConfig}
            hideHeader
            onNavigateToCreateOrcamento={onNavigateToCreateOrcamento}
          />
        </div>
      )}

      {/* TAB 7: SINCRONIZAÇÃO & WORKER */}
      {activeSubTab === 'sincronizacao' && (
        <WorkManagerSimModal webForms={webForms} onTriggerWorkerSync={onTriggerWorkerSync} hideHeader />
      )}

      {/* TAB 8: PAINEL DO DESENVOLVEDOR */}
      {activeSubTab === 'developer' && (
        authenticatedDevice?.nivelAcesso === 'DESENVOLVEDOR' ? (
          <DeveloperTestPanel 
            itens={itens} 
            clientes={clientes} 
            reservas={reservas} 
            webForms={webForms} 
            dispositivos={dispositivos} 
            empresaConfig={empresaConfig}
            onTriggerWorkerSync={onTriggerWorkerSync}
            onRefreshData={onRefreshData}
            onSaveConfig={onSaveConfig}
            hideHeader
          />
        ) : (
          <div className="bg-[#111113] border border-amber-500/30 rounded-2xl p-8 text-center space-y-4 max-w-xl mx-auto my-12 shadow-2xl animate-fadeIn">
            <div className="p-4 bg-amber-500/10 border border-amber-500/30 text-amber-400 rounded-full w-16 h-16 mx-auto flex items-center justify-center">
              <ShieldAlert size={32} />
            </div>
            <div className="space-y-2">
              <h3 className="text-lg font-serif italic font-extrabold text-white">
                Acesso Restrito ao Desenvolvedor
              </h3>
              <p className="text-xs text-[#A1A1AA] leading-relaxed">
                O <strong>Painel do Desenvolvedor</strong> está disponível exclusivamente para usuários autenticados com o nível de acesso <strong>DESENVOLVEDOR</strong>.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setActiveSubTab('empresa')}
              className="px-6 py-2.5 bg-[#18181B] hover:bg-[#27272A] border border-[#27272A] text-white text-xs font-bold rounded-xl transition-all cursor-pointer inline-flex items-center gap-2"
            >
              <Building2 size={16} />
              <span>Voltar aos Dados da Empresa</span>
            </button>
          </div>
        )
      )}

      {/* TAB 10: SORTEIOS INSTAGRAM API */}
      {activeSubTab === 'instagram_sorteio' && (
        <InstagramSorteioModule empresaConfig={empresaData} />
      )}

      {/* TAB 12: GUIA DO SISTEMA & ARQUITETURA */}
      {activeSubTab === 'guia_arquitetura' && (
        <GuiaSistemaArquiteturaView />
      )}

      {/* TAB 11: GESTÃO DE DADOS BANCO DE DADOS CLOUD SQL */}
      {activeSubTab === 'admin_dados' && (
        <div className="bg-[#111113] border border-[#27272A] rounded-2xl p-8 text-center space-y-4 max-w-2xl mx-auto my-8 shadow-2xl animate-fadeIn">
          <div className="p-4 bg-[#D4AF37]/10 border border-[#D4AF37]/30 text-[#D4AF37] rounded-full w-16 h-16 mx-auto flex items-center justify-center">
            <Database size={32} />
          </div>
          <div className="space-y-2">
            <h3 className="text-lg font-serif italic font-extrabold text-white">
              Explorador & Gestor do Banco de Dados Unificado
            </h3>
            <p className="text-xs text-[#A1A1AA] leading-relaxed">
              A ferramenta de gestão de banco de dados foi unificada e centralizada com recursos avançados (Índices, Visões SQL, Diagrama ERD e Console SQL) exclusivamente no <strong>Painel do Desenvolvedor</strong>.
            </p>
          </div>
          {authenticatedDevice?.nivelAcesso === 'DESENVOLVEDOR' ? (
            <button
              type="button"
              onClick={() => setActiveSubTab('developer')}
              className="px-6 py-3 bg-[#D4AF37] hover:bg-[#c2a032] text-black font-extrabold text-xs rounded-xl transition-all shadow-lg cursor-pointer inline-flex items-center gap-2"
            >
              <Code2 size={16} />
              <span>Abrir Explorador & Gestor DB no Painel do Desenvolvedor</span>
            </button>
          ) : (
            <div className="p-3 bg-amber-500/10 border border-amber-500/30 text-amber-400 text-xs rounded-xl font-medium inline-block font-mono">
              🔒 Requer nível de acesso DESENVOLVEDOR para acessar o Painel do Desenvolvedor.
            </div>
          )}
        </div>
      )}

      {/* GOOGLE DRIVE FOLDER SELECTOR MODAL */}
      {isFolderModalOpen && (
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
                <h3 className="text-white text-sm font-bold">Explorador de Arquivos do Google Drive</h3>
                <p className="text-[#A1A1AA] text-xs">
                  Navegue pela estrutura em tempo real da conta vinculada ou insira um caminho manual.
                </p>
              </div>
            </div>

            {googleAccount.isConnected && (
              <div className="bg-[#111113] border border-[#27272A] px-3.5 py-2.5 rounded-xl flex items-center justify-between text-xs shrink-0">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  <span className="text-[#71717A]">Conectado como:</span>
                  <span className="text-white font-semibold">{googleAccount.email}</span>
                </div>
                <span className="text-[10px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2 py-0.5 rounded-full font-medium">
                  API Ativa
                </span>
              </div>
            )}

            {/* Tree Navigation Container */}
            <div className="flex-1 overflow-y-auto pr-1 space-y-1.5 border border-[#27272A] bg-[#0A0A0B] p-4 rounded-xl min-h-[180px] max-h-[300px] custom-scrollbar">
              {renderFolderNode('root', 0)}
            </div>

            {/* Path Text Input - Free direct path editor */}
            <div className="space-y-2 shrink-0">
              <div className="flex justify-between items-center">
                <label className="text-xs font-bold text-white block">
                  Caminho da Pasta Destino:
                </label>
                <span className="text-[10px] text-[#A1A1AA]">Digite livremente ou selecione na árvore</span>
              </div>
              <input
                type="text"
                value={selectedFolderPath}
                onChange={(e) => setSelectedFolderPath(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-[#111113] border border-[#27272A] rounded-xl text-xs text-white focus:border-[#D4AF37] focus:outline-none placeholder-[#71717A] font-mono tracking-wide shadow-inner"
                placeholder="Ex: /Meu Drive/Eventos/Formularios"
              />
            </div>

            {/* Sub-controls: Create folder */}
            <div className="shrink-0 pt-1">
              {!showCreateFolderInput ? (
                <button
                  type="button"
                  onClick={() => setShowCreateFolderInput(true)}
                  className="w-full flex items-center justify-center gap-2 bg-[#111113] hover:bg-[#27272A] text-[#D4AF37] border border-[#27272A] py-2.5 rounded-xl text-xs font-semibold transition-all cursor-pointer"
                >
                  <FolderPlus size={14} />
                  <span>+ Criar pasta dentro da selecionada</span>
                </button>
              ) : (
                <div className="bg-[#111113] border border-[#27272A] p-3 rounded-xl space-y-2.5 animate-fadeIn">
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-[#E4E4E7] font-semibold">Nova Subpasta</span>
                    <button 
                      type="button" 
                      onClick={() => setShowCreateFolderInput(false)}
                      className="text-[#71717A] hover:text-white text-xs"
                    >
                      Cancelar
                    </button>
                  </div>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      placeholder="Nome da subpasta (ex: Contratos 2026)"
                      value={newFolderName}
                      onChange={(e) => setNewFolderName(e.target.value)}
                      className="flex-1 px-3 py-2 bg-[#18181B] border border-[#27272A] rounded-xl text-xs text-white focus:border-[#D4AF37] focus:outline-none"
                    />
                    <button
                      type="button"
                      onClick={handleCreateNewFolder}
                      className="bg-[#D4AF37] hover:bg-[#E5C158] text-black px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer shadow-md"
                    >
                      Criar
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Action Buttons */}
            <div className="flex items-center gap-3 pt-3 border-t border-[#27272A] shrink-0">
              <button
                type="button"
                onClick={() => setIsFolderModalOpen(false)}
                className="flex-1 bg-[#111113] hover:bg-[#27272A] text-[#A1A1AA] hover:text-white border border-[#27272A] py-3 rounded-xl text-xs font-bold transition-all cursor-pointer text-center"
              >
                Voltar
              </button>
              <button
                type="button"
                onClick={handleSaveSelectedFolder}
                className="flex-1 bg-[#D4AF37] hover:bg-[#E5C158] text-black py-3 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-2 shadow-lg shadow-[#D4AF37]/10"
              >
                <CheckCircle size={15} />
                <span>Salvar Pasta Selecionada</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* DELEGATE ACCESS & EDIT USER DATA MODAL */}
      {editingPermissionsDev && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-[#18181B] border border-[#27272A] w-full max-w-lg rounded-2xl p-6 space-y-5 shadow-2xl relative flex flex-col max-h-[90vh]">
            <button
              onClick={() => setEditingPermissionsDev(null)}
              className="absolute top-4 right-4 text-[#A1A1AA] hover:text-white transition-colors cursor-pointer"
            >
              <X size={18} />
            </button>

            <div className="flex items-center gap-3 border-b border-[#27272A] pb-4 shrink-0">
              <div className="w-10 h-10 rounded-full bg-[#D4AF37]/20 text-[#D4AF37] flex items-center justify-center font-bold text-sm border border-[#D4AF37]/30 shrink-0">
                <ShieldCheck size={18} />
              </div>
              <div>
                <h3 className="text-white text-sm font-bold">Editar Dados do Usuário & Permissões MDM</h3>
                <p className="text-[#A1A1AA] text-xs">
                  Aparelho: <span className="text-[#D4AF37]">{editingNomeDispositivo || editingPermissionsDev.nomeDispositivo}</span> • Usuário: <span className="text-white font-medium">{editingUsuario || 'Representante Legal'}</span>
                </p>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto pr-1 space-y-4 custom-scrollbar py-1">
              {/* Seção 1: Dados do Usuário & Terminal */}
              <div className="space-y-3 bg-[#111113] border border-[#27272A] p-3.5 rounded-xl">
                <h4 className="text-xs font-bold text-[#D4AF37] uppercase tracking-wider font-mono flex items-center gap-1.5">
                  <User size={13} />
                  Dados do Usuário Responsável & Terminal
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-semibold text-[#A1A1AA] mb-1">
                      Usuário Responsável:
                    </label>
                    <input
                      type="text"
                      value={editingUsuario}
                      onChange={(e) => setEditingUsuario(e.target.value)}
                      placeholder="Ex: Carlos Silva"
                      className="w-full px-3 py-2 bg-[#18181B] border border-[#27272A] rounded-xl text-xs text-white focus:border-[#D4AF37] focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-[#A1A1AA] mb-1">
                      Nome do Aparelho:
                    </label>
                    <input
                      type="text"
                      value={editingNomeDispositivo}
                      onChange={(e) => setEditingNomeDispositivo(e.target.value)}
                      placeholder="Ex: Tablet Galpão 01"
                      className="w-full px-3 py-2 bg-[#18181B] border border-[#27272A] rounded-xl text-xs text-white focus:border-[#D4AF37] focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-[#A1A1AA] mb-1 flex items-center justify-between">
                      <span className="flex items-center gap-1.5">
                        <Lock size={12} className="text-[#D4AF37]" />
                        CNPJ da Empresa:
                      </span>
                      <span className="text-[10px] text-[#71717A] italic font-normal">(Vinculado)</span>
                    </label>
                    <input
                      type="text"
                      disabled
                      readOnly
                      value={editingCnpjEmpresa || empresaConfig?.cnpj || ''}
                      placeholder="Ex: 12.345.678/0001-90"
                      className="w-full px-3 py-2 bg-[#18181B]/50 border border-[#27272A] rounded-xl text-xs text-[#71717A] cursor-not-allowed font-mono focus:outline-none select-none"
                      title="O CNPJ está vinculado permanentemente à empresa contratante e não pode ser alterado."
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-[#A1A1AA] mb-1">
                      Senha de Acesso:
                    </label>
                    {/* ALTERADO: Senha oculta por padrão (type password) com alternador de visibilidade seguro */}
                    <div className="relative flex items-center">
                      <input
                        type={showEditingSenha ? 'text' : 'password'}
                        value={editingSenha}
                        onChange={(e) => setEditingSenha(e.target.value)}
                        placeholder="••••••••"
                        className="w-full pl-3 pr-10 py-2 bg-[#18181B] border border-[#27272A] rounded-xl text-xs text-white focus:border-[#D4AF37] focus:outline-none font-mono"
                      />
                      <button
                        type="button"
                        onClick={() => setShowEditingSenha(!showEditingSenha)}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#71717A] hover:text-[#D4AF37] transition-colors p-1 cursor-pointer"
                        title={showEditingSenha ? 'Ocultar senha' : 'Exibir senha'}
                      >
                        {showEditingSenha ? <EyeOff size={14} /> : <Eye size={14} />}
                      </button>
                    </div>
                  </div>

                  <div className="sm:col-span-2">
                    <label className="block text-[11px] font-semibold text-[#A1A1AA] mb-1">
                      Telefone / Celular (com País / DDI):
                    </label>
                    <PhoneInput
                      value={editingTelefone}
                      onChange={(val) => setEditingTelefone(val)}
                      placeholder="11 99999-8888"
                    />
                  </div>
                </div>
              </div>

              {/* Seção 2: Nível de acesso (Role Selection) */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-white block">
                  Selecione o Nível de Acesso (Cargo):
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {(['OPERADOR', 'GERENTE', 'ADMINISTRADOR', 'DESENVOLVEDOR'] as const).map((role) => (
                    <button
                      key={role}
                      type="button"
                      onClick={() => {
                        setEditingNivelAcesso(role);
                        if (role === 'DESENVOLVEDOR') {
                          setEditingPermissoes(['inventario', 'reservas', 'clientes', 'financeiro', 'manutencao', 'relatorios', 'empresa', 'sincronizacao', 'developer', 'instagram_sorteio']);
                        } else if (role === 'ADMINISTRADOR') {
                          setEditingPermissoes(['inventario', 'reservas', 'clientes', 'financeiro', 'manutencao', 'relatorios', 'empresa']);
                        } else if (role === 'OPERADOR') {
                          setEditingPermissoes(['inventario', 'reservas', 'clientes']);
                        } else {
                          setEditingPermissoes(['inventario', 'reservas', 'clientes', 'financeiro', 'manutencao', 'relatorios']);
                        }
                      }}
                      className={`p-2.5 rounded-xl border text-center transition-all cursor-pointer flex flex-col items-center justify-center gap-1 ${
                        editingNivelAcesso === role
                          ? role === 'DESENVOLVEDOR'
                            ? 'bg-emerald-500/10 border-emerald-500 text-emerald-400 font-bold'
                            : 'bg-[#D4AF37]/10 border-[#D4AF37] text-white font-bold'
                          : 'bg-[#111113] border-[#27272A] text-[#A1A1AA] hover:border-[#3F3F46]'
                      }`}
                    >
                      <span className="text-[11px] font-bold tracking-wide uppercase">{role}</span>
                    </button>
                  ))}
                </div>

                <div className="bg-[#111113] border border-[#27272A] p-2.5 rounded-xl text-[11px] text-[#A1A1AA] leading-relaxed">
                  {editingNivelAcesso === 'DESENVOLVEDOR' && (
                    <p className="flex items-start gap-1.5">
                      <span className="text-emerald-400 font-bold">💻 Desenvolvedor:</span>
                      Acesso irrestrito a todos os módulos, menus técnicos, logs do sistema e APIs do Google.
                    </p>
                  )}
                  {editingNivelAcesso === 'ADMINISTRADOR' && (
                    <p className="flex items-start gap-1.5">
                      <span className="text-amber-400 font-bold">⚡ Administrador:</span>
                      Acesso absoluto e irrestrito. Pode gerenciar todas as configurações da locadora, finanças, modelos de contratos e auditar outros terminais.
                    </p>
                  )}
                  {editingNivelAcesso === 'GERENTE' && (
                    <p className="flex items-start gap-1.5">
                      <span className="text-sky-400 font-bold">💼 Gerente:</span>
                      Acesso intermediário. Pode gerenciar o acervo, clientes, reservas e financeiro, mas com restrições em painéis de segurança e desenvolvedores.
                    </p>
                  )}
                  {editingNivelAcesso === 'OPERADOR' && (
                    <p className="flex items-start gap-1.5">
                      <span className="text-zinc-400 font-bold">🔧 Operador:</span>
                      Acesso restrito operacional. Focado no controle diário de entrega e devolução de materiais, sem visualização de dados financeiros sensíveis.
                    </p>
                  )}
                </div>
              </div>

              {/* Seção 3: Permissões de Módulos */}
              <div className="space-y-2.5">
                <div className="flex justify-between items-center">
                  <label className="text-xs font-bold text-white block">
                    Conceder Acesso aos Módulos:
                  </label>
                  {editingNivelAcesso === 'ADMINISTRADOR' && (
                    <span className="text-[10px] bg-amber-500/10 text-amber-400 border border-amber-500/20 px-2 py-0.5 rounded-full font-medium">
                      Todos liberados
                    </span>
                  )}
                </div>

                <div className="bg-[#111113] border border-[#27272A] rounded-xl p-3 space-y-2">
                  {[
                    { id: 'inventario', label: 'Inventário & Acervo', desc: 'Gestão de materiais, kits e controle de estoque físico.', icon: Package },
                    { id: 'reservas', label: 'Reservas & Locações', desc: 'Criação de contratos, faturamento e fluxo de status.', icon: Calendar },
                    { id: 'google_forms', label: 'Orçamentos', desc: 'Gerenciamento de orçamentos, propostas e links de captação.', icon: FileSpreadsheet },
                    { id: 'clientes', label: 'Clientes', desc: 'Cadastro de contratantes, telefone e endereços.', icon: Users },
                    { id: 'financeiro', label: 'Financeiro', desc: 'Fluxo de caixa de despesas e receitas de locações.', icon: DollarSign },
                    { id: 'relatorios', label: 'Relatórios', desc: 'PDFs customizados de orçamentos e relatórios em tempo real.', icon: FileText },
                    { id: 'manutencao', label: 'Manutenção', desc: 'Inspeções preventivas e registro de reparos.', icon: Wrench },
                    { id: 'empresa', label: 'Configurações de Empresa', desc: 'Alterar dados cadastrais, temas e integrações.', icon: Building2 },
                  ].map((mod) => {
                    const ModIcon = mod.icon;
                    const isChecked = editingPermissoes.includes(mod.id);
                    const isDisabled = editingNivelAcesso === 'ADMINISTRADOR' || editingNivelAcesso === 'DESENVOLVEDOR';

                    return (
                      <label
                        key={mod.id}
                        className={`flex items-start gap-3 p-2.5 rounded-lg border transition-all select-none ${
                          isDisabled ? 'opacity-60 cursor-not-allowed bg-[#18181B]/40 border-transparent' : 'cursor-pointer hover:bg-[#18181B]/60'
                        } ${
                          isChecked && !isDisabled ? 'bg-[#18181B]/80 border-[#3F3F46]' : 'border-transparent'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={isChecked}
                          disabled={isDisabled}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setEditingPermissoes([...editingPermissoes, mod.id]);
                            } else {
                              setEditingPermissoes(editingPermissoes.filter((id) => id !== mod.id));
                            }
                          }}
                          className="mt-1 rounded border-[#27272A] text-[#D4AF37] focus:ring-[#D4AF37] focus:ring-offset-0 bg-[#0A0A0B]"
                        />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5">
                            <ModIcon size={13} className={isChecked ? 'text-[#D4AF37]' : 'text-[#71717A]'} />
                            <span className="text-xs font-bold text-white leading-none">{mod.label}</span>
                          </div>
                          <p className="text-[10px] text-[#71717A] mt-1 leading-relaxed">{mod.desc}</p>
                        </div>
                      </label>
                    );
                  })}
                </div>
              </div>

              {/* Developer exclusive options for DESENVOLVEDOR profile in MDM */}
              {editingNivelAcesso === 'DESENVOLVEDOR' && (
                <div className="space-y-3 pt-3 border-t border-[#27272A]">
                  <p className="text-[10px] uppercase font-bold text-emerald-400 tracking-wider">
                    Opções Exclusivas do Perfil Desenvolvedor (MDM)
                  </p>

                  <div className="bg-[#111113] p-3.5 rounded-xl border border-[#D4AF37]/20 flex items-center justify-between">
                    <div>
                      <p className="text-xs font-bold text-white flex items-center gap-1.5">
                        <Code2 size={15} className="text-[#D4AF37]" />
                        Modo Desenvolvedor / Android ART
                      </p>
                      <p className="text-[10px] text-[#A1A1AA]">
                        Habilita logs de diagnóstico e ferramentas de depuração em tempo real no terminal.
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={handleToggleDevMode}
                      className={`w-11 h-6 rounded-full p-1 transition-colors duration-200 cursor-pointer ${
                        isDevMode ? 'bg-emerald-500' : 'bg-[#3F3F46]'
                      }`}
                    >
                      <div
                        className={`w-4 h-4 rounded-full bg-white transition-transform duration-200 ${
                          isDevMode ? 'translate-x-5' : 'translate-x-0'
                        }`}
                      />
                    </button>
                  </div>

                  {isDevMode && (
                    <div className="bg-[#111113] p-3.5 rounded-xl border border-[#27272A] flex items-center justify-between">
                      <div>
                        <p className="text-xs font-bold text-white flex items-center gap-1.5">
                          <Code2 size={15} className="text-[#D4AF37]" />
                          Exibir Guia do Sistema & Arquitetura
                        </p>
                        <p className="text-[10px] text-[#A1A1AA]">
                          Habilita a aba com a especificação técnica Android e banco local.
                        </p>
                      </div>

                      <button
                        type="button"
                        onClick={handleToggleExibirGuia}
                        className={`w-11 h-6 rounded-full p-1 transition-colors duration-200 cursor-pointer ${
                          themeData.exibirGuiaArquitetura ? 'bg-emerald-500' : 'bg-[#3F3F46]'
                        }`}
                      >
                        <div
                          className={`w-4 h-4 rounded-full bg-white transition-transform duration-200 ${
                            themeData.exibirGuiaArquitetura ? 'translate-x-5' : 'translate-x-0'
                          }`}
                        />
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Save Buttons */}
            <div className="flex items-center gap-3 pt-3 border-t border-[#27272A] shrink-0">
              <button
                type="button"
                onClick={() => setEditingPermissionsDev(null)}
                className="flex-1 bg-[#111113] hover:bg-[#27272A] text-[#A1A1AA] hover:text-white border border-[#27272A] py-3 rounded-xl text-xs font-bold transition-all cursor-pointer text-center"
              >
                Voltar
              </button>
              <button
                type="button"
                onClick={() => {
                  onUpdateDispositivoStatus(editingPermissionsDev.id, editingPermissionsDev.status, {
                    nivelAcesso: editingNivelAcesso,
                    permissoesModulos: editingPermissoes,
                    usuario: editingUsuario,
                    nomeDispositivo: editingNomeDispositivo,
                    telefone: editingTelefone,
                    cnpjEmpresa: editingCnpjEmpresa || editingPermissionsDev.cnpjEmpresa || empresaConfig?.cnpj || '',
                    senha: editingSenha,
                  });
                  setEditingPermissionsDev(null);
                }}
                className="flex-1 bg-[#D4AF37] hover:bg-[#E5C158] text-black py-3 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-2 shadow-lg shadow-[#D4AF37]/10"
              >
                <CheckCircle size={15} />
                <span>Salvar Alterações</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Cadastrar Novo Usuário MDM Modal (Terminal Registration Design) */}
      {isNovoUsuarioModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="w-full max-w-lg bg-[#111113] border border-[#27272A] rounded-3xl p-6 shadow-2xl space-y-5 max-h-[90vh] overflow-y-auto custom-scrollbar">
            
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-4 border-b border-[#27272A]">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-2xl bg-[#D4AF37]/10 border border-[#D4AF37]/30 flex items-center justify-center text-[#D4AF37] shrink-0 shadow-inner">
                  <Smartphone size={22} />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-serif italic text-white text-base font-bold">
                      Cadastrar Novo Usuário / Terminal MDM
                    </h3>
                    <span className="text-[9px] bg-[#D4AF37]/10 text-[#D4AF37] border border-[#D4AF37]/30 px-2 py-0.5 rounded-full font-mono font-bold uppercase">
                      ART Terminal
                    </span>
                  </div>
                  <p className="text-[#A1A1AA] text-xs mt-0.5">
                    Formulário Oficial de Credenciamento & Acesso ao Sistema
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsNovoUsuarioModalOpen(false)}
                className="p-1.5 text-[#A1A1AA] hover:text-white rounded-xl hover:bg-[#27272A] transition-colors cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            {novoUsuarioCreatedSeed ? (
              <div className="space-y-4 py-2">
                <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl text-center space-y-2">
                  <CheckCircle size={32} className="mx-auto text-emerald-400" />
                  <h4 className="text-sm font-bold text-white">Terminal & Operador Credenciados!</h4>
                  <p className="text-xs text-[#A1A1AA]">
                    O dispositivo foi registrado no controle MDM com sucesso. Compartilhe a semente abaixo para liberação do primeiro acesso:
                  </p>
                </div>

                <div className="p-4 bg-[#18181B] border border-[#D4AF37]/30 rounded-2xl space-y-1 text-center">
                  <span className="text-[10px] text-[#A1A1AA] font-bold uppercase tracking-wider block">Semente de Confirmação do E-mail</span>
                  <p className="text-2xl font-mono font-bold text-[#D4AF37] tracking-wider">{novoUsuarioCreatedSeed}</p>
                </div>

                <button
                  type="button"
                  onClick={() => setIsNovoUsuarioModalOpen(false)}
                  className="w-full py-3 bg-[#D4AF37] hover:bg-[#E5C158] text-[#0A0A0B] rounded-xl text-xs font-bold uppercase tracking-wider transition-all cursor-pointer shadow-lg shadow-[#D4AF37]/10"
                >
                  Concluir e Fechar
                </button>
              </div>
            ) : (
              <form onSubmit={handleCadastrarNovoUsuarioMDM} className="space-y-4">
                
                {/* Nome do Operador / Representante */}
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-[#A1A1AA] flex items-center gap-1.5">
                    <User size={14} className="text-[#D4AF37]" /> Nome do Operador / Representante
                  </label>
                  <input
                    type="text"
                    required
                    value={novoUsuarioNome}
                    onChange={(e) => setNovoUsuarioNome(e.target.value)}
                    placeholder="Ex: Carlos Oliveira"
                    className="w-full px-3.5 py-2.5 bg-[#18181B] border border-[#27272A] rounded-xl text-xs text-white placeholder-[#71717A] focus:border-[#D4AF37] focus:outline-none transition-all"
                  />
                </div>

                {/* E-mail de Confirmação */}
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-[#A1A1AA] flex items-center justify-between">
                    <span className="flex items-center gap-1.5">
                      <Mail size={14} className="text-[#D4AF37]" /> E-mail de Confirmação (Obrigatório)
                    </span>
                    <span className="text-[10px] text-[#D4AF37] font-mono">Envia Semente</span>
                  </label>
                  <input
                    type="email"
                    required
                    value={novoUsuarioEmail}
                    onChange={(e) => setNovoUsuarioEmail(e.target.value)}
                    placeholder="Ex: carlos@locadora.com.br"
                    className="w-full px-3.5 py-2.5 bg-[#18181B] border border-[#27272A] rounded-xl text-xs text-white placeholder-[#71717A] focus:border-[#D4AF37] focus:outline-none transition-all"
                  />
                </div>

                {/* CNPJ Empresa */}
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-[#A1A1AA] flex items-center justify-between">
                    <span className="flex items-center gap-1.5">
                      <Building2 size={14} className="text-[#D4AF37]" /> CNPJ da Empresa
                    </span>
                    <span className="text-[10px] text-[#A1A1AA] italic">(Vinculado)</span>
                  </label>
                  <input
                    type="text"
                    required
                    disabled
                    value={novoUsuarioCnpj}
                    onChange={(e) => setNovoUsuarioCnpj(e.target.value)}
                    placeholder="Ex: 45.678.910/0001-23"
                    className="w-full px-3.5 py-2.5 bg-[#18181B]/50 border border-[#27272A] rounded-xl text-xs text-[#71717A] placeholder-[#71717A] cursor-not-allowed font-mono focus:outline-none"
                  />
                </div>

                {/* Telefone / WhatsApp */}
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-[#A1A1AA] flex items-center gap-1.5">
                    <Phone size={14} className="text-[#D4AF37]" /> Telefone / WhatsApp
                  </label>
                  <PhoneInput
                    value={novoUsuarioTelefone}
                    onChange={(val) => setNovoUsuarioTelefone(val)}
                    required
                    placeholder="11 99999-8888"
                  />
                </div>

                {/* Senha & Nível de Acesso */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-[#A1A1AA] flex items-center gap-1.5">
                      <Key size={14} className="text-[#D4AF37]" /> Defina a Senha de Acesso
                    </label>
                    <div className="relative flex items-center">
                      <input
                        type={showNovoUsuarioSenha ? 'text' : 'password'}
                        required
                        value={novoUsuarioSenha}
                        onChange={(e) => setNovoUsuarioSenha(e.target.value)}
                        placeholder="••••••••"
                        className="w-full pl-3.5 pr-10 py-2.5 bg-[#18181B] border border-[#27272A] rounded-xl text-xs text-white placeholder-[#71717A] focus:border-[#D4AF37] focus:outline-none transition-all font-mono"
                      />
                      <button
                        type="button"
                        onClick={() => setShowNovoUsuarioSenha(!showNovoUsuarioSenha)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-[#71717A] hover:text-[#D4AF37] transition-colors p-1 cursor-pointer"
                        title={showNovoUsuarioSenha ? 'Ocultar senha' : 'Exibir senha'}
                      >
                        {showNovoUsuarioSenha ? <EyeOff size={14} /> : <Eye size={14} />}
                      </button>
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-[#A1A1AA] flex items-center gap-1.5">
                      <ShieldCheck size={14} className="text-[#D4AF37]" /> Nível de Acesso MDM
                    </label>
                    <select
                      value={novoUsuarioNivel}
                      onChange={(e) => setNovoUsuarioNivel(e.target.value as any)}
                      className="w-full px-3.5 py-2.5 bg-[#18181B] border border-[#27272A] rounded-xl text-xs text-white focus:border-[#D4AF37] focus:outline-none transition-all cursor-pointer font-medium"
                    >
                      <option value="OPERADOR">Operador de Balcão (Acesso Padrão)</option>
                      <option value="GERENTE">Gerente de Loja (Acesso Intermediário)</option>
                      <option value="ADMINISTRADOR">Administrador Geral (Acesso Total)</option>
                      <option value="DESENVOLVEDOR">Desenvolvedor Android (Modo ART)</option>
                    </select>
                  </div>
                </div>

                {/* Identificador do Aparelho */}
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-[#A1A1AA] flex items-center gap-1.5">
                    <Smartphone size={14} className="text-[#D4AF37]" /> Identificador do Aparelho / Modelo
                  </label>
                  <input
                    type="text"
                    required
                    value={novoUsuarioAparelho}
                    onChange={(e) => setNovoUsuarioAparelho(e.target.value)}
                    placeholder="Ex: Tablet Balcão ou Smartphone Corporativo"
                    className="w-full px-3.5 py-2.5 bg-[#18181B] border border-[#27272A] rounded-xl text-xs text-white placeholder-[#71717A] focus:border-[#D4AF37] focus:outline-none transition-all"
                  />
                </div>

                {/* Terminal UUID Info Box */}
                <div className="bg-[#18181B]/80 p-3.5 rounded-xl border border-[#27272A] space-y-1">
                  <div className="flex justify-between items-center">
                    <span className="text-[10px] text-[#71717A] font-bold uppercase tracking-wider flex items-center gap-1.5">
                      <Terminal size={12} className="text-[#D4AF37]" /> UUID Hardware do Terminal
                    </span>
                    <span className="text-[9px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2 py-0.5 rounded-full font-mono font-bold">
                      Gerado Auto
                    </span>
                  </div>
                  <p className="text-xs font-mono font-bold text-[#D4AF37] tracking-wider break-all">
                    {novoUsuarioUuid || 'DEV-UUID-AUTO-GEN'}
                  </p>
                </div>

                {/* Action Buttons */}
                <div className="pt-3 border-t border-[#27272A] flex justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => setIsNovoUsuarioModalOpen(false)}
                    className="px-4 py-2.5 bg-[#18181B] hover:bg-[#27272A] text-[#A1A1AA] rounded-xl text-xs font-bold transition-all cursor-pointer"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2.5 bg-[#D4AF37] hover:bg-[#E5C158] text-[#0A0A0B] rounded-xl text-xs font-bold uppercase tracking-wider transition-all cursor-pointer flex items-center gap-2 shadow-lg shadow-[#D4AF37]/10"
                  >
                    <CheckCircle2 size={16} />
                    <span>Confirmar Registro de Terminal</span>
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
