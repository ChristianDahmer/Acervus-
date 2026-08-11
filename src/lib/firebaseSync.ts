import { 
  collection, 
  doc, 
  getDocs, 
  setDoc, 
  deleteDoc, 
  writeBatch,
  getDoc
} from 'firebase/firestore';
import { db } from './firebase';
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
      const sanitized = urlTenant.replace(/\D/g, '');
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
          return parsed.cnpjEmpresa.replace(/\D/g, '') || 'default';
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
  // 'dispositivos_autorizados' is global so terminals across all companies can authenticate
  if (colName === 'dispositivos_autorizados' || colName === 'system_configs' || colName === 'seeded') {
    return colName;
  }
  const tenantId = getActiveTenantId();
  return `empresa_${tenantId}_${colName}`;
}

// Helper for simulated latency and errors (Developer Test Panel)
async function delayAndErrorCheck(): Promise<boolean> {
  // Ignorar latências ou erros simulados para a visualização pública da proposta do cliente
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
    console.warn('[Developer Simulated Error] Falha de escrita/leitura induzida para teste de resiliência offline.');
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
    console.warn(`[Local Storage Cache] Error reading local ${colName}:`, e);
  }
  
  // Return initial defaults if local storage is completely empty and they haven't explicitly wiped
  const isWiped = localStorage.getItem(`locadora_wiped_state_${tenantId}`) === 'true';
  if (!isWiped) {
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
    if (items.length > 0) {
      localStorage.removeItem(`locadora_wiped_state_${tenantId}`);
    }
  } catch (e) {
    console.warn(`[Local Storage Cache] Error saving local ${colName}:`, e);
  }
}

// Load generic collection
export async function fetchCollection<T>(colName: string): Promise<T[]> {
  const hasSimulatedError = await delayAndErrorCheck();
  if (hasSimulatedError) {
    console.warn(`[Resiliência Offline] Retornando cache local para coleção ${colName} devido à falha simulada.`);
    return getLocalCollection<T>(colName);
  }

  // Ensure new tenants have their databases initialized/seeded
  const tenantId = getActiveTenantId();
  if (tenantId !== 'default') {
    await seedTenantDatabaseIfEmpty(tenantId);
  }

  try {
    const realColName = getTenantCollectionName(colName);
    const colRef = collection(db, realColName);
    const snapshot = await getDocs(colRef);
    const items: T[] = [];
    snapshot.forEach((d) => {
      items.push({ ...d.data() } as T);
    });
    
    // If successfully fetched from Firestore, update our local cache
    if (items.length > 0) {
      saveLocalCollection(colName, items);
    } else {
      // If Firestore is empty (e.g. newly provisioned or cleared in console),
      // fallback to whatever we have locally to preserve user offline data
      const local = getLocalCollection<T>(colName);
      if (local.length > 0) {
        console.log(`[Resiliência Offline] Coleção remota ${colName} vazia. Carregando ${local.length} itens do cache local.`);
        return local;
      }
    }
    return items;
  } catch (err) {
    console.warn(`[Resiliência Offline] Erro ao buscar coleção ${colName} do Firestore. Ativando fallback local:`, err);
    return getLocalCollection<T>(colName);
  }
}

// Fetch a single document by ID directly from Firestore (extremely fast and lightweight)
export async function fetchDocument<T>(colName: string, docId: string | number): Promise<T | null> {
  const hasSimulatedError = await delayAndErrorCheck();
  if (hasSimulatedError) {
    return null;
  }
  try {
    const realColName = getTenantCollectionName(colName);
    const docRef = doc(db, realColName, String(docId));
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      return docSnap.data() as T;
    }
  } catch (err) {
    console.warn(`[Resiliência Offline] Erro ao buscar documento ${colName} #${docId} do Firestore:`, err);
  }
  return null;
}

// Save document
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
  } catch (e) {
    console.warn(`[Local Storage Cache] Error caching document for ${colName}:`, e);
  }

  const hasSimulatedError = await delayAndErrorCheck();
  if (hasSimulatedError) {
    console.warn(`[Resiliência Offline] Salvamento em ${colName} #${docId} simulado com sucesso (modo offline/resiliente).`);
    return;
  }
  try {
    const realColName = getTenantCollectionName(colName);
    const docRef = doc(db, realColName, String(docId));
    const cleanData = JSON.parse(JSON.stringify(data));
    await setDoc(docRef, cleanData, { merge: true });
  } catch (err) {
    console.warn(`[Resiliência Offline] Falha ao salvar documento em ${colName}, operando localmente:`, err);
  }
}

// Delete document
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
    console.warn(`[Local Storage Cache] Error removing from cache for ${colName}:`, e);
  }

  const hasSimulatedError = await delayAndErrorCheck();
  if (hasSimulatedError) {
    console.warn(`[Resiliência Offline] Exclusão em ${colName} #${docId} simulada com sucesso.`);
    return;
  }
  try {
    const realColName = getTenantCollectionName(colName);
    const docRef = doc(db, realColName, String(docId));
    await deleteDoc(docRef);
  } catch (err) {
    console.warn(`[Resiliência Offline] Falha ao excluir documento em ${colName}:`, err);
  }
}

