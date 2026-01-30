import { useState, useEffect, useMemo } from "react";
import { Download, Smartphone, CheckCircle, ArrowLeft, Share, MoreVertical, Monitor } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

type DeviceType = "ios" | "android" | "desktop";

const Install = () => {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [selectedTab, setSelectedTab] = useState<"mobile" | "desktop">("mobile");
  const navigate = useNavigate();

  const isMobileDevice = useMemo(() => {
    const ua = navigator.userAgent;
    return /iPad|iPhone|iPod|Android/.test(ua);
  }, []);

  const mobileType = useMemo<"ios" | "android">(() => {
    const ua = navigator.userAgent;
    return /iPad|iPhone|iPod/.test(ua) ? "ios" : "android";
  }, []);

  // Auto-select tab based on device
  useEffect(() => {
    setSelectedTab(isMobileDevice ? "mobile" : "desktop");
  }, [isMobileDevice]);

  useEffect(() => {
    // Verificar se já está instalado
    if (window.matchMedia("(display-mode: standalone)").matches) {
      setIsInstalled(true);
    }

    // Capturar evento de instalação (Android/Desktop Chrome)
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

          {/* Tabs */}
          {!isInstalled && (
            <div className="flex bg-muted rounded-xl p-1">
              <button
                onClick={() => setSelectedTab("mobile")}
                className={`flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-lg text-sm font-medium transition-all ${
                  selectedTab === "mobile"
                    ? "bg-card text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <Smartphone className="w-4 h-4" />
                Mobile
              </button>
              <button
                onClick={() => setSelectedTab("desktop")}
                className={`flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-lg text-sm font-medium transition-all ${
                  selectedTab === "desktop"
                    ? "bg-card text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <Monitor className="w-4 h-4" />
                Desktop
              </button>
            </div>
          )}

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
          ) : selectedTab === "mobile" ? (
            <div className="space-y-4">
              {deferredPrompt && mobileType === "android" ? (
                <Button
                  onClick={handleInstall}
                  size="lg"
                  className="w-full h-14 text-lg gap-3 rounded-xl"
                >
                  <Download className="w-6 h-6" />
                  Instalar no Android
                </Button>
              ) : mobileType === "ios" ? (
                <div className="bg-card border border-border rounded-xl p-6 space-y-4 text-left">
                  <div className="flex items-center justify-center gap-2 mb-2">
                    <Smartphone className="w-6 h-6 text-primary" />
                    <p className="text-foreground font-medium">
                      Instalar no iPhone/iPad:
                    </p>
                  </div>
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
              ) : (
                <div className="bg-card border border-border rounded-xl p-6 space-y-4 text-left">
                  <div className="flex items-center justify-center gap-2 mb-2">
                    <Smartphone className="w-6 h-6 text-primary" />
                    <p className="text-foreground font-medium">
                      Instalar no Android:
                    </p>
                  </div>
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
            </div>
          ) : (
            <div className="space-y-4">
              {deferredPrompt ? (
                <Button
                  onClick={handleInstall}
                  size="lg"
                  className="w-full h-14 text-lg gap-3 rounded-xl"
                >
                  <Monitor className="w-6 h-6" />
                  Instalar no PC
                </Button>
              ) : (
                <div className="bg-card border border-border rounded-xl p-6 space-y-4 text-left">
                  <div className="flex items-center justify-center gap-2 mb-2">
                    <Monitor className="w-6 h-6 text-primary" />
                    <p className="text-foreground font-medium">
                      Instalar no Desktop:
                    </p>
                  </div>
                  <ol className="space-y-3 text-sm text-muted-foreground">
                    <li className="flex items-start gap-3">
                      <span className="bg-primary text-primary-foreground w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0">1</span>
                      <span>Use o <strong>Google Chrome</strong> ou <strong>Microsoft Edge</strong></span>
                    </li>
                    <li className="flex items-start gap-3">
                      <span className="bg-primary text-primary-foreground w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0">2</span>
                      <span>Clique no ícone <Download className="w-4 h-4 inline" /> na barra de endereço (à direita)</span>
                    </li>
                    <li className="flex items-start gap-3">
                      <span className="bg-primary text-primary-foreground w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0">3</span>
                      <span>Ou acesse o menu <MoreVertical className="w-4 h-4 inline" /> → "Instalar Tecnoiso..."</span>
                    </li>
                  </ol>
                </div>
              )}
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
