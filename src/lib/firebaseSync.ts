import { 
  INITIAL_CLIENTES, 
  INITIAL_ITENS, 
  INITIAL_RESERVAS, 
  INITIAL_EMPRESA_CONFIG, 
  INITIAL_THEME_CONFIG, 
  INITIAL_CATEGORIAS, 
  INITIAL_FINANCE_TRANSACTIONS, 
  INITIAL_MAINTENANCE_LOGS,
  INITIAL_MODELOS_CONTRATO 
} from '../data/initialData';
import { 
  Cliente, 
  ItemAcervo, 
  ReservaComItens, 
  CategoriaItem, 
  TransacaoFinanceira, 
  RegistroManutencao, 
  EmpresaConfig, 
  ThemeConfig,
  FormularioWeb,
  DispositivoAutorizado
} from '../types';

// Usuário Mestre Oficial com Gestão Plena Global e Acesso Total Cross-Tenant
export const MASTER_USER_ACERVUS: DispositivoAutorizado = {
  id: 'master-acervus-root',
  imei: 'MASTER-HARDWARE-ROOT-001',
  nomeDispositivo: 'Terminal Mestre Global (Acervus)',
  cnpjEmpresa: '00.000.000/0000-00',
  usuario: 'Acervus',
  email: 'admin@acervus.core',
  senha: 'Leonardo14012015',
  telefone: '(51) 99999-9999',
  status: 'APROVADO',
  nivelAcesso: 'DESENVOLVEDOR',
  isEmailVerified: true,
  isMasterSuperAdmin: true,
  dataSolicitacao: 1700000000000,
  dataAtualizacao: Date.now(),
  ultimoAcesso: Date.now(),
  permissoesModulos: [
    'inventario', 'reservas', 'clientes', 'financeiro', 
    'manutencao', 'relatorios', 'formularios_web', 'empresa', 
    'sorteios_instagram', 'plano_assinatura', 'controle_acesso', 
    'database_explorer', 'developer', 'guia_arquitetura'
  ]
};

// Verifica se um dispositivo ou usuário autenticado é o Administrador Mestre Acervus
export function isMasterUser(user?: DispositivoAutorizado | null): boolean {
  if (!user) return false;
  if (user.isMasterSuperAdmin) return true;
  const u = (user.usuario || '').trim().toLowerCase();
  const e = (user.email || '').trim().toLowerCase();
  return u === 'acervus' || u === 'master acervus' || u === 'acervus master' || e === 'admin@acervus.core' || user.nivelAcesso === 'DESENVOLVEDOR';
}

// Helper to determine the active Company/Tenant CNPJ
export function getActiveTenantId(): string {
  if (typeof window !== 'undefined') {
    // 1. If we are viewing a public budget proposal link containing a tenant parameter, use it!
    const params = new URLSearchParams(window.location.search);
    const hashPart = window.location.hash.includes('?') ? window.location.hash.split('?')[1] : '';
    const hashParams = new URLSearchParams(hashPart);
    const urlTenant = params.get('tenant') || params.get('tenantId') || hashParams.get('tenant') || hashParams.get('tenantId');
    if (urlTenant) {
      const sanitized = urlTenant.replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
      if (sanitized) {
        localStorage.setItem('locadora_active_url_tenant', sanitized);
        return sanitized;
      }
    }
    
    // 2. Prioritize the authenticated device's company CNPJ if logged in (EXCEPT for master users who have no tenant binding!)
    try {
      const saved = localStorage.getItem('locadora_authenticated_device');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed && isMasterUser(parsed)) {
          // Master user has no tenant binding - check if an explicit master selected tenant override exists
          const masterSelected = localStorage.getItem('locadora_master_selected_tenant');
          if (masterSelected && masterSelected !== 'GLOBAL') {
            return masterSelected;
          }
          return 'GLOBAL';
        }
        if (parsed && parsed.cnpjEmpresa) {
          const tenantId = parsed.cnpjEmpresa.replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
          if (tenantId && tenantId !== '00000000000000') {
            localStorage.setItem('locadora_last_active_tenant', tenantId);
            return tenantId;
          }
        }
      }
    } catch (e) {}

    // 2.5 Fallback to the last active authenticated tenant to prevent reverting to default/test mode on logoff
    try {
      const lastActive = localStorage.getItem('locadora_last_active_tenant');
      if (lastActive && lastActive !== '00000000000000') {
        const sanitized = lastActive.replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
        if (sanitized) {
          return sanitized;
        }
      }
    } catch (e) {}

    // 3. Fallback to cached URL tenant for unauthenticated guest views
    const cachedUrlTenant = localStorage.getItem('locadora_active_url_tenant');
    if (cachedUrlTenant) {
      return cachedUrlTenant;
    }
  }
  return 'default';
}

