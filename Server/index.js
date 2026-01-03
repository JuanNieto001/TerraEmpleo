// Server/index.js
const express = require("express");
const cors = require("cors");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
require("dotenv").config();

const multer = require("multer");
const cloudinary = require("cloudinary").v2;

const pool = require("./db"); // Server/db/index.js
const farmsRouter = require("./routes/farms");
const offersRouter = require("./routes/offers"); // ✅ NUEVO

const app = express();

app.use(
  cors({
    origin: "*",
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "Accept"],
  })
);

app.use(express.json());

// ✅ imprime la DB real que está usando el server
console.log("SERVER DATABASE_URL:", process.env.DATABASE_URL);

// ✅ verifica DB y usuario al iniciar (esto es CLAVE)
(async () => {
  try {
    const r = await pool.query("SELECT current_database() db, current_user usr");
    console.log("SERVER CONNECTED TO DB:", r.rows[0]);
  } catch (e) {
    console.error("DB CONNECTION CHECK FAILED:", e);
  }
})();

// ✅ Cloudinary
console.log("Cloudinary config:", {
  cloud: process.env.CLOUDINARY_CLOUD_NAME,
  key: process.env.CLOUDINARY_API_KEY ? "OK" : "MISSING",
  secret: process.env.CLOUDINARY_API_SECRET ? "OK" : "MISSING",
});

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// ✅ Multer memory
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 6 * 1024 * 1024 },
});

function signToken(user) {
  return jwt.sign(
    { id: user.id, phone: user.phone, role: user.role },
    process.env.JWT_SECRET,
    { expiresIn: "7d" }
  );
}

// ✅ Middleware JWT
function requireAuth(req, res, next) {
  const auth = req.headers.authorization || "";
  const [type, token] = auth.split(" ");

  if (type !== "Bearer" || !token) {
    return res.status(401).json({ message: "Falta token" });
  }

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    req.user = payload; // { id, phone, role }
    return next();
  } catch (e) {
    return res.status(401).json({ message: "Token inválido" });
  }
}

app.get("/", (req, res) => res.send("API TerraEmpleo OK ✅"));

// ✅ RUTAS
app.use("/farms", farmsRouter);
app.use("/farms", offersRouter); // ✅ NUEVO: /farms/:farmId/offers

/* ======================
   UPLOAD
====================== */
app.post("/upload", upload.single("image"), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: "NO_FILE" });

    const b64 = req.file.buffer.toString("base64");
    const dataUri = `data:${req.file.mimetype};base64,${b64}`;

    const result = await cloudinary.uploader.upload(dataUri, {
      folder: "terraempleo/farms",
      resource_type: "image",
    });

    return res.json({ url: result.secure_url });
  } catch (err) {
    console.error("POST /upload error:", err);
    return res.status(500).json({ error: "UPLOAD_ERROR" });
  }
});

/* ======================
   REGISTER
====================== */
app.post("/auth/register", async (req, res) => {
  try {
    console.log("REGISTER body:", req.body);

    const { name, phone, email, password } = req.body;

    if (!name || !phone || !password) {
      return res.status(400).json({
        message: "Nombre, celular y contraseña son obligatorios",
      });
    }

    const n = String(name).trim();
    const ph = String(phone).trim();
    const eRaw =
      email !== undefined && email !== null ? String(email).trim().toLowerCase() : "";
    const e = eRaw.length ? eRaw : null;
    const p = String(password);

    const phoneOk = /^[0-9]{7,12}$/.test(ph);
    if (!phoneOk) return res.status(400).json({ message: "Celular inválido" });

    const phoneExists = await pool.query("SELECT id FROM users WHERE phone=$1", [ph]);
    if (phoneExists.rows.length > 0) {
      console.log("REGISTER blocked: phone exists ->", ph);
      return res.status(409).json({ message: "Ese celular ya está registrado" });
    }

    if (e) {
      const emailOk = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e);
      if (!emailOk) return res.status(400).json({ message: "Correo inválido" });

      const emailExists = await pool.query("SELECT id FROM users WHERE email=$1", [e]);
      if (emailExists.rows.length > 0) {
        console.log("REGISTER blocked: email exists ->", e);
        return res.status(409).json({ message: "Ese correo ya está registrado" });
      }
    }

    const password_hash = await bcrypt.hash(p, 10);

    const result = await pool.query(
      `INSERT INTO users (name, phone, email, password_hash)
       VALUES ($1,$2,$3,$4)
       RETURNING id, name, phone, email, role, created_at`,
      [n, ph, e, password_hash]
    );

    const user = result.rows[0];
    const token = signToken(user);

    console.log("REGISTER ok -> inserted user id:", user.id, "role:", user.role);

    return res.json({ user, token });
  } catch (err) {
    console.error("REGISTER error:", err);

    return res.status(500).json({
      message: "Error en servidor",
      detail: err?.message || String(err),
      code: err?.code || null,
    });
  }
});

