/** Lectura y escritura segura en Web Storage (modo privado, cuota llena o datos corruptos). */
export function readJSON<T = unknown>(key: string, storage: Storage = localStorage): T | null {
  try {
    const raw = storage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

export function writeJSON(key: string, value: unknown, storage: Storage = localStorage): void {
  try {
    storage.setItem(key, JSON.stringify(value));
  } catch {
    // Sin almacenamiento disponible: la demo sigue funcionando en memoria.
  }
}

export function removeKey(key: string, storage: Storage = localStorage): void {
  try {
    storage.removeItem(key);
  } catch {
    // Ignorado a propósito.
  }
}