// Maps generic collection name to tenant-specific name
export function getTenantCollectionName(colName: string): string {
  if (colName === 'dispositivos_autorizados' || colName === 'system_configs' || colName === 'seeded') {
    return colName;
  }
  const tenantId = getActiveTenantId();
  return `empresa_${tenantId}_${colName}`;
}

// Helper for simulated latency and errors (Developer Test Panel)
async function delayAndErrorCheck(): Promise<boolean> {
  if (typeof window !== 'undefined' && window.location.search.includes('proposta=')) {
    return false;
  }

  const latency = localStorage.getItem('dev_simulated_latency');
  if (latency) {
    const delayMs = parseInt(latency, 10) || 0;
    if (delayMs > 0) {
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }
  }

  const throwError = localStorage.getItem('dev_simulated_error');
  if (throwError === 'true') {
    console.info('[Developer Simulated Error] Falha de escrita/leitura induzida para teste de resiliência offline.');
    return true; // simulated error active
  }
  return false;
}

// Local storage helpers for offline resilience (with tenant isolation and global cross-tenant aggregation)
export function getLocalCollection<T>(colName: string, overrideTenantId?: string): T[] {
  const tenantId = overrideTenantId || getActiveTenantId();
  
  if (tenantId === 'GLOBAL' || tenantId === 'ALL') {
    try {
      const aggregated: T[] = [];
      const seenIds = new Set<string>();
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith('offline_db_') && key.endsWith(`_${colName}`)) {
          try {
            const raw = localStorage.getItem(key);
            if (raw) {
              const list = JSON.parse(raw);
              if (Array.isArray(list)) {
                list.forEach((item: any) => {
                  const idKey = String(item?.id || item?.reserva?.id || Math.random());
                  if (!seenIds.has(idKey)) {
                    seenIds.add(idKey);
                    aggregated.push(item);
                  }
                });
              }
            }
          } catch (_) {}
        }
      }
      if (aggregated.length > 0) {
        return aggregated;
      }
    } catch (_) {}
  }

  try {
    const data = localStorage.getItem(`offline_db_${tenantId}_${colName}`);
    if (data) return JSON.parse(data);
  } catch (e) {
    console.info(`[Local Storage Cache] Error reading local ${colName}:`, e);
  }
  
  // Return initial defaults ONLY if system is explicitly configured in 'teste' mode and not wiped
  let isModoTeste = false;
  try {
    const rawConf = localStorage.getItem(`offline_config_empresaConfig_${tenantId}`) ||
                    localStorage.getItem(`offline_config_${tenantId}_empresaConfig`) ||
                    localStorage.getItem('offline_config_empresaConfig') ||
                    localStorage.getItem(`offline_config_empresa_config_${tenantId}`);
    if (rawConf) {
      const parsed = JSON.parse(rawConf);
      if (parsed && parsed.ambienteSistema === 'teste') {
        isModoTeste = true;
      } else if (parsed && parsed.ambienteSistema === 'producao') {
        isModoTeste = false;
      }
    } else {
      // Default fallback is production mode to ensure clean data isolation
      isModoTeste = false;
    }
  } catch (e) {}

  const isWiped = localStorage.getItem('locadora_wiped_state') === 'true' || localStorage.getItem(`locadora_wiped_state_${tenantId}`) === 'true';
  
  if (isModoTeste && !isWiped) {
    if (colName === 'clientes') return INITIAL_CLIENTES as unknown as T[];
    if (colName === 'itens') return INITIAL_ITENS as unknown as T[];
    if (colName === 'reservas') return INITIAL_RESERVAS as unknown as T[];
    if (colName === 'categorias') return INITIAL_CATEGORIAS as unknown as T[];
    if (colName === 'transacoes') return INITIAL_FINANCE_TRANSACTIONS as unknown as T[];
    if (colName === 'manutencoes') return INITIAL_MAINTENANCE_LOGS as unknown as T[];
    if (colName === 'modelosContratos') return INITIAL_MODELOS_CONTRATO as unknown as T[];
  }
  
  return [];
}

