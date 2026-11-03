import { getLocalCollection, getActiveTenantId } from './firebaseSync';
import { uploadFileToGoogleDrive, getAccessToken, clearGoogleAccessToken } from './googleWorkspace';
import { EmpresaConfig } from '../types';

export interface BackupHistoryItem {
  id: string;
  timestamp: number;
  dateStr: string;
  fileName: string;
  fileId?: string;
  webViewLink?: string;
  status: 'SUCESSO' | 'ERRO';
  recordCount: number;
  details?: string;
  triggerType: 'AUTOMATICO_DIARIO' | 'MANUAL';
  durationMs?: number;
}

export function formatBackupDuration(durationMs?: number): string {
  if (durationMs === undefined || durationMs === null) {
    return '1.2s';
  }
  if (durationMs < 1000) {
    return `${durationMs} ms`;
  }
  return `${(durationMs / 1000).toFixed(2)}s`;
}

/**
 * Constructs a complete JSON database dump containing all local/cached collections
 */
export function generateDatabaseBackupPayload(tenantId: string, empresaConfig?: EmpresaConfig) {
  const itens = getLocalCollection<any>('itens');
  const clientes = getLocalCollection<any>('clientes');
  const reservas = getLocalCollection<any>('reservas');
  const webForms = getLocalCollection<any>('webForms');
  const transacoes = getLocalCollection<any>('transacoes');
  const manutencoes = getLocalCollection<any>('manutencoes');
  const categorias = getLocalCollection<any>('categorias');
  const dispositivos = getLocalCollection<any>('dispositivos_autorizados');

  const totalRecords =
    itens.length +
    clientes.length +
    reservas.length +
    webForms.length +
    transacoes.length +
    manutencoes.length +
    categorias.length +
    dispositivos.length;

  return {
    metadata: {
      system: "Acervus Core",
      module: "AutoBackup Google Drive",
      tenantId: tenantId,
      companyName: empresaConfig?.nomeFantasia || "Acervus Core Locações",
      cnpjEmpresa: empresaConfig?.cnpj || "",
      exportedAt: new Date().toISOString(),
      schemaVersion: 14,
      appVersion: "3.2.0-rc2",
      totalRecords: totalRecords
    },
    collections: {
      itens: { count: itens.length, data: itens },
      clientes: { count: clientes.length, data: clientes },
      reservas: { count: reservas.length, data: reservas },
      webForms: { count: webForms.length, data: webForms },
      transacoes: { count: transacoes.length, data: transacoes },
      manutencoes: { count: manutencoes.length, data: manutencoes },
      categorias: { count: categorias.length, data: categorias },
      dispositivosAutorizados: { count: dispositivos.length, data: dispositivos }
    }
  };
}

/**
 * Retrieves the backup history for the current tenant
 */
export function getBackupHistory(tenantId?: string): BackupHistoryItem[] {
  const activeTenant = tenantId || getActiveTenantId();
  try {
    const raw = localStorage.getItem(`acervus_backup_history_${activeTenant}`);
    if (raw) return JSON.parse(raw);
  } catch (e) {}
  return [];
}

/**
 * Saves a new backup item to the tenant's backup history log
 */
export function saveBackupHistoryItem(item: BackupHistoryItem, tenantId?: string) {
  const activeTenant = tenantId || getActiveTenantId();
  const current = getBackupHistory(activeTenant);
  const updated = [item, ...current].slice(0, 30); // Store up to 30 history entries

  try {
    localStorage.setItem(`acervus_backup_history_${activeTenant}`, JSON.stringify(updated));
    localStorage.setItem(`acervus_last_auto_drive_backup_date_${activeTenant}`, item.dateStr);
    localStorage.setItem(`acervus_last_auto_drive_backup_status_${activeTenant}`, item.status);
    localStorage.setItem(`acervus_last_auto_drive_backup_time_${activeTenant}`, new Date(item.timestamp).toISOString());
  } catch (e) {}
}

/**
 * Triggers the backup upload to Google Drive
 */
