/**
 * MapPath Dependency Viewer
 * Interactive visualization of project dependencies
 */

class DependencyViewer {
    constructor(projectData) {
        this.projectData = projectData;
        this.currentView = 'graph';
        this.selectedLanguage = 'all';
        this.selectedNode = null;
        this.simulation = null;
        this.svg = null;
        this.zoom = null;
        
        // Color mapping for different languages
        this.languageColors = {
            'TypeScript': '#3178c6',
            'JavaScript': '#f1c40f',
            'Python': '#3776ab',
            'C#': '#239120',
            'Java': '#ed8b00',
            'default': '#6c757d'
        };

        this.init();
    }

    init() {
        this.setupEventListeners();
        this.updateStats();
        this.populateLanguageFilter();
        this.createVisualization();
    }

    setupEventListeners() {
        // View mode selector
        document.getElementById('view-mode').addEventListener('change', (e) => {
            this.currentView = e.target.value;
            this.createVisualization();
        });

        // Language filter
        document.getElementById('language-filter').addEventListener('change', (e) => {
            this.selectedLanguage = e.target.value;
            this.createVisualization();
        });

        // Reset zoom button
        document.getElementById('reset-zoom').addEventListener('click', () => {
            this.resetZoom();
        });

        // Fit graph button
        document.getElementById('fit-graph') && document.getElementById('fit-graph').addEventListener('click', () => {
            this.fitGraphToView();
        });

        // Window resize
        window.addEventListener('resize', () => {
            this.createVisualization();
        });
    }

    updateStats() {
        const files = this.projectData.files || [];
        const dependencies = this.projectData.dependencies || { edges: [] };
        const folders = Object.keys(this.projectData.folders || {}).length;

        document.getElementById('file-count').textContent = files.length;
        document.getElementById('dependency-count').textContent = dependencies.edges.length;
        document.getElementById('folder-count').textContent = folders;
    }

    populateLanguageFilter() {
        const languages = new Set(['all']);
        (this.projectData.files || []).forEach(file => {
            if (file.language) {
                languages.add(file.language);
            }
        });

        const select = document.getElementById('language-filter');
        select.innerHTML = '';
        
        languages.forEach(lang => {
            const option = document.createElement('option');
            option.value = lang;
            option.textContent = lang === 'all' ? 'Todos' : lang;
            select.appendChild(option);
        });
    }

    getFilteredData() {
        if (!this.projectData.dependencies) return { nodes: [], edges: [] };

        let nodes = [...this.projectData.dependencies.nodes];
        let edges = [...this.projectData.dependencies.edges];

        // Filter by language
        if (this.selectedLanguage !== 'all') {
            nodes = nodes.filter(node => node.language === this.selectedLanguage);
            const nodeIds = new Set(nodes.map(n => n.id));
            edges = edges.filter(edge => nodeIds.has(edge.from) && nodeIds.has(edge.to));
        }

        // Convert edges from from/to format to source/target format for D3.js
        const convertedEdges = edges.map(edge => ({
            source: edge.from,
            target: edge.to,
            type: edge.type,
            weight: edge.weight || 1
        }));
        
        return { nodes, edges: convertedEdges };
    }

    createVisualization() {
        const container = document.getElementById('visualization');
        container.innerHTML = '';

        // Show loading
        const loading = document.createElement('div');
        loading.className = 'loading';
        loading.innerHTML = '<div class="spinner"></div><p>Generando visualización...</p>';
        container.appendChild(loading);

        // Small delay to show loading
        setTimeout(() => {
            this.renderVisualization();
            loading.remove();
        }, 100);
    }

    renderVisualization() {
        const container = document.getElementById('visualization');
        const rect = container.getBoundingClientRect();
        const width = rect.width;
        const height = rect.height;

        if (this.currentView === 'graph') {
            this.createGraphView(width, height);
        } else if (this.currentView === 'tree') {
            this.createTreeView(width, height);
        } else if (this.currentView === 'folders') {
            this.createFolderView(width, height);
        }
    }

