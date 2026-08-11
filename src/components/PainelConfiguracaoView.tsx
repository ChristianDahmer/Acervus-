import React, { useState, useEffect } from 'react';
import { EmpresaConfig, PainelConfiguracaoData, DispositivoAutorizado } from '../types';
import {
  Sliders,
  Save,
  CheckCircle,
  DollarSign,
  Package,
  Bell,
  HardDrive,
  Download,
  RotateCcw,
  ShieldCheck,
  Cpu,
  Clock,
  AlertTriangle,
  Volume2,
  VolumeX,
  FileText,
  FileSpreadsheet,
  Check,
  RefreshCw,
  Database,
  Building2,
  Lock,
  Layers,
  Sparkles,
  Info
} from 'lucide-react';

interface PainelConfiguracaoViewProps {
  empresaConfig: EmpresaConfig;
  onSaveConfig: (newConfig: EmpresaConfig) => void;
  authenticatedDevice?: DispositivoAutorizado | null;
}

const DEFAULT_PAINEL_CONFIG: PainelConfiguracaoData = {
  validadeOrcamentoDias: 7,
  percentualSinalPadrao: 50,
  multaAtrasoDiaria: 25.00,
  emissaoComprovanteAuto: true,
  alertaEstoqueMinimo: 2,
  diasHigienizacaoCarencia: 1,
  bloqueioAutoDanificados: true,
  exibirIndisponiveisBusca: true,
  lembreteDevolucaoHoras: 24,
  notificarReservaPendente: true,
  somBipCheckinCheckout: true,
  modoDepuracaoLogs: false,
  backupAutoFirestore: true,
};

