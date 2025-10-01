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
        this.analyzeTypeReferences(content, dependencies, imports);
        
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

    private analyzeTypeReferences(content: string, dependencies: string[], imports: ImportInfo[]): void {
        // Detectar referencias a tipos personalizados en el código
        // Esto captura clases usadas en propiedades, campos, parámetros, etc.
        
        const existingDeps = new Set(dependencies);
        
        // 1. Propiedades con tipos personalizados: public TipoPersonalizado Propiedad { get; set; }
        const propertyTypePattern = /(?:public|internal|private|protected)\s+(?:virtual\s+)?(?:static\s+)?([A-Z]\w+)(?:<([A-Z]\w+(?:,\s*[A-Z]\w+)*)>)?\s+\w+\s*\{/g;
        let match;
        while ((match = propertyTypePattern.exec(content)) !== null) {
            const typeName = match[1];
            const genericTypes = match[2];
            
            // Excluir tipos primitivos y del framework
            if (this.isCustomType(typeName)) {
                if (!existingDeps.has(typeName)) {
                    dependencies.push(typeName);
                    existingDeps.add(typeName);
                    imports.push({
                        module: typeName,
                        type: 'type-reference',
                        line: this.getLineNumber(content, match.index),
                        isRelative: false
                    });
                }
            }
            
            // Si hay tipos genéricos (ej: List<WmsDocumento> o Dictionary<Key, Value>)
            if (genericTypes) {
                const types = this.extractGenericTypes(genericTypes);
                for (const genericType of types) {
                    if (this.isCustomType(genericType) && !existingDeps.has(genericType)) {
                        dependencies.push(genericType);
                        existingDeps.add(genericType);
                        imports.push({
                            module: genericType,
                            type: 'type-reference',
                            line: this.getLineNumber(content, match.index),
                            isRelative: false
                        });
                    }
                }
            }
        }

        // 2. Campos con tipos personalizados: private TipoPersonalizado _campo;
        const fieldTypePattern = /(?:public|internal|private|protected)\s+(?:readonly\s+)?(?:static\s+)?([A-Z]\w+)(?:<([A-Z]\w+(?:,\s*[A-Z]\w+)*)>)?\s+\w+\s*[=;]/g;
        while ((match = fieldTypePattern.exec(content)) !== null) {
            const typeName = match[1];
            const genericTypes = match[2];
            
            if (this.isCustomType(typeName) && !existingDeps.has(typeName)) {
                dependencies.push(typeName);
                existingDeps.add(typeName);
                imports.push({
                    module: typeName,
                    type: 'type-reference',
                    line: this.getLineNumber(content, match.index),
                    isRelative: false
                });
            }
            
            if (genericTypes) {
                const types = this.extractGenericTypes(genericTypes);
                for (const genericType of types) {
                    if (this.isCustomType(genericType) && !existingDeps.has(genericType)) {
                        dependencies.push(genericType);
                        existingDeps.add(genericType);
                        imports.push({
                            module: genericType,
                            type: 'type-reference',
                            line: this.getLineNumber(content, match.index),
                            isRelative: false
                        });
                    }
                }
            }
        }

        // 3. Parámetros de métodos: public void Metodo(TipoPersonalizado param)
        // Incluye soporte para atributos: [FromBody] TipoPersonalizado param
        const methodParamPattern = /(?:\[[^\]]+\]\s*)?([A-Z]\w+)(?:<([A-Z]\w+(?:,\s*[A-Z]\w+)*)>)?\s+\w+(?:\s*[,\)])/g;
        while ((match = methodParamPattern.exec(content)) !== null) {
            const typeName = match[1];
            const genericTypes = match[2];
            
            if (this.isCustomType(typeName) && !existingDeps.has(typeName)) {
                dependencies.push(typeName);
                existingDeps.add(typeName);
                imports.push({
                    module: typeName,
                    type: 'type-reference',
                    line: this.getLineNumber(content, match.index),
                    isRelative: false
                });
            }
            
            // Manejar tipos genéricos (puede haber múltiples: Dictionary<Key, Value>)
            if (genericTypes) {
                const types = this.extractGenericTypes(genericTypes);
                for (const genericType of types) {
                    if (this.isCustomType(genericType) && !existingDeps.has(genericType)) {
                        dependencies.push(genericType);
                        existingDeps.add(genericType);
                        imports.push({
                            module: genericType,
                            type: 'type-reference',
                            line: this.getLineNumber(content, match.index),
                            isRelative: false
                        });
                    }
                }
            }
        }
        
        // 3b. Constructor primario (C# 12): public class MyClass(TipoPersonalizado param)
        const primaryConstructorPattern = /(?:class|record|struct)\s+\w+\s*\(([^)]+)\)/g;
        while ((match = primaryConstructorPattern.exec(content)) !== null) {
            const paramsStr = match[1];
            // Extraer cada parámetro: Tipo nombre, Tipo2 nombre2
            const paramPattern = /([A-Z]\w+)(?:<([A-Z]\w+(?:,\s*[A-Z]\w+)*)>)?\s+\w+/g;
            let paramMatch;
            while ((paramMatch = paramPattern.exec(paramsStr)) !== null) {
                const typeName = paramMatch[1];
                const genericTypes = paramMatch[2];
                
                if (this.isCustomType(typeName) && !existingDeps.has(typeName)) {
                    dependencies.push(typeName);
                    existingDeps.add(typeName);
                    imports.push({
                        module: typeName,
                        type: 'type-reference',
                        line: this.getLineNumber(content, match.index),
                        isRelative: false
                    });
                }
                
                if (genericTypes) {
                    const types = this.extractGenericTypes(genericTypes);
                    for (const genericType of types) {
                        if (this.isCustomType(genericType) && !existingDeps.has(genericType)) {
                            dependencies.push(genericType);
                            existingDeps.add(genericType);
                            imports.push({
                                module: genericType,
                                type: 'type-reference',
                                line: this.getLineNumber(content, match.index),
                                isRelative: false
                            });
                        }
                    }
                }
            }
        }

        // 4. Tipos de retorno de métodos: public TipoPersonalizado Metodo()
        // Incluye tipos genéricos como Task<TipoPersonalizado>, IEnumerable<T>, etc.
        const returnTypePattern = /(?:public|internal|private|protected)\s+(?:static\s+)?(?:virtual\s+)?(?:override\s+)?(?:async\s+)?([A-Z]\w+)(?:<([A-Z]\w+(?:,\s*[A-Z]\w+)*)>)?\s+\w+\s*\(/g;
        while ((match = returnTypePattern.exec(content)) !== null) {
            const typeName = match[1];
            const genericTypes = match[2];
            
            // El tipo base (ej: Task, IEnumerable) generalmente no es un tipo personalizado
            // pero sus argumentos genéricos sí pueden serlo
            if (this.isCustomType(typeName) && !existingDeps.has(typeName)) {
                dependencies.push(typeName);
                existingDeps.add(typeName);
                imports.push({
                    module: typeName,
                    type: 'type-reference',
                    line: this.getLineNumber(content, match.index),
                    isRelative: false
                });
            }
            
            // Extraer tipos de argumentos genéricos (incluso anidados)
            if (genericTypes) {
                const types = this.extractGenericTypes(genericTypes);
                for (const genericType of types) {
                    if (this.isCustomType(genericType) && !existingDeps.has(genericType)) {
                        dependencies.push(genericType);
                        existingDeps.add(genericType);
                        imports.push({
                            module: genericType,
                            type: 'type-reference',
                            line: this.getLineNumber(content, match.index),
                            isRelative: false
                        });
                    }
                }
            }
        }

        // 5. Herencia e implementación de interfaces: class MiClase : ClaseBase, IInterfaz1, IInterfaz2
        const inheritancePattern = /(?:class|record|struct)\s+\w+\s*:\s*([A-Z][\w<>,\s]+)/g;
        while ((match = inheritancePattern.exec(content)) !== null) {
            const inheritanceList = match[1];
            // Separar por comas y limpiar espacios
            const types = inheritanceList.split(',').map(t => t.trim());
            
            for (const type of types) {
                // Extraer el nombre del tipo (antes de cualquier <>)
                const typeNameMatch = type.match(/^([A-Z]\w+)/);
                if (typeNameMatch) {
                    const typeName = typeNameMatch[1];
                    if (this.isCustomType(typeName) && !existingDeps.has(typeName)) {
                        dependencies.push(typeName);
                        existingDeps.add(typeName);
                        imports.push({
                            module: typeName,
                            type: 'type-reference',
                            line: this.getLineNumber(content, match.index),
                            isRelative: false
                        });
                    }
                }
                
                // Si el tipo base tiene argumentos genéricos, extraerlos
                const genericMatch = type.match(/<(.+)>$/);
                if (genericMatch) {
                    const genericTypes = this.extractGenericTypes(genericMatch[1]);
                    for (const genericType of genericTypes) {
                        if (this.isCustomType(genericType) && !existingDeps.has(genericType)) {
                            dependencies.push(genericType);
                            existingDeps.add(genericType);
                            imports.push({
                                module: genericType,
                                type: 'type-reference',
                                line: this.getLineNumber(content, match.index),
                                isRelative: false
                            });
                        }
                    }
                }
            }
        }

        // 6. Instanciación con 'new': new TipoPersonalizado()
        const newInstancePattern = /new\s+([A-Z]\w+)(?:<([A-Z]\w+(?:,\s*[A-Z]\w+)*)>)?\s*[(<]/g;
        while ((match = newInstancePattern.exec(content)) !== null) {
            const typeName = match[1];
            const genericTypes = match[2];
            
            if (this.isCustomType(typeName) && !existingDeps.has(typeName)) {
                dependencies.push(typeName);
                existingDeps.add(typeName);
                imports.push({
                    module: typeName,
                    type: 'type-reference',
                    line: this.getLineNumber(content, match.index),
                    isRelative: false
                });
            }
            
            if (genericTypes) {
                const types = this.extractGenericTypes(genericTypes);
                for (const genericType of types) {
                    if (this.isCustomType(genericType) && !existingDeps.has(genericType)) {
                        dependencies.push(genericType);
                        existingDeps.add(genericType);
                        imports.push({
                            module: genericType,
                            type: 'type-reference',
                            line: this.getLineNumber(content, match.index),
                            isRelative: false
                        });
                    }
                }
            }
        }
        
        // 7. Llamadas a métodos estáticos: TipoPersonalizado.MetodoEstatico()
        const staticMethodCallPattern = /([A-Z]\w+)\.(\w+)\s*[(<]/g;
        while ((match = staticMethodCallPattern.exec(content)) !== null) {
            const typeName = match[1];
            
            if (this.isCustomType(typeName) && !existingDeps.has(typeName)) {
                dependencies.push(typeName);
                existingDeps.add(typeName);
                imports.push({
                    module: typeName,
                    type: 'type-reference',
                    line: this.getLineNumber(content, match.index),
                    isRelative: false
                });
            }
        }
        
        // 8. Casting y pattern matching: (TipoPersonalizado)obj, obj is TipoPersonalizado, obj as TipoPersonalizado
        const castingPattern = /(?:\(([A-Z]\w+)\)|(?:is|as)\s+([A-Z]\w+))/g;
        while ((match = castingPattern.exec(content)) !== null) {
            const typeName = match[1] || match[2];
            
            if (typeName && this.isCustomType(typeName) && !existingDeps.has(typeName)) {
                dependencies.push(typeName);
                existingDeps.add(typeName);
                imports.push({
                    module: typeName,
                    type: 'type-reference',
                    line: this.getLineNumber(content, match.index),
                    isRelative: false
                });
            }
        }
    }

    private isCustomType(typeName: string): boolean {
        // Excluir tipos primitivos y tipos comunes del framework .NET
        const builtInTypes = new Set([
            'String', 'Int32', 'Int64', 'Int16', 'Boolean', 'Decimal', 'Double', 
            'Float', 'Byte', 'Char', 'Object', 'DateTime', 'TimeSpan', 'Guid',
            'List', 'Dictionary', 'IEnumerable', 'ICollection', 'IList', 'Array',
            'IReadOnlyList', 'IReadOnlyCollection', 'IReadOnlyDictionary',
            'Task', 'ValueTask', 'Action', 'Func', 'Nullable', 'IQueryable',
            'DbSet', 'EntityTypeBuilder', 'IEntityTypeConfiguration',
            'IActionResult', 'ActionResult', 'ObjectResult', 'StatusCodes',
            'CancellationToken', 'HttpContext', 'HttpRequest', 'HttpResponse',
            'void', 'var', 'dynamic', 'async', 'await', 'Result', 'Option'
        ]);
        
        return !builtInTypes.has(typeName) && /^[A-Z]/.test(typeName);
    }

    private extractGenericTypes(genericStr: string): string[] {
        // Extraer tipos de una cadena de argumentos genéricos
        // Maneja casos como: "T", "T, U", "Dictionary<K, V>", "Result<Order>"
        const types: string[] = [];
        let depth = 0;
        let current = '';
        
        for (let i = 0; i < genericStr.length; i++) {
            const char = genericStr[i];
            
            if (char === '<') {
                depth++;
                current += char;
            } else if (char === '>') {
                depth--;
                current += char;
            } else if (char === ',' && depth === 0) {
                // Es un separador de tipos de nivel superior
                const trimmed = current.trim();
                if (trimmed) {
                    types.push(...this.extractTypeNames(trimmed));
                }
                current = '';
            } else {
                current += char;
            }
        }
        
        // Agregar el último tipo
        const trimmed = current.trim();
        if (trimmed) {
            types.push(...this.extractTypeNames(trimmed));
        }
        
        return types;
    }

    private extractTypeNames(typeStr: string): string[] {
        // Extraer nombres de tipos de una cadena como "Task<Order>" o "Dictionary<K, V>"
        const types: string[] = [];
        
        // Extraer el tipo base
        const baseTypeMatch = typeStr.match(/^([A-Z]\w+)/);
        if (baseTypeMatch) {
            types.push(baseTypeMatch[1]);
        }
        
        // Extraer tipos genéricos anidados
        const genericMatch = typeStr.match(/<(.+)>$/);
        if (genericMatch) {
            types.push(...this.extractGenericTypes(genericMatch[1]));
        }
        
        return types;
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

        // Records (incluyendo record class y record struct)
        const recordPattern = /(?:public|internal|private|protected)?\s*(?:sealed\s+)?(?:readonly\s+)?record(?:\s+(?:class|struct))?\s+(\w+)/g;
        while ((match = recordPattern.exec(content)) !== null) {
            classes.push(match[1]);
        }

        // Structs (incluyendo readonly struct)
        const structPattern = /(?:public|internal|private|protected)?\s*(?:readonly\s+)?struct\s+(\w+)/g;
        while ((match = structPattern.exec(content)) !== null) {
            classes.push(match[1]);
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
        // Exportamos solo TIPOS (clases, interfaces, records, structs, enums), NO métodos
        
        const publicClassPattern = /public\s+(?:static\s+)?(?:abstract\s+)?(?:sealed\s+)?class\s+(\w+)/g;
        let match;
        while ((match = publicClassPattern.exec(content)) !== null) {
            exports.push(match[1]);
        }

        const publicInterfacePattern = /public\s+interface\s+(\w+)/g;
        while ((match = publicInterfacePattern.exec(content)) !== null) {
            exports.push(match[1]);
        }

        // Records públicos (incluyendo record class y record struct)
        const publicRecordPattern = /public\s+(?:sealed\s+)?(?:readonly\s+)?record(?:\s+(?:class|struct))?\s+(\w+)/g;
        while ((match = publicRecordPattern.exec(content)) !== null) {
            exports.push(match[1]);
        }

        // Structs públicos (incluyendo readonly struct)
        const publicStructPattern = /public\s+(?:readonly\s+)?struct\s+(\w+)/g;
        while ((match = publicStructPattern.exec(content)) !== null) {
            exports.push(match[1]);
        }

        // Enums públicos
        const publicEnumPattern = /public\s+enum\s+(\w+)/g;
        while ((match = publicEnumPattern.exec(content)) !== null) {
            exports.push(match[1]);
        }

        // Delegates públicos
        const publicDelegatePattern = /public\s+delegate\s+\w+\s+(\w+)/g;
        while ((match = publicDelegatePattern.exec(content)) !== null) {
            exports.push(match[1]);
        }
    }

    private getLineNumber(content: string, index: number): number {
        return content.substring(0, index).split('\n').length;
    }
}