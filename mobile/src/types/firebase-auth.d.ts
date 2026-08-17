import type { Persistence } from "firebase/auth";

/**
 * Firebase 12's React Native runtime exports this helper, but the top-level
 * firebase/auth declaration currently resolves to its platform-neutral types.
 */
declare module "firebase/auth" {
  export function getReactNativePersistence(storage: {
    setItem(key: string, value: string): Promise<void>;
    getItem(key: string): Promise<string | null>;
    removeItem(key: string): Promise<void>;
  }): Persistence;
}
