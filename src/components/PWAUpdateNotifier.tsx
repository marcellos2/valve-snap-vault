import { useEffect, useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { RefreshCw, X } from "lucide-react";

export const PWAUpdateNotifier = () => {
  const [showUpdate, setShowUpdate] = useState(false);
  const [registration, setRegistration] = useState<ServiceWorkerRegistration | null>(null);
  const [isUpdating, setIsUpdating] = useState(false);

  const checkForUpdates = useCallback(async () => {
    if (!('serviceWorker' in navigator)) return;
    
    try {
      const reg = await navigator.serviceWorker.getRegistration();
      if (reg) {
        await reg.update();
      }
    } catch (error) {
      console.log('Update check failed:', error);
    }
  }, []);

  useEffect(() => {
    if (!('serviceWorker' in navigator)) return;

    const setupServiceWorker = async () => {
      try {
        const reg = await navigator.serviceWorker.getRegistration();
        if (!reg) return;
        
        setRegistration(reg);
        
        // Check for waiting worker immediately
        if (reg.waiting) {
          setShowUpdate(true);
        }

        // Listen for new updates
        const handleUpdateFound = () => {
          const newWorker = reg.installing;
          if (!newWorker) return;
          
          newWorker.addEventListener('statechange', () => {
            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
              setShowUpdate(true);
            }
          });
        };

        reg.addEventListener('updatefound', handleUpdateFound);

        // Listen for controller changes (happens after skipWaiting)
        const handleControllerChange = () => {
          if (isUpdating) {
            window.location.reload();
          }
        };
        
        navigator.serviceWorker.addEventListener('controllerchange', handleControllerChange);

        // Check for updates on page visibility change (when user returns to app)
        const handleVisibilityChange = () => {
          if (document.visibilityState === 'visible') {
            checkForUpdates();
          }
        };
        document.addEventListener('visibilitychange', handleVisibilityChange);

        // Check for updates every 5 minutes when app is active
        const intervalId = setInterval(checkForUpdates, 5 * 60 * 1000);

        // Also check on focus
        const handleFocus = () => checkForUpdates();
        window.addEventListener('focus', handleFocus);

        return () => {
          reg.removeEventListener('updatefound', handleUpdateFound);
          navigator.serviceWorker.removeEventListener('controllerchange', handleControllerChange);
          document.removeEventListener('visibilitychange', handleVisibilityChange);
          window.removeEventListener('focus', handleFocus);
          clearInterval(intervalId);
        };
      } catch (error) {
        console.log('Service worker setup failed:', error);
      }
    };

    setupServiceWorker();
  }, [checkForUpdates, isUpdating]);

  const handleUpdate = async () => {
    setIsUpdating(true);
    
    if (registration?.waiting) {
      // Tell the waiting service worker to take control
      registration.waiting.postMessage({ type: 'SKIP_WAITING' });
    } else {
      // If no waiting worker, try to update and reload
      try {
        await registration?.update();
        window.location.reload();
      } catch {
        window.location.reload();
      }
    }
  };

  if (!showUpdate) return null;

  return (
    <div className="fixed bottom-4 left-4 right-4 md:left-auto md:right-4 md:w-96 z-50 animate-fade-in">
      <div className="bg-card border border-border rounded-xl p-4 shadow-lg">
        <div className="flex items-start gap-3">
          <div className="p-2 bg-primary/10 rounded-lg">
            <RefreshCw className={`w-5 h-5 text-primary ${isUpdating ? 'animate-spin' : ''}`} />
          </div>
          <div className="flex-1">
            <h3 className="font-semibold text-foreground text-sm">
              Nova versão disponível
            </h3>
            <p className="text-xs text-muted-foreground mt-1">
              Uma atualização está pronta. Clique para atualizar automaticamente.
            </p>
            <div className="flex gap-2 mt-3">
              <Button
                size="sm"
                onClick={handleUpdate}
                disabled={isUpdating}
                className="h-8 text-xs"
              >
                <RefreshCw className={`w-3 h-3 mr-1 ${isUpdating ? 'animate-spin' : ''}`} />
                {isUpdating ? 'Atualizando...' : 'Atualizar agora'}
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setShowUpdate(false)}
                disabled={isUpdating}
                className="h-8 text-xs"
              >
                Depois
              </Button>
            </div>
          </div>
          <button
            onClick={() => setShowUpdate(false)}
            disabled={isUpdating}
            className="text-muted-foreground hover:text-foreground disabled:opacity-50"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
