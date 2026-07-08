import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import cors from "cors";
import express from "express";

import type { SqliteDatabase } from "../db/connection.js";
import { createMcpHttpHandler } from "../mcp/http-handler.js";
import { createOriginGuard, isCorsOriginAllowed } from "./security.js";

export interface CreateAppOptions {
  db: SqliteDatabase;
  publicUrl: string;
  mcpEndpoint: string;
  mcpStateful: boolean;
  mcpJsonResponse: boolean;
  allowedOrigins?: string[];
}

function resolveUiStaticDir(): string | null {
  const moduleDir = path.dirname(fileURLToPath(import.meta.url));
  const candidates = [path.resolve(moduleDir, "..", "public"), path.resolve(process.cwd(), "dist", "public")];
  return candidates.find((candidate) => fs.existsSync(path.join(candidate, "index.html"))) ?? null;
}

export async function createApp(options: CreateAppOptions): Promise<express.Express> {
  const app = express();

  app.disable("x-powered-by");
  app.use(createOriginGuard(options.publicUrl, options.allowedOrigins));
  app.use(
    cors({
      origin: (origin, callback) => callback(null, isCorsOriginAllowed(options.publicUrl, origin, options.allowedOrigins))
    })
  );

  app.get("/health", (_req, res) => {
    const migrationCount =
      options.db
        .prepare<[], { count: number }>("SELECT COUNT(*) AS count FROM schema_migrations")
        .get()?.count ?? 0;

    res.json({
      ok: true,
      status: "ok",
      name: "steps-mcp",
      mcpEndpoint: options.mcpEndpoint,
      database: {
        memory: options.db.memory,
        migrationsApplied: migrationCount
      }
    });
  });

  app.all(
    options.mcpEndpoint,
    express.text({ type: "*/*", limit: "4mb" }),
    createMcpHttpHandler({ db: options.db, publicUrl: options.publicUrl })
  );

  const uiStaticDir = resolveUiStaticDir();
  if (uiStaticDir) {
    app.use(express.static(uiStaticDir, { index: false }));
    app.get(["/", "/plans/:planId"], (_req, res) => {
      res.sendFile(path.join(uiStaticDir, "index.html"));
    });
  }

  app.use((error: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
    console.error(error);
    if (!res.headersSent) {
      res.status(500).json({
        ok: false,
        message: "Internal server error."
      });
    }
  });

  return app;
}
