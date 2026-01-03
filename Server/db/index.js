// Server/db/index.js
const { Pool } = require("pg");
require("dotenv").config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  // ssl: process.env.PGSSLMODE === "require" ? { rejectUnauthorized: false } : false,
});

pool.on("error", (err) => {
  console.error("Error inesperado en el Pool de PostgreSQL:", err);
});

module.exports = pool;
