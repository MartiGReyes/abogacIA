import { BrowserRouter, Routes, Route, Link, Navigate } from "react-router-dom";
import { AuthProvider, useSesion } from "./AuthContext";
import { cerrarSesion } from "./services/authService";
import IniciarSesion from "./pages/IniciarSesion";

function CuentaCiudadano({ children }) {
    const sesion = useSesion();
    return sesion?.rol === "CIUDADANO" ? children : <Navigate to="/iniciar-sesion" replace />;
}

function SesionNav() {
    const sesion = useSesion();
    return <nav>
        <Link to="/iniciar-sesion">{sesion ? "Mi sesión" : "Iniciar sesión"}</Link>
        {sesion && <button onClick={cerrarSesion}>Cerrar sesión</button>}
    </nav>;
}

import RegistroAbogado from "./pages/RegistroAbogado";
import VerificarIdentidad from "./pages/VerificarIdentidad";
import RegistroCiudadano from "./pages/RegistroCiudadano";
import ConfirmarRegistro from "./pages/ConfirmarRegistro";
import ModificarDatos from "./pages/ModificarDatos";
import BajaCiudadano from "./pages/BajaCiudadano";
import MisDatos from "./pages/MisDatos";

function App() {
    return (
        <AuthProvider><BrowserRouter>
            <SesionNav />
            <Routes>
                <Route path="/" element={<Navigate to="/iniciar-sesion" replace />} />
                <Route path="/registro-abogado" element={<RegistroAbogado />} />
                <Route path="/verificar-identidad" element={<VerificarIdentidad />} />
                <Route path="/iniciar-sesion" element={<IniciarSesion />} />
                <Route path="/admin/iniciar-sesion" element={<IniciarSesion admin />} />

                <Route
                    path="/registro"
                    element={<RegistroCiudadano />}
                />

                <Route
                    path="/confirmar-registro"
                    element={<ConfirmarRegistro />}
                />
                <Route
                    path="/modificar-datos/:cuil"
                    element={<CuentaCiudadano><ModificarDatos /></CuentaCiudadano>}
                />
                <Route
                    path="/baja/:cuil"
                    element={<CuentaCiudadano><BajaCiudadano /></CuentaCiudadano>}
                />
                <Route
                    path="/mis-datos/:cuil"
                    element={<CuentaCiudadano><MisDatos /></CuentaCiudadano>}
                />
            </Routes>
        </BrowserRouter></AuthProvider>
    );
}

export default App;
