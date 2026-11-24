import { useCallback, useSyncExternalStore } from "react";

// A per-viewer setting kept in browser storage, such as a collapsed
// sidebar or starred rows. The server renders the fallback; the browser
// switches to the stored value after hydration. If storage is blocked,
// the value lives in memory for the visit.

const memory = new Map<string, string>();
const listeners = new Set<() => void>();

function subscribe(callback: () => void) {
  listeners.add(callback);
  window.addEventListener("storage", callback);
  return () => {
    listeners.delete(callback);
    window.removeEventListener("storage", callback);
  };
}

function read(key: string) {
  try {
    const stored = localStorage.getItem(key);
    if (stored != null) return stored;
  } catch {}
  return memory.get(key) ?? null;
}

export function useStored(key: string): [string | null, (value: string) => void] {
  const value = useSyncExternalStore(
    subscribe,
    () => read(key),
    () => null,
  );
  const set = useCallback(
    (next: string) => {
      memory.set(key, next);
      try {
        localStorage.setItem(key, next);
      } catch {}
      listeners.forEach((l) => l());
    },
    [key],
  );
  return [value, set];
}
