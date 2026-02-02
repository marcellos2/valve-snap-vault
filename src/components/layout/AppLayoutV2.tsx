import { ReactNode, useState, useEffect } from "react";
import { ClipboardCheck, History, FileText, Settings, Menu, X, Moon, Sun, Download, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";

interface AppLayoutV2Props {
  children: ReactNode;
  activeTab: "inspection" | "history" | "reports" | "settings";
  onTabChange: (tab: "inspection" | "history" | "reports" | "settings") => void;
  title: string;
}

export const AppLayoutV2 = ({ children, activeTab, onTabChange, title }: AppLayoutV2Props) => {
  const [darkMode, setDarkMode] = useState(() => {
    const saved = localStorage.getItem('darkMode');
    return saved ? JSON.parse(saved) : true;
  });
  const navigate = useNavigate();

  useEffect(() => {
    localStorage.setItem('darkMode', JSON.stringify(darkMode));
    if (darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [darkMode]);

  const menuItems = [
    { icon: ClipboardCheck, label: "Nova Inspeção", value: "inspection" as const, description: "Iniciar inspeção" },
    { icon: History, label: "Histórico", value: "history" as const, description: "Ver registros" },
    { icon: FileText, label: "Relatórios", value: "reports" as const, description: "Gerar relatórios" },
    { icon: Settings, label: "Configurações", value: "settings" as const, description: "Ajustes" },
  ];

  return (
    <div className="min-h-screen bg-background transition-colors duration-300">
      {/* Curved Header */}
      <header className="relative">
        {/* Background with curve */}
        <div className="absolute inset-0 bg-gradient-to-br from-primary via-primary to-destructive overflow-hidden">
          <div className="absolute -bottom-1 left-0 right-0">
            <svg viewBox="0 0 1440 120" className="w-full h-16 fill-background">
              <path d="M0,64L48,69.3C96,75,192,85,288,90.7C384,96,480,96,576,85.3C672,75,768,53,864,48C960,43,1056,53,1152,58.7C1248,64,1344,64,1392,64L1440,64L1440,120L1392,120C1344,120,1248,120,1152,120C1056,120,960,120,864,120C768,120,672,120,576,120C480,120,384,120,288,120C192,120,96,120,48,120L0,120Z"></path>
            </svg>
          </div>
          {/* Decorative circles */}
          <div className="absolute top-4 right-8 w-32 h-32 bg-white/5 rounded-full blur-xl" />
          <div className="absolute -top-8 -left-8 w-48 h-48 bg-black/10 rounded-full blur-2xl" />
        </div>

        <div className="relative z-10 px-4 pt-4 pb-16">
          {/* Top bar */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <img 
                src="/logo-192.png" 
                alt="Tecnoiso" 
                className="w-10 h-10 object-contain" 
              />
              <div>
                <h1 className="text-lg font-bold text-white">Tecnoiso</h1>
                <p className="text-xs text-white/70">Sistema de Inspeção</p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => navigate("/install")}
                className="text-white hover:bg-white/10 rounded-xl"
              >
                <Download className="w-5 h-5" />
              </Button>
              
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setDarkMode(!darkMode)}
                className="text-white hover:bg-white/10 rounded-xl"
              >
                {darkMode ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
              </Button>
            </div>
          </div>

          {/* Welcome text */}
          <div className="text-center">
            <h2 className="text-xl font-semibold text-white">
              {title}
            </h2>
            <p className="text-sm text-white/70 mt-1">
              Gerencie suas inspeções
            </p>
          </div>
        </div>
      </header>

      {/* Main content area */}
      <main className="px-4 -mt-4 pb-24">
        {/* Quick actions grid - only show on main views */}
        {activeTab === "inspection" && (
          <div className="grid grid-cols-2 gap-3 mb-6 animate-fade-in">
            {menuItems.map((item) => (
              <button
                key={item.value}
                onClick={() => onTabChange(item.value)}
                className={cn(
                  "flex flex-col items-center justify-center p-5 rounded-2xl transition-all duration-200 border",
                  "hover:scale-[1.02] active:scale-[0.98]",
                  activeTab === item.value
                    ? "bg-primary text-primary-foreground border-primary shadow-lg shadow-primary/20"
                    : "bg-card text-foreground border-border hover:border-primary/50 hover:shadow-md"
                )}
              >
                <div className={cn(
                  "w-12 h-12 rounded-xl flex items-center justify-center mb-3 transition-colors",
                  activeTab === item.value
                    ? "bg-white/20"
                    : "bg-primary/10"
                )}>
                  <item.icon className={cn(
                    "w-6 h-6",
                    activeTab === item.value ? "text-white" : "text-primary"
                  )} />
                </div>
                <span className="font-medium text-sm">{item.label}</span>
                <span className={cn(
                  "text-xs mt-1",
                  activeTab === item.value ? "text-white/70" : "text-muted-foreground"
                )}>
                  {item.description}
                </span>
              </button>
            ))}
          </div>
        )}

        {/* Content */}
        <div className="animate-fade-in">
          {children}
        </div>
      </main>

      {/* Bottom Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 bg-card border-t border-border px-2 py-2 z-50">
        <div className="flex items-center justify-around max-w-lg mx-auto">
          {menuItems.map((item) => (
            <button
              key={item.value}
              onClick={() => onTabChange(item.value)}
              className={cn(
                "flex flex-col items-center justify-center py-2 px-4 rounded-xl transition-all duration-200",
                activeTab === item.value
                  ? "text-primary"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <div className={cn(
                "relative p-2 rounded-xl transition-all duration-200",
                activeTab === item.value && "bg-primary/10"
              )}>
                <item.icon className="w-5 h-5" />
                {activeTab === item.value && (
                  <div className="absolute -top-1 -right-1 w-2 h-2 bg-primary rounded-full animate-pulse" />
                )}
              </div>
              <span className="text-xs mt-1 font-medium">{item.label}</span>
            </button>
          ))}
        </div>
      </nav>

      {/* FAB for new inspection */}
      {activeTab !== "inspection" && (
        <button
          onClick={() => onTabChange("inspection")}
          className="fixed bottom-20 right-4 w-14 h-14 bg-primary text-primary-foreground rounded-full shadow-lg shadow-primary/30 flex items-center justify-center hover:scale-110 active:scale-95 transition-transform z-50"
        >
          <Plus className="w-6 h-6" />
        </button>
      )}
    </div>
  );
};
