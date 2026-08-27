/**
 * Circuit breaker for the hosted backend.
 *
 * When the backend is paused/unreachable, every request fails with a network
 * error after a long wait. To keep the app usable in "local mode" we remember
 * the failure for a short period and skip remote calls entirely.
 */

const STORAGE_KEY = "backend_down_until_v1";
const DOWN_WINDOW_MS = 2 * 60 * 1000; // 2 minutes

let downUntil = 0;

const readStored = () => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? Number(raw) || 0 : 0;
  } catch {
    return 0;
  }
};

downUntil = readStored();

/** True when the backend recently failed with a network-level error. */
export const isBackendDown = (): boolean => {
  if (!downUntil) downUntil = readStored();
  return Date.now() < downUntil;
};

/** Mark the backend as unreachable for a short window. */
export const markBackendDown = () => {
  downUntil = Date.now() + DOWN_WINDOW_MS;
  try {
    localStorage.setItem(STORAGE_KEY, String(downUntil));
  } catch {
    /* ignore */
  }
  window.dispatchEvent(new CustomEvent("backend-status-changed", { detail: { down: true } }));
};

/** Clear the breaker after a successful request. */
export const markBackendUp = () => {
  downUntil = 0;
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    /* ignore */
  }
  window.dispatchEvent(new CustomEvent("backend-status-changed", { detail: { down: false } }));
};

/** Network-level failures (DNS, offline, paused project) vs. real API errors. */
export const isNetworkFailure = (error: unknown): boolean => {
  const message = (error instanceof Error ? error.message : String(error ?? "")).toLowerCase();
  return (
    message.includes("failed to fetch") ||
    message.includes("networkerror") ||
    message.includes("network error") ||
    message.includes("err_name_not_resolved") ||
    message.includes("load failed") ||
    message.includes("timeout")
  );
};

/** Run a remote call, updating the breaker based on the outcome. */
export const withBackendBreaker = async <T>(run: () => Promise<T>): Promise<T> => {
  try {
    const result = await run();
    markBackendUp();
    return result;
  } catch (error) {
    if (isNetworkFailure(error)) markBackendDown();
    throw error;
  }
};
