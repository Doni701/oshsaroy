const cart = [];
const productCards = document.querySelectorAll(".product");
const cartButton = document.querySelector("#cartButton");
const cartDialog = document.querySelector("#cart");
const closeCartButton = document.querySelector("#closeCart");
const cartItems = document.querySelector("#cartItems");
const cartCount = document.querySelector("#cartCount");
const totalPrice = document.querySelector("#totalPrice");
const orderButton = document.querySelector("#orderButton");
const orderDialog = document.querySelector("#orderForm");
const checkoutForm = document.querySelector("#checkoutForm");
const closeOrderButton = document.querySelector("#closeOrder");
const orderStatus = document.querySelector("#orderStatus");
const sendOrderButton = document.querySelector("#sendOrder");
const moneyFormat = new Intl.NumberFormat("uz-UZ");
let activeDialog = null;
let previousFocus = null;

function formatPrice(amount) {
    return moneyFormat.format(amount);
}

function updateCart() {
    cartItems.replaceChildren();

    let total = 0;
    let count = 0;

    cart.forEach(function(item, index) {
        const itemTotal = item.price * item.quantity;
        total += itemTotal;
        count += item.quantity;

        const row = document.createElement("div");
        row.className = "cart-item";

        const details = document.createElement("div");
        details.className = "cart-item-details";

        const name = document.createElement("strong");
        name.textContent = item.name;

        const controls = document.createElement("div");
        controls.className = "quantity-controls";

        const decreaseButton = document.createElement("button");
        decreaseButton.type = "button";
        decreaseButton.className = "quantity-button";
        decreaseButton.setAttribute("aria-label", item.name + " sonini kamaytirish");
        decreaseButton.textContent = "−";
        decreaseButton.addEventListener("click", function() {
            changeQuantity(index, -1);
        });

        const quantity = document.createElement("span");
        quantity.textContent = item.quantity;
        quantity.setAttribute("aria-label", "Miqdori");

        const increaseButton = document.createElement("button");
        increaseButton.type = "button";
        increaseButton.className = "quantity-button";
        increaseButton.setAttribute("aria-label", item.name + " sonini oshirish");
        increaseButton.textContent = "+";
        increaseButton.addEventListener("click", function() {
            changeQuantity(index, 1);
        });

        controls.append(decreaseButton, quantity, increaseButton);
        details.append(name, controls);

        const price = document.createElement("span");
        price.className = "cart-item-price";
        price.textContent = formatPrice(itemTotal) + " so‘m";
        row.append(details, price);
        cartItems.append(row);
    });

    if (cart.length === 0) {
        const emptyMessage = document.createElement("p");
        emptyMessage.className = "empty-cart";
        emptyMessage.textContent = "Savatingiz hozircha bo‘sh. Menyudan taom tanlang.";
        cartItems.append(emptyMessage);
    }

    cartCount.textContent = count;
    totalPrice.textContent = formatPrice(total);
    orderButton.disabled = cart.length === 0;
}

function changeQuantity(index, change) {
    const item = cart[index];
    if (!item) return;

    item.quantity += change;
    if (item.quantity <= 0) {
        cart.splice(index, 1);
    }
    updateCart();
}

function openDialog(dialog) {
    if (activeDialog) closeDialog(activeDialog);

    previousFocus = document.activeElement;
    activeDialog = dialog;
    dialog.classList.add("is-open");
    dialog.setAttribute("aria-hidden", "false");
    document.body.classList.add("dialog-open");

    const focusTarget = dialog.querySelector("button, input");
    if (focusTarget) focusTarget.focus();
}

function closeDialog(dialog) {
    if (!dialog || !dialog.classList.contains("is-open")) return;

    dialog.classList.remove("is-open");
    dialog.setAttribute("aria-hidden", "true");
    activeDialog = null;
    document.body.classList.remove("dialog-open");

    if (previousFocus && typeof previousFocus.focus === "function") {
        previousFocus.focus();
    }
}

