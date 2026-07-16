const STORAGE_KEY = "google_photos_session_v1";
const FOLDER_NAME = "Inspeções Válvulas";
let cachedFolderId: string | null = null;

type GoogleSession = {
  access_token: string;
  refresh_token: string | null;
  expires_at: number;
  scope?: string;
};

function getSession(): GoogleSession | null {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const s = JSON.parse(raw) as GoogleSession;
    if (s.expires_at && s.expires_at < Date.now()) return null;
    if (!s.scope || !s.scope.includes("drive.file")) return null;
    return s;
  } catch {
    return null;
  }
}

export function hasGoogleDriveSession(): boolean {
  return !!getSession();
}

async function ensureFolder(token: string): Promise<string> {
  if (cachedFolderId) return cachedFolderId;
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
    "https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id",
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

  // Make file readable by anyone with the link so <img src> works
  await fetch(
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

  return `https://lh3.googleusercontent.com/d/${fileId}=w2000`;
}