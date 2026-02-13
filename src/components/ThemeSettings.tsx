import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Palette, Type, Layout, RotateCcw, Sparkles, Sun, Moon, Monitor } from "lucide-react";
import { cn } from "@/lib/utils";

interface ThemeConfig {
  colorScheme: string;
  fontSize: number;
  borderRadius: number;
  headerStyle: string;
  navStyle: string;
  cardStyle: string;
  animations: boolean;
  glassEffect: boolean;
  compactMode: boolean;
}

const defaultTheme: ThemeConfig = {
  colorScheme: "wine",
  fontSize: 16,
  borderRadius: 16,
  headerStyle: "curved",
  navStyle: "floating",
  cardStyle: "elevated",
  animations: true,
  glassEffect: true,
  compactMode: false,
};

const colorSchemes = [
  { id: "wine", name: "Vinho", primary: "345 70% 30%", dark: "345 80% 20%", glow: "345 60% 45%" },
  { id: "ocean", name: "Oceano", primary: "210 70% 35%", dark: "210 80% 25%", glow: "210 60% 50%" },
  { id: "emerald", name: "Esmeralda", primary: "160 60% 30%", dark: "160 70% 20%", glow: "160 50% 45%" },
  { id: "purple", name: "Roxo", primary: "270 60% 35%", dark: "270 70% 25%", glow: "270 50% 50%" },
  { id: "amber", name: "Âmbar", primary: "35 80% 40%", dark: "35 85% 30%", glow: "35 70% 55%" },
  { id: "slate", name: "Cinza", primary: "220 15% 35%", dark: "220 20% 25%", glow: "220 10% 50%" },
  { id: "rose", name: "Rosa", primary: "330 65% 45%", dark: "330 70% 35%", glow: "330 55% 55%" },
  { id: "teal", name: "Turquesa", primary: "180 55% 30%", dark: "180 65% 22%", glow: "180 50% 45%" },
];

const loadTheme = (): ThemeConfig => {
  try {
    const saved = localStorage.getItem("themeConfig");
    if (saved) return { ...defaultTheme, ...JSON.parse(saved) };
  } catch {}
  return defaultTheme;
};

const saveTheme = (config: ThemeConfig) => {
  localStorage.setItem("themeConfig", JSON.stringify(config));
};

export const applyTheme = (config?: ThemeConfig) => {
  const theme = config || loadTheme();
  const root = document.documentElement;

  const scheme = colorSchemes.find(c => c.id === theme.colorScheme) || colorSchemes[0];
  root.style.setProperty("--primary", scheme.primary);
  root.style.setProperty("--primary-dark", scheme.dark);
  root.style.setProperty("--primary-glow", scheme.glow);

  root.style.setProperty("--radius", `${theme.borderRadius / 16}rem`);
  root.style.fontSize = `${theme.fontSize}px`;

  if (theme.animations) {
    root.classList.remove("no-animations");
  } else {
    root.classList.add("no-animations");
  }

  if (theme.glassEffect) {
    root.classList.remove("no-glass");
  } else {
    root.classList.add("no-glass");
  }

  if (theme.compactMode) {
    root.classList.add("compact-mode");
  } else {
    root.classList.remove("compact-mode");
  }
};

