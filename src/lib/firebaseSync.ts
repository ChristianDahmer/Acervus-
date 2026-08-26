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
  FormularioWeb
} from '../types';

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
    
    // 2. Prioritize the authenticated device's company CNPJ if logged in
    try {
      const saved = localStorage.getItem('locadora_authenticated_device');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed && parsed.cnpjEmpresa) {
          const tenantId = parsed.cnpjEmpresa.replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
          if (tenantId) {
            localStorage.setItem('locadora_last_active_tenant', tenantId);
            return tenantId;
          }
        }
      }
    } catch (e) {}

    // 2.5 Fallback to the last active authenticated tenant to prevent reverting to default/test mode on logoff
    try {
      const lastActive = localStorage.getItem('locadora_last_active_tenant');
      if (lastActive) {
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

// Local storage helpers for offline resilience (with tenant isolation)
export function getLocalCollection<T>(colName: string): T[] {
  const tenantId = getActiveTenantId();
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

export function saveLocalCollection<T>(colName: string, items: T[]): void {
  const tenantId = getActiveTenantId();
  try {
    localStorage.setItem(`offline_db_${tenantId}_${colName}`, JSON.stringify(items));
  } catch (e) {
    console.info(`[Local Storage Cache] Error saving local ${colName}:`, e);
  }
}

// Load generic collection from PostgreSQL via backend proxy
export async function fetchCollection<T>(colName: string): Promise<T[]> {
  const hasSimulatedError = await delayAndErrorCheck();
  if (hasSimulatedError) {
    console.info(`[Resiliência Offline] Retornando cache local para coleção ${colName} devido à falha simulada.`);
    return getLocalCollection<T>(colName);
  }

  const tenantId = getActiveTenantId();
  if (tenantId !== 'default') {
    await seedTenantDatabaseIfEmpty(tenantId);
  }

  try {
    const res = await fetch('/api/db/fetch-collection', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ colName, tenantId })
    });
    
    if (!res.ok) {
      throw new Error(`HTTP error! status: ${res.status}`);
    }
    
    const items = await res.json() as T[];
    
    if (items && Array.isArray(items)) {
      // Preserve ONLY explicit un-synced local drafts created offline
      const localItems = getLocalCollection<T>(colName);
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
      
      saveLocalCollection(colName, mergedItems);
      return mergedItems;
    }
    
    return getLocalCollection<T>(colName);
  } catch (err) {
    console.info(`[Resiliência Offline] Erro ao buscar coleção ${colName} do PostgreSQL. Ativando fallback local:`, err);
    return getLocalCollection<T>(colName);
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

// Save document to PostgreSQL with local cache backup
export async function saveDocument(colName: string, docId: string | number, data: any): Promise<void> {
  // Update local storage cache first to ensure immediate offline availability
  try {
    const items = getLocalCollection<any>(colName);
    const cleanData = JSON.parse(JSON.stringify(data));
    
    if (cleanData.id === undefined) {
      cleanData.id = docId;
    }
    
    const index = items.findIndex((item: any) => {
      if (item.id !== undefined && cleanData.id !== undefined) {
        return String(item.id) === String(cleanData.id);
      }
      if (colName === 'reservas' && item.reserva?.id && cleanData.reserva?.id) {
        return String(item.reserva.id) === String(cleanData.reserva.id);
      }
      return false;
    });

    if (index !== -1) {
      items[index] = { ...items[index], ...cleanData };
    } else {
      items.push(cleanData);
    }
    saveLocalCollection(colName, items);

    // Auto-clear wiped state when new active data is written to the system
    const tId = getActiveTenantId();
    localStorage.removeItem('locadora_wiped_state');
    localStorage.removeItem(`locadora_wiped_state_${tId}`);
  } catch (e) {
    console.info(`[Local Storage Cache] Error caching document for ${colName}:`, e);
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
      body: JSON.stringify({ colName, docId, data, tenantId })
    });
  } catch (err) {
    console.info(`[Resiliência Offline] Falha ao salvar documento em ${colName} no PostgreSQL, operando localmente:`, err);
  }
}

// Delete document from PostgreSQL and local cache
export async function deleteDocument(colName: string, docId: string | number): Promise<void> {
  // Update local storage cache first
  try {
    const items = getLocalCollection<any>(colName);
    const filtered = items.filter((item: any) => {
      if (item.id !== undefined) {
        return String(item.id) !== String(docId);
      }
      if (colName === 'reservas' && item.reserva?.id) {
        return String(item.reserva.id) !== String(docId);
      }
      return true;
    });
    saveLocalCollection(colName, filtered);
  } catch (e) {
    console.info(`[Local Storage Cache] Error removing from cache for ${colName}:`, e);
  }

  const hasSimulatedError = await delayAndErrorCheck();
  if (hasSimulatedError) {
    console.info(`[Resiliência Offline] Exclusão em ${colName} #${docId} simulada com sucesso.`);
    return;
  }
  try {
    const tenantId = getActiveTenantId();
    await fetch('/api/db/delete-document', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ colName, docId, tenantId })
    });
  } catch (err) {
    console.info(`[Resiliência Offline] Falha ao excluir documento em ${colName} no PostgreSQL:`, err);
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
