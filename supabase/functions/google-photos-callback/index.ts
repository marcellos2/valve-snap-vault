import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  const clientId = Deno.env.get('GOOGLE_PHOTOS_CLIENT_ID');
  const clientSecret = Deno.env.get('GOOGLE_PHOTOS_CLIENT_SECRET');
  if (!clientId || !clientSecret) {
    return new Response('Server not configured', { status: 500 });
  }

  const url = new URL(req.url);
  const code = url.searchParams.get('code');
  const state = url.searchParams.get('state');
  const error = url.searchParams.get('error');
  const wantsJson = url.searchParams.get('format') === 'json';
  let origin = '*';
  let mode: 'popup' | 'redirect' = 'popup';
  let returnTo = '/google-photos-sync';
  let stateRedirectUri: string | null = null;

  if (state) {
    try {
      const normalized = state.padEnd(state.length + (4 - state.length % 4) % 4, '=');
      const parsed = JSON.parse(atob(normalized)) as { origin?: string; mode?: string; returnTo?: string; redirectUri?: string };
      if (parsed.origin) origin = new URL(parsed.origin).origin;
      if (parsed.mode === 'redirect') mode = 'redirect';
      if (parsed.returnTo?.startsWith('/')) returnTo = parsed.returnTo;
      if (parsed.redirectUri) stateRedirectUri = new URL(parsed.redirectUri).toString();
    } catch {
      origin = '*';
    }
  }

  const html = (payload: Record<string, unknown>) => `<!doctype html><html><head><meta charset="utf-8"><title>Google Photos</title></head><body style="font-family:system-ui;padding:24px;background:#0a0a0a;color:#fafafa">
<p>Conectando ao Google Photos...</p>
<script>
  (function(){
    var payload = ${JSON.stringify(payload)};
    var target = ${JSON.stringify(`${origin}${returnTo}`)};
    var hash = '#google_photos_auth=' + encodeURIComponent(JSON.stringify(payload));
    if (${JSON.stringify(mode)} === 'redirect') {
      window.location.replace(target + hash);
      return;
    }
    try {
      if (window.opener) {
        window.opener.postMessage({ type: 'google-photos-auth', payload: payload }, ${JSON.stringify(origin)});
        setTimeout(function(){ window.close(); }, 400);
        return;
      }
    } catch (e) { console.error(e); }
    window.location.replace(target + hash);
  })();
</script>
</body></html>`;

  if (error) {
    if (wantsJson) {
      return new Response(JSON.stringify({ error }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }
    return new Response(html({ error }), { headers: { 'Content-Type': 'text/html; charset=utf-8' } });
  }

  if (!code) {
    if (wantsJson) {
      return new Response(JSON.stringify({ error: 'missing_code' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }
    return new Response(html({ error: 'missing_code' }), { headers: { 'Content-Type': 'text/html; charset=utf-8' } });
  }

  const redirectUri = stateRedirectUri || `https://${url.host}/functions/v1/google-photos-callback`;

  try {
    const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri,
        grant_type: 'authorization_code',
      }),
    });
    const tokens = await tokenRes.json();
    if (!tokenRes.ok) {
      if (wantsJson) {
        return new Response(JSON.stringify({ error: tokens.error || 'token_exchange_failed', detail: tokens }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      return new Response(html({ error: tokens.error || 'token_exchange_failed', detail: tokens }), {
        headers: { 'Content-Type': 'text/html; charset=utf-8' },
      });
    }
    const payload = {
      access_token: tokens.access_token,
      refresh_token: tokens.refresh_token ?? null,
      expires_in: tokens.expires_in,
      scope: tokens.scope,
      token_type: tokens.token_type,
    };
    if (wantsJson) {
      return new Response(JSON.stringify(payload), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }
    return new Response(
      html(payload),
      { headers: { 'Content-Type': 'text/html; charset=utf-8' } },
    );
  } catch (e) {
    if (wantsJson) {
      return new Response(JSON.stringify({ error: 'network_error', detail: String(e) }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    return new Response(html({ error: 'network_error', detail: String(e) }), {
      headers: { 'Content-Type': 'text/html; charset=utf-8' },
    });
  }
});