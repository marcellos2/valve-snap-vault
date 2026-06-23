import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';

const googlePhotosCorsHeaders = {
  ...corsHeaders,
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-google-access-token',
};

const jsonResponse = (body: unknown, status = 200) => new Response(JSON.stringify(body), {
  status,
  headers: { ...googlePhotosCorsHeaders, 'Content-Type': 'application/json' },
});

// Proxies the Google Photos Picker API.
// action=create  -> POST /v1/sessions               (returns pickerUri, id, pollingConfig, mediaItemsSet)
// action=poll    -> GET  /v1/sessions/{sessionId}   (poll until mediaItemsSet=true)
// action=items   -> GET  /v1/mediaItems?sessionId=  (list picked items)
// action=delete  -> DELETE /v1/sessions/{sessionId}
Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: googlePhotosCorsHeaders });

  const accessToken = req.headers.get('x-google-access-token');
  if (!accessToken) {
    return jsonResponse({ error: 'missing x-google-access-token header' }, 401);
  }

  const url = new URL(req.url);
  const action = url.searchParams.get('action') ?? 'create';
  const sessionId = url.searchParams.get('sessionId') ?? '';
  const pageSize = url.searchParams.get('pageSize') ?? '100';
  const pageToken = url.searchParams.get('pageToken') ?? '';

  const auth = { Authorization: `Bearer ${accessToken}` } as Record<string, string>;

  try {
    let res: Response;
    if (action === 'create') {
      res = await fetch('https://photospicker.googleapis.com/v1/sessions', {
        method: 'POST',
        headers: { ...auth, 'Content-Type': 'application/json' },
        body: '{}',
      });
    } else if (action === 'poll') {
      if (!sessionId) {
        return jsonResponse({ error: 'sessionId required' }, 400);
      }
      res = await fetch(`https://photospicker.googleapis.com/v1/sessions/${encodeURIComponent(sessionId)}`, { headers: auth });
    } else if (action === 'items') {
      if (!sessionId) {
        return jsonResponse({ error: 'sessionId required' }, 400);
      }
      const qs = new URLSearchParams({ sessionId, pageSize });
      if (pageToken) qs.set('pageToken', pageToken);
      res = await fetch(`https://photospicker.googleapis.com/v1/mediaItems?${qs}`, { headers: auth });
    } else if (action === 'delete') {
      if (!sessionId) {
        return jsonResponse({ error: 'sessionId required' }, 400);
      }
      res = await fetch(`https://photospicker.googleapis.com/v1/sessions/${encodeURIComponent(sessionId)}`, {
        method: 'DELETE', headers: auth,
      });
      return jsonResponse({ ok: res.ok }, res.ok ? 200 : res.status);
    } else {
      return jsonResponse({ error: 'invalid_action' }, 400);
    }

    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      return jsonResponse({ error: 'google_api_error', detail: data }, res.status);
    }
    return jsonResponse(data);
  } catch (e) {
    return jsonResponse({ error: 'network_error', detail: String(e) }, 500);
  }
});