import { useState, useEffect } from "react";
import { AppLayoutV2 } from "@/components/layout/AppLayoutV2";
import { InspectionForm } from "@/components/InspectionForm";
import { InspectionHistory } from "@/components/InspectionHistory";
import { InspectionReports } from "@/components/InspectionReports";
import { ThemeSettings, applyTheme } from "@/components/ThemeSettings";

const Index = () => {
  const [activeTab, setActiveTab] = useState<"inspection" | "history" | "reports" | "settings">("inspection");
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [editingRecord, setEditingRecord] = useState<any>(null);

  useEffect(() => {
    applyTheme();
  }, []);

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
        return <InspectionReports />;
      case "settings":
        return <ThemeSettings />;
    }
  };

  return (
    <AppLayoutV2 
      activeTab={activeTab} 
      onTabChange={setActiveTab}
      title={getTitle()}
    >
      {renderContent()}
    </AppLayoutV2>
  );
};

export default Index;
