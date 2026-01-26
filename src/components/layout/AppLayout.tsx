import { ReactNode, useState, useEffect } from "react";
import { ClipboardCheck, History, FileText, Settings, Menu, X, User, Activity, Moon, Sun } from "lucide-react";
import { Button } from "@/components/ui/button";

interface AppLayoutProps {
  children: ReactNode;
  activeTab: "inspection" | "history" | "reports" | "settings";
  onTabChange: (tab: "inspection" | "history" | "reports" | "settings") => void;
  title: string;
}

export const AppLayout = ({ children, activeTab, onTabChange, title }: AppLayoutProps) => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [darkMode, setDarkMode] = useState(() => {
    const saved = localStorage.getItem('darkMode');
    return saved ? JSON.parse(saved) : true;
  });

  useEffect(() => {
    localStorage.setItem('darkMode', JSON.stringify(darkMode));
    if (darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [darkMode]);

  const NavButton = ({ icon: Icon, label, value }: { icon: any; label: string; value: string }) => (
    <button
      onClick={() => {
        onTabChange(value as any);
        setSidebarOpen(false);
      }}
      className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 group ${
        activeTab === value
          ? "bg-primary text-primary-foreground shadow-lg"
          : "text-muted-foreground hover:bg-muted hover:text-foreground"
      }`}
    >
      <Icon className={`w-5 h-5 transition-transform duration-200 ${activeTab === value ? 'scale-110' : 'group-hover:scale-105'}`} />
      <span className="font-medium">{label}</span>
    </button>
  );

  return (
    <div className="min-h-screen bg-background transition-colors duration-200">
      {/* Header */}
      <header className="bg-card border-b border-border sticky top-0 z-50 shadow-sm">
        <div className="px-4 lg:px-6 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <button
                onClick={() => setSidebarOpen(!sidebarOpen)}
                className="lg:hidden p-2 text-muted-foreground hover:text-foreground hover:bg-muted rounded-xl transition-all duration-200"
              >
                {sidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
              </button>

              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-primary rounded-xl flex items-center justify-center shadow-lg transition-all duration-200 hover:scale-105">
                  <ClipboardCheck className="w-5 h-5 text-primary-foreground" />
                </div>
                <div>
                  <h1 className="text-base font-bold text-foreground">Tecnoiso</h1>
                  <p className="text-xs text-muted-foreground hidden sm:block">Sistema de Inspeção</p>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setDarkMode(!darkMode)}
                className="rounded-xl"
              >
                {darkMode ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
              </Button>
              
              <div className="hidden md:flex items-center gap-2 px-3 py-1.5 bg-green-500/10 rounded-xl border border-green-500/20">
                <Activity className="w-4 h-4 text-green-600 dark:text-green-400 animate-pulse" />
                <span className="text-xs text-green-700 dark:text-green-300 font-medium">Online</span>
              </div>
              
              <div className="w-9 h-9 bg-primary rounded-xl flex items-center justify-center cursor-pointer hover:scale-105 transition-all duration-200 shadow-lg">
                <User className="w-4 h-4 text-primary-foreground" />
              </div>
            </div>
          </div>
        </div>
      </header>

      <div className="flex">
        {/* Sidebar */}
        <aside
          className={`fixed lg:sticky top-[57px] left-0 h-[calc(100vh-57px)] bg-card border-r border-border transition-all duration-200 z-40 shadow-xl lg:shadow-none ${
            sidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
          } w-72`}
        >
          <nav className="p-4 space-y-2">
            <div className="mb-4">
              <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider px-4 mb-2">Menu Principal</h3>
            </div>
            <NavButton icon={ClipboardCheck} label="Nova Inspeção" value="inspection" />
            <NavButton icon={History} label="Histórico" value="history" />
            <NavButton icon={FileText} label="Relatórios" value="reports" />
            <NavButton icon={Settings} label="Configurações" value="settings" />
          </nav>

          <div className="absolute bottom-4 left-4 right-4">
            <div className="bg-muted border border-border rounded-xl p-4">
              <p className="text-xs text-muted-foreground mb-1">Versão do Sistema</p>
              <p className="text-sm font-bold text-foreground">v2.0.0</p>
              <div className="mt-2 pt-2 border-t border-border">
                <p className="text-xs text-muted-foreground">© 2025 Tecnoiso</p>
              </div>
            </div>
          </div>
        </aside>

        {/* Main content */}
        <main className="flex-1 p-4 lg:p-6 min-h-[calc(100vh-57px)] bg-background transition-colors duration-200">
          <div className="max-w-7xl mx-auto">
            <div className="mb-6">
              <h2 className="text-2xl lg:text-3xl font-bold text-primary">
                {title}
              </h2>
            </div>
            {children}
          </div>
        </main>
      </div>

      {/* Overlay para mobile */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-background/80 backdrop-blur-sm z-30 lg:hidden transition-opacity duration-200"
          onClick={() => setSidebarOpen(false)}
        />
      )}
    </div>
  );
};
