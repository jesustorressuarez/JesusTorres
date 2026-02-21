/**
 * JESUS TORRES - SCRIPTS 
 * Organizado y optimizado
 */



/* --- 7. LOADER ANIMATION --- */
    window.addEventListener("load", () => {
        const logo = document.querySelector(".logo");
        const text = document.querySelector(".loader-text");
        const loader = document.getElementById("loader");
        const content = document.getElementById("content");

        if (loader) {
            if (logo) setTimeout(() => logo.classList.add("show"), 300);

            setTimeout(() => {
                if (logo) {
                    logo.classList.remove("show");
                    logo.classList.add("exit");
                }
                if (text) text.classList.add("show");
            }, 1500);

            setTimeout(() => {
                loader.classList.add("fade-out");
                if (content) content.classList.add("show");
            }, 2500);

            setTimeout(() => loader.remove(), 3800);
        }
    });







document.addEventListener('DOMContentLoaded', () => {

    /* --- 1. INICIALIZAR LENIS (SCROLL SUAVE) --- */
    const lenis = new Lenis({
    duration: 1.2,
    easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
    direction: 'vertical', 
    gestureDirection: 'vertical',
    smoothWheel: true,
    // Esto ayuda a estabilizar el scroll al llegar a los límites
    wheelMultiplier: 1, 
    });

    function raf(time) {
        lenis.raf(time);
        requestAnimationFrame(raf);
    }
    requestAnimationFrame(raf);

    // Scroll suave para enlaces internos
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function (e) {
            e.preventDefault();
            const target = this.getAttribute('href');
            if (target !== "#") lenis.scrollTo(target);
        });
    });









    /* --- 2. MENÚ HAMBURGUESA --- */
    const burger = document.getElementById('burger');
    const mobileMenu = document.getElementById('mobileMenu');

    if (burger && mobileMenu) {
        burger.addEventListener('click', () => {
            const isActive = burger.classList.toggle('active');
            mobileMenu.classList.toggle('active');
            
            // Si el menú está abierto, detenemos el scroll de Lenis
            if (isActive) {
                lenis.stop();
            } else {
                lenis.start();
            }
        });

        // Cerrar menú al hacer clic en enlaces
        mobileMenu.querySelectorAll('a').forEach(link => {
            link.addEventListener('click', () => {
                burger.classList.remove('active');
                mobileMenu.classList.remove('active');
                lenis.start();
            });
        });
    }





    /*ANIMACIÖN FOOTER*/


    const words = ["Arquitecto", "Bim Manager", "Fotógrafo amateur"];
    const rotatorContainer = document.querySelector('.word-rotator');

    // Crear un span para cada palabra y añadirlo al contenedor
    words.forEach((word, index) => {
        const span = document.createElement('span');
        span.classList.add('rotating-word');
        span.textContent = word;
        // Ajustamos el animation-delay directamente aquí para mayor flexibilidad
        span.style.animationDelay = `${index * 2}s`; // 2 segundos por palabra
        rotatorContainer.appendChild(span);
    });







    /* --- 3. SELECTOR DE IDIOMAS --- */
    const langLinks = document.querySelectorAll('.lang-selector a');

    langLinks.forEach(link => {
        link.addEventListener('click', (e) => {
            // Evitamos el comportamiento por defecto para manejar la ruta nosotros
            e.preventDefault();

            // 1. Manejo visual de clases active
            const selectedLangText = link.textContent.trim();
            langLinks.forEach(l => l.classList.remove('active'));
            langLinks.forEach(l => {
                if (l.textContent.trim() === selectedLangText) l.classList.add('active');
            });

            // 2. Lógica de redirección de carpetas
            const pathParts = window.location.pathname.split('/');
            const currentFile = pathParts[pathParts.length - 1] || 'index.html';
            const targetLang = selectedLangText.toLowerCase();

            // Construimos la ruta asumiendo estructura: ../lang/archivo.html
            const newPath = `../${targetLang}/${currentFile}`;
            window.location.href = newPath;
        });
    });












    
    /* --- 4. VARIABLE FONT ANIMATION (FOOTER) 
    document.querySelectorAll('.js-variable-text').forEach(el => {
        const text = el.textContent.trim();
        el.textContent = '';
        const words = text.split(' ');

        words.forEach((word, wordIndex) => {
            const wordSpan = document.createElement('span');
            wordSpan.className = 'word';

            [...word].forEach(char => {
                const charSpan = document.createElement('span');
                charSpan.className = 'char';
                charSpan.textContent = char;
                wordSpan.appendChild(charSpan);
            });

            el.appendChild(wordSpan);
            if (wordIndex < words.length - 1) {
                el.appendChild(document.createTextNode(' '));
            }
        });
    });


    --- */


}); // FIN DOMCONTENTLOADED


/* --- 6. FUNCIONES GLOBALES (FUERA DEL DOM LOAD) --- */
    




/* --- 5. CARROUSEL --- */

