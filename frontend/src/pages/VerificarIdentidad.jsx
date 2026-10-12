import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { accederRegistro, accesoRegistroVigente, avisoIdentidad,
    estadoIdentidad, consultarIdentidad, iniciarIdentidad, cerrarRegistroRemoto } from "../services/abogadoService";

export default function VerificarIdentidad() {
    const [aviso, setAviso] = useState(null);
    const [acceso, setAcceso] = useState(() => !!accesoRegistroVigente());
    const [estado, setEstado] = useState(null);
    const [mail, setMail] = useState("");
    const [contrasena, setContrasena] = useState("");
    const [consentimiento, setConsentimiento] = useState(false);
    const [error, setError] = useState("");
    const [cargando, setCargando] = useState(false);
    useEffect(() => {
        let activo = true;
        avisoIdentidad().then(r => { if (activo) setAviso(r); }).catch(e => { if (activo) setError(e.message); });
        if (accesoRegistroVigente()) estadoIdentidad().then(r => { if (activo) setEstado(r); })
            .catch(e => { if (activo) { setError(e.message); setAcceso(!!accesoRegistroVigente()); } });
        return () => { activo = false; };
    }, []);
    async function ejecutar(accion) {
        setCargando(true); setError("");
        try { await accion(); }
        catch (e) { setError(e.message); setAcceso(!!accesoRegistroVigente()); }
        finally { setContrasena(""); setCargando(false); }
    }
    function ingresar(e) {
        e.preventDefault();
        ejecutar(async () => {
            await accederRegistro(mail, contrasena); setAcceso(true);
            setEstado(await estadoIdentidad());
        });
    }
    function iniciar() {
        ejecutar(async () => {
            const r = await iniciarIdentidad(consentimiento, aviso.version); setEstado(r);
            if (r.url) window.location.assign(r.url);
        });
    }
    return <main>
        <h1>Verificar identidad del abogado</h1>
        <p>El acceso a tu solicitud dura 15 minutos y permite únicamente gestionar la verificación. El login profesional permanece bloqueado hasta completar todas las condiciones.</p>
        {!acceso ? <form onSubmit={ingresar}>
            <p>Confirmá primero el correo de tu solicitud. Para iniciar o retomar, ingresá tus credenciales.</p>
            <label>Correo electrónico<input type="email" required autoComplete="username" value={mail} onChange={e => setMail(e.target.value)} /></label>
            <label>Contraseña<input type="password" required autoComplete="current-password" value={contrasena} onChange={e => setContrasena(e.target.value)} /></label>
            <button disabled={cargando}>Acceder a mi solicitud</button>
        </form> : <>
            {estado && <div role="status">
                <p>Cuenta: {estado.cuenta.estado}. Identidad: {estado.cuenta.verificacionDni}. Matrícula: {estado.cuenta.validacionMatricula}.</p>
                <p>Sesión: {estado.sesionEstado}.</p>
                {estado.seguimiento === "LIMITE_CONSULTAS" && <p>Se agotó el seguimiento automático. Solicitá revisión por el canal de contacto del aviso.</p>}
                {estado.seguimiento === "DIDIT_NO_DISPONIBLE" && <p>La última consulta falló. Se volverá a intentar con una espera progresiva.</p>}
                {estado.cuenta.estado === "REGISTRADO" && <p>Las verificaciones están completas. Podés iniciar sesión como abogado.</p>}
            </div>}
            {aviso && <>
                <p>{aviso.texto}</p>
                {aviso.disponible && <p>Versión del aviso: {aviso.version}</p>}
                <label><input type="checkbox" checked={consentimiento} disabled={!aviso.disponible || cargando}
                    onChange={e => setConsentimiento(e.target.checked)} />Leí el aviso y consiento expresamente la verificación documental, la prueba de vida y la comparación facial por Didit.</label>
                <button disabled={cargando || !aviso.disponible || !consentimiento || estado?.cuenta.verificacionDni === "RECHAZADA" || estado?.cuenta.estado === "REGISTRADO"}
                    onClick={iniciar}>Iniciar o retomar Didit</button>
            </>}
            <button disabled={cargando} onClick={() => ejecutar(async () => setEstado(await consultarIdentidad()))}>Consultar decisión de Didit</button>
            <button disabled={cargando} onClick={() => ejecutar(async () => { await cerrarRegistroRemoto(); setAcceso(false); setEstado(null); setConsentimiento(false); })}>Cerrar acceso temporal</button>
        </>}
        {cargando && <p role="status">Procesando...</p>}
        {error && <p role="alert">{error}</p>}
        <p>El regreso desde Didit no aprueba la cuenta. El backend consulta la decisión; también la revisa periódicamente aunque cierres esta pestaña.</p>
        <Link to="/iniciar-sesion">Iniciar sesión</Link>
    </main>;
}
