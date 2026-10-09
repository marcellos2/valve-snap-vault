import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Check, RotateCcw, Palette, Sparkles, Eye, Download, Upload, Copy, Sun, Moon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";

interface ThemeConfig {
  themeId: string;
  customColors?: {
    primary?: string;
    dark?: string;
    glow?: string;
  };
  customSettings?: {
    fontSize?: number;
    borderRadius?: number;
    animations?: boolean;
    glassEffect?: boolean;
    compactMode?: boolean;
    darkMode?: boolean;
    accentColor?: string;
    fontFamily?: string;
    spacing?: number;
    shadowIntensity?: number;
  };
}

interface ThemePreset {
  id: string;
  name: string;
  description: string;
  category: "classic" | "modern" | "minimal" | "vibrant";
  primary: string;
  dark: string;
  glow: string;
  accent: string;
  fontSize: number;
  borderRadius: number;
  animations: boolean;
  glassEffect: boolean;
  compactMode: boolean;
  darkMode: boolean;
  fontFamily: string;
  spacing: number;
  shadowIntensity: number;
  preview: { bg: string; accent: string; text: string; gradient?: string };
}

const themePresets: ThemePreset[] = [
  {
    id: "wine-classic",
    name: "Vinho Clássico",
    description: "Elegante e sofisticado",
    category: "classic",
    primary: "345 70% 30%",
    dark: "345 80% 20%",
    glow: "345 60% 45%",
    accent: "345 90% 60%",
    fontSize: 16,
    borderRadius: 16,
    animations: true,
    glassEffect: true,
    compactMode: false,
    darkMode: false,
    fontFamily: "system-ui",
    spacing: 1,
    shadowIntensity: 0.3,
    preview: { 
      bg: "hsl(345 70% 30%)", 
      accent: "hsl(345 60% 45%)", 
      text: "#fff",
      gradient: "linear-gradient(135deg, hsl(345 70% 30%) 0%, hsl(345 80% 20%) 100%)"
    },
  },
  {
    id: "wine-luxury",
    name: "Vinho Luxo",
    description: "Máxima elegância com gradientes",
    category: "vibrant",
    primary: "345 75% 35%",
    dark: "345 85% 25%",
    glow: "345 65% 50%",
    accent: "15 90% 60%",
    fontSize: 16,
    borderRadius: 24,
    animations: true,
    glassEffect: true,
    compactMode: false,
    darkMode: true,
    fontFamily: "system-ui",
    spacing: 1.2,
    shadowIntensity: 0.5,
    preview: { 
      bg: "hsl(345 75% 35%)", 
      accent: "hsl(15 90% 60%)", 
      text: "#fff",
      gradient: "linear-gradient(135deg, hsl(345 75% 35%) 0%, hsl(345 85% 25%) 50%, hsl(15 90% 60%) 100%)"
    },
  },
  {
    id: "ocean-deep",
    name: "Oceano Profundo",
    description: "Azul com toques de turquesa",
    category: "modern",
    primary: "210 70% 35%",
    dark: "210 80% 25%",
    glow: "210 60% 50%",
    accent: "180 60% 50%",
    fontSize: 16,
    borderRadius: 16,
    animations: true,
    glassEffect: true,
    compactMode: false,
    darkMode: true,
    fontFamily: "system-ui",
    spacing: 1,
    shadowIntensity: 0.4,
    preview: { 
      bg: "hsl(210 70% 35%)", 
      accent: "hsl(180 60% 50%)", 
      text: "#fff",
      gradient: "linear-gradient(135deg, hsl(210 80% 25%) 0%, hsl(210 70% 35%) 50%, hsl(180 60% 50%) 100%)"
    },
  },
  {
    id: "emerald-forest",
    name: "Floresta Esmeralda",
    description: "Verde natural e orgânico",
    category: "modern",
    primary: "160 60% 30%",
    dark: "160 70% 20%",
    glow: "160 50% 45%",
    accent: "140 70% 50%",
    fontSize: 16,
    borderRadius: 20,
    animations: true,
    glassEffect: true,
    compactMode: false,
    darkMode: false,
    fontFamily: "system-ui",
    spacing: 1.1,
    shadowIntensity: 0.3,
    preview: { 
      bg: "hsl(160 60% 30%)", 
      accent: "hsl(140 70% 50%)", 
      text: "#fff",
      gradient: "linear-gradient(135deg, hsl(160 70% 20%) 0%, hsl(160 60% 30%) 50%, hsl(140 70% 50%) 100%)"
    },
  },
  {
    id: "purple-royal",
    name: "Roxo Imperial",
    description: "Luxuoso com toques de magenta",
    category: "vibrant",
    primary: "270 60% 35%",
    dark: "270 70% 25%",
    glow: "270 50% 50%",
    accent: "300 70% 55%",
    fontSize: 16,
    borderRadius: 20,
    animations: true,
    glassEffect: true,
    compactMode: false,
    darkMode: true,
    fontFamily: "system-ui",
    spacing: 1.15,
    shadowIntensity: 0.45,
    preview: { 
      bg: "hsl(270 60% 35%)", 
      accent: "hsl(300 70% 55%)", 
      text: "#fff",
      gradient: "linear-gradient(135deg, hsl(270 70% 25%) 0%, hsl(270 60% 35%) 50%, hsl(300 70% 55%) 100%)"
    },
  },
  {
    id: "amber-sunset",
    name: "Pôr do Sol Âmbar",
    description: "Quente com gradiente laranja",
    category: "vibrant",
    primary: "35 80% 40%",
    dark: "35 85% 30%",
    glow: "35 70% 55%",
    accent: "20 90% 55%",
    fontSize: 15,
    borderRadius: 18,
    animations: true,
    glassEffect: true,
    compactMode: false,
    darkMode: false,
    fontFamily: "system-ui",
    spacing: 1,
    shadowIntensity: 0.35,
    preview: { 
      bg: "hsl(35 80% 40%)", 
      accent: "hsl(20 90% 55%)", 
      text: "#fff",
      gradient: "linear-gradient(135deg, hsl(35 85% 30%) 0%, hsl(35 80% 40%) 50%, hsl(20 90% 55%) 100%)"
    },
  },
  {
    id: "slate-pro",
    name: "Cinza Profissional",
    description: "Minimalista e focado",
    category: "minimal",
    primary: "220 15% 35%",
    dark: "220 20% 25%",
    glow: "220 10% 50%",
    accent: "210 20% 60%",
    fontSize: 15,
    borderRadius: 12,
    animations: false,
    glassEffect: false,
    compactMode: true,
    darkMode: true,
    fontFamily: "system-ui",
    spacing: 0.9,
    shadowIntensity: 0.2,
    preview: { 
      bg: "hsl(220 15% 35%)", 
      accent: "hsl(210 20% 60%)", 
      text: "#fff",
      gradient: "linear-gradient(135deg, hsl(220 20% 25%) 0%, hsl(220 15% 35%) 100%)"
    },
  },
  {
    id: "cyberpunk",
    name: "Cyberpunk Neon",
    description: "Futurista e vibrante",
    category: "vibrant",
    primary: "280 90% 45%",
    dark: "280 100% 35%",
    glow: "280 80% 60%",
    accent: "170 100% 50%",
    fontSize: 16,
    borderRadius: 8,
    animations: true,
    glassEffect: true,
    compactMode: false,
    darkMode: true,
    fontFamily: "system-ui",
    spacing: 1,
    shadowIntensity: 0.6,
    preview: { 
      bg: "hsl(280 90% 45%)", 
      accent: "hsl(170 100% 50%)", 
      text: "#fff",
      gradient: "linear-gradient(135deg, hsl(280 100% 35%) 0%, hsl(280 90% 45%) 50%, hsl(170 100% 50%) 100%)"
    },
  },
  {
    id: "rose-gold",
    name: "Rosa Gold",
    description: "Feminino e elegante",
    category: "modern",
    primary: "330 65% 45%",
    dark: "330 70% 35%",
    glow: "330 55% 55%",
    accent: "25 75% 60%",
    fontSize: 16,
    borderRadius: 20,
    animations: true,
    glassEffect: true,
    compactMode: false,
    darkMode: false,
    fontFamily: "system-ui",
    spacing: 1.1,
    shadowIntensity: 0.4,
    preview: { 
      bg: "hsl(330 65% 45%)", 
      accent: "hsl(25 75% 60%)", 
      text: "#fff",
      gradient: "linear-gradient(135deg, hsl(330 70% 35%) 0%, hsl(330 65% 45%) 50%, hsl(25 75% 60%) 100%)"
    },
  },
  {
    id: "minimal-light",
    name: "Minimalista Claro",
    description: "Limpo e funcional",
    category: "minimal",
    primary: "0 0% 95%",
    dark: "0 0% 85%",
    glow: "0 0% 70%",
    accent: "210 50% 50%",
    fontSize: 15,
    borderRadius: 10,
    animations: false,
    glassEffect: false,
    compactMode: true,
    darkMode: false,
    fontFamily: "system-ui",
    spacing: 0.85,
    shadowIntensity: 0.15,
    preview: { 
      bg: "hsl(0 0% 95%)", 
      accent: "hsl(210 50% 50%)", 
      text: "#000",
      gradient: "linear-gradient(135deg, hsl(0 0% 95%) 0%, hsl(0 0% 85%) 100%)"
    },
  },
];

