import { useState, useRef, useEffect } from "react";
import { PhotoUploader } from "./PhotoUploader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Save, Loader2, Copy, Check, X } from "lucide-react";
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
      toast({
        title: "Erro ao rotacionar",
        description: "Não foi possível rotacionar a foto.",
        variant: "destructive",
      });
    }
  };

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
        .upload(filePath, blob, { cacheControl: '3600', upsert: false });

      if (error) throw error;

      const { data } = supabase.storage
        .from("valve-photos")
        .getPublicUrl(filePath);

      return data.publicUrl;
    } catch (error) {
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
      setTimeout(() => valveCodeRef.current?.focus(), 300);
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

      if (error) throw error;

      toast({
        title: "Sucesso!",
        description: hasAllPhotos 
          ? "Inspeção concluída" 
          : "Inspeção salva parcialmente",
      });

      setValveCode("");
      setPhotoInitial(null);
      setPhotoDuring(null);
      setPhotoFinal(null);
      setRotations({ initial: 0, during: 0, final: 0 });
      
      if (onCancelEdit) onCancelEdit();
      onSaved();
    } catch (error) {
      toast({
        title: "Erro",
        description: error instanceof Error ? error.message : "Falha ao salvar",
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
      toast({ title: "Copiado!" });
      setTimeout(() => setCopiedText(null), 2000);
    } catch {
      toast({ title: "Erro ao copiar", variant: "destructive" });
    }
  };

  const standardTexts = [
    {
      id: "calibration",
      title: "Calibração",
      text: "Foi realizado a calibração da válvula de segurança conforme os procedimentos internos normativos, utilizando equipamentos devidamente calibrados e rastreados."
    },
    {
      id: "observations",
      title: "Observações",
      text: "Os resultados obtidos confirmam que a válvula atende aos requisitos especificados para seu pleno funcionamento e segurança operacional."
    }
  ];

  return (
    <div className="space-y-6">
      {/* Editing Banner */}
      {editingRecord && onCancelEdit && (
        <div className="flex items-center justify-between p-3 bg-primary/10 border border-primary/20 rounded-lg">
          <span className="text-sm text-foreground">Editando registro</span>
          <Button variant="ghost" size="sm" onClick={onCancelEdit}>
            <X className="h-4 w-4 mr-1" />
            Cancelar
          </Button>
        </div>
      )}

      {/* Valve Code Input */}
      <div className="glass-card rounded-lg p-4">
        <Label htmlFor="valveCode" className="text-sm font-medium text-foreground">
          Código da Válvula <span className="text-primary">*</span>
        </Label>
        <Input
          ref={valveCodeRef}
          id="valveCode"
          value={valveCode}
          onChange={(e) => setValveCode(e.target.value)}
          placeholder="Ex: VLV-001"
          className="mt-2 h-11 input-elegant"
        />
      </div>

      {/* Photo Uploaders */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <PhotoUploader
          title="Início"
          subtitle="Válvula no recebimento"
          photo={photoInitial}
          onPhotoChange={setPhotoInitial}
          onRotate={() => handleRotate("initial")}
          onRemove={() => setPhotoInitial(null)}
        />

        <PhotoUploader
          title="Durante"
          subtitle="Válvula trabalhando"
          photo={photoDuring}
          onPhotoChange={setPhotoDuring}
          onRotate={() => handleRotate("during")}
          onRemove={() => setPhotoDuring(null)}
        />

        <PhotoUploader
          title="Término"
          subtitle="Válvula pronta"
          photo={photoFinal}
          onPhotoChange={setPhotoFinal}
          onRotate={() => handleRotate("final")}
          onRemove={() => setPhotoFinal(null)}
        />
      </div>

      {/* Save Button */}
      <Button
        onClick={handleSave}
        disabled={isSaving || (!photoInitial && !photoDuring && !photoFinal && !editingRecord)}
        className="w-full h-12 text-sm font-medium"
      >
        {isSaving ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Salvando...
          </>
        ) : (
          <>
            <Save className="mr-2 h-4 w-4" />
            {editingRecord ? "Atualizar" : "Salvar Relatório"}
          </>
        )}
      </Button>

      {/* Standard Texts */}
      <div className="glass-card rounded-lg p-4 space-y-3">
        <h3 className="text-sm font-medium text-foreground">Textos Padrão</h3>
        <div className="grid gap-2">
          {standardTexts.map((item) => (
            <button
              key={item.id}
              onClick={() => copyToClipboard(item.text, item.id)}
              className="flex items-center justify-between p-3 text-left bg-secondary/50 hover:bg-secondary rounded-md transition-colors group"
            >
              <span className="text-xs text-muted-foreground">{item.title}</span>
              {copiedText === item.id ? (
                <Check className="h-4 w-4 text-green-500" />
              ) : (
                <Copy className="h-4 w-4 text-muted-foreground group-hover:text-foreground transition-colors" />
              )}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};
