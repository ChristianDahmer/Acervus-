import React, { useState, useRef, useMemo } from 'react';
import { ItemAcervo, CategoriaItem, ListVisibilityConfig, KitComponente, Cliente } from '../types';
import { formatarMoeda } from '../utils/whatsappTemplates';
import {
  Plus,
  Search,
  Edit2,
  Trash2,
  Share2,
  CheckSquare,
  Square,
  Package,
  AlertCircle,
  Camera,
  Image as ImageIcon,
  CheckCircle2,
  X,
  Eye,
  EyeOff,
  Boxes,
  Layers,
  Tag,
  LayoutGrid,
  List,
  Wrench,
  Copy,
  Maximize2,
  FileText,
} from 'lucide-react';
import { StandardListControls, StandardPagination, StandardEmptyState } from './StandardListContainer';

interface InventarioViewProps {
  itens: ItemAcervo[];
  categorias: CategoriaItem[];
  onAddItem: (item: Omit<ItemAcervo, 'id'>) => void;
  onEditItem: (item: ItemAcervo) => void;
  onDeleteItem: (id: number) => void;
  onGenerateWebForm: (selectedItems: ItemAcervo[]) => void;
  onSaveCategoria?: (categoria: CategoriaItem) => void;
  onGoToCategorias?: () => void;
  selectedClienteForWebForm?: Cliente | null;
  onClearClienteForWebForm?: () => void;
  listVisibility?: ListVisibilityConfig;
  startInSelectionMode?: boolean;
  onClearSelectionMode?: () => void;
}

