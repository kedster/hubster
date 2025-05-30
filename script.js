// Global variables
let allTools = [];
let filteredTools = [];

// Initialize the app
document.addEventListener('DOMContentLoaded', () => {
    showHome();
    loadTools();
    setupSearch();
});

// Function to show the home view
function showHome() {
    document.getElementById('home-view').style.display = 'block';
    document.getElementById('tool-view').style.display = 'none';
    document.getElementById('about-view').style.display = 'none';
}

// Function to show the about view
function showAbout() {
    document.getElementById('home-view').style.display = 'none';
    document.getElementById('tool-view').style.display = 'none';
    document.getElementById('about-view').style.display = 'block';
}

// Function to scroll to tools section
function scrollToTools() {
    const toolsSection = document.getElementById('tools');
    if (toolsSection) {
        toolsSection.scrollIntoView({ behavior: 'smooth' });
    }
}

// Function to dynamically discover and load tools
async function loadTools() {
    const loadingEl = document.getElementById('loading');
    const errorEl = document.getElementById('error');
    
    loadingEl.style.display = 'block';
    errorEl.style.display = 'none';
    allTools = [];
    
    try {
        // Get list of potential tool directories
        const toolDirs = await discoverToolDirectories();
        
        if (toolDirs.length === 0) {
            throw new Error('No tool directories found');
        }
        
        // Load each tool's configuration
        for (const dir of toolDirs) {
            try {
                const config = await loadToolConfig(dir);
                if (config && validateToolConfig(config)) {
                    const tool = {
                        id: dir,
                        path: `tools/${dir}`,
                        ...config
                    };
                    allTools.push(tool);
                    console.log(`✅ Loaded: ${tool.name}`);
                }
            } catch (err) {
                console.warn(`❌ Failed to load tool ${dir}:`, err.message);
            }
        }
        
        if (allTools.length === 0) {
            throw new Error('No valid tools found');
        }
        
        filteredTools = [...allTools];
        renderTools();
        loadingEl.style.display = 'none';
        
        console.log(`🎉 Successfully loaded ${allTools.length} tools`);
        
    } catch (error) {
        console.error('Error loading tools:', error);
        loadingEl.style.display = 'none';
        errorEl.style.display = 'block';
        
        // Show add tool card even when no tools are found
        renderTools();
    }
}

// Function to discover tool directories by attempting to load common paths
async function discoverToolDirectories() {
    const commonToolNames = [
        'calculator', 'text-editor', 'color-picker', 'json-formatter', 
        'base64-encoder', 'url-encoder', 'password-generator', 'qr-generator',
        'markdown-preview', 'css-minifier', 'js-beautifier', 'image-resizer',
        'unit-converter', 'timestamp-converter', 'hash-generator', 'lorem-ipsum',
        'gradient-generator', 'regex-tester', 'ascii-art', 'word-counter'
    ];
    
    const discoveredDirs = [];
    
    // Try to discover existing tool directories
    for (const toolName of commonToolNames) {
        try {
            const response = await fetch(`tools/${toolName}/config.json`);
            if (response.ok) {
                discoveredDirs.push(toolName);
            }
        } catch (err) {
            // Silently continue - this is expected for non-existent tools
        }
    }
    
    // Also try to scan for any other directories if possible
    try {
        // This approach works by attempting to load a directory listing
        // Not all servers support this, but some do
        const response = await fetch('tools/');
        if (response.ok) {
            const html = await response.text();
            const dirMatches = html.match(/href="([^"]+)\/"/g);
            if (dirMatches) {
                const additionalDirs = dirMatches
                    .map(match => match.replace(/href="|\/"/g, ''))
                    .filter(dir => !dir.includes('.') && !discoveredDirs.includes(dir));
                discoveredDirs.push(...additionalDirs);
            }
        }
    } catch (err) {
        // Directory listing not supported, continue with discovered tools
    }
    
    return [...new Set(discoveredDirs)]; // Remove duplicates
}

