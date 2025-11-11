import { useState, useRef } from "react";
import { Camera, Upload, RotateCw, X, Maximize2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { CameraCapture } from "./CameraCapture";
import redBlackWaveOverlay from "@/assets/red-black-wave-overlay.png";

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
  const [showFullImage, setShowFullImage] = useState(false);
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
      <Card className="overflow-hidden bg-card/95 backdrop-blur-md border-border shadow-lg hover:shadow-xl transition-all">
        <div className="relative h-24 overflow-hidden">
          <img
            src={redBlackWaveOverlay}
            alt=""
            className="absolute top-0 left-0 w-full h-full object-cover"
          />
          <div className="relative z-10 p-4 h-full flex flex-col justify-center">
            <h3 className="font-bold text-lg text-white drop-shadow-lg">{title}</h3>
            <p className="text-sm text-white/90 drop-shadow-md">{subtitle}</p>
          </div>
        </div>

        <div className="p-4">
          {photo ? (
            <div className="relative group">
              <img
                src={photo}
                alt={title}
                className="w-full h-64 object-cover rounded-lg"
              />
              <div className="absolute top-2 right-2 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                <Button
                  size="icon"
                  variant="secondary"
                  onClick={onRotate}
                  className="bg-white/95 backdrop-blur-md hover:bg-white shadow-md"
                >
                  <RotateCw className="h-4 w-4 text-foreground" />
                </Button>
                <Button
                  size="icon"
                  variant="destructive"
                  onClick={onRemove}
                  className="shadow-md"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ) : (
            <div 
              className={`h-64 bg-muted rounded-lg flex items-center justify-center border-2 border-dashed transition-all cursor-pointer ${
                isDragging 
                  ? 'border-primary bg-primary/10 scale-105' 
                  : 'border-border hover:border-primary/50 hover:bg-muted/50'
              }`}
              onDragEnter={handleDragEnter}
              onDragLeave={handleDragLeave}
              onDragOver={handleDragOver}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
            >
              <div className="text-center p-4">
                <Upload className={`h-12 w-12 mx-auto mb-2 transition-colors ${
                  isDragging ? 'text-primary' : 'text-muted-foreground'
                }`} />
                <p className={`text-sm font-medium transition-colors ${
                  isDragging ? 'text-primary' : 'text-muted-foreground'
                }`}>
                  {isDragging ? 'Solte a imagem aqui' : 'Arraste uma imagem ou clique'}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  JPG, PNG ou WEBP
                </p>
              </div>
            </div>
          )}

          <div className="flex gap-2 mt-4">
            <Button
              onClick={() => setShowCamera(true)}
              className="flex-1"
            >
              <Camera className="h-4 w-4 mr-2" />
              Tirar Foto
            </Button>
            <Button
              variant="outline"
              onClick={() => fileInputRef.current?.click()}
              className="flex-1"
            >
              <Upload className="h-4 w-4 mr-2" />
              Upload
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