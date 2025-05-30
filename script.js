// Global variables
let allTools = [];
let filteredTools = [];

// Fallback tools data for when the manifest isn't available
const fallbackTools = [
    {
        id: "example-calculator",
        name: "Simple Calculator",
        description: "A basic calculator for quick mathematical operations.",
        icon: "🧮",
        status: "active",
        category: "utility",
        tags: ["math", "calculator", "utility"],
        path: "/tools/example-calculator"
    },
    {
        id: "text-counter",
        name: "Text Counter",
        description: "Count characters, words, and lines in your text.",
        icon: "📝",
        status: "active",
        category: "utility",
        tags: ["text", "counter", "utility"],
        path: "/tools/text-counter"
    },
    {
        id: "color-picker",
        name: "Color Picker",
        description: "Generate and convert colors between different formats.",
        icon: "🎨",
        status: "beta",
        category: "design",
        tags: ["color", "design", "converter"],
        path: "/tools/color-picker"
    }
];

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

// Function to load tools dynamically
function loadTools() {
    const loadingEl = document.getElementById('loading');
    const errorEl = document.getElementById('error');
    
    // Show loading state
    loadingEl.style.display = 'block';
    errorEl.style.display = 'none';
    
    // Try to load from manifest first, then fallback
    setTimeout(() => {
        try {
            // Check if TOOLS_MANIFEST is available (injected by build script)
            if (window.TOOLS_MANIFEST && window.TOOLS_MANIFEST.tools) {
                allTools = window.TOOLS_MANIFEST.tools;
                console.log('Loaded tools from manifest:', allTools.length);
            } else {
                // Use fallback tools
                allTools = fallbackTools;
                console.log('Using fallback tools:', allTools.length);
                errorEl.style.display = 'block';
            }
            
            filteredTools = [...allTools];
            renderTools();
            loadingEl.style.display = 'none';
            
        } catch (error) {
            console.error('Error loading tools:', error);
            allTools = fallbackTools;
            filteredTools = [...allTools];
            renderTools();
            loadingEl.style.display = 'none';
            errorEl.style.display = 'block';
        }
    }, 1000);
}

