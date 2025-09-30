import * as fs from 'fs';
import * as path from 'path';
import { LanguageAnalyzer, AnalysisResult, ImportInfo } from './base';

export class VueAnalyzer implements LanguageAnalyzer {
    private viteAliases: Map<string, string> = new Map();
    private projectRoot: string = '';
    
    getSupportedExtensions(): string[] {
        return ['vue'];
    }

    getLanguageName(): string {
        return 'Vue.js';
    }

    getColor(): string {
        return '#4fc08d';
    }

    setProjectRoot(rootPath: string): void {
        this.projectRoot = rootPath;
        this.loadViteConfig(rootPath);
    }

    getProjectRoot(): string {
        return this.projectRoot;
    }

    resolveAlias(dependency: string): string | null {
        // Check direct alias match
        if (this.viteAliases.has(dependency)) {
            return this.viteAliases.get(dependency)!;
        }
        
        // Check if dependency starts with any alias
        for (const [alias, basePath] of this.viteAliases.entries()) {
            if (dependency.startsWith(alias + '/')) {
                const remainingPath = dependency.substring(alias.length + 1);
                return path.join(basePath, remainingPath);
            }
        }
        
        return null;
    }

    private loadViteConfig(rootPath: string): void {
        this.viteAliases.clear();
        
        // Try different vite config file names
        const configFiles = [
            'vite.config.js',
            'vite.config.ts',
            'vite.config.mjs',
            'vite.config.mts'
        ];
        
        let foundConfigPath: string | null = null;
        let actualRootPath = rootPath;
        
        // First, try to find config in the provided root path
        for (const configFile of configFiles) {
            const configPath = path.join(rootPath, configFile);
            if (fs.existsSync(configPath)) {
                foundConfigPath = configPath;
                break;
            }
        }
        
        // If not found in root, search globally in the project tree
        if (!foundConfigPath) {
            foundConfigPath = this.findViteConfigGlobally(rootPath, configFiles);
            if (foundConfigPath) {
                // Update the actual root path to the directory containing the vite config
                actualRootPath = path.dirname(foundConfigPath);
                this.projectRoot = actualRootPath;
                console.log(`[VueAnalyzer] Found vite config at: ${foundConfigPath}, updating root to: ${actualRootPath}`);
            }
        }
        
        // Parse the found config file
        if (foundConfigPath) {
            try {
                const content = fs.readFileSync(foundConfigPath, 'utf-8');
                this.parseViteConfig(content, actualRootPath);
            } catch (error) {
                console.warn(`Failed to parse ${path.basename(foundConfigPath)}:`, error);
            }
        }
        
        // Add default alias @ -> src if no config found or no alias defined
        if (this.viteAliases.size === 0) {
            const srcPath = path.join(actualRootPath, 'src');
            if (fs.existsSync(srcPath)) {
                this.viteAliases.set('@', srcPath);
            }
        }
    }

    private findViteConfigGlobally(startPath: string, configFiles: string[]): string | null {
        const visited = new Set<string>();
        
        const searchInDirectory = (dirPath: string, maxDepth: number = 5): string | null => {
            if (maxDepth <= 0 || visited.has(dirPath)) {
                return null;
            }
            
            visited.add(dirPath);
            
            try {
                // Check for config files in current directory
                for (const configFile of configFiles) {
                    const configPath = path.join(dirPath, configFile);
                    if (fs.existsSync(configPath)) {
                        return configPath;
                    }
                }
                
                // Search in subdirectories
                const entries = fs.readdirSync(dirPath, { withFileTypes: true });
                for (const entry of entries) {
                    if (entry.isDirectory() && !this.shouldSkipDirectory(entry.name)) {
                        const subDirPath = path.join(dirPath, entry.name);
                        const result = searchInDirectory(subDirPath, maxDepth - 1);
                        if (result) {
                            return result;
                        }
                    }
                }
            } catch (error) {
                // Ignore permission errors and continue searching
                console.debug(`[VueAnalyzer] Cannot access directory: ${dirPath}`);
            }
            
            return null;
        };
        
        // Start searching from the provided path
        let result = searchInDirectory(startPath);
        
        // If not found, also try searching from parent directories (up to project root)
        if (!result) {
            let currentPath = startPath;
            let parentPath = path.dirname(currentPath);
            
            // Go up the tree until we find a vite config or reach the filesystem root
            while (parentPath !== currentPath && !result) {
                result = searchInDirectory(parentPath, 3); // Reduced depth for parent searches
                currentPath = parentPath;
                parentPath = path.dirname(currentPath);
                
                // Stop if we've reached common project indicators
                if (fs.existsSync(path.join(currentPath, 'package.json')) && 
                    fs.existsSync(path.join(currentPath, 'node_modules'))) {
                    break;
                }
            }
        }
        
        return result;
    }

