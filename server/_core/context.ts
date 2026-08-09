import type { CreateExpressContextOptions } from "@trpc/server/adapters/express";
import type { User } from "../../drizzle/schema";
import { getUserByOpenId, upsertUser } from "../db";
import { verifyIdToken } from "./firebaseAdmin";

export type TrpcContext = {
  req: CreateExpressContextOptions["req"];
  res: CreateExpressContextOptions["res"];
  user: User | null;
};

export async function createContext(
  opts: CreateExpressContextOptions
): Promise<TrpcContext> {
  let user: User | null = null;

  try {
    // Extract Bearer token from the Authorization header
    const authHeader = opts.req.headers.authorization;
    if (authHeader?.startsWith("Bearer ")) {
      const idToken = authHeader.slice(7);
      const decoded = await verifyIdToken(idToken);

      // Upsert the user into the database on every request (updates lastSignedIn)
      await upsertUser({
        openId: decoded.uid,
        name: decoded.name ?? null,
        email: decoded.email ?? null,
        loginMethod: "google",
        lastSignedIn: Math.floor(Date.now() / 1000),
      });

      const dbUser = await getUserByOpenId(decoded.uid);
      user = dbUser ?? null;
    }
  } catch (error) {
    // Token invalid / expired — treat as unauthenticated
    user = null;
  }

  return {
    req: opts.req,
    res: opts.res,
    user,
  };
}
