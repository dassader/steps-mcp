import type express from "express";

export function createOriginGuard(publicUrl: string, configuredOrigins: string[] = []): express.RequestHandler {
  const allowedOrigins = new Set(defaultAllowedOrigins(publicUrl, configuredOrigins));

  return (req, res, next) => {
    const origin = req.get("Origin");
    if (!origin || allowedOrigins.has(origin)) {
      next();
      return;
    }

    res.status(403).json({
      ok: false,
      code: "ORIGIN_FORBIDDEN",
      message: "Origin is not allowed."
    });
  };
}

export function isCorsOriginAllowed(publicUrl: string, origin: string | undefined, configuredOrigins: string[] = []): boolean {
  if (!origin) return true;
  return new Set(defaultAllowedOrigins(publicUrl, configuredOrigins)).has(origin);
}

function defaultAllowedOrigins(publicUrl: string, configuredOrigins: string[]): string[] {
  return unique([
    "http://localhost:3001",
    "http://127.0.0.1:3001",
    "http://localhost:3000",
    "http://127.0.0.1:3000",
    publicOrigin(publicUrl),
    ...configuredOrigins
  ]);
}

function publicOrigin(publicUrl: string): string {
  try {
    return new URL(publicUrl).origin;
  } catch {
    return "";
  }
}

function unique(values: string[]): string[] {
  return [...new Set(values.filter(Boolean))];
}