export async function performGoogleDriveBackup(
  empresaConfig?: EmpresaConfig,
  triggerType: 'AUTOMATICO_DIARIO' | 'MANUAL' = 'MANUAL'
): Promise<{ success: boolean; message: string; fileInfo?: any }> {
  const tenantId = getActiveTenantId();
  const startTime = Date.now();
  const now = new Date();
  const dateTodayStr = now.toISOString().slice(0, 10); // YYYY-MM-DD

  try {
    let token = await getAccessToken();
    if (!token) {
      token = localStorage.getItem('google_access_token');
    }

    if (!token) {
      const errMessage = 'A conta do Google Drive não está conectada. Faça login na aba Integrações para autorizar o backup.';
      const durationMs = Date.now() - startTime;
      saveBackupHistoryItem({
        id: `bkp_${Date.now()}`,
        timestamp: Date.now(),
        dateStr: dateTodayStr,
        fileName: `backup_acervus_${tenantId}_${dateTodayStr}.json`,
        status: 'ERRO',
        recordCount: 0,
        details: errMessage,
        triggerType,
        durationMs
      }, tenantId);
      return { success: false, message: errMessage };
    }

    // Generate full database backup payload
    const backupPayload = generateDatabaseBackupPayload(tenantId, empresaConfig);
    const jsonString = JSON.stringify(backupPayload, null, 2);
    const timeFormatted = `${now.getHours().toString().padStart(2, '0')}${now.getMinutes().toString().padStart(2, '0')}`;
    const fileName = `backup_acervus_core_${tenantId}_${dateTodayStr}_${timeFormatted}.json`;
    const folderPath = empresaConfig?.googleAccount?.driveFolderPath || '/Meu Drive/Locadora/Backups';

    const result = await uploadFileToGoogleDrive(
      token,
      fileName,
      jsonString,
      'application/json',
      folderPath
    );

    const successMessage = `Backup ${triggerType === 'AUTOMATICO_DIARIO' ? 'automático diário' : 'manual'} salvo no Google Drive com sucesso (${backupPayload.metadata.totalRecords} registros).`;
    const durationMs = Date.now() - startTime;

    saveBackupHistoryItem({
      id: `bkp_${Date.now()}`,
      timestamp: Date.now(),
      dateStr: dateTodayStr,
      fileName: fileName,
      fileId: result.id,
      webViewLink: result.webViewLink,
      status: 'SUCESSO',
      recordCount: backupPayload.metadata.totalRecords,
      details: successMessage,
      triggerType,
      durationMs
    }, tenantId);

    return {
      success: true,
      message: successMessage,
      fileInfo: result
    };
  } catch (error: any) {
    const isAuthError =
      error?.message?.includes('401') ||
      error?.message?.includes('UNAUTHENTICATED') ||
      error?.message?.includes('expirada') ||
      error?.message?.includes('authentication');

    if (isAuthError) {
      clearGoogleAccessToken();
    }

    const errText = isAuthError
      ? 'Sessão do Google Drive expirada ou não autorizada. Reconecte sua conta do Google nas configurações.'
      : (error.message || 'Erro ao enviar backup para o Google Drive.');

    console.warn('[GoogleDriveBackup] Backup warning:', errText);
    const durationMs = Date.now() - startTime;

    saveBackupHistoryItem({
      id: `bkp_${Date.now()}`,
      timestamp: Date.now(),
      dateStr: dateTodayStr,
      fileName: `backup_acervus_${tenantId}_${dateTodayStr}.json`,
      status: 'ERRO',
      recordCount: 0,
      details: errText,
      triggerType,
      durationMs
    }, tenantId);

    return { success: false, message: `Falha no backup: ${errText}` };
  }
}

/**
 * Retrieves the status and info of the latest auto-backup execution
 */
export interface AutoBackupMonitoringInfo {
  lastDate: string | null;
  lastStatus: 'SUCESSO' | 'ERRO' | null;
  lastTime: string | null;
  lastFormattedTime: string | null;
  lastItem: BackupHistoryItem | null;
  isRunToday: boolean;
  isGoogleDriveEnabled: boolean;
  isAutoBackupEnabled: boolean;
  isConnected: boolean;
  hasToken: boolean;
}

