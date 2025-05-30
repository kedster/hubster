// Global variables
let allTools = [];
let filteredTools = [];
let isLoading = false;
let loadAttempted = false;

// Configuration
const CONFIG = {
    TOOL_DISCOVERY_TIMEOUT: 5000,
    MAX_RETRY_ATTEMPTS: 3,
    RETRY_DELAY: 1000,
    IFRAME_SANDBOX: 'allow-scripts allow-same-origin allow-forms',
    COMMON_TOOL_PATTERNS: [
        'calculator', 'text-editor', 'color-picker', 'json-formatter', 
        'base64-encoder', 'url-encoder', 'password-generator', 'qr-generator',
        'markdown-preview', 'css-minifier', 'js-beautifier', 'image-resizer',
        'unit-converter', 'timestamp-converter', 'hash-generator', 'lorem-ipsum',
        'gradient-generator', 'regex-tester', 'ascii-art', 'word-counter'
    ]
};

// Initialize the app with error boundary
document.addEventListener('DOMContentLoaded', () => {
    try {
        initializeApp();
    } catch (error) {
        console.error('Failed to initialize app:', error);
        showGlobalError('Application failed to initialize. Please refresh the page.');
    }
});

// Main initialization function
async function initializeApp() {
    showHome();
    await loadTools();
    setupSearch();
    setupEventListeners();
}

// Setup additional event listeners
function setupEventListeners() {
    // Handle browser back/forward
    window.addEventListener('popstate', handlePopState);
    
    // Handle visibility change for potential refresh
    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    // Global error handler
    window.addEventListener('error', handleGlobalError);
}

// Navigation functions with URL state management
function showHome() {
    hideAllViews();
    const homeView = document.getElementById('home-view');
    if (homeView) {
        homeView.style.display = 'block';
        updateURL('');
    }
}

function showAbout() {
    hideAllViews();
    const aboutView = document.getElementById('about-view');
    if (aboutView) {
        aboutView.style.display = 'block';
        updateURL('about');
    }
}

function hideAllViews() {
    const views = ['home-view', 'tool-view', 'about-view'];
    views.forEach(viewId => {
        const view = document.getElementById(viewId);
        if (view) view.style.display = 'none';
    });
}

// URL management
function updateURL(path) {
    const newURL = path ? `#${path}` : location.pathname;
    history.pushState({ path }, '', newURL);
}

function handlePopState(event) {
    const path = event.state?.path || location.hash.slice(1);
    if (path === 'about') {
        showAbout();
    } else if (path.startsWith('tool/')) {
        const toolId = path.split('/')[1];
        const tool = allTools.find(t => t.id === toolId);
        if (tool) openTool(tool);
    } else {
        showHome();
    }
}

// Enhanced scroll function with error handling
function scrollToTools() {
    try {
        const toolsSection = document.getElementById('tools');
        if (toolsSection) {
            toolsSection.scrollIntoView({ 
                behavior: 'smooth',
                block: 'start'
            });
        }
    } catch (error) {
        console.warn('Scroll to tools failed:', error);
    }
}

// Enhanced tool loading with proper error handling and retry logic
async function loadTools() {
    if (isLoading) return;
    
    isLoading = true;
    const loadingEl = document.getElementById('loading');
    const errorEl = document.getElementById('error');
    
    // Show loading state
    if (loadingEl) loadingEl.style.display = 'block';
    if (errorEl) errorEl.style.display = 'none';
    
    allTools = [];
    let retryCount = 0;
    
    while (retryCount < CONFIG.MAX_RETRY_ATTEMPTS) {
        try {
            await loadToolsWithTimeout();
            break;
        } catch (error) {
            retryCount++;
            console.warn(`Tool loading attempt ${retryCount} failed:`, error.message);
            
            if (retryCount < CONFIG.MAX_RETRY_ATTEMPTS) {
                await delay(CONFIG.RETRY_DELAY * retryCount);
            } else {
                handleLoadingError(error);
            }
        }
    }
    
    // Finalize loading state
    filteredTools = [...allTools];
    renderTools();
    if (loadingEl) loadingEl.style.display = 'none';
    isLoading = false;
    loadAttempted = true;
    
    console.log(`🎉 Successfully loaded ${allTools.length} tools`);
}

// Tool loading with timeout
async function loadToolsWithTimeout() {
    return Promise.race([
        loadToolsCore(),
        new Promise((_, reject) => 
            setTimeout(() => reject(new Error('Tool discovery timeout')), CONFIG.TOOL_DISCOVERY_TIMEOUT)
        )
    ]);
}

