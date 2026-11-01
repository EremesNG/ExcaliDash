# Actualizaciones de ExcaliDash en Sites

Esta instalación es una adaptación del repositorio original. No ejecuta Docker,
Express, Prisma ni un servidor Socket.IO. Las actualizaciones se aplican al código
de la adaptación y se despliegan como una nueva versión del mismo Site. El Worker
no ejecuta un actualizador automático.

## Procedimiento

1. Confirmar el tag oficial y su commit; comparar con upstream.json.
2. Abrir la fuente actual, preservando el ID, audiencia y bindings DB/BUCKET.
3. Integrar el frontend y las dependencias compatibles; portar explícitamente los
   cambios de backend que correspondan al adaptador D1/R2 y al transporte HTTP.
4. Si cambia el esquema, añadir una migración compatible y probar datos existentes.
   No cambiar ni repetir migraciones ya aplicadas.
5. Ejecutar TypeScript, regresiones del frontend e integración D1/R2; compilar y
   probar la vista previa antes de desplegar.
6. Registrar tag y commit en upstream.json, publicar el artefacto del mismo commit
   y verificar el resultado de Sites. Se conserva la URL y el almacenamiento.

Las versiones anteriores quedan en Git y Sites. Revertir código no revierte los
datos; las migraciones futuras deben ser compatibles hacia atrás. Las pruebas no
importan ni restauran datos sobre cuentas de producción.

## Actualizar el editor Excalidraw

El editor se actualiza por separado de ExcaliDash. El pin actual es
`@excalidraw/excalidraw@0.18.0-4ce8305`, build de excalidraw.com del 27 de octubre de
2026 (rama `release`, commit `4ce8305ca78e4ea05ad78c306292932bfe6b256f`, canal npm
`next`). No se sigue un tag móvil ni se actualiza automáticamente.

1. Consultar `https://excalidraw.com/version.json` o ejecutar desde la raíz:

   ```sh
   npm run check:editor-upstream
   ```

   El identificador de producción tiene formato `<fecha ISO>-<hash>`. El script
   comprueba primero la consistencia local entre `upstream.json`,
   `frontend/package.json` y `frontend/package-lock.json` (código 1 si difieren).
   Después informa de excalidraw.com y npm `next`; la deriva o un fallo de red son
   informativos y no cambian el código 0. `--offline` omite ambas consultas;
   `--root <dir>` permite comprobar otra copia del repositorio.
2. Confirmar que npm `next` apunta a `0.18.0-<mismo hash>` y que ese hash corresponde
   al HEAD de la rama `release` de excalidraw/excalidraw. Cada push a `release`
   publica ese formato bajo `next`; `master` no se publica. No usar `latest` como
   sustituto de la build de producción. Si las fuentes no coinciden, resolver la
   discrepancia antes de cambiar el pin.
3. Instalar la versión exacta con npm 10.9.2 (sustituir `<version>`):

   ```sh
   npx -y npm@10.9.2 --prefix frontend install --save-exact @excalidraw/excalidraw@<version>
   ```

   Revisar el diff de dependencias y lockfile; no mezclar una actualización de
   React u otro cambio de toolchain sin revisión aparte.
4. Actualizar el bloque `editor` de `upstream.json`: versión, SHA completo en
   `commit`, `releasedAt` tomado de la fecha de la build de producción,
   `productionVersion` completo e `integrity` copiado de la entrada
   `node_modules/@excalidraw/excalidraw` de `frontend/package-lock.json`.
   Conservar paquete, repositorio, rama `release`, canal `next`, URL de producción
   y `updateMode: manual-reviewed`; no alterar la procedencia de ExcaliDash.
5. Leer el CHANGELOG de Excalidraw fijado al commit elegido, revisar los breaking
   changes y migrar las APIs afectadas. Revisar también la compatibilidad de los
   campos nuevos con guardado, reconciliación, miniaturas e historial.
