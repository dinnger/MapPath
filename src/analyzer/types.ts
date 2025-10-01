export interface FileNode {
    path: string;
    name: string;
    type: 'file' | 'directory';
    language?: string;
    dependencies: string[];
    exports: string[];
    size: number;
    extension: string;
    namespace?: string; // Para C# y Java
}

export interface ProjectStructure {
    rootPath: string;
    files: FileNode[];
    dependencies: DependencyGraph;
    folders: FolderStructure;
    languageColors: { [key: string]: string };
}

export interface DependencyGraph {
    nodes: GraphNode[];
    edges: GraphEdge[];
}

export interface GraphNode {
    id: string;
    label: string;
    path: string;
    type: 'file' | 'folder';
    language?: string;
    size: number;
    group: string; // carpeta padre
}

export interface GraphEdge {
    from: string;
    to: string;
    type: 'import' | 'require' | 'include' | 'using' | 'type-reference';
    weight?: number;
}

export interface FolderStructure {
    [folderPath: string]: {
        files: string[];
        subfolders: string[];
        totalFiles: number;
    };
}