export const PainelConfiguracaoView: React.FC<PainelConfiguracaoViewProps> = ({
  empresaConfig,
  onSaveConfig,
  authenticatedDevice,
}) => {
  const [config, setConfig] = useState<PainelConfiguracaoData>(() => ({
    ...DEFAULT_PAINEL_CONFIG,
    ...(empresaConfig.painelConfiguracao || {}),
  }));

  const [savedNotice, setSavedNotice] = useState<string | null>(null);
  const [isExporting, setIsExporting] = useState(false);

  const [habilitarGoogleDrive, setHabilitarGoogleDrive] = useState(() => empresaConfig.habilitarGoogleDrive !== false);
  const [habilitarGoogleForms, setHabilitarGoogleForms] = useState(() => empresaConfig.habilitarGoogleForms !== false);

  useEffect(() => {
    if (empresaConfig.painelConfiguracao) {
      setConfig({
        ...DEFAULT_PAINEL_CONFIG,
        ...empresaConfig.painelConfiguracao,
      });
    }
    setHabilitarGoogleDrive(empresaConfig.habilitarGoogleDrive !== false);
    setHabilitarGoogleForms(empresaConfig.habilitarGoogleForms !== false);
  }, [empresaConfig.painelConfiguracao, empresaConfig.habilitarGoogleDrive, empresaConfig.habilitarGoogleForms]);

  const handleToggle = (key: keyof PainelConfiguracaoData) => {
    setConfig((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  const handleNumberChange = (key: keyof PainelConfiguracaoData, val: number) => {
    setConfig((prev) => ({
      ...prev,
      [key]: Math.max(0, val),
    }));
  };

  const handleSave = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const updatedEmpresaConfig: EmpresaConfig = {
      ...empresaConfig,
      painelConfiguracao: config,
      habilitarGoogleDrive,
      habilitarGoogleForms,
    };
    onSaveConfig(updatedEmpresaConfig);
    setSavedNotice('Configurações salvas com sucesso no banco de dados!');
    setTimeout(() => setSavedNotice(null), 3500);
  };

  const handleExportBackup = () => {
    setIsExporting(true);
    try {
      const backupData = {
        empresa: empresaConfig,
        painelConfiguracao: config,
        habilitarGoogleDrive,
        habilitarGoogleForms,
        exportDate: new Date().toISOString(),
        systemVersion: 'Acervus Core v2.4 (Multi-Tenant)',
      };
      const blob = new Blob([JSON.stringify(backupData, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `backup_config_acervus_${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      setSavedNotice('Backup completo do sistema baixado com sucesso!');
    } catch (err) {
      alert('Erro ao gerar backup de dados.');
    } finally {
      setTimeout(() => setIsExporting(false), 1000);
      setTimeout(() => setSavedNotice(null), 3500);
    }
  };

  const handleResetDefaults = () => {
    if (window.confirm('Deseja restaurar as configurações padrão do sistema?')) {
      setConfig(DEFAULT_PAINEL_CONFIG);
      setHabilitarGoogleDrive(true);
      setHabilitarGoogleForms(true);
      const updatedEmpresaConfig: EmpresaConfig = {
        ...empresaConfig,
        painelConfiguracao: DEFAULT_PAINEL_CONFIG,
        habilitarGoogleDrive: true,
        habilitarGoogleForms: true,
      };
      onSaveConfig(updatedEmpresaConfig);
      setSavedNotice('Parâmetros restaurados para o padrão do sistema.');
      setTimeout(() => setSavedNotice(null), 3500);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Notification Toast */}
      {savedNotice && (
        <div className="bg-emerald-500/10 border border-emerald-500/30 p-4 rounded-xl flex items-center justify-between text-emerald-300 text-xs font-semibold animate-fadeIn shadow-lg">
          <div className="flex items-center gap-2.5">
            <CheckCircle size={18} className="text-emerald-400 shrink-0" />
            <span>{savedNotice}</span>
          </div>
          <button
            type="button"
            onClick={() => setSavedNotice(null)}
            className="text-emerald-400 hover:text-white text-xs underline cursor-pointer"
          >
            Fechar
          </button>
        </div>
      )}

      {/* Main Header & Actions */}
      <div className="bg-[#111113] p-6 rounded-2xl border border-[#27272A] flex flex-col md:flex-row justify-between items-start md:items-center gap-4 shadow-xl">
        <div>
          <div className="flex items-center space-x-2 text-[#D4AF37] text-xs font-bold uppercase tracking-wider mb-1">
            <Sliders size={16} /> Painel de Configuração
          </div>
          <h2 className="text-2xl font-serif italic text-white flex items-center gap-2.5">
            Painel Geral de Parâmetros Operacionais
          </h2>
          <p className="text-[#A1A1AA] text-xs mt-1">
            Gerencie regras comerciais, políticas de inventário, automações do sistema e rotinas de backup da locadora.
          </p>
        </div>

        <div className="flex items-center gap-2.5 w-full md:w-auto shrink-0">
          <button
            type="button"
            onClick={handleExportBackup}
            disabled={isExporting}
            className="flex-1 md:flex-none flex items-center justify-center gap-2 px-4 py-2.5 bg-[#18181B] hover:bg-[#27272A] text-[#E4E4E7] border border-[#27272A] hover:border-[#3F3F46] rounded-xl text-xs font-semibold transition-all cursor-pointer"
          >
            {isExporting ? <RefreshCw size={14} className="animate-spin text-[#D4AF37]" /> : <Download size={14} className="text-[#D4AF37]" />}
            <span>Exportar Backup</span>
          </button>

          <button
            type="button"
            onClick={handleSave}
            className="flex-1 md:flex-none flex items-center justify-center gap-2 px-5 py-2.5 bg-gradient-to-r from-[#D4AF37] to-[#B89628] hover:from-[#E5C158] hover:to-[#D4AF37] text-black font-bold rounded-xl text-xs shadow-lg shadow-[#D4AF37]/20 transition-all cursor-pointer"
          >
            <Save size={15} />
            <span>Salvar Alterações</span>
          </button>
        </div>
      </div>

      {/* Real-time System Status Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-[#111113] border border-[#27272A] rounded-xl p-4 flex items-center gap-3">
          <div className="p-2.5 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            <ShieldCheck size={20} />
          </div>
          <div>
            <span className="text-[10px] text-[#A1A1AA] font-bold uppercase tracking-wider block">Multi-Tenant Status</span>
            <span className="text-white text-xs font-bold flex items-center gap-1 mt-0.5">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" /> Isolado & Seguro
            </span>
          </div>
        </div>

        <div className="bg-[#111113] border border-[#27272A] rounded-xl p-4 flex items-center gap-3">
          <div className="p-2.5 rounded-lg bg-[#D4AF37]/10 text-[#D4AF37] border border-[#D4AF37]/20">
            <Database size={20} />
          </div>
          <div>
            <span className="text-[10px] text-[#A1A1AA] font-bold uppercase tracking-wider block">Persistência Nuvem</span>
            <span className="text-white text-xs font-bold truncate block">Firestore & Room Sync</span>
          </div>
        </div>

        <div className="bg-[#111113] border border-[#27272A] rounded-xl p-4 flex items-center gap-3">
          <div className="p-2.5 rounded-lg bg-blue-500/10 text-blue-400 border border-blue-500/20">
            <Lock size={20} />
          </div>
          <div>
            <span className="text-[10px] text-[#A1A1AA] font-bold uppercase tracking-wider block">Nível de Acesso</span>
            <span className="text-white text-xs font-bold uppercase">
              {authenticatedDevice?.nivelAcesso || 'OPERADOR'}
            </span>
          </div>
        </div>

        <div className="bg-[#111113] border border-[#27272A] rounded-xl p-4 flex items-center gap-3">
          <div className="p-2.5 rounded-lg bg-purple-500/10 text-purple-400 border border-purple-500/20">
            <Cpu size={20} />
          </div>
          <div>
            <span className="text-[10px] text-[#A1A1AA] font-bold uppercase tracking-wider block">Dispositivo MDM</span>
            <span className="text-white text-xs font-bold truncate block">
              {authenticatedDevice?.nomeDispositivo || 'Terminal Principal'}
            </span>
          </div>
        </div>
      </div>

      {/* Main Configuration Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 1. Parâmetros Comerciais & Financeiros */}
        <div className="bg-[#111113] border border-[#27272A] rounded-2xl p-6 shadow-xl space-y-5">
          <div className="flex items-center gap-2.5 border-b border-[#27272A] pb-3">
            <div className="p-2 rounded-lg bg-[#D4AF37]/10 text-[#D4AF37]">
              <DollarSign size={18} />
            </div>
            <div>
              <h3 className="font-serif italic text-white text-base">Parâmetros Financeiros & Vendas</h3>
              <p className="text-[#A1A1AA] text-xs">Defina prazos, garantias e regras de cobrança para locações.</p>
            </div>
          </div>

          <div className="space-y-4">
            {/* Validade do Orçamento */}
            <div className="flex items-center justify-between p-3.5 bg-[#18181B] rounded-xl border border-[#27272A]">
              <div>
                <label className="text-white text-xs font-semibold block">Validade Padrão do Orçamento</label>
                <span className="text-[#71717A] text-[10px]">Período em dias até a expiração automática da proposta</span>
              </div>
              <div className="flex items-center gap-1.5 shrink-0">
                <input
                  type="number"
                  min={1}
                  max={90}
                  value={config.validadeOrcamentoDias}
                  onChange={(e) => handleNumberChange('validadeOrcamentoDias', parseInt(e.target.value) || 1)}
                  className="w-16 bg-[#0A0A0B] border border-[#27272A] text-white text-xs font-bold text-center py-1.5 rounded-lg focus:border-[#D4AF37] focus:outline-none"
                />
                <span className="text-[#A1A1AA] text-xs font-semibold">dias</span>
              </div>
            </div>

            {/* Percentual de Sinal */}
            <div className="flex items-center justify-between p-3.5 bg-[#18181B] rounded-xl border border-[#27272A]">
              <div>
                <label className="text-white text-xs font-semibold block">Percentual de Sinal / Depósito</label>
                <span className="text-[#71717A] text-[10px]">Valor sugerido para confirmação da reserva do cliente</span>
              </div>
              <div className="flex items-center gap-1.5 shrink-0">
                <input
                  type="number"
                  min={0}
                  max={100}
                  value={config.percentualSinalPadrao}
                  onChange={(e) => handleNumberChange('percentualSinalPadrao', parseInt(e.target.value) || 0)}
                  className="w-16 bg-[#0A0A0B] border border-[#27272A] text-white text-xs font-bold text-center py-1.5 rounded-lg focus:border-[#D4AF37] focus:outline-none"
                />
                <span className="text-[#A1A1AA] text-xs font-semibold">%</span>
              </div>
            </div>

            {/* Multa Diária por Atraso */}
            <div className="flex items-center justify-between p-3.5 bg-[#18181B] rounded-xl border border-[#27272A]">
              <div>
                <label className="text-white text-xs font-semibold block">Taxa de Multa por Dia de Atraso</label>
                <span className="text-[#71717A] text-[10px]">Valor diário cobrado excedente na devolução do acervo</span>
              </div>
              <div className="flex items-center gap-1.5 shrink-0">
                <span className="text-[#D4AF37] text-xs font-bold">R$</span>
                <input
                  type="number"
                  min={0}
                  step={5}
                  value={config.multaAtrasoDiaria}
                  onChange={(e) => handleNumberChange('multaAtrasoDiaria', parseFloat(e.target.value) || 0)}
                  className="w-20 bg-[#0A0A0B] border border-[#27272A] text-white text-xs font-bold text-center py-1.5 rounded-lg focus:border-[#D4AF37] focus:outline-none"
                />
              </div>
            </div>

            {/* Emissão Automática de Comprovante */}
            <div className="flex items-center justify-between p-3.5 bg-[#18181B] rounded-xl border border-[#27272A]">
              <div>
                <label className="text-white text-xs font-semibold block">Emissão Auto de Recibos / PDF</label>
                <span className="text-[#71717A] text-[10px]">Gera comprovante PDF ao confirmar pagamento no financeiro</span>
              </div>
              <button
                type="button"
                onClick={() => handleToggle('emissaoComprovanteAuto')}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none cursor-pointer ${
                  config.emissaoComprovanteAuto ? 'bg-[#D4AF37]' : 'bg-[#27272A]'
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-black transition-transform ${
                    config.emissaoComprovanteAuto ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>
          </div>
        </div>

        {/* 2. Regras do Inventário & Estoque */}
        <div className="bg-[#111113] border border-[#27272A] rounded-2xl p-6 shadow-xl space-y-5">
          <div className="flex items-center gap-2.5 border-b border-[#27272A] pb-3">
            <div className="p-2 rounded-lg bg-[#D4AF37]/10 text-[#D4AF37]">
              <Package size={18} />
            </div>
            <div>
              <h3 className="font-serif italic text-white text-base">Regras de Inventário & Disponibilidade</h3>
              <p className="text-[#A1A1AA] text-xs">Ajuste limites de alerta, prazos de higienização e bloqueios.</p>
            </div>
          </div>

          <div className="space-y-4">
            {/* Alerta de Estoque Mínimo */}
            <div className="flex items-center justify-between p-3.5 bg-[#18181B] rounded-xl border border-[#27272A]">
              <div>
                <label className="text-white text-xs font-semibold block">Alerta de Estoque Mínimo</label>
                <span className="text-[#71717A] text-[10px]">Notifica quando o saldo disponível for menor que o limite</span>
              </div>
              <div className="flex items-center gap-1.5 shrink-0">
                <input
                  type="number"
                  min={0}
                  value={config.alertaEstoqueMinimo}
                  onChange={(e) => handleNumberChange('alertaEstoqueMinimo', parseInt(e.target.value) || 0)}
                  className="w-16 bg-[#0A0A0B] border border-[#27272A] text-white text-xs font-bold text-center py-1.5 rounded-lg focus:border-[#D4AF37] focus:outline-none"
                />
                <span className="text-[#A1A1AA] text-xs font-semibold">unid.</span>
              </div>
            </div>

            {/* Dias de Carência / Higienização */}
            <div className="flex items-center justify-between p-3.5 bg-[#18181B] rounded-xl border border-[#27272A]">
              <div>
                <label className="text-white text-xs font-semibold block">Carência de Higienização Pós-Devolução</label>
                <span className="text-[#71717A] text-[10px]">Intervalo de segurança antes de permitir nova reserva da peça</span>
              </div>
              <div className="flex items-center gap-1.5 shrink-0">
                <input
                  type="number"
                  min={0}
                  max={7}
                  value={config.diasHigienizacaoCarencia}
                  onChange={(e) => handleNumberChange('diasHigienizacaoCarencia', parseInt(e.target.value) || 0)}
                  className="w-16 bg-[#0A0A0B] border border-[#27272A] text-white text-xs font-bold text-center py-1.5 rounded-lg focus:border-[#D4AF37] focus:outline-none"
                />
                <span className="text-[#A1A1AA] text-xs font-semibold">dias</span>
              </div>
            </div>

            {/* Bloqueio Automático de Peças Danificadas */}
            <div className="flex items-center justify-between p-3.5 bg-[#18181B] rounded-xl border border-[#27272A]">
              <div>
                <label className="text-white text-xs font-semibold block">Bloqueio Auto de Avariados em Manutenção</label>
                <span className="text-[#71717A] text-[10px]">Impede a inclusão de peças em manutenção nos orçamentos</span>
              </div>
              <button
                type="button"
                onClick={() => handleToggle('bloqueioAutoDanificados')}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none cursor-pointer ${
                  config.bloqueioAutoDanificados ? 'bg-[#D4AF37]' : 'bg-[#27272A]'
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-black transition-transform ${
                    config.bloqueioAutoDanificados ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>

            {/* Exibir Itens Indisponíveis */}
            <div className="flex items-center justify-between p-3.5 bg-[#18181B] rounded-xl border border-[#27272A]">
              <div>
                <label className="text-white text-xs font-semibold block">Exibir Itens Reservados na Busca</label>
                <span className="text-[#71717A] text-[10px]">Mostra produtos reservados marcando badge de indisponível</span>
              </div>
              <button
                type="button"
                onClick={() => handleToggle('exibirIndisponiveisBusca')}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none cursor-pointer ${
                  config.exibirIndisponiveisBusca ? 'bg-[#D4AF37]' : 'bg-[#27272A]'
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-black transition-transform ${
                    config.exibirIndisponiveisBusca ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>
          </div>
        </div>

        {/* 3. Automações & Notificações */}
        <div className="bg-[#111113] border border-[#27272A] rounded-2xl p-6 shadow-xl space-y-5">
          <div className="flex items-center gap-2.5 border-b border-[#27272A] pb-3">
            <div className="p-2 rounded-lg bg-[#D4AF37]/10 text-[#D4AF37]">
              <Bell size={18} />
            </div>
            <div>
              <h3 className="font-serif italic text-white text-base">Automações & Alertas Sonoros</h3>
              <p className="text-[#A1A1AA] text-xs">Configure disparos de mensagens e feedbacks no aplicativo.</p>
            </div>
          </div>

          <div className="space-y-4">
            {/* Lembrete de Devolução */}
            <div className="flex items-center justify-between p-3.5 bg-[#18181B] rounded-xl border border-[#27272A]">
              <div>
                <label className="text-white text-xs font-semibold block">Lembrete Pré-Devolução (Antecedência)</label>
                <span className="text-[#71717A] text-[10px]">Horas de antecedência para disparo de aviso de devolução</span>
              </div>
              <div className="flex items-center gap-1.5 shrink-0">
                <input
                  type="number"
                  min={1}
                  max={72}
                  value={config.lembreteDevolucaoHoras}
                  onChange={(e) => handleNumberChange('lembreteDevolucaoHoras', parseInt(e.target.value) || 1)}
                  className="w-16 bg-[#0A0A0B] border border-[#27272A] text-white text-xs font-bold text-center py-1.5 rounded-lg focus:border-[#D4AF37] focus:outline-none"
                />
                <span className="text-[#A1A1AA] text-xs font-semibold">horas</span>
              </div>
            </div>

            {/* Notificar Reserva Pendente */}
            <div className="flex items-center justify-between p-3.5 bg-[#18181B] rounded-xl border border-[#27272A]">
              <div>
                <label className="text-white text-xs font-semibold block">Alertas de Solicitação de Orcamento Web</label>
                <span className="text-[#71717A] text-[10px]">Alerta visual quando um novo formulário for enviado pelo cliente</span>
              </div>
              <button
                type="button"
                onClick={() => handleToggle('notificarReservaPendente')}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none cursor-pointer ${
                  config.notificarReservaPendente ? 'bg-[#D4AF37]' : 'bg-[#27272A]'
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-black transition-transform ${
                    config.notificarReservaPendente ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>

            {/* Som Bip Checkin Checkout */}
            <div className="flex items-center justify-between p-3.5 bg-[#18181B] rounded-xl border border-[#27272A]">
              <div>
                <label className="text-white text-xs font-semibold block">Sons & Bips de Confirmação</label>
                <span className="text-[#71717A] text-[10px]">Sons de áudio em leituras e confirmações de conferência</span>
              </div>
              <button
                type="button"
                onClick={() => handleToggle('somBipCheckinCheckout')}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none cursor-pointer ${
                  config.somBipCheckinCheckout ? 'bg-[#D4AF37]' : 'bg-[#27272A]'
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-black transition-transform ${
                    config.somBipCheckinCheckout ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>
          </div>
        </div>

        {/* 4. Gestão de Cópia de Segurança & Manutenção */}
        <div className="bg-[#111113] border border-[#27272A] rounded-2xl p-6 shadow-xl space-y-5">
          <div className="flex items-center gap-2.5 border-b border-[#27272A] pb-3">
            <div className="p-2 rounded-lg bg-[#D4AF37]/10 text-[#D4AF37]">
              <HardDrive size={18} />
            </div>
            <div>
              <h3 className="font-serif italic text-white text-base">Cópia de Segurança & Restauração</h3>
              <p className="text-[#A1A1AA] text-xs">Gere backups locais ou resete os parâmetros para o padrão inicial.</p>
            </div>
          </div>

          <div className="space-y-4">
            <div className="p-4 bg-[#18181B] rounded-xl border border-[#27272A] space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-white text-xs font-semibold block">Backup Geral dos Parâmetros</span>
                  <span className="text-[#71717A] text-[10px]">Baixa um arquivo JSON contendo toda a estrutura de parâmetros da locadora.</span>
                </div>
                <button
                  type="button"
                  onClick={handleExportBackup}
                  className="px-3 py-1.5 bg-[#27272A] hover:bg-[#3F3F46] text-[#D4AF37] hover:text-white rounded-lg text-xs font-semibold transition-all cursor-pointer flex items-center gap-1.5 shrink-0"
                >
                  <Download size={14} /> Download JSON
                </button>
              </div>
            </div>

            <div className="p-4 bg-[#18181B] rounded-xl border border-[#27272A] space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-white text-xs font-semibold block">Restaurar Padrão de Fábrica</span>
                  <span className="text-[#71717A] text-[10px]">Reseta todos os valores numéricos e chaves de ativação deste painel.</span>
                </div>
                <button
                  type="button"
                  onClick={handleResetDefaults}
                  className="px-3 py-1.5 bg-red-500/10 hover:bg-red-500/20 text-red-400 hover:text-red-300 border border-red-500/30 rounded-lg text-xs font-semibold transition-all cursor-pointer flex items-center gap-1.5 shrink-0"
                >
                  <RotateCcw size={14} /> Restaurar
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* 5. Configurações de Integração do Módulo de Orçamento */}
        <div className="bg-[#111113] border border-[#27272A] rounded-2xl p-6 shadow-xl space-y-5">
          <div className="flex items-center gap-2.5 border-b border-[#27272A] pb-3">
            <div className="p-2 rounded-lg bg-[#D4AF37]/10 text-[#D4AF37]">
              <FileSpreadsheet size={18} />
            </div>
            <div>
              <h3 className="font-serif italic text-white text-base">Integrações do Módulo de Orçamento</h3>
              <p className="text-[#A1A1AA] text-xs">Ative ou desative o uso do Google Drive e Google Forms no sistema conforme sua preferência.</p>
            </div>
          </div>

          <div className="space-y-4">
            {/* Toggle Google Drive */}
            <div className="flex items-center justify-between p-3.5 bg-[#18181B] rounded-xl border border-[#27272A]">
              <div className="space-y-0.5">
                <label className="text-white text-xs font-semibold block">Uso do Google Drive</label>
                <span className="text-[#71717A] text-[10px] block max-w-xs leading-tight">
                  Habilita sincronização de pastas, explorador de arquivos e salvamento de contratos/propostas.
                </span>
              </div>
              <button
                type="button"
                onClick={() => setHabilitarGoogleDrive(!habilitarGoogleDrive)}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none cursor-pointer ${
                  habilitarGoogleDrive ? 'bg-[#D4AF37]' : 'bg-[#27272A]'
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-black transition-transform ${
                    habilitarGoogleDrive ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>

            {/* Toggle Google Forms */}
            <div className="flex items-center justify-between p-3.5 bg-[#18181B] rounded-xl border border-[#27272A]">
              <div className="space-y-0.5">
                <label className="text-white text-xs font-semibold block">Uso do Google Forms</label>
                <span className="text-[#71717A] text-[10px] block max-w-xs leading-tight">
                  Habilita a criação de formulários no Google Forms e links para orçamentos dos clientes.
                </span>
              </div>
              <button
                type="button"
                onClick={() => setHabilitarGoogleForms(!habilitarGoogleForms)}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none cursor-pointer ${
                  habilitarGoogleForms ? 'bg-[#D4AF37]' : 'bg-[#27272A]'
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-black transition-transform ${
                    habilitarGoogleForms ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Save Reminder */}
      <div className="p-5 bg-gradient-to-r from-[#18181B] via-[#111113] to-[#18181B] rounded-2xl border border-[#27272A] flex flex-col sm:flex-row items-center justify-between gap-4 shadow-2xl">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-[#D4AF37]/10 text-[#D4AF37]">
            <Info size={20} />
          </div>
          <div>
            <span className="text-white text-xs font-bold block">Sincronização com o Banco de Dados</span>
            <span className="text-[#71717A] text-[10px]">
              As alterações aplicadas neste painel refletem instantaneamente em todos os terminais MDM conectados ao tenant.
            </span>
          </div>
        </div>

        <button
          type="button"
          onClick={handleSave}
          className="w-full sm:w-auto px-6 py-2.5 bg-gradient-to-r from-[#D4AF37] to-[#B89628] hover:from-[#E5C158] hover:to-[#D4AF37] text-black font-bold rounded-xl text-xs shadow-lg shadow-[#D4AF37]/20 transition-all cursor-pointer shrink-0 flex items-center justify-center gap-2"
        >
          <Save size={15} />
          <span>Salvar Parâmetros</span>
        </button>
      </div>
    </div>
  );
};
