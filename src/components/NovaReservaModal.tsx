import React, { useState, useMemo, useEffect } from 'react';
import { Cliente, ItemAcervo, StatusReserva, ReservaComItens, EmpresaConfig } from '../types';
import { formatarMoeda } from '../utils/whatsappTemplates';
import { formatCurrencyBRL, parseCurrencyBRLToNumber } from '../utils/currencyMask';
import { Calendar, User, Package, AlertTriangle, CheckCircle, Globe, Filter, MapPin } from 'lucide-react';
import { PhoneInput } from './PhoneInput';
import { calcularDistanciaRealOuSimulada, calcularValorFrete } from '../utils/freteUtils';
import { EnderecoFormFields } from './EnderecoFormFields';
import { formatEnderecoCompleto, parseEnderecoCompleto, AddressData } from '../utils/addressUtils';

interface NovaReservaModalProps {
  clientes: Cliente[];
  itens: ItemAcervo[];
  reservas?: ReservaComItens[];
  empresaConfig?: EmpresaConfig;
  onClose: () => void;
  onSaveReserva: (reservaData: {
    clienteId?: number;
    itemIds: number[];
    dataRetirada: number;
    dataDevolucao: number;
    status: StatusReserva;
    manualCliente?: { nome: string; telefone: string };
    endereco?: string; // NOVO: Local do Evento / Entrega
    valorFrete?: number;
    distanciaKm?: number;
    valorFretePorKm?: number;
  }) => void;
}

