export interface LanguageAnalyzer {
    analyze(content: string, filePath: string): Promise<AnalysisResult>;
    getSupportedExtensions(): string[];
}

export interface AnalysisResult {
    dependencies: string[];
    exports: string[];
    imports: ImportInfo[];
    functions: string[];
    classes: string[];
    variables: string[];
}

export interface ImportInfo {
    module: string;
    type: 'import' | 'require' | 'include' | 'using';
    line: number;
    isRelative: boolean;
}