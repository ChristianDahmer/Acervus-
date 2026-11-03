import React, { useState } from 'react';
import { 
  Download, 
  Smartphone, 
  Monitor, 
  CheckCircle2, 
  X, 
  ExternalLink, 
  Share2, 
  PlusSquare, 
  Sparkles,
  ShieldCheck,
  Zap,
  WifiOff
} from 'lucide-react';
import { usePWAInstall } from '../hooks/usePWAInstall';

interface PWAInstallModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const PWAInstallModal: React.FC<PWAInstallModalProps> = ({ isOpen, onClose }) => {
  const { isInstallable, isInstalled, isAndroid, isWindows, isIOS, browserName, install } = usePWAInstall();
  
  // Seleciona a aba padrão baseada no sistema operacional do usuário
  const defaultTab = isWindows ? 'windows' : isAndroid ? 'android' : isIOS ? 'ios' : 'windows';
  const [activeTab, setActiveTab] = useState<'windows' | 'android' | 'ios'>(defaultTab);
  const [installStatus, setInstallStatus] = useState<'idle' | 'installing' | 'success' | 'dismissed'>('idle');

  if (!isOpen) return null;

  const handleInstallClick = async () => {
    setInstallStatus('installing');
    const success = await install();
    if (success) {
      setInstallStatus('success');
      setTimeout(() => {
        onClose();
      }, 2000);
    } else {
      setInstallStatus('dismissed');
      setTimeout(() => setInstallStatus('idle'), 3000);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
      <div 
        className="relative w-full max-w-2xl bg-[#121215] border border-amber-500/30 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Cabeçalho */}
        <div className="p-6 border-b border-zinc-800 bg-gradient-to-r from-zinc-900 via-[#18181b] to-zinc-900 flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-amber-500/20 to-amber-600/10 border border-amber-500/40 flex items-center justify-center p-1.5 shadow-inner">
              <img src="/logo.png" alt="Acervus Core Logo" className="w-full h-full object-contain" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-bold text-white tracking-wide">Instalar Acervus Core</h2>
                <span className="px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/30">
                  PWA Nativo
                </span>
              </div>
              <p className="text-xs text-zinc-400 mt-0.5">
                Disponível para celulares Android e computadores Windows
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 transition"
            title="Fechar"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Banner de Instalação Rápida */}
        {isInstalled ? (
          <div className="mx-6 mt-4 p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-xl flex items-center gap-3">
            <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
            <div className="text-xs text-emerald-300">
              <strong>Aplicativo já instalado!</strong> O Acervus Core já está configurado no seu dispositivo em modo nativo autônomo.
            </div>
          </div>
        ) : isInstallable ? (
          <div className="mx-6 mt-4 p-4 bg-gradient-to-r from-amber-500/10 via-amber-500/5 to-transparent border border-amber-500/40 rounded-xl flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="flex items-center gap-3 text-left">
              <div className="w-9 h-9 rounded-lg bg-amber-500/20 text-amber-400 flex items-center justify-center shrink-0">
                <Sparkles className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-sm font-semibold text-white">Instalação Direta Pronta</h4>
                <p className="text-xs text-zinc-400">
                  Seu navegador ({browserName.toUpperCase()}) suporta instalação instantânea com 1 clique.
                </p>
              </div>
            </div>
            <button
              onClick={handleInstallClick}
              disabled={installStatus === 'installing'}
              className="w-full sm:w-auto px-5 py-2.5 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-zinc-950 font-bold text-sm rounded-xl shadow-lg shadow-amber-500/20 flex items-center justify-center gap-2 transition transform active:scale-95 disabled:opacity-50 shrink-0"
            >
              <Download className="w-4 h-4" />
              {installStatus === 'installing' ? 'Instalando...' : 'Instalar Agora'}
            </button>
          </div>
        ) : null}

        {/* Seletor de Plataforma (Abas) */}
        <div className="px-6 pt-4 flex border-b border-zinc-800 gap-2">
          <button
            onClick={() => setActiveTab('android')}
            className={`flex items-center gap-2 px-4 py-2.5 text-xs font-semibold rounded-t-lg transition border-b-2 ${
              activeTab === 'android'
                ? 'border-amber-400 text-amber-300 bg-zinc-800/60'
                : 'border-transparent text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/30'
            }`}
          >
            <Smartphone className="w-4 h-4 text-emerald-400" />
            Android (Smartphone / Tablet)
            {isAndroid && (
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" title="Seu dispositivo atual" />
            )}
          </button>

          <button
            onClick={() => setActiveTab('windows')}
            className={`flex items-center gap-2 px-4 py-2.5 text-xs font-semibold rounded-t-lg transition border-b-2 ${
              activeTab === 'windows'
                ? 'border-amber-400 text-amber-300 bg-zinc-800/60'
                : 'border-transparent text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/30'
            }`}
          >
            <Monitor className="w-4 h-4 text-sky-400" />
            Computador Windows (PC)
            {isWindows && (
              <span className="w-2 h-2 rounded-full bg-sky-400 animate-pulse" title="Seu dispositivo atual" />
            )}
          </button>

          <button
            onClick={() => setActiveTab('ios')}
            className={`flex items-center gap-2 px-4 py-2.5 text-xs font-semibold rounded-t-lg transition border-b-2 ${
              activeTab === 'ios'
                ? 'border-amber-400 text-amber-300 bg-zinc-800/60'
                : 'border-transparent text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/30'
            }`}
          >
            <Share2 className="w-4 h-4 text-zinc-300" />
            iPhone / iPad (iOS)
          </button>
        </div>

        {/* Conteúdo das Instruções */}
        <div className="p-6 overflow-y-auto space-y-4 text-zinc-300">
          {activeTab === 'android' && (
            <div className="space-y-4">
              <div className="flex items-start gap-3 bg-zinc-900/80 p-4 rounded-xl border border-zinc-800">
                <div className="w-8 h-8 rounded-full bg-emerald-500/10 text-emerald-400 flex items-center justify-center font-bold text-sm shrink-0">
                  1
                </div>
                <div>
                  <h4 className="text-sm font-semibold text-white">No Google Chrome ou Samsung Internet</h4>
                  <p className="text-xs text-zinc-400 mt-1">
                    Toque no menu de três pontinhos <strong className="text-zinc-200">(⋮)</strong> no canto superior direito do navegador.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3 bg-zinc-900/80 p-4 rounded-xl border border-zinc-800">
                <div className="w-8 h-8 rounded-full bg-emerald-500/10 text-emerald-400 flex items-center justify-center font-bold text-sm shrink-0">
                  2
                </div>
                <div>
                  <h4 className="text-sm font-semibold text-white">Selecione "Instalar aplicativo"</h4>
                  <p className="text-xs text-zinc-400 mt-1">
                    Procure a opção <strong className="text-zinc-200">"Instalar aplicativo"</strong> ou <strong className="text-zinc-200">"Adicionar à tela inicial"</strong>.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3 bg-zinc-900/80 p-4 rounded-xl border border-zinc-800">
                <div className="w-8 h-8 rounded-full bg-emerald-500/10 text-emerald-400 flex items-center justify-center font-bold text-sm shrink-0">
                  3
                </div>
                <div>
                  <h4 className="text-sm font-semibold text-white">Confirme a Instalação</h4>
                  <p className="text-xs text-zinc-400 mt-1">
                    Toque em <strong className="text-emerald-400">"Instalar"</strong>. O ícone do Acervus Core aparecerá na grade de aplicativos do seu celular com inicialização rápida e em tela cheia!
                  </p>
                </div>
              </div>

              {isInstallable && (
                <div className="pt-2 text-center">
                  <button
                    onClick={handleInstallClick}
                    className="inline-flex items-center gap-2 px-6 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-sm rounded-xl shadow-lg transition"
                  >
                    <Download className="w-4 h-4" />
                    Instalar no Android com 1 Clique
                  </button>
                </div>
              )}
            </div>
          )}

          {activeTab === 'windows' && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Opção Chrome Windows */}
                <div className="bg-zinc-900/90 p-4 rounded-xl border border-zinc-800 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <div className="w-6 h-6 rounded bg-sky-500/20 text-sky-400 flex items-center justify-center font-bold text-xs">
                        G
                      </div>
                      <h4 className="text-sm font-semibold text-white">Google Chrome no Windows</h4>
                    </div>
                    <ul className="text-xs text-zinc-400 space-y-2 list-disc list-inside">
                      <li>Clique no ícone de <strong className="text-zinc-200">Instalação (computadorzinho com seta para baixo)</strong> no lado direito da barra de endereço URL.</li>
                      <li>Ou clique no menu <strong className="text-zinc-200">⋮ (três pontos) &gt; "Salvar e compartilhar" &gt; "Instalar Acervus Core"</strong>.</li>
                      <li>Confirme em <strong className="text-sky-400">"Instalar"</strong>.</li>
                    </ul>
                  </div>
                  <p className="text-[11px] text-zinc-500 mt-3 pt-2 border-t border-zinc-800">
                    O aplicativo será fixado na Barra de Tarefas e no Menu Iniciar do Windows.
                  </p>
                </div>

                {/* Opção Edge Windows */}
                <div className="bg-zinc-900/90 p-4 rounded-xl border border-zinc-800 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <div className="w-6 h-6 rounded bg-blue-500/20 text-blue-400 flex items-center justify-center font-bold text-xs">
                        E
                      </div>
                      <h4 className="text-sm font-semibold text-white">Microsoft Edge no Windows</h4>
                    </div>
                    <ul className="text-xs text-zinc-400 space-y-2 list-disc list-inside">
                      <li>Clique no ícone de <strong className="text-zinc-200">"Aplicativo disponível"</strong> na barra de endereço (lado direito).</li>
                      <li>Ou clique no menu <strong className="text-zinc-200">... &gt; "Aplicativos" &gt; "Instalar este site como aplicativo"</strong>.</li>
                      <li>Marque a opção de criar atalho na Área de Trabalho e fixar na Barra de Tarefas.</li>
                    </ul>
                  </div>
                  <p className="text-[11px] text-zinc-500 mt-3 pt-2 border-t border-zinc-800">
                    Janela dedicada sem abas, alta velocidade e foco total na gestão.
                  </p>
                </div>
              </div>

              {isInstallable && (
                <div className="pt-2 text-center">
                  <button
                    onClick={handleInstallClick}
                    className="inline-flex items-center gap-2 px-6 py-2.5 bg-sky-600 hover:bg-sky-500 text-white font-bold text-sm rounded-xl shadow-lg transition"
                  >
                    <Download className="w-4 h-4" />
                    Instalar no Windows com 1 Clique
                  </button>
                </div>
              )}
            </div>
          )}

          {activeTab === 'ios' && (
            <div className="space-y-4">
              <div className="flex items-start gap-3 bg-zinc-900/80 p-4 rounded-xl border border-zinc-800">
                <div className="w-8 h-8 rounded-full bg-zinc-700/50 text-white flex items-center justify-center font-bold text-sm shrink-0">
                  1
                </div>
                <div>
                  <h4 className="text-sm font-semibold text-white">Abra no Safari</h4>
                  <p className="text-xs text-zinc-400 mt-1">
                    No iPhone ou iPad, acesse o Acervus Core pelo navegador <strong className="text-zinc-200">Safari</strong>.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3 bg-zinc-900/80 p-4 rounded-xl border border-zinc-800">
                <div className="w-8 h-8 rounded-full bg-zinc-700/50 text-white flex items-center justify-center font-bold text-sm shrink-0">
                  2
                </div>
                <div>
                  <h4 className="text-sm font-semibold text-white">Toque em Compartilhar</h4>
                  <p className="text-xs text-zinc-400 mt-1">
                    Toque no botão <strong className="text-zinc-200">Compartilhar</strong> (quadrado com seta apontando para cima) na barra inferior do Safari.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3 bg-zinc-900/80 p-4 rounded-xl border border-zinc-800">
                <div className="w-8 h-8 rounded-full bg-zinc-700/50 text-white flex items-center justify-center font-bold text-sm shrink-0">
                  3
                </div>
                <div>
                  <h4 className="text-sm font-semibold text-white">Adicionar à Tela de Início</h4>
                  <p className="text-xs text-zinc-400 mt-1">
                    Role as opções e toque em <strong className="text-zinc-200">"Adicionar à Tela de Início"</strong>. Confirme tocando em <strong className="text-amber-400">"Adicionar"</strong>.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Vantagens do App Instalado */}
          <div className="mt-4 pt-4 border-t border-zinc-800 grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="bg-zinc-900/50 p-2.5 rounded-lg border border-zinc-800/80 flex items-center gap-2">
              <Zap className="w-4 h-4 text-amber-400 shrink-0" />
              <div className="text-[11px] text-zinc-400">
                <span className="font-semibold text-zinc-200 block">Velocidade Máxima</span>
                Carregamento instantâneo
              </div>
            </div>

            <div className="bg-zinc-900/50 p-2.5 rounded-lg border border-zinc-800/80 flex items-center gap-2">
              <WifiOff className="w-4 h-4 text-emerald-400 shrink-0" />
              <div className="text-[11px] text-zinc-400">
                <span className="font-semibold text-zinc-200 block">Cache Inteligente</span>
                Telas e acervo offline
              </div>
            </div>

            <div className="bg-zinc-900/50 p-2.5 rounded-lg border border-zinc-800/80 flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-sky-400 shrink-0" />
              <div className="text-[11px] text-zinc-400">
                <span className="font-semibold text-zinc-200 block">Janela Nativa</span>
                Sem barra de endereço
              </div>
            </div>
          </div>
        </div>

        {/* Rodapé */}
        <div className="p-4 border-t border-zinc-800 bg-zinc-900/70 flex items-center justify-between">
          <div className="text-[11px] text-zinc-500">
            PWA Standalone &bull; Compatível com Android 8+ e Windows 10/11
          </div>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-white text-xs font-semibold rounded-lg transition"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
};
