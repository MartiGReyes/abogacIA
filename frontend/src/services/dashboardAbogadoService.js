import { fetchAutenticado } from './authService.js';
const BASE = (import.meta.env?.VITE_ABOGADOS_URL ?? 'http://localhost:8082').replace(/\/+$/, '');
export async function consultarDashboard(recurso, filtros = {}, signal) {
    if (!/^(resumen|solicitudes|asesoramientos(?:\/\d+(?:\/pagos)?)?|por-area|por-periodo|valoraciones|ingresos\/(mensuales|por-asesoramiento))$/.test(recurso)) throw new Error('Consulta inválida.');
    const params = new URLSearchParams(Object.entries(filtros).filter(([, v]) => v !== '' && v !== undefined));
    const response = await fetchAutenticado(`${BASE}/api/abogados/me/dashboard/${recurso}?${params}`, { signal });
    if (!response.ok) throw new Error(response.status === 404 ? 'Asesoramiento no encontrado.' : 'No pudimos consultar el dashboard. Intentá nuevamente.');
    return response.json();
}
export function periodoDashboard(periodo, ahora = new Date()) {
    const hoy = new Date(ahora.toLocaleString('en-US', { timeZone: 'America/Argentina/Buenos_Aires' }));
    const desde = new Date(hoy);
    if (periodo === '30') desde.setDate(desde.getDate() - 29);
    else {
        const dia = desde.getDate(); desde.setDate(1); desde.setMonth(desde.getMonth() - Number(periodo));
        const ultimo = new Date(desde.getFullYear(), desde.getMonth() + 1, 0).getDate(); desde.setDate(Math.min(dia, ultimo));
    }
    const iso = d => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    return { desde: iso(desde), hasta: iso(hoy) };
}
