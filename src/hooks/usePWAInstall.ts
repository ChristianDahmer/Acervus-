import { useEffect, useState } from 'react';

export interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
}

export function usePWAInstall() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isAndroid, setIsAndroid] = useState(false);
  const [isWindows, setIsWindows] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [browserName, setBrowserName] = useState<'chrome' | 'edge' | 'safari' | 'firefox' | 'samsung' | 'other'>('other');

  useEffect(() => {
    // Detecta se já está rodando em modo standalone / instalado
    const isStandalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as unknown as { standalone?: boolean }).standalone === true;
    setIsInstalled(isStandalone);

    const ua = window.navigator.userAgent.toLowerCase();
    setIsAndroid(/android/.test(ua));
    setIsWindows(/windows|win32|win64/.test(ua));
    setIsIOS(/iphone|ipad|ipod/.test(ua));

    if (ua.includes('edg/')) {
      setBrowserName('edge');
    } else if (ua.includes('samsungbrowser')) {
      setBrowserName('samsung');
    } else if (ua.includes('chrome') && !ua.includes('chromium')) {
      setBrowserName('chrome');
    } else if (ua.includes('safari') && !ua.includes('chrome')) {
      setBrowserName('safari');
    } else if (ua.includes('firefox')) {
      setBrowserName('firefox');
    }

    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };

    const handleAppInstalled = () => {
      setIsInstalled(true);
      setDeferredPrompt(null);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  const install = async (): Promise<boolean> => {
    if (!deferredPrompt) return false;
    try {
      await deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') {
        setIsInstalled(true);
        setDeferredPrompt(null);
        return true;
      }
      return false;
    } catch (err) {
      console.warn('Erro ao disparar prompt de instalação:', err);
      return false;
    }
  };

  return {
    isInstallable: !!deferredPrompt,
    isInstalled,
    isAndroid,
    isWindows,
    isIOS,
    browserName,
    install,
    deferredPrompt,
  };
}
