import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';
import { createClient } from 'npm:@supabase/supabase-js@2';

const googlePhotosCorsHeaders = {
  ...corsHeaders,
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-google-access-token',
};

const jsonResponse = (body: unknown, status = 200) => new Response(JSON.stringify(body), {
  status,
  headers: { ...googlePhotosCorsHeaders, 'Content-Type': 'application/json' },
});

interface ImportItem {
  id: string;
  baseUrl: string;
  filename?: string;
  mimeType?: string;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: googlePhotosCorsHeaders });
  if (req.method !== 'POST') {
    return jsonResponse({ error: 'method_not_allowed' }, 405);
  }

  const accessToken = req.headers.get('x-google-access-token');
  if (!accessToken) {
    return jsonResponse({ error: 'missing x-google-access-token header' }, 401);
  }

  let body: { items?: ImportItem[] };
  try { body = await req.json(); } catch {
    return jsonResponse({ error: 'invalid_json' }, 400);
  }

  const items = Array.isArray(body.items) ? body.items.slice(0, 50) : [];
  if (items.length === 0) {
    return jsonResponse({ error: 'no_items' }, 400);
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

  return jsonResponse({ results });
});