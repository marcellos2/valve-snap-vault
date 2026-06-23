import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';

// Proxies the Google Photos Picker API.
// action=create  -> POST /v1/sessions               (returns pickerUri, id, pollingConfig, mediaItemsSet)
// action=poll    -> GET  /v1/sessions/{sessionId}   (poll until mediaItemsSet=true)
// action=items   -> GET  /v1/mediaItems?sessionId=  (list picked items)
// action=delete  -> DELETE /v1/sessions/{sessionId}
Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  const accessToken = req.headers.get('x-google-access-token');
  if (!accessToken) {
    return new Response(JSON.stringify({ error: 'missing x-google-access-token header' }), {
      status: 401,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
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
        return new Response(JSON.stringify({ error: 'sessionId required' }), {
          status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      res = await fetch(`https://photospicker.googleapis.com/v1/sessions/${encodeURIComponent(sessionId)}`, { headers: auth });
    } else if (action === 'items') {
      if (!sessionId) {
        return new Response(JSON.stringify({ error: 'sessionId required' }), {
          status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      const qs = new URLSearchParams({ sessionId, pageSize });
      if (pageToken) qs.set('pageToken', pageToken);
      res = await fetch(`https://photospicker.googleapis.com/v1/mediaItems?${qs}`, { headers: auth });
    } else if (action === 'delete') {
      if (!sessionId) {
        return new Response(JSON.stringify({ error: 'sessionId required' }), {
          status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      res = await fetch(`https://photospicker.googleapis.com/v1/sessions/${encodeURIComponent(sessionId)}`, {
        method: 'DELETE', headers: auth,
      });
      return new Response(JSON.stringify({ ok: res.ok }), {
        status: res.ok ? 200 : res.status,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    } else {
      return new Response(JSON.stringify({ error: 'invalid_action' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      return new Response(JSON.stringify({ error: 'google_api_error', detail: data }), {
        status: res.status,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    return new Response(JSON.stringify(data), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: 'network_error', detail: String(e) }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});