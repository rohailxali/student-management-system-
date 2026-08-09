import { auth, signOutFirebase, getIdToken } from "@/lib/firebase";
import { trpc } from "@/lib/trpc";
import { onAuthStateChanged } from "firebase/auth";
import { useCallback, useEffect, useState } from "react";

type AuthUser = {
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

type UseAuthOptions = {
  redirectOnUnauthenticated?: boolean;
  redirectPath?: string;
};

export function useAuth(_options?: UseAuthOptions) {
  const [firebaseReady, setFirebaseReady] = useState(false);
  const [firebaseSignedIn, setFirebaseSignedIn] = useState(false);

  // Listen to Firebase auth state changes
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (fbUser) => {
      setFirebaseSignedIn(!!fbUser);
      setFirebaseReady(true);
    });
    return unsubscribe;
  }, []);

  const utils = trpc.useUtils();

  // Fetch the server-side user record (which also upserts the user in MySQL)
  const meQuery = trpc.auth.me.useQuery(undefined, {
    enabled: firebaseReady && firebaseSignedIn,
    retry: false,
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

  const loading = !firebaseReady || (firebaseSignedIn && meQuery.isLoading);
  const user = (meQuery.data as AuthUser | null | undefined) ?? null;

  return {
    user,
    loading,
    error: meQuery.error ?? null,
    isAuthenticated: firebaseSignedIn && !!user,
    refresh: () => meQuery.refetch(),
    logout,
  };
}
