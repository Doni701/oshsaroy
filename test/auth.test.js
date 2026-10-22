const assert = require("node:assert/strict");
const { mkdtempSync, rmSync } = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { after, before, test } = require("node:test");

const temporaryDirectory = mkdtempSync(path.join(os.tmpdir(), "oshsaroy-auth-"));
process.env.DATABASE_PATH = path.join(temporaryDirectory, "accounts.sqlite");
const app = require("../server");
let server;
let baseUrl;
let sessionCookie;

before(async function() {
    server = app.listen(0);
    await new Promise(function(resolve) {
        server.once("listening", resolve);
    });
    baseUrl = "http://127.0.0.1:" + server.address().port;
});

after(async function() {
    if (server) {
        await new Promise(function(resolve, reject) {
            server.close(function(error) {
                if (error) reject(error);
                else resolve();
            });
        });
    }
    app.locals.closeDatabase();
    rmSync(temporaryDirectory, { recursive: true, force: true });
});

async function request(url, options) {
    return fetch(baseUrl + url, options);
}

test("register creates a persistent account and secure session cookie", async function() {
    const response = await request("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            name: "Ali Valiyev",
            phone: "+998 90 123 45 67",
            password: "strong-pass-123"
        })
    });

    assert.equal(response.status, 201);
    assert.deepEqual((await response.json()).user, {
        id: 1,
        name: "Ali Valiyev",
        phone: "998901234567"
    });
    const setCookie = response.headers.get("set-cookie");
    assert.match(setCookie, /HttpOnly/);
    assert.match(setCookie, /SameSite=Lax/);
    sessionCookie = setCookie.split(";")[0];
});

test("session restores account and protects payment settings", async function() {
    const response = await request("/api/auth/me", {
        headers: { Cookie: sessionCookie }
    });
    assert.equal(response.status, 200);
    assert.equal((await response.json()).user.name, "Ali Valiyev");

    const paymentResponse = await request("/api/payment-methods", {
        headers: { Cookie: sessionCookie }
    });
    assert.equal(paymentResponse.status, 200);
    assert.equal((await paymentResponse.json()).available, false);

    const addCardResponse = await request("/api/payment-methods", {
        method: "POST",
        headers: {
            Cookie: sessionCookie,
            "Content-Type": "application/json"
        },
        body: "{}"
    });
    assert.equal(addCardResponse.status, 503);
});

test("rejects duplicate accounts and incorrect credentials", async function() {
    const duplicate = await request("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            name: "Another Person",
            phone: "998901234567",
            password: "strong-pass-123"
        })
    });
    assert.equal(duplicate.status, 409);

    const login = await request("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: "998901234567", password: "wrong-password" })
    });
    assert.equal(login.status, 401);
});

test("requires a valid session to submit orders and rejects cross-origin auth", async function() {
    const unauthenticated = await request("/order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ address: "Samarqand", cart: [{ name: "Bir kishilik osh", quantity: 1 }] })
    });
    assert.equal(unauthenticated.status, 401);

    const crossOrigin = await request("/api/auth/login", {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            Origin: "https://attacker.example"
        },
        body: JSON.stringify({ phone: "998901234567", password: "strong-pass-123" })
    });
    assert.equal(crossOrigin.status, 403);
});

test("logout revokes the server session", async function() {
    const response = await request("/api/auth/logout", {
        method: "POST",
        headers: { Cookie: sessionCookie }
    });
    assert.equal(response.status, 200);

    const afterLogout = await request("/api/auth/me", {
        headers: { Cookie: sessionCookie }
    });
    assert.equal(afterLogout.status, 200);
    assert.equal((await afterLogout.json()).user, null);
});