export function saveLocalCollection<T>(colName: string, items: T[], overrideTenantId?: string): void {
  const tenantId = overrideTenantId || getActiveTenantId();
  try {
    localStorage.setItem(`offline_db_${tenantId}_${colName}`, JSON.stringify(items));
  } catch (e) {
    console.info(`[Local Storage Cache] Error saving local ${colName}:`, e);
  }
}

// Load generic collection from PostgreSQL via backend proxy (supports cross-tenant global view)
export async function fetchCollection<T>(colName: string, overrideTenantId?: string): Promise<T[]> {
  const hasSimulatedError = await delayAndErrorCheck();
  if (hasSimulatedError) {
    console.info(`[Resiliência Offline] Retornando cache local para coleção ${colName} devido à falha simulada.`);
    return getLocalCollection<T>(colName, overrideTenantId);
  }

  const activeTenantId = getActiveTenantId();
  const tenantId = overrideTenantId || activeTenantId;
  if (tenantId !== 'default' && tenantId !== 'GLOBAL' && tenantId !== 'ALL') {
    await seedTenantDatabaseIfEmpty(tenantId);
  }

  const authenticatedDevice = typeof window !== 'undefined' ? JSON.parse(localStorage.getItem('locadora_authenticated_device') || '{}') : null;
  const isMaster = isMasterUser(authenticatedDevice);

  try {
    const res = await fetch('/api/db/fetch-collection', {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'x-tenant-id': activeTenantId,
        'x-is-master': isMaster ? 'true' : 'false'
      },
      body: JSON.stringify({ colName, tenantId, isMaster })
    });
    
    if (!res.ok) {
      throw new Error(`HTTP error! status: ${res.status}`);
    }
    
    const items = await res.json() as T[];
    
    if (items && Array.isArray(items)) {
      // Preserve ONLY explicit un-synced local drafts created offline
      const localItems = getLocalCollection<T>(colName, tenantId);
      const localDrafts = localItems.filter((item: any) => item?._isLocalDraft === true);
      
      const mergedItems = [...items];
      for (const draft of localDrafts) {
        const draftId = (draft as any)?.id || ((draft as any)?.reserva?.id);
        if (draftId !== undefined) {
          const existsInRemote = items.some((remoteItem: any) => {
            const remoteId = remoteItem?.id || remoteItem?.reserva?.id;
            return remoteId !== undefined && String(remoteId) === String(draftId);
          });
          if (!existsInRemote) {
            mergedItems.push(draft);
          }
        }
      }
      
      saveLocalCollection(colName, mergedItems, tenantId);
      return mergedItems;
    }
    
    return getLocalCollection<T>(colName, tenantId);
  } catch (err) {
    console.info(`[Resiliência Offline] Erro ao buscar coleção ${colName} do PostgreSQL. Ativando fallback local:`, err);
    return getLocalCollection<T>(colName, tenantId);
  }
}

// Fetch a single document by ID from local cache or remote collection
export async function fetchDocument<T>(colName: string, docId: string | number): Promise<T | null> {
  const hasSimulatedError = await delayAndErrorCheck();
  if (hasSimulatedError) {
    return null;
  }
  try {
    const items = await fetchCollection<any>(colName);
    const found = items.find(item => {
      if (item.id !== undefined) return String(item.id) === String(docId);
      if (colName === 'reservas' && item.reserva?.id) return String(item.reserva.id) === String(docId);
      return false;
    });
    return found || null;
  } catch (err) {
    console.info(`[Resiliência Offline] Erro ao buscar documento ${colName} #${docId} do PostgreSQL:`, err);
  }
  return null;
}

