import { useState } from "react";
import { Link } from "react-router-dom";
import { registrarAbogado, confirmarAbogado } from "../services/abogadoService";

const inicial = {
    nombre: "", apellido: "", dni: "", mail: "", nroCelular: "", fechaNacimiento: "", genero: "", domicilio: "",
    nroMatricula: "", colegioProfesional: "Colegio de Abogados de Río Tercero", provincia: "Córdoba",
    especialidad: "", aniosExperiencia: "", honorarios: "", ubicacion: "", direccionProfesional: "", descripcionProfesional: "",
    contrasena: "", confirmarContrasena: "",
};
const personales = [
    ["nombre", "Nombre"], ["apellido", "Apellido"], ["dni", "DNI", "text"], ["fechaNacimiento", "Fecha de nacimiento", "date"],
    ["genero", "Género"], ["domicilio", "Domicilio"], ["mail", "Correo electrónico", "email"], ["nroCelular", "Celular", "tel"],
];
const profesionales = [
    ["nroMatricula", "Matrícula (10-000)"], ["colegioProfesional", "Colegio profesional"], ["provincia", "Provincia"],
    ["especialidad", "Especialidad jurídica"], ["aniosExperiencia", "Años de experiencia", "number"],
    ["honorarios", "Honorarios (ARS)", "number"], ["ubicacion", "Ubicación"], ["direccionProfesional", "Dirección profesional"],
    ["descripcionProfesional", "Descripción profesional"],
];
export default function RegistroAbogado() {
    const [datos, setDatos] = useState(inicial);
    const [paso, setPaso] = useState(0);
    const [resultado, setResultado] = useState(null);
    const [codigo, setCodigo] = useState("");
    const [error, setError] = useState("");
    const [cargando, setCargando] = useState(false);
    const titulos = ["Datos personales", "Verificación de DNI", "Datos profesionales y matrícula", "Contraseña", "Confirmación de correo"];
    function campo([nombre, etiqueta, tipo = "text"]) {
        return <label key={nombre} htmlFor={`abogado-${nombre}`}>{etiqueta}
            <input id={`abogado-${nombre}`} name={nombre} type={tipo} value={datos[nombre]} required
                min={tipo === "number" ? 0 : undefined} step={nombre === "honorarios" ? "0.01" : undefined}
                pattern={nombre === "dni" ? "[0-9]{7,8}" : nombre === "nroMatricula" ? "10-[0-9]{3}" : undefined}
                minLength={tipo === "password" ? 8 : undefined} maxLength={tipo === "password" ? 72 : nombre === "descripcionProfesional" ? 2000 : 255}
                autoComplete={tipo === "password" ? "new-password" : undefined}
                onChange={e => setDatos({ ...datos, [nombre]: e.target.value })} />
        </label>;
    }
    async function enviar(e) {
        e.preventDefault(); setError("");
        if (paso < 3) { setPaso(paso + 1); return; }
        if (paso === 3 && datos.contrasena !== datos.confirmarContrasena) { setError("Las contraseñas no coinciden."); return; }
        setCargando(true);
        try {
            if (paso === 3) {
                const respuesta = await registrarAbogado({ ...datos, aniosExperiencia: Number(datos.aniosExperiencia), honorarios: Number(datos.honorarios) });
                setResultado(respuesta); setDatos({ ...datos, contrasena: "", confirmarContrasena: "" }); setPaso(4);
            } else {
                setResultado(await confirmarAbogado(datos.mail, codigo)); setCodigo("");
            }
        } catch (ex) { setError(ex.message); } finally { setCargando(false); }
    }
    return <main className="registro-abogado">
        <h1>Registrar abogado</h1>
        <p>Paso {paso + 1} de 5: {titulos[paso]}</p>
        <form onSubmit={enviar}>
            <fieldset disabled={cargando}>
                <legend>{titulos[paso]}</legend>
                {paso === 0 && personales.map(campo)}
                {paso === 1 && <p>Después de guardar la solicitud y confirmar tu correo podrás verificar tu DNI argentino con Didit.
                    El proceso incluye documento, prueba de vida y comparación facial (Face Match), y requiere tu consentimiento explícito.
                    Tu cuenta permanecerá pendiente hasta que el backend confirme todas las verificaciones.</p>}
                {paso === 2 && <>
                    <p>La matrícula se cotejará con una versión local del padrón de Río Tercero, Córdoba. Los datos incompletos o contradictorios quedarán pendientes de revisión.</p>
                    {profesionales.map(campo)}
                </>}
                {paso === 3 && <>{campo(["contrasena", "Contraseña", "password"])}{campo(["confirmarContrasena", "Confirmar contraseña", "password"])}</>}
                {paso === 4 && !resultado?.correoConfirmado && <>
                    <p>Ingresá el código enviado a {datos.mail}. Vence en 30 minutos y permite hasta cinco intentos.
                        En desarrollo, el código está en la consola del microservicio cuando se habilita el correo de consola.</p>
                    <label>Código de confirmación<input required value={codigo} onChange={e => setCodigo(e.target.value)} autoComplete="one-time-code" maxLength={128} /></label>
                </>}
                {paso > 0 && paso < 4 && <button type="button" onClick={() => { setError(""); setPaso(paso - 1); }}>Anterior</button>}
                {!(paso === 4 && resultado?.correoConfirmado) && <button type="submit">{cargando ? "Procesando..." : paso < 3 ? "Continuar" : paso === 3 ? "Enviar solicitud de registro" : "Confirmar correo"}</button>}
            </fieldset>
        </form>
        {error && <p role="alert">{error}</p>}
        {resultado && <div role="status">
            <p>Cuenta: {resultado.estado}. Correo: {resultado.correoConfirmado ? "confirmado" : "pendiente"}.</p>
            <p>DNI: {resultado.verificacionDni}. Matrícula: {resultado.validacionMatricula}.</p>
            {resultado.estado === "PENDIENTE" && <p>La solicitud está guardada. El acceso profesional se habilitará cuando se completen todas las verificaciones.</p>}
        </div>}
        <Link to="/iniciar-sesion">Iniciar sesión</Link>
        {resultado?.correoConfirmado && <p><Link to="/verificar-identidad">Verificar mi identidad con Didit</Link></p>}
    </main>;
}
