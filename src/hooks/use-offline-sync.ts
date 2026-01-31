import { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface PendingInspection {
  id: string;
  valveCode: string;
  photoInitial: string | null;
  photoDuring: string | null;
  photoFinal: string | null;
  createdAt: number;
  status: 'pending' | 'syncing' | 'synced' | 'failed';
}

const PENDING_INSPECTIONS_KEY = 'pending_inspections';

export const useOfflineSync = () => {
  const { toast } = useToast();
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [isSyncing, setIsSyncing] = useState(false);
  const [pendingCount, setPendingCount] = useState(0);
  const syncingRef = useRef(false);
  const lastSyncAttempt = useRef<number>(0);

  const updatePendingCount = useCallback(() => {
    try {
      const pending = localStorage.getItem(PENDING_INSPECTIONS_KEY);
      const inspections: PendingInspection[] = pending ? JSON.parse(pending) : [];
      // Only count pending items, not synced or syncing
      const pendingItems = inspections.filter(i => i.status === 'pending' || i.status === 'failed');
      setPendingCount(pendingItems.length);
    } catch {
      setPendingCount(0);
    }
  }, []);

  const uploadPhoto = async (photoData: string, fileName: string): Promise<string | null> => {
    try {
      if (!photoData) return null;

      const base64Data = photoData.split(",")[1];
      if (!base64Data) return null;

      const byteCharacters = atob(base64Data);
      const byteArray = new Uint8Array(byteCharacters.length);
      for (let i = 0; i < byteCharacters.length; i++) {
        byteArray[i] = byteCharacters.charCodeAt(i);
      }
      const blob = new Blob([byteArray], { type: "image/jpeg" });

      const filePath = `${Date.now()}-${Math.random().toString(36).substring(7)}-${fileName}.jpg`;
      
      const { error } = await supabase.storage
        .from("valve-photos")
        .upload(filePath, blob, {
          cacheControl: '3600',
          upsert: false
        });

      if (error) throw error;

      const { data } = supabase.storage
        .from("valve-photos")
        .getPublicUrl(filePath);

      return data.publicUrl;
    } catch (error) {
      console.error("Erro no upload:", error);
      return null;
    }
  };

  const syncPendingData = useCallback(async () => {
    // Prevent multiple concurrent syncs
    if (!navigator.onLine || syncingRef.current) {
      return;
    }

    // Debounce: prevent sync if last attempt was less than 2 seconds ago
    const now = Date.now();
    if (now - lastSyncAttempt.current < 2000) {
      return;
    }
    lastSyncAttempt.current = now;

    syncingRef.current = true;
    setIsSyncing(true);
    
    try {
      const pending = localStorage.getItem(PENDING_INSPECTIONS_KEY);
      let inspections: PendingInspection[] = pending ? JSON.parse(pending) : [];
      
      // Only sync pending or failed items
      const toSync = inspections.filter(i => i.status === 'pending' || i.status === 'failed');
      
      if (toSync.length === 0) {
        syncingRef.current = false;
        setIsSyncing(false);
        return;
      }

      // Mark items as syncing to prevent duplicate syncs
      inspections = inspections.map(i => 
        (i.status === 'pending' || i.status === 'failed') 
          ? { ...i, status: 'syncing' as const }
          : i
      );
      localStorage.setItem(PENDING_INSPECTIONS_KEY, JSON.stringify(inspections));

      const successful: string[] = [];
      const failed: string[] = [];
      
      for (const inspection of toSync) {
        try {
          // Upload photos
          let photoInitialUrl: string | null = null;
          let photoDuringUrl: string | null = null;
          let photoFinalUrl: string | null = null;

          if (inspection.photoInitial?.startsWith('data:')) {
            photoInitialUrl = await uploadPhoto(inspection.photoInitial, 'initial');
          }
          if (inspection.photoDuring?.startsWith('data:')) {
            photoDuringUrl = await uploadPhoto(inspection.photoDuring, 'during');
          }
          if (inspection.photoFinal?.startsWith('data:')) {
            photoFinalUrl = await uploadPhoto(inspection.photoFinal, 'final');
          }

          const hasAllPhotos = photoInitialUrl && photoDuringUrl && photoFinalUrl;
          
          const { error } = await supabase.from("inspection_records").insert({
            valve_code: inspection.valveCode,
            photo_initial_url: photoInitialUrl,
            photo_during_url: photoDuringUrl,
            photo_final_url: photoFinalUrl,
            status: hasAllPhotos ? 'concluido' : 'em_andamento',
          });

          if (!error) {
            successful.push(inspection.id);
          } else {
            failed.push(inspection.id);
          }
        } catch (err) {
          console.error("Erro ao sincronizar inspeção:", err);
          failed.push(inspection.id);
        }
      }

      // Update local storage: remove successful, mark failed
      const currentData = localStorage.getItem(PENDING_INSPECTIONS_KEY);
      let currentInspections: PendingInspection[] = currentData ? JSON.parse(currentData) : [];
      
      currentInspections = currentInspections
        .filter(i => !successful.includes(i.id))
        .map(i => failed.includes(i.id) ? { ...i, status: 'failed' as const } : i);
      
      localStorage.setItem(PENDING_INSPECTIONS_KEY, JSON.stringify(currentInspections));
      updatePendingCount();
      
      if (successful.length > 0) {
        toast({
          title: "Sincronização concluída",
          description: `${successful.length} inspeção(ões) enviada(s) com sucesso.`,
        });
      }
      
      if (failed.length > 0) {
        toast({
          title: "Algumas inspeções falharam",
          description: `${failed.length} inspeção(ões) serão reenviadas automaticamente.`,
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Erro na sincronização:", error);
    } finally {
      syncingRef.current = false;
      setIsSyncing(false);
    }
  }, [toast, updatePendingCount]);

  // Update online status
  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      toast({
        title: "Conexão restaurada",
        description: "Verificando dados pendentes...",
      });
      // Small delay to ensure network is stable
      setTimeout(() => {
        syncPendingData();
      }, 1000);
    };

    const handleOffline = () => {
      setIsOnline(false);
      toast({
        title: "Sem conexão",
        description: "Os dados serão salvos localmente.",
        variant: "destructive",
      });
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Load pending count on mount
    updatePendingCount();

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [syncPendingData, toast, updatePendingCount]);

  const savePendingInspection = useCallback((inspection: Omit<PendingInspection, 'id' | 'createdAt' | 'status'>) => {
    try {
      const pending = localStorage.getItem(PENDING_INSPECTIONS_KEY);
      const inspections: PendingInspection[] = pending ? JSON.parse(pending) : [];
      
      const newInspection: PendingInspection = {
        ...inspection,
        id: `pending-${Date.now()}-${Math.random().toString(36).substring(7)}`,
        createdAt: Date.now(),
        status: 'pending',
      };
      
      inspections.push(newInspection);
      localStorage.setItem(PENDING_INSPECTIONS_KEY, JSON.stringify(inspections));
      updatePendingCount();
      
      toast({
        title: "Salvo localmente",
        description: "A inspeção será enviada quando a conexão for restaurada.",
      });
      
      return true;
    } catch (error) {
      console.error("Erro ao salvar localmente:", error);
      toast({
        title: "Erro",
        description: "Não foi possível salvar localmente. Verifique o espaço disponível.",
        variant: "destructive",
      });
      return false;
    }
  }, [toast, updatePendingCount]);

  // Auto-sync on mount if online and has pending data
  useEffect(() => {
    if (isOnline && pendingCount > 0 && !syncingRef.current) {
      // Delay initial sync to prevent race conditions
      const timeout = setTimeout(() => {
        syncPendingData();
      }, 2000);
      return () => clearTimeout(timeout);
    }
  }, [isOnline, pendingCount, syncPendingData]);

  return {
    isOnline,
    isSyncing,
    pendingCount,
    savePendingInspection,
    syncPendingData,
  };
};