6. Ejecutar los checks equivalentes a CI y los linters desde la raíz, con Node.js
   24.22.1 o posterior y pnpm 11.25.0:

   ```sh
   pnpm install --frozen-lockfile
   npx -y npm@10.9.2 --prefix frontend ci --no-audit --no-fund
   npm run check:public-source
   npm run check:editor-upstream -- --offline
   npm run build
   node node_modules/typescript/bin/tsc --noEmit
   node frontend/node_modules/typescript/bin/tsc -b frontend/tsconfig.json
   npm run test:frontend
   npm run test:adapter
   npx -y npm@10.9.2 --prefix frontend run lint
   npm run lint
   npm run check:editor-upstream
   ```

   Si el build falla con `Excalidraw subset helper not found` o
   `no longer worker-safe`, el empaquetado del worker de subsetting de fuentes
   cambió: revisar su grafo de imports y ajustar `manualChunks` en
   `frontend/vite.config.ts` para que el worker no importe la entrada de la SPA.

   El lint raíz no debe añadir hallazgos frente a `main`. En la vista previa,
   comprobar en un navegador real:

   - Crear una nota adhesiva, usar Bucket Fill y selección con lazo.
   - Guardar y recargar; la nota y sus cambios deben persistir.
   - Ver miniaturas del dashboard y previsualizar/restaurar historial.
   - Exportar `.excalidraw`, PNG y SVG; subir y volver a abrir una imagen.
   - Verificar que las fuentes del editor se cargan desde el mismo origen y que
     la comparación no hace peticiones del navegador a terceros.
   - Revisar la consola al guardar y exportar: no debe aparecer
     `Failed to use workers for subsetting` ni `document is not defined`.
   - Abrir Settings → Advanced: versión del editor, estado de excalidraw.com y
     autenticación gestionada sin botón Disable.
   - Abrir una segunda sesión de la misma cuenta y recibir allí una edición de
     la nota adhesiva.
7. Antes de publicar, exportar un respaldo `.excalidash` y conservarlo fuera del
   repositorio. Volver a un editor anterior **no garantiza conservar los datos**
   cuando los dibujos contienen tipos de elemento nuevos: revertir código no convierte ni
   restaura esos datos. Publicar solo después de revisar los checks y la vista
   previa, siguiendo [DEPLOYMENT.md](DEPLOYMENT.md).
8. Mantener los bumps del editor separados de las actualizaciones de ExcaliDash:
   un cambio revisado por cada bump, con pin exacto y procedencia actualizada.

## 0.6.7 — 30 de octubre de 2026

Tag: v0.6.7. Commit: 0f9be2d8649be7650e6bee2844739c584fa76c35.
Base previa: 0.6.6, d83433a69a1270b8fa29fa8eec5ef8f8b2b7b1ba.

La comparación oficial contiene cinco archivos cambiados, sin cambios funcionales
ni de esquema. Se incorpora el lockfile del frontend (zod 4.6.7), la mejora del
Dockerfile retenido como referencia, el lockfile del backend original y las notas
oficiales. Las actualizaciones de body-parser, multer, nodemailer y otros paquetes
Node quedan en la referencia upstream: Sites no ejecuta ese backend. La actualización
de curl/libcurl pertenece a la imagen Docker, no al Worker. El zod 3 del starter de
Sites es independiente y no se fuerza a zod 4.

La interfaz y /api/system/update muestran 0.6.7. Se corrige el identificador fijo
incorrecto 1.9.0-sites del adaptador anterior; ahora procede de upstream.json.
No hay migraciones D1, cambios de claves R2 ni escrituras sobre datos de producción
como parte de esta actualización. Se mantiene la configuración actual de acceso,
incluidos los visitantes ya autorizados por el propietario.

Verificación completada: TypeScript del servidor y frontend; 38 pruebas del frontend;
17 grupos de integración en Miniflare con D1/R2; compilación de producción. La vista
previa abrió la colección y el dibujo guardados por la versión anterior y mostró
0.6.7 en Ajustes. La identidad QA y la base local de prueba son independientes de
las cuentas y recursos de producción.
