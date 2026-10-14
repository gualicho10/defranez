---
name: Hero 3D de vidrio
description: Bitacora de la sesion 2026-10-14 en que la hero de index.html paso al logo 3D de vidrio (three.js) con nombre apilado en mobile
type: project
---
Hero 3D de vidrio — sesion 2026-10-14. Esta en produccion en `index.html` (`<section class="hero3d" id="main">`), codigo en `img/hero3d/hero3d.{js,css}` + `logo-vector.svg`.

**Que es:** canvas three.js. El nombre gigante se dibuja en una textura de fondo; el logo es una extrusion de vidrio que lo refracta. Scroll: la hero queda fija (sticky), la camara se acerca y atraviesa un hueco del logo; despues About sube como bloque opaco y tapa el nombre (cortina).

**Decisiones:**
- Se sacaron los CTAs ("View my work", "Download CV") y el subtitulo "22 years…". Clarity mostraba que nadie los usaba (se usa la top bar; el CV no se descarga). Queda solo el rol + "Trusted by OpenLoot · Roche · Globant · Disney · DreamWorks".
- Mobile (aspecto < 0.9): nombre `EZE / DEFRAN` en dos lineas, ancho ~90% de la pantalla, apoyado sobre el logo (DEFRAN tapado ~21% de la altura del logo). Logo escala ~0.78, centrado. Desktop: `EZEQUIEL / DE FRANCISCO`.
- Cortina: `#main.hero3d + section { margin-top: -150vh }` con hero de 320vh (220 de zoom + 100 de solape). Mas negativo = About entra antes.

**Bugs que costaron y por que (no repetir):**
- `body { margin-top: 100px }` empujaba la hero 100px abajo (rol cortado, nombre descentrado) → `#main.hero3d { margin-top: -100px }`.
- En mobile `section { overflow: hidden; padding: 80px 24px }` rompia `position: sticky` y la hero se iba como imagen → `overflow: visible; padding: 0` en `#main.hero3d` (gana por ID).
- Mobile con barras de Safari: `innerHeight` cambia al scrollear y el hero mide `100lvh`. Todo se mide contra `.hero3d-stick` (no `innerWidth/innerHeight`) y el rol sube por `100lvh - 100svh`. Antes el nombre salia a 31px porque el tamaño dependia del alto libre; ahora depende solo del ancho.
- Textura del fondo (canvas 2D) cambia de tamaño en cada resize: sin `bdTex.dispose()` WebGL2 actualizaba solo un rectangulo viejo (corte vertical + basura en pantalla).
- Al insertar el import map, `replace('</body>')` cayo en un comentario del HTML; usar el ultimo `</body>`.
- El celular cacheaba `hero3d.js`: se versiona con `?v=N` en el `<script>`/`<link>` (hoy `?v=1`); subirlo al cambiar el JS/CSS.

**Probado y descartado:** que el contenido de About entre *por detras* del logo (canvas arriba de About, fondo transparente). Con fondo `transparent` el vidrio queda blanco (three solo muestrea el pase opaco para refraccion); con `alphaHash` se ve ruido durante el zoom; y cuando About ya se ve, el logo ya cruzo la camara. Si se retoma: solo un degradado en el borde de About o mas solape.

**Borrado:** `hero3d-test.html` (+ su Disallow en robots.txt), `img/hero3d/1-5.svg` (capas del retrato viejo). `img/hero-bg.jpg` queda porque lo usa `examples/hero-intro.html`.

**Pendiente:** mirar en el celular real la version final; el nombre en pantallas de 360px de ancho (las 5 marcas de "Trusted by" van justas).
