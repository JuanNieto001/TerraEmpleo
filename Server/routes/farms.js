const express = require('express');
const router = express.Router();
const pool = require('../db');
const jwt = require('jsonwebtoken');

function requireAuth(req, res, next) {
  try {
    const header = req.headers.authorization || '';
    const [type, token] = header.split(' ');

    if (type !== 'Bearer' || !token) {
      return res.status(401).json({ error: 'UNAUTHORIZED' });
    }

    const payload = jwt.verify(token, process.env.JWT_SECRET);

    req.user = {
      id: payload.id,
      role: payload.role || 'user',
      phone: payload.phone,
    };

    return next();
  } catch (err) {
    console.error('Auth error:', err);
    return res.status(401).json({ error: 'UNAUTHORIZED' });
  }
}

function canCreateFarm(req) {
  return req.user?.role === 'admin' || req.user?.role === 'owner';
}

async function canModifyFarm(req, farmId) {
  // admin puede todo
  if (req.user?.role === 'admin') return true;

  // owner puede solo las suyas
  if (req.user?.role !== 'owner') return false;

  const result = await pool.query(
    'SELECT owner_user_id FROM farms WHERE id = $1',
    [farmId]
  );

  if (result.rowCount === 0) return null; // no existe

  const ownerId = result.rows[0].owner_user_id;
  return ownerId != null && Number(ownerId) === Number(req.user.id);
}

// GET /farms -> listar fincas (público)
router.get('/', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT id, name, location, area_ha, image_url, owner_user_id, created_at, updated_at
       FROM farms
       ORDER BY id DESC`
    );
    return res.json({ farms: result.rows });
  } catch (err) {
    console.error('GET /farms error:', err);
    return res.status(500).json({ error: 'SERVER_ERROR' });
  }
});

// GET /farms/:id -> obtener una finca (público)
router.get('/:id', async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id)) return res.status(400).json({ error: 'INVALID_ID' });

    const result = await pool.query(
      `SELECT id, name, location, area_ha, image_url, owner_user_id, created_at, updated_at
       FROM farms
       WHERE id = $1`,
      [id]
    );

    if (result.rowCount === 0) return res.status(404).json({ error: 'NOT_FOUND' });

    return res.json({ farm: result.rows[0] });
  } catch (err) {
    console.error('GET /farms/:id error:', err);
    return res.status(500).json({ error: 'SERVER_ERROR' });
  }
});

// POST /farms -> crear finca (requiere auth + rol owner/admin)
router.post('/', requireAuth, async (req, res) => {
  try {
    if (!canCreateFarm(req)) {
      return res.status(403).json({ error: 'FORBIDDEN' });
    }

    const { name, location, areaHa, imageUrl } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({ error: 'NAME_REQUIRED' });
    }

    const area =
      areaHa === '' || areaHa === undefined || areaHa === null ? null : Number(areaHa);

    if (area !== null && Number.isNaN(area)) {
      return res.status(400).json({ error: 'INVALID_AREA' });
    }

    const result = await pool.query(
      `INSERT INTO farms (name, location, area_ha, image_url, owner_user_id, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, NOW(), NOW())
       RETURNING id, name, location, area_ha, image_url, owner_user_id, created_at, updated_at`,
      [
        name.trim(),
        location ? location.trim() : null,
        area,
        imageUrl || null,
        req.user.id,
      ]
    );

    return res.status(201).json({ farm: result.rows[0] });
  } catch (err) {
    console.error('POST /farms error:', err);
    return res.status(500).json({ error: 'SERVER_ERROR' });
  }
});

// PUT /farms/:id -> editar finca (requiere auth + permisos)
router.put('/:id', requireAuth, async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id)) return res.status(400).json({ error: 'INVALID_ID' });

    const allowed = await canModifyFarm(req, id);
    if (allowed === null) return res.status(404).json({ error: 'NOT_FOUND' });
    if (!allowed) return res.status(403).json({ error: 'FORBIDDEN' });

    const { name, location, areaHa, imageUrl } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({ error: 'NAME_REQUIRED' });
    }

    const area =
      areaHa === '' || areaHa === undefined || areaHa === null ? null : Number(areaHa);

    if (area !== null && Number.isNaN(area)) {
      return res.status(400).json({ error: 'INVALID_AREA' });
    }

    const result = await pool.query(
      `UPDATE farms
       SET name = $1,
           location = $2,
           area_ha = $3,
           image_url = $4,
           updated_at = NOW()
       WHERE id = $5
       RETURNING id, name, location, area_ha, image_url, owner_user_id, created_at, updated_at`,
      [
        name.trim(),
        location ? location.trim() : null,
        area,
        imageUrl || null,
        id,
      ]
    );

    if (result.rowCount === 0) return res.status(404).json({ error: 'NOT_FOUND' });

    return res.json({ farm: result.rows[0] });
  } catch (err) {
    console.error('PUT /farms/:id error:', err);
    return res.status(500).json({ error: 'SERVER_ERROR' });
  }
});

// DELETE /farms/:id -> eliminar finca (requiere auth + permisos)
router.delete('/:id', requireAuth, async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id)) return res.status(400).json({ error: 'INVALID_ID' });

    const allowed = await canModifyFarm(req, id);
    if (allowed === null) return res.status(404).json({ error: 'NOT_FOUND' });
    if (!allowed) return res.status(403).json({ error: 'FORBIDDEN' });

    const result = await pool.query('DELETE FROM farms WHERE id = $1', [id]);

    if (result.rowCount === 0) return res.status(404).json({ error: 'NOT_FOUND' });

    return res.json({ ok: true });
  } catch (err) {
    console.error('DELETE /farms/:id error:', err);
    return res.status(500).json({ error: 'SERVER_ERROR' });
  }
});

module.exports = router;

