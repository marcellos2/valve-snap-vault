import { useState, useEffect } from "react";
import { Download, Smartphone, CheckCircle, ArrowLeft, Share, MoreVertical } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

const Install = () => {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    // Detectar iOS
    const isIOSDevice = /iPad|iPhone|iPod/.test(navigator.userAgent);
    setIsIOS(isIOSDevice);

    // Verificar se já está instalado
    if (window.matchMedia("(display-mode: standalone)").matches) {
      setIsInstalled(true);
    }

    // Capturar evento de instalação (Android/Desktop)
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;

    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;

    if (outcome === "accepted") {
      setIsInstalled(true);
    }

    setDeferredPrompt(null);
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="bg-card border-b border-border p-4">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate("/")}
            className="rounded-xl"
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <h1 className="text-lg font-semibold text-foreground">Instalar Aplicativo</h1>
        </div>
      </header>

      {/* Content */}
      <main className="flex-1 p-6 flex flex-col items-center justify-center">
        <div className="max-w-md w-full text-center space-y-8">
          {/* Logo */}
          <div className="flex justify-center">
            <img 
              src="/logo-192.png" 
              alt="Tecnoiso" 
              className="w-28 h-28 object-contain drop-shadow-xl"
            />
          </div>

          {/* Title */}
          <div>
            <h2 className="text-2xl font-bold text-foreground mb-2">
              Tecnoiso App
            </h2>
            <p className="text-muted-foreground">
              Instale o aplicativo para acesso rápido às inspeções
            </p>
          </div>

          {/* Status */}
          {isInstalled ? (
            <div className="bg-success/10 border border-success/30 rounded-xl p-6 space-y-3">
              <CheckCircle className="w-12 h-12 text-success mx-auto" />
              <p className="text-success font-medium">
                Aplicativo já instalado!
              </p>
              <p className="text-sm text-muted-foreground">
                Você pode acessar o app pela tela inicial do seu dispositivo.
              </p>
            </div>
          ) : isIOS ? (
            <div className="bg-card border border-border rounded-xl p-6 space-y-4 text-left">
              <p className="text-foreground font-medium text-center">
                Para instalar no iPhone/iPad:
              </p>
              <ol className="space-y-3 text-sm text-muted-foreground">
                <li className="flex items-start gap-3">
                  <span className="bg-primary text-primary-foreground w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0">1</span>
                  <span className="flex items-center gap-2">
                    Toque no botão <Share className="w-4 h-4 inline" /> Compartilhar
                  </span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="bg-primary text-primary-foreground w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0">2</span>
                  <span>Role para baixo e selecione "Adicionar à Tela de Início"</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="bg-primary text-primary-foreground w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0">3</span>
                  <span>Toque em "Adicionar" no canto superior direito</span>
                </li>
              </ol>
            </div>
          ) : deferredPrompt ? (
            <Button
              onClick={handleInstall}
              size="lg"
              className="w-full h-14 text-lg gap-3 rounded-xl"
            >
              <Download className="w-6 h-6" />
              Instalar Aplicativo
            </Button>
          ) : (
            <div className="bg-card border border-border rounded-xl p-6 space-y-4 text-left">
              <p className="text-foreground font-medium text-center">
                Para instalar no Android:
              </p>
              <ol className="space-y-3 text-sm text-muted-foreground">
                <li className="flex items-start gap-3">
                  <span className="bg-primary text-primary-foreground w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0">1</span>
                  <span className="flex items-center gap-2">
                    Toque no menu <MoreVertical className="w-4 h-4 inline" /> do navegador
                  </span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="bg-primary text-primary-foreground w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0">2</span>
                  <span>Selecione "Adicionar à tela inicial" ou "Instalar app"</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="bg-primary text-primary-foreground w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0">3</span>
                  <span>Confirme a instalação</span>
                </li>
              </ol>
            </div>
          )}

          {/* Features */}
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div className="bg-card border border-border rounded-xl p-4">
              <Smartphone className="w-8 h-8 text-primary mx-auto mb-2" />
              <p className="font-medium text-foreground">Acesso Rápido</p>
              <p className="text-muted-foreground text-xs">Direto da tela inicial</p>
            </div>
            <div className="bg-card border border-border rounded-xl p-4">
              <Download className="w-8 h-8 text-primary mx-auto mb-2" />
              <p className="font-medium text-foreground">Funciona Offline</p>
              <p className="text-muted-foreground text-xs">Sem internet</p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default Install;
