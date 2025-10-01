// MapPath - Mermaid Viewer Script

(function() {
    'use strict';

    // Configuración de Mermaid
    mermaid.initialize({
        startOnLoad: false,
        theme: 'dark',
        themeVariables: {
            darkMode: true,
            background: '#1e1e1e',
            primaryColor: '#3178c6',
            primaryTextColor: '#fff',
            primaryBorderColor: '#7C0000',
            lineColor: '#858585',
            secondaryColor: '#006100',
            tertiaryColor: '#fff',
            fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
            fontSize: '14px'
        },
        flowchart: {
            curve: 'basis',
            padding: 15,
            nodeSpacing: 50,
            rankSpacing: 50
        },
        graph: {
            curve: 'basis'
        }
    });

    let projectData = window.projectData;
    let filteredData = null;
    let currentMermaidCode = '';
    let currentZoom = 1;
    let panX = 0;
    let panY = 0;
    let isDragging = false;
    let dragStartX = 0;
    let dragStartY = 0;

    // Elementos del DOM
    const elements = {
        diagramType: document.getElementById('diagram-type'),
        languageFilter: document.getElementById('language-filter'),
        maxDepth: document.getElementById('max-depth'),
        regenerate: document.getElementById('regenerate'),
        zoomIn: document.getElementById('zoom-in'),
        zoomOut: document.getElementById('zoom-out'),
        zoomReset: document.getElementById('zoom-reset'),
        copyMermaid: document.getElementById('copy-mermaid'),
        exportSvg: document.getElementById('export-svg'),
        fileCount: document.getElementById('file-count'),
        dependencyCount: document.getElementById('dependency-count'),
        folderCount: document.getElementById('folder-count'),
        visibleNodes: document.getElementById('visible-nodes'),
        fileDetails: document.getElementById('file-details'),
        mermaidContainer: document.getElementById('mermaid-container'),
        loading: document.getElementById('loading')
    };

    // Inicialización
    function init() {
        populateLanguageFilter();
        generateDynamicLegend();
        updateStats();
        generateDiagram();
        setupEventListeners();
    }

    // Poblar filtro de lenguajes
    function populateLanguageFilter() {
        const languages = new Set();
        projectData.files.forEach(file => {
            if (file.language) {
                languages.add(file.language);
            }
        });

        languages.forEach(lang => {
            const option = document.createElement('option');
            option.value = lang;
            option.textContent = lang.charAt(0).toUpperCase() + lang.slice(1);
            elements.languageFilter.appendChild(option);
        });
    }

    // Generar leyenda dinámica basada en lenguajes presentes
    function generateDynamicLegend() {
        const legendContainer = document.querySelector('.legend');
        if (!legendContainer) return;

        // Obtener lenguajes únicos del proyecto
        const languages = new Set();
        projectData.files.forEach(file => {
            if (file.language) {
                languages.add(file.language);
            }
        });

        // Limpiar leyenda actual y crear nueva
        legendContainer.innerHTML = '<h3>🏷️ Leyenda de Colores</h3>';

        // Ordenar lenguajes alfabéticamente
        const sortedLanguages = Array.from(languages).sort();

        sortedLanguages.forEach(language => {
            const color = getLanguageColor(language);
            const textColor = getContrastColor(color);
            
            const legendItem = document.createElement('div');
            legendItem.className = 'legend-item';
            
            const colorBox = document.createElement('div');
            colorBox.className = 'legend-color';
            colorBox.style.backgroundColor = color;
            colorBox.style.border = '1px solid #fff';
            
            const label = document.createElement('span');
            label.textContent = language;
            
            legendItem.appendChild(colorBox);
            legendItem.appendChild(label);
            legendContainer.appendChild(legendItem);
        });
    }

    // Actualizar estadísticas
    function updateStats() {
        const data = filteredData || projectData;
        
        elements.fileCount.textContent = data.files.length;
        
        // Contar dependencias reales desde edges
        const projectEdges = data.dependencies?.edges || [];
        elements.dependencyCount.textContent = projectEdges.length;

        const folders = new Set();
        data.files.forEach(file => {
            const parts = file.path.split('/');
            if (parts.length > 1) {
                folders.add(parts.slice(0, -1).join('/'));
            }
        });
        elements.folderCount.textContent = folders.size;
    }

    // Filtrar datos
    function filterData() {
        const languageFilter = elements.languageFilter.value;
        
        if (languageFilter === 'all') {
            filteredData = null;
            return projectData;
        }

        filteredData = {
            ...projectData,
            files: projectData.files.filter(file => file.language === languageFilter)
        };

        return filteredData;
    }

    // Generar ID seguro para Mermaid
    function sanitizeId(str) {
        return str
            .replace(/[^a-zA-Z0-9_]/g, '_')
            .replace(/^[0-9]/, '_$&');
    }

    // Obtener color por lenguaje
    function getLanguageColor(language) {
        const colors = {
            'typescript': '#3178c6',
            'javascript': '#f7df1e', 
            'vue': '#42b883',
            'vue.js': '#42b883',
            'python': '#3776ab',
            'csharp': '#239120',
            'c#': '#239120',
            'java': '#007396',
            'html': '#e34f26',
            'css': '#1572b6',
            'scss': '#cf649a',
            'less': '#1d365d',
            'json': '#000000',
            'xml': '#0060ac',
            'yaml': '#cb171e',
            'yml': '#cb171e',
            'markdown': '#083fa1',
            'md': '#083fa1',
            'php': '#777bb4',
            'ruby': '#cc342d',
            'go': '#00add8',
            'rust': '#000000',
            'kotlin': '#7f52ff',
            'swift': '#fa7343',
            'dart': '#0175c2',
            'r': '#198ce7',
            'shell': '#89e051',
            'bash': '#89e051',
            'powershell': '#012456',
            'sql': '#e38c00'
        };
        return colors[language?.toLowerCase()] || '#6c757d';
    }

    // Determinar color de texto para contraste óptimo
    function getContrastColor(hexColor) {
        // Convertir hex a RGB
        const hex = hexColor.replace('#', '');
        const r = parseInt(hex.substr(0, 2), 16);
        const g = parseInt(hex.substr(2, 2), 16);
        const b = parseInt(hex.substr(4, 2), 16);
        
        // Calcular luminancia relativa (fórmula W3C)
        const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
        
        // Retornar blanco para fondos oscuros, negro para fondos claros
        return luminance > 0.5 ? '#000000' : '#ffffff';
    }

    // Generar código Mermaid
    function generateMermaidCode() {
        const data = filterData();
        const diagramType = elements.diagramType.value;
        const maxDepth = parseInt(elements.maxDepth.value) || 0;

        // Usar diferentes generadores según el tipo
        if (diagramType === 'grouped-files') {
            return generateGroupedFilesDiagram(data, maxDepth);
        } else if (diagramType === 'folders-only') {
            return generateFoldersOnlyDiagram(data);
        } else {
            return generateSimpleDiagram(data, diagramType, maxDepth);
        }
    }

    // Generar diagrama simple (sin agrupación)
    function generateSimpleDiagram(data, diagramType, maxDepth) {
        let mermaidCode = '';
        
        // Definir tipo de diagrama
        switch (diagramType) {
            case 'graph':
                mermaidCode = 'graph LR\n';
                break;
            case 'flowchart':
                mermaidCode = 'flowchart TD\n';
                break;
            case 'flowchart-lr':
                mermaidCode = 'flowchart LR\n';
                break;
            default:
                mermaidCode = 'graph LR\n';
        }

        // Mapear archivos a IDs
        const fileToId = new Map();
        data.files.forEach((file, index) => {
            fileToId.set(file.path, sanitizeId(file.path));
        });

        // Agregar estilos por lenguaje
        mermaidCode += '\n%% Estilos por lenguaje\n';
        const languageStyles = new Map();
        const styleCounter = { value: 0 };

        data.files.forEach(file => {
            if (!languageStyles.has(file.language)) {
                const color = getLanguageColor(file.language);
                languageStyles.set(file.language, styleCounter.value);
                // Determinar color de texto basado en la luminancia del fondo
                const textColor = getContrastColor(color);
                mermaidCode += `classDef style${styleCounter.value} fill:${color},stroke:#fff,stroke-width:2px,color:${textColor}\n`;
                styleCounter.value++;
            }
        });

        // Construir grafo de dependencias con límite de profundidad
        const addedNodes = new Set();
        const addedEdges = new Set();
        let visibleNodeCount = 0;
        const nodesToAdd = [];
        const edgesToAdd = [];

        // Obtener edges reales del proyecto
        const projectEdges = data.dependencies?.edges || [];
        
        // Crear un mapa de archivos para búsqueda rápida
        const filePathMap = new Map();
        data.files.forEach(file => {
            filePathMap.set(file.path, file);
        });

        // Función recursiva para recolectar nodos con profundidad
        function collectNodeWithDeps(filePath, currentDepth) {
            if (maxDepth > 0 && currentDepth > maxDepth) {
                return;
            }

            const file = filePathMap.get(filePath);
            if (!file) return;

            const nodeId = fileToId.get(filePath);
            const fileName = filePath.split('/').pop() || filePath;

            if (!addedNodes.has(nodeId)) {
                addedNodes.add(nodeId);
                const styleClass = languageStyles.get(file.language);
                nodesToAdd.push({ id: nodeId, name: fileName, style: styleClass });
                visibleNodeCount++;
            }

            // Recolectar dependencias usando edges reales
            projectEdges.forEach(edge => {
                if (edge.from === filePath) {
                    const depFile = filePathMap.get(edge.to);
                    if (depFile) {
                        const depId = fileToId.get(edge.to);
                        const edgeKey = `${nodeId}->${depId}`;

                        if (!addedEdges.has(edgeKey)) {
                            addedEdges.add(edgeKey);
                            edgesToAdd.push({ from: nodeId, to: depId });
                        }

                        // Recursión con profundidad
                        if (maxDepth === 0 || currentDepth < maxDepth) {
                            collectNodeWithDeps(edge.to, currentDepth + 1);
                        }
                    }
                }
            });
        }

        // Recolectar todos los archivos como nodos raíz
        if (maxDepth === 0) {
            // Sin límite: agregar todos los archivos
            data.files.forEach(file => {
                collectNodeWithDeps(file.path, 1);
            });
        } else {
            // Con límite: identificar archivos raíz (que no son dependencias de otros)
            const filesWithDependents = new Set();
            projectEdges.forEach(edge => {
                filesWithDependents.add(edge.to);
            });

            data.files.forEach(file => {
                if (!filesWithDependents.has(file.path)) {
                    collectNodeWithDeps(file.path, 1);
                }
            });
        }

        // Asegurar que cualquier archivo referenciado por las edges tenga un nodo (evita nodos faltantes cuando
        // la recolección por raíces y profundidad no los alcanzó). Esto agrega solo los nodos faltantes referenciados
        // por las relaciones reales del proyecto.
        projectEdges.forEach(edge => {
            [edge.from, edge.to].forEach(p => {
                const pid = fileToId.get(p);
                if (!pid) return;
                if (!addedNodes.has(pid)) {
                    const f = filePathMap.get(p);
                    if (f) {
                        const fileName = f.path.split('/').pop() || f.path;
                        const styleClass = languageStyles.get(f.language);
                        addedNodes.add(pid);
                        nodesToAdd.push({ id: pid, name: fileName, style: styleClass });
                        visibleNodeCount++;
                    }
                }
            });
        });

        // Ahora agregar todos los nodos primero
        mermaidCode += '\n%% Nodos\n';
        nodesToAdd.forEach(node => {
            mermaidCode += `    ${node.id}["${node.name}"]:::style${node.style}\n`;
        });

        // Luego agregar todas las relaciones
        mermaidCode += '\n%% Relaciones\n';
        edgesToAdd.forEach(edge => {
            mermaidCode += `    ${edge.from} --> ${edge.to}\n`;
        });

        elements.visibleNodes.textContent = visibleNodeCount;
        currentMermaidCode = mermaidCode;
        return mermaidCode;
    }

    // Generar diagrama con archivos agrupados por carpetas
    function generateGroupedFilesDiagram(data, maxDepth) {
        let mermaidCode = 'flowchart TD\n';
        
        // Agrupar archivos por carpeta
        const folderMap = new Map();
        data.files.forEach(file => {
            const parts = file.path.split('/');
            const folder = parts.length > 1 ? parts.slice(0, -1).join('/') : 'root';
            
            if (!folderMap.has(folder)) {
                folderMap.set(folder, []);
            }
            folderMap.get(folder).push(file);
        });

        // Estilos por lenguaje
        mermaidCode += '\n%% Estilos por lenguaje\n';
        const languageStyles = new Map();
        let styleCounter = 0;

        data.files.forEach(file => {
            if (!languageStyles.has(file.language)) {
                const color = getLanguageColor(file.language);
                languageStyles.set(file.language, styleCounter);
                // Determinar color de texto basado en la luminancia del fondo
                const textColor = getContrastColor(color);
                mermaidCode += `classDef style${styleCounter} fill:${color},stroke:#fff,stroke-width:2px,color:${textColor}\n`;
                styleCounter++;
            }
        });

        // Estilo para subgrafos (carpetas)
        mermaidCode += 'classDef folderStyle fill:#2d2d30,stroke:#858585,stroke-width:2px\n';

        mermaidCode += '\n%% Carpetas y archivos\n';
        const fileToId = new Map();
        let visibleNodeCount = 0;

        // Crear subgrafos por carpeta
        folderMap.forEach((files, folder) => {
            const folderId = sanitizeId(folder);
            const folderName = folder === 'root' ? 'Root' : folder.split('/').pop();
            
            mermaidCode += `\n    subgraph ${folderId}["📁 ${folderName}"]\n`;
            
            files.forEach(file => {
                const fileId = sanitizeId(file.path);
                fileToId.set(file.path, fileId);
                const fileName = file.path.split('/').pop() || file.path;
                const styleClass = languageStyles.get(file.language);
                
                mermaidCode += `        ${fileId}["${fileName}"]:::style${styleClass}\n`;
                visibleNodeCount++;
            });
            
            mermaidCode += `    end\n`;
        });

        // Agregar relaciones entre archivos usando edges reales
        mermaidCode += '\n%% Relaciones\n';
        const addedEdges = new Set();
        const projectEdges = data.dependencies?.edges || [];

        projectEdges.forEach(edge => {
            const fromId = fileToId.get(edge.from);
            const toId = fileToId.get(edge.to);
            
            if (fromId && toId) {
                const edgeKey = `${fromId}->${toId}`;
                
                if (!addedEdges.has(edgeKey)) {
                    addedEdges.add(edgeKey);
                    mermaidCode += `    ${fromId} --> ${toId}\n`;
                }
            }
        });

        elements.visibleNodes.textContent = visibleNodeCount;
        currentMermaidCode = mermaidCode;
        return mermaidCode;
    }

    // Generar diagrama solo con carpetas y sus uniones
    function generateFoldersOnlyDiagram(data) {
        let mermaidCode = 'flowchart LR\n';
        
        // Agrupar archivos por carpeta y detectar dependencias entre carpetas
        const folderMap = new Map();
        const folderDeps = new Map();
        
        data.files.forEach(file => {
            const parts = file.path.split('/');
            const folder = parts.length > 1 ? parts.slice(0, -1).join('/') : 'root';
            
            if (!folderMap.has(folder)) {
                folderMap.set(folder, []);
                folderDeps.set(folder, new Set());
            }
            folderMap.get(folder).push(file);
        });

        // Detectar dependencias entre carpetas usando edges reales
        const projectEdges = data.dependencies?.edges || [];
        
        projectEdges.forEach(edge => {
            const sourceParts = edge.from.split('/');
            const targetParts = edge.to.split('/');
            
            const sourceFolder = sourceParts.length > 1 ? sourceParts.slice(0, -1).join('/') : 'root';
            const targetFolder = targetParts.length > 1 ? targetParts.slice(0, -1).join('/') : 'root';
            
            if (sourceFolder !== targetFolder && folderMap.has(targetFolder)) {
                if (!folderDeps.has(sourceFolder)) {
                    folderDeps.set(sourceFolder, new Set());
                }
                folderDeps.get(sourceFolder).add(targetFolder);
            }
        });

        // Estilo para carpetas
        mermaidCode += '\n%% Estilos\n';
        mermaidCode += 'classDef folderStyle fill:#3178c6,stroke:#fff,stroke-width:3px,color:#fff\n';

        // Agregar nodos de carpetas
        mermaidCode += '\n%% Carpetas\n';
        const folderToId = new Map();
        
        folderMap.forEach((files, folder) => {
            const folderId = sanitizeId(folder + '_folder');
            folderToId.set(folder, folderId);
            const folderName = folder === 'root' ? 'Root' : folder.split('/').pop();
            const fileCount = files.length;
            
            mermaidCode += `    ${folderId}["📁 ${folderName}<br/>(${fileCount} archivos)"]:::folderStyle\n`;
        });

        // Agregar relaciones entre carpetas
        mermaidCode += '\n%% Relaciones entre carpetas\n';
        const addedEdges = new Set();
        
        folderDeps.forEach((deps, folder) => {
            const folderId = folderToId.get(folder);
            
            deps.forEach(targetFolder => {
                const targetId = folderToId.get(targetFolder);
                const edgeKey = `${folderId}->${targetId}`;
                
                if (!addedEdges.has(edgeKey)) {
                    addedEdges.add(edgeKey);
                    mermaidCode += `    ${folderId} --> ${targetId}\n`;
                }
            });
        });

        elements.visibleNodes.textContent = folderMap.size;
        currentMermaidCode = mermaidCode;
        return mermaidCode;
    }

    // Renderizar diagrama Mermaid
    async function generateDiagram() {
        try {
            elements.loading.style.display = 'flex';
            elements.mermaidContainer.innerHTML = '';

            const mermaidCode = generateMermaidCode();
            
            // Crear elemento para Mermaid
            const mermaidDiv = document.createElement('div');
            mermaidDiv.className = 'mermaid';
            mermaidDiv.textContent = mermaidCode;
            elements.mermaidContainer.appendChild(mermaidDiv);

            // Renderizar
            await mermaid.run({
                nodes: [mermaidDiv]
            });

            // Ocultar el SVG temporalmente mientras se ajusta
            const svg = elements.mermaidContainer.querySelector('svg');
            if (svg) {
                svg.style.opacity = '0';
            }
            
            // Configurar zoom y pan
            setupZoomAndPan();
            
            // Ajustar a pantalla automáticamente
            // fitToScreen();
            
            // Agregar listeners a nodos
            setupNodeClickListeners();
            
            // Mostrar el SVG ya ajustado
            if (svg) {
                svg.style.opacity = '1';
            }
            
            elements.loading.style.display = 'none';
            updateStats();
        } catch (error) {
            console.error('Error generando diagrama Mermaid:', error);
            elements.loading.style.display = 'none';
            showMessage('Error al generar el diagrama', 'error');
        }
    }

    // Configurar zoom y pan en el SVG
    function setupZoomAndPan() {
        const svg = elements.mermaidContainer.querySelector('svg');
        if (!svg) return;

        // Configurar viewBox si no existe
        if (!svg.getAttribute('viewBox')) {
            const bbox = svg.getBBox();
            svg.setAttribute('viewBox', `${bbox.x} ${bbox.y} ${bbox.width} ${bbox.height}`);
        }

        // Habilitar pan con drag (mejorado) usando coordenadas SVG para consistencia entre diagramas
        svg.style.cursor = 'grab';

        // Estado de panning
        let isPanning = false;
        // Iniciar desde valores guardados si existen (estos valores están en unidades SVG/user-space)
        let currentTranslate = { x: parseFloat(svg.dataset.panX || '0'), y: parseFloat(svg.dataset.panY || '0') };
        let startPointSVG = { x: 0, y: 0 };
        let startTranslate = { x: 0, y: 0 };

        // Cachear el <g> interno para evitar querySelector frecuente
        const cachedG = svg.querySelector('g');

        // requestAnimationFrame flag para throttling
        let rafPending = false;

        // Helper: obtener punto en coordenadas SVG/user-space a partir de un evento de puntero
        function getSVGPointFromEvent(evt) {
            const pt = svg.createSVGPoint();
            pt.x = evt.clientX;
            pt.y = evt.clientY;
            const ctm = svg.getScreenCTM();
            if (!ctm) return { x: evt.clientX, y: evt.clientY };
            const inv = ctm.inverse();
            const svgP = pt.matrixTransform(inv);
            return { x: svgP.x, y: svgP.y };
        }

        svg.addEventListener('mousedown', (e) => {
            // Solo iniciar panning si el click no fue sobre un nodo concreto
            if (e.button === 0 && (e.target === svg || e.target.closest('.node') === null)) {
                isPanning = true;
                svg.style.cursor = 'grabbing';
                startPointSVG = getSVGPointFromEvent(e);
                startTranslate = { x: currentTranslate.x, y: currentTranslate.y };
                e.preventDefault();
            }
        });

        svg.addEventListener('mousemove', (e) => {
            if (!isPanning) return;

            // Obtener delta en coordenadas SVG/user-space y aplicar en RAF
            const currentPointSVG = getSVGPointFromEvent(e);
            const deltaX = currentPointSVG.x - startPointSVG.x;
            const deltaY = currentPointSVG.y - startPointSVG.y;

            if (!rafPending) {
                rafPending = true;
                window.requestAnimationFrame(() => {
                    currentTranslate.x = startTranslate.x + deltaX;
                    currentTranslate.y = startTranslate.y + deltaY;
                    // Aplicar transform al <g> cacheado (más barato que querySelector cada vez)
                    if (cachedG) {
                        cachedG.setAttribute('transform', `translate(${currentTranslate.x}, ${currentTranslate.y}) scale(${currentZoom})`);
                    } else {
                        updateSvgTransform(svg, currentTranslate, currentZoom);
                    }
                    rafPending = false;
                });
            }

            e.preventDefault();
        });

        function endPan() {
            if (!isPanning) return;
            isPanning = false;
            svg.style.cursor = 'grab';
            // Persistir en dataset para usar en zoom buttons
            svg.dataset.panX = String(currentTranslate.x);
            svg.dataset.panY = String(currentTranslate.y);
        }

        svg.addEventListener('mouseup', endPan);
        svg.addEventListener('mouseleave', endPan);

        // Zoom con rueda del mouse (throttled con RAF) - ajustar usando coordenadas SVG para mantener el punto bajo el cursor
        svg.addEventListener('wheel', (e) => {
            e.preventDefault();
            const delta = e.deltaY > 0 ? 0.9 : 1.1;

            if (!rafPending) {
                rafPending = true;
                window.requestAnimationFrame(() => {
                    const prevZoom = currentZoom;
                    let newZoom = currentZoom * delta;
                    newZoom = Math.max(0.1, Math.min(10, newZoom));

                    // Punto del cursor en coordenadas SVG antes del zoom
                    const pointerSVG = (function() {
                        const pt = svg.createSVGPoint();
                        pt.x = e.clientX;
                        pt.y = e.clientY;
                        const ctm = svg.getScreenCTM();
                        if (!ctm) return { x: e.clientX, y: e.clientY };
                        return pt.matrixTransform(ctm.inverse());
                    })();

                    // Ajustar la traslación en coordenadas SVG para mantener el punto bajo el cursor
                    const scaleChange = newZoom / prevZoom;
                    currentTranslate.x = pointerSVG.x - (pointerSVG.x - currentTranslate.x) * scaleChange;
                    currentTranslate.y = pointerSVG.y - (pointerSVG.y - currentTranslate.y) * scaleChange;

                    currentZoom = newZoom;

                    if (cachedG) {
                        cachedG.setAttribute('transform', `translate(${currentTranslate.x}, ${currentTranslate.y}) scale(${currentZoom})`);
                    } else {
                        updateSvgTransform(svg, currentTranslate, currentZoom);
                    }

                    // Guardar
                    svg.dataset.panX = String(currentTranslate.x);
                    svg.dataset.panY = String(currentTranslate.y);

                    rafPending = false;
                });
            }
        }, { passive: false });

        // Guardar referencia para los botones si no existían
        svg.dataset.panX = svg.dataset.panX || '0';
        svg.dataset.panY = svg.dataset.panY || '0';
    }

    // Actualizar transformación del SVG
    function updateSvgTransform(svg, translate, zoom) {
        const g = svg.querySelector('g');
        if (g) {
            g.setAttribute('transform', `translate(${translate.x}, ${translate.y}) scale(${zoom})`);
        }
    }

    // Zoom in
    function zoomIn() {
        const svg = elements.mermaidContainer.querySelector('svg');
        if (!svg) return;

        currentZoom *= 1.2;
        currentZoom = Math.min(10, currentZoom);
        
        const translate = { x: parseFloat(svg.dataset.panX || 0), y: parseFloat(svg.dataset.panY || 0) };
        updateSvgTransform(svg, translate, currentZoom);
    }

    // Zoom out
    function zoomOut() {
        const svg = elements.mermaidContainer.querySelector('svg');
        if (!svg) return;

        currentZoom *= 0.8;
        currentZoom = Math.max(0.1, currentZoom);
        
        const translate = { x: parseFloat(svg.dataset.panX || 0), y: parseFloat(svg.dataset.panY || 0) };
        updateSvgTransform(svg, translate, currentZoom);
    }

    // Ajustar a pantalla
    function fitToScreen() {
        const svg = elements.mermaidContainer.querySelector('svg');
        if (!svg) return;

        const container = elements.mermaidContainer;
        const bbox = svg.getBBox();
        
        const containerWidth = container.clientWidth - 40; // padding
        const containerHeight = container.clientHeight - 40;
        
        const scaleX = containerWidth / bbox.width;
        const scaleY = containerHeight / bbox.height;
        
        currentZoom = Math.min(scaleX, scaleY, 1); // No hacer zoom mayor a 1
        
        // Centrar el diagrama
        const translateX = (containerWidth - bbox.width * currentZoom) / 2;
        const translateY = (containerHeight - bbox.height * currentZoom) / 2;
        
        const translate = { x: translateX, y: translateY };
        
        svg.dataset.panX = translateX.toString();
        svg.dataset.panY = translateY.toString();
        
        updateSvgTransform(svg, translate, currentZoom);
    }

    // Configurar listeners de clicks en nodos
    function setupNodeClickListeners() {
        const svg = elements.mermaidContainer.querySelector('svg');
        if (!svg) return;

        const nodes = svg.querySelectorAll('.node');
        nodes.forEach(node => {
            node.style.cursor = 'pointer';
            node.addEventListener('click', (e) => {
                const textElement = node.querySelector('text, .nodeLabel');
                if (textElement) {
                    const fileName = textElement.textContent.trim();
                    const file = (filteredData || projectData).files.find(f => {
                        const name = f.path.split('/').pop();
                        return name === fileName;
                    });
                    if (file) {
                        showFileDetails(file);
                    }
                }
            });
        });
    }

    // Mostrar detalles del archivo
    function showFileDetails(file) {
        let html = `
            <div class="file-path">${file.path}</div>
            <div class="file-language">${file.language}</div>
        `;

        // Obtener dependencias reales desde edges
        const projectEdges = (filteredData || projectData).dependencies?.edges || [];
        const realDependencies = projectEdges
            .filter(edge => edge.from === file.path)
            .map(edge => edge.to);

        if (realDependencies.length > 0) {
            html += `
                <div class="dependency-list">
                    <h4>Dependencias (${realDependencies.length}):</h4>
                    <ul>
                        ${realDependencies.map(dep => {
                            const depName = dep.split('/').pop() || dep;
                            return `<li title="${dep}">${depName}</li>`;
                        }).join('')}
                    </ul>
                </div>
            `;
        }

        // Obtener archivos que dependen de este archivo
        const dependents = projectEdges
            .filter(edge => edge.to === file.path)
            .map(edge => edge.from);

        if (dependents.length > 0) {
            html += `
                <div class="dependency-list">
                    <h4>Usado por (${dependents.length}):</h4>
                    <ul>
                        ${dependents.map(dep => {
                            const depName = dep.split('/').pop() || dep;
                            return `<li title="${dep}">${depName}</li>`;
                        }).join('')}
                    </ul>
                </div>
            `;
        }

        if (file.exports && file.exports.length > 0) {
            html += `
                <div class="dependency-list">
                    <h4>Exportaciones (${file.exports.length}):</h4>
                    <ul>
                        ${file.exports.map(exp => `<li>${exp}</li>`).join('')}
                    </ul>
                </div>
            `;
        }

        elements.fileDetails.innerHTML = html;
    }

    // Copiar código Mermaid al portapapeles
    async function copyMermaidCode() {
        try {
            await navigator.clipboard.writeText(currentMermaidCode);
            showMessage('Código Mermaid copiado al portapapeles', 'success');
        } catch (error) {
            console.error('Error copiando código:', error);
            showMessage('Error al copiar el código', 'error');
        }
    }

    // Exportar como SVG
    function exportSvg() {
        try {
            const svg = elements.mermaidContainer.querySelector('svg');
            if (!svg) {
                showMessage('No hay diagrama para exportar', 'error');
                return;
            }

            const svgData = svg.outerHTML;
            const blob = new Blob([svgData], { type: 'image/svg+xml' });
            const url = URL.createObjectURL(blob);
            
            const a = document.createElement('a');
            a.href = url;
            a.download = 'mappath-diagram.svg';
            a.click();
            
            URL.revokeObjectURL(url);
            showMessage('Diagrama exportado como SVG', 'success');
        } catch (error) {
            console.error('Error exportando SVG:', error);
            showMessage('Error al exportar el diagrama', 'error');
        }
    }

    // Mostrar mensaje
    function showMessage(text, type = 'success') {
        const message = document.createElement('div');
        message.className = `message ${type}`;
        message.textContent = text;
        document.body.appendChild(message);

        setTimeout(() => {
            message.remove();
        }, 3000);
    }

    // Configurar event listeners
    function setupEventListeners() {
        elements.diagramType.addEventListener('change', generateDiagram);
        elements.languageFilter.addEventListener('change', generateDiagram);
        elements.maxDepth.addEventListener('change', generateDiagram);
        elements.regenerate.addEventListener('click', generateDiagram);
        elements.zoomIn.addEventListener('click', zoomIn);
        elements.zoomOut.addEventListener('click', zoomOut);
        elements.zoomReset.addEventListener('click', fitToScreen);
        elements.copyMermaid.addEventListener('click', copyMermaidCode);
        elements.exportSvg.addEventListener('click', exportSvg);
    }

    // Iniciar cuando el DOM esté listo
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
