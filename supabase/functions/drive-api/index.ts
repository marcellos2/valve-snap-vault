const MAX_UPLOAD_BYTES = 10 * 1024 * 1024;
const FILE_ID_PATTERN = /^[a-zA-Z0-9_-]{10,200}$/;
const UPLOAD_KEY_PATTERN = /^[a-f0-9]{64}$/;
const DRIVE_API = "https://www.googleapis.com/drive/v3";
const UPLOAD_API = "https://www.googleapis.com/upload/drive/v3";
const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

let cachedAccessToken = "";
let accessTokenExpiresAt = 0;
let refreshInFlight: Promise<string> | null = null;

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...cors, "Content-Type": "application/json" },
  });

function getFolderId() {
  return Deno.env.get("GOOGLE_DRIVE_FOLDER_ID") ||
    "17R6TiUlSy0J2d3dxF6OCYG-fuBfJpi-W";
}

async function getAccessToken(forceRefresh = false): Promise<string> {
  if (
    !forceRefresh && cachedAccessToken &&
    accessTokenExpiresAt > Date.now() + 60_000
  ) {
    return cachedAccessToken;
  }
  if (refreshInFlight) return refreshInFlight;

  refreshInFlight = (async () => {
    const clientId = Deno.env.get("GOOGLE_OAUTH_CLIENT_ID");
    const clientSecret = Deno.env.get("GOOGLE_OAUTH_CLIENT_SECRET");
    const refreshToken = Deno.env.get("GOOGLE_OAUTH_REFRESH_TOKEN");
    if (!clientId || !clientSecret || !refreshToken) {
      console.error("Google Drive OAuth secrets are not configured");
      throw new Error("drive_not_configured");
    }

    const response = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        refresh_token: refreshToken,
        grant_type: "refresh_token",
      }),
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok || typeof data.access_token !== "string") {
      const code = typeof data.error === "string"
        ? data.error
        : "token_refresh_failed";
      console.error(
        "Google Drive refresh-token exchange failed:",
        response.status,
        code,
      );
      if (code === "invalid_grant") {
        throw new Error("drive_reauthorization_required");
      }
      if (code === "invalid_client") {
        throw new Error("drive_invalid_client");
      }
      if (code === "unauthorized_client") {
        throw new Error("drive_unauthorized_client");
      }
      throw new Error("drive_temporarily_unavailable");
    }

    cachedAccessToken = data.access_token;
    accessTokenExpiresAt = Date.now() +
      Math.max(60, Number(data.expires_in) || 3600) * 1000;
    return cachedAccessToken;
  })();

  try {
    return await refreshInFlight;
  } finally {
    refreshInFlight = null;
  }
}

async function driveFetch(
  path: string,
  init: RequestInit = {},
  retried = false,
): Promise<Response> {
  const token = await getAccessToken();
  const headers = new Headers(init.headers);
  headers.set("Authorization", `Bearer ${token}`);
  const response = await fetch(path, { ...init, headers });
  if (response.status === 401 && !retried) {
    cachedAccessToken = "";
    accessTokenExpiresAt = 0;
    await getAccessToken(true);
    return driveFetch(path, init, true);
  }
  return response;
}

async function verifyFolderAccess() {
  const folderId = getFolderId();
  const response = await driveFetch(
    `${DRIVE_API}/files/${
      encodeURIComponent(folderId)
    }?fields=id,name,mimeType`,
  );
  if (!response.ok) {
    const detail = await response.text().catch(() => "");
    console.error(
      "Configured Google Drive folder could not be accessed:",
      response.status,
      detail,
    );
    const reason = response.status === 401 || response.status === 403 ||
        response.status === 404
      ? "drive_folder_unavailable"
      : "drive_temporarily_unavailable";
    console.error(
      "Configured Google Drive folder could not be accessed:",
      response.status,
    );
    throw new Error(reason);
  }
  const folder = await response.json();
  if (folder.mimeType !== "application/vnd.google-apps.folder") {
    throw new Error("drive_folder_invalid");
  }
  return folderId;
}

