// A minimal key-value store. The app passes AsyncStorage; tests pass the in-memory fake below.

export interface KeyValueStorage {
  getItem(key: string): Promise<string | null>;
  setItem(key: string, value: string): Promise<void>;
  removeItem(key: string): Promise<void>;
}

/** Versioned keys: bump the suffix if a stored format ever changes incompatibly. */
export const storageKeys = {
  profile: 'consequences.profile.v1',
  run: (rulerId: string) => `consequences.run.${rulerId}.v1`,
} as const;

/** An in-memory store for tests. `contents` exposes what was written. */
export function memoryStorage(initial: Record<string, string> = {}): KeyValueStorage & {
  readonly contents: Map<string, string>;
} {
  const contents = new Map(Object.entries(initial));
  return {
    contents,
    async getItem(key) {
      return contents.get(key) ?? null;
    },
    async setItem(key, value) {
      contents.set(key, value);
    },
    async removeItem(key) {
      contents.delete(key);
    },
  };
}
