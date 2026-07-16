const STORAGE_KEY = "google_photos_session_v1";
const FOLDER_NAME = "Inspeções Válvulas";
const TARGET_FOLDER_ID = "1sF5lBToqmm5K2ehXvkPfvXUYv9QrsDii";
let cachedFolderId: string | null = null;

type GoogleSession = {
  access_token: string;
  refresh_token: string | null;
  expires_at: number;
  scope?: string;
};

type GoogleDriveSessionStatus = {
  connected: boolean;
  canUpload: boolean;
  reason: "ready" | "missing_session" | "expired" | "missing_drive_scope" | "invalid_session";
  scope?: string;
};

function readStoredSession(): string | null {
  try {
    return localStorage.getItem(STORAGE_KEY) || sessionStorage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
}

function hasDriveUploadScope(scope?: string): boolean {
  if (!scope) return false;
  const scopes = scope.split(/\s+/).filter(Boolean);
  return scopes.some((s) =>
    s === "https://www.googleapis.com/auth/drive" ||
    s === "https://www.googleapis.com/auth/drive.file" ||
    s.endsWith("/auth/drive") ||
    s.endsWith("/auth/drive.file")
  );
}

function getSession(): GoogleSession | null {
  const status = getGoogleDriveSessionStatus();
  if (!status.canUpload) return null;

  try {
    const raw = readStoredSession();
    if (!raw) return null;
    return JSON.parse(raw) as GoogleSession;
  } catch {
    return null;
  }
}

export function getGoogleDriveSessionStatus(): GoogleDriveSessionStatus {
  try {
    const raw = readStoredSession();
    if (!raw) return { connected: false, canUpload: false, reason: "missing_session" };

    const s = JSON.parse(raw) as GoogleSession;
    if (!s.access_token) return { connected: false, canUpload: false, reason: "invalid_session" };
    if (s.expires_at && s.expires_at < Date.now()) {
      return { connected: true, canUpload: false, reason: "expired", scope: s.scope };
    }
    if (!hasDriveUploadScope(s.scope)) {
      return { connected: true, canUpload: false, reason: "missing_drive_scope", scope: s.scope };
    }

    return { connected: true, canUpload: true, reason: "ready", scope: s.scope };
  } catch {
    return { connected: false, canUpload: false, reason: "invalid_session" };
  }
}

export function hasGoogleDriveSession(): boolean {
  return getGoogleDriveSessionStatus().canUpload;
}

async function ensureFolder(token: string): Promise<string> {
  if (cachedFolderId) return cachedFolderId;

  if (TARGET_FOLDER_ID) {
    const folderRes = await fetch(
      `https://www.googleapis.com/drive/v3/files/${TARGET_FOLDER_ID}?fields=id,name,mimeType,capabilities(canAddChildren)&supportsAllDrives=true`,
      { headers: { Authorization: `Bearer ${token}` } }
    );

    if (!folderRes.ok) {
      const detail = await folderRes.text().catch(() => "");
      throw new Error(
        `Não consegui acessar a pasta do Drive (${folderRes.status}). Saia e conecte novamente para autorizar o Google Drive. ${detail.slice(0, 160)}`
      );
    }

    const folder = await folderRes.json();
    if (folder.mimeType !== "application/vnd.google-apps.folder") {
      throw new Error("O link configurado do Google Drive não aponta para uma pasta.");
    }
    if (folder.capabilities && folder.capabilities.canAddChildren === false) {
      throw new Error("A conta Google conectada não tem permissão para adicionar arquivos nessa pasta do Drive.");
    }

    cachedFolderId = folder.id as string;
    return cachedFolderId;
  }

  const q = encodeURIComponent(
    `name='${FOLDER_NAME}' and mimeType='application/vnd.google-apps.folder' and trashed=false`
  );
  const searchRes = await fetch(
    `https://www.googleapis.com/drive/v3/files?q=${q}&fields=files(id,name)&spaces=drive`,
    { headers: { Authorization: `Bearer ${token}` } }
  );
  if (!searchRes.ok) throw new Error(`drive_search_${searchRes.status}`);
  const searchData = await searchRes.json();
  if (searchData.files && searchData.files.length > 0) {
    cachedFolderId = searchData.files[0].id as string;
    return cachedFolderId;
  }
  const createRes = await fetch("https://www.googleapis.com/drive/v3/files", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      name: FOLDER_NAME,
      mimeType: "application/vnd.google-apps.folder",
    }),
  });
  if (!createRes.ok) throw new Error(`drive_folder_create_${createRes.status}`);
  const data = await createRes.json();
  cachedFolderId = data.id as string;
  return cachedFolderId;
}

export async function uploadBlobToDrive(
  blob: Blob,
  filename: string
): Promise<string | null> {
  const session = getSession();
  if (!session) return null;
  const token = session.access_token;

  const folderId = await ensureFolder(token);

  const metadata = { name: filename, parents: [folderId] };
  const boundary = "lovable_" + Date.now() + "_" + Math.random().toString(36).slice(2);
  const enc = new TextEncoder();
  const metaPart = enc.encode(
    `--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${JSON.stringify(metadata)}\r\n`
  );
  const dataHeader = enc.encode(
    `--${boundary}\r\nContent-Type: ${blob.type || "image/jpeg"}\r\n\r\n`
  );
  const closeDelim = enc.encode(`\r\n--${boundary}--`);
  const bodyBlob = new Blob([metaPart, dataHeader, blob, closeDelim]);

  const uploadRes = await fetch(
    "https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id&supportsAllDrives=true",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": `multipart/related; boundary=${boundary}`,
      },
      body: bodyBlob,
    }
  );
  if (!uploadRes.ok) {
    const detail = await uploadRes.text().catch(() => "");
    throw new Error(`drive_upload_${uploadRes.status}: ${detail.slice(0, 200)}`);
  }
  const uploaded = await uploadRes.json();
  const fileId = uploaded.id as string;

  // Make file readable by anyone with the link so <img src> works in the app history.
  const permissionRes = await fetch(
    `https://www.googleapis.com/drive/v3/files/${fileId}/permissions`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ role: "reader", type: "anyone" }),
    }
  ).catch(() => null);

  if (permissionRes && !permissionRes.ok) {
    console.warn("Google Drive permission update failed:", await permissionRes.text().catch(() => ""));
  }

  return `https://lh3.googleusercontent.com/d/${fileId}=w2000`;
}