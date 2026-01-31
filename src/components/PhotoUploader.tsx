import { useState, useRef } from "react";
import { Camera, Upload, RotateCw, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { CameraCapture } from "./CameraCapture";

interface PhotoUploaderProps {
  title: string;
  subtitle: string;
  photo: string | null;
  onPhotoChange: (photo: string) => void;
  onRotate: () => void;
  onRemove: () => void;
}

export const PhotoUploader = ({
  title,
  subtitle,
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

  return (
    <>
      <Card className="overflow-hidden border border-border hover:border-primary/40 hover:shadow-lg transition-all duration-300 group">
        {/* Header do card */}
        <div className="bg-primary px-4 py-3">
          <h3 className="font-semibold text-sm text-primary-foreground">{title}</h3>
          <p className="text-xs text-primary-foreground/80">{subtitle}</p>
        </div>

        <div className="p-4 bg-card">
          {photo ? (
            <div className="relative group/photo">
              <img
                src={photo}
                alt={title}
                className="w-full h-52 object-cover rounded-lg transition-transform duration-300 group-hover/photo:scale-[1.02]"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent opacity-0 group-hover/photo:opacity-100 transition-opacity duration-300 rounded-lg" />
              <div className="absolute top-2 right-2 flex gap-1.5 opacity-0 group-hover/photo:opacity-100 transition-all duration-300 translate-y-1 group-hover/photo:translate-y-0">
                <Button
                  size="icon"
                  variant="secondary"
                  onClick={onRotate}
                  className="h-8 w-8 shadow-lg"
                >
                  <RotateCw className="h-4 w-4" />
                </Button>
                <Button
                  size="icon"
                  variant="destructive"
                  onClick={onRemove}
                  className="h-8 w-8 shadow-lg"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ) : (
            <div 
              className={`h-52 bg-muted rounded-lg flex items-center justify-center border-2 border-dashed transition-all duration-300 cursor-pointer ${
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
                <div className={`mx-auto mb-3 w-14 h-14 rounded-xl flex items-center justify-center transition-all duration-300 ${
                  isDragging ? 'bg-primary/10' : 'bg-muted'
                }`}>
                  <Upload className={`h-7 w-7 transition-all duration-300 ${
                    isDragging ? 'text-primary scale-110' : 'text-muted-foreground'
                  }`} />
                </div>
                <p className={`text-sm font-medium transition-colors ${
                  isDragging ? 'text-primary' : 'text-muted-foreground'
                }`}>
                  {isDragging ? 'Solte a imagem aqui' : 'Arraste ou clique'}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  JPG, PNG ou WEBP
                </p>
              </div>
            </div>
          )}

          <div className="flex gap-2 mt-3">
            <Button
              onClick={() => setShowCamera(true)}
              size="sm"
              className="flex-1 shadow-sm hover:shadow-md transition-shadow"
            >
              <Camera className="h-4 w-4 mr-1.5" />
              Câmera
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => fileInputRef.current?.click()}
              className="flex-1 hover:bg-muted transition-colors"
            >
              <Upload className="h-4 w-4 mr-1.5" />
              Arquivo
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