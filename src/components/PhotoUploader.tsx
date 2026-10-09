import { useState, useRef } from "react";
import { Camera, Upload, CloudUpload, ChevronRight, RotateCw, X, ClipboardPaste } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { CameraCapture } from "./CameraCapture";
import { fetchDriveImageFromText } from "@/lib/upload-to-drive";

interface PhotoUploaderProps {
  title: string;
  subtitle: string;
  stage?: 1 | 2 | 3;
  photo: string | null;
  onPhotoChange: (photo: string) => void;
  onRotate: () => void;
  onRemove: () => void;
}

export const PhotoUploader = ({
  title,
  subtitle,
  stage = 1,
  photo,
  onPhotoChange,
  onRotate,
  onRemove,
}: PhotoUploaderProps) => {
  const [showCamera, setShowCamera] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        onPhotoChange(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleCapture = (imageData: string) => {
    onPhotoChange(imageData);
    setShowCamera(false);
  };

  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      const file = files[0];
      if (file.type.startsWith('image/')) {
        const reader = new FileReader();
        reader.onloadend = () => {
          onPhotoChange(reader.result as string);
        };
        reader.readAsDataURL(file);
      }
    }
  };

  const readBlob = (blob: Blob) => {
    const reader = new FileReader();
    reader.onloadend = () => onPhotoChange(reader.result as string);
    reader.readAsDataURL(blob);
  };

  const [loadingDrive, setLoadingDrive] = useState(false);

  const loadFromDriveText = async (text: string) => {
    setLoadingDrive(true);
    try {
      readBlob(await fetchDriveImageFromText(text));
    } catch (err) {
      alert(err instanceof Error ? err.message : "Falha ao buscar foto do Drive.");
    } finally {
      setLoadingDrive(false);
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    const items = Array.from(e.clipboardData?.items ?? []);
    const img = items.find((i) => i.type.startsWith("image/"));
    const file = img?.getAsFile();
    if (file) {
      e.preventDefault();
      readBlob(file);
      return;
    }
    const text = e.clipboardData?.getData("text/plain") || e.clipboardData?.getData("text/uri-list");
    if (text) {
      e.preventDefault();
      loadFromDriveText(text);
    }
  };

  const handlePasteButton = async () => {
    try {
      const items = await navigator.clipboard.read();
      for (const item of items) {
        const type = item.types.find((t) => t.startsWith("image/"));
        if (type) {
          readBlob(await item.getType(type));
          return;
        }
      }
      const text = await navigator.clipboard.readText().catch(() => "");
      if (text) return loadFromDriveText(text);
      alert("Nenhuma imagem copiada. Copie a foto (Ctrl+C) e tente novamente.");
    } catch {
      alert("Clique no quadro da foto e pressione Ctrl+V para colar.");
    }
  };

  return (
    <>
      <Card
        tabIndex={0}
        onPaste={handlePaste}
        className={`photo-stage stage-${stage} overflow-hidden border border-border hover:border-primary/40 hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-primary transition-all duration-300 group`}
      >
        {/* Header do card */}
        <div className="stage-heading flex items-center gap-3 px-4 py-3 text-primary-foreground">
          <span className="stage-number flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-card text-primary font-bold text-lg">{stage}</span>
          <div className="min-w-0"><h3 className="font-semibold text-[13px]">{title}</h3><p className="text-[10px] text-primary-foreground/90">{subtitle}</p></div>
          <ChevronRight className="ml-auto h-4 w-4 shrink-0" />
        </div>

        <div className="p-4 bg-card">
          {photo ? (
            <div className="relative">
              <img
                src={photo}
                alt={title}
                className="w-full h-[112px] object-cover rounded-lg"
              />
              <div className="absolute top-2 right-2 flex gap-1.5">
                <Button
                  size="icon"
                  variant="secondary"
                  onClick={onRotate}
                  className="h-9 w-9 shadow-lg bg-background/90 hover:bg-background"
                >
                  <RotateCw className="h-4 w-4" />
                </Button>
                <Button
                  size="icon"
                  variant="destructive"
                  onClick={onRemove}
                  className="h-9 w-9 shadow-lg"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ) : (
            <div 
              className={`h-[112px] bg-muted rounded-lg flex items-center justify-center border-2 border-dashed transition-all duration-300 cursor-pointer ${
                isDragging 
                  ? 'border-primary bg-primary/5 scale-[1.02]' 
                  : 'border-border hover:border-primary/50 hover:bg-muted/50'
              }`}
              onDragEnter={handleDragEnter}
              onDragLeave={handleDragLeave}
              onDragOver={handleDragOver}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
            >
              <div className="text-center p-4">
                <div className={`mx-auto mb-1 w-9 h-9 rounded-xl flex items-center justify-center transition-all duration-300 ${
                  isDragging ? 'bg-primary/10' : 'bg-transparent'
                }`}>
                  <CloudUpload className={`h-7 w-7 transition-all duration-300 ${
                    isDragging ? 'text-primary scale-110' : 'text-muted-foreground'
                  }`} />
                </div>
                <p className={`text-xs font-medium transition-colors ${
                  isDragging ? 'text-primary' : 'text-muted-foreground'
                }`}>
                  {isDragging ? 'Solte a imagem aqui' : (loadingDrive ? 'Buscando foto no Drive...' : 'Arraste, clique ou Ctrl+V')}
                </p>
                <p className="text-[9px] text-muted-foreground mt-1">
                  JPG, PNG ou WEBP
                </p>
              </div>
            </div>
          )}

          <div className="flex gap-2 mt-3">
            <Button
              onClick={() => setShowCamera(true)}
              size="sm"
              className="camera-stage flex-1 min-w-0 px-2 gap-1 shadow-sm hover:shadow-md transition-shadow"
            >
              <Camera className="h-3.5 w-3.5" />
              Câmera
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => fileInputRef.current?.click()}
              className="flex-1 min-w-0 px-2 gap-1 hover:bg-muted transition-colors"
            >
              <Upload className="h-3.5 w-3.5" />
              Arquivo
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handlePasteButton}
              className="flex-1 min-w-0 px-2 gap-1 hover:bg-muted transition-colors"
            >
              <ClipboardPaste className="h-3.5 w-3.5" />
              {loadingDrive ? "Buscando..." : "Colar"}
            </Button>
          </div>

          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleFileChange}
            className="hidden"
          />
        </div>
      </Card>

      {showCamera && (
        <CameraCapture
          onCapture={handleCapture}
          onClose={() => setShowCamera(false)}
        />
      )}
    </>
  );
};