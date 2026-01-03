require("dotenv").config();
const { Pool } = require("pg");
const bcrypt = require("bcrypt");

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  console.error("❌ Falta DATABASE_URL en .env");
  process.exit(1);
}

const pool = new Pool({ connectionString: DATABASE_URL });

async function upsertUser({ name, phone, email, password, role }) {
  const passwordHash = await bcrypt.hash(password, 10);

  // Idempotente: si ya existe ese phone, no inserta de nuevo
  const query = `
    INSERT INTO users (name, phone, email, password_hash, role)
    VALUES ($1, $2, $3, $4, $5)
    ON CONFLICT (phone) DO NOTHING
    RETURNING id, name, phone, role;
  `;
  const values = [name, phone, email, passwordHash, role];

  const { rows } = await pool.query(query, values);
  return rows[0] || null;
}

async function run() {
  const users = [
    {
      name: "Admin Test",
      phone: "3227693393",
      email: "admin@test.com",
      password: "123456",
      role: "admin",
    },
    {
      name: "Owner Test",
      phone: "1234567890",
      email: "owner@test.com",
      password: "123456*",
      role: "owner",
    },
    {
      name: "User Test",
      phone: "3008230984",
      email: "user@test.com",
      password: "123456",
      role: "user",
    },
  ];

  for (const u of users) {
    const inserted = await upsertUser(u);
    if (inserted) {
      console.log("✅ Seed user created:", inserted);
    } else {
      console.log(`↪️  Seed user already exists (phone): ${u.phone}`);
    }
  }

  await pool.end();
  console.log("🎉 Seed terminado");
}

run().catch(async (err) => {
  console.error("💥 Error en seed:", err);
  try { await pool.end(); } catch (_) {}
  process.exit(1);
});
