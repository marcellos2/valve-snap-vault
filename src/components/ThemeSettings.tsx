import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Check, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface ThemeConfig {
  themeId: string;
}

interface ThemePreset {
  id: string;
  name: string;
  description: string;
  primary: string;
  dark: string;
  glow: string;
  fontSize: number;
  borderRadius: number;
  animations: boolean;
  glassEffect: boolean;
  compactMode: boolean;
  preview: { bg: string; accent: string; text: string };
}

const themePresets: ThemePreset[] = [
  {
    id: "wine-classic",
    name: "Vinho Clássico",
    description: "Elegante",
    primary: "345 70% 30%",
    dark: "345 80% 20%",
    glow: "345 60% 45%",
    fontSize: 16,
    borderRadius: 16,
    animations: true,
    glassEffect: true,
    compactMode: false,
    preview: { bg: "hsl(345 70% 30%)", accent: "hsl(345 60% 45%)", text: "#fff" },
  },
  {
    id: "wine-compact",
    name: "Vinho Compacto",
    description: "Mais informação, menos espaço",
    primary: "345 70% 30%",
    dark: "345 80% 20%",
    glow: "345 60% 45%",
    fontSize: 14,
    borderRadius: 8,
    animations: false,
    glassEffect: false,
    compactMode: true,
    preview: { bg: "hsl(345 70% 30%)", accent: "hsl(345 80% 20%)", text: "#fff" },
  },
  {
    id: "ocean",
    name: "Oceano",
    description: "Azul sereno",
    primary: "210 70% 35%",
    dark: "210 80% 25%",
    glow: "210 60% 50%",
    fontSize: 16,
    borderRadius: 16,
    animations: true,
    glassEffect: true,
    compactMode: false,
    preview: { bg: "hsl(210 70% 35%)", accent: "hsl(210 60% 50%)", text: "#fff" },
  },
  {
    id: "ocean-compact",
    name: "Oceano Compacto",
    description: "Azul limpo e direto",
    primary: "210 70% 35%",
    dark: "210 80% 25%",
    glow: "210 60% 50%",
    fontSize: 14,
    borderRadius: 8,
    animations: false,
    glassEffect: false,
    compactMode: true,
    preview: { bg: "hsl(210 70% 35%)", accent: "hsl(210 80% 25%)", text: "#fff" },
  },
  {
    id: "emerald",
    name: "Esmeralda",
    description: "Verde ",
    primary: "160 60% 30%",
    dark: "160 70% 20%",
    glow: "160 50% 45%",
    fontSize: 16,
    borderRadius: 16,
    animations: true,
    glassEffect: true,
    compactMode: false,
    preview: { bg: "hsl(160 60% 30%)", accent: "hsl(160 50% 45%)", text: "#fff" },
  },
  {
    id: "purple",
    name: "Roxo Royal",
    description: "Luxuoso e vibrante",
    primary: "270 60% 35%",
    dark: "270 70% 25%",
    glow: "270 50% 50%",
    fontSize: 16,
    borderRadius: 20,
    animations: true,
    glassEffect: true,
    compactMode: false,
    preview: { bg: "hsl(270 60% 35%)", accent: "hsl(270 50% 50%)", text: "#fff" },
  },
  {
    id: "amber",
    name: "Âmbar Industrial",
    description: "Quente e funcional",
    primary: "35 80% 40%",
    dark: "35 85% 30%",
    glow: "35 70% 55%",
    fontSize: 15,
    borderRadius: 12,
    animations: true,
    glassEffect: false,
    compactMode: false,
    preview: { bg: "hsl(35 80% 40%)", accent: "hsl(35 70% 55%)", text: "#fff" },
  },
  {
    id: "slate-minimal",
    name: "Cinza Minimalista",
    description: "Neutro e discreto",
    primary: "220 15% 35%",
    dark: "220 20% 25%",
    glow: "220 10% 50%",
    fontSize: 15,
    borderRadius: 10,
    animations: false,
    glassEffect: false,
    compactMode: false,
    preview: { bg: "hsl(220 15% 35%)", accent: "hsl(220 10% 50%)", text: "#fff" },
  },
  {
    id: "teal",
    name: "Turquesa Fresh",
    description: "turquesa",
    primary: "180 55% 30%",
    dark: "180 65% 22%",
    glow: "180 50% 45%",
    fontSize: 16,
    borderRadius: 16,
    animations: true,
    glassEffect: true,
    compactMode: false,
    preview: { bg: "hsl(180 55% 30%)", accent: "hsl(180 50% 45%)", text: "#fff" },
  },
  {
    id: "rose",
    name: "Rosa Clássico",
    description: "Rosa João?",
    primary: "330 65% 45%",
    dark: "330 70% 35%",
    glow: "330 55% 55%",
    fontSize: 16,
    borderRadius: 20,
    animations: true,
    glassEffect: true,
    compactMode: false,
    preview: { bg: "hsl(330 65% 45%)", accent: "hsl(330 55% 55%)", text: "#fff" },
  },
];

