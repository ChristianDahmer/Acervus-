import React, { useState } from 'react';
import { MapPin, Building, Hash, Navigation, Compass, Search, Loader2, CheckCircle2, AlertCircle } from 'lucide-react';
import { AddressData, buscarEnderecoPorCep, obterLocalizacaoEEnderecoGPS } from '../utils/addressUtils';

interface EnderecoFormFieldsProps {
  value: AddressData;
  onChange: (newValue: AddressData) => void;
  onFocus?: (e: React.FocusEvent<any>) => void;
  labelPrefix?: string;
  showTitle?: boolean;
}

export const EnderecoFormFields: React.FC<EnderecoFormFieldsProps> = ({
  value,
  onChange,
  onFocus,
  labelPrefix = '',
  showTitle = true,
}) => {
  const [loadingGps, setLoadingGps] = useState(false);
  const [loadingCep, setLoadingCep] = useState(false);
  const [statusMsg, setStatusMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const handleChange = (field: keyof AddressData, val: string) => {
    onChange({
      ...value,
      [field]: val,
    });
  };

  // Handler para captura e geocodificação da localização GPS atual
  const handleUseGpsLocation = async () => {
    setLoadingGps(true);
    setStatusMsg(null);

    try {
      const result = await obterLocalizacaoEEnderecoGPS();
      const newAddress = {
        ...value,
        ...result.address,
        // Preserva o número caso já estivesse digitado e o GPS não traga o número exato
        numero: value.numero || result.address.numero || '',
      };

      onChange(newAddress);
      setStatusMsg({
        type: 'success',
        text: `Localização detectada via GPS! Endereço preenchido automaticamente.`,
      });
      setTimeout(() => setStatusMsg(null), 5000);
    } catch (err: any) {
      console.error('Erro ao obter GPS:', err);
      setStatusMsg({
        type: 'error',
        text: err?.message || 'Não foi possível capturar a localização GPS do seu dispositivo.',
      });
      setTimeout(() => setStatusMsg(null), 6000);
    } finally {
      setLoadingGps(false);
    }
  };

  // Handler para busca de CEP via ViaCEP
  const handleSearchCep = async (cepToSearch?: string) => {
    const targetCep = cepToSearch || value.cep;
    if (!targetCep || targetCep.replace(/\D/g, '').length !== 8) {
      setStatusMsg({
        type: 'error',
        text: 'Informe um CEP válido com 8 dígitos para buscar o endereço.',
      });
      setTimeout(() => setStatusMsg(null), 4000);
      return;
    }

    setLoadingCep(true);
    setStatusMsg(null);

    try {
      const res = await buscarEnderecoPorCep(targetCep);
      if (res) {
        onChange({
          ...value,
          ...res,
          numero: value.numero || '',
        });
        setStatusMsg({
          type: 'success',
          text: 'Dados do endereço encontrados e preenchidos via CEP!',
        });
        setTimeout(() => setStatusMsg(null), 4000);
      } else {
        setStatusMsg({
          type: 'error',
          text: 'CEP não encontrado. Verifique os dígitos informados.',
        });
        setTimeout(() => setStatusMsg(null), 5000);
      }
    } catch (err) {
      setStatusMsg({
        type: 'error',
        text: 'Erro ao consultar serviço de CEP.',
      });
      setTimeout(() => setStatusMsg(null), 5000);
    } finally {
      setLoadingCep(false);
    }
  };

  // Preenchimento automático ao digitar 8 dígitos no campo de CEP
  const handleCepInputChange = (val: string) => {
    handleChange('cep', val);
    const clean = val.replace(/\D/g, '');
    if (clean.length === 8 && !loadingCep) {
      handleSearchCep(val);
    }
  };

  return (
    <div className="space-y-3">
      {/* Top Header Controls with GPS Trigger Button */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#27272A]/80 pb-2">
        {showTitle ? (
          <label className="block text-xs font-bold text-[#A1A1AA] uppercase tracking-wider flex items-center gap-1.5">
            <MapPin size={13} className="text-[#D4AF37]" />
            <span>{labelPrefix ? `${labelPrefix} - ` : ''}Endereço & Localização</span>
          </label>
        ) : <div />}

        {/* GPS Auto-Fill Button */}
        <button
          type="button"
          onClick={handleUseGpsLocation}
          disabled={loadingGps}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#D4AF37]/15 hover:bg-[#D4AF37]/25 text-[#D4AF37] border border-[#D4AF37]/40 rounded-lg text-xs font-semibold transition-all cursor-pointer shadow-sm active:scale-95 disabled:opacity-50"
          title="Detectar sua localização GPS e preencher endereço automaticamente"
        >
          {loadingGps ? (
            <Loader2 size={13} className="animate-spin text-[#D4AF37]" />
          ) : (
            <Compass size={13} className="text-[#D4AF37]" />
          )}
          <span>{loadingGps ? 'Obtendo GPS...' : 'Usar Minha Localização Atual'}</span>
        </button>
      </div>

      {/* Status Feedback Message Banner */}
      {statusMsg && (
        <div
          className={`p-2 rounded-lg text-xs flex items-center gap-2 border animate-fade-in ${
            statusMsg.type === 'success'
              ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
              : 'bg-rose-500/10 text-rose-400 border-rose-500/30'
          }`}
        >
          {statusMsg.type === 'success' ? (
            <CheckCircle2 size={14} className="shrink-0 text-emerald-400" />
          ) : (
            <AlertCircle size={14} className="shrink-0 text-rose-400" />
          )}
          <span className="leading-tight">{statusMsg.text}</span>
        </div>
      )}

      {/* Row 1: CEP + Busca CEP */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
        <div className="sm:col-span-2">
          <label className="block text-[11px] font-medium text-[#A1A1AA] mb-1 flex items-center justify-between">
            <span className="flex items-center gap-1">
              <Search size={11} className="text-[#71717A]" /> CEP (Auto-completar)
            </span>
            <span className="text-[9px] text-[#D4AF37] font-mono">ViaCEP</span>
          </label>
          <div className="relative flex items-center">
            <input
              type="text"
              maxLength={9}
              value={value.cep || ''}
              onChange={(e) => handleCepInputChange(e.target.value)}
              onFocus={onFocus}
              placeholder="00000-000"
              className="w-full pl-3 pr-20 py-2 bg-[#18181B] border border-[#27272A] rounded-xl text-white text-xs focus:border-[#D4AF37] focus:outline-none transition-all placeholder-[#71717A] font-mono"
            />
            <button
              type="button"
              onClick={() => handleSearchCep()}
              disabled={loadingCep}
              className="absolute right-1 top-1/2 -translate-y-1/2 px-2.5 py-1 bg-[#27272A] hover:bg-[#3F3F46] text-[#D4AF37] rounded-lg text-[10px] font-bold transition-all cursor-pointer flex items-center gap-1 disabled:opacity-50"
            >
              {loadingCep ? <Loader2 size={11} className="animate-spin" /> : <Search size={11} />}
              <span>Buscar</span>
            </button>
          </div>
        </div>
      </div>

      {/* Row 2: Endereço (Logradouro / Rua / Av) + Número */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
        <div className="sm:col-span-3">
          <label className="block text-[11px] font-medium text-[#A1A1AA] mb-1 flex items-center gap-1">
            <Navigation size={11} className="text-[#71717A]" /> Endereço / Rua / Av.
          </label>
          <input
            type="text"
            value={value.logradouro || ''}
            onChange={(e) => handleChange('logradouro', e.target.value)}
            onFocus={onFocus}
            placeholder="Ex: Av. das Nações Unidas, Rua das Flores"
            className="w-full px-3.5 py-2 bg-[#18181B] border border-[#27272A] rounded-xl text-white text-xs focus:border-[#D4AF37] focus:outline-none transition-all placeholder-[#71717A]"
          />
        </div>

        <div className="sm:col-span-1">
          <label className="block text-[11px] font-medium text-[#A1A1AA] mb-1 flex items-center gap-1">
            <Hash size={11} className="text-[#71717A]" /> Número
          </label>
          <input
            type="text"
            value={value.numero || ''}
            onChange={(e) => handleChange('numero', e.target.value)}
            onFocus={onFocus}
            placeholder="100 ou S/N"
            className="w-full px-3 py-2 bg-[#18181B] border border-[#27272A] rounded-xl text-white text-xs focus:border-[#D4AF37] focus:outline-none transition-all placeholder-[#71717A]"
          />
        </div>
      </div>

      {/* Row 3: Bairro + Cidade + Estado (UF) */}
      <div className="grid grid-cols-1 sm:grid-cols-5 gap-3">
        <div className="sm:col-span-2">
          <label className="block text-[11px] font-medium text-[#A1A1AA] mb-1">Bairro</label>
          <input
            type="text"
            value={value.bairro || ''}
            onChange={(e) => handleChange('bairro', e.target.value)}
            onFocus={onFocus}
            placeholder="Ex: Centro, Jardins"
            className="w-full px-3 py-2 bg-[#18181B] border border-[#27272A] rounded-xl text-white text-xs focus:border-[#D4AF37] focus:outline-none transition-all placeholder-[#71717A]"
          />
        </div>

        <div className="sm:col-span-2">
          <label className="block text-[11px] font-medium text-[#A1A1AA] mb-1 flex items-center gap-1">
            <Building size={11} className="text-[#71717A]" /> Cidade / Município
          </label>
          <input
            type="text"
            value={value.cidade || ''}
            onChange={(e) => handleChange('cidade', e.target.value)}
            onFocus={onFocus}
            placeholder="Ex: São Paulo"
            className="w-full px-3 py-2 bg-[#18181B] border border-[#27272A] rounded-xl text-white text-xs focus:border-[#D4AF37] focus:outline-none transition-all placeholder-[#71717A]"
          />
        </div>

        <div className="sm:col-span-1">
          <label className="block text-[11px] font-medium text-[#A1A1AA] mb-1">UF</label>
          <input
            type="text"
            maxLength={2}
            value={value.estado || ''}
            onChange={(e) => handleChange('estado', e.target.value.toUpperCase())}
            onFocus={onFocus}
            placeholder="SP"
            className="w-full px-3 py-2 bg-[#18181B] border border-[#27272A] rounded-xl text-white text-xs focus:border-[#D4AF37] focus:outline-none transition-all uppercase placeholder-[#71717A] font-mono text-center"
          />
        </div>
      </div>
    </div>
  );
};