// Core tool loading logic
async function loadToolsCore() {
    // Try to load from manifest first (build process)
    try {
        const manifestTools = await loadFromManifest();
        if (manifestTools.length > 0) {
            allTools = manifestTools;
            return;
        }
    } catch (error) {
        console.info('No manifest found, falling back to dynamic discovery');
    }
    
    // Fallback to dynamic discovery
    const toolDirs = await discoverToolDirectories();
    
    if (toolDirs.length === 0) {
        console.info('No tool directories found');
        return;
    }
    
    // Load each tool's configuration with parallel processing
    const toolPromises = toolDirs.map(async (dir) => {
        try {
            const config = await loadToolConfig(dir);
            if (config && validateToolConfig(config)) {
                return {
                    id: dir,
                    path: `tools/${dir}`,
                    ...config
                };
            }
        } catch (err) {
            console.warn(`Failed to load tool ${dir}:`, err.message);
        }
        return null;
    });
    
    const toolResults = await Promise.all(toolPromises);
    allTools = toolResults.filter(tool => tool !== null);
}

// Load tools from build manifest
async function loadFromManifest() {
    const response = await fetch('dist/manifest.json');
    if (!response.ok) throw new Error('Manifest not found');
    
    const manifest = await response.json();
    return manifest.tools || [];
}

// Enhanced tool directory discovery
async function discoverToolDirectories() {
    const discoveredDirs = new Set();
    
    // Try directory listing first
    try {
        const dirs = await discoverFromListing();
        dirs.forEach(dir => discoveredDirs.add(dir));
    } catch (error) {
        console.info('Directory listing not available, using pattern discovery');
    }
    
    // Fallback to pattern-based discovery
    const patternDirs = await discoverFromPatterns();
    patternDirs.forEach(dir => discoveredDirs.add(dir));
    
    return Array.from(discoveredDirs);
}

// Discover tools from directory listing
async function discoverFromListing() {
    const response = await fetch('tools/');
    if (!response.ok) throw new Error('Directory listing unavailable');
    
    const html = await response.text();
    const dirMatches = html.match(/href="([^"\/]+)\/"/g);
    
    if (!dirMatches) return [];
    
    return dirMatches
        .map(match => match.replace(/href="|\/"/g, ''))
        .filter(dir => !dir.includes('.') && dir !== 'template');
}

// Discover tools using common patterns
async function discoverFromPatterns() {
    const discoveredDirs = [];
    
    // Use parallel requests with proper error handling
    const checkPromises = CONFIG.COMMON_TOOL_PATTERNS.map(async (toolName) => {
        try {
            const response = await fetch(`tools/${toolName}/config.json`, { 
                method: 'HEAD' 
            });
            if (response.ok) {
                return toolName;
            }
        } catch (error) {
            // Expected for non-existent tools
        }
        return null;
    });
    
    const results = await Promise.allSettled(checkPromises);
    results.forEach(result => {
        if (result.status === 'fulfilled' && result.value) {
            discoveredDirs.push(result.value);
        }
    });
    
    return discoveredDirs;
}

// Enhanced tool configuration loading
async function loadToolConfig(toolDir) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3000);
    
    try {
        const response = await fetch(`tools/${toolDir}/config.json`, {
            signal: controller.signal,
            headers: {
                'Cache-Control': 'no-cache'
            }
        });
        
        clearTimeout(timeoutId);
        
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
        const text = await response.text();
        return JSON.parse(text);
    } catch (error) {
        clearTimeout(timeoutId);
        if (error.name === 'AbortError') {
            throw new Error('Configuration load timeout');
        }
        throw error;
    }
}

// Enhanced tool configuration validation
function validateToolConfig(config) {
    const required = ['name', 'description', 'icon'];
    const missing = required.filter(field => !config[field] || typeof config[field] !== 'string');
    
    if (missing.length > 0) {
        console.warn(`Invalid config - missing or invalid: ${missing.join(', ')}`);
        return false;
    }
    
    // Validate field lengths
    if (config.name.trim().length < 2) {
        console.warn('Invalid config - name too short');
        return false;
    }
    
    if (config.description.trim().length < 10) {
        console.warn('Invalid config - description too short');
        return false;
    }
    
    // Validate status
    const validStatuses = ['active', 'beta', 'coming-soon', 'deprecated', 'maintenance'];
    if (config.status && !validStatuses.includes(config.status)) {
        console.warn(`Invalid config - invalid status: ${config.status}`);
        return false;
    }
    
    // Set defaults for optional fields
    config.status = config.status || 'active';
    config.category = config.category || 'utility';
    config.tags = Array.isArray(config.tags) ? config.tags : [];
    
    return true;
}

