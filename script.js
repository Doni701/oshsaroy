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
const signupDialog = document.querySelector("#signupDialog");
const signupForm = document.querySelector("#signupForm");
const signupName = document.querySelector("#signupName");
const signupPhone = document.querySelector("#signupPhone");
const signupPassword = document.querySelector("#signupPassword");
const signupStatus = document.querySelector("#signupStatus");
const signupSubmitButton = document.querySelector("#signupSubmit");
const loginForm = document.querySelector("#loginForm");
const loginPhone = document.querySelector("#loginPhone");
const loginPassword = document.querySelector("#loginPassword");
const loginStatus = document.querySelector("#loginStatus");
const loginSubmitButton = document.querySelector("#loginSubmit");
const accountButton = document.querySelector("#accountButton");
const accountDialog = document.querySelector("#accountDialog");
const accountName = document.querySelector("#accountName");
const accountPhone = document.querySelector("#accountPhone");
const accountStatus = document.querySelector("#accountStatus");
const paymentMethodsStatus = document.querySelector("#paymentMethodsStatus");
const addCardButton = document.querySelector("#addCardButton");
const logoutButton = document.querySelector("#logoutButton");
const menuSearch = document.querySelector("#menuSearch");
const searchStatus = document.querySelector("#searchStatus");
const gatedElements = document.querySelectorAll("body > header, body > nav, body > main, body > #cart, body > #orderForm, body > #accountDialog, body > footer");
const moneyFormat = new Intl.NumberFormat("uz-UZ");
let activeDialog = null;
let previousFocus = null;
let currentUser = null;

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
    if (dialog === signupDialog && !currentUser) return;

    dialog.classList.remove("is-open");
    dialog.setAttribute("aria-hidden", "true");
    activeDialog = null;
    document.body.classList.remove("dialog-open");

    if (previousFocus && typeof previousFocus.focus === "function") {
        previousFocus.focus();
    }
}

function setPageAccess(isRegistered) {
    gatedElements.forEach(function(element) {
        element.inert = !isRegistered;
    });
}

function applyCustomerProfile(profile) {
    document.querySelector("#customerName").value = profile.name;
    document.querySelector("#customerPhone").value = profile.phone;
}

function setAuthenticatedUser(user) {
    currentUser = user;
    setPageAccess(true);
    applyCustomerProfile(user);
    accountName.textContent = user.name;
    accountPhone.textContent = user.phone;
    accountButton.querySelector("#accountButtonLabel").textContent = user.name;
    accountButton.hidden = false;
}

function showAuthMode(mode) {
    const isLogin = mode === "login";
    signupForm.hidden = isLogin;
    loginForm.hidden = !isLogin;
    signupStatus.textContent = "";
    loginStatus.textContent = "";
    const firstInput = isLogin ? loginPhone : signupName;
    if (activeDialog === signupDialog) firstInput.focus();
}

function authConnectionError(error) {
    if (error instanceof TypeError || /failed to fetch|networkerror/i.test(error.message || "")) {
        return "Akkaunt serveriga ulanib bo‘lmadi. Terminalda `npm start` ni ishga tushiring va saytni server konsolida ko‘rsatilgan http://localhost manzilidan oching.";
    }
    return error.message || "Server bilan bog‘lanib bo‘lmadi. Qayta urinib ko‘ring.";
}

async function readAuthResponse(response) {
    const responseText = await response.text();
    try {
        return JSON.parse(responseText);
    } catch {
        throw new Error("Akkaunt serverining javobi noto‘g‘ri. Terminalda `npm start` ni ishga tushiring va saytni server konsolida ko‘rsatilgan http://localhost manzilidan oching.");
    }
}

async function sendAuthRequest(form, endpoint, statusElement, submitButton) {
    if (!form.reportValidity()) return;
    statusElement.textContent = "";
    submitButton.disabled = true;
    const originalText = submitButton.textContent;
    submitButton.textContent = "Tekshirilmoqda…";

    try {
        const formData = new FormData(form);
        const response = await fetch(endpoint, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(Object.fromEntries(formData))
        });
        const result = await readAuthResponse(response);
        if (!response.ok) throw new Error(result.error || "So‘rov bajarilmadi.");

        setAuthenticatedUser(result.user);
        closeDialog(signupDialog);
        signupForm.reset();
        loginForm.reset();
    } catch (error) {
        statusElement.textContent = authConnectionError(error);
    } finally {
        submitButton.disabled = false;
        submitButton.textContent = originalText;
    }
}

signupForm.addEventListener("submit", function(event) {
    event.preventDefault();
    sendAuthRequest(signupForm, "/api/auth/register", signupStatus, signupSubmitButton);
});

loginForm.addEventListener("submit", function(event) {
    event.preventDefault();
    sendAuthRequest(loginForm, "/api/auth/login", loginStatus, loginSubmitButton);
});

