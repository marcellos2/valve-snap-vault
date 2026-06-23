import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';
import { createClient } from 'npm:@supabase/supabase-js@2';

interface ImportItem {
  id: string;
  baseUrl: string;
  filename?: string;
  mimeType?: string;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'method_not_allowed' }), {
      status: 405,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const accessToken = req.headers.get('x-google-access-token');
  if (!accessToken) {
    return new Response(JSON.stringify({ error: 'missing x-google-access-token header' }), {
      status: 401,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  let body: { items?: ImportItem[] };
  try { body = await req.json(); } catch {
    return new Response(JSON.stringify({ error: 'invalid_json' }), {
      status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const items = Array.isArray(body.items) ? body.items.slice(0, 50) : [];
  if (items.length === 0) {
    return new Response(JSON.stringify({ error: 'no_items' }), {
      status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  );
  const bucket = 'google-photos';

  const results: Array<{ id: string; ok: boolean; url?: string; path?: string; error?: string }> = [];

  for (const item of items) {
    try {
      if (!item.baseUrl || !item.id) {
        results.push({ id: item.id ?? '', ok: false, error: 'invalid_item' });
        continue;
      }
      // Picker API: baseUrl needs =w-h suffix AND requires Authorization header with the
      // same access token used to pick the items.
      const fetchUrl = `${item.baseUrl}=w2048-h2048`;
      const imgRes = await fetch(fetchUrl, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      if (!imgRes.ok) {
        results.push({ id: item.id, ok: false, error: `download_${imgRes.status}` });
        continue;
      }
      const contentType = item.mimeType || imgRes.headers.get('content-type') || 'image/jpeg';
      const ext = contentType.includes('png') ? 'png' : contentType.includes('webp') ? 'webp' : 'jpg';
      const safeName = (item.filename || `${item.id}.${ext}`).replace(/[^\w.\-]/g, '_');
      const path = `imports/${item.id}-${safeName}`;
      const bytes = new Uint8Array(await imgRes.arrayBuffer());

      const { error: upErr } = await supabase.storage
        .from(bucket)
        .upload(path, bytes, { contentType, upsert: true });
      if (upErr) {
        results.push({ id: item.id, ok: false, error: upErr.message });
        continue;
      }
      const { data: signed, error: signErr } = await supabase.storage
        .from(bucket)
        .createSignedUrl(path, 60 * 60 * 24 * 7); // 7 days
      if (signErr) {
        results.push({ id: item.id, ok: false, error: signErr.message });
        continue;
      }
      results.push({ id: item.id, ok: true, url: signed.signedUrl, path });
    } catch (e) {
      results.push({ id: item.id ?? '', ok: false, error: String(e) });
    }
  }

  return new Response(JSON.stringify({ results }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
});