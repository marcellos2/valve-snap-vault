import { useState, useRef } from "react";
import { PhotoUploader } from "./PhotoUploader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Save, Loader2, Copy, Check } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import Tesseract from "tesseract.js";

export const InspectionForm = ({ onSaved }: { onSaved: () => void }) => {
  const { toast } = useToast();
  const valveCodeRef = useRef<HTMLInputElement>(null);
  const [valveCode, setValveCode] = useState("");
  const [photoInitial, setPhotoInitial] = useState<string | null>(null);
  const [photoDuring, setPhotoDuring] = useState<string | null>(null);
  const [photoFinal, setPhotoFinal] = useState<string | null>(null);
  const [rotations, setRotations] = useState({ initial: 0, during: 0, final: 0 });
  const [isSaving, setIsSaving] = useState(false);
  const [isExtractingCode, setIsExtractingCode] = useState(false);
  const [copiedText, setCopiedText] = useState<string | null>(null);

  const rotatePhoto = (photo: string, currentRotation: number): Promise<string> => {
    return new Promise((resolve) => {
      const img = new Image();
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

        resolve(canvas.toDataURL("image/jpeg"));
      };
      img.src = photo;
    });
  };

  const handleRotate = async (type: "initial" | "during" | "final") => {
    const photoMap = { initial: photoInitial, during: photoDuring, final: photoFinal };
    const photo = photoMap[type];
    if (!photo) return;

    const rotated = await rotatePhoto(photo, rotations[type]);
    setRotations((prev) => ({ ...prev, [type]: (prev[type] + 90) % 360 }));

    if (type === "initial") setPhotoInitial(rotated);
    else if (type === "during") setPhotoDuring(rotated);
    else setPhotoFinal(rotated);
  };

  const extractCodeFromImage = async (imageData: string) => {
    setIsExtractingCode(true);
    try {
      const result = await Tesseract.recognize(imageData, "eng", {
        logger: (m) => console.log(m),
      });
      
      // Extrair código de válvula (assumindo formato comum)
      const text = result.data.text;
      const codeMatch = text.match(/[A-Z0-9]{4,}/g);
      if (codeMatch && codeMatch[0]) {
        setValveCode(codeMatch[0]);
        toast({
          title: "Código detectado!",
          description: `Código da válvula: ${codeMatch[0]}`,
        });
      } else {
        toast({
          title: "Código não encontrado",
          description: "Insira o código manualmente",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Erro ao extrair código:", error);
      toast({
        title: "Erro ao ler código",
        description: "Insira o código manualmente",
        variant: "destructive",
      });
    } finally {
      setIsExtractingCode(false);
    }
  };

  const uploadPhoto = async (photoData: string, fileName: string): Promise<string | null> => {
    try {
      const base64Data = photoData.split(",")[1];
      const byteCharacters = atob(base64Data);
      const byteArray = new Uint8Array(byteCharacters.length);
      for (let i = 0; i < byteCharacters.length; i++) {
        byteArray[i] = byteCharacters.charCodeAt(i);
      }
      const blob = new Blob([byteArray], { type: "image/jpeg" });

      const filePath = `${Date.now()}-${fileName}.jpg`;
      const { error } = await supabase.storage
        .from("valve-photos")
        .upload(filePath, blob);

      if (error) throw error;

      const { data } = supabase.storage
        .from("valve-photos")
        .getPublicUrl(filePath);

      return data.publicUrl;
    } catch (error) {
      console.error("Erro ao fazer upload:", error);
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
      let photoInitialUrl = null;
      let photoDuringUrl = null;
      let photoFinalUrl = null;

      if (photoInitial) photoInitialUrl = await uploadPhoto(photoInitial, "initial");
      if (photoDuring) photoDuringUrl = await uploadPhoto(photoDuring, "during");
      if (photoFinal) photoFinalUrl = await uploadPhoto(photoFinal, "final");

      const { error } = await supabase.from("inspection_records").insert({
        valve_code: valveCode || null,
        photo_initial_url: photoInitialUrl,
        photo_during_url: photoDuringUrl,
        photo_final_url: photoFinalUrl,
        notes: null,
      });

      if (error) throw error;

      toast({
        title: "Sucesso!",
        description: "Inspeção salva com sucesso",
      });

      // Limpar formulário
      setValveCode("");
      setPhotoInitial(null);
      setPhotoDuring(null);
      setPhotoFinal(null);
      setRotations({ initial: 0, during: 0, final: 0 });
      
      onSaved();
    } catch (error) {
      console.error("Erro ao salvar:", error);
      toast({
        title: "Erro",
        description: "Falha ao salvar inspeção",
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
    <div className="space-y-6">

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
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

      <Button
        onClick={handleSave}
        disabled={isSaving}
        className="w-full h-14 text-lg shadow-lg hover:shadow-xl transition-all"
      >
        {isSaving ? (
          <>
            <Loader2 className="mr-2 h-5 w-5 animate-spin" />
            Salvando...
          </>
        ) : (
          <>
            <Save className="mr-2 h-5 w-5" />
            Salvar Relatório
          </>
        )}
      </Button>

      {/* Campo de Código da Válvula - Destacado */}
      <Card className="p-6 bg-card/95 backdrop-blur-md border-primary shadow-lg border-2">
        <div>
          <Label htmlFor="valveCode" className="text-lg">
            Código da Válvula <span className="text-destructive text-xl">*</span>
          </Label>
          <div className="flex gap-2 mt-2">
            <Input
              ref={valveCodeRef}
              id="valveCode"
              value={valveCode}
              onChange={(e) => setValveCode(e.target.value)}
              placeholder="Ex: VLV-001"
              className="flex-1 h-12 text-lg border-primary/30 focus:border-primary"
            />
            <Button
              variant="outline"
              onClick={() => photoInitial && extractCodeFromImage(photoInitial)}
              disabled={!photoInitial || isExtractingCode}
              className="h-12"
            >
              {isExtractingCode ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                "Detectar"
              )}
            </Button>
          </div>
          <p className="text-sm text-muted-foreground mt-2">
            Campo obrigatório para salvar o relatório
          </p>
        </div>
      </Card>

      {/* Seção de Textos Padronizados */}
      <div className="space-y-4 mt-8">
        <h3 className="text-lg font-semibold text-foreground">Textos Padronizados</h3>
        {standardTexts.map((item) => (
          <Card key={item.id} className="p-4 bg-card/95 backdrop-blur-md border-border shadow-md">
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1">
                <h4 className="font-medium text-sm text-muted-foreground mb-2">{item.title}</h4>
                <p className="text-sm text-foreground">{item.text}</p>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => copyToClipboard(item.text, item.id)}
                className="shrink-0 bg-transparent hover:bg-accent/20"
              >
                {copiedText === item.id ? (
                  <Check className="h-4 w-4 text-primary" />
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
