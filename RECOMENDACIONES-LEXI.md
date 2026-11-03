# Recomendaciones dentro del chat existente

Actualización: el entorno PostgreSQL separado, el esquema, la carga idempotente y
el lector exclusivo de desarrollo ya están preparados. **No se desplegaron ni se
ejecutó SQL.** Ver [docker/abogados-dev/README.md](docker/abogados-dev/README.md)
para las protecciones y los comandos del proyecto aislado en localhost:5175.

## Código implementado

Después de cada orientación recibida correctamente, `LexiChat` muestra la oferta
con «Sí, ver abogados» y «No, gracias». El saludo y los errores de orientación
no generan ofertas. Cada oferta tiene un estado independiente asociado al mensaje.
El rechazo no consulta el backend ni permite reactivar esa misma oferta.
Una nueva orientación tiene su propia oferta. Aceptar consulta una sola vez;
un fallo permite reintentar sin perder la conversación. La carga de abogados
no bloquea el envío de nuevas consultas.

Las tarjetas se muestran en el historial, sin otro chat o pantalla. Sus datos
provienen de `GET http://localhost:8082/api/abogados/recomendaciones` mediante
el servicio de abogados ya existente. El frontend infiere una especialidad de
las palabras del ciudadano y envía únicamente ese filtro, nunca la consulta legal.
Si la clasificación es ambigua, consulta el listado general (máximo 12 resultados).
El backend valida el filtro contra las especialidades realmente persistidas;
un filtro inexistente devuelve `[]`, sin sustituirlo por otra especialidad.

La consulta exige estado REGISTRADO, cuenta completada, correo confirmado,
identidad APROBADA, matrícula VALIDADA y bandera de matrícula verificada.
Además revalida el padrón usando el mismo servicio que el login, sin actualizar
los registros. PENDIENTE, BAJA y matrículas no habilitadas quedan excluidos.
Un profesional habilitado sin especialidades aparece solo en el listado general.
El DTO público tiene campos explícitos; no devuelve DNI, contraseña, códigos,
tokens ni datos internos de identidad. La respuesta usa `Cache-Control: no-store`.

## Perfiles ficticios preparados, sin carga

`scripts/dev/abogados-prueba.json` contiene Valentina Torres, Martín Ferreyra y
Lucía Benítez con claves estables `fixtureId`, DNI sintéticos `TEST0001` a
`TEST0003`, correos `example.com`, marca `perfilPrueba` y advertencia explícita.
No tienen teléfono, matrícula, colegio, contraseña ni verificaciones aprobadas.
El archivo no se importa desde el frontend, no tiene un cargador automático y
no forma parte de los datos devueltos por el endpoint público.

Como defensa adicional, el listado público excluye correos de dominios reservados
de pruebas. El nuevo lector requiere perfil exclusivo de desarrollo, bandera
explícita y base/usuario separados. Las tarjetas contemplan la advertencia de
prueba y ocultan matrícula, verificación y contacto en ese caso.

## Persistencia de desarrollo preparada, sin ejecutar

No se agregó un campo JPA `perfilPrueba`: con el `ddl-auto=update` habitual podría
cambiar la base al arrancar. Los ficticios tienen una tabla JDBC separada y el
perfil de desarrollo obliga a `ddl-auto=validate`. Los SQL y el Compose adicional
están preparados, pero no se ejecutaron. No se consultó ni alteró el abogado existente.

El despliegue continúa pendiente de revisión y autorización; seguir el README
del entorno aislado. Las condiciones del almacenamiento son:

1. Inspeccionar en modo lectura el registro existente y sus relaciones.
2. Confirmar una base PostgreSQL de desarrollo separada de la real.
3. Diseñar allí el almacenamiento explícito de perfiles de prueba, independiente
   de las verificaciones profesionales; habilitar su lectura solo con perfil de
   desarrollo y una opción del servidor desactivada por defecto. Nunca aceptar
   un parámetro público que permita saltarse la habilitación.
4. Preparar y revisar una carga idempotente por `fixtureId`, que inserte solo si
   no existe, rechace colisiones y no actualice registros preexistentes.

No ejecutar el JSON como si fuera una carga de profesionales habilitados.
Defensa del Consumidor no está en el catálogo actual de registro; ampliar ese
catálogo, si se desea para profesionales reales, requiere una decisión separada.

## Validación y Docker

Desde `frontend`:

```powershell
npm test
npm run build
npm run lint
npx --no-install tsc --noEmit
```

Desde `microservicio-abogados`, con Java 21 y Maven:

```powershell
mvn test
```

Los cinco tests nuevos del backend usan exclusivamente una base H2 en memoria
separada, con rollback. Verifican filtros, ausencia de especialidades y resultados,
exclusión de cuentas, revalidación del padrón, acceso público solo GET y DTO seguro.

Cuando se decida desplegar el código, desde la raíz (no ejecutado por el agente):

```powershell
docker compose up -d --build --no-deps abogados frontend
```

Esto reconstruye y recrea solo abogados y frontend. No elimina volúmenes ni
modifica la configuración. n8n y el proxy aprobado permanecen iguales.

En `http://localhost:5173/`, enviar «Me despidieron sin causa». Tras la orientación,
aceptar: Network debe mostrar un GET a `/api/abogados/recomendaciones` con filtro
`Derecho Laboral`. Revisar tarjetas o el mensaje de ausencia. Repetir rechazando:
no debe aparecer ese GET. Cerrar y reabrir el chat conserva mensajes y decisiones
mientras no se recargue la página. Probar también una consulta de tema general.

Con los datos actuales puede no haber ningún profesional habilitado. Eso es un
resultado válido. Los tres ficticios no aparecerán hasta autorizar el despliegue
aislado; no se sustituyen los resultados por datos simulados.

## Resultado de la validación local

El frontend pasó pruebas, build, lint y TypeScript. La suite backend anterior
pasó sus 78 pruebas después de corregir el reintento de la prueba local Didit.
Las comprobaciones nuevas de infraestructura son independientes y no ejecutan SQL.
No se verificó el flujo de tarjetas de prueba en Docker ni contra PostgreSQL.
