import React, { useState, useMemo } from 'react';
import { saveDocument, deleteDocument } from '../lib/firebaseSync';
import { 
  Database, 
  Search, 
  Plus, 
  Edit2, 
  Trash2, 
  Eye, 
  RefreshCw, 
  Code, 
  FileJson, 
  Save, 
  X, 
  CheckCircle, 
  AlertTriangle,
  Layers,
  Table,
  Filter
} from 'lucide-react';

interface DatabaseExplorerProps {
  webForms: any[];
  clientes: any[];
  itens: any[];
  reservas: any[];
  dispositivosAutorizados: any[];
  transacoes: any[];
  manutencoes: any[];
  modelosContrato: any[];
  empresaConfig: any;
  onRefreshData?: () => void;
}

type CollectionType = 
  | 'webForms'
  | 'clientes'
  | 'itens'
  | 'reservas'
  | 'dispositivos_autorizados'
  | 'transacoes_financeiras'
  | 'manutencoes'
  | 'modelos_contrato'
  | 'empresaConfig';

export const DatabaseExplorerView: React.FC<DatabaseExplorerProps> = ({
  webForms,
  clientes,
  itens,
  reservas,
  dispositivosAutorizados,
  transacoes,
  manutencoes,
  modelosContrato,
  empresaConfig,
  onRefreshData,
}) => {
  const [selectedCollection, setSelectedCollection] = useState<CollectionType>('webForms');
  const [searchTerm, setSearchTerm] = useState('');
  
  // Selected Document Modal State
  const [viewingDoc, setViewingDoc] = useState<any | null>(null);
  const [editingDoc, setEditingDoc] = useState<any | null>(null);
  const [jsonInput, setJsonInput] = useState('');
  const [isCreatingNew, setIsCreatingNew] = useState(false);
  const [newDocId, setNewDocId] = useState('');
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Helper to extract collection items array
  const collectionData = useMemo(() => {
    switch (selectedCollection) {
      case 'webForms':
        return webForms || [];
      case 'clientes':
        return clientes || [];
      case 'itens':
        return itens || [];
      case 'reservas':
        return reservas || [];
      case 'dispositivos_autorizados':
        return dispositivosAutorizados || [];
      case 'transacoes_financeiras':
        return transacoes || [];
      case 'manutencoes':
        return manutencoes || [];
      case 'modelos_contrato':
        return modelosContrato || [];
      case 'empresaConfig':
        return empresaConfig ? [empresaConfig] : [];
      default:
        return [];
    }
  }, [
    selectedCollection,
    webForms,
    clientes,
    itens,
    reservas,
    dispositivosAutorizados,
    transacoes,
    manutencoes,
    modelosContrato,
    empresaConfig
  ]);

  // Filter items by search term
  const filteredItems = useMemo(() => {
    if (!searchTerm.trim()) return collectionData;
    const term = searchTerm.toLowerCase();
    return collectionData.filter((item) => {
      const jsonString = JSON.stringify(item).toLowerCase();
      return jsonString.includes(term);
    });
  }, [collectionData, searchTerm]);

  const getDocId = (docItem: any): string => {
    if (!docItem) return 'N/A';
    if (docItem.id !== undefined) return String(docItem.id);
    if (docItem.reserva?.id !== undefined) return String(docItem.reserva.id);
    if (docItem.cnpj) return docItem.cnpj;
    return 'doc-' + Math.random().toString(36).substring(2, 7);
  };

  const handleOpenEdit = (docItem: any) => {
    setEditingDoc(docItem);
    setJsonInput(JSON.stringify(docItem, null, 2));
    setIsCreatingNew(false);
  };

  const handleOpenCreate = () => {
    setIsCreatingNew(true);
    setNewDocId(`doc_${Date.now()}`);
    setEditingDoc({});
    setJsonInput(JSON.stringify({ id: `doc_${Date.now()}`, criadoEm: Date.now() }, null, 2));
  };

  const handleSaveJson = async () => {
    try {
      const parsed = JSON.parse(jsonInput);
      const targetId = isCreatingNew ? (newDocId || parsed.id || Date.now()) : getDocId(parsed);
      
      await saveDocument(selectedCollection, targetId, parsed);
      
      setStatusMessage({ type: 'success', text: `Documento #${targetId} salvo na coleção '${selectedCollection}' com sucesso!` });
      setEditingDoc(null);
      setIsCreatingNew(false);
      if (onRefreshData) onRefreshData();

      setTimeout(() => setStatusMessage(null), 4000);
    } catch (err: any) {
      console.error(err);
      alert('Sintaxe JSON inválida. Verifique a formatação antes de salvar.');
    }
  };

  const handleDelete = async (docItem: any) => {
    const docId = getDocId(docItem);
    if (!confirm(`Tem certeza que deseja excluir permanentemente o documento #${docId} da coleção '${selectedCollection}'?`)) {
      return;
    }

    try {
      await deleteDocument(selectedCollection, docId);
      setStatusMessage({ type: 'success', text: `Documento #${docId} excluído da coleção '${selectedCollection}'.` });
      if (onRefreshData) onRefreshData();

      setTimeout(() => setStatusMessage(null), 4000);
    } catch (err) {
      console.error(err);
      alert('Erro ao excluir documento. Tente novamente.');
    }
  };

  return (
    <div className="space-y-6 text-[#E4E4E7]">
      {/* Header Banner */}
      <div className="bg-[#111113] border border-[#27272A] rounded-2xl p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-xl">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Database className="text-[#D4AF37]" size={22} />
            <h2 className="text-lg font-serif italic font-extrabold text-white">
              Explorador & Gestor do Banco de Dados (GCP Firestore)
            </h2>
            <span className="bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-[10px] font-mono font-bold px-2 py-0.5 rounded-full">
              LIVE PERSISTENCE
            </span>
          </div>
          <p className="text-xs text-[#A1A1AA]">
            Visualização, edição em tempo real, consulta e manipulação estruturada das coleções no Firebase Firestore / Cache Offline Local.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {onRefreshData && (
            <button
              onClick={onRefreshData}
              className="px-3.5 py-2 bg-[#18181B] hover:bg-[#27272A] border border-[#27272A] text-white text-xs font-bold rounded-xl transition-all flex items-center gap-1.5 cursor-pointer"
            >
              <RefreshCw size={14} className="text-[#D4AF37]" />
              <span>Sincronizar Dados</span>
            </button>
          )}

          <button
            onClick={handleOpenCreate}
            className="px-3.5 py-2 bg-[#D4AF37] hover:bg-[#c2a032] text-black text-xs font-extrabold rounded-xl transition-all flex items-center gap-1.5 cursor-pointer shadow-lg"
          >
            <Plus size={15} />
            <span>Novo Registro</span>
          </button>
        </div>
      </div>

      {statusMessage && (
        <div className={`p-3.5 rounded-xl border text-xs font-bold flex items-center gap-2 animate-fadeIn ${
          statusMessage.type === 'success' 
            ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400' 
            : 'bg-red-500/10 border-red-500/30 text-red-400'
        }`}>
          <CheckCircle size={16} />
          <span>{statusMessage.text}</span>
        </div>
      )}

      {/* Collection Tabs & Search Controls */}
      <div className="bg-[#111113] border border-[#27272A] rounded-2xl p-4 space-y-4 shadow-xl">
        {/* Collection Selector Tabs */}
        <div>
          <label className="text-[10px] font-mono font-bold text-[#71717A] uppercase tracking-wider block mb-2">
            Selecione a Coleção do Banco de Dados:
          </label>
          <div className="flex flex-wrap gap-2">
            {(
              [
                { id: 'webForms', label: 'Propostas (webForms)', count: webForms?.length || 0 },
                { id: 'clientes', label: 'Clientes (clientes)', count: clientes?.length || 0 },
                { id: 'itens', label: 'Acervo (itens)', count: itens?.length || 0 },
                { id: 'reservas', label: 'Reservas (reservas)', count: reservas?.length || 0 },
                { id: 'dispositivos_autorizados', label: 'Dispositivos (dispositivos)', count: dispositivosAutorizados?.length || 0 },
                { id: 'transacoes_financeiras', label: 'Financeiro (transacoes)', count: transacoes?.length || 0 },
                { id: 'manutencoes', label: 'Manutenções (manutencoes)', count: manutencoes?.length || 0 },
                { id: 'modelos_contrato', label: 'Contratos (modelos)', count: modelosContrato?.length || 0 },
                { id: 'empresaConfig', label: 'Config. Empresa', count: empresaConfig ? 1 : 0 },
              ] as const
            ).map((tab) => (
              <button
                key={tab.id}
                onClick={() => setSelectedCollection(tab.id as CollectionType)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer border ${
                  selectedCollection === tab.id
                    ? 'bg-[#D4AF37] text-black border-[#D4AF37] shadow-md'
                    : 'bg-[#18181B] text-[#A1A1AA] hover:text-white border-[#27272A]'
                }`}
              >
                <span>{tab.label}</span>
                <span className={`text-[10px] font-mono px-1.5 py-0.2 rounded-full ${
                  selectedCollection === tab.id ? 'bg-black/20 text-black font-extrabold' : 'bg-[#27272A] text-[#D4AF37]'
                }`}>
                  {tab.count}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* Filter / Search Bar */}
        <div className="relative">
          <Search className="absolute left-3.5 top-2.5 text-[#71717A]" size={15} />
          <input
            type="text"
            placeholder={`Buscar por ID, campos ou valores em '${selectedCollection}'...`}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-[#18181B] border border-[#27272A] rounded-xl text-xs text-white placeholder-[#71717A] focus:border-[#D4AF37] focus:outline-none font-mono"
          />
        </div>
      </div>

      {/* Main Table / Collection View */}
      <div className="bg-[#111113] border border-[#27272A] rounded-2xl overflow-hidden shadow-2xl">
        <div className="p-4 border-b border-[#27272A] bg-[#0A0A0B] flex justify-between items-center text-xs">
          <span className="font-mono text-[#D4AF37] font-bold flex items-center gap-1.5">
            <Table size={14} /> Coleção: <strong>{selectedCollection}</strong> ({filteredItems.length} registros)
          </span>
          <span className="text-[#71717A] text-[11px]">Clique em 'Editar' para alterar a estrutura JSON em tempo real</span>
        </div>

        {filteredItems.length === 0 ? (
          <div className="p-12 text-center text-[#71717A] space-y-2">
            <FileJson size={32} className="mx-auto opacity-40 text-[#D4AF37]" />
            <p className="text-xs font-semibold text-[#A1A1AA]">Nenhum registro encontrado nesta coleção.</p>
            <p className="text-[11px]">Use a busca ou clique em 'Novo Registro' para adicionar dados.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#0A0A0B] text-[#71717A] font-mono uppercase text-[10px] border-b border-[#27272A]">
                <tr>
                  <th className="px-5 py-3">ID do Documento</th>
                  <th className="px-5 py-3">Resumo / Campos Principais</th>
                  <th className="px-5 py-3 text-right">Ações de Banco</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#27272A]">
                {filteredItems.map((item, idx) => {
                  const docId = getDocId(item);
                  const keys = Object.keys(item).slice(0, 4);

                  return (
                    <tr key={idx} className="hover:bg-[#18181B]/50 transition-colors">
                      <td className="px-5 py-3.5 font-mono text-[#D4AF37] font-bold whitespace-nowrap">
                        #{docId}
                      </td>

                      <td className="px-5 py-3.5 max-w-md">
                        <div className="space-y-1">
                          <div className="flex flex-wrap gap-1.5">
                            {keys.map((k) => (
                              <span 
                                key={k}
                                className="bg-[#18181B] border border-[#27272A] text-white px-2 py-0.5 rounded text-[10px] font-mono truncate max-w-[200px]"
                              >
                                <strong className="text-[#71717A]">{k}:</strong> {String(item[k]).substring(0, 30)}
                              </span>
                            ))}
                          </div>
                        </div>
                      </td>

                      <td className="px-5 py-3.5 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => setViewingDoc(item)}
                            className="p-1.5 bg-[#18181B] hover:bg-[#27272A] text-[#A1A1AA] hover:text-white border border-[#27272A] rounded-lg transition-colors cursor-pointer"
                            title="Visualizar JSON"
                          >
                            <Eye size={13} />
                          </button>

                          <button
                            onClick={() => handleOpenEdit(item)}
                            className="p-1.5 bg-[#D4AF37]/10 hover:bg-[#D4AF37]/20 text-[#D4AF37] border border-[#D4AF37]/30 rounded-lg transition-colors cursor-pointer"
                            title="Editar JSON"
                          >
                            <Edit2 size={13} />
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
      </div>

      {/* VIEW JSON MODAL */}
      {viewingDoc && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#111113] border border-[#27272A] rounded-2xl max-w-2xl w-full p-5 space-y-4 shadow-2xl">
            <div className="flex justify-between items-center border-b border-[#27272A] pb-3">
              <span className="font-mono font-bold text-white text-xs flex items-center gap-2">
                <Code className="text-[#D4AF37]" size={16} /> JSON do Documento #{getDocId(viewingDoc)}
              </span>
              <button
                onClick={() => setViewingDoc(null)}
                className="text-[#71717A] hover:text-white p-1 rounded-lg"
              >
                <X size={16} />
              </button>
            </div>

            <pre className="bg-[#0A0A0B] border border-[#27272A] text-emerald-400 font-mono text-xs p-4 rounded-xl overflow-x-auto max-h-[60vh]">
              {JSON.stringify(viewingDoc, null, 2)}
            </pre>

            <div className="flex justify-end">
              <button
                onClick={() => setViewingDoc(null)}
                className="px-4 py-2 bg-[#18181B] text-white text-xs font-bold rounded-xl cursor-pointer"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* EDIT / CREATE JSON MODAL */}
      {editingDoc && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#111113] border border-[#27272A] rounded-2xl max-w-2xl w-full p-5 space-y-4 shadow-2xl">
            <div className="flex justify-between items-center border-b border-[#27272A] pb-3">
              <span className="font-mono font-bold text-white text-xs flex items-center gap-2">
                <FileJson className="text-[#D4AF37]" size={16} /> 
                {isCreatingNew ? `Novo Registro na Coleção '${selectedCollection}'` : `Editar Documento #${getDocId(editingDoc)}`}
              </span>
              <button
                onClick={() => setEditingDoc(null)}
                className="text-[#71717A] hover:text-white p-1 rounded-lg"
              >
                <X size={16} />
              </button>
            </div>

            {isCreatingNew && (
              <div>
                <label className="block text-[10px] font-mono text-[#71717A] uppercase mb-1">ID do Documento:</label>
                <input
                  type="text"
                  value={newDocId}
                  onChange={(e) => setNewDocId(e.target.value)}
                  className="w-full bg-[#18181B] border border-[#27272A] text-white p-2.5 rounded-xl text-xs font-mono focus:border-[#D4AF37] focus:outline-none"
                />
              </div>
            )}

            <div>
              <label className="block text-[10px] font-mono text-[#71717A] uppercase mb-1">Payload JSON do Documento:</label>
              <textarea
                rows={12}
                value={jsonInput}
                onChange={(e) => setJsonInput(e.target.value)}
                className="w-full bg-[#0A0A0B] border border-[#27272A] text-white font-mono text-xs p-3.5 rounded-xl focus:border-[#D4AF37] focus:outline-none leading-relaxed"
              />
            </div>

            <div className="flex justify-end gap-2.5">
              <button
                onClick={() => setEditingDoc(null)}
                className="px-4 py-2 bg-[#18181B] text-[#A1A1AA] hover:text-white text-xs font-bold rounded-xl cursor-pointer"
              >
                Cancelar
              </button>
              <button
                onClick={handleSaveJson}
                className="px-5 py-2 bg-[#D4AF37] hover:bg-[#c2a032] text-black text-xs font-extrabold rounded-xl cursor-pointer flex items-center gap-1.5 shadow-lg"
              >
                <Save size={14} />
                <span>Salvar Documento</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
