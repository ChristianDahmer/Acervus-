import React, { useState, useMemo } from 'react';
import { 
  DollarSign, 
  TrendingUp, 
  TrendingDown, 
  PlusCircle, 
  Search, 
  Filter, 
  Download, 
  Calendar, 
  AlertCircle, 
  CheckCircle2, 
  X, 
  FileSpreadsheet, 
  Printer,
  ChevronRight,
  Sparkles
} from 'lucide-react';
import { TransacaoFinanceira, ReservaComItens, StatusReserva } from '../types';
import { printElementById } from '../utils/printUtils';
import { StandardListControls, StandardPagination, StandardEmptyState } from './StandardListContainer';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer,
  PieChart,
  Cell,
  Pie
} from 'recharts';

interface FinanceiroViewProps {
  transacoes: TransacaoFinanceira[];
  onAddTransacao: (t: Omit<TransacaoFinanceira, 'id'>) => void;
  onUpdateTransacaoStatus: (id: string, status: 'PAGO' | 'PENDENTE') => void;
  onDeleteTransacao: (id: string) => void;
  reservas: ReservaComItens[];
}

export const FinanceiroView: React.FC<FinanceiroViewProps> = ({
  transacoes,
  onAddTransacao,
  onUpdateTransacaoStatus,
  onDeleteTransacao,
  reservas,
}) => {
  // Filter States
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState<'TODOS' | 'RECEITA' | 'DESPESA'>('TODOS');
  const [statusFilter, setStatusFilter] = useState<'TODOS' | 'PAGO' | 'PENDENTE'>('TODOS');
  const [categoryFilter, setCategoryFilter] = useState('Todas');
  
  // Modal States
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [newTransData, setNewTransData] = useState({
    tipo: 'RECEITA' as 'RECEITA' | 'DESPESA',
    categoria: 'Aluguel de Acervo',
    valor: '',
    descricao: '',
    status: 'PAGO' as 'PAGO' | 'PENDENTE',
    data: new Date().toISOString().substring(0, 10),
  });

  // Active Tab: 'transacoes' | 'graficos' | 'relatorios' | 'pendentes_reserva'
  const [activeSubTab, setActiveSubTab] = useState<'transacoes' | 'graficos' | 'relatorios' | 'pendentes_reserva'>('transacoes');

  // Categories list based on transactions
  const availableCategories = useMemo(() => {
    const cats = new Set<string>();
    transacoes.forEach(t => cats.add(t.categoria));
    return ['Todas', ...Array.from(cats)];
  }, [transacoes]);

  // Suggested categories for quick autocomplete
  const suggestedCategories = {
    RECEITA: ['Aluguel de Acervo', 'Serviço de Frete', 'Montagem Cenográfica', 'Multa/Atraso', 'Venda de Balões', 'Outros'],
    DESPESA: ['Manutenção de Itens', 'Insumos', 'Logística', 'Assinaturas', 'Impostos', 'Marketing', 'Aluguel Gp', 'Salários', 'Outros']
  };

  // Synchronize category with type change in modal
  const handleTypeChangeInModal = (tipo: 'RECEITA' | 'DESPESA') => {
    setNewTransData(prev => ({
      ...prev,
      tipo,
      categoria: suggestedCategories[tipo][0]
    }));
  };

  // Submit manual transaction
  const handleSaveTransaction = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTransData.valor || !newTransData.descricao || !newTransData.categoria) return;

    onAddTransacao({
      tipo: newTransData.tipo,
      categoria: newTransData.categoria,
      valor: parseFloat(newTransData.valor),
      data: new Date(newTransData.data).getTime() + (12 * 60 * 60 * 1000), // Meio dia UTC para evitar fuso horário
      descricao: newTransData.descricao,
      status: newTransData.status,
    });

    setIsAddModalOpen(false);
    // Reset form
    setNewTransData({
      tipo: 'RECEITA',
      categoria: 'Aluguel de Acervo',
      valor: '',
      descricao: '',
      status: 'PAGO',
      data: new Date().toISOString().substring(0, 10),
    });
  };

  // KPIs Calculations
  const metrics = useMemo(() => {
    let receitaTotal = 0;
    let despesaTotal = 0;
    let receitaPendente = 0;
    let despesaPendente = 0;

    transacoes.forEach((t) => {
      if (t.tipo === 'RECEITA') {
        if (t.status === 'PAGO') {
          receitaTotal += t.valor;
        } else {
          receitaPendente += t.valor;
        }
      } else if (t.tipo === 'DESPESA') {
        if (t.status === 'PAGO') {
          despesaTotal += t.valor;
        } else {
          despesaPendente += t.valor;
        }
      }
    });

    const saldoLiquido = receitaTotal - despesaTotal;

    return {
      receitaTotal,
      despesaTotal,
      saldoLiquido,
      receitaPendente,
      despesaPendente,
      pendentesCount: transacoes.filter(t => t.status === 'PENDENTE').length
    };
  }, [transacoes]);

  // Chart Data: Grouped by Month/Year
  const monthlyChartData = useMemo(() => {
    const monthsName = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
    const groupings: Record<string, { mesIdx: number; ano: number; receita: number; despesa: number }> = {};

    transacoes.forEach((t) => {
      const date = new Date(t.data);
      const mesIdx = date.getMonth();
      const ano = date.getFullYear();
      const key = `${ano}-${mesIdx}`;

      if (!groupings[key]) {
        groupings[key] = { mesIdx, ano, receita: 0, despesa: 0 };
      }

      if (t.status === 'PAGO') {
        if (t.tipo === 'RECEITA') {
          groupings[key].receita += t.valor;
        } else {
          groupings[key].despesa += t.valor;
        }
      }
    });

    // Convert to sorted array
    return Object.values(groupings)
      .sort((a, b) => (a.ano !== b.ano ? a.ano - b.ano : a.mesIdx - b.mesIdx))
      .map((g) => ({
        name: `${monthsName[g.mesIdx]} ${String(g.ano).substring(2)}`,
        Receitas: g.receita,
        Despesas: g.despesa,
        Lucro: g.receita - g.despesa,
      }));
  }, [transacoes]);

  // Expenses Category breakdown for Pie Chart
  const categoryBreakdownData = useMemo(() => {
    const expensesGroup: Record<string, number> = {};
    let totalExpense = 0;

    transacoes.forEach(t => {
      if (t.tipo === 'DESPESA' && t.status === 'PAGO') {
        expensesGroup[t.categoria] = (expensesGroup[t.categoria] || 0) + t.valor;
        totalExpense += t.valor;
      }
    });

    const COLORS = ['#F59E0B', '#EF4444', '#3B82F6', '#EC4899', '#10B981', '#8B5CF6', '#6B7280'];

    return Object.entries(expensesGroup).map(([name, value], idx) => ({
      name,
      value,
      percentage: totalExpense > 0 ? ((value / totalExpense) * 100).toFixed(1) : '0',
      color: COLORS[idx % COLORS.length]
    }));
  }, [transacoes]);

  // Filtered List
  const filteredTransacoes = useMemo(() => {
    return transacoes.filter((t) => {
      const matchesSearch = t.descricao.toLowerCase().includes(searchTerm.toLowerCase()) || 
                            t.categoria.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesType = typeFilter === 'TODOS' || t.tipo === typeFilter;
      const matchesStatus = statusFilter === 'TODOS' || t.status === statusFilter;
      const matchesCategory = categoryFilter === 'Todas' || t.categoria === categoryFilter;

      return matchesSearch && matchesType && matchesStatus && matchesCategory;
    }).sort((a, b) => b.data - a.data); // Novas transações primeiro
  }, [transacoes, searchTerm, typeFilter, statusFilter, categoryFilter]);

  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  const paginatedTransacoes = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredTransacoes.slice(start, start + itemsPerPage);
  }, [filteredTransacoes, currentPage, itemsPerPage]);

  const totalPages = Math.ceil(filteredTransacoes.length / itemsPerPage);

  // Pending payments from Reservations
  // Reservations with CONFIRMADA status but whose price hasn't been logged or fully recorded as PAGO in transactions
  const unpaidReservas = useMemo(() => {
    return reservas.filter(resComItens => {
      // Check if there is already a transaction for this reservation id
      const hasTransaction = transacoes.some(t => t.referenciaId === String(resComItens.reserva.id) && t.tipo === 'RECEITA');
      // If it is confirmed or in progress but doesn't have a registered revenue transaction or it has status cancelada
      return resComItens.reserva.status !== StatusReserva.CANCELADA && !hasTransaction;
    });
  }, [reservas, transacoes]);

  // Quick record payment from reservation
  const handleQuickRecordPayment = (reservaComItens: ReservaComItens) => {
    onAddTransacao({
      tipo: 'RECEITA',
      categoria: 'Aluguel de Acervo',
      valor: reservaComItens.valorTotal,
      data: Date.now(),
      descricao: `Recebimento Reserva #${reservaComItens.reserva.id} - ${reservaComItens.cliente.nome}`,
      referenciaId: String(reservaComItens.reserva.id),
      status: 'PAGO'
    });
  };

  // Export CSV function (creates actual downloadable CSV file)
  const handleExportCSV = () => {
    const headers = ['ID', 'Data', 'Tipo', 'Categoria', 'Descrição', 'Valor (R$)', 'Status'];
    const rows = filteredTransacoes.map(t => [
      t.id,
      new Date(t.data).toLocaleDateString('pt-BR'),
      t.tipo,
      `"${t.categoria.replace(/"/g, '""')}"`,
      `"${t.descricao.replace(/"/g, '""')}"`,
      t.valor.toFixed(2),
      t.status
    ]);
    const csvContent = 'data:text/csv;charset=utf-8,\uFEFF' + [headers.join(';'), ...rows.map(e => e.join(';'))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `controle_financeiro_${new Date().toISOString().substring(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Print friendly visual stylesheet trigger
  const handlePrint = () => {
    printElementById('printable-area', {
      title: 'Relatório Financeiro e Fechamento de Caixa',
      subtitle: `LocadoraPro - Total Receitas: R$ ${metrics.receitaTotal.toFixed(2)} | Total Despesas: R$ ${metrics.despesaTotal.toFixed(2)}`,
    });
  };

  return (
    <div className="space-y-6 animate-fade-in" id="financeiro-view">
      {/* Title Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-serif text-white font-semibold">Controle Financeiro Integrado</h2>
          <p className="text-[#A1A1AA] text-xs">
            Gerenciamento de fluxo de caixa, receitas de reservas, despesas preventivas e relatórios operacionais.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            type="button"
            onClick={handleExportCSV}
            className="bg-[#18181B] hover:bg-[#27272A] text-white border border-[#27272A] hover:border-[#D4AF37]/50 px-3.5 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider transition-all cursor-pointer flex items-center justify-center gap-2"
            title="Exportar lançamentos filtrados para arquivo CSV"
          >
            <Download size={15} className="text-[#D4AF37]" />
            <span>Exportar CSV</span>
          </button>

          <button
            type="button"
            onClick={handlePrint}
            className="bg-[#18181B] hover:bg-[#27272A] text-white border border-[#27272A] hover:border-[#D4AF37]/50 px-3.5 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider transition-all cursor-pointer flex items-center justify-center gap-2"
            title="Imprimir visualização financeira ou salvar como PDF"
          >
            <Printer size={15} className="text-[#D4AF37]" />
            <span>Imprimir</span>
          </button>

          <button
            type="button"
            onClick={() => setIsAddModalOpen(true)}
            className="bg-[#D4AF37] hover:bg-[#E5C158] text-[#0A0A0B] px-4 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider shadow-lg shadow-[#D4AF37]/10 transition-all cursor-pointer flex items-center justify-center gap-2 active:scale-95"
          >
            <PlusCircle size={15} />
            <span>Lançar Transação</span>
          </button>
        </div>
      </div>

      {/* KPI Totalizers - Single Line Compact Bar */}
      <div className="bg-[#111113] border border-[#27272A] rounded-2xl p-3 flex flex-nowrap overflow-x-auto items-center justify-between gap-2 sm:gap-4 divide-x divide-[#27272A] shadow-xl no-scrollbar">
        {/* Receitas */}
        <div className="flex items-center gap-3 px-3 min-w-[200px] flex-1">
          <div className="p-2 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-emerald-400 shrink-0">
            <TrendingUp size={16} />
          </div>
          <div>
            <span className="text-[10px] uppercase font-bold tracking-wider text-[#71717A] block whitespace-nowrap">Receitas Liquidadas</span>
            <span className="text-sm font-mono font-bold text-emerald-400 leading-tight">
              R$ {metrics.receitaTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
          </div>
        </div>

        {/* Despesas */}
        <div className="flex items-center gap-3 px-3 min-w-[200px] flex-1">
          <div className="p-2 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 shrink-0">
            <TrendingDown size={16} />
          </div>
          <div>
            <span className="text-[10px] uppercase font-bold tracking-wider text-[#71717A] block whitespace-nowrap">Despesas Pagas</span>
            <span className="text-sm font-mono font-bold text-red-400 leading-tight">
              R$ {metrics.despesaTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
          </div>
        </div>

        {/* Saldo Liquido */}
        <div className="flex items-center gap-3 px-3 min-w-[200px] flex-1">
          <div className="p-2 bg-[#D4AF37]/10 border border-[#D4AF37]/20 rounded-xl text-[#D4AF37] shrink-0">
            <DollarSign size={16} />
          </div>
          <div>
            <span className="text-[10px] uppercase font-bold tracking-wider text-[#71717A] block whitespace-nowrap">Saldo Líquido</span>
            <span className={`text-sm font-mono font-bold leading-tight ${metrics.saldoLiquido >= 0 ? 'text-[#D4AF37]' : 'text-red-400'}`}>
              R$ {metrics.saldoLiquido.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
          </div>
        </div>

        {/* Pendencias */}
        <div className="flex items-center gap-3 px-3 min-w-[200px] flex-1">
          <div className="p-2 bg-amber-500/10 border border-amber-500/20 rounded-xl text-amber-400 shrink-0">
            <AlertCircle size={16} />
          </div>
          <div>
            <span className="text-[10px] uppercase font-bold tracking-wider text-[#71717A] block whitespace-nowrap">Pendências</span>
            <span className="text-sm font-mono font-bold text-amber-400 leading-tight">
              {metrics.pendentesCount} Lançamentos
            </span>
          </div>
        </div>
      </div>

      {/* Section SubTabs Navigation */}
      <div className="flex flex-nowrap border-b border-[#27272A] overflow-x-auto no-scrollbar gap-1 pt-1">
        <button
          type="button"
          onClick={() => setActiveSubTab('transacoes')}
          className={`px-4 py-3 text-xs font-bold uppercase tracking-wider transition-all border-b-2 whitespace-nowrap cursor-pointer ${
            activeSubTab === 'transacoes'
              ? 'border-[#D4AF37] text-white bg-[#18181B]/50'
              : 'border-transparent text-[#71717A] hover:text-white hover:bg-[#111113]/50'
          }`}
        >
          Transações Lançadas
        </button>
        <button
          type="button"
          onClick={() => setActiveSubTab('graficos')}
          className={`px-4 py-3 text-xs font-bold uppercase tracking-wider transition-all border-b-2 whitespace-nowrap cursor-pointer ${
            activeSubTab === 'graficos'
              ? 'border-[#D4AF37] text-white bg-[#18181B]/50'
              : 'border-transparent text-[#71717A] hover:text-white hover:bg-[#111113]/50'
          }`}
        >
          Relatório Gráfico
        </button>
        <button
          type="button"
          onClick={() => setActiveSubTab('pendentes_reserva')}
          className={`px-4 py-3 text-xs font-bold uppercase tracking-wider transition-all border-b-2 whitespace-nowrap cursor-pointer relative ${
            activeSubTab === 'pendentes_reserva'
              ? 'border-[#D4AF37] text-white bg-[#18181B]/50'
              : 'border-transparent text-[#71717A] hover:text-white hover:bg-[#111113]/50'
          }`}
        >
          Faturamento de Reservas
          {unpaidReservas.length > 0 && (
            <span className="absolute top-2 right-1 w-2 h-2 rounded-full bg-[#D4AF37]" />
          )}
        </button>
        <button
          type="button"
          onClick={() => setActiveSubTab('relatorios')}
          className={`px-4 py-3 text-xs font-bold uppercase tracking-wider transition-all border-b-2 whitespace-nowrap cursor-pointer ${
            activeSubTab === 'relatorios'
              ? 'border-[#D4AF37] text-white bg-[#18181B]/50'
              : 'border-transparent text-[#71717A] hover:text-white hover:bg-[#111113]/50'
          }`}
        >
          Fechamento Operacional (Imprimir)
        </button>
      </div>

      {/* CONTENT: 1. TRANSACTIONS LIST */}
      {activeSubTab === 'transacoes' && (
        <div className="bg-[#111113] border border-[#27272A] rounded-2xl p-6 space-y-4">
          <StandardListControls
            searchTerm={searchTerm}
            onSearchChange={setSearchTerm}
            searchPlaceholder="Buscar por descrição ou categoria..."
            filterTabs={[
              { id: 'TODOS', label: 'Todas as Transações', count: transacoes.length },
              { id: 'RECEITA', label: 'Receitas', count: transacoes.filter(t => t.tipo === 'RECEITA').length },
              { id: 'DESPESA', label: 'Despesas', count: transacoes.filter(t => t.tipo === 'DESPESA').length },
            ]}
            activeFilterTab={typeFilter}
            onFilterTabChange={(tab) => {
              setTypeFilter(tab as any);
              setCurrentPage(1);
            }}
            currentPage={currentPage}
            totalPages={totalPages}
            totalItems={filteredTransacoes.length}
            itemsPerPage={itemsPerPage}
            onPageChange={setCurrentPage}
            onItemsPerPageChange={setItemsPerPage}
            additionalControls={
              <div className="flex items-center gap-2">
                <select
                  value={statusFilter}
                  onChange={(e) => {
                    setStatusFilter(e.target.value as any);
                    setCurrentPage(1);
                  }}
                  className="bg-[#0A0A0B] border border-[#27272A] text-xs px-3 py-2 rounded-xl text-[#A1A1AA] focus:outline-none focus:border-[#D4AF37]"
                >
                  <option value="TODOS">Todos Status</option>
                  <option value="PAGO">Liquidado</option>
                  <option value="PENDENTE">Pendente</option>
                </select>

                <select
                  value={categoryFilter}
                  onChange={(e) => {
                    setCategoryFilter(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="bg-[#0A0A0B] border border-[#27272A] text-xs px-3 py-2 rounded-xl text-[#A1A1AA] focus:outline-none focus:border-[#D4AF37]"
                >
                  {availableCategories.map(cat => (
                    <option key={cat} value={cat}>{cat === 'Todas' ? 'Todas Categorias' : cat}</option>
                  ))}
                </select>
              </div>
            }
          />

          {/* Transactions Table */}
          <div className="overflow-x-auto border border-[#27272A] rounded-xl">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-[#0A0A0B] border-b border-[#27272A] text-[#71717A] text-[10px] font-bold uppercase tracking-wider">
                  <th className="py-3.5 px-4">Data</th>
                  <th className="py-3.5 px-4">Descrição</th>
                  <th className="py-3.5 px-4">Categoria</th>
                  <th className="py-3.5 px-4">Tipo</th>
                  <th className="py-3.5 px-4">Valor</th>
                  <th className="py-3.5 px-4 text-center">Status</th>
                  <th className="py-3.5 px-4 text-center">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#27272A] text-xs font-medium text-[#E4E4E7]">
                {filteredTransacoes.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-[#71717A] font-medium">
                      Nenhuma transação financeira corresponde aos filtros selecionados.
                    </td>
                  </tr>
                ) : (
                  paginatedTransacoes.map((t) => (
                    <tr key={t.id} className="hover:bg-[#18181B]/35 transition-colors">
                      <td className="py-3.5 px-4 font-mono text-[#71717A]">
                        {new Date(t.data).toLocaleDateString('pt-BR')}
                      </td>
                      <td className="py-3.5 px-4 max-w-xs truncate">
                        <div className="font-semibold text-white">{t.descricao}</div>
                        {t.referenciaId && (
                          <div className="text-[10px] text-[#71717A]">Reserva Ref: #{t.referenciaId}</div>
                        )}
                      </td>
                      <td className="py-3.5 px-4">
                        <span className="bg-[#18181B] border border-[#27272A] px-2.5 py-1 rounded-full text-[10px] text-[#A1A1AA]">
                          {t.categoria}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 font-bold">
                        {t.tipo === 'RECEITA' ? (
                          <span className="text-emerald-400">Entrada</span>
                        ) : (
                          <span className="text-red-400">Saída</span>
                        )}
                      </td>
                      <td className="py-3.5 px-4 font-mono font-bold">
                        R$ {t.valor.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        {t.status === 'PAGO' ? (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                            <CheckCircle2 size={10} />
                            Pago
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold bg-amber-500/10 text-amber-400 border border-amber-500/20 animate-pulse">
                            <AlertCircle size={10} />
                            Aberto
                          </span>
                        )}
                      </td>
                      <td className="py-3.5 px-4 text-center space-x-1.5">
                        {t.status === 'PENDENTE' && (
                          <button
                            type="button"
                            onClick={() => onUpdateTransacaoStatus(t.id, 'PAGO')}
                            className="bg-emerald-500 hover:bg-emerald-600 text-black font-extrabold px-2 py-1 rounded text-[10px] transition-all cursor-pointer active:scale-95"
                            title="Marcar como Pago"
                          >
                            Liquidar
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => onDeleteTransacao(t.id)}
                          className="hover:bg-red-500/10 text-[#71717A] hover:text-red-400 px-2 py-1 rounded text-[10px] transition-all cursor-pointer"
                        >
                          Deletar
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          <StandardPagination
            currentPage={currentPage}
            totalPages={totalPages}
            totalItems={filteredTransacoes.length}
            itemsPerPage={itemsPerPage}
            onPageChange={setCurrentPage}
          />
        </div>
      )}

      {/* CONTENT: 2. CHARTS OVERVIEW */}
      {activeSubTab === 'graficos' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main monthly trend chart */}
          <div className="bg-[#111113] border border-[#27272A] rounded-2xl p-6 lg:col-span-2 space-y-4">
            <div>
              <h4 className="text-white text-sm font-bold">Fluxo de Caixa Mensal</h4>
              <p className="text-[#71717A] text-[11px]">Gráfico histórico de receitas pagas contra despesas pagas.</p>
            </div>
            
            {monthlyChartData.length === 0 ? (
              <div className="h-64 flex items-center justify-center text-xs text-[#71717A]">
                Dados insuficientes para gerar a evolução mensal de caixa.
              </div>
            ) : (
              <div className="h-72 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={monthlyChartData} margin={{ top: 10, right: 10, left: -20, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#27272A" />
                    <XAxis dataKey="name" stroke="#71717A" fontSize={11} tickLine={false} />
                    <YAxis stroke="#71717A" fontSize={11} tickLine={false} />
                    <Tooltip 
                      contentStyle={{ backgroundColor: '#111113', borderColor: '#27272A', color: '#E4E4E7' }}
                      labelStyle={{ color: '#D4AF37', fontWeight: 'bold' }}
                    />
                    <Legend wrapperStyle={{ fontSize: 11, paddingTop: 10 }} />
                    <Bar dataKey="Receitas" fill="#10B981" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="Despesas" fill="#EF4444" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>

          {/* Expenses categories distribution */}
          <div className="bg-[#111113] border border-[#27272A] rounded-2xl p-6 space-y-4 flex flex-col">
            <div>
              <h4 className="text-white text-sm font-bold">Distribuição de Despesas</h4>
              <p className="text-[#71717A] text-[11px]">Detalhamento por categorias operacionais de saídas.</p>
            </div>

            {categoryBreakdownData.length === 0 ? (
              <div className="flex-1 flex items-center justify-center text-xs text-[#71717A] py-12">
                Nenhuma despesa registrada para o gráfico de pizza.
              </div>
            ) : (
              <div className="flex-1 flex flex-col justify-center space-y-4">
                {/* Custom list distribution with nice percentages progress-bar style */}
                <div className="space-y-3.5">
                  {categoryBreakdownData.map((item) => (
                    <div key={item.name} className="space-y-1.5">
                      <div className="flex items-center justify-between text-xs font-semibold">
                        <div className="flex items-center gap-2">
                          <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: item.color }} />
                          <span className="text-white">{item.name}</span>
                        </div>
                        <div className="text-[#A1A1AA] font-mono">
                          R$ {item.value.toLocaleString('pt-BR')} ({item.percentage}%)
                        </div>
                      </div>
                      <div className="w-full h-1.5 bg-[#0A0A0B] rounded-full overflow-hidden border border-[#27272A]">
                        <div 
                          className="h-full rounded-full transition-all duration-500" 
                          style={{ backgroundColor: item.color, width: `${item.percentage}%` }} 
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* CONTENT: 3. UNPAID RESERVATIONS (FATURAMENTO) */}
      {activeSubTab === 'pendentes_reserva' && (
        <div className="bg-[#111113] border border-[#27272A] rounded-2xl p-6 space-y-4">
          <div className="flex justify-between items-start">
            <div>
              <h4 className="text-white text-sm font-bold">Faturamento Pendente de Reservas</h4>
              <p className="text-[#71717A] text-[11px]">
                Reservas ativas confirmadas que ainda não tiveram suas parcelas financeiras de recebimento lançadas no caixa.
              </p>
            </div>
            <span className="text-[10px] bg-[#D4AF37]/10 text-[#D4AF37] border border-[#D4AF37]/20 px-2.5 py-1 rounded-full font-bold">
              {unpaidReservas.length} Pendentes
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {unpaidReservas.length === 0 ? (
              <div className="col-span-2 py-12 text-center text-[#71717A] border border-dashed border-[#27272A] rounded-xl text-xs font-semibold">
                Excelente! Todas as reservas ativas já foram faturadas e vinculadas ao fluxo de caixa.
              </div>
            ) : (
              unpaidReservas.map((resComItens) => (
                <div key={resComItens.reserva.id} className="bg-[#0A0A0B] border border-[#27272A] p-4 rounded-xl flex flex-col justify-between space-y-4 hover:border-[#D4AF37]/40 transition-colors">
                  <div className="space-y-2">
                    <div className="flex justify-between items-start">
                      <div>
                        <div className="text-xs font-bold text-white">Reserva #{resComItens.reserva.id}</div>
                        <div className="text-[10px] text-[#A1A1AA] font-semibold">{resComItens.cliente.nome}</div>
                      </div>
                      <span className="text-xs font-mono font-extrabold text-emerald-400">
                        R$ {resComItens.valorTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </span>
                    </div>

                    <div className="text-[10px] text-[#71717A] space-y-0.5">
                      <div><strong className="text-white">Itens:</strong> {resComItens.itens.map(i => i.nome).join(', ')}</div>
                      <div><strong className="text-white">Dias de reserva:</strong> {resComItens.diasReserva} diárias</div>
                      <div><strong className="text-white">Data Retirada:</strong> {new Date(resComItens.reserva.dataRetirada).toLocaleDateString('pt-BR')}</div>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleQuickRecordPayment(resComItens)}
                    className="w-full py-2 bg-[#D4AF37]/10 hover:bg-[#D4AF37] text-[#D4AF37] hover:text-[#0A0A0B] border border-[#D4AF37]/30 hover:border-transparent text-[10px] font-bold uppercase tracking-wider rounded-lg transition-all cursor-pointer flex items-center justify-center gap-1.5"
                  >
                    <CheckCircle2 size={12} />
                    <span>Confirmar Faturamento (Recebido)</span>
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* CONTENT: 4. REPORT EXPORT / PRINT TABLE */}
      {activeSubTab === 'relatorios' && (
        <div className="bg-[#111113] border border-[#27272A] rounded-2xl p-6 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-[#27272A] pb-4">
            <div>
              <h4 className="text-white text-sm font-bold">Relatório de Fechamento de Caixa</h4>
              <p className="text-[#71717A] text-[11px]">Auditabilidade e faturamento para conferência impressa.</p>
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={handleExportCSV}
                className="bg-[#18181B] hover:bg-[#27272A] text-white border border-[#27272A] px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-2 cursor-pointer transition-colors"
              >
                <FileSpreadsheet size={14} className="text-[#D4AF37]" />
                <span>Exportar CSV</span>
              </button>
              <button
                type="button"
                onClick={handlePrint}
                className="bg-[#D4AF37] hover:bg-[#E5C158] text-black px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-2 cursor-pointer transition-all shadow-md shadow-[#D4AF37]/10"
              >
                <Printer size={14} />
                <span>Imprimir Fechamento</span>
              </button>
            </div>
          </div>

          {/* Printable Area styling wrapper */}
          <div className="bg-white text-slate-900 p-8 rounded-xl space-y-6 max-h-[500px] overflow-y-auto" id="printable-area">
            {/* Header Report */}
            <div className="flex justify-between border-b-2 border-slate-950 pb-4">
              <div>
                <h3 className="font-serif italic font-bold text-lg text-amber-800">Locadora Pro</h3>
                <p className="text-[9px] uppercase tracking-wider text-slate-500 font-bold">Bora Festar Locações LTDA • CNPJ: 45.678.910/0001-23</p>
                <p className="text-[10px] text-slate-600">Rua das Festas, 500 - Centro, São Paulo - SP</p>
              </div>
              <div className="text-right text-xs">
                <div className="font-bold text-slate-800">RELATÓRIO OPERACIONAL FINANCEIRO</div>
                <div className="text-[10px] text-slate-500 font-mono">Gerado em: {new Date().toLocaleDateString('pt-BR')} {new Date().toLocaleTimeString('pt-BR')}</div>
                <div className="text-[10px] text-slate-500">Período: Fechamento Consolidado</div>
              </div>
            </div>

            {/* Financial Summary tables */}
            <div className="grid grid-cols-3 gap-4">
              <div className="border border-slate-200 p-3 rounded bg-slate-50">
                <span className="text-[9px] text-slate-500 uppercase font-bold block">Faturamento Entrada</span>
                <span className="text-sm font-bold text-emerald-700 font-mono">
                  R$ {metrics.receitaTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </span>
              </div>
              <div className="border border-slate-200 p-3 rounded bg-slate-50">
                <span className="text-[9px] text-slate-500 uppercase font-bold block">Despesas Saídas</span>
                <span className="text-sm font-bold text-red-700 font-mono">
                  R$ {metrics.despesaTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </span>
              </div>
              <div className="border border-slate-200 p-3 rounded bg-amber-50 border-amber-200">
                <span className="text-[9px] text-amber-700 uppercase font-bold block">Lucro Líquido Operacional</span>
                <span className="text-sm font-bold text-amber-900 font-mono">
                  R$ {metrics.saldoLiquido.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </span>
              </div>
            </div>

            {/* Transactions Ledger for Print */}
            <div className="space-y-2">
              <div className="text-xs font-bold text-slate-800 border-b border-slate-300 pb-1">Destaque de Lançamentos</div>
              <table className="w-full text-left text-[11px] border-collapse">
                <thead>
                  <tr className="border-b-2 border-slate-300 text-slate-500 uppercase text-[9px] font-bold">
                    <th className="py-1 px-1">Data</th>
                    <th className="py-1 px-1">Categoria</th>
                    <th className="py-1 px-1">Descrição</th>
                    <th className="py-1 px-1 text-right">Valor</th>
                    <th className="py-1 px-1 text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium">
                  {transacoes.map((t) => (
                    <tr key={t.id}>
                      <td className="py-1.5 px-1 font-mono text-slate-500">{new Date(t.data).toLocaleDateString('pt-BR')}</td>
                      <td className="py-1.5 px-1 text-slate-600">{t.categoria}</td>
                      <td className="py-1.5 px-1 text-slate-900">{t.descricao}</td>
                      <td className={`py-1.5 px-1 text-right font-mono font-bold ${t.tipo === 'RECEITA' ? 'text-emerald-700' : 'text-red-700'}`}>
                        {t.tipo === 'RECEITA' ? '+' : '-'} R$ {t.valor.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </td>
                      <td className="py-1.5 px-1 text-center">
                        <span className="text-[9px] font-bold px-1.5 py-0.5 rounded uppercase border border-slate-200 bg-slate-50">
                          {t.status === 'PAGO' ? 'Liq' : 'Abe'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Print Notice */}
            <div className="text-center text-[9px] text-slate-400 pt-6 border-t border-slate-200 font-serif">
              Locadora Pro — Assinatura do Gerente: _________________________________________
            </div>
          </div>
        </div>
      )}

      {/* MODAL: MANUAL NEW TRANSACTION */}
      {isAddModalOpen && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-[#18181B] border border-[#27272A] w-full max-w-md rounded-2xl p-6 space-y-5 shadow-2xl relative">
            <button
              onClick={() => setIsAddModalOpen(false)}
              className="absolute top-4 right-4 text-[#A1A1AA] hover:text-white transition-colors cursor-pointer"
            >
              <X size={18} />
            </button>

            <div className="flex items-center gap-3 border-b border-[#27272A] pb-4">
              <div className="w-10 h-10 rounded-full bg-[#D4AF37]/20 text-[#D4AF37] flex items-center justify-center font-bold text-sm border border-[#D4AF37]/30">
                <PlusCircle size={18} />
              </div>
              <div>
                <h3 className="text-white text-sm font-bold">Lançamento de Fluxo de Caixa</h3>
                <p className="text-[#A1A1AA] text-xs">Insira receitas ou despesas manualmente no livro-caixa.</p>
              </div>
            </div>

            <form onSubmit={handleSaveTransaction} className="space-y-4">
              {/* Type selector toggle */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-white">Tipo de Lançamento</label>
                <div className="grid grid-cols-2 gap-2 bg-[#0A0A0B] p-1 rounded-xl border border-[#27272A]">
                  <button
                    type="button"
                    onClick={() => handleTypeChangeInModal('RECEITA')}
                    className={`py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                      newTransData.tipo === 'RECEITA' 
                        ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' 
                        : 'text-[#71717A]'
                    }`}
                  >
                    Receita (Entrada)
                  </button>
                  <button
                    type="button"
                    onClick={() => handleTypeChangeInModal('DESPESA')}
                    className={`py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                      newTransData.tipo === 'DESPESA' 
                        ? 'bg-red-500/10 text-red-400 border border-red-500/20' 
                        : 'text-[#71717A]'
                    }`}
                  >
                    Despesa (Saída)
                  </button>
                </div>
              </div>

              {/* Description */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-white block">Descrição</label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Aluguel da mesa oval e painel - Festa Copacabana"
                  value={newTransData.descricao}
                  onChange={(e) => setNewTransData(prev => ({ ...prev, descricao: e.target.value }))}
                  className="w-full px-3.5 py-2.5 bg-[#111113] border border-[#27272A] rounded-xl text-xs text-white focus:border-[#D4AF37] focus:outline-none"
                />
              </div>

              {/* Row: Valor & Data */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-white block">Valor (R$)</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    placeholder="250.00"
                    value={newTransData.valor}
                    onChange={(e) => setNewTransData(prev => ({ ...prev, valor: e.target.value }))}
                    className="w-full px-3.5 py-2.5 bg-[#111113] border border-[#27272A] rounded-xl text-xs text-white focus:border-[#D4AF37] focus:outline-none font-mono"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-white block">Data Lançamento</label>
                  <input
                    type="date"
                    required
                    value={newTransData.data}
                    onChange={(e) => setNewTransData(prev => ({ ...prev, data: e.target.value }))}
                    className="w-full px-3.5 py-2.5 bg-[#111113] border border-[#27272A] rounded-xl text-xs text-white focus:border-[#D4AF37] focus:outline-none"
                  />
                </div>
              </div>

              {/* Row: Categoria & Status */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-white block">Categoria</label>
                  <select
                    value={newTransData.categoria}
                    onChange={(e) => setNewTransData(prev => ({ ...prev, categoria: e.target.value }))}
                    className="w-full px-3.5 py-2.5 bg-[#111113] border border-[#27272A] rounded-xl text-xs text-[#A1A1AA] focus:outline-none focus:border-[#D4AF37]"
                  >
                    {suggestedCategories[newTransData.tipo].map(cat => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-white block">Liquidação</label>
                  <select
                    value={newTransData.status}
                    onChange={(e) => setNewTransData(prev => ({ ...prev, status: e.target.value as any }))}
                    className="w-full px-3.5 py-2.5 bg-[#111113] border border-[#27272A] rounded-xl text-xs text-[#A1A1AA] focus:outline-none focus:border-[#D4AF37]"
                  >
                    <option value="PAGO">Pago (Liquidado)</option>
                    <option value="PENDENTE">Pendente (Aberto)</option>
                  </select>
                </div>
              </div>

              {/* Submit Buttons */}
              <div className="flex items-center gap-3 pt-3 border-t border-[#27272A]">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="flex-1 bg-[#111113] hover:bg-[#27272A] text-[#A1A1AA] hover:text-white border border-[#27272A] py-3 rounded-xl text-xs font-bold transition-all cursor-pointer text-center"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex-1 bg-[#D4AF37] hover:bg-[#E5C158] text-black py-3 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-2 shadow-lg"
                >
                  <CheckCircle2 size={14} />
                  <span>Salvar Lançamento</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
