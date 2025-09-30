import { LanguageAnalyzer, AnalysisResult, ImportInfo } from './base';

export class PythonAnalyzer implements LanguageAnalyzer {
    
    getSupportedExtensions(): string[] {
        return ['py', 'pyw'];
    }

    async analyze(content: string, filePath: string): Promise<AnalysisResult> {
        const dependencies: string[] = [];
        const exports: string[] = [];
        const imports: ImportInfo[] = [];
        const functions: string[] = [];
        const classes: string[] = [];
        const variables: string[] = [];

        this.analyzeImports(content, dependencies, imports);
        this.analyzeDeclarations(content, functions, classes, variables);
        this.analyzeExports(content, exports, functions, classes, variables);

        return {
            dependencies,
            exports,
            imports,
            functions,
            classes,
            variables
        };
    }

    private analyzeImports(content: string, dependencies: string[], imports: ImportInfo[]): void {
        const patterns = [
            // import module
            /^import\s+([^\s#]+)/gm,
            // from module import ...
            /^from\s+([^\s#]+)\s+import/gm,
            // import module as alias
            /^import\s+([^\s#]+)\s+as\s+\w+/gm
        ];

        patterns.forEach(pattern => {
            let match;
            while ((match = pattern.exec(content)) !== null) {
                const modulePath = match[1];
                const lineNumber = this.getLineNumber(content, match.index);
                
                // Convertir imports relativos de Python
                const isRelative = modulePath.startsWith('.');
                
                dependencies.push(modulePath);
                imports.push({
                    module: modulePath,
                    type: 'import',
                    line: lineNumber,
                    isRelative
                });
            }
        });
    }

    private analyzeDeclarations(content: string, functions: string[], classes: string[], variables: string[]): void {
        // Funciones
        const functionPattern = /^(?:\s*)def\s+(\w+)\s*\(/gm;
        let match;
        while ((match = functionPattern.exec(content)) !== null) {
            functions.push(match[1]);
        }

        // Clases
        const classPattern = /^(?:\s*)class\s+(\w+)(?:\([^)]*\))?:/gm;
        while ((match = classPattern.exec(content)) !== null) {
            classes.push(match[1]);
        }

        // Variables globales (asignaciones en nivel de módulo)
        const variablePattern = /^(\w+)\s*=(?!=)/gm;
        while ((match = variablePattern.exec(content)) !== null) {
            const varName = match[1];
            // Excluir palabras clave y funciones/clases ya identificadas
            if (!['def', 'class', 'import', 'from', 'if', 'for', 'while', 'try', 'with', 'return'].includes(varName) &&
                !functions.includes(varName) && !classes.includes(varName)) {
                variables.push(varName);
            }
        }
    }

    private analyzeExports(content: string, exports: string[], functions: string[], classes: string[], variables: string[]): void {
        // En Python, los exports son implícitos (todo lo público)
        // Verificar si hay __all__
        const allPattern = /__all__\s*=\s*\[([^\]]+)\]/;
        const allMatch = content.match(allPattern);
        
        if (allMatch) {
            // Si hay __all__, usar solo esos
            const allItems = allMatch[1].split(',').map(item => {
                return item.trim().replace(/['"]/g, '');
            });
            exports.push(...allItems);
        } else {
            // Si no hay __all__, exportar todo lo público (que no empiece con _)
            [...functions, ...classes, ...variables].forEach(name => {
                if (!name.startsWith('_')) {
                    exports.push(name);
                }
            });
        }
    }

    private getLineNumber(content: string, index: number): number {
        return content.substring(0, index).split('\n').length;
    }
}