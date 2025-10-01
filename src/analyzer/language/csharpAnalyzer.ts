import { LanguageAnalyzer, AnalysisResult, ImportInfo } from './base';

export class CSharpAnalyzer implements LanguageAnalyzer {
    
    getSupportedExtensions(): string[] {
        return ['cs'];
    }

    getLanguageName(): string {
        return 'C#';
    }

    getColor(): string {
        return '#239120';
    }

    async analyze(content: string, filePath: string): Promise<AnalysisResult> {
        const dependencies: string[] = [];
        const exports: string[] = [];
        const imports: ImportInfo[] = [];
        const functions: string[] = [];
        const classes: string[] = [];
        const variables: string[] = [];

        this.analyzeUsings(content, dependencies, imports);
        this.analyzeDeclarations(content, functions, classes, variables);
        this.analyzeExports(content, exports, functions, classes);
        
        // Extraer el namespace del archivo
        const namespace = this.extractNamespace(content);

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

    private analyzeUsings(content: string, dependencies: string[], imports: ImportInfo[]): void {
        // using statements
        const usingPattern = /using\s+(?:static\s+)?([^;=\s]+)\s*;/g;
        
        let match;
        while ((match = usingPattern.exec(content)) !== null) {
            const namespace = match[1];
            const lineNumber = this.getLineNumber(content, match.index);
            
            dependencies.push(namespace);
            imports.push({
                module: namespace,
                type: 'using',
                line: lineNumber,
                isRelative: false // C# uses absolute namespaces
            });
        }
    }

    private extractNamespace(content: string): string | undefined {
        // Buscar declaración de namespace
        // Soporta tanto el formato antiguo como el nuevo file-scoped namespace
        
        // File-scoped namespace: namespace MyNamespace;
        const fileScopedPattern = /^\s*namespace\s+([\w.]+)\s*;/m;
        const fileScopedMatch = fileScopedPattern.exec(content);
        if (fileScopedMatch) {
            return fileScopedMatch[1];
        }
        
        // Traditional namespace: namespace MyNamespace { ... }
        const traditionalPattern = /namespace\s+([\w.]+)\s*\{/;
        const traditionalMatch = traditionalPattern.exec(content);
        if (traditionalMatch) {
            return traditionalMatch[1];
        }
        
        return undefined;
    }

    private analyzeDeclarations(content: string, functions: string[], classes: string[], variables: string[]): void {
        // Clases
        const classPattern = /(?:public|internal|private|protected)?\s*(?:static\s+)?(?:abstract\s+)?(?:sealed\s+)?class\s+(\w+)/g;
        let match;
        while ((match = classPattern.exec(content)) !== null) {
            classes.push(match[1]);
        }

        // Interfaces
        const interfacePattern = /(?:public|internal|private|protected)?\s*interface\s+(\w+)/g;
        while ((match = interfacePattern.exec(content)) !== null) {
            classes.push(match[1]); // Tratamos interfaces como clases para simplicidad
        }

        // Métodos
        const methodPattern = /(?:public|internal|private|protected)\s+(?:static\s+)?(?:virtual\s+)?(?:override\s+)?(?:async\s+)?(?:\w+\??)\s+(\w+)\s*\(/g;
        while ((match = methodPattern.exec(content)) !== null) {
            const methodName = match[1];
            // Excluir constructores (mismo nombre que la clase)
            if (!classes.includes(methodName)) {
                functions.push(methodName);
            }
        }

        // Propiedades
        const propertyPattern = /(?:public|internal|private|protected)\s+(?:static\s+)?(?:\w+\??)\s+(\w+)\s*\{/g;
        while ((match = propertyPattern.exec(content)) !== null) {
            variables.push(match[1]);
        }

        // Campos
        const fieldPattern = /(?:public|internal|private|protected)\s+(?:static\s+)?(?:readonly\s+)?(?:\w+\??)\s+(\w+)\s*(?:=|;)/g;
        while ((match = fieldPattern.exec(content)) !== null) {
            variables.push(match[1]);
        }
    }

    private analyzeExports(content: string, exports: string[], functions: string[], classes: string[]): void {
        // En C#, solo los elementos públicos son "exportables"
        // Buscamos declaraciones públicas
        const publicClassPattern = /public\s+(?:static\s+)?(?:abstract\s+)?(?:sealed\s+)?class\s+(\w+)/g;
        let match;
        while ((match = publicClassPattern.exec(content)) !== null) {
            exports.push(match[1]);
        }

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
        const publicStaticMethodPattern = /public\s+static\s+(?:\w+\??)\s+(\w+)\s*\(/g;
        while ((match = publicStaticMethodPattern.exec(content)) !== null) {
            exports.push(match[1]);
        }
    }

    private getLineNumber(content: string, index: number): number {
        return content.substring(0, index).split('\n').length;
    }
}