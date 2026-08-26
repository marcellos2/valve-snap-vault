import { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { uploadPhotoWithRetry } from "@/lib/upload-photo";

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
      getLocalInspectionRecords()
        .then((records) => {
          const localPending = records.filter((r) => r.sync_status === 'pending' || r.sync_status === 'failed');
          setPendingCount(pendingItems.length + localPending.length);
        })
        .catch(() => setPendingCount(pendingItems.length));
    } catch {
      setPendingCount(0);
    }
  }, []);


  const uploadPhoto = async (photoData: string, fileName: string): Promise<string | null> => {
    if (!photoData) return null;
    return uploadPhotoWithRetry(photoData, fileName);
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
      // 1) Sync emergency records stored locally while the database was unavailable
      const localRecords = await getLocalInspectionRecords();
      const localToSync = localRecords.filter((r) => r.sync_status === 'pending' || r.sync_status === 'failed');
      let localSynced = 0;

      for (const record of localToSync) {
        try {
          await markLocalInspectionStatus(record.id, 'syncing');
          const photoInitial = record.photo_initial_url?.startsWith('data:')
            ? await uploadPhoto(record.photo_initial_url, 'initial')
            : record.photo_initial_url;
          const photoDuring = record.photo_during_url?.startsWith('data:')
            ? await uploadPhoto(record.photo_during_url, 'during')
            : record.photo_during_url;
          const photoFinal = record.photo_final_url?.startsWith('data:')
            ? await uploadPhoto(record.photo_final_url, 'final')
            : record.photo_final_url;

          const { error } = await supabase.from("inspection_records").insert({
            valve_code: record.valve_code,
            inspection_date: record.inspection_date,
            photo_initial_url: photoInitial,
            photo_during_url: photoDuring,
            photo_final_url: photoFinal,
            notes: record.notes,
            status: photoInitial && photoDuring && photoFinal ? 'concluido' : 'em_andamento',
          });

          if (error) throw error;
          await deleteLocalInspectionRecord(record.id);
          localSynced++;
        } catch (err) {
          console.warn("Falha ao sincronizar registro local:", err);
          await markLocalInspectionStatus(record.id, 'failed');
        }
      }

      if (localSynced > 0) {
        toast({
          title: "Registros locais enviados",
          description: `${localSynced} inspeção(ões) salva(s) no dispositivo foram enviadas.`,
        });
      }

      const pending = localStorage.getItem(PENDING_INSPECTIONS_KEY);
      let inspections: PendingInspection[] = pending ? JSON.parse(pending) : [];
      
      // Only sync pending or failed items
      const toSync = inspections.filter(i => i.status === 'pending' || i.status === 'failed');
      
      if (toSync.length === 0) {
        updatePendingCount();
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

          if (inspection.photoInitial) {
            photoInitialUrl = inspection.photoInitial.startsWith('data:')
              ? await uploadPhoto(inspection.photoInitial, 'initial')
              : inspection.photoInitial;
          }
          if (inspection.photoDuring) {
            photoDuringUrl = inspection.photoDuring.startsWith('data:')
              ? await uploadPhoto(inspection.photoDuring, 'during')
              : inspection.photoDuring;
          }
          if (inspection.photoFinal) {
            photoFinalUrl = inspection.photoFinal.startsWith('data:')
              ? await uploadPhoto(inspection.photoFinal, 'final')
              : inspection.photoFinal;
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
