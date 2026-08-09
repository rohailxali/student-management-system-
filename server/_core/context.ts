/* eslint-disable @typescript-eslint/no-explicit-any */
import type { User } from "../../drizzle/schema";
import { getUserByOpenId, upsertUser } from "../db";
import { verifyIdToken } from "./firebaseAdmin";

export type TrpcContext = {
  req: any;
  res: any;
  user: User | null;
};

export async function createContext(opts: { req: any; res: any }): Promise<TrpcContext> {
  let user: User | null = null;

  // Extract Bearer token from the Authorization header
  const authHeader: string | undefined =
    typeof opts.req?.headers?.authorization === "string"
      ? opts.req.headers.authorization
      : undefined;

  if (authHeader?.startsWith("Bearer ")) {
    const idToken = authHeader.slice(7);
    const decoded = await verifyIdToken(idToken);

    if (decoded) {
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
  }

  return {
    req: opts.req,
    res: opts.res,
    user,
  };
}
