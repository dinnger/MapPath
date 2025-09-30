import { LanguageAnalyzer, AnalysisResult, ImportInfo } from './base';

export class TypeScriptAnalyzer implements LanguageAnalyzer {
    
    getSupportedExtensions(): string[] {
        return ['ts', 'tsx'];
    }

    async analyze(content: string, filePath: string): Promise<AnalysisResult> {
        const dependencies: string[] = [];
        const exports: string[] = [];
        const imports: ImportInfo[] = [];
        const functions: string[] = [];
        const classes: string[] = [];
        const variables: string[] = [];

        // Analizar imports/requires
        this.analyzeImports(content, dependencies, imports);
        
        // Analizar exports
        this.analyzeExports(content, exports);
        
        // Analizar declaraciones
        this.analyzeDeclarations(content, functions, classes, variables);

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
        // Patrones para diferentes tipos de import
        const patterns = [
            // import ... from '...'
            /import\s+(?:(?:\{[^}]*\}|\*\s+as\s+\w+|\w+)(?:\s*,\s*(?:\{[^}]*\}|\*\s+as\s+\w+|\w+))*\s+from\s+)?['"]([^'"]+)['"]/g,
            // import('...')
            /import\s*\(\s*['"]([^'"]+)['"]\s*\)/g,
            // require('...')
            /require\s*\(\s*['"]([^'"]+)['"]\s*\)/g,
            // /// <reference path="..." />
            /\/\/\/\s*<reference\s+path\s*=\s*['"]([^'"]+)['"]/g
        ];

        const lines = content.split('\n');
        
        patterns.forEach(pattern => {
            let match;
            while ((match = pattern.exec(content)) !== null) {
                const modulePath = match[1];
                const lineNumber = this.getLineNumber(content, match.index);
                
                dependencies.push(modulePath);
                imports.push({
                    module: modulePath,
                    type: 'import',
                    line: lineNumber,
                    isRelative: modulePath.startsWith('./') || modulePath.startsWith('../')
                });
            }
        });
    }

    private analyzeExports(content: string, exports: string[]): void {
        const patterns = [
            // export function/class/const/let/var name
            /export\s+(?:function|class|const|let|var)\s+(\w+)/g,
            // export default
            /export\s+default\s+(?:function\s+(\w+)|class\s+(\w+)|(\w+))/g,
            // export { name }
            /export\s*\{\s*([^}]+)\s*\}/g
        ];

        patterns.forEach(pattern => {
            let match;
            while ((match = pattern.exec(content)) !== null) {
                // El nombre puede estar en diferentes grupos de captura
                const name = match[1] || match[2] || match[3];
                if (name) {
                    if (name.includes(',')) {
                        // Múltiples exports en {}
                        name.split(',').forEach(n => {
                            const clean = n.trim().split(' as ')[0];
                            if (clean) exports.push(clean);
                        });
                    } else {
                        exports.push(name);
                    }
                }
            }
        });
    }

    private analyzeDeclarations(content: string, functions: string[], classes: string[], variables: string[]): void {
        // Funciones
        const functionPattern = /(?:export\s+)?(?:async\s+)?function\s+(\w+)/g;
        let match;
        while ((match = functionPattern.exec(content)) !== null) {
            functions.push(match[1]);
        }

        // Clases
        const classPattern = /(?:export\s+)?class\s+(\w+)/g;
        while ((match = classPattern.exec(content)) !== null) {
            classes.push(match[1]);
        }

        // Variables (const, let, var)
        const variablePattern = /(?:export\s+)?(?:const|let|var)\s+(\w+)/g;
        while ((match = variablePattern.exec(content)) !== null) {
            variables.push(match[1]);
        }

        // Arrow functions
        const arrowFunctionPattern = /(?:export\s+)?(?:const|let|var)\s+(\w+)\s*=\s*(?:async\s+)?\([^)]*\)\s*=>/g;
        while ((match = arrowFunctionPattern.exec(content)) !== null) {
            functions.push(match[1]);
        }
    }

    private getLineNumber(content: string, index: number): number {
        return content.substring(0, index).split('\n').length;
    }
}