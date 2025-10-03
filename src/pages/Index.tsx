import React, { useState } from "react";
import { InspectionForm } from "@/components/InspectionForm";
import { InspectionHistory } from "@/components/InspectionHistory";
import { Separator } from "@/components/ui/separator";
import tecnoiso from "@/assets/tecnoiso-logo.png";
import labBackground from "@/assets/lab-background.jpg";

const Index = () => {
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  const handleSaved = () => {
    setRefreshTrigger((prev) => prev + 1);
  };

  return (
    <div className="min-h-screen bg-background relative">
      {/* Background Image with Overlay */}
      <div 
        className="fixed inset-0 z-0 bg-cover bg-center bg-no-repeat"
        style={{ backgroundImage: `url(${labBackground})` }}
      >
        <div className="absolute inset-0 bg-background/80 backdrop-blur-[2px]" />
      </div>

      <div className="container mx-auto px-4 py-8 max-w-7xl relative z-10">
        <header className="mb-8 text-center">
          <div className="flex items-center justify-center gap-4 mb-4">
            <img
              src={tecnoiso}
              alt="Tecnoiso"
              className="h-16 md:h-20 object-contain"
            />
          </div>
          <h1 className="text-4xl md:text-5xl font-bold text-foreground mb-2">
            REGISTROS FOTOGRÁFICOS
          </h1>
          <p className="text-muted-foreground text-lg">
            Sistema de Inspeção de Válvulas
          </p>
        </header>

        <div className="space-y-8">
          <InspectionForm onSaved={handleSaved} />

          <Separator className="my-8" />

          <InspectionHistory refreshTrigger={refreshTrigger} />
        </div>
      </div>
    </div>
  );
};

export default Index;
