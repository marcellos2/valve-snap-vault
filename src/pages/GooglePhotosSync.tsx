import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { ArrowLeft, Loader2, LogIn, LogOut, Download, Image as ImageIcon, FolderOpen } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string;
const ANON_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string;
const STORAGE_KEY = "google_photos_session_v1";
const GOOGLE_PHOTOS_SCOPE = "openid email profile https://www.googleapis.com/auth/photoslibrary.readonly";

type Session = {
  access_token: string;
  refresh_token: string | null;
  expires_at: number; // epoch ms
  scope?: string;
};

type MediaItem = {
  id: string;
  baseUrl: string;
  filename?: string;
  mimeType?: string;
  mediaMetadata?: { creationTime?: string };
};

type Album = {
  id: string;
  title?: string;
  coverPhotoBaseUrl?: string;
  mediaItemsCount?: string;
};

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
  const [tab, setTab] = useState<"photos" | "albums">("photos");
  const [photos, setPhotos] = useState<MediaItem[]>([]);
  const [albums, setAlbums] = useState<Album[]>([]);
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [importing, setImporting] = useState(false);
  const [imported, setImported] = useState<Record<string, string>>({});
  const [currentAlbumId, setCurrentAlbumId] = useState<string | null>(null);

  const connected = !!session;

  const persistGoogleSession = useCallback((sess: Session) => {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(sess));
    setSession(sess);
    toast.success("Google Photos conectado");
  }, []);

  const readGoogleTokenFromAuth = useCallback(async (): Promise<Session> => {
    const { data, error } = await supabase.auth.getSession();
    if (error) throw error;

    const authSession = data.session as typeof data.session & {
      provider_token?: string | null;
      provider_refresh_token?: string | null;
    };
    if (!authSession?.provider_token) {
      throw new Error("O login Google voltou sem permissão do Google Photos. Tente conectar novamente.");
    }

    return {
      access_token: authSession.provider_token,
      refresh_token: authSession.provider_refresh_token ?? null,
      expires_at: authSession.expires_at ? authSession.expires_at * 1000 : Date.now() + 55 * 60 * 1000,
      scope: GOOGLE_PHOTOS_SCOPE,
    };
  }, []);

  useEffect(() => {
    function onMessage(e: MessageEvent) {
      if (e.origin !== window.location.origin) return;
      const data = e.data;
      if (!data || data.type !== "google-photos-auth") return;
      if (data.payload?.error) {
        toast.error(`Falha no login: ${data.payload.error}`);
        return;
      }
      persistGoogleSession(data.payload as Session);
    }
    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, [persistGoogleSession]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const isPopupReturn = params.get("googlePhotosPopup") === "1";
    const isRedirectReturn = params.get("googlePhotosRedirect") === "1";
    if (!isPopupReturn && !isRedirectReturn) return;

    let cancelled = false;
    void (async () => {
      try {
        const sess = await readGoogleTokenFromAuth();
        if (cancelled) return;
        if (isPopupReturn && window.opener) {
          window.opener.postMessage({ type: "google-photos-auth", payload: sess }, window.location.origin);
          window.close();
          return;
        }
        persistGoogleSession(sess);
      } catch (e: any) {
        const message = e?.message || "Não foi possível concluir o login do Google Photos.";
        if (isPopupReturn && window.opener) {
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
  }, [persistGoogleSession, readGoogleTokenFromAuth]);

  const handleConnect = useCallback(() => {
    const popup = window.open(
      "about:blank",
      "google-photos-oauth",
      "popup=yes,width=520,height=720,menubar=no,toolbar=no,location=yes,status=yes,scrollbars=yes,resizable=yes",
    );

    const getAuthUrl = (redirectFlag: "googlePhotosPopup" | "googlePhotosRedirect") => supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/google-photos-sync?${redirectFlag}=1`,
        scopes: GOOGLE_PHOTOS_SCOPE,
        queryParams: {
          access_type: "offline",
          prompt: "consent",
          include_granted_scopes: "true",
        },
        skipBrowserRedirect: true,
      },
    });

    if (!popup || popup.closed) {
      toast.info("Abrindo login do Google Photos nesta aba...");
      void getAuthUrl("googlePhotosRedirect").then(({ data, error }) => {
        if (error || !data.url) throw error ?? new Error("URL de login não retornada.");
        window.location.assign(data.url);
      }).catch((e: any) => toast.error(`Falha ao abrir login: ${e?.message || e}`));
      return;
    }

    popup.focus();
    void getAuthUrl("googlePhotosPopup").then(({ data, error }) => {
      if (error || !data.url) throw error ?? new Error("URL de login não retornada.");
      popup.location.href = data.url;
    }).catch((e: any) => {
      popup.close();
      toast.error(`Falha ao abrir login: ${e?.message || e}`);
    });
  }, []);

  const handleDisconnect = useCallback(() => {
    sessionStorage.removeItem(STORAGE_KEY);
    setSession(null);
    setPhotos([]); setAlbums([]); setSelected(new Set()); setImported({});
    setCurrentAlbumId(null);
  }, []);

  const loadPhotos = useCallback(async (albumId?: string) => {
    if (!session) return;
    setLoading(true);
    try {
      const qs = new URLSearchParams({ kind: "photos", pageSize: "50" });
      if (albumId) qs.set("albumId", albumId);
      const data = await callFn(`google-photos-list?${qs}`, {}, session.access_token);
      setPhotos((data.mediaItems ?? []) as MediaItem[]);
      setCurrentAlbumId(albumId ?? null);
      setTab("photos");
    } catch (e: any) {
      toast.error(`Erro ao buscar fotos: ${e.message}`);
      if (String(e.message).includes("401")) handleDisconnect();
    } finally { setLoading(false); }
  }, [session, handleDisconnect]);

  const loadAlbums = useCallback(async () => {
    if (!session) return;
    setLoading(true);
    try {
      const data = await callFn(`google-photos-list?kind=albums&pageSize=50`, {}, session.access_token);
      setAlbums((data.albums ?? []) as Album[]);
      setTab("albums");
    } catch (e: any) {
      toast.error(`Erro ao buscar álbuns: ${e.message}`);
    } finally { setLoading(false); }
  }, [session]);

  useEffect(() => { if (session && photos.length === 0 && albums.length === 0) loadPhotos(); }, [session, loadPhotos, photos.length, albums.length]);

  const toggleSelect = (id: string) => {
    setSelected(prev => {
      const n = new Set(prev);
      n.has(id) ? n.delete(id) : n.add(id);
      return n;
    });
  };

  const handleImport = useCallback(async () => {
    if (!session || selected.size === 0) return;
    const items = photos.filter(p => selected.has(p.id))
      .map(p => ({ id: p.id, baseUrl: p.baseUrl, filename: p.filename, mimeType: p.mimeType }));
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
          <div>
            <h1 className="text-lg font-semibold flex items-center gap-2">
              <ImageIcon className="h-5 w-5" /> Google Photos Sync
            </h1>
            <p className="text-xs text-muted-foreground">Módulo isolado · OAuth 2.0 · readonly</p>
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
              Autorize o acesso de leitura à sua biblioteca para visualizar fotos e álbuns. Os tokens ficam apenas nesta aba (sessionStorage).
            </p>
            <Button onClick={handleConnect}><LogIn className="h-4 w-4 mr-2" /> Conectar Google Photos</Button>
          </Card>
        )}

        {connected && (
          <>
            <div className="flex flex-wrap items-center gap-2">
              <Button size="sm" variant={tab === "photos" && !currentAlbumId ? "default" : "outline"} onClick={() => loadPhotos()}>
                <ImageIcon className="h-4 w-4 mr-1" /> Fotos recentes
              </Button>
              <Button size="sm" variant={tab === "albums" ? "default" : "outline"} onClick={loadAlbums}>
                <FolderOpen className="h-4 w-4 mr-1" /> Álbuns
              </Button>
              {currentAlbumId && (
                <Badge variant="secondary">Álbum atual</Badge>
              )}
              <div className="ml-auto flex items-center gap-2">
                <span className="text-xs text-muted-foreground">{selected.size} selecionada(s)</span>
                <Button size="sm" disabled={selected.size === 0 || importing} onClick={handleImport}>
                  {importing ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Download className="h-4 w-4 mr-1" />}
                  Importar para o app
                </Button>
              </div>
            </div>

            {loading && (
              <div className="flex items-center justify-center py-16 text-muted-foreground">
                <Loader2 className="h-6 w-6 animate-spin mr-2" /> Carregando...
              </div>
            )}

            {!loading && tab === "albums" && (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                {albums.map(a => (
                  <button
                    key={a.id}
                    onClick={() => loadPhotos(a.id)}
                    className="text-left group rounded-lg overflow-hidden border border-border/40 hover:border-border transition"
                  >
                    <div className="aspect-square bg-muted">
                      {a.coverPhotoBaseUrl ? (
                        <img src={`${a.coverPhotoBaseUrl}=w320-h320-c`} alt={a.title ?? "Álbum"} loading="lazy" className="w-full h-full object-cover group-hover:scale-105 transition" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-muted-foreground"><FolderOpen className="h-8 w-8" /></div>
                      )}
                    </div>
                    <div className="p-2">
                      <p className="text-sm font-medium truncate">{a.title ?? "Sem título"}</p>
                      <p className="text-xs text-muted-foreground">{a.mediaItemsCount ?? 0} itens</p>
                    </div>
                  </button>
                ))}
                {albums.length === 0 && <p className="text-sm text-muted-foreground col-span-full text-center py-8">Nenhum álbum encontrado.</p>}
              </div>
            )}

            {!loading && tab === "photos" && (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2">
                {photos.map(p => {
                  const isSel = selected.has(p.id);
                  const importedUrl = imported[p.id];
                  return (
                    <button
                      key={p.id}
                      onClick={() => toggleSelect(p.id)}
                      className={`relative aspect-square rounded-md overflow-hidden border-2 transition ${isSel ? "border-primary" : "border-transparent hover:border-border"}`}
                    >
                      <img src={thumb(p.baseUrl)} alt={p.filename ?? p.id} loading="lazy" className="w-full h-full object-cover" />
                      {isSel && <div className="absolute inset-0 bg-primary/20" />}
                      {importedUrl && (
                        <span className="absolute bottom-1 right-1 bg-emerald-600 text-white text-[10px] px-1.5 py-0.5 rounded">✓ importada</span>
                      )}
                    </button>
                  );
                })}
                {photos.length === 0 && <p className="text-sm text-muted-foreground col-span-full text-center py-8">Nenhuma foto encontrada.</p>}
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