const DEFAULT_THEME_ID = "wine-classic";

const fontOptions = [
  { value: "system-ui", label: "Sistema" },
  { value: "Inter", label: "Inter" },
  { value: "Roboto", label: "Roboto" },
  { value: "Poppins", label: "Poppins" },
  { value: "Montserrat", label: "Montserrat" },
];

const loadThemeConfig = (): ThemeConfig => {
  try {
    const saved = localStorage.getItem("themeConfig");
    if (saved) {
      return JSON.parse(saved);
    }
  } catch {}
  return { themeId: DEFAULT_THEME_ID };
};

export const applyTheme = (config?: ThemeConfig) => {
  const savedConfig = config || loadThemeConfig();
  const preset = themePresets.find(t => t.id === savedConfig.themeId) || themePresets[0];
  const root = document.documentElement;

  // Apply colors
  const primary = savedConfig.customColors?.primary || preset.primary;
  const dark = savedConfig.customColors?.dark || preset.dark;
  const glow = savedConfig.customColors?.glow || preset.glow;

  root.style.setProperty("--primary", primary);
  root.style.setProperty("--primary-dark", dark);
  root.style.setProperty("--primary-glow", glow);
  root.style.setProperty("--accent", preset.accent);

  // Apply settings
  const settings = { ...preset, ...savedConfig.customSettings };
  
  root.style.setProperty("--radius", `${settings.borderRadius / 16}rem`);
  root.style.fontSize = `${settings.fontSize}px`;
  root.style.setProperty("--spacing-factor", settings.spacing.toString());
  root.style.setProperty("--shadow-intensity", settings.shadowIntensity.toString());
  root.style.fontFamily = settings.fontFamily;

  // Apply classes
  root.classList.toggle("no-animations", !settings.animations);
  root.classList.toggle("no-glass", !settings.glassEffect);
  root.classList.toggle("compact-mode", settings.compactMode);
  root.classList.toggle("dark", settings.darkMode);
};

