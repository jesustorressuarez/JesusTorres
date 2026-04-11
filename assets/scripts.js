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
            var words = ['Arquitecto', 'BIM Manager', 'Fotógrafo amateur'];
            words.forEach(function (word, index) {
                var span = document.createElement('span');
                span.classList.add('rotating-word');
                span.textContent = word;
                span.style.animationDelay = (index * 2) + 's';
                rotatorContainer.appendChild(span);
            });
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
            if (typeof lenis !== 'undefined') { lenis.stop(); }
            resetZoom();
        };

        window.closeZoom = function () {
            if (!modal) { return; }
            modal.style.display = 'none';
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
                }, 1500);
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

    }); // FIN DOMContentLoaded

})(); // FIN IIFE
