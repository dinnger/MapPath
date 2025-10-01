import { LanguageAnalyzer, AnalysisResult, ImportInfo } from './base';

export class JavaAnalyzer implements LanguageAnalyzer {
    
    getSupportedExtensions(): string[] {
        return ['java'];
    }

    getLanguageName(): string {
        return 'Java';
    }

    getColor(): string {
        return '#ed8b00';
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
        this.analyzeExports(content, exports, functions, classes);
        
        // Extraer el package del archivo
        const namespace = this.extractPackage(content);

        return {
            dependencies,
            exports,
            imports,
            functions,
            classes,
            variables,
            namespace
        };
    }

    private analyzeImports(content: string, dependencies: string[], imports: ImportInfo[]): void {
        // import statements
        const importPattern = /import\s+(?:static\s+)?([^;]+)\s*;/g;
        
        let match;
        while ((match = importPattern.exec(content)) !== null) {
            const importPath = match[1].trim();
            const lineNumber = this.getLineNumber(content, match.index);
            
            dependencies.push(importPath);
            imports.push({
                module: importPath,
                type: 'import',
                line: lineNumber,
                isRelative: false // Java uses absolute package names
            });
        }
    }

    private extractPackage(content: string): string | undefined {
        // Buscar declaración de package
        const packagePattern = /package\s+([\w.]+)\s*;/;
        const match = packagePattern.exec(content);
        if (match) {
            return match[1];
        }
        return undefined;
    }

    private analyzeDeclarations(content: string, functions: string[], classes: string[], variables: string[]): void {
        // Clases
        const classPattern = /(?:public|private|protected)?\s*(?:static\s+)?(?:final\s+)?(?:abstract\s+)?class\s+(\w+)/g;
        let match;
        while ((match = classPattern.exec(content)) !== null) {
            classes.push(match[1]);
        }

        // Interfaces
        const interfacePattern = /(?:public|private|protected)?\s*interface\s+(\w+)/g;
        while ((match = interfacePattern.exec(content)) !== null) {
            classes.push(match[1]); // Tratamos interfaces como clases
        }

        // Enums
        const enumPattern = /(?:public|private|protected)?\s*enum\s+(\w+)/g;
        while ((match = enumPattern.exec(content)) !== null) {
            classes.push(match[1]);
        }

        // Métodos
        const methodPattern = /(?:public|private|protected)\s+(?:static\s+)?(?:final\s+)?(?:synchronized\s+)?(?:\w+(?:<[^>]+>)?)\s+(\w+)\s*\(/g;
        while ((match = methodPattern.exec(content)) !== null) {
            const methodName = match[1];
            // Excluir constructores (mismo nombre que alguna clase)
            if (!classes.includes(methodName)) {
                functions.push(methodName);
            }
        }

        // Campos/Variables
        const fieldPattern = /(?:public|private|protected)\s+(?:static\s+)?(?:final\s+)?(?:\w+(?:<[^>]+>)?)\s+(\w+)\s*(?:=|;)/g;
        while ((match = fieldPattern.exec(content)) !== null) {
            variables.push(match[1]);
        }
    }

    private analyzeExports(content: string, exports: string[], functions: string[], classes: string[]): void {
        // En Java, solo los elementos públicos son exportables fuera del paquete
        
        // Clases públicas
        const publicClassPattern = /public\s+(?:static\s+)?(?:final\s+)?(?:abstract\s+)?class\s+(\w+)/g;
        let match;
        while ((match = publicClassPattern.exec(content)) !== null) {
            exports.push(match[1]);
        }

        // Interfaces públicas
        const publicInterfacePattern = /public\s+interface\s+(\w+)/g;
        while ((match = publicInterfacePattern.exec(content)) !== null) {
            exports.push(match[1]);
        }

        // Enums públicos
        const publicEnumPattern = /public\s+enum\s+(\w+)/g;
        while ((match = publicEnumPattern.exec(content)) !== null) {
            exports.push(match[1]);
        }

        // Métodos públicos estáticos
        const publicStaticMethodPattern = /public\s+static\s+(?:\w+(?:<[^>]+>)?)\s+(\w+)\s*\(/g;
        while ((match = publicStaticMethodPattern.exec(content)) !== null) {
            exports.push(match[1]);
        }

        // Campos públicos estáticos
        const publicStaticFieldPattern = /public\s+static\s+(?:final\s+)?(?:\w+(?:<[^>]+>)?)\s+(\w+)\s*=/g;
        while ((match = publicStaticFieldPattern.exec(content)) !== null) {
            exports.push(match[1]);
        }
    }

    private getLineNumber(content: string, index: number): number {
        return content.substring(0, index).split('\n').length;
    }
}