export const NovaReservaModal: React.FC<NovaReservaModalProps> = ({ clientes = [], itens = [], reservas = [], empresaConfig, onClose, onSaveReserva }) => {
  const [clienteMode, setClienteMode] = useState<'cadastrado' | 'manual'>('cadastrado');
  const [selectedClienteId, setSelectedClienteId] = useState<number>(clientes[0]?.id || 0);
  const [manualNome, setManualNome] = useState<string>('');
  const [manualTelefone, setManualTelefone] = useState<string>('');
  const [addressData, setAddressData] = useState<AddressData>({
    logradouro: '',
    numero: '',
    bairro: '',
    cidade: '',
    estado: '',
    cep: '',
  });
  const [endereco, setEndereco] = useState<string>(''); // NOVO: Local do Evento / Entrega

  // Auto populate address when selecting a registered client
  useEffect(() => {
    if (clienteMode === 'cadastrado' && selectedClienteId) {
      const selected = clientes.find((c) => c.id === Number(selectedClienteId));
      if (selected) {
        const clientAddr = (selected.logradouro || selected.cidade || selected.bairro)
          ? {
              logradouro: selected.logradouro || '',
              numero: selected.numero || '',
              bairro: selected.bairro || '',
              cidade: selected.cidade || '',
              estado: selected.estado || '',
              cep: selected.cep || '',
            }
          : parseEnderecoCompleto(selected.endereco);

        setAddressData(clientAddr);
        setEndereco(formatEnderecoCompleto(clientAddr));
      }
    }
  }, [selectedClienteId, clienteMode, clientes]);

  // Freight States
  const [distanciaKm, setDistanciaKm] = useState<number>(0);
  const [valorFrete, setValorFrete] = useState<number>(0);
  const [valorFretePorKm, setValorFretePorKm] = useState<number>(empresaConfig?.valorFretePorKm || 0);
  const [calculandoFrete, setCalculandoFrete] = useState<boolean>(false);

  // Sync with company config value when it changes
  useEffect(() => {
    if (empresaConfig?.valorFretePorKm !== undefined) {
      setValorFretePorKm(empresaConfig.valorFretePorKm);
    }
  }, [empresaConfig]);

  // Recalculate freight cost when distance or rate per km changes
  useEffect(() => {
    const calculated = calcularValorFrete(distanciaKm, valorFretePorKm);
    setValorFrete(calculated);
  }, [distanciaKm, valorFretePorKm]);

  const [selectedItemIds, setSelectedItemIds] = useState<number[]>([]);
  const [selectedCategoria, setSelectedCategoria] = useState<string>('Todas');

  const categoriasDisponiveis = useMemo(() => {
    const set = new Set<string>();
    itens.forEach((i) => {
      if (i.categoria) set.add(i.categoria);
    });
    return ['Todas', ...Array.from(set).sort()];
  }, [itens]);

  const itensFiltrados = useMemo(() => {
    if (selectedCategoria === 'Todas') return itens;
    return itens.filter((i) => i.categoria === selectedCategoria);
  }, [itens, selectedCategoria]);

  // Default dates: today
  const todayStr = new Date().toISOString().split('T')[0];
  const [dataRetiradaStr, setDataRetiradaStr] = useState<string>(todayStr);
  const [dataDevolucaoStr, setDataDevolucaoStr] = useState<string>(todayStr);

  const [horaRetirada, setHoraRetirada] = useState<string>('09:00');
  const [horaDevolucao, setHoraDevolucao] = useState<string>('18:00');

  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const isSameDay = dataRetiradaStr === dataDevolucaoStr;

  // Calculate timestamps
  const tRetirada = isSameDay
    ? new Date(`${dataRetiradaStr}T${horaRetirada}:00`).getTime()
    : new Date(`${dataRetiradaStr}T09:00:00`).getTime();
  const tDevolucao = isSameDay
    ? new Date(`${dataDevolucaoStr}T${horaDevolucao}:00`).getTime()
    : new Date(`${dataDevolucaoStr}T18:00:00`).getTime();

  const diffTime = Math.max(0, tDevolucao - tRetirada);
  const diasReserva = isSameDay ? 1 : Math.max(1, Math.ceil(diffTime / (1000 * 60 * 60 * 24)));

  // Contagem de unidades comprometidas em outras reservas ativas no mesmo período temporal
  const getReservedCountInPeriod = (itemId: number): number => {
    if (!reservas || reservas.length === 0) return 0;
    return reservas.reduce((count, r) => {
      if (r.reserva.status === StatusReserva.CANCELADA || r.reserva.status === StatusReserva.CONCLUIDA) {
        return count;
      }
      // Interseção temporal de intervalos: (A_start < B_end) && (A_end > B_start)
      const overlap = r.reserva.dataRetirada < tDevolucao && r.reserva.dataDevolucao > tRetirada;
      if (overlap) {
        const itemMatches = r.itens.filter((i) => i.id === itemId).length;
        return count + itemMatches;
      }
      return count;
    }, 0);
  };

  // Helper to calculate the kit's real-time dynamic stock based on its components and period availability
  const getEffectiveStock = (item: ItemAcervo) => {
    if (item.isKit && item.kitComponentes && item.kitComponentes.length > 0) {
      const capacities = item.kitComponentes.map((comp) => {
        const compItem = itens.find((i) => i.id === comp.itemId);
        if (!compItem) return 0;
        const reservedComp = getReservedCountInPeriod(compItem.id);
        const availStock = Math.max(0, compItem.quantidadeTotal - reservedComp);
        return Math.floor(availStock / comp.quantidade);
      });
      return Math.min(...capacities);
    }
    const reserved = getReservedCountInPeriod(item.id);
    return Math.max(0, item.quantidadeTotal - reserved);
  };

  // Selected items total
  const selectedItems = itens.filter((i) => selectedItemIds.includes(i.id));
  const valorTotalSemFrete = selectedItems.reduce((acc, curr) => acc + curr.precoAluguel, 0) * diasReserva;
  const valorTotal = valorTotalSemFrete + valorFrete;

  const toggleItemSelection = (item: ItemAcervo) => {
    setErrorMessage(null);
    const stock = getEffectiveStock(item);
    if (stock <= 0) {
      setErrorMessage(`O item "${item.nome}" está sem estoque disponível!`);
      return;
    }

    if (selectedItemIds.includes(item.id)) {
      setSelectedItemIds(selectedItemIds.filter((id) => id !== item.id));
    } else {
      setSelectedItemIds([...selectedItemIds, item.id]);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (clienteMode === 'cadastrado' && !selectedClienteId) {
      setErrorMessage('Selecione um cliente para a reserva.');
      return;
    }

    if (clienteMode === 'manual') {
      if (!manualNome.trim()) {
        setErrorMessage('Informe o nome do cliente para a digitação manual.');
        return;
      }
      if (!manualTelefone.trim()) {
        setErrorMessage('Informe o número de telefone do cliente.');
        return;
      }
    }

    if (selectedItemIds.length === 0) {
      setErrorMessage('Selecione pelo menos um item do acervo.');
      return;
    }

    if (tDevolucao <= tRetirada) {
      setErrorMessage(
        isSameDay
          ? 'Para reservas no mesmo dia, a hora de devolução deve ser posterior à hora de retirada.'
          : 'A data de devolução deve ser posterior à data de retirada.'
      );
      return;
    }

    // Stock validation check
    for (const item of selectedItems) {
      const stock = getEffectiveStock(item);
      if (stock <= 0) {
        setErrorMessage(`Validação de Estoque: O item "${item.nome}" não possui estoque suficiente.`);
        return;
      }
    }

    onSaveReserva({
      clienteId: clienteMode === 'cadastrado' ? Number(selectedClienteId) : undefined,
      itemIds: selectedItemIds,
      dataRetirada: tRetirada,
      dataDevolucao: tDevolucao,
      status: StatusReserva.CONFIRMADA,
      manualCliente: clienteMode === 'manual' ? { nome: manualNome, telefone: manualTelefone } : undefined,
      endereco: endereco || undefined, // NOVO: Passa o endereço inserido
      valorFrete: valorFrete || undefined,
      distanciaKm: distanciaKm || undefined,
      valorFretePorKm: valorFretePorKm || undefined,
    });
  };

  const handleFocusScroll = (e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setTimeout(() => {
      e.target.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }, 150);
  };

  return (
    <div className="fixed inset-0 z-50 bg-[#0A0A0B]/80 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-[#111113] border border-[#27272A] rounded-2xl max-w-2xl w-full max-h-[90vh] flex flex-col text-white shadow-2xl my-auto overflow-hidden">
        <div className="sticky top-0 z-20 bg-[#111113] border-b border-[#27272A] p-4 flex items-center justify-between shrink-0">
          <h3 className="text-xl font-serif italic text-[#D4AF37] flex items-center gap-2">
            <Calendar className="text-[#D4AF37]" size={22} />
            Formulário de Nova Reserva
          </h3>
          <span className="text-[10px] font-bold uppercase tracking-wider bg-[#18181B] text-[#D4AF37] border border-[#D4AF37]/30 px-3 py-1 rounded-full">
            Verificação de Estoque
          </span>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col flex-1 overflow-hidden">
          <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
            {errorMessage && (
              <div className="bg-rose-500/10 border border-rose-500/30 text-rose-300 p-3.5 rounded-xl text-xs font-medium flex items-center gap-2">
                <AlertTriangle size={18} className="shrink-0 text-rose-400" />
                <span>{errorMessage}</span>
              </div>
            )}

            {/* Client Input Mode Toggle & Selection */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-xs font-medium text-[#A1A1AA] flex items-center gap-1">
                  <User size={14} className="text-[#D4AF37]" /> Cliente da Reserva
                </label>
                <div className="flex bg-[#18181B] p-1 rounded-lg border border-[#27272A]">
                  <button
                    type="button"
                    onClick={() => setClienteMode('cadastrado')}
                    className={`px-3 py-1 rounded-md text-[11px] font-medium transition-all cursor-pointer ${
                      clienteMode === 'cadastrado' ? 'bg-[#D4AF37] text-[#0A0A0B] font-bold' : 'text-[#A1A1AA] hover:text-white'
                    }`}
                  >
                    Cadastrados
                  </button>
                  <button
                    type="button"
                    onClick={() => setClienteMode('manual')}
                    className={`px-3 py-1 rounded-md text-[11px] font-medium transition-all cursor-pointer ${
                      clienteMode === 'manual' ? 'bg-[#D4AF37] text-[#0A0A0B] font-bold' : 'text-[#A1A1AA] hover:text-white'
                    }`}
                  >
                    Digitação Manual
                  </button>
                </div>
              </div>

              {clienteMode === 'cadastrado' ? (
                <select
                  value={selectedClienteId}
                  onChange={(e) => setSelectedClienteId(Number(e.target.value))}
                  onFocus={handleFocusScroll}
                  className="w-full px-3.5 py-2.5 bg-[#18181B] border border-[#27272A] rounded-xl text-white text-sm focus:border-[#D4AF37] focus:outline-none"
                >
                  {clientes.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.nome} ({c.telefone})
                    </option>
                  ))}
                </select>
              ) : (
                <div className="space-y-3 bg-[#18181B] p-4 rounded-xl border border-[#27272A]">
                  <div>
                    <label className="block text-[11px] font-medium text-[#A1A1AA] mb-1">Nome do Cliente *</label>
                    <input
                      type="text"
                      placeholder="Ex: Carlos Eduardo"
                      value={manualNome}
                      onChange={(e) => setManualNome(e.target.value)}
                      onFocus={handleFocusScroll}
                      className="w-full px-3.5 py-2.5 bg-[#111113] border border-[#27272A] rounded-xl text-white text-sm focus:border-[#D4AF37] focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-medium text-[#A1A1AA] mb-1 flex items-center gap-1">
                      <Globe size={12} className="text-[#D4AF37]" /> País & Telefone / WhatsApp *
                    </label>
                    <PhoneInput
                      value={manualTelefone}
                      onChange={(val) => setManualTelefone(val)}
                      placeholder="(11) 98888-7777"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Dates Selection */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-[#A1A1AA] mb-1.5">Data de Retirada</label>
                <input
                  type="date"
                  required
                  value={dataRetiradaStr}
                  onChange={(e) => setDataRetiradaStr(e.target.value)}
                  onFocus={handleFocusScroll}
                  className="w-full px-3.5 py-2.5 bg-[#18181B] border border-[#27272A] rounded-xl text-white text-sm focus:border-[#D4AF37] focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-[#A1A1AA] mb-1.5">Data de Devolução</label>
                <input
                  type="date"
                  required
                  value={dataDevolucaoStr}
                  onChange={(e) => setDataDevolucaoStr(e.target.value)}
                  onFocus={handleFocusScroll}
                  className="w-full px-3.5 py-2.5 bg-[#18181B] border border-[#27272A] rounded-xl text-white text-sm focus:border-[#D4AF37] focus:outline-none"
                />
              </div>
            </div>

            {/* Local do Evento / Endereço de Entrega */}
            <div className="bg-[#18181C] p-3.5 rounded-xl border border-[#27272A]">
              <EnderecoFormFields
                value={addressData}
                onChange={(newAddr) => {
                  setAddressData(newAddr);
                  setEndereco(formatEnderecoCompleto(newAddr));
                }}
                onFocus={handleFocusScroll}
                labelPrefix="Local do Evento"
              />
            </div>

            {/* Painel de Cálculo de Frete Integrado */}
            <div className="bg-[#18181B] border border-[#27272A] p-4 rounded-xl space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-[#27272A]">
                <div className="flex items-center gap-2">
                  <MapPin size={16} className="text-[#D4AF37]" />
                  <span className="text-xs font-bold text-white uppercase tracking-wider">Cálculo de Frete Automatizado</span>
                </div>
                <button
                  type="button"
                  onClick={async () => {
                    if (!endereco?.trim()) {
                      setErrorMessage('Por favor, digite um endereço no campo acima primeiro.');
                      return;
                    }
                    setCalculandoFrete(true);
                    setErrorMessage(null);
                    try {
                      const res = await calcularDistanciaRealOuSimulada(
                        empresaConfig?.enderecoCompleto || 'Rua das Flores, 100 - São Paulo, SP',
                        endereco,
                        empresaConfig?.googleMapsApiKey
                      );
                      setDistanciaKm(res.distanciaKm);
                      const frete = calcularValorFrete(res.distanciaKm, valorFretePorKm);
                      setValorFrete(frete);
                    } catch (err) {
                      setErrorMessage('Erro ao calcular deslocamento no Google Maps.');
                    } finally {
                      setCalculandoFrete(false);
                    }
                  }}
                  disabled={calculandoFrete || !endereco?.trim()}
                  className="px-4 py-1.5 bg-[#D4AF37] hover:bg-[#E5C158] text-black text-[11px] font-bold rounded-lg transition-all disabled:opacity-50 flex items-center gap-1 cursor-pointer"
                >
                  {calculandoFrete ? 'Calculando...' : 'Calcular Deslocamento'}
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs text-[#E4E4E7]">
                <div>
                  <label className="block text-[10px] text-[#A1A1AA] mb-1 uppercase tracking-wider font-semibold">Valor por Km (R$/Km)</label>
                  <input
                    type="text"
                    required
                    placeholder="R$ 0,00"
                    value={formatCurrencyBRL(valorFretePorKm)}
                    onChange={(e) => {
                      const rate = parseCurrencyBRLToNumber(e.target.value);
                      setValorFretePorKm(rate);
                    }}
                    className="w-full px-3 py-2 bg-[#111113] border border-[#27272A] rounded-lg text-white font-mono focus:border-[#D4AF37] focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[10px] text-[#A1A1AA] mb-1 uppercase tracking-wider font-semibold">Distância de Ida (Km)</label>
                  <div className="w-full px-3 py-2 bg-[#111113] border border-[#27272A] rounded-lg text-white font-mono flex items-center justify-between">
                    <span>{distanciaKm}</span>
                    <span className="text-[#71717A] text-[10px]">Km</span>
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] text-[#A1A1AA] mb-1 uppercase tracking-wider font-semibold">Custo do Frete</label>
                  <input
                    type="text"
                    required
                    placeholder="R$ 0,00"
                    value={formatCurrencyBRL(valorFrete)}
                    onChange={(e) => {
                      const cost = parseCurrencyBRLToNumber(e.target.value);
                      setValorFrete(cost);
                    }}
                    className="w-full px-3 py-2 bg-[#111113] border border-[#27272A] rounded-lg text-emerald-400 font-mono font-bold focus:border-[#D4AF37] focus:outline-none"
                  />
                </div>
              </div>

              {distanciaKm > 0 && (
                <p className="text-[10px] text-[#71717A] leading-normal">
                  * Deslocamento baseado no endereço da empresa (<span className="italic">{empresaConfig?.enderecoCompleto || 'Rua das Flores, 100 - São Paulo, SP'}</span>) até o local do evento.
                </p>
              )}
            </div>

            {/* Same-day Time Pickers */}
            {isSameDay && (
              <div className="bg-[#18181B] border border-[#D4AF37]/30 p-4 rounded-xl space-y-3 animate-fadeIn">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-[#D4AF37] uppercase tracking-wider">
                    Reserva no Mesmo Dia (Horários de Retirada & Devolução)
                  </span>
                  <span className="text-[10px] text-[#A1A1AA] bg-[#111113] px-2 py-0.5 rounded border border-[#27272A]">
                    Mesmo Dia
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] text-[#A1A1AA] mb-1">Hora Retirada</label>
                    <input
                      type="time"
                      value={horaRetirada}
                      onChange={(e) => setHoraRetirada(e.target.value)}
                      className="w-full px-3 py-2 bg-[#111113] border border-[#27272A] rounded-xl text-white text-sm focus:border-[#D4AF37] focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] text-[#A1A1AA] mb-1">Hora Devolução</label>
                    <input
                      type="time"
                      value={horaDevolucao}
                      onChange={(e) => setHoraDevolucao(e.target.value)}
                      className="w-full px-3 py-2 bg-[#111113] border border-[#27272A] rounded-xl text-white text-sm focus:border-[#D4AF37] focus:outline-none"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Items Checkbox Selection */}
            <div>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2">
                <label className="text-xs font-medium text-[#A1A1AA] flex items-center gap-1">
                  <Package size={14} className="text-[#D4AF37]" /> Selecione os Itens do Acervo
                  <span className="text-[#71717A] text-[11px] font-mono ml-1">({selectedItemIds.length} selecionado(s))</span>
                </label>
                
                <div className="flex items-center gap-1.5">
                  <Filter size={13} className="text-[#D4AF37]" />
                  <select
                    value={selectedCategoria}
                    onChange={(e) => setSelectedCategoria(e.target.value)}
                    className="px-2.5 py-1 bg-[#18181B] border border-[#27272A] rounded-lg text-white text-xs focus:border-[#D4AF37] focus:outline-none cursor-pointer"
                  >
                    {categoriasDisponiveis.map((cat) => (
                      <option key={cat} value={cat}>
                        {cat === 'Todas' ? 'Todas as Categorias' : cat}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="max-h-56 overflow-y-auto space-y-2 pr-1 custom-scrollbar bg-[#0A0A0B] p-3 rounded-xl border border-[#27272A]">
                {itensFiltrados.length === 0 ? (
                  <div className="text-center py-6 text-xs text-[#71717A]">
                    Nenhum item cadastrado nesta categoria.
                  </div>
                ) : (
                  itensFiltrados.map((item) => {
                    const isSelected = selectedItemIds.includes(item.id);
                    const effectiveStock = getEffectiveStock(item);
                    const hasStock = effectiveStock > 0;

                    return (
                      <div
                        key={item.id}
                        onClick={() => toggleItemSelection(item)}
                        className={`flex items-center justify-between p-2.5 rounded-xl border text-sm cursor-pointer transition-all ${
                          isSelected
                            ? 'bg-[#18181B] border-[#D4AF37] text-white'
                            : 'bg-[#111113] border-[#27272A] text-[#A1A1AA] hover:border-[#3F3F46]'
                        } ${!hasStock ? 'opacity-40 bg-[#111113] cursor-not-allowed' : ''}`}
                      >
                        <div className="flex items-center space-x-3">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            disabled={!hasStock}
                            onChange={() => {}}
                            className="rounded border-[#3F3F46] text-[#D4AF37] focus:ring-[#D4AF37]"
                          />
                          <img src={item.imageUrl} alt="" className="w-8 h-8 rounded-lg object-cover" />
                          <div>
                            <div className="font-medium text-xs sm:text-sm text-white flex items-center gap-1.5 flex-wrap">
                              {item.isKit && (
                                <span className="bg-[#D4AF37]/15 text-[#D4AF37] border border-[#D4AF37]/35 text-[9px] px-1 py-0.2 rounded uppercase font-bold tracking-wider">
                                  Kit
                                </span>
                              )}
                              <span>{item.nome}</span>
                              {item.categoria && (
                                <span className="text-[10px] text-[#A1A1AA] bg-[#18181B] px-1.5 py-0.2 rounded border border-[#27272A]">
                                  {item.categoria}
                                </span>
                              )}
                            </div>
                            
                            {item.descricao && (
                              <p className="text-[10px] text-[#A1A1AA] truncate mt-0.5 max-w-xs">
                                {item.descricao}
                              </p>
                            )}
                            
                            {item.isKit && item.kitComponentes && item.kitComponentes.length > 0 && (
                              <div className="text-[10px] text-[#71717A] mt-0.5 max-w-xs truncate">
                                Composto por:{' '}
                                {item.kitComponentes
                                  .map((comp) => {
                                    const compItem = itens.find((i) => i.id === comp.itemId);
                                    return `${comp.quantidade}x ${compItem?.nome || 'Item'}`;
                                  })
                                  .join(', ')}
                              </div>
                            )}

                            <div className="text-xs text-[#D4AF37] font-serif italic mt-0.5">
                              {formatarMoeda(item.precoAluguel)} / dia
                            </div>
                          </div>
                        </div>

                        <div>
                          {hasStock ? (
                            <span className="text-xs bg-[#18181B] border border-emerald-500/30 text-emerald-400 px-2.5 py-0.5 rounded-full font-medium">
                              {effectiveStock} em estoque
                            </span>
                          ) : (
                            <span className="text-xs bg-[#18181B] border border-rose-500/30 text-rose-400 px-2.5 py-0.5 rounded-full font-medium">
                              Sem Estoque
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            {/* Pricing summary */}
            <div className="bg-[#0A0A0B] border border-[#27272A] p-4 rounded-xl flex items-center justify-between">
              <div>
                <p className="text-xs text-[#71717A]">Duração Calculada</p>
                <p className="text-sm font-semibold text-[#E4E4E7]">{diasReserva} dia(s) de aluguel</p>
              </div>

              <div className="text-right">
                <p className="text-xs text-[#71717A]">Valor Total Estimado</p>
                <p className="text-xl font-serif italic text-[#D4AF37]">{formatarMoeda(valorTotal)}</p>
              </div>
            </div>
          </div>

          {/* Sticky Actions Footer */}
          <div className="sticky bottom-0 z-20 bg-[#111113]/95 backdrop-blur-md border-t border-[#27272A] p-4 flex items-center justify-end gap-3 shrink-0">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-[#18181B] border border-[#27272A] hover:bg-[#27272A] text-[#A1A1AA] rounded-xl text-xs font-semibold uppercase tracking-wider cursor-pointer"
            >
              Cancelar
            </button>

            <button
              type="submit"
              className="flex items-center gap-2 px-5 py-2.5 bg-[#D4AF37] hover:bg-[#E5C158] text-[#0A0A0B] rounded-xl text-xs font-bold uppercase tracking-wider shadow-lg shadow-[#D4AF37]/10 transition-all cursor-pointer"
            >
              <CheckCircle size={16} />
              Confirmar Reserva
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