export const ThemeSettings = () => {
  const [config, setConfig] = useState<ThemeConfig>(loadThemeConfig);
  const [activeTab, setActiveTab] = useState("presets");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  
  const currentPreset = themePresets.find(t => t.id === config.themeId) || themePresets[0];
  const settings = { ...currentPreset, ...config.customSettings };

  const categories = [
    { id: "all", label: "Todos" },
    { id: "classic", label: "Clássico" },
    { id: "modern", label: "Moderno" },
    { id: "minimal", label: "Minimalista" },
    { id: "vibrant", label: "Vibrante" },
  ];

  const filteredPresets = selectedCategory === "all" 
    ? themePresets 
    : themePresets.filter(p => p.category === selectedCategory);

  useEffect(() => {
    applyTheme(config);
    localStorage.setItem("themeConfig", JSON.stringify(config));
  }, [config]);

  const updateTheme = (themeId: string) => {
    setConfig({ themeId, customSettings: {}, customColors: {} });
  };

  const updateSetting = <K extends keyof ThemeConfig["customSettings"]>(
    key: K,
    value: ThemeConfig["customSettings"][K]
  ) => {
    setConfig(prev => ({
      ...prev,
      customSettings: { ...prev.customSettings, [key]: value }
    }));
  };

  const resetToDefault = () => {
    setConfig({ themeId: DEFAULT_THEME_ID });
  };

  const exportTheme = () => {
    const dataStr = JSON.stringify(config, null, 2);
    const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
    const exportFileDefaultName = `theme-${config.themeId}-${Date.now()}.json`;
    
    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', exportFileDefaultName);
    linkElement.click();
  };

  const importTheme = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const imported = JSON.parse(e.target?.result as string);
        setConfig(imported);
      } catch (error) {
        alert("Erro ao importar tema");
      }
    };
    reader.readAsText(file);
  };

  const copyThemeCode = () => {
    navigator.clipboard.writeText(JSON.stringify(config, null, 2));
    alert("Configuração copiada!");
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-3 mb-6">
          <TabsTrigger value="presets" className="gap-2">
            <Palette className="w-4 h-4" />
            Temas
          </TabsTrigger>
          <TabsTrigger value="customize" className="gap-2">
            <Sparkles className="w-4 h-4" />
            Personalizar
          </TabsTrigger>
          <TabsTrigger value="preview" className="gap-2">
            <Eye className="w-4 h-4" />
            Preview
          </TabsTrigger>
        </TabsList>

        <TabsContent value="presets" className="space-y-4">
          {/* Category filter */}
          <div className="flex gap-2 overflow-x-auto pb-2">
            {categories.map(cat => (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(cat.id)}
                className={cn(
                  "px-4 py-2 rounded-xl text-sm font-medium transition-all whitespace-nowrap",
                  selectedCategory === cat.id
                    ? "bg-primary text-primary-foreground shadow-lg"
                    : "bg-muted hover:bg-muted/80"
                )}
              >
                {cat.label}
              </button>
            ))}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredPresets.map(preset => (
              <button
                key={preset.id}
                onClick={() => updateTheme(preset.id)}
                className={cn(
                  "relative flex flex-col gap-3 p-5 rounded-2xl border-2 transition-all duration-300 text-left overflow-hidden group",
                  config.themeId === preset.id
                    ? "border-primary bg-primary/10 scale-[1.02] shadow-xl"
                    : "border-border hover:border-primary/40 bg-card hover:shadow-lg"
                )}
              >
                {/* Gradient background */}
                <div 
                  className="absolute inset-0 opacity-10 group-hover:opacity-20 transition-opacity"
                  style={{ background: preset.preview.gradient }}
                />

                {config.themeId === preset.id && (
                  <div className="absolute top-3 right-3 w-6 h-6 rounded-full bg-primary flex items-center justify-center shadow-lg z-10">
                    <Check className="w-4 h-4 text-primary-foreground" />
                  </div>
                )}

                {/* Color preview with gradient */}
                <div className="flex gap-2 relative z-10">
                  <div 
                    className="w-10 h-10 rounded-xl shadow-lg ring-2 ring-white/20" 
                    style={{ background: preset.preview.gradient }} 
                  />
                  <div className="flex flex-col gap-1">
                    <div className="flex gap-1">
                      <div className="w-5 h-5 rounded-md shadow-md" style={{ background: preset.preview.bg }} />
                      <div className="w-5 h-5 rounded-md shadow-md" style={{ background: preset.preview.accent }} />
                    </div>
                  </div>
                </div>

                <div className="relative z-10">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-base font-bold text-foreground">{preset.name}</span>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-primary/20 text-primary font-medium">
                      {preset.category}
                    </span>
                  </div>
                  <span className="text-xs text-muted-foreground">{preset.description}</span>
                </div>

                {/* Feature tags */}
                <div className="flex flex-wrap gap-1.5 relative z-10">
                  {preset.compactMode && (
                    <span className="text-[10px] px-2 py-1 rounded-lg bg-muted/80 backdrop-blur-sm text-muted-foreground font-medium">
                      Compacto
                    </span>
                  )}
                  {preset.glassEffect && (
                    <span className="text-[10px] px-2 py-1 rounded-lg bg-muted/80 backdrop-blur-sm text-muted-foreground font-medium">
                      Glass
                    </span>
                  )}
                  {preset.animations && (
                    <span className="text-[10px] px-2 py-1 rounded-lg bg-muted/80 backdrop-blur-sm text-muted-foreground font-medium">
                      Animado
                    </span>
                  )}
                  {preset.darkMode && (
                    <span className="text-[10px] px-2 py-1 rounded-lg bg-muted/80 backdrop-blur-sm text-muted-foreground font-medium">
                      Dark
                    </span>
                  )}
                </div>
              </button>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="customize" className="space-y-6">
          <Card className="p-6 space-y-6">
            {/* Font Size */}
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <Label className="text-sm font-semibold">Tamanho da Fonte</Label>
                <span className="text-sm text-muted-foreground">{settings.fontSize}px</span>
              </div>
              <Slider
                value={[settings.fontSize]}
                onValueChange={([v]) => updateSetting("fontSize", v)}
                min={12}
                max={20}
                step={1}
                className="w-full"
              />
            </div>

            {/* Border Radius */}
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <Label className="text-sm font-semibold">Arredondamento</Label>
                <span className="text-sm text-muted-foreground">{settings.borderRadius}px</span>
              </div>
              <Slider
                value={[settings.borderRadius]}
                onValueChange={([v]) => updateSetting("borderRadius", v)}
                min={0}
                max={32}
                step={2}
                className="w-full"
              />
            </div>

            {/* Spacing */}
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <Label className="text-sm font-semibold">Espaçamento</Label>
                <span className="text-sm text-muted-foreground">{settings.spacing.toFixed(2)}x</span>
              </div>
              <Slider
                value={[settings.spacing * 100]}
                onValueChange={([v]) => updateSetting("spacing", v / 100)}
                min={70}
                max={150}
                step={5}
                className="w-full"
              />
            </div>

            {/* Shadow Intensity */}
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <Label className="text-sm font-semibold">Intensidade de Sombra</Label>
                <span className="text-sm text-muted-foreground">{(settings.shadowIntensity * 100).toFixed(0)}%</span>
              </div>
              <Slider
                value={[settings.shadowIntensity * 100]}
                onValueChange={([v]) => updateSetting("shadowIntensity", v / 100)}
                min={0}
                max={100}
                step={5}
                className="w-full"
              />
            </div>

            {/* Font Family */}
            <div className="space-y-3">
              <Label className="text-sm font-semibold">Fonte</Label>
              <select
                value={settings.fontFamily}
                onChange={(e) => updateSetting("fontFamily", e.target.value)}
                className="w-full px-4 py-2 rounded-xl border border-border bg-background"
              >
                {fontOptions.map(font => (
                  <option key={font.value} value={font.value}>{font.label}</option>
                ))}
              </select>
            </div>

            {/* Toggles */}
            <div className="space-y-4 pt-4 border-t">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label className="text-sm font-semibold">Animações</Label>
                  <p className="text-xs text-muted-foreground">Efeitos de transição suaves</p>
                </div>
                <Switch
                  checked={settings.animations}
                  onCheckedChange={(v) => updateSetting("animations", v)}
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label className="text-sm font-semibold">Efeito Glass</Label>
                  <p className="text-xs text-muted-foreground">Transparência e blur</p>
                </div>
                <Switch
                  checked={settings.glassEffect}
                  onCheckedChange={(v) => updateSetting("glassEffect", v)}
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label className="text-sm font-semibold">Modo Compacto</Label>
                  <p className="text-xs text-muted-foreground">Menos espaçamento</p>
                </div>
                <Switch
                  checked={settings.compactMode}
                  onCheckedChange={(v) => updateSetting("compactMode", v)}
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label className="text-sm font-semibold">Modo Escuro</Label>
                  <p className="text-xs text-muted-foreground">Tema escuro</p>
                </div>
                <Switch
                  checked={settings.darkMode}
                  onCheckedChange={(v) => updateSetting("darkMode", v)}
                />
              </div>
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="preview" className="space-y-4">
          <Card className="p-8 space-y-6">
            <div className="text-center space-y-2">
              <h3 className="text-2xl font-bold">Preview do Tema</h3>
              <p className="text-muted-foreground">Veja como seu tema ficará em diferentes componentes</p>
            </div>

            <div className="space-y-4">
              {/* Buttons */}
              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground uppercase tracking-wider">Botões</Label>
                <div className="flex gap-3 flex-wrap">
                  <Button>Primário</Button>
                  <Button variant="outline">Outline</Button>
                  <Button variant="secondary">Secundário</Button>
                  <Button variant="ghost">Ghost</Button>
                </div>
              </div>

              {/* Cards */}
              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground uppercase tracking-wider">Cards</Label>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Card className="p-4">
                    <h4 className="font-semibold mb-2">Card Exemplo</h4>
                    <p className="text-sm text-muted-foreground">Este é um exemplo de card com o tema atual aplicado.</p>
                  </Card>
                  <Card className="p-4 bg-primary/10 border-primary">
                    <h4 className="font-semibold mb-2">Card Destacado</h4>
                    <p className="text-sm text-muted-foreground">Card com cor primária aplicada.</p>
                  </Card>
                </div>
              </div>

              {/* Typography */}
              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground uppercase tracking-wider">Tipografia</Label>
                <div className="space-y-2">
                  <h1 className="text-4xl font-bold">Heading 1</h1>
                  <h2 className="text-3xl font-bold">Heading 2</h2>
                  <h3 className="text-2xl font-semibold">Heading 3</h3>
                  <p className="text-base">Parágrafo normal com texto de exemplo.</p>
                  <p className="text-sm text-muted-foreground">Texto secundário em tamanho menor.</p>
                </div>
              </div>
            </div>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Action buttons */}
      <div className="flex gap-3 flex-wrap">
        <Button
          variant="outline"
          onClick={resetToDefault}
          className="flex-1 min-w-[140px]"
        >
          <RotateCcw className="w-4 h-4 mr-2" />
          Restaurar
        </Button>
        
        <Button
          variant="outline"
          onClick={exportTheme}
          className="flex-1 min-w-[140px]"
        >
          <Download className="w-4 h-4 mr-2" />
          Exportar
        </Button>

        <label className="flex-1 min-w-[140px]">
          <Button variant="outline" className="w-full" asChild>
            <span>
              <Upload className="w-4 h-4 mr-2" />
              Importar
            </span>
          </Button>
          <input
            type="file"
            accept=".json"
            onChange={importTheme}
            className="hidden"
          />
        </label>

        <Button
          variant="outline"
          onClick={copyThemeCode}
          className="flex-1 min-w-[140px]"
        >
          <Copy className="w-4 h-4 mr-2" />
          Copiar Config
        </Button>
      </div>
    </div>
  );
};