export function normalizeCollectionName(colName: string): string {
  const map: Record<string, string> = {
    clients: 'clientes',
    clientes: 'clientes',
    stock_items: 'itens',
    stockItems: 'itens',
    stockitems: 'itens',
    itens: 'itens',
    bookings: 'reservas',
    reservas: 'reservas',
    web_forms: 'webForms',
    webforms: 'webForms',
    webForms: 'webForms',
    financial_transactions: 'transacoes',
    transacoes: 'transacoes',
    maintenance_history: 'manutencoes',
    maintenance_records: 'manutencoes',
    manutencoes: 'manutencoes',
    authorized_devices: 'dispositivos_autorizados',
    dispositivos_autorizados: 'dispositivos_autorizados',
    dispositivos: 'dispositivos_autorizados',
    item_categories: 'categorias',
    categorias: 'categorias',
    contract_templates: 'modelosContrato',
    modelosContratos: 'modelosContrato',
    modelosContrato: 'modelosContrato',
    tenant_configs: 'empresaConfig',
    empresaConfig: 'empresaConfig',
    empresa_config: 'empresaConfig',
  };
  return map[colName] || colName;
}

// Save document to PostgreSQL with local cache backup
export async function saveDocument(colName: string, docId: string | number, data: any): Promise<void> {
  const normalizedCol = normalizeCollectionName(colName);
  let previousValue: any = null;
  try {
    const items = getLocalCollection<any>(normalizedCol);
    const docIdStr = String(docId);
    previousValue = items.find((item: any) => {
      if (item.id !== undefined && String(item.id) === docIdStr) return true;
      if (item.reserva?.id !== undefined && String(item.reserva.id) === docIdStr) return true;
      return false;
    });
  } catch (_) {}

  // Update local storage cache first to ensure immediate offline availability
  try {
    const items = getLocalCollection<any>(normalizedCol);
    const cleanData = JSON.parse(JSON.stringify(data));
    
    if (cleanData.id === undefined && cleanData.hardwareId === undefined && cleanData.configName === undefined) {
      cleanData.id = docId;
    }
    
    const index = items.findIndex((item: any) => {
      if (item.id !== undefined && cleanData.id !== undefined) {
        return String(item.id) === String(cleanData.id);
      }
      if (item.hardwareId !== undefined && cleanData.hardwareId !== undefined) {
        return String(item.hardwareId) === String(cleanData.hardwareId);
      }
      if (item.configName !== undefined && cleanData.configName !== undefined) {
        return String(item.configName) === String(cleanData.configName);
      }
      if (normalizedCol === 'reservas' && item.reserva?.id && cleanData.reserva?.id) {
        return String(item.reserva.id) === String(cleanData.reserva.id);
      }
      return false;
    });

    if (index !== -1) {
      items[index] = { ...items[index], ...cleanData };
    } else {
      items.push(cleanData);
    }
    saveLocalCollection(normalizedCol, items);

    if (normalizedCol !== colName) {
      saveLocalCollection(colName, items);
    }

    // Auto-clear wiped state when new active data is written to the system
    const tId = getActiveTenantId();
    localStorage.removeItem('locadora_wiped_state');
    localStorage.removeItem(`locadora_wiped_state_${tId}`);
  } catch (e) {
    console.info(`[Local Storage Cache] Error caching document for ${normalizedCol}:`, e);
  }

  const hasSimulatedError = await delayAndErrorCheck();
  if (hasSimulatedError) {
    console.info(`[Resiliência Offline] Salvamento em ${colName} #${docId} simulado com sucesso (modo offline/resiliente).`);
    return;
  }
  try {
    const tenantId = getActiveTenantId();
    await fetch('/api/db/save-document', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ colName: normalizedCol, docId, data, tenantId, previousValue })
    });
  } catch (err) {
    console.info(`[Resiliência Offline] Falha ao salvar documento em ${normalizedCol} no PostgreSQL, operando localmente:`, err);
  }
}

