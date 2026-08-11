import React, { useState, useMemo } from 'react';
import { CategoriaItem, ItemAcervo, ListVisibilityConfig } from '../types';
import { formatarMoeda } from '../utils/whatsappTemplates';
import { StandardListControls, StandardPagination, StandardEmptyState } from './StandardListContainer';
import {
  FolderKanban,
  Plus,
  Search,
  Edit2,
  Trash2,
  CheckCircle2,
  XCircle,
  Package,
  ArrowRightLeft,
  Sparkles,
  Layers,
  Box,
  Utensils,
  Tag,
  Palette,
  X,
  Check,
  Code2,
  Info,
  ShieldCheck,
  AlertTriangle,
  Grid,
  Eye,
  EyeOff,
} from 'lucide-react';

interface CategoriasViewProps {
  categorias: CategoriaItem[];
  itens: ItemAcervo[];
  onSaveCategoria: (categoria: CategoriaItem) => void;
  onDeleteCategoria: (id: string) => void;
  onUpdateItemCategoria: (oldCategoriaNome: string, newCategoriaNome: string) => void;
  onBatchRemapCategory: (sourceCatNome: string, targetCatNome: string) => void;
  listVisibility?: ListVisibilityConfig;
  hideHeader?: boolean;
}

const PRESET_COLORS = [
  '#D4AF37', // Dourado Pro
  '#3B82F6', // Azul Royal
  '#10B981', // Esmeralda
  '#EC4899', // Rosa Quartzo
  '#F59E0B', // Âmbar / Laranja
  '#8B5CF6', // Violeta / Ametista
  '#6366F1', // Indigo
  '#14B8A6', // Menta / Teal
  '#EF4444', // Vermelho Rubi
  '#71717A', // Grafite Neutra
];

