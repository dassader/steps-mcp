import "dotenv/config";

export interface AppConfig {
  port: number;
  host: string;
  publicUrl: string;
  mcpEndpoint: string;
  mcpStateful: boolean;
  mcpJsonResponse: boolean;
  dbPath: string;
  databaseFile: string;
  allowedOrigins: string[];
}

function readBoolean(env: NodeJS.ProcessEnv, name: string, fallback: boolean): boolean {
  const value = env[name];

  if (value === undefined) {
    return fallback;
  }

  return ["1", "true", "yes", "on"].includes(value.toLowerCase());
}

function readPort(env: NodeJS.ProcessEnv): number {
  const raw = env.PORT ?? "3001";
  const port = Number.parseInt(raw, 10);

  if (!Number.isInteger(port) || port <= 0 || port > 65535) {
    throw new Error(`Invalid PORT value: ${raw}`);
  }

  return port;
}

function readAllowedOrigins(env: NodeJS.ProcessEnv): string[] {
  return (env.ALLOWED_ORIGINS ?? "")
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);
}

export function loadConfig(env: NodeJS.ProcessEnv = process.env): AppConfig {
  const port = readPort(env);
  const publicUrl = env.PUBLIC_URL ?? `http://127.0.0.1:${port}`;
  const dbPath = env.DB_PATH ?? env.DATABASE_FILE ?? "steps.db";

  return {
    port,
    host: env.HOST ?? "127.0.0.1",
    publicUrl,
    mcpEndpoint: env.MCP_ENDPOINT ?? "/mcp",
    mcpStateful: readBoolean(env, "MCP_STATEFUL", true),
    mcpJsonResponse: readBoolean(env, "MCP_JSON_RESPONSE", false),
    dbPath,
    databaseFile: dbPath,
    allowedOrigins: readAllowedOrigins(env)
  };
}

export const config = loadConfig();

export function getPlanReviewUrl(planId: string, publicUrl = config.publicUrl): string {
  return `${publicUrl.trim().replace(/\/+$/, "")}/plans/${encodeURIComponent(planId)}`;
}
