import { useState, useEffect } from 'react';

/**
 * useInstallPrompt
 * -----------------------------------------
 * Custom hook to listen to browser PWA install event.
 * Exposes isInstallable state and installApp trigger.
 * -----------------------------------------
 */
export const useInstallPrompt = () => {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [isInstallable, setIsInstallable] = useState(false);

  useEffect(() => {
    const handleBeforeInstallPrompt = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setIsInstallable(true);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    const handleAppInstalled = () => {
      setDeferredPrompt(null);
      setIsInstallable(false);
      console.log('PWA was installed successfully');
    };

    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  const installApp = async () => {
    if (!deferredPrompt) return false;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    setDeferredPrompt(null);
    setIsInstallable(false);
    return outcome === 'accepted';
  };

  return { isInstallable, installApp };
};
