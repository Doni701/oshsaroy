const express = require("express");
const path = require("node:path");
const { existsSync, mkdirSync } = require("node:fs");
const { createHash, randomBytes, scrypt, timingSafeEqual } = require("node:crypto");
const { promisify } = require("node:util");
const { DatabaseSync } = require("node:sqlite");
const { Pool } = require("pg");

const envPath = path.join(__dirname, ".env");
if (existsSync(envPath)) {
    if (typeof process.loadEnvFile !== "function") {
        throw new Error("`.env` faylini yuklash uchun Node.js 20.12 yoki undan yangiroq versiya kerak.");
    }
    process.loadEnvFile(envPath);
}

const app = express();
app.disable("x-powered-by");
app.set("trust proxy", 1);
const chatId = "8819760322";
const scryptAsync = promisify(scrypt);
const sessionCookieName = "oshsaroy_session";
const sessionDurationMs = 30 * 24 * 60 * 60 * 1000;
const rateLimits = new Map();
const catalog = new Map([
    ["Bir kishilik osh", 45000],
    ["Ikki kishilik osh", 90000],
    ["Achichuk", 8000],
    ["Soleniy", 8000],
    ["Morinovka", 8000],
    ["Anzur piyoz", 8000],
    ["Chakka", 8000],
    ["Turp", 8000],
    ["Qora uy noni", 9000],
    ["Cola 0.5 L", 8000],
    ["Fanta 0.5 L", 8000],
    ["Sprite 0.5 L", 8000],
    ["Fuse Tea 0.5 L", 8000],
    ["Cola katta", 17000],
    ["Fanta katta", 17000],
    ["Sprite katta", 17000],
    ["Fuse Tea katta", 17000],
    ["Mojito", 14000],
    ["G'urob 0.25 L", 20000],
    ["Quyma muzqaymoq 0.5 kg", 25000],
    ["Quyma muzqaymoq 1 kg", 45000]
]);

let sqliteDatabase;
let postgresPool;
const usePostgres = Boolean(process.env.DATABASE_URL);

async function initializeDatabase() {
    if (usePostgres) {
        postgresPool = new Pool({ connectionString: process.env.DATABASE_URL });
        postgresPool.on("error", function(error) {
            console.error("PostgreSQL ulanishida xatolik:", error.message);
        });
        await postgresPool.query(`
            CREATE TABLE IF NOT EXISTS users (
                id BIGSERIAL PRIMARY KEY,
                name TEXT NOT NULL,
                phone TEXT NOT NULL UNIQUE,
                password_hash TEXT NOT NULL,
                created_at BIGINT NOT NULL
            );
            CREATE TABLE IF NOT EXISTS sessions (
                token_hash TEXT PRIMARY KEY,
                user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                expires_at BIGINT NOT NULL
            );
            CREATE INDEX IF NOT EXISTS sessions_expiry_idx ON sessions(expires_at);
        `);
        return;
    }

    const databasePath = process.env.DATABASE_PATH || path.join(__dirname, ".data", "oshsaroy.sqlite");
    mkdirSync(path.dirname(databasePath), { recursive: true });
    sqliteDatabase = new DatabaseSync(databasePath);
    sqliteDatabase.exec(`
        PRAGMA foreign_keys = ON;
        PRAGMA journal_mode = WAL;
        PRAGMA busy_timeout = 5000;
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY,
            name TEXT NOT NULL,
            phone TEXT NOT NULL UNIQUE,
            password_hash TEXT NOT NULL,
            created_at INTEGER NOT NULL
        );
        CREATE TABLE IF NOT EXISTS sessions (
            token_hash TEXT PRIMARY KEY,
            user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            expires_at INTEGER NOT NULL
        );
        CREATE INDEX IF NOT EXISTS sessions_expiry_idx ON sessions(expires_at);
    `);
}

const databaseReady = initializeDatabase();
databaseReady.catch(function(error) {
    console.error("Akkauntlar bazasini ishga tushirib bo‘lmadi:", error.message);
});

async function databaseGet(sql, parameters) {
    if (usePostgres) {
        let parameterIndex = 0;
        const postgresSql = sql.replace(/\?/g, function() {
            parameterIndex += 1;
            return "$" + parameterIndex;
        });
        const result = await postgresPool.query(postgresSql, parameters);
        return result.rows[0];
    }
    return sqliteDatabase.prepare(sql).get(...parameters);
}

