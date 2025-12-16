import { useState, useRef } from "react";
import { Camera, Upload, RotateCw, X } from "lucide-react";
import { Button } from "@/components/ui/button";
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
      <div className="glass-card-hover rounded-lg overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-primary to-accent p-4">
          <h3 className="font-display font-semibold text-sm text-primary-foreground uppercase tracking-wide">
            {title}
          </h3>
          <p className="text-xs text-primary-foreground/80 mt-0.5">
            {subtitle}
          </p>
        </div>

        {/* Content */}
        <div className="p-4">
          {photo ? (
            <div className="relative group">
              <img
                src={photo}
                alt={title}
                className="w-full aspect-[4/3] object-cover rounded-md"
              />
              <div className="absolute inset-0 bg-background/60 opacity-0 group-hover:opacity-100 transition-opacity rounded-md flex items-center justify-center gap-2">
                <Button
                  size="icon"
                  variant="secondary"
                  onClick={onRotate}
                  className="h-9 w-9"
                >
                  <RotateCw className="h-4 w-4" />
                </Button>
                <Button
                  size="icon"
                  variant="destructive"
                  onClick={onRemove}
                  className="h-9 w-9"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ) : (
            <div 
              className={`aspect-[4/3] rounded-md border-2 border-dashed flex items-center justify-center cursor-pointer transition-all ${
                isDragging 
                  ? 'border-primary bg-primary/10' 
                  : 'border-border hover:border-primary/50 hover:bg-secondary/50'
              }`}
              onDragEnter={handleDragEnter}
              onDragLeave={handleDragLeave}
              onDragOver={handleDragOver}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
            >
              <div className="text-center p-4">
                <Upload className={`h-8 w-8 mx-auto mb-2 ${
                  isDragging ? 'text-primary' : 'text-muted-foreground'
                }`} />
                <p className="text-xs text-muted-foreground">
                  {isDragging ? 'Solte aqui' : 'Arraste ou clique'}
                </p>
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-2 mt-3">
            <Button
              onClick={() => setShowCamera(true)}
              size="sm"
              className="flex-1 h-9 text-xs"
            >
              <Camera className="h-3.5 w-3.5 mr-1.5" />
              Câmera
            </Button>
            <Button
              variant="outline"
              onClick={() => fileInputRef.current?.click()}
              size="sm"
              className="flex-1 h-9 text-xs"
            >
              <Upload className="h-3.5 w-3.5 mr-1.5" />
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
      </div>

      {showCamera && (
        <CameraCapture
          onCapture={handleCapture}
          onClose={() => setShowCamera(false)}
        />
      )}
    </>
  );
};
