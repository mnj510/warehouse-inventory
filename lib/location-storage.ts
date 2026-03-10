const KEY = 'warehouse_current_location';

export type StoredLocation = { id: string; code: string; name: string };

export function getStoredLocation(): StoredLocation | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as StoredLocation) : null;
  } catch {
    return null;
  }
}

export function setStoredLocation(loc: StoredLocation | null): void {
  if (typeof window === 'undefined') return;
  try {
    if (loc) localStorage.setItem(KEY, JSON.stringify(loc));
    else localStorage.removeItem(KEY);
  } catch {
    /* ignore */
  }
}
