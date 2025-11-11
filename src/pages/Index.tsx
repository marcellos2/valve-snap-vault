import React, { useState } from "react";
import { InspectionForm } from "@/components/InspectionForm";
import { InspectionHistory } from "@/components/InspectionHistory";
import tecnoiso from "@/assets/tecnoiso-logo.png";

const Index = () => {
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [editingRecord, setEditingRecord] = useState<any>(null);

  const handleSaved = () => {
    setRefreshTrigger((prev) => prev + 1);
    setEditingRecord(null);
  };

  const handleEditRecord = (record: any) => {
    setEditingRecord(record);
    // Scroll suave para o formulário
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleCancelEdit = () => {
    setEditingRecord(null);
  };

  return (
    <div className="min-h-screen bg-black">
      <div className="container mx-auto px-6 py-12 max-w-[1400px]">
        <header className="mb-16 text-center space-y-6">
          <img
            src={tecnoiso}
            alt="Tecnoiso"
            className="h-12 mx-auto object-contain opacity-90"
          />
          <div className="space-y-3">
            <h1 className="text-5xl md:text-6xl font-light tracking-wider text-white">
              REGISTROS FOTOGRÁFICOS
            </h1>
            <p className="text-sm tracking-widest text-white/50 uppercase">
              Sistema de Inspeção de Válvulas
            </p>
          </div>
        </header>

        <div className="space-y-20">
          <InspectionForm 
            onSaved={handleSaved} 
            editingRecord={editingRecord}
            onCancelEdit={handleCancelEdit}
          />

          <div className="border-t border-white/5" />

          <InspectionHistory 
            refreshTrigger={refreshTrigger}
            onEditRecord={handleEditRecord}
          />
        </div>
      </div>
    </div>
  );
};

export default Index;
