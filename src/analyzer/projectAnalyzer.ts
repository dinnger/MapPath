import * as fs from 'fs';
import * as path from 'path';
import { ProjectStructure, FileNode, DependencyGraph, GraphNode, GraphEdge, FolderStructure } from './types';
import { LanguageAnalyzer } from './language/base';
import { TypeScriptAnalyzer } from './language/typescriptAnalyzer';
import { JavaScriptAnalyzer } from './language/javascriptAnalyzer';
import { PythonAnalyzer } from './language/pythonAnalyzer';
import { CSharpAnalyzer } from './language/csharpAnalyzer';
import { JavaAnalyzer } from './language/javaAnalyzer';
import { VueAnalyzer } from './language/vueAnalyzer';

export class ProjectAnalyzer {
    private languageAnalyzers: Map<string, LanguageAnalyzer>;
    private gitignorePatterns: string[] = [];
    private projectRoot: string = '';
    private namespaceToFileMap: Map<string, string> = new Map(); // Para C# y Java

    constructor() {
        this.languageAnalyzers = new Map();
        this.languageAnalyzers.set('ts', new TypeScriptAnalyzer());
        this.languageAnalyzers.set('tsx', new TypeScriptAnalyzer());
        this.languageAnalyzers.set('js', new JavaScriptAnalyzer());
        this.languageAnalyzers.set('jsx', new JavaScriptAnalyzer());
        this.languageAnalyzers.set('py', new PythonAnalyzer());
        this.languageAnalyzers.set('cs', new CSharpAnalyzer());
        this.languageAnalyzers.set('java', new JavaAnalyzer());
        this.languageAnalyzers.set('vue', new VueAnalyzer());
    }

    async analyzeProject(rootPath: string): Promise<ProjectStructure> {
        this.projectRoot = rootPath;
        
        // Load configuration files
        this.loadGitignore(rootPath);
        
        // Setup TypeScript analyzer with project configuration
        const tsAnalyzer = this.languageAnalyzers.get('ts') as TypeScriptAnalyzer;
        if (tsAnalyzer) {
            tsAnalyzer.setProjectRoot(rootPath);
        }
        const tsxAnalyzer = this.languageAnalyzers.get('tsx') as TypeScriptAnalyzer;
        if (tsxAnalyzer) {
            tsxAnalyzer.setProjectRoot(rootPath);
        }
        // Setup Vue analyzer with project configuration
        const vueAnalyzer = this.languageAnalyzers.get('vue') as any;
        if (vueAnalyzer && vueAnalyzer.setProjectRoot) {
            vueAnalyzer.setProjectRoot(rootPath);
        }
        
        const files = await this.scanDirectory(rootPath);
        const processedFiles = await this.processFiles(files, rootPath);
        const dependencies = this.buildDependencyGraph(processedFiles);
        const folders = this.buildFolderStructure(processedFiles, rootPath);

        return {
            rootPath,
            files: processedFiles,
            dependencies,
            folders,
            languageColors: this.getLanguageColors()
        };
    }

    private async scanDirectory(dirPath: string, excludeDirs: string[] = ['node_modules', '.git', 'dist', 'out', 'build']): Promise<string[]> {
        const files: string[] = [];
        
        const scanRecursive = async (currentPath: string) => {
            const entries = await fs.promises.readdir(currentPath, { withFileTypes: true });
            
            for (const entry of entries) {
                const fullPath = path.join(currentPath, entry.name);
                
                // Check if file/directory is ignored by .gitignore
                if (this.isIgnored(fullPath, dirPath)) {
                    continue;
                }
                
                if (entry.isDirectory()) {
                    if (!excludeDirs.includes(entry.name) && !entry.name.startsWith('.')) {
                        await scanRecursive(fullPath);
                    }
                } else if (entry.isFile()) {
                    const ext = path.extname(entry.name).substring(1).toLowerCase();
                    if (this.languageAnalyzers.has(ext)) {
                        files.push(fullPath);
                    }
                }
            }
        };

        await scanRecursive(dirPath);
        return files;
    }

