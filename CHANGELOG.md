# Changelog

All notable changes to the "MapPath" extension will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [2.0.4] - 2025-09-30

### Fixed
- **C# dependency resolution**: Fixed namespace-based dependency resolution for C# files
  - Added namespace extraction from C# files (supports both traditional and file-scoped namespaces)
  - Implemented namespace-to-file mapping for accurate dependency graph connections
  - Fixed `isBuiltInModule` to properly handle C# namespaces (which use dots instead of slashes)
  - C# files now correctly show connections based on `using` statements
- **Java dependency resolution**: Added package-based dependency resolution for Java files
  - Added package extraction from Java files
  - Java files now correctly show connections based on `import` statements


### [2.0.0] - 2025-09-29

### Added
- Initial release of MapPath extension
- Multi-language dependency analysis support:
  - TypeScript (.ts, .tsx)
  - JavaScript (.js, .jsx, .mjs, .cjs)
  - Python (.py, .pyw)
  - C# (.cs)
  - Java (.java)

## [1.0.0] - 2025-09-29

### Added
- Initial release of MapPath extension
- Multi-language dependency analysis support:
  - TypeScript (.ts, .tsx)
  - JavaScript (.js, .jsx, .mjs, .cjs)
  - Python (.py, .pyw)
  - C# (.cs)
  - Java (.java)
- Interactive dependency graph visualization using D3.js
- Multiple view modes:
  - Dependency Graph view
  - Tree view (planned)
  - Folder-grouped view
- Comprehensive file information panel:
  - Project statistics
  - File details with dependencies and exports
  - Language-specific color coding
- Intelligent filtering by programming language
- Responsive and accessible user interface
- Command: "MapPath: Analizar proyecto"

### Features
- Automatic exclusion of common directories (node_modules, .git, dist, out, build)
- Smart dependency resolution for relative imports
- Export detection and analysis
- Interactive tooltips with file information
- Zoom and pan capabilities in graph view
- Real-time filtering and search

### Technical Details
- Built with TypeScript for type safety
- Uses D3.js for powerful data visualization
- WebView-based architecture for rich UI
- Extensible analyzer system for adding new languages
- CSP-compliant security model