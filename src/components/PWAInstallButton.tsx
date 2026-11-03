import React, { useState } from 'react';
import { Download, CheckCircle2, Smartphone, Monitor } from 'lucide-react';
import { usePWAInstall } from '../hooks/usePWAInstall';
import { PWAInstallModal } from './PWAInstallModal';

interface PWAInstallButtonProps {
  className?: string;
  variant?: 'navbar' | 'compact' | 'card';
}

export const PWAInstallButton: React.FC<PWAInstallButtonProps> = ({ 
  className = '',
  variant = 'navbar' 
}) => {
  const { isInstallable, isInstalled, isAndroid, isWindows, install } = usePWAInstall();
  const [isModalOpen, setIsModalOpen] = useState(false);

  const handleClick = async () => {
    // Se o evento nativo beforeinstallprompt estiver ativo, tentamos disparar direto
    if (isInstallable) {
      const installed = await install();
      if (!installed) {
        setIsModalOpen(true);
      }
    } else {
      // Abre o modal de instruções detalhadas para Android e Windows
      setIsModalOpen(true);
    }
  };

  return (
    <>
      {variant === 'navbar' && (
        <button
          onClick={handleClick}
          title={isInstalled ? "Aplicativo Instalado" : "Instalar Acervus Core no Android ou Windows"}
          className={`flex items-center gap-2 px-3 py-1.5 text-xs font-semibold rounded-lg transition border shadow-sm ${
            isInstalled
              ? 'bg-emerald-950/40 text-emerald-300 border-emerald-500/30 hover:bg-emerald-900/50'
              : 'bg-gradient-to-r from-amber-500/20 via-amber-500/10 to-transparent text-amber-300 border-amber-500/40 hover:bg-amber-500/30 hover:text-white'
          } ${className}`}
        >
          {isInstalled ? (
            <>
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
              <span className="hidden sm:inline">App Instalado</span>
            </>
          ) : (
            <>
              <Download className="w-3.5 h-3.5 text-amber-400 animate-bounce" />
              <span>Instalar App</span>
              <div className="flex items-center gap-1 opacity-70 border-l border-amber-500/30 pl-1.5 hidden md:flex">
                {isAndroid ? (
                  <Smartphone className="w-3 h-3 text-emerald-400" title="Android detectado" />
                ) : isWindows ? (
                  <Monitor className="w-3 h-3 text-sky-400" title="Windows detectado" />
                ) : (
                  <>
                    <Smartphone className="w-3 h-3" />
                    <Monitor className="w-3 h-3" />
                  </>
                )}
              </div>
            </>
          )}
        </button>
      )}

      {variant === 'card' && (
        <div className={`p-4 rounded-xl border bg-zinc-900/70 border-zinc-800 ${className}`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-400 flex items-center justify-center">
                <Download className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-sm font-semibold text-white">Instalar no Android & Windows</h4>
                <p className="text-xs text-zinc-400">Tenha o Acervus Core em tela cheia como app nativo</p>
              </div>
            </div>
            <button
              onClick={handleClick}
              className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-zinc-950 font-bold text-xs rounded-lg transition shadow-md shadow-amber-500/20"
            >
              {isInstalled ? 'Ver Detalhes' : 'Instalar'}
            </button>
          </div>
        </div>
      )}

      {variant === 'compact' && (
        <button
          onClick={handleClick}
          className={`p-2 rounded-lg border border-amber-500/40 text-amber-400 hover:bg-amber-500/20 transition ${className}`}
          title="Instalar App"
        >
          <Download className="w-4 h-4" />
        </button>
      )}

      {/* Modal Interativo com passos e suporte multi-plataforma */}
      <PWAInstallModal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
      />
    </>
  );
};
