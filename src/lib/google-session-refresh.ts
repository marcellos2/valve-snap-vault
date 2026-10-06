import {
  FUNCTIONS_SUPABASE_PUBLISHABLE_KEY,
  FUNCTIONS_SUPABASE_URL,
} from "@/integrations/external-supabase/functions-config";

const STORAGE_KEY = "google_photos_session_v1";
let inflight: Promise<boolean> | null = null;

/** Renova o token do Google usando o refresh_token salvo. Só sai se o usuário clicar em sair. */
export function refreshGoogleSessionIfNeeded(force = false): Promise<boolean> {
  if (inflight) return inflight;
  inflight = (async () => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY) || sessionStorage.getItem(STORAGE_KEY);
      if (!raw) return false;
      const s = JSON.parse(raw);
      if (!s.refresh_token) return false;
      if (!force && s.expires_at && s.expires_at - Date.now() > 10 * 60 * 1000) return true;
      const res = await fetch(`${FUNCTIONS_SUPABASE_URL}/functions/v1/google-photos-refresh`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          apikey: FUNCTIONS_SUPABASE_PUBLISHABLE_KEY,
          Authorization: `Bearer ${FUNCTIONS_SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify({ refresh_token: s.refresh_token }),
      });
      if (!res.ok) return false;
      const data = await res.json();
      if (!data.access_token) return false;
      const next = JSON.stringify({
        ...s,
        access_token: data.access_token,
        expires_at: Date.now() + (Number(data.expires_in ?? 3600) - 60) * 1000,
        scope: data.scope || s.scope,
      });
      localStorage.setItem(STORAGE_KEY, next);
      sessionStorage.setItem(STORAGE_KEY, next);
      return true;
    } catch {
      return false;
    } finally {
      setTimeout(() => (inflight = null), 0);
    }
  })();
  return inflight;
}
