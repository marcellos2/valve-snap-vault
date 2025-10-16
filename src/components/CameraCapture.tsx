import { useRef, useState, useCallback } from "react";
import Webcam from "react-webcam";
import { Camera, X, RotateCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

interface CameraCaptureProps {
  onCapture: (imageData: string) => void;
  onClose: () => void;
}

export const CameraCapture = ({ onCapture, onClose }: CameraCaptureProps) => {
  const webcamRef = useRef<Webcam>(null);
  const [facingMode, setFacingMode] = useState<"user" | "environment">("environment");
  const [capturedImage, setCapturedImage] = useState<string | null>(null);

  const videoConstraints = {
    width: 1920,
    height: 1080,
    facingMode: facingMode,
  };

  const capture = useCallback(() => {
    const imageSrc = webcamRef.current?.getScreenshot();
    if (imageSrc) {
      setCapturedImage(imageSrc);
    }
  }, [webcamRef]);

  const handleConfirm = () => {
    if (capturedImage) {
      onCapture(capturedImage);
      onClose();
    }
  };

  const handleRetake = () => {
    setCapturedImage(null);
  };

  const switchCamera = () => {
    setFacingMode((prev) => (prev === "user" ? "environment" : "user"));
    setCapturedImage(null); // Reset captured image when switching cameras
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/95 flex items-center justify-center p-4">
      <Card className="w-full max-w-2xl bg-card p-0 overflow-hidden">
        <div className="relative">
          {!capturedImage ? (
            <>
              <Webcam
                ref={webcamRef}
                audio={false}
                screenshotFormat="image/jpeg"
                videoConstraints={videoConstraints}
                className="w-full rounded-t-lg"
              />
              <div className="absolute top-4 right-4 flex gap-2">
                <Button
                  size="icon"
                  variant="secondary"
                  onClick={switchCamera}
                  className="bg-white/90 hover:bg-white"
                >
                  <RotateCw className="h-5 w-5" />
                </Button>
                <Button
                  size="icon"
                  variant="destructive"
                  onClick={onClose}
                  className="bg-white/90 hover:bg-white text-destructive"
                >
                  <X className="h-5 w-5" />
                </Button>
              </div>
              <div className="absolute bottom-6 left-1/2 transform -translate-x-1/2">
                <Button
                  size="lg"
                  onClick={capture}
                  className="rounded-full w-16 h-16 bg-primary hover:bg-primary-dark shadow-lg"
                >
                  <Camera className="h-6 w-6" />
                </Button>
              </div>
            </>
          ) : (
            <>
              <img src={capturedImage} alt="Captured" className="w-full rounded-t-lg" />
              <div className="flex gap-3 p-4 bg-card">
                <Button
                  variant="outline"
                  onClick={handleRetake}
                  className="flex-1"
                >
                  Tirar Novamente
                </Button>
                <Button
                  onClick={handleConfirm}
                  className="flex-1 bg-gradient-to-r from-primary to-primary-dark"
                >
                  Confirmar Foto
                </Button>
              </div>
            </>
          )}
        </div>
      </Card>
    </div>
  );
};
