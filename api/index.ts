import type { Request, Response } from "express";

export default async function (req: Request, res: Response) {
  try {
    const appModule = await import("./app.js");
    return appModule.default(req, res);
  } catch (error: any) {
    console.error("FATAL MODULE LOAD ERROR:", error);
    res.status(500).json({
      error: "FATAL MODULE LOAD ERROR",
      message: error?.message || String(error),
      stack: error?.stack,
    });
  }
}
