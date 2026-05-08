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
        },
        {
            id: 'dialogo-dot',
            title: 'Disfrazado entre puntos',
            hints: [
                'En uno de mis proyectos hay algo que no es lo que parece',
                'Mira con atención los puntos de navegación de una galería de planos',
                'En el carrusel del proyecto «Diálogo Generacional», el segundo punto es en realidad un corazón. Púlsalo.'
            ]
        }
    ];

    var STORAGE_KEY = 'jt_hearts';
    var STORAGE_HELP_OPEN_KEY = 'jt_hearts_help_open';   /* "1" si el panel flotante de ayuda está abierto */
    var STORAGE_VERSION = 1;

    /** Padding-left del bocadillo del hover (.hq-panel) — debe coincidir con
        el CSS. Se usa en positionPanel() para alinear el contenido interior
        del bocadillo con el "X/Y" del contador. */
    var HQ_PANEL_PAD_LEFT = 18;

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
    var panelEl = null;          /* bocadillo del hover (intro + encontrados + botón) */
    var helpPanelEl = null;      /* panel flotante bottom-left (lista de corazones por encontrar) */
    var toastEl = null;
    var toastTimer = null;
    /** Estado UI por item (solo memoria, no persiste): qué items están expandidos en el panel de ayuda. */
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

        /* Toast "+1! ... encontrado" — hijo absoluto del contador, queda a la
           derecha. Visible solo durante la recolección (2 s). */
        toastEl = document.createElement('span');
        toastEl.className = 'hq-toast';
        toastEl.setAttribute('aria-hidden', 'true');
        btn.appendChild(toastEl);

        /* Listeners (hover y click) se añaden en bindCounterTriggers() desde init(). */

        return btn;
    }

    /** Muestra el toast con el mensaje  +1.  "<title>"  durante 3s + fade-out.
        - "+1." en negrita
        - El título y sus comillas en cursiva
        - Espacio garantizado con &nbsp; para que no lo colapse el navegador

        Durante la secuencia modal del corazón abuela, hay un CLON del
        contador sobre el overlay y el toast solo debe mostrarse ahí —
        no en el contador real (cuyo toast saldría a la derecha en lugar
        de debajo). Por eso si hay clon activo elegimos solo el toast del
        clon; en el resto de casos, el toast del contador real. */
    function showToast(title) {
        if (!toastEl || !title) { return; }
        var html =
            '<strong>+1.</strong>&nbsp;' +
            '<em>&ldquo;' + escapeHtml(title) + '&rdquo;</em>';

        var target = cloneToastEl || toastEl;
        target.innerHTML = html;
        target.classList.remove('is-visible');
        void target.offsetWidth;
        target.classList.add('is-visible');

        if (toastTimer) { clearTimeout(toastTimer); }
        toastTimer = setTimeout(function () {
            if (target) { target.classList.remove('is-visible'); }
            toastTimer = null;
        }, 3000);
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
            cancelHoverClose();
            hoverCloseTimer = setTimeout(closePanel, 250);
        }

        if (supportsHover) {
            /* Desktop con hover: el contador NO es clicable, solo hover.
               Hover abre el bocadillo; sacar el cursor lo cierra. */
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

        /* Sincroniza tanto el contador real como su clon (si está activo
           sobre el modal). El visitante ve el clon; el real se actualiza
           en silencio detrás del overlay para estar listo si se cierra. */
        var targets = [counterEl];
        if (counterClone) { targets.push(counterClone); }

        for (var i = 0; i < targets.length; i++) {
            (function (el) {
                var num = el.querySelector('.hq-counter__num');
                if (num) { num.textContent = found + '/' + total; }
                el.setAttribute('aria-label', found + ' de ' + total + ' corazones recolectados');

                if (found === total) { el.classList.add('is-complete'); }
                else                  { el.classList.remove('is-complete'); }

                if (animate) {
                    el.classList.remove('is-pulsing');
                    void el.offsetWidth;
                    el.classList.add('is-pulsing');
                    setTimeout(function () {
                        if (el) { el.classList.remove('is-pulsing'); }
                    }, 500);
                }
            })(targets[i]);
        }
    }

    /* ═══════════════════════════════════════════
       DOM — BOCADILLO DEL HOVER (panel intro)
       ─────────────────────────────────────────
       Solo se abre por hover sobre el contador. Estructura fija:
         · Frase de intro
         · (Si hay) Sección "Corazones encontrados" con título + descripción
         · Botón "Pedir ayuda" → abre el panel flotante de pistas
    ═══════════════════════════════════════════ */

    function buildPanel() {
        var panel = document.createElement('div');
        panel.className = 'hq-panel';
        panel.setAttribute('role', 'dialog');
        panel.setAttribute('aria-label', 'Resumen del minijuego');
        document.body.appendChild(panel);

        /* Detener la propagación de clicks dentro del bocadillo para que un
           click sobre "Pedir ayuda" no dispare el listener de cierre por
           click-fuera. */
        panel.addEventListener('click', function (e) {
            e.stopPropagation();
        });

        /* Click-fuera cierra el bocadillo (relevante sobre todo en mobile,
           donde el bocadillo se abre con tap-toggle y no por hover). */
        document.addEventListener('click', function (e) {
            if (!panel.classList.contains('is-open')) { return; }
            if (e.target.closest('.hq-panel') || e.target.closest('.hq-counter')) { return; }
            closePanel();
        });

        return panel;
    }

    function renderPanel() {
        if (!panelEl) { return; }

        var heartImg =
            '<img class="hq-heart-inline" src="' + HEART_IMG + '" alt="corazones" aria-label="corazones">';
        var html = '<p class="hq-panel__intro">' +
                     'Explora la web y encuentra todos los ' + heartImg + ' ' +
                     'para desbloquear un premio misterioso.' +
                   '</p>';

        /* Sección "Corazones encontrados" — solo si hay al menos uno.
           Se muestran TODOS los recolectados con su título y descripción
           (la última pista, que explica cómo se consigue). */
        var foundHearts = [];
        for (var i = 0; i < HEARTS.length; i++) {
            if (isCollected(HEARTS[i].id)) { foundHearts.push(HEARTS[i]); }
        }
        if (foundHearts.length > 0) {
            html += '<ul class="hq-found">';
            for (var f = 0; f < foundHearts.length; f++) {
                var fh = foundHearts[f];
                html += '<li class="hq-found__item">';
                html +=   '<span class="hq-found__title">' + escapeHtml(fh.title) + '</span>';
                html +=   '<span class="hq-found__desc">' +
                            escapeHtml(fh.hints[fh.hints.length - 1]) +
                          '</span>';
                html += '</li>';
            }
            html += '</ul>';
        }

        html += '<button type="button" class="hq-link hq-panel__help-btn" data-hq-action="help">' +
                  'Pedir ayuda' +
                '</button>';

        panelEl.innerHTML = html;

        /* Botón "Pedir ayuda" — abre el panel flotante de pistas */
        var helpBtn = panelEl.querySelector('[data-hq-action="help"]');
        if (helpBtn) {
            helpBtn.addEventListener('click', function () {
                openHelpPanel();
                /* Cerramos el bocadillo del hover; el panel flotante toma el relevo */
                closePanel();
            });
        }
    }

    function positionPanel() {
        if (!panelEl || !counterEl) { return; }
        var rect = counterEl.getBoundingClientRect();
        panelEl.style.top = (rect.bottom + 8) + 'px';
        /* Restamos el padding-left del bocadillo para que el contenido interior
           (textos y botón) quede alineado con el "X/Y" del contador. */
        panelEl.style.left = Math.max(12, rect.left - HQ_PANEL_PAD_LEFT) + 'px';
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
    }

    /* ═══════════════════════════════════════════
       DOM — PANEL FLOTANTE "PEDIR AYUDA"
       ─────────────────────────────────────────
       Anclado al margen inferior-izquierdo, persistente entre páginas
       (estado guardado en localStorage). Solo se cierra al pulsar la ×.
       Contiene la lista de corazones POR ENCONTRAR con +/- de pistas.
    ═══════════════════════════════════════════ */

    function buildHelpPanel() {
        var panel = document.createElement('div');
        panel.className = 'hq-help-panel';
        panel.setAttribute('role', 'dialog');
        panel.setAttribute('aria-label', 'Pistas de los corazones por encontrar');
        document.body.appendChild(panel);

        /* Detener la propagación para que clicks dentro del panel no cierren
           el bocadillo del hover si llegase a estar abierto a la vez. */
        panel.addEventListener('click', function (e) {
            e.stopPropagation();
        });

        return panel;
    }

    function renderHelpPanel() {
        if (!helpPanelEl) { return; }

        var html = '<button type="button" class="hq-help-panel__close" aria-label="Cerrar">×</button>';

        /* Filtrar los corazones por encontrar */
        var pending = [];
        for (var i = 0; i < HEARTS.length; i++) {
            if (!isCollected(HEARTS[i].id)) { pending.push(HEARTS[i]); }
        }

        if (pending.length === 0) {
            html += '<p class="hq-help-panel__empty">' +
                      '¡Has encontrado todos los corazones! 🎉' +
                    '</p>';
        } else {
            html += '<p class="hq-help-panel__header">' +
                      'Estos son los corazones que te faltan por encontrar:' +
                    '</p>';
            html += '<ol class="hq-help-panel__list">';

            for (var p = 0; p < pending.length; p++) {
                var h = pending[p];
                var lvl = state.hintLevel[h.id] || 0;
                var maxLvl = h.hints.length;
                var expanded = !!itemExpanded[h.id];

                html += '<li class="hq-item' +
                        (expanded ? ' is-expanded' : '') +
                        '" data-hq-item="' + h.id + '">';
                html +=   '<div class="hq-item__head">';
                html +=     '<span class="hq-item__marker">' + (p + 1) + '.</span>';
                html +=     '<span class="hq-item__title">' + escapeHtml(h.title) + '</span>';

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
                html +=   '</div>';

                if (expanded && lvl > 0) {
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

        helpPanelEl.innerHTML = html;

        var closeBtn = helpPanelEl.querySelector('.hq-help-panel__close');
        if (closeBtn) { closeBtn.addEventListener('click', closeHelpPanel); }

        var toggleBtns = helpPanelEl.querySelectorAll('[data-hq-toggle]');
        for (var t = 0; t < toggleBtns.length; t++) {
            (function (btn) {
                btn.addEventListener('click', function () {
                    toggleItem(btn.getAttribute('data-hq-toggle'));
                });
            })(toggleBtns[t]);
        }
    }

    function openHelpPanel() {
        if (!helpPanelEl) { return; }
        renderHelpPanel();
        helpPanelEl.classList.add('is-open');
        saveHelpPanelOpen(true);
    }

    function closeHelpPanel() {
        if (!helpPanelEl) { return; }
        helpPanelEl.classList.remove('is-open');
        saveHelpPanelOpen(false);
    }

    function loadHelpPanelOpen() {
        try {
            return localStorage.getItem(STORAGE_HELP_OPEN_KEY) === '1';
        } catch (e) { return false; }
    }
    function saveHelpPanelOpen(isOpen) {
        try {
            if (isOpen) { localStorage.setItem(STORAGE_HELP_OPEN_KEY, '1'); }
            else        { localStorage.removeItem(STORAGE_HELP_OPEN_KEY); }
        } catch (e) { /* localStorage lleno o bloqueado */ }
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
        renderHelpPanel();
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

        renderHelpPanel();
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
            showToast(heart.title);
            /* Refrescamos los paneles abiertos para reflejar el nuevo estado:
               · Bocadillo del hover → la lista de "encontrados" crece
               · Panel flotante → ese corazón sale de la lista de pendientes */
            if (panelEl && panelEl.classList.contains('is-open')) {
                renderPanel();
            }
            if (helpPanelEl && helpPanelEl.classList.contains('is-open')) {
                renderHelpPanel();
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

            /* Caso especial: el corazón "dialogo-dot" del carrusel de
               dialogogeneracional.html. Al click se "encierra" en una pompa
               de jabón que asciende, estalla con anillo + chispas, y desde
               ese punto vuela el corazón al contador. Tras el vuelo, el dot
               vuelve a ser un punto de navegación normal. */
            if (id === 'dialogo-dot') {
                if (isCollected('dialogo-dot')) { return; }
                if (target.classList.contains('is-collecting')) { return; }
                target.classList.add('is-collecting');
                runDialogoDotSequence(target);
                return;
            }

            /* Caso especial: el corazón de la abuela ejecuta una secuencia de
               fases ANTES de recolectarse oficialmente. Hay dos contextos:
               · galería (data-heart-context="gallery"): vibración crescendo +
                 explosión + vuelo al contador (3 fases).
               · modal (data-heart-context="modal"): solo explosión + vuelo
                 (la foto ya está zoom; no hay shake). */
            if (id === 'abuela') {
                if (isCollected('abuela')) { return; }
                if (target.classList.contains('is-collecting')) { return; }
                target.classList.add('is-collecting');
                if (target.getAttribute('data-heart-context') === 'modal') {
                    runGrandmaModalSequence(target);
                } else {
                    runGrandmaSequence(target);
                }
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
       SECUENCIA "ABUELA" — CASCADA HACIA ARRIBA
       ───────────────────────────────────────────
       Animación unificada para los dos contextos (galería y modal):
       glow dorado del corazón + 3 oleadas escalonadas de 8 partículas
       Twemoji que suben en parábola y al ápice liberan un mini-burst.

       Diferencias por contexto:
       · Galería: el slide entero hace zoom suave (1,10×) sin vibración
         y se sobrepone al grid. Las partículas son hijos del slide.
       · Modal: la foto queda quieta; las partículas se generan en <body>
         con position: fixed para quedar sobre el overlay del modal.
    ═══════════════════════════════════════════ */

    var GRANDMA_CASCADE_WAVES = 3;
    var GRANDMA_CASCADE_PER_WAVE = 8;
    var GRANDMA_CASCADE_WAVE_GAP = 220;            /* ms entre oleadas */
    var GRANDMA_CASCADE_PARTICLE_DUR = 1100;       /* dur. base por partícula */
    var GRANDMA_CASCADE_TOTAL =                    /* fin de la última oleada */
        GRANDMA_CASCADE_WAVE_GAP * GRANDMA_CASCADE_WAVES + GRANDMA_CASCADE_PARTICLE_DUR;
    var GRANDMA_ZOOM_TOTAL = 2200;                 /* duración del CSS hq-grandma-zoom */

    /* URLs Twemoji para los fuegos artificiales — mezcla de 4 emojis */
    var GRANDMA_FW_EMOJI = {
        sparkles: 'https://cdn.jsdelivr.net/gh/twitter/twemoji@14.0.2/assets/svg/2728.svg',  /* ✨ */
        star:     'https://cdn.jsdelivr.net/gh/twitter/twemoji@14.0.2/assets/svg/2b50.svg',  /* ⭐ */
        glowStar: 'https://cdn.jsdelivr.net/gh/twitter/twemoji@14.0.2/assets/svg/1f31f.svg', /* 🌟 */
        dizzy:    'https://cdn.jsdelivr.net/gh/twitter/twemoji@14.0.2/assets/svg/1f4ab.svg'  /* 💫 */
    };

    function runGrandmaSequence(heartButton) {
        var slide = heartButton.closest('.slide');
        if (!slide) {
            /* Fallback: vuelo directo al contador */
            var fallbackRect = heartButton.getBoundingClientRect();
            collect('abuela', fallbackRect);
            heartButton.classList.add('is-collected');
            dismissAllGrandmaHearts(heartButton);
            return;
        }

        /* Zoom suave del slide (sin vibración) y glow dorado del corazón */
        slide.classList.add('is-grandma-anim');
        heartButton.classList.add('is-bursting');

        /* Origen = centro del corazón en coords NO-ESCALADAS del slide.
           El slide se está escalando (1,10×), por eso compensamos. */
        var hRect = heartButton.getBoundingClientRect();
        var sRect = slide.getBoundingClientRect();
        var scaleX = sRect.width  / slide.offsetWidth;
        var scaleY = sRect.height / slide.offsetHeight;
        var ox = (hRect.left + hRect.width  / 2 - sRect.left) / scaleX;
        var oy = (hRect.top  + hRect.height / 2 - sRect.top)  / scaleY;

        /* Lanzar 3 oleadas escalonadas dentro del slide */
        for (var w = 0; w < GRANDMA_CASCADE_WAVES; w++) {
            (function (idx) {
                setTimeout(function () {
                    spawnGrandmaCascadeWave(slide, ox, oy, false);
                }, idx * GRANDMA_CASCADE_WAVE_GAP);
            })(w);
        }

        /* Vuelo al contador tras la última oleada (recolección oficial) */
        setTimeout(function () {
            var rect = heartButton.getBoundingClientRect();
            collect('abuela', rect);
            heartButton.classList.add('is-collected');
            heartButton.classList.remove('is-bursting');
            heartButton.setAttribute('aria-hidden', 'true');
            heartButton.style.pointerEvents = 'none';
            dismissAllGrandmaHearts(heartButton);
            setTimeout(function () {
                if (heartButton.parentNode) { heartButton.parentNode.removeChild(heartButton); }
            }, 700);
        }, GRANDMA_CASCADE_TOTAL);

        /* Cleanup del zoom del slide al final */
        setTimeout(function () {
            slide.classList.remove('is-grandma-anim');
        }, GRANDMA_ZOOM_TOTAL);
    }

    /** Lanza una oleada de GRANDMA_CASCADE_PER_WAVE partículas Twemoji desde
        el origen (ox, oy) hacia arriba con dispersión amplia. Cada partícula
        sube en parábola hasta su ápice y allí libera un mini-burst de 3
        sparkles pequeñas. Si isFixed=true, las partículas usan position
        fixed (variantes --fixed) para el caso del modal. */
    function spawnGrandmaCascadeWave(stage, ox, oy, isFixed) {
        var emojis = [
            GRANDMA_FW_EMOJI.dizzy,
            GRANDMA_FW_EMOJI.star,
            GRANDMA_FW_EMOJI.glowStar,
            GRANDMA_FW_EMOJI.sparkles
        ];
        for (var i = 0; i < GRANDMA_CASCADE_PER_WAVE; i++) {
            /* Ángulo en abanico hacia arriba (-160° a -20° aprox). Speed
               variado para que cada partícula llegue a una altura distinta. */
            var angle = -Math.PI / 2 + (Math.random() - 0.5) * Math.PI * 1.4;
            var speed = 80 + Math.random() * 110;
            var apexX = Math.cos(angle) * speed;
            var apexY = Math.sin(angle) * speed * 1.1;          /* favorece altura */
            var url = emojis[Math.floor(Math.random() * emojis.length)];
            var size = 12 + Math.random() * 12;
            var dur = 800 + Math.random() * 500;

            spawnGrandmaParticleWithBurst(stage, ox, oy, {
                url: url, size: size,
                apexX: apexX, apexY: apexY,
                fallX: apexX * 0.5, fallY: apexY + 30,    /* casi se queda en el ápice */
                dur: dur,
                trailCount: 2, trailGap: 50,
                initialScale: 0.3, peakScale: 1.2, endScale: 0.2,
                fixed: isFixed
            });
        }
    }

    /** Spawn una partícula con sus trails y un mini-burst al ápice. */
    function spawnGrandmaParticleWithBurst(stage, ox, oy, opts) {
        spawnGrandmaParticle(stage, ox, oy, opts);

        /* Mini-burst justo cuando la partícula llega cerca del ápice */
        setTimeout(function () {
            var bx = ox + opts.apexX;
            var by = oy + opts.apexY;
            for (var k = 0; k < 3; k++) {
                spawnGrandmaMiniBurst(stage, bx, by, k, opts.fixed);
            }
        }, opts.dur * 0.45);
    }

    function spawnGrandmaMiniBurst(stage, bx, by, k, isFixed) {
        var ang = (k / 3) * Math.PI * 2 + Math.random() * 0.4;
        var d = 18 + Math.random() * 14;
        var miniSize = 7 + Math.random() * 5;
        var mini = document.createElement('img');
        mini.src = GRANDMA_FW_EMOJI.sparkles;
        mini.className = isFixed ? 'hq-fw-burst hq-fw-burst--fixed' : 'hq-fw-burst';
        mini.alt = '';
        mini.setAttribute('aria-hidden', 'true');
        /* setProperty con 'important' para vencer al !important de
           `.is-gallery .slide img { width: 100% !important; ... }` que de
           otro modo expande la partícula al tamaño entero del slide. */
        mini.style.setProperty('width',  miniSize + 'px', 'important');
        mini.style.setProperty('height', miniSize + 'px', 'important');
        mini.style.left = (bx - miniSize / 2) + 'px';
        mini.style.top  = (by - miniSize / 2) + 'px';
        stage.appendChild(mini);

        if (typeof mini.animate === 'function') {
            mini.animate([
                { transform: 'translate(0,0) scale(0.3)', opacity: 0 },
                { transform: 'translate(0,0) scale(1)', opacity: 1, offset: 0.15 },
                { transform: 'translate(' + Math.cos(ang) * d + 'px,' + Math.sin(ang) * d + 'px) scale(0.5)',
                  opacity: 0 }
            ], {
                duration: 380 + Math.random() * 180,
                easing: 'cubic-bezier(.3,.6,.4,1)',
                fill: 'forwards'
            }).onfinish = function () {
                if (mini.parentNode) { mini.parentNode.removeChild(mini); }
            };
        } else {
            setTimeout(function () {
                if (mini.parentNode) { mini.parentNode.removeChild(mini); }
            }, 600);
        }
    }

    /** Spawn una partícula principal + sus N trails (estela). */
    function spawnGrandmaParticle(stage, ox, oy, opts) {
        spawnGrandmaParticleOne(stage, ox, oy, opts, false, 1);
        for (var t = 1; t <= (opts.trailCount || 0); t++) {
            (function (idx) {
                setTimeout(function () {
                    spawnGrandmaParticleOne(stage, ox, oy, opts, true, 0.5 - (idx - 1) * 0.15);
                }, idx * (opts.trailGap || 70));
            })(t);
        }
    }

    function spawnGrandmaParticleOne(stage, ox, oy, p, isTrail, opacity) {
        var img = document.createElement('img');
        img.src = p.url;
        var baseClass = isTrail ? 'hq-fw-trail' : 'hq-fw-particle';
        img.className = p.fixed ? (baseClass + ' ' + baseClass + '--fixed') : baseClass;
        img.alt = '';
        img.setAttribute('aria-hidden', 'true');
        /* setProperty con 'important' para vencer al !important de
           `.is-gallery .slide img { width: 100% !important; ... }` que de
           otro modo expande la partícula al tamaño entero del slide. */
        img.style.setProperty('width',  p.size + 'px', 'important');
        img.style.setProperty('height', p.size + 'px', 'important');
        img.style.left = (ox - p.size / 2) + 'px';
        img.style.top  = (oy - p.size / 2) + 'px';
        stage.appendChild(img);

        if (typeof img.animate === 'function') {
            img.animate([
                { transform: 'translate(0,0) scale(' + p.initialScale + ')', opacity: 0 },
                { transform: 'translate(0,0) scale(' + p.peakScale + ')', opacity: opacity, offset: 0.06 },
                { transform: 'translate(' + p.apexX + 'px,' + p.apexY + 'px) scale(1)',
                  opacity: opacity * 0.85, offset: 0.5 },
                { transform: 'translate(' + p.fallX + 'px,' + p.fallY + 'px) scale(' + p.endScale + ')',
                  opacity: 0 }
            ], {
                duration: p.dur,
                easing: 'cubic-bezier(.25,.7,.35,1)',
                fill: 'forwards'
            }).onfinish = function () {
                if (img.parentNode) { img.parentNode.removeChild(img); }
            };
        } else {
            setTimeout(function () {
                if (img.parentNode) { img.parentNode.removeChild(img); }
            }, p.dur);
        }
    }

    /* GRANDMA_SRC_TOKEN identifica la foto de la abuela por su src */
    var GRANDMA_SRC_TOKEN = 'IMG_4502';

    function runGrandmaModalSequence(heartButton) {
        /* Foto QUIETA — solo el corazón se anima dentro del modal. */

        /* Sube el clon del contador sobre el overlay del modal */
        liftCounterAboveModal();

        /* Glow dorado del corazón */
        heartButton.classList.add('is-bursting');

        /* Origen = centro del corazón en coords de viewport (position fixed) */
        var hRect = heartButton.getBoundingClientRect();
        var ox = hRect.left + hRect.width  / 2;
        var oy = hRect.top  + hRect.height / 2;

        /* Lanzar 3 oleadas escalonadas en <body> con position fixed */
        for (var w = 0; w < GRANDMA_CASCADE_WAVES; w++) {
            (function (idx) {
                setTimeout(function () {
                    spawnGrandmaCascadeWave(document.body, ox, oy, true);
                }, idx * GRANDMA_CASCADE_WAVE_GAP);
            })(w);
        }

        /* Vuelo al contador tras la última oleada */
        setTimeout(function () {
            var rect = heartButton.getBoundingClientRect();
            collect('abuela', rect);
            heartButton.classList.add('is-collected');
            heartButton.classList.remove('is-bursting');
            heartButton.setAttribute('aria-hidden', 'true');
            heartButton.style.pointerEvents = 'none';
            dismissAllGrandmaHearts(heartButton);
            setTimeout(function () {
                if (heartButton.parentNode) { heartButton.parentNode.removeChild(heartButton); }
            }, 700);
        }, GRANDMA_CASCADE_TOTAL);

        /* Sincronizar fade-out del CLON con el toast (1,5 s). Inicio del
           fade-out del toast: cascada (1760) + vuelo (700) + entrada del
           toast (250) + visible (3000) ≈ 5710 ms. */
        var fadeStart = GRANDMA_CASCADE_TOTAL + 700 + 250 + 3000;
        setTimeout(function () {
            if (counterClone) { counterClone.classList.add('hq-counter--fading'); }
        }, fadeStart);

        /* Eliminar el clon tras el fade-out del toast (1500 ms) + margen */
        setTimeout(lowerCounterFromAboveModal, fadeStart + 1500 + 100);
    }

    /** Crea un CLON del contador (mismo aspecto, dimensiones y posición
        visual), lo posiciona con position: fixed sobre el modal-overlay
        (z-index 10001) y deja el contador REAL intacto en el header.

        Así, durante toda la secuencia modal:
        · El clon es lo que el visitante ve por encima del modal — recibe
          el corazón volador, hace pulse +1, muestra el toast y al final
          hace fade-out.
        · El contador real nunca se mueve ni se anima. Si el visitante
          cierra el modal en cualquier momento, ve siempre el contador
          normal en el header (sin parpadeo, sin "huecos" de fade-out).

        refreshCounter() y showToast() detectan si hay clon activo y
        sincronizan los cambios en ambos elementos. */
    var counterClone = null;
    var cloneToastEl = null;

    function liftCounterAboveModal() {
        if (!counterEl || counterClone) { return; }
        var rect = counterEl.getBoundingClientRect();

        var clone = counterEl.cloneNode(true);   /* incluye el toast hijo */
        clone.classList.add('hq-counter--clone', 'hq-counter--modal-anim');
        clone.style.position = 'fixed';
        clone.style.left   = rect.left + 'px';
        clone.style.top    = rect.top  + 'px';
        clone.style.margin = '0';
        clone.style.zIndex = '10001';
        document.body.appendChild(clone);

        counterClone = clone;
        cloneToastEl = clone.querySelector('.hq-toast');
    }

    function lowerCounterFromAboveModal() {
        if (!counterClone) { return; }
        if (counterClone.parentNode) {
            counterClone.parentNode.removeChild(counterClone);
        }
        counterClone = null;
        cloneToastEl = null;
    }

    /* ═══════════════════════════════════════════
       SECUENCIA "BURBUJA" — corazón dialogo-dot
       ───────────────────────────────────────────
       Al click, el corazón pequeño (dot transformado) se desvanece y se
       crea una pompa de jabón en su misma posición. La pompa asciende
       ~250 px con oscilación lateral, en su pico estalla (anillo + 6
       chispas radiales) y desde el punto del estallido vuela el corazón
       al contador. Tras el vuelo, el dot se restaura como punto normal.
    ═══════════════════════════════════════════ */

    var BUBBLE_FLOAT_DURATION = 1500;
    var BUBBLE_POP_DURATION = 380;
    var BUBBLE_SPARK_COUNT = 6;
    var BUBBLE_RESTORE_DELAY = 800;   /* tiempo extra tras collect para restaurar el dot */

    function runDialogoDotSequence(heartButton) {
        var rect = heartButton.getBoundingClientRect();
        var startX = rect.left + rect.width  / 2 - 28;   /* 28 = bubble/2 (56/2) */
        var startY = rect.top  + rect.height / 2 - 28;

        /* Crear la pompa con un corazón dentro, en la posición del dot */
        var bubble = document.createElement('div');
        bubble.className = 'hq-bubble';
        bubble.setAttribute('aria-hidden', 'true');
        bubble.style.left = startX + 'px';
        bubble.style.top  = startY + 'px';
        bubble.innerHTML = '<img src="' + HEART_IMG + '" alt="">';
        bubble.style.animation = 'hq-bubble-float ' + BUBBLE_FLOAT_DURATION +
                                 'ms cubic-bezier(.34,.07,.45,.99) forwards';
        document.body.appendChild(bubble);

        /* El dot original se desvanece — el corazón ya está "encerrado" */
        heartButton.classList.add('is-collected');

        /* Al final del trayecto: estallido + chispas + collect (vuelo) */
        setTimeout(function () {
            var bRect = bubble.getBoundingClientRect();
            var cx = bRect.left + bRect.width  / 2;
            var cy = bRect.top  + bRect.height / 2;

            /* Anillo blanco que se expande */
            var pop = document.createElement('div');
            pop.className = 'hq-bubble-pop';
            pop.setAttribute('aria-hidden', 'true');
            pop.style.left = (cx - 28) + 'px';
            pop.style.top  = (cy - 28) + 'px';
            document.body.appendChild(pop);
            setTimeout(function () {
                if (pop.parentNode) { pop.parentNode.removeChild(pop); }
            }, BUBBLE_POP_DURATION);

            /* Mini-corazones radiales (chispas) */
            for (var i = 0; i < BUBBLE_SPARK_COUNT; i++) {
                spawnBubbleSpark(cx, cy, i, BUBBLE_SPARK_COUNT);
            }

            /* Quitar la pompa */
            if (bubble.parentNode) { bubble.parentNode.removeChild(bubble); }

            /* Vuelo del corazón al contador desde el punto del estallido */
            var originRect = {
                left: cx - 11, top: cy - 11,
                width: 22, height: 22,
                right: cx + 11, bottom: cy + 11
            };
            setTimeout(function () { collect('dialogo-dot', originRect); }, 80);

            /* Restaurar el dot a punto normal una vez ha terminado el vuelo */
            setTimeout(function () { restoreDialogoDot(heartButton); },
                       80 + 700 + BUBBLE_RESTORE_DELAY);
        }, BUBBLE_FLOAT_DURATION);
    }

    function spawnBubbleSpark(cx, cy, i, total) {
        var img = document.createElement('img');
        img.src = HEART_IMG;
        img.className = 'hq-bubble-spark';
        img.alt = '';
        img.setAttribute('aria-hidden', 'true');
        var size = 10 + Math.random() * 6;
        img.style.width = size + 'px';
        img.style.height = size + 'px';
        img.style.left = (cx - size / 2) + 'px';
        img.style.top  = (cy - size / 2) + 'px';
        document.body.appendChild(img);

        var angle = (i / total) * Math.PI * 2 + (Math.random() - 0.5) * 0.5;
        var dist = 50 + Math.random() * 35;
        var endX = Math.cos(angle) * dist;
        var endY = Math.sin(angle) * dist - 10;
        var rot = (Math.random() - 0.5) * 360;

        if (typeof img.animate === 'function') {
            img.animate([
                { transform: 'translate(0,0) scale(0.4)', opacity: 1 },
                { transform: 'translate(' + endX + 'px,' + endY + 'px) scale(1) rotate(' + rot + 'deg)', opacity: 0 }
            ], {
                duration: 600 + Math.random() * 200,
                easing: 'cubic-bezier(.2,.6,.4,1)',
                fill: 'forwards'
            }).onfinish = function () {
                if (img.parentNode) { img.parentNode.removeChild(img); }
            };
        } else {
            setTimeout(function () {
                if (img.parentNode) { img.parentNode.removeChild(img); }
            }, 800);
        }
    }

    /** Devuelve el segundo dot del carrusel (que era el corazón) a su
        estado normal: quita la imagen Twemoji y todas las clases/atributos
        añadidos por el script inline de dialogogeneracional.html. El dot
        recupera su rol original como punto de navegación. */
    function restoreDialogoDot(heartButton) {
        var img = heartButton.querySelector('img');
        if (img && img.parentNode) { img.parentNode.removeChild(img); }
        heartButton.classList.remove('hq-dot-heart', 'is-collected', 'is-collecting');
        heartButton.removeAttribute('data-heart-id');
        heartButton.removeAttribute('aria-label');
    }

    /* ═══════════════════════════════════════════
       SECUENCIA "REVENTAR" — corazón mensaje
       ───────────────────────────────────────────
       Al cerrarse el overlay de éxito del formulario de contacto, el
       icono ♥ del label crece sin parar (4 pasos crescendo) hasta su
       tamaño máximo y revienta en pedazos rojos. El corazón fantasma
       vuela al contador desde el punto de la rotura.
    ═══════════════════════════════════════════ */

    var MSG_GROW_DURATION = 1300;
    var MSG_FRAGMENT_COUNT = 14;
    var MSG_FLY_DELAY = 80;
    var MSG_RESTORE_DELAY = 80 + 700 + 200;   /* fly delay + fly duration + margen */

    /* Clip-paths irregulares para los pedazos */
    var MSG_FRAGMENT_SHAPES = [
        'polygon(0% 0%, 100% 35%, 60% 100%)',
        'polygon(50% 0%, 100% 80%, 20% 100%, 0% 30%)',
        'polygon(0% 20%, 80% 0%, 100% 70%, 30% 100%)',
        'polygon(20% 0%, 100% 40%, 70% 100%, 0% 80%)',
        'polygon(0% 50%, 50% 0%, 100% 50%, 50% 100%)',   /* diamante */
        'polygon(0% 0%, 100% 0%, 70% 100%)',
        'polygon(40% 0%, 100% 60%, 50% 100%, 0% 40%)'
    ];
    var MSG_FRAGMENT_COLORS = ['#e74c3c', '#c0392b', '#d33', '#cd3527', '#ec5f4a', '#b53224'];

    function runMensajeSequence() {
        var msgHeartEl = document.getElementById('msgHeart');
        if (!msgHeartEl) {
            /* Sin el icono físico, fallback al flujo estándar (vuelo desde
               un origen central de pantalla) */
            collect('mensaje', null);
            return;
        }

        /* Capturar el centro del icono ANTES de aplicar la animación, para
           que los fragmentos y el vuelo final partan del punto exacto del
           corazón en el formulario. */
        var initialRect = msgHeartEl.getBoundingClientRect();
        var cx = initialRect.left + initialRect.width  / 2;
        var cy = initialRect.top  + initialRect.height / 2;

        msgHeartEl.classList.add('hq-msg-growing');

        /* Cuando termina la animación de crecimiento + reventón */
        setTimeout(function () {
            /* Estallido de pedazos en el centro */
            for (var i = 0; i < MSG_FRAGMENT_COUNT; i++) {
                spawnMensajeFragment(cx, cy, i, MSG_FRAGMENT_COUNT);
            }

            /* Vuelo del corazón fantasma al contador desde el centro */
            var originRect = {
                left: cx - 11, top: cy - 11,
                width: 22, height: 22,
                right: cx + 11, bottom: cy + 11
            };
            setTimeout(function () { collect('mensaje', originRect); }, MSG_FLY_DELAY);

            /* Restaurar el icono a su estado normal una vez terminado el
               vuelo (queda visible en el label como decoración). */
            setTimeout(function () {
                msgHeartEl.classList.remove('hq-msg-growing');
            }, MSG_RESTORE_DELAY);
        }, MSG_GROW_DURATION);
    }

    function spawnMensajeFragment(cx, cy, i, total) {
        var div = document.createElement('div');
        div.className = 'hq-msg-fragment';
        div.setAttribute('aria-hidden', 'true');
        var size = 14 + Math.random() * 18;
        div.style.width  = size + 'px';
        div.style.height = size + 'px';
        div.style.left = (cx - size / 2) + 'px';
        div.style.top  = (cy - size / 2) + 'px';
        div.style.clipPath = MSG_FRAGMENT_SHAPES[Math.floor(Math.random() * MSG_FRAGMENT_SHAPES.length)];
        div.style.background = MSG_FRAGMENT_COLORS[Math.floor(Math.random() * MSG_FRAGMENT_COLORS.length)];
        document.body.appendChild(div);

        var angle = (i / total) * Math.PI * 2 + (Math.random() - 0.5) * 0.4;
        var dist = 90 + Math.random() * 80;
        var endX = Math.cos(angle) * dist;
        var endY = Math.sin(angle) * dist - 10;
        var rot = (Math.random() - 0.5) * 720;

        if (typeof div.animate === 'function') {
            div.animate([
                { transform: 'translate(0,0) scale(0.6) rotate(0)', opacity: 1 },
                { transform: 'translate(' + (endX*0.5) + 'px,' + (endY*0.4 - 10) + 'px) scale(1) rotate(' + (rot*0.4) + 'deg)', opacity: 1, offset: 0.4 },
                { transform: 'translate(' + endX + 'px,' + endY + 'px) scale(0.95) rotate(' + (rot*0.7) + 'deg)', opacity: 0.85, offset: 0.65 },
                /* Caída final con gravedad */
                { transform: 'translate(' + (endX*1.05) + 'px,' + (endY + 110) + 'px) scale(0.7) rotate(' + rot + 'deg)', opacity: 0 }
            ], {
                duration: 900 + Math.random() * 300,
                easing: 'cubic-bezier(.3,.5,.5,1)',
                fill: 'forwards'
            }).onfinish = function () {
                if (div.parentNode) { div.parentNode.removeChild(div); }
            };
        } else {
            setTimeout(function () {
                if (div.parentNode) { div.parentNode.removeChild(div); }
            }, 1200);
        }
    }

    /** Elimina del DOM todos los botones corazón con data-heart-id="abuela"
        excepto el indicado en `except` (que se está animando y se eliminará
        por su propio camino tras la animación de vuelo). Esto sincroniza el
        estado entre la galería y el modal cuando uno de los dos se recolecta. */
    function dismissAllGrandmaHearts(except) {
        var nodes = document.querySelectorAll('[data-heart-id="abuela"]');
        for (var i = 0; i < nodes.length; i++) {
            if (nodes[i] === except) { continue; }
            if (nodes[i].parentNode) { nodes[i].parentNode.removeChild(nodes[i]); }
        }
    }

    /* ═══════════════════════════════════════════
       MODAL HEART WATCHER
       ───────────────────────────────────────────
       Observa #modal y #photo. Cuando el modal está abierto y la foto activa
       es la de la abuela y el corazón no está recolectado, inserta un botón
       corazón en body (position fixed) sobre la foto. Lo quita en cualquier
       otro caso. Reposiciona en cada resize.
    ═══════════════════════════════════════════ */

    function bindModalHeartWatcher() {
        var photoEl = document.getElementById('photo');
        var modalEl = document.getElementById('modal');
        if (!photoEl || !modalEl) { return; }

        var srcObserver = new MutationObserver(syncModalHeart);
        srcObserver.observe(photoEl, { attributes: true, attributeFilter: ['src'] });

        var modalObserver = new MutationObserver(syncModalHeart);
        modalObserver.observe(modalEl, { attributes: true, attributeFilter: ['class'] });

        window.addEventListener('resize', function () {
            var btn = document.querySelector('.hq-photo-heart--modal');
            if (btn && photoEl) { positionModalHeart(btn, photoEl); }
        }, { passive: true });
    }

    function syncModalHeart() {
        var photoEl = document.getElementById('photo');
        var modalEl = document.getElementById('modal');
        if (!photoEl || !modalEl) { return; }

        var existing = document.querySelector('.hq-photo-heart--modal');
        var modalOpen = modalEl.classList.contains('open');
        var src = photoEl.getAttribute('src') || '';
        var shouldShow = modalOpen &&
                         src.indexOf(GRANDMA_SRC_TOKEN) !== -1 &&
                         !isCollected('abuela');

        if (!shouldShow) {
            if (existing && existing.parentNode) { existing.parentNode.removeChild(existing); }
            return;
        }
        if (existing) {
            positionModalHeart(existing, photoEl);
            return;
        }

        var btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'hq-photo-heart hq-photo-heart--modal';
        btn.setAttribute('data-heart-id', 'abuela');
        btn.setAttribute('data-heart-context', 'modal');
        btn.setAttribute('aria-label', 'Recolectar corazón de la abuela');
        btn.innerHTML = '<img src="' + HEART_IMG + '" alt="" width="22" height="22">';
        document.body.appendChild(btn);
        positionModalHeart(btn, photoEl);
    }

    /** Sitúa el botón con position: fixed centrado horizontalmente sobre la
        parte inferior de la foto del modal. Calcula a partir del rect real
        del <img id="photo"> (no del contenedor), de modo que aunque el área
        sea más alta que la foto, el corazón queda pegado a la parte baja
        de la imagen visible. */
    function positionModalHeart(btn, photoEl) {
        var r = photoEl.getBoundingClientRect();
        if (!r.width || !r.height) { return; }
        /* 22 px de altura del icono + 14 px de margen visual + 6 px de padding
           del botón → el icono queda a 14 px del borde inferior de la foto. */
        btn.style.left = (r.left + r.width / 2) + 'px';
        btn.style.top  = (r.top + r.height - 22 - 14 - 6) + 'px';
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
           activo), no al abrirse. En lugar de un vuelo directo, ejecutamos la
           secuencia "reventar": el icono ♥ del label crece sin parar, revienta
           en pedazos rojos y desde el punto de la rotura el corazón vuela al
           contador. Ver runMensajeSequence(). */
        var wasActive = overlay.classList.contains('active');
        var observer = new MutationObserver(function () {
            var nowActive = overlay.classList.contains('active');
            if (wasActive && !nowActive && !isCollected('mensaje')) {
                /* Pequeño delay para que la transición de fade-out del overlay
                   (~500ms) termine antes de que arranque el reventón. */
                setTimeout(runMensajeSequence, 550);
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
            itemExpanded = {};
            saveState();
            saveHelpPanelOpen(false);
            refreshCounter();
            if (panelEl && panelEl.classList.contains('is-open')) { renderPanel(); }
            if (helpPanelEl && helpPanelEl.classList.contains('is-open')) { renderHelpPanel(); }
        }
    };

    /* ═══════════════════════════════════════════
       INIT
    ═══════════════════════════════════════════ */

    /** Detecta si estamos en la home: el header de la home no incluye ni
        navegación desktop ni burger, solo logo + lang-selector. */
    function isHomePage() {
        var hasNav    = !!document.querySelector('.header__inner .nav--desktop');
        var hasBurger = !!document.querySelector('.header__inner .burger');
        return !hasNav && !hasBurger;
    }

    function init() {
        /* ⚠️ MODO PRUEBAS — borra el progreso del minijuego en cada carga de
           página para poder probar las animaciones repetidamente sin tener
           que hacer HeartQuest.reset() en consola. Quitar este bloque cuando
           se valide la mecánica completa para que el progreso persista. */
        try { localStorage.removeItem(STORAGE_KEY); } catch (e) {}

        loadState();

        counterEl = buildCounter();
        if (!counterEl) { return; }
        /* En la home etiquetamos el contador para poder ocultarlo en mobile
           desde CSS (no hay espacio en el header reducido de la home). */
        if (isHomePage()) { counterEl.classList.add('hq-counter--home'); }
        panelEl = buildPanel();
        helpPanelEl = buildHelpPanel();
        bindCounterTriggers();
        bindClickListener();
        bindSuccessOverlayWatcher();
        bindHeartRainWatcher();
        bindModalHeartWatcher();
        hideCollectedPhotoHearts();

        /* Si el usuario dejó el panel flotante de ayuda abierto en una página
           anterior, lo reabrimos automáticamente para que le acompañe en
           toda la navegación hasta que lo cierre con la ×. */
        if (loadHelpPanelOpen()) {
            openHelpPanel();
        }

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