export const CategoriasView: React.FC<CategoriasViewProps> = ({
  categorias = [],
  itens = [],
  onSaveCategoria,
  onDeleteCategoria,
  onUpdateItemCategoria,
  onBatchRemapCategory,
  listVisibility,
  hideHeader = false,
}) => {
  const [isListVisible, setIsListVisible] = useState(() => {
    return listVisibility ? listVisibility.exibirCategoriasPorPadrao !== false : true;
  });

  React.useEffect(() => {
    if (listVisibility) {
      setIsListVisible(listVisibility.exibirCategoriasPorPadrao !== false);
    }
  }, [listVisibility]);

  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'TODAS' | 'ATIVAS' | 'INATIVAS'>('TODAS');

  // Modal State for Add / Edit
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<CategoriaItem | null>(null);

  // Form State
  const [formNome, setFormNome] = useState('');
  const [formDescricao, setFormDescricao] = useState('');
  const [formCor, setFormCor] = useState('#D4AF37');
  const [formAtivo, setFormAtivo] = useState(true);
  const [autoUpdateLinkedItems, setAutoUpdateLinkedItems] = useState(true);

  // Remap Modal State
  const [isRemapModalOpen, setIsRemapModalOpen] = useState(false);
  const [remapSource, setRemapSource] = useState('');
  const [remapTarget, setRemapTarget] = useState('');
  const [remapSuccessMessage, setRemapSuccessMessage] = useState<string | null>(null);

  // Toast / Feedback State
  const [feedbackMsg, setFeedbackMsg] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setFeedbackMsg(msg);
    setTimeout(() => setFeedbackMsg(null), 3000);
  };

  // Open Modal for New Category
  const handleOpenAddModal = () => {
    setEditingCategory(null);
    setFormNome('');
    setFormDescricao('');
    setFormCor('#D4AF37');
    setFormAtivo(true);
    setAutoUpdateLinkedItems(true);
    setIsModalOpen(true);
  };

  // Open Modal for Edit Category
  const handleOpenEditModal = (cat: CategoriaItem) => {
    setEditingCategory(cat);
    setFormNome(cat.nome);
    setFormDescricao(cat.descricao || '');
    setFormCor(cat.corHex || '#D4AF37');
    setFormAtivo(cat.ativo);
    setAutoUpdateLinkedItems(true);
    setIsModalOpen(true);
  };

  // Submit Category Add / Edit
  const handleSubmitForm = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formNome.trim()) return;

    const oldName = editingCategory?.nome;
    const newName = formNome.trim();

    const updatedCat: CategoriaItem = {
      id: editingCategory ? editingCategory.id : `cat-${Date.now()}`,
      nome: newName,
      descricao: formDescricao.trim(),
      corHex: formCor,
      ativo: formAtivo,
    };

    onSaveCategoria(updatedCat);

    // If editing and name changed, offer automatic item category update
    if (editingCategory && oldName && oldName !== newName && autoUpdateLinkedItems) {
      onUpdateItemCategoria(oldName, newName);
      showToast(`Categoria "${oldName}" alterada para "${newName}" e itens vinculados foram atualizados!`);
    } else if (editingCategory) {
      showToast(`Categoria "${newName}" atualizada com sucesso!`);
    } else {
      showToast(`Nova categoria "${newName}" cadastrada com sucesso!`);
    }

    setIsModalOpen(false);
  };

  // Toggle Category Status
  const handleToggleStatus = (cat: CategoriaItem) => {
    const updated = { ...cat, ativo: !cat.ativo };
    onSaveCategoria(updated);
    showToast(`Categoria "${cat.nome}" agora está ${updated.ativo ? 'ATIVA' : 'INATIVA'}.`);
  };

  // Delete Category
  const handleDelete = (cat: CategoriaItem) => {
    const linkedCount = itens.filter((i) => i.categoria === cat.nome).length;
    if (linkedCount > 0) {
      if (
        !window.confirm(
          `A categoria "${cat.nome}" possui ${linkedCount} item(ns) vinculado(s). Deseja realmente excluí-la? Os itens permanecerão no inventário.`
        )
      ) {
        return;
      }
    } else {
      if (!window.confirm(`Deseja excluir a categoria "${cat.nome}"?`)) {
        return;
      }
    }

    onDeleteCategoria(cat.id);
    showToast(`Categoria "${cat.nome}" removida do sistema.`);
  };

  // Batch Remap Execution
  const handleExecuteRemap = (e: React.FormEvent) => {
    e.preventDefault();
    if (!remapSource || !remapTarget || remapSource === remapTarget) return;

    const countToRemap = itens.filter((i) => i.categoria === remapSource).length;
    onBatchRemapCategory(remapSource, remapTarget);

    setRemapSuccessMessage(
      `Sucesso! ${countToRemap} item(ns) transferidos de "${remapSource}" para "${remapTarget}".`
    );
    setTimeout(() => {
      setRemapSuccessMessage(null);
      setIsRemapModalOpen(false);
    }, 2000);
  };

  // Filter Logic
  const filteredCategorias = categorias.filter((cat) => {
    const matchesSearch =
      cat.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (cat.descricao && cat.descricao.toLowerCase().includes(searchTerm.toLowerCase()));

    if (statusFilter === 'ATIVAS') return matchesSearch && cat.ativo;
    if (statusFilter === 'INATIVAS') return matchesSearch && !cat.ativo;
    return matchesSearch;
  });

  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(9);

  const paginatedCategorias = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredCategorias.slice(start, start + itemsPerPage);
  }, [filteredCategorias, currentPage, itemsPerPage]);

  const totalPages = Math.ceil(filteredCategorias.length / itemsPerPage);

  // Summary Metrics
  const totalCategorias = categorias.length;
  const ativasCount = categorias.filter((c) => c.ativo).length;
  const inativasCount = totalCategorias - ativasCount;
  const totalItensMapeados = itens.length;

  return (
    <div className="space-y-6">
      {/* Toast Notification */}
      {feedbackMsg && (
        <div className="fixed top-24 right-6 z-50 bg-[#D4AF37] text-black font-bold px-4 py-3 rounded-xl shadow-2xl flex items-center gap-2 border border-black/20 text-xs animate-bounce">
          <CheckCircle2 size={18} />
          <span>{feedbackMsg}</span>
        </div>
      )}

      {/* Header Banner */}
      {!hideHeader ? (
        <div className="bg-[#111113] p-5 rounded-2xl border border-[#27272A] flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 shadow-xl">
          <div>
            <h2 className="text-xl font-serif italic text-white flex items-center gap-3">
              <FolderKanban className="text-[#D4AF37]" size={22} />
              <span>Gestão de Categorias do Acervo</span>
              <button
                type="button"
                onClick={() => setIsListVisible(!isListVisible)}
                className="text-[#71717A] hover:text-[#D4AF37] transition-colors p-1 rounded-lg bg-[#18181B] border border-[#27272A] cursor-pointer"
                title={isListVisible ? "Ocultar Listagem" : "Exibir Listagem"}
              >
                {isListVisible ? <EyeOff size={14} /> : <Eye size={14} />}
              </button>
            </h2>
            <p className="text-[#A1A1AA] text-xs mt-0.5">
              Cadastre, edite e organize as categorias para estruturação do acervo de locações.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row sm:flex-wrap items-stretch sm:items-center gap-2.5 w-full lg:w-auto">
            <button
              onClick={() => {
                setRemapSource(categorias[0]?.nome || '');
                setRemapTarget(categorias[1]?.nome || '');
                setIsRemapModalOpen(true);
              }}
              className="flex items-center justify-center gap-2 bg-[#18181B] hover:bg-[#27272A] text-[#D4AF37] border border-[#D4AF37]/40 px-4 py-2.5 rounded-xl text-xs font-bold transition-all shadow-md cursor-pointer shrink-0 w-full sm:w-auto"
            >
              <ArrowRightLeft size={16} />
              <span>Re-mapear em Lote</span>
            </button>

            <button
              onClick={handleOpenAddModal}
              className="flex items-center justify-center gap-2 bg-[#D4AF37] hover:bg-[#c4a02e] text-black px-4 py-2.5 rounded-xl text-xs font-bold transition-all shadow-lg cursor-pointer shrink-0 w-full sm:w-auto"
            >
              <Plus size={16} />
              <span>Nova Categoria</span>
            </button>
          </div>
        </div>
      ) : (
        <div className="flex flex-col sm:flex-row justify-end items-center gap-2.5">
          <button
            onClick={() => {
              setRemapSource(categorias[0]?.nome || '');
              setRemapTarget(categorias[1]?.nome || '');
              setIsRemapModalOpen(true);
            }}
            className="flex items-center justify-center gap-2 bg-[#18181B] hover:bg-[#27272A] text-[#D4AF37] border border-[#D4AF37]/40 px-4 py-2.5 rounded-xl text-xs font-bold transition-all shadow-md cursor-pointer shrink-0 w-full sm:w-auto"
          >
            <ArrowRightLeft size={16} />
            <span>Re-mapear em Lote</span>
          </button>

          <button
            onClick={handleOpenAddModal}
            className="flex items-center justify-center gap-2 bg-[#D4AF37] hover:bg-[#c4a02e] text-black px-4 py-2.5 rounded-xl text-xs font-bold transition-all shadow-lg cursor-pointer shrink-0 w-full sm:w-auto"
          >
            <Plus size={16} />
            <span>Nova Categoria</span>
          </button>
        </div>
      )}

      {/* Quick Metrics Bar - Single Line Compact Bar */}
      <div className="bg-[#111113] border border-[#27272A] rounded-2xl p-3 flex flex-nowrap overflow-x-auto items-center justify-between gap-2 sm:gap-4 divide-x divide-[#27272A] shadow-xl no-scrollbar">
        {/* Total Categorias */}
        <div className="flex items-center gap-3 px-3 min-w-[160px] flex-1">
          <div className="p-2 bg-[#18181B] border border-[#27272A] rounded-xl text-[#D4AF37] shrink-0">
            <FolderKanban size={16} />
          </div>
          <div>
            <span className="text-[10px] uppercase font-bold tracking-wider text-[#71717A] block whitespace-nowrap">Total Categorias</span>
            <span className="text-base font-serif italic font-bold text-white leading-tight">{totalCategorias}</span>
          </div>
        </div>

        {/* Categorias Ativas */}
        <div className="flex items-center gap-3 px-3 min-w-[160px] flex-1">
          <div className="p-2 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-emerald-400 shrink-0">
            <CheckCircle2 size={16} />
          </div>
          <div>
            <span className="text-[10px] uppercase font-bold tracking-wider text-[#71717A] block whitespace-nowrap">Ativas</span>
            <span className="text-base font-serif italic font-bold text-emerald-400 leading-tight">{ativasCount}</span>
          </div>
        </div>

        {/* Categorias Inativas */}
        <div className="flex items-center gap-3 px-3 min-w-[160px] flex-1">
          <div className="p-2 bg-[#18181B] border border-[#27272A] rounded-xl text-[#71717A] shrink-0">
            <FolderKanban size={16} className="text-[#71717A]" />
          </div>
          <div>
            <span className="text-[10px] uppercase font-bold tracking-wider text-[#71717A] block whitespace-nowrap">Inativas</span>
            <span className="text-base font-serif italic font-bold text-[#71717A] leading-tight">{inativasCount}</span>
          </div>
        </div>

        {/* Itens Mapeados */}
        <div className="flex items-center gap-3 px-3 min-w-[160px] flex-1">
          <div className="p-2 bg-[#18181B] border border-[#27272A] rounded-xl text-[#D4AF37] shrink-0">
            <Package size={16} />
          </div>
          <div>
            <span className="text-[10px] uppercase font-bold tracking-wider text-[#71717A] block whitespace-nowrap">Itens Vinculados</span>
            <span className="text-base font-serif italic font-bold text-[#D4AF37] leading-tight">{totalItensMapeados}</span>
          </div>
        </div>
      </div>

      {!isListVisible ? (
        <div className="bg-[#111113] border border-[#27272A] rounded-2xl p-12 text-center space-y-4 shadow-xl animate-fade-in">
          <div className="w-12 h-12 rounded-full bg-[#D4AF37]/10 text-[#D4AF37] mx-auto flex items-center justify-center">
            <EyeOff size={24} />
          </div>
          <div className="space-y-1">
            <h4 className="text-white text-sm font-semibold">Listagem Oculta</h4>
            <p className="text-[#A1A1AA] text-xs max-w-sm mx-auto">
              A listagem de categorias do acervo está oculta por padrão para uma interface mais limpa.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setIsListVisible(true)}
            className="inline-flex items-center gap-2 bg-[#D4AF37] hover:bg-[#E5C158] text-[#0A0A0B] px-5 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider transition-all cursor-pointer shadow-lg shadow-[#D4AF37]/10 active:scale-95"
          >
            <Eye size={14} />
            <span>Exibir Listagem de Categorias</span>
          </button>
        </div>
      ) : (
        <>
          {/* Standardized Search & Filter Controls */}
          <StandardListControls
            searchTerm={searchTerm}
            onSearchChange={setSearchTerm}
            searchPlaceholder="Buscar categoria por nome ou descrição..."
            filterTabs={[
              { id: 'TODAS', label: 'Todas as Categorias', count: categorias.length },
              { id: 'ATIVAS', label: 'Ativas', count: ativasCount },
              { id: 'INATIVAS', label: 'Inativas', count: inativasCount },
            ]}
            activeFilterTab={statusFilter}
            onFilterTabChange={(tab) => {
              setStatusFilter(tab as any);
              setCurrentPage(1);
            }}
            currentPage={currentPage}
            totalPages={totalPages}
            totalItems={filteredCategorias.length}
            itemsPerPage={itemsPerPage}
            onPageChange={setCurrentPage}
            onItemsPerPageChange={setItemsPerPage}
          />

          {filteredCategorias.length === 0 ? (
            <StandardEmptyState
              icon={<FolderKanban size={22} />}
              title="Nenhuma categoria encontrada"
              description="Tente buscar por outro termo de pesquisa ou alterar o filtro de status."
              onClearFilters={() => {
                setSearchTerm('');
                setStatusFilter('TODAS');
                setCurrentPage(1);
              }}
              actionText="Nova Categoria"
              onAction={handleOpenAddModal}
            />
          ) : (
            <>
              {/* Category Cards Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                {paginatedCategorias.map((cat) => {
                  const linkedItems = itens.filter((i) => i.categoria === cat.nome);
                  const totalUnidades = linkedItems.reduce((acc, i) => acc + i.quantidadeTotal, 0);
                  const totalValorAluguel = linkedItems.reduce((acc, i) => acc + i.precoAluguel, 0);

                  return (
                    <div
                      key={cat.id}
                      className={`bg-[#111113] border rounded-2xl p-5 shadow-xl space-y-4 flex flex-col justify-between transition-all hover:border-[#3F3F46] ${
                        cat.ativo ? 'border-[#27272A]' : 'border-[#27272A] opacity-60'
                      }`}
                    >
                      <div className="space-y-3">
                        {/* Top Badge & Status Header */}
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex items-center gap-2.5">
                            <div
                              className="w-4 h-10 rounded-full shrink-0 shadow-md"
                              style={{ backgroundColor: cat.corHex || '#D4AF37' }}
                            />
                            <div>
                              <h3 className="text-white font-bold text-base flex items-center gap-2">
                                {cat.nome}
                              </h3>
                              <p className="text-[11px] text-[#A1A1AA] line-clamp-2">
                                {cat.descricao || 'Sem descrição cadastrada.'}
                              </p>
                            </div>
                          </div>

                          <span
                            className={`text-[10px] font-mono px-2 py-0.5 rounded-full border flex items-center gap-1 shrink-0 ${
                              cat.ativo
                                ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                                : 'bg-amber-500/10 text-amber-400 border-amber-500/30'
                            }`}
                          >
                            {cat.ativo ? <CheckCircle2 size={12} /> : <XCircle size={12} />}
                            {cat.ativo ? 'Ativa' : 'Inativa'}
                          </span>
                        </div>

                        {/* Linked Items Thumbnails & Count */}
                        <div className="bg-[#18181B] p-3 rounded-xl border border-[#27272A] space-y-2">
                          <div className="flex items-center justify-between text-xs">
                            <span className="text-[#A1A1AA] flex items-center gap-1.5 font-bold">
                              <Package size={14} className="text-[#D4AF37]" />
                              Itens no Acervo:
                            </span>
                            <span className="text-white font-mono font-bold bg-[#111113] px-2 py-0.5 rounded border border-[#27272A]">
                              {linkedItems.length} produtos ({totalUnidades} un)
                            </span>
                          </div>

                          {linkedItems.length > 0 ? (
                            <div className="flex items-center gap-2 pt-1">
                              <div className="flex -space-x-2 overflow-hidden">
                                {linkedItems.slice(0, 4).map((item) => (
                                  <img
                                    key={item.id}
                                    src={item.imageUrl}
                                    alt={item.nome}
                                    className="inline-block h-8 w-8 rounded-full ring-2 ring-[#18181B] object-cover"
                                  />
                                ))}
                              </div>
                              <span className="text-[11px] text-[#71717A] truncate">
                                {linkedItems
                                  .slice(0, 2)
                                  .map((i) => i.nome)
                                  .join(', ')}
                                {linkedItems.length > 2 ? ` e +${linkedItems.length - 2}` : ''}
                              </span>
                            </div>
                          ) : (
                            <p className="text-[11px] text-[#71717A] italic">Nenhum item cadastrado nesta categoria.</p>
                          )}
                        </div>
                      </div>

                      {/* Action Buttons */}
                      <div className="pt-3 border-t border-[#27272A] flex items-center justify-between gap-2 text-xs">
                        <button
                          type="button"
                          onClick={() => handleToggleStatus(cat)}
                          className="text-[#A1A1AA] hover:text-white font-medium text-[11px] underline cursor-pointer"
                        >
                          {cat.ativo ? 'Desativar' : 'Ativar'}
                        </button>

                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => handleOpenEditModal(cat)}
                            className="p-2 bg-[#18181B] hover:bg-[#27272A] text-white rounded-lg border border-[#27272A] transition-all cursor-pointer"
                            title="Editar Categoria"
                          >
                            <Edit2 size={14} />
                          </button>

                          <button
                            type="button"
                            onClick={() => handleDelete(cat)}
                            className="p-2 bg-red-500/10 hover:bg-red-500/20 text-red-400 rounded-lg border border-red-500/20 transition-all cursor-pointer"
                            title="Excluir Categoria"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              <StandardPagination
                currentPage={currentPage}
                totalPages={totalPages}
                totalItems={filteredCategorias.length}
                itemsPerPage={itemsPerPage}
                onPageChange={setCurrentPage}
              />
            </>
          )}
        </>
      )}

      {/* CADASTRO / EDIÇÃO DE CATEGORIA MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#111113] border border-[#27272A] rounded-2xl max-w-md w-full p-6 space-y-5 shadow-2xl relative">
            <div className="flex justify-between items-center border-b border-[#27272A] pb-3">
              <h3 className="font-serif italic text-white text-lg flex items-center gap-2">
                <FolderKanban className="text-[#D4AF37]" size={20} />
                {editingCategory ? 'Alterar Categoria' : 'Cadastrar Nova Categoria'}
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-[#A1A1AA] hover:text-white cursor-pointer"
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSubmitForm} className="space-y-4 text-xs">
              <div>
                <label className="block text-[#A1A1AA] font-bold mb-1">Nome da Categoria *</label>
                <input
                  type="text"
                  required
                  value={formNome}
                  onChange={(e) => setFormNome(e.target.value)}
                  placeholder="Ex: Iluminação & Efeitos Especial"
                  className="w-full px-3 py-2 bg-[#18181B] border border-[#27272A] rounded-xl text-white focus:border-[#D4AF37] focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-[#A1A1AA] font-bold mb-1">Descrição</label>
                <textarea
                  rows={3}
                  value={formDescricao}
                  onChange={(e) => setFormDescricao(e.target.value)}
                  placeholder="Descreva o propósito e tipos de produtos desta categoria..."
                  className="w-full px-3 py-2 bg-[#18181B] border border-[#27272A] rounded-xl text-white focus:border-[#D4AF37] focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-[#A1A1AA] font-bold mb-2 flex items-center gap-1.5">
                  <Palette size={14} className="text-[#D4AF37]" /> Cor de Identificação
                </label>
                <div className="flex flex-wrap gap-2 mb-2">
                  {PRESET_COLORS.map((hex) => (
                    <button
                      key={hex}
                      type="button"
                      onClick={() => setFormCor(hex)}
                      className={`w-7 h-7 rounded-full transition-transform cursor-pointer border ${
                        formCor === hex ? 'scale-110 border-white ring-2 ring-[#D4AF37]' : 'border-transparent'
                      }`}
                      style={{ backgroundColor: hex }}
                    />
                  ))}
                </div>
                <input
                  type="text"
                  value={formCor}
                  onChange={(e) => setFormCor(e.target.value)}
                  className="w-full px-3 py-1.5 bg-[#18181B] border border-[#27272A] rounded-xl text-white font-mono focus:border-[#D4AF37] focus:outline-none"
                />
              </div>

              <div className="flex items-center justify-between p-3 bg-[#18181B] rounded-xl border border-[#27272A]">
                <div>
                  <span className="text-white font-bold block">Status da Categoria</span>
                  <span className="text-[#71717A] text-[10px]">Categorias ativas aparecem no formulário do cliente</span>
                </div>
                <button
                  type="button"
                  onClick={() => setFormAtivo(!formAtivo)}
                  className={`px-3 py-1 rounded-lg font-bold text-[11px] cursor-pointer ${
                    formAtivo ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'bg-red-500/20 text-red-400 border border-red-500/30'
                  }`}
                >
                  {formAtivo ? 'Ativa' : 'Inativa'}
                </button>
              </div>

              {editingCategory && (
                <div className="p-3 bg-[#18181B] rounded-xl border border-[#27272A] space-y-1">
                  <label className="flex items-center gap-2 text-white font-bold cursor-pointer">
                    <input
                      type="checkbox"
                      checked={autoUpdateLinkedItems}
                      onChange={(e) => setAutoUpdateLinkedItems(e.target.checked)}
                      className="rounded accent-[#D4AF37]"
                    />
                    <span>Re-mapear itens existentes automaticamente</span>
                  </label>
                  <p className="text-[10px] text-[#71717A]">
                    Atualiza os produtos cadastrados com o nome antigo para a nova denominação da categoria.
                  </p>
                </div>
              )}

              <div className="flex justify-end gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 bg-[#18181B] text-[#A1A1AA] hover:text-white rounded-xl cursor-pointer"
                >
                  Cancelar
                </button>

                <button
                  type="submit"
                  className="px-5 py-2 bg-[#D4AF37] hover:bg-[#c4a02e] text-black font-bold uppercase tracking-wider text-xs rounded-xl shadow-lg cursor-pointer"
                >
                  {editingCategory ? 'Salvar Alterações' : 'Cadastrar Categoria'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* RE-MAPEAR EM LOTE MODAL */}
      {isRemapModalOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#111113] border border-[#27272A] rounded-2xl max-w-md w-full p-6 space-y-5 shadow-2xl relative">
            <div className="flex justify-between items-center border-b border-[#27272A] pb-3">
              <h3 className="font-serif italic text-white text-lg flex items-center gap-2">
                <ArrowRightLeft className="text-[#D4AF37]" size={20} />
                Transferir Itens em Lote
              </h3>
              <button
                onClick={() => setIsRemapModalOpen(false)}
                className="text-[#A1A1AA] hover:text-white cursor-pointer"
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleExecuteRemap} className="space-y-4 text-xs">
              <div>
                <label className="block text-[#A1A1AA] font-bold mb-1">Categoria de Origem</label>
                <select
                  value={remapSource}
                  onChange={(e) => setRemapSource(e.target.value)}
                  className="w-full px-3 py-2 bg-[#18181B] border border-[#27272A] rounded-xl text-white focus:border-[#D4AF37] focus:outline-none"
                >
                  {categorias.map((c) => (
                    <option key={c.id} value={c.nome}>
                      {c.nome} ({itens.filter((i) => i.categoria === c.nome).length} itens)
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[#A1A1AA] font-bold mb-1">Categoria de Destino</label>
                <select
                  value={remapTarget}
                  onChange={(e) => setRemapTarget(e.target.value)}
                  className="w-full px-3 py-2 bg-[#18181B] border border-[#27272A] rounded-xl text-white focus:border-[#D4AF37] focus:outline-none"
                >
                  {categorias.map((c) => (
                    <option key={c.id} value={c.nome}>
                      {c.nome}
                    </option>
                  ))}
                </select>
              </div>

              {remapSuccessMessage && (
                <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 rounded-xl text-xs flex items-center gap-2">
                  <CheckCircle2 size={16} />
                  <span>{remapSuccessMessage}</span>
                </div>
              )}

              <div className="bg-[#18181B] p-3 rounded-xl border border-[#27272A] text-[11px] text-[#A1A1AA] space-y-1">
                <span className="text-white font-bold block">Ação em Lote</span>
                <p>
                  Todos os produtos atualmente categorizados como &quot;{remapSource}&quot; passarão para &quot;{remapTarget}&quot;.
                </p>
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsRemapModalOpen(false)}
                  className="px-4 py-2 bg-[#18181B] text-[#A1A1AA] hover:text-white rounded-xl cursor-pointer"
                >
                  Cancelar
                </button>

                <button
                  type="submit"
                  disabled={!remapSource || !remapTarget || remapSource === remapTarget}
                  className="px-5 py-2 bg-[#D4AF37] hover:bg-[#c4a02e] disabled:opacity-40 text-black font-bold uppercase tracking-wider text-xs rounded-xl shadow-lg cursor-pointer"
                >
                  Executar Transferência
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