// Helper to scrub document from all local storage collections
function scrubDocumentFromLocalStorage(colName: string, docId: string | number) {
  if (typeof window === 'undefined' || !window.localStorage) return;
  const docIdStr = String(docId);
  const normalized = normalizeCollectionName(colName);
  
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (!key) continue;

      const isMatch = key.includes(`_${normalized}`) ||
                      key.includes(`_${colName}`) ||
                      key.startsWith('locadora_collection_') ||
                      key.startsWith('offline_db_') ||
                      key.startsWith('offline_config_');
                      
      if (isMatch) {
        try {
          const raw = localStorage.getItem(key);
          if (raw) {
            const parsed = JSON.parse(raw);
            if (Array.isArray(parsed)) {
              const filtered = parsed.filter((item: any) => {
                if (item === null || item === undefined) return false;
                if (item.id !== undefined && item.id !== null && String(item.id) === docIdStr) return false;
                if (item.reserva?.id !== undefined && item.reserva?.id !== null && String(item.reserva.id) === docIdStr) return false;
                if (item.hardwareId !== undefined && item.hardwareId !== null && String(item.hardwareId) === docIdStr) return false;
                if (item.configName !== undefined && item.configName !== null && String(item.configName) === docIdStr) return false;
                if (item.config_name !== undefined && item.config_name !== null && String(item.config_name) === docIdStr) return false;
                if (item.imei !== undefined && item.imei !== null && String(item.imei) === docIdStr) return false;
                if (item.titulo !== undefined && item.titulo !== null && String(item.titulo) === docIdStr) return false;
                if (item.nome !== undefined && item.nome !== null && String(item.nome) === docIdStr) return false;
                return true;
              });
              localStorage.setItem(key, JSON.stringify(filtered));
            } else if (typeof parsed === 'object' && parsed !== null) {
              if (String(parsed.id) === docIdStr || String(parsed.configName) === docIdStr || String(parsed.config_name) === docIdStr) {
                localStorage.removeItem(key);
              }
            }
          }
        } catch (e) {}
      }
    }
  } catch (e) {
    console.warn('[scrubDocumentFromLocalStorage error]', e);
  }
}

// Delete document from PostgreSQL and local cache
export async function deleteDocument(colName: string, docId: string | number, overrideTenantId?: string): Promise<void> {
  const normalizedCol = normalizeCollectionName(colName);
  const tenantId = overrideTenantId || getActiveTenantId();
  
  let previousValue: any = null;
  try {
    const items = getLocalCollection<any>(normalizedCol, tenantId);
    const docIdStr = String(docId);
    previousValue = items.find((item: any) => {
      if (item.id !== undefined && String(item.id) === docIdStr) return true;
      if (item.reserva?.id !== undefined && String(item.reserva.id) === docIdStr) return true;
      if (item.hardwareId !== undefined && String(item.hardwareId) === docIdStr) return true;
      if (item.configName !== undefined && String(item.configName) === docIdStr) return true;
      return false;
    });
  } catch (_) {}

  // Scrub thoroughly from local storage cache first
  try {
    scrubDocumentFromLocalStorage(normalizedCol, docId);
    if (normalizedCol !== colName) {
      scrubDocumentFromLocalStorage(colName, docId);
    }
  } catch (e) {
    console.info(`[Local Storage Cache] Error removing from cache for ${normalizedCol}:`, e);
  }

  const hasSimulatedError = await delayAndErrorCheck();
  if (hasSimulatedError) {
    console.info(`[Resiliência Offline] Exclusão em ${normalizedCol} #${docId} simulada com sucesso.`);
    return;
  }
  
  const authenticatedDevice = typeof window !== 'undefined' ? JSON.parse(localStorage.getItem('locadora_authenticated_device') || '{}') : null;
  const isMaster = isMasterUser(authenticatedDevice);

  try {
    const res = await fetch('/api/db/delete-document', {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'x-tenant-id': tenantId,
        'x-is-master': isMaster ? 'true' : 'false'
      },
      body: JSON.stringify({ colName: normalizedCol, docId, tenantId, previousValue, isMaster })
    });
    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      console.warn(`[Delete Document Server Resposta]:`, errData);
      throw new Error(errData.error || `Erro HTTP ${res.status} ao excluir documento do banco de dados`);
    }
  } catch (err: any) {
    console.error(`[deleteDocument error]`, err);
    throw err;
  }
}

// Execute arbitrary SQL query via server endpoint with local fallback
export async function executeSqlRemote(query: string): Promise<{
  columns: string[];
  rows: any[];
  rowCount: number;
  executionTimeMs: number;
}> {
  const tenantId = getActiveTenantId();
  const authenticatedDevice = typeof window !== 'undefined' ? JSON.parse(localStorage.getItem('locadora_authenticated_device') || '{}') : null;
  const isMaster = isMasterUser(authenticatedDevice);

  try {
    const res = await fetch('/api/db/execute-sql', {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'x-tenant-id': tenantId,
        'x-is-master': isMaster ? 'true' : 'false'
      },
      body: JSON.stringify({ query, tenantId, isMaster })
    });
    if (res.ok) {
      const data = await res.json();
      return {
        columns: data.columns || [],
        rows: data.rows || [],
        rowCount: data.rowCount ?? (data.rows ? data.rows.length : 0),
        executionTimeMs: data.executionTimeMs || 0
      };
    } else {
      const err = await res.json().catch(() => ({ error: 'Erro de execução' }));
      throw new Error(err.error || 'Falha ao executar SQL');
    }
  } catch (err: any) {
    throw err;
  }
}

