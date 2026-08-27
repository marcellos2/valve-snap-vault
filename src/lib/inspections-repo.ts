import { supabase } from "@/integrations/supabase/client";
import { isBackendDown, isNetworkFailure, markBackendDown, markBackendUp } from "./backend-status";
import {
  createLocalInspectionRecord,
  deleteLocalInspectionRecord,
  getLocalInspectionRecords,
  isLocalInspectionId,
  saveLocalInspectionRecord,
  updateLocalInspectionRecord,
  type LocalInspectionRecord,
  type PendingInspectionInput,
} from "./local-inspections";

export interface InspectionRecordLike {
  id: string;
  valve_code: string | null;
  inspection_date: string;
  photo_initial_url: string | null;
  photo_during_url: string | null;
  photo_final_url: string | null;
  notes: string | null;
  status: "em_andamento" | "concluido";
}

export interface HistoryFilters {
  page: number;
  pageSize: number;
  search: string;
  status: "all" | "em_andamento" | "concluido";
  dates?: { from: Date; to?: Date };
}

export interface HistoryResult {
  records: InspectionRecordLike[];
  total: number;
  usedLocalFallback: boolean;
}

const dayBounds = (dates?: { from: Date; to?: Date }) => {
  if (!dates?.from) return null;
  const start = new Date(dates.from);
  start.setHours(0, 0, 0, 0);
  const end = new Date(dates.to || dates.from);
  end.setHours(23, 59, 59, 999);
  return { start, end };
};

const filterLocal = (records: LocalInspectionRecord[], filters: HistoryFilters) => {
  const search = filters.search.trim().toLowerCase();
  const bounds = dayBounds(filters.dates);

  return records.filter((record) => {
    if (filters.status !== "all" && record.status !== filters.status) return false;
    if (search) return (record.valve_code || "").toLowerCase().includes(search);
    if (filters.status === "all" && bounds) {
      const date = new Date(record.inspection_date).getTime();
      if (date < bounds.start.getTime() || date > bounds.end.getTime()) return false;
    }
    return true;
  });
};

/** Load history from the hosted database, falling back to local emergency records. */
export const loadInspectionHistory = async (filters: HistoryFilters): Promise<HistoryResult> => {
  const localAll = await getLocalInspectionRecords();
  const local = filterLocal(localAll, filters);

  if (isBackendDown()) {
    const start = (filters.page - 1) * filters.pageSize;
    return {
      records: local.slice(start, start + filters.pageSize),
      total: local.length,
      usedLocalFallback: true,
    };
  }

  try {
    let countQuery = supabase.from("inspection_records").select("*", { count: "exact", head: true });
    let query = supabase.from("inspection_records").select("*");

    if (filters.status !== "all") {
      countQuery = countQuery.eq("status", filters.status);
      query = query.eq("status", filters.status);
    }

    if (filters.search.trim() !== "") {
      countQuery = countQuery.ilike("valve_code", `%${filters.search}%`);
      query = query.ilike("valve_code", `%${filters.search}%`);
    } else if (filters.status === "all") {
      const bounds = dayBounds(filters.dates);
      if (bounds) {
        countQuery = countQuery
          .gte("inspection_date", bounds.start.toISOString())
          .lte("inspection_date", bounds.end.toISOString());
        query = query
          .gte("inspection_date", bounds.start.toISOString())
          .lte("inspection_date", bounds.end.toISOString());
      }
    }

    const { count, error: countError } = await countQuery;
    if (countError) throw countError;

    const from = (filters.page - 1) * filters.pageSize;
    const to = from + filters.pageSize - 1;
    const { data, error } = await query
      .order("inspection_date", { ascending: false })
      .range(from, to);
    if (error) throw error;

    const remote = (data || []) as InspectionRecordLike[];
    const merged = filters.page === 1 ? [...local, ...remote] : remote;

    return {
      records: merged,
      total: (count || 0) + local.length,
      usedLocalFallback: false,
    };
  } catch (error) {
    if (isNetworkFailure(error)) markBackendDown();
    console.warn("Banco indisponível, usando registros locais:", error);
    const start = (filters.page - 1) * filters.pageSize;
    return {
      records: local.slice(start, start + filters.pageSize),
      total: local.length,
      usedLocalFallback: true,
    };
  }
};

/** Save (or update) an inspection; if the database is unavailable, keep it locally. */
export const saveInspection = async (
  input: PendingInspectionInput,
  editingId?: string | null
): Promise<{ savedLocally: boolean }> => {
  const status = input.photoInitial && input.photoDuring && input.photoFinal ? "concluido" : "em_andamento";

  if (editingId && isLocalInspectionId(editingId)) {
    await updateLocalInspectionRecord(editingId, input);
    return { savedLocally: true };
  }

  if (isBackendDown() && !editingId) {
    await saveLocalInspectionRecord(createLocalInspectionRecord(input));
    return { savedLocally: true };
  }

  try {
    if (editingId) {
      const { error } = await supabase
        .from("inspection_records")
        .update({
          valve_code: input.valveCode || null,
          photo_initial_url: input.photoInitial,
          photo_during_url: input.photoDuring,
          photo_final_url: input.photoFinal,
          status,
        })
        .eq("id", editingId);
      if (error) throw error;
    } else {
      const { error } = await supabase.from("inspection_records").insert({
        valve_code: input.valveCode || null,
        photo_initial_url: input.photoInitial,
        photo_during_url: input.photoDuring,
        photo_final_url: input.photoFinal,
        notes: null,
        status,
      });
      if (error) throw error;
    }
    markBackendUp();
    return { savedLocally: false };
  } catch (error) {
    if (isNetworkFailure(error)) markBackendDown();
    console.warn("Banco indisponível, salvando inspeção localmente:", error);
    if (editingId) throw error;
    await saveLocalInspectionRecord(createLocalInspectionRecord(input));
    return { savedLocally: true };
  }
};

export const deleteInspection = async (id: string): Promise<void> => {
  if (isLocalInspectionId(id)) {
    await deleteLocalInspectionRecord(id);
    return;
  }
  const { error } = await supabase.from("inspection_records").delete().eq("id", id);
  if (error) throw error;
};

/** Records for reports: hosted data when available, otherwise the local emergency store. */
export const loadInspectionsForYear = async (year: number) => {
  const startDate = new Date(year, 0, 1);
  const endDate = new Date(year, 11, 31, 23, 59, 59);

  const local = (await getLocalInspectionRecords()).filter((record) => {
    const time = new Date(record.inspection_date).getTime();
    return time >= startDate.getTime() && time <= endDate.getTime();
  });

  if (isBackendDown()) {
    return { records: local, usedLocalFallback: true };
  }

  try {
    const { data, error } = await supabase
      .from("inspection_records")
      .select("inspection_date, status")
      .gte("inspection_date", startDate.toISOString())
      .lte("inspection_date", endDate.toISOString())
      .order("inspection_date", { ascending: true });
    if (error) throw error;
    markBackendUp();
    return { records: [...(data || []), ...local], usedLocalFallback: false };
  } catch (error) {
    if (isNetworkFailure(error)) markBackendDown();
    console.warn("Banco indisponível, relatórios usando dados locais:", error);
    return { records: local, usedLocalFallback: true };
  }
};
