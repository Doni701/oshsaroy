const express = require("express");
const cors = require("cors");



const token = process.env.BOT_TOKEN;


const chatId = "8819760322";

fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: "POST",
    headers: {
        "Content-Type": "application/json"
    },
    body: JSON.stringify({
        chat_id: chatId,
        text: "OshSaroy bot muvaffaqiyatli ulandi!"
    })
});

const app = express();

app.use(express.json());
app.use(cors());

app.use(express.static(__dirname));

app.get("/", function(req, res) {
    res.sendFile(__dirname + "/index.html");
});

app.post("/order", function(req, res) {
    let order = req.body;
    let message = "🛒 YANGI BUYURTMA\n\n";

message = message + "👤 Ism: " + order.name + "\n";
message = message + "📞 Telefon: " + order.phone + "\n";
message = message + "📍 Manzil: " + order.address + "\n\n";

message = message + "🍽 BUYURTMA:\n";

order.cart.forEach(function(item) {
    message = message + item.name + " x " + item.quantity + "\n";
});

message = message + "\n💰 Jami: " + order.total + " so'm";

fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: "POST",
    headers: {
        "Content-Type": "application/json"
    },
    body: JSON.stringify({
        chat_id: chatId,
        text: message
    })
});

    

    console.log("");
    console.log("===== YANGI BUYURTMA =====");

    console.log("Ism:", order.name);
    console.log("Telefon:", order.phone);
    console.log("Manzil:", order.address);

    console.log("");
    console.log("BUYURTMA:");

    order.cart.forEach(function(item) {
        console.log(
            item.name + " x " + item.quantity
        );
    });

    console.log("");
    console.log("Jami:", order.total + " so'm");
    console.log("==========================");
    console.log("");

    res.send("Buyurtma qabul qilindi!");
});

app.listen(3000, function() {
    console.log("Server 3000-portda ishlayapti");
});