export function getLastAutoBackupInfo(empresaConfig?: EmpresaConfig, tenantIdOverride?: string): AutoBackupMonitoringInfo {
  const activeTenant = tenantIdOverride || getActiveTenantId();
  const dateTodayStr = new Date().toISOString().slice(0, 10);
  
  const lastDate = localStorage.getItem(`acervus_last_auto_drive_backup_date_${activeTenant}`);
  const lastStatus = localStorage.getItem(`acervus_last_auto_drive_backup_status_${activeTenant}`) as 'SUCESSO' | 'ERRO' | null;
  const lastTime = localStorage.getItem(`acervus_last_auto_drive_backup_time_${activeTenant}`);
  
  const history = getBackupHistory(activeTenant);
  const lastItem = history.length > 0 ? history[0] : null;
  const isRunToday = lastDate === dateTodayStr && lastStatus === 'SUCESSO';

  const isGoogleDriveEnabled = empresaConfig?.habilitarGoogleDrive !== false;
  const isAutoBackupEnabled = empresaConfig?.backupAutoDriveEnabled !== false;
  const isConnected = empresaConfig?.googleAccount?.isConnected === true;
  const token = typeof window !== 'undefined' ? localStorage.getItem('google_access_token') : null;

  let lastFormattedTime: string | null = null;
  if (lastTime) {
    try {
      lastFormattedTime = new Date(lastTime).toLocaleString('pt-BR');
    } catch (_) {
      lastFormattedTime = lastTime;
    }
  } else if (lastItem?.timestamp) {
    lastFormattedTime = new Date(lastItem.timestamp).toLocaleString('pt-BR');
  }

  return {
    lastDate,
    lastStatus,
    lastTime,
    lastFormattedTime,
    lastItem,
    isRunToday,
    isGoogleDriveEnabled,
    isAutoBackupEnabled,
    isConnected,
    hasToken: Boolean(token)
  };
}

/**
 * Checks if the daily automatic backup has run today, and triggers it if pending (or forced manually)
 */
export async function checkAndRunDailyAutoBackup(
  empresaConfig?: EmpresaConfig,
  force: boolean = false
): Promise<{ ran: boolean; success: boolean; message: string; dateTodayStr: string }> {
  const tenantId = getActiveTenantId();
  const isGoogleDriveEnabled = empresaConfig?.habilitarGoogleDrive !== false;
  const isAutoBackupEnabled = empresaConfig?.backupAutoDriveEnabled !== false;
  const isConnected = empresaConfig?.googleAccount?.isConnected === true;
  const token = typeof window !== 'undefined' ? localStorage.getItem('google_access_token') : null;
  const dateTodayStr = new Date().toISOString().slice(0, 10);

  if (!isGoogleDriveEnabled || !isAutoBackupEnabled || !isConnected || !token) {
    const missingReason = !isGoogleDriveEnabled
      ? 'Módulo do Google Drive está desativado nas configurações'
      : !isAutoBackupEnabled
      ? 'Rotina de Backup Automático Diário está desativada'
      : !isConnected
      ? 'Conta do Google Drive não está conectada'
      : 'Sessão do Google Drive expirada (token ausente)';

    return {
      ran: false,
      success: false,
      message: `Rotina auto backup pendente: ${missingReason}.`,
      dateTodayStr
    };
  }

  const lastBackupDate = localStorage.getItem(`acervus_last_auto_drive_backup_date_${tenantId}`);
  const lastBackupStatus = localStorage.getItem(`acervus_last_auto_drive_backup_status_${tenantId}`);

  if (force || lastBackupDate !== dateTodayStr || lastBackupStatus !== 'SUCESSO') {
    console.log(`[AutoBackup] Executando rotina de backup diário automático para o tenant ${tenantId} (hoje: ${dateTodayStr}, forçado: ${force})...`);
    const res = await performGoogleDriveBackup(empresaConfig, force ? 'MANUAL' : 'AUTOMATICO_DIARIO');
    return {
      ran: true,
      success: res.success,
      message: res.message,
      dateTodayStr
    };
  }

  return {
    ran: false,
    success: true,
    message: `O backup diário automático do dia de hoje (${dateTodayStr}) já foi executado com sucesso.`,
    dateTodayStr
  };
}
