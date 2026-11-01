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
