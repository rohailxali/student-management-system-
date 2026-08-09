import { auth, signOutFirebase, getIdToken } from "@/lib/firebase";
import { trpc } from "@/lib/trpc";
import { onAuthStateChanged, type User as FirebaseUser } from "firebase/auth";
import { useCallback, useEffect, useState } from "react";

type DbUser = {
  id: number;
  openId: string;
  name: string | null;
  email: string | null;
  loginMethod: string | null;
  role: "user" | "admin";
  createdAt: number;
  updatedAt: number;
  lastSignedIn: number;
};

/**
 * A merged view of the authenticated user — uses the database record when
 * available, but falls back to Firebase data so the UI is never stuck on
 * the sign-in screen just because the DB hasn't responded yet.
 */
export type AuthUser = {
  id: number | null;        // null until DB record is created
  openId: string;
  name: string | null;
  email: string | null;
  loginMethod: string | null;
  role: "user" | "admin";
};

type UseAuthOptions = {
  redirectOnUnauthenticated?: boolean;
};

export function useAuth(_options?: UseAuthOptions) {
  const [firebaseReady, setFirebaseReady] = useState(false);
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);

  // Firebase is the single source of truth for whether the user is signed in
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (fbUser) => {
      setFirebaseUser(fbUser);
      setFirebaseReady(true);
    });
    return unsubscribe;
  }, []);

  const firebaseSignedIn = !!firebaseUser;
  const utils = trpc.useUtils();

  // Fetch the server-side DB user record (also upserts the user in MySQL)
  const meQuery = trpc.auth.me.useQuery(undefined, {
    enabled: firebaseReady && firebaseSignedIn,
    retry: 1,
    refetchOnWindowFocus: false,
  });

  const logout = useCallback(async () => {
    try {
      await signOutFirebase();
      utils.auth.me.setData(undefined, null);
      await utils.auth.me.invalidate();
    } catch (error) {
      console.error("[Auth] Sign-out failed:", error);
    }
  }, [utils]);

  // Build the merged user object:
  // - Use DB data when available (has role, id, etc.)
  // - Fall back to Firebase data so the layout unlocks immediately after sign-in
  const dbUser = meQuery.data as DbUser | null | undefined;
  const user: AuthUser | null = firebaseUser
    ? {
        id: dbUser?.id ?? null,
        openId: dbUser?.openId ?? firebaseUser.uid,
        name: dbUser?.name ?? firebaseUser.displayName ?? null,
        email: dbUser?.email ?? firebaseUser.email ?? null,
        loginMethod: dbUser?.loginMethod ?? "google",
        role: dbUser?.role ?? "user",
      }
    : null;

  // Loading: true only until Firebase has resolved its initial state.
  // We don't block on the DB query so the UI never gets stuck.
  const loading = !firebaseReady;

  return {
    user,
    loading,
    error: meQuery.error ?? null,
    isAuthenticated: firebaseSignedIn,
    refresh: () => meQuery.refetch(),
    logout,
  };
}
