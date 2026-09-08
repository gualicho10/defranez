# `more-work.html` — "A little bit of this, a little bit of that"

Página nueva con el trabajo que no entra en los ocho proyectos principales.
Cinco secciones, entrada desde los cinco tiles del landing. Cerrado el
2026-09-08.

## Decisiones

| Decisión | Resultado |
|---|---|
| ¿React? | **No.** Sitio estático de un archivo, sin build. Se porta el comportamiento, no el framework. |
| Layout vs. prompts | Composición del Figma, con el movimiento de los prompts encima. |
| Modales | **Ninguno.** Zoom al hover y nada más. |
| Texto sobre imágenes | **Ninguno**, en ninguna sección. |
| Nombre de archivo | `more-work.html` (no `Career-portfolio.html`: chocaba con `career.html`). |
| Barra superior | No va. Solo el botón volver. |
| Mobile | Vista propia, no una versión apretada. |

## Estructura

| # | Sección | Ancla | Desktop | Mobile |
|---|---|---|---|---|
| 1 | Cards & Flyers | `#cards-flyers` | 14 columnas masonry, arrastre | las mismas, de a una |
| 2 | Branding | `#branding` | cinta infinita, 2 filas opuestas | 2 composiciones propias |
| 3 | Illustration & Art Direction | `#illustration` | 4 paradas, arrastre | 4 versiones verticales |
| 4 | Photo Editing + AI | `#photo-ai` | 7 paradas | 7, secuencia propia |
| 5 | Press & Packaging | `#press-packaging` | 3 paradas | 4 composiciones |

## Modos de bloque

Cada sección es una lista de bloques y cada bloque tiene su modo, porque el
Figma mezcla composiciones dentro de una misma sección.

- **masonry** — columnas de 157px en una tira que se arrastra. Las columnas del
  Figma (~1058px) hacían una tira más angosta que una pantalla ancha y no había
  nada que arrastrar: `repack` las rearma a ~600px de alto, con orden mezclado
  de semilla fija para que el diff no cambie solo entre builds.
- **marquee** — cinta infinita, una fila por grupo, sentidos alternados. La
  pista se repite hasta pasar `PERIODO_MIN` y recién ahí se duplica: con filas
  cortas, media pista no cubría la pantalla y se veía el fondo detrás.
- **reel** — cada parada entra completa en pantalla; la imagen se achica al alto
  útil (`--mw-reel-h`) y se arrastra de a una.

## Mobile

Por debajo de **900px** cada bloque es un carrusel de una imagen por vez con
`scroll-snap` nativo. Un solo DOM: `display: contents` disuelve los envoltorios
y los tiles pasan a ser diapositivas.

- **Altura fija** (`--mw-slide-h`) para todas: con alto libre, pasar de una
  pieza cuadrada a una vertical movía la página entera en cada swipe.
  Excepción vía `mobile_full`, para piezas tan verticales que a alto fijo
  quedaban angostas y con aire a los costados.
- **Contador arriba** (`03 / 39`) con barra. El total lo cuenta el JS sobre las
  piezas visibles, no viene fijo en el HTML: una sección puede tener distinta
  cantidad de paradas en cada vista.
- `.mw-meta` ("N piezas") se oculta: es el conteo de desktop.

### Tres formas de art direction

El export marca la intención por nombre de archivo:

| Convención | Qué hace | Dónde |
|---|---|---|
| `<nombre>@m` | versión mobile de esa pieza; sale como `<picture>` | Illustration |
| `<grupo>-00-group@m` | reemplaza al grupo entero en mobile | el mosaico de zombies |
| `m1-NN-*` | set de paradas propio de la sección | Branding, Photo+AI, Press |

El tercero existe porque en Photo + AI el set mobile no es una recomposición:
son otras piezas (suma dos posters que en desktop no están y saca dos que sí).

## Imágenes

**La vista mobile manda la resolución.** Un tile de 157px en desktop necesita
400px; esa misma imagen a pantalla completa en un teléfono necesita ~1200px.

Cada `<img>` lleva `srcset` con dos o tres anchos y `sizes` con el corte en
900px. Reglas duras:

