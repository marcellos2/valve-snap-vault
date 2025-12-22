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
      className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-300 group ${
        activeTab === value
          ? "bg-gradient-to-r from-red-600 to-red-700 dark:from-red-700 dark:to-red-800 text-white shadow-lg shadow-red-500/30 dark:shadow-red-900/50 scale-105"
          : "text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-white hover:scale-102"
      }`}
    >
      <Icon className={`w-5 h-5 transition-transform duration-300 ${activeTab === value ? 'scale-110' : 'group-hover:scale-110'}`} />
      <span className="font-medium">{label}</span>
    </button>
  );

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 transition-colors duration-300">
      {/* Header */}
      <header className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 sticky top-0 z-50 backdrop-blur-lg bg-opacity-90 dark:bg-opacity-90 shadow-sm">
        <div className="px-4 lg:px-6 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <button
                onClick={() => setSidebarOpen(!sidebarOpen)}
                className="lg:hidden p-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-800 rounded-xl transition-all duration-300"
              >
                {sidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
              </button>

              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gradient-to-br from-red-600 to-red-700 dark:from-red-700 dark:to-red-800 rounded-xl flex items-center justify-center shadow-lg shadow-red-500/30 dark:shadow-red-900/50 transition-all duration-300 hover:scale-110">
                  <ClipboardCheck className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h1 className="text-base font-bold text-gray-900 dark:text-white">Tecnoiso</h1>
                  <p className="text-xs text-gray-600 dark:text-gray-400 hidden sm:block">Sistema de Inspeção</p>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={() => setDarkMode(!darkMode)}
                className="p-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-800 rounded-xl transition-all duration-300"
              >
                {darkMode ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
              </button>
              
              <div className="hidden md:flex items-center gap-2 px-3 py-1.5 bg-green-50 dark:bg-green-950 rounded-xl border border-green-200 dark:border-green-800">
                <Activity className="w-4 h-4 text-green-600 dark:text-green-400 animate-pulse" />
                <span className="text-xs text-green-700 dark:text-green-300 font-medium">Online</span>
              </div>
              
              <div className="w-9 h-9 bg-gradient-to-br from-red-600 to-red-700 dark:from-red-700 dark:to-red-800 rounded-xl flex items-center justify-center cursor-pointer hover:scale-110 transition-all duration-300 shadow-lg shadow-red-500/30 dark:shadow-red-900/50">
                <User className="w-4 h-4 text-white" />
              </div>
            </div>
          </div>
        </div>
      </header>

      <div className="flex">
        {/* Sidebar */}
        <aside
          className={`fixed lg:sticky top-[57px] left-0 h-[calc(100vh-57px)] bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-800 transition-all duration-300 z-40 shadow-xl lg:shadow-none ${
            sidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
          } w-72`}
        >
          <nav className="p-4 space-y-2">
            <div className="mb-4">
              <h3 className="text-xs font-semibold text-gray-500 dark:text-gray-500 uppercase tracking-wider px-4 mb-2">Menu Principal</h3>
            </div>
            <NavButton icon={ClipboardCheck} label="Nova Inspeção" value="inspection" />
            <NavButton icon={History} label="Histórico" value="history" />
            <NavButton icon={FileText} label="Relatórios" value="reports" />
            <NavButton icon={Settings} label="Configurações" value="settings" />
          </nav>

          <div className="absolute bottom-4 left-4 right-4">
            <div className="bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-850 border border-gray-200 dark:border-gray-700 rounded-xl p-4 shadow-sm">
              <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Versão do Sistema</p>
              <p className="text-sm font-bold text-gray-900 dark:text-white">v2.0.0</p>
              <div className="mt-2 pt-2 border-t border-gray-200 dark:border-gray-700">
                <p className="text-xs text-gray-400 dark:text-gray-500">© 2024 Tecnoiso</p>
              </div>
            </div>
          </div>
        </aside>

        {/* Main content */}
        <main className="flex-1 p-4 lg:p-6 min-h-[calc(100vh-57px)] bg-gray-50 dark:bg-gray-950 transition-colors duration-300">
          <div className="max-w-7xl mx-auto">
            <div className="mb-6">
              <h2 className="text-3xl font-bold text-gray-900 dark:text-white bg-gradient-to-r from-red-600 to-red-700 dark:from-red-500 dark:to-red-600 bg-clip-text text-transparent">
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
          className="fixed inset-0 bg-black/50 dark:bg-black/70 z-30 lg:hidden backdrop-blur-sm transition-opacity duration-300"
          onClick={() => setSidebarOpen(false)}
        />
      )}
    </div>
  );
};