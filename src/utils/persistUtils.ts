/**
 * Utility functions for safely accessing Zustand persist API
 */

/**
 * Type definition for Zustand persist API
 */
interface PersistApi {
  hasHydrated: () => boolean;
  onFinishHydration: (callback: () => void) => void;
}

/**
 * Type guard to check if a store has persist API
 */
function hasPersistApi(store: any): store is { persist: PersistApi } {
  return (
    store && typeof store === 'object' && 'persist' in store && store.persist
  );
}

/**
 * Safely executes a callback when a Zustand store with persist is hydrated
 * @param store - The Zustand store instance
 * @param callback - Function to execute when hydrated
 * @param fallbackDelay - Delay in ms if persist API is not available (default: 0)
 */
export function executeWhenHydrated(
  store: any,
  callback: () => void,
  fallbackDelay: number = 0
): void {
  if (!hasPersistApi(store)) {
    // If no persist API, execute immediately or after fallback delay
    if (fallbackDelay > 0) {
      setTimeout(callback, fallbackDelay);
    } else {
      callback();
    }
    return;
  }

  const persistApi = store.persist;

  // Check if already hydrated
  if (persistApi.hasHydrated()) {
    callback();
    return;
  }

  // Wait for hydration to complete
  if (persistApi.onFinishHydration) {
    persistApi.onFinishHydration(callback);
  } else {
    // Fallback if onFinishHydration is not available
    setTimeout(callback, fallbackDelay);
  }
}

/**
 * Checks if a Zustand store with persist is hydrated
 * @param store - The Zustand store instance
 * @returns true if hydrated, false otherwise
 */
export function isStoreHydrated(store: any): boolean {
  if (!hasPersistApi(store)) {
    return true; // Consider non-persisted stores as "hydrated"
  }

  return store.persist.hasHydrated();
}
