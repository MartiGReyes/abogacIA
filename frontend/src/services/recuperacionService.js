import { cerrarSesionDeCuenta } from './authService.js';
const bases = {
    CIUDADANO: (import.meta.env?.VITE_CIUDADANOS_URL ?? 'http://localhost:8080').replace(/\/+$/, '') + '/api/ciudadanos',
    ABOGADO: (import.meta.env?.VITE_ABOGADOS_URL ?? 'http://localhost:8082').replace(/\/+$/, '') + '/api/abogados',
};
async function enviar(tipo, paso, datos) {
    if (!Object.hasOwn(bases, tipo)) throw new Error('Seleccioná ciudadano o abogado.');
    const r = await fetch(`${bases[tipo]}/recuperacion/${paso}`, {
        method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify(datos), signal:AbortSignal.timeout(15000),
    });
    const data = await r.json().catch(()=>null);
    if (!r.ok) throw new Error(r.status===503 ? 'La recuperación de contraseña no está disponible temporalmente.' : 'No se pudo completar la recuperación. Revisá los datos y reintentá.');
    if (typeof data?.mensaje !== 'string') throw new Error('El servicio devolvió una respuesta inválida.');
    return data.mensaje;
}
export const solicitarRecuperacion = (tipo,mail) => enviar(tipo,'solicitar',{mail:mail.trim()});
export async function confirmarRecuperacion(tipo,token,contrasena,confirmarContrasena) {
    const mensaje = await enviar(tipo,'confirmar',{token:token.trim(),contrasena,confirmarContrasena});
    cerrarSesionDeCuenta(tipo);
    return mensaje;
}
