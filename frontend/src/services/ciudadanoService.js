const API_URL = "http://localhost:8080/api/ciudadanos";

export async function registrarCiudadano(ciudadano) {
    const response = await fetch(API_URL, {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify(ciudadano)
    });

    if (!response.ok) {
        const mensaje = await response.text();
        throw new Error(mensaje || "Error al registrar ciudadano");
    }

    return await response.json();
}

export async function confirmarRegistro(codigo) {
    const response = await fetch(`${API_URL}/confirmar`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify({
            codigo: codigo
        })
    });

    if (!response.ok) {
        const mensaje = await response.text();
        throw new Error(mensaje || "Error al confirmar registro");
    }

    return await response.json();
}

export async function modificarCiudadano(cuil, ciudadano) {
    const response = await fetch(`${API_URL}/${cuil}`, {
        method: "PUT",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify(ciudadano)
    });

    if (!response.ok) {
        const mensaje = await response.text();
        throw new Error(mensaje || "Error al modificar ciudadano");
    }

    return await response.json();
}

export async function consultarCiudadano(cuil) {
    const response = await fetch(
        `http://localhost:8080/api/ciudadanos/${cuil}`
    );

    if (!response.ok) {
        const mensaje = await response.text();
        throw new Error(
            mensaje || "Error al consultar los datos del ciudadano"
        );
    }

    return await response.json();
}

export async function darDeBajaCiudadano(cuil) {
    const response = await fetch(
        `http://localhost:8080/api/ciudadanos/${cuil}/baja`,
        {
            method: "PATCH"
        }
    );

    if (!response.ok) {
        const mensaje = await response.text();
        throw new Error(
            mensaje || "Error al dar de baja al ciudadano"
        );
    }

    return await response.json();
}