    private async processFiles(filePaths: string[], rootPath: string): Promise<FileNode[]> {
        const processedFiles: FileNode[] = [];

        for (const filePath of filePaths) {
            try {
                const stats = await fs.promises.stat(filePath);
                const ext = path.extname(filePath).substring(1).toLowerCase();
                const analyzer = this.languageAnalyzers.get(ext);
                
                if (analyzer) {
                    const content = await fs.promises.readFile(filePath, 'utf8');
                    const analysis = await analyzer.analyze(content, filePath);
                    
                    const fileNode: FileNode = {
                        path: filePath,
                        name: path.basename(filePath),
                        type: 'file',
                        language: this.getLanguageFromExtension(ext),
                        dependencies: analysis.dependencies || [],
                        exports: analysis.exports || [],
                        size: stats.size,
                        extension: ext,
                        namespace: analysis.namespace
                    };

                    processedFiles.push(fileNode);
                }
            } catch (error) {
                console.error(`Error processing file ${filePath}:`, error);
            }
        }

        return processedFiles;
    }

    private buildDependencyGraph(files: FileNode[]): DependencyGraph {
        const nodes: GraphNode[] = [];
        const edges: GraphEdge[] = [];
        const nodeMap = new Map<string, GraphNode>();

        // Construir mapa de namespaces a archivos (para C# y Java)
        this.namespaceToFileMap.clear();
        for (const file of files) {
            if (file.namespace) {
                this.namespaceToFileMap.set(file.namespace, file.path);
            }
        }

        // Crear nodos
        for (const file of files) {
            const folder = path.dirname(file.path);
            const node: GraphNode = {
                id: file.path,
                label: file.name,
                path: file.path,
                type: 'file',
                language: file.language,
                size: file.size,
                group: folder
            };
            nodes.push(node);
            nodeMap.set(file.path, node);
        }

        // Crear aristas (dependencias)
        for (const file of files) {
            for (const dep of file.dependencies) {
                // Resolver dependencia a ruta absoluta
                const resolvedPath = this.resolveDependencyPath(dep, file.path);
                
                if (resolvedPath && nodeMap.has(resolvedPath)) {
                    edges.push({
                        from: file.path,
                        to: resolvedPath,
                        type: this.getDependencyType(file.extension),
                        weight: 1
                    });
                }
            }
        }

        return { nodes, edges };
    }

    private buildFolderStructure(files: FileNode[], rootPath: string): FolderStructure {
        const structure: FolderStructure = {};
        
        for (const file of files) {
            const relativePath = path.relative(rootPath, file.path);
            const dir = path.dirname(relativePath);
            
            if (!structure[dir]) {
                structure[dir] = {
                    files: [],
                    subfolders: [],
                    totalFiles: 0
                };
            }
            
            structure[dir].files.push(file.path);
            structure[dir].totalFiles++;
        }

        // Agregar información de subcarpetas
        for (const folder of Object.keys(structure)) {
            const parentFolder = path.dirname(folder);
            if (parentFolder !== '.' && structure[parentFolder]) {
                if (!structure[parentFolder].subfolders.includes(folder)) {
                    structure[parentFolder].subfolders.push(folder);
                }
            }
        }

        return structure;
    }

