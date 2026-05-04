/**
 * HEART QUEST — Sistema de "caza de corazones"
 * ────────────────────────────────────────────────
 * Mecánica: el visitante encuentra corazones escondidos por la web.
 * Cada uno se contabiliza en un contador siempre visible en el header
 * (excepto en la home). Al pulsar el contador, se abre un desplegable
 * con la lista de corazones y un sistema de pistas escalonadas.
 *
 * - Persistencia: localStorage (clave 'jt_hearts').
 * - Detección de clic: listener global en [data-heart-id].
 * - Detección por evento (mensaje enviado): MutationObserver sobre
 *   .success-overlay.active.
 * - El contador se inserta dinámicamente en .header__inner.
 * - Patrón IIFE consistente con scripts.js.
 */

(function () {
    'use strict';

    /* ═══════════════════════════════════════════
       CONFIGURACIÓN
    ═══════════════════════════════════════════ */

    /** URL del corazón — el mismo Twemoji que usa el footer (.heart-beat),
        para mantener consistencia visual en toda la web. */
    var HEART_IMG = 'https://cdn.jsdelivr.net/gh/twitter/twemoji@14.0.2/assets/svg/2764.svg';

    /** Catálogo de corazones. Añadir uno = añadir entrada aquí + data-heart-id="ID" en el HTML. */
    var HEARTS = [
        {
            id: 'mama',
            title: 'Amor de madre',
            hints: [
                'Búscalo en la página de Fotos',
                'Debes hacer clic en algún sitio para que aparezca',
                'Pulsa la palabra «mamá» en el subtítulo de la página Fotos.'
            ]
        },
        {
            id: 'mensaje',
            title: 'Dime "Hola"',
            hints: [
                'Hay una pista en la página de contacto',
                'Tienes que rellenar algo para conseguir este corazón',
                'Rellena el formulario de Contacto y pulsa Enviar.'
            ]
        },
        {
            id: 'footer',
            title: 'El poder de la amistad',
            hints: [
                'Con la ayuda de Javi.exe todo es mejor',
                'Vive al final de cada página, escondido a plena vista.',
                'Pulsa el corazón rojo del footer y disfruta del espectáculo.'
            ]
        },
        {
            id: 'abuela',
            title: 'Mi tesoro más preciado',
            hints: [
                'Está flotando sobre alguien muy especial para mí',
                'Búscalo entre mis fotografías favoritas',
                'En la galería «Mis Favoritas», hay un corazón latiendo sobre la foto de mi abuela. Púlsalo.'
            ]
        }
    ];

    var STORAGE_KEY = 'jt_hearts';
    var STORAGE_VERSION = 1;

    /* ═══════════════════════════════════════════
       ESTADO + PERSISTENCIA
    ═══════════════════════════════════════════ */

    var state = {
        collected: [],
        hintLevel: {},
        revealedHint: {}
    };

    function loadState() {
        try {
            var raw = localStorage.getItem(STORAGE_KEY);
            if (!raw) { return; }
            var data = JSON.parse(raw);
            if (!data || data.v !== STORAGE_VERSION) { return; }
            if (Array.isArray(data.collected)) { state.collected = data.collected; }
            if (data.hintLevel && typeof data.hintLevel === 'object') { state.hintLevel = data.hintLevel; }
            if (data.revealedHint && typeof data.revealedHint === 'object') { state.revealedHint = data.revealedHint; }
        } catch (e) { /* ignorar */ }
    }

    function saveState() {
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify({
                v: STORAGE_VERSION,
                collected: state.collected,
                hintLevel: state.hintLevel,
                revealedHint: state.revealedHint
            }));
        } catch (e) { /* localStorage lleno o bloqueado */ }
    }

    function isCollected(id) {
        return state.collected.indexOf(id) !== -1;
    }

    /* ═══════════════════════════════════════════
       DOM — CONTADOR (insertado en header)
    ═══════════════════════════════════════════ */

    var counterEl = null;
    var panelEl = null;
    /** Vista actual del panel: 'intro' (frase + botón Ayuda) o 'help' (lista de corazones). */
    var panelView = 'intro';
    /** Estado UI por item (solo memoria, no persiste): qué items están expandidos en la vista help. */
    var itemExpanded = {};

    function buildCounter() {
        var headerInner = document.querySelector('.header__inner');
        if (!headerInner) { return null; }

        var found = state.collected.length;
        var total = HEARTS.length;

        var btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'hq-counter';
        btn.setAttribute('aria-label', found + ' de ' + total + ' corazones recolectados');
        btn.setAttribute('aria-expanded', 'false');
        /* Estructura: "X/Y ❤ recolectados" — número, icono, palabra.
           En mobile se oculta la palabra (queda "X/Y ❤"). */
        btn.innerHTML =
            '<span class="hq-counter__num">' + found + '/' + total + '</span>' +
            '<img class="hq-counter__icon" src="' + HEART_IMG + '" alt="" width="12" height="12">' +
            '<span class="hq-counter__label">recolectados</span>';

        /* Insertar el contador a la derecha del logo (primer hijo del header__inner).
           El CSS le da margin-right: auto para que el resto del header (lang-selector,
           burger) quede a la derecha como antes. */
        var logo = headerInner.querySelector('a');
        if (logo && logo.nextSibling) {
            headerInner.insertBefore(btn, logo.nextSibling);
        } else if (logo) {
            headerInner.appendChild(btn);
        } else {
            headerInner.insertBefore(btn, headerInner.firstChild);
        }

        if (found === total) { btn.classList.add('is-complete'); }

        /* Listeners (hover y click) se añaden en bindCounterTriggers() desde init(). */

        return btn;
    }

    /** Configura el trigger del panel:
        - Desktop con hover: mouseenter abre, mouseleave cierra (con delay).
          Solo se cierra en vista 'intro'; en 'help' requiere clic fuera o ESC.
        - Mobile / sin hover: click toggle.
        - Click siempre disponible como fallback de teclado/accesibilidad. */
    function bindCounterTriggers() {
        if (!counterEl || !panelEl) { return; }

        var supportsHover = window.matchMedia &&
            window.matchMedia('(hover: hover) and (pointer: fine)').matches;
        var hoverCloseTimer = null;

        function cancelHoverClose() {
            if (hoverCloseTimer) { clearTimeout(hoverCloseTimer); hoverCloseTimer = null; }
        }
        function scheduleHoverClose() {
            /* En vista 'help' no auto-cerramos (el usuario está leyendo pistas) */
            if (panelView !== 'intro') { return; }
            cancelHoverClose();
            hoverCloseTimer = setTimeout(closePanel, 250);
        }

        if (supportsHover) {
            /* Desktop con hover: el contador NO es clicable, solo hover.
               Hover abre el panel; sacar el cursor lo cierra (en vista intro). */
            counterEl.addEventListener('mouseenter', function () {
                cancelHoverClose();
                if (!panelEl.classList.contains('is-open')) { openPanel(); }
            });
            counterEl.addEventListener('mouseleave', scheduleHoverClose);
            panelEl.addEventListener('mouseenter', cancelHoverClose);
            panelEl.addEventListener('mouseleave', scheduleHoverClose);
        } else {
            /* Mobile / sin hover: tap toggle (única forma de abrir sin hover) */
            counterEl.addEventListener('click', function (e) {
                e.stopPropagation();
                togglePanel();
            });
        }
    }

    function refreshCounter(animate) {
        if (!counterEl) { return; }
        var found = state.collected.length;
        var total = HEARTS.length;
        var num = counterEl.querySelector('.hq-counter__num');
        if (num) { num.textContent = found + '/' + total; }
        counterEl.setAttribute('aria-label', found + ' de ' + total + ' corazones recolectados');

        if (found === total) {
            counterEl.classList.add('is-complete');
        } else {
            counterEl.classList.remove('is-complete');
        }

        if (animate) {
            counterEl.classList.remove('is-pulsing');
            void counterEl.offsetWidth;
            counterEl.classList.add('is-pulsing');
            setTimeout(function () {
                if (counterEl) { counterEl.classList.remove('is-pulsing'); }
            }, 500);
        }
    }

    /* ═══════════════════════════════════════════
       DOM — PANEL DESPLEGABLE
    ═══════════════════════════════════════════ */

    function buildPanel() {
        var panel = document.createElement('div');
        panel.className = 'hq-panel';
        panel.setAttribute('role', 'dialog');
        panel.setAttribute('aria-label', 'Lista de corazones');
        document.body.appendChild(panel);

        /* CRÍTICO: detener la propagación de clicks dentro del panel.
           Sin esto, al hacer clic en el botón de pista, el handler hace
           re-render del panel (innerHTML), el target del evento queda
           desconectado del DOM, y cuando burbujea hasta document, el
           closest('.hq-panel') devuelve null → el panel se cerraba. */
        panel.addEventListener('click', function (e) {
            e.stopPropagation();
        });

        document.addEventListener('click', function (e) {
            if (!panel.classList.contains('is-open')) { return; }
            if (e.target.closest('.hq-panel') || e.target.closest('.hq-counter')) { return; }
            closePanel();
        });

        document.addEventListener('keydown', function (e) {
            if (e.key === 'Escape' && panel.classList.contains('is-open')) {
                closePanel();
            }
        });

        return panel;
    }

    function renderPanel() {
        if (!panelEl) { return; }

        /* Toggle clase .is-help para que CSS muestre el × solo en vista help */
        if (panelView === 'help') { panelEl.classList.add('is-help'); }
        else                       { panelEl.classList.remove('is-help'); }

        /* Botón cerrar — presente siempre en el HTML; CSS lo oculta en intro */
        var html = '<button type="button" class="hq-panel__close" aria-label="Cerrar">×</button>';

        if (panelView === 'intro') {
            /* Vista 1: frase de intro con corazón animado + botón "Pedir ayuda" */
            var heartImg =
                '<img class="hq-heart-inline" src="' + HEART_IMG + '" alt="corazones" aria-label="corazones">';
            html += '<p class="hq-panel__intro">' +
                      'Explora la web y encuentra todos los ' + heartImg + ' ' +
                      'para desbloquear un premio misterioso.' +
                    '</p>';
            html += '<button type="button" class="hq-link hq-panel__help-btn" data-hq-action="help">' +
                      'Pedir ayuda' +
                    '</button>';
        } else {
            /* Vista 2: lista numerada con cabecera + items expandibles +/- */
            html += '<p class="hq-panel__help-header">' +
                      'Estos son los corazones que tienes que encontrar:' +
                    '</p>';
            html += '<ol class="hq-panel__list">';

            for (var i = 0; i < HEARTS.length; i++) {
                var h = HEARTS[i];
                var isFound = isCollected(h.id);
                var lvl = state.hintLevel[h.id] || 0;
                var maxLvl = h.hints.length;
                var expanded = !!itemExpanded[h.id];

                html += '<li class="hq-item' + (isFound ? ' is-found' : '') +
                        (expanded ? ' is-expanded' : '') + '" data-hq-item="' + h.id + '">';
                html +=   '<div class="hq-item__head">';

                /* Marcador izquierdo: número (no encontrado) o tick (encontrado) */
                if (isFound) {
                    html += '<span class="hq-item__marker hq-item__marker--check" aria-label="Encontrado">✓</span>';
                } else {
                    html += '<span class="hq-item__marker">' + (i + 1) + '.</span>';
                }

                html +=     '<span class="hq-item__title">' + escapeHtml(h.title) + '</span>';

                /* Botón +/- solo si no está encontrado */
                if (!isFound) {
                    var toggleSym, toggleAria;
                    if (expanded && lvl >= maxLvl) {
                        toggleSym = '−'; toggleAria = 'Ocultar pistas';
                    } else {
                        toggleSym = '+'; toggleAria = (lvl === 0 ? 'Mostrar pista' : 'Mostrar más');
                    }
                    html += '<button type="button" class="hq-item__toggle" data-hq-toggle="' + h.id + '"' +
                            ' aria-label="' + toggleAria + '" aria-expanded="' + (expanded ? 'true' : 'false') + '">' +
                              toggleSym +
                            '</button>';
                }

                html +=   '</div>';

                /* Cuerpo expandible: pistas reveladas (no encontrados) o descripción (encontrados) */
                if (isFound) {
                    /* Descripción = la última pista (la más directa) */
                    html += '<p class="hq-item__desc">' +
                              escapeHtml(h.hints[h.hints.length - 1]) +
                            '</p>';
                } else if (expanded && lvl > 0) {
                    html += '<ol class="hq-item__hints">';
                    for (var k = 0; k < lvl; k++) {
                        html += '<li>' + escapeHtml(h.hints[k]) + '</li>';
                    }
                    html += '</ol>';
                }

                html += '</li>';
            }

            html += '</ol>';
        }

        panelEl.innerHTML = html;

        var closeBtn = panelEl.querySelector('.hq-panel__close');
        if (closeBtn) { closeBtn.addEventListener('click', closePanel); }

        /* Botones +/- de cada item */
        var toggleBtns = panelEl.querySelectorAll('[data-hq-toggle]');
        for (var j = 0; j < toggleBtns.length; j++) {
            (function (btn) {
                btn.addEventListener('click', function () {
                    toggleItem(btn.getAttribute('data-hq-toggle'));
                });
            })(toggleBtns[j]);
        }

        /* Botón "Pedir ayuda" — cambia a la vista 'help' */
        var helpBtn = panelEl.querySelector('[data-hq-action="help"]');
        if (helpBtn) {
            helpBtn.addEventListener('click', function () {
                panelView = 'help';
                renderPanel();
                positionPanel();
            });
        }
    }

    function positionPanel() {
        if (!panelEl || !counterEl) { return; }
        var rect = counterEl.getBoundingClientRect();
        panelEl.style.top = (rect.bottom + 8) + 'px';
        /* Alineado por la izquierda (el contador ahora está a la izquierda) */
        panelEl.style.left = Math.max(12, rect.left) + 'px';
        panelEl.style.right = 'auto';
    }

    function togglePanel() {
        if (!panelEl) { return; }
        if (panelEl.classList.contains('is-open')) { closePanel(); }
        else { openPanel(); }
    }

    function openPanel() {
        renderPanel();
        positionPanel();
        panelEl.classList.add('is-open');
        if (counterEl) { counterEl.setAttribute('aria-expanded', 'true'); }
    }

    function closePanel() {
        if (!panelEl) { return; }
        panelEl.classList.remove('is-open');
        if (counterEl) { counterEl.setAttribute('aria-expanded', 'false'); }
        /* Al cerrar, la próxima apertura siempre empieza por la vista intro
           y todos los items colapsados (las pistas pedidas SÍ se recuerdan). */
        panelView = 'intro';
        itemExpanded = {};
    }

    /* ═══════════════════════════════════════════
       SISTEMA DE PISTAS
    ═══════════════════════════════════════════ */

    function requestHint(id) {
        var heart = HEARTS.find(function (h) { return h.id === id; });
        if (!heart || isCollected(id)) { return; }

        var current = state.hintLevel[id] || 0;
        if (current >= heart.hints.length) { return; }
        state.hintLevel[id] = current + 1;
        state.revealedHint[id] = true;
        saveState();
        renderPanel();
    }

    /** Toggle del +/- de cada item de la lista de help.
        Mecánica:
        - "+" colapsado y sin pistas → expande + revela 1ª pista
        - "+" expandido con pistas restantes → revela siguiente
        - "+" colapsado con pistas ya reveladas → solo expande (no revela más)
        - "−" expandido y todas las pistas reveladas → colapsa */
    function toggleItem(id) {
        var heart = HEARTS.find(function (h) { return h.id === id; });
        if (!heart || isCollected(id)) { return; }

        var lvl = state.hintLevel[id] || 0;
        var maxLvl = heart.hints.length;
        var expanded = !!itemExpanded[id];

        if (expanded && lvl >= maxLvl) {
            /* Botón "−" → colapsar */
            itemExpanded[id] = false;
        } else if (!expanded) {
            /* Colapsado → expandir; si no hay pistas reveladas, revelar la 1ª */
            itemExpanded[id] = true;
            if (lvl === 0) {
                state.hintLevel[id] = 1;
                state.revealedHint[id] = true;
                saveState();
            }
        } else {
            /* Expandido con pistas restantes → revelar siguiente */
            state.hintLevel[id] = lvl + 1;
            state.revealedHint[id] = true;
            saveState();
        }

        renderPanel();
    }

    /* ═══════════════════════════════════════════
       RECOLECCIÓN + ANIMACIÓN DE VUELO
    ═══════════════════════════════════════════ */

    function collect(id, originRect) {
        if (isCollected(id)) { return; }
        var heart = HEARTS.find(function (h) { return h.id === id; });
        if (!heart) { return; }

        state.collected.push(id);
        saveState();

        if (!originRect) {
            originRect = {
                left: window.innerWidth / 2 - 12,
                top:  window.innerHeight / 2 - 12,
                width: 24, height: 24,
                right: window.innerWidth / 2 + 12,
                bottom: window.innerHeight / 2 + 12
            };
        }

        flyHeart(originRect, function () {
            refreshCounter(true);
            if (panelEl && panelEl.classList.contains('is-open')) {
                renderPanel();
            }
        });
    }

    function flyHeart(originRect, onComplete) {
        if (!counterEl) { if (onComplete) onComplete(); return; }

        var targetRect = counterEl.getBoundingClientRect();
        var heartImg = document.createElement('img');
        heartImg.src = HEART_IMG;
        heartImg.alt = '';
        heartImg.className = 'hq-flying-heart';
        heartImg.setAttribute('aria-hidden', 'true');
        document.body.appendChild(heartImg);

        var SIZE = 24;
        var startX = originRect.left + originRect.width  / 2 - SIZE / 2;
        var startY = originRect.top  + originRect.height / 2 - SIZE / 2;
        var endX   = targetRect.left + targetRect.width  / 2 - SIZE / 2;
        var endY   = targetRect.top  + targetRect.height / 2 - SIZE / 2;

        var midX = (startX + endX) / 2;
        var midY = Math.min(startY, endY) - 80;

        if (typeof heartImg.animate === 'function') {
            heartImg.animate([
                { transform: 'translate(' + startX + 'px,' + startY + 'px) scale(1.3)', opacity: 1 },
                { transform: 'translate(' + midX   + 'px,' + midY   + 'px) scale(1.8)', opacity: 1, offset: 0.45 },
                { transform: 'translate(' + endX   + 'px,' + endY   + 'px) scale(0.5)', opacity: 0 }
            ], {
                duration: 700,
                easing: 'cubic-bezier(.4, 0, .2, 1)',
                fill: 'forwards'
            }).onfinish = function () {
                if (heartImg.parentNode) { heartImg.parentNode.removeChild(heartImg); }
                if (onComplete) { onComplete(); }
            };
        } else {
            heartImg.style.transform = 'translate(' + endX + 'px,' + endY + 'px)';
            setTimeout(function () {
                if (heartImg.parentNode) { heartImg.parentNode.removeChild(heartImg); }
                if (onComplete) { onComplete(); }
            }, 700);
        }
    }

    /* ═══════════════════════════════════════════
       HOOKS DE DETECCIÓN
    ═══════════════════════════════════════════ */

    function bindClickListener() {
        document.addEventListener('click', function (e) {
            var target = e.target.closest('[data-heart-id]');
            if (!target) { return; }
            var id = target.getAttribute('data-heart-id');
            if (!id) { return; }
            /* Caso especial: el corazón del footer dispara primero la animación
               de lluvia (definida en scripts.js). La recolección + vuelo hacia el
               contador se ejecuta DESPUÉS de la lluvia, vía el evento
               'heartrain:done' (ver bindHeartRainWatcher). Así las dos animaciones
               se reproducen en secuencia y no a la vez. */
            if (id === 'footer') { return; }

            /* Caso especial: el corazón de la abuela ejecuta una secuencia de
               tres fases (vibración crescendo del slide → explosión de corazones
               → vuelo al contador) ANTES de recolectarse oficialmente. Ver
               runGrandmaSequence(). */
            if (id === 'abuela') {
                if (isCollected('abuela')) { return; }
                if (target.classList.contains('is-collecting')) { return; }
                target.classList.add('is-collecting');
                runGrandmaSequence(target);
                return;
            }

            var rect = target.getBoundingClientRect();
            collect(id, rect);

            /* Corazones flotantes sobre fotos (.hq-photo-heart): al recolectarlos
               desaparecen con un fade-out y se eliminan del DOM, para que la foto
               quede limpia. La clase .is-collected dispara la transición CSS. */
            if (target.classList && target.classList.contains('hq-photo-heart')) {
                target.classList.add('is-collected');
                target.setAttribute('aria-hidden', 'true');
                target.style.pointerEvents = 'none';
                setTimeout(function () {
                    if (target.parentNode) { target.parentNode.removeChild(target); }
                }, 450);
            }
        });
    }

    /* ═══════════════════════════════════════════
       SECUENCIA ESPECIAL — CORAZÓN DE LA ABUELA
       ───────────────────────────────────────────
       Tres fases estrictamente secuenciales (total 2000 ms):
       ① 0-700 ms    → vibración crescendo lineal del slide entero
       ② 700-1300 ms → explosión de 18 corazones desde el corazón pequeño
       ③ 1300-2000 ms → vuelo al contador + slide volviendo a tamaño normal
       Variante elegida: «Alt A · Crescendo lineal» (demo v6).
    ═══════════════════════════════════════════ */

    var GRANDMA_T_SHAKE_END = 700;
    var GRANDMA_T_BURST_END = 1300;
    var GRANDMA_T_TOTAL = 2000;
    var GRANDMA_BURST_COUNT = 18;

    function runGrandmaSequence(heartButton) {
        var slide = heartButton.closest('.slide');
        if (!slide) {
            /* Fallback: si por alguna razón no hay slide contenedor, recolectar
               el corazón con el flujo estándar (vuelo directo al contador). */
            var fallbackRect = heartButton.getBoundingClientRect();
            collect('abuela', fallbackRect);
            heartButton.classList.add('is-collected');
            return;
        }

        /* FASE 1 · vibración crescendo */
        slide.classList.add('is-grandma-anim');

        /* FASE 2 · explosión de corazones */
        setTimeout(function () {
            spawnGrandmaBurst(slide, heartButton);
        }, GRANDMA_T_SHAKE_END);

        /* FASE 3 · vuelo al contador (recolección oficial) */
        setTimeout(function () {
            var rect = heartButton.getBoundingClientRect();
            collect('abuela', rect);
            heartButton.classList.add('is-collected');
            heartButton.setAttribute('aria-hidden', 'true');
            heartButton.style.pointerEvents = 'none';
            setTimeout(function () {
                if (heartButton.parentNode) { heartButton.parentNode.removeChild(heartButton); }
            }, 700);
        }, GRANDMA_T_BURST_END);

        /* Cleanup: al final, quitar la clase de animación del slide */
        setTimeout(function () {
            slide.classList.remove('is-grandma-anim');
        }, GRANDMA_T_TOTAL);
    }

    /** Lanza GRANDMA_BURST_COUNT corazones que explotan desde el centro del
        corazón pequeño, vuelan en patrón radial y se desvanecen antes de que
        empiece la fase 3. Como el slide está escalado durante la explosión,
        las coordenadas del corazón se normalizan dividiendo por el factor de
        escala para que los burst hearts queden bien anclados como hijos del
        slide. */
    function spawnGrandmaBurst(slide, heartButton) {
        var burstDuration = (GRANDMA_T_BURST_END - GRANDMA_T_SHAKE_END) - 20;
        var heartRect = heartButton.getBoundingClientRect();
        var slideRect = slide.getBoundingClientRect();
        var scaleX = slideRect.width  / slide.offsetWidth;
        var scaleY = slideRect.height / slide.offsetHeight;
        var ox = (heartRect.left + heartRect.width  / 2 - slideRect.left) / scaleX;
        var oy = (heartRect.top  + heartRect.height / 2 - slideRect.top)  / scaleY;

        for (var i = 0; i < GRANDMA_BURST_COUNT; i++) {
            spawnGrandmaBurstHeart(slide, ox, oy, i, burstDuration);
        }
    }

    function spawnGrandmaBurstHeart(slide, ox, oy, i, duration) {
        var img = document.createElement('img');
        img.src = HEART_IMG;
        img.className = 'hq-burst-heart';
        img.alt = '';
        img.setAttribute('aria-hidden', 'true');
        var size = 16 + Math.random() * 14;
        img.style.width  = size + 'px';
        img.style.height = size + 'px';
        img.style.left = (ox - size / 2) + 'px';
        img.style.top  = (oy - size / 2) + 'px';
        slide.appendChild(img);

        var angle = (i / GRANDMA_BURST_COUNT) * Math.PI * 2 + (Math.random() - 0.5) * 0.5;
        var dist = 90 + Math.random() * 110;
        var endX = Math.cos(angle) * dist;
        var endY = Math.sin(angle) * dist - 25;
        var rot = (Math.random() - 0.5) * 360;

        if (typeof img.animate === 'function') {
            img.animate([
                { transform: 'translate(0,0) scale(0.4) rotate(0)', opacity: 0 },
                { transform: 'translate(0,0) scale(1.1) rotate(' + (rot / 4) + 'deg)', opacity: 1, offset: 0.18 },
                { transform: 'translate(' + endX + 'px,' + (endY - 20) + 'px) scale(1) rotate(' + (rot / 2) + 'deg)', opacity: 1, offset: 0.65 },
                { transform: 'translate(' + (endX * 1.15) + 'px,' + (endY + 80) + 'px) scale(0.6) rotate(' + rot + 'deg)', opacity: 0 }
            ], {
                duration: duration,
                easing: 'cubic-bezier(.2,.6,.4,1)',
                fill: 'forwards'
            }).onfinish = function () {
                if (img.parentNode) { img.parentNode.removeChild(img); }
            };
        } else {
            /* Fallback sin Web Animations API: simplemente desaparece al final */
            setTimeout(function () {
                if (img.parentNode) { img.parentNode.removeChild(img); }
            }, duration);
        }
    }

    /** Oculta los corazones flotantes sobre fotos que ya hayan sido recolectados
        en visitas anteriores. Se ejecuta al cargar la página para que un corazón
        que ya está en el contador no vuelva a aparecer sobre la foto. */
    function hideCollectedPhotoHearts() {
        var nodes = document.querySelectorAll('.hq-photo-heart[data-heart-id]');
        for (var i = 0; i < nodes.length; i++) {
            var id = nodes[i].getAttribute('data-heart-id');
            if (id && isCollected(id) && nodes[i].parentNode) {
                nodes[i].parentNode.removeChild(nodes[i]);
            }
        }
    }

    /** Escucha el evento que lanza scripts.js cuando la lluvia de corazones del
        footer ha terminado. En ese momento, y solo entonces, recolectamos el
        corazón "footer" para que el corazón vuele hacia el contador después de
        la lluvia (en vez de simultáneamente). */
    function bindHeartRainWatcher() {
        document.addEventListener('heartrain:done', function (e) {
            if (isCollected('footer')) { return; }
            var rect = (e && e.detail && e.detail.rect) || null;
            collect('footer', rect);
        });
    }

    function bindSuccessOverlayWatcher() {
        var overlay = document.getElementById('successOverlay');
        if (!overlay) { return; }

        /* La recolección se dispara cuando el overlay se CIERRA (deja de estar
           activo), no al abrirse. El corazón sale del icono ♥ que vive dentro
           del label "Mensaje (dime algo bonito ♥)" y vuela hasta el contador.
           Si por algún motivo el icono no existe (futuras refactorizaciones),
           caemos a un origen central de pantalla como fallback. */
        var wasActive = overlay.classList.contains('active');
        var observer = new MutationObserver(function () {
            var nowActive = overlay.classList.contains('active');
            if (wasActive && !nowActive && !isCollected('mensaje')) {
                var origin = document.getElementById('msgHeart');
                var rect;
                if (origin) {
                    rect = origin.getBoundingClientRect();
                } else {
                    rect = {
                        left: window.innerWidth / 2 - 12,
                        top:  window.innerHeight / 2 - 12,
                        width: 24, height: 24,
                        right: window.innerWidth / 2 + 12,
                        bottom: window.innerHeight / 2 + 12
                    };
                }
                /* Pequeño delay para que la transición de fade-out del overlay
                   (~500ms) termine antes de que el corazón salga volando. */
                setTimeout(function () { collect('mensaje', rect); }, 550);
            }
            wasActive = nowActive;
        });
        observer.observe(overlay, { attributes: true, attributeFilter: ['class'] });
    }

    /* ═══════════════════════════════════════════
       UTILIDADES
    ═══════════════════════════════════════════ */

    function escapeHtml(str) {
        if (str == null) { return ''; }
        return String(str)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');
    }

    /* ═══════════════════════════════════════════
       API GLOBAL
    ═══════════════════════════════════════════ */

    window.HeartQuest = {
        /* originRect opcional: si se pasa, el corazón vuela desde ese rect
           hasta el contador en lugar de aparecer en el centro del viewport.
           Lo usa scripts.js (mamá burst) para retrasar la recolección hasta
           que termine el burst y aún así volar desde la palabra «mamá». */
        collect: function (id, originRect) { collect(id, originRect || null); },
        getCollected: function () { return state.collected.slice(); },
        getTotal: function () { return HEARTS.length; },
        reset: function () {
            state.collected = [];
            state.hintLevel = {};
            state.revealedHint = {};
            saveState();
            refreshCounter();
            if (panelEl && panelEl.classList.contains('is-open')) { renderPanel(); }
        }
    };

    /* ═══════════════════════════════════════════
       INIT
    ═══════════════════════════════════════════ */

    function isHomePage() {
        var hasNav    = !!document.querySelector('.header__inner .nav--desktop');
        var hasBurger = !!document.querySelector('.header__inner .burger');
        return !hasNav && !hasBurger;
    }

    function init() {
        /* MODO PRUEBAS — quitar cuando se valide el minijuego */
        if (isHomePage()) {
            try { localStorage.removeItem(STORAGE_KEY); } catch (e) {}
            return;
        }

        loadState();

        counterEl = buildCounter();
        if (!counterEl) { return; }
        panelEl = buildPanel();
        bindCounterTriggers();
        bindClickListener();
        bindSuccessOverlayWatcher();
        bindHeartRainWatcher();
        hideCollectedPhotoHearts();

        window.addEventListener('resize', function () {
            if (panelEl && panelEl.classList.contains('is-open')) { positionPanel(); }
        });
        window.addEventListener('scroll', function () {
            if (panelEl && panelEl.classList.contains('is-open')) { positionPanel(); }
        }, { passive: true });
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

})();
