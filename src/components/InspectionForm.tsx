import { useState, useRef, useEffect } from "react";
import { PhotoUploader } from "./PhotoUploader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Save, Loader2, Copy, Check, AlertCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import Tesseract from "tesseract.js";

interface InspectionFormProps {
  onSaved: () => void;
  editingRecord?: {
    id: string;
    valve_code: string | null;
    photo_initial_url: string | null;
    photo_during_url: string | null;
    photo_final_url: string | null;
    status: 'em_andamento' | 'concluido';
  } | null;
  onCancelEdit?: () => void;
}

export const InspectionForm = ({ onSaved, editingRecord, onCancelEdit }: InspectionFormProps) => {
  const { toast } = useToast();
  const valveCodeRef = useRef<HTMLInputElement>(null);
  const [valveCode, setValveCode] = useState(editingRecord?.valve_code || "");
  const [photoInitial, setPhotoInitial] = useState<string | null>(editingRecord?.photo_initial_url || null);
  const [photoDuring, setPhotoDuring] = useState<string | null>(editingRecord?.photo_during_url || null);
  const [photoFinal, setPhotoFinal] = useState<string | null>(editingRecord?.photo_final_url || null);
  const [rotations, setRotations] = useState({ initial: 0, during: 0, final: 0 });
  const [isSaving, setIsSaving] = useState(false);
  const [isExtractingCode, setIsExtractingCode] = useState(false);
  const [copiedText, setCopiedText] = useState<string | null>(null);

  useEffect(() => {
    if (editingRecord) {
      setValveCode(editingRecord.valve_code || "");
      setPhotoInitial(editingRecord.photo_initial_url);
      setPhotoDuring(editingRecord.photo_during_url);
      setPhotoFinal(editingRecord.photo_final_url);
    }
  }, [editingRecord]);

  const rotatePhoto = (photo: string, currentRotation: number): Promise<string> => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      
      if (photo.startsWith('http')) {
        img.crossOrigin = "anonymous";
      }
      
      img.onload = () => {
        const canvas = document.createElement("canvas");
        const ctx = canvas.getContext("2d");
        if (!ctx) return resolve(photo);

        const newRotation = (currentRotation + 90) % 360;

        if (newRotation === 90 || newRotation === 270) {
          canvas.width = img.height;
          canvas.height = img.width;
        } else {
          canvas.width = img.width;
          canvas.height = img.height;
        }

        ctx.translate(canvas.width / 2, canvas.height / 2);
        ctx.rotate((newRotation * Math.PI) / 180);
        ctx.drawImage(img, -img.width / 2, -img.height / 2);

        resolve(canvas.toDataURL("image/jpeg", 0.95));
      };
      
      img.onerror = (error) => {
        console.error("Erro ao carregar imagem para rotação:", error);
        const img2 = new Image();
        img2.onload = () => {
          const canvas = document.createElement("canvas");
          const ctx = canvas.getContext("2d");
          if (!ctx) return resolve(photo);

          const newRotation = (currentRotation + 90) % 360;

          if (newRotation === 90 || newRotation === 270) {
            canvas.width = img2.height;
            canvas.height = img2.width;
          } else {
            canvas.width = img2.width;
            canvas.height = img2.height;
          }

          ctx.translate(canvas.width / 2, canvas.height / 2);
          ctx.rotate((newRotation * Math.PI) / 180);
          ctx.drawImage(img2, -img2.width / 2, -img2.height / 2);

          resolve(canvas.toDataURL("image/jpeg", 0.95));
        };
        img2.onerror = () => reject(error);
        img2.src = photo;
      };
      
      img.src = photo;
    });
  };

  const handleRotate = async (type: "initial" | "during" | "final") => {
    const photoMap = { initial: photoInitial, during: photoDuring, final: photoFinal };
    const photo = photoMap[type];
    if (!photo) return;

    try {
      const rotated = await rotatePhoto(photo, rotations[type]);
      setRotations((prev) => ({ ...prev, [type]: (prev[type] + 90) % 360 }));

      if (type === "initial") setPhotoInitial(rotated);
      else if (type === "during") setPhotoDuring(rotated);
      else setPhotoFinal(rotated);
      
    } catch (error) {
      console.error("Erro ao rotacionar foto:", error);
      toast({
        title: "Erro ao rotacionar",
        description: "Não foi possível rotacionar a foto. Tente novamente.",
        variant: "destructive",
      });
    }
  };

  const uploadPhoto = async (photoData: string, fileName: string): Promise<string | null> => {
    try {
      if (!photoData) {
        console.error("photoData is null or undefined");
        return null;
      }

      const base64Data = photoData.split(",")[1];
      if (!base64Data) {
        console.error("Invalid base64 data");
        return null;
      }

      const byteCharacters = atob(base64Data);
      const byteArray = new Uint8Array(byteCharacters.length);
      for (let i = 0; i < byteCharacters.length; i++) {
        byteArray[i] = byteCharacters.charCodeAt(i);
      }
      const blob = new Blob([byteArray], { type: "image/jpeg" });

      const filePath = `${Date.now()}-${Math.random().toString(36).substring(7)}-${fileName}.jpg`;
      
      const { error, data: uploadData } = await supabase.storage
        .from("valve-photos")
        .upload(filePath, blob, {
          cacheControl: '3600',
          upsert: false
        });

      if (error) {
        console.error(`Error uploading ${fileName}:`, error);
        throw error;
      }

      const { data } = supabase.storage
        .from("valve-photos")
        .getPublicUrl(filePath);

      return data.publicUrl;
    } catch (error) {
      console.error("Erro ao fazer upload:", error);
      toast({
        title: "Erro no upload",
        description: `Falha ao enviar foto ${fileName}`,
        variant: "destructive",
      });
      return null;
    }
  };

  const handleSave = async () => {
    if (!valveCode || valveCode.trim() === "") {
      toast({
        title: "Atenção",
        description: "O código da válvula é obrigatório",
        variant: "destructive",
      });
      valveCodeRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
      setTimeout(() => {
        valveCodeRef.current?.focus();
      }, 300);
      return;
    }

    if (!photoInitial && !photoDuring && !photoFinal) {
      toast({
        title: "Atenção",
        description: "Adicione pelo menos uma foto",
        variant: "destructive",
      });
      return;
    }

    setIsSaving(true);

    try {
      let photoInitialUrl = editingRecord?.photo_initial_url || null;
      let photoDuringUrl = editingRecord?.photo_during_url || null;
      let photoFinalUrl = editingRecord?.photo_final_url || null;

      if (photoInitial && photoInitial.startsWith('data:')) {
        const uploadedUrl = await uploadPhoto(photoInitial, "initial");
        if (!uploadedUrl) throw new Error("Falha ao enviar foto inicial");
        photoInitialUrl = uploadedUrl;
      } else if (photoInitial) {
        photoInitialUrl = photoInitial;
      }
      
      if (photoDuring && photoDuring.startsWith('data:')) {
        const uploadedUrl = await uploadPhoto(photoDuring, "during");
        if (!uploadedUrl) throw new Error("Falha ao enviar foto durante");
        photoDuringUrl = uploadedUrl;
      } else if (photoDuring) {
        photoDuringUrl = photoDuring;
      }
      
      if (photoFinal && photoFinal.startsWith('data:')) {
        const uploadedUrl = await uploadPhoto(photoFinal, "final");
        if (!uploadedUrl) throw new Error("Falha ao enviar foto final");
        photoFinalUrl = uploadedUrl;
      } else if (photoFinal) {
        photoFinalUrl = photoFinal;
      }

      const hasAllPhotos = photoInitialUrl && photoDuringUrl && photoFinalUrl;
      const status = hasAllPhotos ? 'concluido' : 'em_andamento';

      let error;
      
      if (editingRecord) {
        const result = await supabase
          .from("inspection_records")
          .update({
            valve_code: valveCode || null,
            photo_initial_url: photoInitialUrl,
            photo_during_url: photoDuringUrl,
            photo_final_url: photoFinalUrl,
            status: status,
          })
          .eq("id", editingRecord.id);
        
        error = result.error;
      } else {
        const result = await supabase.from("inspection_records").insert({
          valve_code: valveCode || null,
          photo_initial_url: photoInitialUrl,
          photo_during_url: photoDuringUrl,
          photo_final_url: photoFinalUrl,
          notes: null,
          status: status,
        });
        
        error = result.error;
      }

      if (error) {
        console.error("Database insert error:", error);
        throw error;
      }

      const allPhotosPresent = (photoInitialUrl || editingRecord?.photo_initial_url) && 
                               (photoDuringUrl || editingRecord?.photo_during_url) && 
                               (photoFinalUrl || editingRecord?.photo_final_url);

      toast({
        title: "Sucesso!",
        description: allPhotosPresent 
          ? "Inspeção concluída com sucesso" 
          : "Inspeção salva. Você pode adicionar as fotos restantes depois",
      });

      setValveCode("");
      setPhotoInitial(null);
      setPhotoDuring(null);
      setPhotoFinal(null);
      setRotations({ initial: 0, during: 0, final: 0 });
      
      if (onCancelEdit) {
        onCancelEdit();
      }
      
      onSaved();
    } catch (error) {
      console.error("Erro ao salvar:", error);
      toast({
        title: "Erro",
        description: error instanceof Error ? error.message : "Falha ao salvar inspeção",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const copyToClipboard = async (text: string, id: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedText(id);
      toast({
        title: "Texto copiado!",
      });
      setTimeout(() => setCopiedText(null), 2000);
    } catch (err) {
      toast({
        title: "Erro ao copiar texto",
        variant: "destructive",
      });
    }
  };

  const standardTexts = [
    {
      id: "calibration",
      title: "Origem do Problema > Calibração Vencida",
      text: "Foi realizado a calibração da válvula de segurança conforme os procedimentos internos normativos, utilizando equipamentos devidamente calibrados e rastreados."
    },
    {
      id: "observations",
      title: "Observações Apresentadas",
      text: "Os resultados obtidos confirmam que a válvula atende aos requisitos especificados para seu pleno funcionamento e segurança operacional."
    }
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      {editingRecord && onCancelEdit && (
        <div className="flex items-center justify-end">
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={onCancelEdit} 
            className="text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-800"
          >
            Cancelar edição
          </Button>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <PhotoUploader
          title="INÍCIO DA INSPEÇÃO"
          subtitle="Válvula no recebimento"
          photo={photoInitial}
          onPhotoChange={setPhotoInitial}
          onRotate={() => handleRotate("initial")}
          onRemove={() => setPhotoInitial(null)}
        />

        <PhotoUploader
          title="DURANTE A INSPEÇÃO"
          subtitle="Válvula trabalhando"
          photo={photoDuring}
          onPhotoChange={setPhotoDuring}
          onRotate={() => handleRotate("during")}
          onRemove={() => setPhotoDuring(null)}
        />

        <PhotoUploader
          title="TÉRMINO DA INSPEÇÃO"
          subtitle="Válvula pronta"
          photo={photoFinal}
          onPhotoChange={setPhotoFinal}
          onRotate={() => handleRotate("final")}
          onRemove={() => setPhotoFinal(null)}
        />
      </div>

      <Card className="p-6 border-2 border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 shadow-lg hover:shadow-xl transition-all duration-300">
        <div>
          <Label htmlFor="valveCode" className="text-sm font-semibold text-gray-900 dark:text-white flex items-center gap-2">
            Código da Válvula 
            <span className="flex items-center gap-1 text-red-600 dark:text-red-500">
              <AlertCircle className="h-3.5 w-3.5" />
              obrigatório
            </span>
          </Label>
          <div className="mt-3">
            <Input
              ref={valveCodeRef}
              id="valveCode"
              value={valveCode}
              onChange={(e) => setValveCode(e.target.value)}
              placeholder="Ex: VLV-001"
              className="h-11 bg-gray-50 dark:bg-gray-800 border-2 border-gray-300 dark:border-gray-700 text-gray-900 dark:text-white focus:border-red-500 dark:focus:border-red-600 transition-all duration-300"
            />
          </div>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-2 flex items-center gap-1">
            <AlertCircle className="h-3 w-3" />
            Campo obrigatório para salvar o relatório
          </p>
        </div>
      </Card>

      <Button
        onClick={handleSave}
        disabled={isSaving || (!photoInitial && !photoDuring && !photoFinal && !editingRecord)}
        className="w-full h-12 gradient-primary text-white shadow-lg hover:shadow-xl hover:scale-105 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
      >
        {isSaving ? (
          <>
            <Loader2 className="mr-2 h-5 w-5 animate-spin" />
            Salvando...
          </>
        ) : (
          <>
            <Save className="mr-2 h-5 w-5" />
            {editingRecord ? "Atualizar Inspeção" : "Salvar Relatório"}
          </>
        )}
      </Button>
      
      {!editingRecord && (photoInitial || photoDuring || photoFinal) && (
        <p className="text-xs text-gray-500 dark:text-gray-400 text-center bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded-lg p-3">
          💡 Você pode salvar com fotos parciais e adicionar as restantes depois
        </p>
      )}

      <div className="space-y-3 pt-6 border-t-2 border-gray-200 dark:border-gray-800">
        <h3 className="text-sm font-bold text-gray-900 dark:text-white flex items-center gap-2">
          <Copy className="h-4 w-4" />
          Textos Padronizados
        </h3>
        {standardTexts.map((item) => (
          <Card key={item.id} className="p-4 border-2 border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 hover:border-red-500 dark:hover:border-red-600 hover:shadow-lg transition-all duration-300">
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1 min-w-0">
                <h4 className="font-semibold text-xs text-gray-500 dark:text-gray-400 mb-2">{item.title}</h4>
                <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">{item.text}</p>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => copyToClipboard(item.text, item.id)}
                className="shrink-0 h-9 w-9 text-gray-500 dark:text-gray-400 hover:text-red-600 dark:hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/20 transition-all duration-300"
              >
                {copiedText === item.id ? (
                  <Check className="h-4 w-4 text-green-600 dark:text-green-500" />
                ) : (
                  <Copy className="h-4 w-4" />
                )}
              </Button>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
};