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
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleCancelEdit = () => {
    setEditingRecord(null);
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border/50 bg-card/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <img
              src={tecnoiso}
              alt="Tecnoiso"
              className="h-10 md:h-12 object-contain brightness-0 invert opacity-90"
            />
            <div className="text-right">
              <h1 className="text-lg md:text-xl font-display font-semibold text-foreground">
                Registros Fotográficos
              </h1>
              <p className="text-xs md:text-sm text-muted-foreground">
                Sistema de Inspeção
              </p>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        <div className="max-w-6xl mx-auto space-y-8">
          {/* Form Section */}
          <section className="animate-fade-up">
            <InspectionForm 
              onSaved={handleSaved} 
              editingRecord={editingRecord}
              onCancelEdit={handleCancelEdit}
            />
          </section>

          {/* Divider */}
          <div className="flex items-center gap-4 py-4">
            <div className="flex-1 h-px bg-gradient-to-r from-transparent via-border to-transparent" />
            <span className="text-xs text-muted-foreground uppercase tracking-widest">Histórico</span>
            <div className="flex-1 h-px bg-gradient-to-r from-transparent via-border to-transparent" />
          </div>

          {/* History Section */}
          <section className="animate-fade-up delay-200">
            <InspectionHistory 
              refreshTrigger={refreshTrigger}
              onEditRecord={handleEditRecord}
            />
          </section>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-border/30 py-6 mt-12">
        <div className="container mx-auto px-4">
          <p className="text-center text-xs text-muted-foreground">
            © {new Date().getFullYear()} Tecnoiso — Sistema de Inspeção de Válvulas
          </p>
        </div>
      </footer>
    </div>
  );
};

export default Index;
