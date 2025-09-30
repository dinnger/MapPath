import { LanguageAnalyzer, AnalysisResult, ImportInfo } from './base';

export class JavaScriptAnalyzer implements LanguageAnalyzer {
    
    getSupportedExtensions(): string[] {
        return ['js', 'jsx', 'mjs', 'cjs'];
    }

    async analyze(content: string, filePath: string): Promise<AnalysisResult> {
        const dependencies: string[] = [];
        const exports: string[] = [];
        const imports: ImportInfo[] = [];
        const functions: string[] = [];
        const classes: string[] = [];
        const variables: string[] = [];

        this.analyzeImports(content, dependencies, imports);
        this.analyzeExports(content, exports);
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
        const patterns = [
            // require('...')
            /require\s*\(\s*['"]([^'"]+)['"]\s*\)/g,
            // import ... from '...'
            /import\s+(?:(?:\{[^}]*\}|\*\s+as\s+\w+|\w+)(?:\s*,\s*(?:\{[^}]*\}|\*\s+as\s+\w+|\w+))*\s+from\s+)?['"]([^'"]+)['"]/g,
            // import('...')
            /import\s*\(\s*['"]([^'"]+)['"]\s*\)/g
        ];

        patterns.forEach(pattern => {
            let match;
            while ((match = pattern.exec(content)) !== null) {
                const modulePath = match[1];
                const lineNumber = this.getLineNumber(content, match.index);
                
                dependencies.push(modulePath);
                imports.push({
                    module: modulePath,
                    type: pattern.source.includes('require') ? 'require' : 'import',
                    line: lineNumber,
                    isRelative: modulePath.startsWith('./') || modulePath.startsWith('../')
                });
            }
        });
    }

    private analyzeExports(content: string, exports: string[]): void {
        const patterns = [
            // module.exports = ...
            /module\.exports\s*=\s*(\w+)/g,
            // exports.name = ...
            /exports\.(\w+)\s*=/g,
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
                const name = match[1] || match[2] || match[3];
                if (name) {
                    if (name.includes(',')) {
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
        const functionPatterns = [
            /(?:export\s+)?(?:async\s+)?function\s+(\w+)/g,
            /(?:const|let|var)\s+(\w+)\s*=\s*(?:async\s+)?function/g,
            /(?:const|let|var)\s+(\w+)\s*=\s*(?:async\s+)?\([^)]*\)\s*=>/g
        ];

        functionPatterns.forEach(pattern => {
            let match;
            while ((match = pattern.exec(content)) !== null) {
                functions.push(match[1]);
            }
        });

        // Clases
        const classPattern = /(?:export\s+)?class\s+(\w+)/g;
        let match;
        while ((match = classPattern.exec(content)) !== null) {
            classes.push(match[1]);
        }

        // Variables
        const variablePattern = /(?:const|let|var)\s+(\w+)(?:\s*=\s*(?!(?:async\s+)?(?:function|\([^)]*\)\s*=>)))/g;
        while ((match = variablePattern.exec(content)) !== null) {
            variables.push(match[1]);
        }
    }

    private getLineNumber(content: string, index: number): number {
        return content.substring(0, index).split('\n').length;
    }
}