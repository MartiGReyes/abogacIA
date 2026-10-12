import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useSesion } from "../AuthContext";
import { iniciarSesion, cerrarSesion, fetchAutenticado } from "../services/authService";

export default function IniciarSesion({ admin = false }) {
    const sesion = useSesion();
    const navigate = useNavigate();
    const [tipoCuenta, setTipoCuenta] = useState("CIUDADANO");
    const [mail, setMail] = useState("");
    const [contrasena, setContrasena] = useState("");
    const [error, setError] = useState("");
    const [cargando, setCargando] = useState(false);
    async function verMisDatos() {
        const response = await fetchAutenticado("http://localhost:8080/api/ciudadanos/me");
        if (!response.ok) throw new Error("No se pudieron cargar tus datos.");
        const ciudadano = await response.json();
        navigate(`/mis-datos/${ciudadano.cuil}`);
    }
    async function enviar(event) {
        event.preventDefault();
        setError("");
        setCargando(true);
        try {
            const cuenta = await iniciarSesion(mail, contrasena, admin ? "ADMIN" : tipoCuenta);
            setContrasena("");
            if (cuenta.rol === "CIUDADANO") await verMisDatos();
        } catch (ex) {
            setError(ex instanceof TypeError ? "No se pudo conectar con el servicio. Intentá nuevamente." : ex.message);
        } finally {
            setContrasena("");
            setCargando(false);
        }
    }
    return <main>
        <h1>{admin ? "Acceso de administrador" : "Iniciar sesión"}</h1>
        {sesion ? <div>
            <p>Sesión iniciada como {sesion.rol}.</p>
            {sesion.rol === "CIUDADANO" && <button onClick={() => verMisDatos().catch(ex => setError(ex.message))}>Mis datos</button>}
            <button onClick={cerrarSesion}>Cerrar sesión</button>
        </div> : <form onSubmit={enviar}>
            {!admin && <label>Tipo de cuenta
                <select value={tipoCuenta} onChange={e => setTipoCuenta(e.target.value)}>
                    <option value="CIUDADANO">Ciudadano</option>
                    <option value="ABOGADO">Abogado</option>
                </select>
            </label>}
            <label>Correo electrónico
                <input type="email" autoComplete="username" required value={mail} onChange={e => setMail(e.target.value)} />
            </label>
            <label>Contraseña
                <input type="password" autoComplete="current-password" required value={contrasena} onChange={e => setContrasena(e.target.value)} />
            </label>
            <button disabled={cargando}>{cargando ? "Ingresando..." : "Iniciar sesión"}</button>
            {!admin && <p><Link to="/registro">Registrarme como ciudadano</Link></p>}
            {!admin && <p><Link to="/registro-abogado">Registrarme como abogado</Link></p>}
        </form>}
        {!admin && <p><Link to="/verificar-identidad">Retomar la verificación de mi solicitud de abogado</Link></p>}
        {error && <p role="alert">{error}</p>}
    </main>;
}
