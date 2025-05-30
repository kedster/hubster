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

// Helper function to process CSS @import statements
async function processImports(cssText, baseUrl) {
    const importRegex = /@import\s+(?:url\()?['"]?([^'"()]+)['"]?\)?[^;]*;/g;
    let match;
    const promises = [];
    
    while ((match = importRegex.exec(cssText)) !== null) {
        const importUrl = new URL(match[1], baseUrl).href;
        promises.push(
            fetch(importUrl)
                .then(response => response.ok ? response.text() : '')
                .then(importedCss => ({ original: match[0], replacement: importedCss }))
                .catch(() => ({ original: match[0], replacement: '' }))
        );
    }
    
    const results = await Promise.all(promises);
    let processedCss = cssText;
    
    results.forEach(result => {
        processedCss = processedCss.replace(result.original, result.replacement);
    });
    
    return processedCss;
}

// Tool opening - Fixed for CSS loading
function openTool(tool) {
    const toolView = document.getElementById('tool-view');
    const toolTitle = document.getElementById('tool-title');
    const toolContent = document.getElementById('tool-content');
    
    if (!toolView || !toolTitle || !toolContent) return;
    
    hideAllViews();
    toolView.style.display = 'block';
    toolTitle.textContent = tool.name;
    
    const iframe = document.createElement('iframe');
    
// Tool opening - Fixed for CSS loading
function openTool(tool) {
    const toolView = document.getElementById('tool-view');
    const toolTitle = document.getElementById('tool-title');
    const toolContent = document.getElementById('tool-content');
    
    if (!toolView || !toolTitle || !toolContent) return;
    
    hideAllViews();
    toolView.style.display = 'block';
    toolTitle.textContent = tool.name;
    
    const iframe = document.createElement('iframe');
    
    // Fix path construction to prevent duplication
    let toolPath;
    if (tool.path) {
        // Remove leading slash and ensure no duplication
        toolPath = tool.path.replace(/^\/+/, '');
        // If path already starts with correct prefix, don't add it again
        if (!toolPath.startsWith('tools/') && !toolPath.startsWith('dist/tools/')) {
            toolPath = `tools/${toolPath}`;
        }
    } else {
        toolPath = `tools/${tool.id}`;
    }
    
    // Clean up any duplicate segments in the path
    toolPath = toolPath.replace(/\/tools\/([^\/]+)\/tools\/\1/, '/tools/$1');
    toolPath = toolPath.replace(/\/dist\/tools\/([^\/]+)\/dist\/tools\/\1/, '/dist/tools/$1');
    
    console.log(`Loading tool: ${tool.name} from path: ${toolPath}`);
    iframe.src = `${toolPath}/index.html`;
    
    // Remove sandbox entirely to allow full CSS/JS loading
    iframe.style.cssText = 'width: 100%; height: 600px; border: none; border-radius: 8px; background: #fff;';
    
    // Fix relative paths in the loaded iframe
    iframe.onload = async function() {
        try {
            const iframeDoc = iframe.contentDocument || iframe.contentWindow.document;
            if (iframeDoc) {
                // Fix all relative links and scripts
                const links = iframeDoc.querySelectorAll('link[href]');
                const scripts = iframeDoc.querySelectorAll('script[src]');
                
                // Get the correct base path for this tool
                const correctBasePath = `/${toolPath}/`;
                
                // Fix CSS links
                links.forEach(link => {
                    const originalHref = link.getAttribute('href');
                    if (originalHref && !originalHref.startsWith('http') && !originalHref.startsWith('//')) {
                        // Remove any leading ./ or ../
                        const cleanHref = originalHref.replace(/^\.?\/?/, '');
                        const newHref = correctBasePath + cleanHref;
                        console.log(`Fixing CSS path: ${originalHref} -> ${newHref}`);
                        link.href = newHref;
                    }
                });
                
                // Fix script sources
                scripts.forEach(script => {
                    const originalSrc = script.getAttribute('src');
                    if (originalSrc && !originalSrc.startsWith('http') && !originalSrc.startsWith('//')) {
                        // Remove any leading ./ or ../
                        const cleanSrc = originalSrc.replace(/^\.?\/?/, '');
                        const newSrc = correctBasePath + cleanSrc;
                        console.log(`Fixing JS path: ${originalSrc} -> ${newSrc}`);
                        script.src = newSrc;
                    }
                });
                
                // Fix any CSS @import and url() references
                const styleTags = iframeDoc.querySelectorAll('style');
                styleTags.forEach(style => {
                    if (style.textContent) {
                        style.textContent = style.textContent
                            .replace(/url\(['"]?(?!http|\/\/)([^'"()]+)['"]?\)/g, `url('${correctBasePath}$1')`)
                            .replace(/@import\s+['"](?!http|\/\/)([^'"]+)['"]/g, `@import '${correctBasePath}$1'`);
                    }
                });
            }
        } catch (e) {
            console.warn('Could not fix iframe paths:', e.message);
        }
    };
    
    iframe.onerror = function() {
        console.error(`Failed to load tool: ${tool.name}`);
        toolContent.innerHTML = `
            <div style="padding: 20px; text-align: center; color: #666;">
                <p>Failed to load tool. Please check if the tool files exist.</p>
                <p>Expected path: ${toolPath}/index.html</p>
                <button onclick="window.location.reload()" style="margin-top: 10px; padding: 8px 16px; background: #007bff; color: white; border: none; border-radius: 4px; cursor: pointer;">Reload Page</button>
            </div>
        `;
    };
    
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