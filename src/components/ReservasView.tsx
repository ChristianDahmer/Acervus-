import React, { useState, useMemo } from 'react';
import { Cliente, ReservaComItens, StatusReserva, ListVisibilityConfig, FormularioWeb, EmpresaConfig } from '../types';
import { formatarDataBr, formatarMoeda } from '../utils/whatsappTemplates';
import { OrcamentoReservaModal } from './OrcamentoReservaModal';
import { NfseFaturamentoModal } from './NfseFaturamentoModal';
import {
  Calendar as CalendarIcon,
  FileText,
  MessageSquare,
  Plus,
  CheckCircle,
  XCircle,
  Clock,
  Play,
  Eye,
  EyeOff,
  ChevronLeft,
  ChevronRight,
  RotateCcw,
  Filter,
  CalendarDays,
  LayoutGrid,
  List,
  Sparkles,
  Receipt,
} from 'lucide-react';
import { StandardListControls, StandardPagination, StandardEmptyState } from './StandardListContainer';

interface ReservasViewProps {
  reservas: ReservaComItens[];
  clientes: Cliente[];
  webForms?: FormularioWeb[];
  empresaConfig?: EmpresaConfig;
  onUpdateStatus: (reservaId: number, status: StatusReserva) => void;
  onOpenNovaReserva: () => void;
  onOpenContratoPdf: (reservaComItens: ReservaComItens) => void;
  onOpenWhatsApp: (reservaComItens: ReservaComItens) => void;
  listVisibility?: ListVisibilityConfig;
  onUpdateNfse?: (reservaId: number, chaveAcesso: string, protocolo: string, dataEmissao: number) => Promise<void>;
}

type ModoCalendario = 'SEMANAL' | 'QUINZENAL' | 'MENSAL';

const DIAS_SEMANA = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom'];
const MESES_PT = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
];