async function databaseRun(sql, parameters) {
    if (usePostgres) {
        let parameterIndex = 0;
        const postgresSql = sql.replace(/\?/g, function() {
            parameterIndex += 1;
            return "$" + parameterIndex;
        });
        return postgresPool.query(postgresSql, parameters);
    }
    return sqliteDatabase.prepare(sql).run(...parameters);
}

async function requireDatabase(req, res, next) {
    try {
        await databaseReady;
        return next();
    } catch (error) {
        return res.status(503).json({ error: "Akkauntlar bazasi hozir ishlamayapti. Keyinroq qayta urinib ko‘ring." });
    }
}

app.use(express.json({ limit: "16kb" }));
app.use(function(req, res, next) {
    res.set({
        "X-Content-Type-Options": "nosniff",
        "Referrer-Policy": "strict-origin-when-cross-origin",
        "X-Frame-Options": "DENY"
    });

    if (req.path.startsWith("/api/") || req.path === "/order") {
        const origin = req.get("origin");
        const fetchSite = req.get("sec-fetch-site");
        if ((origin && origin !== req.protocol + "://" + req.get("host")) || fetchSite === "cross-site") {
            return res.status(403).json({ error: "So‘rov manbasi ruxsat etilmagan." });
        }
    }
    next();
});
app.use("/api", requireDatabase);
app.use("/order", requireDatabase);
app.use(express.static(__dirname));

app.get("/", function(req, res) {
    res.sendFile(path.join(__dirname, "index.html"));
});

function normalizePhone(phone) {
    if (!/^[+\d\s().-]+$/.test(phone)) return "";
    const digits = phone.replace(/\D/g, "");
    return digits.length >= 9 && digits.length <= 15 ? digits : "";
}

function safeUser(user) {
    return { id: Number(user.id), name: user.name, phone: user.phone };
}

function setSessionCookie(res, token) {
    const secure = process.env.NODE_ENV === "production" ? "; Secure" : "";
    res.setHeader("Set-Cookie", sessionCookieName + "=" + token +
        "; Path=/; HttpOnly; SameSite=Lax; Max-Age=" + Math.floor(sessionDurationMs / 1000) + secure);
}

function clearSessionCookie(res) {
    const secure = process.env.NODE_ENV === "production" ? "; Secure" : "";
    res.setHeader("Set-Cookie", sessionCookieName +
        "=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0" + secure);
}

function readCookie(req, name) {
    const cookies = req.get("cookie") || "";
    const entry = cookies.split(";").map(function(cookie) {
        return cookie.trim();
    }).find(function(cookie) {
        return cookie.startsWith(name + "=");
    });
    return entry ? entry.slice(name.length + 1) : "";
}

async function requestUser(req) {
    const token = readCookie(req, sessionCookieName);
    if (!/^[A-Za-z0-9_-]{40,50}$/.test(token)) return null;
    const tokenHash = createHash("sha256").update(token).digest("hex");
    const row = await databaseGet(`
        SELECT users.id, users.name, users.phone
        FROM sessions JOIN users ON users.id = sessions.user_id
        WHERE sessions.token_hash = ? AND sessions.expires_at > ?
    `, [tokenHash, Date.now()]);
    if (!row) return null;
    req.user = row;
    req.sessionTokenHash = tokenHash;
    return row;
}

async function requireUser(req, res, next) {
    if (!await requestUser(req)) {
        return res.status(401).json({ error: "Davom etish uchun akkauntingizga kiring." });
    }
    return next();
}

function allowAuthAttempt(req, res, next) {
    const now = Date.now();
    const key = req.ip || req.socket.remoteAddress || "unknown";
    const attempts = (rateLimits.get(key) || []).filter(function(time) {
        return now - time < 15 * 60 * 1000;
    });
    if (attempts.length >= 20) {
        return res.status(429).json({ error: "Urinishlar soni ko‘payib ketdi. 15 daqiqadan keyin qayta urinib ko‘ring." });
    }
    attempts.push(now);
    rateLimits.set(key, attempts);
    if (rateLimits.size > 10000) {
        for (const [ip, times] of rateLimits) {
            if (times.every(function(time) { return now - time >= 15 * 60 * 1000; })) rateLimits.delete(ip);
        }
    }
    next();
}

async function createPasswordHash(password) {
    const salt = randomBytes(16);
    const hash = await scryptAsync(password, salt, 64, { N: 16384, r: 8, p: 1, maxmem: 64 * 1024 * 1024 });
    return "scrypt$" + salt.toString("hex") + "$" + hash.toString("hex");
}

