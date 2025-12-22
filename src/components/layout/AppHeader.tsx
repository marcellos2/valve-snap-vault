import { Circle } from "lucide-react";

interface AppHeaderProps {
  title: string;
  sidebarCollapsed?: boolean;
}

export const AppHeader = ({ title, sidebarCollapsed = false }: AppHeaderProps) => {
  return (
    <header className="h-14 bg-card border-b border-border flex items-center justify-between px-6">
      <div className="flex items-center gap-4">
        <h1 className="text-lg font-semibold text-foreground">{title}</h1>
      </div>
      
      <div className="flex items-center gap-6">
        <div className="flex items-center gap-2">
          <Circle className="h-2.5 w-2.5 fill-green-500 text-green-500" />
          <span className="text-sm text-muted-foreground">Online</span>
        </div>
      </div>
    </header>
  );
};