    createGraphView(width, height) {
        const data = this.getFilteredData();
        
        if (data.nodes.length === 0) {
            this.showEmptyState();
            return;
        }

        const container = d3.select('#visualization');
        
        // Create SVG
        this.svg = container.append('svg')
            .attr('width', width)
            .attr('height', height);

        // Setup zoom
        this.zoom = d3.zoom()
            .scaleExtent([0.1, 4])
            .on('zoom', (event) => {
                g.attr('transform', event.transform);
            });

        this.svg.call(this.zoom);

        const g = this.svg.append('g');

        // Create simulation with containment forces
        const linkForce = d3.forceLink(data.edges)
            .id(d => d.id)
            .distance(80)
            .strength(0.5);

        this.simulation = d3.forceSimulation(data.nodes)
            .force('link', linkForce)
            .force('charge', d3.forceManyBody().strength(-200))
            .force('center', d3.forceCenter(width / 2, height / 2))
            .force('collision', d3.forceCollide().radius(35))
            .force('x', d3.forceX(width / 2).strength(0.05))
            .force('y', d3.forceY(width / 2).strength(0.05))
            .force('boundary', () => {
                data.nodes.forEach(node => {
                    const radius = 30;
                    node.x = Math.max(radius, Math.min(width - radius, node.x));
                    node.y = Math.max(radius, Math.min(height - radius, node.y));
                });
            });



        // Draw edges BEFORE nodes (so they appear behind)
        const edges = g.append('g')
            .attr('class', 'edges')
            .selectAll('line')
            .data(data.edges)
            .enter().append('line')
            .attr('class', 'edge')
            .attr('stroke', '#666')
            .attr('stroke-opacity', 0.8)
            .attr('stroke-width', d => Math.max(2, Math.sqrt(d.weight || 1)))
            .attr('marker-end', 'url(#arrowhead)');

        // Add arrowhead marker
        const defs = this.svg.append('defs');
        defs.append('marker')
            .attr('id', 'arrowhead')
            .attr('viewBox', '0 -5 10 10')
            .attr('refX', 15)
            .attr('refY', 0)
            .attr('markerWidth', 6)
            .attr('markerHeight', 6)
            .attr('orient', 'auto')
            .append('path')
            .attr('d', 'M0,-5L10,0L0,5')
            .attr('fill', '#666');

        // Draw nodes
        const nodes = g.append('g')
            .attr('class', 'nodes')
            .selectAll('circle')
            .data(data.nodes)
            .enter().append('circle')
            .attr('class', 'node')
            .attr('r', d => Math.max(10, Math.min(25, (d.size || 1000) / 500)))
            .attr('fill', d => this.getNodeColor(d))
            .attr('stroke', '#fff')
            .attr('stroke-width', 2)
            .call(d3.drag()
                .on('start', (event, d) => this.dragstarted(event, d))
                .on('drag', (event, d) => this.dragged(event, d))
                .on('end', (event, d) => this.dragended(event, d)));

        // Add labels
        const labels = g.append('g')
            .selectAll('text')
            .data(data.nodes)
            .enter().append('text')
            .attr('class', 'node-label')
            .attr('dy', 30)
            .text(d => this.getNodeLabel(d));

        // Add tooltips and click handlers
        nodes.on('mouseover', (event, d) => {
                this.showTooltip(event, d);
            })
            .on('mouseout', () => {
                this.hideTooltip();
            })
            .on('click', (event, d) => {
                this.selectNode(d);
            });

        // Update positions on tick
        this.simulation.on('tick', () => {
            edges
                .attr('x1', d => d.source.x)
                .attr('y1', d => d.source.y)
                .attr('x2', d => d.target.x)
                .attr('y2', d => d.target.y);

            nodes
                .attr('cx', d => d.x)
                .attr('cy', d => d.y);

            labels
                .attr('x', d => d.x)
                .attr('y', d => d.y);
        });

        // Auto-fit view when simulation stabilizes
        this.simulation.on('end', () => {
            this.fitGraphToView();
        });
    }

    createTreeView(width, height) {
        // Implementation for tree view
        this.showEmptyState('Vista de árbol en desarrollo');
    }

