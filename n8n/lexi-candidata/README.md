# Candidata de Lexi — primera etapa, sin activar

`workflow.json` deriva de la copia completa probada. El archivo entregado está inactivo, tiene ruta distinta (`lexi-candidata-habitual`) y no contiene credenciales ni su asociación a las del workflow habitual. Se registró una copia exclusivamente en una instancia nueva de validación, sin tocar el n8n habitual. El frontend habitual mantiene su URL y webhook originales.

`comparacion.json` registra la versión habitual respaldada, los nodos diferentes y la igualdad de los parámetros originales de PGVector y embeddings. No hay nodos de carga, borrado, ingestión o regeneración del corpus.

## Conexión exclusiva de la candidata a un entorno propio

Las conexiones del grafo ya están definidas. Antes de ejecutarla deben vincularse en una instancia n8n nueva de validación:

- `Postgres PGVector Store` → credencial PostgreSQL de **copia aislada**, nunca `abogacia_pgdata`, `host.docker.internal:5433` ni la base habitual. El corpus de referencia confirmado es LCT 20.744, 161 fragmentos. No cargar nuevamente documentos ni generar embeddings.
- `Google Gemini Chat Model` y `Embeddings Google Gemini` → credencial autorizada dentro de esa instancia, sin exportarla ni registrarla.
- El webhook solo debe exponerse por loopback en ese entorno. No conectar el frontend habitual a esta ruta de prueba.

Se crearon `lexi-habitual-candidata-n8n` y `lexi-habitual-candidata-pg`, con red interna propia `lexi_habitual_candidata_etapa1`, sin gateway de salida ni puertos publicados. El SQLite cifrado se copió a un directorio nuevo y las referencias de credenciales existentes se conservaron solo allí, sin descifrarlas/exportarlas. La credencial PG apunta al alias `lexi-estados-pg` dentro de esa red nueva. El PostgreSQL usa el volumen nuevo `lexi_habitual_candidata_rag_etapa1`, copiado desde el volumen habitual montado solo lectura. No se modificaron servicios, archivos o volúmenes de los entornos aislados anteriores.

Verificado: n8n health 200, webhook POST registrado, conectividad TCP desde n8n a su PG y corpus copiado de 161 fragmentos con huella `dd45e92700b2fa8b56bb037433cbf2a6`. No se ejecutaron llamadas Gemini: la red impide egress. Los dos servicios nuevos se detuvieron al finalizar y los volúmenes se conservaron. Las ramas y validadores se probaron con entradas sintéticas; la ejecución completa con Gemini y el recorrido habitual todavía están pendientes. El antecedente de integración real de la copia completa no sustituye esa prueba habitual después de una publicación autorizada.

## Cambios exactos para una futura versión habitual autorizada

Conservar el ID, ruta `orientacion-legal`, publicación y credenciales del workflow habitual. Tras una nueva autorización, incorporar únicamente:

1. `Clasificar consulta` (Basic LLM Chain 1.7), conectado al modelo Gemini. Clasifica alcance LCT frente a otras materias y agresión frente a relato jurídico. No usa la herramienta RAG.
2. `Validar clasificación`: acepta únicamente los tres estados previstos con confianza finita entre 0.9 y 1. Incertidumbre/JSON inválido generan error técnico, nunca autorización de abogados.
3. `Consulta admitida`: RESPONDIDA sigue al agente; los otros dos estados siguen a `Respuesta fija`.
4. `Respuesta fija`: textos exactos, sin punto final en ambos mensajes, y `mostrarAbogados:false`. Conectar directamente a `Respond to Webhook`; Gemini no los redacta ni sobrescribe.
5. `AI Agent`: tomar la consulta desde el webhook, exigir búsqueda y salida JSON de orientación/respaldo; devolver pasos de herramientas. Reformular una búsqueda insuficiente sin salir del corpus LCT ni inventar normas. Máximo cuatro iteraciones.
6. `Validar orientación`: aceptar JSON completo plano o cercado; distinguir error de herramienta y ausencia de evidencia. Solo habilitar abogados con respaldo explícito y documentos recuperados. Sin evidencia no clasificar la materia como fuera de alcance.
7. `Google Gemini Chat Model`: conservar modelo y credencial; temperatura 0 y salida máxima 2048 tokens; conectarlo también al clasificador.
8. `Respond to Webhook`: devolver exclusivamente `orientacion`, `estado`, `mostrarAbogados`.

Cableado: Webhook → Clasificar consulta → Validar clasificación → Consulta admitida. Rama admitida → AI Agent → Validar orientación → Respond to Webhook. Rama rechazada → Respuesta fija → Respond to Webhook. Mantener las conexiones de PGVector y embeddings originales.

No trasladar la ruta/ID de webhook candidata ni banderas de compatibilidad de publicación de las copias aisladas al entorno habitual. Usar el mecanismo normal de publicación de la versión instalada y verificar el registro del webhook. No se ha autorizado cambiar la configuración de n8n, el RAG, sus tablas o las credenciales.

## Estado transitorio del código

El gateway y los relays Java ahora exigen el contrato nuevo. El workflow habitual respaldado solo devuelve `orientacion`: por eso el gateway/relay actualizado devolvería un error recuperable hasta que se publique coordinadamente la versión nueva. El cliente conserva legibilidad del texto antiguo cuando recibe ese contrato directamente, pero no ofrece abogados por omisión. **No desplegar el código por separado ni declarar operativo el recorrido habitual en esta etapa.**
