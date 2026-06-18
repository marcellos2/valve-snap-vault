import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';

Deno.serve((req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  const clientId = Deno.env.get('GOOGLE_PHOTOS_CLIENT_ID');
  if (!clientId) {
    return new Response(JSON.stringify({ error: 'GOOGLE_PHOTOS_CLIENT_ID not configured' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const url = new URL(req.url);
  const origin = url.searchParams.get('origin');
  const mode = url.searchParams.get('mode') === 'redirect' ? 'redirect' : 'popup';
  const returnTo = url.searchParams.get('returnTo') || '/google-photos-sync';
  if (!origin) {
    return new Response(JSON.stringify({ error: 'origin query param required' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  // Force https — Supabase forwards internally as http, but Google requires https
  const host = url.host;
  const redirectUri = `https://${host}/functions/v1/google-photos-callback`;
  let state: string;
  try {
    const parsedOrigin = new URL(origin);
    state = btoa(JSON.stringify({ origin: parsedOrigin.origin, mode, returnTo })).replace(/=/g, '');
  } catch {
    return new Response(JSON.stringify({ error: 'invalid origin' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: 'code',
    scope: 'https://www.googleapis.com/auth/photoslibrary.readonly',
    access_type: 'offline',
    prompt: 'consent',
    include_granted_scopes: 'true',
    state,
  });

  const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;

  if (url.searchParams.get('redirect') === '1') {
    return Response.redirect(authUrl, 302);
  }

  return new Response(JSON.stringify({ authUrl }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
});