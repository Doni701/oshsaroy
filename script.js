let products = document.querySelectorAll(".product");

let cart = [];

let cartButton = document.querySelector("#cartButton");
let cartBox = document.querySelector("#cart");
let closeCart = document.querySelector("#closeCart");

let cartItems = document.querySelector("#cartItems");
let cartCount = document.querySelector("#cartCount");
let totalPrice = document.querySelector("#totalPrice");

products.forEach(function(product) {

    let button = product.querySelector("button");

    button.addEventListener("click", function() {

        let name = product.querySelector("h3").textContent;
        let priceText = product.querySelector("p").textContent;

        let price = parseInt(priceText.replace(/\D/g, ""));

        let found = cart.find(function(item) {
            return item.name === name;
        });

        if (found) {
            found.quantity++;
        } else {
            cart.push({
                name: name,
                price: price,
                quantity: 1
            });
        }

        showCart();
    });
});

function showCart() {

    cartItems.innerHTML = "";

    let total = 0;
    let count = 0;

    cart.forEach(function(item, index) {

        let itemTotal = item.price * item.quantity;

        total = total + itemTotal;
        count = count + item.quantity;

        let div = document.createElement("div");

        div.className = "cart-item";

        div.innerHTML = `
            <div>
                <strong>${item.name}</strong>
                <br>
                <button onclick="minus(${index})">−</button>
                ${item.quantity}
                <button onclick="plus(${index})">+</button>
            </div>

            <div>
                ${itemTotal.toLocaleString()} so'm
            </div>
        `;

        cartItems.appendChild(div);
    });

    cartCount.textContent = count;
    totalPrice.textContent = total.toLocaleString();
}

function plus(index) {

    cart[index].quantity++;

    showCart();
}

function minus(index) {

    cart[index].quantity--;

    if (cart[index].quantity === 0) {
        cart.splice(index, 1);
    }

    showCart();
}

cartButton.addEventListener("click", function() {

    cartBox.style.display = "block";

    showCart();
});

closeCart.addEventListener("click", function() {

    cartBox.style.display = "none";
});

function goToSection(section) {

    let element = document.getElementById(section);

    element.scrollIntoView({
        behavior: "smooth"
    });
}
let orderForm = document.querySelector("#orderForm");
let orderButton = document.querySelector("#orderButton");
let closeOrder = document.querySelector("#closeOrder");

orderButton.addEventListener("click", function() {
    orderForm.style.display = "block";
});

closeOrder.addEventListener("click", function() {
    orderForm.style.display = "none";
});

let sendOrder = document.querySelector("#sendOrder");

sendOrder.addEventListener("click", function() {

    let name = document.querySelector("#customerName").value;
    let phone = document.querySelector("#customerPhone").value;
    let address = document.querySelector("#customerAddress").value;

    if (name === "" || phone === "" || address === "") {
        alert("Iltimos, barcha ma'lumotlarni kiriting!");
        return;
    }

    fetch("/order", {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify({
            name: name,
            phone: phone,
            address: address,
            cart: cart,
            total: totalPrice.textContent
        })
    })
    .then(function(response) {
        return response.text();
    })
    .then(function(data) {

        console.log(data);

        alert("Buyurtmangiz qabul qilindi!");
        

        orderForm.style.display = "none";
    });

});