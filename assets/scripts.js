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

            // Cerrar menu al hacer clic en enlaces
            mobileMenu.querySelectorAll('a').forEach(function (link) {
                link.addEventListener('click', function () {
                    burger.classList.remove('active');
                    mobileMenu.classList.remove('active');
                    if (typeof lenis !== 'undefined') { lenis.start(); }
                });
            });
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
        }

        function cacheBaseDimensions() {
            if (imgZoom) {
                baseImgW = imgZoom.offsetWidth;
                baseImgH = imgZoom.offsetHeight;
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
        }

        // --- Abrir / Cerrar Modal ---

        window.openZoom = function (src) {
            if (!modal || !imgZoom || !slides.length) { return; }
            currentIdx = Array.from(slides).findIndex(function (img) { return img.src === src; });
            imgZoom.src = src;
            modal.style.display = 'flex';
            document.body.style.overflow = 'hidden';
            document.body.style.touchAction = 'none';
            if (typeof lenis !== 'undefined') { lenis.stop(); }
            resetZoom();
        };

        window.closeZoom = function () {
            if (!modal) { return; }
            modal.style.display = 'none';
            document.body.style.overflow = '';
            document.body.style.touchAction = '';
            if (typeof lenis !== 'undefined') { lenis.start(); }
            resetZoom();
        };

        window.moveSlide = function (dir) {
            if (track) {
                track.scrollBy({ left: track.offsetWidth * dir, behavior: 'smooth' });
            }
        };

        window.changeModalImage = function (dir, event) {
            if (event) { event.stopPropagation(); }
            if (!slides.length || !imgZoom) { return; }
            currentIdx = (currentIdx + dir + slides.length) % slides.length;
            imgZoom.src = slides[currentIdx].src;
            resetZoom();
        };

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
                    applyPan(e);
                } else {
                    resetZoom();
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

        // Teclado: navegar / cerrar modal
        document.addEventListener('keydown', function (e) {
            if (modal && modal.style.display === 'flex') {
                if (e.key === 'Escape') { window.closeZoom(); }
                if (e.key === 'ArrowRight') { window.changeModalImage(1); }
                if (e.key === 'ArrowLeft') { window.changeModalImage(-1); }
            }
        });

        /* ── TOUCH: swipe + pinch-to-zoom en modal ── */
        if (modal && imgZoom && zoomWrapper) {
            var touchStartX = 0;
            var touchStartY = 0;
            var touchStartDist = 0;
            var touchZoomScale = 1;
            var touchPanX = 0;
            var touchPanY = 0;
            var touchLastPanX = 0;
            var touchLastPanY = 0;
            var isTouchZoomed = false;
            var SWIPE_THRESHOLD = 50;

            function getTouchDist(touches) {
                var dx = touches[0].clientX - touches[1].clientX;
                var dy = touches[0].clientY - touches[1].clientY;
                return Math.sqrt(dx * dx + dy * dy);
            }

            function getTouchCenter(touches) {
                return {
                    x: (touches[0].clientX + touches[1].clientX) / 2,
                    y: (touches[0].clientY + touches[1].clientY) / 2
                };
            }

            function applyTouchTransform() {
                imgZoom.style.transition = 'none';
                imgZoom.style.transform = 'translate(' + touchPanX + 'px, ' + touchPanY + 'px) scale(' + touchZoomScale + ')';
            }

            function resetTouchZoom() {
                touchZoomScale = 1;
                touchPanX = 0;
                touchPanY = 0;
                touchLastPanX = 0;
                touchLastPanY = 0;
                isTouchZoomed = false;
                imgZoom.style.transition = 'transform 0.3s ease';
                imgZoom.style.transform = '';
                imgZoom.classList.remove('active-zoom');
                isZoomed = false;
            }

            zoomWrapper.addEventListener('touchstart', function (e) {
                if (e.touches.length === 2) {
                    // Pinch start
                    e.preventDefault();
                    touchStartDist = getTouchDist(e.touches);
                } else if (e.touches.length === 1) {
                    touchStartX = e.touches[0].clientX;
                    touchStartY = e.touches[0].clientY;
                    touchLastPanX = touchPanX;
                    touchLastPanY = touchPanY;
                }
            }, { passive: false });

            zoomWrapper.addEventListener('touchmove', function (e) {
                if (e.touches.length === 2 && touchStartDist > 0) {
                    // Pinch zoom
                    e.preventDefault();
                    var newDist = getTouchDist(e.touches);
                    var scale = newDist / touchStartDist;
                    touchZoomScale = Math.max(1, Math.min(4, scale * (isTouchZoomed ? touchZoomScale : 1)));
                    if (touchZoomScale > 1) {
                        isTouchZoomed = true;
                        imgZoom.classList.add('active-zoom');
                        isZoomed = true;
                    }
                    applyTouchTransform();
                } else if (e.touches.length === 1 && isTouchZoomed) {
                    // Pan cuando está con zoom
                    e.preventDefault();
                    var dx = e.touches[0].clientX - touchStartX;
                    var dy = e.touches[0].clientY - touchStartY;
                    touchPanX = touchLastPanX + dx;
                    touchPanY = touchLastPanY + dy;
                    applyTouchTransform();
                }
            }, { passive: false });

            zoomWrapper.addEventListener('touchend', function (e) {
                if (e.touches.length === 0) {
                    touchStartDist = 0;

                    // Si está con zoom y se reduce a ~1, resetear
                    if (isTouchZoomed && touchZoomScale <= 1.05) {
                        resetTouchZoom();
                        return;
                    }

                    // Swipe solo si NO está con zoom
                    if (!isTouchZoomed) {
                        var endX = e.changedTouches[0].clientX;
                        var endY = e.changedTouches[0].clientY;
                        var diffX = endX - touchStartX;
                        var diffY = endY - touchStartY;

                        // Solo swipe horizontal si el movimiento es más horizontal que vertical
                        if (Math.abs(diffX) > SWIPE_THRESHOLD && Math.abs(diffX) > Math.abs(diffY)) {
                            if (diffX > 0) {
                                window.changeModalImage(-1); // swipe derecha → imagen anterior
                            } else {
                                window.changeModalImage(1);  // swipe izquierda → imagen siguiente
                            }
                        }
                    }
                }
            });

            // Doble-tap para zoom/unzoom
            var lastTap = 0;
            zoomWrapper.addEventListener('touchend', function (e) {
                if (e.touches.length > 0) { return; }
                var now = Date.now();
                if (now - lastTap < 300) {
                    // Doble tap
                    e.preventDefault();
                    if (isTouchZoomed) {
                        resetTouchZoom();
                    } else {
                        touchZoomScale = ZOOM_SCALE;
                        isTouchZoomed = true;
                        imgZoom.classList.add('active-zoom');
                        isZoomed = true;
                        applyTouchTransform();
                    }
                    lastTap = 0;
                } else {
                    lastTap = now;
                }
            });

            // Resetear zoom al cambiar de imagen
            var origChangeModal = window.changeModalImage;
            window.changeModalImage = function (dir, event) {
                resetTouchZoom();
                origChangeModal(dir, event);
            };
        }

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

            form.addEventListener('submit', function (e) {
                var isValid = true;

                // Validar campos obligatorios
                requiredInputs.forEach(function (input) {
                    var group = input.closest('.input-group');
                    var isEmailInvalid = input.type === 'email' && !validateEmail(input.value);
                    var isEmpty = input.value.trim() === '';

                    if (isEmpty || isEmailInvalid) {
                        e.preventDefault();
                        group.classList.add('error');
                        isValid = false;
                    } else {
                        group.classList.remove('error');
                    }
                });

                // Validar teléfono: si se rellena, debe incluir prefijo y tener 9 cifras
                if (telefono) {
                    var phoneGroup = telefono.closest('.input-group');
                    var phoneError = document.getElementById('phoneError');
                    var phoneVal = telefono.value.trim();

                    if (phoneVal !== '') {
                        // Extraer solo dígitos (sin el +)
                        var digits = phoneVal.replace(/[^0-9]/g, '');
                        // Separar prefijo y número: el prefijo son los dígitos antes del primer espacio/guión tras el +
                        var match = phoneVal.match(/^\+(\d{1,4})[\s\-]?(.*)$/);

                        if (!phoneVal.startsWith('+')) {
                            phoneError.textContent = 'Incluye el prefijo (ej. +34 612 345 678)';
                            e.preventDefault();
                            phoneGroup.classList.add('error');
                            isValid = false;
                        } else if (match) {
                            var prefixDigits = match[1].length;
                            var numberDigits = match[2].replace(/[^0-9]/g, '').length;
                            if (numberDigits !== 9) {
                                phoneError.textContent = 'El número debe tener 9 cifras';
                                e.preventDefault();
                                phoneGroup.classList.add('error');
                                isValid = false;
                            } else {
                                phoneGroup.classList.remove('error');
                            }
                        } else {
                            phoneError.textContent = 'Incluye el prefijo (ej. +34 612 345 678)';
                            e.preventDefault();
                            phoneGroup.classList.add('error');
                            isValid = false;
                        }
                    } else {
                        phoneGroup.classList.remove('error');
                    }
                }

                // Sincronizar _replyto antes de enviar
                if (replytoInput && emailInput) {
                    replytoInput.value = emailInput.value;
                }
            });

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

                setTimeout(function () {
                    emailElemento.textContent = textoOriginal;
                    emailElemento.style.color = '';
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

    }); // FIN DOMContentLoaded

})(); // FIN IIFE
