import * as vscode from 'vscode';
import { ProjectAnalyzer } from './analyzer/projectAnalyzer';
import { DependencyViewerProvider } from './viewer/dependencyViewerProvider';

export function activate(context: vscode.ExtensionContext) {
    console.log('MapPath extension is now active');

    const projectAnalyzer = new ProjectAnalyzer();
    const viewerProvider = new DependencyViewerProvider(context.extensionUri);

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
                title: "MapPath: Analizando proyecto...",
                cancellable: false
            }, async (progress) => {
                progress.report({ increment: 0, message: "Escaneando archivos..." });
                
                const dependencies = await projectAnalyzer.analyzeProject(workspaceFolder.uri.fsPath);
                
                progress.report({ increment: 50, message: "Generando visualización..." });
                
                // Crear y mostrar el panel de visualización
                const panel = vscode.window.createWebviewPanel(
                    'mappath.dependencyViewer',
                    'MapPath - Dependencias del Proyecto',
                    vscode.ViewColumn.One,
                    {
                        enableScripts: true,
                        retainContextWhenHidden: true
                    }
                );

                panel.webview.html = viewerProvider.getWebviewContent(panel.webview, dependencies);
                
                progress.report({ increment: 100, message: "Completado" });
            });

        } catch (error) {
            vscode.window.showErrorMessage(`Error al analizar el proyecto: ${error}`);
        }
    });

    context.subscriptions.push(analyzeCommand);
}

export function deactivate() {}