const DEFAULT_THEME_ID = "wine-classic";

const loadThemeId = (): string => {
  try {
    const saved = localStorage.getItem("themeConfig");
    if (saved) {
      const parsed = JSON.parse(saved);
      // Support new format
      if (parsed.themeId) return parsed.themeId;
    }
  } catch {}
  return DEFAULT_THEME_ID;
};

export const applyTheme = (themeId?: string) => {
  const id = themeId || loadThemeId();
  const preset = themePresets.find(t => t.id === id) || themePresets[0];
  const root = document.documentElement;

  root.style.setProperty("--primary", preset.primary);
  root.style.setProperty("--primary-dark", preset.dark);
  root.style.setProperty("--primary-glow", preset.glow);
  root.style.setProperty("--radius", `${preset.borderRadius / 16}rem`);
  root.style.fontSize = `${preset.fontSize}px`;

  root.classList.toggle("no-animations", !preset.animations);
  root.classList.toggle("no-glass", !preset.glassEffect);
  root.classList.toggle("compact-mode", preset.compactMode);
};

export const ThemeSettings = () => {
  const [selectedId, setSelectedId] = useState(loadThemeId);

  useEffect(() => {
    applyTheme(selectedId);
    localStorage.setItem("themeConfig", JSON.stringify({ themeId: selectedId }));
  }, [selectedId]);

  return (
    <div className="space-y-4 animate-fade-in">
      <p className="text-sm text-muted-foreground">Selecione um tema para aplicar ao app inteiro:</p>

      <div className="grid grid-cols-2 gap-3">
        {themePresets.map(preset => (
          <button
            key={preset.id}
            onClick={() => setSelectedId(preset.id)}
            className={cn(
              "relative flex flex-col items-start gap-2 p-4 rounded-2xl border-2 transition-all duration-300 text-left",
              selectedId === preset.id
                ? "border-primary bg-primary/10 scale-[1.02] shadow-lg"
                : "border-border hover:border-primary/40 bg-card"
            )}
          >
            {selectedId === preset.id && (
              <div className="absolute top-2 right-2 w-5 h-5 rounded-full bg-primary flex items-center justify-center">
                <Check className="w-3 h-3 text-primary-foreground" />
              </div>
            )}

            {/* Color preview */}
            <div className="flex gap-1.5">
              <div className="w-6 h-6 rounded-full shadow-md" style={{ background: preset.preview.bg }} />
              <div className="w-6 h-6 rounded-full shadow-md" style={{ background: preset.preview.accent }} />
            </div>

            <div>
              <span className="text-sm font-bold text-foreground block">{preset.name}</span>
              <span className="text-[11px] text-muted-foreground">{preset.description}</span>
            </div>

            {/* Tags */}
            <div className="flex flex-wrap gap-1">
              {preset.compactMode && (
                <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-muted text-muted-foreground">Compacto</span>
              )}
              {preset.glassEffect && (
                <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-muted text-muted-foreground">Glass</span>
              )}
              {preset.animations && (
                <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-muted text-muted-foreground">Animado</span>
              )}
            </div>
          </button>
        ))}
      </div>

      <Button
        variant="outline"
        onClick={() => setSelectedId(DEFAULT_THEME_ID)}
        className="w-full h-11 rounded-xl border-border hover:border-primary/40 transition-all"
      >
        <RotateCcw className="w-4 h-4 mr-2" />
        Restaurar Padrão
      </Button>
    </div>
  );
};