    createFolderView(width, height) {
        const data = this.getFilteredData();
        
        if (data.nodes.length === 0) {
            this.showEmptyState();
            return;
        }

        // Group nodes by folder
        const folderGroups = {};
        data.nodes.forEach(node => {
            const folder = node.group || 'root';
            if (!folderGroups[folder]) {
                folderGroups[folder] = [];
            }
            folderGroups[folder].push(node);
        });

        const container = d3.select('#visualization');
        this.svg = container.append('svg')
            .attr('width', width)
            .attr('height', height);

        this.zoom = d3.zoom()
            .scaleExtent([0.1, 4])
            .on('zoom', (event) => {
                g.attr('transform', event.transform);
            });

        this.svg.call(this.zoom);
        const g = this.svg.append('g');

        // Calculate positions for folder groups
        const folders = Object.keys(folderGroups);
        const cols = Math.ceil(Math.sqrt(folders.length));
        const groupWidth = width / cols;
        const groupHeight = height / Math.ceil(folders.length / cols);

        folders.forEach((folder, index) => {
            const x = (index % cols) * groupWidth + groupWidth / 2;
            const y = Math.floor(index / cols) * groupHeight + groupHeight / 2;
            
            this.drawFolderGroup(g, folder, folderGroups[folder], x, y, groupWidth * 0.8, groupHeight * 0.8);
        });
    }

    drawFolderGroup(g, folderName, nodes, x, y, width, height) {
        const group = g.append('g')
            .attr('transform', `translate(${x - width/2}, ${y - height/2})`);

        // Draw folder boundary
        group.append('rect')
            .attr('class', 'folder-group')
            .attr('width', width)
            .attr('height', height)
            .attr('rx', 10);

        // Add folder label
        group.append('text')
            .attr('class', 'folder-label')
            .attr('x', width / 2)
            .attr('y', 20)
            .text(this.getFolderDisplayName(folderName));

        // Position nodes within the folder
        const nodeRadius = Math.min(15, width / (nodes.length + 2));
        const nodeSpacing = width / (nodes.length + 1);

        nodes.forEach((node, index) => {
            const nodeX = nodeSpacing * (index + 1);
            const nodeY = height / 2;

            const nodeElement = group.append('circle')
                .attr('class', 'node')
                .attr('cx', nodeX)
                .attr('cy', nodeY)
                .attr('r', nodeRadius)
                .attr('fill', this.getNodeColor(node))
                .attr('stroke', '#fff')
                .attr('stroke-width', 1);

            // Add node label
            group.append('text')
                .attr('class', 'node-label')
                .attr('x', nodeX)
                .attr('y', nodeY + nodeRadius + 15)
                .text(this.getNodeLabel(node))
                .style('font-size', '10px');

            // Add event handlers
            nodeElement
                .on('mouseover', (event) => {
                    // Adjust event coordinates for transformed group
                    const adjustedEvent = {
                        ...event,
                        pageX: event.pageX,
                        pageY: event.pageY
                    };
                    this.showTooltip(adjustedEvent, node);
                })
                .on('mouseout', () => {
                    this.hideTooltip();
                })
                .on('click', () => {
                    this.selectNode(node);
                });
        });
    }

    getNodeColor(node) {
        return this.languageColors[node.language] || this.languageColors.default;
    }

    getNodeLabel(node) {
        return node.label.length > 15 ? node.label.substring(0, 12) + '...' : node.label;
    }

    getFolderDisplayName(folderPath) {
        const parts = folderPath.split('/');
        return parts[parts.length - 1] || 'root';
    }

    selectNode(node) {
        this.selectedNode = node;
        this.updateFileInfo(node);
        
        // Highlight node and its connections
        d3.selectAll('.node').classed('selected', false);
        d3.selectAll('.node')
            .filter(d => d.id === node.id)
            .classed('selected', true);

        // Highlight connected edges
        d3.selectAll('.edge').classed('highlighted', false);
        d3.selectAll('.edge')
            .filter(d => d.source.id === node.id || d.target.id === node.id)
            .classed('highlighted', true);
    }

