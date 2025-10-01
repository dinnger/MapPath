import * as vscode from 'vscode';
import { ProjectAnalyzer } from './analyzer/projectAnalyzer';
import { DependencyViewerProvider } from './viewer/dependencyViewerProvider';
import { MermaidViewerProvider } from './viewer/mermaidViewerProvider';

export function activate(context: vscode.ExtensionContext) {
    console.log('MapPath extension is now active');

    const projectAnalyzer = new ProjectAnalyzer();
    const viewerProvider = new DependencyViewerProvider(context.extensionUri);
    const mermaidViewerProvider = new MermaidViewerProvider(context.extensionUri);

    // Registrar el comando principal
    const analyzeCommand = vscode.commands.registerCommand('mappath.analyzeProject', async () => {
        try {
            const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
            if (!workspaceFolder) {
                vscode.window.showErrorMessage('No hay ningún workspace abierto');
                return;
            }

            // Mostrar indicador de progreso
            await vscode.window.withProgress({
              location: vscode.ProgressLocation.Notification,
              title: "MapPath: Analyzing project for node diagram visualization...",
              cancellable: false
            }, async (progress) => {
              progress.report({ increment: 0, message: "Scanning files..." });
              
              const dependencies = await projectAnalyzer.analyzeProject(workspaceFolder.uri.fsPath);
              
              progress.report({ increment: 50, message: "Generating node diagram visualization..." });
              
              // Create and show the visualization panel (node diagram)
              const panel = vscode.window.createWebviewPanel(
                'mappath.dependencyViewer',
                'MapPath - Project Dependencies (Node Diagram)',
                vscode.ViewColumn.One,
                {
                  enableScripts: true,
                  retainContextWhenHidden: true
                }
              );

              panel.webview.html = viewerProvider.getWebviewContent(panel.webview, dependencies);
              
              progress.report({ increment: 100, message: "Completed" });
            });

        } catch (error) {
            vscode.window.showErrorMessage(`Error al analizar el proyecto: ${error}`);
        }
    });

    // Registrar comando para visualización con Mermaid
    const analyzeMermaidCommand = vscode.commands.registerCommand('mappath.analyzeProjectMermaid', async () => {
        try {
            const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
            if (!workspaceFolder) {
                vscode.window.showErrorMessage('No hay ningún workspace abierto');
                return;
            }

            // Mostrar indicador de progreso
            await vscode.window.withProgress({
              location: vscode.ProgressLocation.Notification,
              title: "MapPath: Analyzing project for Mermaid diagram visualization...",
              cancellable: false
            }, async (progress) => {
              progress.report({ increment: 0, message: "Scanning files..." });
              
              // Usar el mismo analizador que el comando D3
              const dependencies = await projectAnalyzer.analyzeProject(workspaceFolder.uri.fsPath);
              
              progress.report({ increment: 50, message: "Generating Mermaid diagram visualization..." });
              
              // Create and show the visualization panel (Mermaid diagram)
              const panel = vscode.window.createWebviewPanel(
                'mappath.mermaidViewer',
                'MapPath - Project Dependencies (Mermaid Diagram)',
                vscode.ViewColumn.One,
                {
                  enableScripts: true,
                  retainContextWhenHidden: true
                }
              );

              panel.webview.html = mermaidViewerProvider.getWebviewContent(panel.webview, dependencies);
              
              progress.report({ increment: 100, message: "Completed" });
            });

        } catch (error) {
            vscode.window.showErrorMessage(`Error al analizar el proyecto: ${error}`);
        }
    });

    context.subscriptions.push(analyzeCommand, analyzeMermaidCommand);
}

export function deactivate() {}