// Save config
export async function saveConfig(configName: string, data: any): Promise<void> {
  const tenantId = configName === 'empresaConfig' && data?.cnpj 
    ? String(data.cnpj).replace(/[^a-zA-Z0-9]/g, '').toUpperCase() 
    : getActiveTenantId();
    
  const realConfigName = `${configName}_${tenantId}`;

  try {
    localStorage.setItem(`offline_config_${realConfigName}`, JSON.stringify(data));
    if (configName === 'empresaConfig') {
      localStorage.setItem(`offline_config_empresa_config_${tenantId}`, JSON.stringify(data));
    } else if (configName === 'empresa_config') {
      localStorage.setItem(`offline_config_empresaConfig_${tenantId}`, JSON.stringify(data));
    }
  } catch (e) {
    console.info(`[Local Storage Cache] Error caching config ${realConfigName}:`, e);
  }

  const hasSimulatedError = await delayAndErrorCheck();
  if (hasSimulatedError) {
    console.info(`[Resiliência Offline] Salvamento de config ${realConfigName} simulado com sucesso.`);
    return;
  }
  try {
    await fetch('/api/db/save-config', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ configName, tenantId, data })
    });
  } catch (err) {
    console.info(`[Resiliência Offline] Falha ao salvar config ${realConfigName} no PostgreSQL:`, err);
  }
}

// Get config
export async function getConfig<T>(configName: string, defaultValue: T): Promise<T> {
  const tenantId = getActiveTenantId();
  const realConfigName = `${configName}_${tenantId}`;

  const hasSimulatedError = await delayAndErrorCheck();
  if (hasSimulatedError) {
    console.info(`[Resiliência Offline] Leitura de config ${realConfigName} simulada (usando valor padrão/local).`);
    try {
      let saved = localStorage.getItem(`offline_config_${realConfigName}`);
      if (!saved && (configName === 'empresaConfig' || configName === 'empresa_config')) {
        saved = localStorage.getItem(`offline_config_empresaConfig_${tenantId}`) || 
                localStorage.getItem(`offline_config_empresa_config_${tenantId}`);
      }
      return saved ? JSON.parse(saved) : defaultValue;
    } catch {
      return defaultValue;
    }
  }
  try {
    const res = await fetch('/api/db/get-config', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ configName, tenantId, defaultValue })
    });
    if (res.ok) {
      const data = await res.json() as T;
      localStorage.setItem(`offline_config_${realConfigName}`, JSON.stringify(data));
      if (configName === 'empresaConfig') {
        localStorage.setItem(`offline_config_empresa_config_${tenantId}`, JSON.stringify(data));
      } else if (configName === 'empresa_config') {
        localStorage.setItem(`offline_config_empresaConfig_${tenantId}`, JSON.stringify(data));
      }
      return data;
    }
    let saved = localStorage.getItem(`offline_config_${realConfigName}`);
    if (!saved && (configName === 'empresaConfig' || configName === 'empresa_config')) {
      saved = localStorage.getItem(`offline_config_empresaConfig_${tenantId}`) || 
              localStorage.getItem(`offline_config_empresa_config_${tenantId}`);
    }
    return saved ? JSON.parse(saved) : defaultValue;
  } catch (err) {
    console.info(`[Resiliência Offline] Falha ao ler config ${realConfigName} do PostgreSQL. Usando cache local fallback:`, err);
    try {
      let saved = localStorage.getItem(`offline_config_${realConfigName}`);
      if (!saved && (configName === 'empresaConfig' || configName === 'empresa_config')) {
        saved = localStorage.getItem(`offline_config_empresaConfig_${tenantId}`) || 
                localStorage.getItem(`offline_config_empresa_config_${tenantId}`);
      }
      return saved ? JSON.parse(saved) : defaultValue;
    } catch {
      return defaultValue;
    }
  }
}