    updateFileInfo(node) {
        const detailsContainer = document.getElementById('file-details');
        
        // Find the original file data
        const fileData = this.projectData.files.find(f => f.path === node.id);
        
        if (fileData) {
            const dependencyList = fileData.dependencies.map(dep => `<li>${dep}</li>`).join('');
            const exportList = fileData.exports.map(exp => `<li>${exp}</li>`).join('');
            
            detailsContainer.innerHTML = `
                <div class="file-details">
                    <h4>${fileData.name}</h4>
                    <p><strong>Lenguaje:</strong> ${fileData.language || 'Desconocido'}</p>
                    <p><strong>Tamaño:</strong> ${this.formatFileSize(fileData.size)}</p>
                    <p><strong>Ruta:</strong> ${fileData.path}</p>
                    ${dependencyList ? `
                        <p><strong>Dependencias:</strong></p>
                        <ul class="dependency-list">${dependencyList}</ul>
                    ` : ''}
                    ${exportList ? `
                        <p><strong>Exportaciones:</strong></p>
                        <ul class="export-list">${exportList}</ul>
                    ` : ''}
                </div>
            `;
        } else {
            detailsContainer.innerHTML = `
                <div class="file-details">
                    <h4>${node.label}</h4>
                    <p><strong>Tipo:</strong> ${node.type}</p>
                    <p><strong>Grupo:</strong> ${node.group}</p>
                </div>
            `;
        }
    }

    formatFileSize(bytes) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }

    showTooltip(event, node) {
        const tooltip = document.getElementById('tooltip');
        const fileData = this.projectData.files.find(f => f.path === node.id);
        
        let content = `<strong>${node.label}</strong><br>`;
        if (fileData) {
            content += `Lenguaje: ${fileData.language || 'Desconocido'}<br>`;
            content += `Tamaño: ${this.formatFileSize(fileData.size)}<br>`;
            content += `Dependencias: ${fileData.dependencies.length}`;
        }
        
        tooltip.innerHTML = content;
        tooltip.style.left = (event.pageX + 10) + 'px';
        tooltip.style.top = (event.pageY - 10) + 'px';
        tooltip.classList.add('show');
    }

    hideTooltip() {
        document.getElementById('tooltip').classList.remove('show');
    }

    showEmptyState(message = 'No hay datos para mostrar con los filtros actuales') {
        const container = document.getElementById('visualization');
        container.innerHTML = `
            <div style="display: flex; align-items: center; justify-content: center; height: 100%; color: #888; text-align: center;">
                <div>
                    <h3>🔍 ${message}</h3>
                    <p>Intenta cambiar los filtros o la vista seleccionada</p>
                </div>
            </div>
        `;
    }

    resetZoom() {
        if (this.svg && this.zoom) {
            this.svg.transition().duration(750).call(
                this.zoom.transform,
                d3.zoomIdentity
            );
        }
    }

    fitGraphToView() {
        if (!this.svg || !this.zoom) return;

        const bounds = this.svg.select('g').node().getBBox();
        if (bounds.width === 0 || bounds.height === 0) return;

        const width = this.svg.attr('width');
        const height = this.svg.attr('height');
        const midX = bounds.x + bounds.width / 2;
        const midY = bounds.y + bounds.height / 2;
        const scale = Math.min(width / bounds.width, height / bounds.height) * 0.8;

        const transform = d3.zoomIdentity
            .translate(width / 2, height / 2)
            .scale(scale)
            .translate(-midX, -midY);

        this.svg.transition().duration(1000).call(
            this.zoom.transform,
            transform
        );
    }

    // Force simulation handlers
    dragstarted(event, d) {
        if (!event.active) this.simulation.alphaTarget(0.3).restart();
        d.fx = d.x;
        d.fy = d.y;
    }

    dragged(event, d) {
        d.fx = event.x;
        d.fy = event.y;
    }

    dragended(event, d) {
        if (!event.active) this.simulation.alphaTarget(0);
        d.fx = null;
        d.fy = null;
    }
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    if (window.projectData) {
        new DependencyViewer(window.projectData);
    } else {
        console.error('No project data available');
        document.getElementById('visualization').innerHTML = `
            <div style="display: flex; align-items: center; justify-content: center; height: 100%; color: #888;">
                <h3>❌ Error: No se pudieron cargar los datos del proyecto</h3>
            </div>
        `;
    }
});