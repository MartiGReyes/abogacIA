# US19–US27: indicadores y estadísticas del abogado

Esta implementación sigue la nueva épica: US19 corresponde a indicadores de estado y US20 al registro opcional de ingresos.

En http://localhost:5173, ingresar como abogado y abrir **Estadísticas**.

| US | Funcionalidad |
| --- | --- |
| US19 | Cuatro indicadores históricos: recibidas, pendientes, en curso y finalizadas. |
| US20 | Registrar o corregir un único ingreso opcional por asesoramiento finalizado, en ARS, incluyendo $0 explícito. Disponible desde el detalle y desde Estadísticas. |
| US21 | Distribución por el área elegida al contactar; incluye especialidades sin consultas con valor cero. |
| US22 | Gráfico de barras por fecha de registro de cada solicitud, independientemente del estado. |
| US23 | Promedio y cantidad de valoraciones de solicitudes en todos los estados. Si no hay valoraciones, no se muestra una puntuación ficticia. |
| US24 | Ingreso acumulado histórico de la cuenta. |
| US25 | Total del mes y año elegidos, independientemente del filtro general. |
| US26 | Todos los asesoramientos finalizados, con ciudadano, motivo, área, fecha y diferenciación entre ingreso registrado y ausencia de registro. |
| US27 | Total y gráfico de ingresos del intervalo elegido, con fechas inclusivas. |

Los indicadores de estado, áreas y valoración promedio son históricos. Los gráficos y el total del período usan el intervalo seleccionado. El ingreso mensual tiene su propio selector. La pantalla se actualiza cada 15 segundos, al volver a la ventana y al registrar/corregir un ingreso; también tiene actualización manual y reintento ante errores.

## Reglas de datos

- Cada solicitud nueva tiene una sola `area_juridica`, elegida entre las especialidades del abogado. Para solicitudes anteriores se conserva la especialidad si era única; si había varias, se informa **Sin clasificar**, sin inventar una asignación.
- Los ingresos se guardan en `ingreso_contacto`, vinculados por su PK/FK a una solicitud finalizada. El rol y la titularidad se verifican en servidor; se bloquean solicitudes de terceros, duplicados y registros sobre estados anteriores a Finalizada.
- El importe se calcula en PostgreSQL con `numeric(15,2)` y Java `BigDecimal`. Los totales monetarios se envían como cadenas decimales exactas, nunca se calculan sumando importes en el navegador. Las alturas de los gráficos son representativas; las etiquetas y tablas presentan los importes.
- Se admiten montos desde cero hasta 9.999.999.999.999,99, con hasta dos decimales. Los honorarios del perfil no se usan como ingresos. Un caso sin ingreso no se interpreta como $0.
- La fecha de ingreso la indica el abogado y puede corregirse junto con el importe. La corrección conserva la fecha original de creación del registro y actualiza su fecha de modificación; mueve el importe al mes/período correspondiente sin duplicarlo.
- Fechas y agrupación de consultas: zona `America/Argentina/Buenos_Aires`. Las fechas de ingresos son fechas locales, sin conversión horaria. Los intervalos incluyen ambos extremos y admiten hasta 10 años. Gráficos diarios hasta 62 días; mensuales para rangos mayores, incluyendo los meses parciales.
- No se incorpora un proveedor de pagos: los ingresos son declarados manualmente por el abogado.

## API privada

- `GET /api/abogados/me/estadisticas?desde=YYYY-MM-DD&hasta=YYYY-MM-DD&mes=YYYY-MM`
- `GET /api/abogados/me/contactos/{id}/ingreso`
- `POST /api/abogados/me/contactos/{id}/ingreso`
- `PUT /api/abogados/me/contactos/{id}/ingreso`

POST y PUT reciben `{ "importe": "1234.56", "fechaIngreso": "2026-11-11" }`. POST devuelve 409 si ya hay un ingreso; PUT devuelve 404 si aún no existe. Una consulta sobre un ingreso ausente devuelve `{ "registrado": false }`.

Se usa el circuito `contacto_whatsapp`/`valoracion_contacto` actual, sin combinar registros sintéticos del antiguo dashboard de solo lectura ni sus pagos de demostración.

## Migración y validación

`microservicio-abogados/src/main/resources/db/indicadores.sql` es aditiva e idempotente. El entorno principal la aplica al iniciar; `iniciar.bat` la aplica explícitamente en el entorno aislado y otorga los permisos mínimos de lectura/escritura. Se conservaron respaldos previos en `../.private-contacto-operativo/principal-pre-indicadores.dump` y `pruebas-pre-indicadores.dump`.

```powershell
npm.cmd --prefix frontend test
node frontend/node_modules/typescript/bin/tsc --noEmit -p frontend
node --test docker/unificado/indicadores.test.mjs
node docker/unificado/indicadores-browser.mjs
```

Las pruebas integrales usan solicitudes sintéticas, no envían WhatsApp ni realizan cobros y limpian sus registros al terminar. Requieren las cuentas locales de prueba existentes y contacto habilitado en el abogado de prueba.
