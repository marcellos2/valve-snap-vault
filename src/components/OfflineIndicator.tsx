import { WifiOff, Cloud, Loader2 } from "lucide-react";
import { useOfflineSync } from "@/hooks/use-offline-sync";
import { Button } from "@/components/ui/button";

export const OfflineIndicator = () => {
  const { isOnline, isSyncing, pendingCount, syncPendingData } = useOfflineSync();

  if (isOnline && pendingCount === 0 && !isSyncing) {
    return null;
  }

  return (
    <div className="fixed bottom-4 right-4 z-50 animate-fade-in">
      {!isOnline ? (
        <div className="bg-destructive text-destructive-foreground px-4 py-2 rounded-xl shadow-lg flex items-center gap-2">
          <WifiOff className="w-4 h-4" />
          <span className="text-sm font-medium">Offline</span>
          {pendingCount > 0 && (
            <span className="bg-white/20 px-2 py-0.5 rounded-full text-xs">
              {pendingCount} pendente{pendingCount > 1 ? 's' : ''}
            </span>
          )}
        </div>
      ) : pendingCount > 0 && (
        <div className="bg-primary text-primary-foreground px-4 py-2 rounded-xl shadow-lg flex items-center gap-2">
          {isSyncing ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              <span className="text-sm font-medium">Sincronizando...</span>
            </>
          ) : (
            <>
              <Cloud className="w-4 h-4" />
              <span className="text-sm font-medium">
                {pendingCount} pendente{pendingCount > 1 ? 's' : ''}
              </span>
              <Button
                size="sm"
                variant="secondary"
                onClick={syncPendingData}
                className="h-6 text-xs ml-1"
              >
                Sincronizar
              </Button>
            </>
          )}
        </div>
      )}
    </div>
  );
};
