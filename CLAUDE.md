# Web Personal de Jesús Torres

Web personal de Jesús Torres, arquitecto especializado en BIM.
Publicada con GitHub Pages en: https://jesustorressuarez.github.io/JesusTorres/es/index.html

## Repositorio

- **URL**: https://github.com/jesustorressuarez/JesusTorres
- **Rama principal**: `main` (GitHub Pages sirve desde aquí)
- **Tecnología**: HTML + CSS + JS vanilla (sin frameworks ni bundlers)
- **Colaboradores**: jesustorressuarez, javiexe

## Comandos Git habituales

```bash
# Actualizar repo local con los últimos cambios de main
git checkout main
git pull origin main

# Crear una rama nueva para trabajar
git checkout -b feature/nombre-descriptivo

# Ver estado de los cambios
git status
git diff

# Hacer commit
git add archivo1.html archivo2.css
git commit -m "feat: descripción corta del cambio"

# Subir la rama al remoto (primera vez)
git push -u origin feature/nombre-descriptivo

# Subir cambios posteriores
git push

# Volver a main y actualizar
git checkout main
git pull origin main
```

## Workflow de desarrollo

1. Asegurarse de estar en `main` actualizado: `git pull origin main`
2. Crear rama: `git checkout -b feature/nombre-rama`
3. Editar archivos (solo en `/es/` hasta nuevo aviso)
4. Hacer commit(s) descriptivo(s)
5. Push de la rama al remoto
6. Crear Pull Request en GitHub desde la rama hacia `main`
7. Revisar y mergear la PR para publicar en GitHub Pages

## Estructura de archivos

```
JesusTorres/
├── index.html                 ← Redirect → /es/index.html
├── CLAUDE.md                  ← Este archivo (instrucciones del proyecto)
├── assets/
│   ├── scripts.js             ← JS único (IIFE, ~310 líneas)
│   ├── styles.css             ← CSS principal (~1300 líneas)
│   ├── stylesmenu.css         ← Header, nav, burger, mobile menu, lang selector
│   ├── stylesabout.css        ← Estilos de about.html
│   └── img/                   ← Imágenes (.avif, .webp, .png)
├── es/                        ← Versión española (PRINCIPAL)
│   ├── index.html             ← Home (4 columnas interactivas)
│   ├── about.html             ← Sobre mí
│   ├── work.html              ← Portfolio
│   ├── photos.html            ← Álbumes fotográficos
│   ├── contact.html           ← Formulario (Formspree)
│   ├── works/                 ← Fichas de proyectos
│   └── photos/                ← Galerías de fotos
├── en/, de/, it/              ← Otros idiomas (no tocar hasta que se pida)
```

## Reglas importantes

- **Solo editar `/es/`**: Trabajar únicamente en la versión española. Los demás idiomas (EN, DE, IT) se traducirán y actualizarán todos a la vez cuando se pida.
- **No tocar el logo**: Las 12 etiquetas `<p>` del logo tienen kerning manual con `margin-left` inline. Es intencional, no modificar.
- **Lenis (scroll suave)**: Se inicializa en un `<script>` inline en cada página HTML, antes de `scripts.js`. En `scripts.js` se accede como variable global `lenis`.
- **Imágenes**: `.avif` para fotos, `.webp` para portadas de álbum, `.png` para proyectos. Usar `loading="lazy"` en imágenes de contenido.
- **Formulario de contacto**: Usa Formspree. Actualmente tiene un placeholder en el `action` (`TU_EMAIL_AQUI`), no es funcional todavía.

## Arquitectura CSS

### Variables principales (:root)
```css
--General-400: #262626;   /* Texto principal */
--General-300: #5B5A5A;   /* Texto secundario */
--General-200: #8D8D8D;   /* Texto terciario */
--General-150: #dadada;   /* Bordes */
--General-100: #f2f2f2;   /* Fondo */
--radius: 14px;            /* Border-radius estándar */
```

### Breakpoints
- **768px** → Mobile (grid 1 col, burger visible)
- **1920px** → Pantallas grandes (clamp en fonts, grid-variable 3 cols)

### Organización de styles.css
Reset → Custom Properties → Lenis → Logo → Tipografía → Layout (grid-12) → Home → Footer → Breadcrumb → Cards → Hero → Carousel → Modal zoom → Formulario → Galería → @media queries

## Arquitectura JavaScript (scripts.js)

- Patrón IIFE, un solo `DOMContentLoaded`
- Funciones globales (en `window`): `openZoom`, `closeZoom`, `moveSlide`, `changeModalImage`, `scrollToTop`, `copiarEmail`
- Carousel: scroll snap nativo + dots generados por JS
- Zoom modal: pan con throttle vía `requestAnimationFrame`, `ZOOM_SCALE = 2.5`
- Word rotator: genera `<span class="rotating-word">` dinámicamente

## Convenciones de commits

Usar prefijos descriptivos:
- `feat:` → Nueva funcionalidad o contenido
- `fix:` → Corrección de bugs
- `style:` → Cambios de CSS/diseño sin afectar funcionalidad
- `refactor:` → Reestructuración de código
- `docs:` → Documentación
- `chore:` → Tareas de mantenimiento

## Recursos externos

- **Figma (copys aprobados)**: Frame "COPYS BUENOS" en la página "COPYs" del archivo "Components / foundations"
- **Fotos profesionales**: carpeta `WEB/ABOUT/` del workspace
- **Fotos para galerías**: carpeta `WEB/FOTOGRAFIAS/` del workspace
- **Copys de referencia**: `WEB/COPYS.docx` del workspace

## Bugs conocidos / Pendientes

- [ ] Formulario de contacto con action placeholder (no funcional)
- [ ] Lorem ipsum en ficha de "Diálogo Generacional"
- [ ] Solo 2 proyectos en el portfolio
- [ ] Algunos enlaces rotos en submenús de works/ y photos/ (apuntan a `#`)
- [ ] No hay enlace visible para descargar el CV
