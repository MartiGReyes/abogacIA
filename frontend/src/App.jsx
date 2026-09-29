import { BrowserRouter, Routes, Route } from "react-router-dom";

import RegistroCiudadano from "./pages/RegistroCiudadano";
import ConfirmarRegistro from "./pages/ConfirmarRegistro";
import ModificarDatos from "./pages/ModificarDatos";
import BajaCiudadano from "./pages/BajaCiudadano";
import MisDatos from "./pages/MisDatos";

function App() {
    return (
        <BrowserRouter>
            <Routes>

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
                    element={<ModificarDatos />}
                />
                <Route
                    path="/baja/:cuil"
                    element={<BajaCiudadano />}
                />
                <Route
                    path="/mis-datos/:cuil"
                    element={<MisDatos />}
                />
            </Routes>
        </BrowserRouter>
    );
}

export default App;