// Save config
export async function saveConfig(configName: string, data: any): Promise<void> {
  const tenantId = configName === 'empresaConfig' && data?.cnpj 
    ? String(data.cnpj).replace(/\D/g, '') 
    : getActiveTenantId();
    
  const realConfigName = `${configName}_${tenantId}`;

  try {
    localStorage.setItem(`offline_config_${realConfigName}`, JSON.stringify(data));
  } catch (e) {
    console.warn(`[Local Storage Cache] Error caching config ${realConfigName}:`, e);
  }

  const hasSimulatedError = await delayAndErrorCheck();
  if (hasSimulatedError) {
    console.warn(`[Resiliência Offline] Salvamento de config ${realConfigName} simulado com sucesso.`);
    return;
  }
  try {
    const docRef = doc(db, 'system_configs', realConfigName);
    const cleanData = JSON.parse(JSON.stringify(data));
    await setDoc(docRef, cleanData);
  } catch (err) {
    console.warn(`[Resiliência Offline] Falha ao salvar config ${realConfigName}:`, err);
  }
}

// Get config
export async function getConfig<T>(configName: string, defaultValue: T): Promise<T> {
  const tenantId = getActiveTenantId();
  const realConfigName = `${configName}_${tenantId}`;

  const hasSimulatedError = await delayAndErrorCheck();
  if (hasSimulatedError) {
    console.warn(`[Resiliência Offline] Leitura de config ${realConfigName} simulada (usando valor padrão/local).`);
    try {
      const saved = localStorage.getItem(`offline_config_${realConfigName}`);
      return saved ? JSON.parse(saved) : defaultValue;
    } catch {
      return defaultValue;
    }
  }
  try {
    const docRef = doc(db, 'system_configs', realConfigName);
    const snap = await getDoc(docRef);
    if (snap.exists()) {
      const data = snap.data() as T;
      localStorage.setItem(`offline_config_${realConfigName}`, JSON.stringify(data));
      return data;
    }
    const saved = localStorage.getItem(`offline_config_${realConfigName}`);
    return saved ? JSON.parse(saved) : defaultValue;
  } catch (err) {
    console.warn(`[Resiliência Offline] Falha ao ler config ${realConfigName}. Usando cache local fallback:`, err);
    try {
      const saved = localStorage.getItem(`offline_config_${realConfigName}`);
      return saved ? JSON.parse(saved) : defaultValue;
    } catch {
      return defaultValue;
    }
  }
}

// Multi-Tenant Seeding Logic for newly registered companies
export async function seedTenantDatabaseIfEmpty(tenantId: string): Promise<void> {
  if (!tenantId || tenantId === 'default') return;
  
  try {
    const seedCheckDocRef = doc(db, 'system_configs', `seeded_${tenantId}`);
    const checkSnap = await getDoc(seedCheckDocRef);
    if (checkSnap.exists()) {
      const data = checkSnap.data();
      if (data?.done === true) return; // Already seeded
    }

    console.log(`[Multi-Tenant Seeder] Seeding initial data for Company CNPJ #${tenantId}...`);

    const configRef = doc(db, 'system_configs', `empresaConfig_${tenantId}`);
    const themeRef = doc(db, 'system_configs', `themeConfig_${tenantId}`);

    const batch = writeBatch(db);

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

    batch.set(configRef, customizedConfig);
    batch.set(themeRef, INITIAL_THEME_CONFIG);
    batch.set(seedCheckDocRef, { done: true, timestamp: Date.now() });

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
      const colName = `empresa_${tenantId}_${entry.col}`;
      
      // Let's check if the collection already contains data first
      // To keep batch operations highly lightweight and secure
      for (const docItem of entry.data) {
        const docId = String((docItem as any).id || (docItem as any).reserva?.id || Math.random().toString(36).substring(7));
        const docRef = doc(db, colName, docId);
        batch.set(docRef, docItem);
      }
    }

    await batch.commit();
    console.log(`[Multi-Tenant Seeder] Seeding completed for Company CNPJ #${tenantId}.`);
  } catch (error) {
    console.warn(`[Multi-Tenant Seeder] Seeding error or offline for ${tenantId}:`, error);
  }
}

// Database Seeding Logic (Global Fallback)
export async function seedDatabaseIfEmpty(): Promise<void> {
  try {
    if (typeof window !== 'undefined' && localStorage.getItem('locadora_wiped_state') === 'true') {
      console.log('Database explicitly wiped locally. Skipping automatic seed.');
      return;
    }

    const checkRef = doc(db, 'system_configs', 'seeded');
    const checkSnap = await getDoc(checkRef);
    if (checkSnap.exists()) {
      const data = checkSnap.data();
      if (data?.done === true || data?.wiped === true) {
        console.log('Database already seeded or explicitly wiped. Skipping automatic seed.');
        return;
      }
    }

    const configRef = doc(db, 'system_configs', 'empresaConfig_default');
    const configSnap = await getDoc(configRef);
    if (configSnap.exists()) {
      console.log('Database already has company configurations. Skipping seed.');
      return;
    }

    console.log('Seeding initial configurations into Firestore...');

    const batch = writeBatch(db);

    batch.set(configRef, INITIAL_EMPRESA_CONFIG);

    const themeRef = doc(db, 'system_configs', 'themeConfig_default');
    batch.set(themeRef, INITIAL_THEME_CONFIG);

    batch.set(checkRef, { done: true });

    await batch.commit();
    console.log('Database configurations seeding successfully completed.');
  } catch (error: any) {
    if (error?.code === 'unavailable' || error?.message?.includes('offline') || error?.message?.includes('Failed to get document')) {
      console.warn('Firestore offline / indisponível durante a verificação do seed. Operando com dados locais.');
    } else {
      console.warn('Sincronização remota indisponível:', error?.message || error);
    }
  }
}

