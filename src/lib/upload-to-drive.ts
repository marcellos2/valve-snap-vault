import {
  FUNCTIONS_SUPABASE_PUBLISHABLE_KEY,
  FUNCTIONS_SUPABASE_URL,
} from "@/integrations/external-supabase/functions-config";

const DRIVE_API_FUNCTION = `${FUNCTIONS_SUPABASE_URL}/functions/v1/drive-api`;
const DRIVE_FILE_PREFIX = "drive-file:";
let driveCache: { at: number; records: DriveInspectionRecord[] } | null = null;

interface DriveFile {
  id: string;
  name: string;
  mimeType: string;
  createdTime?: string;
}

export interface DriveInspectionRecord {
  id: string;
  valve_code: string | null;
  inspection_date: string;
  photo_initial_url: string;
  photo_during_url: string;
  photo_final_url: string;
  notes: string | null;
  status: "concluido";
}

export class DriveFunctionError extends Error {
  constructor(readonly code: string, message: string) {
    super(message);
    this.name = "DriveFunctionError";
  }
}

export function isDriveFileReference(value: string): boolean {
  return value.startsWith(DRIVE_FILE_PREFIX);
}

export async function resolveDriveImageUrl(value: string): Promise<{ url: string; revoke: () => void }> {
  if (!isDriveFileReference(value)) return { url: value, revoke: () => undefined };
  const url = URL.createObjectURL(await fetchDriveImageFromText(value));
  return { url, revoke: () => URL.revokeObjectURL(url) };
}

function getDriveFileId(reference: string): string {
  return reference.slice(DRIVE_FILE_PREFIX.length);
}

function driveUrl(action: string, params: Record<string, string> = {}) {
  const url = new URL(DRIVE_API_FUNCTION);
  url.searchParams.set("action", action);
  Object.entries(params).forEach(([key, value]) => url.searchParams.set(key, value));
  return url.toString();
}

async function requestDriveJson<T>(
  action: string,
  init: RequestInit = {},
  params: Record<string, string> = {},
): Promise<T> {
  const headers = new Headers(init.headers);
  headers.set("apikey", FUNCTIONS_SUPABASE_PUBLISHABLE_KEY);
  headers.set("Authorization", `Bearer ${FUNCTIONS_SUPABASE_PUBLISHABLE_KEY}`);
  const response = await fetch(driveUrl(action, params), { ...init, headers });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new DriveFunctionError(
      typeof data?.error === "string" ? data.error : "drive_request_failed",
      typeof data?.message === "string" ? data.message : `Falha ao acessar o Drive (${response.status}).`,
    );
  }
  return data as T;
}

/** Envia uma imagem ao Drive pela Edge Function, sem expor tokens Google no navegador. */
export async function createDriveUploadKey(blob: Blob, operation: string): Promise<string> {
  const content = await new Blob([operation, "\0", blob]).arrayBuffer();
  const digest = await crypto.subtle.digest("SHA-256", content);
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

export async function uploadBlobToDrive(
  blob: Blob,
  filename: string,
  idempotencyKey?: string,
): Promise<string> {
  const form = new FormData();
  form.append("file", blob, filename);
  form.append("filename", filename);
  form.append("uploadKey", idempotencyKey || await createDriveUploadKey(blob, filename));
  const result = await requestDriveJson<{ id: string }>("upload", { method: "POST", body: form });
  if (!result.id) throw new Error("O Drive não retornou o identificador do arquivo.");
  driveCache = null;
  return `${DRIVE_FILE_PREFIX}${result.id}`;
}

/** Extrai o ID de arquivo de um link do Google Drive. */
export function extractDriveFileId(text: string): string | null {
  const t = text.trim();
  const m =
    t.match(/\/file\/d\/([a-zA-Z0-9_-]{10,})/) ||
    t.match(/[?&]id=([a-zA-Z0-9_-]{10,})/) ||
    t.match(/\/d\/([a-zA-Z0-9_-]{10,})/);
  return m ? m[1] : null;
}

/** Baixa uma imagem da pasta configurada por meio da Edge Function. */
export async function fetchDriveImageFromText(text: string): Promise<Blob> {
  const trimmed = text.trim();
  let fileId = isDriveFileReference(trimmed) ? getDriveFileId(trimmed) : extractDriveFileId(trimmed);

  if (!fileId) {
    const lines = trimmed.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
    const filename = lines.find((line) => /\.(jpe?g|png|heic|webp|gif)$/i.test(line)) || lines[0];
    if (!filename || filename.length > 200) {
      throw new Error("Não reconheci um link ou nome de foto do Drive.");
    }
    const result = await requestDriveJson<{ files: DriveFile[] }>(
      "list",
      {},
      { name: filename },
    );
    fileId = result.files?.[0]?.id ?? null;
    if (!fileId) throw new Error(`Foto "${filename}" não encontrada na pasta do app.`);
  }

  const headers = new Headers({
    apikey: FUNCTIONS_SUPABASE_PUBLISHABLE_KEY,
    Authorization: `Bearer ${FUNCTIONS_SUPABASE_PUBLISHABLE_KEY}`,
  });
  const response = await fetch(driveUrl("read", { id: fileId }), { headers });
  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    throw new DriveFunctionError(
      typeof data?.error === "string" ? data.error : "drive_read_failed",
      typeof data?.message === "string" ? data.message : `Falha ao baixar a foto do Drive (${response.status}).`,
    );
  }
  const blob = await response.blob();
  if (!blob.type.startsWith("image/")) throw new Error("O arquivo copiado não é uma imagem.");
  return blob;
}

/** Lista folhas de inspeção gravadas na pasta e converte em registros do histórico. */
export async function listDriveInspections(force = false): Promise<DriveInspectionRecord[]> {
  if (!force && driveCache && Date.now() - driveCache.at < 60_000) return driveCache.records;
  const result = await requestDriveJson<{ files: DriveFile[] }>("list");
  const records = (result.files || [])
    .filter((file) => file.mimeType.startsWith("image/") && /^inspecao-/i.test(file.name))
    .map((file) => {
      const match = file.name.match(/^inspecao-(.+)-(\d{2})-(\d{2})-(\d{4})\.\w+$/i);
      const code = match ? match[1] : file.name.replace(/\.\w+$/, "");
      const image = `${DRIVE_FILE_PREFIX}${file.id}`;
      return {
        id: `drive-${file.id}`,
        valve_code: code === "sem-codigo" ? null : code,
        inspection_date: file.createdTime || new Date().toISOString(),
        photo_initial_url: image,
        photo_during_url: image,
        photo_final_url: image,
        notes: null,
        status: "concluido" as const,
      };
    });
  driveCache = { at: Date.now(), records };
  return records;
}

export async function trashDriveFile(fileId: string): Promise<void> {
  await requestDriveJson<{ ok: boolean }>(
    "delete",
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: fileId }),
    },
  );
  driveCache = null;
}
