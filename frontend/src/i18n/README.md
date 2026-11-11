# Internacionalización de AbogacIA

- Idioma inicial: **es-AR**, sin detección del navegador. Se admiten solamente es-AR, en, pt-BR, fr, it y de.
- `locales/<idioma>.json` contiene los mismos identificadores semánticos en los seis idiomas. No duplicar pantallas ni usar el texto traducido como valor de un estado, filtro o permiso.
- `t(clave, parámetros)` traduce al renderizar. `uiText(valor)` se reserva para claves conocidas y etiquetas de enumeraciones canónicas. Nunca recibe contenido libre, nombres, correos, números, fechas formateadas, traducciones ya resueltas ni elementos React. Los componentes genéricos renderizan sus hijos directamente.
- Los estados, especialidades, períodos y valores de `<option>` siguen utilizando identificadores originales estables. `labels.json` localiza únicamente su presentación.
- Los formularios almacenan claves de error, no traducciones. `message(clave, parámetros)` conserva notificaciones interpoladas para que cambien de idioma mientras están abiertas.
- `useLocale()` usa `useSyncExternalStore`. La suscripción en la raíz vuelve a renderizar sin cambiar claves de componentes, pantalla, sesión, borradores ni selección del carrusel.
- La preferencia se guarda en `localStorage`, clave `abogacia.language`, con tolerancia a almacenamiento bloqueado y sincronización entre pestañas. `registerLanguagePreferenceWriter` permite conectar más adelante un servicio de preferencias; no cambia autenticación ni realiza peticiones.
- `Intl` adapta fechas, importes, decimales y meses. Moneda fija **ARS**, zona horaria **America/Argentina/Cordoba**. Las claves ISO usadas para cálculos no cambian.
- Nombres, matrículas, direcciones, biografías, casos, consultas y mensajes originales no se traducen. No pasar contenido libre a traductores de interfaz; interpolarlo como dato sin modificarlo.
- Lexi sigue siendo una **demostración basada en reglas, sin modelo de IA conectado**. Su bienvenida y controles cambian de idioma; las nuevas orientaciones simuladas se generan en el idioma seleccionado. Los mensajes ya enviados conservan su texto y atributo `lang`. `lexiLanguageContext()` prepara el idioma para una futura integración real, sin fingir que existe.
- Las fuentes Lato y los componentes institucionales existentes se conservan. El menú usa `menuitemradio`, check, flechas, Home/End, Escape, foco restaurado y cierre al salir o hacer clic fuera.
- El selector principal precede a la cuenta y queda junto al menú móvil. Los diálogos incluyen una instancia dentro de su cabecera para poder cambiar el idioma sin salir del foco modal ni perder borradores; el menú del fondo no es interactuable mientras el diálogo está abierto. Los nombres nativos de idiomas facilitan reconocerlos independientemente de la selección actual.

## Validación

`pnpm exec tsc --noEmit`

`node --experimental-strip-types --test tests/i18n.test.mjs tests/carousel.test.mjs tests/model.test.mjs tests/contrast.test.mjs`

Con Chromium CDP en `CDP_URL` y el servidor ya iniciado en `APP_URL`:

`node tests/i18n-browser.mjs`

`node tests/visual-browser.mjs`

`node tests/browser.mjs`

`pnpm build`

Los tests verifican paridad de claves/parámetros, traducciones de todas las superficies, formatos, selector real, persistencia, foco, borradores, contenido original, seis idiomas y regresiones.
