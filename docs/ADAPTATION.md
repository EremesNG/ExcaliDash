# Adaptación y verificación

Base actual: ZimengXiong/ExcaliDash 0.6.7, commit 0f9be2d8649be7650e6bee2844739c584fa76c35. Adaptación inicial realizada sobre 0.6.6.
El inventario de los 526 archivos versionados está en upstream-inventory.json.
Se reutilizan sin cambios 127 de los 135 archivos originales de frontend/src;
se añaden el transporte Sites y el backend de Workers. upstream-backend y
upstream-docs conservan las referencias originales y sus pruebas.

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

Pruebas: 38 pruebas del frontend pasan en cinco archivos (37 regresiones originales y una prueba del nuevo transporte), con el mock del
transporte actualizado y la prueba de sharing original aplicada al componente
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
