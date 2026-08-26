import React, { useState, useEffect, useMemo } from 'react';
import { Cliente, ListVisibilityConfig, FormularioWeb } from '../types';
import { PhoneInput } from './PhoneInput';
import {
  Users,
  UserPlus,
  Phone,
  Mail,
  MessageSquare,
  Eye,
  EyeOff,
  Smartphone,
  ShieldCheck,
  Search,
  Plus,
  Trash2,
  CheckCircle2,
  X,
  Sparkles,
  Check,
  Info,
  Pencil,
  UserX,
  UserCheck,
  Building,
  MapPin,
  FileText,
  Filter,
  RotateCcw,
  Loader2,
  ExternalLink,
  LayoutGrid,
  List,
  Copy,
  AlertTriangle,
} from 'lucide-react';
import { getAccessToken, googleSignIn, fetchGoogleContacts, createGoogleContact } from '../lib/googleWorkspace';
import { StandardListControls, StandardPagination, StandardEmptyState } from './StandardListContainer';
import { validarDocumento, formatarDocumento } from '../utils/documentValidation';
import { EnderecoFormFields } from './EnderecoFormFields';
import { formatEnderecoCompleto, parseEnderecoCompleto, AddressData } from '../utils/addressUtils';


interface ClientesViewProps {
  clientes: Cliente[];
  webForms?: FormularioWeb[];
  onAddCliente: (cliente: Omit<Cliente, 'id'>) => void;
  onUpdateCliente?: (cliente: Cliente) => void;
  onToggleClienteStatus?: (id: number, ativo: boolean) => void;
  onImportClientes?: (clientes: Omit<Cliente, 'id'>[]) => void;
  onOpenWhatsApp: (cliente: Cliente, template: string) => void;
  onSelectClienteForWebForm?: (cliente: Cliente) => void;
  onViewProposta?: (propostaId: string) => void;
  listVisibility?: ListVisibilityConfig;
}

// Comprehensive mock of phone book contacts (Brazilian format)
const INITIAL_PHONE_CONTACTS = [
  { nome: 'Ana Paula - Cliente Noiva', telefone: '11988887777', email: 'anapaula.noiva@gmail.com' },
  { nome: 'Cliente Carlos Rocha', telefone: '21977776666', email: 'carlos.rocha@outlook.com' },
  { nome: 'Mariana Silva (Cliente)', telefone: '11966665555', email: 'mariana.silva@hotmail.com' },
  { nome: 'Roberto Cliente Buffet', telefone: '31955554444', email: 'roberto.buffet@yahoo.com' },
  { nome: 'Felipe Souza (Cliente VIP)', telefone: '11944443333', email: 'felipe.vip@gmail.com' },
  { nome: 'Juliana Cliente Festas', telefone: '21933332222', email: 'juliana.festas@gmail.com' },
  { nome: 'Dra. Patrícia Odonto', telefone: '11922221111', email: 'patricia.odonto@gmail.com' },
  { nome: 'Carlos Eduardo Primo', telefone: '11911110000', email: 'cadu.primo@gmail.com' },
  { nome: 'Mãe Celular', telefone: '11900009999', email: '' },
  { nome: 'Marcos Mecânico', telefone: '11999990000', email: '' },
  { nome: 'Beto Pizzaria', telefone: '11988889999', email: '' },
  { nome: 'Cláudia Decorações (Cliente)', telefone: '11977778888', email: 'claudia.decora@gmail.com' }
];

