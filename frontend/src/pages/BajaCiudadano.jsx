import { useState } from "react";
import { useParams } from "react-router-dom";
import { darDeBajaCiudadano } from "../services/ciudadanoService";

function BajaCiudadano() {

    const { cuil } = useParams();

    const [mensaje, setMensaje] = useState("");
    const [error, setError] = useState("");

    async function confirmarBaja() {

        const confirmar = window.confirm(
            "¿Está seguro de que desea dar de baja su cuenta?"
        );

        if (!confirmar) {
            return;
        }

        setMensaje("");
        setError("");

        try {

            await darDeBajaCiudadano(cuil);

            setMensaje(
                "La cuenta fue dada de baja correctamente."
            );

        } catch (error) {
            console.error(error);
            setError(error.message);
        }
    }

    return (
        <div>

            <h1>Dar de baja mi cuenta</h1>

            <p>
                Esta acción cambiará el estado de su cuenta a BAJA.
            </p>

            <p>CUIL: {cuil}</p>

            <button onClick={confirmarBaja}>
                Dar de baja mi cuenta
            </button>

            {mensaje && <p>{mensaje}</p>}
            {error && <p>{error}</p>}

        </div>
    );
}

export default BajaCiudadano;