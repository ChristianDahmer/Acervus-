import React from 'react';
import { getAppLogoUrl, handleLogoError } from '../utils/logoUtils';
import { Package, Calendar, Users, Share2, Cpu, Code2, Building2, Plus, DollarSign, Wrench, FileText, Sparkles, ChevronDown, FolderKanban, MessageSquare, Palette, HardDrive, ShieldCheck, Smartphone, Instagram, FileSpreadsheet, LogOut, Layers, Pin, Sliders, Database, BookOpen } from 'lucide-react';
import { DispositivoAutorizado, ThemeConfig, EmpresaConfig } from '../types';
import { getContrastTextColor } from '../utils/themeUtils';

interface NavbarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  empresaSubTab?: string;
  setEmpresaSubTab?: (subTab: any) => void;
  onOpenNovaReserva: () => void;
  onOpenAiAssistant?: () => void;
  exibirGuiaArquitetura?: boolean;
  authenticatedDevice?: DispositivoAutorizado | null;
  onLogoff?: () => void;
  themeConfig?: ThemeConfig;
  empresaConfig?: EmpresaConfig;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  setActiveTab,
  empresaSubTab = 'empresa',
  setEmpresaSubTab,
  onOpenNovaReserva,
  onOpenAiAssistant,
  exibirGuiaArquitetura = false,
  authenticatedDevice = null,
  onLogoff,
  themeConfig,
  empresaConfig,
}) => {
  const usuarioLogado = authenticatedDevice?.usuario || empresaConfig?.nomeRepresentante || 'Operador';
  const [isDropdownOpen, setIsDropdownOpen] = React.useState(false);
  const [isMediumDropdownOpen, setIsMediumDropdownOpen] = React.useState(false);
  const [isMobileDropdownOpen, setIsMobileDropdownOpen] = React.useState(false);

  const dropdownRef = React.useRef<HTMLDivElement>(null);
  const mediumDropdownRef = React.useRef<HTMLDivElement>(null);
  const mobileDropdownRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
      if (mediumDropdownRef.current && !mediumDropdownRef.current.contains(event.target as Node)) {
        setIsMediumDropdownOpen(false);
      }
      if (mobileDropdownRef.current && !mobileDropdownRef.current.contains(event.target as Node)) {
        setIsMobileDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const companySections = [
    {
      title: 'Módulos do Sistema',
      items: [
        { id: 'inventario', label: 'Inventário', icon: Package, type: 'tab', target: 'inventario' },
        { id: 'reservas', label: 'Reservas', icon: Calendar, type: 'tab', target: 'reservas' },
        { id: 'google_forms', label: 'Orçamentos', icon: FileSpreadsheet, type: 'tab', target: 'webforms' },
        { id: 'clientes', label: 'Clientes', icon: Users, type: 'tab', target: 'clientes' },
        { id: 'financeiro', label: 'Financeiro', icon: DollarSign, type: 'tab', target: 'financeiro' },
        { id: 'relatorios', label: 'Relatórios', icon: FileText, type: 'tab', target: 'relatorios' },
        { id: 'manutencao', label: 'Manutenção', icon: Wrench, type: 'tab', target: 'manutencao' },
      ],
    },
    {
      title: 'Configurações Gerais',
      items: [
        { id: 'empresa', label: 'Dados Cadastrais', icon: Building2, type: 'subtab', target: 'empresa' },
        { id: 'painel_configuracao', label: 'Painel de Configuração', icon: Sliders, type: 'subtab', target: 'empresa' },
        { id: 'categorias', label: 'Categorias do Acervo', icon: FolderKanban, type: 'subtab', target: 'empresa' },
        { id: 'personalizacao_abas', label: 'Personalização de Abas', icon: Layers, type: 'subtab', target: 'empresa' },
        { id: 'tema', label: 'Tema & Cores', icon: Palette, type: 'subtab', target: 'empresa' },
      ],
    },
    {
      title: 'Canais & Integrações',
      items: [
        { id: 'whatsapp', label: 'Mensagens WhatsApp', icon: MessageSquare, type: 'subtab', target: 'empresa' },
        { id: 'instagram_sorteio', label: 'Sorteios Instagram', icon: Instagram, type: 'subtab', target: 'empresa' },
      ],
    },
    {
      title: 'Sistema & Segurança',
      items: [
        { id: 'permissoes', label: 'Permissões de Acesso', icon: Users, type: 'subtab', target: 'empresa' },
        { id: 'dispositivos', label: 'Usuários Acesso', icon: Smartphone, type: 'subtab', target: 'empresa' },
        { id: 'sincronizacao', label: 'Sincronização & Worker', icon: Cpu, type: 'subtab', target: 'empresa' },
        { id: 'developer', label: 'Painel do Desenvolvedor', icon: Code2, type: 'subtab', target: 'empresa' },
        { id: 'guia_arquitetura', label: 'Guia do Sistema & Arquitetura', icon: BookOpen, type: 'subtab', target: 'empresa', requiresGuiaFlag: true },
      ],
    },
  ];

  const allPossibleTabs = [
    { id: 'inventario', label: 'Inventário', icon: Package },
    { id: 'reservas', label: 'Reservas', icon: Calendar },
    { id: 'google_forms', label: 'Orçamentos', icon: FileSpreadsheet },
    { id: 'clientes', label: 'Clientes', icon: Users },
    { id: 'financeiro', label: 'Financeiro', icon: DollarSign },
    { id: 'relatorios', label: 'Relatórios', icon: FileText },
    { id: 'manutencao', label: 'Manutenção', icon: Wrench },
  ];

  const tabDisplay = empresaConfig?.tabDisplay;
  const nomesAbas = tabDisplay?.nomesAbas || {};

  const allPossibleTabsMapped = allPossibleTabs.map(t => ({
    ...t,
    label: nomesAbas[t.id] || t.label
  }));

  const ordemAbas = tabDisplay?.ordemAbas || ['inventario', 'reservas', 'google_forms', 'clientes', 'financeiro', 'relatorios', 'manutencao'];
  const abasFixadas = tabDisplay?.abasFixadas || ['inventario', 'reservas'];
  const abaPrincipalId = tabDisplay?.abaPrincipalId || 'inventario';
  const abasOcultas = tabDisplay?.abasOcultas || [];

  const sortedTabs = [...ordemAbas]
    .map(id => allPossibleTabsMapped.find(t => t.id === id))
    .filter(Boolean) as typeof allPossibleTabsMapped;

  allPossibleTabsMapped.forEach(t => {
    if (!sortedTabs.some(s => s.id === t.id)) {
      sortedTabs.push(t);
    }
  });

  const isModuleAllowed = (moduleId: string) => {
    // Regra Estrita: O painel do desenvolvedor e o guia de arquitetura estão disponíveis APENAS para usuário desenvolvedor
    if (moduleId === 'developer' || moduleId === 'guia_arquitetura') {
      return authenticatedDevice?.nivelAcesso === 'DESENVOLVEDOR';
    }

    if (authenticatedDevice?.nivelAcesso === 'DESENVOLVEDOR') {
      return true;
    }

    if (!authenticatedDevice) return true;
    if (!authenticatedDevice.nivelAcesso || authenticatedDevice.nivelAcesso === 'ADMINISTRADOR') return true;
    
    // If they have a custom permissions list set, check if moduleId is in it
    if (authenticatedDevice.permissoesModulos) {
      return authenticatedDevice.permissoesModulos.includes(moduleId);
    }
    
    // Fallback role presets if empty
    if (authenticatedDevice.nivelAcesso === 'OPERADOR') {
      return ['inventario', 'reservas', 'clientes'].includes(moduleId);
    }
    if (authenticatedDevice.nivelAcesso === 'GERENTE') {
      return !['permissoes', 'dispositivos', 'developer'].includes(moduleId);
    }
    return true;
  };

  const filteredMainNavItems = sortedTabs.filter((item) => isModuleAllowed(item.id) && !abasOcultas.includes(item.id));
  
  const filteredCompanySections = companySections
    .map((section) => ({
      ...section,
      items: section.items
        .map(item => {
          if (item.type === 'tab' && nomesAbas[item.target]) {
            return { ...item, label: nomesAbas[item.target] };
          }
          return item;
        })
        .filter((item: any) => {
          if (item.requiresGuiaFlag && !exibirGuiaArquitetura) return false;
          return isModuleAllowed(item.id);
        }),
    }))
    .filter((section) => section.items.length > 0);

  return (
    <header className="bg-[#0A0A0B]/90 backdrop-blur-md border-b border-[#27272A] sticky top-0 z-40 text-[#E4E4E7] shadow-2xl">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between min-h-[104px] py-2">
          {/* Brand Title */}
          <div
            className="flex items-center space-x-3.5 cursor-pointer group py-1"
            onClick={() => setActiveTab('inventario')}
          >
            {!!getAppLogoUrl(empresaConfig?.logoUrl) && (
              <div className="w-16 h-16 sm:w-20 sm:h-20 flex items-center justify-center bg-transparent group-hover:scale-105 transition-all duration-200 shrink-0">
                <img 
                  src={getAppLogoUrl(empresaConfig?.logoUrl)} 
                  alt={empresaConfig?.nomeFantasia || "Logo"} 
                  className="w-full h-full object-contain filter drop-shadow-md" 
                  referrerPolicy="no-referrer" 
                  onError={handleLogoError}
                />
              </div>
            )}
            <div className="flex flex-col justify-center">
              <h1 className="font-serif italic text-2xl font-bold tracking-tight text-white group-hover:text-[#D4AF37] transition-colors">
                {empresaConfig?.nomeFantasia || "Acervus"}
              </h1>
              <p className="text-[10px] uppercase tracking-widest text-[#71717A] font-medium">
                {empresaConfig?.razaoSocial ? `${empresaConfig.razaoSocial} — Gestão` : "Gestão de Eventos & Acervo"}
              </p>
              
              {/* Logged user label with one-line spacing */}
              <div className="flex items-center gap-2 mt-2 flex-wrap">
                <div 
                  style={{
                    color: themeConfig?.primaryColor || '#D4AF37',
                    backgroundColor: `${themeConfig?.primaryColor || '#D4AF37'}15`,
                    borderColor: `${themeConfig?.primaryColor || '#D4AF37'}30`,
                  }}
                  className="text-[10px] font-bold tracking-wider uppercase px-2 py-0.5 rounded-md border flex items-center gap-1.5 shadow-sm shadow-black/10 transition-all duration-200 w-fit"
                >
                  <div 
                    style={{ backgroundColor: themeConfig?.primaryColor || '#D4AF37' }}
                    className="w-1.5 h-1.5 rounded-full animate-pulse shrink-0" 
                  />
                  <span className="max-w-[200px] truncate">
                    {usuarioLogado} - {authenticatedDevice?.nomeDispositivo || 'Terminal Principal'}
                  </span>
                </div>

                {/* System Environment Badge - exibido apenas no Modo Teste */}
                {(empresaConfig?.ambienteSistema || 'producao') === 'teste' && (
                  <div className="text-[9px] font-extrabold tracking-widest uppercase px-2 py-0.5 rounded-md border flex items-center gap-1 shadow-sm bg-amber-500/15 border-amber-500/40 text-amber-400">
                    <span className="w-1.5 h-1.5 rounded-full animate-pulse bg-amber-400" />
                    <span>MODO TESTE</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Desktop Navigation Segmented Menu */}
          <nav className="hidden lg:flex flex-nowrap items-center bg-[#111113] p-1.5 rounded-2xl border border-[#27272A] shadow-inner space-x-1 overflow-x-auto no-scrollbar max-w-full">
            {filteredMainNavItems.map((item) => {
              const Icon = item.icon;
              const isActive = item.id === 'google_forms' ? (activeTab === 'webforms') : (activeTab === item.id);
              const isPinned = abasFixadas.includes(item.id);
              const isPrimary = item.id === abaPrincipalId;
              return (
                <button
                  key={item.id}
                  onClick={() => {
                    if (item.id === 'google_forms') {
                      setActiveTab('webforms');
                      if (setEmpresaSubTab) {
                        setEmpresaSubTab('google_forms');
                      }
                    } else {
                      setActiveTab(item.id);
                    }
                  }}
                  className={`relative flex items-center space-x-2 px-3.5 py-2 rounded-xl text-xs font-semibold tracking-wide transition-all cursor-pointer select-none whitespace-nowrap shrink-0 ${
                    isActive
                      ? 'bg-[#18181B] text-white border border-[#3F3F46] shadow-md shadow-black/40 font-bold'
                      : 'text-[#A1A1AA] hover:bg-[#18181B]/60 hover:text-white border border-transparent'
                  }`}
                >
                  <Icon
                    size={15}
                    className={`transition-colors ${
                      isActive ? 'text-[#D4AF37]' : isPrimary ? 'text-[#D4AF37]/80' : 'text-[#71717A]'
                    }`}
                  />
                  <span>{item.label}</span>
                  {isPinned && (
                    <span title="Aba Fixada" className="text-[#D4AF37] ml-0.5 flex items-center">
                      <Pin size={10} className="fill-[#D4AF37]" />
                    </span>
                  )}
                  {isActive && (
                    <span className="w-1.5 h-1.5 rounded-full bg-[#D4AF37] shadow-sm shadow-[#D4AF37]" />
                  )}
                </button>
              );
            })}

            {/* Dropdown de Empresa */}
            <div className="relative shrink-0" ref={dropdownRef}>
              <button
                onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                className={`relative flex items-center space-x-2 px-3.5 py-2 rounded-xl text-xs font-semibold tracking-wide transition-all cursor-pointer select-none whitespace-nowrap shrink-0 ${
                  activeTab === 'empresa' || activeTab === 'relatorios'
                    ? 'bg-[#18181B] text-white border border-[#3F3F46] shadow-md shadow-black/40 font-bold'
                    : 'text-[#A1A1AA] hover:bg-[#18181B]/60 hover:text-white border border-transparent'
                }`}
              >
                <Building2
                  size={15}
                  className={`transition-colors ${
                    activeTab === 'empresa' || activeTab === 'relatorios' ? 'text-[#D4AF37]' : 'text-[#71717A]'
                  }`}
                />
                <span>Empresa</span>
                <ChevronDown
                  size={14}
                  className={`transition-transform duration-200 text-[#71717A] ${
                    isDropdownOpen ? 'rotate-180 text-white' : ''
                  }`}
                />
                {(activeTab === 'empresa' || activeTab === 'relatorios') && (
                  <span className="w-1.5 h-1.5 rounded-full bg-[#D4AF37] shadow-sm shadow-[#D4AF37]" />
                )}
              </button>

              {isDropdownOpen && (
                <div 
                  id="empresa-dropdown-menu"
                  className="absolute right-0 mt-2 w-72 max-h-[85vh] overflow-y-auto rounded-xl bg-[#111113] border border-[#27272A] shadow-2xl p-2.5 z-50 animate-fadeIn no-scrollbar"
                >
                  {filteredCompanySections.map((section, sIdx) => (
                    <div key={section.title} className={sIdx > 0 ? 'mt-3.5' : ''}>
                      <div className="text-[10px] uppercase tracking-widest text-[#71717A] font-extrabold px-2.5 py-1.5 border-b border-[#27272A]/40 mb-1.5">
                        {section.title}
                      </div>
                      <div className="space-y-0.5">
                        {section.items.map((item) => {
                          const Icon = item.icon;
                          const isActive = item.type === 'tab' 
                            ? activeTab === item.target 
                            : (activeTab === item.target && empresaSubTab === item.id);
                          return (
                            <button
                              key={item.id}
                              onClick={() => {
                                if (item.type === 'tab') {
                                  setActiveTab(item.target);
                                } else {
                                  setActiveTab(item.target);
                                  if (setEmpresaSubTab) {
                                    setEmpresaSubTab(item.id);
                                  }
                                }
                                setIsDropdownOpen(false);
                              }}
                              className={`w-full flex items-center space-x-2.5 px-3 py-2.5 rounded-lg text-xs font-semibold transition-all text-left cursor-pointer ${
                                isActive
                                  ? 'bg-[#18181B] text-[#D4AF37] border border-[#3F3F46]'
                                  : 'text-[#A1A1AA] hover:bg-[#18181B]/60 hover:text-white border border-transparent'
                              }`}
                            >
                              <Icon size={14} className={isActive ? 'text-[#D4AF37]' : 'text-[#71717A]'} />
                              <span className="truncate">{item.label}</span>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  ))}

                  {/* Logoff / Logout Button inside Empresa Dropdown */}
                  {onLogoff && (
                    <div className="mt-3 pt-2 border-t border-[#27272A]">
                      <button
                        type="button"
                        onClick={() => {
                          setIsDropdownOpen(false);
                          onLogoff();
                        }}
                        className="w-full flex items-center space-x-2.5 px-3 py-2.5 rounded-lg text-xs font-semibold text-red-400 hover:bg-red-500/10 hover:text-red-300 border border-transparent hover:border-red-500/20 transition-all text-left cursor-pointer group"
                      >
                        <LogOut size={14} className="text-red-400 group-hover:text-red-300 transition-colors" />
                        <span className="truncate">Sair / Logoff</span>
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          </nav>

          {/* Medium Screens Compact Nav */}
          <nav className="hidden md:flex lg:hidden flex-nowrap items-center bg-[#111113] p-1 rounded-xl border border-[#27272A] space-x-1 overflow-x-auto no-scrollbar max-w-full">
            {filteredMainNavItems.map((item) => {
              const Icon = item.icon;
              const isActive = item.id === 'google_forms' ? (activeTab === 'webforms') : (activeTab === item.id);
              return (
                <button
                  key={item.id}
                  onClick={() => {
                    if (item.id === 'google_forms') {
                      setActiveTab('webforms');
                      if (setEmpresaSubTab) {
                        setEmpresaSubTab('google_forms');
                      }
                    } else {
                      setActiveTab(item.id);
                    }
                  }}
                  title={item.label}
                  className={`p-2 rounded-lg text-xs transition-all cursor-pointer shrink-0 ${
                    isActive
                      ? 'bg-[#18181B] text-[#D4AF37] border border-[#3F3F46]'
                      : 'text-[#71717A] hover:text-white'
                  }`}
                >
                  <Icon size={16} />
                </button>
              );
            })}

            {/* Compact Empresa Dropdown */}
            <div className="relative shrink-0" ref={mediumDropdownRef}>
              <button
                onClick={() => setIsMediumDropdownOpen(!isMediumDropdownOpen)}
                title="Empresa"
                className={`p-2 rounded-lg text-xs transition-all cursor-pointer flex items-center gap-0.5 shrink-0 ${
                  activeTab === 'empresa' || activeTab === 'relatorios'
                    ? 'bg-[#18181B] text-[#D4AF37] border border-[#3F3F46]'
                    : 'text-[#71717A] hover:text-white'
                }`}
              >
                <Building2 size={16} />
                <ChevronDown size={10} className={`transition-transform ${isMediumDropdownOpen ? 'rotate-180' : ''}`} />
              </button>

              {isMediumDropdownOpen && (
                <div 
                  id="empresa-dropdown-menu-md"
                  className="absolute right-0 mt-2 w-64 max-h-[80vh] overflow-y-auto rounded-xl bg-[#111113] border border-[#27272A] shadow-2xl p-2 z-50 no-scrollbar"
                >
                  {filteredCompanySections.map((section, sIdx) => (
                    <div key={section.title} className={sIdx > 0 ? 'mt-2' : ''}>
                      <div className="text-[9px] uppercase tracking-wider text-[#71717A] font-bold px-2 py-1">
                        {section.title}
                      </div>
                      <div className="space-y-0.5">
                        {section.items.map((item) => {
                          const Icon = item.icon;
                          const isActive = item.type === 'tab' 
                            ? activeTab === item.target 
                            : (activeTab === item.target && empresaSubTab === item.id);
                          return (
                            <button
                              key={item.id}
                              onClick={() => {
                                if (item.type === 'tab') {
                                  setActiveTab(item.target);
                                } else {
                                  setActiveTab(item.target);
                                  if (setEmpresaSubTab) {
                                    setEmpresaSubTab(item.id);
                                  }
                                }
                                setIsMediumDropdownOpen(false);
                              }}
                              className={`w-full flex items-center space-x-2 px-2.5 py-1.5 rounded-lg text-xs transition-all text-left cursor-pointer ${
                                isActive
                                  ? 'bg-[#18181B] text-[#D4AF37] border border-[#3F3F46]'
                                  : 'text-[#71717A] hover:bg-[#18181B]/60 hover:text-white border border-transparent'
                              }`}
                            >
                              <Icon size={13} className={isActive ? 'text-[#D4AF37]' : 'text-[#71717A]'} />
                              <span className="truncate">{item.label}</span>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  ))}

                  {/* Logoff / Logout Button inside Medium Empresa Dropdown */}
                  {onLogoff && (
                    <div className="mt-2 pt-2 border-t border-[#27272A]">
                      <button
                        type="button"
                        onClick={() => {
                          setIsMediumDropdownOpen(false);
                          onLogoff();
                        }}
                        className="w-full flex items-center space-x-2 px-2.5 py-1.5 rounded-lg text-xs font-semibold text-red-400 hover:bg-red-500/10 hover:text-red-300 border border-transparent hover:border-red-500/20 transition-all text-left cursor-pointer group"
                      >
                        <LogOut size={13} className="text-red-400 group-hover:text-red-300 transition-colors" />
                        <span className="truncate">Sair / Logoff</span>
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          </nav>

          {/* Action Buttons */}
          <div className="flex items-center space-x-2">
            <button
              onClick={onOpenNovaReserva}
              style={{
                backgroundColor: themeConfig?.primaryColor || 'var(--app-primary, #D4AF37)',
                color: themeConfig?.primaryColor ? getContrastTextColor(themeConfig.primaryColor) : 'var(--app-primary-text, #0A0A0B)',
                boxShadow: `0 10px 25px -5px ${themeConfig?.primaryColor || '#D4AF37'}30`,
              }}
              className="flex items-center space-x-2 hover:opacity-90 px-4 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider transition-all cursor-pointer active:scale-95"
            >
              <Plus size={16} />
              <span className="hidden sm:inline">Nova Reserva</span>
            </button>

            {/* Top Bar Logoff Button next to Nova Reserva */}
            {onLogoff && (
              <button
                type="button"
                onClick={onLogoff}
                title="Sair do Sistema / Logoff"
                className="flex items-center space-x-1.5 bg-[#18181B] hover:bg-red-500/15 text-[#A1A1AA] hover:text-red-400 border border-[#27272A] hover:border-red-500/30 px-3 py-2.5 rounded-xl text-xs font-semibold tracking-wider transition-all cursor-pointer active:scale-95 group self-start"
              >
                <LogOut size={16} className="text-[#71717A] group-hover:text-red-400 transition-colors" />
                <span className="hidden md:inline">Sair</span>
              </button>
            )}
          </div>
        </div>

        {/* Mobile Scrollable Navigation */}
        <div className="md:hidden flex flex-nowrap overflow-x-auto py-2.5 space-x-1.5 border-t border-[#27272A] no-scrollbar relative">
          {filteredMainNavItems.map((item) => {
            const Icon = item.icon;
            const isActive = item.id === 'google_forms' ? (activeTab === 'webforms') : (activeTab === item.id);
            return (
              <button
                key={item.id}
                onClick={() => {
                  if (item.id === 'google_forms') {
                    setActiveTab('webforms');
                    if (setEmpresaSubTab) {
                      setEmpresaSubTab('google_forms');
                    }
                  } else {
                    setActiveTab(item.id);
                  }
                }}
                className={`flex items-center space-x-1.5 px-3 py-2 rounded-xl text-xs font-semibold whitespace-nowrap shrink-0 transition-all cursor-pointer ${
                  isActive
                    ? 'bg-[#18181B] text-white border border-[#D4AF37]/50 shadow-md'
                    : 'text-[#A1A1AA] bg-[#111113] border border-[#27272A]'
                }`}
              >
                <Icon size={14} className={isActive ? 'text-[#D4AF37]' : 'text-[#71717A]'} />
                <span>{item.label}</span>
              </button>
            );
          })}

          {/* Mobile Empresa Dropdown */}
          <div className="relative shrink-0" ref={mobileDropdownRef}>
            <button
              onClick={() => setIsMobileDropdownOpen(!isMobileDropdownOpen)}
              className={`flex items-center space-x-1.5 px-3 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                activeTab === 'empresa' || activeTab === 'relatorios'
                  ? 'bg-[#18181B] text-white border border-[#D4AF37]/50 shadow-md'
                  : 'text-[#A1A1AA] bg-[#111113] border border-[#27272A]'
              }`}
            >
              <Building2 size={14} className={activeTab === 'empresa' || activeTab === 'relatorios' ? 'text-[#D4AF37]' : 'text-[#71717A]'} />
              <span>Empresa</span>
              <ChevronDown size={12} className={`transition-transform ${isMobileDropdownOpen ? 'rotate-180' : ''}`} />
            </button>

            {isMobileDropdownOpen && (
              <div 
                id="empresa-dropdown-menu-mobile"
                className="fixed top-[115px] left-4 right-4 max-h-[70vh] overflow-y-auto bg-[#111113] border border-[#27272A] rounded-2xl p-3 shadow-2xl z-50 flex flex-col space-y-2.5 max-w-xs ml-auto no-scrollbar"
              >
                {filteredCompanySections.map((section, sIdx) => (
                  <div key={section.title} className={sIdx > 0 ? 'mt-2' : ''}>
                    <div className="text-[9px] uppercase tracking-wider text-[#71717A] font-extrabold px-2 py-1 mb-1 border-b border-[#27272A]/40">
                      {section.title}
                    </div>
                    <div className="flex flex-col space-y-1">
                      {section.items.map((item) => {
                        const Icon = item.icon;
                        const isActive = item.type === 'tab' 
                          ? activeTab === item.target 
                          : (activeTab === item.target && empresaSubTab === item.id);
                        return (
                          <button
                            key={item.id}
                            onClick={() => {
                              if (item.type === 'tab') {
                                setActiveTab(item.target);
                              } else {
                                setActiveTab(item.target);
                                if (setEmpresaSubTab) {
                                  setEmpresaSubTab(item.id);
                                }
                              }
                              setIsMobileDropdownOpen(false);
                            }}
                            className={`flex items-center space-x-2.5 px-3 py-2.5 rounded-xl text-xs font-semibold transition-all text-left cursor-pointer ${
                              isActive
                                ? 'bg-[#18181B] text-[#D4AF37] border border-[#3F3F46]'
                                : 'text-[#A1A1AA] hover:bg-[#18181B]/60'
                            }`}
                          >
                            <Icon size={14} className={isActive ? 'text-[#D4AF37]' : 'text-[#71717A]'} />
                            <span>{item.label}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ))}

                {/* Logoff / Logout Button inside Mobile Empresa Dropdown */}
                {onLogoff && (
                  <div className="mt-2 pt-2 border-t border-[#27272A]">
                    <button
                      type="button"
                      onClick={() => {
                        setIsMobileDropdownOpen(false);
                        onLogoff();
                      }}
                      className="w-full flex items-center space-x-2 px-3 py-2.5 rounded-xl text-xs font-semibold text-red-400 hover:bg-red-500/10 hover:text-red-300 border border-transparent hover:border-red-500/20 transition-all text-left cursor-pointer group"
                    >
                      <LogOut size={14} className="text-red-400 group-hover:text-red-300 transition-colors" />
                      <span>Sair / Logoff</span>
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};
