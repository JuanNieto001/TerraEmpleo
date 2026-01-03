// Server/routes/offers.js
const express = require("express");
const router = express.Router({ mergeParams: true });
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

function canCreateOffer(req) {
  return req.user?.role === "admin" || req.user?.role === "owner";
}

async function canModifyOffersOfFarm(req, farmId) {
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
   GET /farms/:farmId/offers -> listado público
========================= */
router.get("/:farmId/offers", async (req, res) => {
  try {
    const farmId = Number(req.params.farmId);
    if (!Number.isInteger(farmId)) {
      return res.status(400).json({ error: "INVALID_FARM_ID" });
    }

    const farm = await pool.query("SELECT id FROM farms WHERE id=$1", [farmId]);
    if (farm.rowCount === 0) {
      return res.status(404).json({ error: "FARM_NOT_FOUND" });
    }

    const result = await pool.query(
      `SELECT
         id, farm_id, title, work_type, people_needed,
         start_date, end_date, hours_per_day, schedule_note,
         city, municipality, village,
         pay_amount, pay_period,
         accommodation_included, transport_included,
         food_included, food_cost,
         extra_info, status, created_at
       FROM job_offers
       WHERE farm_id = $1
       ORDER BY id DESC`,
      [farmId]
    );

    return res.json({ offers: result.rows });
  } catch (err) {
    console.error("GET /farms/:farmId/offers error:", err);
    return res.status(500).json({ error: "SERVER_ERROR" });
  }
});

/* =========================
   GET /farms/:farmId/offers/:offerId -> detalle
========================= */
router.get("/:farmId/offers/:offerId", async (req, res) => {
  try {
    const farmId = Number(req.params.farmId);
    const offerId = Number(req.params.offerId);

    if (!Number.isInteger(farmId)) return res.status(400).json({ error: "INVALID_FARM_ID" });
    if (!Number.isInteger(offerId)) return res.status(400).json({ error: "INVALID_OFFER_ID" });

    const result = await pool.query(
      `SELECT
         id, farm_id, title, work_type, people_needed,
         start_date, end_date, hours_per_day, schedule_note,
         city, municipality, village,
         pay_amount, pay_period,
         accommodation_included, transport_included,
         food_included, food_cost,
         extra_info, status, created_at
       FROM job_offers
       WHERE farm_id=$1 AND id=$2`,
      [farmId, offerId]
    );

    if (result.rowCount === 0) return res.status(404).json({ error: "OFFER_NOT_FOUND" });

    return res.json({ offer: result.rows[0] });
  } catch (err) {
    console.error("GET /farms/:farmId/offers/:offerId error:", err);
    return res.status(500).json({ error: "SERVER_ERROR" });
  }
});

/* =========================
   POST /farms/:farmId/offers -> crear oferta (owner/admin)
========================= */
router.post("/:farmId/offers", requireAuth, async (req, res) => {
  try {
    if (!canCreateOffer(req)) return res.status(403).json({ error: "FORBIDDEN" });

    const farmId = Number(req.params.farmId);
    if (!Number.isInteger(farmId)) return res.status(400).json({ error: "INVALID_FARM_ID" });

    const allowed = await canModifyOffersOfFarm(req, farmId);
    if (allowed === null) return res.status(404).json({ error: "FARM_NOT_FOUND" });
    if (!allowed) return res.status(403).json({ error: "FORBIDDEN" });

    const body = req.body || {};

    const title = body.title ? String(body.title).trim() : "";
    const work_type = body.work_type ? String(body.work_type).trim() : "";
    const people_needed = Number(body.people_needed);

    const start_date = body.start_date ? String(body.start_date).trim() : "";
    const end_date = body.end_date ? String(body.end_date).trim() : "";

    const hours_per_day = Number(body.hours_per_day);

    const schedule_note =
      body.schedule_note !== undefined && body.schedule_note !== null
        ? String(body.schedule_note).trim()
        : null;

    const city = body.city != null && String(body.city).trim() ? String(body.city).trim() : null;
    const municipality =
      body.municipality != null && String(body.municipality).trim()
        ? String(body.municipality).trim()
        : null;
    const village =
      body.village != null && String(body.village).trim()
        ? String(body.village).trim()
        : null;

    const pay_amount = Number(body.pay_amount);
    const pay_period = body.pay_period ? String(body.pay_period).trim() : "";

    const accommodation_included = Boolean(body.accommodation_included);
    const transport_included = Boolean(body.transport_included);
    const food_included = Boolean(body.food_included);

    let food_cost = null;
    if (food_included) {
      food_cost =
        body.food_cost === undefined || body.food_cost === null || body.food_cost === ""
          ? 0
          : Number(body.food_cost);
      if (Number.isNaN(food_cost) || food_cost < 0) {
        return res.status(400).json({ error: "INVALID_FOOD_COST" });
      }
    }

    const extra_info =
      body.extra_info !== undefined && body.extra_info !== null
        ? String(body.extra_info).trim()
        : null;

    const status = body.status ? String(body.status).trim() : "open";

    if (!title) return res.status(400).json({ error: "TITLE_REQUIRED" });
    if (!work_type) return res.status(400).json({ error: "WORK_TYPE_REQUIRED" });
    if (!Number.isInteger(people_needed) || people_needed <= 0) {
      return res.status(400).json({ error: "INVALID_PEOPLE_NEEDED" });
    }
    if (!start_date || !end_date) return res.status(400).json({ error: "DATES_REQUIRED" });
    if (!Number.isFinite(hours_per_day) || hours_per_day <= 0 || hours_per_day > 24) {
      return res.status(400).json({ error: "INVALID_HOURS_PER_DAY" });
    }
    if (!Number.isFinite(pay_amount) || pay_amount <= 0) {
      return res.status(400).json({ error: "INVALID_PAY_AMOUNT" });
    }
    if (!pay_period) return res.status(400).json({ error: "PAY_PERIOD_REQUIRED" });

    const result = await pool.query(
      `INSERT INTO job_offers (
        farm_id, title, work_type, people_needed,
        start_date, end_date,
        hours_per_day, schedule_note,
        city, municipality, village,
        pay_amount, pay_period,
        accommodation_included, transport_included,
        food_included, food_cost,
        extra_info, status
      )
      VALUES (
        $1,$2,$3,$4,
        $5,$6,
        $7,$8,
        $9,$10,$11,
        $12,$13,
        $14,$15,
        $16,$17,
        $18,$19
      )
      RETURNING
        id, farm_id, title, work_type, people_needed,
        start_date, end_date, hours_per_day, schedule_note,
        city, municipality, village,
        pay_amount, pay_period,
        accommodation_included, transport_included,
        food_included, food_cost,
        extra_info, status, created_at`,
      [
        farmId,
        title,
        work_type,
        people_needed,
        start_date,
        end_date,
        hours_per_day,
        schedule_note,
        city,
        municipality,
        village,
        pay_amount,
        pay_period,
        accommodation_included,
        transport_included,
        food_included,
        food_cost,
        extra_info,
        status,
      ]
    );

    return res.status(201).json({ offer: result.rows[0] });
  } catch (err) {
    console.error("POST /farms/:farmId/offers error:", err);
    return res.status(500).json({ error: "SERVER_ERROR" });
  }
});

/* =========================
   PUT /farms/:farmId/offers/:offerId -> editar (owner/admin)
========================= */
router.put("/:farmId/offers/:offerId", requireAuth, async (req, res) => {
  try {
    if (!canCreateOffer(req)) return res.status(403).json({ error: "FORBIDDEN" });

    const farmId = Number(req.params.farmId);
    const offerId = Number(req.params.offerId);

    if (!Number.isInteger(farmId)) return res.status(400).json({ error: "INVALID_FARM_ID" });
    if (!Number.isInteger(offerId)) return res.status(400).json({ error: "INVALID_OFFER_ID" });

    const allowed = await canModifyOffersOfFarm(req, farmId);
    if (allowed === null) return res.status(404).json({ error: "FARM_NOT_FOUND" });
    if (!allowed) return res.status(403).json({ error: "FORBIDDEN" });

    const exist = await pool.query(
      "SELECT id FROM job_offers WHERE id=$1 AND farm_id=$2",
      [offerId, farmId]
    );
    if (exist.rowCount === 0) return res.status(404).json({ error: "OFFER_NOT_FOUND" });

    const body = req.body || {};

    const title = body.title ? String(body.title).trim() : "";
    const work_type = body.work_type ? String(body.work_type).trim() : "";
    const people_needed = Number(body.people_needed);

    const start_date = body.start_date ? String(body.start_date).trim() : "";
    const end_date = body.end_date ? String(body.end_date).trim() : "";

    const hours_per_day = Number(body.hours_per_day);

    const schedule_note =
      body.schedule_note !== undefined && body.schedule_note !== null
        ? String(body.schedule_note).trim()
        : null;

    const city = body.city != null && String(body.city).trim() ? String(body.city).trim() : null;
    const municipality =
      body.municipality != null && String(body.municipality).trim()
        ? String(body.municipality).trim()
        : null;
    const village =
      body.village != null && String(body.village).trim()
        ? String(body.village).trim()
        : null;

    const pay_amount = Number(body.pay_amount);
    const pay_period = body.pay_period ? String(body.pay_period).trim() : "";

    const accommodation_included = Boolean(body.accommodation_included);
    const transport_included = Boolean(body.transport_included);
    const food_included = Boolean(body.food_included);

    let food_cost = null;
    if (food_included) {
      food_cost =
        body.food_cost === undefined || body.food_cost === null || body.food_cost === ""
          ? 0
          : Number(body.food_cost);
      if (Number.isNaN(food_cost) || food_cost < 0) {
        return res.status(400).json({ error: "INVALID_FOOD_COST" });
      }
    }

    const extra_info =
      body.extra_info !== undefined && body.extra_info !== null
        ? String(body.extra_info).trim()
        : null;

    const status = body.status ? String(body.status).trim() : "open";

    if (!title) return res.status(400).json({ error: "TITLE_REQUIRED" });
    if (!work_type) return res.status(400).json({ error: "WORK_TYPE_REQUIRED" });
    if (!Number.isInteger(people_needed) || people_needed <= 0) {
      return res.status(400).json({ error: "INVALID_PEOPLE_NEEDED" });
    }
    if (!start_date || !end_date) return res.status(400).json({ error: "DATES_REQUIRED" });
    if (!Number.isFinite(hours_per_day) || hours_per_day <= 0 || hours_per_day > 24) {
      return res.status(400).json({ error: "INVALID_HOURS_PER_DAY" });
    }
    if (!Number.isFinite(pay_amount) || pay_amount <= 0) {
      return res.status(400).json({ error: "INVALID_PAY_AMOUNT" });
    }
    if (!pay_period) return res.status(400).json({ error: "PAY_PERIOD_REQUIRED" });

    const result = await pool.query(
      `UPDATE job_offers
       SET
         title=$1,
         work_type=$2,
         people_needed=$3,
         start_date=$4,
         end_date=$5,
         hours_per_day=$6,
         schedule_note=$7,
         city=$8,
         municipality=$9,
         village=$10,
         pay_amount=$11,
         pay_period=$12,
         accommodation_included=$13,
         transport_included=$14,
         food_included=$15,
         food_cost=$16,
         extra_info=$17,
         status=$18
       WHERE id=$19 AND farm_id=$20
       RETURNING
         id, farm_id, title, work_type, people_needed,
         start_date, end_date, hours_per_day, schedule_note,
         city, municipality, village,
         pay_amount, pay_period,
         accommodation_included, transport_included,
         food_included, food_cost,
         extra_info, status, created_at`,
      [
        title,
        work_type,
        people_needed,
        start_date,
        end_date,
        hours_per_day,
        schedule_note,
        city,
        municipality,
        village,
        pay_amount,
        pay_period,
        accommodation_included,
        transport_included,
        food_included,
        food_cost,
        extra_info,
        status,
        offerId,
        farmId,
      ]
    );

    return res.json({ offer: result.rows[0] });
  } catch (err) {
    console.error("PUT /farms/:farmId/offers/:offerId error:", err);
    return res.status(500).json({ error: "SERVER_ERROR" });
  }
});

/* =========================
   DELETE /farms/:farmId/offers/:offerId -> eliminar
========================= */
router.delete("/:farmId/offers/:offerId", requireAuth, async (req, res) => {
  try {
    if (!canCreateOffer(req)) return res.status(403).json({ error: "FORBIDDEN" });

    const farmId = Number(req.params.farmId);
    const offerId = Number(req.params.offerId);

    if (!Number.isInteger(farmId)) return res.status(400).json({ error: "INVALID_FARM_ID" });
    if (!Number.isInteger(offerId)) return res.status(400).json({ error: "INVALID_OFFER_ID" });

    const allowed = await canModifyOffersOfFarm(req, farmId);
    if (allowed === null) return res.status(404).json({ error: "FARM_NOT_FOUND" });
    if (!allowed) return res.status(403).json({ error: "FORBIDDEN" });

    const result = await pool.query(
      "DELETE FROM job_offers WHERE id=$1 AND farm_id=$2",
      [offerId, farmId]
    );

    if (result.rowCount === 0) return res.status(404).json({ error: "OFFER_NOT_FOUND" });

    return res.json({ ok: true });
  } catch (err) {
    console.error("DELETE /farms/:farmId/offers/:offerId error:", err);
    return res.status(500).json({ error: "SERVER_ERROR" });
  }
});

module.exports = router;
