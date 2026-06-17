import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';

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
  const kind = url.searchParams.get('kind') ?? 'photos'; // 'photos' | 'albums'
  const pageToken = url.searchParams.get('pageToken') ?? undefined;
  const albumId = url.searchParams.get('albumId') ?? undefined;
  const pageSize = url.searchParams.get('pageSize') ?? '50';

  try {
    let res: Response;
    if (kind === 'albums') {
      const params = new URLSearchParams({ pageSize });
      if (pageToken) params.set('pageToken', pageToken);
      res = await fetch(`https://photoslibrary.googleapis.com/v1/albums?${params}`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
    } else if (albumId) {
      res = await fetch('https://photoslibrary.googleapis.com/v1/mediaItems:search', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ albumId, pageSize: Number(pageSize), pageToken }),
      });
    } else {
      const params = new URLSearchParams({ pageSize });
      if (pageToken) params.set('pageToken', pageToken);
      res = await fetch(`https://photoslibrary.googleapis.com/v1/mediaItems?${params}`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
    }

    const data = await res.json();
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