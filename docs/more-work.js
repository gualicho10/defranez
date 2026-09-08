    /* ==================================================================
       more-work.html — arrastre, contador y estado de desborde.
       Sin dependencias, mismo estilo que el resto del sitio.
       ================================================================== */
    (function () {
      'use strict';

      var MOBILE = '(max-width: 900px)';
      var isMobile = function () { return window.matchMedia(MOBILE).matches; };

      /* ---- Arrastre horizontal del masonry --------------------------
         El gesto se mapea a scrollLeft en vez de a un transform, asi la
         rueda y el trackpad conservan su inercia nativa y el scrollbar
         sigue siendo el real. En touch no se toca nada: manda el scroll
         nativo, que ademas es el que hace el snap. */
      Array.prototype.forEach.call(
        document.querySelectorAll('[data-drag]'),
        function (track) {
          var down = false, startX = 0, startLeft = 0;

          track.addEventListener('pointerdown', function (e) {
            if (e.pointerType === 'touch' || isMobile()) return;
            down = true;
            startX = e.clientX;
            startLeft = track.scrollLeft;
            track.classList.add('is-dragging');
            try { track.setPointerCapture(e.pointerId); } catch (_) {}
          });

          track.addEventListener('pointermove', function (e) {
            if (!down) return;
            track.scrollLeft = startLeft - (e.clientX - startX);
          });

          function release(e) {
            if (!down) return;
            down = false;
            track.classList.remove('is-dragging');
            try { track.releasePointerCapture(e.pointerId); } catch (_) {}
          }
          track.addEventListener('pointerup', release);
          track.addEventListener('pointercancel', release);

          /* Aca habia un handler que convertia la rueda vertical en
             desplazamiento horizontal. Se saco: secuestraba el scroll de la
             pagina, y con el puntero sobre las imagenes no se podia bajar.
             El arrastre y el gesto horizontal del trackpad alcanzan. */
        }
      );

      /* ---- Desborde: si la tira entra entera, se centra -------------
         En un monitor ancho una tira corta quedaria pegada a la izquierda
         con un hueco al costado. */
      var tracks = document.querySelectorAll('.mw-flow--masonry, .mw-flow--reel');
      function syncOverflow() {
        Array.prototype.forEach.call(tracks, function (t) {
          t.classList.toggle('is-overflowing', t.scrollWidth > t.clientWidth + 2);
        });
      }
      syncOverflow();
      window.addEventListener('resize', syncOverflow);
      window.addEventListener('load', syncOverflow);

      /* ---- Contador del carrusel mobile -----------------------------
         Uno por bloque: una seccion puede tener varios (Illustration
         arranca con dos piezas a sangre y sigue con un mosaico). */
      Array.prototype.forEach.call(
        document.querySelectorAll('.mw-block'),
        function (sec) {
          var flow = sec.querySelector('.mw-flow');
          var counter = sec.querySelector('.mw-counter');
          if (!flow || !counter) return;

          var num = counter.querySelector('b');
          var elTotal = counter.querySelector('.mw-total');
          var bar = counter.querySelector('.mw-bar > span');
          var total = 1;
          var raf = 0;

          /* El total se cuenta en vivo: una seccion puede tener distinta
             cantidad de paradas en desktop y en mobile (Photo + AI suma dos
             piezas que en desktop no van), y los clones de la cinta no
             cuentan porque estan ocultos. */
          function contar() {
            var n = 0;
            Array.prototype.forEach.call(
              flow.querySelectorAll('.mw-tile'),
              function (t) {
                if (getComputedStyle(t).display !== 'none') n++;
              }
            );
            total = n || 1;
            elTotal.textContent = total < 10 ? '0' + total : String(total);
          }

          function update() {
            raf = 0;
            var w = flow.clientWidth || 1;
            var i = Math.round(flow.scrollLeft / w);
            if (i < 0) i = 0;
            if (i > total - 1) i = total - 1;
            num.textContent = i < 9 ? '0' + (i + 1) : String(i + 1);
            bar.style.width = ((i + 1) / total * 100).toFixed(2) + '%';
          }

          flow.addEventListener('scroll', function () {
            if (raf) return;
            raf = requestAnimationFrame(update);
          }, { passive: true });

          /* El contador solo existe en mobile; en desktop estorba. */
          function syncVisibility() {
            counter.hidden = !isMobile();
            if (!counter.hidden) { contar(); update(); }
          }
          syncVisibility();
          window.addEventListener('resize', syncVisibility);
        }
      );
    })();
