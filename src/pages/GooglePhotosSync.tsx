import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { ArrowLeft, Loader2, LogIn, LogOut, Download, Image as ImageIcon, MousePointerClick, ExternalLink } from "lucide-react";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string;
const ANON_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string;
const STORAGE_KEY = "google_photos_session_v1";
const GOOGLE_PHOTOS_AUTH_ORIGIN = new URL(SUPABASE_URL).origin;

type Session = {
  access_token: string;
  refresh_token: string | null;
  expires_at: number; // epoch ms
  scope?: string;
};

type MediaItem = {
  id: string;
  createTime?: string;
  type?: string;
  mediaFile?: {
    baseUrl: string;
    mimeType?: string;
    filename?: string;
  };
};

type AuthMode = "popup" | "redirect";

function buildLoginUrl(mode: AuthMode) {
  const redirectUri = `${window.location.origin}/`;
  const params = new URLSearchParams({
    origin: window.location.origin,
    mode,
    redirect: "1",
    returnTo: `${window.location.pathname}${window.location.search}`,
    redirectUri,
  });
  return `${SUPABASE_URL}/functions/v1/google-photos-login?${params.toString()}`;
}

function loadSession(): Session | null {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const s = JSON.parse(raw) as Session;
    if (s.expires_at && s.expires_at < Date.now()) return null;
    return s;
  } catch { return null; }
}

async function callFn(path: string, init: RequestInit = {}, accessToken?: string) {
  const headers = new Headers(init.headers);
  headers.set("apikey", ANON_KEY);
  headers.set("Authorization", `Bearer ${ANON_KEY}`);
  if (accessToken) headers.set("x-google-access-token", accessToken);
  if (init.body && !headers.has("Content-Type")) headers.set("Content-Type", "application/json");
  const res = await fetch(`${SUPABASE_URL}/functions/v1/${path}`, { ...init, headers });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data?.error || `request_failed_${res.status}`);
  return data;
}

