# Adaptación y verificación

Base actual: ZimengXiong/ExcaliDash 0.6.7, commit 0f9be2d8649be7650e6bee2844739c584fa76c35. Adaptación inicial realizada sobre 0.6.6.
El inventario inicial de los 526 archivos está en upstream-inventory.json.
En la adaptación inicial se reutilizaron sin cambios 127 de los 135 archivos
originales de frontend/src; se añadieron el transporte Sites y el backend de Workers.
upstream-backend y upstream-docs conservan las referencias originales y sus pruebas.

| Área original | Adaptación | Comprobación |
|---|---|---|
| React/Vite/Excalidraw | SPA original, assets locales, routing original | Dashboard/editor en navegador, compilación y TypeScript |
| Express | Adaptador REST en Worker con los contratos usados por el frontend | 16 grupos de integración D1/R2 |
| Prisma/SQLite | Metadatos D1, migraciones Drizzle | Colecciones, ownership, CAS simultáneo, biblioteca y preferencias |
| S3/SQLite blobs | R2, descarga autorizada por dibujo | Bytes, duplicación con imágenes y aislamiento |
| Auth local/OIDC | Identidad ChatGPT Sites, audiencia privada | Identidad ausente devuelve 401 en modo producción; usuario ajeno 404 |
| Colecciones | CRUD, papelera y dibujos sin organizar | Interfaz e integración |
| Historial | Escenas inmutables R2, referencias D1 | Lectura, vista previa y restauración reversible |
| Socket.IO | Polling HTTP autenticado y reconciliación original | Dos sesiones de navegador; 17 pruebas de reconciliación |
| Exportar .excalidraw/SVG/PNG | Código Excalidraw original | Regresiones de editor; exportación .excalidraw en navegador |
| Respaldo .excalidash | ZIP compatible con manifiesto v1, imágenes embebidas | Exportar, verificar y reimportar en usuario distinto |
| Importación individual/legacy JSON/ZIP | Utilidades originales del frontend | Contrato POST drawings e importación de respaldo |
| Compartir público/permisos externos | Deshabilitado explícitamente en la edición privada | Mensaje explicativo; no se crean enlaces que aparenten dar acceso |
| Contraseñas, SMTP, admin/API keys, autoupdate | Sustituidos por la gestión de Sites o no expuestos | No se inventan credenciales ni se desactiva auth |
| SQLite directo, mantenimiento de blobs/GC, backups programados | No trasladados | Documentados como límites; conservar exportación compatible |

Verificación inicial: 38 pruebas del frontend en cinco archivos (37 regresiones
originales y una prueba del nuevo transporte), con el mock del transporte actualizado
y la prueba de sharing original aplicada al componente
retenido. tests/adapter.integration.mjs prueba el backend en Miniflare con D1/R2
reales emulados y el fallback de identidad de desarrollo desactivado. El resultado
se guarda en tests/adapter-results.json. No se ejecuta la suite del backend Node
contra Workers: sus dependencias Prisma/Express describen el runtime anterior.

La vista previa comprobó creación de colección, edición y autoguardado, sincronización entre dos sesiones sin recarga, vista previa/restauración de historial y el mensaje de exportación .excalidraw. Los bytes del respaldo ZIP se verificaron automáticamente. Se corrigieron UUID en HTTP, el contexto RSC innecesario para una SPA y la repetición de avisos de restauración al recargar.

La vista previa usa una identidad QA solo en desarrollo. La autenticación real
de ChatGPT y la provisión de recursos de producción corresponden al despliegue
privado de Sites; no se atribuye esa identidad de prueba al usuario real.

La sincronización HTTP tiene latencia aproximada de 1 segundo, recuperación de
escena persistida cada 5 segundos y no equivale a Socket.IO a 60 fps. Solo se prueba
la cuenta personal en varias sesiones; no se afirma colaboración pública multiusuario.
El historial se conserva hasta borrar permanentemente el dibujo. Los respaldos
compatibles con upstream contienen el estado actual, no todo el historial.

