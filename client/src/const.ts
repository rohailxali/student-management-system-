export { COOKIE_NAME, ONE_YEAR_MS } from "@shared/const";
import { signInWithGoogle } from "@/lib/firebase";

/**
 * Start the Firebase Google Sign-In popup flow.
 * Call from an event handler only — never during render.
 */
export const startLogin = async () => {
  try {
    await signInWithGoogle();
  } catch (error: unknown) {
    // User closed the popup — not an error worth reporting
    if ((error as { code?: string })?.code === "auth/popup-closed-by-user") return;
    console.error("[Auth] Sign-in failed:", error);
  }
};
