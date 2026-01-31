import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { RefreshCw, X } from "lucide-react";

export const PWAUpdateNotifier = () => {
  const [showUpdate, setShowUpdate] = useState(false);
  const [registration, setRegistration] = useState<ServiceWorkerRegistration | null>(null);

  useEffect(() => {
    if ('serviceWorker' in navigator) {
      // Listen for new service worker updates
      const handleUpdate = async () => {
        const reg = await navigator.serviceWorker.getRegistration();
        if (reg) {
          setRegistration(reg);
          
          // Check for waiting worker
          if (reg.waiting) {
            setShowUpdate(true);
          }

          // Listen for new updates
          reg.addEventListener('updatefound', () => {
            const newWorker = reg.installing;
            if (newWorker) {
              newWorker.addEventListener('statechange', () => {
                if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                  setShowUpdate(true);
                }
              });
            }
          });
        }
      };

      handleUpdate();

      // Check for updates periodically (every 30 minutes)
      const intervalId = setInterval(() => {
        navigator.serviceWorker.getRegistration().then(reg => {
          if (reg) {
            reg.update();
          }
        });
      }, 30 * 60 * 1000);

      // Listen for controller changes (happens after skipWaiting)
      navigator.serviceWorker.addEventListener('controllerchange', () => {
        window.location.reload();
      });

      return () => clearInterval(intervalId);
    }
  }, []);

  const handleUpdate = () => {
    if (registration?.waiting) {
      registration.waiting.postMessage({ type: 'SKIP_WAITING' });
    }
  };

  if (!showUpdate) return null;

  return (
    <div className="fixed bottom-4 left-4 right-4 md:left-auto md:right-4 md:w-96 z-50 animate-fade-in">
      <div className="bg-card border border-border rounded-xl p-4 shadow-lg">
        <div className="flex items-start gap-3">
          <div className="p-2 bg-primary/10 rounded-lg">
            <RefreshCw className="w-5 h-5 text-primary" />
          </div>
          <div className="flex-1">
            <h3 className="font-semibold text-foreground text-sm">
              Nova versão disponível
            </h3>
            <p className="text-xs text-muted-foreground mt-1">
              Uma atualização está pronta para ser instalada.
            </p>
            <div className="flex gap-2 mt-3">
              <Button
                size="sm"
                onClick={handleUpdate}
                className="h-8 text-xs"
              >
                <RefreshCw className="w-3 h-3 mr-1" />
                Atualizar agora
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setShowUpdate(false)}
                className="h-8 text-xs"
              >
                Depois
              </Button>
            </div>
          </div>
          <button
            onClick={() => setShowUpdate(false)}
            className="text-muted-foreground hover:text-foreground"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