export const InventarioView: React.FC<InventarioViewProps> = ({
  itens = [],
  categorias = [],
  onAddItem,
  onEditItem,
  onDeleteItem,
  onGenerateWebForm,
  onSaveCategoria,
  onGoToCategorias,
  selectedClienteForWebForm,
  onClearClienteForWebForm,
  listVisibility,
  startInSelectionMode,
  onClearSelectionMode,
}) => {
  const [isListVisible, setIsListVisible] = useState(() => {
    return listVisibility ? listVisibility.exibirInventarioPorPadrao !== false : true;
  });

  React.useEffect(() => {
    if (listVisibility) {
      setIsListVisible(listVisibility.exibirInventarioPorPadrao !== false);
    }
  }, [listVisibility]);

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('Todas');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [selectedForWebForm, setSelectedForWebForm] = useState<number[]>([]);
  const [isSelectionMode, setIsSelectionMode] = useState(() => !!selectedClienteForWebForm || !!startInSelectionMode);

  React.useEffect(() => {
    if (selectedClienteForWebForm || startInSelectionMode) {
      setIsSelectionMode(true);
      if (startInSelectionMode && onClearSelectionMode) {
        onClearSelectionMode(); // Reset it right away so it doesn't force selection mode if user toggles off later
      }
    }
  }, [selectedClienteForWebForm, startInSelectionMode, onClearSelectionMode]);

  // Add/Edit Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<ItemAcervo | null>(null);
  const [fullscreenItem, setFullscreenItem] = useState<ItemAcervo | null>(null);
  const [formData, setFormData] = useState({
    nome: '',
    descricao: '',
    quantidadeTotal: 1,
    precoAluguel: 50,
    categoria: 'Painéis & Decoração',
    imageUrl: '',
  });

  // Kits state
  const [isKit, setIsKit] = useState(false);
  const [kitComponentes, setKitComponentes] = useState<KitComponente[]>([]);
  const [tempCompId, setTempCompId] = useState<number>(0);
  const [tempCompQty, setTempCompQty] = useState<number>(1);

  // Quick Category Modal State
  const [isQuickCategoriaModalOpen, setIsQuickCategoriaModalOpen] = useState(false);
  const [newCatData, setNewCatData] = useState({ nome: '', descricao: '', cor: '#D4AF37' });

  // Local Device Image Selection Refs
  const galleryInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const [permissionNotice, setPermissionNotice] = useState<string | null>(null);

  // Helper to calculate the kit's real-time dynamic stock based on its components
  const getEffectiveStock = (item: ItemAcervo) => {
    if (item.isKit && item.kitComponentes && item.kitComponentes.length > 0) {
      const capacities = item.kitComponentes.map((comp) => {
        const compItem = itens.find((i) => i.id === comp.itemId);
        if (!compItem) return 0;
        return Math.floor(compItem.quantidadeTotal / comp.quantidade);
      });
      return Math.min(...capacities);
    }
    return item.quantidadeTotal;
  };

  // Synchronized Categories from props (Single Source of Truth) - Memoized for Performance
  const categories = useMemo(() => {
    return [
      'Todas',
      ...Array.from(
        new Set([
          ...(categorias || []).filter((c) => c.ativo).map((c) => c.nome),
          ...(itens || []).map((i) => i.categoria),
        ])
      ),
    ];
  }, [categorias, itens]);

  // Filtered Items - Memoized to prevent heavy re-filtering and to fix paginatedItems memoization break
  const filteredItems = useMemo(() => {
    const term = searchTerm.toLowerCase().trim();
    return itens.filter((item) => {
      const matchesSearch = !term || item.nome.toLowerCase().includes(term) ||
        (item.descricao && item.descricao.toLowerCase().includes(term));
      const matchesCategory = selectedCategory === 'Todas' || item.categoria === selectedCategory;
      return matchesSearch && matchesCategory;
    });
  }, [itens, searchTerm, selectedCategory]);

  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(12);

  const paginatedItems = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredItems.slice(start, start + itemsPerPage);
  }, [filteredItems, currentPage, itemsPerPage]);

  const totalPages = useMemo(() => {
    return Math.ceil(filteredItems.length / itemsPerPage);
  }, [filteredItems.length, itemsPerPage]);

  const handleToggleManutencao = (item: ItemAcervo) => {
    const nextStatus = item.statusManutencao === 'EM_MANUTENCAO' ? 'EM_DIA' : 'EM_MANUTENCAO';
    onEditItem({
      ...item,
      statusManutencao: nextStatus,
    });
  };

  const handleCopyItem = (item: ItemAcervo) => {
    onAddItem({
      nome: `${item.nome} (Cópia)`,
      descricao: item.descricao || '',
      quantidadeTotal: item.quantidadeTotal,
      precoAluguel: item.precoAluguel,
      categoria: item.categoria,
      imageUrl: item.imageUrl,
      statusManutencao: item.statusManutencao || 'EM_DIA',
      isKit: item.isKit,
      kitComponentes: item.kitComponentes ? [...item.kitComponentes] : undefined,
    });
  };

  const handleOpenAdd = () => {
    setEditingItem(null);
    const defaultCat = categorias.find((c) => c.ativo)?.nome || 'Painéis & Decoração';
    setFormData({
      nome: '',
      descricao: '',
      quantidadeTotal: 1,
      precoAluguel: 0,
      categoria: defaultCat,
      imageUrl: '',
    });
    setIsKit(false);
    setKitComponentes([]);
    const firstNonKit = itens.find((i) => !i.isKit);
    setTempCompId(firstNonKit ? firstNonKit.id : 0);
    setTempCompQty(1);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (item: ItemAcervo) => {
    setEditingItem(item);
    setFormData({
      nome: item.nome,
      descricao: item.descricao || '',
      quantidadeTotal: item.quantidadeTotal,
      precoAluguel: item.precoAluguel,
      categoria: item.categoria,
      imageUrl: item.imageUrl,
    });
    setIsKit(item.isKit || false);
    setKitComponentes(item.kitComponentes || []);
    const firstNonKit = itens.find((i) => !i.isKit && i.id !== item.id);
    setTempCompId(firstNonKit ? firstNonKit.id : 0);
    setTempCompQty(1);
    setIsModalOpen(true);
  };

  const handleGalleryFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const dataUrl = event.target?.result as string;
        setFormData((prev) => ({ ...prev, imageUrl: dataUrl }));
        setPermissionNotice('Imagem selecionada da galeria!');
        setTimeout(() => setPermissionNotice(null), 3000);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleCameraCaptureSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const dataUrl = event.target?.result as string;
        setFormData((prev) => ({ ...prev, imageUrl: dataUrl }));
        setPermissionNotice('Foto capturada com sucesso!');
        setTimeout(() => setPermissionNotice(null), 3000);
      };
      reader.readAsDataURL(file);
    }
  };

  const triggerGalleryPicker = () => {
    galleryInputRef.current?.click();
  };

  const triggerCameraPicker = () => {
    cameraInputRef.current?.click();
  };

  const handleSubmitModal = (e: React.FormEvent) => {
    e.preventDefault();
    
    let calculatedQty = formData.quantidadeTotal;
    if (isKit && kitComponentes.length > 0) {
      const capacities = kitComponentes.map((comp) => {
        const compItem = itens.find((i) => i.id === comp.itemId);
        if (!compItem) return 0;
        return Math.floor(compItem.quantidadeTotal / comp.quantidade);
      });
      calculatedQty = Math.min(...capacities);
    }

    const defaultPlaceholderImage = 'https://images.unsplash.com/photo-1517694712202-14dd9538aa97?auto=format&fit=crop&w=600&q=80';

    const submissionData = {
      ...formData,
      imageUrl: formData.imageUrl.trim() || defaultPlaceholderImage,
      quantidadeTotal: isKit ? calculatedQty : (formData.quantidadeTotal || 1),
      precoAluguel: formData.precoAluguel || 0,
      isKit,
      kitComponentes: isKit ? kitComponentes : undefined,
    };

    if (editingItem) {
      onEditItem({
        ...editingItem,
        ...submissionData,
      });
    } else {
      onAddItem(submissionData);
    }
    setIsModalOpen(false);
  };

  const toggleSelectForWebForm = (id: number) => {
    if (selectedForWebForm.includes(id)) {
      setSelectedForWebForm(selectedForWebForm.filter((item) => item !== id));
    } else {
      setSelectedForWebForm([...selectedForWebForm, id]);
    }
  };

  const handleConfirmWebFormGeneration = () => {
    const items = itens.filter((i) => selectedForWebForm.includes(i.id));
    if (items.length > 0) {
      onGenerateWebForm(items);
      setIsSelectionMode(false);
      setSelectedForWebForm([]);
    }
  };

  const handleFocusScroll = (e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setTimeout(() => {
      e.target.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }, 150);
  };

  return (
    <div className="space-y-6">
      {selectedClienteForWebForm && (
        <div className="bg-[#D4AF37]/10 border border-[#D4AF37]/40 text-white px-4 py-3 rounded-2xl flex items-center justify-between shadow-xl animate-fade-in">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-[#D4AF37]/20 rounded-xl text-[#D4AF37]">
              <FileText size={18} />
            </div>
            <div>
              <p className="text-xs text-[#A1A1AA] uppercase font-bold tracking-wider">Modo Orçamento Vinculado</p>
              <p className="text-sm font-bold text-white">Cliente: <span className="text-[#D4AF37]">{selectedClienteForWebForm.nome}</span> ({selectedClienteForWebForm.telefone})</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-xs text-[#A1A1AA] hidden sm:inline">Selecione abaixo os itens do acervo para gerar a proposta</span>
            {onClearClienteForWebForm && (
              <button
                onClick={onClearClienteForWebForm}
                className="px-3 py-1.5 bg-[#18181B] hover:bg-[#27272A] text-white border border-[#27272A] rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5"
              >
                <X size={14} />
                <span>Desvincular</span>
              </button>
            )}
          </div>
        </div>
      )}

      {/* Header controls */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 bg-[#111113] p-5 rounded-2xl border border-[#27272A]">
        <div>
          <h2 className="text-xl font-serif italic text-white flex items-center gap-3">
            <Package className="text-[#D4AF37]" size={22} />
            <span>Inventário do Acervo</span>
            <button
              onClick={() => setIsListVisible(!isListVisible)}
              className="text-[#71717A] hover:text-[#D4AF37] transition-colors p-1 rounded-lg bg-[#18181B] border border-[#27272A] cursor-pointer"
              title={isListVisible ? "Ocultar Listagem" : "Exibir Listagem"}
            >
              {isListVisible ? <EyeOff size={14} /> : <Eye size={14} />}
            </button>
          </h2>
          <p className="text-[#A1A1AA] text-xs mt-0.5">Gerencie o catálogo de equipamentos, kits e estoque disponível</p>
        </div>

        <div className="flex flex-col sm:flex-row sm:flex-wrap items-stretch sm:items-center gap-2 w-full lg:w-auto">
          <button
            onClick={() => {
              setIsSelectionMode(!isSelectionMode);
              setSelectedForWebForm([]);
            }}
            className={`flex items-center justify-center gap-2 px-3.5 py-2.5 rounded-xl text-xs font-semibold tracking-wide uppercase transition-all cursor-pointer w-full sm:w-auto shrink-0 ${
              isSelectionMode
                ? 'bg-[#D4AF37]/20 text-[#D4AF37] border border-[#D4AF37]/40'
                : 'bg-[#18181B] text-[#A1A1AA] hover:bg-[#27272A] hover:text-white border border-[#27272A]'
            }`}
          >
            <Share2 size={15} />
            <span>{isSelectionMode ? 'Cancelar Seleção' : 'Criar Orçamento'}</span>
          </button>

          <button
            onClick={handleOpenAdd}
            className="flex items-center justify-center gap-2 bg-[#D4AF37] hover:bg-[#E5C158] text-[#0A0A0B] px-4 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider shadow-lg shadow-[#D4AF37]/10 transition-all cursor-pointer w-full sm:w-auto shrink-0"
          >
            <Plus size={16} />
            <span>Adicionar Item</span>
          </button>
        </div>
      </div>

      {/* Summary Totalizers - Single Line Compact Bar */}
      <div className="bg-[#111113] border border-[#27272A] rounded-2xl p-3 flex flex-nowrap overflow-x-auto items-center justify-between gap-2 sm:gap-4 divide-x divide-[#27272A] shadow-xl no-scrollbar">
        {/* Total Itens */}
        <div className="flex items-center gap-3 px-3 min-w-[160px] flex-1">
          <div className="p-2 bg-[#18181B] border border-[#27272A] rounded-xl text-[#D4AF37] shrink-0">
            <Package size={16} />
          </div>
          <div>
            <span className="text-[10px] uppercase font-bold tracking-wider text-[#71717A] block whitespace-nowrap">Itens Cadastrados</span>
            <span className="text-base font-serif italic font-bold text-white leading-tight">{itens.length}</span>
          </div>
        </div>

        {/* Unidades em Estoque */}
        <div className="flex items-center gap-3 px-3 min-w-[160px] flex-1">
          <div className="p-2 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-emerald-400 shrink-0">
            <Boxes size={16} />
          </div>
          <div>
            <span className="text-[10px] uppercase font-bold tracking-wider text-[#71717A] block whitespace-nowrap">Peças em Estoque</span>
            <span className="text-base font-serif italic font-bold text-emerald-400 leading-tight">
              {itens.reduce((acc, item) => acc + item.quantidadeTotal, 0)}
            </span>
          </div>
        </div>

        {/* Kits */}
        <div className="flex items-center gap-3 px-3 min-w-[160px] flex-1">
          <div className="p-2 bg-purple-500/10 border border-purple-500/20 rounded-xl text-purple-400 shrink-0">
            <Layers size={16} />
          </div>
          <div>
            <span className="text-[10px] uppercase font-bold tracking-wider text-[#71717A] block whitespace-nowrap">Kits / Conjuntos</span>
            <span className="text-base font-serif italic font-bold text-purple-400 leading-tight">
              {itens.filter((item) => item.isKit).length}
            </span>
          </div>
        </div>

        {/* Média de Aluguel */}
        <div className="flex items-center gap-3 px-3 min-w-[170px] flex-1">
          <div className="p-2 bg-[#D4AF37]/10 border border-[#D4AF37]/20 rounded-xl text-[#D4AF37] shrink-0">
            <Tag size={16} />
          </div>
          <div>
            <span className="text-[10px] uppercase font-bold tracking-wider text-[#71717A] block whitespace-nowrap">Méd. Aluguel</span>
            <span className="text-sm font-mono font-bold text-[#D4AF37] leading-tight">
              R$ {itens.length > 0 ? (itens.reduce((acc, item) => acc + item.precoAluguel, 0) / itens.length).toFixed(0) : '0'}
            </span>
          </div>
        </div>
      </div>

      {/* Selection bar if active */}
      {isSelectionMode && (
        <div className="bg-[#18181B] border border-[#D4AF37]/40 p-4 rounded-xl flex items-center justify-between text-[#E4E4E7]">
          <div className="flex items-center gap-2">
            <CheckSquare className="text-[#D4AF37]" size={20} />
            <span className="font-medium text-sm">
              {selectedForWebForm.length} item(ns) selecionado(s) para criar Orçamento
            </span>
          </div>
          <button
            disabled={selectedForWebForm.length === 0}
            onClick={handleConfirmWebFormGeneration}
            className="bg-[#D4AF37] hover:bg-[#E5C158] disabled:opacity-40 text-[#0A0A0B] font-bold uppercase tracking-wider px-4 py-2 rounded-lg text-xs transition-all shadow-md cursor-pointer"
          >
            Gerar Orçamento
          </button>
        </div>
      )}

      {!isListVisible ? (
        <div className="bg-[#111113] border border-[#27272A] rounded-2xl p-12 text-center space-y-4 shadow-xl animate-fade-in">
          <div className="w-12 h-12 rounded-full bg-[#D4AF37]/10 text-[#D4AF37] mx-auto flex items-center justify-center">
            <EyeOff size={24} />
          </div>
          <div className="space-y-1">
            <h4 className="text-white text-sm font-semibold">Listagem Oculta</h4>
            <p className="text-[#A1A1AA] text-xs max-w-sm mx-auto">
              A listagem de itens do acervo está oculta por padrão para uma interface mais limpa.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setIsListVisible(true)}
            className="inline-flex items-center gap-2 bg-[#D4AF37] hover:bg-[#E5C158] text-[#0A0A0B] px-5 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider transition-all cursor-pointer shadow-lg shadow-[#D4AF37]/10 active:scale-95"
          >
            <Eye size={14} />
            <span>Exibir Listagem de Itens</span>
          </button>
        </div>
      ) : (
        <>
          {/* Standardized Search, Filters, View Mode Toggle & Pagination Info */}
          <StandardListControls
            searchTerm={searchTerm}
            onSearchChange={setSearchTerm}
            searchPlaceholder="Buscar equipamento no acervo..."
            viewMode={viewMode}
            onViewModeChange={setViewMode}
            categories={categories}
            selectedCategory={selectedCategory}
            onCategoryChange={setSelectedCategory}
            currentPage={currentPage}
            totalPages={totalPages}
            totalItems={filteredItems.length}
            itemsPerPage={itemsPerPage}
            onPageChange={setCurrentPage}
            onItemsPerPageChange={setItemsPerPage}
          />

          {filteredItems.length === 0 ? (
            <StandardEmptyState
              icon={<Package size={22} />}
              title="Nenhum equipamento encontrado"
              description="Não encontramos nenhum item no acervo com os filtros ou buscas informados."
              onClearFilters={() => {
                setSearchTerm('');
                setSelectedCategory('Todas');
                setCurrentPage(1);
              }}
              actionText="Adicionar Item"
              actionIcon={<Plus size={16} />}
              onAction={handleOpenAdd}
            />
          ) : (
            <>
              {/* Items Container: Grade or Lista */}
              {viewMode === 'grid' ? (
                /* MODE 1: GRADE (GRID) */
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                  {paginatedItems.map((item) => {
                    const isSelected = selectedForWebForm.includes(item.id);
                    const effectiveStock = getEffectiveStock(item);
                    const hasStock = effectiveStock > 0;

                    return (
                      <div
                        key={item.id}
                        onClick={() => isSelectionMode && toggleSelectForWebForm(item.id)}
                        onDoubleClick={() => setFullscreenItem(item)}
                        title="Dica: Dê dois cliques para abrir em tela cheia"
                        className={`bg-[#111113] border rounded-2xl overflow-hidden shadow-xl transition-all flex flex-col cursor-pointer ${
                      isSelectionMode ? 'cursor-pointer hover:border-[#D4AF37]' : ''
                    } ${
                      isSelected
                        ? 'border-[#D4AF37] bg-[#18181B] shadow-[#D4AF37]/5'
                        : 'border-[#27272A] hover:border-[#3F3F46]'
                    }`}
                  >
                    {/* Image & Badges */}
                    <div className="relative h-48 bg-[#0A0A0B] overflow-hidden group">
                      <img
                        src={item.imageUrl}
                        alt={item.nome}
                        className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105 opacity-90 group-hover:opacity-100"
                        onError={(e) => {
                          (e.target as HTMLElement).style.display = 'none';
                        }}
                      />

                      {/* Category Badge */}
                      <div className="absolute top-3 left-3 bg-[#0A0A0B]/80 backdrop-blur-md border border-[#27272A] text-[#E4E4E7] text-xs px-2.5 py-1 rounded-full font-medium">
                        {item.categoria}
                      </div>

                      {/* Maintenance Status Badge */}
                      {item.statusManutencao && item.statusManutencao !== 'EM_DIA' && (
                        <div className={`absolute top-3 left-3 translate-y-8 backdrop-blur-md text-[9px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider ${
                          item.statusManutencao === 'EM_MANUTENCAO' 
                            ? 'bg-red-500/95 text-white border border-red-500/30' 
                            : 'bg-amber-500/95 text-black border border-amber-500/30'
                        }`}>
                          {item.statusManutencao === 'EM_MANUTENCAO' ? '🛠️ Em Oficina' : '⚠️ Revisar'}
                        </div>
                      )}

                      {/* Selection Checkbox */}
                      {isSelectionMode && (
                        <div className="absolute top-3 right-3 bg-[#0A0A0B]/90 rounded-lg p-1 text-[#D4AF37] shadow">
                          {isSelected ? <CheckSquare size={20} /> : <Square size={20} />}
                        </div>
                      )}

                      {/* Stock status overlay */}
                      <div className="absolute bottom-3 right-3">
                        {hasStock ? (
                          <span className="bg-[#18181B]/90 border border-emerald-500/40 text-emerald-400 text-xs font-semibold px-2.5 py-1 rounded-full backdrop-blur-md">
                            Estoque: {effectiveStock} un.
                          </span>
                        ) : (
                          <span className="bg-[#18181B]/90 border border-rose-500/40 text-rose-400 text-xs font-semibold px-2.5 py-1 rounded-full backdrop-blur-md flex items-center gap-1">
                            <AlertCircle size={12} /> Sem Estoque
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Card Body */}
                    <div className="p-5 flex-1 flex flex-col justify-between space-y-4">
                      <div>
                        <h3 className="font-semibold text-white text-base leading-snug flex items-center gap-1.5 flex-wrap">
                          {item.isKit && (
                            <span className="bg-[#D4AF37]/15 text-[#D4AF37] border border-[#D4AF37]/35 text-[9px] px-1.5 py-0.5 rounded uppercase font-bold tracking-wider shrink-0">
                              Kit
                            </span>
                          )}
                          <span>{item.nome}</span>
                        </h3>
                        
                        {item.descricao && (
                          <p className="text-xs text-[#A1A1AA] line-clamp-2 mt-1.5 leading-relaxed">
                            {item.descricao}
                          </p>
                        )}
                        
                        {item.isKit && item.kitComponentes && item.kitComponentes.length > 0 && (
                          <div className="mt-2.5 p-2.5 bg-[#18181B] rounded-xl border border-[#27272A] space-y-1.5">
                            <p className="text-[9px] uppercase tracking-wider text-[#71717A] font-bold">Componentes do Kit:</p>
                            <div className="text-[11px] text-[#A1A1AA] space-y-1">
                              {item.kitComponentes.map((comp, idx) => {
                                const compItem = itens.find((i) => i.id === comp.itemId);
                                return (
                                  <div key={idx} className="flex justify-between items-center">
                                    <span className="truncate max-w-[140px]">• {compItem?.nome || `Item #${comp.itemId}`}</span>
                                    <span className="text-[#D4AF37] font-semibold bg-[#111113] px-1.5 py-0.2 rounded border border-[#27272A] text-[10px]">
                                      x{comp.quantidade}
                                    </span>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        )}

                        <div className="mt-2 text-2xl font-serif italic text-[#D4AF37]">
                          {formatarMoeda(item.precoAluguel)}{' '}
                          <span className="text-xs font-sans not-italic text-[#71717A]">/ dia</span>
                        </div>
                      </div>

                      {/* Action buttons */}
                      {!isSelectionMode && (
                        <div className="flex flex-wrap items-center justify-between border-t border-[#27272A] pt-3 gap-1">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleOpenEdit(item);
                            }}
                            className="flex items-center gap-1 text-xs text-[#A1A1AA] hover:text-[#D4AF37] transition-colors p-1 cursor-pointer"
                            title="Editar Item"
                          >
                            <Edit2 size={13} /> <span>Editar</span>
                          </button>

                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleToggleManutencao(item);
                            }}
                            className={`flex items-center gap-1 text-xs transition-colors p-1 cursor-pointer ${
                              item.statusManutencao === 'EM_MANUTENCAO'
                                ? 'text-amber-400 hover:text-emerald-400 font-bold'
                                : 'text-[#A1A1AA] hover:text-amber-400'
                            }`}
                            title={item.statusManutencao === 'EM_MANUTENCAO' ? 'Concluir Manutenção' : 'Definir em Manutenção'}
                          >
                            <Wrench size={13} /> <span>{item.statusManutencao === 'EM_MANUTENCAO' ? 'Oficina' : 'Manutenção'}</span>
                          </button>

                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleCopyItem(item);
                            }}
                            className="flex items-center gap-1 text-xs text-[#A1A1AA] hover:text-emerald-400 transition-colors p-1 cursor-pointer"
                            title="Copiar/Duplicar Item"
                          >
                            <Copy size={13} /> <span>Copiar</span>
                          </button>

                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              onDeleteItem(item.id);
                            }}
                            className="flex items-center gap-1 text-xs text-[#A1A1AA] hover:text-rose-400 transition-colors p-1 cursor-pointer"
                            title="Excluir Item"
                          >
                            <Trash2 size={13} /> <span>Excluir</span>
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            /* MODE 2: LISTA (LIST) */
            <div className="bg-[#111113] border border-[#27272A] rounded-2xl overflow-hidden shadow-xl">
              {/* Table Header for Desktop */}
              <div className="hidden md:grid grid-cols-12 gap-4 p-4 bg-[#18181B]/80 border-b border-[#27272A] text-[11px] font-mono font-bold uppercase tracking-wider text-[#71717A]">
                <div className="col-span-5 flex items-center gap-2">
                  {isSelectionMode && <span className="w-6"></span>}
                  <span>Item / Equipamento</span>
                </div>
                <div className="col-span-2">Categoria</div>
                <div className="col-span-2 text-center">Estoque</div>
                <div className="col-span-2 text-right">Diária</div>
                <div className="col-span-1 text-right">Ações</div>
              </div>

              {/* List Rows */}
              <div className="divide-y divide-[#27272A]">
                {paginatedItems.map((item) => {
                  const isSelected = selectedForWebForm.includes(item.id);
                  const effectiveStock = getEffectiveStock(item);
                  const hasStock = effectiveStock > 0;

                  return (
                    <div
                      key={item.id}
                      onClick={() => isSelectionMode && toggleSelectForWebForm(item.id)}
                      onDoubleClick={() => setFullscreenItem(item)}
                      title="Dica: Dê dois cliques para abrir em tela cheia"
                      className={`p-3.5 sm:p-4 transition-all hover:bg-[#18181B]/60 flex flex-col md:grid md:grid-cols-12 gap-3 md:gap-4 md:items-center cursor-pointer ${
                        isSelectionMode ? 'cursor-pointer' : ''
                      } ${isSelected ? 'bg-[#D4AF37]/5 border-l-4 border-l-[#D4AF37]' : ''}`}
                    >
                      {/* Col 1: Item Thumbnail & Title */}
                      <div className="md:col-span-5 flex items-center gap-3">
                        {isSelectionMode && (
                          <div className="text-[#D4AF37] shrink-0">
                            {isSelected ? <CheckSquare size={18} /> : <Square size={18} />}
                          </div>
                        )}

                        <div className="w-12 h-12 rounded-xl bg-[#0A0A0B] overflow-hidden border border-[#27272A] shrink-0 relative group">
                          <img
                            src={item.imageUrl}
                            alt={item.nome}
                            className="w-full h-full object-cover transition-transform group-hover:scale-110"
                            onError={(e) => {
                              (e.target as HTMLElement).style.display = 'none';
                            }}
                          />
                          {item.isKit && (
                            <span className="absolute bottom-0 inset-x-0 bg-[#D4AF37] text-black text-[8px] font-extrabold text-center uppercase tracking-tighter">
                              Kit
                            </span>
                          )}
                        </div>

                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <h4 className="font-semibold text-white text-sm truncate">{item.nome}</h4>
                            {item.isKit && (
                              <span className="hidden md:inline-block bg-[#D4AF37]/15 text-[#D4AF37] border border-[#D4AF37]/30 text-[9px] px-1.5 py-0.2 rounded font-bold uppercase">
                                Kit
                              </span>
                            )}
                            {item.statusManutencao && item.statusManutencao !== 'EM_DIA' && (
                              <span className={`text-[9px] px-1.5 py-0.2 rounded font-bold uppercase ${
                                item.statusManutencao === 'EM_MANUTENCAO' ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30' : 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                              }`}>
                                {item.statusManutencao === 'EM_MANUTENCAO' ? 'Oficina' : 'Revisar'}
                              </span>
                            )}
                          </div>

                          {item.descricao && (
                            <p className="text-[11px] text-[#A1A1AA] truncate mt-0.5">
                              {item.descricao}
                            </p>
                          )}

                          {item.isKit && item.kitComponentes && item.kitComponentes.length > 0 && (
                            <p className="text-[10px] text-[#A1A1AA] truncate mt-0.5">
                              Componentes: {item.kitComponentes.map(c => {
                                const comp = itens.find(i => i.id === c.itemId);
                                return `${c.quantidade}x ${comp?.nome || 'Item'}`;
                              }).join(', ')}
                            </p>
                          )}
                        </div>
                      </div>

                      {/* Col 2: Category */}
                      <div className="md:col-span-2 flex items-center justify-between md:justify-start">
                        <span className="text-[10px] uppercase font-bold text-[#71717A] md:hidden font-mono">Categoria:</span>
                        <span className="inline-block bg-[#18181B] border border-[#27272A] text-[#E4E4E7] text-xs px-2.5 py-1 rounded-full font-medium">
                          {item.categoria}
                        </span>
                      </div>

                      {/* Col 3: Stock */}
                      <div className="md:col-span-2 flex items-center justify-between md:justify-center">
                        <span className="text-[10px] uppercase font-bold text-[#71717A] md:hidden font-mono">Estoque:</span>
                        {hasStock ? (
                          <span className="bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-semibold px-2.5 py-0.5 rounded-full">
                            {effectiveStock} un.
                          </span>
                        ) : (
                          <span className="bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs font-semibold px-2 py-0.5 rounded-full flex items-center gap-1">
                            <AlertCircle size={11} /> Esgotado
                          </span>
                        )}
                      </div>

                      {/* Col 4: Daily Rental Price */}
                      <div className="md:col-span-2 flex items-center justify-between md:justify-end">
                        <span className="text-[10px] uppercase font-bold text-[#71717A] md:hidden font-mono">Diária:</span>
                        <div className="text-sm font-mono font-bold text-[#D4AF37]">
                          {formatarMoeda(item.precoAluguel)}
                          <span className="text-[10px] text-[#71717A] font-normal"> /dia</span>
                        </div>
                      </div>

                      {/* Col 5: Actions */}
                      <div className="md:col-span-1 flex items-center justify-end gap-1 border-t md:border-t-0 border-[#27272A] pt-2 md:pt-0 mt-1 md:mt-0">
                        {!isSelectionMode && (
                          <>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleOpenEdit(item);
                              }}
                              className="p-1.5 text-[#A1A1AA] hover:text-[#D4AF37] hover:bg-[#18181B] border border-transparent hover:border-[#27272A] rounded-lg transition-colors cursor-pointer"
                              title="Editar Item"
                            >
                              <Edit2 size={14} />
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleToggleManutencao(item);
                              }}
                              className={`p-1.5 transition-colors rounded-lg border border-transparent hover:border-[#27272A] hover:bg-[#18181B] cursor-pointer ${
                                item.statusManutencao === 'EM_MANUTENCAO'
                                  ? 'text-amber-400 font-bold'
                                  : 'text-[#A1A1AA] hover:text-amber-400'
                              }`}
                              title={item.statusManutencao === 'EM_MANUTENCAO' ? 'Concluir Manutenção' : 'Definir em Manutenção'}
                            >
                              <Wrench size={14} />
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleCopyItem(item);
                              }}
                              className="p-1.5 text-[#A1A1AA] hover:text-emerald-400 hover:bg-[#18181B] border border-transparent hover:border-[#27272A] rounded-lg transition-colors cursor-pointer"
                              title="Copiar Item"
                            >
                              <Copy size={14} />
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                onDeleteItem(item.id);
                              }}
                              className="p-1.5 text-[#A1A1AA] hover:text-rose-400 hover:bg-[#18181B] border border-transparent hover:border-[#27272A] rounded-lg transition-colors cursor-pointer"
                              title="Excluir Item"
                            >
                              <Trash2 size={14} />
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Standardized Pagination Controls */}
          <StandardPagination
            currentPage={currentPage}
            totalPages={totalPages}
            totalItems={filteredItems.length}
            itemsPerPage={itemsPerPage}
            onPageChange={setCurrentPage}
          />
        </>
      )}
      </>
      )}

      {/* Add / Edit Item Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-[#0A0A0B]/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-[#111113] border border-[#27272A] rounded-2xl max-w-md w-full max-h-[90vh] flex flex-col text-white shadow-2xl overflow-hidden my-auto">
            <div className="sticky top-0 z-20 bg-[#111113] border-b border-[#27272A] p-4 flex items-center justify-between shrink-0">
              <h3 className="text-lg font-serif italic text-[#D4AF37]">
                {editingItem ? 'Editar Item do Acervo' : 'Adicionar Novo Item ao Acervo'}
              </h3>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="text-[#71717A] hover:text-white p-1 rounded-lg cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSubmitModal} className="flex flex-col flex-1 overflow-hidden">
              <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar">
                <div>
                  <label className="block text-xs font-medium text-[#A1A1AA] mb-1">Nome do Item / Móvel</label>
                  <input
                    type="text"
                    required
                    value={formData.nome}
                    onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                    onFocus={handleFocusScroll}
                    className="w-full px-3 py-2 bg-[#18181B] border border-[#27272A] rounded-xl text-white text-sm focus:border-[#D4AF37] focus:outline-none"
                    placeholder="Ex: Painel Redondo ou Mesa MDF"
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-xs font-medium text-[#A1A1AA]">
                      Descrição do Item
                    </label>
                    <span className={`text-[10px] font-mono font-medium ${
                      formData.descricao.length >= 500 ? 'text-amber-400 font-bold' : 'text-[#71717A]'
                    }`}>
                      {formData.descricao.length}/512
                    </span>
                  </div>
                  <textarea
                    rows={3}
                    maxLength={512}
                    value={formData.descricao}
                    onChange={(e) => setFormData({ ...formData, descricao: e.target.value.slice(0, 512) })}
                    onFocus={handleFocusScroll}
                    className="w-full px-3 py-2 bg-[#18181B] border border-[#27272A] rounded-xl text-white text-sm focus:border-[#D4AF37] focus:outline-none resize-none placeholder:text-[#52525B]"
                    placeholder="Descreva detalhes, dimensões, cores, acabamento ou observações do item (máx. 512 caracteres)..."
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-[#A1A1AA] mb-1">
                      {isKit ? 'Estoque (Calculado)' : 'Qtd em Estoque'}
                    </label>
                    <input
                      type="number"
                      min="0"
                      required={!isKit}
                      disabled={isKit}
                      value={isKit ? (kitComponentes.length > 0 ? Math.min(...kitComponentes.map(comp => {
                        const compItem = itens.find(i => i.id === comp.itemId);
                        return compItem ? Math.floor(compItem.quantidadeTotal / comp.quantidade) : 0;
                      })) : 0) : formData.quantidadeTotal}
                      onChange={(e) => setFormData({ ...formData, quantidadeTotal: parseInt(e.target.value) || 0 })}
                      onFocus={handleFocusScroll}
                      className={`w-full px-3 py-2 bg-[#18181B] border border-[#27272A] rounded-xl text-white text-sm focus:border-[#D4AF37] focus:outline-none ${isKit ? 'opacity-60 cursor-not-allowed' : ''}`}
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-[#A1A1AA] mb-1">Preço Aluguel (R$/dia)</label>
                    <input
                      type="number"
                      min="0"
                      step="0.5"
                      required
                      placeholder="0,00"
                      value={formData.precoAluguel === 0 ? '' : formData.precoAluguel}
                      onChange={(e) => setFormData({ ...formData, precoAluguel: parseFloat(e.target.value) || 0 })}
                      onFocus={handleFocusScroll}
                      className="w-full px-3 py-2 bg-[#18181B] border border-[#27272A] rounded-xl text-white text-sm focus:border-[#D4AF37] focus:outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-[#A1A1AA] mb-1">Categoria</label>
                  <div className="flex gap-2">
                    <select
                      value={formData.categoria}
                      onChange={(e) => setFormData({ ...formData, categoria: e.target.value })}
                      className="flex-1 px-3 py-2 bg-[#18181B] border border-[#27272A] rounded-xl text-white text-sm focus:border-[#D4AF37] focus:outline-none"
                    >
                      {(categorias || [])
                        .filter((c) => c.ativo || c.nome === formData.categoria)
                        .map((cat) => (
                          <option key={cat.id} value={cat.nome}>
                            {cat.nome}
                          </option>
                        ))}
                      {!(categorias || []).some((c) => c.nome === formData.categoria) && formData.categoria && (
                        <option value={formData.categoria}>{formData.categoria}</option>
                      )}
                    </select>

                    <button
                      type="button"
                      onClick={() => {
                        setNewCatData({ nome: '', descricao: '', cor: '#D4AF37' });
                        setIsQuickCategoriaModalOpen(true);
                      }}
                      title="Adicionar ou gerenciar categorias"
                      className="px-3 py-2 bg-[#27272A] hover:bg-[#3F3F46] border border-[#3F3F46] hover:border-[#D4AF37] text-[#D4AF37] hover:text-white rounded-xl flex items-center justify-center gap-1.5 transition-all cursor-pointer shrink-0 text-xs font-semibold"
                    >
                      <Plus size={16} />
                      <span className="hidden sm:inline">Nova</span>
                    </button>
                  </div>
                </div>

                {/* Kit Builder Panel */}
                <div className="border-t border-[#27272A] pt-4 space-y-4">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-white flex items-center gap-1.5">
                    <Package className="text-[#D4AF37]" size={15} />
                    Este item é um kit
                  </label>
                  <input
                    type="checkbox"
                    checked={isKit}
                    onChange={(e) => setIsKit(e.target.checked)}
                    className="rounded border-[#3F3F46] text-[#D4AF37] focus:ring-[#D4AF37] w-4 h-4 cursor-pointer"
                  />
                </div>

                {isKit && (
                  <div className="bg-[#0A0A0B] p-4 rounded-xl border border-[#27272A] space-y-4">
                    <p className="text-[11px] text-[#A1A1AA] leading-relaxed">
                      Selecione os itens individuais que compõem este kit. A disponibilidade do kit será calculada dinamicamente com base no estoque de cada componente.
                    </p>

                    {/* Component Add Row */}
                    <div className="grid grid-cols-1 sm:grid-cols-12 gap-2">
                      <div className="sm:col-span-7">
                        <label className="block text-[10px] text-[#71717A] uppercase font-bold mb-1">Item Componente</label>
                        <select
                          value={tempCompId}
                          onChange={(e) => setTempCompId(Number(e.target.value))}
                          className="w-full px-2.5 py-1.5 bg-[#18181B] border border-[#27272A] rounded-lg text-xs text-white focus:outline-none focus:border-[#D4AF37]"
                        >
                          <option value="0">Selecione um item...</option>
                          {itens
                            .filter((i) => !i.isKit && i.id !== editingItem?.id)
                            .map((i) => (
                              <option key={i.id} value={i.id}>
                                {i.nome} (Estoque: {i.quantidadeTotal})
                              </option>
                            ))}
                        </select>
                      </div>
                      <div className="sm:col-span-3">
                        <label className="block text-[10px] text-[#71717A] uppercase font-bold mb-1">Qtd</label>
                        <input
                          type="number"
                          min="1"
                          value={tempCompQty}
                          onChange={(e) => setTempCompQty(Math.max(1, parseInt(e.target.value) || 1))}
                          className="w-full px-2.5 py-1.5 bg-[#18181B] border border-[#27272A] rounded-lg text-xs text-white focus:outline-none focus:border-[#D4AF37]"
                        />
                      </div>
                      <div className="sm:col-span-2 flex items-end">
                        <button
                          type="button"
                          onClick={() => {
                            if (tempCompId === 0) return;
                            // Check if already exists in kit components
                            const exists = kitComponentes.some((c) => c.itemId === tempCompId);
                            if (exists) {
                              setKitComponentes(
                                kitComponentes.map((c) =>
                                  c.itemId === tempCompId ? { ...c, quantidade: c.quantidade + tempCompQty } : c
                                )
                              );
                            } else {
                              setKitComponentes([...kitComponentes, { itemId: tempCompId, quantidade: tempCompQty }]);
                            }
                            setTempCompQty(1);
                          }}
                          className="w-full py-1.5 bg-[#D4AF37] hover:bg-[#E5C158] text-[#0A0A0B] rounded-lg font-bold text-sm flex items-center justify-center cursor-pointer transition-colors"
                        >
                          +
                        </button>
                      </div>
                    </div>

                    {/* Selected Components List */}
                    <div className="space-y-1.5">
                      <label className="block text-[10px] text-[#71717A] uppercase font-bold">Componentes do Kit ({kitComponentes.length})</label>
                      {kitComponentes.length === 0 ? (
                        <p className="text-[11px] text-[#71717A] italic text-center py-2 bg-[#111113] rounded-lg border border-[#27272A]">Nenhum componente adicionado ainda.</p>
                      ) : (
                        <div className="space-y-1 max-h-32 overflow-y-auto pr-1">
                          {kitComponentes.map((comp, idx) => {
                            const itemInfo = itens.find((i) => i.id === comp.itemId);
                            return (
                              <div key={idx} className="flex items-center justify-between bg-[#111113] px-3 py-1.5 rounded-lg border border-[#27272A] text-xs">
                                <span className="text-white font-medium">{itemInfo?.nome || `Item #${comp.itemId}`}</span>
                                <div className="flex items-center gap-3">
                                  <span className="text-[#D4AF37] font-bold">x{comp.quantidade}</span>
                                  <button
                                    type="button"
                                    onClick={() => setKitComponentes(kitComponentes.filter((_, i) => i !== idx))}
                                    className="text-rose-400 hover:text-rose-300 cursor-pointer"
                                  >
                                    <X size={14} />
                                  </button>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>

                    {/* Calculated Kit Stock Indicator */}
                    {kitComponentes.length > 0 && (
                      <div className="bg-[#D4AF37]/5 border border-[#D4AF37]/20 p-2.5 rounded-lg text-[11px] flex items-center justify-between text-white">
                        <span>Estoque do Kit Vinculado:</span>
                        <strong className="text-[#D4AF37] text-xs">
                          {Math.min(
                            ...kitComponentes.map((comp) => {
                              const compItem = itens.find((i) => i.id === comp.itemId);
                              if (!compItem) return 0;
                              return Math.floor(compItem.quantidadeTotal / comp.quantidade);
                            })
                          )}{' '}
                          unidades
                        </strong>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Hidden file inputs */}
              <input
                type="file"
                ref={galleryInputRef}
                accept="image/*"
                onChange={handleGalleryFileSelect}
                className="hidden"
              />
              <input
                type="file"
                ref={cameraInputRef}
                accept="image/*"
                capture="environment"
                onChange={handleCameraCaptureSelect}
                className="hidden"
              />

              {/* Photo Upload Section */}
              <div className="bg-[#18181B] border border-[#27272A] p-4 rounded-xl space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <label className="block text-xs font-bold text-white flex items-center gap-1.5">
                      <ImageIcon size={15} className="text-[#D4AF37]" />
                      Foto do Item
                    </label>
                    <p className="text-[11px] text-[#A1A1AA]">
                      Selecione uma imagem da galeria ou capture uma nova foto.
                    </p>
                  </div>
                </div>

                {/* Notification toast */}
                {permissionNotice && (
                  <div className="bg-[#D4AF37]/10 border border-[#D4AF37]/40 p-2.5 rounded-lg text-xs text-[#D4AF37] flex items-center gap-2">
                    <CheckCircle2 size={15} className="shrink-0" />
                    <span>{permissionNotice}</span>
                  </div>
                )}

                {/* Photo Action Buttons */}
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={triggerCameraPicker}
                    className="flex items-center justify-center gap-2 bg-[#27272A] hover:bg-[#3F3F46] text-white px-3 py-2.5 rounded-xl text-xs font-medium transition-all cursor-pointer border border-[#3F3F46]"
                  >
                    <Camera size={16} className="text-[#D4AF37]" />
                    <span>Tirar Foto</span>
                  </button>

                  <button
                    type="button"
                    onClick={triggerGalleryPicker}
                    className="flex items-center justify-center gap-2 bg-[#27272A] hover:bg-[#3F3F46] text-white px-3 py-2.5 rounded-xl text-xs font-medium transition-all cursor-pointer border border-[#3F3F46]"
                  >
                    <ImageIcon size={16} className="text-[#D4AF37]" />
                    <span>Galeria de Fotos</span>
                  </button>
                </div>

                {/* Clean Photo Preview */}
                {formData.imageUrl && (
                  <div className="bg-[#111113] border border-[#27272A] p-3 rounded-xl flex items-center gap-3">
                    <img
                      src={formData.imageUrl}
                      alt="Preview"
                      className="w-16 h-16 object-cover rounded-lg border border-[#27272A] shrink-0"
                    />
                    <div className="flex-1 min-w-0 space-y-1">
                      <p className="text-xs text-[#E4E4E7] font-semibold flex items-center gap-1.5">
                        <CheckCircle2 size={14} className="text-emerald-400" />
                        Imagem selecionada
                      </p>
                      <p className="text-[11px] text-[#A1A1AA]">
                        A foto foi vinculada a este item do acervo.
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>

              <div className="sticky bottom-0 z-20 bg-[#111113]/95 backdrop-blur-md border-t border-[#27272A] p-4 flex items-center justify-end gap-3 shrink-0">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 bg-[#18181B] border border-[#27272A] hover:bg-[#27272A] text-[#A1A1AA] rounded-xl text-xs font-semibold uppercase tracking-wider cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 bg-[#D4AF37] hover:bg-[#E5C158] text-[#0A0A0B] rounded-xl text-xs font-bold uppercase tracking-wider shadow-md cursor-pointer flex items-center gap-1.5"
                >
                  <CheckCircle2 size={14} />
                  <span>Salvar Item</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL DE ADIÇÃO RÁPIDA DE CATEGORIA */}
      {isQuickCategoriaModalOpen && (
        <div className="fixed inset-0 z-[60] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-[#18181B] border border-[#27272A] rounded-2xl max-w-sm w-full p-5 text-white shadow-2xl space-y-4 relative">
            <button
              type="button"
              onClick={() => setIsQuickCategoriaModalOpen(false)}
              className="absolute top-4 right-4 text-[#A1A1AA] hover:text-white transition-colors cursor-pointer"
            >
              <X size={18} />
            </button>

            <div className="flex items-center gap-2.5 border-b border-[#27272A] pb-3">
              <div className="p-2 rounded-xl bg-[#D4AF37]/20 text-[#D4AF37]">
                <Plus size={18} />
              </div>
              <div>
                <h4 className="text-sm font-bold text-white">Adicionar Nova Categoria</h4>
                <p className="text-[11px] text-[#A1A1AA]">
                  Crie uma categoria sem fechar o formulário do item
                </p>
              </div>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-[#A1A1AA] mb-1">
                  Nome da Categoria
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Iluminação, Louças, Estruturas"
                  value={newCatData.nome}
                  onChange={(e) => setNewCatData({ ...newCatData, nome: e.target.value })}
                  className="w-full px-3 py-2 bg-[#111113] border border-[#27272A] rounded-xl text-white text-xs focus:border-[#D4AF37] focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-[#A1A1AA] mb-1">
                  Descrição (Opcional)
                </label>
                <input
                  type="text"
                  placeholder="Ex: Equipamentos de luz para eventos"
                  value={newCatData.descricao}
                  onChange={(e) => setNewCatData({ ...newCatData, descricao: e.target.value })}
                  className="w-full px-3 py-2 bg-[#111113] border border-[#27272A] rounded-xl text-white text-xs focus:border-[#D4AF37] focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-[#A1A1AA] mb-1">Cor de Destaque</label>
                <div className="flex items-center gap-2">
                  {['#D4AF37', '#3B82F6', '#10B981', '#8B5CF6', '#EC4899', '#F59E0B'].map((color) => (
                    <button
                      key={color}
                      type="button"
                      onClick={() => setNewCatData({ ...newCatData, cor: color })}
                      style={{ backgroundColor: color }}
                      className={`w-6 h-6 rounded-full border-2 transition-all cursor-pointer ${
                        newCatData.cor === color
                          ? 'border-white scale-110 shadow-md'
                          : 'border-transparent opacity-70 hover:opacity-100'
                      }`}
                    />
                  ))}
                </div>
              </div>
            </div>

            <div className="space-y-2 pt-2 border-t border-[#27272A]">
              <button
                type="button"
                onClick={() => {
                  if (!newCatData.nome.trim()) return;
                  const createdCatName = newCatData.nome.trim();
                  const newCatObj: CategoriaItem = {
                    id: `cat_${Date.now()}`,
                    nome: createdCatName,
                    descricao: newCatData.descricao.trim() || undefined,
                    corHex: newCatData.cor,
                    ativo: true,
                  };
                  if (onSaveCategoria) {
                    onSaveCategoria(newCatObj);
                  }
                  setFormData((prev) => ({ ...prev, categoria: createdCatName }));
                  setNewCatData({ nome: '', descricao: '', cor: '#D4AF37' });
                  setIsQuickCategoriaModalOpen(false);
                }}
                className="w-full py-2.5 bg-[#D4AF37] hover:bg-[#c4a02e] text-black font-bold rounded-xl text-xs transition-all shadow-md cursor-pointer"
              >
                Criar e Selecionar
              </button>

              {onGoToCategorias && (
                <button
                  type="button"
                  onClick={() => {
                    setIsQuickCategoriaModalOpen(false);
                    setIsModalOpen(false);
                    onGoToCategorias();
                  }}
                  className="w-full py-2 bg-[#111113] hover:bg-[#27272A] text-[#A1A1AA] hover:text-white border border-[#27272A] rounded-xl text-[11px] font-semibold transition-all cursor-pointer"
                >
                  Ir para Tela de Gerenciamento de Categorias →
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* FULLSCREEN ITEM DETAIL HIGHLIGHT MODAL */}
      {fullscreenItem && (
        <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex items-center justify-center p-4 sm:p-6 animate-fadeIn">
          <div className="bg-[#111113] border border-[#D4AF37]/40 rounded-3xl max-w-4xl w-full max-h-[90vh] overflow-y-auto text-white shadow-2xl relative flex flex-col custom-scrollbar">
            
            {/* Header bar */}
            <div className="sticky top-0 z-20 bg-[#111113]/95 backdrop-blur-md px-6 py-4 border-b border-[#27272A] flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-[#D4AF37]/20 text-[#D4AF37]">
                  <Maximize2 size={18} />
                </div>
                <div>
                  <h3 className="font-serif italic text-lg font-bold text-white flex items-center gap-2">
                    {fullscreenItem.nome}
                    {fullscreenItem.isKit && (
                      <span className="bg-[#D4AF37] text-black text-[9px] px-2 py-0.5 rounded uppercase font-extrabold font-sans">
                        Kit Especial
                      </span>
                    )}
                  </h3>
                  <p className="text-xs text-[#A1A1AA]">
                    Visualização em Destaque em Tela Cheia • ID #{fullscreenItem.id}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => {
                    const itemToEdit = fullscreenItem;
                    setFullscreenItem(null);
                    handleOpenEdit(itemToEdit);
                  }}
                  className="px-3.5 py-1.5 bg-[#27272A] hover:bg-[#3F3F46] border border-[#3F3F46] text-[#D4AF37] hover:text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer"
                >
                  <Edit2 size={14} /> Editar Item
                </button>
                <button
                  type="button"
                  onClick={() => setFullscreenItem(null)}
                  className="p-2 bg-[#18181B] hover:bg-[#27272A] border border-[#27272A] text-[#A1A1AA] hover:text-white rounded-xl transition-all cursor-pointer"
                >
                  <X size={18} />
                </button>
              </div>
            </div>

            {/* Content Body */}
            <div className="p-6 sm:p-8 space-y-6">
              
              {/* Image & Main stats grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-start">
                
                {/* High Resolution Photo Preview */}
                <div className="relative rounded-2xl overflow-hidden border border-[#27272A] bg-[#0A0A0B] h-72 sm:h-80 shadow-2xl group">
                  <img
                    src={fullscreenItem.imageUrl}
                    alt={fullscreenItem.nome}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    onError={(e) => {
                      (e.target as HTMLElement).style.display = 'none';
                    }}
                  />
                  <div className="absolute top-3 left-3 bg-[#0A0A0B]/80 backdrop-blur-md border border-[#27272A] px-3 py-1.5 rounded-full text-xs font-semibold text-[#E4E4E7]">
                    {fullscreenItem.categoria}
                  </div>

                  {fullscreenItem.statusManutencao && fullscreenItem.statusManutencao !== 'EM_DIA' && (
                    <div className={`absolute top-3 right-3 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${
                      fullscreenItem.statusManutencao === 'EM_MANUTENCAO' ? 'bg-red-500 text-white' : 'bg-amber-500 text-black'
                    }`}>
                      {fullscreenItem.statusManutencao === 'EM_MANUTENCAO' ? '🛠️ Em Oficina' : '⚠️ Revisar'}
                    </div>
                  )}
                </div>

                {/* Details & Pricing */}
                <div className="space-y-6">
                  
                  <div className="space-y-2">
                    <span className="text-[10px] uppercase tracking-widest text-[#71717A] font-bold font-mono">
                      Valor da Diária de Aluguel
                    </span>
                    <div className="text-4xl font-serif italic text-[#D4AF37]">
                      {formatarMoeda(fullscreenItem.precoAluguel)}
                      <span className="text-sm font-sans not-italic text-[#71717A] ml-2">/ dia</span>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-[#18181B] border border-[#27272A] p-4 rounded-2xl space-y-1">
                      <span className="text-[10px] uppercase font-bold text-[#71717A] font-mono">Estoque Total</span>
                      <p className="text-xl font-bold text-white font-mono">{fullscreenItem.quantidadeTotal} unidades</p>
                    </div>

                    <div className="bg-[#18181B] border border-[#27272A] p-4 rounded-2xl space-y-1">
                      <span className="text-[10px] uppercase font-bold text-[#71717A] font-mono">Estoque Disponível</span>
                      <p className={`text-xl font-bold font-mono ${getEffectiveStock(fullscreenItem) > 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                        {getEffectiveStock(fullscreenItem)} unidades
                      </p>
                    </div>
                  </div>

                  {fullscreenItem.descricao && (
                    <div className="space-y-2 bg-[#18181B] border border-[#27272A] p-4 rounded-2xl">
                      <span className="text-[10px] uppercase tracking-wider text-[#71717A] font-bold font-mono flex items-center gap-1.5">
                        <Tag size={13} className="text-[#D4AF37]" /> Descrição e Detalhes Técnicos
                      </span>
                      <p className="text-xs text-[#E4E4E7] leading-relaxed">
                        {fullscreenItem.descricao}
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* Kit Components if isKit */}
              {fullscreenItem.isKit && fullscreenItem.kitComponentes && fullscreenItem.kitComponentes.length > 0 && (
                <div className="space-y-3 border-t border-[#27272A] pt-6">
                  <h4 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2 font-mono">
                    <Package size={16} className="text-[#D4AF37]" /> Composição do Kit ({fullscreenItem.kitComponentes.length} itens inclusos)
                  </h4>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    {fullscreenItem.kitComponentes.map((comp, idx) => {
                      const compItem = itens.find((i) => i.id === comp.itemId);
                      return (
                        <div key={idx} className="p-3.5 bg-[#18181B] border border-[#27272A] rounded-xl flex items-center gap-3">
                          <img
                            src={compItem?.imageUrl || 'https://images.unsplash.com/photo-1513151233558-d860c5398176?auto=format&fit=crop&q=80&w=200'}
                            alt={compItem?.nome}
                            className="w-12 h-12 object-cover rounded-lg border border-[#27272A] shrink-0"
                          />
                          <div className="min-w-0 flex-1">
                            <h5 className="text-xs font-bold text-white truncate">{compItem?.nome || `Item #${comp.itemId}`}</h5>
                            <p className="text-[10px] text-[#A1A1AA]">{compItem?.categoria || 'Acervo'}</p>
                          </div>
                          <span className="px-2.5 py-1 bg-[#D4AF37]/15 text-[#D4AF37] border border-[#D4AF37]/30 text-xs font-bold font-mono rounded-lg shrink-0">
                            x{comp.quantidade}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Actions Footer inside modal */}
              <div className="border-t border-[#27272A] pt-6 flex flex-wrap items-center justify-between gap-4">
                <div className="text-[11px] text-[#71717A]">
                  Dica: Pressione <kbd className="px-1.5 py-0.5 bg-[#18181B] border border-[#27272A] rounded text-[#D4AF37] font-mono">ESC</kbd> ou clique no botão de fechar para retornar à listagem.
                </div>

                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      const itemToCopy = fullscreenItem;
                      setFullscreenItem(null);
                      handleCopyItem(itemToCopy);
                    }}
                    className="px-4 py-2 bg-[#18181B] hover:bg-[#27272A] border border-[#27272A] text-[#A1A1AA] hover:text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer"
                  >
                    <Copy size={14} /> Duplicar Item
                  </button>
                  <button
                    type="button"
                    onClick={() => setFullscreenItem(null)}
                    className="px-5 py-2 bg-[#D4AF37] hover:bg-[#E5C158] text-black rounded-xl text-xs font-extrabold uppercase tracking-wider transition-all cursor-pointer shadow-lg shadow-[#D4AF37]/10"
                  >
                    Concluir Visualização
                  </button>
                </div>
              </div>

            </div>
          </div>
        </div>
      )}
    </div>
  );
};
