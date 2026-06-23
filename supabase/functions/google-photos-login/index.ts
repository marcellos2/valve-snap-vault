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
  const requestedRedirectUri = url.searchParams.get('redirectUri');
  if (!origin) {
    return new Response(JSON.stringify({ error: 'origin query param required' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  let redirectUri: string;
  let state: string;
  try {
    const parsedOrigin = new URL(origin);
    const parsedRedirectUri = requestedRedirectUri ? new URL(requestedRedirectUri) : new URL(`${parsedOrigin.origin}/`);
    if (parsedRedirectUri.origin !== parsedOrigin.origin) throw new Error('redirect origin mismatch');
    redirectUri = parsedRedirectUri.toString();
    state = btoa(JSON.stringify({ module: 'google-photos', origin: parsedOrigin.origin, mode, returnTo, redirectUri })).replace(/=/g, '');
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
    scope: 'https://www.googleapis.com/auth/photospicker.mediaitems.readonly',
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