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

        // Nota: la compensación del ancho del scrollbar al abrir modales se gestiona
        // declarativamente con `scrollbar-gutter: stable` en html, body (ver styles.css).
        // Por eso NO es necesario medir el scrollbar en JS ni aplicar padding-right
        // compensatorio en .lenis.lenis-stopped.

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
           4. CARROUSEL
        ═══════════════════════════════════════════ */

        var track = document.getElementById('track');
        var dotsContainer = document.getElementById('dots-container');
        var slides = document.querySelectorAll('.slide img');

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
                if (track.scrollLeft + track.offsetWidth >= track.scrollWidth - 2) {
                    index = slides.length - 1;
                }
                index = Math.min(index, slides.length - 1);
                document.querySelectorAll('.dot').forEach(function (d, i) {
                    d.classList.toggle('active', i === index);
                });
            });
        }

        // --- Carrusel sin bucle (solo proyectos, no galerías de fotos) ---
        var isGalleryCarousel = track && track.classList.contains('is-gallery');

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
            setTimeout(updateNavButtons, 100);
        }

        window.moveSlide = function (dir) {
            if (!track || slides.length === 0) { return; }
            // Encontrar el índice actual comparando scrollLeft con el offsetLeft de cada slide
            var currentIndex = 0;
            var minDist = Infinity;
            for (var i = 0; i < slides.length; i++) {
                var dist = Math.abs(slides[i].offsetLeft - track.scrollLeft);
                if (dist < minDist) { minDist = dist; currentIndex = i; }
            }
            var newIndex = Math.max(0, Math.min(slides.length - 1, currentIndex + dir));
            // Usar offsetLeft exacto del slide destino (igual que los dots), evitando el problema del gap
            track.scrollTo({ left: slides[newIndex].offsetLeft, behavior: 'smooth' });
        };

        // Teclado: mover carrusel de proyecto (sin modal abierto)
        document.addEventListener('keydown', function (e) {
            var modal = document.getElementById('modal');
            if (modal && modal.classList.contains('open')) { return; }
            if (track && !isGalleryCarousel) {
                if (e.key === 'ArrowRight') { e.preventDefault(); window.moveSlide(1); }
                if (e.key === 'ArrowLeft') { e.preventDefault(); window.moveSlide(-1); }
            }
        });


        /* ═══════════════════════════════════════════
           4b. MODAL ZOOM — NUEVO
        ═══════════════════════════════════════════ */

        var modal      = document.getElementById('modal');
        var photo      = document.getElementById('photo');
        var photoArea  = document.getElementById('photoArea');
        var wrapper    = document.getElementById('wrapper');
        var metaPanel  = document.getElementById('metaPanel');
        var btnMeta    = document.getElementById('btnMeta');
        var btnPrev    = document.getElementById('btnPrev');
        var btnNext    = document.getElementById('btnNext');
        var counterEl  = document.getElementById('counter');
        var minimap    = document.getElementById('minimap');
        var minimapImg = document.getElementById('minimapImg');
        var minimapVp  = document.getElementById('minimapVp');
        var counterInline = document.getElementById('counterInline');
        var titlePanel = document.getElementById('titlePanel');

        var currentIdx    = 0;
        var metaPreference = true;
        var metaVisible   = false;
        var isZoomed      = false;
        var ZOOM_SCALE    = 2.5;
        var baseImgW      = 0;
        var baseImgH      = 0;

        /* ── Formatea fecha EXIF "YYYY:MM:DD HH:MM:SS" → "DD/MM/AA" ── */
        function formatExifDate(raw) {
            if (!raw) { return raw; }
            var m = raw.match(/^(\d{4}):(\d{2}):(\d{2})/);
            if (!m) { return raw; }
            return m[3] + '/' + m[2] + '/' + m[1].slice(2);
        }

        /* ── Construir array de imágenes desde los slides del carousel ── */
        function buildImageData() {
            var images = [];
            for (var i = 0; i < slides.length; i++) {
                var src = slides[i].src;
                var data = { src: src };
                // Buscar metadata si existe window.photoMetadata
                if (window.photoMetadata) {
                    var decodedSrc = decodeURIComponent(src);
                    var metaKeys = Object.keys(window.photoMetadata);
                    for (var k = 0; k < metaKeys.length; k++) {
                        var normalizedKey = metaKeys[k].replace(/^\.\.\/\.\.\//,'');
                        if (decodedSrc.indexOf(normalizedKey) !== -1) {
                            var meta = window.photoMetadata[metaKeys[k]];
                            if (meta.title)       data.title = meta.title;
                            if (meta.description) data.desc = meta.description;
                            if (meta.date)        data.date = formatExifDate(meta.date);
                            if (meta.location)    data.location = meta.location;
                            if (meta.camera || meta.lens || meta.focal || meta.aperture) {
                                data.exif = {
                                    camera: meta.camera || '-',
                                    lens: meta.lens || '-',
                                    focal: (meta.focal || '-') + ' · ' + (meta.aperture || '-'),
                                    speed: (meta.speed || '-') + ' · ISO ' + (meta.iso || '-')
                                };
                            }
                            break;
                        }
                    }
                }
                images.push(data);
            }
            return images;
        }

        /* ══════════════════════════════════════
           NAVEGACIÓN
        ══════════════════════════════════════ */

        function showImage(idx) {
            if (!modal || !photo) { return; }
            var images = buildImageData();
            if (!images.length) { return; }
            currentIdx = idx;
            resetZoom();
            if (photoArea) { photoArea.style.flex = ''; }
            photo.style.maxHeight = '';

            var data = images[idx];
            photo.src = data.src;

            /* Si la imagen NO está cacheada, ocultar paneles hasta que cargue:
               evita ver los paneles con ancho incorrecto (90vw) durante la carga.
               Si la imagen YA está cacheada, no ocultar — al final de showImage
               llamamos a syncLayout() síncronamente y el navegador nunca
               repinta un estado intermedio (evita el parpadeo del fix anterior). */
            var isCached = photo.complete && photo.naturalWidth > 0;
            if (!isCached) {
                if (titlePanel) { titlePanel.style.visibility = 'hidden'; }
                if (metaPanel)  { metaPanel.style.visibility  = 'hidden'; }
            }

            /* ── Panel título ── */
            if (titlePanel) {
                var hasTitle = data.title || data.desc;
                var hasDateLoc = data.date || data.location;
                var showTitle = !!(data.title || data.desc || data.location);

                if (showTitle) {
                    titlePanel.style.display = '';
                    var leftHTML = '';
                    if (data.title) leftHTML += '<span class="title-name">' + data.title + '</span>';
                    if (data.desc)  leftHTML += '<span class="title-desc">' + data.desc + '</span>';
                    titlePanel.querySelector('.title-left').innerHTML = leftHTML;

                    var rightParts = [];
                    if (data.date)     rightParts.push(data.date);
                    if (data.location) rightParts.push(data.location);
                    titlePanel.querySelector('.title-right').textContent = rightParts.join(' | ');
                } else {
                    titlePanel.style.display = 'none';
                }
            }

            /* ── Panel metadatos + botón ── */
            var hasExif = !!data.exif;
            if (btnMeta && metaPanel) {
                if (hasExif) {
                    btnMeta.disabled = false;
                    var exifHTML =
                        '<div><span class="meta-label">Cámara</span><span>' + data.exif.camera + '</span></div>' +
                        '<div><span class="meta-label">Objetivo</span><span>' + data.exif.lens + '</span></div>' +
                        '<div><span class="meta-label">Focal · Apertura</span><span>' + data.exif.focal + '</span></div>' +
                        '<div><span class="meta-label">VEL · ISO</span><span>' + data.exif.speed + '</span></div>';
                    metaPanel.querySelector('.modal-meta-exif').innerHTML = exifHTML;
                    metaVisible = metaPreference;
                    if (metaVisible) {
                        metaPanel.classList.add('visible');
                        btnMeta.textContent = 'Ocultar metadatos';
                    } else {
                        metaPanel.classList.remove('visible');
                        btnMeta.textContent = 'Mostrar metadatos';
                    }
                } else {
                    btnMeta.disabled = true;
                    btnMeta.textContent = 'Mostrar metadatos';
                    metaVisible = false;
                    metaPanel.classList.remove('visible');
                }
            }

            updateModalNavButtons();
            updateModalCounter();

            /* Si la imagen ya estaba cacheada, sincronizar síncronamente:
               el navegador no repinta entre showImage y syncLayout, así que
               no hay flicker. Si no estaba cacheada, el evento 'load' de
               abajo llamará a syncLayout cuando termine la descarga. */
            if (isCached) {
                syncLayout();
            }
        }

        if (photo) {
            photo.addEventListener('load', function () {
                syncLayout();
            });
        }

        function updateModalNavButtons() {
            if (btnPrev) { btnPrev.disabled = currentIdx <= 0; }
            if (btnNext) { btnNext.disabled = currentIdx >= slides.length - 1; }
        }

        function updateModalCounter() {
            var n = (currentIdx + 1) + ' / ' + slides.length;
            if (counterEl) { counterEl.textContent = n; }
            if (counterInline) { counterInline.textContent = '(' + (currentIdx + 1) + '/' + slides.length + ')'; }
        }

        window.openZoomPortada = function (src) {
            if (!modal || !photo) { return; }
            resetZoom();
            if (titlePanel) { titlePanel.style.display = 'none'; }
            if (metaPanel)  { metaPanel.classList.remove('visible'); metaPanel.style.width = ''; }
            if (photoArea)  { photoArea.style.flex = ''; }
            photo.style.maxHeight = '';
            photo.src = src;
            modal.classList.add('open', 'standalone');
            document.body.classList.add('modal-open');
            document.body.style.touchAction = 'none';
            if (typeof lenis !== 'undefined') { lenis.stop(); }
        };

        window.openZoom = function (src) {
            if (!modal || !photo || !slides.length) { return; }
            currentIdx = Array.from(slides).findIndex(function (img) { return img.src === src; });
            if (currentIdx < 0) { currentIdx = 0; }
            modal.classList.add('open');
            document.body.classList.add('modal-open');
            document.body.style.touchAction = 'none';
            if (typeof lenis !== 'undefined') { lenis.stop(); }
            showImage(currentIdx);
        };

        window.closeZoom = function () {
            if (!modal) { return; }
            modal.classList.remove('open', 'standalone');
            document.body.classList.remove('modal-open');
            document.body.style.touchAction = '';
            if (typeof lenis !== 'undefined') { lenis.start(); }
            resetZoom();
        };

        window.changeModalImage = function (dir) {
            var newIdx = currentIdx + dir;
            if (newIdx < 0 || newIdx >= slides.length) { return; }
            showImage(newIdx);
        };


        /* ══════════════════════════════════════
           METADATOS
        ══════════════════════════════════════ */

        /* ── Acorta Cámara y Objetivo si sus textos envuelven a 2 líneas ──
           Bug original: comparaba offsetHeight contra parseFloat(lineHeight),
           pero lineHeight se resuelve a "normal" (no hay regla CSS) y
           parseFloat("normal") = NaN → la condición era siempre false y
           nunca acortaba. Fix: usar fontSize * 1.5 como umbral.
           Además se extiende al campo Cámara y se prueban reducciones
           progresivas hasta que el texto quepa en una línea. */
        function shortenExifIfWraps() {
            if (!metaPanel) { return; }
            var exifEl = metaPanel.querySelector('.modal-meta-exif');
            if (!exifEl) { return; }
            var divs = exifEl.querySelectorAll('div');

            for (var i = 0; i < divs.length; i++) {
                var spans = divs[i].querySelectorAll('span');
                if (spans.length < 2) { continue; }
                var label = spans[0].textContent;
                var valueSpan = spans[1];

                if (label !== 'Cámara' && label !== 'Objetivo') { continue; }

                /* Guardar texto original la primera vez para poder restaurarlo
                   en futuras sincros (ej: resize a ventana más ancha). */
                if (!valueSpan.hasAttribute('data-original')) {
                    valueSpan.setAttribute('data-original', valueSpan.textContent);
                }
                var originalText = valueSpan.getAttribute('data-original');

                /* Empezar siempre desde el texto original y re-decidir. */
                valueSpan.textContent = originalText;

                /* Umbral de detección de wrap: 1.5 × fontSize en px.
                   Una línea ≈ fontSize × 1.2 (line-height normal).
                   Dos líneas ≈ fontSize × 2.4. El 1.5 separa sin falsos positivos. */
                var fs = parseFloat(getComputedStyle(valueSpan).fontSize) || 13;
                var threshold = fs * 1.5;

                if (valueSpan.offsetHeight <= threshold) { continue; }

                /* Construir candidatos progresivos según el campo. */
                var candidates = [];

                if (label === 'Objetivo') {
                    /* Capturar rango/foco completo incluyendo zooms: "55-250mm f/4-5.6" */
                    var m1 = originalText.match(/(\d+(?:-\d+)?mm\s+f\/[\d.]+(?:-[\d.]+)?)/);
                    if (m1) { candidates.push(m1[1]); }
                    /* Solo el rango focal: "55-250mm" */
                    var m2 = originalText.match(/(\d+(?:-\d+)?mm)/);
                    if (m2) { candidates.push(m2[1]); }
                } else if (label === 'Cámara') {
                    /* Quitar marca: "Canon EOS 2000D" → "EOS 2000D" */
                    var brandRx = /^(Canon|Nikon|Sony|Fujifilm|Fuji|Olympus|OM System|Panasonic|Leica|Pentax|Sigma|Samsung|Kodak|Hasselblad|Ricoh|Casio)\s+/i;
                    var noBrand = originalText.replace(brandRx, '');
                    if (noBrand !== originalText) { candidates.push(noBrand); }
                    /* Quitar línea de producto: "EOS 2000D" → "2000D" */
                    var lineRx = /^(EOS|Alpha|α|Lumix|PowerShot|Coolpix|X-[A-Z]?|OM-[A-Z]?|Z\s*\d*|D\s*\d*)\s*/i;
                    var noLine = noBrand.replace(lineRx, '');
                    if (noLine && noLine !== noBrand) { candidates.push(noLine); }
                }

                /* Probar candidatos progresivamente hasta que uno quepa en 1 línea. */
                for (var c = 0; c < candidates.length; c++) {
                    valueSpan.textContent = candidates[c];
                    if (valueSpan.offsetHeight <= threshold) { break; }
                }
            }
        }

        window.toggleMeta = function () {
            if (!btnMeta || btnMeta.disabled) { return; }
            metaPreference = !metaPreference;
            metaVisible = metaPreference;
            if (metaVisible) {
                metaPanel.classList.add('visible');
                btnMeta.textContent = 'Ocultar metadatos';
            } else {
                metaPanel.classList.remove('visible');
                btnMeta.textContent = 'Mostrar metadatos';
            }
            requestAnimationFrame(function () {
                syncLayout();
                if (metaVisible) { shortenExifIfWraps(); }
            });
        };

        function syncLayout() {
            if (!photo || !photo.naturalWidth || !photoArea) { return; }

            /* Regla sagrada: el wrapper 90vw×90vh NUNCA desborda.
               La foto encoge para hacerle sitio al título y al meta-panel. */

            /* Ocultar paneles durante el cálculo: el usuario solo ve el estado final. */
            if (titlePanel) { titlePanel.style.visibility = 'hidden'; }
            if (metaPanel)  { metaPanel.style.visibility  = 'hidden'; }

            /* 1. Reset: flex:1 en photoArea, sin maxHeight, paneles a ancho natural (100%) */
            photoArea.style.flex = '';
            photo.style.maxHeight = '';
            if (titlePanel) { titlePanel.style.width = ''; }
            if (metaPanel)  { metaPanel.style.width  = ''; }
            void photoArea.offsetHeight;

            /* 2. Primera pasada: max-height provisional con altura disponible bruta */
            var availH = photoArea.clientHeight;
            photo.style.maxHeight = availH + 'px';
            photoArea.style.flex = '0 0 auto';
            void photoArea.offsetHeight;

            /* 3. Aplicar ancho=foto a los paneles (esto puede cambiar su altura
               porque el EXIF envuelve distinto al ser más estrecho) */
            var w = photo.offsetWidth;
            if (w > 0) {
                if (titlePanel && titlePanel.style.display !== 'none') { titlePanel.style.width = w + 'px'; }
                if (metaVisible && metaPanel) {
                    metaPanel.style.width = w + 'px';
                    shortenExifIfWraps();
                }
            }
            void photoArea.offsetHeight;

            /* 4. Segunda pasada: con el ancho real aplicado, medir las alturas
               finales de título y meta. Si la foto + paneles excede el wrapper,
               encoger la foto para caber en 90vh. */
            if (wrapper) {
                var wrapperH = wrapper.clientHeight;
                var titleH = (titlePanel && titlePanel.style.display !== 'none') ? titlePanel.offsetHeight : 0;
                var metaH  = (metaVisible && metaPanel) ? metaPanel.offsetHeight : 0;
                var maxPhotoH = wrapperH - titleH - metaH;
                if (maxPhotoH < 0) { maxPhotoH = 0; }

                if (photo.offsetHeight > maxPhotoH) {
                    photo.style.maxHeight = maxPhotoH + 'px';
                    void photoArea.offsetHeight;

                    /* La foto ha encogido → su ancho también → recalcular paneles */
                    var wFinal = photo.offsetWidth;
                    if (wFinal > 0 && wFinal !== w) {
                        if (titlePanel && titlePanel.style.display !== 'none') { titlePanel.style.width = wFinal + 'px'; }
                        if (metaVisible && metaPanel) {
                            metaPanel.style.width = wFinal + 'px';
                            shortenExifIfWraps();
                        }
                    }
                }
            }

            /* 5. Restaurar visibilidad */
            if (titlePanel) { titlePanel.style.visibility = ''; }
            if (metaPanel)  { metaPanel.style.visibility  = ''; }
        }

        /* ══════════════════════════════════════
           ZOOM
        ══════════════════════════════════════ */

        function cacheBaseDimensions() {
            if (photo) {
                baseImgW = photo.offsetWidth;
                baseImgH = photo.offsetHeight;
            }
        }

        function resetZoom() {
            isZoomed = false;
            if (photo) {
                photo.style.transform = '';
                photo.classList.remove('zoomed');
            }
            if (wrapper) { wrapper.classList.remove('is-zoomed'); }
            baseImgW = 0;
            baseImgH = 0;
            hideMinimap();
        }

        function applyPan(e) {
            if (!baseImgW || !baseImgH || !photoArea) { return; }
            var area = photoArea.getBoundingClientRect();
            var scaledW = baseImgW * ZOOM_SCALE;
            var scaledH = baseImgH * ZOOM_SCALE;
            var overflowX = Math.max(0, (scaledW - area.width) / 2);
            var overflowY = Math.max(0, (scaledH - area.height) / 2);
            var mx = ((e.clientX - area.left) / area.width) * 2 - 1;
            var my = ((e.clientY - area.top) / area.height) * 2 - 1;
            mx = Math.max(-1, Math.min(1, mx));
            my = Math.max(-1, Math.min(1, my));
            var tx = -mx * overflowX;
            var ty = -my * overflowY;
            photo.style.transform = 'translate(' + tx + 'px,' + ty + 'px) scale(' + ZOOM_SCALE + ')';
            updateMinimap(tx, ty);
        }

        /* ── Minimap ── */

        function showMinimap(src) {
            if (!minimapImg || !minimap) { return; }
            minimapImg.src = src;
            minimap.classList.add('active');
        }
        function hideMinimap() {
            if (!minimap) { return; }
            minimap.classList.remove('active');
        }

        function updateMinimap(tx, ty) {
            if (!minimap || !minimap.classList.contains('active')) { return; }
            var mw = minimapImg.offsetWidth;
            var mh = minimapImg.offsetHeight;
            if (!mw || !mh || !baseImgW || !baseImgH) { return; }
            var area = photoArea.getBoundingClientRect();
            var vpW = Math.min(mw, mw * area.width / (baseImgW * ZOOM_SCALE));
            var vpH = Math.min(mh, mh * area.height / (baseImgH * ZOOM_SCALE));
            var left = mw / 2 - vpW / 2 - tx * mw / (ZOOM_SCALE * baseImgW);
            var top  = mh / 2 - vpH / 2 - ty * mh / (ZOOM_SCALE * baseImgH);
            left = Math.max(0, Math.min(mw - vpW, left));
            top  = Math.max(0, Math.min(mh - vpH, top));
            if (minimapVp) {
                minimapVp.style.width  = vpW + 'px';
                minimapVp.style.height = vpH + 'px';
                minimapVp.style.left   = left + 'px';
                minimapVp.style.top    = top + 'px';
            }
        }

        /* ── Events ── */

        if (photo) {
            photo.addEventListener('click', function (e) {
                e.stopPropagation();
                if (!isZoomed) {
                    cacheBaseDimensions();
                    if (photoArea) { photoArea.style.flex = ''; }
                    photo.style.maxHeight = '';
                    isZoomed = true;
                    photo.classList.add('zoomed');
                    if (wrapper) { wrapper.classList.add('is-zoomed'); }
                    showMinimap(photo.src);
                    applyPan(e);
                } else {
                    resetZoom();
                    syncLayout();
                }
            });
        }

        if (photoArea) {
            var ticking = false;
            photoArea.addEventListener('mousemove', function (e) {
                if (!isZoomed || ticking) { return; }
                ticking = true;
                requestAnimationFrame(function () {
                    applyPan(e);
                    ticking = false;
                });
            });
        }

        if (modal) {
            modal.addEventListener('click', function (e) {
                if (e.target === modal || e.target === wrapper || e.target === photoArea) {
                    window.closeZoom();
                }
            });
        }

        document.addEventListener('keydown', function (e) {
            if (!modal || !modal.classList.contains('open')) { return; }
            if (e.key === 'Escape') { window.closeZoom(); }
            if (e.key === 'ArrowRight') { e.preventDefault(); window.changeModalImage(1); }
            if (e.key === 'ArrowLeft')  { e.preventDefault(); window.changeModalImage(-1); }
        });

        window.addEventListener('resize', function () {
            if (modal && modal.classList.contains('open') && !isZoomed) {
                syncLayout();
            }
        });

        /* ═══════════════════════════════════════════
           4c. DEEP LINK — compartir foto por URL hash
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
        window.changeModalImage = function (dir) {
            _origChangeHash(dir);
            if (photo) { _setHash(photo.src); }
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
