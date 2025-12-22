import { useState } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { InspectionForm } from "@/components/InspectionForm";
import { InspectionHistory } from "@/components/InspectionHistory";
import { Card } from "@/components/ui/card";
import { FileText, Settings as SettingsIcon } from "lucide-react";

const Index = () => {
  const [activeTab, setActiveTab] = useState<"inspection" | "history" | "reports" | "settings">("inspection");
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [editingRecord, setEditingRecord] = useState<any>(null);

  const handleSaved = () => {
    setRefreshTrigger((prev) => prev + 1);
    setEditingRecord(null);
  };

  const handleEditRecord = (record: any) => {
    setEditingRecord(record);
    setActiveTab("inspection");
  };

  const handleCancelEdit = () => {
    setEditingRecord(null);
  };

  const getTitle = () => {
    switch (activeTab) {
      case "inspection": return editingRecord ? "Editar Inspeção" : "Nova Inspeção";
      case "history": return "Histórico de Inspeções";
      case "reports": return "Relatórios";
      case "settings": return "Configurações";
    }
  };

  const renderContent = () => {
    switch (activeTab) {
      case "inspection":
        return (
          <InspectionForm 
            onSaved={handleSaved} 
            editingRecord={editingRecord}
            onCancelEdit={handleCancelEdit}
          />
        );
      case "history":
        return (
          <InspectionHistory 
            refreshTrigger={refreshTrigger}
            onEditRecord={handleEditRecord}
          />
        );
      case "reports":
        return (
          <Card className="p-12 text-center">
            <FileText className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
            <h2 className="text-xl font-semibold mb-2">Relatórios</h2>
            <p className="text-muted-foreground">
              Funcionalidade em desenvolvimento
            </p>
          </Card>
        );
      case "settings":
        return (
          <Card className="p-12 text-center">
            <SettingsIcon className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
            <h2 className="text-xl font-semibold mb-2">Configurações</h2>
            <p className="text-muted-foreground">
              Funcionalidade em desenvolvimento
            </p>
          </Card>
        );
    }
  };

  return (
    <AppLayout 
      activeTab={activeTab} 
      onTabChange={setActiveTab}
      title={getTitle()}
    >
      {renderContent()}
    </AppLayout>
  );
};

export default Index;