// Multi-Tenant Seeding Logic for newly registered companies (PostgreSQL focused)
export async function seedTenantDatabaseIfEmpty(tenantId: string): Promise<void> {
  if (!tenantId || tenantId === 'default') return;
  
  try {
    const currentConf = await getConfig<EmpresaConfig>('empresaConfig', null as any);
    if (!currentConf || currentConf.ambienteSistema !== 'teste') {
      return; // Do NOT auto-seed sample test data in Production Mode or unconfigured tenants
    }

    if (typeof window !== 'undefined' && (localStorage.getItem('locadora_wiped_state') === 'true' || localStorage.getItem(`locadora_wiped_state_${tenantId}`) === 'true')) {
      return;
    }

    const seedCheck = await getConfig<any>(`seeded_${tenantId}`, null);
    if (seedCheck?.done === true || seedCheck?.wiped === true) return; // Already seeded or wiped

    console.log(`[Multi-Tenant Seeder] Seeding initial data for Company CNPJ #${tenantId} into PostgreSQL...`);

    // Customize the initial empresa config with their details if possible!
    const savedDevice = localStorage.getItem('locadora_authenticated_device');
    let customizedConfig = { ...INITIAL_EMPRESA_CONFIG };
    if (savedDevice) {
      try {
        const parsed = JSON.parse(savedDevice);
        if (parsed && parsed.cnpjEmpresa && parsed.cnpjEmpresa.replace(/\D/g, '') === tenantId) {
          customizedConfig.cnpj = parsed.cnpjEmpresa;
          customizedConfig.nomeRepresentante = parsed.usuario || 'Representante Legal';
          customizedConfig.email = parsed.email || 'contato@locadora.com.br';
          customizedConfig.telefoneWhatsapp = parsed.telefone || '';
          customizedConfig.nomeFantasia = parsed.nomeDispositivo ? `Locadora de ${parsed.usuario}` : 'Minha Locadora Acervus';
          customizedConfig.razaoSocial = `Locações e Inventário ${parsed.usuario} LTDA`;
        }
      } catch (e) {}
    }

    await saveConfig('empresaConfig', customizedConfig);
    await saveConfig('themeConfig', INITIAL_THEME_CONFIG);

    // Seed collections for this tenant
    const itemsToSeed = [
      { col: 'clientes', data: INITIAL_CLIENTES },
      { col: 'itens', data: INITIAL_ITENS },
      { col: 'reservas', data: INITIAL_RESERVAS },
      { col: 'categorias', data: INITIAL_CATEGORIAS },
      { col: 'transacoes', data: INITIAL_FINANCE_TRANSACTIONS },
      { col: 'manutencoes', data: INITIAL_MAINTENANCE_LOGS },
      { col: 'modelosContratos', data: INITIAL_MODELOS_CONTRATO }
    ];

    for (const entry of itemsToSeed) {
      if (entry.col === 'modelosContratos' || entry.col === 'categorias') {
        await saveDocument(entry.col, entry.col, entry.data);
      } else {
        for (const docItem of entry.data) {
          const docId = String((docItem as any).id || (docItem as any).reserva?.id || Math.random().toString(36).substring(7));
          await saveDocument(entry.col, docId, docItem);
        }
      }
    }

    await saveConfig(`seeded_${tenantId}`, { done: true, timestamp: Date.now() });
    console.log(`[Multi-Tenant Seeder] Seeding completed for Company CNPJ #${tenantId}.`);
  } catch (error) {
    console.info(`[Multi-Tenant Seeder] Seeding error or offline for ${tenantId}:`, error);
  }
}

