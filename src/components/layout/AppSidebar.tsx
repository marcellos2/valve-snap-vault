import { useState } from "react";
import { cn } from "@/lib/utils";
import { 
  ClipboardList, 
  History, 
  FileText, 
  Settings,
  ChevronLeft,
  ChevronRight
} from "lucide-react";
import tecnoiso from "@/assets/tecnoiso-logo.png";

interface AppSidebarProps {
  activeTab: "inspection" | "history" | "reports" | "settings";
  onTabChange: (tab: "inspection" | "history" | "reports" | "settings") => void;
}

const menuItems = [
  { id: "inspection" as const, label: "Nova Inspeção", icon: ClipboardList },
  { id: "history" as const, label: "Histórico", icon: History },
  { id: "reports" as const, label: "Relatórios", icon: FileText },
  { id: "settings" as const, label: "Configurações", icon: Settings },
];

export const AppSidebar = ({ activeTab, onTabChange }: AppSidebarProps) => {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <aside 
      className={cn(
        "fixed left-0 top-0 h-full bg-sidebar z-50 flex flex-col transition-all duration-300 border-r border-sidebar-border",
        collapsed ? "w-16" : "w-56"
      )}
    >
      {/* Logo */}
      <div className="h-16 flex items-center justify-center border-b border-sidebar-border px-4">
        {collapsed ? (
          <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
            <span className="text-primary-foreground font-bold text-sm">T</span>
          </div>
        ) : (
          <img 
            src={tecnoiso} 
            alt="Tecnoiso" 
            className="h-10 object-contain brightness-0 invert"
          />
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 py-4 px-2">
        <div className={cn("mb-4", collapsed && "hidden")}>
          <span className="px-3 text-[10px] font-semibold uppercase tracking-wider text-sidebar-muted">
            Menu
          </span>
        </div>
        
        <ul className="space-y-1">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            
            return (
              <li key={item.id}>
                <button
                  onClick={() => onTabChange(item.id)}
                  className={cn(
                    "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all text-sm",
                    isActive 
                      ? "bg-sidebar-primary text-sidebar-primary-foreground" 
                      : "text-sidebar-foreground hover:bg-sidebar-accent"
                  )}
                  title={collapsed ? item.label : undefined}
                >
                  <Icon className="h-5 w-5 flex-shrink-0" />
                  {!collapsed && <span>{item.label}</span>}
                </button>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* Collapse Toggle */}
      <div className="p-2 border-t border-sidebar-border">
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-sidebar-muted hover:bg-sidebar-accent hover:text-sidebar-foreground transition-colors text-sm"
        >
          {collapsed ? (
            <ChevronRight className="h-4 w-4" />
          ) : (
            <>
              <ChevronLeft className="h-4 w-4" />
              <span>Recolher</span>
            </>
          )}
        </button>
      </div>

      {/* Version */}
      {!collapsed && (
        <div className="px-4 py-3 text-[10px] text-sidebar-muted border-t border-sidebar-border">
          <p>© 2024 Tecnoiso</p>
          <p>v1.0.0</p>
        </div>
      )}
    </aside>
  );
};