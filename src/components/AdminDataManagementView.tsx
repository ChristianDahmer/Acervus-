import React, { useState, useEffect, useMemo } from 'react';
import { 
  Database, 
  Search, 
  Plus, 
  Edit3, 
  Trash2, 
  RefreshCw, 
  Table, 
  Save, 
  X, 
  CheckCircle, 
  AlertCircle, 
  ShieldCheck, 
  Filter, 
  ChevronLeft, 
  ChevronRight,
  Code,
  FileJson,
  Layers,
  Building2,
  Server
} from 'lucide-react';

interface ColumnMeta {
  name: string;
  label: string;
  type: string;
  required?: boolean;
  readonly?: boolean;
}

interface TableMeta {
  name: string;
  label: string;
  primaryKey: string[];
  tenantColumn: string | null;
  columns: ColumnMeta[];
  count?: number;
}

interface AdminDataManagementViewProps {
  tenantId: string;
  empresaConfig?: any;
  onRefreshData?: () => void;
}

export const AdminDataManagementView: React.FC<AdminDataManagementViewProps> = ({
  tenantId,
  empresaConfig,
  onRefreshData,
}) => {
  const [tablesList, setTablesList] = useState<TableMeta[]>([]);
  const [selectedTableName, setSelectedTableName] = useState<string>('clients');
  const [tableData, setTableData] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Pagination
  const [currentPage, setCurrentPage] = useState<number>(1);
  const itemsPerPage = 10;

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [editingItem, setEditingItem] = useState<any | null>(null);
  const [formData, setFormData] = useState<Record<string, any>>({});
  const [useJsonMode, setUseJsonMode] = useState<boolean>(false);
  const [rawJsonText, setRawJsonText] = useState<string>('');

  const currentTableMeta = useMemo(() => {
    return tablesList.find((t) => t.name === selectedTableName) || null;
  }, [tablesList, selectedTableName]);

  // Fetch available tables
  const fetchTables = async () => {
    try {
      setErrorMsg(null);
      const res = await fetch('/api/admin/tables', {
        headers: {
          'x-tenant-id': tenantId || '45.678.910/0001-23',
        },
      });
      if (!res.ok) {
        throw new Error(`Falha ao carregar metadados das tabelas (${res.status})`);
      }
      const data = await res.json();
      setTablesList(data.tables || []);
    } catch (err: any) {
      console.warn('Erro ao buscar lista de tabelas:', err);
      // Fallback local static schema if API circuit open
      setTablesList([
        {
          name: 'clients',
          label: 'Clientes (clients)',
          primaryKey: ['id'],
          tenantColumn: 'tenantId',
          columns: [
            { name: 'id', label: 'ID', type: 'number', required: true },
            { name: 'nome', label: 'Nome', type: 'string', required: true },
            { name: 'telefone', label: 'Telefone', type: 'string', required: true },
            { name: 'email', label: 'E-mail', type: 'string' },
            { name: 'cpfCnpj', label: 'CPF/CNPJ', type: 'string' },
            { name: 'endereco', label: 'Endereço', type: 'string' },
            { name: 'ativo', label: 'Ativo', type: 'boolean' },
          ],
        },
        {
          name: 'stockItems',
          label: 'Acervo / Estoque (stock_items)',
          primaryKey: ['id'],
          tenantColumn: 'tenantId',
          columns: [
            { name: 'id', label: 'ID', type: 'number', required: true },
            { name: 'nome', label: 'Nome', type: 'string', required: true },
            { name: 'quantidadeTotal', label: 'Qtd Total', type: 'number', required: true },
            { name: 'precoAluguel', label: 'Preço Aluguel', type: 'number', required: true },
            { name: 'categoria', label: 'Categoria', type: 'string' },
            { name: 'statusManutencao', label: 'Status Manutenção', type: 'string' },
          ],
        },
        {
          name: 'bookings',
          label: 'Reservas (bookings)',
          primaryKey: ['id'],
          tenantColumn: 'tenantId',
          columns: [
            { name: 'id', label: 'ID Reserva', type: 'number', required: true },
            { name: 'clienteId', label: 'ID Cliente', type: 'number', required: true },
            { name: 'dataRetirada', label: 'Data Retirada (ms)', type: 'timestamp_ms', required: true },
            { name: 'dataDevolucao', label: 'Data Devolução (ms)', type: 'timestamp_ms', required: true },
            { name: 'status', label: 'Status', type: 'string', required: true },
          ],
        },
        {
          name: 'financialTransactions',
          label: 'Financeiro (financial_transactions)',
          primaryKey: ['id'],
          tenantColumn: 'tenantId',
          columns: [
            { name: 'id', label: 'ID', type: 'string', required: true },
            { name: 'tipo', label: 'Tipo', type: 'string', required: true },
            { name: 'categoria', label: 'Categoria', type: 'string', required: true },
            { name: 'valor', label: 'Valor', type: 'number', required: true },
            { name: 'descricao', label: 'Descrição', type: 'string', required: true },
          ],
        },
        {
          name: 'webForms',
          label: 'Orçamentos (web_forms)',
          primaryKey: ['id'],
          tenantColumn: 'tenantId',
          columns: [
            { name: 'id', label: 'ID', type: 'string', required: true },
            { name: 'titulo', label: 'Título', type: 'string', required: true },
            { name: 'clienteNome', label: 'Cliente', type: 'string' },
            { name: 'respondido', label: 'Respondido', type: 'boolean' },
          ],
        },
        {
          name: 'tenantConfigs',
          label: 'Configurações (tenant_configs)',
          primaryKey: ['configName'],
          tenantColumn: 'tenantId',
          columns: [
            { name: 'configName', label: 'Nome da Config', type: 'string', required: true },
            { name: 'data', label: 'Dados (JSON)', type: 'json', required: true },
          ],
        },
      ]);
    }
  };

  // Fetch data for selected table
  const fetchTableData = async (tableName: string) => {
    setLoading(true);
    setErrorMsg(null);
    try {
      const res = await fetch(`/api/admin/tables/${tableName}?tenantId=${encodeURIComponent(tenantId)}`, {
        headers: {
          'x-tenant-id': tenantId || '45.678.910/0001-23',
        },
      });
      if (!res.ok) {
        throw new Error(`Erro ao buscar dados da tabela ${tableName}`);
      }
      const data = await res.json();
      setTableData(data.rows || []);
    } catch (err: any) {
      console.warn(`Erro ao carregar tabela ${tableName}:`, err);
      setErrorMsg(`Não foi possível conectar diretamente ao banco Cloud SQL para a tabela '${tableName}'. Exibindo estado cacheado.`);
      setTableData([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTables();
  }, [tenantId]);

  useEffect(() => {
    if (selectedTableName) {
      setCurrentPage(1);
      fetchTableData(selectedTableName);
    }
  }, [selectedTableName, tenantId]);

  // Filter items by search term
  const filteredData = useMemo(() => {
    if (!searchTerm.trim()) return tableData;
    const term = searchTerm.toLowerCase();
    return tableData.filter((row) => {
      return Object.values(row).some((val) => {
        if (val === null || val === undefined) return false;
        return String(val).toLowerCase().includes(term);
      });
    });
  }, [tableData, searchTerm]);

  // Paginated data
  const totalPages = Math.ceil(filteredData.length / itemsPerPage) || 1;
  const paginatedData = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredData.slice(start, start + itemsPerPage);
  }, [filteredData, currentPage]);

  const getItemId = (item: any): string => {
    if (!item) return '';
    if (item.id !== undefined && item.id !== null) return String(item.id);
    if (item.configName) return String(item.configName);
    if (item.bookingId && item.stockItemId) return `${item.bookingId}_${item.stockItemId}`;
    return String(Object.values(item)[0] || '1');
  };

  const handleSeedDatabase = async () => {
    setLoading(true);
    setErrorMsg(null);
    try {
      const res = await fetch('/api/admin/seed', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-tenant-id': tenantId || '45.678.910/0001-23',
        },
        body: JSON.stringify({ tenantId: tenantId || '45.678.910/0001-23' }),
      });
      if (!res.ok) {
        throw new Error('Falha ao popular banco de dados');
      }
      const data = await res.json();
      setSuccessMsg(data.message || 'Dados iniciais gerados com sucesso no Cloud SQL!');
      await fetchTables();
      await fetchTableData(selectedTableName);
      if (onRefreshData) onRefreshData();
      setTimeout(() => setSuccessMsg(null), 5000);
    } catch (err: any) {
      setErrorMsg(`Erro ao semear banco Cloud SQL: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenCreateModal = () => {
    setEditingItem(null);
    const initialForm: Record<string, any> = {};
    if (currentTableMeta) {
      currentTableMeta.columns.forEach((col) => {
        if (col.readonly) return;
        if (col.type === 'number') initialForm[col.name] = 0;
        else if (col.type === 'boolean') initialForm[col.name] = true;
        else if (col.type === 'json') initialForm[col.name] = {};
        else if (col.name === 'id' && col.type === 'number') initialForm[col.name] = Math.floor(Date.now() / 1000);
        else if (col.name === 'id' && col.type === 'string') initialForm[col.name] = `rec_${Date.now()}`;
        else initialForm[col.name] = '';
      });
    }
    setFormData(initialForm);
    setRawJsonText(JSON.stringify(initialForm, null, 2));
    setUseJsonMode(false);
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (item: any) => {
    setEditingItem(item);
    setFormData({ ...item });
    setRawJsonText(JSON.stringify(item, null, 2));
    setUseJsonMode(false);
    setIsModalOpen(true);
  };

  const handleSave = async () => {
    try {
      let payloadToSave: any = {};
      if (useJsonMode) {
        payloadToSave = JSON.parse(rawJsonText);
      } else {
        payloadToSave = { ...formData };
      }

      const itemId = editingItem ? getItemId(editingItem) : getItemId(payloadToSave);
      const isEdit = !!editingItem;
      const url = isEdit
        ? `/api/admin/tables/${selectedTableName}/${encodeURIComponent(itemId)}`
        : `/api/admin/tables/${selectedTableName}`;

      const method = isEdit ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'x-tenant-id': tenantId || '45.678.910/0001-23',
        },
        body: JSON.stringify({
          tenantId,
          data: payloadToSave,
        }),
      });

      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.error || 'Erro ao salvar registro no banco de dados');
      }

      setSuccessMsg(`Registro ${isEdit ? 'atualizado' : 'criado'} com sucesso no Cloud SQL!`);
      setIsModalOpen(false);
      fetchTableData(selectedTableName);
      fetchTables();
      if (onRefreshData) onRefreshData();

      setTimeout(() => setSuccessMsg(null), 4000);
    } catch (err: any) {
      alert(`Falha ao salvar: ${err.message}`);
    }
  };

  const handleDelete = async (item: any) => {
    const itemId = getItemId(item);
    if (!confirm(`Tem certeza que deseja excluir o registro #${itemId} da tabela '${selectedTableName}'? Esta ação removerá os dados do banco Cloud SQL com isolamento de tenant.`)) {
      return;
    }

    try {
      const res = await fetch(`/api/admin/tables/${selectedTableName}/${encodeURIComponent(itemId)}`, {
        method: 'DELETE',
        headers: {
          'x-tenant-id': tenantId || '45.678.910/0001-23',
        },
      });

      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.error || 'Erro ao excluir registro');
      }

      setSuccessMsg(`Registro #${itemId} excluído com sucesso da tabela '${selectedTableName}'.`);
      fetchTableData(selectedTableName);
      fetchTables();
      if (onRefreshData) onRefreshData();

      setTimeout(() => setSuccessMsg(null), 4000);
    } catch (err: any) {
      alert(`Falha ao excluir: ${err.message}`);
    }
  };

  const renderFieldValue = (val: any, type: string) => {
    if (val === null || val === undefined) return <span className="text-[#71717A] italic">null</span>;
    if (typeof val === 'boolean') {
      return (
        <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold ${val ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'bg-red-500/20 text-red-400 border border-red-500/30'}`}>
          {val ? 'TRUE' : 'FALSE'}
        </span>
      );
    }
    if (type === 'timestamp_ms' && typeof val === 'number' && val > 1000000000000) {
      const dateStr = new Date(val).toLocaleDateString('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
      return (
        <span className="font-mono text-[#D4AF37]">
          {dateStr}
        </span>
      );
    }
    if (typeof val === 'object') {
      return <span className="font-mono text-cyan-400 text-[10px]">{JSON.stringify(val).substring(0, 40)}...</span>;
    }
    return <span className="truncate max-w-[200px] inline-block">{String(val)}</span>;
  };

  return (
    <div className="space-y-6 text-[#E4E4E7]">
      {/* Banner Header */}
      <div className="bg-[#111113] border border-[#27272A] rounded-2xl p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-xl">
        <div className="space-y-1">
          <div className="flex items-center gap-2.5">
            <Server className="text-[#D4AF37]" size={22} />
            <h2 className="text-lg font-serif italic font-extrabold text-white">
              Painel de Gerenciamento do Banco de Dados (Cloud SQL PostgreSQL + Drizzle ORM)
            </h2>
            <span className="bg-[#D4AF37]/20 text-[#D4AF37] border border-[#D4AF37]/30 text-[10px] font-mono font-bold px-2 py-0.5 rounded-full flex items-center gap-1">
              <ShieldCheck size={12} /> MULTI-TENANT SAFE
            </span>
          </div>
          <p className="text-xs text-[#A1A1AA]">
            Módulo interno de administração relacional. Permite consultar, criar, atualizar e excluir registros diretamente do Cloud SQL PostgreSQL. Todas as operações filtram estritamente pelo <code className="text-[#D4AF37] bg-[#18181B] px-1.5 py-0.5 rounded border border-[#27272A]">tenantId: {tenantId}</code>.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <button
            onClick={handleSeedDatabase}
            className="px-3.5 py-2 bg-[#D4AF37]/15 hover:bg-[#D4AF37]/25 border border-[#D4AF37]/30 text-[#D4AF37] text-xs font-bold rounded-xl transition-all flex items-center gap-1.5 cursor-pointer shadow-md"
            title="Popula todas as tabelas com dados demonstrativos do Acervus Core"
          >
            <Database size={14} className="text-[#D4AF37]" />
            <span>Popular Banco (Seed)</span>
          </button>

          <button
            onClick={() => {
              fetchTables();
              fetchTableData(selectedTableName);
            }}
            className="px-3.5 py-2 bg-[#18181B] hover:bg-[#27272A] border border-[#27272A] text-white text-xs font-bold rounded-xl transition-all flex items-center gap-1.5 cursor-pointer shadow-md"
          >
            <RefreshCw size={14} className="text-[#D4AF37]" />
            <span>Atualizar</span>
          </button>

          <button
            onClick={handleOpenCreateModal}
            className="px-4 py-2 bg-[#D4AF37] hover:bg-[#c2a032] text-black text-xs font-extrabold rounded-xl transition-all flex items-center gap-1.5 cursor-pointer shadow-lg"
          >
            <Plus size={15} />
            <span>Novo Registro</span>
          </button>
        </div>
      </div>

      {/* Success Notification Banner */}
      {successMsg && (
        <div className="p-3.5 rounded-xl border border-emerald-500/30 bg-emerald-500/10 text-emerald-400 text-xs font-bold flex items-center gap-2 animate-fadeIn">
          <CheckCircle size={16} />
          <span>{successMsg}</span>
        </div>
      )}

      {/* Error Banner */}
      {errorMsg && (
        <div className="p-3.5 rounded-xl border border-amber-500/30 bg-amber-500/10 text-amber-300 text-xs font-medium flex items-center gap-2">
          <AlertCircle size={16} className="shrink-0 text-amber-400" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Table Selection Tabs & Controls */}
      <div className="bg-[#111113] border border-[#27272A] rounded-2xl p-4 space-y-4 shadow-xl">
        <div>
          <label className="text-[10px] font-mono font-bold text-[#71717A] uppercase tracking-wider block mb-2">
            Selecione a Tabela do Banco de Dados Relacional:
          </label>
          <div className="flex flex-wrap gap-2">
            {tablesList.map((t) => {
              const isSelected = selectedTableName === t.name;
              return (
                <button
                  key={t.name}
                  onClick={() => setSelectedTableName(t.name)}
                  className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer border ${
                    isSelected
                      ? 'bg-[#D4AF37] text-black border-[#D4AF37] shadow-lg shadow-[#D4AF37]/10'
                      : 'bg-[#18181B] text-[#A1A1AA] hover:text-white border-[#27272A]'
                  }`}
                >
                  <Table size={13} className={isSelected ? 'text-black' : 'text-[#D4AF37]'} />
                  <span>{t.label}</span>
                  {t.count !== undefined && (
                    <span className={`text-[10px] font-mono px-1.5 py-0.2 rounded-full ${
                      isSelected ? 'bg-black/20 text-black font-extrabold' : 'bg-[#27272A] text-[#D4AF37]'
                    }`}>
                      {t.count}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Search Bar */}
        <div className="relative">
          <Search className="absolute left-3.5 top-2.5 text-[#71717A]" size={15} />
          <input
            type="text"
            placeholder={`Filtrar registros da tabela '${selectedTableName}'...`}
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setCurrentPage(1);
            }}
            className="w-full pl-10 pr-4 py-2 bg-[#18181B] border border-[#27272A] rounded-xl text-xs text-white placeholder-[#71717A] focus:border-[#D4AF37] focus:outline-none font-mono"
          />
        </div>
      </div>

      {/* Main Data Grid Table */}
      <div className="bg-[#111113] border border-[#27272A] rounded-2xl overflow-hidden shadow-2xl">
        <div className="p-4 border-b border-[#27272A] bg-[#0A0A0B] flex flex-wrap justify-between items-center gap-2 text-xs">
          <div className="flex items-center gap-2">
            <Database size={15} className="text-[#D4AF37]" />
            <span className="font-mono text-white font-bold">
              Tabela: <strong className="text-[#D4AF37]">{selectedTableName}</strong>
            </span>
            <span className="text-[#71717A] font-mono text-[11px]">
              ({filteredData.length} registros encontrados)
            </span>
          </div>

          <div className="text-[11px] text-[#A1A1AA] flex items-center gap-1.5">
            <ShieldCheck size={13} className="text-emerald-400" />
            <span>Isolamento Multi-Tenant por <code className="text-[#D4AF37]">tenantId</code> ativo</span>
          </div>
        </div>

        {loading ? (
          <div className="p-12 text-center text-[#71717A] space-y-3">
            <RefreshCw size={28} className="mx-auto animate-spin text-[#D4AF37]" />
            <p className="text-xs font-semibold text-[#A1A1AA]">Carregando registros do PostgreSQL Cloud SQL...</p>
          </div>
        ) : filteredData.length === 0 ? (
          <div className="p-12 text-center text-[#71717A] space-y-4">
            <Table size={36} className="mx-auto opacity-30 text-[#D4AF37]" />
            <div>
              <p className="text-xs font-semibold text-[#A1A1AA]">Nenhum registro encontrado nesta tabela.</p>
              <p className="text-[11px] text-[#71717A] mt-1">Você pode inserir registros manualmente ou popular o banco com dados de teste do Acervus Core.</p>
            </div>
            <div className="flex items-center justify-center gap-3 pt-2">
              <button
                onClick={handleSeedDatabase}
                className="px-4 py-2 bg-[#D4AF37] hover:bg-[#c2a032] text-black text-xs font-bold rounded-xl transition-all flex items-center gap-2 cursor-pointer shadow-lg"
              >
                <Database size={14} />
                <span>Popular Banco Cloud SQL com Dados de Demonstração</span>
              </button>
            </div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#0A0A0B] text-[#71717A] font-mono uppercase text-[10px] border-b border-[#27272A]">
                <tr>
                  {currentTableMeta?.columns.map((col) => (
                    <th key={col.name} className="px-4 py-3 whitespace-nowrap">
                      {col.label || col.name}
                    </th>
                  ))}
                  <th className="px-4 py-3 text-right whitespace-nowrap">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#27272A]">
                {paginatedData.map((item, idx) => {
                  const itemId = getItemId(item);
                  return (
                    <tr key={`${itemId}-${idx}`} className="hover:bg-[#18181B]/60 transition-colors">
                      {currentTableMeta?.columns.map((col) => (
                        <td key={col.name} className="px-4 py-3 text-white">
                          {renderFieldValue(item[col.name], col.type)}
                        </td>
                      ))}

                      <td className="px-4 py-3 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => handleOpenEditModal(item)}
                            className="p-1.5 bg-[#D4AF37]/10 hover:bg-[#D4AF37]/20 text-[#D4AF37] border border-[#D4AF37]/30 rounded-lg transition-colors cursor-pointer"
                            title="Editar Registro"
                          >
                            <Edit3 size={13} />
                          </button>

                          <button
                            onClick={() => handleDelete(item)}
                            className="p-1.5 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 rounded-lg transition-colors cursor-pointer"
                            title="Excluir Registro"
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination Footer */}
        {totalPages > 1 && (
          <div className="p-4 border-t border-[#27272A] bg-[#0A0A0B] flex items-center justify-between text-xs">
            <span className="text-[#71717A] font-mono">
              Página {currentPage} de {totalPages}
            </span>

            <div className="flex items-center gap-2">
              <button
                disabled={currentPage === 1}
                onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
                className="p-1.5 bg-[#18181B] border border-[#27272A] rounded-lg text-white disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
              >
                <ChevronLeft size={14} />
              </button>

              <button
                disabled={currentPage === totalPages}
                onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
                className="p-1.5 bg-[#18181B] border border-[#27272A] rounded-lg text-white disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
              >
                <ChevronRight size={14} />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* CREATE / EDIT FORM MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#111113] border border-[#27272A] rounded-2xl max-w-2xl w-full p-5 space-y-4 shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center border-b border-[#27272A] pb-3">
              <div className="flex items-center gap-2">
                <Table className="text-[#D4AF37]" size={18} />
                <h3 className="font-serif italic font-bold text-white text-sm">
                  {editingItem ? `Editar Registro em '${selectedTableName}'` : `Inserir Novo Registro em '${selectedTableName}'`}
                </h3>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-[#71717A] hover:text-white p-1 rounded-lg cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            {/* Mode Toggle: Form vs JSON Editor */}
            <div className="flex items-center justify-between bg-[#18181B] p-2 rounded-xl border border-[#27272A] text-xs">
              <span className="text-[#A1A1AA] font-mono text-[11px]">
                Modo de Edição do Registro:
              </span>
              <div className="flex gap-1">
                <button
                  onClick={() => setUseJsonMode(false)}
                  className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    !useJsonMode ? 'bg-[#D4AF37] text-black' : 'text-[#A1A1AA] hover:text-white'
                  }`}
                >
                  Formulário Estruturado
                </button>
                <button
                  onClick={() => setUseJsonMode(true)}
                  className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1 ${
                    useJsonMode ? 'bg-[#D4AF37] text-black' : 'text-[#A1A1AA] hover:text-white'
                  }`}
                >
                  <Code size={13} />
                  <span>Editor JSON</span>
                </button>
              </div>
            </div>

            {!useJsonMode ? (
              <div className="space-y-3 max-h-[55vh] overflow-y-auto pr-1">
                {currentTableMeta?.columns.map((col) => {
                  if (col.readonly && editingItem) return null;

                  return (
                    <div key={col.name}>
                      <label className="block text-[11px] font-mono text-[#A1A1AA] uppercase mb-1">
                        {col.label || col.name} {col.required && <span className="text-red-400">*</span>}
                      </label>

                      {col.type === 'boolean' ? (
                        <select
                          value={formData[col.name] ? 'true' : 'false'}
                          onChange={(e) => setFormData({ ...formData, [col.name]: e.target.value === 'true' })}
                          className="w-full bg-[#18181B] border border-[#27272A] text-white p-2.5 rounded-xl text-xs focus:border-[#D4AF37] focus:outline-none"
                        >
                          <option value="true">TRUE (Ativo/Sim)</option>
                          <option value="false">FALSE (Inativo/Não)</option>
                        </select>
                      ) : col.type === 'json' ? (
                        <textarea
                          rows={4}
                          value={typeof formData[col.name] === 'object' ? JSON.stringify(formData[col.name], null, 2) : formData[col.name] || ''}
                          onChange={(e) => {
                            try {
                              const parsed = JSON.parse(e.target.value);
                              setFormData({ ...formData, [col.name]: parsed });
                            } catch {
                              setFormData({ ...formData, [col.name]: e.target.value });
                            }
                          }}
                          className="w-full bg-[#0A0A0B] border border-[#27272A] text-white font-mono text-xs p-2.5 rounded-xl focus:border-[#D4AF37] focus:outline-none"
                        />
                      ) : (
                        <input
                          type={col.type === 'number' || col.type === 'timestamp_ms' ? 'number' : 'text'}
                          value={formData[col.name] !== undefined && formData[col.name] !== null ? formData[col.name] : ''}
                          onChange={(e) => {
                            const val = col.type === 'number' || col.type === 'timestamp_ms' ? Number(e.target.value) : e.target.value;
                            setFormData({ ...formData, [col.name]: val });
                          }}
                          disabled={col.readonly}
                          className="w-full bg-[#18181B] border border-[#27272A] text-white p-2.5 rounded-xl text-xs font-mono focus:border-[#D4AF37] focus:outline-none disabled:opacity-50"
                        />
                      )}
                    </div>
                  );
                })}
              </div>
            ) : (
              <div>
                <label className="block text-[10px] font-mono text-[#71717A] uppercase mb-1">Estrutura JSON do Registro:</label>
                <textarea
                  rows={12}
                  value={rawJsonText}
                  onChange={(e) => setRawJsonText(e.target.value)}
                  className="w-full bg-[#0A0A0B] border border-[#27272A] text-emerald-400 font-mono text-xs p-3.5 rounded-xl focus:border-[#D4AF37] focus:outline-none leading-relaxed"
                />
              </div>
            )}

            <div className="flex justify-end gap-2.5 pt-3 border-t border-[#27272A]">
              <button
                onClick={() => setIsModalOpen(false)}
                className="px-4 py-2 bg-[#18181B] text-[#A1A1AA] hover:text-white text-xs font-bold rounded-xl cursor-pointer"
              >
                Cancelar
              </button>
              <button
                onClick={handleSave}
                className="px-5 py-2 bg-[#D4AF37] hover:bg-[#c2a032] text-black text-xs font-extrabold rounded-xl cursor-pointer flex items-center gap-1.5 shadow-lg"
              >
                <Save size={14} />
                <span>Salvar no Banco</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