async function verifyPassword(password, storedHash) {
    const parts = storedHash.split("$");
    if (parts.length !== 3 || parts[0] !== "scrypt" ||
        !/^[a-f0-9]{32}$/.test(parts[1]) || !/^[a-f0-9]{128}$/.test(parts[2])) return false;
    const expected = Buffer.from(parts[2], "hex");
    const actual = await scryptAsync(password, Buffer.from(parts[1], "hex"), expected.length, {
        N: 16384, r: 8, p: 1, maxmem: 64 * 1024 * 1024
    });
    return timingSafeEqual(expected, actual);
}

async function createSession(res, userId) {
    const token = randomBytes(32).toString("base64url");
    const expiresAt = Date.now() + sessionDurationMs;
    await databaseRun("DELETE FROM sessions WHERE expires_at <= ?", [Date.now()]);
    await databaseRun("INSERT INTO sessions (token_hash, user_id, expires_at) VALUES (?, ?, ?)", [
        createHash("sha256").update(token).digest("hex"),
        userId,
        expiresAt
    ]);
    setSessionCookie(res, token);
}

app.post("/api/auth/register", allowAuthAttempt, async function(req, res) {
    const body = req.body || {};
    const name = typeof body.name === "string" ? body.name.trim() : "";
    const phone = typeof body.phone === "string" ? normalizePhone(body.phone) : "";
    const password = typeof body.password === "string" ? body.password : "";
    if (!name || name.length > 80 || !phone || !/^\d{4}$/.test(password)) {
        return res.status(400).json({ error: "Ism, telefon raqami va 4 xonali PINni to‘g‘ri kiriting." });
    }
    try {
        const passwordHash = await createPasswordHash(password);
        const result = await databaseGet(
            "INSERT INTO users (name, phone, password_hash, created_at) VALUES (?, ?, ?, ?) RETURNING id",
            [name, phone, passwordHash, Date.now()]
        );
        const user = { id: Number(result.id), name: name, phone: phone };
        await createSession(res, user.id);
        return res.status(201).json({ user: safeUser(user) });
    } catch (error) {
        if (error.code === "23505" || error.errcode === 2067) {
            return res.status(409).json({ error: "Bu telefon raqamida akkaunt bor. Kirish bo‘limidan foydalaning." });
        }
        console.error("Akkaunt yaratishda xatolik:", error.message);
        return res.status(500).json({ error: "Akkaunt yaratilmadi. Birozdan keyin qayta urinib ko‘ring." });
    }
});

app.post("/api/auth/login", allowAuthAttempt, async function(req, res) {
    const body = req.body || {};
    const phone = typeof body.phone === "string" ? normalizePhone(body.phone) : "";
    const password = typeof body.password === "string" ? body.password : "";
    if (!phone || !password || password.length > 128) {
        return res.status(400).json({ error: "Telefon raqami va parolni to‘g‘ri kiriting." });
    }

    const user = await databaseGet("SELECT id, name, phone, password_hash FROM users WHERE phone = ?", [phone]);
    const valid = user
        ? await verifyPassword(password, user.password_hash)
        : await verifyPassword(password, "scrypt$00000000000000000000000000000000$" + "00".repeat(64));
    if (!user || !valid) {
        return res.status(401).json({ error: "Telefon raqami yoki parol noto‘g‘ri." });
    }

    await createSession(res, user.id);
    return res.json({ user: safeUser(user) });
});

app.get("/api/auth/me", async function(req, res) {
    const user = await requestUser(req);
    if (!user) {
        clearSessionCookie(res);
        return res.json({ user: null });
    }
    return res.json({ user: safeUser(user) });
});

app.post("/api/auth/logout", requireUser, async function(req, res) {
    await databaseRun("DELETE FROM sessions WHERE token_hash = ?", [req.sessionTokenHash]);
    clearSessionCookie(res);
    return res.json({ message: "Akkauntdan chiqdingiz." });
});

app.get("/api/payment-methods", requireUser, function(req, res) {
    return res.json({
        provider: "click",
        available: false,
        methods: [],
        message: "Karta ulash uchun Click merchant akkaunti va Click tasdiqlagan xavfsiz karta-tokenlash integratsiyasi kerak."
    });
});

app.post("/api/payment-methods", requireUser, function(req, res) {
    return res.status(503).json({
        error: "Click merchant akkaunti hali ulanmagan. Karta ma’lumotlarini xavfsizlik sababli bu saytga kiritmang."
    });
});

