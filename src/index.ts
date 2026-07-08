import { config } from "./config.js";
import { openDatabase } from "./db/connection.js";
import { runMigrations } from "./db/migrations.js";
import { createApp } from "./http/app.js";

const db = openDatabase({ filename: config.databaseFile });
const migrationResult = runMigrations(db);
const app = await createApp({
  db,
  publicUrl: config.publicUrl,
  mcpEndpoint: config.mcpEndpoint,
  mcpStateful: config.mcpStateful,
  mcpJsonResponse: config.mcpJsonResponse,
  allowedOrigins: config.allowedOrigins
});

app.listen(config.port, config.host, () => {
  console.log(`Steps MCP listening on ${config.publicUrl}${config.mcpEndpoint}`);
  if (migrationResult.applied.length > 0) {
    console.log(`Applied migrations: ${migrationResult.applied.join(", ")}`);
  }
});
