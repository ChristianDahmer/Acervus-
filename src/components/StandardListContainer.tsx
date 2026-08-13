import React from 'react';
import { Search, X, LayoutGrid, List, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, Package, Filter, RotateCcw } from 'lucide-react';

export interface FilterTabOption<T extends string = string> {
  id: T;
  label: string;
  count?: number;
  badgeColor?: string;
}

export interface StandardListControlsProps<T extends string = string> {
  // Search
  searchTerm: string;
  onSearchChange: (term: string) => void;
  searchPlaceholder?: string;

  // View Mode Switcher
  viewMode?: 'grid' | 'list';
  onViewModeChange?: (mode: 'grid' | 'list') => void;
  showViewToggle?: boolean;

  // Filter Tabs
  filterTabs?: FilterTabOption<T>[];
  activeFilterTab?: T;
  onFilterTabChange?: (tabId: T) => void;

  // Secondary Category / Tag Chips
  categories?: string[];
  selectedCategory?: string;
  onCategoryChange?: (category: string) => void;

  // Pagination
  currentPage: number;
  totalPages: number;
  totalItems: number;
  itemsPerPage: number;
  onPageChange: (page: number) => void;
  onItemsPerPageChange?: (size: number) => void;
  pageSizeOptions?: number[];

  // Action Buttons on top right (optional)
  actions?: React.ReactNode;
  additionalControls?: React.ReactNode;
}

