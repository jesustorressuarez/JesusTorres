/**
 * JESUS TORRES - SCRIPTS
 * Optimizado: IIFE, null-checks, sin globals innecesarias, DRY
 */

(function () {
    'use strict';

    /* ═══════════════════════════════════════════
       1. INICIALIZAR LENIS (SCROLL SUAVE)
    ═══════════════════════════════════════════ */

    // Se reutiliza la variable `lenis` que ya existe en el scope global
    // (definida en el <script> inline de cada página).
    // Solo inicializamos el scroll suave para enlaces internos.

    document.addEventListener('DOMContentLoaded', function () {

        // Scroll suave para enlaces internos (requiere Lenis global)
        if (typeof lenis !== 'undefined') {
            document.querySelectorAll('a[href^="#"]').forEach(function (anchor) {
                anchor.addEventListener('click', function (e) {
                    e.preventDefault();
                    var target = this.getAttribute('href');
                    if (target !== '#') { lenis.scrollTo(target); }
                });
            });
        }

        /* ═══════════════════════════════════════════
           2. MENU HAMBURGUESA
        ═══════════════════════════════════════════ */

        var burger = document.getElementById('burger');
        var mobileMenu = document.getElementById('mobileMenu');

        if (burger && mobileMenu) {
            burger.addEventListener('click', function () {
                var isActive = burger.classList.toggle('active');
                mobileMenu.classList.toggle('active');

                if (typeof lenis !== 'undefined') {
                    isActive ? lenis.stop() : lenis.start();
                }
            });

            // Cerrar menu al hacer clic en enlaces (excepto lang con tooltip visible)
            mobileMenu.querySelectorAll('a').forEach(function (link) {
                link.addEventListener('click', function () {
                    burger.classList.remove('active');
                    mobileMenu.classList.remove('active');
                    if (typeof lenis !== 'undefined') { lenis.start(); }
                });
            });

        }

        /* ── Long-press en selector de idioma (mobile) → tooltip ── */
        var allLangLinks = document.querySelectorAll('.lang-selector a[href]');
        var LONG_PRESS_MS = 400;
        var isTouchDevice = 'ontouchstart' in window;

        if (isTouchDevice && allLangLinks.length) {
            allLangLinks.forEach(function (link) {
                var pressTimer = null;
                var didLongPress = false;

                link.addEventListener('touchstart', function () {
                    didLongPress = false;
                    // Ocultar cualquier tooltip abierto
                    allLangLinks.forEach(function (l) {
                        var t = l.querySelector('.lang-tooltip');
                        if (t) t.classList.remove('show');
                    });
                    pressTimer = setTimeout(function () {
                        didLongPress = true;
                        var tooltip = link.querySelector('.lang-tooltip');
                        if (tooltip) tooltip.classList.add('show');
                    }, LONG_PRESS_MS);
                }, { passive: true });

                link.addEventListener('touchmove', function () {
                    clearTimeout(pressTimer);
                }, { passive: true });

                link.addEventListener('touchend', function (e) {
                    clearTimeout(pressTimer);
                    if (didLongPress) {
                        e.preventDefault();
                    }
                });

                link.addEventListener('click', function (e) {
                    if (didLongPress) {
                        e.preventDefault();
                        didLongPress = false;
                    }
                });
            });

            // Cerrar tooltips al tocar fuera
            document.addEventListener('touchstart', function (e) {
                if (!e.target.closest('.lang-selector')) {
                    allLangLinks.forEach(function (l) {
                        var t = l.querySelector('.lang-tooltip');
                        if (t) t.classList.remove('show');
                    });
                }
            }, { passive: true });
        }

        /* ═══════════════════════════════════════════
           3. ANIMACION FOOTER (WORD ROTATOR)
        ═══════════════════════════════════════════ */

        var rotatorContainer = document.querySelector('.word-rotator');

        if (rotatorContainer) {
            /* Typewriter config */
            var ROCKET_IMG = '<img src="https://em-content.zobj.net/source/apple/453/rocket_1f680.png" alt="\uD83D\uDE80" width="24" height="24" style="vertical-align:-3px;display:inline-block;">';
            var typeSpeed   = 50;   /* ms por carácter al escribir */
            var deleteSpeed = 25;   /* ms por carácter al borrar  */
            var pauseFull   = 2000; /* pausa con palabra completa */
            var pauseEmpty  = 500;  /* pausa tras borrar          */
            var pauseMid    = 1000; /* pausa "pensativa" a mitad de palabra */

            /*
             * Secuencia de animación:
             *   1. Arquitecto          → escribe, pausa, borra todo
             *   2. BIM Manager         → escribe, pausa, borra solo "Manager"
             *   3. BIM Coordinator     → escribe desde "BIM ", pausa, borra todo
             *   4. 🚀                  → aparece de golpe, pausa, desaparece
             *   5. Fotógrafo (amateur) → escribe con pausa en "Fotógrafo", pausa, borra todo
             *   → vuelve a 1
             */
            var sequence = [
                { text: 'Arquitecto',          eraseAll: true },
                { text: 'BIM Manager',         eraseCount: 7 },       /* borra "Manager" (7 chars), deja "BIM " */
                { text: 'BIM Coordinator',     startFrom: 4, eraseAll: true }, /* escribe desde posición 4 ("BIM ") */
                { text: '\uD83D\uDE80',        isEmoji: true },
                { text: 'Fotógrafo (amateur)', eraseAll: true, pauseAt: 9 }   /* pausa en "Fotógrafo" */
            ];

            var textEl = document.createElement('span');
            textEl.classList.add('typewriter-text');
            var cursorEl = document.createElement('span');
            cursorEl.classList.add('typewriter-cursor');

            rotatorContainer.appendChild(textEl);
            rotatorContainer.appendChild(cursorEl);

            var seqIdx  = 0;
            var charIdx = 0;
            var phase   = 'typing'; /* typing | pausing | erasing */

            function typewriterStep() {
                var step    = sequence[seqIdx];
                var isEmoji = !!step.isEmoji;

                /* ── Emoji: aparece/desaparece de golpe ── */
                if (isEmoji) {
                    if (phase === 'typing') {
                        textEl.innerHTML = ROCKET_IMG;
                        phase = 'pausing';
                        setTimeout(typewriterStep, pauseFull);
                    } else {
                        textEl.innerHTML = '';
                        phase = 'typing';
                        seqIdx = (seqIdx + 1) % sequence.length;
                        setTimeout(typewriterStep, pauseEmpty);
                    }
                    return;
                }

                var chars      = Array.from(step.text);
                var startFrom  = step.startFrom || 0;

                /* ── ESCRIBIR ── */
                if (phase === 'typing') {
                    if (charIdx < startFrom) charIdx = startFrom; /* saltar prefijo ya visible */
                    charIdx++;
                    textEl.textContent = chars.slice(0, charIdx).join('');

                    if (charIdx === chars.length) {
                        /* Palabra completa → pausa antes de borrar */
                        var endPause = (step.pauseAt !== undefined) ? pauseMid : pauseFull;
                        phase = 'pausing';
                        setTimeout(typewriterStep, endPause);
                    } else if (step.pauseAt !== undefined && charIdx === step.pauseAt) {
                        /* Pausa "pensativa" a mitad de palabra */
                        setTimeout(typewriterStep, pauseMid);
                    } else {
                        setTimeout(typewriterStep, typeSpeed);
                    }
                    return;
                }

                /* ── PAUSA → empezar a borrar ── */
                if (phase === 'pausing') {
                    phase = 'erasing';
                    setTimeout(typewriterStep, 0);
                    return;
                }

                /* ── BORRAR ── */
                if (phase === 'erasing') {
                    charIdx--;
                    textEl.textContent = chars.slice(0, charIdx).join('');

                    /* ¿Hasta dónde borramos? */
                    var eraseStop = step.eraseAll ? 0 : (chars.length - (step.eraseCount || 0));

                    if (charIdx <= eraseStop) {
                        charIdx = eraseStop;
                        phase = 'typing';
                        seqIdx = (seqIdx + 1) % sequence.length;

                        /* Si el siguiente paso es emoji, reiniciar animación del cursor
                           para forzar un parpadeo limpio (on→off) durante la pausa */
                        var nextStep = sequence[seqIdx];
                        if (nextStep.isEmoji) {
                            cursorEl.style.animation = 'none';
                            void cursorEl.offsetHeight; /* forzar reflow */
                            cursorEl.style.animation = '';
                        }

                        /* Borrado parcial → pausa breve (como si "pensara" qué escribir);
                           borrado total   → pausa normal (pauseEmpty) */
                        setTimeout(typewriterStep, eraseStop === 0 ? pauseEmpty : pauseEmpty);
                    } else {
                        setTimeout(typewriterStep, deleteSpeed);
                    }
                }
            }

            typewriterStep();
        }

        /* ═══════════════════════════════════════════
           4. CARROUSEL + ZOOM MODAL
        ═══════════════════════════════════════════ */

        var track = document.getElementById('track');
        var dotsContainer = document.getElementById('dots-container');
        var slides = document.querySelectorAll('.slide img');
        var modal = document.getElementById('zoomModal');
        var imgZoom = document.getElementById('imgZoom');
        var zoomWrapper = document.getElementById('zoomWrapper');

        var currentIdx = 0;
        var isZoomed = false;
        var ZOOM_SCALE = 2.5;
        var baseImgW = 0;
        var baseImgH = 0;

        // --- Minimap ---
        var zoomMinimap = document.getElementById('zoomMinimap');
        var minimapImg = document.getElementById('minimapImg');
        var minimapViewport = document.getElementById('minimapViewport');

        // --- Dots del carousel ---
        if (track && dotsContainer) {
            slides.forEach(function (_, i) {
                var dot = document.createElement('div');
                dot.classList.add('dot');
                if (i === 0) { dot.classList.add('active'); }
                dot.addEventListener('click', function () {
                    track.scrollTo({ left: slides[i].offsetLeft, behavior: 'smooth' });
                });
                dotsContainer.appendChild(dot);
            });

            track.addEventListener('scroll', function () {
                var index = Math.round(track.scrollLeft / track.offsetWidth);
                // Si estamos al final del scroll, activar el último dot
                if (track.scrollLeft + track.offsetWidth >= track.scrollWidth - 2) {
                    index = slides.length - 1;
                }
                index = Math.min(index, slides.length - 1);
                document.querySelectorAll('.dot').forEach(function (d, i) {
                    d.classList.toggle('active', i === index);
                });
            });
        }

        // --- Funciones de Zoom ---

        function resetZoom() {
            isZoomed = false;
            if (imgZoom) {
                imgZoom.style.transform = '';
                imgZoom.classList.remove('active-zoom');
            }
            baseImgW = 0;
            baseImgH = 0;
            hideMinimap();
        }

        function showMinimap(src) {
            if (!zoomMinimap || !minimapImg) { return; }
            minimapImg.src = src;
            zoomMinimap.classList.add('active');
        }

        function hideMinimap() {
            if (!zoomMinimap) { return; }
            zoomMinimap.classList.remove('active');
        }

        function updateMinimapViewport(tx, ty) {
            if (!zoomMinimap || !minimapViewport || !minimapImg || !zoomWrapper || !baseImgW || !baseImgH) { return; }
            var mw = minimapImg.offsetWidth;
            var mh = minimapImg.offsetHeight;
            if (!mw || !mh) { return; }

            var wr = zoomWrapper.getBoundingClientRect();

            // Tamaño del viewport: qué fracción de la imagen escalada es visible
            var vpW = Math.min(mw, mw * wr.width / (baseImgW * ZOOM_SCALE));
            var vpH = Math.min(mh, mh * wr.height / (baseImgH * ZOOM_SCALE));

            // Posición: el translate(tx,ty) desplaza la imagen escalada.
            // En coords de imagen original el desplazamiento es tx/ZOOM_SCALE.
            // Mapeado al minimap: tx * mw / (ZOOM_SCALE * baseImgW).
            var left = mw / 2 - vpW / 2 - tx * mw / (ZOOM_SCALE * baseImgW);
            var top  = mh / 2 - vpH / 2 - ty * mh / (ZOOM_SCALE * baseImgH);

            // Clampar dentro del minimap
            left = Math.max(0, Math.min(mw - vpW, left));
            top  = Math.max(0, Math.min(mh - vpH, top));

            minimapViewport.style.width  = vpW + 'px';
            minimapViewport.style.height = vpH + 'px';
            minimapViewport.style.left   = left + 'px';
            minimapViewport.style.top    = top + 'px';
        }

        function cacheBaseDimensions() {
            if (imgZoom && zoomWrapper) {
                var wr = zoomWrapper.getBoundingClientRect();
                var iW = imgZoom.naturalWidth;
                var iH = imgZoom.naturalHeight;
                if (iW && iH) {
                    // Calcular dimensiones reales renderizadas con object-fit: contain
                    var wrapRatio = wr.width / wr.height;
                    var imgRatio = iW / iH;
                    if (imgRatio > wrapRatio) {
                        baseImgW = wr.width;
                        baseImgH = wr.width / imgRatio;
                    } else {
                        baseImgH = wr.height;
                        baseImgW = wr.height * imgRatio;
                    }
                } else {
                    baseImgW = imgZoom.offsetWidth;
                    baseImgH = imgZoom.offsetHeight;
                }
            }
        }

        function applyPan(e) {
            if (!zoomWrapper || !imgZoom) { return; }
            var wr = zoomWrapper.getBoundingClientRect();
            var scaledW = baseImgW * ZOOM_SCALE;
            var scaledH = baseImgH * ZOOM_SCALE;
            var overflowX = Math.max(0, (scaledW - wr.width) / 2);
            var overflowY = Math.max(0, (scaledH - wr.height) / 2);
            var mx = ((e.clientX - wr.left) / wr.width) * 2 - 1;
            var my = ((e.clientY - wr.top) / wr.height) * 2 - 1;
            var tx = -mx * overflowX;
            var ty = -my * overflowY;
            imgZoom.style.transform = 'translate(' + tx + 'px, ' + ty + 'px) scale(' + ZOOM_SCALE + ')';
            updateMinimapViewport(tx, ty);
        }

        // --- Contador de diapositivas en modal (solo proyectos, no galerías de fotos) ---
        var isGalleryCarousel = track && track.classList.contains('is-gallery');
        var modalCounter = null;
        if (modal && slides.length > 1 && !isGalleryCarousel) {
            modalCounter = document.createElement('span');
            modalCounter.classList.add('modal-slide-counter');
            modal.appendChild(modalCounter);
        }

        function updateModalCounter() {
            if (modalCounter) {
                modalCounter.textContent = (currentIdx + 1) + ' / ' + slides.length;
            }
        }

        // --- Abrir / Cerrar Modal ---

        window.openZoom = function (src) {
            if (!modal || !imgZoom || !slides.length) { return; }
            currentIdx = Array.from(slides).findIndex(function (img) { return img.src === src; });
            imgZoom.src = src;
            modal.style.display = 'flex';
            document.body.classList.add('modal-open');
            document.body.style.touchAction = 'none';
            if (typeof lenis !== 'undefined') { lenis.stop(); }
            // Marcar modo galería para ocultar flechas en mobile
            if (isGalleryCarousel) {
                modal.classList.add('gallery-mode');
            } else {
                modal.classList.remove('gallery-mode');
            }
            resetZoom();
            updateModalNavButtons();
            updateModalCounter();
        };

        window.closeZoom = function () {
            if (!modal) { return; }
            modal.style.display = 'none';
            document.body.classList.remove('modal-open');
            document.body.style.touchAction = '';
            if (typeof lenis !== 'undefined') { lenis.start(); }
            resetZoom();
            if (modalContentWrapper) { modalContentWrapper.classList.remove('zoomed'); }
            if (metaTechnical) { metaTechnical.classList.remove('open'); }
            if (metadataToggle) { metadataToggle.classList.remove('open'); }
            var toggleTexts = document.querySelectorAll('.metadata-toggle-text');
            for (var t = 0; t < toggleTexts.length; t++) { toggleTexts[t].textContent = 'Mostrar metadatos'; }
        };

        // --- Carrusel sin bucle (solo proyectos, no galerías de fotos) ---

        function updateNavButtons() {
            if (!track || isGalleryCarousel) { return; }
            var navBtns = document.querySelectorAll('.carousel-controls .nav-btn');
            if (navBtns.length < 2) { return; }
            var atStart = track.scrollLeft <= 1;
            var atEnd = track.scrollLeft + track.offsetWidth >= track.scrollWidth - 1;
            navBtns[0].disabled = atStart;
            navBtns[1].disabled = atEnd;
            navBtns[0].style.opacity = atStart ? '0.25' : '';
            navBtns[1].style.opacity = atEnd ? '0.25' : '';
            navBtns[0].style.pointerEvents = atStart ? 'none' : '';
            navBtns[1].style.pointerEvents = atEnd ? 'none' : '';
        }

        if (track && !isGalleryCarousel) {
            track.addEventListener('scroll', updateNavButtons);
            // Estado inicial
            setTimeout(updateNavButtons, 100);
        }

        window.moveSlide = function (dir) {
            if (track) {
                track.scrollBy({ left: track.offsetWidth * dir, behavior: 'smooth' });
            }
        };

        window.changeModalImage = function (dir, event) {
            if (event) { event.stopPropagation(); }
            if (!slides.length || !imgZoom) { return; }
            var newIdx = currentIdx + dir;
            // Sin bucle: clampar en los extremos
            if (newIdx < 0 || newIdx >= slides.length) { return; }
            currentIdx = newIdx;
            imgZoom.src = slides[currentIdx].src;
            resetZoom();
            updateModalNavButtons();
            updateModalCounter();
        };

        function updateModalNavButtons() {
            var prevBtn = document.querySelector('.modal-nav.prev-modal');
            var nextBtn = document.querySelector('.modal-nav.next-modal');
            if (prevBtn) {
                prevBtn.style.opacity = currentIdx <= 0 ? '0.25' : '';
                prevBtn.style.pointerEvents = currentIdx <= 0 ? 'none' : '';
            }
            if (nextBtn) {
                nextBtn.style.opacity = currentIdx >= slides.length - 1 ? '0.25' : '';
                nextBtn.style.pointerEvents = currentIdx >= slides.length - 1 ? 'none' : '';
            }
        }

        // --- Event listeners del Modal ---

        if (modal) {
            modal.addEventListener('click', function (e) {
                if (e.target === modal || e.target === zoomWrapper) {
                    window.closeZoom();
                }
            });
        }

        if (imgZoom) {
            imgZoom.addEventListener('click', function (e) {
                e.stopPropagation();
                if (!isZoomed) {
                    cacheBaseDimensions();
                    isZoomed = true;
                    imgZoom.classList.add('active-zoom');
                    showMinimap(imgZoom.src);
                    applyPan(e);
                    if (modalContentWrapper) { modalContentWrapper.classList.add('zoomed'); }
                } else {
                    resetZoom();
                    if (modalContentWrapper) { modalContentWrapper.classList.remove('zoomed'); }
                }
            });
        }

        // Pan con throttle (mousemove)
        if (zoomWrapper) {
            var ticking = false;
            zoomWrapper.addEventListener('mousemove', function (e) {
                if (!isZoomed || ticking) { return; }
                ticking = true;
                requestAnimationFrame(function () {
                    applyPan(e);
                    ticking = false;
                });
            });
        }

        // Flash visual en botón de navegación al usar teclado
        function flashNavBtn(selector) {
            var btn = document.querySelector(selector);
            if (!btn) { return; }
            btn.style.color = '#ffffff';
            setTimeout(function () { btn.style.color = ''; }, 100);
        }

        // Teclado: navegar / cerrar modal / mover carrusel
        document.addEventListener('keydown', function (e) {
            if (modal && modal.style.display === 'flex') {
                if (e.key === 'Escape') { window.closeZoom(); }
                if (e.key === 'ArrowRight') { e.preventDefault(); flashNavBtn('.next-modal'); window.changeModalImage(1); }
                if (e.key === 'ArrowLeft') { e.preventDefault(); flashNavBtn('.prev-modal'); window.changeModalImage(-1); }
            } else if (track && !isGalleryCarousel) {
                // Flechas mueven el carrusel de proyecto sin necesidad de foco
                if (e.key === 'ArrowRight') { e.preventDefault(); window.moveSlide(1); }
                if (e.key === 'ArrowLeft') { e.preventDefault(); window.moveSlide(-1); }
            }
        });

        /* ── TOUCH: swipe + pinch-to-zoom en modal (estilo galería nativa) ── */
        if (modal && imgZoom && zoomWrapper) {
            var tScale = 1;          // escala actual
            var tPanX = 0;           // traslación actual X
            var tPanY = 0;           // traslación actual Y
            var tIsTouchZoomed = false;
            var SWIPE_THRESHOLD = 50;
            var MIN_SCALE = 1;
            var MAX_SCALE = 4;
            var DOUBLE_TAP_SCALE = 2.5;
            var RUBBER_BAND = 0.3;   // factor de elasticidad en bordes

            // Estado del gesto
            var pinchStartDist = 0;
            var pinchBaseScale = 1;  // escala al inicio del pinch
            var pinchCenterX = 0;
            var pinchCenterY = 0;
            var pinchBasePanX = 0;
            var pinchBasePanY = 0;

            var panStartX = 0;
            var panStartY = 0;
            var panBasePanX = 0;
            var panBasePanY = 0;
            var isPanning = false;

            // Inercia
            var velocityX = 0;
            var velocityY = 0;
            var lastMoveTime = 0;
            var lastMoveX = 0;
            var lastMoveY = 0;
            var inertiaRAF = 0;

            function tGetDist(touches) {
                var dx = touches[0].clientX - touches[1].clientX;
                var dy = touches[0].clientY - touches[1].clientY;
                return Math.sqrt(dx * dx + dy * dy);
            }

            function tGetCenter(touches) {
                return {
                    x: (touches[0].clientX + touches[1].clientX) / 2,
                    y: (touches[0].clientY + touches[1].clientY) / 2
                };
            }

            /* Calcula los límites de pan para la escala actual */
            function tGetPanBounds() {
                var wr = zoomWrapper.getBoundingClientRect();
                var imgW = imgZoom.naturalWidth;
                var imgH = imgZoom.naturalHeight;
                // Tamaño del img element (object-fit: contain)
                var wrapRatio = wr.width / wr.height;
                var imgRatio = imgW / imgH;
                var displayW, displayH;
                if (imgRatio > wrapRatio) {
                    displayW = wr.width;
                    displayH = wr.width / imgRatio;
                } else {
                    displayH = wr.height;
                    displayW = wr.height * imgRatio;
                }
                var scaledW = displayW * tScale;
                var scaledH = displayH * tScale;
                var maxPanX = Math.max(0, (scaledW - wr.width) / 2);
                var maxPanY = Math.max(0, (scaledH - wr.height) / 2);
                return { maxX: maxPanX, maxY: maxPanY };
            }

            /* Clampa pan a los límites (con o sin rubber-band) */
            function tClampPan(px, py, rubber) {
                var b = tGetPanBounds();
                if (rubber) {
                    // Efecto elástico: permite pasarse pero con resistencia
                    if (px > b.maxX) px = b.maxX + (px - b.maxX) * RUBBER_BAND;
                    else if (px < -b.maxX) px = -b.maxX + (px + b.maxX) * RUBBER_BAND;
                    if (py > b.maxY) py = b.maxY + (py - b.maxY) * RUBBER_BAND;
                    else if (py < -b.maxY) py = -b.maxY + (py + b.maxY) * RUBBER_BAND;
                } else {
                    px = Math.max(-b.maxX, Math.min(b.maxX, px));
                    py = Math.max(-b.maxY, Math.min(b.maxY, py));
                }
                return { x: px, y: py };
            }

            function tApply(useTransition) {
                if (useTransition) {
                    imgZoom.style.transition = 'transform 0.3s cubic-bezier(.2,.85,.4,1)';
                } else {
                    imgZoom.style.transition = 'none';
                }
                imgZoom.style.transform = 'translate(' + tPanX + 'px,' + tPanY + 'px) scale(' + tScale + ')';
                if (tIsTouchZoomed) {
                    showMinimap(imgZoom.src);
                    updateMinimapViewport(tPanX, tPanY);
                }
            }

            function tResetZoom(animate) {
                cancelAnimationFrame(inertiaRAF);
                tScale = 1;
                tPanX = 0;
                tPanY = 0;
                tIsTouchZoomed = false;
                velocityX = 0;
                velocityY = 0;
                if (animate) {
                    imgZoom.style.transition = 'transform 0.3s cubic-bezier(.2,.85,.4,1)';
                } else {
                    imgZoom.style.transition = 'none';
                }
                imgZoom.style.transform = '';
                imgZoom.classList.remove('active-zoom');
                isZoomed = false;
                hideMinimap();
                if (modalContentWrapper) { modalContentWrapper.classList.remove('zoomed'); }
            }

            /* Snap-back: anima pan a los límites correctos */
            function tSnapBack() {
                var clamped = tClampPan(tPanX, tPanY, false);
                if (Math.abs(clamped.x - tPanX) > 0.5 || Math.abs(clamped.y - tPanY) > 0.5) {
                    tPanX = clamped.x;
                    tPanY = clamped.y;
                    tApply(true);
                }
            }

            /* Inercia tras soltar el dedo */
            function tStartInertia() {
                cancelAnimationFrame(inertiaRAF);
                var friction = 0.92;
                function step() {
                    if (Math.abs(velocityX) < 0.5 && Math.abs(velocityY) < 0.5) {
                        tSnapBack();
                        return;
                    }
                    velocityX *= friction;
                    velocityY *= friction;
                    var newX = tPanX + velocityX;
                    var newY = tPanY + velocityY;
                    // Aplicar rubber-band durante inercia
                    var b = tGetPanBounds();
                    if (newX > b.maxX || newX < -b.maxX) { velocityX *= 0.4; }
                    if (newY > b.maxY || newY < -b.maxY) { velocityY *= 0.4; }
                    var clamped = tClampPan(newX, newY, true);
                    tPanX = clamped.x;
                    tPanY = clamped.y;
                    tApply(false);
                    inertiaRAF = requestAnimationFrame(step);
                }
                inertiaRAF = requestAnimationFrame(step);
            }

            /* Zoom al punto concreto (para pinch y double-tap) */
            function tZoomToPoint(newScale, pointX, pointY, animate) {
                var wr = zoomWrapper.getBoundingClientRect();
                // Punto en coords del wrapper (relativo al centro)
                var cx = pointX - wr.left - wr.width / 2;
                var cy = pointY - wr.top - wr.height / 2;
                // Ajustar pan para mantener el punto fijo
                var ratio = newScale / tScale;
                var newPanX = cx - ratio * (cx - tPanX);
                var newPanY = cy - ratio * (cy - tPanY);
                tScale = newScale;
                var clamped = tClampPan(newPanX, newPanY, false);
                tPanX = clamped.x;
                tPanY = clamped.y;
                tIsTouchZoomed = tScale > 1.01;
                if (tIsTouchZoomed) {
                    imgZoom.classList.add('active-zoom');
                    isZoomed = true;
                    if (modalContentWrapper) { modalContentWrapper.classList.add('zoomed'); }
                }
                tApply(animate);
            }

            /* ── TOUCHSTART ── */
            zoomWrapper.addEventListener('touchstart', function (e) {
                cancelAnimationFrame(inertiaRAF);
                velocityX = 0;
                velocityY = 0;

                if (e.touches.length === 2) {
                    e.preventDefault();
                    isPanning = false;
                    pinchStartDist = tGetDist(e.touches);
                    pinchBaseScale = tScale;
                    var center = tGetCenter(e.touches);
                    pinchCenterX = center.x;
                    pinchCenterY = center.y;
                    pinchBasePanX = tPanX;
                    pinchBasePanY = tPanY;
                } else if (e.touches.length === 1) {
                    panStartX = e.touches[0].clientX;
                    panStartY = e.touches[0].clientY;
                    panBasePanX = tPanX;
                    panBasePanY = tPanY;
                    isPanning = false;
                    lastMoveX = panStartX;
                    lastMoveY = panStartY;
                    lastMoveTime = Date.now();
                }
            }, { passive: false });

            /* ── TOUCHMOVE ── */
            zoomWrapper.addEventListener('touchmove', function (e) {
                if (e.touches.length === 2 && pinchStartDist > 0) {
                    /* — Pinch zoom — */
                    e.preventDefault();
                    var newDist = tGetDist(e.touches);
                    var ratio = newDist / pinchStartDist;
                    var newScale = Math.max(MIN_SCALE * 0.5, Math.min(MAX_SCALE, pinchBaseScale * ratio));

                    // Zoom centrado en el punto medio del pinch
                    var center = tGetCenter(e.touches);
                    var wr = zoomWrapper.getBoundingClientRect();
                    var cx = center.x - wr.left - wr.width / 2;
                    var cy = center.y - wr.top - wr.height / 2;
                    var scaleRatio = newScale / pinchBaseScale;
                    var pCx = pinchCenterX - wr.left - wr.width / 2;
                    var pCy = pinchCenterY - wr.top - wr.height / 2;
                    tPanX = cx - scaleRatio * (pCx - pinchBasePanX);
                    tPanY = cy - scaleRatio * (pCy - pinchBasePanY);
                    tScale = newScale;

                    tIsTouchZoomed = tScale > 1.01;
                    if (tIsTouchZoomed) {
                        imgZoom.classList.add('active-zoom');
                        isZoomed = true;
                        if (modalContentWrapper) { modalContentWrapper.classList.add('zoomed'); }
                    }
                    tApply(false);

                } else if (e.touches.length === 1 && tIsTouchZoomed) {
                    /* — Pan con un dedo (solo con zoom) — */
                    e.preventDefault();
                    isPanning = true;
                    var dx = e.touches[0].clientX - panStartX;
                    var dy = e.touches[0].clientY - panStartY;
                    var newPanX = panBasePanX + dx;
                    var newPanY = panBasePanY + dy;
                    // Rubber-band en los bordes
                    var clamped = tClampPan(newPanX, newPanY, true);
                    tPanX = clamped.x;
                    tPanY = clamped.y;
                    tApply(false);

                    // Tracking de velocidad para inercia
                    var now = Date.now();
                    var dt = now - lastMoveTime;
                    if (dt > 0) {
                        velocityX = (e.touches[0].clientX - lastMoveX) * (16 / dt);
                        velocityY = (e.touches[0].clientY - lastMoveY) * (16 / dt);
                    }
                    lastMoveX = e.touches[0].clientX;
                    lastMoveY = e.touches[0].clientY;
                    lastMoveTime = now;
                }
            }, { passive: false });

            /* ── TOUCHEND ── */
            zoomWrapper.addEventListener('touchend', function (e) {
                if (e.touches.length === 0) {
                    pinchStartDist = 0;

                    // Si se redujo por debajo de 1 → snap back a escala 1
                    if (tScale < 1.01) {
                        tResetZoom(true);
                        return;
                    }

                    // Si estaba haciendo pan con inercia
                    if (isPanning && tIsTouchZoomed) {
                        isPanning = false;
                        tStartInertia();
                        return;
                    }

                    // Snap-back después de pinch
                    if (tIsTouchZoomed) {
                        tSnapBack();
                    }

                    // Swipe solo si NO está con zoom
                    if (!tIsTouchZoomed) {
                        var endX = e.changedTouches[0].clientX;
                        var endY = e.changedTouches[0].clientY;
                        var diffX = endX - panStartX;
                        var diffY = endY - panStartY;
                        if (Math.abs(diffX) > SWIPE_THRESHOLD && Math.abs(diffX) > Math.abs(diffY)) {
                            if (diffX > 0) {
                                window.changeModalImage(-1);
                            } else {
                                window.changeModalImage(1);
                            }
                        }
                    }
                }

                // Si quedan 1 dedo después de soltar uno (transición pinch → pan)
                if (e.touches.length === 1) {
                    panStartX = e.touches[0].clientX;
                    panStartY = e.touches[0].clientY;
                    panBasePanX = tPanX;
                    panBasePanY = tPanY;
                    pinchStartDist = 0;
                    lastMoveX = panStartX;
                    lastMoveY = panStartY;
                    lastMoveTime = Date.now();
                    velocityX = 0;
                    velocityY = 0;
                }
            });

            /* ── DOBLE-TAP: zoom al punto tocado / unzoom ── */
            var lastTap = 0;
            var lastTapX = 0;
            var lastTapY = 0;
            zoomWrapper.addEventListener('touchend', function (e) {
                if (e.touches.length > 0) { return; }
                var now = Date.now();
                var tx = e.changedTouches[0].clientX;
                var ty = e.changedTouches[0].clientY;
                if (now - lastTap < 300 && Math.abs(tx - lastTapX) < 30 && Math.abs(ty - lastTapY) < 30) {
                    e.preventDefault();
                    if (tIsTouchZoomed) {
                        tResetZoom(true);
                    } else {
                        tZoomToPoint(DOUBLE_TAP_SCALE, tx, ty, true);
                    }
                    lastTap = 0;
                } else {
                    lastTap = now;
                    lastTapX = tx;
                    lastTapY = ty;
                }
            });

            // Resetear zoom al cambiar de imagen
            var origChangeModal = window.changeModalImage;
            window.changeModalImage = function (dir, event) {
                tResetZoom(false);
                origChangeModal(dir, event);
                updateModalNavButtons();
            };
        }

        /* ═══════════════════════════════════════════
           4.5 METADATA PANEL
        ═══════════════════════════════════════════ */

        var metadataPanel = document.getElementById('metadataPanel');
        var metadataToggle = document.getElementById('metadataToggle');
        var metaTechnical = document.getElementById('metaTechnical');
        var modalContentWrapper = document.getElementById('modalContentWrapper');
        var exifPreference = true; // metadatos visibles por defecto

        function formatDate(dateStr) {
            if (!dateStr || dateStr.indexOf(':') === -1) { return dateStr; }
            var parts = dateStr.split(' ')[0].split(':');
            if (parts.length < 3) { return dateStr; }
            var year = parts[0].slice(-2);
            var month = parts[1].padStart(2, '0');
            var day = parts[2].padStart(2, '0');
            return day + '/' + month + '/' + year;
        }

        function updateLensDisplay() {
            var el = document.getElementById('metaLens');
            if (!el || !el.dataset.lensFull) { return; }
            var full = el.dataset.lensFull;
            var abbr = el.dataset.lensAbbr || full;
            if (full === '-' || full === abbr) { el.textContent = full; return; }
            // Medir ancho natural forzando no-wrap
            var prevWS = el.style.whiteSpace;
            el.style.whiteSpace = 'nowrap';
            el.textContent = full;
            var natural = el.scrollWidth;
            var available = el.clientWidth;
            el.style.whiteSpace = prevWS;
            el.textContent = (available > 0 && natural > available) ? abbr : full;
        }

        function syncPanelWidth() {
            if (!metadataPanel || !imgZoom || !zoomWrapper) { return; }
            var iW = imgZoom.naturalWidth;
            var iH = imgZoom.naturalHeight;
            if (!iW || !iH) { metadataPanel.style.width = ''; return; }
            var wr = zoomWrapper.getBoundingClientRect();
            var wrapRatio = wr.width / wr.height;
            var imgRatio = iW / iH;
            var renderedW = (imgRatio > wrapRatio) ? wr.width : wr.height * imgRatio;
            metadataPanel.style.width = Math.round(renderedW) + 'px';
            updateLensDisplay();
        }

        function updateMetadataPanel() {
            if (!metadataPanel) { return; }
            if (!window.photoMetadata) {
                metadataPanel.classList.add('hidden');
                return;
            }

            var currentSrc = imgZoom ? imgZoom.src : '';
            if (!currentSrc) {
                if (metadataPanel) { metadataPanel.classList.add('hidden'); }
                return;
            }

            // Las claves son rutas relativas, imgZoom.src es URL absoluta
            var metadata = null;
            var decodedSrc = decodeURIComponent(currentSrc);
            var metaKeys = Object.keys(window.photoMetadata);
            for (var k = 0; k < metaKeys.length; k++) {
                var normalizedKey = metaKeys[k].replace(/^\.\.\/\.\.\//,'');
                if (decodedSrc.indexOf(normalizedKey) !== -1) {
                    metadata = window.photoMetadata[metaKeys[k]];
                    break;
                }
            }

            // Si no hay metadata, ocultar todo
            if (!metadata) {
                if (metadataPanel) { metadataPanel.classList.add('hidden'); }
                return;
            }

            // Determinar si hay título/descripción
            var hasTitle = metadata.title && metadata.title.trim() !== '';
            var hasDescription = metadata.description && metadata.description.trim() !== '';
            var hasLocation = metadata.location && metadata.location.trim() !== '';
            var hasTechData = !!(metadata.camera || metadata.lens || metadata.focal || metadata.aperture || metadata.speed || metadata.iso);

            // Si no hay nada, ocultar todo (Caso 1)
            if (!hasTitle && !hasDescription && !hasLocation && !hasTechData) {
                if (metadataPanel) { metadataPanel.classList.add('hidden'); }
                return;
            }

            // Mostrar panel
            if (metadataPanel) { metadataPanel.classList.remove('hidden'); }

            // Actualizar información
            var metaTitle = document.getElementById('metaTitle');
            var metaDateLocation = document.getElementById('metaDateLocation');
            var metaDescription = document.getElementById('metaDescription');

            if (metaTitle) {
                metaTitle.textContent = hasTitle ? metadata.title : '';
            }

            var dateStr = metadata.date ? formatDate(metadata.date) : '';
            var dateLocText = [];
            if (dateStr) { dateLocText.push(dateStr); }
            if (hasLocation) { dateLocText.push(metadata.location); }
            if (metaDateLocation) {
                metaDateLocation.textContent = dateLocText.join(' | ');
            }

            if (metaDescription) {
                metaDescription.textContent = hasDescription ? metadata.description : '';
                metaDescription.style.display = hasDescription ? '' : 'none';
            }

            // Actualizar datos técnicos
            var metaCamera = document.getElementById('metaCamera');
            var metaLens = document.getElementById('metaLens');
            var metaFocalAperture = document.getElementById('metaFocalAperture');
            var metaSpeedIso = document.getElementById('metaSpeedIso');

            if (metaCamera) { metaCamera.textContent = metadata.camera || '-'; }
            if (metaLens) {
                var lensFullName = metadata.lens || '-';
                var lensMatch = lensFullName.match(/(\d+mm\s+f\/[\d.\-]+)/i);
                metaLens.dataset.lensFull = lensFullName;
                metaLens.dataset.lensAbbr = lensMatch ? lensMatch[1] : lensFullName;
                metaLens.textContent = lensFullName; // se corregirá en syncPanelWidth
            }

            var focalApertureText = [];
            if (metadata.focal) { focalApertureText.push(metadata.focal + 'mm'); }
            if (metadata.aperture) { focalApertureText.push('f/' + metadata.aperture); }
            if (metaFocalAperture) { metaFocalAperture.textContent = focalApertureText.length > 0 ? focalApertureText.join(' · ') : '-'; }

            var speedIsoText = [];
            if (metadata.speed) { speedIsoText.push(metadata.speed); }
            if (metadata.iso) { speedIsoText.push('ISO ' + metadata.iso); }
            if (metaSpeedIso) { metaSpeedIso.textContent = speedIsoText.length > 0 ? speedIsoText.join(' · ') : '-'; }

            // Caso 5: Solo datos técnicos (sin título/descripción/ubicación)
            if (!hasTitle && !hasDescription && !hasLocation && hasTechData) {
                metadataPanel.classList.add('no-title');
                if (metadataToggle) { metadataToggle.classList.remove('hidden'); }
            }
            // Casos 2/3/4: Con título/descripción/ubicación
            else {
                metadataPanel.classList.remove('no-title');
                if (metadataToggle) {
                    if (hasTechData) {
                        metadataToggle.classList.remove('hidden');
                    } else {
                        metadataToggle.classList.add('hidden');
                    }
                }
            }

            // Aplicar estado inicial sin animación
            var toggleTexts = document.querySelectorAll('.metadata-toggle-text');
            if (metaTechnical) { metaTechnical.style.transition = 'none'; }
            if (modalContentWrapper) { modalContentWrapper.style.transition = 'none'; }
            if (exifPreference && hasTechData) {
                if (metaTechnical) { metaTechnical.classList.add('open'); }
                if (metadataToggle) { metadataToggle.classList.add('open'); }
                for (var t = 0; t < toggleTexts.length; t++) { toggleTexts[t].textContent = 'Ocultar metadatos'; }
                applyExifOffset(true);
            } else {
                if (metaTechnical) { metaTechnical.classList.remove('open'); }
                if (metadataToggle) { metadataToggle.classList.remove('open'); }
                for (var t = 0; t < toggleTexts.length; t++) { toggleTexts[t].textContent = 'Mostrar metadatos'; }
                applyExifOffset(false);
            }
            // Restaurar transiciones tras el primer frame
            requestAnimationFrame(function() {
                if (metaTechnical) { metaTechnical.style.transition = ''; }
                if (modalContentWrapper) { modalContentWrapper.style.transition = ''; }
            });

            // Ajustar ancho del panel al ancho renderizado de la foto
            requestAnimationFrame(syncPanelWidth);
            // Si la imagen aún no ha cargado, recalcular cuando lo haga
            if (imgZoom && !imgZoom.naturalWidth) {
                imgZoom.addEventListener('load', function() {
                    requestAnimationFrame(syncPanelWidth);
                }, { once: true });
            }
        }

        function applyExifOffset(open) {
            if (!modalContentWrapper) { return; }
            if (open && metaTechnical) {
                var offset = Math.round(metaTechnical.offsetHeight / 2);
                modalContentWrapper.style.transform = 'translateY(-' + offset + 'px)';
            } else {
                modalContentWrapper.style.transform = '';
            }
        }

        window.toggleMetadata = function (event) {
            if (event) { event.stopPropagation(); }
            if (!metaTechnical) { return; }

            var isOpen = metaTechnical.classList.contains('open');
            var toggleTexts = document.querySelectorAll('.metadata-toggle-text');
            if (isOpen) {
                exifPreference = false;
                metaTechnical.classList.remove('open');
                if (metadataToggle) { metadataToggle.classList.remove('open'); }
                for (var t = 0; t < toggleTexts.length; t++) { toggleTexts[t].textContent = 'Mostrar metadatos'; }
                applyExifOffset(false);
            } else {
                exifPreference = true;
                applyExifOffset(true);
                metaTechnical.classList.add('open');
                if (metadataToggle) { metadataToggle.classList.add('open'); }
                for (var t = 0; t < toggleTexts.length; t++) { toggleTexts[t].textContent = 'Ocultar metadatos'; }
            }
        };

        // Integrar con openZoom
        var origOpenZoom = window.openZoom;
        window.openZoom = function (src) {
            origOpenZoom(src);
            updateMetadataPanel();
        };

        // Integrar con changeModalImage
        var origChangeModalImage = window.changeModalImage;
        window.changeModalImage = function (dir, event) {
            origChangeModalImage(dir, event);
            updateMetadataPanel();
        };

        // Recalcular ancho del panel en resize
        window.addEventListener('resize', syncPanelWidth);

        // Nota: la integración zoom ↔ metadata se hace en el click handler
        // existente de imgZoom (sección 4. ZOOM MODAL) que ya añade/quita
        // la clase .zoomed en modalContentWrapper.

        /* ═══════════════════════════════════════════
           4b. DEEP LINK — compartir foto por URL hash
               La URL cambia a #nombre-foto.avif al abrir
               un modal, y se limpia al cerrar.
               Cargar la página con ese hash abre la foto.
        ═══════════════════════════════════════════ */

        function _hashFilename(src) {
            return src ? src.split('/').pop().split('?')[0] : '';
        }

        function _setHash(src) {
            var filename = _hashFilename(src);
            var base = location.pathname + location.search;
            history.replaceState(null, '', filename ? base + '#' + filename : base);
        }

        // Envolver openZoom → actualizar hash
        var _origOpenZoomHash = window.openZoom;
        window.openZoom = function (src) {
            _origOpenZoomHash(src);
            _setHash(src);
        };

        // Envolver changeModalImage → actualizar hash al navegar
        var _origChangeHash = window.changeModalImage;
        window.changeModalImage = function (dir, event) {
            _origChangeHash(dir, event);
            if (imgZoom) { _setHash(imgZoom.src); }
        };

        // Envolver closeZoom → limpiar hash
        var _origCloseZoomHash = window.closeZoom;
        window.closeZoom = function () {
            _origCloseZoomHash();
            _setHash(null);
        };

        // Al cargar la página: si hay hash, abrir la foto correspondiente
        (function () {
            var hash = decodeURIComponent(location.hash.slice(1));
            if (!hash || !slides.length) { return; }
            var target = Array.from(slides).find(function (img) {
                return _hashFilename(img.src) === hash;
            });
            if (target) { window.openZoom(target.src); }
        })();

        /* ═══════════════════════════════════════════
           5. SCROLL TO TOP
        ═══════════════════════════════════════════ */

        window.scrollToTop = function () {
            window.scrollTo({ top: 0, behavior: 'smooth' });
        };

        /* ═══════════════════════════════════════════
           6. FORMULARIO - VALIDACION
        ═══════════════════════════════════════════ */

        var form = document.getElementById('contactForm');

        if (form) {
            // Sincronizar campo _replyto con el email (para Formspree)
            var emailInput = document.getElementById('email');
            var replytoInput = document.getElementById('replyto');
            if (emailInput && replytoInput) {
                emailInput.addEventListener('input', function () {
                    replytoInput.value = emailInput.value;
                });
            }

            var requiredInputs = form.querySelectorAll('[required]');
            var telefono = document.getElementById('telefono');

            // La validación y envío se gestiona en el script inline de contact.html.
            // Aquí solo se limpia el estado de error en tiempo real al corregir.

            // Limpiar estado de error al corregir
            requiredInputs.forEach(function (input) {
                input.addEventListener('input', function () {
                    if (input.value.trim() !== '') {
                        input.closest('.input-group').classList.remove('error');
                    }
                });
            });

            // Limpiar error del teléfono al escribir
            if (telefono) {
                telefono.addEventListener('input', function () {
                    var phoneVal = telefono.value.trim();
                    if (phoneVal === '' || phoneVal.startsWith('+')) {
                        telefono.closest('.input-group').classList.remove('error');
                    }
                });
            }
        }

        function validateEmail(email) {
            return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
        }

        /* ═══════════════════════════════════════════
           7. COPIAR EMAIL AL PORTAPAPELES
        ═══════════════════════════════════════════ */

        window.copiarEmail = function (event) {
            event.stopPropagation();
            event.preventDefault();

            var emailElemento = event.target;
            var textoOriginal = emailElemento.textContent;

            // Evitar clics múltiples rápidos
            if (emailElemento.dataset.copying) { return; }
            emailElemento.dataset.copying = 'true';

            navigator.clipboard.writeText(textoOriginal).then(function () {
                emailElemento.textContent = '¡Copiado!';
                emailElemento.style.color = '#28a745';
                emailElemento.style.cursor = 'default';

                setTimeout(function () {
                    emailElemento.textContent = textoOriginal;
                    emailElemento.style.color = '';
                    emailElemento.style.cursor = '';
                    delete emailElemento.dataset.copying;
                }, 3000);
            }).catch(function () {
                // Fallback: seleccionar el texto para copia manual
                var range = document.createRange();
                range.selectNodeContents(emailElemento);
                var sel = window.getSelection();
                sel.removeAllRanges();
                sel.addRange(range);
                delete emailElemento.dataset.copying;
            });
        };

        /* ═══════════════════════════════════════════
           8. HEART RAIN — Easter egg al hacer clic en ❤️
        ═══════════════════════════════════════════ */

        var heartEl = document.querySelector('.heart-beat');

        if (heartEl) {
            var heartSrc = 'https://cdn.jsdelivr.net/gh/twitter/twemoji@14.0.2/assets/svg/2764.svg';
            var rainBusy = false;

            var RAIN_BASE    = 30;
            var RAIN_EXTRA   = 8;
            var RAIN_TOTAL   = RAIN_BASE + RAIN_EXTRA;
            var RAIN_SPEED   = 1300;  // px/s
            var RAIN_STAGGER = 30;    // ms entre corazones

            // Crear overlay una sola vez
            var rainOverlay = document.createElement('div');
            rainOverlay.className = 'rain-overlay';
            rainOverlay.setAttribute('aria-hidden', 'true');
            document.body.appendChild(rainOverlay);

            function rainDistributeX() {
                var positions = [];
                var step = 100 / RAIN_BASE;

                for (var i = 0; i < RAIN_BASE; i++) {
                    var base = step * i + step * 0.5;
                    var jitter = (Math.random() - 0.5) * step * 0.8;
                    positions.push(Math.max(0.5, Math.min(99.5, base + jitter)));
                }

                for (var e = 0; e < RAIN_EXTRA; e++) {
                    positions.push(33 + Math.random() * 33);
                }

                for (var j = positions.length - 1; j > 0; j--) {
                    var k = Math.floor(Math.random() * (j + 1));
                    var tmp = positions[j];
                    positions[j] = positions[k];
                    positions[k] = tmp;
                }

                return positions;
            }

            heartEl.addEventListener('click', function () {
                if (rainBusy) { return; }
                rainBusy = true;

                heartEl.classList.remove('heart-click-pulse');
                void heartEl.offsetWidth;
                heartEl.classList.add('heart-click-pulse');
                setTimeout(function () { heartEl.classList.remove('heart-click-pulse'); }, 350);

                var viewH    = window.innerHeight;
                var travel   = viewH + 40;
                var duration = (travel / RAIN_SPEED) * 1000;
                var xPos     = rainDistributeX();

                for (var i = 0; i < RAIN_TOTAL; i++) {
                    (function (idx) {
                        setTimeout(function () {
                            var img = document.createElement('img');
                            img.src = heartSrc;
                            img.className = 'rain-heart';
                            img.setAttribute('aria-hidden', 'true');

                            img.style.left = xPos[idx] + 'vw';
                            img.style.top  = '-20px';

                            var rot = (Math.random() * 20 - 10).toFixed(1);
                            img.style.transform = 'translateY(0) rotate(' + rot + 'deg)';

                            rainOverlay.appendChild(img);
                            void img.offsetWidth;

                            img.style.transition = 'transform ' + duration + 'ms linear';
                            img.style.transform  = 'translateY(' + travel + 'px) rotate(' + rot + 'deg)';

                            setTimeout(function () { if (img.parentNode) { img.remove(); } }, duration + 100);
                        }, idx * RAIN_STAGGER);
                    })(i);
                }

                setTimeout(function () {
                    rainBusy = false;
                    while (rainOverlay.firstChild) { rainOverlay.removeChild(rainOverlay.firstChild); }
                }, (RAIN_TOTAL * RAIN_STAGGER) + duration + 200);
            });
        }

        // --- Corazón POP en "mamá" (photos.html) ---
        var mamaTrigger = document.getElementById('mama-trigger');
        var mamaSlot    = document.getElementById('mama-heart-slot');

        if (mamaTrigger && mamaSlot) {
            mamaTrigger.addEventListener('click', function () {
                mamaSlot.innerHTML = '';

                requestAnimationFrame(function () {
                    var img  = document.createElement('img');
                    img.src  = 'https://em-content.zobj.net/source/apple/453/red-heart_2764-fe0f.png';
                    img.alt  = '❤️';
                    img.width  = 22;
                    img.height = 22;
                    img.className = 'heart-pop';
                    mamaSlot.appendChild(img);
                });
            });
        }

    }); // FIN DOMContentLoaded

})(); // FIN IIFE