app.post("/order", async function(req, res) {
    if (!await requestUser(req)) {
        return res.status(401).json({ error: "Buyurtma berish uchun akkauntingizga kiring." });
    }
    const body = req.body;
    if (!body || typeof body !== "object" || Array.isArray(body)) {
        return res.status(400).json({ error: "Buyurtma ma’lumotlari noto‘g‘ri." });
    }

    const name = req.user.name;
    const phone = req.user.phone;
    const address = typeof body.address === "string" ? body.address.trim() : "";
    const digitsInPhone = phone.replace(/\D/g, "").length;

    if (!name || name.length > 80 || !address || address.length > 250) {
        return res.status(400).json({ error: "Ism va manzilni to‘g‘ri kiriting." });
    }
    if (!/^[+\d\s().-]+$/.test(phone) || digitsInPhone < 9 || digitsInPhone > 15) {
        return res.status(400).json({ error: "Telefon raqamini to‘g‘ri kiriting." });
    }
    if (!Array.isArray(body.cart) || body.cart.length === 0 || body.cart.length > catalog.size) {
        return res.status(400).json({ error: "Savat bo‘sh yoki buyurtma tarkibi noto‘g‘ri." });
    }

    const quantities = new Map();
    let itemCount = 0;
    for (const entry of body.cart) {
        if (!entry || typeof entry.name !== "string" || !catalog.has(entry.name) ||
            !Number.isInteger(entry.quantity) || entry.quantity < 1 || entry.quantity > 99) {
            return res.status(400).json({ error: "Buyurtmadagi mahsulot yoki miqdor noto‘g‘ri." });
        }

        itemCount += entry.quantity;
        if (itemCount > 99) {
            return res.status(400).json({ error: "Bir buyurtmada 99 tadan ortiq mahsulot bo‘lishi mumkin emas." });
        }
        quantities.set(entry.name, (quantities.get(entry.name) || 0) + entry.quantity);
    }

    const items = Array.from(quantities, function([itemName, quantity]) {
        return { name: itemName, quantity: quantity, price: catalog.get(itemName) };
    });
    const total = items.reduce(function(sum, item) {
        return sum + item.price * item.quantity;
    }, 0);
    const message = [
        "🛒 YANGI BUYURTMA",
        "",
        "👤 Ism: " + name,
        "📞 Telefon: " + phone,
        "📍 Manzil: " + address,
        "",
        "🍽 BUYURTMA:",
        ...items.map(function(item) {
            return item.name + " x " + item.quantity + " — " +
                item.price.toLocaleString("uz-UZ") + " so‘m";
        }),
        "",
        "💰 Jami: " + total.toLocaleString("uz-UZ") + " so‘m"
    ].join("\n");

    const token = process.env.BOT_TOKEN;
    if (!token) {
        return res.status(503).json({ error: "Buyurtmalar hozir qabul qilinmayapti. Keyinroq urinib ko‘ring." });
    }

    try {
        const telegramResponse = await fetch("https://api.telegram.org/bot" + token + "/sendMessage", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ chat_id: chatId, text: message })
        });
        const telegramResult = await telegramResponse.json();

        if (!telegramResponse.ok || !telegramResult.ok) {
            throw new Error(telegramResult.description || "Telegram API buyurtmani qabul qilmadi.");
        }
    } catch (error) {
        console.error("Telegramga buyurtma yuborilmadi:", error.message);
        return res.status(502).json({ error: "Buyurtmani yuborishda xatolik yuz berdi. Qaytadan urinib ko‘ring." });
    }

    console.log("Yangi buyurtma qabul qilindi:", name, phone, total.toLocaleString("uz-UZ") + " so‘m");
    return res.json({ message: "Buyurtmangiz qabul qilindi!" });
});

app.use(function(error, req, res, next) {
    if (error.type === "entity.parse.failed") {
        return res.status(400).json({ error: "Yuborilgan ma’lumotlarni o‘qib bo‘lmadi." });
    }
    if (error.type === "entity.too.large") {
        return res.status(413).json({ error: "Buyurtma hajmi juda katta." });
    }
    return next(error);
});

const port = Number(process.env.PORT) || 3000;
if (require.main === module) {
    app.listen(port, function() {
        console.log("OshSaroy serveri " + port + "-portda ishga tushdi.");
    });
}

module.exports = app;
app.locals.closeDatabase = function() {
    if (postgresPool) return postgresPool.end();
    if (sqliteDatabase) sqliteDatabase.close();
};
