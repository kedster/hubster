// Global variables
let allTools = [];
let filteredTools = [];

// Initialize app
document.addEventListener('DOMContentLoaded', () => {
    showHome();
    loadTools();
    setupSearch();
});

// Navigation
function showHome() {
    hideAllViews();
    document.getElementById('home-view').style.display = 'block';
}

function showAbout() {
    hideAllViews();
    document.getElementById('about-view').style.display = 'block';
}

function hideAllViews() {
    ['home-view', 'tool-view', 'about-view'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.style.display = 'none';
    });
}

function scrollToTools() {
    const el = document.getElementById('tools');
    if (el) el.scrollIntoView({ behavior: 'smooth' });
}

// Tool loading
async function loadTools() {
    const loading = document.getElementById('loading');
    if (loading) loading.style.display = 'block';
    
    try {
        // Try manifest first
        const response = await fetch('dist/manifest.json');
        if (response.ok) {
            const manifest = await response.json();
            allTools = manifest.tools || [];
        } else {
            // Fallback to discovery
            await discoverTools();
        }
    } catch (error) {
        await discoverTools();
    }
    
    filteredTools = [...allTools];
    renderTools();
    if (loading) loading.style.display = 'none';
}

async function discoverTools() {
    const toolNames = [
        'calculator', 'text-editor', 'color-picker', 'json-formatter', 
        'base64-encoder', 'url-encoder', 'password-generator', 'qr-generator'
    ];
    
    const promises = toolNames.map(async (name) => {
        try {
            const response = await fetch(`tools/${name}/config.json`);
            if (response.ok) {
                const config = await response.json();
                return { id: name, path: `tools/${name}`, ...config };
            }
        } catch (error) {
            // Skip failed tools
        }
        return null;
    });
    
    const results = await Promise.all(promises);
    allTools = results.filter(tool => tool && tool.name && tool.description && tool.icon);
}

// Rendering
function renderTools() {
    const grid = document.getElementById('toolsGrid');
    const noTools = document.getElementById('no-tools');
    
    if (!grid) return;
    
    grid.innerHTML = '';
    
    if (filteredTools.length === 0) {
        if (noTools) noTools.style.display = 'block';
        return;
    }
    
    if (noTools) noTools.style.display = 'none';
    
    filteredTools.forEach(tool => {
        const card = document.createElement('div');
        card.className = 'tool-card';
        card.innerHTML = `
            <div class="tool-status status-${tool.status || 'active'}">${tool.status || 'active'}</div>
            <div class="tool-icon">${tool.icon}</div>
            <h3>${tool.name}</h3>
            <p>${tool.description}</p>
            <div class="tool-link">Try it now →</div>
        `;
        card.onclick = () => openTool(tool);
        grid.appendChild(card);
    });
}

// Tool opening
function openTool(tool) {
    const toolView = document.getElementById('tool-view');
    const toolTitle = document.getElementById('tool-title');
    const toolContent = document.getElementById('tool-content');
    
    if (!toolView || !toolTitle || !toolContent) return;
    
    hideAllViews();
    toolView.style.display = 'block';
    toolTitle.textContent = tool.name;
    
    const iframe = document.createElement('iframe');
    iframe.src = `${tool.path || `tools/${tool.id}`}/index.html`;
    iframe.style.cssText = 'width: 100%; height: 600px; border: none; border-radius: 8px;';
    iframe.sandbox = 'allow-scripts allow-same-origin allow-forms';
    
    toolContent.innerHTML = '';
    toolContent.appendChild(iframe);
}

// Search
function setupSearch() {
    const input = document.getElementById('searchInput');
    if (!input) return;
    
    input.addEventListener('input', (e) => {
        const query = e.target.value.toLowerCase().trim();
        
        if (query === '') {
            filteredTools = [...allTools];
        } else {
            filteredTools = allTools.filter(tool => {
                const text = `${tool.name} ${tool.description} ${tool.category || ''} ${(tool.tags || []).join(' ')}`.toLowerCase();
                return text.includes(query);
            });
        }
        
        renderTools();
    });
}

// Category filtering
function filterByCategory(category) {
    if (!category || category === 'all') {
        filteredTools = [...allTools];
    } else {
        filteredTools = allTools.filter(tool => tool.category === category);
    }
    renderTools();
}

// Refresh tools
function refreshTools() {
    allTools = [];
    filteredTools = [];
    loadTools();
}

// Export functions
window.showHome = showHome;
window.showAbout = showAbout;
window.scrollToTools = scrollToTools;
window.openTool = openTool;
window.filterByCategory = filterByCategory;
window.refreshTools = refreshTools;