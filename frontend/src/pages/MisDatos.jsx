import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { consultarCiudadano } from "../services/ciudadanoService";

function MisDatos() {

    const { cuil } = useParams();
    const navigate = useNavigate();

    const [ciudadano, setCiudadano] = useState(null);
    const [error, setError] = useState("");

    useEffect(() => {

        async function cargarCiudadano() {

            try {
                const datos = await consultarCiudadano(cuil);
                setCiudadano(datos);

            } catch (error) {
                console.error(error);
                setError(error.message);
            }
        }

        cargarCiudadano();

    }, [cuil]);

    if (error) {
        return <p>{error}</p>;
    }

    if (!ciudadano) {
        return <p>Cargando datos...</p>;
    }

    return (
        <div>

            <h1>Mis datos</h1>

            <p>
                <strong>Nombre:</strong> {ciudadano.nombre}
            </p>

            <p>
                <strong>Apellido:</strong> {ciudadano.apellido}
            </p>

            <p>
                <strong>CUIL:</strong> {ciudadano.cuil}
            </p>

            <p>
                <strong>Fecha de nacimiento:</strong>{" "}
                {ciudadano.fechaNacimiento}
            </p>

            <p>
                <strong>Dirección:</strong> {ciudadano.direccion}
            </p>

            <p>
                <strong>Correo electrónico:</strong> {ciudadano.mail}
            </p>

            <p>
                <strong>Celular:</strong> {ciudadano.nroCelular}
            </p>

            <button
                onClick={() =>
                    navigate(`/modificar-datos/${cuil}`)
                }
            >
                Modificar datos
            </button>
            <button
                onClick={() =>
                    navigate(`/baja/${cuil}`)
                }
            >
                Dar de baja mi cuenta
            </button>
        </div>
    );
}

export default MisDatos;