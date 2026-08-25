export type InspectionStatus = "em_andamento" | "concluido";
export type LocalSyncStatus = "pending" | "syncing" | "failed" | "synced";

export interface LocalInspectionRecord {
  id: string;
  valve_code: string | null;
  inspection_date: string;
  photo_initial_url: string | null;
  photo_during_url: string | null;
  photo_final_url: string | null;
  notes: string | null;
  status: InspectionStatus;
  sync_status: LocalSyncStatus;
  updated_at: string;
}

export interface PendingInspection {
  id: string;
  valveCode: string;
  photoInitial: string | null;
  photoDuring: string | null;
  photoFinal: string | null;
  createdAt: number;
  status: LocalSyncStatus;
}

export interface PendingInspectionInput {
  valveCode: string;
  photoInitial: string | null;
  photoDuring: string | null;
  photoFinal: string | null;
}

const DB_NAME = "valve-inspections-emergency";
const DB_VERSION = 1;
const STORE_NAME = "records";
const FALLBACK_KEY = "local_inspection_records_v1";
export const PENDING_INSPECTIONS_KEY = "pending_inspections";

const canUseIndexedDb = () => typeof indexedDB !== "undefined";

const emitUpdate = () => {
  window.dispatchEvent(new CustomEvent("local-inspections-updated"));
};

export const isLocalInspectionId = (id?: string | null) => Boolean(id?.startsWith("local-"));

const createId = () => {
  const uniqueId = typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : Math.random().toString(36).slice(2, 10);
  return `local-${Date.now()}-${uniqueId}`;
};

const getStatus = (inspection: Pick<PendingInspectionInput, "photoInitial" | "photoDuring" | "photoFinal">): InspectionStatus =>
  inspection.photoInitial && inspection.photoDuring && inspection.photoFinal ? "concluido" : "em_andamento";

const openDb = (): Promise<IDBDatabase> => {
  return new Promise((resolve, reject) => {
    if (!canUseIndexedDb()) {
      reject(new Error("IndexedDB unavailable"));
      return;
    }

    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const store = db.createObjectStore(STORE_NAME, { keyPath: "id" });
        store.createIndex("inspection_date", "inspection_date", { unique: false });
        store.createIndex("status", "status", { unique: false });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error || new Error("IndexedDB open failed"));
  });
};

const withStore = async <T>(mode: IDBTransactionMode, action: (store: IDBObjectStore) => IDBRequest<T> | void): Promise<T | undefined> => {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, mode);
    const store = tx.objectStore(STORE_NAME);
    const request = action(store);
    let result: T | undefined;
    if (request) {
      request.onsuccess = () => {
        result = request.result;
      };
      request.onerror = () => reject(request.error || new Error("IndexedDB request failed"));
    }
    tx.oncomplete = () => {
      db.close();
      resolve(result);
    };
    tx.onerror = () => {
      db.close();
      reject(tx.error || new Error("IndexedDB transaction failed"));
    };
  });
};

const readFallbackRecords = (): LocalInspectionRecord[] => {
  try {
    const raw = localStorage.getItem(FALLBACK_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
};

const writeFallbackRecords = (records: LocalInspectionRecord[]) => {
  localStorage.setItem(FALLBACK_KEY, JSON.stringify(records));
};

export const createLocalInspectionRecord = (inspection: PendingInspectionInput, id = createId()): LocalInspectionRecord => {
  const now = new Date().toISOString();
  return {
    id,
    valve_code: inspection.valveCode.toUpperCase() || null,
    inspection_date: now,
    photo_initial_url: inspection.photoInitial,
    photo_during_url: inspection.photoDuring,
    photo_final_url: inspection.photoFinal,
    notes: null,
    status: getStatus(inspection),
    sync_status: "pending",
    updated_at: now,
  };
};

export const saveLocalInspectionRecord = async (record: LocalInspectionRecord): Promise<void> => {
  try {
    await withStore("readwrite", (store) => store.put(record));
  } catch {
    const records = readFallbackRecords().filter((item) => item.id !== record.id);
    records.push(record);
    writeFallbackRecords(records);
  }
  emitUpdate();
};

export const updateLocalInspectionRecord = async (id: string, inspection: PendingInspectionInput): Promise<void> => {
  const existing = await getLocalInspectionRecord(id);
  const now = new Date().toISOString();
  const record: LocalInspectionRecord = {
    ...(existing || createLocalInspectionRecord(inspection, id)),
    valve_code: inspection.valveCode.toUpperCase() || null,
    photo_initial_url: inspection.photoInitial,
    photo_during_url: inspection.photoDuring,
    photo_final_url: inspection.photoFinal,
    status: getStatus(inspection),
    sync_status: "pending",
    updated_at: now,
  };
  await saveLocalInspectionRecord(record);
};

export const markLocalInspectionStatus = async (id: string, syncStatus: LocalSyncStatus): Promise<void> => {
  const record = await getLocalInspectionRecord(id);
  if (!record) return;
  await saveLocalInspectionRecord({ ...record, sync_status: syncStatus, updated_at: new Date().toISOString() });
};

export const getLocalInspectionRecord = async (id: string): Promise<LocalInspectionRecord | null> => {
  try {
    const result = await withStore<LocalInspectionRecord>("readonly", (store) => store.get(id));
    return result || null;
  } catch {
    return readFallbackRecords().find((item) => item.id === id) || null;
  }
};

export const getLocalInspectionRecords = async (): Promise<LocalInspectionRecord[]> => {
  try {
    const result = await withStore<LocalInspectionRecord[]>("readonly", (store) => store.getAll());
    return (result || []).sort((a, b) => new Date(b.inspection_date).getTime() - new Date(a.inspection_date).getTime());
  } catch {
    return readFallbackRecords().sort((a, b) => new Date(b.inspection_date).getTime() - new Date(a.inspection_date).getTime());
  }
};

export const deleteLocalInspectionRecord = async (id: string): Promise<void> => {
  try {
    await withStore("readwrite", (store) => store.delete(id));
  } catch {
    writeFallbackRecords(readFallbackRecords().filter((item) => item.id !== id));
  }
  emitUpdate();
};

export const readPendingInspections = (): PendingInspection[] => {
  try {
    const pending = localStorage.getItem(PENDING_INSPECTIONS_KEY);
    return pending ? JSON.parse(pending) : [];
  } catch {
    return [];
  }
};

export const writePendingInspections = (inspections: PendingInspection[]) => {
  localStorage.setItem(PENDING_INSPECTIONS_KEY, JSON.stringify(inspections));
  emitUpdate();
};

export const upsertPendingInspection = (inspection: PendingInspection) => {
  const inspections = readPendingInspections().filter((item) => item.id !== inspection.id);
  inspections.push(inspection);
  writePendingInspections(inspections);
};

export const removePendingInspection = (id: string) => {
  writePendingInspections(readPendingInspections().filter((item) => item.id !== id));
};