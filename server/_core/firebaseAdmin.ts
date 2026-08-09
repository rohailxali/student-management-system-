import { initializeApp, getApps, cert, type App } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";

let _app: App | null = null;

function getAdminApp(): App {
  if (_app) return _app;

  const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n");
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const projectId = process.env.FIREBASE_PROJECT_ID;

  if (!projectId || !clientEmail || !privateKey) {
    throw new Error(
      "[Firebase Admin] Missing env vars: FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, FIREBASE_PRIVATE_KEY"
    );
  }

  // Avoid re-initializing during hot-reload
  if (getApps().length > 0) {
    _app = getApps()[0]!;
  } else {
    _app = initializeApp({
      credential: cert({ projectId, clientEmail, privateKey }),
    });
  }

  return _app;
}

/**
 * Verifies a Firebase ID token and returns the decoded payload.
 * Throws if the token is invalid or expired.
 */
export async function verifyIdToken(idToken: string) {
  const app = getAdminApp();
  return getAuth(app).verifyIdToken(idToken);
}