const track = document.getElementById('track');
const dotsContainer = document.getElementById('dots-container');
const slides = document.querySelectorAll('.slide img');
const modal = document.getElementById('zoomModal');
const imgZoom = document.getElementById('imgZoom');
const zoomWrapper = document.getElementById('zoomWrapper');

let currentIdx = 0;
let isZoomed = false;

// Inicializar Dots
if (track && dotsContainer) {
    slides.forEach((_, i) => {
        const dot = document.createElement('div');
        dot.classList.add('dot');
        if (i === 0) dot.classList.add('active');
        dot.onclick = () => track.scrollTo({ left: slides[i].offsetLeft, behavior: 'smooth' });
        dotsContainer.appendChild(dot);
    });
    track.onscroll = () => {
        const index = Math.round(track.scrollLeft / track.offsetWidth);
        document.querySelectorAll('.dot').forEach((d, i) => d.classList.toggle('active', i === index));
    };
}


function moveSlide(dir) {
    track.scrollBy({ left: track.offsetWidth * dir, behavior: 'smooth' });
}

// Abrir Modal
function openZoom(src) {
    currentIdx = Array.from(slides).findIndex(img => img.src === src);
    imgZoom.src = src;
    modal.style.display = "flex";
    resetZoom();
}

// Cerrar Modal
function closeZoom() {
    modal.style.display = "none";
    resetZoom();
}

// Resetear estado de la imagen
function resetZoom() {
    isZoomed = false;
    imgZoom.style.transform = "scale(1)";
    imgZoom.style.transformOrigin = "center center";
    imgZoom.classList.remove('active-zoom');
}

// Zoom interactivo (Clic + Movimiento)
zoomWrapper.onclick = (e) => {
    e.stopPropagation();
    isZoomed = !isZoomed;
    if (isZoomed) {
        imgZoom.style.transform = "scale(2.5)";
        imgZoom.classList.add('active-zoom');
        updateZoomPos(e);
    } else {
        resetZoom();
    }
};

zoomWrapper.onmousemove = (e) => {
    if (isZoomed) updateZoomPos(e);
};

function updateZoomPos(e) {
    const { left, top, width, height } = zoomWrapper.getBoundingClientRect();
    const x = ((e.clientX - left) / width) * 100;
    const y = ((e.clientY - top) / height) * 100;
    imgZoom.style.transformOrigin = `${x}% ${y}%`;
}

// Navegación interna
function changeModalImage(dir, event) {
    if (event) event.stopPropagation();
    currentIdx = (currentIdx + dir + slides.length) % slides.length;
    imgZoom.src = slides[currentIdx].src;
    resetZoom();
}

// Teclado
document.onkeydown = (e) => {
    if (modal.style.display === "flex") {
        if (e.key === "Escape") closeZoom();
        if (e.key === "ArrowRight") changeModalImage(1);
        if (e.key === "ArrowLeft") changeModalImage(-1);
    }
};







/* RETURN TO TOP*/

function scrollToTop() {
window.scrollTo({
    top: 0,
    behavior: "smooth"
});
}






































/*ERROR FORMULARIO*/

document.addEventListener("DOMContentLoaded", function() {
    const form = document.getElementById('contactForm');
    const inputs = form.querySelectorAll('input, textarea');

    form.addEventListener('submit', function (e) {
        let isValid = true;

        inputs.forEach(input => {
            const group = input.parentElement;
            
            // Validación: ¿Está vacío? o ¿Es un email mal escrito?
            const isEmailInvalid = input.type === 'email' && !validateEmail(input.value);
            const isEmpty = input.value.trim() === "";

            if (isEmpty || isEmailInvalid) {
                e.preventDefault(); // Bloquea el envío a Formspree
                group.classList.add('error');
                isValid = false;
            } else {
                group.classList.remove('error');
            }
        });
    });

    // Limpiar el estado de error mientras el usuario corrige el campo
    inputs.forEach(input => {
        input.addEventListener('input', () => {
            if (input.value.trim() !== "") {
                input.parentElement.classList.remove('error');
            }
        });
    });

    function validateEmail(email) {
        const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return re.test(email);
    }
});










/*COPIAR EN EL PORTAPAPELES*/

function copiarEmail(event) {
    // 1. Evita que el clic active el enlace del botón grande
    event.stopPropagation();
    event.preventDefault();

    const emailElemento = event.target;
    const textoOriginal = emailElemento.innerText;

    // 2. Copia al portapapeles
    navigator.clipboard.writeText(textoOriginal).then(() => {
        // 3. Feedback visual opcional
        emailElemento.innerText = "¡Copiado!";
        emailElemento.style.color = "#28a745"; // Cambia a verde momentáneamente

        setTimeout(() => {
            emailElemento.innerText = textoOriginal;
            emailElemento.style.color = ""; // Vuelve al color original
        }, 1500);
    }).catch(err => {
        console.error('Error al copiar: ', err);
    });
}







/*GALERIA*/