// Enhanced tool rendering with better error handling
function renderTools() {
    const toolsGrid = document.getElementById('toolsGrid');
    const noToolsEl = document.getElementById('no-tools');
    
    if (!toolsGrid) {
        console.error('Tools grid element not found');
        return;
    }
    
    // Clear existing content safely
    try {
        toolsGrid.innerHTML = '';
    } catch (error) {
        console.error('Failed to clear tools grid:', error);
        return;
    }
    
    // Handle empty states
    if (filteredTools.length === 0 && allTools.length === 0 && loadAttempted) {
        const addToolCard = createAddToolCard();
        toolsGrid.appendChild(addToolCard);
        if (noToolsEl) noToolsEl.style.display = 'none';
        return;
    }
    
    if (filteredTools.length === 0) {
        if (noToolsEl) noToolsEl.style.display = 'block';
        return;
    } else {
        if (noToolsEl) noToolsEl.style.display = 'none';
    }
    
    // Render tools with error boundary for each card
    filteredTools.forEach(tool => {
        try {
            const toolCard = createToolCard(tool);
            toolsGrid.appendChild(toolCard);
        } catch (error) {
            console.error(`Failed to render tool card for ${tool.name}:`, error);
        }
    });
    
    // Add "Add New Tool" card
    try {
        const addToolCard = createAddToolCard();
        toolsGrid.appendChild(addToolCard);
    } catch (error) {
        console.error('Failed to create add tool card:', error);
    }
}

// Enhanced tool card creation with security considerations
function createToolCard(tool) {
    const card = document.createElement('div');
    card.className = 'tool-card';
    
    // Sanitize inputs
    const safeName = escapeHtml(tool.name);
    const safeDescription = escapeHtml(tool.description);
    const safeIcon = escapeHtml(tool.icon);
    const safeStatus = escapeHtml(tool.status);
    
    const statusClass = `status-${tool.status.replace(/[^a-z0-9]/gi, '-').toLowerCase()}`;
    
    card.innerHTML = `
        <div class="tool-status ${statusClass}">${safeStatus}</div>
        <div class="tool-icon">${safeIcon}</div>
        <h3>${safeName}</h3>
        <p>${safeDescription}</p>
        <div class="tool-link">
            Try it now →
        </div>
    `;
    
    // Add click handler with proper event delegation
    card.addEventListener('click', (event) => {
        event.preventDefault();
        openTool(tool);
    });
    
    return card;
}

// Enhanced add tool card
function createAddToolCard() {
    const card = document.createElement('div');
    card.className = 'tool-card add-tool-card';
    
    card.innerHTML = `
        <div class="add-icon">➕</div>
        <h3>Add New Tool</h3>
        <p>Drop your tools into the tools/ directory</p>
        <div class="tool-link">
            Learn how →
        </div>
    `;
    
    card.addEventListener('click', (event) => {
        event.preventDefault();
        showAddToolInstructions();
    });
    
    return card;
}

// Enhanced tool opening with better security and error handling
async function openTool(tool) {
    const toolView = document.getElementById('tool-view');
    const toolTitle = document.getElementById('tool-title');
    const toolContent = document.getElementById('tool-content');
    
    if (!toolView || !toolTitle || !toolContent) {
        console.error('Tool view elements not found');
        return;
    }
    
    // Update URL state
    updateURL(`tool/${tool.id}`);
    
    // Update tool view safely
    try {
        toolTitle.textContent = tool.name;
    } catch (error) {
        console.error('Failed to set tool title:', error);
    }
    
    // Show loading state
    toolContent.innerHTML = `
        <div class="tool-loading">
            <div class="loading-spinner"></div>
            <p>Loading ${escapeHtml(tool.name)}...</p>
        </div>
    `;
    
    // Show tool view
    hideAllViews();
    toolView.style.display = 'block';
    
    try {
        await loadToolContent(tool, toolContent);
    } catch (error) {
        console.error(`Failed to load tool ${tool.name}:`, error);
        showToolError(tool, toolContent, error);
    }
}

// Load tool content with enhanced security
async function loadToolContent(tool, toolContent) {
    const toolPath = tool.path || `tools/${tool.id}`;
    const indexUrl = `${toolPath}/index.html`;
    
    // Check if tool content exists
    const response = await fetch(indexUrl, { method: 'HEAD' });
    if (!response.ok) {
        throw new Error('Tool content not available');
    }
    
    // Create secure iframe
    const iframe = document.createElement('iframe');
    iframe.src = indexUrl;
    iframe.title = tool.name;
    iframe.sandbox = CONFIG.IFRAME_SANDBOX;
    iframe.style.cssText = 'width: 100%; height: 600px; border: none; border-radius: 8px;';
    
    // Handle iframe load events
    iframe.onload = () => {
        console.log(`Tool ${tool.name} loaded successfully`);
    };
    
    iframe.onerror = () => {
        throw new Error('Failed to load tool content');
    };
    
    toolContent.innerHTML = '';
    toolContent.appendChild(iframe);
}

