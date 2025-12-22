import { useState } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { InspectionForm } from "@/components/InspectionForm";
import { InspectionHistory } from "@/components/InspectionHistory";
import { FileText, Settings as SettingsIcon, Sparkles } from "lucide-react";

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
          <div className="bg-white dark:bg-gray-900 rounded-2xl p-16 border-2 border-gray-200 dark:border-gray-800 text-center shadow-xl animate-fade-in">
            <div className="max-w-md mx-auto">
              <div className="relative mx-auto w-24 h-24 mb-6">
                <div className="absolute inset-0 bg-gradient-to-br from-red-600 to-red-700 dark:from-red-700 dark:to-red-800 rounded-2xl animate-pulse"></div>
                <div className="relative w-full h-full bg-gradient-to-br from-red-600 to-red-700 dark:from-red-700 dark:to-red-800 rounded-2xl flex items-center justify-center shadow-2xl shadow-red-500/30 dark:shadow-red-900/50 transform hover:scale-110 transition-all duration-300">
                  <FileText className="w-12 h-12 text-white" />
                </div>
              </div>
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-3 flex items-center justify-center gap-2">
                <Sparkles className="h-5 w-5 text-red-600 dark:text-red-500" />
                Relatórios
              </h2>
              <p className="text-gray-600 dark:text-gray-400 text-base leading-relaxed">
                Em breve você poderá gerar relatórios detalhados das suas inspeções
              </p>
              <div className="mt-6 inline-block px-4 py-2 bg-red-50 dark:bg-red-950/20 border-2 border-red-200 dark:border-red-800 rounded-xl text-sm text-red-700 dark:text-red-400 font-medium">
                🚀 Em desenvolvimento
              </div>
            </div>
          </div>
        );
      case "settings":
        return (
          <div className="bg-white dark:bg-gray-900 rounded-2xl p-16 border-2 border-gray-200 dark:border-gray-800 text-center shadow-xl animate-fade-in">
            <div className="max-w-md mx-auto">
              <div className="relative mx-auto w-24 h-24 mb-6">
                <div className="absolute inset-0 bg-gradient-to-br from-red-600 to-red-700 dark:from-red-700 dark:to-red-800 rounded-2xl animate-pulse"></div>
                <div className="relative w-full h-full bg-gradient-to-br from-red-600 to-red-700 dark:from-red-700 dark:to-red-800 rounded-2xl flex items-center justify-center shadow-2xl shadow-red-500/30 dark:shadow-red-900/50 transform hover:scale-110 transition-all duration-300">
                  <SettingsIcon className="w-12 h-12 text-white" />
                </div>
              </div>
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-3 flex items-center justify-center gap-2">
                <Sparkles className="h-5 w-5 text-red-600 dark:text-red-500" />
                Configurações
              </h2>
              <p className="text-gray-600 dark:text-gray-400 text-base leading-relaxed">
                Personalize o sistema de acordo com suas necessidades
              </p>
              <div className="mt-6 inline-block px-4 py-2 bg-red-50 dark:bg-red-950/20 border-2 border-red-200 dark:border-red-800 rounded-xl text-sm text-red-700 dark:text-red-400 font-medium">
                🚀 Em desenvolvimento
              </div>
            </div>
          </div>
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