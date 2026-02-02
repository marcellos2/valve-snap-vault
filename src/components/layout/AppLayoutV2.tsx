import { ReactNode, useState, useEffect } from "react";
import { ClipboardCheck, History, FileText, Settings, Moon, Sun, Download, Plus, Zap } from "lucide-react";
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
    { icon: ClipboardCheck, label: "Nova Inspeção", value: "inspection" as const, description: "Iniciar inspeção", gradient: "from-primary to-primary-dark" },
    { icon: History, label: "Histórico", value: "history" as const, description: "Ver registros", gradient: "from-orange-500 to-red-600" },
    { icon: FileText, label: "Relatórios", value: "reports" as const, description: "Gerar relatórios", gradient: "from-blue-500 to-indigo-600" },
    { icon: Settings, label: "Configurações", value: "settings" as const, description: "Ajustes do sistema", gradient: "from-gray-500 to-gray-700" },
  ];

  return (
    <div className="min-h-screen bg-background transition-colors duration-500 relative overflow-hidden">
      {/* Background effects */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-primary/5 rounded-full blur-3xl animate-float" />
        <div className="absolute bottom-1/4 right-0 w-80 h-80 bg-primary/3 rounded-full blur-3xl animate-float" style={{ animationDelay: '-3s' }} />
      </div>

      {/* Header */}
      <header className="relative z-20">
        {/* Curved background */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-primary via-primary to-red-700">
            {/* Noise texture */}
            <div className="absolute inset-0 opacity-30 mix-blend-soft-light noise-overlay" />
            
            {/* Decorative elements */}
            <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full blur-3xl translate-x-1/2 -translate-y-1/2" />
            <div className="absolute bottom-0 left-0 w-48 h-48 bg-black/10 rounded-full blur-2xl -translate-x-1/4 translate-y-1/4" />
            
            {/* Grid pattern */}
            <div className="absolute inset-0 opacity-5" style={{
              backgroundImage: 'linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)',
              backgroundSize: '40px 40px'
            }} />
          </div>
          
          {/* Curved bottom */}
          <svg 
            viewBox="0 0 1440 120" 
            className="absolute -bottom-1 left-0 right-0 w-full h-12 sm:h-16 fill-background"
            preserveAspectRatio="none"
          >
            <path d="M0,80 C360,120 1080,40 1440,80 L1440,120 L0,120 Z" />
          </svg>
        </div>

        <div className="relative z-10 px-4 pt-4 pb-14 sm:pb-16">
          {/* Top bar */}
          <div className="flex items-center justify-between mb-6 animate-slide-down">
            <div className="flex items-center gap-3">
              <div className="relative">
                <div className="absolute inset-0 bg-white/20 rounded-xl blur-md" />
                <img 
                  src="/logo-192.png" 
                  alt="Tecnoiso" 
                  className="relative w-11 h-11 object-contain" 
                />
              </div>
              <div>
                <h1 className="text-lg font-bold text-white tracking-tight">Tecnoiso</h1>
                <p className="text-xs text-white/60 font-medium">Sistema de Inspeção</p>
              </div>
            </div>

            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => navigate("/install")}
                className="text-white/80 hover:text-white hover:bg-white/10 rounded-xl h-10 w-10 transition-all duration-300"
              >
                <Download className="w-5 h-5" />
              </Button>
              
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setDarkMode(!darkMode)}
                className="text-white/80 hover:text-white hover:bg-white/10 rounded-xl h-10 w-10 transition-all duration-300"
              >
                {darkMode ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
              </Button>
            </div>
          </div>

          {/* Title section */}
          <div className="text-center animate-fade-in">
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-white/10 backdrop-blur-sm rounded-full text-white/80 text-xs font-medium mb-3 border border-white/10">
              <Zap className="w-3 h-3" />
              Sistema ativo
            </div>
            <h2 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
              {title}
            </h2>
            <p className="text-sm text-white/60 mt-1.5 font-medium">
              Gerencie suas inspeções com eficiência
            </p>
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="relative z-10 px-4 -mt-2 pb-28">
        {/* Quick actions - only on inspection tab */}
        {activeTab === "inspection" && (
          <div className="grid grid-cols-2 gap-3 mb-6 stagger-children">
            {menuItems.map((item) => (
              <button
                key={item.value}
                onClick={() => onTabChange(item.value)}
                className={cn(
                  "group relative flex flex-col items-center justify-center p-5 rounded-2xl transition-all duration-300",
                  "hover:scale-[1.02] active:scale-[0.98] will-change-transform",
                  activeTab === item.value
                    ? "bg-gradient-to-br from-primary to-red-700 text-white shadow-xl shadow-primary/25"
                    : "premium-card glow-hover"
                )}
              >
                {/* Glow effect for active */}
                {activeTab === item.value && (
                  <div className="absolute inset-0 bg-gradient-to-br from-primary to-red-700 rounded-2xl blur-xl opacity-40 -z-10" />
                )}

                <div className={cn(
                  "w-14 h-14 rounded-2xl flex items-center justify-center mb-3 transition-all duration-300",
                  activeTab === item.value
                    ? "bg-white/20 backdrop-blur-sm"
                    : "bg-primary/10 group-hover:bg-primary/15 group-hover:scale-105"
                )}>
                  <item.icon className={cn(
                    "w-7 h-7 transition-colors duration-300",
                    activeTab === item.value ? "text-white" : "text-primary"
                  )} />
                </div>
                <span className={cn(
                  "font-semibold text-sm transition-colors",
                  activeTab === item.value ? "text-white" : "text-foreground"
                )}>
                  {item.label}
                </span>
                <span className={cn(
                  "text-xs mt-1 transition-colors",
                  activeTab === item.value ? "text-white/70" : "text-muted-foreground"
                )}>
                  {item.description}
                </span>
              </button>
            ))}
          </div>
        )}

        {/* Content area */}
        <div className="animate-fade-in">
          {children}
        </div>
      </main>

      {/* Bottom Navigation - Glass effect */}
      <nav className="fixed bottom-0 left-0 right-0 z-50">
        <div className="mx-3 mb-3 sm:mx-auto sm:max-w-md">
          <div className="glass-card rounded-2xl px-2 py-2 shadow-xl shadow-black/10">
            <div className="flex items-center justify-around">
              {menuItems.map((item) => (
                <button
                  key={item.value}
                  onClick={() => onTabChange(item.value)}
                  className={cn(
                    "nav-pill flex flex-col items-center justify-center py-2 px-3 min-w-[60px] transition-all duration-300",
                    activeTab === item.value ? "active" : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  <div className={cn(
                    "relative transition-all duration-300",
                    activeTab === item.value && "scale-110"
                  )}>
                    <item.icon className={cn(
                      "w-5 h-5 transition-colors duration-300",
                      activeTab === item.value ? "text-primary" : ""
                    )} />
                    {activeTab === item.value && (
                      <div className="absolute -inset-2 bg-primary/20 rounded-full blur-md -z-10" />
                    )}
                  </div>
                  <span className={cn(
                    "text-[10px] mt-1.5 font-medium transition-colors duration-300",
                    activeTab === item.value ? "text-primary" : ""
                  )}>
                    {item.label}
                  </span>
                </button>
              ))}
            </div>
          </div>
        </div>
      </nav>

      {/* FAB - Floating Action Button */}
      {activeTab !== "inspection" && (
        <button
          onClick={() => onTabChange("inspection")}
          className={cn(
            "fixed bottom-24 right-4 z-50 w-14 h-14 rounded-full",
            "bg-gradient-to-br from-primary to-red-700 text-white",
            "shadow-lg shadow-primary/40 hover:shadow-xl hover:shadow-primary/50",
            "flex items-center justify-center",
            "hover:scale-110 active:scale-95 transition-all duration-300",
            "animate-scale-in"
          )}
        >
          <div className="absolute inset-0 bg-gradient-to-br from-primary to-red-700 rounded-full blur-lg opacity-50 animate-pulse-soft" />
          <Plus className="w-6 h-6 relative z-10" />
        </button>
      )}
    </div>
  );
};
