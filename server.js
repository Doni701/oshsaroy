const express = require("express");
const cors = require("cors");
const path = require("node:path");
const { existsSync } = require("node:fs");

const envPath = path.join(__dirname, ".env");
if (existsSync(envPath)) {
    if (typeof process.loadEnvFile !== "function") {
        throw new Error("`.env` faylini yuklash uchun Node.js 20.12 yoki undan yangiroq versiya kerak.");
    }
    process.loadEnvFile(envPath);
}

const app = express();
const chatId = "8819760322";
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

app.use(cors());
app.use(express.json({ limit: "16kb" }));
app.use(express.static(__dirname));

app.get("/", function(req, res) {
    res.sendFile(path.join(__dirname, "index.html"));
});

app.post("/order", async function(req, res) {
    const body = req.body;
    if (!body || typeof body !== "object" || Array.isArray(body)) {
        return res.status(400).json({ error: "Buyurtma ma’lumotlari noto‘g‘ri." });
    }

    const name = typeof body.name === "string" ? body.name.trim() : "";
    const phone = typeof body.phone === "string" ? body.phone.trim() : "";
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
app.listen(port, function() {
    console.log("OshSaroy serveri " + port + "-portda ishga tushdi.");
});
