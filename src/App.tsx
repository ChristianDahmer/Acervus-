import { useEffect, useState, useRef, lazy, Suspense } from 'react';
import { Cliente, FormularioWeb, ItemAcervo, ReservaComItens, StatusCicloVenda, StatusReserva, EmpresaConfig, ThemeConfig, GoogleAccountConfig, CategoriaItem, TransacaoFinanceira, RegistroManutencao, DispositivoAutorizado, ModeloContrato } from './types';
import { INITIAL_CLIENTES, INITIAL_ITENS, INITIAL_RESERVAS, INITIAL_EMPRESA_CONFIG, INITIAL_THEME_CONFIG, INITIAL_CATEGORIAS, INITIAL_FINANCE_TRANSACTIONS, INITIAL_MAINTENANCE_LOGS, INITIAL_MODELOS_CONTRATO } from './data/initialData';
import { applyThemeToDocument } from './utils/themeUtils';
import { Navbar } from './components/Navbar';
import { Check, Loader2, AlertTriangle, Sparkles } from 'lucide-react';
import { 
  fetchCollection, 
  saveDocument, 
  deleteDocument, 
  saveConfig, 
  getConfig, 
  seedDatabaseIfEmpty,
  saveLocalCollection,
  getLocalCollection,
  getTenantCollectionName,
  getActiveTenantId
} from './lib/firebaseSync';
import { onSnapshot, collection } from 'firebase/firestore';
import { db } from './lib/firebase';
import { getAppLogoUrl, handleLogoError } from './utils/logoUtils';
import { ViewSkeleton } from './components/ViewSkeleton';

// Code-Splitting & Lazy Loading de Telas para Carregamento e Troca Sub-50ms
const InventarioView = lazy(() => import('./components/InventarioView').then(m => ({ default: m.InventarioView })));
const ReservasView = lazy(() => import('./components/ReservasView').then(m => ({ default: m.ReservasView })));
const ClientesView = lazy(() => import('./components/ClientesView').then(m => ({ default: m.ClientesView })));
const EmpresaConfigView = lazy(() => import('./components/EmpresaConfigView').then(m => ({ default: m.EmpresaConfigView })));
const FinanceiroView = lazy(() => import('./components/FinanceiroView').then(m => ({ default: m.FinanceiroView })));
const ManutencaoView = lazy(() => import('./components/ManutencaoView').then(m => ({ default: m.ManutencaoView })));
const RelatoriosView = lazy(() => import('./components/RelatoriosView').then(m => ({ default: m.RelatoriosView })));
const PropostaOrcamentoView = lazy(() => import('./components/PropostaOrcamentoView').then(m => ({ default: m.PropostaOrcamentoView })));
const LockScreen = lazy(() => import('./components/LockScreen').then(m => ({ default: m.LockScreen })));
const NovaReservaModal = lazy(() => import('./components/NovaReservaModal').then(m => ({ default: m.NovaReservaModal })));
const ContratoPdfModal = lazy(() => import('./components/ContratoPdfModal').then(m => ({ default: m.ContratoPdfModal })));
const WhatsAppModal = lazy(() => import('./components/WhatsAppModal').then(m => ({ default: m.WhatsAppModal })));
const WebFormModal = lazy(() => import('./components/WebFormModal').then(m => ({ default: m.WebFormModal })));
const WorkManagerSimModal = lazy(() => import('./components/WorkManagerSimModal').then(m => ({ default: m.WorkManagerSimModal })));
const AiAssistantDrawer = lazy(() => import('./components/AiAssistantDrawer').then(m => ({ default: m.AiAssistantDrawer })));

