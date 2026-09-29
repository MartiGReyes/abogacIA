import { useState } from "react";
import { confirmarRegistro } from "../services/ciudadanoService";

function ConfirmarRegistro() {

    const [codigo, setCodigo] = useState("");
    const [mensaje, setMensaje] = useState("");
    const [error, setError] = useState("");

    async function manejarConfirmacion(e) {
        e.preventDefault();

        setMensaje("");
        setError("");

        try {
            const respuesta = await confirmarRegistro(codigo);

            console.log("Registro confirmado:", respuesta);

            setMensaje("Registro confirmado correctamente.");

        } catch (error) {
            console.error(error);
            setError(error.message);
        }
    }

    return (
        <div>
            <h1>Confirmar registro</h1>

            <p>
                Ingresá el código de confirmación recibido.
            </p>

            <form onSubmit={manejarConfirmacion}>

                <div>
                    <label>Código de confirmación</label>

                    <input
                        type="text"
                        value={codigo}
                        onChange={(e) => setCodigo(e.target.value)}
                        required
                    />
                </div>

                <button type="submit">
                    Confirmar registro
                </button>

            </form>

            {mensaje && <p>{mensaje}</p>}

            {error && <p>{error}</p>}
        </div>
    );
}

export default ConfirmarRegistro;