import * as fs from 'fs';
import * as path from 'path';
import { ProjectStructure, FileNode, DependencyGraph, GraphNode, GraphEdge, FolderStructure } from './types';
import { LanguageAnalyzer } from './language/base';
import { TypeScriptAnalyzer } from './language/typescriptAnalyzer';
import { JavaScriptAnalyzer } from './language/javascriptAnalyzer';
import { PythonAnalyzer } from './language/pythonAnalyzer';
import { CSharpAnalyzer } from './language/csharpAnalyzer';
import { JavaAnalyzer } from './language/javaAnalyzer';

export class ProjectAnalyzer {
    private languageAnalyzers: Map<string, LanguageAnalyzer>;
    private gitignorePatterns: string[] = [];

    constructor() {
        this.languageAnalyzers = new Map();
        this.languageAnalyzers.set('ts', new TypeScriptAnalyzer());
        this.languageAnalyzers.set('tsx', new TypeScriptAnalyzer());
        this.languageAnalyzers.set('js', new JavaScriptAnalyzer());
        this.languageAnalyzers.set('jsx', new JavaScriptAnalyzer());
        this.languageAnalyzers.set('py', new PythonAnalyzer());
        this.languageAnalyzers.set('cs', new CSharpAnalyzer());
        this.languageAnalyzers.set('java', new JavaAnalyzer());
    }

    async analyzeProject(rootPath: string): Promise<ProjectStructure> {
        // Load .gitignore patterns first
        this.loadGitignore(rootPath);
        
        const files = await this.scanDirectory(rootPath);
        const processedFiles = await this.processFiles(files, rootPath);
        const dependencies = this.buildDependencyGraph(processedFiles);
        const folders = this.buildFolderStructure(processedFiles, rootPath);

        return {
            rootPath,
            files: processedFiles,
            dependencies,
            folders
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
                        extension: ext
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
        
        // Ignore node modules and built-in modules
        if (!dependency.startsWith('./') && !dependency.startsWith('../') && !dependency.includes('/')) {
            if (dependency === 'path' || dependency === 'fs' || dependency === 'vscode') {
                return null;
            }
        }
        
        // Dependencias relativas
        if (dependency.startsWith('./') || dependency.startsWith('../')) {
            const resolved = path.resolve(dir, dependency);
            
            // Intentar con diferentes extensiones
            const extensions = ['.ts', '.tsx', '.js', '.jsx', '.py', '.cs', '.java'];
            
            for (const ext of extensions) {
                const withExt = resolved + ext;
                if (this.fileExists(withExt)) {
                    return withExt;
                }
            }
            
            // Intentar con index
            for (const ext of extensions) {
                const indexPath = path.join(resolved, 'index' + ext);
                if (this.fileExists(indexPath)) {
                    return indexPath;
                }
            }
        }
        
        // Dependencias que pueden ser archivos en el mismo directorio (sin ./ prefix)
        if (!dependency.includes('/') && !dependency.includes('\\')) {
            const extensions = ['.ts', '.tsx', '.js', '.jsx', '.py', '.cs', '.java'];
            
            for (const ext of extensions) {
                const sameDirPath = path.join(dir, dependency + ext);
                if (this.fileExists(sameDirPath)) {
                    return sameDirPath;
                }
            }
        }
        
        // Buscar en subdirectorios del directorio actual
        if (dependency.includes('/')) {
            const resolved = path.resolve(dir, dependency);
            const extensions = ['.ts', '.tsx', '.js', '.jsx', '.py', '.cs', '.java'];
            
            for (const ext of extensions) {
                const withExt = resolved + ext;
                if (this.fileExists(withExt)) {
                    return withExt;
                }
            }
        }
        
        return null;
    }

    private fileExists(filePath: string): boolean {
        try {
            return fs.existsSync(filePath);
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
        const langMap: { [key: string]: string } = {
            'ts': 'TypeScript',
            'tsx': 'TypeScript React',
            'js': 'JavaScript',
            'jsx': 'JavaScript React',
            'py': 'Python',
            'cs': 'C#',
            'java': 'Java'
        };
        return langMap[ext] || ext.toUpperCase();
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