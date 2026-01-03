const fs = require("fs");
const path = require("path");
require("dotenv").config();
const { Pool } = require("pg");

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  console.error("❌ Falta DATABASE_URL en tu .env");
  process.exit(1);
}

const pool = new Pool({ connectionString: DATABASE_URL });
const MIGRATIONS_DIR = path.join(__dirname, "..", "db", "migrations");

async function ensureMigrationsTable() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      id SERIAL PRIMARY KEY,
      filename TEXT UNIQUE NOT NULL,
      applied_at TIMESTAMP DEFAULT NOW()
    );
  `);
}

async function getAppliedMigrations() {
  const { rows } = await pool.query("SELECT filename FROM schema_migrations");
  return new Set(rows.map((r) => r.filename));
}

async function applyMigration(filename, sql) {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    await client.query(sql);
    await client.query("INSERT INTO schema_migrations (filename) VALUES ($1)", [filename]);
    await client.query("COMMIT");
    console.log(`✅ Applied: ${filename}`);
  } catch (err) {
    await client.query("ROLLBACK");
    console.error(`❌ Failed: ${filename}`);
    throw err;
  } finally {
    client.release();
  }
}

async function run() {
  await ensureMigrationsTable();

  const files = fs
    .readdirSync(MIGRATIONS_DIR)
    .filter((f) => f.endsWith(".sql"))
    .sort();

  const applied = await getAppliedMigrations();

  for (const file of files) {
    if (applied.has(file)) {
      console.log(`↪️  Skipped: ${file}`);
      continue;
    }
    const sql = fs.readFileSync(path.join(MIGRATIONS_DIR, file), "utf8");
    await applyMigration(file, sql);
  }

  console.log("🎉 Migraciones al día");
  await pool.end();
}

run().catch(async (e) => {
  console.error("💥 Error en migraciones:", e);
  try { await pool.end(); } catch (_) {}
  process.exit(1);
});
