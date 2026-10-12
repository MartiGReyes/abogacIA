import { beforeEach, test } from "node:test";
import assert from "node:assert/strict";
import { iniciarSesion, obtenerSesion, cerrarSesion, fetchAutenticado } from "./authService.js";

let stored;
beforeEach(() => {
    stored = new Map();
    globalThis.sessionStorage = {
        getItem: key => stored.get(key) ?? null,
        setItem: (key, value) => stored.set(key, value),
        removeItem: key => stored.delete(key)
    };
    globalThis.window = new EventTarget();
});
function responseLogin(exp = Math.floor(Date.now() / 1000) + 1800) {
    return { token: `header.${Buffer.from(JSON.stringify({ exp })).toString("base64url")}.signature`,
        rol: "CIUDADANO", idUsuario: "42" };
}
test("login central, persistencia sin contraseña y logout local", async () => {
    const data = responseLogin();
    let calls = 0;
    globalThis.fetch = async (url, options) => {
        calls++;
        assert.equal(url, "http://localhost:8081/api/auth/login");
        assert.deepEqual(JSON.parse(options.body),
            { mail: "ana@example.com", contrasena: "secreto", tipoCuenta: "CIUDADANO" });
        return Response.json(data);
    };
    await iniciarSesion("ana@example.com", "secreto", "CIUDADANO");
    assert.equal(obtenerSesion().token, data.token);
    assert.equal([...stored.values()].join("").includes("secreto"), false);
    cerrarSesion();
    assert.equal(obtenerSesion(), null);
    assert.equal(calls, 1);
});
test("token vencido impide nuevas solicitudes", async () => {
    globalThis.fetch = async () => Response.json(responseLogin(1));
    await iniciarSesion("ana@example.com", "secreto", "CIUDADANO");
    globalThis.fetch = () => { throw new Error("No debe llamar al backend"); };
    await assert.rejects(fetchAutenticado("/cuenta"), /Iniciá sesión/);
    assert.equal(obtenerSesion(), null);
});
test("envía bearer y un 401 elimina la sesión", async () => {
    const data = responseLogin();
    globalThis.fetch = async () => Response.json(data);
    await iniciarSesion("ana@example.com", "secreto", "CIUDADANO");
    globalThis.fetch = async (_url, options) => {
        assert.equal(options.headers.Authorization, `Bearer ${data.token}`);
        return new Response(null, { status: 401 });
    };
    await assert.rejects(fetchAutenticado("/cuenta"), /sesión venció/);
    assert.equal(obtenerSesion(), null);
});
test("login fallido no persiste sesión", async () => {
    globalThis.fetch = async () => Response.json({ error: "Credenciales incorrectas." }, { status: 401 });
    await assert.rejects(iniciarSesion("ana@example.com", "incorrecta", "CIUDADANO"), /Credenciales incorrectas/);
    assert.equal(obtenerSesion(), null);
});