    private shouldSkipDirectory(dirName: string): boolean {
        const skipDirs = [
            'node_modules',
            '.git',
            '.vscode',
            'dist',
            'build',
            'out',
            '.nuxt',
            '.next',
            'coverage',
            '.nyc_output',
            'tmp',
            'temp'
        ];
        
        return skipDirs.includes(dirName) || dirName.startsWith('.');
    }

    private parseViteConfig(content: string, rootPath: string): void {
        try {
            // Remove comments and normalize content for parsing
            const cleanContent = content
                .replace(/\/\*[\s\S]*?\*\//g, '') // Remove /* */ comments
                .replace(/\/\/.*$/gm, ''); // Remove // comments
            
            // Look for resolve.alias configuration
            const aliasRegex = /resolve\s*:\s*\{[\s\S]*?alias\s*:\s*(\{[\s\S]*?\})/;
            const aliasMatch = cleanContent.match(aliasRegex);
            
            if (aliasMatch) {
                const aliasObject = aliasMatch[1];
                this.parseAliasObject(aliasObject, rootPath);
            }
            
            // Also look for defineConfig with resolve.alias
            const defineConfigRegex = /defineConfig\s*\(\s*\{[\s\S]*?resolve\s*:\s*\{[\s\S]*?alias\s*:\s*(\{[\s\S]*?\})/;
            const defineConfigMatch = cleanContent.match(defineConfigRegex);
            
            if (defineConfigMatch) {
                const aliasObject = defineConfigMatch[1];
                this.parseAliasObject(aliasObject, rootPath);
            }
            
        } catch (error) {
            console.warn('Error parsing vite config:', error);
        }
    }

    private parseAliasObject(aliasObject: string, rootPath: string): void {
        // Simple regex-based parsing for common alias patterns
        const patterns = [
            // '@': path.resolve(__dirname, 'src')
            /'([^']+)'\s*:\s*path\.resolve\s*\([^,]+,\s*'([^']+)'\s*\)/g,
            // "@": path.resolve(__dirname, "src")
            /"([^"]+)"\s*:\s*path\.resolve\s*\([^,]+,\s*"([^"]+)"\s*\)/g,
            // '@': './src'
            /'([^']+)'\s*:\s*'([^']+)'/g,
            // "@": "./src"
            /"([^"]+)"\s*:\s*"([^"]+)"/g
        ];
        
        for (const pattern of patterns) {
            let match;
            while ((match = pattern.exec(aliasObject)) !== null) {
                const alias = match[1];
                let aliasPath = match[2];
                
                // Resolve relative paths
                if (aliasPath.startsWith('./') || aliasPath.startsWith('../')) {
                    aliasPath = path.resolve(rootPath, aliasPath);
                } else if (!path.isAbsolute(aliasPath)) {
                    aliasPath = path.resolve(rootPath, aliasPath);
                }
                
                this.viteAliases.set(alias, aliasPath);
            }
        }
    }

    tryResolveWithIndex(basePath: string): string | null {
        // First try direct file with Vue-compatible extensions
        const extensions = ['.vue', '.ts', '.tsx', '.js', '.jsx'];
        for (const ext of extensions) {
            if (this.fileExists(basePath + ext)) {
                return basePath + ext;
            }
        }
        
        // Then try as directory with index files
        if (this.directoryExists(basePath)) {
            for (const ext of extensions) {
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

    async analyze(content: string, filePath: string): Promise<AnalysisResult> {
        const dependencies: string[] = [];
        const exports: string[] = [];
        const imports: ImportInfo[] = [];
        const functions: string[] = [];
        const classes: string[] = [];
        const variables: string[] = [];

        // Extract script section from Vue file
        const scriptMatch = content.match(/<script[^>]*>([\s\S]*?)<\/script>/i);
        if (!scriptMatch) {
            return { dependencies, exports, imports, functions, classes, variables };
        }

        const scriptContent = scriptMatch[1];

        // Detect imports in script section
        const importPatterns = [
            // ES6 imports
            /import\s+(?:\{[^}]*\}|\*\s+as\s+\w+|\w+)?\s*(?:,\s*(?:\{[^}]*\}|\*\s+as\s+\w+|\w+))?\s*from\s+['"`]([^'"`]+)['"`]/g,
            // Dynamic imports
            /import\s*\(\s*['"`]([^'"`]+)['"`]\s*\)/g,
            // require()
            /require\s*\(\s*['"`]([^'"`]+)['"`]\s*\)/g
        ];

        for (const pattern of importPatterns) {
            let match;
            while ((match = pattern.exec(scriptContent)) !== null) {
                const dep = match[1];
                if (dep && !dep.startsWith('http') && !dep.startsWith('//')) {
                    dependencies.push(dep);
                }
            }
        }

        // Detect exports in script section
        const exportPatterns = [
            // export default
            /export\s+default\s+(?:class\s+(\w+)|function\s+(\w+)|(\w+))/g,
            // export const/let/var
            /export\s+(?:const|let|var)\s+(\w+)/g,
            // export function
            /export\s+function\s+(\w+)/g,
            // export class
            /export\s+class\s+(\w+)/g,
            // export { ... }
            /export\s*\{\s*([^}]+)\s*\}/g
        ];

        for (const pattern of exportPatterns) {
            let match;
            while ((match = pattern.exec(scriptContent)) !== null) {
                // Find the first non-null capture group
                for (let i = 1; i < match.length; i++) {
                    if (match[i]) {
                        if (i === match.length - 1 && match[i].includes(',')) {
                            // Handle export { a, b, c }
                            const namedExports = match[i].split(',').map(e => e.trim());
                            exports.push(...namedExports);
                        } else {
                            exports.push(match[i]);
                        }
                        break;
                    }
                }
            }
        }

        // Vue component name from export default
        const componentMatch = scriptContent.match(/export\s+default\s*\{[\s\S]*?name\s*:\s*['"`]([^'"`]+)['"`]/);
        if (componentMatch) {
            exports.push(componentMatch[1]);
        }

        // Extract functions, classes, and variables from script
        const functionMatches = scriptContent.match(/(?:function\s+(\w+)|(\w+)\s*:\s*function|(\w+)\s*\([^)]*\)\s*\{)/g);
        if (functionMatches) {
            functionMatches.forEach(match => {
                const funcMatch = match.match(/(?:function\s+(\w+)|(\w+)\s*:\s*function|(\w+)\s*\()/);
                if (funcMatch) {
                    const funcName = funcMatch[1] || funcMatch[2] || funcMatch[3];
                    if (funcName) functions.push(funcName);
                }
            });
        }

        const classMatches = scriptContent.match(/class\s+(\w+)/g);
        if (classMatches) {
            classMatches.forEach(match => {
                const className = match.match(/class\s+(\w+)/)?.[1];
                if (className) classes.push(className);
            });
        }

        const varMatches = scriptContent.match(/(?:const|let|var)\s+(\w+)/g);
        if (varMatches) {
            varMatches.forEach(match => {
                const varName = match.match(/(?:const|let|var)\s+(\w+)/)?.[1];
                if (varName) variables.push(varName);
            });
        }

        // Remove duplicates
        return {
            dependencies: [...new Set(dependencies)],
            exports: [...new Set(exports)],
            imports: [...new Set(imports)],
            functions: [...new Set(functions)],
            classes: [...new Set(classes)],
            variables: [...new Set(variables)]
        };
    }
}