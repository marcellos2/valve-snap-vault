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
  const origin = state ? decodeURIComponent(state) : '*';

  const html = (payload: Record<string, unknown>) => `<!doctype html><html><head><meta charset="utf-8"><title>Google Photos</title></head><body style="font-family:system-ui;padding:24px;background:#0a0a0a;color:#fafafa">
<p>Conectando ao Google Photos...</p>
<script>
  (function(){
    var payload = ${JSON.stringify(payload)};
    try {
      if (window.opener) {
        window.opener.postMessage({ type: 'google-photos-auth', payload: payload }, ${JSON.stringify(origin)});
      }
    } catch (e) { console.error(e); }
    setTimeout(function(){ window.close(); }, 400);
  })();
</script>
</body></html>`;

  if (error) {
    return new Response(html({ error }), { headers: { 'Content-Type': 'text/html; charset=utf-8' } });
  }

  if (!code) {
    return new Response(html({ error: 'missing_code' }), { headers: { 'Content-Type': 'text/html; charset=utf-8' } });
  }

  const redirectUri = `${url.origin}/functions/v1/google-photos-callback`;

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
      return new Response(html({ error: tokens.error || 'token_exchange_failed', detail: tokens }), {
        headers: { 'Content-Type': 'text/html; charset=utf-8' },
      });
    }
    return new Response(
      html({
        access_token: tokens.access_token,
        refresh_token: tokens.refresh_token ?? null,
        expires_in: tokens.expires_in,
        scope: tokens.scope,
        token_type: tokens.token_type,
      }),
      { headers: { 'Content-Type': 'text/html; charset=utf-8' } },
    );
  } catch (e) {
    return new Response(html({ error: 'network_error', detail: String(e) }), {
      headers: { 'Content-Type': 'text/html; charset=utf-8' },
    });
  }
});