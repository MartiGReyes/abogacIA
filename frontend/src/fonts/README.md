# Lato — Google Fonts

Fuentes originales de Google Fonts, alojadas localmente para evitar solicitudes a terceros y reducir latencia. No se modifica el diseño de la tipografía.

- Familia: Lato.
- Pesos CSS de interfaz: 400, 500, 600, 700 y 900. Google Fonts distribuye Lato con archivos reales de 400, 700 y 900, pero no de 500/600: el navegador aplica la selección estándar del peso disponible más cercano (500 → 400 y 600 → 700). No se presentan estos archivos como pesos originales 500/600.
- Formato: WOFF2, subconjunto latino de Google Fonts, que incluye los caracteres del español argentino.
- Carga: `font-display: swap`, precarga de los pesos 400 y 900 y fallback sans-serif con ajustes de métricas para reducir cambios durante la carga.
- Licencia: SIL Open Font License, incluida en `OFL-Lato.txt`.
- CSS de origen: `https://fonts.googleapis.com/css2?family=Lato:wght@400;700;900&display=swap`.

Archivos de origen:

- 400: `https://fonts.gstatic.com/s/lato/v25/S6uyw4BMUTPHjx4wXg.woff2`
- 700: `https://fonts.gstatic.com/s/lato/v25/S6u9w4BMUTPHh6UVSwiPGQ.woff2`
- 900: `https://fonts.gstatic.com/s/lato/v25/S6u9w4BMUTPHh50XSwiPGQ.woff2`

Antes de añadir idiomas con otro repertorio de caracteres, incorporar el subconjunto adecuado.