export const StandardListControls = <T extends string = string>({
  searchTerm,
  onSearchChange,
  searchPlaceholder = 'Buscar...',
  viewMode = 'grid',
  onViewModeChange,
  showViewToggle = true,
  filterTabs,
  activeFilterTab,
  onFilterTabChange,
  categories,
  selectedCategory,
  onCategoryChange,
  currentPage,
  totalPages,
  totalItems,
  itemsPerPage,
  onPageChange,
  onItemsPerPageChange,
  pageSizeOptions = [10, 25, 50, 100],
  additionalControls,
}: StandardListControlsProps<T>) => {
  const startItem = totalItems === 0 ? 0 : (currentPage - 1) * itemsPerPage + 1;
  const endItem = Math.min(currentPage * itemsPerPage, totalItems);

  return (
    <div className="space-y-3.5 bg-[#111113] border border-[#27272A] p-4 rounded-2xl shadow-lg">
      {/* Search Bar & View Mode Toggle side-by-side row */}
      <div className="flex flex-row items-center gap-2 w-full">
        {/* Search Input */}
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#71717A]" size={16} />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => {
              onSearchChange(e.target.value);
              onPageChange(1); // Reset to page 1 on search change
            }}
            placeholder={searchPlaceholder}
            className="w-full pl-10 pr-9 py-2.5 bg-[#18181B] border border-[#27272A] rounded-xl text-white placeholder-[#71717A] text-xs font-medium focus:outline-none focus:border-[#D4AF37] transition-all"
          />
          {searchTerm && (
            <button
              onClick={() => {
                onSearchChange('');
                onPageChange(1);
              }}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-[#71717A] hover:text-white p-1 rounded-md transition-colors"
              title="Limpar busca"
            >
              <X size={14} />
            </button>
          )}
        </div>

        {/* View Mode Toggle Switch (Grade vs Lista) */}
        {showViewToggle && onViewModeChange && (
          <div className="flex items-center p-1 bg-[#0A0A0B] border border-[#27272A] rounded-xl shrink-0">
            <button
              onClick={() => onViewModeChange('grid')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                viewMode === 'grid'
                  ? 'bg-[#18181B] text-[#D4AF37] border border-[#D4AF37]/40 shadow-sm'
                  : 'text-[#71717A] hover:text-white'
              }`}
              title="Visualização em Grade (Cards)"
            >
              <LayoutGrid size={14} />
              <span className="hidden xs:inline">Grade</span>
            </button>

            <button
              onClick={() => onViewModeChange('list')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                viewMode === 'list'
                  ? 'bg-[#18181B] text-[#D4AF37] border border-[#D4AF37]/40 shadow-sm'
                  : 'text-[#71717A] hover:text-white'
              }`}
              title="Visualização em Lista Compacta"
            >
              <List size={14} />
              <span className="hidden xs:inline">Lista</span>
            </button>
          </div>
        )}
      </div>

      {/* Filter Status Tabs (if provided) - placed on its own scrollable row on mobile */}
      {((filterTabs && filterTabs.length > 0) || additionalControls) && (
        <div className="flex flex-col sm:flex-row flex-wrap gap-2.5 items-stretch sm:items-center justify-between pt-0.5">
          {filterTabs && filterTabs.length > 0 && (
            <div className="flex items-center gap-1 bg-[#0A0A0B] p-1 rounded-xl border border-[#27272A] overflow-x-auto no-scrollbar shrink-0 max-w-full">
              {filterTabs.map((tab) => {
                const isActive = activeFilterTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => {
                      if (onFilterTabChange) onFilterTabChange(tab.id);
                      onPageChange(1);
                    }}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all cursor-pointer flex items-center gap-1.5 ${
                      isActive
                        ? 'bg-[#D4AF37] text-[#0A0A0B] font-bold shadow-md'
                        : 'text-[#A1A1AA] hover:text-white hover:bg-[#18181B]'
                    }`}
                  >
                    <span>{tab.label}</span>
                    {tab.count !== undefined && (
                      <span
                        className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold font-mono ${
                          isActive
                            ? 'bg-black/20 text-black'
                            : 'bg-[#18181B] text-[#71717A] border border-[#27272A]'
                        }`}
                      >
                        {tab.count}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          )}

          {additionalControls}
        </div>
      )}

      {/* Category Chips & Item Count Bar */}
      {(categories && categories.length > 0) || totalItems > 0 ? (
        <div className="flex flex-wrap items-center justify-between gap-3 pt-1 border-t border-[#27272A]/60">
          {categories && categories.length > 0 && onCategoryChange ? (
            <div className="flex flex-nowrap items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 no-scrollbar max-w-full">
              <span className="text-[10px] uppercase font-bold text-[#71717A] font-mono mr-1 shrink-0">
                Categoria:
              </span>
              {categories.map((cat) => (
                <button
                  key={cat}
                  onClick={() => {
                    onCategoryChange(cat);
                    onPageChange(1);
                  }}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-medium whitespace-nowrap shrink-0 transition-all cursor-pointer ${
                    selectedCategory === cat
                      ? 'bg-[#D4AF37]/20 text-[#D4AF37] border border-[#D4AF37]/50 font-semibold'
                      : 'bg-[#18181B] text-[#A1A1AA] hover:text-white border border-[#27272A]'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          ) : (
            <div />
          )}

          {/* Item counter & page size */}
          <div className="flex items-center justify-between w-full sm:w-auto gap-4 text-xs text-[#71717A] font-mono ml-auto">
            <span>
              Exibindo <strong className="text-white font-bold">{startItem}–{endItem}</strong> de{' '}
              <strong className="text-[#D4AF37] font-bold">{totalItems}</strong> itens
            </span>

            {onItemsPerPageChange && (
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] uppercase">Exibir:</span>
                <select
                  value={itemsPerPage}
                  onChange={(e) => {
                    onItemsPerPageChange(Number(e.target.value));
                    onPageChange(1);
                  }}
                  className="bg-[#18181B] border border-[#27272A] rounded-lg px-2 py-0.5 text-xs text-white focus:outline-none focus:border-[#D4AF37] cursor-pointer"
                >
                  {pageSizeOptions.map((opt) => (
                    <option key={opt} value={opt}>
                      {opt} por pág.
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
};

export interface StandardPaginationProps {
  currentPage: number;
  totalPages: number;
  totalItems: number;
  itemsPerPage: number;
  onPageChange: (page: number) => void;
}

export const StandardPagination: React.FC<StandardPaginationProps> = ({
  currentPage,
  totalPages,
  totalItems,
  itemsPerPage,
  onPageChange,
}) => {
  if (totalPages <= 1) return null;

  const startItem = (currentPage - 1) * itemsPerPage + 1;
  const endItem = Math.min(currentPage * itemsPerPage, totalItems);

  // Generate page numbers
  const getPageNumbers = () => {
    const pages: (number | '...')[] = [];
    if (totalPages <= 7) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
      pages.push(1);
      if (currentPage > 3) pages.push('...');
      const start = Math.max(2, currentPage - 1);
      const end = Math.min(totalPages - 1, currentPage + 1);
      for (let i = start; i <= end; i++) pages.push(i);
      if (currentPage < totalPages - 2) pages.push('...');
      pages.push(totalPages);
    }
    return pages;
  };

  return (
    <div className="bg-[#111113] border border-[#27272A] p-3 rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-3 text-xs font-mono">
      <div className="text-[#71717A]">
        Mostrando <span className="text-white font-bold">{startItem}–{endItem}</span> de{' '}
        <span className="text-[#D4AF37] font-bold">{totalItems}</span> registros (Página {currentPage} de {totalPages})
      </div>

      <div className="flex items-center gap-1">
        {/* First Page */}
        <button
          onClick={() => onPageChange(1)}
          disabled={currentPage === 1}
          className="p-1.5 bg-[#18181B] hover:bg-[#27272A] disabled:opacity-30 text-[#A1A1AA] hover:text-white border border-[#27272A] rounded-lg transition-all cursor-pointer disabled:cursor-not-allowed"
          title="Primeira Página"
        >
          <ChevronsLeft size={15} />
        </button>

        {/* Previous Page */}
        <button
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage === 1}
          className="p-1.5 bg-[#18181B] hover:bg-[#27272A] disabled:opacity-30 text-[#A1A1AA] hover:text-white border border-[#27272A] rounded-lg transition-all cursor-pointer disabled:cursor-not-allowed"
          title="Página Anterior"
        >
          <ChevronLeft size={15} />
        </button>

        {/* Page Numbers */}
        <div className="flex items-center gap-1 px-1">
          {getPageNumbers().map((pg, idx) => {
            if (pg === '...') {
              return (
                <span key={`dots-${idx}`} className="px-2 text-[#71717A]">
                  ...
                </span>
              );
            }

            const isCurrent = pg === currentPage;
            return (
              <button
                key={pg}
                onClick={() => onPageChange(pg as number)}
                className={`w-8 h-8 rounded-lg font-bold transition-all cursor-pointer flex items-center justify-center ${
                  isCurrent
                    ? 'bg-[#D4AF37] text-black font-extrabold shadow-md'
                    : 'bg-[#18181B] text-[#A1A1AA] hover:text-white hover:bg-[#27272A] border border-[#27272A]'
                }`}
              >
                {pg}
              </button>
            );
          })}
        </div>

        {/* Next Page */}
        <button
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage === totalPages}
          className="p-1.5 bg-[#18181B] hover:bg-[#27272A] disabled:opacity-30 text-[#A1A1AA] hover:text-white border border-[#27272A] rounded-lg transition-all cursor-pointer disabled:cursor-not-allowed"
          title="Próxima Página"
        >
          <ChevronRight size={15} />
        </button>

        {/* Last Page */}
        <button
          onClick={() => onPageChange(totalPages)}
          disabled={currentPage === totalPages}
          className="p-1.5 bg-[#18181B] hover:bg-[#27272A] disabled:opacity-30 text-[#A1A1AA] hover:text-white border border-[#27272A] rounded-lg transition-all cursor-pointer disabled:cursor-not-allowed"
          title="Última Página"
        >
          <ChevronsRight size={15} />
        </button>
      </div>
    </div>
  );
};

export interface StandardEmptyStateProps {
  icon?: React.ReactNode;
  title?: string;
  description?: string;
  onClearFilters?: () => void;
  actionText?: string;
  actionIcon?: React.ReactNode;
  onAction?: () => void;
}

export const StandardEmptyState: React.FC<StandardEmptyStateProps> = ({
  icon,
  title = 'Nenhum registro encontrado',
  description = 'Não foram encontrados resultados correspondentes aos seus termos de busca e filtros selecionados.',
  onClearFilters,
  actionText,
  actionIcon,
  onAction,
}) => {
  return (
    <div className="bg-[#111113] border border-[#27272A] rounded-2xl p-10 text-center space-y-4 shadow-xl animate-fade-in my-2">
      <div className="w-12 h-12 rounded-full bg-[#D4AF37]/10 text-[#D4AF37] mx-auto flex items-center justify-center border border-[#D4AF37]/20">
        {icon || <Package size={22} />}
      </div>
      <div className="space-y-1 max-w-md mx-auto">
        <h4 className="text-white text-base font-semibold font-serif italic">{title}</h4>
        <p className="text-[#A1A1AA] text-xs leading-relaxed">{description}</p>
      </div>

      <div className="flex flex-wrap items-center justify-center gap-2 pt-2">
        {onClearFilters && (
          <button
            type="button"
            onClick={onClearFilters}
            className="inline-flex items-center gap-1.5 bg-[#18181B] hover:bg-[#27272A] text-[#D4AF37] border border-[#D4AF37]/40 px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider transition-all cursor-pointer shadow-md active:scale-95"
          >
            <RotateCcw size={14} />
            <span>Resetar Filtros</span>
          </button>
        )}

        {onAction && actionText && (
          <button
            type="button"
            onClick={onAction}
            className="inline-flex items-center gap-1.5 bg-[#D4AF37] hover:bg-[#E5C158] text-[#0A0A0B] px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider transition-all cursor-pointer shadow-md active:scale-95"
          >
            {actionIcon}
            <span>{actionText}</span>
          </button>
        )}
      </div>
    </div>
  );
};
