import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { 
  Layers, 
  Pin, 
  Home, 
  Check, 
  ArrowUp, 
  ArrowDown, 
  RotateCcw, 
  Save, 
  Package, 
  Calendar, 
  Users, 
  DollarSign, 
  Wrench, 
  FileText, 
  Building2, 
  CheckCircle2,
  Eye,
  EyeOff,
  Edit3,
  FileSpreadsheet
} from 'lucide-react';
import { EmpresaConfig, TabDisplayConfig } from '../types';

interface PersonalizacaoAbasViewProps {
  empresaConfig: EmpresaConfig;
  onSaveConfig: (updated: EmpresaConfig) => void;
  setActiveTab?: (tab: string) => void;
}

export const ALL_SYSTEM_TABS = [
  { id: 'inventario', label: 'Inventário', desc: 'Gestão de equipamentos, kits e acervo disponível', icon: Package, defaultPinned: true },
  { id: 'reservas', label: 'Reservas', desc: 'Calendário de locações, contratos e devoluções', icon: Calendar, defaultPinned: true },
  { id: 'google_forms', label: 'Orçamentos', desc: 'Gerenciamento de orçamentos, propostas e links de captação', icon: FileSpreadsheet, defaultPinned: false },
  { id: 'clientes', label: 'Clientes', desc: 'CRM de clientes, histórico de aluguel e contatos', icon: Users, defaultPinned: false },
  { id: 'financeiro', label: 'Financeiro', desc: 'Controle de receitas, despesas e fluxo de caixa', icon: DollarSign, defaultPinned: false },
  { id: 'relatorios', label: 'Relatórios', desc: 'Emissão de modelos de contratos e demonstrativos', icon: FileText, defaultPinned: false },
  { id: 'manutencao', label: 'Manutenção', desc: 'Alertas de revisão e higienização de equipamentos', icon: Wrench, defaultPinned: false },
  { id: 'empresa', label: 'Configurações', desc: 'Dados cadastrais, temas, usuários e parâmetros', icon: Building2, defaultPinned: false },
];

