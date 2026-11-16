export function baseCorreo(tipo, origenes = {
  CIUDADANO: import.meta.env?.VITE_CIUDADANOS_URL ?? 'http://localhost:8080',
  ABOGADO: import.meta.env?.VITE_ABOGADOS_URL ?? 'http://localhost:8082',
}) {
  if (!['CIUDADANO', 'ABOGADO'].includes(tipo)) throw new Error('Seleccioná un tipo de cuenta válido.');
  return origenes[tipo].replace(/\/+$/, '') + (tipo === 'CIUDADANO' ? '/api/ciudadanos' : '/api/abogados');
}
export async function reenviarConfirmacion(tipo, mail) {
  const r = await fetch(baseCorreo(tipo) + '/correo/reenviar', {
    method: 'POST', headers: {'Content-Type': 'application/json'},
    body: JSON.stringify({mail: mail.trim().toLowerCase()}), signal: AbortSignal.timeout(15000),
  });
  if (!r.ok) throw new Error('No se pudo solicitar el correo. Intentá nuevamente más tarde.');
  const data = await r.json();
  if (typeof data.mensaje !== 'string') throw new Error('Respuesta inválida del servicio.');
  return data.mensaje;
}
