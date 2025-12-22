import { useState, ReactNode } from "react";
import { AppSidebar } from "./AppSidebar";
import { AppHeader } from "./AppHeader";
import { cn } from "@/lib/utils";

interface AppLayoutProps {
  children: ReactNode;
  activeTab: "inspection" | "history" | "reports" | "settings";
  onTabChange: (tab: "inspection" | "history" | "reports" | "settings") => void;
  title: string;
}

export const AppLayout = ({ children, activeTab, onTabChange, title }: AppLayoutProps) => {
  return (
    <div className="min-h-screen bg-background">
      <AppSidebar activeTab={activeTab} onTabChange={onTabChange} />
      
      <div className="ml-56 flex flex-col min-h-screen transition-all duration-300">
        <AppHeader title={title} />
        
        <main className="flex-1 p-6 overflow-auto scrollbar-thin">
          {children}
        </main>
      </div>
    </div>
  );
};