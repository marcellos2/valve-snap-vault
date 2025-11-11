import { useState, useRef, useEffect } from "react";
import { PhotoUploader } from "./PhotoUploader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Save, Loader2 } from "lucide-react";
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

  // Atualizar o formulário quando editingRecord mudar
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
      
      // Se for URL externa (Supabase), precisamos do crossOrigin
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
        // Tentar novamente sem crossOrigin
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

  const extractCodeFromImage = async (imageData: string) => {
    setIsExtractingCode(true);
    try {
      const result = await Tesseract.recognize(imageData, "eng", {
        logger: (m) => console.log(m),
      });
      
      const text = result.data.text.toUpperCase().replace(/\s+/g, " ");
      console.log("Texto detectado:", text);
      
      // Buscar padrões específicos de código de válvula
      // Padrão 1: VAL seguido de espaço e números (ex: VAL 005)
      let codeMatch = text.match(/VAL\s*(\d{3,})/);
      
      // Padrão 2: VLV seguido de hífen e números (ex: VLV-001)
      if (!codeMatch) {
        codeMatch = text.match(/VLV[-\s]*(\d{3,})/);
      }
      
      // Padrão 3: Qualquer sequência alfanumérica de 4+ caracteres
      if (!codeMatch) {
        const matches = text.match(/[A-Z]{2,}\s*\d{3,}/);
        if (matches) codeMatch = matches;
      }
      
      if (codeMatch) {
        // Formatar o código: manter formato original se tiver VAL/VLV, senão usar o que foi encontrado
        const detectedCode = codeMatch[0].replace(/\s+/g, " ").trim();
        setValveCode(detectedCode);
        toast({
          title: "Código detectado!",
          description: `Código da válvula: ${detectedCode}`,
        });
      } else {
        console.log("Nenhum código encontrado no padrão esperado");
      }
    } catch (error) {
      console.error("Erro ao extrair código:", error);
    } finally {
      setIsExtractingCode(false);
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

      // Use a unique filename with timestamp and random string
      const filePath = `${Date.now()}-${Math.random().toString(36).substring(7)}-${fileName}.jpg`;
      
      console.log(`Uploading ${fileName} to ${filePath}...`);
      
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

      console.log(`Successfully uploaded ${fileName}`);

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
      // Scroll e foco no campo de código
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
      console.log("Starting save process...");
      console.log("Photos present:", { 
        initial: !!photoInitial, 
        during: !!photoDuring, 
        final: !!photoFinal 
      });

      // Manter URLs antigas se estiver editando
      let photoInitialUrl = editingRecord?.photo_initial_url || null;
      let photoDuringUrl = editingRecord?.photo_during_url || null;
      let photoFinalUrl = editingRecord?.photo_final_url || null;

      // Upload apenas fotos novas (base64)
      // Se a foto já é uma URL do storage, não fazer upload novamente
      if (photoInitial && photoInitial.startsWith('data:')) {
        console.log("Uploading initial photo...");
        const uploadedUrl = await uploadPhoto(photoInitial, "initial");
        if (!uploadedUrl) {
          throw new Error("Falha ao enviar foto inicial");
        }
        photoInitialUrl = uploadedUrl;
      } else if (photoInitial) {
        photoInitialUrl = photoInitial; // Manter URL existente
      }
      
      if (photoDuring && photoDuring.startsWith('data:')) {
        console.log("Uploading during photo...");
        const uploadedUrl = await uploadPhoto(photoDuring, "during");
        if (!uploadedUrl) {
          throw new Error("Falha ao enviar foto durante");
        }
        photoDuringUrl = uploadedUrl;
      } else if (photoDuring) {
        photoDuringUrl = photoDuring; // Manter URL existente
      }
      
      if (photoFinal && photoFinal.startsWith('data:')) {
        console.log("Uploading final photo...");
        const uploadedUrl = await uploadPhoto(photoFinal, "final");
        if (!uploadedUrl) {
          throw new Error("Falha ao enviar foto final");
        }
        photoFinalUrl = uploadedUrl;
      } else if (photoFinal) {
        photoFinalUrl = photoFinal; // Manter URL existente
      }

      console.log("All photos uploaded successfully");
      console.log("Photo URLs:", { photoInitialUrl, photoDuringUrl, photoFinalUrl });

      // Calcular status baseado nas fotos presentes
      const hasAllPhotos = photoInitialUrl && photoDuringUrl && photoFinalUrl;
      const status = hasAllPhotos ? 'concluido' : 'em_andamento';

      let error;
      
      if (editingRecord) {
        // Atualizar registro existente - sempre atualizar todas as URLs
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
        // Criar novo registro
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

      console.log("Record saved successfully");

      const allPhotosPresent = (photoInitialUrl || editingRecord?.photo_initial_url) && 
                               (photoDuringUrl || editingRecord?.photo_during_url) && 
                               (photoFinalUrl || editingRecord?.photo_final_url);

      toast({
        title: "Sucesso!",
        description: allPhotosPresent 
          ? "Inspeção concluída com sucesso" 
          : "Inspeção salva. Você pode adicionar as fotos restantes depois",
      });

      // Limpar formulário
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

  return (
    <div className="space-y-8">
      {editingRecord && onCancelEdit && (
        <div className="flex items-center justify-end">
          <Button 
            variant="ghost" 
            onClick={onCancelEdit}
            className="text-white/60 hover:text-white hover:bg-white/5"
          >
            Cancelar
          </Button>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <PhotoUploader
          title="INÍCIO DA INSPEÇÃO"
          subtitle="VÁLVULA NO RECEBIMENTO"
          photo={photoInitial}
          onPhotoChange={setPhotoInitial}
          onRotate={() => handleRotate("initial")}
          onRemove={() => setPhotoInitial(null)}
        />

        <PhotoUploader
          title="DURANTE A INSPEÇÃO"
          subtitle="VÁLVULA TRABALHANDO"
          photo={photoDuring}
          onPhotoChange={setPhotoDuring}
          onRotate={() => handleRotate("during")}
          onRemove={() => setPhotoDuring(null)}
        />

        <PhotoUploader
          title="TÉRMINO DA INSPEÇÃO"
          subtitle="VÁLVULA PRONTA"
          photo={photoFinal}
          onPhotoChange={setPhotoFinal}
          onRotate={() => handleRotate("final")}
          onRemove={() => setPhotoFinal(null)}
        />
      </div>

      <Card className="p-6 bg-black border border-white/10">
        <div className="space-y-3">
          <Label htmlFor="valveCode" className="text-sm font-light tracking-wider text-white uppercase">
            Código da Válvula <span className="text-primary">*</span>
          </Label>
          <Input
            ref={valveCodeRef}
            id="valveCode"
            value={valveCode}
            onChange={(e) => setValveCode(e.target.value)}
            placeholder="Ex: VLV-001"
            className="h-11 bg-black border-white/10 focus:border-white/30 text-white placeholder:text-white/30"
          />
          <p className="text-xs text-white/40 tracking-wide">
            Campo obrigatório para salvar o relatório
          </p>
        </div>
      </Card>

      <Button
        onClick={handleSave}
        disabled={isSaving || (!photoInitial && !photoDuring && !photoFinal && !editingRecord)}
        className="w-full h-12 text-sm tracking-wider bg-primary hover:bg-primary/90 text-white border-0 transition-all duration-300"
      >
        {isSaving ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            SALVANDO...
          </>
        ) : (
          <>
            <Save className="mr-2 h-4 w-4" />
            {editingRecord ? "ATUALIZAR INSPEÇÃO" : "SALVAR RELATÓRIO"}
          </>
        )}
      </Button>
      
      {!editingRecord && (photoInitial || photoDuring || photoFinal) && (
        <p className="text-xs text-white/40 text-center tracking-wide">
          Você pode salvar com fotos parciais e adicionar as restantes depois
        </p>
      )}
    </div>
  );
};