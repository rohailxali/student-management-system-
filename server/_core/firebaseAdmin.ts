/**
 * Firebase token verification using the Firebase REST API.
 *
 * firebase-admin uses gRPC native bindings that are incompatible with
 * Vercel's serverless runtime. This implementation verifies Firebase ID tokens
 * by fetching Google's public JWK certificates and validating the JWT manually
 * using the `jose` library (already a project dependency).
 */
import * as jose from "jose";

const GOOGLE_CERTS_URL =
  "https://www.googleapis.com/robot/v1/metadata/x509/securetoken@system.gserviceaccount.com";

let _certsCache: Record<string, string> | null = null;
let _certsCacheExpiry = 0;

async function getPublicCerts(): Promise<Record<string, string>> {
  if (_certsCache && Date.now() < _certsCacheExpiry) {
    return _certsCache;
  }

  const res = await fetch(GOOGLE_CERTS_URL);
  if (!res.ok) {
    throw new Error(`[Firebase] Failed to fetch public certs: ${res.status}`);
  }

  // Google sends Cache-Control: max-age=N
  const cacheControl = res.headers.get("cache-control") ?? "";
  const maxAgeMatch = cacheControl.match(/max-age=(\d+)/);
  const maxAge = maxAgeMatch ? parseInt(maxAgeMatch[1]) * 1000 : 3_600_000;
  _certsCacheExpiry = Date.now() + maxAge;

  _certsCache = (await res.json()) as Record<string, string>;
  return _certsCache;
}

export type DecodedFirebaseToken = {
  uid: string;
  email?: string;
  name?: string;
};

/**
 * Verifies a Firebase ID token using Google's public certificates.
 * Returns a decoded token object, or null if the token is invalid.
 */
export async function verifyIdToken(
  idToken: string
): Promise<DecodedFirebaseToken | null> {
  const projectId = process.env.FIREBASE_PROJECT_ID;
  if (!projectId) {
    console.warn("[Firebase] FIREBASE_PROJECT_ID not set — skipping token verification.");
    return null;
  }

  try {
    const certs = await getPublicCerts();

    // Decode the token header to find which key ID (kid) signed it
    const decoded = jose.decodeProtectedHeader(idToken);
    const kid = decoded.kid;
    if (!kid || !certs[kid]) {
      console.warn("[Firebase] Token kid not found in Google public certs.");
      return null;
    }

    // Import the X.509 certificate and verify the JWT
    const publicKey = await jose.importX509(certs[kid], "RS256");
    const { payload } = await jose.jwtVerify(idToken, publicKey, {
      issuer: `https://securetoken.google.com/${projectId}`,
      audience: projectId,
    });

    const uid = payload.sub;
    if (!uid) return null;

    return {
      uid,
      email: payload.email as string | undefined,
      name: payload.name as string | undefined,
    };
  } catch (err) {
    console.warn("[Firebase] Token verification failed:", (err as Error).message);
    return null;
  }
}