export const ThemeSettings = () => {
  const [config, setConfig] = useState<ThemeConfig>(loadTheme);

  useEffect(() => {
    applyTheme(config);
    saveTheme(config);
  }, [config]);

  const updateConfig = (partial: Partial<ThemeConfig>) => {
    setConfig(prev => ({ ...prev, ...partial }));
  };

  const resetTheme = () => {
    setConfig(defaultTheme);
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Color Scheme */}
      <Card className="p-5 border border-border bg-card">
        <div className="flex items-center gap-2 mb-4">
          <Palette className="w-5 h-5 text-primary" />
          <h3 className="font-bold text-foreground">Esquema de Cores</h3>
        </div>
        <div className="grid grid-cols-4 gap-2">
          {colorSchemes.map(scheme => (
            <button
              key={scheme.id}
              onClick={() => updateConfig({ colorScheme: scheme.id })}
              className={cn(
                "flex flex-col items-center gap-2 p-3 rounded-xl border-2 transition-all duration-300",
                config.colorScheme === scheme.id
                  ? "border-primary bg-primary/10 scale-105"
                  : "border-border hover:border-primary/40"
              )}
            >
              <div
                className="w-8 h-8 rounded-full shadow-md"
                style={{ background: `hsl(${scheme.primary})` }}
              />
              <span className="text-[10px] font-medium text-foreground">{scheme.name}</span>
            </button>
          ))}
        </div>
      </Card>

      {/* Typography */}
      <Card className="p-5 border border-border bg-card">
        <div className="flex items-center gap-2 mb-4">
          <Type className="w-5 h-5 text-primary" />
          <h3 className="font-bold text-foreground">Tipografia</h3>
        </div>
        <div className="space-y-4">
          <div>
            <Label className="text-sm text-muted-foreground mb-2 block">
              Tamanho da fonte: {config.fontSize}px
            </Label>
            <Slider
              value={[config.fontSize]}
              onValueChange={([v]) => updateConfig({ fontSize: v })}
              min={12}
              max={20}
              step={1}
              className="w-full"
            />
          </div>
        </div>
      </Card>

      {/* Layout */}
      <Card className="p-5 border border-border bg-card">
        <div className="flex items-center gap-2 mb-4">
          <Layout className="w-5 h-5 text-primary" />
          <h3 className="font-bold text-foreground">Layout</h3>
        </div>
        <div className="space-y-4">
          <div>
            <Label className="text-sm text-muted-foreground mb-2 block">
              Arredondamento: {config.borderRadius}px
            </Label>
            <Slider
              value={[config.borderRadius]}
              onValueChange={([v]) => updateConfig({ borderRadius: v })}
              min={0}
              max={24}
              step={2}
              className="w-full"
            />
          </div>

          <div>
            <Label className="text-sm text-muted-foreground mb-2 block">Estilo do Header</Label>
            <Select value={config.headerStyle} onValueChange={v => updateConfig({ headerStyle: v })}>
              <SelectTrigger className="bg-background">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="curved">Curvado</SelectItem>
                <SelectItem value="flat">Plano</SelectItem>
                <SelectItem value="minimal">Minimalista</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label className="text-sm text-muted-foreground mb-2 block">Estilo da Navegação</Label>
            <Select value={config.navStyle} onValueChange={v => updateConfig({ navStyle: v })}>
              <SelectTrigger className="bg-background">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="floating">Flutuante</SelectItem>
                <SelectItem value="fixed">Fixo</SelectItem>
                <SelectItem value="minimal">Minimalista</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label className="text-sm text-muted-foreground mb-2 block">Estilo dos Cards</Label>
            <Select value={config.cardStyle} onValueChange={v => updateConfig({ cardStyle: v })}>
              <SelectTrigger className="bg-background">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="elevated">Elevado</SelectItem>
                <SelectItem value="flat">Plano</SelectItem>
                <SelectItem value="outlined">Contornado</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </Card>

      {/* Effects */}
      <Card className="p-5 border border-border bg-card">
        <div className="flex items-center gap-2 mb-4">
          <Sparkles className="w-5 h-5 text-primary" />
          <h3 className="font-bold text-foreground">Efeitos</h3>
        </div>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <Label className="text-sm text-foreground">Animações</Label>
            <Switch checked={config.animations} onCheckedChange={v => updateConfig({ animations: v })} />
          </div>
          <div className="flex items-center justify-between">
            <Label className="text-sm text-foreground">Efeito Vidro (Glass)</Label>
            <Switch checked={config.glassEffect} onCheckedChange={v => updateConfig({ glassEffect: v })} />
          </div>
          <div className="flex items-center justify-between">
            <Label className="text-sm text-foreground">Modo Compacto</Label>
            <Switch checked={config.compactMode} onCheckedChange={v => updateConfig({ compactMode: v })} />
          </div>
        </div>
      </Card>

      {/* Reset */}
      <Button
        variant="outline"
        onClick={resetTheme}
        className="w-full h-11 rounded-xl border-border hover:border-primary/40 transition-all"
      >
        <RotateCcw className="w-4 h-4 mr-2" />
        Restaurar Padrões
      </Button>
    </div>
  );
};