async function getFileInFolder(fileId: string, folderId: string) {
  if (!FILE_ID_PATTERN.test(fileId)) return null;
  const response = await driveFetch(
    `${DRIVE_API}/files/${
      encodeURIComponent(fileId)
    }?fields=id,name,mimeType,parents,createdTime,trashed`,
  );
  if (response.status === 404) return null;
  if (!response.ok) throw new Error("drive_temporarily_unavailable");
  const file = await response.json();
  if (
    file.trashed || !Array.isArray(file.parents) ||
    !file.parents.includes(folderId)
  ) return null;
  return file;
}

async function listFiles(folderId: string, name?: string, uploadKey?: string) {
  const files: Array<Record<string, unknown>> = [];
  let pageToken = "";
  for (let page = 0; page < 20; page++) {
    const qParts = [`'${folderId}' in parents`, "trashed = false"];
    if (name) {
      const escapedName = name.replace(/\\/g, "\\\\").replace(/'/g, "\\'");
      qParts.push(`name = '${escapedName}'`);
    }
    if (uploadKey) {
      qParts.push(
        `appProperties has { key='upload_key' and value='${uploadKey}' }`,
      );
    }
    const params = new URLSearchParams({
      q: qParts.join(" and "),
      fields: "nextPageToken,files(id,name,mimeType,createdTime,parents)",
      pageSize: "1000",
      orderBy: "createdTime desc",
    });
    if (pageToken) params.set("pageToken", pageToken);
    const response = await driveFetch(
      `${DRIVE_API}/files?${params.toString()}`,
    );
    if (!response.ok) {
      const detail = await response.text().catch(() => "");
      console.error(
        "Google Drive list request failed:",
        response.status,
        detail,
      );
      throw new Error(`drive_list_failed_${response.status}`);
    }
    const data = await response.json();
    files.push(...(Array.isArray(data.files) ? data.files : []));
    if (!data.nextPageToken) break;
    pageToken = String(data.nextPageToken);
  }
  return files;
}

function publicError(error: unknown) {
  const code = error instanceof Error ? error.message : "";
  if (code.startsWith("drive_list_failed_")) {
    const googleStatus = code.replace("drive_list_failed_", "");
    return json({
      error: code,
      message: `O Google Drive recusou a consulta (status ${googleStatus}).`,
    }, 502);
  }
  if (code === "drive_not_configured") {
    return json({
      error: code,
      message:
        "A integração com o Drive ainda não foi configurada pelo administrador.",
    }, 503);
  }
  if (code === "drive_reauthorization_required") {
    return json({
      error: code,
      message:
        "A autorização do Drive foi revogada ou expirou. O administrador precisa reconectar a conta.",
    }, 503);
  }
  if (code === "drive_invalid_client") {
    return json({
      error: code,
      message:
        "O Client ID ou Client secret está incorreto ou não corresponde ao refresh token.",
    }, 503);
  }
  if (code === "drive_unauthorized_client") {
    return json({
      error: code,
      message: "O tipo de cliente OAuth não está autorizado para esse fluxo.",
    }, 503);
  }
  if (code === "drive_folder_unavailable") {
    return json({
      error: code,
      message:
        "A conta configurada não consegue acessar a pasta do Drive. Verifique a autorização drive.file e o ID da pasta.",
    }, 503);
  }
  if (code === "drive_folder_invalid") {
    return json({
      error: code,
      message: "O ID configurado não corresponde a uma pasta do Drive.",
    }, 500);
  }
  if (code === "drive_temporarily_unavailable") {
    return json({
      error: code,
      message:
        "O Google Drive está temporariamente indisponível. Tente novamente.",
    }, 503);
  }
  console.error("Unexpected Drive function error:", error);
  return json({
    error: "internal_error",
    message: "Não foi possível concluir a operação no Drive.",
  }, 500);
}

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") {
    return new Response("ok", { headers: cors });
  }

  const url = new URL(request.url);
  const action = url.searchParams.get("action") || "";

  try {
    if (action === "read" && request.method === "GET") {
      const folderId = await verifyFolderAccess();
      const fileId = url.searchParams.get("id") || "";
      const file = await getFileInFolder(fileId, folderId);
      if (!file) {
        return json({
          error: "file_not_found",
          message: "Arquivo não encontrado nesta pasta.",
        }, 404);
      }
      if (
        typeof file.mimeType !== "string" || !file.mimeType.startsWith("image/")
      ) {
        return json({
          error: "unsupported_file_type",
          message: "O arquivo não é uma imagem.",
        }, 415);
      }

      const response = await driveFetch(
        `${DRIVE_API}/files/${encodeURIComponent(fileId)}?alt=media`,
      );
      if (!response.ok) throw new Error("drive_temporarily_unavailable");
      return new Response(response.body, {
        headers: {
          ...cors,
          "Content-Type": file.mimeType,
          "Cache-Control": "private, max-age=300",
          "Content-Disposition": "inline",
        },
      });
    }

    if (action === "list" && request.method === "GET") {
      const folderId = await verifyFolderAccess();
      const name = url.searchParams.get("name")?.trim();
      return json({ files: await listFiles(folderId, name || undefined) });
    }

    if (action === "upload" && request.method === "POST") {
      const folderId = await verifyFolderAccess();
      const form = await request.formData();
      const file = form.get("file");
      if (!(file instanceof File)) {
        return json({
          error: "file_required",
          message: "Selecione uma imagem para enviar.",
        }, 400);
      }
      if (!file.type.startsWith("image/")) {
        return json({
          error: "unsupported_file_type",
          message: "Envie somente arquivos de imagem.",
        }, 415);
      }
      if (file.size === 0 || file.size > MAX_UPLOAD_BYTES) {
        return json({
          error: "invalid_file_size",
          message: "A imagem deve ter até 10 MB.",
        }, 413);
      }

      const requestedName = String(
        form.get("filename") || file.name || "imagem.jpg",
      );
      const uploadKey = String(form.get("uploadKey") || "");
      if (!UPLOAD_KEY_PATTERN.test(uploadKey)) {
        return json({
          error: "invalid_upload_key",
          message: "Não foi possível identificar esta tentativa de upload.",
        }, 400);
      }

      const previousUpload =
        (await listFiles(folderId, undefined, uploadKey))[0];
      if (previousUpload) return json(previousUpload);

      const filename =
        requestedName.replace(/[^a-zA-Z0-9._ -]/g, "_").slice(0, 180) ||
        "imagem.jpg";
      const boundary = `drive_${crypto.randomUUID()}`;
      const encoder = new TextEncoder();
      const metadata = encoder.encode(
        `--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${
          JSON.stringify({
            name: filename,
            mimeType: file.type,
            parents: [folderId],
            appProperties: { upload_key: uploadKey },
          })
        }\r\n`,
      );
      const fileHeader = encoder.encode(
        `--${boundary}\r\nContent-Type: ${file.type}\r\n\r\n`,
      );
      const ending = encoder.encode(`\r\n--${boundary}--`);
      const body = new Blob([
        metadata,
        fileHeader,
        new Uint8Array(await file.arrayBuffer()),
        ending,
      ]);
      const response = await driveFetch(
        `${UPLOAD_API}/files?uploadType=multipart&fields=id,name,mimeType,createdTime,parents`,
        {
          method: "POST",
          headers: {
            "Content-Type": `multipart/related; boundary=${boundary}`,
          },
          body,
        },
      );
      if (!response.ok) {
        console.error("Google Drive upload failed:", response.status);
        throw new Error("drive_temporarily_unavailable");
      }
      return json(await response.json(), 201);
    }

    if (action === "delete" && request.method === "POST") {
      const folderId = await verifyFolderAccess();
      const body = await request.json().catch(() => ({}));
      const fileId = typeof body.id === "string" ? body.id : "";
      const file = await getFileInFolder(fileId, folderId);
      if (!file) {
        return json({
          error: "file_not_found",
          message: "Arquivo não encontrado nesta pasta.",
        }, 404);
      }

      const response = await driveFetch(
        `${DRIVE_API}/files/${encodeURIComponent(fileId)}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ trashed: true }),
        },
      );
      if (!response.ok) throw new Error("drive_temporarily_unavailable");
      return json({ ok: true });
    }

    return json({
      error: "method_not_allowed",
      message: "Operação não suportada.",
    }, 405);
  } catch (error) {
    return publicError(error);
  }
});