/* ======================
   LOGIN
====================== */
app.post("/auth/login", async (req, res) => {
  try {
    const { identifier, password, phone, email } = req.body;

    const idRaw =
      identifier !== undefined
        ? String(identifier).trim()
        : phone !== undefined
        ? String(phone).trim()
        : email !== undefined
        ? String(email).trim()
        : "";

    const p = password !== undefined ? String(password) : "";

    if (!idRaw || !p) {
      return res
        .status(400)
        .json({ message: "Celular/correo y contraseña son obligatorios" });
    }

    const isPhone = /^[0-9]{7,12}$/.test(idRaw);
    const isEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(idRaw);

    if (!isPhone && !isEmail) {
      return res.status(400).json({ message: "Ingresa un celular o correo válido" });
    }

    const query = isPhone
      ? "SELECT id, name, phone, email, role, password_hash, created_at FROM users WHERE phone=$1"
      : "SELECT id, name, phone, email, role, password_hash, created_at FROM users WHERE email=$1";

    const result = await pool.query(query, [isPhone ? idRaw : idRaw.toLowerCase()]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        code: "USER_NOT_FOUND",
        message: "No existe este usuario, debes registrarte",
      });
    }

    const row = result.rows[0];
    const ok = await bcrypt.compare(p, row.password_hash);

    if (!ok) {
      return res.status(401).json({
        code: "BAD_CREDENTIALS",
        message: "Celular/correo o contraseña incorrectos",
      });
    }

    const user = {
      id: row.id,
      name: row.name,
      phone: row.phone,
      email: row.email,
      role: row.role,
      created_at: row.created_at,
    };

    const token = signToken(user);

    console.log("LOGIN ok -> user id:", user.id, "role:", user.role);

    return res.json({ user, token });
  } catch (err) {
    console.error("LOGIN error:", err);
    return res.status(500).json({ message: "Error en servidor" });
  }
});

/* ======================
   UPDATE ME (NAME / PASSWORD)
   PUT /users/me
====================== */
app.put("/users/me", requireAuth, async (req, res) => {
  try {
    const userId = req.user.id;

    const { name, currentPassword, newPassword } = req.body || {};

    const wantsName =
      name !== undefined && name !== null && String(name).trim().length > 0;

    const wantsPassword =
      (currentPassword !== undefined && String(currentPassword).length > 0) ||
      (newPassword !== undefined && String(newPassword).length > 0);

    if (!wantsName && !wantsPassword) {
      return res.status(400).json({ message: "No hay cambios para guardar" });
    }

    const r = await pool.query(
      "SELECT id, name, phone, email, role, password_hash, created_at FROM users WHERE id=$1",
      [userId]
    );

    if (r.rows.length === 0) {
      return res.status(404).json({ message: "Usuario no encontrado" });
    }

    const row = r.rows[0];

    let newHash = null;

    if (wantsPassword) {
      const cur = String(currentPassword || "");
      const np = String(newPassword || "");

      if (!cur || !np) {
        return res
          .status(400)
          .json({ message: "Debes enviar currentPassword y newPassword" });
      }

      if (np.length < 6) {
        return res
          .status(400)
          .json({ message: "La nueva contraseña debe tener al menos 6 caracteres" });
      }

      const ok = await bcrypt.compare(cur, row.password_hash);
      if (!ok) {
        return res.status(401).json({ message: "Contraseña actual incorrecta" });
      }

      newHash = await bcrypt.hash(np, 10);
    }

    const newName = wantsName ? String(name).trim() : row.name;

    await pool.query(
      `UPDATE users
       SET name = $1,
           password_hash = COALESCE($2, password_hash)
       WHERE id = $3`,
      [newName, newHash, userId]
    );

    const updated = await pool.query(
      "SELECT id, name, phone, email, role, created_at FROM users WHERE id=$1",
      [userId]
    );

    return res.json({ user: updated.rows[0] });
  } catch (err) {
    console.error("PUT /users/me error:", err);
    return res.status(500).json({ message: "Error en servidor" });
  }
});

app.listen(process.env.PORT || 3000, () => {
  console.log(`API running on http://localhost:${process.env.PORT || 3000}`);
});