// Function to render tools in the grid
function renderTools() {
    const toolsGrid = document.getElementById('toolsGrid');
    const noToolsEl = document.getElementById('no-tools');
    
    if (!toolsGrid) return;
    
    // Clear existing content
    toolsGrid.innerHTML = '';
    
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
        <a href="#" class="tool-link" onclick="event.stopPropagation(); openTool(arguments[0])" data-tool='${JSON.stringify(tool)}'>
            Try it now →
        </a>
    `;
    
    return card;
}

// Function to create the "Add New Tool" card
function createAddToolCard() {
    const card = document.createElement('div');
    card.className = 'tool-card add-tool-card';
    card.onclick = showAddToolInstructions;
    
    card.innerHTML = `
        <div class="icon">➕</div>
        <h3>Add New Tool</h3>
        <p>Create and add your own tools to the hub</p>
    `;
    
    return card;
}

// Function to open a tool
function openTool(tool) {
    const toolView = document.getElementById('tool-view');
    const toolTitle = document.getElementById('tool-title');
    const toolContent = document.getElementById('tool-content');
    
    if (!toolView || !toolTitle || !toolContent) return;
    
    // Update tool view
    toolTitle.textContent = tool.name;
    
    // Try to load the tool content
    if (tool.path && tool.path.includes('/tools/')) {
        // Create iframe to load the tool
        toolContent.innerHTML = `
            <div style="text-align: center; padding: 2rem;">
                <p>Loading ${tool.name}...</p>
                <div style="margin-top: 1rem;">
                    <div style="display: inline-block; width: 20px; height: 20px; border: 2px solid #f3f3f3; border-top: 2px solid var(--primary-color); border-radius: 50%; animation: spin 1s linear infinite;"></div>
                </div>
            </div>
            <style>
                @keyframes spin {
                    0% { transform: rotate(0deg); }
                    100% { transform: rotate(360deg); }
                }
            </style>
        `;
        
        // Simulate loading the tool (in a real app, this would load the actual tool)
        setTimeout(() => {
            toolContent.innerHTML = `
                <div style="text-align: center; padding: 3rem; background: #f8fafc; border-radius: 8px;">
                    <div style="font-size: 3rem; margin-bottom: 1rem;">${tool.icon}</div>
                    <h3>${tool.name}</h3>
                    <p style="color: var(--text-secondary); margin: 1rem 0;">
                        ${tool.description}
                    </p>
                    <div style="background: white; padding: 2rem; border-radius: 8px; margin-top: 2rem; box-shadow: var(--shadow-light);">
                        <p><strong>Tool Status:</strong> ${tool.status}</p>
                        <p><strong>Category:</strong> ${tool.category || 'utility'}</p>
                        <p><strong>Tags:</strong> ${(tool.tags || []).join(', ')}</p>
                        <hr style="margin: 1rem 0; border: none; border-top: 1px solid var(--border-color);">
                        <p style="font-style: italic;">
                            This is a placeholder. In your actual deployment, the tool content from 
                            <code>${tool.path}/index.html</code> would be loaded here.
                        </p>
                    </div>
                </div>
            `;
        }, 1500);
    } else {
        toolContent.innerHTML = `
            <div style="text-align: center; padding: 3rem;">
                <p>Tool content not available</p>
            </div>
        `;
    }
    
    // Show tool view
    document.getElementById('home-view').style.display = 'none';
    document.getElementById('about-view').style.display = 'none';
    toolView.style.display = 'block';
}

// Function to show add tool instructions
function showAddToolInstructions() {
    const toolView = document.getElementById('tool-view');
    const toolTitle = document.getElementById('tool-title');
    const toolContent = document.getElementById('tool-content');
    
    toolTitle.textContent = 'Add New Tool';
    toolContent.innerHTML = `
        <div style="max-width: 800px;">
            <h3>How to Add a New Tool</h3>
            <ol style="margin: 1rem 0; padding-left: 2rem; line-height: 1.8;">
                <li><strong>Create Tool Directory:</strong> Create a new folder in the <code>tools/</code> directory with your tool name</li>
                <li><strong>Add config.json:</strong> Create a configuration file with tool metadata</li>
                <li><strong>Add index.html:</strong> Create your tool's HTML interface</li>
                <li><strong>Build & Deploy:</strong> Run the build script and deploy to see your tool</li>
            </ol>
            
            <div style="background: #f8fafc; padding: 1.5rem; border-radius: 8px; margin: 2rem 0;">
                <h4>Example config.json:</h4>
                <pre style="background: white; padding: 1rem; border-radius: 4px; overflow-x: auto; margin-top: 0.5rem;"><code>{
  "name": "My Awesome Tool",
  "description": "A brief description of what your tool does",
  "icon": "🚀",
  "status": "active",
  "category": "utility",
  "tags": ["tag1", "tag2"]
}</code></pre>
            </div>
            
            <div style="background: #f0f9ff; padding: 1.5rem; border-radius: 8px; margin: 2rem 0;">
                <h4>Build Commands:</h4>
                <pre style="background: white; padding: 1rem; border-radius: 4px; margin-top: 0.5rem;"><code># Build the project
node scripts/build.js build

# Serve locally for testing
node scripts/build.js serve</code></pre>
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
    
    // Add event listeners for search
    searchInput.addEventListener('input', handleSearch);
    searchInput.addEventListener('keyup', handleSearch);
}

// Function to handle search input
function handleSearch(event) {
    const query = event.target.value.toLowerCase().trim();
    
    if (query === '') {
        // Show all tools if search is empty
        filteredTools = [...allTools];
    } else {
        // Filter tools based on search query
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