export default function GooglePhotosSync() {
  const navigate = useNavigate();
  const [session, setSession] = useState<Session | null>(() => loadSession());
  const [photos, setPhotos] = useState<MediaItem[]>([]);
  const [picking, setPicking] = useState(false);
  const [pickerUri, setPickerUri] = useState<string | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [importing, setImporting] = useState(false);
  const [imported, setImported] = useState<Record<string, string>>({});
  const pollRef = useRef<number | null>(null);
  const sessionIdRef = useRef<string | null>(null);

  const connected = !!session;

  const saveAuthPayload = useCallback((payload: Record<string, unknown>) => {
    if (payload.error) {
      toast.error(`Falha no login: ${payload.error}`);
      return;
    }

    const accessToken = String(payload.access_token || "");
    if (!accessToken) {
      toast.error("Login retornou sem token de acesso.");
      return;
    }

    const sess: Session = {
      access_token: accessToken,
      refresh_token: (payload.refresh_token as string) ?? null,
      expires_at: Date.now() + (Number(payload.expires_in ?? 3600) - 60) * 1000,
      scope: payload.scope as string | undefined,
    };
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(sess));
    setSession(sess);
    toast.success("Google Photos conectado");
  }, []);

  useEffect(() => {
    function onMessage(e: MessageEvent) {
      if (e.origin !== GOOGLE_PHOTOS_AUTH_ORIGIN && e.origin !== window.location.origin) return;
      const data = e.data;
      if (!data || data.type !== "google-photos-auth") return;
      saveAuthPayload(data.payload as Record<string, unknown>);
    }
    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, [saveAuthPayload]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const code = params.get("code");
    const state = params.get("state");
    const error = params.get("error");
    if (!code && !error) return;

    let cancelled = false;
    void (async () => {
      try {
        const qs = new URLSearchParams({ format: "json" });
        if (code) qs.set("code", code);
        if (state) qs.set("state", state);
        if (error) qs.set("error", error);
        const payload = await callFn(`google-photos-callback?${qs.toString()}`);
        if (cancelled) return;

        if (window.opener) {
          window.opener.postMessage({ type: "google-photos-auth", payload }, window.location.origin);
          window.close();
          return;
        }

        saveAuthPayload(payload as Record<string, unknown>);
      } catch (e: any) {
        const message = e?.message || "Não foi possível concluir o login do Google Photos.";
        if (window.opener) {
          window.opener.postMessage({ type: "google-photos-auth", payload: { error: message } }, window.location.origin);
          window.close();
          return;
        }
        toast.error(message);
      } finally {
        if (!cancelled) window.history.replaceState(null, "", window.location.pathname);
      }
    })();

    return () => { cancelled = true; };
  }, [saveAuthPayload]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.hash.replace(/^#/, ""));
    const rawPayload = params.get("google_photos_auth");
    if (!rawPayload) return;

    try {
      saveAuthPayload(JSON.parse(decodeURIComponent(rawPayload)) as Record<string, unknown>);
    } catch {
      toast.error("Não foi possível concluir o login do Google Photos.");
    } finally {
      window.history.replaceState(null, "", `${window.location.pathname}${window.location.search}`);
    }
  }, [saveAuthPayload]);

  const handleConnect = useCallback(() => {
    const popupUrl = buildLoginUrl("popup");
    const redirectUrl = buildLoginUrl("redirect");
    const popup = window.open(
      popupUrl,
      "google-photos-oauth",
      "popup=yes,width=520,height=720,menubar=no,toolbar=no,location=yes,status=yes,scrollbars=yes,resizable=yes",
    );

    if (!popup || popup.closed) {
      toast.info("Abrindo login do Google Photos nesta aba...");
      window.location.assign(redirectUrl);
      return;
    }

    popup.focus();
  }, []);

  const handleDisconnect = useCallback(() => {
    sessionStorage.removeItem(STORAGE_KEY);
    setSession(null);
    setPhotos([]); setSelected(new Set()); setImported({});
    setPickerUri(null);
    if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null; }
    sessionIdRef.current = null;
  }, []);

  const stopPolling = useCallback(() => {
    if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null; }
  }, []);

  const fetchPickedItems = useCallback(async (sessionId: string) => {
    if (!session) return;
    const qs = new URLSearchParams({ action: "items", sessionId, pageSize: "100" });
    const data = await callFn(`google-photos-list?${qs}`, {}, session.access_token);
    setPhotos((data.mediaItems ?? []) as MediaItem[]);
  }, [session]);

  const startPicker = useCallback(async () => {
    if (!session) return;
    stopPolling();
    setPicking(true);
    setPhotos([]); setSelected(new Set());
    try {
      const data = await callFn(`google-photos-list?action=create`, { method: "GET" }, session.access_token);
      const sessionId = String(data.id ?? "");
      const uri = String(data.pickerUri ?? "");
      if (!sessionId || !uri) throw new Error("Resposta inválida do Picker");
      sessionIdRef.current = sessionId;
      setPickerUri(uri);
      window.open(uri, "google-photos-picker", "popup=yes,width=520,height=720");
      toast.info("Escolha as fotos na janela do Google que abriu.");

      const intervalMs = Math.max(2000, Number(data?.pollingConfig?.pollInterval?.replace?.("s", "") ?? 2) * 1000);
      pollRef.current = window.setInterval(async () => {
        try {
          const poll = await callFn(`google-photos-list?action=poll&sessionId=${encodeURIComponent(sessionId)}`, {}, session.access_token);
          if (poll.mediaItemsSet) {
            stopPolling();
            setPicking(false);
            await fetchPickedItems(sessionId);
            toast.success("Fotos carregadas");
          }
        } catch (e: any) {
          stopPolling();
          setPicking(false);
          toast.error(`Erro no polling: ${e.message}`);
          if (String(e.message).includes("401")) handleDisconnect();
        }
      }, intervalMs);
    } catch (e: any) {
      setPicking(false);
      toast.error(`Erro ao iniciar seleção: ${e.message}`);
      if (String(e.message).includes("401")) handleDisconnect();
    }
  }, [session, stopPolling, fetchPickedItems, handleDisconnect]);

  useEffect(() => () => stopPolling(), [stopPolling]);

  const toggleSelect = (id: string) => {
    setSelected(prev => {
      const n = new Set(prev);
      n.has(id) ? n.delete(id) : n.add(id);
      return n;
    });
  };

  const handleImport = useCallback(async () => {
    if (!session || selected.size === 0) return;
    const items = photos.filter(p => selected.has(p.id) && p.mediaFile?.baseUrl)
      .map(p => ({ id: p.id, baseUrl: p.mediaFile!.baseUrl, filename: p.mediaFile!.filename, mimeType: p.mediaFile!.mimeType }));
    setImporting(true);
    try {
      const data = await callFn(
        "google-photos-import",
        { method: "POST", body: JSON.stringify({ items }) },
        session.access_token,
      );
      const map: Record<string, string> = { ...imported };
      let ok = 0, fail = 0;
      for (const r of data.results as Array<{ id: string; ok: boolean; url?: string; error?: string }>) {
        if (r.ok && r.url) { map[r.id] = r.url; ok++; } else { fail++; }
      }
      setImported(map);
      setSelected(new Set());
      toast.success(`Importadas ${ok} foto(s)${fail ? `, ${fail} falha(s)` : ""}`);
    } catch (e: any) {
      toast.error(`Erro ao importar: ${e.message}`);
    } finally { setImporting(false); }
  }, [session, selected, photos, imported]);

  const thumb = (baseUrl: string) => `${baseUrl}=w320-h320-c`;

  const headerStatus = useMemo(() => {
    if (!connected) return <Badge variant="secondary">Desconectado</Badge>;
    return <Badge className="bg-emerald-600 hover:bg-emerald-600">Conectado</Badge>;
  }, [connected]);

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="border-b border-border/40 backdrop-blur sticky top-0 z-10 bg-background/80">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <Button size="icon" variant="ghost" onClick={() => navigate("/")} aria-label="Voltar para o início">
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div className="min-w-0">
              <h1 className="text-lg font-semibold flex items-center gap-2 truncate">
                <ImageIcon className="h-5 w-5 shrink-0" /> Google Photos Sync
              </h1>
              <p className="text-xs text-muted-foreground">Módulo isolado · OAuth 2.0 · readonly</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {headerStatus}
            {connected ? (
              <Button size="sm" variant="outline" onClick={handleDisconnect}>
                <LogOut className="h-4 w-4 mr-1" /> Sair
              </Button>
            ) : (
              <Button size="sm" onClick={handleConnect}>
                <LogIn className="h-4 w-4 mr-1" /> Conectar Google Photos
              </Button>
            )}
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-6 space-y-6">
        {!connected && (
          <Card className="p-8 text-center space-y-3">
            <ImageIcon className="h-10 w-10 mx-auto text-muted-foreground" />
            <h2 className="text-xl font-semibold">Conecte sua conta Google</h2>
            <p className="text-sm text-muted-foreground max-w-md mx-auto">
              Autorize o app para abrir o seletor oficial do Google Fotos. Você escolhe quais fotos compartilhar — o app só recebe as selecionadas.
            </p>
            <p className="text-xs text-muted-foreground max-w-2xl mx-auto break-all">
              Se aparecer erro 400, adicione esta URL nos redirecionamentos autorizados do OAuth: {window.location.origin}/
            </p>
            <Button onClick={handleConnect}><LogIn className="h-4 w-4 mr-2" /> Conectar Google Photos</Button>
          </Card>
        )}

        {connected && (
          <>
            <div className="flex flex-wrap items-center gap-2">
              <Button size="sm" onClick={startPicker} disabled={picking}>
                {picking ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <MousePointerClick className="h-4 w-4 mr-1" />}
                {picking ? "Aguardando seleção..." : "Escolher fotos no Google"}
              </Button>
              {picking && pickerUri && (
                <Button size="sm" variant="outline" onClick={() => window.open(pickerUri, "google-photos-picker")}>
                  <ExternalLink className="h-4 w-4 mr-1" /> Reabrir janela do Google
                </Button>
              )}
              <div className="ml-auto flex items-center gap-2">
                <span className="text-xs text-muted-foreground">{selected.size} selecionada(s)</span>
                <Button size="sm" disabled={selected.size === 0 || importing} onClick={handleImport}>
                  {importing ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Download className="h-4 w-4 mr-1" />}
                  Importar para o app
                </Button>
              </div>
            </div>

            {picking && (
              <div className="flex items-center justify-center py-16 text-muted-foreground">
                <Loader2 className="h-6 w-6 animate-spin mr-2" /> Aguardando você escolher as fotos no Google...
              </div>
            )}

            {!picking && (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2">
                {photos.map(p => {
                  const isSel = selected.has(p.id);
                  const importedUrl = imported[p.id];
                  const base = p.mediaFile?.baseUrl;
                  if (!base) return null;
                  return (
                    <button
                      key={p.id}
                      onClick={() => toggleSelect(p.id)}
                      className={`relative aspect-square rounded-md overflow-hidden border-2 transition ${isSel ? "border-primary" : "border-transparent hover:border-border"}`}
                    >
                      <img src={thumb(base)} alt={p.mediaFile?.filename ?? p.id} loading="lazy" className="w-full h-full object-cover" />
                      {isSel && <div className="absolute inset-0 bg-primary/20" />}
                      {importedUrl && (
                        <span className="absolute bottom-1 right-1 bg-emerald-600 text-white text-[10px] px-1.5 py-0.5 rounded">✓ importada</span>
                      )}
                    </button>
                  );
                })}
                {photos.length === 0 && <p className="text-sm text-muted-foreground col-span-full text-center py-8">Clique em "Escolher fotos no Google" para começar.</p>}
              </div>
            )}

            {Object.keys(imported).length > 0 && (
              <Card className="p-4 space-y-2">
                <h3 className="text-sm font-semibold">Importadas para o app ({Object.keys(imported).length})</h3>
                <p className="text-xs text-muted-foreground">URLs assinadas válidas por 7 dias, salvas no bucket <code>google-photos</code>.</p>
                <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                  {Object.entries(imported).map(([id, url]) => (
                    <a key={id} href={url} target="_blank" rel="noreferrer" className="block aspect-square rounded overflow-hidden">
                      <img src={url} alt="" className="w-full h-full object-cover" />
                    </a>
                  ))}
                </div>
              </Card>
            )}
          </>
        )}
      </main>
    </div>
  );
}