// Function to load tool configuration
async function loadToolConfig(toolDir) {
    try {
        const response = await fetch(`tools/${toolDir}/config.json`);
        if (!response.ok) {
            throw new Error(`Config not found: ${response.status}`);
        }
        return await response.json();
    } catch (error) {
        throw new Error(`Failed to load config: ${error.message}`);
    }
}

// Function to validate tool configuration
function validateToolConfig(config) {
    const required = ['name', 'description', 'icon'];
    const missing = required.filter(field => !config[field]);
    
    if (missing.length > 0) {
        console.warn(`Invalid config - missing: ${missing.join(', ')}`);
        return false;
    }
    
    // Set defaults
    config.status = config.status || 'active';
    config.category = config.category || 'utility';
    config.tags = config.tags || [];
    
    return true;
}

// Function to render tools in the grid
function renderTools() {
    const toolsGrid = document.getElementById('toolsGrid');
    const noToolsEl = document.getElementById('no-tools');
    
    if (!toolsGrid) return;
    
    // Clear existing content
    toolsGrid.innerHTML = '';
    
    if (filteredTools.length === 0 && allTools.length === 0) {
        // Show add tool card when no tools exist
        const addToolCard = createAddToolCard();
        toolsGrid.appendChild(addToolCard);
        noToolsEl.style.display = 'none';
        return;
    }
    
    if (filteredTools.length === 0) {
        noToolsEl.style.display = 'block';
        return;
    } else {
        noToolsEl.style.display = 'none';
    }
    
    // Render each tool
    filteredTools.forEach(tool => {
        const toolCard = createToolCard(tool);
        toolsGrid.appendChild(toolCard);
    });
    
    // Add "Add New Tool" card
    const addToolCard = createAddToolCard();
    toolsGrid.appendChild(addToolCard);
}

// Function to create a tool card element
function createToolCard(tool) {
    const card = document.createElement('div');
    card.className = 'tool-card';
    card.onclick = () => openTool(tool);
    
    const statusClass = `status-${tool.status.replace(/[^a-z0-9]/gi, '-').toLowerCase()}`;
    
    card.innerHTML = `
        <div class="tool-status ${statusClass}">${tool.status}</div>
        <div class="tool-icon">${tool.icon}</div>
        <h3>${tool.name}</h3>
        <p>${tool.description}</p>
        <div class="tool-link" onclick="event.stopPropagation(); openTool(arguments[0])">
            Try it now →
        </div>
    `;
    
    return card;
}

// Function to create the "Add New Tool" card
function createAddToolCard() {
    const card = document.createElement('div');
    card.className = 'tool-card add-tool-card';
    card.onclick = showAddToolInstructions;
    
    card.innerHTML = `
        <div class="add-icon">➕</div>
        <h3>Add New Tool</h3>
        <p>Drop your tools into the tools/ directory</p>
        <div class="tool-link">
            Learn how →
        </div>
    `;
    
    return card;
}

// Function to open a tool
async function openTool(tool) {
    const toolView = document.getElementById('tool-view');
    const toolTitle = document.getElementById('tool-title');
    const toolContent = document.getElementById('tool-content');
    
    if (!toolView || !toolTitle || !toolContent) return;
    
    // Update tool view
    toolTitle.textContent = tool.name;
    
    // Show loading state
    toolContent.innerHTML = `
        <div class="tool-loading">
            <div class="loading-spinner"></div>
            <p>Loading ${tool.name}...</p>
        </div>
    `;
    
    // Show tool view
    document.getElementById('home-view').style.display = 'none';
    document.getElementById('about-view').style.display = 'none';
    toolView.style.display = 'block';
    
    try {
        // Try to load the tool's HTML content
        const response = await fetch(`${tool.path}/index.html`);
        if (response.ok) {
            const html = await response.text();
            
            // Create iframe to safely load the tool
            toolContent.innerHTML = `
                <iframe 
                    src="${tool.path}/index.html" 
                    style="width: 100%; height: 600px; border: none; border-radius: 8px;"
                    title="${tool.name}"
                ></iframe>
            `;
        } else {
            throw new Error('Tool content not available');
        }
    } catch (error) {
        // Show error state
        toolContent.innerHTML = `
            <div class="tool-error">
                <div style="font-size: 3rem; margin-bottom: 1rem;">${tool.icon}</div>
                <h3>${tool.name}</h3>
                <p style="color: var(--text-secondary); margin: 1rem 0;">
                    ${tool.description}
                </p>
                <div class="error-message">
                    <p>⚠️ Tool content could not be loaded</p>
                    <p style="font-size: 0.9rem; color: var(--text-secondary);">
                        Make sure <code>${tool.path}/index.html</code> exists
                    </p>
                </div>
            </div>
        `;
    }
}

