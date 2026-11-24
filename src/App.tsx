import { useEffect } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Index from "./pages/Index";
import Install from "./pages/Install";
import Diagnostico from "./pages/Diagnostico";
import NotFound from "./pages/NotFound";
import { PWAUpdateNotifier } from "@/components/PWAUpdateNotifier";
import { OfflineIndicator } from "@/components/OfflineIndicator";

const queryClient = new QueryClient();

const App = () => {
  useEffect(() => {
    localStorage.removeItem("google_photos_session_v1");
    sessionStorage.removeItem("google_photos_session_v1");
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <PWAUpdateNotifier />
        <OfflineIndicator />
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/install" element={<Install />} />
            <Route path="/diagnostico" element={<Diagnostico />} />
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  );
};

export default App;
