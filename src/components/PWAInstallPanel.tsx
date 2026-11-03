import React, { useState } from 'react';
import { 
  Download, 
  Smartphone, 
  Monitor, 
  CheckCircle2, 
  Sparkles, 
  ShieldCheck, 
  Zap, 
  Wifi, 
  Layers, 
  ExternalLink,
  Laptop,
  Check,
  QrCode
} from 'lucide-react';
import { usePWAInstall } from '../hooks/usePWAInstall';
import { PWAInstallModal } from './PWAInstallModal';

export const PWAInstallPanel: React.FC = () => {
  const { isInstallable, isInstalled, isAndroid, isWindows, isIOS, browserName, install } = usePWAInstall();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [installing, setInstalling] = useState(false);
  const [installSuccess, setInstallSuccess] = useState(false);

  const handleInstallClick = async () => {
    if (isInstallable) {
      setInstalling(true);
      const success = await install();
      setInstalling(false);
      if (success) {
        setInstallSuccess(true);
      }
    } else {
      setIsModalOpen(true);
    }
  };

  const currentPlatformLabel = isAndroid 
    ? 'Android Smartphone / Tablet' 
    : isWindows 
      ? 'Computador Windows (PC)' 
      : isIOS 
        ? 'Apple iOS (iPhone / iPad)' 
        : 'Computador / Navegador Desktop';

  return (
    <div className="space-y-6">
      {/* Status Bar */}
      <div className="p-5 rounded-2xl bg-gradient-to-r from-zinc-900 via-[#18181b] to-zinc-900 border border-amber-500/30 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 shadow-xl">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-amber-500/10 border border-amber-500/40 p-2 flex items-center justify-center shrink-0 shadow-inner">
            <img src="/logo.png" alt="Acervus Core Logo" className="w-full h-full object-contain" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-lg font-bold text-white">Acervus Core PWA Nativo</h3>
              {isInstalled ? (
                <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 flex items-center gap-1">
                  <CheckCircle2 size={12} /> Instalado no Dispositivo
                </span>
              ) : (
                <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40 flex items-center gap-1">
                  <Sparkles size={12} /> Pronto para Instalação
                </span>
              )}
            </div>
            <p className="text-xs text-zinc-400 mt-1">
              Dispositivo detectado: <strong className="text-zinc-200">{currentPlatformLabel}</strong> via <strong className="text-zinc-200">{browserName.toUpperCase()}</strong>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 w-full md:w-auto">
          {isInstalled ? (
            <button
              onClick={() => setIsModalOpen(true)}
              className="w-full md:w-auto px-4 py-2.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-white rounded-xl text-xs font-semibold transition border border-zinc-700 flex items-center justify-center gap-2"
            >
              <Smartphone size={15} />
              <span>Ver Instruções</span>
            </button>
          ) : (
            <button
              onClick={handleInstallClick}
              disabled={installing}
              className="w-full md:w-auto px-6 py-2.5 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-zinc-950 font-bold text-xs rounded-xl shadow-lg shadow-amber-500/20 flex items-center justify-center gap-2 transition transform active:scale-95 disabled:opacity-50"
            >
              <Download size={16} />
              <span>{installing ? 'Instalando...' : isInstallable ? 'Instalar Agora (1 Clique)' : 'Instalar no Meu Aparelho'}</span>
            </button>
          )}
        </div>
      </div>

      {/* Grid: Android vs Windows */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Card Android */}
        <div className="p-6 rounded-2xl bg-zinc-900/80 border border-zinc-800 hover:border-emerald-500/40 transition-all flex flex-col justify-between space-y-5">
          <div className="space-y-4">
            <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 flex items-center justify-center">
                  <Smartphone size={20} />
                </div>
                <div>
                  <h4 className="text-base font-bold text-white">Instalação no Celular Android</h4>
                  <p className="text-[11px] text-zinc-400">Smartphones e Tablets (Samsung, Motorola, Xiaomi, etc.)</p>
                </div>
              </div>
              <span className="text-[10px] uppercase font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                Mobile
              </span>
            </div>

            <p className="text-xs text-zinc-300 leading-relaxed">
              Transforme o Acervus Core em um aplicativo móvel direto na grade do seu celular, com leitor de QR Code de alta performance e operação rápida no galpão.
            </p>

            <div className="space-y-2 text-xs">
              <div className="flex items-start gap-2 text-zinc-300">
                <Check size={14} className="text-emerald-400 shrink-0 mt-0.5" />
                <span><strong>Ícone dedicado</strong> na tela inicial sem barra de navegação</span>
              </div>
              <div className="flex items-start gap-2 text-zinc-300">
                <Check size={14} className="text-emerald-400 shrink-0 mt-0.5" />
                <span><strong>Acesso direto à câmera</strong> para bipar devoluções e expedição</span>
              </div>
              <div className="flex items-start gap-2 text-zinc-300">
                <Check size={14} className="text-emerald-400 shrink-0 mt-0.5" />
                <span><strong>Cache offline</strong> garantindo consulta do acervo mesmo sem internet</span>
              </div>
            </div>

            <div className="p-3 bg-zinc-950/60 rounded-xl border border-zinc-800/80 text-[11px] text-zinc-400 space-y-1">
              <span className="font-semibold text-zinc-300 block">Como instalar no Android:</span>
              <p>1. Abra pelo <strong>Google Chrome</strong> ou <strong>Samsung Internet</strong></p>
              <p>2. Toque nos <strong>três pontinhos (⋮)</strong> no topo</p>
              <p>3. Toque em <strong>"Instalar aplicativo"</strong> ou <strong>"Adicionar à tela inicial"</strong></p>
            </div>
          </div>

          <button
            onClick={() => setIsModalOpen(true)}
            className="w-full py-2.5 bg-zinc-800 hover:bg-emerald-600 hover:text-white text-zinc-300 text-xs font-bold rounded-xl transition border border-zinc-700 hover:border-emerald-500 flex items-center justify-center gap-2"
          >
            <Smartphone size={14} />
            <span>Ver Passo a Passo Android</span>
          </button>
        </div>

        {/* Card Windows */}
        <div className="p-6 rounded-2xl bg-zinc-900/80 border border-zinc-800 hover:border-sky-500/40 transition-all flex flex-col justify-between space-y-5">
          <div className="space-y-4">
            <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-xl bg-sky-500/10 border border-sky-500/30 text-sky-400 flex items-center justify-center">
                  <Monitor size={20} />
                </div>
                <div>
                  <h4 className="text-base font-bold text-white">Instalação no Computador Windows</h4>
                  <p className="text-[11px] text-zinc-400">Desktop e Notebooks Windows 10 e Windows 11</p>
                </div>
              </div>
              <span className="text-[10px] uppercase font-bold text-sky-400 bg-sky-500/10 px-2 py-0.5 rounded-full border border-sky-500/20">
                Desktop
              </span>
            </div>

            <p className="text-xs text-zinc-300 leading-relaxed">
              Tenha o Acervus Core em janela exclusiva no seu computador com atalho na Barra de Tarefas e no Menu Iniciar, sem distrações de abas de navegador.
            </p>

            <div className="space-y-2 text-xs">
              <div className="flex items-start gap-2 text-zinc-300">
                <Check size={14} className="text-sky-400 shrink-0 mt-0.5" />
                <span><strong>Janela dedicada</strong> sem barra de URL, simulando app desktop</span>
              </div>
              <div className="flex items-start gap-2 text-zinc-300">
                <Check size={14} className="text-sky-400 shrink-0 mt-0.5" />
                <span><strong>Fixado na Barra de Tarefas</strong> do Windows e Menu Iniciar</span>
              </div>
              <div className="flex items-start gap-2 text-zinc-300">
                <Check size={14} className="text-sky-400 shrink-0 mt-0.5" />
                <span><strong>Impressão direta</strong> de contratos PDF, relatórios e recibos</span>
              </div>
            </div>

            <div className="p-3 bg-zinc-950/60 rounded-xl border border-zinc-800/80 text-[11px] text-zinc-400 space-y-1">
              <span className="font-semibold text-zinc-300 block">Como instalar no Windows:</span>
              <p>1. No <strong>Chrome</strong>: clique no ícone de computador/instalação ao lado da estrela na barra de endereço</p>
              <p>2. No <strong>Edge</strong>: clique em "Aplicativo disponível" ou menu ... &gt; Aplicativos &gt; Instalar</p>
              <p>3. Marque "Criar atalho na Área de Trabalho"</p>
            </div>
          </div>

          <button
            onClick={() => setIsModalOpen(true)}
            className="w-full py-2.5 bg-zinc-800 hover:bg-sky-600 hover:text-white text-zinc-300 text-xs font-bold rounded-xl transition border border-zinc-700 hover:border-sky-500 flex items-center justify-center gap-2"
          >
            <Monitor size={14} />
            <span>Ver Passo a Passo Windows</span>
          </button>
        </div>
      </div>

      {/* Destaques Técnicos do PWA */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <div className="p-4 bg-zinc-900/50 rounded-xl border border-zinc-800 flex items-center gap-3">
          <div className="p-2.5 rounded-lg bg-amber-500/10 text-amber-400">
            <Zap size={18} />
          </div>
          <div>
            <h5 className="text-xs font-bold text-white">Carregamento Veloz</h5>
            <p className="text-[10px] text-zinc-400">Assets e scripts pré-cacheados</p>
          </div>
        </div>

        <div className="p-4 bg-zinc-900/50 rounded-xl border border-zinc-800 flex items-center gap-3">
          <div className="p-2.5 rounded-lg bg-emerald-500/10 text-emerald-400">
            <Wifi size={18} />
          </div>
          <div>
            <h5 className="text-xs font-bold text-white">Suporte Offline</h5>
            <p className="text-[10px] text-zinc-400">Continuidade operacional</p>
          </div>
        </div>

        <div className="p-4 bg-zinc-900/50 rounded-xl border border-zinc-800 flex items-center gap-3">
          <div className="p-2.5 rounded-lg bg-sky-500/10 text-sky-400">
            <ShieldCheck size={18} />
          </div>
          <div>
            <h5 className="text-xs font-bold text-white">Segurança HTTPS</h5>
            <p className="text-[10px] text-zinc-400">Criptografia ponta a ponta</p>
          </div>
        </div>

        <div className="p-4 bg-zinc-900/50 rounded-xl border border-zinc-800 flex items-center gap-3">
          <div className="p-2.5 rounded-lg bg-purple-500/10 text-purple-400">
            <Layers size={18} />
          </div>
          <div>
            <h5 className="text-xs font-bold text-white">Atualização Automática</h5>
            <p className="text-[10px] text-zinc-400">Sempre na versão mais recente</p>
          </div>
        </div>
      </div>

      <PWAInstallModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
      />
    </div>
  );
};
