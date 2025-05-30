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
    
    // Ensure proper path construction - use dist path if available
    let toolPath;
    if (tool.path) {
        toolPath = tool.path.startsWith('/') ? tool.path.substring(1) : tool.path;
    } else {
        toolPath = `tools/${tool.id}`;
    }
    
    // Check if we should use the dist version
    const useDistPath = window.location.pathname.includes('dist/') || 
                       document.querySelector('script[src*="dist/"]') ||
                       allTools.some(t => t.path && t.path.includes('dist/'));
    
    if (useDistPath && !toolPath.startsWith('dist/')) {
        toolPath = `dist/${toolPath}`;
    }
    
    iframe.src = `${toolPath}/index.html`;
    
    // Remove sandbox entirely to allow full CSS/JS loading
    iframe.style.cssText = 'width: 100%; height: 600px; border: none; border-radius: 8px; background: #fff;';
    
    // Alternative approach: Load and inject CSS directly
    iframe.onload = async function() {
        try {
            const iframeDoc = iframe.contentDocument || iframe.contentWindow.document;
            if (iframeDoc) {
                // Find all CSS links in the iframe
                const links = iframeDoc.querySelectorAll('link[rel="stylesheet"]');
                
                for (const link of links) {
                    try {
                        // Get the original href
                        const originalHref = link.getAttribute('href');
                        if (!originalHref) continue;
                        
                        // Create absolute URL for CSS file
                        let cssUrl;
                        if (originalHref.startsWith('http') || originalHref.startsWith('//')) {
                            cssUrl = originalHref;
                        } else {
                            // Make relative path absolute based on tool location
                            const toolBaseUrl = iframe.src.substring(0, iframe.src.lastIndexOf('/') + 1);
                            cssUrl = new URL(originalHref, toolBaseUrl).href;
                        }
                        
                        // Fetch the CSS content
                        const response = await fetch(cssUrl);
                        if (response.ok) {
                            const cssText = await response.text();
                            
                            // Create a new style element with the CSS content
                            const styleEl = iframeDoc.createElement('style');
                            styleEl.textContent = cssText;
                            
                            // Replace the link with the style element
                            link.parentNode.replaceChild(styleEl, link);
                        } else {
                            console.warn(`Failed to load CSS: ${cssUrl}`);
                        }
                    } catch (cssError) {
                        console.warn('Error processing CSS link:', cssError);
                    }
                }
                
                // Also handle any @import statements in existing style tags
                const styleTags = iframeDoc.querySelectorAll('style');
                for (const styleTag of styleTags) {
                    if (styleTag.textContent.includes('@import')) {
                        const toolBaseUrl = iframe.src.substring(0, iframe.src.lastIndexOf('/') + 1);
                        styleTag.textContent = await processImports(styleTag.textContent, toolBaseUrl);
                    }
                }
            }
        } catch (e) {
            console.warn('Could not fix CSS loading:', e.message);
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