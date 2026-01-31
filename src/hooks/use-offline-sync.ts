import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface PendingPhoto {
  id: string;
  photoData: string;
  fileName: string;
  type: 'initial' | 'during' | 'final';
  timestamp: number;
}

interface PendingInspection {
  id: string;
  valveCode: string;
  photoInitial: string | null;
  photoDuring: string | null;
  photoFinal: string | null;
  createdAt: number;
  status: 'pending' | 'syncing' | 'failed';
}

const PENDING_INSPECTIONS_KEY = 'pending_inspections';
const PENDING_PHOTOS_KEY = 'pending_photos';

export const useOfflineSync = () => {
  const { toast } = useToast();
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [isSyncing, setIsSyncing] = useState(false);
  const [pendingCount, setPendingCount] = useState(0);

  // Update online status
  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      toast({
        title: "Conexão restaurada",
        description: "Sincronizando dados pendentes...",
      });
      syncPendingData();
    };

    const handleOffline = () => {
      setIsOnline(false);
      toast({
        title: "Sem conexão",
        description: "Os dados serão salvos localmente e sincronizados quando a conexão for restaurada.",
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
  }, []);

  const updatePendingCount = () => {
    try {
      const pending = localStorage.getItem(PENDING_INSPECTIONS_KEY);
      const inspections: PendingInspection[] = pending ? JSON.parse(pending) : [];
      setPendingCount(inspections.length);
    } catch {
      setPendingCount(0);
    }
  };

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
  }, [toast]);

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
    if (!navigator.onLine || isSyncing) return;

    setIsSyncing(true);
    
    try {
      const pending = localStorage.getItem(PENDING_INSPECTIONS_KEY);
      const inspections: PendingInspection[] = pending ? JSON.parse(pending) : [];
      
      if (inspections.length === 0) {
        setIsSyncing(false);
        return;
      }

      const successful: string[] = [];
      
      for (const inspection of inspections) {
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
          }
        } catch (err) {
          console.error("Erro ao sincronizar inspeção:", err);
        }
      }

      // Remove successfully synced inspections
      if (successful.length > 0) {
        const remaining = inspections.filter(i => !successful.includes(i.id));
        localStorage.setItem(PENDING_INSPECTIONS_KEY, JSON.stringify(remaining));
        updatePendingCount();
        
        toast({
          title: "Sincronização concluída",
          description: `${successful.length} inspeção(ões) enviada(s) com sucesso.`,
        });
      }
    } catch (error) {
      console.error("Erro na sincronização:", error);
    } finally {
      setIsSyncing(false);
    }
  }, [isSyncing, toast]);

  // Auto-sync when coming online
  useEffect(() => {
    if (isOnline && pendingCount > 0) {
      syncPendingData();
    }
  }, [isOnline]);

  return {
    isOnline,
    isSyncing,
    pendingCount,
    savePendingInspection,
    syncPendingData,
  };
};
