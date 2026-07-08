import { config } from "../config.js";
import { openDatabase } from "../db/connection.js";
import { getMigrationStatus, runMigrations } from "../db/migrations.js";

const command = process.argv[2] ?? "status";
const db = openDatabase({ filename: config.databaseFile });

try {
  if (command === "up") {
    const result = runMigrations(db);

    if (result.applied.length === 0) {
      console.log("No pending migrations.");
    } else {
      console.log(`Applied migrations: ${result.applied.join(", ")}`);
    }
  } else if (command === "status") {
    const statuses = getMigrationStatus(db);

    for (const status of statuses) {
      console.log(`${status.applied ? "up" : "down"} ${status.id} ${status.filename}`);
    }
  } else {
    throw new Error(`Unknown db command: ${command}`);
  }
} finally {
  db.close();
}
