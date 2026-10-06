import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  const json = (b: unknown, status = 200) =>
    new Response(JSON.stringify(b), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  try {
    const { refresh_token } = await req.json().catch(() => ({}));
    if (typeof refresh_token !== 'string' || refresh_token.length < 10 || refresh_token.length > 2000) {
      return json({ error: 'invalid_refresh_token' }, 400);
    }
    const res = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: Deno.env.get('GOOGLE_PHOTOS_CLIENT_ID') ?? '',
        client_secret: Deno.env.get('GOOGLE_PHOTOS_CLIENT_SECRET') ?? '',
        refresh_token,
        grant_type: 'refresh_token',
      }),
    });
    const data = await res.json();
    if (!res.ok) return json({ error: data.error ?? 'refresh_failed', details: data }, res.status);
    return json({ access_token: data.access_token, expires_in: data.expires_in, scope: data.scope });
  } catch (e) {
    return json({ error: String(e) }, 500);
  }
});
