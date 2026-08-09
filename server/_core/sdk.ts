/**
 * Manus SDK stub — the original sdk.ts imported @shared/const and @shared/_core/errors
 * which are Manus-internal packages unavailable on Vercel. This stub replaces it
 * so the import chain does not crash the serverless function.
 *
 * Authentication is now handled entirely by Firebase on the client side.
 * The server verifies Firebase ID tokens in server/_core/firebaseAdmin.ts.
 */

export type SessionPayload = {
  openId: string;
  appId: string;
  name: string;
};

export type AuthenticatedUser = {
  id: number;
  openId: string;
  name: string | null;
  email: string | null;
  loginMethod: string | null;
  role: string;
  createdAt: number;
  updatedAt: number;
  lastSignedIn: number;
};

// No-op stub — never used since Firebase auth is fully client-side.
export const sdk = {
  authenticateRequest: async () => {
    throw new Error("Manus SDK is not available. Use Firebase authentication.");
  },
} as const;
