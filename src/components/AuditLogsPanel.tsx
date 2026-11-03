import React, { useState, useEffect, useMemo } from 'react';
import { 
  ShieldCheck, 
  Trash2, 
  Edit2, 
  Plus, 
  Search, 
  RefreshCw, 
  FileJson, 
  AlertTriangle, 
  Activity, 
  Terminal, 
  Filter, 
  Download, 
  CheckCircle, 
  Eye, 
  Clock, 
  Building2, 
  Server, 
  X, 
  Zap, 
  Copy, 
  Check,
  Crown,
  RotateCcw,
  Undo2
} from 'lucide-react';
import { 
  AuditLogItem, 
  fetchAuditLogs, 
  recordAuditEvent, 
  clearAuditLogsRemote, 
  getActiveTenantId,
  saveDocument 
} from '../lib/firebaseSync';

interface AuditLogsPanelProps {
  tenantId?: string;
  onRefreshParentData?: () => void;
}

export const AuditLogsPanel: React.FC<AuditLogsPanelProps> = ({ tenantId, onRefreshParentData }) => {
  const activeTenant = tenantId || getActiveTenantId();
  const [logs, setLogs] = useState<AuditLogItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [selectedCategory, setSelectedCategory] = useState<string>('TODOS');
  const [selectedTenantFilter, setSelectedTenantFilter] = useState<string>('GLOBAL');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [selectedLog, setSelectedLog] = useState<AuditLogItem | null>(null);
  const [showClearConfirm, setShowClearConfirm] = useState<boolean>(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [customTestDetails, setCustomTestDetails] = useState<string>('');
  const [isRegisteringTest, setIsRegisteringTest] = useState<boolean>(false);

  // States para Restauração de Registro
  const [restoringLog, setRestoringLog] = useState<AuditLogItem | null>(null);
  const [restorePayloadJson, setRestorePayloadJson] = useState<string>('');
  const [isRestoring, setIsRestoring] = useState<boolean>(false);
  const [restoreNotice, setRestoreNotice] = useState<string | null>(null);

  const loadLogs = async () => {
    setLoading(true);
    try {
      const data = await fetchAuditLogs(selectedTenantFilter, selectedCategory);
      setLogs(data);
    } catch (err) {
      console.error('Erro ao carregar logs de auditoria:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenRestore = (log: AuditLogItem) => {
    let payload = log.previousValue || log.newValue || null;
    if (!payload && log.details) {
      try {
        const match = log.details.match(/\{[\s\S]*\}/);
        if (match) payload = JSON.parse(match[0]);
      } catch (_) {}
    }

    if (!payload) {
      payload = {
        id: log.documentId || `restored_${Date.now()}`,
        tenantId: log.tenantId || activeTenant,
        status: 'RESTAURADO_AUTOMATICO',
        descricao: log.details || 'Registro restaurado a partir do log de auditoria'
      };
    }

    setRestoringLog(log);
    setRestorePayloadJson(JSON.stringify(payload, null, 2));
  };

  const handleConfirmRestore = async () => {
    if (!restoringLog) return;
    setIsRestoring(true);
    try {
      const parsedPayload = JSON.parse(restorePayloadJson);
      const docId = parsedPayload.id || restoringLog.documentId || Date.now();
      const colName = restoringLog.tableOrCollection || 'itens';

      await saveDocument(colName, docId, parsedPayload);

      await recordAuditEvent({
        action: 'RESTAURACAO_REGISTRO',
        category: 'CREATE',
        tableOrCollection: colName,
        documentId: String(docId),
        tenantId: restoringLog.tenantId || activeTenant,
        userEmail: 'desenvolvedor@acervus.app',
        userName: 'Desenvolvedor Master',
        details: `Registro #${docId} restaurado com sucesso a partir do Log de Auditoria #${restoringLog.id}`,
        newValue: parsedPayload,
        status: 'SUCCESS'
      });

      setRestoreNotice(`Registro #${docId} na tabela '${colName}' restaurado com sucesso no banco de dados!`);
      if (onRefreshParentData) onRefreshParentData();
      await loadLogs();
      setRestoringLog(null);
      setSelectedLog(null);
      setTimeout(() => setRestoreNotice(null), 5000);
    } catch (err: any) {
      alert(`Erro ao restaurar registro: ${err.message || 'Verifique a estrutura do JSON'}`);
    } finally {
      setIsRestoring(false);
    }
  };

  useEffect(() => {
    loadLogs();
  }, [selectedCategory, selectedTenantFilter]);

  // Detected Tenants in logs
  const detectedTenants = useMemo(() => {
    const setT = new Set<string>();
    logs.forEach(l => {
      if (l.tenantId && l.tenantId !== 'GLOBAL') {
        setT.add(l.tenantId);
      }
    });
    return Array.from(setT);
  }, [logs]);

  // Filtered Logs
  const filteredLogs = useMemo(() => {
    return logs.filter(log => {
      // Category filter
      if (selectedCategory !== 'TODOS' && log.category !== selectedCategory) {
        return false;
      }
      // Tenant filter
      if (selectedTenantFilter !== 'GLOBAL') {
        const cleanFilter = selectedTenantFilter.replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
        const cleanLogTenant = (log.tenantId || '').replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
        if (cleanLogTenant !== cleanFilter && log.tenantId !== selectedTenantFilter && log.tenantId !== 'GLOBAL') {
          return false;
        }
      }
      // Search term
      if (searchTerm.trim() !== '') {
        const term = searchTerm.toLowerCase();
        const matchAction = log.action.toLowerCase().includes(term);
        const matchTable = log.tableOrCollection.toLowerCase().includes(term);
        const matchDetails = (log.details || '').toLowerCase().includes(term);
        const matchId = (log.documentId || '').toLowerCase().includes(term);
        const matchUser = (log.userEmail || '').toLowerCase().includes(term);
        return matchAction || matchTable || matchDetails || matchId || matchUser;
      }
      return true;
    });
  }, [logs, selectedCategory, selectedTenantFilter, searchTerm]);

  // Statistics
  const stats = useMemo(() => {
    const total = logs.length;
    const deletes = logs.filter(l => l.category === 'DELETE').length;
    const wipes = logs.filter(l => l.category === 'WIPE').length;
    const edits = logs.filter(l => l.category === 'EDIT' || l.category === 'CREATE').length;
    const sqls = logs.filter(l => l.category === 'SQL_EXEC').length;
    return { total, deletes, wipes, edits, sqls };
  }, [logs]);

  const handleClearLogs = async () => {
    await clearAuditLogsRemote();
    setShowClearConfirm(false);
    await loadLogs();
  };

  const handleCopyJson = (log: AuditLogItem) => {
    navigator.clipboard.writeText(JSON.stringify(log, null, 2));
    setCopiedId(log.id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleCreateTestLog = async () => {
    if (!customTestDetails.trim()) return;
    setIsRegisteringTest(true);
    await recordAuditEvent({
      action: 'TESTE_AUDITORIA_MANUAL',
      category: 'SECURITY',
      tableOrCollection: 'AUDIT_TESTS',
      details: customTestDetails,
      tenantId: activeTenant,
      userEmail: 'desenvolvedor@acervus.app',
      userName: 'Desenvolvedor Master',
      status: 'SUCCESS'
    });
    setCustomTestDetails('');
    setIsRegisteringTest(false);
    await loadLogs();
  };

  const handleExportJson = () => {
    const blob = new Blob([JSON.stringify(filteredLogs, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `audit_logs_${activeTenant}_${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
  };

  const handleExportCsv = () => {
    const headers = ['ID', 'Data/Hora', 'Ação', 'Categoria', 'Tabela', 'Doc ID', 'Tenant', 'Usuário', 'Detalhes', 'Status'];
    const rows = filteredLogs.map(l => [
      l.id,
      new Date(l.timestamp).toLocaleString('pt-BR'),
      `"${l.action.replace(/"/g, '""')}"`,
      l.category,
      l.tableOrCollection,
      l.documentId || '',
      l.tenantId || 'GLOBAL',
      l.userEmail || '',
      `"${(l.details || '').replace(/"/g, '""')}"`,
      l.status
    ]);
    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `audit_logs_${activeTenant}_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const getCategoryBadge = (category: string) => {
    switch (category) {
      case 'DELETE':
        return (
          <span className="px-2.5 py-1 rounded-full text-[10px] font-black bg-red-950/80 text-red-400 border border-red-800/60 flex items-center gap-1 w-fit">
            <Trash2 size={11} /> EXCLUSÃO
          </span>
        );
      case 'WIPE':
        return (
          <span className="px-2.5 py-1 rounded-full text-[10px] font-black bg-purple-950/90 text-purple-300 border border-purple-600/80 shadow-md shadow-purple-950/50 flex items-center gap-1 w-fit animate-pulse">
            <AlertTriangle size={11} /> PURGA / WIPE
          </span>
        );
      case 'EDIT':
        return (
          <span className="px-2.5 py-1 rounded-full text-[10px] font-black bg-amber-950/80 text-amber-400 border border-amber-800/60 flex items-center gap-1 w-fit">
            <Edit2 size={11} /> EDIÇÃO
          </span>
        );
      case 'CREATE':
        return (
          <span className="px-2.5 py-1 rounded-full text-[10px] font-black bg-emerald-950/80 text-emerald-400 border border-emerald-800/60 flex items-center gap-1 w-fit">
            <Plus size={11} /> CRIAÇÃO
          </span>
        );
      case 'SQL_EXEC':
        return (
          <span className="px-2.5 py-1 rounded-full text-[10px] font-black bg-blue-950/80 text-blue-400 border border-blue-800/60 flex items-center gap-1 w-fit">
            <Terminal size={11} /> CONSOLE SQL
          </span>
        );
      case 'SECURITY':
      default:
        return (
          <span className="px-2.5 py-1 rounded-full text-[10px] font-black bg-cyan-950/80 text-cyan-400 border border-cyan-800/60 flex items-center gap-1 w-fit">
            <ShieldCheck size={11} /> SEGURANÇA
          </span>
        );
    }
  };

  return (
    <div className="space-y-5 animate-fadeIn">
      {/* Restore Success Notice Banner */}
      {restoreNotice && (
        <div className="p-4 bg-emerald-950/90 border border-emerald-500/50 rounded-2xl flex items-center justify-between text-emerald-300 text-xs font-bold shadow-xl animate-fadeIn">
          <div className="flex items-center gap-2.5">
            <CheckCircle className="text-emerald-400 shrink-0" size={18} />
            <span>{restoreNotice}</span>
          </div>
          <button type="button" onClick={() => setRestoreNotice(null)} className="text-emerald-400 hover:text-white">
            <X size={16} />
          </button>
        </div>
      )}

      {/* Top Banner Header */}
      <div className="bg-[#111113] border border-[#27272A] rounded-2xl p-5 shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-amber-500/5 rounded-full blur-3xl pointer-events-none" />
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 relative z-10">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-[#D4AF37]/10 border border-[#D4AF37]/30 rounded-2xl text-[#D4AF37]">
              <ShieldCheck size={28} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-black text-white tracking-wide">
                  Histórico de Logs de Auditoria do Banco de Dados
                </h2>
                <span className="px-2 py-0.5 rounded-full bg-[#D4AF37]/20 text-[#D4AF37] border border-[#D4AF37]/40 text-[10px] font-bold">
                  Rastreabilidade Total
                </span>
              </div>
              <p className="text-xs text-[#A1A1AA] mt-0.5">
                Rastreamento em tempo real de exclusões, edições, comandos SQL e purgas críticas no banco de dados.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={loadLogs}
              disabled={loading}
              className="px-3.5 py-2 bg-[#18181B] hover:bg-[#27272A] border border-[#27272A] text-white rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer shadow-md disabled:opacity-50"
            >
              <RefreshCw size={14} className={loading ? 'animate-spin text-[#D4AF37]' : ''} />
              <span>Atualizar</span>
            </button>

            <button
              type="button"
              onClick={handleExportJson}
              disabled={filteredLogs.length === 0}
              className="px-3 py-2 bg-[#18181B] hover:bg-[#27272A] border border-[#27272A] text-emerald-400 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-md disabled:opacity-50"
            >
              <Download size={14} />
              <span>JSON</span>
            </button>

            <button
              type="button"
              onClick={handleExportCsv}
              disabled={filteredLogs.length === 0}
              className="px-3 py-2 bg-[#18181B] hover:bg-[#27272A] border border-[#27272A] text-cyan-400 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-md disabled:opacity-50"
            >
              <Download size={14} />
              <span>CSV</span>
            </button>

            <button
              type="button"
              onClick={() => setShowClearConfirm(true)}
              className="px-3.5 py-2 bg-red-950/60 hover:bg-red-900/80 border border-red-800/60 text-red-300 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-md"
            >
              <Trash2 size={14} />
              <span>Zerar Histórico</span>
            </button>
          </div>
        </div>

        {/* Metrics Bar */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mt-5 pt-4 border-t border-[#27272A]">
          <div className="bg-[#18181B] border border-[#27272A] p-3 rounded-xl">
            <div className="text-[10px] font-mono text-[#A1A1AA] uppercase">Total de Eventos</div>
            <div className="text-xl font-black text-white mt-1">{stats.total}</div>
          </div>
          <div className="bg-red-950/30 border border-red-900/50 p-3 rounded-xl">
            <div className="text-[10px] font-mono text-red-400 uppercase flex items-center gap-1">
              <Trash2 size={10} /> Exclusões
            </div>
            <div className="text-xl font-black text-red-300 mt-1">{stats.deletes}</div>
          </div>
          <div className="bg-purple-950/30 border border-purple-900/50 p-3 rounded-xl">
            <div className="text-[10px] font-mono text-purple-400 uppercase flex items-center gap-1">
              <AlertTriangle size={10} /> Purgas (Wipe)
            </div>
            <div className="text-xl font-black text-purple-300 mt-1">{stats.wipes}</div>
          </div>
          <div className="bg-amber-950/30 border border-amber-900/50 p-3 rounded-xl">
            <div className="text-[10px] font-mono text-amber-400 uppercase flex items-center gap-1">
              <Edit2 size={10} /> Edições / Salves
            </div>
            <div className="text-xl font-black text-amber-300 mt-1">{stats.edits}</div>
          </div>
          <div className="bg-blue-950/30 border border-blue-900/50 p-3 rounded-xl">
            <div className="text-[10px] font-mono text-blue-400 uppercase flex items-center gap-1">
              <Terminal size={10} /> Console SQL
            </div>
            <div className="text-xl font-black text-blue-300 mt-1">{stats.sqls}</div>
          </div>
        </div>
      </div>

      {/* Manual Test Event Trigger */}
      <div className="bg-[#111113] border border-[#27272A] rounded-2xl p-4 flex flex-col md:flex-row items-center gap-3">
        <div className="flex items-center gap-2 text-xs font-bold text-[#D4AF37] whitespace-nowrap">
          <Zap size={15} />
          <span>Registrar Teste de Auditoria:</span>
        </div>
        <input
          type="text"
          value={customTestDetails}
          onChange={(e) => setCustomTestDetails(e.target.value)}
          placeholder="Ex: Teste manual de auditoria para simular erro de sincronização..."
          className="flex-1 bg-[#18181B] border border-[#27272A] text-xs text-white rounded-xl px-3 py-2 focus:outline-none focus:border-[#D4AF37]"
        />
        <button
          type="button"
          onClick={handleCreateTestLog}
          disabled={!customTestDetails.trim() || isRegisteringTest}
          className="px-4 py-2 bg-[#D4AF37] text-black font-extrabold rounded-xl text-xs hover:bg-[#b89628] transition-all cursor-pointer shadow-md disabled:opacity-50 whitespace-nowrap"
        >
          {isRegisteringTest ? 'Gravando...' : 'Gravar Log de Teste'}
        </button>
      </div>

      {/* Filter & Search Bar */}
      <div className="bg-[#111113] border border-[#27272A] rounded-2xl p-4 space-y-3">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          {/* Category Filter Pills */}
          <div className="flex flex-wrap items-center gap-1.5">
            {[
              { id: 'TODOS', label: 'Todos' },
              { id: 'DELETE', label: 'Exclusões' },
              { id: 'WIPE', label: 'Purgas (Wipe)' },
              { id: 'EDIT', label: 'Edições' },
              { id: 'CREATE', label: 'Criações' },
              { id: 'SQL_EXEC', label: 'Console SQL' },
              { id: 'SECURITY', label: 'Segurança' }
            ].map(cat => (
              <button
                key={cat.id}
                type="button"
                onClick={() => setSelectedCategory(cat.id)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  selectedCategory === cat.id
                    ? 'bg-[#D4AF37] text-black shadow-md'
                    : 'bg-[#18181B] text-[#A1A1AA] hover:text-white border border-[#27272A]'
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>

          {/* Tenant Selector */}
          {detectedTenants.length > 0 && (
            <div className="flex items-center gap-2">
              <Building2 size={14} className="text-[#D4AF37]" />
              <select
                value={selectedTenantFilter}
                onChange={(e) => setSelectedTenantFilter(e.target.value)}
                className="bg-[#18181B] border border-[#27272A] text-xs text-white rounded-xl px-3 py-1.5 focus:outline-none focus:border-[#D4AF37]"
              >
                <option value="GLOBAL">Todos os Tenants (Visão Global)</option>
                {detectedTenants.map(t => (
                  <option key={t} value={t}>Tenant CNPJ #{t}</option>
                ))}
              </select>
            </div>
          )}
        </div>

        {/* Search Field */}
        <div className="relative">
          <Search size={16} className="absolute left-3.5 top-2.5 text-[#71717A]" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Buscar evento por ação, tabela, detalhes, ID de documento ou usuário..."
            className="w-full bg-[#18181B] border border-[#27272A] text-xs text-white pl-10 pr-4 py-2 rounded-xl focus:outline-none focus:border-[#D4AF37]"
          />
        </div>
      </div>

      {/* Logs Table / List */}
      <div className="bg-[#111113] border border-[#27272A] rounded-2xl overflow-hidden shadow-2xl">
        {loading ? (
          <div className="p-12 text-center text-[#A1A1AA] space-y-3">
            <RefreshCw size={28} className="animate-spin mx-auto text-[#D4AF37]" />
            <p className="text-xs font-bold">Buscando histórico de auditoria no PostgreSQL...</p>
          </div>
        ) : filteredLogs.length === 0 ? (
          <div className="p-12 text-center text-[#71717A] space-y-3">
            <FileJson size={36} className="mx-auto opacity-40 text-[#D4AF37]" />
            <p className="text-xs font-semibold text-[#A1A1AA]">Nenhum registro de auditoria encontrado com os filtros selecionados.</p>
            {searchTerm || selectedCategory !== 'TODOS' || selectedTenantFilter !== 'GLOBAL' ? (
              <button
                type="button"
                onClick={() => {
                  setSearchTerm('');
                  setSelectedCategory('TODOS');
                  setSelectedTenantFilter('GLOBAL');
                }}
                className="px-3 py-1.5 bg-[#D4AF37] text-black rounded-xl text-xs font-bold hover:bg-[#b89628] transition-all cursor-pointer shadow-md"
              >
                Limpar Filtros e Exibir Todos os Eventos
              </button>
            ) : null}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-[#18181B] border-b border-[#27272A] text-[11px] font-mono text-[#A1A1AA] uppercase">
                  <th className="p-3">Data / Hora</th>
                  <th className="p-3">Categoria</th>
                  <th className="p-3">Ação Realizada</th>
                  <th className="p-3">Tabela / Alvo</th>
                  <th className="p-3">Doc ID</th>
                  <th className="p-3">Empresa / Tenant</th>
                  <th className="p-3">Usuário</th>
                  <th className="p-3 text-right">Inspecionar</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#27272A] text-xs">
                {filteredLogs.map(log => (
                  <tr key={log.id} className="hover:bg-[#18181B]/60 transition-colors">
                    <td className="p-3 font-mono text-[#A1A1AA] whitespace-nowrap">
                      {new Date(log.timestamp).toLocaleString('pt-BR')}
                    </td>
                    <td className="p-3 whitespace-nowrap">
                      {getCategoryBadge(log.category)}
                    </td>
                    <td className="p-3 font-bold text-white max-w-xs truncate">
                      {log.action}
                    </td>
                    <td className="p-3 font-mono text-[#D4AF37]">
                      {log.tableOrCollection}
                    </td>
                    <td className="p-3 font-mono text-[#A1A1AA]">
                      {log.documentId || '-'}
                    </td>
                    <td className="p-3 font-mono text-[#A1A1AA] whitespace-nowrap">
                      {log.tenantId && log.tenantId !== 'GLOBAL' ? log.tenantId : 'GLOBAL'}
                    </td>
                    <td className="p-3 text-[#A1A1AA] truncate max-w-[120px]">
                      {log.userEmail || log.userName || 'Sistema'}
                    </td>
                    <td className="p-3 text-right whitespace-nowrap space-x-1.5">
                      <button
                        type="button"
                        onClick={() => handleOpenRestore(log)}
                        className="p-1.5 bg-emerald-950/80 hover:bg-emerald-900 text-emerald-300 border border-emerald-800/60 rounded-lg transition-all cursor-pointer inline-flex items-center gap-1 text-[11px] font-bold"
                        title="Restaurar Registro com Base no Log"
                      >
                        <RotateCcw size={12} />
                        <span>Restaurar</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setSelectedLog(log)}
                        className="p-1.5 bg-[#27272A] hover:bg-[#3F3F46] text-white rounded-lg transition-all cursor-pointer inline-flex items-center gap-1 text-[11px] font-bold"
                        title="Ver Detalhes do Payload"
                      >
                        <Eye size={13} />
                        <span>Ver</span>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Inspect Log Modal */}
      {selectedLog && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#111113] border border-[#27272A] rounded-2xl w-full max-w-2xl max-h-[85vh] flex flex-col shadow-2xl overflow-hidden animate-fadeIn">
            <div className="p-4 border-b border-[#27272A] flex items-center justify-between bg-[#18181B]">
              <div className="flex items-center gap-2">
                <ShieldCheck size={20} className="text-[#D4AF37]" />
                <h3 className="font-bold text-white text-sm">Detalhes do Evento de Auditoria</h3>
              </div>
              <button
                type="button"
                onClick={() => setSelectedLog(null)}
                className="p-1 text-[#A1A1AA] hover:text-white rounded-lg hover:bg-[#27272A]"
              >
                <X size={18} />
              </button>
            </div>

            <div className="p-5 space-y-4 overflow-y-auto font-mono text-xs text-[#A1A1AA]">
              <div className="grid grid-cols-2 gap-3 bg-[#18181B] p-3 rounded-xl border border-[#27272A]">
                <div>
                  <span className="text-[10px] text-[#71717A] uppercase block">ID do Log</span>
                  <span className="text-white font-bold">{selectedLog.id}</span>
                </div>
                <div>
                  <span className="text-[10px] text-[#71717A] uppercase block">Data e Hora</span>
                  <span className="text-white font-bold">{new Date(selectedLog.timestamp).toLocaleString('pt-BR')}</span>
                </div>
                <div>
                  <span className="text-[10px] text-[#71717A] uppercase block">Ação</span>
                  <span className="text-[#D4AF37] font-bold">{selectedLog.action}</span>
                </div>
                <div>
                  <span className="text-[10px] text-[#71717A] uppercase block">Categoria</span>
                  {getCategoryBadge(selectedLog.category)}
                </div>
                <div>
                  <span className="text-[10px] text-[#71717A] uppercase block">Tabela / Coleção</span>
                  <span className="text-white font-bold">{selectedLog.tableOrCollection}</span>
                </div>
                <div>
                  <span className="text-[10px] text-[#71717A] uppercase block">Doc ID</span>
                  <span className="text-white font-bold">{selectedLog.documentId || 'N/A'}</span>
                </div>
              </div>

              <div>
                <span className="text-[10px] text-[#71717A] uppercase block mb-1">Descrição / Detalhes</span>
                <div className="bg-[#18181B] p-3 rounded-xl border border-[#27272A] text-white">
                  {selectedLog.details || 'Nenhum detalhe adicional fornecido.'}
                </div>
              </div>

              <div>
                <span className="text-[10px] text-[#71717A] uppercase block mb-1">Payload JSON Completo</span>
                <pre className="bg-black/80 p-3 rounded-xl border border-[#27272A] text-[11px] text-emerald-400 overflow-x-auto">
                  {JSON.stringify(selectedLog, null, 2)}
                </pre>
              </div>
            </div>

            <div className="p-4 border-t border-[#27272A] bg-[#18181B] flex justify-between items-center gap-2">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleCopyJson(selectedLog)}
                  className="px-3 py-2 bg-[#27272A] text-white rounded-xl text-xs font-bold hover:bg-[#3F3F46] flex items-center gap-1.5"
                >
                  {copiedId === selectedLog.id ? <Check size={14} className="text-emerald-400" /> : <Copy size={14} />}
                  <span>{copiedId === selectedLog.id ? 'Copiado!' : 'Copiar JSON'}</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const logToRestore = selectedLog;
                    setSelectedLog(null);
                    handleOpenRestore(logToRestore);
                  }}
                  className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-lg shadow-emerald-950"
                >
                  <RotateCcw size={14} />
                  <span>Restaurar Registro</span>
                </button>
              </div>

              <button
                type="button"
                onClick={() => setSelectedLog(null)}
                className="px-4 py-2 bg-[#D4AF37] text-black font-extrabold rounded-xl text-xs hover:bg-[#b89628]"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* RESTORE RECORD CONFIRMATION MODAL */}
      {restoringLog && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#111113] border border-emerald-500/40 rounded-2xl max-w-xl w-full p-6 space-y-4 shadow-2xl animate-fadeIn">
            <div className="flex items-start justify-between border-b border-[#27272A] pb-3">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 rounded-xl">
                  <RotateCcw size={22} />
                </div>
                <div>
                  <h3 className="font-bold text-white text-sm">Restaurar Registro a Partir da Auditoria</h3>
                  <p className="text-xs text-[#A1A1AA]">
                    Recuperação e gravação do snapshot original da tabela <span className="font-mono text-emerald-300 font-bold">'{restoringLog.tableOrCollection}'</span>.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setRestoringLog(null)}
                className="text-[#71717A] hover:text-white p-1 rounded-lg"
              >
                <X size={18} />
              </button>
            </div>

            <div className="bg-[#0A0A0B] border border-[#27272A] p-3.5 rounded-xl space-y-2 font-mono text-xs">
              <div className="flex justify-between items-center text-[11px] pb-1 border-b border-[#27272A]">
                <span className="text-[#71717A]">Tabela / Coleção Alvo:</span>
                <span className="font-bold text-[#D4AF37]">{restoringLog.tableOrCollection}</span>
              </div>
              <div className="flex justify-between items-center text-[11px] pb-1 border-b border-[#27272A]">
                <span className="text-[#71717A]">ID do Documento:</span>
                <span className="font-bold text-white">#{restoringLog.documentId || 'Novo'}</span>
              </div>
              <div className="flex justify-between items-center text-[11px]">
                <span className="text-[#71717A]">Empresa / Tenant CNPJ:</span>
                <span className="text-cyan-400">{restoringLog.tenantId || activeTenant}</span>
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] font-mono text-[#71717A] uppercase block">
                Payload do Registro a Restaurar (JSON Editável):
              </label>
              <textarea
                rows={10}
                value={restorePayloadJson}
                onChange={(e) => setRestorePayloadJson(e.target.value)}
                className="w-full bg-[#0A0A0B] border border-[#27272A] text-emerald-400 font-mono text-xs p-3.5 rounded-xl focus:border-emerald-500 focus:outline-none leading-relaxed"
              />
            </div>

            <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl flex items-center gap-2 text-[11px] text-emerald-300">
              <CheckCircle size={16} className="shrink-0 text-emerald-400" />
              <span>O registro será reinserido na coleção do banco de dados e notificado aos módulos do sistema.</span>
            </div>

            <div className="flex justify-end gap-2.5 pt-2 border-t border-[#27272A]">
              <button
                type="button"
                disabled={isRestoring}
                onClick={() => setRestoringLog(null)}
                className="px-4 py-2 bg-[#18181B] hover:bg-[#27272A] text-[#A1A1AA] hover:text-white text-xs font-bold rounded-xl cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={isRestoring}
                onClick={handleConfirmRestore}
                className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-xl cursor-pointer flex items-center gap-2 shadow-lg shadow-emerald-900/40 transition-all disabled:opacity-50"
              >
                {isRestoring ? (
                  <>
                    <RefreshCw size={14} className="animate-spin" />
                    <span>Restaurando...</span>
                  </>
                ) : (
                  <>
                    <RotateCcw size={14} />
                    <span>Confirmar Restauração</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Clear Confirmation Modal */}
      {showClearConfirm && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#111113] border border-red-900/60 rounded-2xl p-6 max-w-md w-full space-y-4 shadow-2xl animate-fadeIn text-center">
            <div className="w-12 h-12 rounded-full bg-red-950/80 border border-red-800/80 text-red-400 flex items-center justify-center mx-auto">
              <AlertTriangle size={24} />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">Zerar Histórico de Auditoria?</h3>
              <p className="text-xs text-[#A1A1AA] mt-1">
                Esta ação apagará permanentemente todos os registros de auditoria gravados na memória e no banco PostgreSQL.
              </p>
            </div>
            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowClearConfirm(false)}
                className="flex-1 py-2.5 bg-[#27272A] text-white font-bold rounded-xl text-xs hover:bg-[#3F3F46]"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleClearLogs}
                className="flex-1 py-2.5 bg-red-600 hover:bg-red-700 text-white font-extrabold rounded-xl text-xs shadow-lg shadow-red-950"
              >
                Confirmar Limpeza
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
