// Server/routes/farms.js
const express = require("express");
const router = express.Router();
const pool = require("../db");
const jwt = require("jsonwebtoken");
require("dotenv").config();

function requireAuth(req, res, next) {
  try {
    const header = req.headers.authorization || "";
    const [type, token] = header.split(" ");

    if (type !== "Bearer" || !token) {
      return res.status(401).json({ error: "UNAUTHORIZED" });
    }

    const payload = jwt.verify(token, process.env.JWT_SECRET);

    req.user = {
      id: payload.id,
      role: payload.role || "user",
      phone: payload.phone,
    };

    return next();
  } catch (err) {
    console.error("Auth error:", err);
    return res.status(401).json({ error: "UNAUTHORIZED" });
  }
}

function canCreateFarm(req) {
  return req.user?.role === "admin" || req.user?.role === "owner";
}

async function canModifyFarm(req, farmId) {
  if (req.user?.role === "admin") return true;
  if (req.user?.role !== "owner") return false;

  const result = await pool.query(
    "SELECT owner_user_id FROM farms WHERE id = $1",
    [farmId]
  );

  if (result.rowCount === 0) return null;

  const ownerId = result.rows[0].owner_user_id;
  return ownerId != null && Number(ownerId) === Number(req.user.id);
}

/* =========================
   GET /farms -> listado público
========================= */
router.get("/", async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT id, name, location, image_url, owner_user_id
       FROM farms
       ORDER BY id DESC`
    );
    return res.json({ farms: result.rows });
  } catch (err) {
    console.error("GET /farms error:", err);
    return res.status(500).json({ error: "SERVER_ERROR" });
  }
});

/* =========================
   GET /farms/:id -> detalle público
========================= */
router.get("/:id", async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id)) return res.status(400).json({ error: "INVALID_ID" });

    const result = await pool.query(
      `SELECT id, name, location, image_url, owner_user_id
       FROM farms
       WHERE id = $1`,
      [id]
    );

    if (result.rowCount === 0) return res.status(404).json({ error: "NOT_FOUND" });

    return res.json({ farm: result.rows[0] });
  } catch (err) {
    console.error("GET /farms/:id error:", err);
    return res.status(500).json({ error: "SERVER_ERROR" });
  }
});

/* =========================
   POST /farms -> crear (owner/admin)
   Body: { name, location, imageUrl }
========================= */
router.post("/", requireAuth, async (req, res) => {
  try {
    if (!canCreateFarm(req)) {
      return res.status(403).json({ error: "FORBIDDEN" });
    }

    const { name, location, imageUrl } = req.body || {};

    if (!name || !String(name).trim()) {
      return res.status(400).json({ error: "NAME_REQUIRED" });
    }

    const result = await pool.query(
      `INSERT INTO farms (name, location, image_url, owner_user_id)
       VALUES ($1, $2, $3, $4)
       RETURNING id, name, location, image_url, owner_user_id`,
      [
        String(name).trim(),
        location ? String(location).trim() : null,
        imageUrl || null,
        req.user.id,
      ]
    );

    return res.status(201).json({ farm: result.rows[0] });
  } catch (err) {
    console.error("POST /farms error:", err);
    return res.status(500).json({ error: "SERVER_ERROR" });
  }
});

/* =========================
   PUT /farms/:id -> editar (owner/admin)
========================= */
router.put("/:id", requireAuth, async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id)) return res.status(400).json({ error: "INVALID_ID" });

    const allowed = await canModifyFarm(req, id);
    if (allowed === null) return res.status(404).json({ error: "NOT_FOUND" });
    if (!allowed) return res.status(403).json({ error: "FORBIDDEN" });

    const { name, location, imageUrl } = req.body || {};

    if (!name || !String(name).trim()) {
      return res.status(400).json({ error: "NAME_REQUIRED" });
    }

    const result = await pool.query(
      `UPDATE farms
       SET name = $1,
           location = $2,
           image_url = $3
       WHERE id = $4
       RETURNING id, name, location, image_url, owner_user_id`,
      [
        String(name).trim(),
        location ? String(location).trim() : null,
        imageUrl || null,
        id,
      ]
    );

    if (result.rowCount === 0) return res.status(404).json({ error: "NOT_FOUND" });

    return res.json({ farm: result.rows[0] });
  } catch (err) {
    console.error("PUT /farms/:id error:", err);
    return res.status(500).json({ error: "SERVER_ERROR" });
  }
});

/* =========================
   DELETE /farms/:id -> eliminar (owner/admin)
========================= */
router.delete("/:id", requireAuth, async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id)) return res.status(400).json({ error: "INVALID_ID" });

    const allowed = await canModifyFarm(req, id);
    if (allowed === null) return res.status(404).json({ error: "NOT_FOUND" });
    if (!allowed) return res.status(403).json({ error: "FORBIDDEN" });

    const result = await pool.query("DELETE FROM farms WHERE id = $1", [id]);
    if (result.rowCount === 0) return res.status(404).json({ error: "NOT_FOUND" });

    return res.json({ ok: true });
  } catch (err) {
    console.error("DELETE /farms/:id error:", err);
    return res.status(500).json({ error: "SERVER_ERROR" });
  }
});

module.exports = router;