export const ReservasView: React.FC<ReservasViewProps> = ({
  reservas = [],
  clientes = [],
  webForms = [],
  empresaConfig,
  onUpdateStatus,
  onOpenNovaReserva,
  onOpenContratoPdf,
  onOpenWhatsApp,
  listVisibility,
  onUpdateNfse,
}) => {
  const [selectedOrcamentoReserva, setSelectedOrcamentoReserva] = useState<ReservaComItens | null>(null);
  const [selectedNfseReserva, setSelectedNfseReserva] = useState<ReservaComItens | null>(null);

  const [isListVisible, setIsListVisible] = useState(() => {
    return listVisibility ? listVisibility.exibirReservasPorPadrao !== false : true;
  });

  const [viewMode, setViewMode] = useState<'grid' | 'list'>('list');

  React.useEffect(() => {
    if (listVisibility) {
      setIsListVisible(listVisibility.exibirReservasPorPadrao !== false);
    }
  }, [listVisibility]);

  const [filterStatus, setFilterStatus] = useState<string>('TODOS');
  const [modoCalendario, setModoCalendario] = useState<ModoCalendario>('SEMANAL');
  const [anchorDate, setAnchorDate] = useState<Date>(() => new Date());
  const [selectedDateFilter, setSelectedDateFilter] = useState<string | null>(null); // 'YYYY-MM-DD'

  // Helper date functions
  const isToday = (d: Date) => {
    const now = new Date();
    return (
      d.getDate() === now.getDate() &&
      d.getMonth() === now.getMonth() &&
      d.getFullYear() === now.getFullYear()
    );
  };

  const formatDateKey = (d: Date) => {
    const yr = d.getFullYear();
    const mo = String(d.getMonth() + 1).padStart(2, '0');
    const da = String(d.getDate()).padStart(2, '0');
    return `${yr}-${mo}-${da}`;
  };

  // Get reservations occupying a date
  const getReservasForDate = (date: Date) => {
    const dStart = new Date(date.getFullYear(), date.getMonth(), date.getDate(), 0, 0, 0).getTime();
    const dEnd = new Date(date.getFullYear(), date.getMonth(), date.getDate(), 23, 59, 59, 999).getTime();

    return reservas.filter((r) => {
      if (r.reserva.status === StatusReserva.CANCELADA) return false;
      return r.reserva.dataRetirada <= dEnd && r.reserva.dataDevolucao >= dStart;
    });
  };

  // Build list of calendar days based on current view mode
  const getCalendarDays = () => {
    const days: { date: Date; dateKey: string; isCurrentMonth: boolean }[] = [];

    if (modoCalendario === 'SEMANAL') {
      const current = new Date(anchorDate);
      const dayOfWeek = current.getDay();
      const distanceToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
      current.setDate(current.getDate() + distanceToMonday);

      for (let i = 0; i < 7; i++) {
        const d = new Date(current);
        d.setDate(d.getDate() + i);
        days.push({
          date: d,
          dateKey: formatDateKey(d),
          isCurrentMonth: d.getMonth() === anchorDate.getMonth(),
        });
      }
    } else if (modoCalendario === 'QUINZENAL') {
      const current = new Date(anchorDate);
      const dayOfWeek = current.getDay();
      const distanceToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
      current.setDate(current.getDate() + distanceToMonday);

      for (let i = 0; i < 15; i++) {
        const d = new Date(current);
        d.setDate(d.getDate() + i);
        days.push({
          date: d,
          dateKey: formatDateKey(d),
          isCurrentMonth: d.getMonth() === anchorDate.getMonth(),
        });
      }
    } else {
      // MENSAL
      const year = anchorDate.getFullYear();
      const month = anchorDate.getMonth();
      const firstDay = new Date(year, month, 1);
      const lastDay = new Date(year, month + 1, 0);

      const firstDayOfWeek = firstDay.getDay();
      const padStart = firstDayOfWeek === 0 ? 6 : firstDayOfWeek - 1;

      const startDate = new Date(firstDay);
      startDate.setDate(startDate.getDate() - padStart);

      const totalDays = padStart + lastDay.getDate() > 35 ? 42 : 35;

      for (let i = 0; i < totalDays; i++) {
        const d = new Date(startDate);
        d.setDate(d.getDate() + i);
        days.push({
          date: d,
          dateKey: formatDateKey(d),
          isCurrentMonth: d.getMonth() === month,
        });
      }
    }
    return days;
  };

  const calendarDays = useMemo(() => {
    return getCalendarDays();
  }, [modoCalendario, anchorDate]);

  // Navigation handlers
  const handlePrev = () => {
    const newDate = new Date(anchorDate);
    if (modoCalendario === 'SEMANAL') {
      newDate.setDate(newDate.getDate() - 7);
    } else if (modoCalendario === 'QUINZENAL') {
      newDate.setDate(newDate.getDate() - 15);
    } else {
      newDate.setMonth(newDate.getMonth() - 1);
    }
    setAnchorDate(newDate);
  };

  const handleNext = () => {
    const newDate = new Date(anchorDate);
    if (modoCalendario === 'SEMANAL') {
      newDate.setDate(newDate.getDate() + 7);
    } else if (modoCalendario === 'QUINZENAL') {
      newDate.setDate(newDate.getDate() + 15);
    } else {
      newDate.setMonth(newDate.getMonth() + 1);
    }
    setAnchorDate(newDate);
  };

  const handleToday = () => {
    setAnchorDate(new Date());
  };

  const handleSelectDate = (dateKey: string) => {
    if (selectedDateFilter === dateKey) {
      setSelectedDateFilter(null);
    } else {
      setSelectedDateFilter(dateKey);
    }
  };

  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  // Filter reservations based on status tab AND calendar date selection AND search - Memoized for Performance
  const filteredReservas = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    return reservas.filter((r) => {
      if (filterStatus !== 'TODOS' && r.reserva.status !== filterStatus) return false;

      if (selectedDateFilter) {
        const [yr, mo, da] = selectedDateFilter.split('-').map(Number);
        const dStart = new Date(yr, mo - 1, da, 0, 0, 0).getTime();
        const dEnd = new Date(yr, mo - 1, da, 23, 59, 59, 999).getTime();
        const overlaps = r.reserva.dataRetirada <= dEnd && r.reserva.dataDevolucao >= dStart;
        if (!overlaps) return false;
      }

      if (term) {
        const matchClient = r.cliente.nome.toLowerCase().includes(term);
        const matchId = String(r.reserva.id).includes(term);
        const matchItem = r.itens.some((i) => i.nome.toLowerCase().includes(term));
        return matchClient || matchId || matchItem;
      }

      return true;
    });
  }, [reservas, filterStatus, selectedDateFilter, searchTerm]);

  const paginatedReservas = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredReservas.slice(start, start + itemsPerPage);
  }, [filteredReservas, currentPage, itemsPerPage]);

  const totalPages = useMemo(() => {
    return Math.ceil(filteredReservas.length / itemsPerPage);
  }, [filteredReservas.length, itemsPerPage]);

  const getStatusBadge = (status: StatusReserva) => {
    switch (status) {
      case StatusReserva.CONFIRMADA:
        return (
          <span className="bg-blue-500/20 text-blue-400 border border-blue-500/30 text-xs px-2.5 py-1 rounded-full font-semibold flex items-center gap-1">
            <CheckCircle size={12} /> Confirmada
          </span>
        );
      case StatusReserva.EM_ANDAMENTO:
        return (
          <span className="bg-purple-500/20 text-purple-400 border border-purple-500/30 text-xs px-2.5 py-1 rounded-full font-semibold flex items-center gap-1">
            <Play size={12} /> Em Andamento
          </span>
        );
      case StatusReserva.CONCLUIDA:
        return (
          <span className="bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-xs px-2.5 py-1 rounded-full font-semibold flex items-center gap-1">
            <CheckCircle size={12} /> Concluída
          </span>
        );
      case StatusReserva.CANCELADA:
        return (
          <span className="bg-rose-500/20 text-rose-400 border border-rose-500/30 text-xs px-2.5 py-1 rounded-full font-semibold flex items-center gap-1">
            <XCircle size={12} /> Cancelada
          </span>
        );
      default:
        return (
          <span className="bg-amber-500/20 text-amber-400 border border-amber-500/30 text-xs px-2.5 py-1 rounded-full font-semibold flex items-center gap-1">
            <Clock size={12} /> Pendente
          </span>
        );
    }
  };

  // Get display text for current calendar range
  const getHeaderPeriodText = () => {
    if (calendarDays.length === 0) return '';
    const first = calendarDays[0].date;
    const last = calendarDays[calendarDays.length - 1].date;

    if (modoCalendario === 'MENSAL') {
      return `${MESES_PT[anchorDate.getMonth()]} de ${anchorDate.getFullYear()}`;
    }
    return `${first.getDate()} de ${MESES_PT[first.getMonth()].slice(0, 3)} - ${last.getDate()} de ${MESES_PT[last.getMonth()].slice(0, 3)} de ${last.getFullYear()}`;
  };

  return (
    <div className="space-y-6">
      {/* Top bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-[#111113] p-5 rounded-2xl border border-[#27272A]">
        <div className="w-full">
          <h2 className="text-xl font-serif italic text-white flex items-center gap-3">
            <CalendarIcon className="text-[#D4AF37]" size={22} />
            <span>Gestão de Reservas</span>
            <button
              type="button"
              onClick={() => setIsListVisible(!isListVisible)}
              className="text-[#71717A] hover:text-[#D4AF37] transition-colors p-1 rounded-lg bg-[#18181B] border border-[#27272A] cursor-pointer"
              title={isListVisible ? 'Ocultar Listagem' : 'Exibir Listagem'}
            >
              {isListVisible ? <EyeOff size={14} /> : <Eye size={14} />}
            </button>
          </h2>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2 mt-1.5">
            <p className="text-[#A1A1AA] text-xs">Acompanhe retiradas, devoluções e contratos em aberto</p>
            <button
              onClick={onOpenNovaReserva}
              className="inline-flex items-center justify-center gap-1.5 bg-[#D4AF37] hover:bg-[#E5C158] text-[#0A0A0B] px-3 py-1 rounded-lg text-[11px] font-bold uppercase tracking-wider shadow-md shadow-[#D4AF37]/5 transition-all cursor-pointer whitespace-nowrap shrink-0"
            >
              <Plus size={13} />
              <span>Criar Reserva</span>
            </button>
          </div>
        </div>
      </div>

      {/* Summary Totalizers - Single Line Compact Bar */}
      <div className="bg-[#111113] border border-[#27272A] rounded-2xl p-3 flex flex-nowrap overflow-x-auto items-center justify-between gap-2 sm:gap-4 divide-x divide-[#27272A] shadow-xl no-scrollbar">
        {/* Total Reservas */}
        <div className="flex items-center gap-3 px-3 min-w-[160px] flex-1">
          <div className="p-2 bg-[#18181B] border border-[#27272A] rounded-xl text-[#D4AF37] shrink-0">
            <CalendarIcon size={16} />
          </div>
          <div>
            <span className="text-[10px] uppercase font-bold tracking-wider text-[#71717A] block whitespace-nowrap">Total Reservas</span>
            <span className="text-base font-serif italic font-bold text-white leading-tight">{reservas.length}</span>
          </div>
        </div>

        {/* Confirmadas */}
        <div className="flex items-center gap-3 px-3 min-w-[160px] flex-1">
          <div className="p-2 bg-blue-500/10 border border-blue-500/20 rounded-xl text-blue-400 shrink-0">
            <CheckCircle size={16} />
          </div>
          <div>
            <span className="text-[10px] uppercase font-bold tracking-wider text-[#71717A] block whitespace-nowrap">Confirmadas</span>
            <span className="text-base font-serif italic font-bold text-blue-400 leading-tight">
              {reservas.filter((r) => r.reserva.status === StatusReserva.CONFIRMADA).length}
            </span>
          </div>
        </div>

        {/* Em Andamento */}
        <div className="flex items-center gap-3 px-3 min-w-[160px] flex-1">
          <div className="p-2 bg-purple-500/10 border border-purple-500/20 rounded-xl text-purple-400 shrink-0">
            <Play size={16} />
          </div>
          <div>
            <span className="text-[10px] uppercase font-bold tracking-wider text-[#71717A] block whitespace-nowrap">Em Andamento</span>
            <span className="text-base font-serif italic font-bold text-purple-400 leading-tight">
              {reservas.filter((r) => r.reserva.status === StatusReserva.EM_ANDAMENTO).length}
            </span>
          </div>
        </div>

        {/* Concluidas */}
        <div className="flex items-center gap-3 px-3 min-w-[160px] flex-1">
          <div className="p-2 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-emerald-400 shrink-0">
            <CheckCircle size={16} />
          </div>
          <div>
            <span className="text-[10px] uppercase font-bold tracking-wider text-[#71717A] block whitespace-nowrap">Concluídas</span>
            <span className="text-base font-serif italic font-bold text-emerald-400 leading-tight">
              {reservas.filter((r) => r.reserva.status === StatusReserva.CONCLUIDA).length}
            </span>
          </div>
        </div>
      </div>

      {/* Mini Calendário Configurável de Ocupação */}
      <div className="bg-[#111113] border border-[#27272A] rounded-2xl p-4 sm:p-5 shadow-xl space-y-4">
        {/* Calendar Header Controls */}
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-3 border-b border-[#27272A] pb-4">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-[#18181B] border border-[#D4AF37]/30 rounded-xl text-[#D4AF37]">
              <CalendarDays size={18} />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                <span>Ocupação do Acervo</span>
                <span className="text-xs font-mono font-normal text-[#D4AF37] bg-[#18181B] px-2 py-0.5 rounded border border-[#27272A]">
                  {getHeaderPeriodText()}
                </span>
              </h3>
              <p className="text-[11px] text-[#71717A]">
                Selecione um dia para filtrar pedidos ativos e verificar datas livres
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3 w-full lg:w-auto justify-between lg:justify-end">
            {/* View Mode Toggle Switch - Clean Labels separated by vertical bar */}
            <div className="flex items-center px-3 py-1.5 bg-[#18181B] border border-[#27272A] rounded-xl text-xs font-medium text-[#71717A] gap-2 shadow-inner">
              <button
                type="button"
                onClick={() => setModoCalendario('SEMANAL')}
                className={`transition-colors cursor-pointer ${
                  modoCalendario === 'SEMANAL'
                    ? 'text-[#D4AF37] font-bold'
                    : 'hover:text-white'
                }`}
              >
                Semanal
              </button>
              <span className="text-[#3F3F46] font-light">|</span>
              <button
                type="button"
                onClick={() => setModoCalendario('QUINZENAL')}
                className={`transition-colors cursor-pointer ${
                  modoCalendario === 'QUINZENAL'
                    ? 'text-[#D4AF37] font-bold'
                    : 'hover:text-white'
                }`}
              >
                Quinzenal
              </button>
              <span className="text-[#3F3F46] font-light">|</span>
              <button
                type="button"
                onClick={() => setModoCalendario('MENSAL')}
                className={`transition-colors cursor-pointer ${
                  modoCalendario === 'MENSAL'
                    ? 'text-[#D4AF37] font-bold'
                    : 'hover:text-white'
                }`}
              >
                Mensal
              </button>
            </div>

            {/* Navigation Arrows */}
            <div className="flex items-center space-x-1">
              <button
                type="button"
                onClick={handlePrev}
                className="p-1.5 bg-[#18181B] hover:bg-[#27272A] text-[#A1A1AA] hover:text-white border border-[#27272A] rounded-xl transition-all cursor-pointer"
                title="Período Anterior"
              >
                <ChevronLeft size={16} />
              </button>
              <button
                type="button"
                onClick={handleToday}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-[#18181B] hover:bg-[#27272A] text-xs font-semibold text-[#D4AF37] border border-[#27272A] rounded-xl transition-all cursor-pointer"
              >
                <RotateCcw size={12} />
                <span>Hoje</span>
              </button>
              <button
                type="button"
                onClick={handleNext}
                className="p-1.5 bg-[#18181B] hover:bg-[#27272A] text-[#A1A1AA] hover:text-white border border-[#27272A] rounded-xl transition-all cursor-pointer"
                title="Próximo Período"
              >
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        </div>

        {/* Calendar Grid Body */}
        {modoCalendario === 'MENSAL' && (
          <div className="grid grid-cols-7 gap-1 sm:gap-2 mb-1">
            {DIAS_SEMANA.map((d) => (
              <div
                key={d}
                className="text-center text-[10px] font-bold uppercase tracking-wider text-[#71717A] py-1"
              >
                {d}
              </div>
            ))}
          </div>
        )}

        <div
          className={
            modoCalendario === 'SEMANAL'
              ? 'grid grid-cols-7 gap-1.5 sm:gap-2'
              : modoCalendario === 'QUINZENAL'
              ? 'grid grid-cols-5 sm:grid-cols-8 md:grid-cols-15 gap-1.5 overflow-x-auto pb-1 no-scrollbar'
              : 'grid grid-cols-7 gap-1 sm:gap-1.5'
          }
        >
          {calendarDays.map(({ date, dateKey, isCurrentMonth }) => {
            const dayReservas = getReservasForDate(date);
            const hasReservas = dayReservas.length > 0;
            const isSelected = selectedDateFilter === dateKey;
            const isDayToday = isToday(date);
            const dayNum = date.getDate();
            const weekDayName = DIAS_SEMANA[(date.getDay() + 6) % 7]; // Mon=0 .. Sun=6

            return (
              <button
                type="button"
                key={dateKey}
                onClick={() => handleSelectDate(dateKey)}
                className={`group relative flex flex-col items-center justify-center p-1.5 sm:p-2 rounded-xl border text-center transition-all cursor-pointer select-none min-h-[58px] ${
                  isSelected
                    ? 'bg-[#18181B] border-[#D4AF37] ring-2 ring-[#D4AF37]/30 shadow-md shadow-[#D4AF37]/10'
                    : isDayToday
                    ? 'bg-[#18181B] border-[#D4AF37]/70 shadow-sm'
                    : !isCurrentMonth
                    ? 'bg-[#0A0A0B]/40 border-[#27272A]/30 opacity-35 hover:opacity-100'
                    : 'bg-[#0A0A0B] border-[#27272A] hover:border-[#3F3F46] hover:bg-[#18181B]/60'
                }`}
              >
                {/* Weekday label if applicable */}
                {modoCalendario !== 'MENSAL' && (
                  <span
                    className={`text-[9px] font-bold uppercase tracking-wider leading-none mb-0.5 ${
                      isSelected || isDayToday ? 'text-[#D4AF37]' : 'text-[#71717A]'
                    }`}
                  >
                    {weekDayName}
                  </span>
                )}

                {/* Day number & Today indicator dot */}
                <div className="flex items-center gap-1 my-0.5">
                  <span
                    className={`font-mono text-sm sm:text-base font-bold leading-tight ${
                      isSelected
                        ? 'text-[#D4AF37]'
                        : isDayToday
                        ? 'text-white'
                        : 'text-[#E4E4E7]'
                    }`}
                  >
                    {dayNum}
                  </span>
                  {isDayToday && (
                    <span className="w-1.5 h-1.5 rounded-full bg-[#D4AF37] animate-pulse" title="Hoje" />
                  )}
                </div>

                {/* Status Indicator / Micro Badge */}
                <div className="mt-0.5 w-full flex items-center justify-center">
                  {hasReservas ? (
                    <span className="bg-[#D4AF37]/15 border border-[#D4AF37]/30 text-[#D4AF37] text-[9px] font-bold px-1 py-0.2 rounded-md flex items-center gap-0.5 leading-tight">
                      <span className="w-1 h-1 rounded-full bg-[#D4AF37]" />
                      <span>{dayReservas.length} {dayReservas.length === 1 ? 'res.' : 'res.'}</span>
                    </span>
                  ) : (
                    <span className="text-[9px] text-[#52525B] font-medium group-hover:text-[#71717A] transition-colors leading-tight">
                      Livre
                    </span>
                  )}
                </div>
              </button>
            );
          })}
        </div>

        {/* Selected Date Filter Banner */}
        {selectedDateFilter && (
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 bg-[#18181B] border border-[#D4AF37]/40 p-3 rounded-xl text-xs animate-fade-in">
            <div className="flex items-center space-x-2 text-white">
              <Filter size={15} className="text-[#D4AF37] shrink-0" />
              <span>
                Filtrando reservas ativas para a data:{' '}
                <strong className="text-[#D4AF37] font-mono">
                  {selectedDateFilter.split('-').reverse().join('/')}
                </strong>{' '}
                ({getReservasForDate(new Date(selectedDateFilter + 'T12:00:00')).length} reserva(s) encontrada(s))
              </span>
            </div>
            <button
              type="button"
              onClick={() => setSelectedDateFilter(null)}
              className="flex items-center space-x-1.5 text-[#A1A1AA] hover:text-white bg-[#27272A] hover:bg-[#3F3F46] px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer shrink-0"
            >
              <XCircle size={14} />
              <span>Limpar Filtro por Data</span>
            </button>
          </div>
        )}
      </div>

      {!isListVisible ? (
        <div className="bg-[#111113] border border-[#27272A] rounded-2xl p-12 text-center space-y-4 shadow-xl animate-fade-in">
          <div className="w-12 h-12 rounded-full bg-[#D4AF37]/10 text-[#D4AF37] mx-auto flex items-center justify-center">
            <EyeOff size={24} />
          </div>
          <div className="space-y-1">
            <h4 className="text-white text-sm font-semibold">Listagem Oculta</h4>
            <p className="text-[#A1A1AA] text-xs max-w-sm mx-auto">
              A listagem de reservas está oculta por padrão para uma interface mais limpa.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setIsListVisible(true)}
            className="inline-flex items-center gap-2 bg-[#D4AF37] hover:bg-[#E5C158] text-[#0A0A0B] px-5 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider transition-all cursor-pointer shadow-lg shadow-[#D4AF37]/10 active:scale-95"
          >
            <Eye size={14} />
            <span>Exibir Listagem de Reservas</span>
          </button>
        </div>
      ) : (
        <>
          {/* Standardized Search, Status Filter Tabs & Pagination Controls */}
          <StandardListControls
            searchTerm={searchTerm}
            onSearchChange={setSearchTerm}
            searchPlaceholder="Buscar por cliente, ID da reserva ou equipamento..."
            viewMode={viewMode}
            onViewModeChange={setViewMode}
            filterTabs={[
              { id: 'TODOS', label: 'Todas as Reservas', count: reservas.length },
              { id: StatusReserva.CONFIRMADA, label: 'Confirmadas', count: reservas.filter(r => r.reserva.status === StatusReserva.CONFIRMADA).length },
              { id: StatusReserva.EM_ANDAMENTO, label: 'Em Andamento', count: reservas.filter(r => r.reserva.status === StatusReserva.EM_ANDAMENTO).length },
              { id: StatusReserva.CONCLUIDA, label: 'Concluídas', count: reservas.filter(r => r.reserva.status === StatusReserva.CONCLUIDA).length },
              { id: StatusReserva.CANCELADA, label: 'Canceladas', count: reservas.filter(r => r.reserva.status === StatusReserva.CANCELADA).length },
            ]}
            activeFilterTab={filterStatus}
            onFilterTabChange={(tab) => setFilterStatus(tab)}
            currentPage={currentPage}
            totalPages={totalPages}
            totalItems={filteredReservas.length}
            itemsPerPage={itemsPerPage}
            onPageChange={setCurrentPage}
            onItemsPerPageChange={setItemsPerPage}
          />

          {filteredReservas.length === 0 ? (
            <StandardEmptyState
              icon={<CalendarIcon size={22} />}
              title="Nenhuma reserva encontrada"
              description="Não encontramos nenhuma reserva com os termos de busca, data ou status selecionados."
              onClearFilters={() => {
                setSearchTerm('');
                setFilterStatus('TODOS');
                setSelectedDateFilter(null);
                setCurrentPage(1);
              }}
              actionText="Criar Nova Reserva"
              onAction={onOpenNovaReserva}
            />
          ) : (
            <>
              {viewMode === 'grid' ? (
                /* MODE 1: GRADE (GRID) */
                <div className="space-y-4">
                  {paginatedReservas.map((r) => {
                    const { reserva, cliente, itens, valorTotal, diasReserva } = r;

                    return (
                      <div
                        key={reserva.id}
                        className="bg-[#111113] border border-[#27272A] rounded-2xl p-5 shadow-xl space-y-4 hover:border-[#3F3F46] transition-all"
                      >
                        {/* Card Header */}
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#27272A] pb-3">
                          <div className="flex items-center space-x-3">
                            <span className="font-mono text-xs text-[#D4AF37] bg-[#18181B] px-2.5 py-1 rounded-lg border border-[#27272A]">
                              #{reserva.id}
                            </span>
                            <div>
                              <div className="flex items-center gap-2">
                                <h3 className="font-semibold text-white text-base">{cliente.nome}</h3>
                                {(reserva.propostaAprovada || reserva.origemPropostaId) && (
                                  <span className="bg-emerald-500/15 border border-emerald-500/40 text-emerald-400 font-bold text-[9px] px-2 py-0.5 rounded-full inline-flex items-center gap-1 shadow-sm">
                                    <Sparkles size={10} className="text-emerald-400 animate-pulse" />
                                    Proposta Aprovada #{reserva.origemPropostaId || ''}
                                  </span>
                                )}
                              </div>
                              <p className="text-xs text-[#71717A]">Tel: {cliente.telefone}</p>
                            </div>
                          </div>

                          <div className="flex items-center space-x-3">
                            {getStatusBadge(reserva.status)}
                            <span className="text-lg font-serif italic text-[#D4AF37]">{formatarMoeda(valorTotal)}</span>
                          </div>
                        </div>

                        {/* Details & Items */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
                          {/* Equipment list */}
                          <div className="md:col-span-2 space-y-1.5 bg-[#0A0A0B] p-3.5 rounded-xl border border-[#27272A]">
                            <p className="font-bold text-[#71717A] uppercase text-[10px] tracking-widest">
                              Itens do Acervo ({itens.length})
                            </p>
                            <div className="flex flex-wrap gap-2 pt-1">
                              {itens.map((item) => (
                                <span
                                  key={item.id}
                                  className="bg-[#18181B] border border-[#27272A] text-[#E4E4E7] px-2.5 py-1 rounded-lg text-xs font-medium flex items-center gap-1.5"
                                >
                                  <img src={item.imageUrl} alt="" className="w-4 h-4 rounded object-cover" />
                                  {item.nome}
                                </span>
                              ))}
                            </div>
                          </div>

                          {/* Dates */}
                          <div className="bg-[#0A0A0B] p-3.5 rounded-xl border border-[#27272A] space-y-1">
                            <p className="font-bold text-[#71717A] uppercase text-[10px] tracking-widest">
                              Período ({diasReserva} dias)
                            </p>
                            <p className="text-[#A1A1AA]">
                              Retirada: <strong className="text-white">{formatarDataBr(reserva.dataRetirada)}</strong>
                            </p>
                            <p className="text-[#A1A1AA]">
                              Devolução: <strong className="text-white">{formatarDataBr(reserva.dataDevolucao)}</strong>
                            </p>
                          </div>
                        </div>

                        {/* Card Actions */}
                        <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-[#27272A]">
                          {/* Status transitions */}
                          <div className="flex flex-wrap gap-1.5">
                            {reserva.status === StatusReserva.CONFIRMADA && (
                              <button
                                onClick={() => onUpdateStatus(reserva.id, StatusReserva.EM_ANDAMENTO)}
                                className="bg-purple-500/10 hover:bg-purple-500/20 text-purple-300 border border-purple-500/30 px-3 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer"
                              >
                                Marcar em Andamento
                              </button>
                            )}

                            {reserva.status === StatusReserva.EM_ANDAMENTO && (
                              <button
                                onClick={() => onUpdateStatus(reserva.id, StatusReserva.CONCLUIDA)}
                                className="bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-3 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer"
                              >
                                Marcar Concluída
                              </button>
                            )}

                            {reserva.status !== StatusReserva.CANCELADA && reserva.status !== StatusReserva.CONCLUIDA && (
                              <button
                                onClick={() => onUpdateStatus(reserva.id, StatusReserva.CANCELADA)}
                                className="bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border border-rose-500/30 px-3 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer"
                              >
                                Cancelar Reserva
                              </button>
                            )}
                          </div>

                          {/* Actions buttons */}
                          <div className="flex items-center space-x-2">
                            <button
                              onClick={() => setSelectedOrcamentoReserva(r)}
                              className="flex items-center gap-1.5 bg-[#D4AF37]/10 hover:bg-[#D4AF37]/25 text-[#D4AF37] border border-[#D4AF37]/40 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer shadow-sm hover:border-[#D4AF37]"
                              title="Visualizar Orçamento Enviado ao Cliente"
                            >
                              <Sparkles size={16} className="text-[#D4AF37]" />
                              <span>Ver Orçamento</span>
                            </button>

                            <button
                              onClick={() => onOpenContratoPdf(r)}
                              className="flex items-center gap-1.5 bg-[#18181B] hover:bg-[#27272A] text-[#E4E4E7] border border-[#27272A] px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer"
                            >
                              <FileText size={16} className="text-[#D4AF37]" />
                              <span>Gerar Contrato PDF</span>
                            </button>

                            <button
                              onClick={() => {
                                if (reserva.nfseEmitida || empresaConfig?.nfseGovBrConfig?.enabled) {
                                  setSelectedNfseReserva(r);
                                }
                              }}
                              disabled={!reserva.nfseEmitida && !empresaConfig?.nfseGovBrConfig?.enabled}
                              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                                reserva.nfseEmitida 
                                  ? 'bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 cursor-pointer' 
                                  : empresaConfig?.nfseGovBrConfig?.enabled
                                    ? 'bg-[#18181B] hover:bg-[#27272A] text-[#E4E4E7] border border-[#27272A] cursor-pointer'
                                    : 'bg-[#18181B]/50 text-[#71717A] border border-[#27272A]/40 cursor-not-allowed opacity-40'
                              }`}
                              title={
                                reserva.nfseEmitida 
                                  ? "Faturamento e Emissão de NFS-e Nacional" 
                                  : empresaConfig?.nfseGovBrConfig?.enabled
                                    ? "Emitir Nota Fiscal Eletrônica (NFS-e)"
                                    : "Módulo NFS-e Inativo nas configurações da empresa"
                              }
                            >
                              <Receipt size={16} className={reserva.nfseEmitida ? "text-emerald-400" : empresaConfig?.nfseGovBrConfig?.enabled ? "text-[#D4AF37]" : "text-[#71717A]"} />
                              <span>{reserva.nfseEmitida ? 'DANFSE NFS-e' : 'Emitir NFS-e'}</span>
                            </button>

                            <button
                              onClick={() => onOpenWhatsApp(r)}
                              className="flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-500 text-white px-3 py-1.5 rounded-xl text-xs font-semibold shadow-md transition-all cursor-pointer"
                            >
                              <MessageSquare size={16} />
                              <span>WhatsApp</span>
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                /* MODE 2: LISTA (TABLE) */
                <div className="bg-[#111113] border border-[#27272A] rounded-2xl overflow-hidden shadow-xl animate-fade-in">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                      <thead className="bg-[#0A0A0B] text-[#71717A] uppercase text-[10px] font-bold tracking-widest border-b border-[#27272A]">
                        <tr>
                          <th className="px-6 py-4">ID</th>
                          <th className="px-6 py-4">Cliente</th>
                          <th className="px-6 py-4">Itens</th>
                          <th className="px-6 py-4">Período</th>
                          <th className="px-6 py-4 text-right">Total</th>
                          <th className="px-6 py-4 text-center">Status</th>
                          <th className="px-6 py-4 text-right">Ações</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#27272A] text-xs text-[#E4E4E7]">
                        {paginatedReservas.map((r) => {
                          const { reserva, cliente, itens, valorTotal, diasReserva } = r;

                          return (
                            <tr key={reserva.id} className="hover:bg-[#18181B]/40 transition-colors">
                              <td className="px-6 py-4 font-mono text-[#D4AF37]">
                                #{reserva.id}
                              </td>
                              <td className="px-6 py-4">
                                <div className="font-bold text-white flex items-center gap-1.5">
                                  <span>{cliente.nome}</span>
                                  {(reserva.propostaAprovada || reserva.origemPropostaId) && (
                                    <span className="bg-emerald-500/15 border border-emerald-500/40 text-emerald-400 font-bold text-[9px] px-1.5 py-0.5 rounded-full inline-flex items-center gap-1">
                                      <Sparkles size={9} className="text-emerald-400 animate-pulse" />
                                      Proposta Aprovada
                                    </span>
                                  )}
                                </div>
                                <div className="text-[10px] text-[#71717A]">Tel: {cliente.telefone}</div>
                              </td>
                              <td className="px-6 py-4 max-w-xs">
                                <div className="flex flex-wrap gap-1">
                                  {itens.map((item) => (
                                    <span
                                      key={item.id}
                                      className="bg-[#18181B] border border-[#27272A] text-white px-2 py-0.5 rounded text-[10px] inline-flex items-center gap-1"
                                      title={item.nome}
                                    >
                                      {item.nome}
                                    </span>
                                  ))}
                                </div>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <div className="text-white font-medium">
                                  {formatarDataBr(reserva.dataRetirada)} até {formatarDataBr(reserva.dataDevolucao)}
                                </div>
                                <div className="text-[10px] text-[#71717A]">{diasReserva} dias</div>
                              </td>
                              <td className="px-6 py-4 font-mono font-bold text-right text-white">
                                {formatarMoeda(valorTotal)}
                              </td>
                              <td className="px-6 py-4">
                                <div className="flex justify-center">
                                  {getStatusBadge(reserva.status)}
                                </div>
                              </td>
                              <td className="px-6 py-4 text-right">
                                <div className="flex items-center justify-end gap-1.5">
                                  {/* Status transitions */}
                                  {reserva.status === StatusReserva.CONFIRMADA && (
                                    <button
                                      onClick={() => onUpdateStatus(reserva.id, StatusReserva.EM_ANDAMENTO)}
                                      className="bg-[#D4AF37]/10 hover:bg-[#D4AF37]/20 text-[#D4AF37] border border-[#D4AF37]/30 px-2.5 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer"
                                      title="Iniciar Reserva"
                                    >
                                      Iniciar
                                    </button>
                                  )}

                                  {reserva.status === StatusReserva.EM_ANDAMENTO && (
                                    <button
                                      onClick={() => onUpdateStatus(reserva.id, StatusReserva.CONCLUIDA)}
                                      className="bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-2.5 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer"
                                      title="Concluir Reserva"
                                    >
                                      Concluir
                                    </button>
                                  )}

                                  {reserva.status !== StatusReserva.CANCELADA && reserva.status !== StatusReserva.CONCLUIDA && (
                                    <button
                                      onClick={() => onUpdateStatus(reserva.id, StatusReserva.CANCELADA)}
                                      className="bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border border-rose-500/30 px-2.5 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer"
                                      title="Cancelar Reserva"
                                    >
                                      Cancelar
                                    </button>
                                  )}

                                  <button
                                    onClick={() => setSelectedOrcamentoReserva(r)}
                                    className="p-1.5 bg-[#D4AF37]/10 hover:bg-[#D4AF37]/25 text-[#D4AF37] border border-[#D4AF37]/40 rounded-lg transition-colors cursor-pointer"
                                    title="Visualizar Orçamento Enviado ao Cliente"
                                  >
                                    <Sparkles size={16} className="text-[#D4AF37]" />
                                  </button>

                                  <button
                                    onClick={() => onOpenContratoPdf(r)}
                                    className="p-1.5 bg-[#18181B] hover:bg-[#27272A] text-[#A1A1AA] hover:text-white border border-[#27272A] rounded-lg transition-colors cursor-pointer"
                                    title="Gerar Contrato PDF"
                                  >
                                    <FileText size={16} className="text-[#D4AF37]" />
                                  </button>

                                  <button
                                    onClick={() => {
                                      if (reserva.nfseEmitida || empresaConfig?.nfseGovBrConfig?.enabled) {
                                        setSelectedNfseReserva(r);
                                      }
                                    }}
                                    disabled={!reserva.nfseEmitida && !empresaConfig?.nfseGovBrConfig?.enabled}
                                    className={`p-1.5 border rounded-lg transition-colors ${
                                      reserva.nfseEmitida 
                                        ? 'bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border-emerald-500/30 cursor-pointer' 
                                        : empresaConfig?.nfseGovBrConfig?.enabled
                                          ? 'bg-[#18181B] hover:bg-[#27272A] text-[#A1A1AA] hover:text-white border-[#27272A] cursor-pointer'
                                          : 'bg-[#18181B]/50 text-[#71717A] border border-[#27272A]/40 cursor-not-allowed opacity-40'
                                    }`}
                                    title={
                                      reserva.nfseEmitida 
                                        ? "Ver NFS-e Nacional Emitida" 
                                        : empresaConfig?.nfseGovBrConfig?.enabled
                                          ? "Emitir Nota Fiscal Eletrônica (NFS-e)"
                                          : "Módulo NFS-e Inativo nas configurações da empresa"
                                    }
                                  >
                                    <Receipt size={16} className={reserva.nfseEmitida ? "text-emerald-400" : empresaConfig?.nfseGovBrConfig?.enabled ? "text-[#D4AF37]" : "text-[#71717A]"} />
                                  </button>

                                  <button
                                    onClick={() => onOpenWhatsApp(r)}
                                    className="p-1.5 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 rounded-lg transition-colors cursor-pointer"
                                    title="WhatsApp"
                                  >
                                    <MessageSquare size={16} />
                                  </button>
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

            {/* Standardized Pagination Controls */}
            <StandardPagination
              currentPage={currentPage}
              totalPages={totalPages}
              totalItems={filteredReservas.length}
              itemsPerPage={itemsPerPage}
              onPageChange={setCurrentPage}
            />
          </>
        )}
      </>
    )}
    {/* Modal for viewing client budget proposal */}
    {selectedOrcamentoReserva && (
      <OrcamentoReservaModal
        reservaComItens={selectedOrcamentoReserva}
        webForms={webForms}
        empresaConfig={empresaConfig}
        onClose={() => setSelectedOrcamentoReserva(null)}
      />
    )}

    {selectedNfseReserva && (
      <NfseFaturamentoModal
        isOpen={!!selectedNfseReserva}
        onClose={() => setSelectedNfseReserva(null)}
        reservaComItens={selectedNfseReserva}
        empresaConfig={empresaConfig}
        onConfirmFaturamento={async (id, chave, prot, data) => {
          if (onUpdateNfse) {
            await onUpdateNfse(id, chave, prot, data);
            setSelectedNfseReserva(prev => {
              if (prev && prev.reserva.id === id) {
                return {
                  ...prev,
                  reserva: {
                    ...prev.reserva,
                    nfseEmitida: true,
                    nfseChaveAcesso: chave,
                    nfseProtocolo: prot,
                    nfseDataEmissao: data
                  }
                };
              }
              return prev;
            });
          }
        }}
      />
    )}
  </div>
);
};