document.querySelector("#showLogin").addEventListener("click", function() {
    showAuthMode("login");
});

document.querySelector("#showSignup").addEventListener("click", function() {
    showAuthMode("signup");
});

menuSearch.addEventListener("input", function() {
    const query = menuSearch.value.trim().toLocaleLowerCase("uz-UZ");
    let matches = 0;

    productCards.forEach(function(product) {
        const isMatch = product.textContent.toLocaleLowerCase("uz-UZ").includes(query);
        product.hidden = !isMatch;
        if (isMatch) matches += 1;
    });

    document.querySelectorAll(".menu-section").forEach(function(section) {
        const hasProducts = section.querySelector(".product:not([hidden])");
        section.hidden = !hasProducts;
    });

    searchStatus.textContent = query
        ? (matches ? matches + " ta taom topildi" : "Bu nomda taom topilmadi")
        : "";
});

menuSearch.addEventListener("keydown", function(event) {
    if (event.key === "Escape") {
        menuSearch.value = "";
        menuSearch.dispatchEvent(new Event("input", { bubbles: true }));
        menuSearch.blur();
    }
});

document.addEventListener("keydown", function(event) {
    if (event.key === "/" && !event.altKey && !event.ctrlKey && !event.metaKey &&
        !["INPUT", "TEXTAREA"].includes(document.activeElement.tagName)) {
        event.preventDefault();
        menuSearch.focus();
    }
});

document.querySelector("#closeAccount").addEventListener("click", function() {
    closeDialog(accountDialog);
});

accountButton.addEventListener("click", function() {
    accountStatus.textContent = "";
    openDialog(accountDialog);
    fetch("/api/payment-methods")
        .then(async function(response) {
            const result = await response.json();
            if (!response.ok) throw new Error(result.error || "To‘lov usullari yuklanmadi.");
            paymentMethodsStatus.textContent = result.message;
            addCardButton.disabled = !result.available;
            if (!result.available) addCardButton.textContent = "Karta ulash uchun Click merchant kerak";
        })
        .catch(function(error) {
            paymentMethodsStatus.textContent = error.message || "To‘lov usullari yuklanmadi.";
            addCardButton.disabled = true;
        });
});

addCardButton.addEventListener("click", async function() {
    accountStatus.textContent = "";
    addCardButton.disabled = true;
    try {
        const response = await fetch("/api/payment-methods", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: "{}"
        });
        const result = await response.json();
        if (!response.ok) throw new Error(result.error || "Karta ulanmadi.");
        accountStatus.textContent = result.message || "Karta ulandi.";
    } catch (error) {
        accountStatus.textContent = error.message || "Karta ulanmadi.";
    } finally {
        addCardButton.disabled = false;
    }
});

logoutButton.addEventListener("click", async function() {
    logoutButton.disabled = true;
    accountStatus.textContent = "";
    try {
        const response = await fetch("/api/auth/logout", { method: "POST" });
        const result = await response.json();
        if (!response.ok) throw new Error(result.error || "Akkauntdan chiqib bo‘lmadi.");
        closeDialog(accountDialog);
        currentUser = null;
        accountButton.hidden = true;
        setPageAccess(false);
        showAuthMode("signup");
        openDialog(signupDialog);
    } catch (error) {
        accountStatus.textContent = error.message || "Akkauntdan chiqib bo‘lmadi.";
    } finally {
        logoutButton.disabled = false;
    }
});

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

document.querySelectorAll("#signupDialog, #accountDialog, #cart, #orderForm").forEach(function(dialog) {
    dialog.addEventListener("click", function(event) {
        if (event.target === dialog && dialog !== signupDialog) closeDialog(dialog);
    });
});

document.addEventListener("keydown", function(event) {
    if (event.key === "Escape" && activeDialog && activeDialog !== signupDialog) {
        closeDialog(activeDialog);
    }
});

checkoutForm.addEventListener("submit", async function(event) {
    event.preventDefault();
    if (!checkoutForm.reportValidity() || cart.length === 0) return;

    const customer = {
        address: document.querySelector("#customerAddress").value.trim()
    };

    sendOrderButton.disabled = true;
    sendOrderButton.textContent = "Yuborilmoqda…";
    orderStatus.textContent = "";

    try {
        const response = await fetch("/order", {
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
        if (currentUser) applyCustomerProfile(currentUser);
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

async function initializeAuth() {
    setPageAccess(false);
    showAuthMode("signup");
    openDialog(signupDialog);
    try {
        const response = await fetch("/api/auth/me");
        const result = await readAuthResponse(response);
        if (!response.ok) throw new Error(result.error || "Akkauntni tekshirib bo‘lmadi.");
        if (!result.user) return;
        setAuthenticatedUser(result.user);
        closeDialog(signupDialog);
    } catch (error) {
        signupStatus.textContent = authConnectionError(error);
    }
}

initializeAuth();
