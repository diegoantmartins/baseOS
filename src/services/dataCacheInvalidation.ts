/**
 * BaseOS — Data Cache Invalidation Bus
 * 
 * Barramento leve de eventos para invalidação automática de caches em memória
 * quando ocorrem mutações (escritas, atualizações, homologações e resets).
 */

const listeners: Set<() => void> = new Set();

export function registerCacheInvalidationListener(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function notifyCacheInvalidation(): void {
  listeners.forEach((listener) => {
    try {
      listener();
    } catch (err) {
      console.warn('Erro ao invalidar cache:', err);
    }
  });
}
