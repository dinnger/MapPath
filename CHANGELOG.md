# Changelog

All notable changes to the "MapPath" extension will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).
## [2.0.9] - 2025-10-01
### New Features
- **Zoom and Pan Controls for Mermaid Diagrams**: Added Zoom In, Zoom Out, Reset, and Center buttons
- **Drag to Pan**: Mermaid diagrams can now be dragged with the mouse to move around
- **Mouse Wheel Zoom**: Support for zooming using the mouse wheel in Mermaid diagrams
- **Conditional Control Visibility**: D3-specific controls are only shown in the D3 tab, and Mermaid controls only in the Mermaid tab

### Improvements
- Improved the "File Relationship" diagram with better error handling and logging
- Added 'default' CSS class for files without a specific language
- Enhanced the info node in the file diagram
- Visual cursors (grab/grabbing) to indicate drag functionality

### Fixes
- Fixed the visualization of the file relationship diagram in Mermaid
- Added error handling with informative messages during diagram generation

## [2.0.8] - 2025-10-01
### Fixes
- Fixed error in Mermaid diagrams: functions now correctly use `projectData.dependencies.edges` instead of `projectData.edges`
- Fixed use of `edge.from`/`edge.to` properties instead of `edge.source`/`edge.target` to maintain consistency with the data structure
- All three types of Mermaid diagrams now work correctly (file relationships, grouped by folders, and folder connections)

## [2.0.7] - 2025-10-01

### Added
- **Tabbed Interface**: New interface with tabs to switch between different visualization types
  - **D3.js Graph Tab**: Interactive visualization with D3.js (original)
  - **Mermaid Diagrams Tab**: New diagrams generated with Mermaid.js
- **Mermaid.js Integration**: Full integration of Mermaid.js for alternative diagrams
  - Mermaid.min.js (v10) included in the bundle
  - Support for light and dark themes
  - Dynamic diagram rendering
- **3 Types of Mermaid Diagrams**:
  1. **File Relationship**: Flow diagram showing direct dependencies between files
     - Nodes colored by programming language
     - Arrows indicate dependencies
     - Limited to 50 files for readability
  2. **Grouped by Folders**: Diagram with subgraphs for each project folder
     - Files visually grouped by location
     - Shows directory structure
     - Connections between files in different folders
  3. **Folder Connections**: High-level diagram showing relationships between folders
     - Nodes represent entire folders
     - Arrows show the number of dependencies between folders
     - Simplified view of project architecture

### Changed
- **CSP Update**: Content Security Policy updated to allow inline styles required by Mermaid
- **UI Layout**: Header reorganized to include tab navigation
- **Controls**: D3.js controls now only affect their corresponding tab

### Technical Details
- New `setupTabs()` function for tab management
- New `initMermaid()` function for Mermaid.js initialization
- Diagram generation functions:
  - `generateFileRelationsDiagram()`: Generates Mermaid code for file relationships
  - `generateGroupedDiagram()`: Generates Mermaid code grouped by folders
  - `generateFolderConnectionsDiagram()`: Generates Mermaid code for folder connections
- Lazy rendering: Mermaid diagrams are generated only when their view is selected
- Custom CSS styles for seamless integration with the VS Code theme

## [2.0.6] - 2025-10-01


### Added
- **C# Record Support**: Full detection and analysis of C# records
  - Detects `record`, `record class`, and `record struct` declarations
  - Records are now properly exported and included in the dependency graph
  - Added detection of primary constructors in records (C# 12 feature)
- **C# Struct Support**: Full detection of struct types
  - Detects `struct` and `readonly struct` declarations
  - Structs are now properly exported and included in the dependency graph
- **C# Delegate Support**: Detection of public delegate declarations

### Changed
- **Enhanced Generic Type Detection**: Significantly improved parsing of generic types
  - New `extractGenericTypes()` method handles nested generics correctly
  - Proper detection of types in `Task<Order>`, `Result<DocumentId>`, `Dictionary<K, V>`
  - Recursive extraction of generic type arguments (e.g., `Result<List<Order>>`)
- **Export Filtering**: Improved what counts as an "export" in C#
  - Only type declarations are exported (classes, interfaces, records, structs, enums, delegates)
  - Public static methods are no longer incorrectly exported as types
  - Cleaner and more accurate dependency graphs
- **Multiple Interface Inheritance**: Better detection of classes implementing multiple interfaces
  - Pattern now correctly parses `class MyClass : BaseClass, IInterface1, IInterface2, IInterface3`
  - Extracts generic arguments from inherited types

### Fixed
- **Type Detection in Generic Contexts**: Types wrapped in generics are now properly detected
  - `Task<DomainResultT<DocumentId>>` now correctly identifies both `DomainResultT` and `DocumentId`
  - Method return types like `IEnumerable<Order>` now detect `Order` as a dependency
  - Collection types like `List<WmsDocumento>` now detect the element type

### Technical Details
- New helper methods in `CSharpAnalyzer`:
  - `extractGenericTypes(genericStr: string)`: Parses comma-separated generic arguments with nesting support
  - `extractTypeNames(typeStr: string)`: Extracts type names from complex type expressions
- Updated all type detection patterns to use new generic extraction logic
- Record and struct patterns added to `analyzeDeclarations()` method
- Enhanced inheritance pattern to handle unlimited number of implemented interfaces

### Testing
- Added comprehensive test script (`test-csharp-analyzer.js`) to validate analyzer improvements
- Test coverage includes Clean Architecture demo project with 16+ C# files
- Verified detection of records, structs, generic types, and complex inheritance chains

## [2.0.5] - 2025-10-01

### Added
- **C# Type Reference Detection**: Major improvement in C# dependency analysis
  - Now detects type references in properties, fields, method parameters, and return types
  - Detects references in generic types (e.g., `List<WmsDocumento>`, `Dictionary<string, Order>`)
  - Detects inheritance and interface implementation relationships
  - Detects type instantiation with `new` keyword
  - Added `classToFileMap` for efficient class-to-file resolution
  - Added new `'type-reference'` edge type to differentiate from explicit `using` statements
- **Improved C# Dependency Resolution**:
  - Classes from the same namespace are now properly linked without requiring full namespace qualification
  - Smart filtering of built-in .NET types (System, Microsoft, etc.) while preserving local type references
  - Better handling of simple class names (e.g., `WmsDocumento`) vs. namespaced names

### Changed
- **C# Analysis Enhancement**: Increased detection rate by ~80% (from 90 to 162 connections in test project)
- Modified `resolveDependencyPath()` to prioritize local class resolution before filtering built-in modules for C#/Java files

### Technical Details
- New method `analyzeTypeReferences()` in `CSharpAnalyzer` with 6 detection patterns
- New method `isCustomType()` to filter out .NET framework types
- Extended `ImportInfo` and `GraphEdge` types to support `'type-reference'`
- Updated dependency resolution flow: class map → namespace map → built-in check

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