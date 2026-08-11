import React, { useState, useMemo } from 'react';
import { 
  Wrench, 
  ShieldAlert, 
  CheckCircle2, 
  Play, 
  PlusCircle, 
  History, 
  Sparkles, 
  DollarSign, 
  X, 
  AlertTriangle, 
  Clock, 
  User, 
  HeartPulse,
  Search,
  Filter
} from 'lucide-react';
import { ItemAcervo, RegistroManutencao, TransacaoFinanceira } from '../types';
import { StandardListControls, StandardPagination, StandardEmptyState } from './StandardListContainer';

interface ManutencaoViewProps {
  itens: ItemAcervo[];
  onUpdateItemMaintenance: (item: ItemAcervo) => void;
  manutencoes: RegistroManutencao[];
  onAddMaintenanceLog: (log: Omit<RegistroManutencao, 'id'>, autoLogFinance: boolean) => void;
  onRemoveMaintenanceLog: (id: string) => void;
}

export const ManutencaoView: React.FC<ManutencaoViewProps> = ({
  itens = [],
  onUpdateItemMaintenance,
  manutencoes = [],
  onAddMaintenanceLog,
  onRemoveMaintenanceLog,
}) => {
  // Search and Filter states
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'TODOS' | 'EM_DIA' | 'ALERTA' | 'EM_MANUTENCAO'>('TODOS');

  // Modal State
  const [isLogModalOpen, setIsLogModalOpen] = useState(false);
  const [selectedItemForLog, setSelectedItemForLog] = useState<ItemAcervo | null>(null);
  const [newLogData, setNewLogData] = useState({
    tipo: 'Limpeza Geral',
    custo: '',
    observacao: '',
    responsavel: 'Equipe Própria',
    autoLogFinance: true,
  });

  const [activeTab, setActiveTab] = useState<'status' | 'historico'>('status');

  // Calculate items stats
  const stats = useMemo(() => {
    let emDia = 0;
    let alertas = 0;
    let emManutencao = 0;

    itens.forEach((i) => {
      const status = i.statusManutencao || 'EM_DIA';
      if (status === 'EM_MANUTENCAO') emManutencao++;
      else if (status === 'ALERTA') alertas++;
      else emDia++;
    });

    const totalCustoManutencao = manutencoes.reduce((acc, curr) => acc + curr.custo, 0);

    return {
      emDia,
      alertas,
      emManutencao,
      totalCusto: totalCustoManutencao,
    };
  }, [itens, manutencoes]);

  // Specific alerts based on alugueis counter and limits
  const proactiveAlerts = useMemo(() => {
    const alerts: Array<{ item: ItemAcervo; motivo: string }> = [];
    itens.forEach((item) => {
      const limite = item.frequenciaAlugueisManutencao || 5;
      const atual = item.alugueisDesdeManutencao || 0;
      
      if (item.statusManutencao === 'EM_MANUTENCAO') {
        // under maintenance right now
      } else if (atual >= limite) {
        alerts.push({
          item,
          motivo: `Atingiu o limite crítico: ${atual}/${limite} aluguéis realizados desde a última revisão. Recomendado revisão geral de pintura e polimento estrutural.`,
        });
      } else if (atual >= limite - 1) {
        alerts.push({
          item,
          motivo: `Alerta preventivo: ${atual}/${limite} aluguéis realizados. Próximo do limite recomendado de manutenção preventiva.`,
        });
      }
    });
    return alerts;
  }, [itens]);

  // Filter items list
  const filteredItens = useMemo(() => {
    return itens.filter((i) => {
      const matchesSearch = i.nome.toLowerCase().includes(searchTerm.toLowerCase()) || 
                            i.categoria.toLowerCase().includes(searchTerm.toLowerCase());
      
      const status = i.statusManutencao || 'EM_DIA';
      const matchesStatus = statusFilter === 'TODOS' || status === statusFilter;

      return matchesSearch && matchesStatus;
    });
  }, [itens, searchTerm, statusFilter]);

  const [currentPageItens, setCurrentPageItens] = useState(1);
  const [itemsPerPageItens, setItemsPerPageItens] = useState(9);

  const paginatedItens = useMemo(() => {
    const start = (currentPageItens - 1) * itemsPerPageItens;
    return filteredItens.slice(start, start + itemsPerPageItens);
  }, [filteredItens, currentPageItens, itemsPerPageItens]);

  const totalPagesItens = Math.ceil(filteredItens.length / itemsPerPageItens);

  // Filter history logs
  const [historySearchTerm, setHistorySearchTerm] = useState('');
  const [historyPage, setHistoryPage] = useState(1);
  const [historyItemsPerPage, setHistoryItemsPerPage] = useState(10);

  const filteredLogs = useMemo(() => {
    return manutencoes.filter((log) => {
      const item = itens.find(i => i.id === log.itemId);
      const itemName = item ? item.nome : '';
      const term = historySearchTerm.toLowerCase();
      return (
        itemName.toLowerCase().includes(term) ||
        log.tipo.toLowerCase().includes(term) ||
        (log.responsavel && log.responsavel.toLowerCase().includes(term)) ||
        (log.observacao && log.observacao.toLowerCase().includes(term))
      );
    });
  }, [manutencoes, itens, historySearchTerm]);

  const paginatedLogs = useMemo(() => {
    const start = (historyPage - 1) * historyItemsPerPage;
    return filteredLogs.slice(start, start + historyItemsPerPage);
  }, [filteredLogs, historyPage, historyItemsPerPage]);

  const totalPagesHistory = Math.ceil(filteredLogs.length / historyItemsPerPage);

  // Open maintenance logging modal
  const handleOpenLogModal = (item: ItemAcervo) => {
    setSelectedItemForLog(item);
    setNewLogData({
      tipo: item.categoria === 'Iluminação' ? 'Reparo Elétrico' : 'Pintura e Polimento',
      custo: '',
      observacao: '',
      responsavel: 'Equipe Própria',
      autoLogFinance: true,
    });
    setIsLogModalOpen(true);
  };

  // Submit maintenance log
  const handleSaveMaintenanceLog = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedItemForLog) return;

    const custoNum = parseFloat(newLogData.custo) || 0;

    // 1. Add Log
    onAddMaintenanceLog({
      itemId: selectedItemForLog.id,
      data: Date.now(),
      tipo: newLogData.tipo,
      custo: custoNum,
      observacao: newLogData.observacao,
      responsavel: newLogData.responsavel,
    }, newLogData.autoLogFinance);

    // 2. Reset item counter and set back to EM_DIA
    const updatedItem: ItemAcervo = {
      ...selectedItemForLog,
      statusManutencao: 'EM_DIA',
      alugueisDesdeManutencao: 0,
      ultimaManutencao: Date.now(),
    };
    onUpdateItemMaintenance(updatedItem);

    setIsLogModalOpen(false);
    setSelectedItemForLog(null);
  };

  // Toggle active item into "EM_MANUTENCAO" state
  const handleToggleUnderMaintenance = (item: ItemAcervo) => {
    const isCurrentlyUnder = item.statusManutencao === 'EM_MANUTENCAO';
    const updated: ItemAcervo = {
      ...item,
      statusManutencao: isCurrentlyUnder ? 'EM_DIA' : 'EM_MANUTENCAO',
    };
    onUpdateItemMaintenance(updated);
  };

  return (
    <div className="space-y-6 animate-fade-in" id="manutencao-view">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-serif text-white font-semibold">Gestão de Manutenção Preventiva</h2>
          <p className="text-[#A1A1AA] text-xs">
            Controle do ciclo de vida dos itens do acervo com alertas baseados em quantidade de aluguéis e agendamentos.
          </p>
        </div>
      </div>

      {/* KPI Stats - Single Line Compact Bar */}
      <div className="bg-[#111113] border border-[#27272A] rounded-2xl p-3 flex flex-nowrap overflow-x-auto items-center justify-between gap-2 sm:gap-4 divide-x divide-[#27272A] shadow-xl no-scrollbar">
        {/* Ativos / Em dia */}
        <div className="flex items-center gap-3 px-3 min-w-[160px] flex-1">
          <div className="p-2 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-emerald-400 shrink-0">
            <CheckCircle2 size={16} />
          </div>
          <div>
            <span className="text-[10px] uppercase font-bold tracking-wider text-[#71717A] block whitespace-nowrap">Itens Em Dia</span>
            <span className="text-base font-mono font-bold text-emerald-400 leading-tight">{stats.emDia}</span>
          </div>
        </div>

        {/* Alertas */}
        <div className="flex items-center gap-3 px-3 min-w-[160px] flex-1">
          <div className="p-2 bg-amber-500/10 border border-amber-500/20 rounded-xl text-amber-400 shrink-0">
            <ShieldAlert size={16} />
          </div>
          <div>
            <span className="text-[10px] uppercase font-bold tracking-wider text-[#71717A] block whitespace-nowrap">Atenção Crítica</span>
            <span className="text-base font-mono font-bold text-amber-400 leading-tight">{stats.alertas}</span>
          </div>
        </div>

        {/* Em Manutencao */}
        <div className="flex items-center gap-3 px-3 min-w-[160px] flex-1">
          <div className="p-2 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 shrink-0">
            <Wrench size={16} />
          </div>
          <div>
            <span className="text-[10px] uppercase font-bold tracking-wider text-[#71717A] block whitespace-nowrap">Em Manutenção</span>
            <span className="text-base font-mono font-bold text-red-400 leading-tight">{stats.emManutencao}</span>
          </div>
        </div>

        {/* Custo Total */}
        <div className="flex items-center gap-3 px-3 min-w-[180px] flex-1">
          <div className="p-2 bg-[#D4AF37]/10 border border-[#D4AF37]/20 rounded-xl text-[#D4AF37] shrink-0">
            <DollarSign size={16} />
          </div>
          <div>
            <span className="text-[10px] uppercase font-bold tracking-wider text-[#71717A] block whitespace-nowrap">Investimento Reparos</span>
            <span className="text-sm font-mono font-bold text-[#D4AF37] leading-tight">
              R$ {stats.totalCusto.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </span>
          </div>
        </div>
      </div>

      {/* Proactive Notification banner */}
      {proactiveAlerts.length > 0 && (
        <div className="bg-amber-500/10 border border-amber-500/30 p-4 rounded-2xl flex flex-col sm:flex-row items-start gap-4 animate-pulse">
          <div className="w-10 h-10 rounded-full bg-amber-500/20 text-amber-400 flex items-center justify-center shrink-0 border border-amber-500/30">
            <ShieldAlert size={20} />
          </div>
          <div className="space-y-1">
            <h4 className="text-amber-400 text-xs font-bold uppercase tracking-wide">Alertas de Manutenção Preventiva Ativos</h4>
            <ul className="text-xs text-[#E4E4E7] space-y-1.5 list-disc list-inside">
              {proactiveAlerts.slice(0, 3).map((alerta, idx) => (
                <li key={idx}>
                  <strong className="text-white">{alerta.item.nome}:</strong> {alerta.motivo}
                </li>
              ))}
              {proactiveAlerts.length > 3 && (
                <li className="text-[#A1A1AA] italic list-none">E mais {proactiveAlerts.length - 3} outros alertas preventivos no acervo...</li>
              )}
            </ul>
          </div>
        </div>
      )}

      {/* Segment tabs */}
      <div className="flex border-b border-[#27272A]">
        <button
          type="button"
          onClick={() => setActiveTab('status')}
          className={`px-4 py-3 text-xs font-bold uppercase tracking-wider transition-all border-b-2 cursor-pointer ${
            activeTab === 'status'
              ? 'border-[#D4AF37] text-white bg-[#18181B]/50'
              : 'border-transparent text-[#71717A] hover:text-white hover:bg-[#111113]/50'
          }`}
        >
          Diagnóstico e Status do Acervo
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('historico')}
          className={`px-4 py-3 text-xs font-bold uppercase tracking-wider transition-all border-b-2 cursor-pointer ${
            activeTab === 'historico'
              ? 'border-[#D4AF37] text-white bg-[#18181B]/50'
              : 'border-transparent text-[#71717A] hover:text-white hover:bg-[#111113]/50'
          }`}
        >
          Histórico de Reparos ({manutencoes.length})
        </button>
      </div>

      {/* CONTENT: DIAGNOSTIC & STATUS COOPERATIVE */}
      {activeTab === 'status' && (
        <div className="space-y-4">
          <StandardListControls
            searchTerm={searchTerm}
            onSearchChange={setSearchTerm}
            searchPlaceholder="Buscar item por nome ou categoria..."
            filterTabs={[
              { id: 'TODOS', label: 'Todos os Itens', count: itens.length },
              { id: 'EM_DIA', label: 'Em Dia', count: stats.emDia },
              { id: 'ALERTA', label: 'Recomenda Atenção', count: stats.alerta },
              { id: 'EM_MANUTENCAO', label: 'Em Oficina', count: stats.emManutencao },
            ]}
            activeFilterTab={statusFilter}
            onFilterTabChange={(tab) => {
              setStatusFilter(tab as any);
              setCurrentPageItens(1);
            }}
            currentPage={currentPageItens}
            totalPages={totalPagesItens}
            totalItems={filteredItens.length}
            itemsPerPage={itemsPerPageItens}
            onPageChange={setCurrentPageItens}
            onItemsPerPageChange={setItemsPerPageItens}
          />

          {filteredItens.length === 0 ? (
            <StandardEmptyState
              icon={<Wrench size={22} />}
              title="Nenhum item encontrado"
              description="Nenhum item do acervo atende aos critérios de busca ou filtros selecionados."
              onClearFilters={() => {
                setSearchTerm('');
                setStatusFilter('TODOS');
                setCurrentPageItens(1);
              }}
            />
          ) : (
            <>
              {/* Grid of Items Diagnosed */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {paginatedItens.map((item) => {
                const status = item.statusManutencao || 'EM_DIA';
                const limite = item.frequenciaAlugueisManutencao || 5;
                const atual = item.alugueisDesdeManutencao || 0;
                const percent = Math.min(100, Math.round((atual / limite) * 100));

                return (
                  <div 
                    key={item.id} 
                    className={`bg-[#0A0A0B] border rounded-xl p-4 flex flex-col justify-between space-y-4 hover:shadow-md transition-all ${
                      status === 'EM_MANUTENCAO' 
                        ? 'border-red-500/20' 
                        : status === 'ALERTA' 
                          ? 'border-amber-500/30' 
                          : 'border-[#27272A]'
                    }`}
                  >
                    {/* Item header info */}
                    <div className="space-y-3">
                      <div className="flex gap-3">
                        {item.imageUrl ? (
                          <img 
                            src={item.imageUrl} 
                            alt={item.nome} 
                            className="w-12 h-12 rounded-lg object-cover shrink-0 border border-[#27272A]"
                            referrerPolicy="no-referrer"
                          />
                        ) : (
                          <div className="w-12 h-12 rounded-lg bg-[#18181B] flex items-center justify-center shrink-0 border border-[#27272A]">
                            <HeartPulse size={18} className="text-[#71717A]" />
                          </div>
                        )}
                        <div className="space-y-1 min-w-0">
                          <h4 className="text-white text-xs font-bold truncate">{item.nome}</h4>
                          <span className="text-[10px] text-[#71717A] bg-[#111113] border border-[#27272A] px-2 py-0.5 rounded-full font-medium">
                            {item.categoria}
                          </span>
                        </div>
                      </div>

                      {/* Preventive metric health bar */}
                      {status !== 'EM_MANUTENCAO' && (
                        <div className="space-y-1.5">
                          <div className="flex justify-between items-center text-[10px] font-bold">
                            <span className="text-[#71717A]">Ciclo de Aluguéis Preventivos</span>
                            <span className={status === 'ALERTA' ? 'text-amber-400' : 'text-[#A1A1AA]'}>
                              {atual}/{limite} locações
                            </span>
                          </div>
                          <div className="w-full h-1.5 bg-[#111113] rounded-full overflow-hidden border border-[#27272A]">
                            <div 
                              className={`h-full rounded-full transition-all duration-300 ${status === 'ALERTA' ? 'bg-amber-400' : 'bg-[#D4AF37]'}`}
                              style={{ width: `${percent}%` }}
                            />
                          </div>
                        </div>
                      )}

                      {/* Status Badges */}
                      <div className="flex flex-wrap gap-1.5">
                        {status === 'EM_DIA' && (
                          <span className="inline-flex items-center gap-1 text-[9px] font-extrabold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2 py-0.5 rounded-full uppercase">
                            <CheckCircle2 size={9} />
                            Estrutura em dia
                          </span>
                        )}
                        {status === 'ALERTA' && (
                          <span className="inline-flex items-center gap-1 text-[9px] font-extrabold bg-amber-500/10 text-amber-400 border border-amber-500/20 px-2 py-0.5 rounded-full uppercase animate-pulse">
                            <ShieldAlert size={9} />
                            Revisão Recomendada
                          </span>
                        )}
                        {status === 'EM_MANUTENCAO' && (
                          <span className="inline-flex items-center gap-1 text-[9px] font-extrabold bg-red-500/10 text-red-400 border border-red-500/20 px-2 py-0.5 rounded-full uppercase">
                            <Wrench size={9} />
                            Em manutenção
                          </span>
                        )}
                        {item.ultimaManutencao && (
                          <span className="inline-flex items-center gap-1 text-[9px] text-[#71717A] bg-[#111113] border border-[#27272A] px-2 py-0.5 rounded-full">
                            Último: {new Date(item.ultimaManutencao).toLocaleDateString('pt-BR')}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Quick diagnostics actions */}
                    <div className="grid grid-cols-2 gap-2 pt-2 border-t border-[#27272A]">
                      {/* Enviar/Retirar da manutenção */}
                      <button
                        type="button"
                        onClick={() => handleToggleUnderMaintenance(item)}
                        className={`py-2 text-[10px] font-bold uppercase rounded-lg transition-all border cursor-pointer ${
                          status === 'EM_MANUTENCAO'
                            ? 'bg-emerald-500/10 hover:bg-emerald-500 text-emerald-400 hover:text-black border-emerald-500/20'
                            : 'bg-red-500/10 hover:bg-red-500 text-red-400 hover:text-black border-red-500/20'
                        }`}
                      >
                        {status === 'EM_MANUTENCAO' ? 'Reativar Item' : 'Oficina (Recolher)'}
                      </button>

                      {/* Log de revisão concluída */}
                      <button
                        type="button"
                        onClick={() => handleOpenLogModal(item)}
                        className="bg-[#D4AF37]/10 hover:bg-[#D4AF37] text-[#D4AF37] hover:text-black border border-[#D4AF37]/20 hover:border-transparent py-2 text-[10px] font-bold uppercase rounded-lg transition-all cursor-pointer"
                      >
                        Registrar Revisão
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>

            <StandardPagination
              currentPage={currentPageItens}
              totalPages={totalPagesItens}
              totalItems={filteredItens.length}
              itemsPerPage={itemsPerPageItens}
              onPageChange={setCurrentPageItens}
            />
          </>
        )}
      </div>
      )}

      {/* CONTENT: MAINTENANCE LOGS HISTORY */}
      {activeTab === 'historico' && (
        <div className="space-y-4">
          <StandardListControls
            searchTerm={historySearchTerm}
            onSearchChange={setHistorySearchTerm}
            searchPlaceholder="Buscar ordem por item, serviço, responsável ou observação..."
            currentPage={historyPage}
            totalPages={totalPagesHistory}
            totalItems={filteredLogs.length}
            itemsPerPage={historyItemsPerPage}
            onPageChange={setHistoryPage}
            onItemsPerPageChange={setHistoryItemsPerPage}
            additionalControls={
              <div className="text-xs text-[#A1A1AA] font-mono font-bold bg-[#111113] border border-[#27272A] px-3.5 py-2 rounded-xl">
                Investimento Total: R$ {stats.totalCusto.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </div>
            }
          />

          {filteredLogs.length === 0 ? (
            <StandardEmptyState
              icon={<History size={22} />}
              title="Nenhum registro de manutenção encontrado"
              description="Nenhuma ordem de serviço foi registrada com os termos pesquisados."
              onClearFilters={() => {
                setHistorySearchTerm('');
                setHistoryPage(1);
              }}
            />
          ) : (
            <>
              <div className="overflow-x-auto border border-[#27272A] rounded-2xl bg-[#111113]">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-[#0A0A0B] border-b border-[#27272A] text-[#71717A] text-[10px] font-bold uppercase tracking-wider">
                      <th className="py-3 px-4">Data</th>
                      <th className="py-3 px-4">Item Acervo</th>
                      <th className="py-3 px-4">Tipo Serviço</th>
                      <th className="py-3 px-4">Prestador/Responsável</th>
                      <th className="py-3 px-4">Observações</th>
                      <th className="py-3 px-4 text-right">Custo</th>
                      <th className="py-3 px-4 text-center">Ações</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#27272A] text-xs text-[#E4E4E7] font-medium">
                    {paginatedLogs.map((log) => {
                      const linkedItem = itens.find(i => i.id === log.itemId);
                      return (
                        <tr key={log.id} className="hover:bg-[#18181B]/40 transition-colors">
                          <td className="py-3 px-4 font-mono text-[#71717A]">
                            {new Date(log.data).toLocaleDateString('pt-BR')}
                          </td>
                          <td className="py-3 px-4 font-bold text-white">
                            {linkedItem ? linkedItem.nome : `Item #${log.itemId}`}
                          </td>
                          <td className="py-3 px-4">
                            <span className="bg-[#18181B] border border-[#27272A] px-2.5 py-1 rounded-full text-[10px] text-[#A1A1AA]">
                              {log.tipo}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-[#A1A1AA] font-semibold">
                            {log.responsavel || 'Equipe Interna'}
                          </td>
                          <td className="py-3 px-4 max-w-xs truncate text-[#71717A]" title={log.observacao}>
                            {log.observacao || 'Nenhuma'}
                          </td>
                          <td className="py-3 px-4 font-mono font-bold text-right text-red-400">
                            R$ {log.custo.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                          </td>
                          <td className="py-3 px-4 text-center">
                            <button
                              type="button"
                              onClick={() => onRemoveMaintenanceLog(log.id)}
                              className="text-[#71717A] hover:text-red-400 px-2 py-1 rounded transition-colors cursor-pointer"
                            >
                              Excluir
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              <StandardPagination
                currentPage={historyPage}
                totalPages={totalPagesHistory}
                totalItems={filteredLogs.length}
                itemsPerPage={historyItemsPerPage}
                onPageChange={setHistoryPage}
              />
            </>
          )}
        </div>
      )}

      {/* MODAL: REGISTER MAINTENANCE REVIEW CONCLUDED */}
      {isLogModalOpen && selectedItemForLog && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-[#18181B] border border-[#27272A] w-full max-w-md rounded-2xl p-6 space-y-5 shadow-2xl relative">
            <button
              onClick={() => setIsLogModalOpen(false)}
              className="absolute top-4 right-4 text-[#A1A1AA] hover:text-white transition-colors cursor-pointer"
            >
              <X size={18} />
            </button>

            <div className="flex items-center gap-3 border-b border-[#27272A] pb-4">
              <div className="w-10 h-10 rounded-full bg-[#D4AF37]/20 text-[#D4AF37] flex items-center justify-center font-bold text-sm border border-[#D4AF37]/30">
                <Wrench size={18} />
              </div>
              <div>
                <h3 className="text-white text-sm font-bold">Ordem de Revisão Concluída</h3>
                <p className="text-[#A1A1AA] text-xs">Atenção Preventiva: {selectedItemForLog.nome}</p>
              </div>
            </div>

            <form onSubmit={handleSaveMaintenanceLog} className="space-y-4">
              {/* Type selector */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-white block">Tipo de Serviço Realizado</label>
                <select
                  value={newLogData.tipo}
                  onChange={(e) => setNewLogData(prev => ({ ...prev, tipo: e.target.value }))}
                  className="w-full px-3.5 py-2.5 bg-[#111113] border border-[#27272A] rounded-xl text-xs text-white focus:outline-none focus:border-[#D4AF37]"
                >
                  <option value="Limpeza Geral">Limpeza Geral & Polimento</option>
                  <option value="Pintura de Reposição">Pintura e Tratamento MDF</option>
                  <option value="Reparo Elétrico">Reparo Elétrico / LED / Neon</option>
                  <option value="Costura / Tapeçaria">Costura / Reparos em Tecidos</option>
                  <option value="Ajuste de Soldagem">Ajuste de Soldagem / Metal</option>
                  <option value="Reposição de Peças">Reposição de Peças de Kits</option>
                </select>
              </div>

              {/* Responsible / Provider */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-white block">Responsável / Oficina Prestadora</label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Oficina Própria ou Marcenaria Silva"
                  value={newLogData.responsavel}
                  onChange={(e) => setNewLogData(prev => ({ ...prev, responsavel: e.target.value }))}
                  className="w-full px-3.5 py-2.5 bg-[#111113] border border-[#27272A] rounded-xl text-xs text-white focus:outline-none focus:border-[#D4AF37]"
                />
              </div>

              {/* Cost */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-white block">Custo Total de Reparo (R$)</label>
                <input
                  type="number"
                  step="0.01"
                  required
                  placeholder="Deixe 0 se feito internamente sem custo"
                  value={newLogData.custo}
                  onChange={(e) => setNewLogData(prev => ({ ...prev, custo: e.target.value }))}
                  className="w-full px-3.5 py-2.5 bg-[#111113] border border-[#27272A] rounded-xl text-xs text-white focus:outline-none focus:border-[#D4AF37] font-mono"
                />
              </div>

              {/* Notes */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-white block">Observações Técnicas</label>
                <textarea
                  placeholder="Ex: Aplicada demão de verniz protetor, testado circuitos integrados de áudio e conexões estéreo..."
                  value={newLogData.observacao}
                  onChange={(e) => setNewLogData(prev => ({ ...prev, observacao: e.target.value }))}
                  className="w-full px-3.5 py-2.5 bg-[#111113] border border-[#27272A] rounded-xl text-xs text-white focus:outline-none focus:border-[#D4AF37] h-20 resize-none"
                />
              </div>

              {/* Integrated Finance Checkbox! */}
              {parseFloat(newLogData.custo) > 0 && (
                <label className="flex items-center gap-3.5 bg-[#0A0A0B] p-3 rounded-xl border border-[#27272A] cursor-pointer hover:border-[#D4AF37]/30 transition-all select-none">
                  <input
                    type="checkbox"
                    checked={newLogData.autoLogFinance}
                    onChange={(e) => setNewLogData(prev => ({ ...prev, autoLogFinance: e.target.checked }))}
                    className="w-4 h-4 rounded border-[#27272A] text-[#D4AF37] focus:ring-0 focus:ring-offset-0 bg-transparent cursor-pointer"
                  />
                  <div className="space-y-0.5">
                    <span className="text-xs font-bold text-white block">Integrar com Financeiro</span>
                    <span className="text-[10px] text-[#71717A] block font-medium">Lançar automaticamente como DESPESA na conta do caixa.</span>
                  </div>
                </label>
              )}

              {/* Action Buttons */}
              <div className="flex items-center gap-3 pt-3 border-t border-[#27272A]">
                <button
                  type="button"
                  onClick={() => setIsLogModalOpen(false)}
                  className="flex-1 bg-[#111113] hover:bg-[#27272A] text-[#A1A1AA] hover:text-white border border-[#27272A] py-3 rounded-xl text-xs font-bold transition-all cursor-pointer text-center"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex-1 bg-[#D4AF37] hover:bg-[#E5C158] text-black py-3 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-2 shadow-lg"
                >
                  <CheckCircle2 size={14} />
                  <span>Concluir Revisão</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