    private resolveDependencyPath(dependency: string, fromFile: string): string | null {
        const dir = path.dirname(fromFile);
        const ext = path.extname(fromFile).substring(1).toLowerCase();
        
        // Skip built-in modules
        if (this.isBuiltInModule(dependency)) {
            return null;
        }
        
        // Debug logging for specific case
        if (dependency.includes('embedding.service')) {
            console.log(`[DEBUG] Resolving: "${dependency}" from "${fromFile}"`);
            console.log(`[DEBUG] Base dir: "${dir}"`);
        }
        
        // 0. Para C# y Java: intentar resolver como namespace primero
        if (ext === 'cs' || ext === 'java') {
            // Buscar coincidencia exacta de namespace
            if (this.namespaceToFileMap.has(dependency)) {
                const resolvedFile = this.namespaceToFileMap.get(dependency);
                if (resolvedFile) {
                    return resolvedFile;
                }
            }
            
            // Buscar coincidencia parcial (para casos donde se importa un tipo específico)
            // Por ejemplo: "Application.Snapshots.Order.OrderSnapshot" debería encontrar "Application.Snapshots.Order"
            for (const [namespace, filePath] of this.namespaceToFileMap.entries()) {
                if (dependency.startsWith(namespace + '.')) {
                    return filePath;
                }
            }
        }
        
        // 1. Try TypeScript aliases first
        const tsAnalyzer = this.languageAnalyzers.get('ts') as TypeScriptAnalyzer;
        if (tsAnalyzer) {
            const aliasResolved = tsAnalyzer.resolveAlias(dependency);
            if (aliasResolved) {
                const result = this.tryWithExtensionsAndIndex(aliasResolved);
                if (dependency.includes('embedding.service')) {
                    console.log(`[DEBUG] TS Alias resolved to: "${aliasResolved}", final: ${result}`);
                }
                if (result) return result;
            }
        }

        // 2. Try Vue/Vite aliases
        const vueAnalyzer = this.languageAnalyzers.get('vue') as any;
        if (vueAnalyzer && vueAnalyzer.resolveAlias) {
            const aliasResolved = vueAnalyzer.resolveAlias(dependency);
            if (aliasResolved) {
                const result = this.tryWithExtensionsAndIndex(aliasResolved);
                if (dependency.includes('embedding.service')) {
                    console.log(`[DEBUG] Vue Alias resolved to: "${aliasResolved}", final: ${result}`);
                }
                if (result) return result;
            }
        }
        
        // 3. Handle relative paths (including complex ones like ../../shared)
        if (dependency.startsWith('./') || dependency.startsWith('../')) {
            const resolved = path.resolve(dir, dependency);
            const result = this.tryWithExtensionsAndIndex(resolved);
            if (dependency.includes('embedding.service')) {
                console.log(`[DEBUG] Relative path resolved to: "${resolved}", final: ${result}`);
            }
            if (result) return result;
        }
        
        // 4. Try same directory (files without ./ prefix)
        if (!dependency.includes('/') && !dependency.includes('\\')) {
            const sameDirPath = path.join(dir, dependency);
            const result = this.tryWithExtensionsAndIndex(sameDirPath);
            if (dependency.includes('embedding.service')) {
                console.log(`[DEBUG] Same dir path: "${sameDirPath}", final: ${result}`);
            }
            if (result) return result;
        }
        
        // 5. Try as subdirectory path from current directory
        if (dependency.includes('/')) {
            const resolved = path.resolve(dir, dependency);
            const result = this.tryWithExtensionsAndIndex(resolved);
            if (dependency.includes('embedding.service')) {
                console.log(`[DEBUG] Subdir path resolved to: "${resolved}", final: ${result}`);
            }
            if (result) return result;
        }
        
        // 6. Try from project root
        const fromRoot = path.join(this.projectRoot, dependency);
        const result = this.tryWithExtensionsAndIndex(fromRoot);
        if (dependency.includes('embedding.service')) {
            console.log(`[DEBUG] From root: "${fromRoot}", final: ${result}`);
        }
        
        return result;
    }

    private isBuiltInModule(dependency: string): boolean {
        const builtInModules = [
            'path', 'fs', 'os', 'util', 'events', 'stream', 'buffer', 'crypto',
            'http', 'https', 'url', 'querystring', 'zlib', 'readline',
            'vscode', 'react', 'vue', 'angular', '@types'
        ];
        
        // C# built-in namespaces
        const csharpBuiltIns = [
            'System', 'Microsoft', 'Newtonsoft', 'AutoMapper', 'FluentValidation'
        ];
        
        // Java built-in packages
        const javaBuiltIns = [
            'java', 'javax', 'org.springframework', 'org.apache', 'com.google'
        ];
        
        // Check if it's a built-in Node.js module
        if (builtInModules.includes(dependency)) {
            return true;
        }
        
        // Check if it starts with a built-in module (like @types/node)
        if (builtInModules.some(mod => dependency.startsWith(mod + '/'))) {
            return true;
        }
        
        // Check C# built-in namespaces
        if (csharpBuiltIns.some(ns => dependency === ns || dependency.startsWith(ns + '.'))) {
            return true;
        }
        
        // Check Java built-in packages
        if (javaBuiltIns.some(pkg => dependency === pkg || dependency.startsWith(pkg + '.'))) {
            return true;
        }
        
        // Check if it's an npm package (doesn't start with . or / and is a simple name without path separators)
        // IMPORTANT: For C# and Java, namespaces use dots (.) not slashes, so we need to allow them through
        if (!dependency.startsWith('.') && !dependency.startsWith('/') && !dependency.startsWith('@')) {
            // If it contains dots (.), it might be a C#/Java namespace, so allow it through
            if (dependency.includes('.')) {
                return false; // Let the namespace resolver handle it
            }
            // If it's just a simple name without slashes, it's likely an npm package
            return !dependency.includes('/');
        }
        
        // Allow @scoped packages that might be local (like our @shared aliases)
        return false;
    }