## Editor Excalidraw

El editor se fija exactamente a `@excalidraw/excalidraw@0.18.0-4ce8305`, build de
excalidraw.com del 27 de octubre de 2026, commit
`4ce8305ca78e4ea05ad78c306292932bfe6b256f` de la rama `release`, canal npm `next`.
Este pin es independiente del editor 0.18.1 de ExcaliDash 0.6.7. Incluye notas
adhesivas, Bucket Fill y selección con lazo; React permanece en 18.3.1. El conversor
Mermaid pasa a 3.0.0 como dependencia del editor.

Las tres rutas de miniaturas (importación, dashboard y guardado del editor) usan
`exportScene({ type: "svg", data, config })` en lugar de `exportToSvg`. Conservan
los archivos de imagen, tema claro, padding 10, blanco de respaldo y
`embedScene: false`; dashboard y editor mantienen la transparencia para el fondo
predeterminado. La prop `onExcalidrawAPI` sustituye a `excalidrawAPI` y admite
`null` al desmontar, dejando la API y su estado de disponibilidad limpios.

La colaboración, la detección de cambios salientes y la reconciliación del guardado
comparan el contenido JSON completo cuando `version`, `versionNonce` y `updated`
coinciden. La firma ordena las claves de objetos, conserva el orden de arrays y
excluye esos metadatos de revisión. Así detecta cambios en `baseHeight`,
`baseFontSize`, `labelPosition`, `polygon`, `strokeOptions` y bindings con
`mode`/`fixedPoint`, sin mantener una lista cerrada de campos.

El bloque `editor` de `upstream.json` registra paquete, versión, repositorio, rama,
canal, SHA completo, `releasedAt`, `productionVersion`, `productionVersionUrl`,
integridad npm y política `manual-reviewed`. Los campos de ExcaliDash no cambian.
`npm run check:editor-upstream -- --offline` comprueba el pin y la integridad contra
el manifiesto y lockfile del frontend; una discrepancia termina con código 1 y
falla CI. Sin `--offline`, también informa de excalidraw.com y npm `next`: la deriva
o un fallo de red no fallan el check si la consistencia local es correcta.

`GET /api/system/editor` exige identidad Sites (401 sin ella) y devuelve
`{ pinned, upstream, status, checkedAt, sourceUrl }`. `upstream` es `null` si no se
puede comprobar. `status` es `match` si coincide el hash corto, `newer` si el hash
es distinto y la fecha posterior, `different` en los demás casos válidos, o
`unavailable` ante un fallo. La única petición saliente del adaptador consulta
`https://excalidraw.com/version.json` desde el servidor, sin cookies ni datos del
usuario y con timeout de 3 segundos. La caché local de cada isolate dura 15 minutos
para resultados válidos y 60 segundos para fallos; la respuesta HTTP sigue siendo
`no-store`. Las demás respuestas `/api/system/*` no cambian.

Settings → Advanced añade la fila «Excalidraw editor»: el badge usa
`import.meta.env.VITE_EXCALIDRAW_VERSION`, inyectado por `frontend/vite.config.ts`
desde el paquete instalado. El estado se solicita al abrir Advanced por primera
vez, muestra carga, coincidencia, versión posterior, diferente o no disponible,
y enlaza los commits a GitHub; el navegador no consulta terceros para compararlos.
La fila de autenticación gestionada muestra «Authentication — Managed by ChatGPT
Sites» sin botón Disable; el modo local conserva sus controles.

Las regresiones cubren miniaturas, registro y desmontaje de la API, nuevos campos
en sincronización/guardado y estados de Advanced en `frontend/tests/`.
`tests/adapter.integration.mjs` cubre comparación, caché, timeout, fallos y acceso
autenticado. El [procedimiento de actualización](UPDATES.md#actualizar-el-editor-excalidraw)
exige respaldo antes de publicar: volver a un editor anterior no garantiza conservar
los datos cuando los dibujos ya contienen tipos de elemento nuevos.
