import * as vscode from 'vscode';
import * as path from 'path';
import { ProjectStructure } from '../analyzer/types';

export class DependencyViewerProvider {
    constructor(private readonly _extensionUri: vscode.Uri) {}

    public getWebviewContent(webview: vscode.Webview, projectData: ProjectStructure): string {
        // URLs para recursos estáticos
        const scriptUri = webview.asWebviewUri(
            vscode.Uri.joinPath(this._extensionUri, 'media', 'viewer.js')
        );
        const styleUri = webview.asWebviewUri(
            vscode.Uri.joinPath(this._extensionUri, 'media', 'viewer.css')
        );
        const d3Uri = webview.asWebviewUri(
            vscode.Uri.joinPath(this._extensionUri, 'media', 'd3.min.js')
        );

        // Nonce para seguridad CSP
        const nonce = this.getNonce();

        return `<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src ${webview.cspSource}; script-src 'nonce-${nonce}';">
    <link href="${styleUri}" rel="stylesheet">
    <title>MapPath - Dependencias del Proyecto</title>
</head>
<body>
    <div id="app">
        <header class="header">
            <h1>🗺️ MapPath - Análisis de Dependencias</h1>
            <div class="controls">
                <div class="control-group">
                    <label for="view-mode">Vista:</label>
                    <select id="view-mode">
                        <option value="graph">Grafo de Dependencias</option>
                        <option value="tree">Árbol de Archivos</option>
                        <option value="folders">Agrupado por Carpetas</option>
                    </select>
                </div>
                <div class="control-group">
                    <label for="language-filter">Lenguaje:</label>
                    <select id="language-filter">
                        <option value="all">Todos</option>
                    </select>
                </div>
                <div class="control-group">
                    <button id="reset-zoom">Restablecer Zoom</button>
                    <button id="fit-graph">Centrar Grafo</button>
                </div>
            </div>
        </header>

        <div class="content">
            <div id="sidebar" class="sidebar">
                <div class="stats">
                    <h3>📊 Estadísticas</h3>
                    <div class="stat-item">
                        <span class="stat-label">Archivos:</span>
                        <span class="stat-value" id="file-count">0</span>
                    </div>
                    <div class="stat-item">
                        <span class="stat-label">Dependencias:</span>
                        <span class="stat-value" id="dependency-count">0</span>
                    </div>
                    <div class="stat-item">
                        <span class="stat-label">Carpetas:</span>
                        <span class="stat-value" id="folder-count">0</span>
                    </div>
                </div>

                <div class="file-info">
                    <h3>📋 Información del Archivo</h3>
                    <div id="file-details">
                        <p class="info-placeholder">Selecciona un archivo para ver detalles</p>
                    </div>
                </div>

                <div class="legend">
                    <h3>🏷️ Leyenda</h3>
                    <div class="legend-item">
                        <div class="legend-color typescript"></div>
                        <span>TypeScript</span>
                    </div>
                    <div class="legend-item">
                        <div class="legend-color javascript"></div>
                        <span>JavaScript</span>
                    </div>
                    <div class="legend-item">
                        <div class="legend-color python"></div>
                        <span>Python</span>
                    </div>
                    <div class="legend-item">
                        <div class="legend-color csharp"></div>
                        <span>C#</span>
                    </div>
                    <div class="legend-item">
                        <div class="legend-color java"></div>
                        <span>Java</span>
                    </div>
                </div>
            </div>

            <div id="main-content" class="main-content">
                <div id="visualization" class="visualization">
                    <div id="loading" class="loading">
                        <div class="spinner"></div>
                        <p>Generando visualización...</p>
                    </div>
                </div>
            </div>

            <div id="tooltip" class="tooltip"></div>
        </div>
    </div>

    <script nonce="${nonce}" src="${d3Uri}"></script>
    <script nonce="${nonce}">
        // Datos del proyecto
        window.projectData = ${JSON.stringify(projectData)};
    </script>
    <script nonce="${nonce}" src="${scriptUri}"></script>
</body>
</html>`;
    }

    private getNonce(): string {
        let text = '';
        const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
        for (let i = 0; i < 32; i++) {
            text += possible.charAt(Math.floor(Math.random() * possible.length));
        }
        return text;
    }
}