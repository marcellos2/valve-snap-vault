import { useState, useRef } from "react";
import { Camera, Upload, RotateCw, X, Maximize2 } from "lucide-react";
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
      <Card className="group overflow-hidden bg-black border border-white/10 hover:border-white/20 transition-all duration-500">
        <div className="p-6 space-y-4">
          <div className="space-y-1">
            <h3 className="text-sm font-light tracking-wider text-white uppercase">{title}</h3>
            <p className="text-xs text-white/40 tracking-wide uppercase">{subtitle}</p>
          </div>

          {photo ? (
            <div className="relative aspect-[3/4] bg-black/50 rounded overflow-hidden">
              <img
                src={photo}
                alt={title}
                className="w-full h-full object-cover cursor-pointer transition-transform duration-700 group-hover:scale-105"
                onClick={() => setShowFullImage(true)}
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
              <div className="absolute top-3 right-3 flex gap-2 opacity-0 group-hover:opacity-100 transition-all duration-300">
                <Button
                  size="icon"
                  variant="ghost"
                  onClick={onRotate}
                  className="h-8 w-8 bg-black/80 hover:bg-black text-white border border-white/20"
                >
                  <RotateCw className="h-3.5 w-3.5" />
                </Button>
                <Button
                  size="icon"
                  variant="ghost"
                  onClick={onRemove}
                  className="h-8 w-8 bg-black/80 hover:bg-primary text-white border border-white/20"
                >
                  <X className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          ) : (
            <div 
              className={`aspect-[3/4] rounded border transition-all duration-300 cursor-pointer flex items-center justify-center ${
                isDragging 
                  ? 'border-primary bg-primary/5 border-dashed' 
                  : 'border-white/10 hover:border-white/20 bg-black/30 border-dashed'
              }`}
              onDragEnter={handleDragEnter}
              onDragLeave={handleDragLeave}
              onDragOver={handleDragOver}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
            >
              <div className="text-center space-y-3">
                <Upload className={`h-8 w-8 mx-auto transition-colors duration-300 ${
                  isDragging ? 'text-primary' : 'text-white/30'
                }`} />
                <div>
                  <p className={`text-xs font-light tracking-wide transition-colors duration-300 ${
                    isDragging ? 'text-primary' : 'text-white/40'
                  }`}>
                    {isDragging ? 'SOLTE AQUI' : 'ARRASTE OU CLIQUE'}
                  </p>
                  <p className="text-[10px] text-white/20 mt-1 tracking-wider">
                    JPG, PNG, WEBP
                  </p>
                </div>
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 gap-2 pt-2">
            <Button
              onClick={() => setShowCamera(true)}
              variant="outline"
              className="h-9 text-xs tracking-wide bg-black hover:bg-white/5 border-white/10 hover:border-white/20 text-white"
            >
              <Camera className="h-3.5 w-3.5 mr-2" />
              TIRAR FOTO
            </Button>
            <Button
              variant="outline"
              onClick={() => fileInputRef.current?.click()}
              className="h-9 text-xs tracking-wide bg-black hover:bg-white/5 border-white/10 hover:border-white/20 text-white"
            >
              <Upload className="h-3.5 w-3.5 mr-2" />
              UPLOAD
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
      
      {showFullImage && photo && (
        <div 
          className="fixed inset-0 z-50 bg-black/95 flex items-center justify-center p-8"
          onClick={() => setShowFullImage(false)}
        >
          <img 
            src={photo} 
            alt={title}
            className="max-w-full max-h-full object-contain"
          />
        </div>
      )}
    </>
  );
};