    private tryWithExtensionsAndIndex(basePath: string): string | null {
        // Check if basePath already has an extension
        const currentExt = path.extname(basePath);
        
        if (currentExt) {
            // If it has an extension, try compatible extensions
            const compatibleExts = this.getCompatibleExtensions(currentExt);
            const baseWithoutExt = basePath.slice(0, -currentExt.length);
            
            // First try the exact path (in case it exists as-is)
            if (this.fileExists(basePath)) {
                return basePath;
            }
            
            // Then try compatible extensions
            for (const ext of compatibleExts) {
                const withExt = baseWithoutExt + ext;
                if (this.fileExists(withExt)) {
                    return withExt;
                }
            }
        } else {
            // No extension provided, try all supported extensions
            const allExtensions = ['.ts', '.tsx', '.js', '.jsx', '.py', '.cs', '.java', '.vue'];
            
            for (const ext of allExtensions) {
                const withExt = basePath + ext;
                if (this.fileExists(withExt)) {
                    return withExt;
                }
            }
        }
        
        // Check if basePath is a directory and try index files
        if (this.directoryExists(basePath)) {
            const indexExtensions = ['.ts', '.tsx', '.js', '.jsx', '.py', '.cs', '.java', '.vue'];
            for (const ext of indexExtensions) {
                const indexPath = path.join(basePath, 'index' + ext);
                if (this.fileExists(indexPath)) {
                    return indexPath;
                }
            }
        }
        
        // Try with index files even if directory doesn't exist (in case of symlinks or special cases)
        const indexExtensions = ['.ts', '.tsx', '.js', '.jsx', '.py', '.cs', '.java', '.vue'];
        for (const ext of indexExtensions) {
            const indexPath = path.join(basePath, 'index' + ext);
            if (this.fileExists(indexPath)) {
                return indexPath;
            }
        }
        
        return null;
    }

    // Keep the old method for backward compatibility
    private tryWithExtensions(basePath: string): string | null {
        return this.tryWithExtensionsAndIndex(basePath);
    }

    private getCompatibleExtensions(originalExt: string): string[] {
        const compatibilityMap: { [key: string]: string[] } = {
            '.js': ['.ts', '.tsx', '.js', '.jsx'],
            '.jsx': ['.tsx', '.jsx', '.ts', '.js'],
            '.ts': ['.ts', '.tsx', '.js', '.jsx'],
            '.tsx': ['.tsx', '.ts', '.jsx', '.js'],
            '.py': ['.py'],
            '.cs': ['.cs'],
            '.java': ['.java'],
            '.vue': ['.vue']
        };
        
        return compatibilityMap[originalExt] || [originalExt];
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

    private getDependencyType(extension: string): 'import' | 'require' | 'include' | 'using' {
        switch (extension) {
            case 'ts':
            case 'tsx':
            case 'js':
            case 'jsx':
                return 'import';
            case 'py':
                return 'import';
            case 'cs':
                return 'using';
            case 'java':
                return 'import';
            default:
                return 'include';
        }
    }

    private getLanguageFromExtension(ext: string): string {
        const analyzer = this.languageAnalyzers.get(ext);
        if (analyzer) {
            return analyzer.getLanguageName();
        }
        return ext.toUpperCase();
    }

    getLanguageColors(): { [key: string]: string } {
        const colors: { [key: string]: string } = {
            'default': '#6c757d'
        };
        
        for (const [ext, analyzer] of this.languageAnalyzers.entries()) {
            const languageName = analyzer.getLanguageName();
            colors[languageName] = analyzer.getColor();
        }
        
        return colors;
    }

    private loadGitignore(rootPath: string): void {
        const gitignorePath = path.join(rootPath, '.gitignore');
        this.gitignorePatterns = [];
        
        if (fs.existsSync(gitignorePath)) {
            try {
                const content = fs.readFileSync(gitignorePath, 'utf-8');
                this.gitignorePatterns = content
                    .split('\n')
                    .map(line => line.trim())
                    .filter(line => line && !line.startsWith('#'))
                    .map(pattern => {
                        // Convert gitignore patterns to regex patterns
                        return pattern
                            .replace(/\./g, '\\.')
                            .replace(/\*/g, '.*')
                            .replace(/\?/g, '.');
                    });
            } catch (error) {
                // Silently handle gitignore read errors
            }
        }

        // Add common patterns that should always be ignored
        this.gitignorePatterns.push(
            'node_modules',
            '\\.git',
            '\\.vscode',
            '\\.vsix',
            'out',
            'dist',
            'build',
            '\\.map$',
            '\\.min\\.js$',
            '\\.d\\.ts$'
        );
    }



    private isIgnored(filePath: string, rootPath: string): boolean {
        const relativePath = path.relative(rootPath, filePath).replace(/\\/g, '/');
        
        return this.gitignorePatterns.some(pattern => {
            const regex = new RegExp(pattern);
            return regex.test(relativePath) || regex.test(path.basename(filePath));
        });
    }
}