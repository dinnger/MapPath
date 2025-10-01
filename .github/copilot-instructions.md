# MapPath - VS Code Dependency Analyzer Extension

## Architecture Overview

MapPath is a VS Code extension that analyzes and visualizes code dependencies across multiple languages. The architecture follows a **three-layer pattern**:

1. **Extension Layer** (`src/extension.ts`) - VS Code command registration and webview orchestration
2. **Analysis Layer** (`src/analyzer/`) - Language-specific parsing and dependency extraction
3. **Visualization Layer** (`src/viewer/`) - D3.js-based graph rendering in webview

### Key Data Flow
```
User Command → ProjectAnalyzer.analyzeProject()
  → Language Analyzers (parallel file processing)
  → Dependency Graph Builder
  → WebView Provider → D3.js Visualization
```

## Core Components

### Language Analyzer Pattern
All language analyzers implement `LanguageAnalyzer` interface (`src/analyzer/language/base.ts`):
- Each analyzer (TypeScript, Python, C#, Java, JavaScript, Vue) extends the base interface
- Analyzers extract: dependencies, exports, functions, classes, variables
- Registration happens in `ProjectAnalyzer` constructor via `languageAnalyzers` Map

**Adding a new language:**
1. Create `src/analyzer/language/{language}Analyzer.ts` implementing `LanguageAnalyzer`
2. Register in `ProjectAnalyzer` constructor: `this.languageAnalyzers.set('ext', new YourAnalyzer())`
3. Add color mapping in `getLanguageColors()` method
4. Update viewer CSS with language-specific styles

### Dependency Resolution Strategy
The `ProjectAnalyzer.resolveDependencyPath()` method uses a **6-tier fallback system**:
1. TypeScript path aliases (from `tsconfig.json` `compilerOptions.paths`)
2. Vue/Vite aliases (framework-specific)
3. Relative paths (`./`, `../`)
4. Same-directory files (no prefix)
5. Subdirectory paths from current directory
6. Project root-relative paths

**Path resolution includes:**
- Extension inference (`.ts`, `.tsx`, `.js`, `.jsx`, etc.)
- `index.*` file detection in directories
- Built-in module filtering (Node.js, npm packages, framework libs)

### Configuration Loading
- `.gitignore` patterns are loaded and respected during file scanning (`loadGitignore()`)
- `tsconfig.json` is parsed for TypeScript path aliases (`loadTypeScriptConfig()`)
- Excluded directories: `node_modules`, `.git`, `dist`, `out`, `build` (hardcoded in `scanDirectory()`)

## Development Workflows

### Building
```bash
npm run compile     # One-time TypeScript compilation
npm run watch       # Watch mode for development
```
Output goes to `out/` directory (see `tsconfig.json` `outDir`).

### Testing Extension Locally
1. Press `F5` in VS Code to launch Extension Development Host
2. In the new window, open a test project
3. Run command: `MapPath: Analizar proyecto` (Ctrl+Shift+P)

### Packaging
```bash
npm run vscode:prepublish  # Compiles before packaging
vsce package               # Creates .vsix file
```

### Linting
```bash
npm run lint  # ESLint on src/ directory
```

## Project-Specific Conventions

### TypeScript Configuration
- Target: ES2020, CommonJS modules (VS Code extension requirement)
- Strict mode enabled
- Source maps for debugging
- Root directory: `src/`, Output: `out/`

### File Organization
- Language analyzers are **self-contained** - each handles its own parsing logic
- No shared regex utilities; patterns are duplicated per analyzer (trade-off for clarity)
- Type definitions centralized in `src/analyzer/types.ts`

### Webview Security
- CSP (Content Security Policy) enforced with nonces (`getNonce()` in `dependencyViewerProvider.ts`)
- Static resources (D3.js, CSS, JS) loaded via `webview.asWebviewUri()`
- No inline scripts; all JS in separate files with nonce verification

### Language-Specific Parsing Notes

**TypeScript/JavaScript:**
- Uses regex patterns, not AST parsing (deliberate choice for simplicity)
- Handles: ES6 imports, CommonJS require, dynamic imports, type imports
- Reference directives: `/// <reference path="..." />`

**Python:**
- Detects: `import`, `from...import`, relative imports (`.`)
- Exports via `__all__` list (explicit exports)

**C#:**
- Parses: `using` statements, public classes/interfaces/methods
- Only public members considered "exported"

**Java:**
- Parses: `import` statements, `package` declarations
- Public class detection

**Vue:**
- Extracts imports from `<script>` sections
- Component dependencies tracked

## Common Tasks

### Debugging Dependency Resolution
Enable debug logging by uncommenting console.log statements in `resolveDependencyPath()`. The method includes conditional logging for specific dependencies (e.g., `if (dependency.includes('embedding.service'))`).

### Extending Language Support
Example: Adding Go support
1. Create `src/analyzer/language/goAnalyzer.ts`
2. Implement regex patterns for `import "..."` statements
3. Add `this.languageAnalyzers.set('go', new GoAnalyzer())` in `ProjectAnalyzer`
4. Add color in `getLanguageColors()`: `'Go': '#00ADD8'`
5. Update `media/viewer.css` with `.legend-color.go` styles

### Modifying Graph Visualization
- D3.js code lives in `media/viewer.js` (injected into webview)
- Graph data passed via `window.projectData` from `dependencyViewerProvider.ts`
- Force simulation parameters tunable in viewer.js

## Integration Points

### VS Code APIs Used
- `vscode.commands.registerCommand()` - Command registration
- `vscode.window.createWebviewPanel()` - Visualization UI
- `vscode.window.withProgress()` - Progress indicator
- `vscode.workspace.workspaceFolders` - Project root detection

### External Dependencies
- `@typescript-eslint/typescript-estree` - TypeScript parsing utilities
- `acorn` + `acorn-walk` - JavaScript AST parsing (currently unused, regex-based instead)
- D3.js v7 (bundled in `media/d3.min.js`) - Graph visualization

### No Backend/Server
This extension is **purely client-side** - all analysis runs in the VS Code extension host process. No language servers, no external tools.

## Known Limitations

- Dynamic imports (`import(variable)`) not fully detected
- Circular dependencies visualized but not highlighted
- Files >1MB may slow analysis (no chunking/streaming)
- Regex-based parsing can miss edge cases (trade-off for no AST dependencies)
