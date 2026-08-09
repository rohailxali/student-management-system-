import type { Express, Request, Response } from "express";
import { ENV } from "./env";

export function registerStorageProxy(app: Express): void {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  app.get("/manus-storage/*", async (req: Request, res: Response): Promise<any> => {
    // Extract path after /manus-storage/
    const fullPath = req.path.replace(/^\/manus-storage\//, "");
    if (!fullPath) {
      return res.status(400).send("Missing storage key");
    }

    if (!ENV.forgeApiUrl || !ENV.forgeApiKey) {
      return res.status(500).send("Storage proxy not configured");
    }

    try {
      const forgeUrl = new URL(
        "v1/storage/presign/get",
        ENV.forgeApiUrl.replace(/\/+$/, "") + "/",
      );
      forgeUrl.searchParams.set("path", fullPath);

      const forgeResp = await fetch(forgeUrl.toString(), {
        headers: { Authorization: `Bearer ${ENV.forgeApiKey}` },
      });

      if (!forgeResp.ok) {
        const body = await forgeResp.text().catch(() => "");
        console.error(`[StorageProxy] forge error: ${forgeResp.status} ${body}`);
        return res.status(502).send("Storage backend error");
      }

      const { url } = (await forgeResp.json()) as { url: string };
      if (!url) {
        return res.status(502).send("Empty signed URL from backend");
      }

      res.set("Cache-Control", "no-store");
      return res.redirect(307, url);
    } catch (err) {
      console.error("[StorageProxy] failed:", err);
      return res.status(502).send("Storage proxy error");
    }
  });
}
