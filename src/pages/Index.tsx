import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Image as ImageIcon } from "lucide-react";
import { AppLayoutV2 } from "@/components/layout/AppLayoutV2";
import { InspectionForm } from "@/components/InspectionForm";
import { InspectionHistory } from "@/components/InspectionHistory";
import { InspectionReports } from "@/components/InspectionReports";
import { applyTheme } from "@/components/ThemeSettings";

const Index = () => {
  const [activeTab, setActiveTab] = useState<"inspection" | "history" | "reports">("inspection");
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
    }
  };

  return (
    <AppLayoutV2 
      activeTab={activeTab} 
      onTabChange={setActiveTab}
      title={getTitle()}
    >
      {renderContent()}
      <Link
        to="/google-photos-sync"
        className="fixed bottom-24 right-4 z-40 flex items-center gap-2 rounded-full bg-primary text-primary-foreground shadow-lg px-4 py-3 text-sm font-medium hover:opacity-90"
        aria-label="Abrir Google Photos Sync"
      >
        <ImageIcon className="h-4 w-4" /> Google Photos
      </Link>
    </AppLayoutV2>
  );
};

export default Index;
