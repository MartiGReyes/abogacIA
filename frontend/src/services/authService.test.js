import { beforeEach, test } from "node:test";
import assert from "node:assert/strict";
import { iniciarSesion, obtenerSesion, cerrarSesion, fetchAutenticado, usarSesionDeCuenta, sesionDeCuenta } from "./authService.js";

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

test('mismo correo permite sesiones distintas y un 401 tardío no cierra la otra cuenta',async()=>{
    const crear=rol=>({token:`h.${Buffer.from(JSON.stringify({rol,sub:'42',cuenta:rol+':42',exp:Math.floor(Date.now()/1000)+1800})).toString('base64url')}.s`,rol,idUsuario:'42'});
    globalThis.fetch=async()=>Response.json(crear('CIUDADANO'));
    await iniciarSesion('dual@example.invalid','clave-ciudadana','CIUDADANO');
    let completar;
    globalThis.fetch=()=>new Promise(resolve=>{completar=resolve});
    const pendiente=fetchAutenticado('/anterior').catch(e=>e);
    globalThis.fetch=async()=>Response.json(crear('ABOGADO'));
    await iniciarSesion('dual@example.invalid','clave-profesional','ABOGADO');
    completar(new Response(null,{status:401}));await pendiente;
    assert.equal(obtenerSesion().rol,'ABOGADO');
    assert.equal(sesionDeCuenta('CIUDADANO'),null);
    cerrarSesion();assert.equal(obtenerSesion(),null);
    globalThis.fetch=async()=>Response.json(crear('CIUDADANO'));
    await iniciarSesion('dual@example.invalid','clave-ciudadana','CIUDADANO');
    globalThis.fetch=async()=>Response.json(crear('ABOGADO'));
    await iniciarSesion('dual@example.invalid','clave-profesional','ABOGADO');
    assert.equal(usarSesionDeCuenta('CIUDADANO'),true);assert.equal(obtenerSesion().rol,'CIUDADANO');
    cerrarSesion();assert.equal(sesionDeCuenta('ABOGADO').rol,'ABOGADO');
});
test('rechaza un JWT emitido para otro rol aunque el correo sea el mismo',async()=>{
    globalThis.fetch=async()=>Response.json({...responseLogin(),rol:'ABOGADO'});
    await assert.rejects(iniciarSesion('dual@example.invalid','clave','CIUDADANO'),/cuenta distinta/);
    assert.equal(obtenerSesion(),null);
});
