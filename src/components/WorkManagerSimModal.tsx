import React, { useState } from 'react';
import { FormularioWeb } from '../types';
import { Cpu, RefreshCw, CheckCircle, Database, MessageSquare, ShieldCheck, Terminal, HardDrive, Smartphone, SlidersHorizontal } from 'lucide-react';
import { performGoogleDriveBackup } from '../lib/googleDriveBackup';

interface WorkManagerSimProps {
  webForms: FormularioWeb[];
  onTriggerWorkerSync: () => void;
  hideHeader?: boolean;
}

export interface SyncConfig {
  sincronizadorGeral: boolean;
  pedidosWeb: boolean;
  notificacoesWhatsapp: boolean;
  cloudFirestore: boolean;
  validacaoImei: boolean;
  backupGoogleDrive: boolean;
  intervaloMinutos: number;
}

export const WorkManagerSimModal: React.FC<WorkManagerSimProps> = ({ webForms, onTriggerWorkerSync, hideHeader = false }) => {
  const [syncConfig, setSyncConfig] = useState<SyncConfig>({
    sincronizadorGeral: true,
    pedidosWeb: true,
    notificacoesWhatsapp: true,
    cloudFirestore: true,
    validacaoImei: true,
    backupGoogleDrive: false,
    intervaloMinutos: 15,
  });

  const [logs, setLogs] = useState<string[]>([
    '[INÍCIO] Módulo de Sincronização e Worker ativado.',
    '[CONFIGURAÇÃO] Opções de sincronização personalizadas carregadas com sucesso.',
    '[CONEXÃO] Verificação de conectividade com a internet: OK.',
  ]);
  const [isSyncing, setIsSyncing] = useState(false);

  const pendingForms = webForms.filter((f) => f.respondido);

  const toggleOption = (key: keyof Omit<SyncConfig, 'intervaloMinutos'>) => {
    setSyncConfig((prev) => {
      const updated = { ...prev, [key]: !prev[key] };
      const statusText = updated[key] ? 'ATIVADO' : 'DESATIVADO';
      setLogs((l) => [
        ...l,
        `[CONFIG] Opção '${key}' alterada para: ${statusText} pelo usuário.`,
      ]);
      return updated;
    });
  };

  const handleToggleAll = (enable: boolean) => {
    setSyncConfig({
      sincronizadorGeral: enable,
      pedidosWeb: enable,
      notificacoesWhatsapp: enable,
      cloudFirestore: enable,
      validacaoImei: enable,
      backupGoogleDrive: enable,
      intervaloMinutos: syncConfig.intervaloMinutos,
    });
    setLogs((l) => [
      ...l,
      `[CONFIG] Todas as opções de sincronização foram ${enable ? 'ATIVADAS' : 'DESATIVADAS'}.`,
    ]);
  };

  const handleRunSync = () => {
    if (!syncConfig.sincronizadorGeral) {
      setLogs((l) => [
        ...l,
        `[${new Date().toLocaleTimeString()}] ⚠️ Sincronizador Geral está DESATIVADO. Habilite a opção para iniciar o processamento.`,
      ]);
      return;
    }

    setIsSyncing(true);
    const newLogs = [...logs];
    newLogs.push(`[${new Date().toLocaleTimeString()}] Sincronização manual iniciada pelo usuário...`);

    // 1. Pedidos Web
    if (syncConfig.pedidosWeb) {
      newLogs.push(`[WEB] Processando fila de orçamentos web -> ${pendingForms.length} formulários pendentes.`);
      if (pendingForms.length > 0) {
        pendingForms.forEach((f) => {
          newLogs.push(`[SISTEMA] Efetuando reserva do orçamento ID #${f.id} no estoque.`);
        });
      }
    } else {
      newLogs.push(`[PULADO] Sincronização de Pedidos Web está DESATIVADA.`);
    }

    // 2. WhatsApp
    if (syncConfig.notificacoesWhatsapp) {
      if (pendingForms.length > 0 && syncConfig.pedidosWeb) {
        pendingForms.forEach((f) => {
          newLogs.push(`[WHATSAPP] Notificação de confirmação enviada para ${f.resposta?.clienteTelefone || 'Cliente'}.`);
        });
      } else {
        newLogs.push(`[WHATSAPP] Serviço pronto. Nenhuma notificação pendente.`);
      }
    } else {
      newLogs.push(`[PULADO] Envio de Notificações WhatsApp está DESATIVADO.`);
    }

    // 3. Cloud Firestore
    if (syncConfig.cloudFirestore) {
      newLogs.push(`[FIRESTORE] Dados do acervo e reservas sincronizados com a nuvem.`);
    } else {
      newLogs.push(`[PULADO] Sincronização em Tempo Real Firestore está DESATIVADA.`);
    }

    // 4. Validação IMEI
    if (syncConfig.validacaoImei) {
      newLogs.push(`[SEGURANÇA] Dispositivos autorizados e IMEI de hardware validados.`);
    } else {
      newLogs.push(`[PULADO] Validação de IMEI e Aparelhos está DESATIVADA.`);
    }

    // 5. Google Drive Backup
    if (syncConfig.backupGoogleDrive) {
      newLogs.push(`[DRIVE] Iniciando envio de cópia de segurança para o Google Drive...`);
      performGoogleDriveBackup(undefined, 'MANUAL')
        .then((res) => {
          setLogs((prev) => [
            ...prev,
            res.success
              ? `[DRIVE SUCESSO] ${res.message}`
              : `[DRIVE AVISO] ${res.message}`
          ]);
        })
        .catch((err) => {
          setLogs((prev) => [
            ...prev,
            `[DRIVE ERRO] Falha no envio para o Google Drive: ${err.message}`
          ]);
        });
    } else {
      newLogs.push(`[PULADO] Backup no Google Drive está DESATIVADO.`);
    }

    setLogs(newLogs);

    setTimeout(() => {
      onTriggerWorkerSync();
      setIsSyncing(false);
    }, 1200);
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      {!hideHeader ? (
        <div className="bg-[#111113] p-5 rounded-2xl border border-[#27272A] flex flex-col md:flex-row justify-between items-start md:items-center gap-4 shadow-xl">
          <div>
            <div className="flex items-center space-x-2 text-[#D4AF37] text-xs font-bold uppercase tracking-wider mb-1">
              <Cpu size={16} /> Módulo de Sincronização Corporativa
            </div>
            <h2 className="text-xl font-serif italic text-white flex items-center gap-2">
              Central de Sincronização & Worker
            </h2>
            <p className="text-[#A1A1AA] text-xs mt-0.5">
              Ative ou desative individualmente as opções de sincronização utilizando os seletores e checkboxes abaixo.
            </p>
          </div>

          <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
            <button
              onClick={() => handleToggleAll(true)}
              className="px-3 py-1.5 bg-[#18181B] border border-[#27272A] hover:border-[#D4AF37]/50 rounded-lg text-[11px] font-semibold text-white transition-all cursor-pointer"
            >
              Ativar Todos
            </button>
            <button
              onClick={() => handleToggleAll(false)}
              className="px-3 py-1.5 bg-[#18181B] border border-[#27272A] hover:border-red-500/50 rounded-lg text-[11px] font-semibold text-[#A1A1AA] hover:text-white transition-all cursor-pointer"
            >
              Desativar Todos
            </button>
            <button
              onClick={handleRunSync}
              disabled={isSyncing || !syncConfig.sincronizadorGeral}
              className="flex items-center gap-2 bg-[#D4AF37] hover:bg-[#E5C158] disabled:opacity-40 text-[#0A0A0B] px-4 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider shadow-lg shadow-[#D4AF37]/10 transition-all cursor-pointer"
            >
              <RefreshCw size={15} className={isSyncing ? 'animate-spin' : ''} />
              <span>{isSyncing ? 'Sincronizando...' : 'Executar Sincronização'}</span>
            </button>
          </div>
        </div>
      ) : (
        <div className="flex items-center justify-end gap-2 flex-wrap sm:flex-nowrap">
          <button
            onClick={() => handleToggleAll(true)}
            className="px-3 py-1.5 bg-[#18181B] border border-[#27272A] hover:border-[#D4AF37]/50 rounded-lg text-[11px] font-semibold text-white transition-all cursor-pointer"
          >
            Ativar Todos
          </button>
          <button
            onClick={() => handleToggleAll(false)}
            className="px-3 py-1.5 bg-[#18181B] border border-[#27272A] hover:border-red-500/50 rounded-lg text-[11px] font-semibold text-[#A1A1AA] hover:text-white transition-all cursor-pointer"
          >
            Desativar Todos
          </button>
          <button
            onClick={handleRunSync}
            disabled={isSyncing || !syncConfig.sincronizadorGeral}
            className="flex items-center gap-2 bg-[#D4AF37] hover:bg-[#E5C158] disabled:opacity-40 text-[#0A0A0B] px-4 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider shadow-lg shadow-[#D4AF37]/10 transition-all cursor-pointer"
          >
            <RefreshCw size={15} className={isSyncing ? 'animate-spin' : ''} />
            <span>{isSyncing ? 'Sincronizando...' : 'Executar Sincronização'}</span>
          </button>
        </div>
      )}

      {/* Interval & Master Settings Bar */}
      <div className="bg-[#111113] border border-[#27272A] p-4 rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-3 text-xs text-white">
          <SlidersHorizontal size={16} className="text-[#D4AF37]" />
          <span className="font-semibold">Frequência do Ciclo Automático:</span>
          <select
            value={syncConfig.intervaloMinutos}
            onChange={(e) => setSyncConfig({ ...syncConfig, intervaloMinutos: Number(e.target.value) })}
            className="bg-[#18181B] border border-[#27272A] text-[#D4AF37] font-mono text-xs px-3 py-1.5 rounded-lg focus:outline-none focus:border-[#D4AF37]"
          >
            <option value={5}>A cada 5 Minutos (Alta Prioridade)</option>
            <option value={15}>A cada 15 Minutos (Recomendado)</option>
            <option value={30}>A cada 30 Minutos</option>
            <option value={60}>A cada 1 Hora</option>
            <option value={0}>Somente Manual (Desativar Ciclo)</option>
          </select>
        </div>

        <div className="flex items-center gap-2 text-xs">
          <span className="text-[#A1A1AA]">Status do Worker:</span>
          <span
            className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase font-mono border ${
              syncConfig.sincronizadorGeral
                ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                : 'bg-red-500/10 text-red-400 border-red-500/30'
            }`}
          >
            {syncConfig.sincronizadorGeral ? 'Worker Operacional' : 'Worker Pausado'}
          </span>
        </div>
      </div>

      {/* SYNC OPTIONS WITH CHECKBOXES */}
      <div className="space-y-3">
        <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
          <SlidersHorizontal size={14} className="text-[#D4AF37]" /> Opções de Sincronização (Marque/Desmarque para Ativar ou Desativar)
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          
          {/* Option 1: WorkManager Background Sync */}
          <div
            onClick={() => toggleOption('sincronizadorGeral')}
            className={`p-4 rounded-2xl border transition-all cursor-pointer flex flex-col justify-between space-y-3 ${
              syncConfig.sincronizadorGeral
                ? 'bg-[#111113] border-[#D4AF37]/60 shadow-lg'
                : 'bg-[#111113]/60 border-[#27272A] opacity-75 hover:opacity-100'
            }`}
          >
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-2.5">
                <div className={`p-2 rounded-xl ${syncConfig.sincronizadorGeral ? 'bg-[#D4AF37]/10 text-[#D4AF37]' : 'bg-[#27272A] text-[#71717A]'}`}>
                  <ShieldCheck size={18} />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-white">Sincronizador Geral</h4>
                  <p className="text-[10px] text-[#A1A1AA]">Worker em Segundo Plano</p>
                </div>
              </div>

              {/* Interactive Checkbox */}
              <input
                type="checkbox"
                checked={syncConfig.sincronizadorGeral}
                onChange={() => {}}
                className="w-5 h-5 accent-[#D4AF37] rounded cursor-pointer"
              />
            </div>

            <p className="text-[11px] text-[#71717A] leading-relaxed">
              Ciclo periódico de sincronização automática executado a cada {syncConfig.intervaloMinutos || 15} minutos.
            </p>

            <div className="flex items-center justify-between text-[10px] font-mono border-t border-[#27272A] pt-2 mt-1">
              <span className="text-[#A1A1AA]">Estado:</span>
              <span className={syncConfig.sincronizadorGeral ? 'text-emerald-400 font-bold' : 'text-red-400 font-bold'}>
                {syncConfig.sincronizadorGeral ? 'ATIVADO' : 'DESATIVADO'}
              </span>
            </div>
          </div>

          {/* Option 2: Pedidos Web */}
          <div
            onClick={() => toggleOption('pedidosWeb')}
            className={`p-4 rounded-2xl border transition-all cursor-pointer flex flex-col justify-between space-y-3 ${
              syncConfig.pedidosWeb
                ? 'bg-[#111113] border-[#D4AF37]/60 shadow-lg'
                : 'bg-[#111113]/60 border-[#27272A] opacity-75 hover:opacity-100'
            }`}
          >
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-2.5">
                <div className={`p-2 rounded-xl ${syncConfig.pedidosWeb ? 'bg-[#D4AF37]/10 text-[#D4AF37]' : 'bg-[#27272A] text-[#71717A]'}`}>
                  <Database size={18} />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-white">Pedidos do Site Web</h4>
                  <p className="text-[10px] text-[#A1A1AA]">{pendingForms.length} pendentes na fila</p>
                </div>
              </div>

              {/* Interactive Checkbox */}
              <input
                type="checkbox"
                checked={syncConfig.pedidosWeb}
                onChange={() => {}}
                className="w-5 h-5 accent-[#D4AF37] rounded cursor-pointer"
              />
            </div>

            <p className="text-[11px] text-[#71717A] leading-relaxed">
              Baixa automaticamente orçamentos recebidos pelo site e efetua reserva no estoque.
            </p>

            <div className="flex items-center justify-between text-[10px] font-mono border-t border-[#27272A] pt-2 mt-1">
              <span className="text-[#A1A1AA]">Estado:</span>
              <span className={syncConfig.pedidosWeb ? 'text-emerald-400 font-bold' : 'text-red-400 font-bold'}>
                {syncConfig.pedidosWeb ? 'ATIVADO' : 'DESATIVADO'}
              </span>
            </div>
          </div>

          {/* Option 3: Notificações WhatsApp */}
          <div
            onClick={() => toggleOption('notificacoesWhatsapp')}
            className={`p-4 rounded-2xl border transition-all cursor-pointer flex flex-col justify-between space-y-3 ${
              syncConfig.notificacoesWhatsapp
                ? 'bg-[#111113] border-[#D4AF37]/60 shadow-lg'
                : 'bg-[#111113]/60 border-[#27272A] opacity-75 hover:opacity-100'
            }`}
          >
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-2.5">
                <div className={`p-2 rounded-xl ${syncConfig.notificacoesWhatsapp ? 'bg-emerald-500/10 text-emerald-400' : 'bg-[#27272A] text-[#71717A]'}`}>
                  <MessageSquare size={18} />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-white">Notificações WhatsApp</h4>
                  <p className="text-[10px] text-[#A1A1AA]">Confirmações para clientes</p>
                </div>
              </div>

              {/* Interactive Checkbox */}
              <input
                type="checkbox"
                checked={syncConfig.notificacoesWhatsapp}
                onChange={() => {}}
                className="w-5 h-5 accent-[#D4AF37] rounded cursor-pointer"
              />
            </div>

            <p className="text-[11px] text-[#71717A] leading-relaxed">
              Dispara mensagens automáticas pelo WhatsApp assim que o orçamento for processado.
            </p>

            <div className="flex items-center justify-between text-[10px] font-mono border-t border-[#27272A] pt-2 mt-1">
              <span className="text-[#A1A1AA]">Estado:</span>
              <span className={syncConfig.notificacoesWhatsapp ? 'text-emerald-400 font-bold' : 'text-red-400 font-bold'}>
                {syncConfig.notificacoesWhatsapp ? 'ATIVADO' : 'DESATIVADO'}
              </span>
            </div>
          </div>

          {/* Option 4: Cloud Firestore */}
          <div
            onClick={() => toggleOption('cloudFirestore')}
            className={`p-4 rounded-2xl border transition-all cursor-pointer flex flex-col justify-between space-y-3 ${
              syncConfig.cloudFirestore
                ? 'bg-[#111113] border-[#D4AF37]/60 shadow-lg'
                : 'bg-[#111113]/60 border-[#27272A] opacity-75 hover:opacity-100'
            }`}
          >
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-2.5">
                <div className={`p-2 rounded-xl ${syncConfig.cloudFirestore ? 'bg-[#D4AF37]/10 text-[#D4AF37]' : 'bg-[#27272A] text-[#71717A]'}`}>
                  <Database size={18} />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-white">Sincronização Cloud Firestore</h4>
                  <p className="text-[10px] text-[#A1A1AA]">Banco de Dados em Tempo Real</p>
                </div>
              </div>

              {/* Interactive Checkbox */}
              <input
                type="checkbox"
                checked={syncConfig.cloudFirestore}
                onChange={() => {}}
                className="w-5 h-5 accent-[#D4AF37] rounded cursor-pointer"
              />
            </div>

            <p className="text-[11px] text-[#71717A] leading-relaxed">
              Sincroniza alterações do acervo, estoque e reservas instantaneamente na nuvem.
            </p>

            <div className="flex items-center justify-between text-[10px] font-mono border-t border-[#27272A] pt-2 mt-1">
              <span className="text-[#A1A1AA]">Estado:</span>
              <span className={syncConfig.cloudFirestore ? 'text-emerald-400 font-bold' : 'text-red-400 font-bold'}>
                {syncConfig.cloudFirestore ? 'ATIVADO' : 'DESATIVADO'}
              </span>
            </div>
          </div>

          {/* Option 5: Dispositivos & IMEI */}
          <div
            onClick={() => toggleOption('validacaoImei')}
            className={`p-4 rounded-2xl border transition-all cursor-pointer flex flex-col justify-between space-y-3 ${
              syncConfig.validacaoImei
                ? 'bg-[#111113] border-[#D4AF37]/60 shadow-lg'
                : 'bg-[#111113]/60 border-[#27272A] opacity-75 hover:opacity-100'
            }`}
          >
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-2.5">
                <div className={`p-2 rounded-xl ${syncConfig.validacaoImei ? 'bg-[#D4AF37]/10 text-[#D4AF37]' : 'bg-[#27272A] text-[#71717A]'}`}>
                  <Smartphone size={18} />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-white">Validação IMEI & Dispositivos</h4>
                  <p className="text-[10px] text-[#A1A1AA]">Segurança de Hardware</p>
                </div>
              </div>

              {/* Interactive Checkbox */}
              <input
                type="checkbox"
                checked={syncConfig.validacaoImei}
                onChange={() => {}}
                className="w-5 h-5 accent-[#D4AF37] rounded cursor-pointer"
              />
            </div>

            <p className="text-[11px] text-[#71717A] leading-relaxed">
              Verifica se o IMEI e CNPJ do celular pertencem a um terminal autorizado.
            </p>

            <div className="flex items-center justify-between text-[10px] font-mono border-t border-[#27272A] pt-2 mt-1">
              <span className="text-[#A1A1AA]">Estado:</span>
              <span className={syncConfig.validacaoImei ? 'text-emerald-400 font-bold' : 'text-red-400 font-bold'}>
                {syncConfig.validacaoImei ? 'ATIVADO' : 'DESATIVADO'}
              </span>
            </div>
          </div>

          {/* Option 6: Backup Google Drive */}
          <div
            onClick={() => toggleOption('backupGoogleDrive')}
            className={`p-4 rounded-2xl border transition-all cursor-pointer flex flex-col justify-between space-y-3 ${
              syncConfig.backupGoogleDrive
                ? 'bg-[#111113] border-[#D4AF37]/60 shadow-lg'
                : 'bg-[#111113]/60 border-[#27272A] opacity-75 hover:opacity-100'
            }`}
          >
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-2.5">
                <div className={`p-2 rounded-xl ${syncConfig.backupGoogleDrive ? 'bg-[#D4AF37]/10 text-[#D4AF37]' : 'bg-[#27272A] text-[#71717A]'}`}>
                  <HardDrive size={18} />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-white">Backup no Google Drive</h4>
                  <p className="text-[10px] text-[#A1A1AA]">Cópia Externa da Base</p>
                </div>
              </div>

              {/* Interactive Checkbox */}
              <input
                type="checkbox"
                checked={syncConfig.backupGoogleDrive}
                onChange={() => {}}
                className="w-5 h-5 accent-[#D4AF37] rounded cursor-pointer"
              />
            </div>

            <p className="text-[11px] text-[#71717A] leading-relaxed">
              Envia relatórios gerados e backup de segurança diretamente para a pasta do Google Drive.
            </p>

            <div className="flex items-center justify-between text-[10px] font-mono border-t border-[#27272A] pt-2 mt-1">
              <span className="text-[#A1A1AA]">Estado:</span>
              <span className={syncConfig.backupGoogleDrive ? 'text-emerald-400 font-bold' : 'text-red-400 font-bold'}>
                {syncConfig.backupGoogleDrive ? 'ATIVADO' : 'DESATIVADO'}
              </span>
            </div>
          </div>

        </div>
      </div>

      {/* Log Terminal */}
      <div className="bg-[#0A0A0B] border border-[#27272A] rounded-2xl p-5 shadow-2xl space-y-3 font-mono">
        <div className="flex items-center justify-between text-xs border-b border-[#27272A] pb-2 text-[#71717A]">
          <span className="flex items-center gap-2">
            <Terminal size={14} className="text-[#D4AF37]" /> Log de Eventos do Sincronizador
          </span>
          <span className="text-emerald-400 flex items-center gap-1">
            <CheckCircle size={12} /> {syncConfig.sincronizadorGeral ? 'Monitoramento Ativo' : 'Pausado'}
          </span>
        </div>

        <div className="bg-[#111113] rounded-xl p-4 text-xs text-[#E4E4E7] space-y-1.5 h-64 overflow-y-auto custom-scrollbar border border-[#27272A]">
          {logs.map((log, idx) => (
            <div key={idx} className="leading-relaxed">
              <span className="text-[#D4AF37]">[Sistema]:</span> {log}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

