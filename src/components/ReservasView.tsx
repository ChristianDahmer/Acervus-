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
  LayoutGrid,
  List,
  Sparkles,
  Receipt,
  MapPin,
  ChevronLeft,
  ChevronRight,
  RotateCcw,
  Filter,
  CalendarDays,
  X,
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
  onUpdateWebForm?: (form: FormularioWeb) => void;
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
  onUpdateWebForm,
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
  const [showOnlyFuture, setShowOnlyFuture] = useState(false);
  const [modoCalendario, setModoCalendario] = useState<ModoCalendario>('MENSAL');
  const [anchorDate, setAnchorDate] = useState<Date>(() => new Date());
  const [selectedDates, setSelectedDates] = useState<string[]>([]);
  const [selectionMode, setSelectionMode] = useState<'INDIVIDUAL' | 'INTERVALO'>('INDIVIDUAL');
  const [rangeStart, setRangeStart] = useState<string | null>(null);
  const [rangeEnd, setRangeEnd] = useState<string | null>(null);

  // Floating Drawer / Card Flutuante state
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);
  const [isCalendarMinimized, setIsCalendarMinimized] = useState(false);
  const [dragPos, setDragPos] = useState<{ x: number; y: number } | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const dragStartRef = React.useRef<{ x: number; y: number; initialX: number; initialY: number } | null>(null);

  const handleMouseDown = (e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest('.no-drag')) return;
    setIsDragging(true);
    const currentX = dragPos?.x || 0;
    const currentY = dragPos?.y || 0;
    dragStartRef.current = { x: e.clientX, y: e.clientY, initialX: currentX, initialY: currentY };
  };

  React.useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isDragging || !dragStartRef.current) return;
      const dx = e.clientX - dragStartRef.current.x;
      const dy = e.clientY - dragStartRef.current.y;
      setDragPos({
        x: dragStartRef.current.initialX + dx,
        y: dragStartRef.current.initialY + dy,
      });
    };

    const handleMouseUp = () => {
      setIsDragging(false);
    };

    if (isDragging) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
    }
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging]);

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

  const getDatesInRange = (startKey: string, endKey: string): string[] => {
    const [startYear, startMonth, startDay] = startKey.split('-').map(Number);
    const [endYear, endMonth, endDay] = endKey.split('-').map(Number);
    
    const startDate = new Date(startYear, startMonth - 1, startDay, 12, 0, 0);
    const endDate = new Date(endYear, endMonth - 1, endDay, 12, 0, 0);
    
    const dates: string[] = [];
    const current = new Date(startDate);
    
    while (current <= endDate) {
      const yyyy = current.getFullYear();
      const mm = String(current.getMonth() + 1).padStart(2, '0');
      const dd = String(current.getDate()).padStart(2, '0');
      dates.push(`${yyyy}-${mm}-${dd}`);
      current.setDate(current.getDate() + 1);
    }
    
    return dates;
  };

  const handleSelectDate = (dateKey: string) => {
    if (selectionMode === 'INDIVIDUAL') {
      if (selectedDates.includes(dateKey)) {
        setSelectedDates(selectedDates.filter((d) => d !== dateKey));
      } else {
        setSelectedDates([...selectedDates, dateKey]);
      }
    } else {
      // INTERVALO selection mode - limitado a no máximo 7 datas
      if (!rangeStart || (rangeStart && rangeEnd)) {
        setRangeStart(dateKey);
        setRangeEnd(null);
        setSelectedDates([dateKey]);
      } else {
        if (dateKey < rangeStart) {
          setRangeStart(dateKey);
          setSelectedDates([dateKey]);
        } else {
          let range = getDatesInRange(rangeStart, dateKey);
          if (range.length > 7) {
            range = range.slice(0, 7);
          }
          const finalDate = range[range.length - 1];
          setRangeEnd(finalDate);
          setSelectedDates(range);
          setIsCalendarOpen(false);
        }
      }
    }
  };

  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  // Filter reservations based on status tab AND calendar date selection AND search - Memoized for Performance
  const filteredReservas = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);
    const startOfTodayTime = startOfToday.getTime();

    // Início e Fim do mês atual (anchorDate)
    const startOfMonth = new Date(anchorDate.getFullYear(), anchorDate.getMonth(), 1, 0, 0, 0, 0).getTime();
    const endOfMonth = new Date(anchorDate.getFullYear(), anchorDate.getMonth() + 1, 0, 23, 59, 59, 999).getTime();

    return reservas.filter((r) => {
      if (filterStatus !== 'TODOS' && r.reserva.status !== filterStatus) return false;

      if (showOnlyFuture && r.reserva.dataDevolucao < startOfTodayTime) return false;

      if (selectedDates.length > 0) {
        const overlapsAny = selectedDates.some((dateStr) => {
          const [yr, mo, da] = dateStr.split('-').map(Number);
          const dStart = new Date(yr, mo - 1, da, 0, 0, 0).getTime();
          const dEnd = new Date(yr, mo - 1, da, 23, 59, 59, 999).getTime();
          return r.reserva.dataRetirada <= dEnd && r.reserva.dataDevolucao >= dStart;
        });
        if (!overlapsAny) return false;
      } else {
        // Por padrão: apresenta todas as reservas do mês (anchorDate)
        const overlapsMonth = r.reserva.dataRetirada <= endOfMonth && r.reserva.dataDevolucao >= startOfMonth;
        if (!overlapsMonth) return false;
      }

      if (term) {
        const matchClient = r.cliente.nome.toLowerCase().includes(term);
        const matchId = String(r.reserva.id).includes(term);
        const matchItem = r.itens.some((i) => i.nome.toLowerCase().includes(term));
        return matchClient || matchId || matchItem;
      }

      return true;
    });
  }, [reservas, filterStatus, selectedDates, searchTerm, showOnlyFuture, anchorDate]);

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
          <p className="text-[#A1A1AA] text-xs mt-1.5">Acompanhe retiradas, devoluções e contratos em aberto</p>
          <div className="w-full mt-3">
            <button
              onClick={onOpenNovaReserva}
              className="w-full inline-flex items-center justify-center gap-2 bg-[#D4AF37] hover:bg-[#E5C158] text-[#0A0A0B] px-4 h-[40px] rounded-xl text-xs font-bold uppercase tracking-wider shadow-md shadow-[#D4AF37]/10 transition-all cursor-pointer"
            >
              <Plus size={15} />
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

      {/* Banner de Filtro por Data Ativo (Inline sobre a tabela) */}
      {selectedDates.length > 0 && (
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2.5 bg-[#18181B] border border-[#D4AF37]/50 p-3.5 rounded-2xl text-xs shadow-lg animate-fade-in">
          <div className="flex items-center space-x-2 text-white">
            <Filter size={15} className="text-[#D4AF37] shrink-0" />
            <span>
              {selectedDates.length === 1 ? (
                <>
                  Filtrando reservas ativas para a data:{' '}
                  <strong className="text-[#D4AF37] font-mono font-bold">
                    {selectedDates[0].split('-').reverse().join('/')}
                  </strong>
                </>
              ) : (
                <>
                  Filtrando reservas ativas para{' '}
                  <strong className="text-[#D4AF37] font-bold">
                    {selectedDates.length} datas selecionadas
                  </strong>{' '}
                  {rangeStart && rangeEnd && (
                    <span className="text-[#A1A1AA] font-mono text-[10px] bg-[#111113] px-2 py-0.5 rounded border border-[#27272A] ml-1.5">
                      (de {rangeStart.split('-').reverse().join('/')} até {rangeEnd.split('-').reverse().join('/')})
                    </span>
                  )}
                </>
              )}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                setSelectedDates([]);
                setRangeStart(null);
                setRangeEnd(null);
              }}
              className="flex items-center space-x-1 text-[#A1A1AA] hover:text-white bg-[#27272A] hover:bg-[#3F3F46] px-2.5 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer shrink-0"
            >
              <XCircle size={13} />
              <span>Limpar Filtro</span>
            </button>
          </div>
        </div>
      )}

      {/* 🪟 BARRA DE SELEÇÃO DE CALENDÁRIO + CARD FLUTUANTE SUSPENSO ABAIXO */}
      <div className="relative bg-[#111113] border border-[#27272A] rounded-2xl p-3.5 sm:p-4 shadow-xl">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="flex items-center space-x-2.5">
            <div className="p-1.5 bg-[#18181B] border border-[#D4AF37]/30 rounded-xl text-[#D4AF37]">
              <CalendarDays size={18} />
            </div>
            <div>
              <h3 className="text-xs sm:text-sm font-semibold text-white flex items-center gap-2">
                <span>Calendário de Reservas</span>
                <span className="text-[10px] font-mono text-[#D4AF37] bg-[#18181B] px-2 py-0.5 rounded border border-[#27272A]">
                  {getHeaderPeriodText()}
                </span>
              </h3>
              <p className="text-[10px] text-[#71717A]">
                Exibindo reservas do mês ({getHeaderPeriodText()}) • Clique em Mensal, Quinzenal ou Semanal para abrir o calendário
              </p>
            </div>
          </div>

          {/* Inline Mode Selector Buttons (Semanal | Quinzenal | Mensal) */}
          <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto justify-between sm:justify-end">
            <div className="flex items-center p-1 bg-[#18181B] border border-[#27272A] rounded-xl text-xs font-medium text-[#71717A] gap-1 shadow-inner">
              <button
                type="button"
                onClick={() => {
                  if (isCalendarOpen && modoCalendario === 'SEMANAL') {
                    setIsCalendarOpen(false);
                  } else {
                    setModoCalendario('SEMANAL');
                    setIsCalendarOpen(true);
                    setIsCalendarMinimized(false);
                  }
                }}
                className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer font-semibold ${
                  isCalendarOpen && modoCalendario === 'SEMANAL'
                    ? 'bg-[#D4AF37] text-[#0A0A0B] shadow-md shadow-[#D4AF37]/10'
                    : 'hover:text-white hover:bg-[#27272A]'
                }`}
              >
                Semanal
              </button>
              <button
                type="button"
                onClick={() => {
                  if (isCalendarOpen && modoCalendario === 'QUINZENAL') {
                    setIsCalendarOpen(false);
                  } else {
                    setModoCalendario('QUINZENAL');
                    setIsCalendarOpen(true);
                    setIsCalendarMinimized(false);
                  }
                }}
                className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer font-semibold ${
                  isCalendarOpen && modoCalendario === 'QUINZENAL'
                    ? 'bg-[#D4AF37] text-[#0A0A0B] shadow-md shadow-[#D4AF37]/10'
                    : 'hover:text-white hover:bg-[#27272A]'
                }`}
              >
                Quinzenal
              </button>
              <button
                type="button"
                onClick={() => {
                  if (isCalendarOpen && modoCalendario === 'MENSAL') {
                    setIsCalendarOpen(false);
                  } else {
                    setModoCalendario('MENSAL');
                    setIsCalendarOpen(true);
                    setIsCalendarMinimized(false);
                  }
                }}
                className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer font-semibold ${
                  isCalendarOpen && modoCalendario === 'MENSAL'
                    ? 'bg-[#D4AF37] text-[#0A0A0B] shadow-md shadow-[#D4AF37]/10'
                    : 'hover:text-white hover:bg-[#27272A]'
                }`}
              >
                Mensal
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowOnlyFuture(!showOnlyFuture);
                  setCurrentPage(1);
                  setIsCalendarOpen(false);
                }}
                className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer font-semibold ${
                  showOnlyFuture
                    ? 'bg-[#D4AF37] text-[#0A0A0B] shadow-md shadow-[#D4AF37]/10'
                    : 'hover:text-white hover:bg-[#27272A]'
                }`}
              >
                Futuras
              </button>
            </div>
          </div>
        </div>

        {/* 🪟 CARD FLUTUANTE / POPOVER SUSPENSO DIRETO ABAIXO DA SELEÇÃO */}
        {isCalendarOpen && (
          <div
            onMouseDown={handleMouseDown}
            style={{ transform: `translate3d(${dragPos?.x || 0}px, ${dragPos?.y || 0}px, 0)` }}
            className="absolute left-0 right-0 top-full mt-2.5 z-50 bg-[#18181C]/5 backdrop-blur-md border border-[#D4AF37]/30 rounded-2xl p-4 shadow-2xl space-y-3.5 animate-in fade-in slide-in-from-top-3 cursor-grab active:cursor-grabbing select-none"
          >
            {/* Header com Navegação e Período */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2.5 border-b border-[#27272A]/40 pb-3">
              <div className="flex items-center space-x-2 text-xs text-[#A1A1AA]">
                <span className="text-[#D4AF37] font-semibold">{getHeaderPeriodText()}</span>
                <span>• Clique em um dia para filtrar os pedidos de reservas</span>
              </div>

              <div className="flex items-center space-x-1.5 self-end sm:self-auto">
                <button
                  type="button"
                  onClick={handlePrev}
                  className="no-drag p-1.5 bg-[#111113]/10 hover:bg-[#27272A]/40 text-[#A1A1AA] hover:text-white border border-[#27272A]/40 rounded-xl transition-all cursor-pointer"
                  title="Período Anterior"
                >
                  <ChevronLeft size={16} />
                </button>
                <button
                  type="button"
                  onClick={handleToday}
                  className="no-drag flex items-center gap-1.5 px-3 py-1.5 bg-[#111113]/10 hover:bg-[#27272A]/40 text-xs font-semibold text-[#D4AF37] border border-[#27272A]/40 rounded-xl transition-all cursor-pointer"
                >
                  <RotateCcw size={12} />
                  <span>Hoje</span>
                </button>
                <button
                  type="button"
                  onClick={handleNext}
                  className="no-drag p-1.5 bg-[#111113]/10 hover:bg-[#27272A]/40 text-[#A1A1AA] hover:text-white border border-[#27272A]/40 rounded-xl transition-all cursor-pointer"
                  title="Próximo Período"
                >
                  <ChevronRight size={16} />
                </button>
                <button
                  type="button"
                  onClick={() => setIsCalendarOpen(false)}
                  className="no-drag p-1.5 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 hover:text-rose-300 border border-rose-500/30 rounded-xl transition-all cursor-pointer ml-1"
                  title="Fechar Calendário"
                >
                  <X size={15} />
                </button>
              </div>
            </div>

            {/* Controller de Modo de Seleção de Datas */}
            <div className="no-drag flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2.5 bg-[#111113]/10 p-2.5 rounded-xl border border-[#27272A]/40 text-xs">
              <div className="flex items-center space-x-2 flex-wrap gap-1.5">
                <span className="text-[#A1A1AA] font-semibold text-[10px] uppercase tracking-wider">Modo de Seleção:</span>
                <div className="flex items-center p-0.5 bg-[#0A0A0B]/20 border border-[#27272A]/40 rounded-lg text-[11px] gap-1">
                  <button
                    type="button"
                    onClick={() => {
                      setSelectionMode('INDIVIDUAL');
                      setRangeStart(null);
                      setRangeEnd(null);
                    }}
                    className={`no-drag px-2.5 py-1 rounded-md transition-all cursor-pointer font-semibold ${
                      selectionMode === 'INDIVIDUAL'
                        ? 'bg-[#D4AF37] text-[#0A0A0B]'
                        : 'text-[#71717A] hover:text-white hover:bg-[#18181B]/30'
                    }`}
                  >
                    Múltiplos Individuais
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setSelectionMode('INTERVALO');
                      setSelectedDates([]);
                      setRangeStart(null);
                      setRangeEnd(null);
                    }}
                    className={`no-drag px-2.5 py-1 rounded-md transition-all cursor-pointer font-semibold ${
                      selectionMode === 'INTERVALO'
                        ? 'bg-[#D4AF37] text-[#0A0A0B]'
                        : 'text-[#71717A] hover:text-white hover:bg-[#18181B]/30'
                    }`}
                  >
                    Intervalo Sequencial (Até 7 dias)
                  </button>
                </div>
              </div>

              {selectedDates.length > 0 && (
                <div className="flex items-center justify-between sm:justify-end gap-2 shrink-0 w-full sm:w-auto">
                  <span className="text-[#A1A1AA] text-[10px] font-medium uppercase tracking-wide">
                    <strong className="text-[#D4AF37] font-mono text-xs">{selectedDates.length}</strong> dia(s) selecionado(s)
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedDates([]);
                      setRangeStart(null);
                      setRangeEnd(null);
                    }}
                    className="no-drag text-[10px] text-rose-400 hover:text-rose-300 bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 px-2 py-0.5 rounded-lg font-semibold transition-all cursor-pointer"
                  >
                    Limpar Seleção
                  </button>
                </div>
              )}
            </div>

            {/* Nome dos dias da semana em modo Mensal */}
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

            {/* Grid de Dias do Calendário */}
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
                const isSelected = selectedDates.includes(dateKey);
                const isRangeMiddle = selectionMode === 'INTERVALO' && rangeStart && rangeEnd && dateKey > rangeStart && dateKey < rangeEnd;
                const isDayToday = isToday(date);
                const dayNum = date.getDate();
                const weekDayName = DIAS_SEMANA[(date.getDay() + 6) % 7];

                return (
                  <button
                    type="button"
                    key={dateKey}
                    onClick={() => handleSelectDate(dateKey)}
                    className={`no-drag group relative flex flex-col items-center justify-center p-1 sm:p-1.5 rounded-xl border text-center transition-all cursor-pointer select-none min-h-[42px] ${
                      isSelected
                        ? isRangeMiddle
                          ? 'bg-[#D4AF37]/20 border-[#D4AF37]/50 text-[#D4AF37] shadow-sm'
                          : 'bg-[#D4AF37]/20 border-[#D4AF37] ring-2 ring-[#D4AF37]/40 shadow-md shadow-[#D4AF37]/10'
                        : isDayToday
                        ? 'bg-[#18181B]/10 border-[#D4AF37]/70 shadow-sm'
                        : !isCurrentMonth
                        ? 'bg-[#0A0A0B]/10 border-[#27272A]/20 opacity-30 hover:opacity-100'
                        : 'bg-[#0A0A0B]/10 border-[#27272A]/40 hover:border-[#3F3F46] hover:bg-[#18181B]/30'
                    }`}
                  >
                    {modoCalendario !== 'MENSAL' && (
                      <span
                        className={`text-[8px] font-bold uppercase tracking-wider leading-none mb-0.5 ${
                          isSelected || isDayToday ? 'text-[#D4AF37]' : 'text-[#71717A]'
                        }`}
                      >
                        {weekDayName}
                      </span>
                    )}

                    <div className="flex items-center gap-0.5 my-0">
                      <span
                        className={`font-mono text-[11px] sm:text-xs font-bold leading-tight ${
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
                        <span className="w-1 h-1 rounded-full bg-[#D4AF37] animate-pulse" title="Hoje" />
                      )}
                    </div>

                    <div className="mt-0.5 w-full flex items-center justify-center">
                      {hasReservas ? (
                        <span className="bg-[#D4AF37]/15 border border-[#D4AF37]/30 text-[#D4AF37] text-[8px] font-bold px-1 py-0.5 rounded-md flex items-center gap-0.5 leading-tight">
                          <span className="w-1 h-1 rounded-full bg-[#D4AF37]" />
                          <span>{dayReservas.length} {dayReservas.length === 1 ? 'res.' : 'res.'}</span>
                        </span>
                      ) : (
                        <span className="text-[8px] text-[#52525B] font-medium group-hover:text-[#71717A] transition-colors leading-tight">
                          Livre
                        </span>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
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
                setSelectedDates([]);
                setRangeStart(null);
                setRangeEnd(null);
                setShowOnlyFuture(false);
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
                            {(reserva.endereco || cliente.endereco) && (
                              <div className="pt-2 border-t border-[#1C1C1F] mt-1.5 flex flex-col gap-1 text-[11px] text-[#A1A1AA]">
                                <div className="flex items-start gap-1">
                                  <MapPin size={11} className="text-[#D4AF37] shrink-0 mt-0.5" />
                                  <span className="line-clamp-2">
                                    Local: <strong className="text-white font-normal">{reserva.endereco || cliente.endereco}</strong>
                                  </span>
                                </div>
                                {((reserva as any).valorFrete > 0 || (reserva as any).distanciaKm > 0) && (
                                  <div className="flex flex-wrap items-center gap-1.5 pl-3.5 mt-0.5">
                                    <span className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-1.5 py-0.2 rounded text-[10px] font-mono">
                                      Frete: {formatarMoeda((reserva as any).valorFrete)}
                                    </span>
                                    {(reserva as any).distanciaKm > 0 && (
                                      <span className="bg-blue-500/10 text-blue-400 border border-blue-500/20 px-1.5 py-0.2 rounded text-[10px] font-mono">
                                        {(reserva as any).distanciaKm} Km
                                      </span>
                                    )}
                                  </div>
                                )}
                              </div>
                            )}
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
                                {(reserva.endereco || cliente.endereco) && (
                                  <div className="text-[10px] text-[#D4AF37] mt-1 flex items-center gap-1" title={reserva.endereco || cliente.endereco}>
                                    <MapPin size={9} />
                                    <span className="truncate max-w-[180px]">{reserva.endereco || cliente.endereco}</span>
                                  </div>
                                )}
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
        onUpdateWebForm={onUpdateWebForm}
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