- `width`/`height` reales en **todas**, y también en cada `<source>`: la versión
  mobile tiene otra relación de aspecto y sin eso el browser reserva la caja con
  la proporción equivocada y la página salta (CLS).
- `loading="lazy"` y `decoding="async"` en todas.
- WebP q80. Origen en `_export-figma/` (ignorado por git), salida en
  `img/more-work/<sección>/`.

Estado: **origen 139MB → 11MB publicados (93%)**. Un desktop baja **1.45MB**;
un mobile baja solo su set y solo lo que swipea.

## Trampas encontradas

1. **JPEG en CMYK** — `cwebp` los rechaza con `Unsupported color conversion` y
   la imagen se cae en silencio. El pipeline los pasa a sRGB y reintenta.
2. **Figma corta en 20 imágenes por nodo** en `download_assets`.
3. **Exportar a 2x rasteriza al tamaño de la capa, no del archivo.** Los flyers
   salieron a 314px (157 × 2) y en mobile se estiraban 3×. Re-exportados a 4x
   quedaron en ~1400px.
4. **Los nombres del export cambian entre corridas** y no siguen al mismo
   contenido: `Event Poster.png` fue el flyer naranja en un export y el violeta
   en el siguiente. Emparejar por nombre habría intercambiado piezas en
   silencio. Como la sección se repackea al azar, se reconstruye el set entero.
5. **WebP huérfanos** — un renombre en el origen dejaba la versión vieja
   publicada para siempre. Pasó una vez: 12MB muertos. El optimizador ahora
   borra lo que no está en el manifest.
6. **`<picture>` genera caja** — el `height:100%` del `<img>` se medía contra
   una caja inline de alto automático, no resolvía, y tres piezas de
   Illustration perdían la altura del reel. `picture { display: contents }`.
7. **La rueda vertical secuestrada** — un handler convertía scroll vertical en
   horizontal y con el puntero sobre las imágenes no se podía bajar la página.
   Eliminado; el arrastre y el trackpad alcanzan.

## Herramientas

| Archivo | Qué hace |
|---|---|
| `docs/sort-export.py` | ordena el export plano de Figma en `_export-figma/<sección>/` |
| `docs/optimize-more-work.py` | WebP, variantes del `srcset`, repara CMYK, borra huérfanos, emite `manifest.json` |
| `docs/build-more-work.py` | genera `more-work.html` desde el manifest + `LAYOUT` |
| `docs/make-covers.py` | recorta los covers del landing desde el export |
| `docs/more-work.css` / `.js` | el motor; se embeben en el HTML generado |

El HTML se genera y se commitea el resultado: el repo sigue sirviendo un archivo
estático plano, como el resto del sitio. Se genera —y no se escribe a mano—
porque con ~90 imágenes algún `width`/`height` sale mal, y son justo los que
Google mira.

## Cambios en `index.html`

- El subhead perdió el "(coming soon… =)".
- Los cinco tiles son `<a href="more-work.html#…">` en vez de `openModal(…)`.
- Renombres del Figma: Soft Branding → **Branding**, Misc → **Photo Editing +
  AI**, Illustration → **Illustration & Art Direction**.
- Covers nuevos, recortados a la relación de la tarjeta.
- Se borraron los cinco `modal-lr-*` placeholder y el CSS de `.lr-sabana`.
- `ProjectSwipe` ya no busca un segundo grupo en `.less-gallery`.
- `.lr-title` envuelve (los nombres nuevos no entran en una línea) y suma 4px
  abajo de 700px, donde la tarjeta baja a media pantalla.
- `sitemap.xml` suma la página.

## Cerrado a propósito

No son pendientes: se miraron y se decidió dejarlos así.

- **3 flyers quedan en baja resolución** y `flyer-cele-clases2` no llegó nunca.
  Se descarta: no vale otro export por eso.
- **Dolce Party no aparece en el mobile de Branding.** Las dos composiciones no
  lo incluyen y así queda.
- **El cover de Illustration es más claro que los otros cuatro.** Los autos van
  sobre blanco y el panel negro al 81% lo deja en gris claro. Aceptado.