productCards.forEach(function(product) {
    const button = product.querySelector("button");
    const nameElement = product.querySelector("h3");
    const priceElement = product.querySelector("p");
    const price = Number(priceElement.textContent.replace(/[^\d]/g, ""));

    button.addEventListener("click", function() {
        const name = nameElement.textContent.trim();
        const existingItem = cart.find(function(item) {
            return item.name === name;
        });

        if (existingItem) {
            existingItem.quantity += 1;
        } else {
            cart.push({ name: name, price: price, quantity: 1 });
        }

        updateCart();
        button.textContent = "Qo‘shildi ✓";
        window.setTimeout(function() {
            button.textContent = "Savatga qo‘shish";
        }, 900);
    });
});

cartButton.addEventListener("click", function() {
    updateCart();
    openDialog(cartDialog);
});

closeCartButton.addEventListener("click", function() {
    closeDialog(cartDialog);
});

closeOrderButton.addEventListener("click", function() {
    closeDialog(orderDialog);
});

orderButton.addEventListener("click", function() {
    if (cart.length === 0) return;
    orderStatus.textContent = "";
    closeDialog(cartDialog);
    openDialog(orderDialog);
});

document.querySelectorAll("#cart, #orderForm").forEach(function(dialog) {
    dialog.addEventListener("click", function(event) {
        if (event.target === dialog) closeDialog(dialog);
    });
});

document.addEventListener("keydown", function(event) {
    if (event.key === "Escape" && activeDialog) {
        closeDialog(activeDialog);
    }
});

checkoutForm.addEventListener("submit", async function(event) {
    event.preventDefault();
    if (!checkoutForm.reportValidity() || cart.length === 0) return;

    const customer = {
        name: document.querySelector("#customerName").value.trim(),
        phone: document.querySelector("#customerPhone").value.trim(),
        address: document.querySelector("#customerAddress").value.trim()
    };

    sendOrderButton.disabled = true;
    sendOrderButton.textContent = "Yuborilmoqda…";
    orderStatus.textContent = "";

    try {
        const isLocalPreview = window.location.protocol === "file:" ||
            window.location.hostname === "localhost" ||
            window.location.hostname === "127.0.0.1";
        const orderEndpoint = isLocalPreview
            ? "http://" + (window.location.hostname === "127.0.0.1" ? "127.0.0.1" : "localhost") + ":3000/order"
            : "/order";
        const response = await fetch(orderEndpoint, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                ...customer,
                cart: cart.map(function(item) {
                    return { name: item.name, quantity: item.quantity };
                })
            })
        });

        const responseText = await response.text();
        if (response.status === 405) {
            throw new Error("Buyurtma serveri topilmadi: sayt statik previewda ochilgan. Terminalda `npm start` buyrug‘ini ishga tushirib, sahifani http://localhost:3000 manzilidan oching.");
        }

        let result = {};
        if (responseText) {
            try {
                result = JSON.parse(responseText);
            } catch {
                throw new Error("Serverdan noto‘g‘ri javob keldi. Sahifani yangilab, qayta urinib ko‘ring.");
            }
        }
        if (!response.ok) {
            throw new Error(result.error || "Buyurtmani yuborib bo‘lmadi (xatolik " + response.status + ").");
        }
        if (!result.message) {
            throw new Error("Buyurtma serverda tasdiqlanmadi. Qaytadan urinib ko‘ring.");
        }

        closeDialog(orderDialog);
        checkoutForm.reset();
        cart.splice(0, cart.length);
        updateCart();
        window.alert(result.message || "Buyurtmangiz qabul qilindi!");
    } catch (error) {
        orderStatus.textContent = error.message || "Xatolik yuz berdi. Qaytadan urinib ko‘ring.";
    } finally {
        sendOrderButton.disabled = false;
        sendOrderButton.textContent = "Buyurtmani yuborish";
    }
});

function goToSection(sectionId) {
    const section = document.getElementById(sectionId);
    if (section) section.scrollIntoView({ behavior: "smooth" });
}

window.goToSection = goToSection;
updateCart();
