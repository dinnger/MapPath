import * as fs from 'fs';
import * as path from 'path';
import { LanguageAnalyzer, AnalysisResult, ImportInfo } from './base';

export class TypeScriptAnalyzer implements LanguageAnalyzer {
    private tsAliases: Map<string, string> = new Map();
    private projectRoot: string = '';
    
    getSupportedExtensions(): string[] {
        return ['ts', 'tsx'];
    }

    getLanguageName(): string {
        return 'TypeScript';
    }

    getColor(): string {
        return '#3178c6';
    }

    setProjectRoot(rootPath: string): void {
        this.projectRoot = rootPath;
        this.loadTypeScriptConfig(rootPath);
    }

    resolveAlias(dependency: string): string | null {
        // Check direct alias match
        if (this.tsAliases.has(dependency)) {
            return this.tsAliases.get(dependency)!;
        }
        
        // Check if dependency starts with any alias
        for (const [alias, basePath] of this.tsAliases.entries()) {
            if (dependency.startsWith(alias + '/')) {
                const remainingPath = dependency.substring(alias.length + 1);
                return path.join(basePath, remainingPath);
            }
        }
        
        return null;
    }

    tryResolveWithIndex(basePath: string): string | null {
        // First try direct file
        if (this.fileExists(basePath + '.ts') || this.fileExists(basePath + '.tsx')) {
            return this.fileExists(basePath + '.ts') ? basePath + '.ts' : basePath + '.tsx';
        }
        
        // Then try as directory with index files
        if (this.directoryExists(basePath)) {
            const indexExtensions = ['.ts', '.tsx', '.js', '.jsx'];
            for (const ext of indexExtensions) {
                const indexPath = path.join(basePath, 'index' + ext);
                if (this.fileExists(indexPath)) {
                    return indexPath;
                }
            }
        }
        
        return null;
    }

    private fileExists(filePath: string): boolean {
        try {
            return fs.existsSync(filePath) && fs.statSync(filePath).isFile();
        } catch {
            return false;
        }
    }

    private directoryExists(dirPath: string): boolean {
        try {
            return fs.existsSync(dirPath) && fs.statSync(dirPath).isDirectory();
        } catch {
            return false;
        }
    }

    private loadTypeScriptConfig(rootPath: string): void {
        const tsconfigPath = path.join(rootPath, 'tsconfig.json');
        this.tsAliases.clear();
        
        if (fs.existsSync(tsconfigPath)) {
            try {
                const content = fs.readFileSync(tsconfigPath, 'utf-8');
                const config = JSON.parse(content);
                
                if (config.compilerOptions && config.compilerOptions.paths) {
                    const baseUrl = config.compilerOptions.baseUrl || '.';
                    const basePath = path.resolve(rootPath, baseUrl);
                    
                    for (const [alias, paths] of Object.entries(config.compilerOptions.paths)) {
                        if (Array.isArray(paths) && paths.length > 0) {
                            // Remove /* from alias if present
                            const cleanAlias = alias.replace('/*', '');
                            // Remove /* from path if present and resolve relative to baseUrl
                            const targetPath = (paths[0] as string).replace('/*', '');
                            const resolvedPath = path.resolve(basePath, targetPath);
                            
                            this.tsAliases.set(cleanAlias, resolvedPath);
                        }
                    }
                }
            } catch (error) {
                // Silently handle tsconfig read/parse errors
            }
        }
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