export default function App() {
  const [activeTab, setActiveTab] = useState<string>('inventario');
  const [empresaSubTab, setEmpresaSubTab] = useState<'empresa' | 'categorias' | 'whatsapp' | 'tema' | 'google_forms' | 'govbr' | 'permissoes' | 'dispositivos' | 'sincronizacao' | 'developer' | 'instagram_sorteio'>('empresa');
  const [isNewClientWelcome, setIsNewClientWelcome] = useState<boolean>(false);
  const [urlPropostaId, setUrlPropostaId] = useState<string | null>(null);

  // Extract public proposal ID from URL on mount
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const hashPart = window.location.hash.includes('?') ? window.location.hash.split('?')[1] : window.location.hash;
    const hashParams = new URLSearchParams(hashPart.replace(/^#/, ''));
    
    let pId = params.get('proposta') || params.get('propostaId') || params.get('orc') ||
              hashParams.get('proposta') || hashParams.get('propostaId') || hashParams.get('orc') ||
              hashParams.get('id');

    if (!pId) {
      const match = window.location.href.match(/[?&#](proposta|propostaId|orc|id)=([^&#]+)/i);
      if (match && match[2]) {
        pId = decodeURIComponent(match[2]);
      }
    }

    if (pId) {
      console.log('[Android Client Router] Detectada proposta de orçamento pública no link:', pId);
      setUrlPropostaId(pId.trim());
    }
  }, []);

  // State
  const [isLoading, setIsLoading] = useState(true);
  const [loadingStep, setLoadingStep] = useState<string>('Inicializando os serviços do Acervus...');
  const [loadingProgress, setLoadingProgress] = useState<number>(5);
  const [loadingLogs, setLoadingLogs] = useState<string[]>([]);
  const [currentLog, setCurrentLog] = useState<string>('[Kernel] Inicializando serviços do Acervus...');
  const [empresaConfig, setEmpresaConfig] = useState<EmpresaConfig>(INITIAL_EMPRESA_CONFIG);
  const [themeConfig, setThemeConfig] = useState<ThemeConfig>(INITIAL_THEME_CONFIG);
  const [itens, setItens] = useState<ItemAcervo[]>([]);
  const [categorias, setCategorias] = useState<CategoriaItem[]>([]);
  const [modelosContratos, setModelosContratos] = useState<ModeloContrato[]>([]);
  const [dispositivos, setDispositivos] = useState<DispositivoAutorizado[]>([]);
  const [authenticatedDevice, setAuthenticatedDevice] = useState<DispositivoAutorizado | null>(() => {
    try {
      const saved = localStorage.getItem('locadora_authenticated_device');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed && parsed.status === 'APROVADO') {
          return parsed;
        }
      }
    } catch (e) {
      console.warn('Error reading saved session:', e);
    }
    return null;
  });
  const tenantId = getActiveTenantId();

  const [hasLoadingErrors, setHasLoadingErrors] = useState<boolean>(false);
  const [showDiagnosticPanel, setShowDiagnosticPanel] = useState<boolean>(false);
  const [isWipedState, setIsWipedState] = useState(() => localStorage.getItem('locadora_wiped_state') === 'true');

  // Lazy & On-Demand Module Load Status (Fase 2)
  const [lazyLoadStatus, setLazyLoadStatus] = useState<Record<string, 'PENDING' | 'LOADING' | 'SUCCESS' | 'ERROR'>>({
    clientes: 'PENDING',
    reservas: 'PENDING',
    transacoes: 'PENDING',
    manutencoes: 'PENDING',
    webForms: 'PENDING',
    modelosContratos: 'PENDING',
  });

  const dynamicSubscriptions = useRef<Record<string, () => void>>({});

  // Global Android-inspired Button Tactile Feedback, Ripple wave generation, and Processing animations
  useEffect(() => {
    const handleButtonClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      // Find the nearest button or element acting as a button
      const button = target.closest('button, [role="button"]') as HTMLElement;
      
      if (!button || button.hasAttribute('disabled') || button.classList.contains('pointer-events-none')) {
        return;
      }

      // 1. MATERIAL DESIGN EXPANDING RIPPLE EFFECT
      const rect = button.getBoundingClientRect();
      const ripple = document.createElement('span');
      
      const size = Math.max(rect.width, rect.height);
      const x = e.clientX - rect.left - size / 2;
      const y = e.clientY - rect.top - size / 2;
      
      ripple.style.width = `${size}px`;
      ripple.style.height = `${size}px`;
      ripple.style.left = `${x}px`;
      ripple.style.top = `${y}px`;
      
      // Determine if the button has a light color background so we use a darker ripple wave
      let isLightBg = false;
      try {
        const computedBg = window.getComputedStyle(button).backgroundColor;
        if (computedBg && computedBg.startsWith('rgb')) {
          const rgbValues = computedBg.match(/\d+/g);
          if (rgbValues && rgbValues.length >= 3) {
            const r = parseInt(rgbValues[0], 10);
            const g = parseInt(rgbValues[1], 10);
            const b = parseInt(rgbValues[2], 10);
            // YIQ brightness formula
            const brightness = (r * 299 + g * 587 + b * 114) / 1000;
            if (brightness > 180) {
              isLightBg = true;
            }
          }
        }
      } catch (err) {
        console.warn('[Tactile Buttons] Falha ao calcular contraste do botão:', err);
      }
      
      ripple.className = isLightBg ? 'android-ripple android-ripple-dark' : 'android-ripple';
      
      // Ensure absolute positioning is parent-constrained
      const originalPosition = button.style.position;
      const originalOverflow = button.style.overflow;
      
      button.style.setProperty('position', 'relative', 'important');
      button.style.setProperty('overflow', 'hidden', 'important');
      
      button.appendChild(ripple);
      
      // Remove ripple element after its animation finishes
      setTimeout(() => {
        ripple.remove();
        // Restore styling if they weren't overwritten
        if (button.style.position === 'relative') button.style.position = originalPosition;
        if (button.style.overflow === 'hidden') button.style.overflow = originalOverflow;
      }, 550);

      // 2. DETECT & ANIMATE ACTION PROCESSING BUTTONS
      const text = (button.innerText || '').toLowerCase().trim();
      const isSubmit = button.getAttribute('type') === 'submit';
      const isPrimary = 
        button.classList.contains('bg-[#D4AF37]') || 
        button.classList.contains('bg-[#d4af37]') ||
        button.classList.contains('hover:bg-[#D4AF37]') ||
        button.classList.contains('hover:bg-[#d4af37]');
        
      const isActionKeyword = 
        text.includes('salvar') ||
        text.includes('enviar') ||
        text.includes('gerar') ||
        text.includes('confirmar') ||
        text.includes('simular') ||
        text.includes('criar') ||
        text.includes('gravar') ||
        text.includes('excluir') ||
        text.includes('deletar') ||
        text.includes('imprimir') ||
        text.includes('adicionar');

      // Only apply if it's a processing action and not already animating
      if ((isSubmit || isPrimary || isActionKeyword) && 
          !button.querySelector('.button-processing-bar') && 
          !button.querySelector('.button-processing-overlay')) {
        
        // Temporarily ignore pointer clicks to prevent multiple fast double-clicks
        button.style.pointerEvents = 'none';
        
        // Show indeterminate linear loading bar at the bottom edge of the button
        const progressBar = document.createElement('div');
        progressBar.className = 'button-processing-bar';
        button.appendChild(progressBar);
        
        // For larger action buttons, show a full high-fidelity loading spinner overlay
        let overlay: HTMLDivElement | null = null;
        if (rect.width > 120 && rect.height > 35) {
          overlay = document.createElement('div');
          overlay.className = 'button-processing-overlay';
          overlay.innerHTML = `
            <svg class="animate-spin h-3.5 w-3.5 text-[#D4AF37]" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
              <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            <span class="text-[10px] font-mono tracking-widest font-semibold">PROCESSANDO...</span>
          `;
          button.appendChild(overlay);
        }

        // Clean up progress and overlay animations after action finishes or 1.2s timeout
        setTimeout(() => {
          if (progressBar) progressBar.remove();
          if (overlay) overlay.remove();
          button.style.pointerEvents = '';
        }, 1200);
      }
    };

    document.addEventListener('click', handleButtonClick);
    return () => {
      document.removeEventListener('click', handleButtonClick);
    };
  }, []);


  // Load from Firebase (Fase 1 - Crítico / Bootloader Imediato)
  useEffect(() => {
    // Absolute global safety timer to guarantee bootloader completion (Max 3.5s)
    const globalSafetyTimer = setTimeout(() => {
      console.warn('[Android Bootloader] Timeout global de inicialização (3.5s). Desativando splash screen com fallback.');
      setIsLoading(false);
    }, 3500);

    async function loadData() {
      const startTime = Date.now();
      try {
        setIsLoading(true);
        setLoadingStep('Estabelecendo conexão segura com Google Cloud...');
        setLoadingProgress(5);
        setLoadingLogs(['[System Engine] Inicializando o kernel do Acervus...']);

        // Helper to push system logs
        const addSystemLog = (msg: string, percent: number) => {
          const formattedMsg = `[System Engine] ${msg}`;
          setCurrentLog(formattedMsg);
          setLoadingLogs((prev) => [...prev, formattedMsg]);
          setLoadingProgress((prev) => Math.min(100, Math.max(prev, percent)));
        };

        // 1. Run seed check with strict timeout (Fail-Safe 2000ms)
        const seedStart = Date.now();
        try {
          const seedTimeout = new Promise<never>((_, reject) =>
            setTimeout(() => reject(new Error('Timeout na verificação do seed (2000ms)')), 2000)
          );
          await Promise.race([seedDatabaseIfEmpty(), seedTimeout]);
          const seedTime = Date.now() - seedStart;
          addSystemLog(`Banco Firestore verificado em ${seedTime}ms`, 15);
        } catch (seedErr) {
          console.warn('Seed check failed or timed out, operating with local fallback:', seedErr);
          setHasLoadingErrors(true);
          addSystemLog('Timeout de sincronização do seed remoto. Ativando cache offline.', 15);
        }

        // Check if database was explicitly wiped (use both local storage and database indicators for maximum resilience)
        let isWiped = localStorage.getItem('locadora_wiped_state') === 'true';
        try {
          const seedStatus = await getConfig<{ done?: boolean; wiped?: boolean }>('seeded', { done: false });
          isWiped = isWiped || seedStatus?.wiped === true;
        } catch (e) {
          console.warn('Error reading seeded config:', e);
        }
        setIsWipedState(isWiped);
        if (isWiped) {
          setItens([]);
          setCategorias([]);
          setClientes([]);
          setReservas([]);
          setTransacoes([]);
          setManutencoes([]);
          setWebForms([]);
          setModelosContratos([]);
          addSystemLog('Base de dados limpa (Modo Wipe ativo).', 18);
        }

        // 2. Resilient Phase 1 loaders (Only 5 critical datasets required for immediate boot)
        let completedCount = 0;
        const totalParallelTasks = 5;
        
        const updateTaskProgress = (taskName: string, duration: number, itemsCount?: number) => {
          completedCount++;
          const currentProgress = 15 + Math.floor((completedCount / totalParallelTasks) * 80);
          const countStr = itemsCount !== undefined ? ` (${itemsCount} registros)` : '';
          const logMsg = `[Fase 1] ${taskName} carregado com sucesso${countStr} em ${duration}ms`;
          
          setLoadingStep(`Sincronizado: ${taskName}${countStr}`);
          setLoadingProgress(currentProgress);
          setCurrentLog(logMsg);
          setLoadingLogs((prev) => [...prev, logMsg]);
        };

        // Standardized resilient worker wrapper
        const runResilientTask = async (
          taskName: string,
          fetchFn: () => Promise<void>,
          fallbackFn: () => void,
          timeoutMs: number = 2500
        ) => {
          const tStart = Date.now();
          const timeoutPromise = new Promise<never>((_, reject) =>
            setTimeout(() => reject(new Error(`Timeout (${timeoutMs}ms)`)), timeoutMs)
          );

          try {
            await Promise.race([fetchFn(), timeoutPromise]);
            updateTaskProgress(taskName, Date.now() - tStart);
          } catch (err: any) {
            console.warn(`[Fail-Safe Android Engine] Falha ao carregar ${taskName}:`, err);
            setHasLoadingErrors(true);
            
            const errMsg = err?.message || String(err);
            setLoadingLogs((prev) => [
              ...prev,
              `[FALHA FASE 1] ${taskName}: ${errMsg.substring(0, 45)}...`
            ]);
            
            fallbackFn();
            updateTaskProgress(`${taskName} (Offline Fallback)`, Date.now() - tStart);
          }
        };

        // Setup Phase 1 tasks
        const task1 = runResilientTask(
          'Configurações da Empresa',
          async () => {
            const data = await getConfig<EmpresaConfig>('empresaConfig', INITIAL_EMPRESA_CONFIG);
            if (data) {
              data.logoUrl = getAppLogoUrl(data.logoUrl);
            }
            setEmpresaConfig(data);
          },
          () => setEmpresaConfig(INITIAL_EMPRESA_CONFIG)
        );

        const task2 = runResilientTask(
          'Diretivas de Tema Visual',
          async () => {
            const data = await getConfig<ThemeConfig>('themeConfig', INITIAL_THEME_CONFIG);
            setThemeConfig(data);
          },
          () => setThemeConfig(INITIAL_THEME_CONFIG)
        );

        const task3 = runResilientTask(
          'Catálogo de Equipamentos',
          async () => {
            const data = await fetchCollection<ItemAcervo>('itens');
            setItens(data);
          },
          () => {
            setItens([]);
          }
        );

        const task4 = runResilientTask(
          'Categorias de Itens',
          async () => {
            const data = await fetchCollection<CategoriaItem>('categorias');
            setCategorias(data);
          },
          () => {
            setCategorias([]);
          }
        );

        const task11 = runResilientTask(
          'Terminais de Segurança MDM',
          async () => {
            const data = await fetchCollection<DispositivoAutorizado>('dispositivos_autorizados');
            setDispositivos(data);
            
            // Session authentication check on device lists
            const deviceUuid = localStorage.getItem('locadora_device_uuid');
            if (deviceUuid) {
              const matchedDevice = data.find((d) => d.id === deviceUuid);
              if (matchedDevice && matchedDevice.status === 'APROVADO') {
                setAuthenticatedDevice(matchedDevice);
                localStorage.setItem('locadora_authenticated_device', JSON.stringify(matchedDevice));
              }
            } else {
              const saved = localStorage.getItem('locadora_authenticated_device');
              if (saved) {
                try {
                  const parsed = JSON.parse(saved);
                  if (parsed && parsed.status === 'APROVADO') {
                    setAuthenticatedDevice(parsed);
                  }
                } catch (e) {}
              }
            }
          },
          () => {
            // Offline fallback: keep existing session if saved
            const saved = localStorage.getItem('locadora_authenticated_device');
            if (saved) {
              try {
                const parsed = JSON.parse(saved);
                if (parsed && parsed.status === 'APROVADO') {
                  setAuthenticatedDevice(parsed);
                  return;
                }
              } catch (e) {}
            }
          }
        );

        const task12 = runResilientTask(
          'Propostas e Formulários Web',
          async () => {
            const data = await fetchCollection<FormularioWeb>('webForms');
            setWebForms(data);
          },
          () => {
            setWebForms(getLocalCollection<FormularioWeb>('webForms'));
          }
        );

        // Wait for Phase 1 parallel tasks (completed instantly)
        await Promise.all([task1, task2, task3, task4, task11, task12]);

        const totalTime = Date.now() - startTime;
        setLoadingStep('Kernel pronto!');
        setLoadingProgress(100);
        setLoadingLogs((prev) => [
          ...prev,
          `[System] Inicialização do Kernel (Fase 1) concluída em ${totalTime}ms.`
        ]);

        await new Promise((resolve) => setTimeout(resolve, 150));
      } catch (err) {
        console.error('Fatal crash on loader loop:', err);
      } finally {
        clearTimeout(globalSafetyTimer);
        setIsLoading(false);
      }
    }
    loadData();
    return () => clearTimeout(globalSafetyTimer);
  }, [tenantId]);

  // Optimization: Preload lazy view chunks in idle background time for instant sub-50ms tab switching
  useEffect(() => {
    if (!isLoading) {
      const preloadViews = () => {
        import('./components/ReservasView');
        import('./components/ClientesView');
        import('./components/EmpresaConfigView');
        import('./components/FinanceiroView');
        import('./components/ManutencaoView');
        import('./components/RelatoriosView');
      };
      if ('requestIdleCallback' in window) {
        (window as any).requestIdleCallback(preloadViews);
      } else {
        setTimeout(preloadViews, 500);
      }
    }
  }, [isLoading]);

  // Enterprise real-time reactive sync engine (Android WorkManager/LiveSync style)
  useEffect(() => {
    // Avoid setting up listeners if simulated error/offline state is active
    if (localStorage.getItem('dev_simulated_error') === 'true') {
      console.warn('[Real-Time Sync] Modo de erro simulado ativo. Listeners em tempo real pausados.');
      return;
    }

    console.log('[Real-Time Sync] Ativando ouvintes essenciais em tempo real...');

    const unsubscribers: (() => void)[] = [];

    // Helper to generic subscribe
    const subscribeCollection = <T,>(
      colName: string,
      setState: (items: T[]) => void,
      sortFn?: (a: T, b: T) => number,
      onDataLoaded?: () => void
    ) => {
      try {
        const colRef = collection(db, getTenantCollectionName(colName));
        const unsub = onSnapshot(
          colRef,
          (snapshot) => {
            const items: T[] = [];
            snapshot.forEach((docSnap) => {
              items.push({ ...docSnap.data() } as T);
            });

            if (items.length > 0 || isWipedState) {
              if (sortFn) {
                items.sort(sortFn);
              }
              setState(items);
              saveLocalCollection(colName, items);
              if (onDataLoaded) {
                onDataLoaded();
              }
            }
          },
          (error) => {
            console.warn(`[Real-Time Sync] Erro no listener da coleção ${colName}:`, error);
          }
        );
        unsubscribers.push(unsub);
      } catch (err) {
        console.error(`[Real-Time Sync] Falha ao iniciar listener para ${colName}:`, err);
      }
    };

    // 1. Synchronize Inventory items in real-time
    subscribeCollection<ItemAcervo>('itens', setItens);

    // 2. Synchronize Categories
    subscribeCollection<CategoriaItem>('categorias', setCategorias);

    // 3. Synchronize Authorized MDM Devices
    subscribeCollection<DispositivoAutorizado>('dispositivos_autorizados', setDispositivos);

    // 10. Synchronize System Configurations (empresaConfig and themeConfig)
    try {
      const configColRef = collection(db, 'system_configs');
      const unsubConfig = onSnapshot(configColRef, (snapshot) => {
        snapshot.forEach((docSnap) => {
          if (docSnap.id === `empresaConfig_${tenantId}`) {
            const data = docSnap.data() as EmpresaConfig;
            if (data) {
              data.logoUrl = getAppLogoUrl(data.logoUrl);
            }
            setEmpresaConfig(data);
            localStorage.setItem(`offline_config_empresaConfig_${tenantId}`, JSON.stringify(data));
          } else if (docSnap.id === `themeConfig_${tenantId}`) {
            const data = docSnap.data() as ThemeConfig;
            setThemeConfig(data);
            localStorage.setItem(`offline_config_themeConfig_${tenantId}`, JSON.stringify(data));
          }
        });
      });
      unsubscribers.push(unsubConfig);
    } catch (err) {
      console.error('[Real-Time Sync] Falha ao iniciar listener para system_configs:', err);
    }

    // Unsubscribe all on unmount
    return () => {
      console.log('[Real-Time Sync] Desativando ouvintes essenciais em tempo real (unmount)...');
      unsubscribers.forEach((unsub) => unsub());
    };
  }, [isWipedState, tenantId]);

  // Clean up dynamic subscriptions on unmount
  useEffect(() => {
    return () => {
      console.log('[Dynamic Real-Time Sync] Desativando todas as subscrições dinâmicas...');
      Object.values(dynamicSubscriptions.current).forEach((unsub: any) => unsub());
    };
  }, []);

  // Segmented On-Demand / Lazy Module Loader (Fase 2)
  const triggerLoadModule = async (moduleKey: string) => {
    // Only fetch if pending
    if (lazyLoadStatus[moduleKey] !== 'PENDING') return;

    setLazyLoadStatus((prev) => ({ ...prev, [moduleKey]: 'LOADING' }));
    
    try {
      const colName = 
        moduleKey === 'transacoes' ? 'transacoes' :
        moduleKey === 'manutencoes' ? 'manutencoes' :
        moduleKey === 'modelosContratos' ? 'modelosContratos' :
        moduleKey; // 'clientes', 'reservas', 'webForms'

      const colRef = collection(db, getTenantCollectionName(colName));
      
      const p = new Promise<void>((resolve, reject) => {
        let isFirstSnapshot = true;
        const unsub = onSnapshot(
          colRef,
          (snapshot) => {
            const items: any[] = [];
            snapshot.forEach((docSnap) => {
              items.push({ ...docSnap.data() });
            });

            if (items.length > 0 || isWipedState) {
              if (moduleKey === 'reservas') {
                items.sort((a, b) => b.reserva.dataRetirada - a.reserva.dataRetirada);
                setReservas(items);
              } else if (moduleKey === 'transacoes') {
                items.sort((a, b) => b.data - a.data);
                setTransacoes(items);
              } else if (moduleKey === 'manutencoes') {
                items.sort((a, b) => b.data - a.data);
                setManutencoes(items);
              } else if (moduleKey === 'webForms') {
                items.sort((a, b) => b.criadoEm - a.criadoEm);
                setWebForms(items);
              } else if (moduleKey === 'clientes') {
                setClientes(items);
              } else if (moduleKey === 'modelosContratos') {
                setModelosContratos(items);
              }

              saveLocalCollection(colName, items);
            }

            if (isFirstSnapshot) {
              isFirstSnapshot = false;
              resolve();
            }
          },
          (error) => {
            console.warn(`[Dynamic Real-Time Sync] Erro no listener da coleção ${colName}:`, error);
            if (isFirstSnapshot) {
              isFirstSnapshot = false;
              reject(error);
            }
          }
        );

        // Store dynamic unsubscribe
        dynamicSubscriptions.current[moduleKey] = unsub;
      });

      const timeoutPromise = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('Timeout de rede (3000ms)')), 3000)
      );

      await Promise.race([p, timeoutPromise]);
      setLazyLoadStatus((prev) => ({ ...prev, [moduleKey]: 'SUCCESS' }));
    } catch (err) {
      console.warn(`[Fail-Safe Lazy Loader] Falha ao iniciar subscrição em tempo real para ${moduleKey}. Ativando cache local fallback:`, err);
      
      // Load offline fallback from cache
      const colName = 
        moduleKey === 'transacoes' ? 'transacoes' :
        moduleKey === 'manutencoes' ? 'manutencoes' :
        moduleKey === 'modelosContratos' ? 'modelosContratos' :
        moduleKey;
        
      const cached = getLocalCollection<any>(colName);
      if (moduleKey === 'clientes') setClientes(cached);
      else if (moduleKey === 'reservas') setReservas(cached);
      else if (moduleKey === 'transacoes') setTransacoes(cached);
      else if (moduleKey === 'manutencoes') setManutencoes(cached);
      else if (moduleKey === 'webForms') setWebForms(cached);
      else if (moduleKey === 'modelosContratos') setModelosContratos(cached);

      setLazyLoadStatus((prev) => ({ ...prev, [moduleKey]: 'ERROR' }));
    }
  };

  // Effect to trigger modules as they are requested/accessed by user interaction (On-Demand Loading)
  useEffect(() => {
    if (activeTab === 'clientes') {
      triggerLoadModule('clientes');
    } else if (activeTab === 'reservas') {
      triggerLoadModule('reservas');
      triggerLoadModule('clientes'); // Reservas view uses Clientes details
    } else if (activeTab === 'financeiro') {
      triggerLoadModule('transacoes');
      triggerLoadModule('reservas'); // Finance view references reservations
    } else if (activeTab === 'manutencao') {
      triggerLoadModule('manutencoes');
    } else if (activeTab === 'relatorios') {
      triggerLoadModule('reservas');
      triggerLoadModule('clientes');
      triggerLoadModule('transacoes');
      triggerLoadModule('webForms');
      triggerLoadModule('modelosContratos');
    }
  }, [activeTab]);

  const handleRefreshAllData = async () => {
    try {
      let isWiped = localStorage.getItem('locadora_wiped_state') === 'true';
      try {
        const seedStatus = await getConfig<{ done?: boolean; wiped?: boolean }>('seeded', { done: false });
        isWiped = isWiped || seedStatus?.wiped === true;
      } catch (e) {}
      setIsWipedState(isWiped);

      const loadedItens = await fetchCollection<ItemAcervo>('itens');
      setItens(loadedItens);

      const loadedCategorias = await fetchCollection<CategoriaItem>('categorias');
      setCategorias(loadedCategorias);

      const loadedClientes = await fetchCollection<Cliente>('clientes');
      setClientes(loadedClientes);

      const loadedReservas = await fetchCollection<ReservaComItens>('reservas');
      setReservas(loadedReservas);

      const loadedWebForms = await fetchCollection<FormularioWeb>('webForms');
      setWebForms(loadedWebForms);

      const loadedDispositivos = await fetchCollection<DispositivoAutorizado>('dispositivos_autorizados');
      setDispositivos(loadedDispositivos);

      const loadedTransacoes = await fetchCollection<TransacaoFinanceira>('transacoes');
      setTransacoes(loadedTransacoes);

      const loadedManutencoes = await fetchCollection<RegistroManutencao>('manutencoes');
      setManutencoes(loadedManutencoes);

      const loadedModelosContratos = await fetchCollection<ModeloContrato>('modelosContratos');
      setModelosContratos(loadedModelosContratos);

      setLazyLoadStatus({
        clientes: 'SUCCESS',
        reservas: 'SUCCESS',
        transacoes: 'SUCCESS',
        manutencoes: 'SUCCESS',
        webForms: 'SUCCESS',
        modelosContratos: 'SUCCESS',
      });
    } catch (err) {
      console.error('Error refreshing developer database data:', err);
    }
  };

  // Category Handlers
  const handleSaveCategoria = (categoria: CategoriaItem) => {
    setCategorias((prev) => {
      const exists = prev.some((c) => c.id === categoria.id);
      if (exists) {
        return prev.map((c) => (c.id === categoria.id ? categoria : c));
      }
      return [...prev, categoria];
    });
    saveDocument('categorias', categoria.id, categoria);
  };

  const handleDeleteCategoria = (id: string) => {
    setCategorias((prev) => prev.filter((c) => c.id !== id));
    deleteDocument('categorias', id);
  };

  // Modelos de Contrato Handlers
  const handleSaveModeloContrato = (modelo: ModeloContrato) => {
    setModelosContratos((prev) => {
      const exists = prev.some((m) => m.id === modelo.id);
      if (exists) {
        return prev.map((m) => (m.id === modelo.id ? modelo : m));
      }
      return [modelo, ...prev];
    });
    saveDocument('modelosContratos', modelo.id, modelo);
  };

  const handleDeleteModeloContrato = (id: string) => {
    setModelosContratos((prev) => prev.filter((m) => m.id !== id));
    deleteDocument('modelosContratos', id);
  };

  const handleLogoff = () => {
    localStorage.removeItem('locadora_device_uuid');
    localStorage.removeItem('locadora_authenticated_device');
    localStorage.removeItem('locadora_active_url_tenant');
    setAuthenticatedDevice(null);
  };

  const handleUpdateItemCategoria = (oldName: string, newName: string) => {
    setItens((prev) => {
      const updated = prev.map((item) => {
        if (item.categoria === oldName) {
          const u = { ...item, categoria: newName };
          saveDocument('itens', u.id, u);
          return u;
        }
        return item;
      });
      return updated;
    });
  };

  const handleBatchRemapCategory = (sourceName: string, targetName: string) => {
    setItens((prev) => {
      const updated = prev.map((item) => {
        if (item.categoria === sourceName) {
          const u = { ...item, categoria: targetName };
          saveDocument('itens', u.id, u);
          return u;
        }
        return item;
      });
      return updated;
    });
  };

  useEffect(() => {
    applyThemeToDocument(themeConfig);
  }, [themeConfig]);

  useEffect(() => {
    const isDevModeActive = localStorage.getItem('modo_desenvolvedor') === 'true';
    if (!isDevModeActive) {
      if (activeTab === 'architecture' || activeTab === 'workmanager') {
        setActiveTab('inventario');
      }
      if (['sincronizacao', 'developer'].includes(empresaSubTab)) {
        setEmpresaSubTab('empresa');
      }
    }
  }, [activeTab, empresaSubTab]);

  useEffect(() => {
    if (isLoading) {
      const timer = setTimeout(() => {
        setShowDiagnosticPanel(true);
      }, 3500);
      return () => clearTimeout(timer);
    }
  }, [isLoading]);

  // Google Account & Workspace OAuth State
  const [googleAccount, setGoogleAccount] = useState<GoogleAccountConfig>({
    isConnected: true,
    email: 'locadora.borafestar@gmail.com',
    displayName: 'Bora Festar Locações (Drive)',
    photoUrl: 'https://lh3.googleusercontent.com/a/default-user',
    driveFolderId: '1drive_folder_borafestar_2026',
    scopesGranted: [
      'https://www.googleapis.com/auth/drive.file',
      'https://www.googleapis.com/auth/forms.body',
    ],
    connectedAt: Date.now() - 1000 * 60 * 60 * 24 * 7,
  });

  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [reservas, setReservas] = useState<ReservaComItens[]>([]);
  const [transacoes, setTransacoes] = useState<TransacaoFinanceira[]>([]);
  const [manutencoes, setManutencoes] = useState<RegistroManutencao[]>([]);

  const [webForms, setWebForms] = useState<FormularioWeb[]>([]);
  const [selectedClienteForWebForm, setSelectedClienteForWebForm] = useState<Cliente | null>(null);

  // Reset lazy load statuses and arrays when tenantId changes to prevent data bleed
  useEffect(() => {
    setLazyLoadStatus({
      clientes: 'PENDING',
      reservas: 'PENDING',
      transacoes: 'PENDING',
      manutencoes: 'PENDING',
      webForms: 'PENDING',
      modelosContratos: 'PENDING',
    });
    setClientes([]);
    setReservas([]);
    setTransacoes([]);
    setManutencoes([]);
  }, [tenantId]);

  const handleSelectClienteForWebForm = (cliente: Cliente) => {
    setSelectedClienteForWebForm(cliente);
    setActiveTab('inventario');
  };

  // Modal States
  const [isNovaReservaOpen, setIsNovaReservaOpen] = useState(false);
  const [isAiAssistantOpen, setIsAiAssistantOpen] = useState(false);
  const [contratoPdfReserva, setContratoPdfReserva] = useState<ReservaComItens | null>(null);
  const [whatsAppReserva, setWhatsAppReserva] = useState<ReservaComItens | null>(null);
  const [whatsAppClienteDirect, setWhatsAppClienteDirect] = useState<{ cliente: Cliente; text: string } | null>(null);

  useEffect(() => {
    if (isNovaReservaOpen) {
      triggerLoadModule('clientes');
    }
  }, [isNovaReservaOpen]);

  useEffect(() => {
    if (contratoPdfReserva || whatsAppReserva) {
      triggerLoadModule('modelosContratos');
    }
  }, [contratoPdfReserva, whatsAppReserva]);

  // Inventario Handlers
  const handleAddItem = (newItem: Omit<ItemAcervo, 'id'>) => {
    const nextId = Math.max(...itens.map((i) => i.id), 0) + 1;
    const addedItem = { ...newItem, id: nextId };
    setItens([...itens, addedItem]);
    saveDocument('itens', nextId, addedItem);
  };

  const handleEditItem = (updatedItem: ItemAcervo) => {
    setItens(itens.map((i) => (i.id === updatedItem.id ? updatedItem : i)));
    saveDocument('itens', updatedItem.id, updatedItem);
  };

  const handleDeleteItem = (id: number) => {
    setItens(itens.filter((i) => i.id !== id));
    deleteDocument('itens', id);
  };

  // Finance Handlers
  const handleAddTransacao = (newTrans: Omit<TransacaoFinanceira, 'id'>) => {
    const nextIdNum = Math.max(...transacoes.map((t) => {
      const match = t.id.match(/\d+/);
      return match ? parseInt(match[0]) : 0;
    }), 1000) + 1;
    const nextId = `TX-${nextIdNum}`;
    const txObj = { ...newTrans, id: nextId };
    setTransacoes((prev) => [txObj, ...prev]);
    saveDocument('transacoes', nextId, txObj);
  };

  const handleUpdateTransacaoStatus = (id: string, status: 'PAGO' | 'PENDENTE') => {
    setTransacoes((prev) => prev.map((t) => {
      if (t.id === id) {
        const u = { ...t, status };
        saveDocument('transacoes', id, u);
        return u;
      }
      return t;
    }));
  };

  const handleDeleteTransacao = (id: string) => {
    setTransacoes((prev) => prev.filter((t) => t.id !== id));
    deleteDocument('transacoes', id);
  };

  // Maintenance Handlers
  const handleUpdateItemMaintenance = (updatedItem: ItemAcervo) => {
    setItens((prev) => prev.map((i) => (i.id === updatedItem.id ? updatedItem : i)));
    saveDocument('itens', updatedItem.id, updatedItem);
  };

  const handleAddMaintenanceLog = (newLog: Omit<RegistroManutencao, 'id'>, autoLogFinance: boolean) => {
    const nextLogNum = Math.max(...manutencoes.map((m) => {
      const match = m.id.match(/\d+/);
      return match ? parseInt(match[0]) : 0;
    }), 0) + 1;
    const nextLogId = `M-${nextLogNum}`;
    const logWithId: RegistroManutencao = { ...newLog, id: nextLogId };
    
    setManutencoes((prev) => [logWithId, ...prev]);
    saveDocument('manutencoes', nextLogId, logWithId);

    // Integrate with finance automatically!
    if (autoLogFinance && newLog.custo > 0) {
      const itemObj = itens.find(i => i.id === newLog.itemId);
      handleAddTransacao({
        tipo: 'DESPESA',
        categoria: 'Manutenção de Itens',
        valor: newLog.custo,
        data: newLog.data,
        descricao: `Manutenção (${newLog.tipo}) - ${itemObj ? itemObj.nome : `Item #${newLog.itemId}`}`,
        referenciaId: String(newLog.itemId),
        status: 'PAGO'
      });
    }
  };

  const handleRemoveMaintenanceLog = (id: string) => {
    setManutencoes((prev) => prev.filter((m) => m.id !== id));
    deleteDocument('manutencoes', id);
  };

  // Clientes Handlers
  const handleAddCliente = (newCliente: Omit<Cliente, 'id'>) => {
    const nextId = Math.max(...clientes.map((c) => c.id), 0) + 1;
    const added = { ...newCliente, id: nextId, ativo: true };
    setClientes([...clientes, added]);
    saveDocument('clientes', nextId, added);
  };

  const handleUpdateCliente = (updatedCliente: Cliente) => {
    setClientes((prev) => prev.map((c) => (c.id === updatedCliente.id ? updatedCliente : c)));
    saveDocument('clientes', updatedCliente.id, updatedCliente);
  };

  const handleToggleClienteStatus = (id: number, ativo: boolean) => {
    setClientes((prev) =>
      prev.map((c) => {
        if (c.id === id) {
          const updated = { ...c, ativo };
          saveDocument('clientes', id, updated);
          return updated;
        }
        return c;
      })
    );
  };

  const handleAddClientesBatch = (newClientes: Omit<Cliente, 'id'>[]) => {
    let currentId = Math.max(...clientes.map((c) => c.id), 0);
    const addedList: Cliente[] = [];
    newClientes.forEach((nc) => {
      currentId += 1;
      const added = { ...nc, id: currentId, ativo: true };
      addedList.push(added);
      saveDocument('clientes', currentId, added);
    });
    setClientes((prev) => [...prev, ...addedList]);
  };

  // Reserva Creation Handler (Atomic Stock decrement)
  const handleSaveReserva = (reservaData: {
    clienteId?: number;
    itemIds: number[];
    dataRetirada: number;
    dataDevolucao: number;
    status: StatusReserva;
    manualCliente?: { nome: string; telefone: string };
  }) => {
    let finalClienteId = reservaData.clienteId || 0;
    let clienteObj: Cliente;

    if (reservaData.manualCliente && reservaData.manualCliente.nome.trim()) {
      const nextClientId = Math.max(...clientes.map((c) => c.id), 100) + 1;
      clienteObj = {
        id: nextClientId,
        nome: reservaData.manualCliente.nome.trim(),
        telefone: reservaData.manualCliente.telefone.trim() || '(00) 00000-0000',
        email: '',
        cpfCnpj: '',
        endereco: '',
        ativo: true,
      };
      setClientes((prev) => [clienteObj, ...prev]);
      saveDocument('clientes', nextClientId, clienteObj);
      finalClienteId = nextClientId;
    } else {
      clienteObj = clientes.find((c) => c.id === finalClienteId) || clientes[0];
    }

    const itemsObj = itens.filter((i) => reservaData.itemIds.includes(i.id));

    const diffTime = Math.max(0, reservaData.dataDevolucao - reservaData.dataRetirada);
    const isSameDay = new Date(reservaData.dataRetirada).toDateString() === new Date(reservaData.dataDevolucao).toDateString();
    const diasReserva = isSameDay ? 1 : Math.max(1, Math.ceil(diffTime / (1000 * 60 * 60 * 24)));
    const valorTotal = itemsObj.reduce((acc, curr) => acc + curr.precoAluguel, 0) * diasReserva;

    const nextReservaId = Math.max(...reservas.map((r) => r.reserva.id), 1000) + 1;

    const newReservaComItens: ReservaComItens = {
      reserva: {
        id: nextReservaId,
        clienteId: finalClienteId,
        dataRetirada: reservaData.dataRetirada,
        dataDevolucao: reservaData.dataDevolucao,
        status: reservaData.status,
      },
      cliente: clienteObj,
      itens: itemsObj,
      valorTotal,
      diasReserva,
    };

    // Calculate stock decrements based on whether reserved items are regular items or Kits
    const stockDecrements: Record<number, number> = {};
    reservaData.itemIds.forEach((itemId) => {
      const item = itens.find((i) => i.id === itemId);
      if (!item) return;

      if (item.isKit && item.kitComponentes && item.kitComponentes.length > 0) {
        item.kitComponentes.forEach((comp) => {
          stockDecrements[comp.itemId] = (stockDecrements[comp.itemId] || 0) + comp.quantidade;
        });
      } else {
        stockDecrements[item.id] = (stockDecrements[item.id] || 0) + 1;
      }
    });

    // Decrement stock in state and database
    setItens((prevItens) =>
      prevItens.map((i) => {
        const decQty = stockDecrements[i.id];
        if (decQty && decQty > 0) {
          const updated = { ...i, quantidadeTotal: Math.max(0, i.quantidadeTotal - decQty) };
          saveDocument('itens', i.id, updated);
          return updated;
        }
        return i;
      })
    );

    setReservas([newReservaComItens, ...reservas]);
    saveDocument('reservas', nextReservaId, newReservaComItens);

    // Registrar lançamento financeiro integrado automaticamente
    handleAddTransacao({
      tipo: 'RECEITA',
      categoria: 'Aluguel de Acervo',
      valor: valorTotal,
      data: Date.now(),
      descricao: `Receita Reserva #${nextReservaId} - ${clienteObj.nome}`,
      referenciaId: String(nextReservaId),
      status: reservaData.status === StatusReserva.CONFIRMADA ? 'PAGO' : 'PENDENTE'
    });

    setIsNovaReservaOpen(false);
  };

  // Status update handler (Restores stock if canceled/returned & updates integrated financial + maintenance stats)
  const handleUpdateStatus = (reservaId: number, newStatus: StatusReserva) => {
    const target = reservas.find((r) => r.reserva.id === reservaId);
    if (!target) return;

    const oldStatus = target.reserva.status;

    // Check if status restores stock (transitions from active to CANCELADA or CONCLUIDA)
    const isRestoringStatus = (status: StatusReserva) => status === StatusReserva.CANCELADA || status === StatusReserva.CONCLUIDA;
    const wasRestoringStatus = (status: StatusReserva) => status === StatusReserva.CANCELADA || status === StatusReserva.CONCLUIDA;

    if (isRestoringStatus(newStatus) && !wasRestoringStatus(oldStatus)) {
      // Calculate stock increments based on whether reserved items are regular items or Kits
      const stockIncrements: Record<number, number> = {};
      target.itens.forEach((item) => {
        if (item.isKit && item.kitComponentes && item.kitComponentes.length > 0) {
          item.kitComponentes.forEach((comp) => {
            stockIncrements[comp.itemId] = (stockIncrements[comp.itemId] || 0) + comp.quantidade;
          });
        } else {
          stockIncrements[item.id] = (stockIncrements[item.id] || 0) + 1;
        }
      });

      // Increment stock in state and database
      setItens((prevItens) =>
        prevItens.map((i) => {
          const incQty = stockIncrements[i.id];
          if (incQty && incQty > 0) {
            const updated = { ...i, quantidadeTotal: i.quantidadeTotal + incQty };
            saveDocument('itens', i.id, updated);
            return updated;
          }
          return i;
        })
      );

      // Remove corresponding transaction from financial list IF canceled
      if (newStatus === StatusReserva.CANCELADA) {
        const txToDelete = transacoes.find((t) => t.referenciaId === String(reservaId));
        if (txToDelete) {
          deleteDocument('transacoes', txToDelete.id);
        }
        setTransacoes((prev) => prev.filter((t) => t.referenciaId !== String(reservaId)));
      }
    } 
    else if ((newStatus === StatusReserva.CONFIRMADA || newStatus === StatusReserva.CONCLUIDA) && oldStatus === StatusReserva.PENDENTE) {
      // Mark integrated transaction as PAGO
      setTransacoes((prev) => prev.map((t) => {
        if (t.referenciaId === String(reservaId)) {
          const u = { ...t, status: 'PAGO' as const };
          saveDocument('transacoes', t.id, u);
          return u;
        }
        return t;
      }));
    }

    // Dynamic Maintenance alerts triggered when a reservation is successfully CONCLUIDA (completed/returned)
    if (newStatus === StatusReserva.CONCLUIDA && oldStatus !== StatusReserva.CONCLUIDA) {
      // For maintenance, we track number of rentals of individual physical items
      const itemIdsInReserva: number[] = [];
      target.itens.forEach((item) => {
        if (item.isKit && item.kitComponentes && item.kitComponentes.length > 0) {
          item.kitComponentes.forEach((comp) => {
            itemIdsInReserva.push(comp.itemId);
          });
        } else {
          itemIdsInReserva.push(item.id);
        }
      });

      setItens((prev) =>
        prev.map((i) => {
          if (itemIdsInReserva.includes(i.id)) {
            const currentCount = (i.alugueisDesdeManutencao || 0) + 1;
            const limit = i.frequenciaAlugueisManutencao || 5;
            const nextStatus = currentCount >= limit ? 'ALERTA' : (i.statusManutencao || 'EM_DIA');
            const updated = {
              ...i,
              alugueisDesdeManutencao: currentCount,
              statusManutencao: nextStatus as any,
            };
            saveDocument('itens', i.id, updated);
            return updated;
          }
          return i;
        })
      );
    }

    const updatedReserva: ReservaComItens = {
      ...target,
      reserva: { ...target.reserva, status: newStatus },
    };

    setReservas(
      reservas.map((r) => {
        if (r.reserva.id === reservaId) {
          return updatedReserva;
        }
        return r;
      })
    );
    saveDocument('reservas', reservaId, updatedReserva);
  };

  // Web Form Generation
  const handleGenerateWebForm = (selectedItems: ItemAcervo[]) => {
    const nextFormId = `FORM-${Math.floor(1000 + Math.random() * 9000)}`;
    const defaultCalcao = empresaConfig?.painelConfiguracao?.percentualSinalPadrao ?? 50;
    const defaultValidade = empresaConfig?.painelConfiguracao?.validadeOrcamentoDias ?? 7;

    const newForm: FormularioWeb = {
      id: nextFormId,
      titulo: selectedClienteForWebForm
        ? `Orçamento para ${selectedClienteForWebForm.nome} #${nextFormId}`
        : `Orçamento Compartilhado #${nextFormId}`,
      clienteId: selectedClienteForWebForm?.id,
      clienteNome: selectedClienteForWebForm?.nome,
      percentualCalcao: defaultCalcao,
      validadeDias: defaultValidade,
      itens: selectedItems.map((i) => ({
        id: i.id,
        nome: i.nome,
        precoAluguel: i.precoAluguel,
        imageUrl: i.imageUrl,
      })),
      criadoEm: Date.now(),
      respondido: false,
    };

    setWebForms([newForm, ...webForms]);
    saveDocument('webForms', nextFormId, newForm);
    setSelectedClienteForWebForm(null);
    setEmpresaSubTab('google_forms');
    setActiveTab('webforms');
  };

  // Simulation of Customer Web Form Submit
  const handleCreateGoogleForm = (titulo: string, itemIds: number[], percentualCalcao?: number) => {
    const selectedItens = itens.filter((i) => itemIds.includes(i.id));
    const randomId = `FORM-${Math.floor(1000 + Math.random() * 9000)}`;
    const isGoogleFormsEnabled = empresaConfig?.habilitarGoogleForms !== false;
    const generatedDriveFileId = isGoogleFormsEnabled ? `1drive_file_${Math.random().toString(36).substring(2, 10)}` : undefined;
    const generatedFormUrl = isGoogleFormsEnabled ? `https://docs.google.com/forms/d/e/1FAIpQLSc_${randomId}_${generatedDriveFileId}/viewform` : undefined;

    const defaultCalcao = percentualCalcao !== undefined ? percentualCalcao : (empresaConfig?.painelConfiguracao?.percentualSinalPadrao ?? 50);
    const defaultValidade = empresaConfig?.painelConfiguracao?.validadeOrcamentoDias ?? 7;

    const newForm: FormularioWeb = {
      id: randomId,
      titulo,
      googleFormUrl: generatedFormUrl,
      googleDriveFileId: generatedDriveFileId,
      percentualCalcao: defaultCalcao,
      validadeDias: defaultValidade,
      itens: selectedItens.map((i) => ({
        id: i.id,
        nome: i.nome,
        precoAluguel: i.precoAluguel,
        imageUrl: i.imageUrl,
      })),
      criadoEm: Date.now(),
      respondido: false,
    };

    setWebForms((prev) => [newForm, ...prev]);
    saveDocument('webForms', randomId, newForm);
  };

  const handleDeleteWebForm = async (id: string) => {
    setWebForms((prev) => prev.filter((f) => f.id !== id));
    await deleteDocument('webForms', id);
  };

  const handleSimulateCustomerSubmit = (
    formId: string,
    clienteNome: string,
    clienteTelefone: string,
    itemIds: number[],
    dataRetirada: number,
    dataDevolucao: number
  ) => {
    // ALTERADO: A simulação de resposta do cliente agora chama a confirmação completa da proposta
    handleConfirmProposal(formId, clienteNome, clienteTelefone, itemIds, dataRetirada, dataDevolucao);
  };

  // Automated proposal acceptance & automatic reservation generator (Android Service-style)
  const handleConfirmProposal = async (
    formId: string,
    clienteNome: string,
    clienteTelefone: string,
    itemIds: number[],
    dataRetirada: number,
    dataDevolucao: number
  ) => {
    let tempClientes = [...clientes];
    let tempItens = [...itens];
    let tempReservas = [...reservas];

    // Se o cliente estiver na página de proposta pública, as coleções na memória podem estar vazias.
    // Buscamos remotamente para evitar duplicar clientes ou colidir IDs de reservas no Firestore.
    if (tempClientes.length === 0) {
      try {
        tempClientes = await fetchCollection<Cliente>('clientes');
      } catch (err) {
        console.warn('[handleConfirmProposal] Falha ao carregar clientes para prevenção de duplicidade:', err);
      }
    }
    if (tempReservas.length === 0) {
      try {
        tempReservas = await fetchCollection<ReservaComItens>('reservas');
      } catch (err) {
        console.warn('[handleConfirmProposal] Falha ao carregar reservas para geração de ID único:', err);
      }
    }
    if (tempItens.length === 0) {
      try {
        tempItens = await fetchCollection<ItemAcervo>('itens');
      } catch (err) {
        console.warn('[handleConfirmProposal] Falha ao carregar catálogo de itens:', err);
      }
    }

    // Find or create client record
    let clienteObj = tempClientes.find((c) => c.telefone === clienteTelefone || c.nome.toLowerCase() === clienteNome.toLowerCase());
    if (!clienteObj) {
      const nextClientId = Math.max(...tempClientes.map((c) => c.id), 0) + 1;
      clienteObj = {
        id: nextClientId,
        nome: clienteNome,
        telefone: clienteTelefone,
      };
      tempClientes.push(clienteObj);
      await saveDocument('clientes', nextClientId, clienteObj);
    }

    // Convert items into active reservation items and calculate final pricing
    let selectedItems = tempItens.filter((i) => itemIds.includes(i.id));
    if (selectedItems.length === 0 && tempItens.length > 0) {
      selectedItems = [tempItens[0]];
    }

    const diffTime = Math.max(0, dataDevolucao - dataRetirada);
    const diasReserva = Math.max(1, Math.ceil(diffTime / (1000 * 60 * 60 * 24)));
    const valorTotal = selectedItems.reduce((acc, curr) => acc + curr.precoAluguel, 0) * diasReserva;

    // NOVO: Cálculo do calção de garantia de reserva
    let existingForm = webForms.find((f) => f.id === formId);
    const percentualCalcao = existingForm?.percentualCalcao !== undefined ? existingForm.percentualCalcao : 30;
    const valorCalcaoCalculado = (valorTotal * percentualCalcao) / 100;

    const nextReservaId = Math.max(...tempReservas.map((r) => r.reserva.id), 1000) + 1;

    const newReserva: ReservaComItens = {
      reserva: {
        id: nextReservaId,
        clienteId: clienteObj.id,
        dataRetirada,
        dataDevolucao,
        status: StatusReserva.CONFIRMADA,
        origemPropostaId: formId,
        propostaAprovada: true,
        percentualCalcao,
        valorCalcao: valorCalcaoCalculado,
      },
      cliente: clienteObj,
      itens: selectedItems,
      valorTotal,
      diasReserva,
    };

    tempReservas = [newReserva, ...tempReservas];
    await saveDocument('reservas', nextReservaId, newReserva);

    // Decrement physical inventory stock
    tempItens = tempItens.map((i) => {
      if (itemIds.includes(i.id)) {
        const updated = { ...i, quantidadeTotal: Math.max(0, i.quantidadeTotal - 1) };
        saveDocument('itens', i.id, updated);
        return updated;
      }
      return i;
    });

    // NOVO: Atualiza e preserva a proposta no webForms como respondida e aprovada com calção
    if (!existingForm) {
      existingForm = {
        id: formId,
        titulo: `Orçamento #${formId}`,
        itens: selectedItems.map((i) => ({ id: i.id, nome: i.nome, precoAluguel: i.precoAluguel, imageUrl: i.imageUrl })),
        criadoEm: Date.now(),
        respondido: true,
        percentualCalcao,
      };
    }

    const finalForm: FormularioWeb = {
      ...existingForm,
      respondido: true,
      percentualCalcao,
      resposta: {
        clienteNome,
        clienteTelefone,
        itemIdsSelecionados: itemIds,
        dataRetirada,
        dataDevolucao,
        dataAssinatura: Date.now(),
        percentualCalcao,
        valorCalcaoCalculado,
      },
    };

    await saveDocument('webForms', formId, finalForm);

    const updatedWebForms = webForms.some((f) => f.id === formId)
      ? webForms.map((f) => (f.id === formId ? finalForm : f))
      : [finalForm, ...webForms];

    // NOVO: Registra transação financeira referente ao orçamento aprovado informando o calção de garantia
    const nextTxId = Date.now();
    const newTx = {
      id: nextTxId,
      tipo: 'RECEITA' as const,
      categoria: 'Aluguel de Acervo',
      valor: valorTotal,
      data: Date.now(),
      descricao: `Receita Orçamento/Proposta #${formId} - ${clienteObj.nome} (Calção: R$ ${valorCalcaoCalculado.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} - ${percentualCalcao}%)`,
      referenciaId: String(nextReservaId),
      status: 'PAGO' as const,
    };
    const tempTransacoes = [newTx, ...transacoes];
    await saveDocument('transacoes', nextTxId, newTx);
    setTransacoes(tempTransacoes);
    saveLocalCollection('transacoes', tempTransacoes);

    // Salvar coleções locais
    saveLocalCollection('clientes', tempClientes);
    saveLocalCollection('itens', tempItens);
    saveLocalCollection('reservas', tempReservas);
    saveLocalCollection('webForms', updatedWebForms);

    // Apply synchronized states to system
    setClientes(tempClientes);
    setItens(tempItens);
    setReservas(tempReservas);
    setWebForms(updatedWebForms);
  };

  const handleRejectProposal = async (formId: string, motivoRecusa: string) => {
    const updatedWebForms = webForms.map((f) => {
      if (f.id === formId) {
        const u = {
          ...f,
          recusado: true,
          motivoRecusa,
          dataRecusa: Date.now(),
        };
        saveDocument('webForms', formId, u);
        return u;
      }
      return f;
    });
    setWebForms(updatedWebForms);
  };

  const handleUpdateProposalText = async (formId: string, novoTexto: string) => {
    const updatedWebForms = webForms.map((f) => {
      if (f.id === formId) {
        const u = {
          ...f,
          observacao: novoTexto,
        };
        saveDocument('webForms', formId, u);
        return u;
      }
      return f;
    });
    setWebForms(updatedWebForms);
  };

  // WorkManager Background Sync Trigger (Converts web forms into real reservas)
  const handleTriggerWorkerSync = () => {
    const pendingForms = webForms.filter((f) => f.respondido && f.resposta);
    if (pendingForms.length === 0) return;

    let tempClientes = [...clientes];
    let tempItens = [...itens];
    let tempReservas = [...reservas];

    pendingForms.forEach((f) => {
      if (!f.resposta) return;

      // Find or create client
      let clienteObj = tempClientes.find((c) => c.telefone === f.resposta?.clienteTelefone);
      if (!clienteObj) {
        const nextClientId = Math.max(...tempClientes.map((c) => c.id), 0) + 1;
        clienteObj = {
          id: nextClientId,
          nome: f.resposta.clienteNome,
          telefone: f.resposta.clienteTelefone,
        };
        tempClientes.push(clienteObj);
        saveDocument('clientes', nextClientId, clienteObj);
      }

      // Convert items
      const selectedItems = tempItens.filter((i) => f.resposta?.itemIdsSelecionados.includes(i.id));
      const diffTime = Math.max(0, f.resposta.dataDevolucao - f.resposta.dataRetirada);
      const diasReserva = Math.max(1, Math.ceil(diffTime / (1000 * 60 * 60 * 24)));
      const valorTotal = selectedItems.reduce((acc, curr) => acc + curr.precoAluguel, 0) * diasReserva;

      const nextReservaId = Math.max(...tempReservas.map((r) => r.reserva.id), 1000) + 1;

      const newReserva: ReservaComItens = {
        reserva: {
          id: nextReservaId,
          clienteId: clienteObj.id,
          dataRetirada: f.resposta.dataRetirada,
          dataDevolucao: f.resposta.dataDevolucao,
          status: StatusReserva.CONFIRMADA,
        },
        cliente: clienteObj,
        itens: selectedItems,
        valorTotal,
        diasReserva,
      };

      tempReservas = [newReserva, ...tempReservas];
      saveDocument('reservas', nextReservaId, newReserva);

      // Decrement stock
      tempItens = tempItens.map((i) => {
        if (f.resposta?.itemIdsSelecionados.includes(i.id)) {
          const updated = { ...i, quantidadeTotal: Math.max(0, i.quantidadeTotal - 1) };
          saveDocument('itens', i.id, updated);
          return updated;
        }
        return i;
      });

      // Update form
      const updatedForm = { ...f, respondido: false, resposta: undefined };
      saveDocument('webForms', f.id, updatedForm);
    });

    setClientes(tempClientes);
    setItens(tempItens);
    setReservas(tempReservas);
    setWebForms(webForms.map((f) => ({ ...f, respondido: false, resposta: undefined })));
  };

  const handleSaveEmpresaConfig = (config: EmpresaConfig) => {
    setEmpresaConfig(config);
    saveConfig('empresaConfig', config);
  };

  const handleSaveThemeConfig = (config: ThemeConfig) => {
    setThemeConfig(config);
    saveConfig('themeConfig', config);
  };

  const handleUpdateDispositivoStatus = async (id: string, newStatus: 'PENDENTE' | 'APROVADO' | 'REJEITADO' | 'REVOGADO', extraData?: Partial<DispositivoAutorizado>) => {
    try {
      setDispositivos((prev) =>
        prev.map((d) => {
          if (d.id === id) {
            const updated = { ...d, status: newStatus, dataAtualizacao: Date.now(), ...extraData };
            saveDocument('dispositivos_autorizados', id, updated);
            return updated;
          }
          return d;
        })
      );
      // Re-evaluate current device session
      const deviceUuid = localStorage.getItem('locadora_device_uuid');
      if (deviceUuid === id) {
        if (newStatus !== 'APROVADO') {
          setAuthenticatedDevice(null);
        } else {
          const fresh = dispositivos.find(d => d.id === id);
          if (fresh) setAuthenticatedDevice({ ...fresh, status: 'APROVADO', ...extraData });
        }
      }
    } catch (err) {
      console.error('Error updating device status:', err);
    }
  };

  const handleDeleteDispositivo = async (id: string) => {
    try {
      setDispositivos((prev) => prev.filter((d) => d.id !== id));
      await deleteDocument('dispositivos_autorizados', id);
      const deviceUuid = localStorage.getItem('locadora_device_uuid');
      if (deviceUuid === id) {
        setAuthenticatedDevice(null);
      }
    } catch (err) {
      console.error('Error deleting device:', err);
    }
  };

  const handleRefreshDispositivos = async (): Promise<DispositivoAutorizado[]> => {
    try {
      const loaded = await fetchCollection<DispositivoAutorizado>('dispositivos_autorizados');
      setDispositivos(loaded);
      const deviceUuid = localStorage.getItem('locadora_device_uuid');
      if (deviceUuid) {
        const matched = loaded.find((d) => d.id === deviceUuid);
        if (matched) {
          if (matched.status === 'APROVADO') {
            setAuthenticatedDevice(matched);
          } else if (matched.status === 'REVOGADO' || matched.status === 'REJEITADO') {
            setAuthenticatedDevice(null);
          }
        }
      }
      return loaded;
    } catch (err) {
      console.warn('Network or offline simulation active during device refresh (using local fallback cache):', err);
      return dispositivos;
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#0A0A0B] text-[#E4E4E7] font-sans flex flex-col justify-center items-center p-6 select-none">
        <div className="w-full max-w-md bg-[#111113] border border-[#27272A] rounded-3xl p-8 shadow-2xl flex flex-col items-center space-y-6 relative overflow-hidden">
          
          {/* Top aesthetic linear accent */}
          <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-[#D4AF37]/50 via-[#D4AF37] to-[#D4AF37]/50" />

          {/* Core Acervus Branding */}
          <div className="flex flex-col items-center space-y-3 text-center">
            {!!getAppLogoUrl(empresaConfig?.logoUrl) && (
              <div className="w-24 h-24 sm:w-28 sm:h-28 flex items-center justify-center bg-transparent shrink-0">
                <img 
                  src={getAppLogoUrl(empresaConfig?.logoUrl)} 
                  alt={empresaConfig?.nomeFantasia || "Logo"} 
                  className="w-full h-full object-contain filter drop-shadow-lg" 
                  referrerPolicy="no-referrer" 
                  onError={handleLogoError}
                />
              </div>
            )}
            <div>
              <h1 className="font-serif italic text-2xl text-white animate-pulse">Acervus</h1>
              <p className="text-[10px] uppercase tracking-widest text-[#D4AF37] font-semibold mt-0.5">
                Inicialização & Sincronização
              </p>
            </div>
          </div>

          {/* Progress Bar & Percentage */}
          <div className="w-full space-y-2">
            <div className="flex justify-between items-center text-[11px] font-semibold tracking-wide">
              <span className="text-[#A1A1AA]">Progresso de Carregamento</span>
              <span className="text-[#D4AF37] font-mono text-xs">{loadingProgress}%</span>
            </div>
            
            <div className="w-full bg-[#18181B] border border-[#27272A] rounded-full h-2.5 overflow-hidden p-0.5">
              <div 
                className="bg-[#D4AF37] h-full transition-all duration-300 rounded-full" 
                style={{ width: `${loadingProgress}%` }}
              />
            </div>
          </div>

          {/* Simple Current Active Step Label */}
          <div className="w-full text-center space-y-1">
            <span className="text-xs text-[#D4AF37] font-semibold font-mono tracking-wide flex items-center justify-center gap-2">
              <Loader2 className="animate-spin text-[#D4AF37] shrink-0" size={14} />
              <span>{loadingStep}</span>
            </span>
          </div>

          {/* Bloco de Log de Inicialização (Mantido sem a label superior conforme solicitado) */}
          <div className="w-full py-1 text-center flex flex-col items-center justify-center gap-1.5">
            {/* ALTERADO: Label "Log de Inicialização" removido cirurgicamente mantendo o bloco visual abaixo */}
            <div className="inline-flex items-center justify-center gap-2 max-w-full bg-[#08080A] border border-[#27272A] px-4 py-2 rounded-xl text-xs font-mono text-[#D4AF37] shadow-lg transition-all duration-200">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shrink-0" />
              <span className="text-white font-medium truncate max-w-[280px] sm:max-w-[380px]">
                {currentLog || (loadingLogs.length > 0 ? loadingLogs[loadingLogs.length - 1] : loadingStep)}
              </span>
            </div>
          </div>

          <div className="text-[10px] text-[#71717A] font-medium max-w-xs text-center leading-normal">
            {localStorage.getItem('modo_desenvolvedor') === 'true'
              ? 'Sincronizando em tempo real com o Firestore do Google Cloud. Por favor, aguarde.'
              : 'Sincronizando seu acervo com a nuvem de forma segura. Por favor, aguarde.'}
          </div>

          {/* Recovery & Diagnostic Panel */}
          {showDiagnosticPanel && (
            <div className="w-full bg-[#18181B] border border-amber-500/20 rounded-2xl p-4 space-y-3 animate-fadeIn text-left">
              <div className="flex items-center gap-2 text-amber-400">
                <AlertTriangle size={15} className="shrink-0 animate-bounce" />
                <span className="text-[11px] font-bold uppercase tracking-wider font-mono">
                  {localStorage.getItem('modo_desenvolvedor') === 'true' 
                    ? 'Painel de Diagnóstico de Sincronização' 
                    : 'Aviso de Sincronização'}
                </span>
              </div>
              
              <p className="text-[10px] text-[#A1A1AA] leading-relaxed">
                {localStorage.getItem('modo_desenvolvedor') === 'true' ? (
                  hasLoadingErrors 
                    ? "Detectamos anomalias no carregamento das tabelas SQLite do Acervus. Isso pode ser causado por oscilações no Firebase ou falhas de rede simuladas de teste."
                    : "A sincronização está demorando mais do que o comum. Analise os logs do bootloader Android / Cloud acima para verificar a resposta do Firestore."
                ) : (
                  "A conexão com o servidor está levando um pouco mais de tempo que o esperado. Você pode tentar recarregar a página ou entrar no modo offline temporário."
                )}
              </p>

              {/* Status and quick fixes */}
              <div className="space-y-1.5 pt-1">
                {localStorage.getItem('modo_desenvolvedor') === 'true' ? (
                  <>
                    {(localStorage.getItem('dev_simulated_latency') || localStorage.getItem('dev_simulated_error') === 'true') ? (
                      <button
                        onClick={() => {
                          localStorage.removeItem('dev_simulated_latency');
                          localStorage.removeItem('dev_simulated_error');
                          setLoadingLogs((prev) => [...prev, '[System Engine] Bugs simulados removidos com sucesso. Reiniciando base...']);
                          setTimeout(() => window.location.reload(), 1000);
                        }}
                        className="w-full py-2 bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 text-amber-400 text-[10px] font-bold rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-sm"
                      >
                        <span>Desativar Injetores de Falhas & Recarregar</span>
                      </button>
                    ) : (
                      <div className="text-[9px] text-[#71717A] font-mono flex items-center justify-between pb-1">
                        <span>Injetor de Bugs:</span>
                        <span className="text-emerald-400 font-bold">INATIVO (Modo Normal)</span>
                      </div>
                    )}

                    <div className="grid grid-cols-2 gap-2">
                      <button
                        onClick={() => {
                          setLoadingLogs((prev) => [...prev, '[System Engine] Forçando boot em modo de contingência local...']);
                          setIsLoading(false);
                        }}
                        className="py-1.5 px-2 bg-[#27272A] hover:bg-[#3F3F46] border border-[#3F3F46] text-white text-[9px] font-bold rounded-lg transition-all flex items-center justify-center gap-1 cursor-pointer"
                      >
                        <span>Entrada Offline</span>
                      </button>

                      <button
                        onClick={() => {
                          localStorage.clear();
                          setLoadingLogs((prev) => [...prev, '[System Engine] Memória cache local apagada. Semeando banco do zero...']);
                          setTimeout(() => window.location.reload(), 1200);
                        }}
                        className="py-1.5 px-2 bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 text-red-400 text-[9px] font-bold rounded-lg transition-all flex items-center justify-center gap-1 cursor-pointer"
                      >
                        <span>Limpar Cache (Wipe)</span>
                      </button>
                    </div>
                  </>
                ) : (
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={() => setIsLoading(false)}
                      className="py-2 px-2 bg-[#D4AF37] hover:bg-[#E5C158] text-black text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-1 cursor-pointer"
                    >
                      <span>Entrar Offline</span>
                    </button>

                    <button
                      onClick={() => window.location.reload()}
                      className="py-2 px-2 bg-[#27272A] hover:bg-[#3F3F46] border border-[#3F3F46] text-white text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-1 cursor-pointer"
                    >
                      <span>Recarregar Tela</span>
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}

        </div>
      </div>
    );
  }

  if (urlPropostaId) {
    return (
      <Suspense fallback={<ViewSkeleton title="Proposta de Orçamento" />}>
        <PropostaOrcamentoView
          propostaId={urlPropostaId}
          webForms={webForms}
          itens={itens}
          empresaConfig={empresaConfig}
          themeConfig={themeConfig}
          onConfirmProposal={handleConfirmProposal}
          onRejectProposal={handleRejectProposal}
          onUpdateProposalText={handleUpdateProposalText}
        />
      </Suspense>
    );
  }

  if (!authenticatedDevice) {
    return (
      <Suspense fallback={<ViewSkeleton title="Autenticação" />}>
        <LockScreen
          empresaConfig={empresaConfig}
          onAuthenticated={(device, isNewClient) => {
            localStorage.setItem('locadora_device_uuid', device.id);
            localStorage.setItem('locadora_authenticated_device', JSON.stringify(device));
            setAuthenticatedDevice(device);
            setDispositivos((prev) => {
              const exists = prev.some((d) => d.id === device.id);
              if (exists) {
                return prev.map((d) => (d.id === device.id ? device : d));
              }
              return [...prev, device];
            });
            if (isNewClient) {
              setIsNewClientWelcome(true);
              setActiveTab('empresa');
              setEmpresaSubTab('empresa');
            }
          }}
          dispositivos={dispositivos}
          onRefreshDispositivos={handleRefreshDispositivos}
          onUpdateEmpresaConfig={(newCfg) => setEmpresaConfig(newCfg)}
        />
      </Suspense>
    );
  }

  return (
    <div className="min-h-screen bg-[#0A0A0B] text-[#E4E4E7] font-sans flex flex-col selection:bg-[#D4AF37]/30 selection:text-white">
      {/* Top Navbar */}
      <Navbar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        empresaSubTab={empresaSubTab}
        setEmpresaSubTab={setEmpresaSubTab}
        onOpenNovaReserva={() => setIsNovaReservaOpen(true)}
        onOpenAiAssistant={() => setIsAiAssistantOpen(true)}
        exibirGuiaArquitetura={themeConfig.exibirGuiaArquitetura}
        authenticatedDevice={authenticatedDevice}
        onLogoff={handleLogoff}
        themeConfig={themeConfig}
        empresaConfig={empresaConfig}
      />

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Suspense fallback={<ViewSkeleton />}>
          {activeTab === 'inventario' && (
            <InventarioView
              itens={itens}
              categorias={categorias}
              onAddItem={handleAddItem}
              onEditItem={handleEditItem}
              onDeleteItem={handleDeleteItem}
              onGenerateWebForm={handleGenerateWebForm}
              onSaveCategoria={handleSaveCategoria}
              onGoToCategorias={() => {
                setEmpresaSubTab('categorias');
                setActiveTab('empresa');
              }}
              selectedClienteForWebForm={selectedClienteForWebForm}
              onClearClienteForWebForm={() => setSelectedClienteForWebForm(null)}
              listVisibility={empresaConfig.listVisibility}
            />
          )}

          {activeTab === 'reservas' && (
            <ReservasView
              reservas={reservas}
              clientes={clientes}
              webForms={webForms}
              empresaConfig={empresaConfig}
              onUpdateStatus={handleUpdateStatus}
              onOpenNovaReserva={() => setIsNovaReservaOpen(true)}
              onOpenContratoPdf={(r) => setContratoPdfReserva(r)}
              onOpenWhatsApp={(r) => setWhatsAppReserva(r)}
              listVisibility={empresaConfig.listVisibility}
            />
          )}

          {activeTab === 'clientes' && (
            <ClientesView
              clientes={clientes}
              webForms={webForms}
              onAddCliente={handleAddCliente}
              onUpdateCliente={handleUpdateCliente}
              onToggleClienteStatus={handleToggleClienteStatus}
              onImportClientes={handleAddClientesBatch}
              onOpenWhatsApp={(cliente, text) => setWhatsAppClienteDirect({ cliente, text })}
              onSelectClienteForWebForm={handleSelectClienteForWebForm}
              onViewProposta={(propostaId) => setUrlPropostaId(propostaId)}
              listVisibility={empresaConfig.listVisibility}
            />
          )}

          {activeTab === 'relatorios' && (
            <RelatoriosView
              modelosContratos={modelosContratos}
              onSaveModelo={handleSaveModeloContrato}
              onDeleteModelo={handleDeleteModeloContrato}
              reservas={reservas}
              clientes={clientes}
              itens={itens}
              transacoes={transacoes}
              empresaConfig={empresaConfig}
              webForms={webForms}
              googleAccount={googleAccount}
              onCreateGoogleForm={handleCreateGoogleForm}
              onSimulateCustomerSubmit={handleSimulateCustomerSubmit}
            />
          )}

          {(activeTab === 'empresa' || activeTab === 'webforms') && (
            <EmpresaConfigView
              authenticatedDevice={authenticatedDevice}
              empresaConfig={empresaConfig}
              onSaveConfig={handleSaveEmpresaConfig}
              themeConfig={themeConfig}
              onSaveTheme={handleSaveThemeConfig}
              googleAccount={googleAccount}
              onUpdateGoogleAccount={setGoogleAccount}
              categorias={categorias}
              itens={itens}
              onSaveCategoria={handleSaveCategoria}
              onDeleteCategoria={handleDeleteCategoria}
              onUpdateItemCategoria={handleUpdateItemCategoria}
              onBatchRemapCategory={handleBatchRemapCategory}
              initialSubTab={activeTab === 'webforms' ? 'google_forms' : empresaSubTab}
              dispositivos={dispositivos}
              onUpdateDispositivoStatus={handleUpdateDispositivoStatus}
              onDeleteDispositivo={handleDeleteDispositivo}
              isNewClientWelcome={isNewClientWelcome}
              webForms={webForms}
              onDeleteWebForm={handleDeleteWebForm}
              onTriggerWorkerSync={handleTriggerWorkerSync}
              onNavigateToRelatorios={() => setActiveTab('relatorios')}
              clientes={clientes}
              reservas={reservas}
              onRefreshData={handleRefreshAllData}
              onCreateGoogleForm={handleCreateGoogleForm}
              onSimulateCustomerSubmit={handleSimulateCustomerSubmit}
            />
          )}

          {activeTab === 'workmanager' && (
            <EmpresaConfigView
              authenticatedDevice={authenticatedDevice}
              empresaConfig={empresaConfig}
              onSaveConfig={handleSaveEmpresaConfig}
              themeConfig={themeConfig}
              onSaveTheme={handleSaveThemeConfig}
              googleAccount={googleAccount}
              onUpdateGoogleAccount={setGoogleAccount}
              categorias={categorias}
              itens={itens}
              onSaveCategoria={handleSaveCategoria}
              onDeleteCategoria={handleDeleteCategoria}
              onUpdateItemCategoria={handleUpdateItemCategoria}
              onBatchRemapCategory={handleBatchRemapCategory}
              initialSubTab="sincronizacao"
              dispositivos={dispositivos}
              onUpdateDispositivoStatus={handleUpdateDispositivoStatus}
              onDeleteDispositivo={handleDeleteDispositivo}
              isNewClientWelcome={isNewClientWelcome}
              webForms={webForms}
              onTriggerWorkerSync={handleTriggerWorkerSync}
              clientes={clientes}
              reservas={reservas}
              onRefreshData={handleRefreshAllData}
            />
          )}

          {activeTab === 'architecture' && (
            <EmpresaConfigView
              authenticatedDevice={authenticatedDevice}
              empresaConfig={empresaConfig}
              onSaveConfig={handleSaveEmpresaConfig}
              themeConfig={themeConfig}
              onSaveTheme={handleSaveThemeConfig}
              googleAccount={googleAccount}
              onUpdateGoogleAccount={setGoogleAccount}
              categorias={categorias}
              itens={itens}
              onSaveCategoria={handleSaveCategoria}
              onDeleteCategoria={handleDeleteCategoria}
              onUpdateItemCategoria={handleUpdateItemCategoria}
              onBatchRemapCategory={handleBatchRemapCategory}
              dispositivos={dispositivos}
              onUpdateDispositivoStatus={handleUpdateDispositivoStatus}
              onDeleteDispositivo={handleDeleteDispositivo}
              isNewClientWelcome={isNewClientWelcome}
              webForms={webForms}
              onTriggerWorkerSync={handleTriggerWorkerSync}
              onNavigateToRelatorios={() => setActiveTab('relatorios')}
              clientes={clientes}
              reservas={reservas}
              onRefreshData={handleRefreshAllData}
            />
          )}

          {activeTab === 'financeiro' && (
            <FinanceiroView
              transacoes={transacoes}
              reservas={reservas}
              onAddTransacao={handleAddTransacao}
              onUpdateTransacaoStatus={handleUpdateTransacaoStatus}
              onDeleteTransacao={handleDeleteTransacao}
              empresaConfig={empresaConfig}
            />
          )}

          {activeTab === 'manutencao' && (
            <ManutencaoView
              itens={itens}
              onUpdateItemMaintenance={handleUpdateItemMaintenance}
              manutencoes={manutencoes}
              onAddMaintenanceLog={handleAddMaintenanceLog}
              onRemoveMaintenanceLog={handleRemoveMaintenanceLog}
            />
          )}
        </Suspense>
      </main>

      {/* Modals */}
      <Suspense fallback={null}>
        {isNovaReservaOpen && (
          <NovaReservaModal
            clientes={clientes}
            itens={itens}
            onClose={() => setIsNovaReservaOpen(false)}
            onSaveReserva={handleSaveReserva}
          />
        )}

        {contratoPdfReserva && (
          <ContratoPdfModal
            reservaComItens={contratoPdfReserva}
            empresaConfig={empresaConfig}
            onClose={() => setContratoPdfReserva(null)}
          />
        )}

        {whatsAppReserva && (
          <WhatsAppModal
            reservaComItens={whatsAppReserva}
            cliente={whatsAppReserva.cliente}
            empresaConfig={empresaConfig}
            onClose={() => setWhatsAppReserva(null)}
            onOpenTemplatesConfig={() => {
              setActiveTab('empresa');
              setEmpresaSubTab('whatsapp');
            }}
          />
        )}

        {whatsAppClienteDirect && (
          <WhatsAppModal
            cliente={whatsAppClienteDirect.cliente}
            initialStatus={StatusCicloVenda.ORCAMENTO_SOLICITADO}
            empresaConfig={empresaConfig}
            reservaComItens={
              reservas[0] || {
                reserva: { id: 999, clienteId: whatsAppClienteDirect.cliente.id, dataRetirada: Date.now(), dataDevolucao: Date.now() + 86400000 * 3, status: StatusReserva.CONFIRMADA },
                cliente: whatsAppClienteDirect.cliente,
                itens: [itens[0]],
                valorTotal: 750,
                diasReserva: 3,
              }
            }
            onClose={() => setWhatsAppClienteDirect(null)}
            onOpenTemplatesConfig={() => {
              setActiveTab('empresa');
              setEmpresaSubTab('whatsapp');
            }}
          />
        )}
      </Suspense>

      {/* Floating AI Widget Button */}
      {!isAiAssistantOpen && (
        <button
          onClick={() => setIsAiAssistantOpen(true)}
          className="fixed bottom-6 right-6 z-50 bg-gradient-to-br from-[#D4AF37] to-[#8B7326] hover:scale-105 text-black font-bold p-3.5 rounded-2xl shadow-2xl shadow-[#D4AF37]/30 border border-[#D4AF37] flex items-center gap-2.5 transition-all cursor-pointer group active:scale-95"
          title="Abrir Assistente IA Acervus"
        >
          <Sparkles size={20} className="animate-spin text-black" style={{ animationDuration: '6s' }} />
          <span className="hidden sm:inline text-xs uppercase tracking-wider font-extrabold font-mono">IA Assistente</span>
        </button>
      )}

      {/* AI Assistant Drawer */}
      <AiAssistantDrawer
        isOpen={isAiAssistantOpen}
        onClose={() => setIsAiAssistantOpen(false)}
        currentTab={activeTab}
        onNavigateTab={(tab) => {
          setActiveTab(tab);
          setIsAiAssistantOpen(false);
        }}
        onOpenNovaReserva={(clienteNome) => {
          setIsNovaReservaOpen(true);
          setIsAiAssistantOpen(false);
        }}
      />

      {/* Footer */}
      <footer className="border-t border-[#27272A] bg-[#0A0A0B] py-6 text-center text-xs text-[#71717A]">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row justify-between items-center gap-2">
          <span>Locadora Pro — Gestão Profissional de Aluguel de Decorações</span>
          <span className="font-mono text-[#D4AF37]/80">Acervo • Reservas • Contratos PDF • WhatsApp</span>
        </div>
      </footer>
    </div>
  );
}
