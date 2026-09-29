import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import {
    consultarCiudadano,
    modificarCiudadano
} from "../services/ciudadanoService";

function ModificarDatos() {

    const { cuil } = useParams();

    const [formulario, setFormulario] = useState({
        nombre: "",
        apellido: "",
        fechaNacimiento: "",
        direccion: "",
        mail: "",
        nroCelular: ""
    });

    const [mensaje, setMensaje] = useState("");
    const [error, setError] = useState("");

    useEffect(() => {

        async function cargarCiudadano() {

            try {

                const ciudadano = await consultarCiudadano(cuil);

                setFormulario({
                    nombre: ciudadano.nombre || "",
                    apellido: ciudadano.apellido || "",
                    fechaNacimiento: ciudadano.fechaNacimiento || "",
                    direccion: ciudadano.direccion || "",
                    mail: ciudadano.mail || "",
                    nroCelular: ciudadano.nroCelular || ""
                });

            } catch (error) {
                console.error(error);
                setError(error.message);
            }
        }

        cargarCiudadano();

    }, [cuil]);

    function manejarCambio(e) {
        setFormulario({
            ...formulario,
            [e.target.name]: e.target.value
        });
    }

    async function manejarEnvio(e) {
        e.preventDefault();

        setMensaje("");
        setError("");

        try {
            const respuesta = await modificarCiudadano(
                cuil,
                formulario
            );

            console.log("Ciudadano modificado:", respuesta);

            setMensaje("Datos modificados correctamente.");

        } catch (error) {
            console.error(error);
            setError(error.message);
        }
    }

    return (
        <div>

            <h1>Modificar mis datos</h1>

            <p>CUIL: {cuil}</p>

            <form onSubmit={manejarEnvio}>

                <div>
                    <label>Nombre</label>
                    <input
                        type="text"
                        name="nombre"
                        value={formulario.nombre}
                        onChange={manejarCambio}
                        required
                    />
                </div>

                <div>
                    <label>Apellido</label>
                    <input
                        type="text"
                        name="apellido"
                        value={formulario.apellido}
                        onChange={manejarCambio}
                        required
                    />
                </div>

                <div>
                    <label>Fecha de nacimiento</label>
                    <input
                        type="date"
                        name="fechaNacimiento"
                        value={formulario.fechaNacimiento}
                        onChange={manejarCambio}
                    />
                </div>

                <div>
                    <label>Dirección</label>
                    <input
                        type="text"
                        name="direccion"
                        value={formulario.direccion}
                        onChange={manejarCambio}
                    />
                </div>

                <div>
                    <label>Correo electrónico</label>
                    <input
                        type="email"
                        name="mail"
                        value={formulario.mail}
                        onChange={manejarCambio}
                        required
                    />
                </div>

                <div>
                    <label>Celular</label>
                    <input
                        type="text"
                        name="nroCelular"
                        value={formulario.nroCelular}
                        onChange={manejarCambio}
                    />
                </div>

                <button type="submit">
                    Guardar cambios
                </button>

            </form>

            {mensaje && <p>{mensaje}</p>}

            {error && <p>{error}</p>}

        </div>
    );
}

export default ModificarDatos;