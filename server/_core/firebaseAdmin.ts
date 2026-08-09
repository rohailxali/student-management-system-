import { initializeApp, getApps, cert, type App } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";

let _app: App | null = null;

function getAdminApp(): App | null {
  if (_app) return _app;

  const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n");
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const projectId = process.env.FIREBASE_PROJECT_ID;

  // Return null gracefully if env vars are not configured yet
  // (e.g. local dev without .env, or during Vite build phase)
  if (!projectId || !clientEmail || !privateKey) {
    console.warn(
      "[Firebase Admin] Skipping init — FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, or FIREBASE_PRIVATE_KEY not set."
    );
    return null;
  }

  try {
    // Avoid re-initializing during hot-reload
    if (getApps().length > 0) {
      _app = getApps()[0]!;
    } else {
      _app = initializeApp({
        credential: cert({ projectId, clientEmail, privateKey }),
      });
    }
  } catch (err) {
    console.error("[Firebase Admin] initializeApp failed:", err);
    return null;
  }

  return _app;
}

/**
 * Verifies a Firebase ID token and returns the decoded payload.
 * Returns null if Firebase Admin is not configured or the token is invalid.
 */
export async function verifyIdToken(idToken: string) {
  const app = getAdminApp();
  if (!app) return null;

  try {
    return await getAuth(app).verifyIdToken(idToken);
  } catch (err) {
    // Token expired, revoked, or malformed — treat as unauthenticated
    console.warn("[Firebase Admin] Token verification failed:", (err as Error).message);
    return null;
  }
}