// Function to show add tool instructions
function showAddToolInstructions() {
    const toolView = document.getElementById('tool-view');
    const toolTitle = document.getElementById('tool-title');
    const toolContent = document.getElementById('tool-content');
    
    toolTitle.textContent = 'Add New Tool';
    toolContent.innerHTML = `
        <div class="add-tool-guide">
            <h3>🚀 Add Your Tool in 3 Steps</h3>
            
            <div class="step">
                <div class="step-number">1</div>
                <div class="step-content">
                    <h4>Create Tool Directory</h4>
                    <p>Create a folder in <code>tools/</code> with your tool name:</p>
                    <pre><code>tools/my-awesome-tool/</code></pre>
                </div>
            </div>
            
            <div class="step">
                <div class="step-number">2</div>
                <div class="step-content">
                    <h4>Add Configuration</h4>
                    <p>Create <code>config.json</code> with your tool metadata:</p>
                    <pre><code>{
  "name": "My Awesome Tool",
  "description": "What your tool does",
  "icon": "🔧",
  "status": "active",
  "category": "utility",
  "tags": ["productivity", "helper"]
}</code></pre>
                </div>
            </div>
            
            <div class="step">
                <div class="step-number">3</div>
                <div class="step-content">
                    <h4>Create Tool Interface</h4>
                    <p>Add <code>index.html</code> with your tool's interface:</p>
                    <pre><code>&lt;!DOCTYPE html&gt;
&lt;html&gt;
&lt;head&gt;
    &lt;title&gt;My Awesome Tool&lt;/title&gt;
&lt;/head&gt;
&lt;body&gt;
    &lt;h1&gt;My Tool&lt;/h1&gt;
    &lt;!-- Your tool content --&gt;
&lt;/body&gt;
&lt;/html&gt;</code></pre>
                </div>
            </div>
            
            <div class="success-note">
                <h4>✨ That's it!</h4>
                <p>Your tool will automatically appear in the hub. No build process required!</p>
                <button onclick="location.reload()" class="refresh-btn">
                    🔄 Refresh to Discover New Tools
                </button>
            </div>
        </div>
    `;
    
    // Show tool view
    document.getElementById('home-view').style.display = 'none';
    document.getElementById('about-view').style.display = 'none';
    toolView.style.display = 'block';
}

// Function to setup search functionality
function setupSearch() {
    const searchInput = document.getElementById('searchInput');
    if (!searchInput) return;
    
    searchInput.addEventListener('input', handleSearch);
    searchInput.addEventListener('keyup', handleSearch);
}

// Function to handle search input
function handleSearch(event) {
    const query = event.target.value.toLowerCase().trim();
    
    if (query === '') {
        filteredTools = [...allTools];
    } else {
        filteredTools = allTools.filter(tool => {
            const searchText = [
                tool.name,
                tool.description,
                tool.category,
                ...(tool.tags || [])
            ].join(' ').toLowerCase();
            
            return searchText.includes(query);
        });
    }
    
    renderTools();
}

// Function to filter tools by category
function filterByCategory(category) {
    if (category === 'all') {
        filteredTools = [...allTools];
    } else {
        filteredTools = allTools.filter(tool => tool.category === category);
    }
    renderTools();
}

// Export functions for global access
window.showHome = showHome;
window.showAbout = showAbout;
window.scrollToTools = scrollToTools;
window.openTool = openTool;
window.filterByCategory = filterByCategory;