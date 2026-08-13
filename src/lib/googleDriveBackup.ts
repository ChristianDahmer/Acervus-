import { getLocalCollection, getActiveTenantId } from './firebaseSync';
import { uploadFileToGoogleDrive, getAccessToken } from './googleWorkspace';
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
  const now = new Date();
  const dateTodayStr = now.toISOString().slice(0, 10); // YYYY-MM-DD

  try {
    let token = await getAccessToken();
    if (!token) {
      token = localStorage.getItem('google_access_token');
    }

    if (!token) {
      const errMessage = 'A conta do Google Drive não está conectada. Faça login na aba Integrações para autorizar o backup automático.';
      saveBackupHistoryItem({
        id: `bkp_${Date.now()}`,
        timestamp: Date.now(),
        dateStr: dateTodayStr,
        fileName: `backup_acervus_${tenantId}_${dateTodayStr}.json`,
        status: 'ERRO',
        recordCount: 0,
        details: errMessage,
        triggerType
      }, tenantId);
      return { success: false, message: errMessage };
    }

    // Generate full database backup payload
    const backupPayload = generateDatabaseBackupPayload(tenantId, empresaConfig);
    const jsonString = JSON.stringify(backupPayload, null, 2);
    const timeFormatted = `${now.getHours().toString().padStart(2, '0')}${now.getMinutes().toString().padStart(2, '0')}`;
    const fileName = `backup_acervus_core_${tenantId}_${dateTodayStr}_${timeFormatted}.json`;
    const folderPath = empresaConfig?.googleAccount?.driveFolderPath || '/Bora Festar Locações/Backups';

    const result = await uploadFileToGoogleDrive(
      token,
      fileName,
      jsonString,
      'application/json',
      folderPath
    );

    const successMessage = `Backup ${triggerType === 'AUTOMATICO_DIARIO' ? 'automático diário' : 'manual'} salvo no Google Drive com sucesso (${backupPayload.metadata.totalRecords} registros).`;

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
      triggerType
    }, tenantId);

    return {
      success: true,
      message: successMessage,
      fileInfo: result
    };
  } catch (error: any) {
    const errText = error.message || 'Erro ao enviar backup para o Google Drive.';
    console.error('[GoogleDriveBackup] Error during backup execution:', error);

    saveBackupHistoryItem({
      id: `bkp_${Date.now()}`,
      timestamp: Date.now(),
      dateStr: dateTodayStr,
      fileName: `backup_acervus_${tenantId}_${dateTodayStr}.json`,
      status: 'ERRO',
      recordCount: 0,
      details: errText,
      triggerType
    }, tenantId);

    return { success: false, message: `Falha no backup: ${errText}` };
  }
}

/**
 * Checks if the daily automatic backup has run today, and triggers it if pending
 */
export async function checkAndRunDailyAutoBackup(
  empresaConfig?: EmpresaConfig
): Promise<void> {
  const tenantId = getActiveTenantId();
  const isGoogleDriveEnabled = empresaConfig?.habilitarGoogleDrive !== false;
  const isAutoBackupEnabled = empresaConfig?.backupAutoDriveEnabled !== false;

  if (!isGoogleDriveEnabled || !isAutoBackupEnabled) {
    return;
  }

  const dateTodayStr = new Date().toISOString().slice(0, 10);
  const lastBackupDate = localStorage.getItem(`acervus_last_auto_drive_backup_date_${tenantId}`);

  if (lastBackupDate !== dateTodayStr) {
    console.log(`[AutoBackup] Executando rotina de backup diário automático para o tenant ${tenantId} (${dateTodayStr})...`);
    await performGoogleDriveBackup(empresaConfig, 'AUTOMATICO_DIARIO');
  }
}
