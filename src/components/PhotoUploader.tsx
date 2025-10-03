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
  };

  return (
    <>
      <Card className="overflow-hidden bg-card/90 backdrop-blur-md border-border/50 shadow-lg hover:shadow-xl transition-all">
        <div className="bg-primary p-4">
          <h3 className="font-bold text-lg text-primary-foreground">{title}</h3>
          <p className="text-sm text-primary-foreground/90">{subtitle}</p>
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
                  className="bg-card/90 backdrop-blur-md hover:bg-card shadow-md"
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
            <div className="h-64 bg-muted rounded-lg flex items-center justify-center">
              <div className="text-center">
                <Camera className="h-12 w-12 mx-auto mb-2 text-muted-foreground" />
                <p className="text-sm text-muted-foreground">Nenhuma foto</p>
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
