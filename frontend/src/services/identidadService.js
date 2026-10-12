// Verificación de identidad con Didit, compartida por abogados y ciudadanos.
// Cada servicio usa su propio backend y su propio acceso temporal en sessionStorage.
export function crearServicioIdentidad(baseUrl, nombreServicio, accesoKey) {
    function accesoRegistroVigente() {
        try {
            const acceso = JSON.parse(sessionStorage.getItem(accesoKey));
            if (acceso?.token && Date.parse(acceso.vence) > Date.now()) return acceso;
        } catch { /* Invalid or unavailable storage cannot authorize a request. */ }
        cerrarAccesoRegistro();
        return null;
    }
    function cerrarAccesoRegistro() {
        sessionStorage.removeItem(accesoKey);
    }
    async function verificacion(ruta, metodo = "GET", datos, protegido = true) {
        const headers = { "Content-Type": "application/json" };
        if (protegido) {
            const acceso = accesoRegistroVigente();
            if (!acceso) throw new Error("Ingresá nuevamente para acceder a tu solicitud.");
            headers["X-Registro-Token"] = acceso.token;
        }
        let response;
        try {
            response = await fetch(`${baseUrl}/${ruta}`, {
                method: metodo, headers, body: datos === undefined ? undefined : JSON.stringify(datos),
                cache: "no-store", referrerPolicy: "no-referrer",
            });
        } catch { throw new Error(`No se pudo conectar con el servicio de ${nombreServicio}.`); }
        const resultado = await response.json().catch(() => ({}));
        if (response.status === 401 && protegido) cerrarAccesoRegistro();
        if (!response.ok) throw new Error(resultado.error || "No se pudo completar la verificación.");
        return resultado;
    }
    /** Obtiene y guarda el acceso temporal: abogados con la solicitud, ciudadanos con correo y contraseña. */
    async function obtenerAcceso(ruta, datos) {
        cerrarAccesoRegistro();
        const acceso = await verificacion(ruta, "POST", datos, false);
        sessionStorage.setItem(accesoKey, JSON.stringify({ token: acceso.token, vence: acceso.vence }));
        return acceso;
    }
    async function cerrarRegistroRemoto() {
        try { await verificacion("cerrar", "POST"); }
        finally { cerrarAccesoRegistro(); }
    }
    return {
        accesoRegistroVigente, cerrarAccesoRegistro, obtenerAcceso, cerrarRegistroRemoto,
        accederRegistro: (mail, contrasena) => obtenerAcceso("acceso", { mail, contrasena }),
        avisoIdentidad: () => verificacion("aviso", "GET", undefined, false),
        estadoIdentidad: () => verificacion("estado"),
        consultarIdentidad: () => verificacion("consultar", "POST"),
        iniciarIdentidad: (consentimiento, avisoVersion) => verificacion("sesion", "POST", { consentimiento, avisoVersion }),
        enviar: (ruta, datos) => verificacion(ruta, "POST", datos),
    };
}