// Database Seeding Logic (Global Fallback)
export async function seedDatabaseIfEmpty(): Promise<void> {
  try {
    const tenantId = getActiveTenantId();
    if (typeof window !== 'undefined' && (localStorage.getItem('locadora_wiped_state') === 'true' || localStorage.getItem(`locadora_wiped_state_${tenantId}`) === 'true')) {
      console.log('Database explicitly wiped locally. Skipping automatic seed.');
      return;
    }

    const check = await getConfig<any>('seeded', null);
    if (check?.done === true || check?.wiped === true) {
      console.log('Database already seeded or explicitly wiped. Skipping automatic seed.');
      return;
    }

    const config = await getConfig<any>('empresaConfig', null);
    if (config?.ambienteSistema === 'producao') {
      console.log('System configured in PRODUCTION mode. Skipping automatic seed.');
      return;
    }

    if (config) {
      console.log('Database already has company configurations. Skipping seed.');
      return;
    }

    console.log('Seeding initial configurations into PostgreSQL...');

    await saveConfig('empresaConfig', INITIAL_EMPRESA_CONFIG);
    await saveConfig('themeConfig', INITIAL_THEME_CONFIG);
    await saveConfig('seeded', { done: true });

    console.log('Database configurations seeding successfully completed.');
  } catch (error: any) {
    console.info('Sincronização PostgreSQL indisponível:', error?.message || error);
  }
}

// Audit Log Helpers & Types
export interface AuditLogItem {
  id: string;
  timestamp: number;
  action: string;
  category: 'DELETE' | 'EDIT' | 'CREATE' | 'WIPE' | 'SQL_EXEC' | 'SECURITY';
  tableOrCollection: string;
  documentId?: string;
  tenantId?: string;
  userEmail?: string;
  userName?: string;
  details?: string;
  previousValue?: any;
  newValue?: any;
  status: 'SUCCESS' | 'ERROR' | 'WARNING';
}

export async function fetchAuditLogs(tenantId?: string, category?: string): Promise<AuditLogItem[]> {
  try {
    const params = new URLSearchParams();
    if (tenantId) params.append('tenantId', tenantId);
    if (category) params.append('category', category);

    const res = await fetch(`/api/admin/audit-logs?${params.toString()}`);
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data)) return data;
    }
  } catch (err) {
    console.info('Erro ao buscar logs de auditoria:', err);
  }

  // Fallback to local offline cache
  try {
    const cached = localStorage.getItem('locadora_offline_audit_logs');
    if (cached) {
      let logs: AuditLogItem[] = JSON.parse(cached);
      if (category && category !== 'TODOS') {
        logs = logs.filter(l => l.category === category);
      }
      return logs;
    }
  } catch (_) {}

  return [];
}

export async function recordAuditEvent(entry: {
  action: string;
  category: 'DELETE' | 'EDIT' | 'CREATE' | 'WIPE' | 'SQL_EXEC' | 'SECURITY';
  tableOrCollection: string;
  documentId?: string;
  tenantId?: string;
  userEmail?: string;
  userName?: string;
  details?: string;
  previousValue?: any;
  newValue?: any;
  status?: 'SUCCESS' | 'ERROR' | 'WARNING';
}): Promise<AuditLogItem | null> {
  const localItem: AuditLogItem = {
    id: 'audit_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7),
    timestamp: Date.now(),
    action: entry.action,
    category: entry.category,
    tableOrCollection: entry.tableOrCollection,
    documentId: entry.documentId ? String(entry.documentId) : undefined,
    tenantId: entry.tenantId || getActiveTenantId(),
    userEmail: entry.userEmail || 'sistema@acervus',
    userName: entry.userName || 'Sistema Acervus',
    details: entry.details || '',
    previousValue: entry.previousValue || null,
    newValue: entry.newValue || null,
    status: entry.status || 'SUCCESS'
  };

  // Cache locally
  try {
    const cached = localStorage.getItem('locadora_offline_audit_logs');
    let list: AuditLogItem[] = cached ? JSON.parse(cached) : [];
    list.unshift(localItem);
    if (list.length > 200) list = list.slice(0, 200);
    localStorage.setItem('locadora_offline_audit_logs', JSON.stringify(list));
  } catch (_) {}

  try {
    const res = await fetch('/api/admin/audit-logs', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(entry)
    });
    if (res.ok) {
      const data = await res.json();
      return data.log || localItem;
    }
  } catch (e) {
    console.info('Erro ao gravar evento de auditoria no servidor:', e);
  }

  return localItem;
}

export async function clearAuditLogsRemote(): Promise<boolean> {
  try {
    localStorage.removeItem('locadora_offline_audit_logs');
    const res = await fetch('/api/admin/clear-audit-logs', { method: 'POST' });
    return res.ok;
  } catch (_) {
    return false;
  }
}
