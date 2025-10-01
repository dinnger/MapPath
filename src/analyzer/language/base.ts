export interface LanguageAnalyzer {
    analyze(content: string, filePath: string): Promise<AnalysisResult>;
    getSupportedExtensions(): string[];
    getLanguageName(): string;
    getColor(): string;
}

export interface AnalysisResult {
    dependencies: string[];
    exports: string[];
    imports: ImportInfo[];
    functions: string[];
    classes: string[];
    variables: string[];
    namespace?: string; // Para C# y Java
}

export interface ImportInfo {
    module: string;
    type: 'import' | 'require' | 'include' | 'using' | 'type-reference';
    line: number;
    isRelative: boolean;
}