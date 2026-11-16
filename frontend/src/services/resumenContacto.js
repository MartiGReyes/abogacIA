// Literal excerpts only. The existing API accepts at most 800 UTF-16 code units.
export const LIMITES_RESUMEN = Object.freeze({ consulta: 320, orientacion: 400 });
function extracto(texto, limite) {
    const limpio = String(texto ?? '').trim();
    if (limpio.length <= limite) return limpio;
    let corte = limpio.slice(0, limite - 1).replace(/[\uD800-\uDBFF]$/, '');
    const espacio = corte.lastIndexOf(' ');
    if (espacio > limite * 0.7) corte = corte.slice(0, espacio);
    return corte.trimEnd() + '…';
}
export function resumirContactoLexi(textos) {
    if (!textos?.consulta?.trim() || !textos?.orientacion?.trim()) return null;
    return {
        consulta: extracto(textos.consulta, LIMITES_RESUMEN.consulta),
        orientacion: extracto(textos.orientacion, LIMITES_RESUMEN.orientacion),
    };
}
export function combinarResumenLexi(resumen) {
    return `Consulta del ciudadano:\n${resumen.consulta.trim()}\n\nOrientación de Lexi:\n${resumen.orientacion.trim()}`;
}
