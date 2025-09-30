# MapPath - Visual Dependency Analyzer

[![Visual Studio Marketplace](https://img.shields.io/vscode-marketplace/v/dinnger.mappath.svg)](https://marketplace.visualstudio.com/items?itemName=dinnger.mappath)

MapPath es una extensión de Visual Studio Code que analiza y visualiza las dependencias de tu proyecto en un grafo interactivo, organizando los archivos por carpetas y mostrando las relaciones entre ellos.

## 🚀 Características

- **Análisis Multi-lenguaje**: Soporte para TypeScript, JavaScript, Python, C#, Java y más
- **Visualización Interactiva**: Grafo de dependencias navegable con D3.js
- **Organización por Carpetas**: Agrupa archivos por estructura de directorios
- **Información Detallada**: Muestra dependencias, exportaciones y estadísticas de archivos
- **Filtros Inteligentes**: Filtra por lenguaje de programación
- **Múltiples Vistas**: Grafo de dependencias, árbol de archivos y vista por carpetas

## 📦 Instalación

1. Abre Visual Studio Code
2. Ve a la vista de Extensiones (`Ctrl+Shift+X`)
3. Busca "MapPath"
4. Haz clic en "Instalar"

## 🎯 Uso

1. Abre un proyecto en VS Code
2. Abre la Paleta de Comandos (`Ctrl+Shift+P`)
3. Ejecuta el comando: `MapPath: Analizar proyecto`
4. ¡Explora las dependencias de tu proyecto!

## 🗺️ Características del Visor

### Vista de Grafo de Dependencias
- Nodos representan archivos
- Aristas muestran dependencias
- Colores diferenciados por lenguaje
- Zoom y pan interactivos
- Tooltip con información detallada

### Vista por Carpetas
- Organización visual por estructura de directorios
- Fácil navegación entre módulos
- Comprensión rápida de la arquitectura

### Panel de Información
- Estadísticas del proyecto
- Detalles del archivo seleccionado
- Lista de dependencias y exportaciones
- Leyenda de colores por lenguaje

## 🔧 Lenguajes Soportados

| Lenguaje | Extensiones | Características |
|----------|-------------|-----------------|
| TypeScript | `.ts`, `.tsx` | Imports, exports, interfaces, clases |
| JavaScript | `.js`, `.jsx`, `.mjs`, `.cjs` | Requires, imports, exports |
| Python | `.py`, `.pyw` | Imports, from imports, `__all__` |
| C# | `.cs` | Using statements, clases públicas |
| Java | `.java` | Import statements, clases públicas |

## ⚙️ Configuración

La extensión funciona inmediatamente sin configuración adicional. Automáticamente:
- Excluye directorios comunes como `node_modules`, `.git`, `dist`
- Detecta el lenguaje de programación por extensión de archivo
- Analiza solo archivos soportados

## 🤝 Contribución

¡Las contribuciones son bienvenidas! Para agregar soporte para nuevos lenguajes:

1. Crea un nuevo analizador en `src/analyzer/language/`
2. Implementa la interfaz `LanguageAnalyzer`
3. Registra the analyzer en `ProjectAnalyzer`
4. Actualiza los colores en el viewer CSS

## 📋 Requisitos

- Visual Studio Code v1.74.0 o superior
- Proyecto con archivos de código fuente soportados

## 🐛 Problemas Conocidos

- Los imports dinámicos pueden no ser detectados completamente
- Archivos muy grandes (>1MB) pueden ralentizar el análisis
- Dependencias circulares se muestran pero no se resaltan especialmente

## 📝 Cambios Recientes

### v1.0.0
- ✅ Lanzamiento inicial
- ✅ Soporte para TypeScript, JavaScript, Python, C#, Java
- ✅ Visualización interactiva con D3.js
- ✅ Vista por carpetas y grafo de dependencias
- ✅ Panel de información detallada

## 📄 Licencia

Este proyecto está licenciado bajo la Licencia ISC - ver el archivo LICENSE para detalles.

## 💡 Inspiración

MapPath fue inspirado por la necesidad de entender rápidamente la estructura y dependencias de proyectos complejos, especialmente útil para:
- Onboarding de nuevos desarrolladores
- Refactoring de código legacy
- Auditorías de arquitectura
- Documentación visual de proyectos

---

**¿Te gusta MapPath?** ⭐ ¡Dale una estrella en GitHub y deja una reseña en el Marketplace!