export const PersonalizacaoAbasView: React.FC<PersonalizacaoAbasViewProps> = ({
  empresaConfig,
  onSaveConfig,
  setActiveTab,
}) => {
  const currentTabDisplay: TabDisplayConfig = empresaConfig.tabDisplay || {
    abaPrincipalId: 'inventario',
    abasFixadas: ['inventario', 'reservas'],
    ordemAbas: ALL_SYSTEM_TABS.map(t => t.id),
    abasOcultas: [],
  };

  const [abaPrincipalId, setAbaPrincipalId] = useState<string>(currentTabDisplay.abaPrincipalId || 'inventario');
  const [abasFixadas, setAbasFixadas] = useState<string[]>(Array.from(new Set(currentTabDisplay.abasFixadas || ['inventario', 'reservas'])) as string[]);
  const [ordemAbas, setOrdemAbas] = useState<string[]>(
    Array.from(new Set(
      currentTabDisplay.ordemAbas && currentTabDisplay.ordemAbas.length > 0
        ? currentTabDisplay.ordemAbas
        : ALL_SYSTEM_TABS.map(t => t.id)
    )) as string[]
  );
  const [abasOcultas, setAbasOcultas] = useState<string[]>(Array.from(new Set(currentTabDisplay.abasOcultas || [])) as string[]);
  const [nomesAbas, setNomesAbas] = useState<Record<string, string>>(currentTabDisplay.nomesAbas || {});
  
  const [saveSuccessMessage, setSaveSuccessMessage] = useState<string | null>(null);

  const handleSetAbaPrincipal = (tabId: string) => {
    setAbaPrincipalId(tabId);
    if (!abasFixadas.includes(tabId)) {
      setAbasFixadas([...abasFixadas, tabId]);
    }
    if (abasOcultas.includes(tabId)) {
      setAbasOcultas(abasOcultas.filter(id => id !== tabId));
    }
  };

  const handleTogglePin = (tabId: string) => {
    if (abasOcultas.includes(tabId)) {
      setSaveSuccessMessage('Uma aba oculta não pode ser fixada no menu. Reative a exibição da aba primeiro.');
      setTimeout(() => setSaveSuccessMessage(null), 4000);
      return;
    }
    if (abasFixadas.includes(tabId)) {
      if (tabId === abaPrincipalId) {
        setSaveSuccessMessage('A aba principal não pode ser desfixada. Altere a aba principal antes de desfixá-la.');
        setTimeout(() => setSaveSuccessMessage(null), 4000);
        return;
      }
      setAbasFixadas(abasFixadas.filter(id => id !== tabId));
    } else {
      setAbasFixadas([...abasFixadas, tabId]);
    }
  };

  const handleToggleHide = (tabId: string) => {
    if (abasOcultas.includes(tabId)) {
      setAbasOcultas(abasOcultas.filter(id => id !== tabId));
    } else {
      if (tabId === abaPrincipalId) {
        setSaveSuccessMessage('A aba principal não pode ser ocultada. Defina outra aba como principal antes de ocultar esta.');
        setTimeout(() => setSaveSuccessMessage(null), 4000);
        return;
      }
      setAbasOcultas([...abasOcultas, tabId]);
      setAbasFixadas(abasFixadas.filter(id => id !== tabId));
    }
  };

  const handleMoveTab = (index: number, direction: 'up' | 'down') => {
    const uniqueOrder = Array.from(new Set(ordemAbas));
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= uniqueOrder.length) return;

    const temp = uniqueOrder[index];
    uniqueOrder[index] = uniqueOrder[targetIndex];
    uniqueOrder[targetIndex] = temp;
    setOrdemAbas(uniqueOrder);
  };

  const handleResetDefaults = () => {
    const defaultDisplay: TabDisplayConfig = {
      abaPrincipalId: 'inventario',
      abasFixadas: ['inventario', 'reservas'],
      ordemAbas: ALL_SYSTEM_TABS.map(t => t.id),
      abasOcultas: [],
      nomesAbas: {},
    };
    setAbaPrincipalId(defaultDisplay.abaPrincipalId);
    setAbasFixadas(defaultDisplay.abasFixadas);
    setOrdemAbas(defaultDisplay.ordemAbas || []);
    setAbasOcultas(defaultDisplay.abasOcultas || []);
    setNomesAbas({});

    const updatedConfig: EmpresaConfig = {
      ...empresaConfig,
      tabDisplay: defaultDisplay,
    };
    onSaveConfig(updatedConfig);
    localStorage.setItem('locadora_tab_config', JSON.stringify(defaultDisplay));

    setSaveSuccessMessage('Configurações de abas restauradas para os padrões originais do sistema.');
    setTimeout(() => setSaveSuccessMessage(null), 4000);
  };

  const handleSave = () => {
    const uniqueOrder = Array.from(new Set(ordemAbas)) as string[];
    const uniquePinned = Array.from(new Set(abasFixadas)) as string[];
    const uniqueHidden = Array.from(new Set(abasOcultas)) as string[];

    const updatedDisplay: TabDisplayConfig = {
      abaPrincipalId,
      abasFixadas: uniquePinned,
      ordemAbas: uniqueOrder,
      abasOcultas: uniqueHidden,
      nomesAbas,
    };

    const updatedConfig: EmpresaConfig = {
      ...empresaConfig,
      tabDisplay: updatedDisplay,
    };

    onSaveConfig(updatedConfig);
    localStorage.setItem('locadora_tab_config', JSON.stringify(updatedDisplay));

    const mainTabObj = ALL_SYSTEM_TABS.find(t => t.id === abaPrincipalId);
    const mainTabLabel = nomesAbas[abaPrincipalId] || mainTabObj?.label || abaPrincipalId;
    setSaveSuccessMessage(`Preferências salvas com sucesso! A aba principal agora é "${mainTabLabel}".`);
    setTimeout(() => setSaveSuccessMessage(null), 4000);
  };

  const [portalTarget, setPortalTarget] = useState<HTMLElement | null>(null);

  useEffect(() => {
    setPortalTarget(document.getElementById('subtab-header-actions'));
  }, []);

  // Strictly deduplicated ordered tabs
  const uniqueIds = Array.from(new Set(ordemAbas));
  const orderedTabObjects = uniqueIds
    .map(id => ALL_SYSTEM_TABS.find(t => t.id === id))
    .filter(Boolean) as typeof ALL_SYSTEM_TABS;

  ALL_SYSTEM_TABS.forEach(t => {
    if (!orderedTabObjects.some(o => o.id === t.id)) {
      orderedTabObjects.push(t);
    }
  });

  const actionsButtons = (
    <>
      <button
        type="button"
        onClick={handleResetDefaults}
        className="flex-1 md:flex-none px-4 py-2.5 bg-[#18181B] hover:bg-[#27272A] border border-[#27272A] text-[#A1A1AA] hover:text-white text-xs font-semibold rounded-2xl transition-all flex items-center justify-center gap-2 cursor-pointer"
      >
        <RotateCcw size={14} />
        <span>Restaurar Padrão</span>
      </button>
      <button
        type="button"
        onClick={handleSave}
        className="flex-1 md:flex-none px-5 py-2.5 bg-[#D4AF37] hover:bg-[#E5C158] text-black text-xs font-extrabold rounded-2xl transition-all shadow-lg shadow-[#D4AF37]/10 flex items-center justify-center gap-2 cursor-pointer"
      >
        <Save size={15} />
        <span>Salvar Alterações</span>
      </button>
    </>
  );

  return (
    <div className="space-y-8 pb-12 max-w-5xl mx-auto">
      {portalTarget ? (
        createPortal(actionsButtons, portalTarget)
      ) : (
        <div className="bg-[#111113] border border-[#27272A] rounded-3xl p-6 shadow-xl relative overflow-hidden">
          <div className="absolute top-0 right-0 w-96 h-96 bg-[#D4AF37]/5 rounded-full blur-3xl pointer-events-none" />
          
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 relative z-10">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <div className="p-2.5 bg-[#D4AF37]/10 border border-[#D4AF37]/20 rounded-2xl text-[#D4AF37]">
                  <Layers size={22} />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
                    Personalização de Abas & Tela Principal
                  </h2>
                  <p className="text-xs text-[#A1A1AA] mt-0.5">
                    Escolha qual aba deve abrir por padrão ao iniciar o app, fixe os módulos prioritários e personalize a barra de navegação em tempo real.
                  </p>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3 w-full md:w-auto">
              {actionsButtons}
            </div>
          </div>

          {saveSuccessMessage && (
            <div className="mt-4 p-3 bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs rounded-xl flex items-center gap-2 animate-fadeIn font-medium">
              <CheckCircle2 size={16} className="shrink-0" />
              <span>{saveSuccessMessage}</span>
            </div>
          )}
        </div>
      )}

      {portalTarget && saveSuccessMessage && (
        <div className="p-3.5 bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs rounded-2xl flex items-center gap-2 animate-fadeIn font-medium">
          <CheckCircle2 size={16} className="shrink-0" />
          <span>{saveSuccessMessage}</span>
        </div>
      )}

      {/* Main Configuration Content Grid */}
      <div className="space-y-6">
        
        {/* Section 2: Reordenação e Visibilidade das Abas */}
        <div className="bg-[#111113] border border-[#27272A] rounded-3xl p-6 shadow-xl space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2 font-mono">
                <Pin size={16} className="text-[#D4AF37]" /> Fixação, Ordem e Visibilidade dos Atalhos
              </h3>
              <p className="text-xs text-[#A1A1AA] mt-1">
                Customize totalmente a barra de navegação superior. Fixe módulos, defina o menu principal diretamente ou oculte abas que não deseja exibir.
              </p>
            </div>
            <div className="flex items-center gap-4 text-xs font-mono font-bold">
              <span className="text-[#D4AF37]">
                {abasFixadas.length} {abasFixadas.length === 1 ? 'fixada' : 'fixadas'}
              </span>
              {abasOcultas.length > 0 && (
                <span className="text-red-400">
                  {abasOcultas.length} {abasOcultas.length === 1 ? 'oculta' : 'ocultas'}
                </span>
              )}
            </div>
          </div>

          <div className="space-y-2.5 pt-2">
            {orderedTabObjects.map((tab, idx) => {
              const Icon = tab.icon;
              const isPinned = abasFixadas.includes(tab.id);
              const isMain = tab.id === abaPrincipalId;
              const isHidden = abasOcultas.includes(tab.id);

              return (
                <div
                  key={tab.id}
                  className={`p-3.5 border rounded-2xl flex flex-col md:flex-row md:items-center justify-between gap-3.5 transition-all ${
                    isHidden 
                      ? 'bg-[#18181B]/40 border-red-950/20 opacity-75' 
                      : 'bg-[#18181B] border-[#27272A] hover:border-[#3F3F46]'
                  }`}
                >
                  <div className="flex items-center gap-3.5">
                    <div className="flex flex-col gap-0.5">
                      <button
                        type="button"
                        onClick={() => handleMoveTab(idx, 'up')}
                        disabled={idx === 0}
                        className="p-1 text-[#71717A] hover:text-white disabled:opacity-20 transition-all cursor-pointer"
                        title="Mover para cima"
                      >
                        <ArrowUp size={12} />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleMoveTab(idx, 'down')}
                        disabled={idx === orderedTabObjects.length - 1}
                        className="p-1 text-[#71717A] hover:text-white disabled:opacity-20 transition-all cursor-pointer"
                        title="Mover para baixo"
                      >
                        <ArrowDown size={12} />
                      </button>
                    </div>

                    <div className={`p-2.5 rounded-xl ${isHidden ? 'bg-red-500/10 text-red-400' : isPinned ? 'bg-[#D4AF37]/20 text-[#D4AF37]' : 'bg-[#27272A] text-[#71717A]'}`}>
                      <Icon size={18} />
                    </div>

                    <div className="flex-1 min-w-[200px]">
                      <div className="flex items-center gap-2 flex-wrap">
                        <div className="relative group/edit flex items-center">
                          <input
                            type="text"
                            value={nomesAbas[tab.id] !== undefined ? nomesAbas[tab.id] : tab.label}
                            onChange={(e) => {
                              setNomesAbas({
                                ...nomesAbas,
                                [tab.id]: e.target.value,
                              });
                            }}
                            placeholder={tab.label}
                            className="bg-[#111113] border border-[#27272A] focus:border-[#D4AF37]/50 focus:ring-1 focus:ring-[#D4AF37]/30 text-xs font-bold text-white px-2.5 py-1.5 rounded-xl outline-none w-44 transition-all pr-8"
                            title="Clique para renomear esta aba"
                          />
                          <Edit3 size={11} className="absolute right-2.5 text-[#71717A] group-hover/edit:text-[#D4AF37] transition-colors pointer-events-none" />
                        </div>
                        {isMain && (
                          <span className="px-2 py-0.5 bg-[#D4AF37]/15 border border-[#D4AF37]/40 text-[#D4AF37] text-[9px] font-bold rounded-full font-mono">
                            HOME
                          </span>
                        )}
                        {isPinned && !isHidden && (
                          <span className="px-2 py-0.5 bg-amber-500/15 border border-amber-500/30 text-amber-400 text-[9px] font-bold rounded-full font-mono flex items-center gap-1">
                            <Pin size={9} className="fill-amber-400" /> FIXADA
                          </span>
                        )}
                        {isHidden && (
                          <span className="px-2 py-0.5 bg-red-500/15 border border-red-500/30 text-red-400 text-[9px] font-bold rounded-full font-mono flex items-center gap-1">
                            <EyeOff size={9} /> OCULTA
                          </span>
                        )}
                      </div>
                      <span className="text-[11px] text-[#A1A1AA] block mt-1.5 pl-1">
                        {tab.desc}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 flex-wrap md:flex-nowrap">
                    {/* Definir Principal Button */}
                    <button
                      type="button"
                      onClick={() => handleSetAbaPrincipal(tab.id)}
                      disabled={isMain}
                      className={`px-3 py-2 rounded-xl border text-xs font-semibold transition-all flex items-center gap-1.5 cursor-pointer ${
                        isMain
                          ? 'bg-[#D4AF37]/15 border-[#D4AF37]/40 text-[#D4AF37] cursor-default'
                          : 'bg-[#27272A] border-[#3F3F46] text-[#A1A1AA] hover:text-white hover:border-[#3F3F46]'
                      }`}
                      title={isMain ? "Este é o menu principal" : "Definir este como menu principal (Home)"}
                    >
                      <Home size={14} className={isMain ? 'text-[#D4AF37]' : ''} />
                      <span>{isMain ? 'Menu Principal' : 'Tornar Principal'}</span>
                    </button>

                    {/* Toggle Pin Button */}
                    <button
                      type="button"
                      onClick={() => handleTogglePin(tab.id)}
                      disabled={isHidden}
                      className={`px-3 py-2 rounded-xl border text-xs font-semibold transition-all flex items-center gap-1.5 cursor-pointer ${
                        isHidden
                          ? 'bg-[#18181B] border-[#27272A] text-[#3F3F46] cursor-not-allowed'
                          : isPinned
                          ? 'bg-[#D4AF37]/10 border-[#D4AF37]/40 text-[#D4AF37] hover:bg-[#D4AF37]/20'
                          : 'bg-[#27272A] border-[#3F3F46] text-[#A1A1AA] hover:text-white'
                      }`}
                      title={isHidden ? "Abas ocultas não podem ser fixadas" : isPinned ? "Desfixar do menu" : "Fixar no menu"}
                    >
                      <Pin size={14} className={isPinned ? 'fill-[#D4AF37]' : ''} />
                      <span>{isPinned ? 'Fixada' : 'Fixar'}</span>
                    </button>

                    {/* Hide/Show Button */}
                    <button
                      type="button"
                      onClick={() => handleToggleHide(tab.id)}
                      className={`px-3 py-2 rounded-xl border text-xs font-semibold transition-all flex items-center gap-1.5 cursor-pointer ${
                        isHidden
                          ? 'bg-red-500/10 border-red-500/40 text-red-400 hover:bg-red-500/20'
                          : 'bg-[#27272A] border-[#3F3F46] text-[#A1A1AA] hover:text-white'
                      }`}
                      title={isHidden ? "Exibir aba novamente" : "Ocultar esta aba no menu"}
                    >
                      {isHidden ? <EyeOff size={14} /> : <Eye size={14} />}
                      <span>{isHidden ? 'Oculta' : 'Ocultar'}</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

      </div>
    </div>
  );
};
