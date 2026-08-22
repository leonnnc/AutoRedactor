<div align="center">

<img src="public/icon-512.jpg" width="120" alt="AutoRedactor logo" />

# ✨ AutoRedactor

**Editor profesional de diapositivas para prédicas e iglesias**  
Crea, personaliza y exporta presentaciones bíblicas — en segundos.

[![Version](https://img.shields.io/badge/versión-3.5.0-6366f1?style=for-the-badge)](https://github.com/leonnnc/AutoRedactor/releases)
[![Live Demo](https://img.shields.io/badge/🌐_Demo_en_vivo-GitHub_Pages-0ea5e9?style=for-the-badge)](https://leonnnc.github.io/AutoRedactor/)
[![React](https://img.shields.io/badge/React-19-61dafb?style=for-the-badge&logo=react)](https://react.dev)
[![Tauri](https://img.shields.io/badge/Tauri-2-ffc131?style=for-the-badge&logo=tauri)](https://tauri.app)
[![PWA](https://img.shields.io/badge/PWA-Instalable-a855f7?style=for-the-badge)](https://leonnnc.github.io/AutoRedactor/)

</div>

---

## ¿Qué es AutoRedactor?

**AutoRedactor** es una aplicación web progresiva (PWA) y de escritorio para Windows diseñada para iglesias, pastores y líderes de alabanza que necesitan preparar **diapositivas de prédicas y versículos bíblicos** de manera rápida, visual y profesional.

Escribe o pega el texto de tu prédica, y la aplicación lo divide automáticamente en diapositivas listas para proyectar, con control total sobre diseño, tipografía, fondos e imágenes.

> **Sin suscripciones. Sin límites. 100% gratis y de código abierto.**

---

## Demo en vivo

**[https://leonnnc.github.io/AutoRedactor/](https://leonnnc.github.io/AutoRedactor/)**

Funciona directamente en el navegador. También puedes instalarlo como app de escritorio (ver más abajo).

---

## Características principales

### Editor de Prédicas
- **Parseo automático de texto**: Pega el texto de tu prédica y la app lo divide en diapositivas automáticamente por párrafos o frases.
- **Búsqueda bíblica integrada**: Busca versículos en la Biblia (RVR 1960) y agrégalos con un clic.
- **Añadir todos de una vez**: Agrega múltiples versículos a todas tus diapositivas en un solo botón.

### Editor Visual (Canvas)
- **Imágenes Arrastrar y Soltar (Drag & Drop)**: Arrastra fotos, logos e ilustraciones desde tu explorador de archivos directamente a la diapositiva, o pégalas con `Ctrl + V`.
- **Lienzo interactivo**: Arrastra, redimensiona y personaliza elementos de texto e imagen sobre la diapositiva.
- **Barra de herramientas flotante**: Controles rápidos para texto (fuente, tamaño, color, formato, alineación) e imágenes (ajuste contain/cover, bordes redondeados, sombra flotante, opacidad y reemplazo).
- **Zoom con la rueda del mouse**: Acerca y aleja el lienzo (25% – 300%) para editar con precisión.
- **Reglas de precisión (estilo Office)**: Reglas horizontal y vertical pegadas a los bordes del espacio de trabajo, con el 0 en el centro.
- **Indicador de resolución**: Muestra las dimensiones exactas del lienzo en píxeles.

### Fondos de Diapositiva
- **Fondo único**: Color sólido, gradiente o imagen con control de posición, tamaño y blur.
- **Doble fondo (Split Background)**: Divide la diapositiva en dos paneles con fondos independientes.
  - Dirección horizontal o vertical.
  - Arrastra el divisor para mover la separación en tiempo real.
  - 5 estilos de división: Limpio, Sombra, Borde, Suave, Diagonal.
- **Efectos**: Overlay de color, gradiente, viñeta y sombra interior.
- **Sombra de texto**: Color y desenfoque para todos los elementos.

### Formatos de Salida
- **Modos de visualización**: Escritorio (16:9), Tableta (4:3), Móvil (9:16) y tamaño personalizado.
- **Exportación PDF**: Todas las diapositivas en un archivo PDF de alta calidad.
- **Exportación PPTX**: Compatible con Microsoft PowerPoint.
- **Exportación ZIP**: Cada diapositiva como imagen PNG individual.
- **Vista previa en tiempo real**: Miniaturas actualizadas mientras editas.

### Instalación como App
- **PWA**: Instálala desde Chrome o Edge con el botón **📥 Instalar**. Funciona sin internet.
- **App nativa para Windows (.exe / .msi)**: Instalador real generado con Tauri (~10 MB).

---

## Instalación y uso

### Opción 1 — En el navegador (sin instalar nada)

1. Ve a **[https://leonnnc.github.io/AutoRedactor/](https://leonnnc.github.io/AutoRedactor/)**
2. ¡Listo! No necesitas cuenta ni descarga.

### Opción 2 — Instalar como PWA

1. Abre la demo en **Chrome o Edge**.
2. Haz clic en el botón **📥 Instalar** en la app o en la barra de direcciones.
3. La app quedará en tu menú inicio. **Funciona sin internet.**

### Opción 3 — Instalador nativo para Windows

Descarga desde [Releases](https://github.com/leonnnc/AutoRedactor/releases):

- `AutoRedactor_3.5.0_x64_en-US.msi` — Instalador MSI (recomendado)
- `AutoRedactor_3.5.0_x64-setup.exe` — Instalador con asistente

---

## Desarrollo local

### Pre-requisitos

- [Node.js 20+](https://nodejs.org/)
- [Git](https://git-scm.com/)
- Para compilar la app de escritorio: [Rust](https://rustup.rs/)

### Pasos

```bash
# 1. Clonar el repositorio
git clone https://github.com/leonnnc/AutoRedactor.git
cd AutoRedactor

# 2. Instalar dependencias
npm install

# 3. Iniciar servidor de desarrollo
npm run dev
# Abre http://localhost:5173

# 4. Compilar para producción (web)
npm run build

# 5. Compilar app de escritorio para Windows
npm run tauri:build
# Los instaladores quedan en src-tauri/target/release/bundle/
```

---

## Tecnologías utilizadas

| Tecnología | Propósito |
|---|---|
| React 19 | Interfaz de usuario |
| TypeScript | Tipado estático |
| Vite 8 | Bundler ultra-rápido |
| Tauri 2 | App nativa de escritorio para Windows |
| vite-plugin-pwa | Soporte PWA instalable |
| html2canvas | Renderizado para exportar diapositivas |
| jsPDF | Exportación a PDF |
| PptxGenJS | Exportación a PowerPoint |
| JSZip | Exportación en ZIP de imágenes |
| lucide-react | Íconos |
| GitHub Actions | Deploy automático a GitHub Pages y FTP |

---

## Estructura del proyecto

```
AutoRedactor/
├── src/
│   ├── components/
│   │   ├── CanvasEditor.tsx      # Editor visual con zoom, reglas y drag & drop
│   │   ├── EditorPanel.tsx       # Panel de fondos, efectos y exportación
│   │   ├── SermonInputPanel.tsx  # Entrada de texto y búsqueda bíblica
│   │   ├── SlidePreview.tsx      # Miniaturas de diapositivas
│   │   └── Ruler.tsx             # Reglas horizontal y vertical
│   ├── utils/
│   │   ├── captureSlide.ts       # Lógica de exportación con soporte de imágenes
│   │   └── parseSermon.ts        # Parser de texto a diapositivas
│   ├── types.ts                  # Tipos TypeScript compartidos
│   └── index.css                 # Estilos globales (dark theme)
├── src-tauri/                    # App de escritorio (Tauri/Rust)
│   ├── tauri.conf.json           # Configuración de ventana y bundle
│   └── src/main.rs               # Punto de entrada nativo
├── public/
│   └── bibles/                   # Biblia RVR 1960 en JSON
└── .github/workflows/
    ├── gh-pages.yml              # CI/CD automático a GitHub Pages
    └── deploy-ftp.yml            # CI/CD automático a Hosting FTP
```

---

## Hoja de ruta

- [x] Editor de canvas con drag and drop
- [x] Imágenes flotantes arrastrar y soltar (Drag & Drop y Ctrl + V)
- [x] Fondos duales con 5 estilos de división
- [x] Búsqueda bíblica integrada (RVR 1960)
- [x] Exportación PDF, PPTX y ZIP
- [x] Zoom con rueda del mouse
- [x] Reglas de precisión estilo Office
- [x] PWA instalable sin internet
- [x] App nativa para Windows (Tauri)
- [ ] Soporte para más versiones bíblicas (NVI, NTV, LBLA)
- [ ] Plantillas prediseñadas
- [ ] Historial de cambios (deshacer/rehacer)
- [ ] Sincronización en la nube

---

## Contribuir

¡Las contribuciones son bienvenidas!

1. Haz un fork del repositorio.
2. Crea una rama: `git checkout -b feature/mi-nueva-funcion`
3. Confirma tus cambios: `git commit -m "feat: descripción"`
4. Empuja tu rama: `git push origin feature/mi-nueva-funcion`
5. Abre un Pull Request.

---

## Licencia

Este proyecto está bajo la licencia **MIT**. Úsalo, modifícalo y distribúyelo libremente.

---

<div align="center">

Hecho con ❤️ para la iglesia

**[Demo en vivo](https://leonnnc.github.io/AutoRedactor/)** · **[Reportar un error](https://github.com/leonnnc/AutoRedactor/issues)** · **[Sugerir una función](https://github.com/leonnnc/AutoRedactor/issues)**

</div>