// Show tool error state
function showToolError(tool, toolContent, error) {
    const safeToolName = escapeHtml(tool.name);
    const safeDescription = escapeHtml(tool.description);
    const safeIcon = escapeHtml(tool.icon);
    const toolPath = tool.path || `tools/${tool.id}`;
    
    toolContent.innerHTML = `
        <div class="tool-error">
            <div style="font-size: 3rem; margin-bottom: 1rem;">${safeIcon}</div>
            <h3>${safeToolName}</h3>
            <p style="color: var(--text-secondary); margin: 1rem 0;">
                ${safeDescription}
            </p>
            <div class="error-message">
                <p>⚠️ Tool content could not be loaded</p>
                <p style="font-size: 0.9rem; color: var(--text-secondary);">
                    Make sure <code>${escapeHtml(toolPath)}/index.html</code> exists and is accessible
                </p>
                <button onclick="location.reload()" style="margin-top: 1rem;">
                    🔄 Retry
                </button>
            </div>
        </div>
    `;
}

// Enhanced add tool instructions
function showAddToolInstructions() {
    const toolView = document.getElementById('tool-view');
    const toolTitle = document.getElementById('tool-title');
    const toolContent = document.getElementById('tool-content');
    
    if (!toolView || !toolTitle || !toolContent) return;
    
    updateURL('add-tool');
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
  "description": "What your tool does (minimum 10 characters)",
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
                <button onclick="refreshTools()" class="refresh-btn">
                    🔄 Refresh to Discover New Tools
                </button>
            </div>
        </div>
    `;
    
    // Show tool view
    hideAllViews();
    toolView.style.display = 'block';
}

// Enhanced search setup with debouncing
function setupSearch() {
    const searchInput = document.getElementById('searchInput');
    if (!searchInput) return;
    
    let searchTimeout;
    const handleSearchDebounced = (event) => {
        clearTimeout(searchTimeout);
        searchTimeout = setTimeout(() => handleSearch(event), 300);
    };
    
    searchInput.addEventListener('input', handleSearchDebounced);
    searchInput.addEventListener('keyup', (event) => {
        if (event.key === 'Enter') {
            clearTimeout(searchTimeout);
            handleSearch(event);
        }
    });
}

// Enhanced search handling
function handleSearch(event) {
    const query = event.target.value.toLowerCase().trim();
    
    if (query === '') {
        filteredTools = [...allTools];
    } else {
        filteredTools = allTools.filter(tool => {
            const searchText = [
                tool.name || '',
                tool.description || '',
                tool.category || '',
                ...(Array.isArray(tool.tags) ? tool.tags : [])
            ].join(' ').toLowerCase();
            
            return searchText.includes(query);
        });
    }
    
    renderTools();
}

// Enhanced category filtering
function filterByCategory(category) {
    if (!category || category === 'all') {
        filteredTools = [...allTools];
    } else {
        filteredTools = allTools.filter(tool => 
            tool.category === category
        );
    }
    renderTools();
}

// Utility functions
function delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

function escapeHtml(text) {
    if (typeof text !== 'string') return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function handleLoadingError(error) {
    console.error('Failed to load tools:', error);
    const errorEl = document.getElementById('error');
    if (errorEl) {
        errorEl.style.display = 'block';
        errorEl.innerHTML = `
            <p>⚠️ Failed to load tools</p>
            <p style="font-size: 0.9rem; color: var(--text-secondary);">
                ${escapeHtml(error.message)}
            </p>
            <button onclick="refreshTools()" style="margin-top: 1rem;">
                🔄 Try Again
            </button>
        `;
    }
}

function handleVisibilityChange() {
    if (!document.hidden && loadAttempted && allTools.length === 0) {
        // Retry loading if page becomes visible and no tools were loaded
        setTimeout(loadTools, 1000);
    }
}

function handleGlobalError(event) {
    console.error('Global error:', event.error);
}

function showGlobalError(message) {
    const errorDiv = document.createElement('div');
    errorDiv.style.cssText = `
        position: fixed; top: 20px; right: 20px; z-index: 10000;
        background: #f8d7da; color: #721c24; padding: 1rem;
        border: 1px solid #f5c6cb; border-radius: 4px;
        max-width: 300px; font-family: system-ui, sans-serif;
    `;
    errorDiv.textContent = message;
    document.body.appendChild(errorDiv);
    
    setTimeout(() => {
        if (errorDiv.parentNode) {
            errorDiv.parentNode.removeChild(errorDiv);
        }
    }, 5000);
}

// Public API functions
function refreshTools() {
    loadAttempted = false;
    allTools = [];
    filteredTools = [];
    loadTools();
}

// Export functions for global access
window.showHome = showHome;
window.showAbout = showAbout;
window.scrollToTools = scrollToTools;
window.openTool = openTool;
window.filterByCategory = filterByCategory;
window.refreshTools = refreshTools;