export const ClientesView: React.FC<ClientesViewProps> = ({
  clientes = [],
  webForms = [],
  onAddCliente,
  onUpdateCliente,
  onToggleClienteStatus,
  onImportClientes,
  onOpenWhatsApp,
  onSelectClienteForWebForm,
  onViewProposta,
  listVisibility,
}) => {
  const [isListVisible, setIsListVisible] = useState(() => {
    return listVisibility ? listVisibility.exibirClientesPorPadrao !== false : true;
  });

  useEffect(() => {
    if (listVisibility) {
      setIsListVisible(listVisibility.exibirClientesPorPadrao !== false);
    }
  }, [listVisibility]);

  // Search & Filter
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<'TODOS' | 'ATIVOS' | 'INATIVOS'>('TODOS');

  // Client proposals viewing modal
  const [viewingClientePropostas, setViewingClientePropostas] = useState<Cliente | null>(null);

  const getClientProposals = (cliente: Cliente) => {
    return (webForms || []).filter(f => 
      (f.clienteId === cliente.id || (f.clienteNome && cliente.nome && f.clienteNome.toLowerCase() === cliente.nome.toLowerCase())) &&
      f.respondido && !f.recusado
    );
  };

  // Toast Notification
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Standard modal states (Create)
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formDocError, setFormDocError] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    nome: '',
    telefone: '',
    email: '',
    cpfCnpj: '',
    addressData: { logradouro: '', numero: '', bairro: '', cidade: '', estado: '', cep: '' } as AddressData,
    observacoes: '',
  });

  const handleOpenAdd = () => {
    setFormDocError(null);
    setFormData({
      nome: '',
      telefone: '',
      email: '',
      cpfCnpj: '',
      addressData: { logradouro: '', numero: '', bairro: '', cidade: '', estado: '', cep: '' },
      observacoes: '',
    });
    setIsModalOpen(true);
  };

  // Edit Modal State
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editDocError, setEditDocError] = useState<string | null>(null);
  const [editingCliente, setEditingCliente] = useState<Cliente | null>(null);
  const [editFormData, setEditFormData] = useState({
    nome: '',
    telefone: '',
    email: '',
    cpfCnpj: '',
    addressData: { logradouro: '', numero: '', bairro: '', cidade: '', estado: '', cep: '' } as AddressData,
    observacoes: '',
  });

  // Contacts Import states
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [hasContactsPermission, setHasContactsPermission] = useState<boolean>(() => {
    return localStorage.getItem('locadora_contacts_permission_granted') === 'true';
  });
  
  const [phoneContacts, setPhoneContacts] = useState<Array<{ nome: string; telefone: string; email: string }>>(() => {
    const saved = localStorage.getItem('locadora_simulated_contacts');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        return INITIAL_PHONE_CONTACTS;
      }
    }
    return INITIAL_PHONE_CONTACTS;
  });

  const [selectedContactIndexes, setSelectedContactIndexes] = useState<number[]>([]);
  const [importSearch, setImportSearch] = useState('');
  
  // Google Contacts Integration State
  const [importSource, setImportSource] = useState<'simulated' | 'google'>('simulated');
  const [googleContacts, setGoogleContacts] = useState<any[]>([]);
  const [googleContactsSelected, setGoogleContactsSelected] = useState<string[]>([]);
  const [isLoadingGoogle, setIsLoadingGoogle] = useState(false);
  const [googleError, setGoogleError] = useState<string | null>(null);
  const [isSyncingContactId, setIsSyncingContactId] = useState<number | null>(null);

  // Custom contact input state inside simulator
  const [newSimName, setNewSimName] = useState('');
  const [newSimPhone, setNewSimPhone] = useState('');
  const [newSimEmail, setNewSimEmail] = useState('');
  const [simError, setSimError] = useState<string | null>(null);

  const handleLoadGoogleContacts = async () => {
    setIsLoadingGoogle(true);
    setGoogleError(null);
    try {
      let token = await getAccessToken();
      if (!token) {
        const authResult = await googleSignIn();
        if (authResult) {
          token = authResult.accessToken;
        }
      }

      if (!token) {
        throw new Error('Não foi possível obter autorização da conta Google.');
      }

      const contacts = await fetchGoogleContacts(token);
      setGoogleContacts(contacts);
    } catch (err: any) {
      console.error('Error loading Google Contacts:', err);
      setGoogleError(err.message || 'Erro ao carregar contatos da conta Google.');
    } finally {
      setIsLoadingGoogle(false);
    }
  };

  const handleToggleSelectGoogleContact = (id: string) => {
    setGoogleContactsSelected((prev) => {
      if (prev.includes(id)) {
        return prev.filter((i) => i !== id);
      } else {
        return [...prev, id];
      }
    });
  };

  const handleConfirmImportGoogle = () => {
    const selected = googleContacts.filter((c) => googleContactsSelected.includes(c.id));
    if (selected.length === 0) {
      alert('Selecione pelo menos um contato do Google para importar.');
      return;
    }

    const formatted = selected.map((c) => ({
      nome: c.name,
      telefone: c.phone || '',
      email: c.email || '',
    }));

    if (onImportClientes) {
      onImportClientes(formatted);
    } else {
      formatted.forEach((c) => onAddCliente({ ...c, ativo: true }));
    }

    setIsImportModalOpen(false);
    setGoogleContactsSelected([]);
    setToastMessage(`${selected.length} contatos reais do Google importados com sucesso!`);
    setTimeout(() => setToastMessage(null), 4000);
  };

  const handleSyncToGoogleContacts = async (cliente: Cliente) => {
    setIsSyncingContactId(cliente.id);
    try {
      let token = await getAccessToken();
      if (!token) {
        const authResult = await googleSignIn();
        if (authResult) {
          token = authResult.accessToken;
        }
      }

      if (!token) {
        throw new Error('Não foi possível obter autorização da conta Google.');
      }

      await createGoogleContact(cliente.nome, cliente.telefone, cliente.email || '', token);
      setToastMessage(`Cliente "${cliente.nome}" salvo com sucesso no seu Google Contatos!`);
      setTimeout(() => setToastMessage(null), 4000);
    } catch (err: any) {
      console.error('Error syncing contact to Google:', err);
      alert(err.message || 'Erro ao salvar cliente no Google Contatos.');
    } finally {
      setIsSyncingContactId(null);
    }
  };


  // Auto filter contacts on modal load or permission grant
  useEffect(() => {
    if (isImportModalOpen && hasContactsPermission) {
      const matchedIndexes: number[] = [];
      phoneContacts.forEach((contact, idx) => {
        if (contact.nome.toLowerCase().includes('cliente')) {
          matchedIndexes.push(idx);
        }
      });
      setSelectedContactIndexes(matchedIndexes);
    }
  }, [isImportModalOpen, hasContactsPermission, phoneContacts]);

  // Save customized mock contacts
  const saveSimulatedContacts = (updated: Array<{ nome: string; telefone: string; email: string }>) => {
    setPhoneContacts(updated);
    localStorage.setItem('locadora_simulated_contacts', JSON.stringify(updated));
  };

  const handleGrantPermission = () => {
    setHasContactsPermission(true);
    localStorage.setItem('locadora_contacts_permission_granted', 'true');
  };

  const handleRevokePermission = () => {
    setHasContactsPermission(false);
    localStorage.setItem('locadora_contacts_permission_granted', 'false');
    setSelectedContactIndexes([]);
  };

  // Add Client Handler
  const handleCopyCliente = (cliente: Cliente) => {
    onAddCliente({
      nome: `${cliente.nome} (Cópia)`,
      telefone: cliente.telefone,
      email: cliente.email,
      cpfCnpj: cliente.cpfCnpj,
      endereco: cliente.endereco,
      observacoes: cliente.observacoes,
      ativo: true,
    });
    setToastMessage(`Cliente "${cliente.nome}" copiado com sucesso!`);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFormDocError(null);

    // Validação estrita de CPF / CNPJ se preenchido
    let documentoFormatado = formData.cpfCnpj.trim();
    if (documentoFormatado) {
      const docValidation = validarDocumento(documentoFormatado);
      if (!docValidation.valido) {
        setFormDocError(docValidation.mensagemErro || 'CPF ou CNPJ inválido. Verifique os dígitos informados.');
        return;
      }
      documentoFormatado = docValidation.formatado;
    }

    const formattedEndereco = formatEnderecoCompleto(formData.addressData);

    onAddCliente({
      nome: formData.nome.trim(),
      telefone: formData.telefone.trim(),
      email: formData.email.trim() || undefined,
      cpfCnpj: documentoFormatado || undefined,
      logradouro: formData.addressData.logradouro?.trim() || undefined,
      numero: formData.addressData.numero?.trim() || undefined,
      bairro: formData.addressData.bairro?.trim() || undefined,
      cidade: formData.addressData.cidade?.trim() || undefined,
      estado: formData.addressData.estado?.trim() || undefined,
      cep: formData.addressData.cep?.trim() || undefined,
      endereco: formattedEndereco || undefined,
      observacoes: formData.observacoes.trim() || undefined,
      ativo: true,
    });

    setToastMessage(`Cliente "${formData.nome}" cadastrado com sucesso!`);
    setTimeout(() => setToastMessage(null), 4000);

    setFormData({ nome: '', telefone: '', email: '', cpfCnpj: '', addressData: { logradouro: '', numero: '', bairro: '', cidade: '', estado: '', cep: '' }, observacoes: '' });
    setFormDocError(null);
    setIsModalOpen(false);
  };

  // Open Edit Modal
  const handleOpenEdit = (cliente: Cliente) => {
    setEditDocError(null);
    setEditingCliente(cliente);

    // Se já tiver campos estruturados usa-os, senão decompoe a string endereco
    const parsedAddr = (cliente.logradouro || cliente.cidade || cliente.bairro)
      ? {
          logradouro: cliente.logradouro || '',
          numero: cliente.numero || '',
          bairro: cliente.bairro || '',
          cidade: cliente.cidade || '',
          estado: cliente.estado || '',
          cep: cliente.cep || '',
        }
      : parseEnderecoCompleto(cliente.endereco);

    setEditFormData({
      nome: cliente.nome || '',
      telefone: cliente.telefone || '',
      email: cliente.email || '',
      cpfCnpj: cliente.cpfCnpj || '',
      addressData: parsedAddr,
      observacoes: cliente.observacoes || '',
    });
    setIsEditModalOpen(true);
  };

  // Submit Edit Handler
  const handleSaveEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingCliente) return;
    setEditDocError(null);

    // Validação estrita de CPF / CNPJ se preenchido
    let documentoFormatado = editFormData.cpfCnpj.trim();
    if (documentoFormatado) {
      const docValidation = validarDocumento(documentoFormatado);
      if (!docValidation.valido) {
        setEditDocError(docValidation.mensagemErro || 'CPF ou CNPJ inválido. Verifique os dígitos informados.');
        return;
      }
      documentoFormatado = docValidation.formatado;
    }

    const formattedEndereco = formatEnderecoCompleto(editFormData.addressData);

    if (onUpdateCliente) {
      onUpdateCliente({
        ...editingCliente,
        nome: editFormData.nome.trim(),
        telefone: editFormData.telefone.trim(),
        email: editFormData.email.trim() || undefined,
        cpfCnpj: documentoFormatado || undefined,
        logradouro: editFormData.addressData.logradouro?.trim() || undefined,
        numero: editFormData.addressData.numero?.trim() || undefined,
        bairro: editFormData.addressData.bairro?.trim() || undefined,
        cidade: editFormData.addressData.cidade?.trim() || undefined,
        estado: editFormData.addressData.estado?.trim() || undefined,
        cep: editFormData.addressData.cep?.trim() || undefined,
        endereco: formattedEndereco || undefined,
        observacoes: editFormData.observacoes.trim() || undefined,
      });

      setToastMessage(`Cadastro do cliente "${editFormData.nome}" atualizado com sucesso!`);
      setTimeout(() => setToastMessage(null), 4000);
    }

    setEditDocError(null);
    setIsEditModalOpen(false);
    setEditingCliente(null);
  };

  // Soft Delete / Toggle Status Handler
  const handleToggleStatus = (id: number, targetAtivo: boolean) => {
    const cliente = clientes.find((c) => c.id === id);
    if (!cliente) return;

    if (onToggleClienteStatus) {
      onToggleClienteStatus(id, targetAtivo);
    }

    const msgText = targetAtivo
      ? `Cliente "${cliente.nome}" reativado no sistema.`
      : `Cliente "${cliente.nome}" desativado (os dados foram preservados em tom cinza).`;

    setToastMessage(msgText);
    setTimeout(() => setToastMessage(null), 4000);
  };

  // Contacts import simulator functions
  const handleAddCustomSimContact = (e: React.FormEvent) => {
    e.preventDefault();
    setSimError(null);

    if (!newSimName.trim() || !newSimPhone.trim()) {
      setSimError('Preencha Nome e Telefone para simular o contato.');
      return;
    }

    const exists = phoneContacts.some(
      (c) => c.nome.toLowerCase() === newSimName.trim().toLowerCase() || c.telefone === newSimPhone.trim()
    );

    if (exists) {
      setSimError('Este nome ou telefone já existe na agenda do celular.');
      return;
    }

    const updated = [
      {
        nome: newSimName.trim(),
        telefone: newSimPhone.trim(),
        email: newSimEmail.trim(),
      },
      ...phoneContacts,
    ];

    saveSimulatedContacts(updated);
    setNewSimName('');
    setNewSimPhone('');
    setNewSimEmail('');
  };

  const handleDeleteSimContact = (indexToDelete: number) => {
    const updated = phoneContacts.filter((_, idx) => idx !== indexToDelete);
    saveSimulatedContacts(updated);
    setSelectedContactIndexes((prev) =>
      prev
        .filter((idx) => idx !== indexToDelete)
        .map((idx) => (idx > indexToDelete ? idx - 1 : idx))
    );
  };

  const handleToggleSelectContact = (idx: number) => {
    setSelectedContactIndexes((prev) => {
      if (prev.includes(idx)) {
        return prev.filter((i) => i !== idx);
      } else {
        return [...prev, idx];
      }
    });
  };

  const handleSelectAllFiltered = (filteredIndexes: number[]) => {
    setSelectedContactIndexes((prev) => {
      const merged = new Set([...prev, ...filteredIndexes]);
      return Array.from(merged);
    });
  };

  const handleDeselectAllFiltered = (filteredIndexes: number[]) => {
    setSelectedContactIndexes((prev) => prev.filter((idx) => !filteredIndexes.includes(idx)));
  };

  const handleConfirmImport = () => {
    if (selectedContactIndexes.length === 0) {
      alert('Nenhum contato selecionado para importação.');
      return;
    }

    const contactsToImport = selectedContactIndexes.map((idx) => phoneContacts[idx]);
    
    if (onImportClientes) {
      onImportClientes(contactsToImport);
    } else {
      contactsToImport.forEach((c) => onAddCliente({ ...c, ativo: true }));
    }

    setIsImportModalOpen(false);
    setSelectedContactIndexes([]);
    setToastMessage(`${contactsToImport.length} contatos importados e cadastrados como clientes ativos!`);
    setTimeout(() => setToastMessage(null), 4000);
  };

  const handleTryNativeContactPicker = async () => {
    if ('contacts' in navigator && 'select' in (navigator as any).contacts) {
      try {
        const props = ['name', 'email', 'tel'];
        const options = { multiple: true };
        const contacts = await (navigator as any).contacts.select(props, options);
        if (contacts && contacts.length > 0) {
          const formatted = contacts.map((c: any) => ({
            nome: c.name?.[0] || 'Contato Sem Nome',
            telefone: c.tel?.[0]?.replace(/\D/g, '') || '',
            email: c.email?.[0] || '',
          })).filter((c: any) => c.telefone.length > 0);

          if (formatted.length > 0) {
            const updated = [...formatted, ...phoneContacts];
            saveSimulatedContacts(updated);
            setHasContactsPermission(true);
            localStorage.setItem('locadora_contacts_permission_granted', 'true');
            setToastMessage(`${formatted.length} contatos lidos da agenda física do Android.`);
            setTimeout(() => setToastMessage(null), 4000);
          }
        }
      } catch (err) {
        console.warn('Native Contact Picker cancelled or failed:', err);
      }
    } else {
      alert('Seu navegador/dispositivo atual não suporta a API nativa Contact Picker. Mostrando o Simulador de Agenda Android do Locadora Pro.');
    }
  };

  // Filter Clients - Memoized for peak performance on searching
  const filteredClientes = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    return clientes.filter((c) => {
      const isAtivo = c.ativo !== false;
      if (filterStatus === 'ATIVOS' && !isAtivo) return false;
      if (filterStatus === 'INATIVOS' && isAtivo) return false;

      if (term) {
        const matchName = (c.nome || '').toLowerCase().includes(term);
        const matchPhone = (c.telefone || '').includes(term);
        const matchEmail = (c.email || '').toLowerCase().includes(term);
        const matchCpf = (c.cpfCnpj || '').toLowerCase().includes(term);
        const matchEnd = (c.endereco || '').toLowerCase().includes(term);
        return matchName || matchPhone || matchEmail || matchCpf || matchEnd;
      }
      return true;
    });
  }, [clientes, filterStatus, searchTerm]);

  const totalClientesCount = clientes.length;

  // Ativos and Inativos counters - Memoized to prevent looping through array on every key-stroke
  const { ativosCount, inativosCount } = useMemo(() => {
    let ativos = 0;
    let inativos = 0;
    clientes.forEach((c) => {
      if (c.ativo !== false) {
        ativos++;
      } else {
        inativos++;
      }
    });
    return { ativosCount: ativos, inativosCount: inativos };
  }, [clientes]);

  const [viewMode, setViewMode] = useState<'grid' | 'list'>('list');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  const paginatedClientes = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredClientes.slice(start, start + itemsPerPage);
  }, [filteredClientes, currentPage, itemsPerPage]);

  const totalPages = useMemo(() => {
    return Math.ceil(filteredClientes.length / itemsPerPage);
  }, [filteredClientes.length, itemsPerPage]);

  // Contact modal search filter - Memoized for smooth typing inside contact search modal
  const filteredContactsWithIndex = useMemo(() => {
    const searchLower = importSearch.toLowerCase().trim();
    return phoneContacts
      .map((contact, originalIdx) => ({ contact, originalIdx }))
      .filter(
        ({ contact }) =>
          !searchLower ||
          contact.nome.toLowerCase().includes(searchLower) ||
          contact.telefone.includes(searchLower) ||
          contact.email.toLowerCase().includes(searchLower)
      );
  }, [phoneContacts, importSearch]);

  const matchesFilterGroup = filteredContactsWithIndex.filter(({ contact }) =>
    contact.nome.toLowerCase().includes('cliente')
  );
  const otherGroup = filteredContactsWithIndex.filter(
    ({ contact }) => !contact.nome.toLowerCase().includes('cliente')
  );

  const handleFocusScroll = (e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setTimeout(() => {
      e.target.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }, 150);
  };

  return (
    <div className="space-y-6">
      {/* Toast Alert Banner */}
      {toastMessage && (
        <div className="bg-[#D4AF37]/10 border border-[#D4AF37]/40 text-[#D4AF37] px-4 py-3 rounded-2xl text-xs font-semibold flex items-center justify-between shadow-xl animate-fade-in">
          <div className="flex items-center gap-2">
            <CheckCircle2 size={16} className="text-[#D4AF37]" />
            <span>{toastMessage}</span>
          </div>
          <button onClick={() => setToastMessage(null)} className="text-[#A1A1AA] hover:text-white">
            <X size={14} />
          </button>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 bg-[#111113] p-5 rounded-2xl border border-[#27272A] shadow-xl">
        <div>
          <h2 className="text-xl font-serif italic text-white flex items-center gap-3">
            <Users className="text-[#D4AF37]" size={22} />
            <span>Cadastro de Clientes</span>
            <button
              type="button"
              onClick={() => setIsListVisible(!isListVisible)}
              className="text-[#71717A] hover:text-[#D4AF37] transition-colors p-1 rounded-lg bg-[#18181B] border border-[#27272A] cursor-pointer"
              title={isListVisible ? "Ocultar Listagem" : "Exibir Listagem"}
            >
              {isListVisible ? <EyeOff size={14} /> : <Eye size={14} />}
            </button>
          </h2>
          <p className="text-[#A1A1AA] text-xs mt-0.5">Gerencie cadastros, edição de dados e status de clientes</p>
        </div>

        <div className="flex flex-col sm:flex-row sm:flex-wrap items-stretch sm:items-center gap-2.5 w-full lg:w-auto">
          <button
            id="btn-importar-contatos"
            onClick={() => setIsImportModalOpen(true)}
            className="flex items-center justify-center gap-2 bg-[#18181B] hover:bg-[#27272A] text-white border border-[#27272A] px-4 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider transition-all cursor-pointer hover:border-[#D4AF37]/50 w-full sm:w-auto shrink-0"
            title="Importar contatos da agenda do celular"
          >
            <Smartphone size={16} className="text-[#D4AF37]" />
            <span>Importar Agenda</span>
          </button>

          <button
            id="btn-cadastrar-cliente"
            onClick={handleOpenAdd}
            className="flex items-center justify-center gap-2 bg-[#D4AF37] hover:bg-[#E5C158] text-[#0A0A0B] px-4 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider shadow-lg shadow-[#D4AF37]/10 transition-all cursor-pointer w-full sm:w-auto shrink-0"
          >
            <UserPlus size={16} />
            <span>Cadastrar Cliente</span>
          </button>
        </div>
      </div>

      {/* Summary Metrics - Single Line Compact Bar */}
      <div className="bg-[#111113] border border-[#27272A] rounded-2xl p-3 flex flex-nowrap overflow-x-auto items-center justify-between gap-2 sm:gap-4 divide-x divide-[#27272A] shadow-xl no-scrollbar">
        {/* Metric 1: Total Cadastros */}
        <div className="flex items-center gap-3 px-3 min-w-[170px] flex-1">
          <div className="p-2 bg-[#18181B] border border-[#27272A] rounded-xl text-[#D4AF37] shrink-0">
            <Users size={16} />
          </div>
          <div>
            <span className="text-[10px] uppercase font-bold tracking-wider text-[#71717A] block whitespace-nowrap">Total Cadastros</span>
            <span className="text-base font-bold font-mono text-white leading-tight">{totalClientesCount}</span>
          </div>
        </div>

        {/* Metric 2: Clientes Ativos */}
        <div className="flex items-center gap-3 px-3 min-w-[170px] flex-1">
          <div className="p-2 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-emerald-400 shrink-0">
            <CheckCircle2 size={16} />
          </div>
          <div>
            <span className="text-[10px] uppercase font-bold tracking-wider text-[#71717A] block whitespace-nowrap">Clientes Ativos</span>
            <span className="text-base font-bold font-mono text-emerald-400 leading-tight">{ativosCount}</span>
          </div>
        </div>

        {/* Metric 3: Desativados */}
        <div className="flex items-center gap-3 px-3 min-w-[170px] flex-1">
          <div className="p-2 bg-[#18181B] border border-[#27272A] rounded-xl text-[#71717A] shrink-0">
            <UserX size={16} />
          </div>
          <div>
            <span className="text-[10px] uppercase font-bold tracking-wider text-[#71717A] block whitespace-nowrap">Desativados</span>
            <span className="text-base font-bold font-mono text-[#71717A] leading-tight">{inativosCount}</span>
          </div>
        </div>
      </div>

      {/* Standardized Search, Filters, View Switcher & Pagination Controls */}
      <StandardListControls
        searchTerm={searchTerm}
        onSearchChange={setSearchTerm}
        searchPlaceholder="Buscar por nome, telefone, e-mail, CPF/CNPJ ou endereço..."
        viewMode={viewMode}
        onViewModeChange={setViewMode}
        filterTabs={[
          { id: 'TODOS', label: 'Todos os Clientes', count: clientes.length },
          { id: 'ATIVOS', label: 'Ativos', count: ativosCount },
          { id: 'INATIVOS', label: 'Desativados', count: inativosCount },
        ]}
        activeFilterTab={filterStatus}
        onFilterTabChange={(tab) => setFilterStatus(tab as any)}
        currentPage={currentPage}
        totalPages={totalPages}
        totalItems={filteredClientes.length}
        itemsPerPage={itemsPerPage}
        onPageChange={setCurrentPage}
        onItemsPerPageChange={setItemsPerPage}
      />

      {!isListVisible ? (
        <div className="bg-[#111113] border border-[#27272A] rounded-2xl p-12 text-center space-y-4 shadow-xl animate-fade-in">
          <div className="w-12 h-12 rounded-full bg-[#D4AF37]/10 text-[#D4AF37] mx-auto flex items-center justify-center">
            <EyeOff size={24} />
          </div>
          <div className="space-y-1">
            <h4 className="text-white text-sm font-semibold">Listagem Oculta</h4>
            <p className="text-[#A1A1AA] text-xs max-w-sm mx-auto">
              A listagem de clientes cadastrados está oculta por padrão para uma interface mais limpa.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setIsListVisible(true)}
            className="inline-flex items-center gap-2 bg-[#D4AF37] hover:bg-[#E5C158] text-[#0A0A0B] px-5 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider transition-all cursor-pointer shadow-lg shadow-[#D4AF37]/10 active:scale-95"
          >
            <Eye size={14} />
            <span>Exibir Listagem de Clientes</span>
          </button>
        </div>
      ) : filteredClientes.length === 0 ? (
        <StandardEmptyState
          icon={<Users size={22} />}
          title="Nenhum cliente encontrado"
          description="Não encontramos nenhum cliente cadastrado para os termos de busca ou filtros aplicados."
          onClearFilters={() => {
            setSearchTerm('');
            setFilterStatus('TODOS');
            setCurrentPage(1);
          }}
          actionText="Cadastrar Cliente"
          onAction={handleOpenAdd}
        />
      ) : (
        <>
          {viewMode === 'grid' ? (
            /* MODE 1: GRADE (CARDS) */
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {paginatedClientes.map((cliente) => {
                const isAtivo = cliente.ativo !== false;
                return (
                  <div
                    key={cliente.id}
                    className={`bg-[#111113] border rounded-2xl p-5 shadow-xl space-y-4 flex flex-col justify-between transition-all hover:border-[#3F3F46] ${
                      isAtivo ? 'border-[#27272A]' : 'border-[#27272A] opacity-60 bg-[#0A0A0B]/40'
                    }`}
                  >
                    <div className="space-y-3">
                      <div className="flex items-start justify-between gap-2 border-b border-[#27272A] pb-3">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-[#18181B] border border-[#27272A] flex items-center justify-center text-[#D4AF37] font-serif font-bold text-base shrink-0">
                            {cliente.nome.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <h4 className={`font-bold text-sm ${isAtivo ? 'text-white' : 'text-[#71717A] italic line-through'}`}>
                              {cliente.nome}
                            </h4>
                            <span className="text-[10px] font-mono text-[#71717A]">ID #{cliente.id}</span>
                          </div>
                        </div>

                        <span
                          className={`text-[10px] font-mono px-2.5 py-0.5 rounded-full border shrink-0 uppercase font-bold tracking-wider ${
                            isAtivo
                              ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                              : 'bg-[#27272A] text-[#71717A] border-[#3F3F46]'
                          }`}
                        >
                          {isAtivo ? 'Ativo' : 'Desativado'}
                        </span>
                      </div>

                      <div className="space-y-1.5 text-xs text-[#A1A1AA]">
                        <div className="flex items-center gap-2">
                          <Phone size={13} className="text-emerald-400 shrink-0" />
                          <span className="font-mono text-white">{cliente.telefone}</span>
                        </div>

                        {cliente.email && (
                          <div className="flex items-center gap-2 truncate">
                            <Mail size={13} className="text-[#D4AF37] shrink-0" />
                            <span className="truncate">{cliente.email}</span>
                          </div>
                        )}

                        {cliente.cpfCnpj && (
                          <div className="flex items-center gap-2">
                            <FileText size={13} className="text-[#71717A] shrink-0" />
                            <span className="font-mono text-[#71717A]">CPF/CNPJ: {cliente.cpfCnpj}</span>
                          </div>
                        )}

                        {cliente.endereco && (
                          <div className="flex items-center gap-2">
                            <MapPin size={13} className="text-[#71717A] shrink-0" />
                            <span className="truncate">{cliente.endereco}</span>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="pt-3 border-t border-[#27272A] flex items-center justify-between gap-2">
                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() => handleOpenEdit(cliente)}
                          className="p-2 bg-[#18181B] hover:bg-[#27272A] text-white rounded-lg border border-[#27272A] transition-all cursor-pointer"
                          title="Editar Cliente"
                        >
                          <Pencil size={13} />
                        </button>

                        <button
                          onClick={() => handleCopyCliente(cliente)}
                          className="p-2 bg-[#18181B] hover:bg-[#27272A] text-[#E4E4E7] hover:text-emerald-400 rounded-lg border border-[#27272A] transition-all cursor-pointer"
                          title="Copiar/Duplicar Cliente"
                        >
                          <Copy size={13} />
                        </button>

                        {isAtivo ? (
                          <button
                            onClick={() => handleToggleStatus(cliente.id, false)}
                            className="p-2 bg-red-500/10 hover:bg-red-500/20 text-red-400 rounded-lg border border-red-500/30 transition-all cursor-pointer"
                            title="Desativar Cliente"
                          >
                            <UserX size={13} />
                          </button>
                        ) : (
                          <button
                            onClick={() => handleToggleStatus(cliente.id, true)}
                            className="p-2 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 rounded-lg border border-emerald-500/30 transition-all cursor-pointer"
                            title="Reativar Cliente"
                          >
                            <UserCheck size={13} />
                          </button>
                        )}
                      </div>

                      <div className="flex items-center gap-2">
                        {isAtivo && (
                          <button
                            onClick={() => handleSyncToGoogleContacts(cliente)}
                            disabled={isSyncingContactId === cliente.id}
                            className="p-2 bg-[#D4AF37]/10 hover:bg-[#D4AF37]/20 text-[#D4AF37] border border-[#D4AF37]/30 rounded-lg transition-all cursor-pointer disabled:opacity-50"
                            title="Salvar no Google Contatos"
                          >
                            {isSyncingContactId === cliente.id ? (
                              <Loader2 size={13} className="animate-spin text-[#D4AF37]" />
                            ) : (
                              <Users size={13} />
                            )}
                          </button>
                        )}

                        {isAtivo && (
                          <button
                            onClick={() =>
                              onOpenWhatsApp(
                                cliente,
                                `Olá *${cliente.nome}*, tudo bem? Entramos em contato a respeito de suas reservas na *Locadora de Acervo*.`
                              )
                            }
                            className="p-2 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 rounded-lg transition-all cursor-pointer"
                            title="Abrir Conversa WhatsApp"
                          >
                            <MessageSquare size={13} />
                          </button>
                        )}

                        {isAtivo && onSelectClienteForWebForm && (
                          <button
                            onClick={() => onSelectClienteForWebForm(cliente)}
                            className="px-2.5 py-1.5 bg-[#D4AF37]/10 hover:bg-[#D4AF37]/20 text-[#D4AF37] border border-[#D4AF37]/30 rounded-lg text-xs font-semibold flex items-center gap-1 transition-all cursor-pointer"
                            title="Criar orçamento vinculado a este cliente"
                          >
                            <FileText size={12} />
                            <span>Orçamento</span>
                          </button>
                        )}

                        {isAtivo && getClientProposals(cliente).length > 0 && (
                          <button
                            onClick={() => setViewingClientePropostas(cliente)}
                            className="px-2.5 py-1.5 bg-[#D4AF37]/10 hover:bg-[#D4AF37]/20 text-[#D4AF37] border border-[#D4AF37]/30 rounded-lg text-xs font-semibold flex items-center gap-1 transition-all cursor-pointer"
                            title="Ver propostas aprovadas deste cliente"
                          >
                            <FileText size={12} />
                            <span>Propostas ({getClientProposals(cliente).length})</span>
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            /* MODE 2: LISTA (TABLE) */
            <div className="bg-[#111113] border border-[#27272A] rounded-2xl overflow-hidden shadow-xl">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="bg-[#0A0A0B] text-[#71717A] uppercase text-[10px] font-bold tracking-widest border-b border-[#27272A]">
                    <tr>
                      <th className="px-6 py-4">ID</th>
                      <th className="px-6 py-4">Cliente / CPF/CNPJ</th>
                      <th className="px-6 py-4">Telefone / WhatsApp</th>
                      <th className="px-6 py-4">E-mail</th>
                      <th className="px-6 py-4">Status</th>
                      <th className="px-6 py-4 text-right">Ações</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#27272A]/60">
                    {paginatedClientes.map((cliente) => {
                      const isAtivo = cliente.ativo !== false;

                      return (
                        <tr
                          key={cliente.id}
                          className={`transition-colors ${
                            isAtivo ? 'hover:bg-[#18181B]' : 'bg-[#0A0A0B]/40 hover:bg-[#111113]'
                          }`}
                        >
                          {/* ID */}
                          <td className={`px-6 py-4 font-mono text-xs ${isAtivo ? 'text-[#71717A]' : 'text-[#52525B]'}`}>
                            #{cliente.id}
                          </td>

                          {/* Nome Completo */}
                          <td className="px-6 py-4">
                            <div className={`font-medium ${isAtivo ? 'text-white' : 'text-[#71717A] italic line-through'}`}>
                              {cliente.nome}
                            </div>
                            {cliente.cpfCnpj && (
                              <div className={`text-[11px] font-mono mt-0.5 ${isAtivo ? 'text-[#A1A1AA]' : 'text-[#52525B]'}`}>
                                CPF/CNPJ: {cliente.cpfCnpj}
                              </div>
                            )}
                            {cliente.endereco && (
                              <div className={`text-[11px] mt-0.5 flex items-center gap-1 ${isAtivo ? 'text-[#71717A]' : 'text-[#52525B]'}`}>
                                <MapPin size={10} /> {cliente.endereco}
                              </div>
                            )}
                          </td>

                          {/* Telefone */}
                          <td className="px-6 py-4">
                            <div className={`flex items-center gap-2 ${isAtivo ? 'text-[#E4E4E7]' : 'text-[#71717A]'}`}>
                              <Phone size={14} className={isAtivo ? 'text-emerald-400' : 'text-[#52525B]'} />
                              <span>{cliente.telefone}</span>
                            </div>
                          </td>

                          {/* E-mail */}
                          <td className="px-6 py-4">
                            {cliente.email ? (
                              <span className={`flex items-center gap-1.5 ${isAtivo ? 'text-[#A1A1AA]' : 'text-[#71717A]'}`}>
                                <Mail size={14} /> {cliente.email}
                              </span>
                            ) : (
                              <span className="text-[#52525B]">—</span>
                            )}
                          </td>

                          {/* Status Badge */}
                          <td className="px-6 py-4">
                            {isAtivo ? (
                              <span className="px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                                Ativo
                              </span>
                            ) : (
                              <span className="px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-[#27272A] text-[#71717A] border border-[#3F3F46]">
                                Desativado
                              </span>
                            )}
                          </td>

                          {/* Action Buttons */}
                          <td className="px-6 py-4 text-right">
                            <div className="flex items-center justify-end gap-2">
                              {/* Editar Cliente Button */}
                              <button
                                onClick={() => handleOpenEdit(cliente)}
                                className="inline-flex items-center gap-1 bg-[#18181B] hover:bg-[#27272A] text-white border border-[#27272A] hover:border-[#D4AF37]/50 px-2.5 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer"
                                title="Editar dados do cliente"
                              >
                                <Pencil size={13} className="text-[#D4AF37]" />
                                <span>Editar</span>
                              </button>

                              {/* Copiar Cliente Button */}
                              <button
                                onClick={() => handleCopyCliente(cliente)}
                                className="inline-flex items-center gap-1 bg-[#18181B] hover:bg-[#27272A] text-white border border-[#27272A] hover:border-emerald-500/50 px-2.5 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer"
                                title="Copiar/Duplicar cliente"
                              >
                                <Copy size={13} className="text-emerald-400" />
                                <span>Copiar</span>
                              </button>

                              {isAtivo && (
                                <button
                                  onClick={() => handleSyncToGoogleContacts(cliente)}
                                  disabled={isSyncingContactId === cliente.id}
                                  className="inline-flex items-center gap-1 bg-[#D4AF37]/10 hover:bg-[#D4AF37]/20 text-[#D4AF37] border border-[#D4AF37]/30 px-2.5 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer disabled:opacity-50 text-nowrap"
                                  title="Salvar contato no Google Contatos"
                                >
                                  {isSyncingContactId === cliente.id ? (
                                    <Loader2 size={13} className="animate-spin text-[#D4AF37]" />
                                  ) : (
                                    <Users size={13} className="text-[#D4AF37]" />
                                  )}
                                  <span>Salvar no Google</span>
                                </button>
                              )}

                              {/* Desativar or Reativar Soft Delete Toggle */}
                              {isAtivo ? (
                                <button
                                  onClick={() => handleToggleStatus(cliente.id, false)}
                                  className="inline-flex items-center gap-1 bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/30 px-2.5 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer"
                                  title="Desativar cliente"
                                >
                                  <UserX size={13} />
                                  <span>Desativar</span>
                                </button>
                              ) : (
                                <button
                                  onClick={() => handleToggleStatus(cliente.id, true)}
                                  className="inline-flex items-center gap-1 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 px-2.5 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer"
                                  title="Reativar cliente"
                                >
                                  <UserCheck size={13} />
                                  <span>Reativar</span>
                                </button>
                              )}

                              {/* WhatsApp Button */}
                              {isAtivo && (
                                <button
                                  onClick={() =>
                                    onOpenWhatsApp(
                                      cliente,
                                      `Olá *${cliente.nome}*, tudo bem? Entramos em contato a respeito de suas reservas na *Locadora de Acervo*.`
                                    )
                                  }
                                  className="inline-flex items-center gap-1 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 px-2.5 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer"
                                >
                                  <MessageSquare size={13} />
                                </button>
                              )}

                              {isAtivo && onSelectClienteForWebForm && (
                                <button
                                  onClick={() => onSelectClienteForWebForm(cliente)}
                                  className="inline-flex items-center gap-1 bg-[#D4AF37]/10 hover:bg-[#D4AF37]/20 text-[#D4AF37] border border-[#D4AF37]/30 px-2.5 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer"
                                  title="Criar orçamento vinculado a este cliente"
                                >
                                  <FileText size={13} />
                                  <span>Orçamento</span>
                                </button>
                              )}

                              {isAtivo && getClientProposals(cliente).length > 0 && (
                                <button
                                  onClick={() => setViewingClientePropostas(cliente)}
                                  className="inline-flex items-center gap-1 bg-[#D4AF37]/10 hover:bg-[#D4AF37]/20 text-[#D4AF37] border border-[#D4AF37]/30 px-2.5 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer"
                                  title="Ver propostas aprovadas deste cliente"
                                >
                                  <FileText size={13} />
                                  <span>Propostas ({getClientProposals(cliente).length})</span>
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Standardized Pagination Controls */}
          <StandardPagination
            currentPage={currentPage}
            totalPages={totalPages}
            totalItems={filteredClientes.length}
            itemsPerPage={itemsPerPage}
            onPageChange={setCurrentPage}
          />
        </>
      )}

      {/* Cadastrar Novo Cliente Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-[#0A0A0B]/80 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-[#111113] border border-[#27272A] rounded-2xl max-w-lg w-full max-h-[90vh] flex flex-col text-white shadow-2xl my-auto overflow-hidden">
            <div className="sticky top-0 z-20 bg-[#111113] border-b border-[#27272A] p-4 flex items-center justify-between shrink-0">
              <h3 className="text-lg font-serif italic text-[#D4AF37] flex items-center gap-2">
                <UserPlus size={18} /> Cadastrar Novo Cliente
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-[#71717A] hover:text-white p-1 rounded-lg cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="flex flex-col flex-1 overflow-hidden">
              <div className="flex-1 overflow-y-auto p-4 space-y-4">
                <div>
                  <label className="block text-xs font-medium text-[#A1A1AA] mb-1">
                    Nome Completo <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.nome}
                    onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                    onFocus={handleFocusScroll}
                    className="w-full px-3.5 py-2.5 bg-[#18181B] border border-[#27272A] rounded-xl text-white text-sm focus:border-[#D4AF37] focus:outline-none"
                    placeholder="Ex: João da Silva"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-[#A1A1AA] mb-1">
                    Telefone / WhatsApp <span className="text-red-400">*</span>
                  </label>
                  <PhoneInput
                    value={formData.telefone}
                    onChange={(val) => setFormData({ ...formData, telefone: val })}
                    required
                    placeholder="11 99999-8888"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-[#A1A1AA] mb-1">E-mail (Opcional)</label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    onFocus={handleFocusScroll}
                    className="w-full px-3.5 py-2.5 bg-[#18181B] border border-[#27272A] rounded-xl text-white text-sm focus:border-[#D4AF37] focus:outline-none"
                    placeholder="exemplo@email.com"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-[#A1A1AA] mb-1">CPF ou CNPJ (Opcional)</label>
                    <input
                      type="text"
                      value={formData.cpfCnpj}
                      onChange={(e) => {
                        setFormData({ ...formData, cpfCnpj: e.target.value });
                        if (formDocError) setFormDocError(null);
                      }}
                      onBlur={() => {
                        if (formData.cpfCnpj.trim()) {
                          const res = validarDocumento(formData.cpfCnpj);
                          if (res.valido && res.formatado) {
                            setFormData({ ...formData, cpfCnpj: res.formatado });
                          }
                        }
                      }}
                      onFocus={handleFocusScroll}
                      className={`w-full px-3.5 py-2.5 bg-[#18181B] border rounded-xl text-white text-sm focus:outline-none font-mono ${
                        formDocError ? 'border-red-500/80 focus:border-red-500' : 'border-[#27272A] focus:border-[#D4AF37]'
                      }`}
                      placeholder="000.000.000-00 ou CNPJ"
                    />
                    {formDocError && (
                      <p className="text-[11px] text-red-400 mt-1 flex items-center gap-1">
                        <AlertTriangle size={12} className="shrink-0" />
                        <span>{formDocError}</span>
                      </p>
                    )}
                  </div>
                </div>

                <div className="bg-[#18181C] p-3.5 rounded-xl border border-[#27272A]">
                  <EnderecoFormFields
                    value={formData.addressData}
                    onChange={(newAddr) => setFormData({ ...formData, addressData: newAddr })}
                    onFocus={handleFocusScroll}
                    labelPrefix="Cliente"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-[#A1A1AA] mb-1">Observações Internas (Opcional)</label>
                  <textarea
                    rows={2}
                    value={formData.observacoes}
                    onChange={(e) => setFormData({ ...formData, observacoes: e.target.value })}
                    onFocus={handleFocusScroll}
                    className="w-full px-3.5 py-2.5 bg-[#18181B] border border-[#27272A] rounded-xl text-white text-sm focus:border-[#D4AF37] focus:outline-none resize-none"
                    placeholder="Anotações sobre preferências, histórico ou restrições..."
                  />
                </div>
              </div>

              <div className="sticky bottom-0 z-20 bg-[#111113]/95 backdrop-blur-md border-t border-[#27272A] p-4 flex items-center justify-end gap-3 shrink-0">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 bg-[#18181B] border border-[#27272A] hover:bg-[#27272A] text-[#A1A1AA] rounded-xl text-xs font-semibold uppercase tracking-wider cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 bg-[#D4AF37] hover:bg-[#E5C158] text-[#0A0A0B] rounded-xl text-xs font-bold uppercase tracking-wider shadow-md cursor-pointer flex items-center gap-1.5"
                >
                  <UserPlus size={14} />
                  <span>Salvar Cliente</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Editar Cliente Modal */}
      {isEditModalOpen && editingCliente && (
        <div className="fixed inset-0 z-50 bg-[#0A0A0B]/80 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-[#111113] border border-[#27272A] rounded-2xl max-w-lg w-full max-h-[90vh] flex flex-col text-white shadow-2xl my-auto overflow-hidden">
            <div className="sticky top-0 z-20 bg-[#111113] border-b border-[#27272A] p-4 flex items-center justify-between shrink-0">
              <h3 className="text-lg font-serif italic text-[#D4AF37] flex items-center gap-2">
                <Pencil size={18} /> Editar Cadastro de Cliente (#{editingCliente.id})
              </h3>
              <button
                onClick={() => setIsEditModalOpen(false)}
                className="text-[#71717A] hover:text-white p-1 rounded-lg cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleSaveEdit} className="flex flex-col flex-1 overflow-hidden">
              <div className="flex-1 overflow-y-auto p-4 space-y-4">
                <div>
                  <label className="block text-xs font-medium text-[#A1A1AA] mb-1">
                    Nome Completo <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={editFormData.nome}
                    onChange={(e) => setEditFormData({ ...editFormData, nome: e.target.value })}
                    onFocus={handleFocusScroll}
                    className="w-full px-3.5 py-2.5 bg-[#18181B] border border-[#27272A] rounded-xl text-white text-sm focus:border-[#D4AF37] focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-[#A1A1AA] mb-1">
                    Telefone / WhatsApp <span className="text-red-400">*</span>
                  </label>
                  <PhoneInput
                    value={editFormData.telefone}
                    onChange={(val) => setEditFormData({ ...editFormData, telefone: val })}
                    required
                    placeholder="11 99999-8888"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-[#A1A1AA] mb-1">E-mail</label>
                  <input
                    type="email"
                    value={editFormData.email}
                    onChange={(e) => setEditFormData({ ...editFormData, email: e.target.value })}
                    onFocus={handleFocusScroll}
                    className="w-full px-3.5 py-2.5 bg-[#18181B] border border-[#27272A] rounded-xl text-white text-sm focus:border-[#D4AF37] focus:outline-none"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-[#A1A1AA] mb-1">CPF ou CNPJ</label>
                    <input
                      type="text"
                      value={editFormData.cpfCnpj}
                      onChange={(e) => {
                        setEditFormData({ ...editFormData, cpfCnpj: e.target.value });
                        if (editDocError) setEditDocError(null);
                      }}
                      onBlur={() => {
                        if (editFormData.cpfCnpj.trim()) {
                          const res = validarDocumento(editFormData.cpfCnpj);
                          if (res.valido && res.formatado) {
                            setEditFormData({ ...editFormData, cpfCnpj: res.formatado });
                          }
                        }
                      }}
                      onFocus={handleFocusScroll}
                      className={`w-full px-3.5 py-2.5 bg-[#18181B] border rounded-xl text-white text-sm focus:outline-none font-mono ${
                        editDocError ? 'border-red-500/80 focus:border-red-500' : 'border-[#27272A] focus:border-[#D4AF37]'
                      }`}
                      placeholder="000.000.000-00 ou CNPJ"
                    />
                    {editDocError && (
                      <p className="text-[11px] text-red-400 mt-1 flex items-center gap-1">
                        <AlertTriangle size={12} className="shrink-0" />
                        <span>{editDocError}</span>
                      </p>
                    )}
                  </div>
                </div>

                <div className="bg-[#18181C] p-3.5 rounded-xl border border-[#27272A]">
                  <EnderecoFormFields
                    value={editFormData.addressData}
                    onChange={(newAddr) => setEditFormData({ ...editFormData, addressData: newAddr })}
                    onFocus={handleFocusScroll}
                    labelPrefix="Cliente"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-[#A1A1AA] mb-1">Observações Internas</label>
                  <textarea
                    rows={2}
                    value={editFormData.observacoes}
                    onChange={(e) => setEditFormData({ ...editFormData, observacoes: e.target.value })}
                    onFocus={handleFocusScroll}
                    className="w-full px-3.5 py-2.5 bg-[#18181B] border border-[#27272A] rounded-xl text-white text-sm focus:border-[#D4AF37] focus:outline-none resize-none"
                  />
                </div>
              </div>

              <div className="sticky bottom-0 z-20 bg-[#111113]/95 backdrop-blur-md border-t border-[#27272A] p-4 flex items-center justify-end gap-3 shrink-0">
                <button
                  type="button"
                  onClick={() => setIsEditModalOpen(false)}
                  className="px-4 py-2 bg-[#18181B] border border-[#27272A] hover:bg-[#27272A] text-[#A1A1AA] rounded-xl text-xs font-semibold uppercase tracking-wider cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 bg-[#D4AF37] hover:bg-[#E5C158] text-[#0A0A0B] rounded-xl text-xs font-bold uppercase tracking-wider shadow-md cursor-pointer flex items-center gap-1.5"
                >
                  <CheckCircle2 size={14} />
                  <span>Salvar Alterações</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* BRAND NEW RICH CONTACTS IMPORT FLOW MODAL (with Android simulation features) */}
      {isImportModalOpen && (
        <div className="fixed inset-0 z-50 bg-[#0A0A0B]/90 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-[#111113] border border-[#27272A] rounded-3xl max-w-2xl w-full p-6 text-white shadow-2xl my-8 space-y-4 flex flex-col max-h-[90vh]">
            
            {/* Modal Header */}
            <div className="flex justify-between items-start pb-2 border-b border-[#27272A]">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-[#D4AF37]/10 border border-[#D4AF37]/30 flex items-center justify-center text-[#D4AF37]">
                  <Smartphone size={20} />
                </div>
                <div>
                  <h3 className="text-lg font-serif italic text-white">Importar Contatos</h3>
                  <p className="text-[#A1A1AA] text-xs">Integração Google & Simulador Android</p>
                </div>
              </div>
              <button
                onClick={() => setIsImportModalOpen(false)}
                className="p-1.5 rounded-lg bg-[#18181B] border border-[#27272A] hover:text-[#D4AF37] text-[#71717A] transition-colors cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            {/* Modal Tabs */}
            <div className="flex border-b border-[#27272A] -mx-6 px-6">
              <button
                type="button"
                onClick={() => setImportSource('simulated')}
                className={`flex-1 py-2 text-xs font-bold uppercase tracking-wider border-b-2 text-center transition-all cursor-pointer ${
                  importSource === 'simulated'
                    ? 'border-[#D4AF37] text-[#D4AF37]'
                    : 'border-transparent text-[#71717A] hover:text-[#A1A1AA]'
                }`}
              >
                Simulador Local (Android)
              </button>
              <button
                type="button"
                onClick={() => {
                  setImportSource('google');
                  if (googleContacts.length === 0) {
                    handleLoadGoogleContacts();
                  }
                }}
                className={`flex-1 py-2 text-xs font-bold uppercase tracking-wider border-b-2 text-center transition-all cursor-pointer ${
                  importSource === 'google'
                    ? 'border-[#D4AF37] text-[#D4AF37]'
                    : 'border-transparent text-[#71717A] hover:text-[#A1A1AA]'
                }`}
              >
                Google Contatos (Real)
              </button>
            </div>

            {/* Modal Content */}
            {importSource === 'google' ? (
              <div className="flex-1 flex flex-col space-y-4 min-h-0">
                {googleError && (
                  <div className="bg-red-500/10 border border-red-500/30 p-3.5 rounded-xl text-xs text-red-400">
                    {googleError}
                  </div>
                )}

                {isLoadingGoogle ? (
                  <div className="flex-1 flex flex-col items-center justify-center py-12">
                    <Loader2 className="animate-spin text-[#D4AF37] mb-3" size={32} />
                    <p className="text-xs text-[#A1A1AA]">Carregando seus contatos do Google...</p>
                  </div>
                ) : googleContacts.length === 0 ? (
                  <div className="flex-1 flex flex-col items-center justify-center py-12 text-center space-y-4">
                    <Users className="text-[#71717A]" size={36} />
                    <p className="text-xs text-[#A1A1AA]">Nenhum contato carregado do Google Contatos.</p>
                    <button
                      type="button"
                      onClick={handleLoadGoogleContacts}
                      className="bg-[#D4AF37]/10 border border-[#D4AF37]/30 text-[#D4AF37] hover:bg-[#D4AF37]/20 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer"
                    >
                      Conectar e Sincronizar Google Contatos
                    </button>
                  </div>
                ) : (
                  <>
                    <div className="relative">
                      <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#71717A]" size={16} />
                      <input
                        type="text"
                        value={importSearch}
                        onChange={(e) => setImportSearch(e.target.value)}
                        placeholder="Pesquisar nos Contatos do Google..."
                        className="w-full pl-10 pr-4 py-2.5 bg-[#18181B] border border-[#27272A] rounded-2xl text-white placeholder-[#71717A] text-xs focus:border-[#D4AF37] focus:outline-none transition-all"
                      />
                    </div>

                    <div className="flex-1 overflow-y-auto border border-[#27272A] bg-[#0A0A0B] rounded-2xl divide-y divide-[#27272A]/80 pr-1 max-h-[250px]">
                      {googleContacts
                        .filter(c => c.name.toLowerCase().includes(importSearch.toLowerCase()) || (c.phone || '').includes(importSearch))
                        .map((c) => {
                          const isChecked = googleContactsSelected.includes(c.id);
                          return (
                            <div
                              key={c.id}
                              onClick={() => handleToggleSelectGoogleContact(c.id)}
                              className={`flex items-center justify-between p-3.5 hover:bg-[#111113] transition-all cursor-pointer select-none ${
                                isChecked ? 'bg-[#D4AF37]/5' : ''
                              }`}
                            >
                              <div className="flex items-center gap-3">
                                <div className="w-9 h-9 rounded-xl bg-[#18181B] border border-[#27272A] flex items-center justify-center text-[#D4AF37]">
                                  <Users size={16} />
                                </div>
                                <div className="space-y-0.5">
                                  <div className="text-xs font-bold text-white">{c.name}</div>
                                  <div className="flex gap-3 text-[11px] text-[#A1A1AA] font-mono">
                                    <span>{c.phone || 'Sem telefone'}</span>
                                    {c.email && <span>{c.email}</span>}
                                  </div>
                                </div>
                              </div>
                              <div className={`w-6 h-6 rounded-lg border-2 flex items-center justify-center transition-all ${
                                isChecked ? 'bg-[#D4AF37] border-[#D4AF37]' : 'border-[#3F3F46]'
                              }`}>
                                {isChecked && <Check size={14} className="text-black stroke-[3px]" />}
                              </div>
                            </div>
                          );
                        })}
                    </div>

                    <div className="flex flex-col sm:flex-row justify-between items-center gap-4 pt-4 border-t border-[#27272A]">
                      <span className="text-xs text-[#A1A1AA]">
                        Selecionados: <strong className="text-[#D4AF37] font-mono text-sm">{googleContactsSelected.length}</strong> contatos reais do Google
                      </span>
                      <div className="flex gap-2 w-full sm:w-auto">
                        <button
                          onClick={() => setIsImportModalOpen(false)}
                          className="flex-1 sm:flex-initial px-5 py-2.5 bg-[#18181B] border border-[#27272A] hover:bg-[#27272A] text-[#A1A1AA] rounded-xl text-xs font-semibold uppercase tracking-wider cursor-pointer"
                        >
                          Cancelar
                        </button>
                        <button
                          onClick={handleConfirmImportGoogle}
                          disabled={googleContactsSelected.length === 0}
                          className="flex-1 sm:flex-initial px-5 py-2.5 bg-[#D4AF37] hover:bg-[#E5C158] disabled:bg-[#27272A] disabled:text-[#71717A] text-[#0A0A0B] rounded-xl text-xs font-bold uppercase tracking-wider shadow-lg shadow-[#D4AF37]/10 transition-all cursor-pointer flex items-center justify-center gap-2"
                        >
                          <CheckCircle2 size={14} />
                          <span>Importar {googleContactsSelected.length} Contatos</span>
                        </button>
                      </div>
                    </div>
                  </>
                )}
              </div>
            ) : (
              // SCREEN 1: Ask for Explicit Contacts Permission
              <div className="flex-1 flex flex-col space-y-4 min-h-0">
                {!hasContactsPermission ? (
              <div className="flex-1 flex flex-col items-center justify-center py-10 px-4 text-center space-y-6">
                <div className="w-20 h-20 rounded-full bg-amber-500/10 border-2 border-dashed border-amber-500/40 flex items-center justify-center text-amber-500 animate-pulse">
                  <ShieldCheck size={42} />
                </div>

                <div className="space-y-2 max-w-md">
                  <h4 className="text-base font-bold text-white uppercase tracking-wider">Permissão de Acesso Necessária</h4>
                  <p className="text-[#A1A1AA] text-xs leading-relaxed">
                    Para selecionar e puxar os dados dos clientes diretamente da agenda do seu smartphone, o aplicativo precisa de sua autorização explícita para ler a lista de contatos.
                  </p>
                  <p className="text-[#71717A] text-[11px] italic">
                    Nenhum dado é coletado ou enviado a servidores de terceiros. A sincronização ocorre de forma privada no seu próprio aparelho Android com o seu banco de dados Firebase.
                  </p>
                </div>

                <div className="flex flex-col sm:flex-row gap-3 w-full max-w-md pt-4">
                  <button
                    id="btn-conceder-permissao"
                    onClick={handleGrantPermission}
                    className="flex-1 bg-gradient-to-r from-[#D4AF37] to-[#E5C158] hover:opacity-90 text-[#0A0A0B] py-3.5 rounded-2xl text-xs font-bold uppercase tracking-wider shadow-lg transition-all cursor-pointer flex items-center justify-center gap-2"
                  >
                    <ShieldCheck size={16} />
                    <span>Conceder Autorização</span>
                  </button>

                  <button
                    onClick={() => setIsImportModalOpen(false)}
                    className="flex-1 bg-[#18181B] border border-[#27272A] hover:bg-[#27272A] text-white py-3.5 rounded-2xl text-xs font-semibold uppercase tracking-wider transition-all cursor-pointer"
                  >
                    Cancelar
                  </button>
                </div>

                {/* Android Native Check button */}
                <div className="pt-4 text-center">
                  <button
                    onClick={handleTryNativeContactPicker}
                    className="text-xs text-[#D4AF37] hover:underline cursor-pointer flex items-center justify-center gap-1.5 mx-auto"
                  >
                    <Smartphone size={14} />
                    <span>Tentar API Contact Picker Nativa do Android</span>
                  </button>
                </div>
              </div>
            ) : (
              // SCREEN 2: REVIEW, FILTER AND CONFIRMATION UI
              <div className="flex-1 flex flex-col space-y-4 min-h-0">
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-[#A1A1AA] flex items-center gap-1.5">
                      <Sparkles size={14} className="text-[#D4AF37]" /> Filtro Inteligente Ativo
                    </span>
                    <button
                      onClick={handleRevokePermission}
                      className="text-[10px] text-red-400 hover:underline flex items-center gap-1 cursor-pointer"
                    >
                      Revogar Permissão de Contatos
                    </button>
                  </div>

                  <div className="bg-[#D4AF37]/5 border border-[#D4AF37]/20 p-3 rounded-2xl text-[11px] text-[#E4E4E7] leading-relaxed flex items-start gap-2">
                    <Info size={16} className="text-[#D4AF37] shrink-0 mt-0.5" />
                    <div>
                      <span className="font-bold text-[#D4AF37]">Regra de Negócio Android:</span> O sistema varreu a agenda e pré-selecionou automaticamente todos os contatos com a palavra <span className="underline italic">"cliente"</span> no nome.
                    </div>
                  </div>

                  <div className="relative">
                    <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#71717A]" size={16} />
                    <input
                      type="text"
                      value={importSearch}
                      onChange={(e) => setImportSearch(e.target.value)}
                      placeholder="Pesquisar por nome, telefone ou e-mail na agenda..."
                      className="w-full pl-10 pr-4 py-2.5 bg-[#18181B] border border-[#27272A] rounded-2xl text-white placeholder-[#71717A] text-xs focus:border-[#D4AF37] focus:outline-none transition-all"
                    />
                  </div>
                </div>

                <div className="flex flex-wrap justify-between items-center gap-2 pb-1 text-xs">
                  <div className="text-[#A1A1AA]">
                    Selecionados: <strong className="text-[#D4AF37] font-mono text-sm">{selectedContactIndexes.length}</strong> de <strong className="font-mono text-white">{phoneContacts.length}</strong> contatos
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleSelectAllFiltered(filteredContactsWithIndex.map(({ originalIdx }) => originalIdx))}
                      className="text-[11px] text-[#D4AF37] hover:underline cursor-pointer"
                    >
                      Marcar todos exibidos
                    </button>
                    <span className="text-[#27272A]">|</span>
                    <button
                      onClick={() => handleDeselectAllFiltered(filteredContactsWithIndex.map(({ originalIdx }) => originalIdx))}
                      className="text-[11px] text-red-400 hover:underline cursor-pointer"
                    >
                      Desmarcar todos exibidos
                    </button>
                  </div>
                </div>

                <div className="flex-1 overflow-y-auto border border-[#27272A] bg-[#0A0A0B] rounded-2xl divide-y divide-[#27272A]/80 pr-1 max-h-[250px]">
                  {filteredContactsWithIndex.length === 0 ? (
                    <div className="p-8 text-center text-[#71717A] text-xs">
                      Nenhum contato encontrado correspondente aos termos de busca.
                    </div>
                  ) : (
                    <>
                      {matchesFilterGroup.length > 0 && (
                        <div>
                          <div className="bg-[#18181B]/40 px-3.5 py-1.5 text-[10px] uppercase tracking-wider font-bold text-[#D4AF37] border-b border-[#27272A]/50 flex justify-between">
                            <span>Filtro de Clientes Automatizado</span>
                            <span className="font-mono">({matchesFilterGroup.length} contatos)</span>
                          </div>
                          <div className="divide-y divide-[#27272A]/40">
                            {matchesFilterGroup.map(({ contact, originalIdx }) => {
                              const isChecked = selectedContactIndexes.includes(originalIdx);
                              return (
                                <div
                                  key={`contact-${originalIdx}`}
                                  onClick={() => handleToggleSelectContact(originalIdx)}
                                  className={`flex items-center justify-between p-3.5 hover:bg-[#111113] transition-all cursor-pointer select-none active:bg-[#18181B] ${
                                    isChecked ? 'bg-[#D4AF37]/5' : ''
                                  }`}
                                  style={{ minHeight: '48px' }}
                                >
                                  <div className="flex items-center gap-3">
                                    <div className="w-9 h-9 rounded-xl bg-[#18181B] border border-[#27272A] flex items-center justify-center text-[#D4AF37]">
                                      <Users size={16} />
                                    </div>
                                    <div className="space-y-0.5">
                                      <div className="text-xs font-bold text-white flex items-center gap-2">
                                        <span>{contact.nome}</span>
                                        <span className="bg-[#D4AF37]/20 text-[#D4AF37] px-1.5 py-0.5 rounded text-[8px] font-bold uppercase tracking-wide border border-[#D4AF37]/30">Auto</span>
                                      </div>
                                      <div className="flex flex-wrap gap-x-3 gap-y-0.5 text-[11px] text-[#A1A1AA] font-mono">
                                        <span className="flex items-center gap-1"><Phone size={10} className="text-emerald-500" /> {contact.telefone}</span>
                                        {contact.email && <span className="flex items-center gap-1"><Mail size={10} /> {contact.email}</span>}
                                      </div>
                                    </div>
                                  </div>

                                  <div className="flex items-center gap-2">
                                    <div className={`w-6 h-6 rounded-lg border-2 flex items-center justify-center transition-all ${
                                      isChecked ? 'bg-[#D4AF37] border-[#D4AF37]' : 'border-[#3F3F46]'
                                    }`}>
                                      {isChecked && <Check size={14} className="text-black stroke-[3px]" />}
                                    </div>
                                    
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleDeleteSimContact(originalIdx);
                                      }}
                                      className="p-1 text-[#71717A] hover:text-red-400 cursor-pointer"
                                      title="Remover contato da agenda simulada"
                                    >
                                      <Trash2 size={12} />
                                    </button>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}

                      {otherGroup.length > 0 && (
                        <div>
                          <div className="bg-[#18181B]/20 px-3.5 py-1.5 text-[10px] uppercase tracking-wider font-bold text-[#A1A1AA] border-b border-[#27272A]/50 flex justify-between">
                            <span>Outros Contatos do Celular</span>
                            <span className="font-mono">({otherGroup.length} contatos)</span>
                          </div>
                          <div className="divide-y divide-[#27272A]/40">
                            {otherGroup.map(({ contact, originalIdx }) => {
                              const isChecked = selectedContactIndexes.includes(originalIdx);
                              return (
                                <div
                                  key={`contact-${originalIdx}`}
                                  onClick={() => handleToggleSelectContact(originalIdx)}
                                  className={`flex items-center justify-between p-3.5 hover:bg-[#111113] transition-all cursor-pointer select-none active:bg-[#18181B] ${
                                    isChecked ? 'bg-[#D4AF37]/5' : ''
                                  }`}
                                  style={{ minHeight: '48px' }}
                                >
                                  <div className="flex items-center gap-3">
                                    <div className="w-9 h-9 rounded-xl bg-[#18181B] border border-[#27272A] flex items-center justify-center text-[#71717A]">
                                      <Users size={16} />
                                    </div>
                                    <div className="space-y-0.5">
                                      <div className="text-xs font-semibold text-white">
                                        {contact.nome}
                                      </div>
                                      <div className="flex flex-wrap gap-x-3 gap-y-0.5 text-[11px] text-[#A1A1AA] font-mono">
                                        <span className="flex items-center gap-1"><Phone size={10} /> {contact.telefone}</span>
                                        {contact.email && <span className="flex items-center gap-1"><Mail size={10} /> {contact.email}</span>}
                                      </div>
                                    </div>
                                  </div>

                                  <div className="flex items-center gap-2">
                                    <div className={`w-6 h-6 rounded-lg border-2 flex items-center justify-center transition-all ${
                                      isChecked ? 'bg-[#D4AF37] border-[#D4AF37]' : 'border-[#3F3F46]'
                                    }`}>
                                      {isChecked && <Check size={14} className="text-black stroke-[3px]" />}
                                    </div>
                                    
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleDeleteSimContact(originalIdx);
                                      }}
                                      className="p-1 text-[#71717A] hover:text-red-400 cursor-pointer"
                                      title="Remover contato da agenda simulada"
                                    >
                                      <Trash2 size={12} />
                                    </button>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </>
                  )}
                </div>

                <div className="border border-[#27272A] p-4 rounded-2xl bg-[#18181B]/40 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-[#D4AF37] flex items-center gap-1">
                      <Smartphone size={14} /> Android Contacts Playground
                    </span>
                    <span className="text-[10px] text-[#A1A1AA]">Adicione contatos customizados</span>
                  </div>

                  {simError && (
                    <p className="text-[11px] text-red-400 font-medium">{simError}</p>
                  )}

                  <form onSubmit={handleAddCustomSimContact} className="grid grid-cols-1 sm:grid-cols-12 gap-2">
                    <input
                      type="text"
                      value={newSimName}
                      onChange={(e) => setNewSimName(e.target.value)}
                      placeholder="Nome do Contato (Ex: Amanda Cliente)"
                      className="px-3 py-2 bg-[#18181B] border border-[#27272A] rounded-xl text-xs text-white focus:border-[#D4AF37] focus:outline-none focus:ring-0 sm:col-span-5"
                    />
                    <div className="sm:col-span-5">
                      <PhoneInput
                        value={newSimPhone}
                        onChange={(val) => setNewSimPhone(val)}
                        placeholder="11 99999-8888"
                      />
                    </div>
                    <button
                      type="submit"
                      className="bg-[#D4AF37]/10 border border-[#D4AF37]/30 hover:bg-[#D4AF37]/20 text-[#D4AF37] px-3 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 whitespace-nowrap sm:col-span-2"
                    >
                      <Plus size={14} />
                      <span>Inserir</span>
                    </button>
                  </form>
                </div>

                <div className="flex flex-col sm:flex-row justify-between items-center gap-4 pt-4 border-t border-[#27272A]">
                  <button
                    onClick={handleTryNativeContactPicker}
                    className="text-xs text-[#A1A1AA] hover:text-white flex items-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <Smartphone size={14} className="text-[#D4AF37]" />
                    <span>Importar da Agenda Física</span>
                  </button>

                  <div className="flex gap-2 w-full sm:w-auto">
                    <button
                      onClick={() => setIsImportModalOpen(false)}
                      className="flex-1 sm:flex-initial px-5 py-2.5 bg-[#18181B] border border-[#27272A] hover:bg-[#27272A] text-[#A1A1AA] rounded-xl text-xs font-semibold uppercase tracking-wider cursor-pointer"
                    >
                      Cancelar
                    </button>

                    <button
                      onClick={handleConfirmImport}
                      disabled={selectedContactIndexes.length === 0}
                      className="flex-1 sm:flex-initial px-5 py-2.5 bg-[#D4AF37] hover:bg-[#E5C158] disabled:bg-[#27272A] disabled:text-[#71717A] text-[#0A0A0B] rounded-xl text-xs font-bold uppercase tracking-wider shadow-lg shadow-[#D4AF37]/10 transition-all cursor-pointer flex items-center justify-center gap-2 disabled:shadow-none"
                    >
                      <CheckCircle2 size={14} />
                      <span>Importar {selectedContactIndexes.length} Contatos</span>
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

          </div>
        </div>
      )}

      {/* View Client Approved Proposals Modal */}
      {viewingClientePropostas && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#111113] border border-[#27272A] rounded-2xl w-full max-w-2xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
            <div className="p-5 border-b border-[#27272A] flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-[#D4AF37]/10 border border-[#D4AF37]/30 flex items-center justify-center text-[#D4AF37]">
                  <FileText size={20} />
                </div>
                <div>
                  <h3 className="text-white font-bold text-base">Propostas Aprovadas do Cliente</h3>
                  <p className="text-xs text-[#71717A]">{viewingClientePropostas.nome} • #{viewingClientePropostas.id}</p>
                </div>
              </div>
              <button
                onClick={() => setViewingClientePropostas(null)}
                className="p-2 bg-[#18181B] hover:bg-[#27272A] text-[#A1A1AA] hover:text-white rounded-xl border border-[#27272A] transition-all cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-4 flex-1">
              {getClientProposals(viewingClientePropostas).length === 0 ? (
                <div className="py-12 text-center space-y-3">
                  <div className="w-12 h-12 rounded-full bg-[#18181B] border border-[#27272A] flex items-center justify-center mx-auto text-[#71717A]">
                    <FileText size={22} />
                  </div>
                  <p className="text-sm text-[#A1A1AA]">Nenhuma proposta aprovada encontrada para este cliente.</p>
                </div>
              ) : (
                getClientProposals(viewingClientePropostas).map(form => {
                  const totalVal = form.itens.reduce((acc, i) => acc + (i.precoAluguel || 0), 0);
                  return (
                    <div key={form.id} className="bg-[#18181B] border border-[#27272A] rounded-xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-xs px-2 py-0.5 rounded bg-[#D4AF37]/10 text-[#D4AF37] border border-[#D4AF37]/30 font-bold">#{form.id}</span>
                          <span className="text-sm font-bold text-white">{form.titulo}</span>
                        </div>
                        <p className="text-xs text-[#A1A1AA]">
                          {form.itens.length} {form.itens.length === 1 ? 'item incluso' : 'itens inclusos'} • Criado em {new Date(form.criadoEm).toLocaleDateString('pt-BR')}
                        </p>
                        <p className="text-xs font-mono font-bold text-emerald-400">
                          Valor Total: {totalVal.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                        </p>
                      </div>

                      {onViewProposta && (
                        <button
                          onClick={() => {
                            setViewingClientePropostas(null);
                            onViewProposta(form.id);
                          }}
                          className="px-4 py-2 bg-[#D4AF37] hover:bg-[#E5C158] text-[#0A0A0B] rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 shrink-0 shadow-lg shadow-[#D4AF37]/10"
                        >
                          <Eye size={14} />
                          <span>Conferir Proposta</span>
                        </button>
                      )}
                    </div>
                  );
                })
              )}
            </div>

            <div className="p-4 border-t border-[#27272A] bg-[#0A0A0B]/50 flex justify-end">
              <button
                onClick={() => setViewingClientePropostas(null)}
                className="px-5 py-2.5 bg-[#18181B] border border-[#27272A] hover:bg-[#27272A] text-white rounded-xl text-xs font-semibold cursor-pointer"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
