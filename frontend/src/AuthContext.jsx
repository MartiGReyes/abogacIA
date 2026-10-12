import { createContext, useContext, useEffect, useState } from "react";
import { cerrarSesion, obtenerSesion } from "./services/authService";

const AuthContext = createContext(null);
export function AuthProvider({ children }) {
    const [sesion, setSesion] = useState(obtenerSesion);
    useEffect(() => {
        const actualizar = () => setSesion(obtenerSesion());
        window.addEventListener("sesion", actualizar);
        return () => window.removeEventListener("sesion", actualizar);
    }, []);
    useEffect(() => {
        if (!sesion) return;
        const timer = setTimeout(cerrarSesion, Math.max(0, sesion.expiresAt - Date.now()));
        return () => clearTimeout(timer);
    }, [sesion]);
    return <AuthContext.Provider value={sesion}>{children}</AuthContext.Provider>;
}
// El hook comparte el contexto; este módulo también exporta el proveedor.
// oxlint-disable-next-line react/only-export-components
export function useSesion() { return useContext(AuthContext); }
