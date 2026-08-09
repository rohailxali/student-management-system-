import type { Express } from "express";

/**
 * OAuth routes previously handled Manus authentication.
 * Now replaced by Firebase Authentication on the client side.
 * This stub is kept so existing imports in index.ts don't break.
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function registerOAuthRoutes(_app: Express): void {
  // No-op: Firebase handles auth entirely on the client.
}
