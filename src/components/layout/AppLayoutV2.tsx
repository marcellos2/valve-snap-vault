import { ReactNode, useEffect, useRef, useState } from "react";
import { Home, History, FileText, Settings, Search, ChevronRight, ArrowRight, Clock, TrendingUp, Activity, Download, Images, Moon, Sun } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ThemeSettings } from "@/components/ThemeSettings";
import { loadInspectionHistory } from "@/lib/inspections-repo";
import { useNavigate } from "react-router-dom";
import logo from "@/assets/tecnoiso-logo.png.asset.json";
import reports from "@/assets/reports.png.asset.json";
import { cn } from "@/lib/utils";

interface AppLayoutV2Props {
  children: ReactNode;
  activeTab: "inspection" | "history" | "reports";
  onTabChange: (tab: "inspection" | "history" | "reports") => void;
  title: string;
  refreshTrigger?: number;
  onSearch?: (term: string) => void;
}

export const AppLayoutV2 = ({ children, activeTab, onTabChange, title, refreshTrigger, onSearch }: AppLayoutV2Props) => {
  const navigate = useNavigate();
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [metrics, setMetrics] = useState({ total: 0, pending: 0, complete: 0, latest: "—" });
  const [darkMode, setDarkMode] = useState(false);
  const searchRef = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (localStorage.getItem("referenceLayoutVersion") !== "v1") {
      localStorage.setItem("darkMode", "false");
      localStorage.setItem("referenceLayoutVersion", "v1");
      const saved = localStorage.getItem("themeConfig");
      if (saved) { try { const config = JSON.parse(saved); config.customSettings = { ...config.customSettings, darkMode: false }; localStorage.setItem("themeConfig", JSON.stringify(config)); } catch {} }
    }
    const dark = localStorage.getItem("darkMode") === "true";
    setDarkMode(dark);
    document.documentElement.classList.toggle("dark", dark);
  }, []);
  useEffect(() => {
    let cancelled = false;
    Promise.all([
      loadInspectionHistory({ page: 1, pageSize: 1, search: "", status: "all" }),
      loadInspectionHistory({ page: 1, pageSize: 1, search: "", status: "em_andamento" }),
      loadInspectionHistory({ page: 1, pageSize: 1, search: "", status: "concluido" }),
    ]).then(([all, pending, complete]) => {
      if (cancelled) return;
      const date = all.records[0]?.inspection_date;
      setMetrics({ total: all.total, pending: pending.total, complete: complete.total, latest: date ? new Date(date).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" }) : "—" });
    }).catch(() => {});
    return () => { cancelled = true; };
  }, [refreshTrigger]);
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if ((e.ctrlKey || e.metaKey) && e.key === "k") { e.preventDefault(); searchRef.current?.focus(); } };
    window.addEventListener("keydown", handler); return () => window.removeEventListener("keydown", handler);
  }, []);
  const nav = [{ label: "Início", icon: Home, value: "inspection" as const }, { label: "Histórico", icon: History, value: "history" as const }, { label: "Relatórios", icon: FileText, value: "reports" as const }];
  const toggleTheme = () => { const next = !darkMode; setDarkMode(next); document.documentElement.classList.toggle("dark", next); localStorage.setItem("darkMode", JSON.stringify(next)); };
  return (
    <div className="reference-app min-h-screen bg-background text-foreground">
      <aside className="reference-sidebar fixed inset-y-0 left-0 z-40 hidden lg:flex w-[226px] flex-col bg-header text-header-foreground">
        <Button variant="ghost" className="h-auto justify-start gap-3 px-6 py-5 hover:bg-header-foreground/5" onClick={() => onTabChange("inspection")}>
          <img src={logo.url} alt="Tecnoiso" className="h-14 w-14 rounded-xl object-cover" />
          <span className="text-left"><strong className="block text-xl">Tecnoiso</strong><span className="text-xs font-normal text-header-foreground/70">Sistema de Inspeção</span></span>
        </Button>
        <nav className="space-y-2 px-4 pt-4" aria-label="Menu principal">
          {nav.map(item => <Button key={item.value} variant="ghost" onClick={() => onTabChange(item.value)} className={cn("w-full justify-start h-11 gap-4 px-4 text-header-foreground/80 hover:bg-header-foreground/10 hover:text-header-foreground", activeTab === item.value && "reference-spectrum text-header-foreground")}><item.icon className="h-5 w-5" />{item.label}</Button>)}
          <Button variant="ghost" onClick={() => setSettingsOpen(true)} className="w-full justify-start h-11 gap-4 px-4 text-header-foreground/80 hover:bg-header-foreground/10"><Settings className="h-5 w-5" />Configurações</Button>
        </nav>
        <div className="sidebar-ribbon" aria-hidden="true" />
        <Button variant="ghost" className="mt-auto m-4 h-16 justify-start gap-3 text-header-foreground/80 hover:bg-header-foreground/10" onClick={() => navigate("/google-photos-sync")}><span className="flex h-10 w-10 items-center justify-center rounded-full bg-card text-foreground font-bold">T</span><span className="text-left text-xs">Tecnoiso<span className="block mt-1 text-header-foreground/50">Conta Google</span></span><ChevronRight className="ml-auto" /></Button>
      </aside>
      <div className="lg:ml-[226px] px-4 sm:px-6 pb-24 lg:pb-8">
        <header className="flex h-[68px] items-center justify-between gap-3">
          <form className="relative w-full max-w-[465px]" onSubmit={e => { e.preventDefault(); onSearch?.(search); }}>
            <Search className="absolute left-4 top-2.5 h-4 w-4 text-muted-foreground" /><Input ref={searchRef} aria-label="Buscar inspeções" value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar inspeções, válvulas ou códigos..." className="h-9 rounded-full bg-card/50 pl-11 pr-16 text-xs" /><span className="absolute right-4 top-2.5 text-[10px] text-muted-foreground hidden sm:block">Ctrl + K</span>
          </form>
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="icon" title="Diagnóstico" onClick={() => navigate("/diagnostico")}><Activity /></Button>
            <Button variant="ghost" size="icon" title="Google Drive" onClick={() => navigate("/google-photos-sync")}><Images /></Button>
            <Button variant="ghost" size="icon" title="Baixar aplicativo" onClick={() => navigate("/install")}><Download /></Button>
            <Button variant="ghost" size="icon" title="Alternar tema" onClick={toggleTheme}>{darkMode ? <Sun /> : <Moon />}</Button>
          </div>
        </header>
        {activeTab === "inspection" ? <>
          <section className="reference-banner relative flex items-center justify-between gap-6 overflow-hidden rounded-xl px-6 py-6 mb-4">
            <div className="relative z-10 max-w-md border-l-2 border-brand-pink pl-4"><p className="text-[10px] text-header-foreground/80 font-semibold mb-2">SISTEMA DE INSPEÇÃO DE VÁLVULAS</p><h1 className="text-[25px] leading-tight font-bold text-header-foreground">Mais <span className="text-brand-orange">segurança</span> e <span className="text-brand-pink">eficiência</span><br className="hidden xl:block" /> para o seu processo.</h1><p className="text-xs leading-relaxed text-header-foreground/80 mt-2">Realize inspeções, acompanhe o histórico e gere relatórios<br className="hidden xl:block" /> com agilidade e praticidade.</p></div>
            <Button variant="ghost" onClick={() => document.getElementById("inspection-photos")?.scrollIntoView({ behavior: "smooth", block: "start" })} className="reference-new h-auto min-w-0 w-[340px] shrink-0 justify-start gap-4 rounded-xl p-4 mr-[12%] bg-card/90 text-foreground hover:bg-card hidden xl:flex"><img src={logo.url} alt="" className="h-14 w-14 rounded-xl" /><span className="text-left"><strong className="block text-base">Nova Inspeção</strong><span className="text-xs font-normal text-muted-foreground">Iniciar inspeção de válvula</span></span><span className="ml-auto flex h-10 w-10 items-center justify-center rounded-full bg-brand-violet text-primary-foreground"><ArrowRight /></span></Button>
            <img src={logo.url} alt="" className="absolute right-2 h-40 w-40 object-contain opacity-15" />
          </section>
          <section className="grid grid-cols-2 xl:grid-cols-4 gap-4 mb-6" aria-label="Resumo de inspeções">
            {[{ label: "Inspeções realizadas", value: metrics.total, asset: logo.url, tab: "history" as const }, { label: "Pendentes", value: metrics.pending, icon: Clock, tone: "metric-orange", tab: "history" as const }, { label: "Inspeções concluídas", value: metrics.complete, icon: FileText, tone: "metric-violet", tab: "reports" as const }, { label: "Última inspeção", value: metrics.latest, icon: TrendingUp, tone: "metric-blue", tab: "history" as const }].map(item => <Button variant="ghost" key={item.label} className="reference-metric h-[92px] justify-start rounded-xl border border-border bg-card px-4 gap-4 hover:bg-muted" onClick={() => onTabChange(item.tab)}>{item.asset ? <img src={item.asset} alt="" className="h-12 w-12 rounded-xl" /> : <span className={cn("h-12 w-12 rounded-xl flex items-center justify-center shrink-0 text-primary-foreground", item.tone)}>{item.icon && <item.icon className="h-6 w-6" />}</span>}<span className="min-w-0 text-left"><strong className={cn("block", typeof item.value === "number" ? "text-xl" : "text-xs")}>{item.value}</strong><span className="block text-[11px] text-muted-foreground mt-1 whitespace-normal">{item.label}</span></span><ChevronRight className="ml-auto text-muted-foreground shrink-0" /></Button>)}
          </section>
          <div className="flex items-center justify-between mb-3"><h2 className="section-title text-xl font-bold">Inspeções de Válvulas</h2><Button variant="ghost" className="text-xs text-primary" onClick={() => onTabChange("history")}>Ver todas <ArrowRight className="h-4 w-4" /></Button></div>
        </> : <h1 className="text-2xl font-bold my-6">{title}</h1>}
        {children}
      </div>
      <nav className="lg:hidden fixed bottom-0 inset-x-0 z-50 flex justify-around border-t border-border bg-card p-2" aria-label="Navegação móvel">{nav.map(item => <Button key={item.value} variant="ghost" className={cn("flex-col h-14 text-xs gap-1", activeTab === item.value && "text-primary")} onClick={() => onTabChange(item.value)}><item.icon />{item.label}</Button>)}<Button variant="ghost" title="Configurações" onClick={() => setSettingsOpen(true)}><Settings /></Button></nav>
      <Dialog open={settingsOpen} onOpenChange={setSettingsOpen}><DialogContent className="max-w-4xl max-h-[85vh] overflow-y-auto"><DialogHeader><DialogTitle>Configurações</DialogTitle></DialogHeader><ThemeSettings /></DialogContent></Dialog>
    </div>
  );
};
