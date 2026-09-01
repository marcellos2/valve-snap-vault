import { useEffect } from "react";
import { toast } from "sonner";
import {
  EXTERNAL_SUPABASE_PUBLISHABLE_KEY,
  EXTERNAL_SUPABASE_URL,
} from "@/integrations/external-supabase/config";

const SUPABASE_URL = EXTERNAL_SUPABASE_URL;
const ANON_KEY = EXTERNAL_SUPABASE_PUBLISHABLE_KEY;
const STORAGE_KEY = "google_photos_session_v1";

type GooglePhotosState = {
  module?: string;
  returnTo?: string;
};

function decodeState(state: string | null): GooglePhotosState | null {
  if (!state) return null;
  try {
    const normalized = state.padEnd(state.length + ((4 - state.length % 4) % 4), "=");
    return JSON.parse(atob(normalized)) as GooglePhotosState;
  } catch {
    return null;
  }
}

async function exchangeGooglePhotosCode(search: URLSearchParams) {
  const qs = new URLSearchParams({ format: "json" });
  const code = search.get("code");
  const state = search.get("state");
  const error = search.get("error");
  if (code) qs.set("code", code);
  if (state) qs.set("state", state);
  if (error) qs.set("error", error);

  const res = await fetch(`${SUPABASE_URL}/functions/v1/google-photos-callback?${qs.toString()}`, {
    headers: {
      apikey: ANON_KEY,
      Authorization: `Bearer ${ANON_KEY}`,
    },
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data?.error || `request_failed_${res.status}`);
  return data as Record<string, unknown>;
}

export function GooglePhotosOAuthHandler() {
  useEffect(() => {
    const search = new URLSearchParams(window.location.search);
    const state = decodeState(search.get("state"));
    if (state?.module !== "google-photos") return;

    let cancelled = false;
    void (async () => {
      try {
        const payload = await exchangeGooglePhotosCode(search);
        if (cancelled) return;

        if (window.opener) {
          window.opener.postMessage({ type: "google-photos-auth", payload }, window.location.origin);
          window.close();
          return;
        }

        if (payload.access_token) {
          const sessionPayload = JSON.stringify({
            access_token: payload.access_token,
            refresh_token: payload.refresh_token ?? null,
            expires_at: Date.now() + (Number(payload.expires_in ?? 3600) - 60) * 1000,
            scope: payload.scope,
          });
          localStorage.setItem(STORAGE_KEY, sessionPayload);
          sessionStorage.setItem(STORAGE_KEY, sessionPayload);
        }
        window.location.replace(state.returnTo || "/google-photos-sync");
      } catch (e: any) {
        const message = e?.message || "Não foi possível concluir o login do Google Photos.";
        if (window.opener) {
          window.opener.postMessage({ type: "google-photos-auth", payload: { error: message } }, window.location.origin);
          window.close();
          return;
        }
        toast.error(message);
        window.history.replaceState(null, "", window.location.pathname);
      }
    })();

    return () => { cancelled = true; };
  }, []);

  return null;
}