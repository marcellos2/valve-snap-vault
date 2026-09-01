import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/external-supabase/client";
import {
  EXTERNAL_SUPABASE_PUBLISHABLE_KEY,
  EXTERNAL_SUPABASE_URL,
} from "@/integrations/external-supabase/config";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  CheckCircle2,
  XCircle,
  Loader2,
  AlertTriangle,
  Clock,
  Shield,
  Wifi,
  RefreshCw,
  ArrowLeft,
  Globe,
  Database,
  ImageIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";

type TestStatus = "idle" | "running" | "success" | "fail";

interface TestResult {
  status: TestStatus;
  message?: string;
  error?: string;
}

interface DiagnosticState {
  internet: TestResult;
  database: TestResult;
  storage: TestResult;
  serviceWorker: TestResult;
  clock: TestResult;
}

const initialState: DiagnosticState = {
  internet: { status: "idle" },
  database: { status: "idle" },
  storage: { status: "idle" },
  serviceWorker: { status: "idle" },
  clock: { status: "idle" },
};

const Diagnostico = () => {
  const navigate = useNavigate();
  const [results, setResults] = useState<DiagnosticState>(initialState);
  const [running, setRunning] = useState(false);
  const [hasCertError, setHasCertError] = useState(false);

  const isCertError = (err: string) =>
    /cert|ssl|tls|ERR_CERT|authority|Failed to fetch|NetworkError/i.test(err);

  const runDiagnostics = async () => {
    setRunning(true);
    setHasCertError(false);
    setResults(initialState);
    let certDetected = false;

    // 1. Clock check
    setResults((r) => ({ ...r, clock: { status: "running" } }));
    try {
      const res = await fetch("https://worldtimeapi.org/api/timezone/Etc/UTC", {
        cache: "no-store",
      });
      const data = await res.json();
      const serverTime = new Date(data.utc_datetime).getTime();
      const localTime = Date.now();
      const diffMin = Math.abs(serverTime - localTime) / 1000 / 60;
      if (diffMin > 5) {
        setResults((r) => ({
          ...r,
          clock: {
            status: "fail",
            error: `Relógio do PC está ${Math.round(diffMin)} minutos fora do horário correto.`,
          },
        }));
      } else {
        setResults((r) => ({
          ...r,
          clock: { status: "success", message: "Horário do sistema está correto." },
        }));
      }
    } catch (e: any) {
      setResults((r) => ({
        ...r,
        clock: { status: "fail", error: "Não foi possível verificar o horário." },
      }));
    }

    // 2. Internet
    setResults((r) => ({ ...r, internet: { status: "running" } }));
    try {
      await fetch("https://www.google.com/generate_204", {
        mode: "no-cors",
        cache: "no-store",
      });
      setResults((r) => ({
        ...r,
        internet: { status: "success", message: "Internet funcionando." },
      }));
    } catch (e: any) {
      const msg = e?.message || String(e);
      if (isCertError(msg)) certDetected = true;
      setResults((r) => ({
        ...r,
        internet: { status: "fail", error: msg },
      }));
    }

    // 3. Database
    setResults((r) => ({ ...r, database: { status: "running" } }));
    try {
      const { error } = await supabase
        .from("inspection_records")
        .select("id")
        .limit(1);
      if (error) throw error;
      setResults((r) => ({
        ...r,
        database: { status: "success", message: "Conexão com o servidor OK." },
      }));
    } catch (e: any) {
      const msg = e?.message || String(e);
      if (isCertError(msg)) certDetected = true;
      setResults((r) => ({
        ...r,
        database: { status: "fail", error: msg },
      }));
    }

    // 4. Storage
    setResults((r) => ({ ...r, storage: { status: "running" } }));
    try {
      const url = `${EXTERNAL_SUPABASE_URL}/storage/v1/bucket`;
      const res = await fetch(url, {
        headers: {
          apikey: EXTERNAL_SUPABASE_PUBLISHABLE_KEY,
        },
      });
      if (!res.ok && res.status !== 401 && res.status !== 403) {
        throw new Error(`HTTP ${res.status}`);
      }
      setResults((r) => ({
        ...r,
        storage: { status: "success", message: "Armazenamento de fotos acessível." },
      }));
    } catch (e: any) {
      const msg = e?.message || String(e);
      if (isCertError(msg)) certDetected = true;
      setResults((r) => ({
        ...r,
        storage: { status: "fail", error: msg },
      }));
    }

    // 5. Service worker
    setResults((r) => ({ ...r, serviceWorker: { status: "running" } }));
    try {
      if ("serviceWorker" in navigator) {
        const reg = await navigator.serviceWorker.getRegistration();
        if (reg) {
          setResults((r) => ({
            ...r,
            serviceWorker: { status: "success", message: "App instalado corretamente." },
          }));
        } else {
          setResults((r) => ({
            ...r,
            serviceWorker: {
              status: "fail",
              error: "Service Worker não registrado.",
            },
          }));
        }
      } else {
        setResults((r) => ({
          ...r,
          serviceWorker: {
            status: "fail",
            error: "Navegador não suporta Service Worker.",
          },
        }));
      }
    } catch (e: any) {
      setResults((r) => ({
        ...r,
        serviceWorker: { status: "fail", error: e?.message || String(e) },
      }));
    }

    setHasCertError(certDetected);
    setRunning(false);
  };

  useEffect(() => {
    runDiagnostics();
  }, []);

  const tests = [
    { key: "clock" as const, label: "Horário do Sistema", icon: Clock },
    { key: "internet" as const, label: "Conexão com Internet", icon: Wifi },
    { key: "database" as const, label: "Servidor de Dados", icon: Database },
    { key: "storage" as const, label: "Armazenamento de Fotos", icon: ImageIcon },
    { key: "serviceWorker" as const, label: "App Offline (PWA)", icon: Globe },
  ];

  const allOk = Object.values(results).every((r) => r.status === "success");
  const anyFail = Object.values(results).some((r) => r.status === "fail");

  const clearCacheAndReload = async () => {
    try {
      if ("caches" in window) {
        const keys = await caches.keys();
        await Promise.all(keys.map((k) => caches.delete(k)));
      }
      if ("serviceWorker" in navigator) {
        const regs = await navigator.serviceWorker.getRegistrations();
        await Promise.all(regs.map((r) => r.unregister()));
      }
      localStorage.clear();
    } catch (e) {
      console.error(e);
    }
    window.location.reload();
  };

  return (
    <div className="min-h-screen bg-background p-4 pb-20">
      <div className="max-w-2xl mx-auto space-y-4">
        {/* Header */}
        <div className="flex items-center gap-3 pt-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate("/")}
            className="rounded-full"
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h1 className="text-xl font-bold">Diagnóstico do Sistema</h1>
            <p className="text-xs text-muted-foreground">
              Verificação automática de conexão e configurações
            </p>
          </div>
        </div>

        {/* Summary */}
        {!running && allOk && (
          <Alert className="border-green-500/50 bg-green-500/10">
            <CheckCircle2 className="w-5 h-5 text-green-500" />
            <AlertTitle className="text-green-700 dark:text-green-400">
              Tudo funcionando!
            </AlertTitle>
            <AlertDescription>
              Todos os testes passaram. O app está operando normalmente neste dispositivo.
            </AlertDescription>
          </Alert>
        )}

        {!running && hasCertError && (
          <Alert variant="destructive" className="border-destructive">
            <AlertTriangle className="w-5 h-5" />
            <AlertTitle>Problema de Certificado SSL Detectado</AlertTitle>
            <AlertDescription>
              Seu computador está bloqueando a conexão segura com o nosso servidor.
              Isso geralmente é causado por antivírus, firewall ou data/hora errada.
              Veja as soluções abaixo.
            </AlertDescription>
          </Alert>
        )}

        {!running && anyFail && !hasCertError && (
          <Alert variant="destructive">
            <AlertTriangle className="w-5 h-5" />
            <AlertTitle>Alguns testes falharam</AlertTitle>
            <AlertDescription>
              Veja abaixo os detalhes e siga as instruções de solução.
            </AlertDescription>
          </Alert>
        )}

        {/* Tests */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">Testes Executados</CardTitle>
              <Button
                size="sm"
                variant="outline"
                onClick={runDiagnostics}
                disabled={running}
              >
                <RefreshCw
                  className={cn("w-4 h-4 mr-2", running && "animate-spin")}
                />
                Refazer
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-2">
            {tests.map(({ key, label, icon: Icon }) => {
              const r = results[key];
              return (
                <div
                  key={key}
                  className="flex items-start gap-3 p-3 rounded-lg border border-border bg-card/50"
                >
                  <div className="mt-0.5">
                    {r.status === "running" && (
                      <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
                    )}
                    {r.status === "success" && (
                      <CheckCircle2 className="w-5 h-5 text-green-500" />
                    )}
                    {r.status === "fail" && (
                      <XCircle className="w-5 h-5 text-destructive" />
                    )}
                    {r.status === "idle" && (
                      <Icon className="w-5 h-5 text-muted-foreground" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm">{label}</p>
                    {r.message && (
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {r.message}
                      </p>
                    )}
                    {r.error && (
                      <p className="text-xs text-destructive mt-0.5 break-words">
                        {r.error}
                      </p>
                    )}
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>

        {/* Solutions */}
        {!running && anyFail && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Shield className="w-4 h-4" />
                Como Resolver
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-sm">
              <Step
                num={1}
                icon={Clock}
                title="Corrigir Data e Hora do Windows"
                desc="Vá em Configurações → Hora e Idioma → Data e Hora → 'Sincronizar agora'. Certificados ficam inválidos quando o relógio está errado."
              />
              <Step
                num={2}
                icon={Shield}
                title="Desativar antivírus temporariamente"
                desc="Antivírus como Kaspersky, ESET, Bitdefender, Sophos ou Avast podem ter 'Inspeção HTTPS/SSL' que bloqueia o site. Desative o módulo de proteção web e teste."
              />
              <Step
                num={3}
                icon={Wifi}
                title="Trocar de rede"
                desc="Conecte o PC ao 4G do celular (modo roteador). Se funcionar, é a rede da empresa/Wi-Fi bloqueando. Fale com o TI para liberar o domínio."
              />
              <Step
                num={4}
                icon={RefreshCw}
                title="Atualizar o Windows"
                desc="Rode o Windows Update completo. Atualizações trazem certificados raiz novos que o navegador precisa para confiar no site."
              />
              <Step
                num={5}
                icon={Globe}
                title="Testar em outro navegador"
                desc="Abra o site no Edge ou Firefox. Se funcionar em um e em outro não, o problema é configuração/extensão do navegador atual."
              />

              <div className="pt-2 border-t border-border">
                <Button
                  onClick={clearCacheAndReload}
                  variant="outline"
                  className="w-full"
                >
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Limpar cache e reinstalar app
                </Button>
                <p className="text-xs text-muted-foreground mt-2 text-center">
                  Remove dados antigos e força recarregamento completo
                </p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Device info */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Informações do Dispositivo</CardTitle>
          </CardHeader>
          <CardContent className="space-y-1 text-xs text-muted-foreground font-mono">
            <p>Online: {navigator.onLine ? "Sim" : "Não"}</p>
            <p>Idioma: {navigator.language}</p>
            <p>Plataforma: {navigator.platform}</p>
            <p className="break-all">User Agent: {navigator.userAgent}</p>
            <p>Horário local: {new Date().toLocaleString("pt-BR")}</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

const Step = ({
  num,
  icon: Icon,
  title,
  desc,
}: {
  num: number;
  icon: any;
  title: string;
  desc: string;
}) => (
  <div className="flex gap-3">
    <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-sm">
      {num}
    </div>
    <div className="flex-1">
      <p className="font-semibold flex items-center gap-2">
        <Icon className="w-4 h-4" />
        {title}
      </p>
      <p className="text-muted-foreground text-xs mt-1 leading-relaxed">{desc}</p>
    </div>
  </div>
);

export default Diagnostico;
