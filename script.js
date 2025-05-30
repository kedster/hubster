        // Application state
        let allTools = [];
        let filteredTools = [];
        let currentView = 'home';

        // Tool configuration - This would normally come from scanning the tools directory
        const fallbackTools = [
            {
                id: 'data-visualizer',
                name: 'Data Visualizer',
                description: 'Transform your CSV data into beautiful, interactive charts and graphs with just a few clicks.',
                icon: '📊',
                status: 'active',
                path: '/tools/data-visualizer'
            },
            {
                id: 'color-generator',
                name: 'Color Palette Generator',
                description: 'Generate harmonious color palettes for your design projects using advanced color theory.',
                icon: '🎨',
                status: 'beta',
                path: '/tools/color-generator'
            },
            {
                id: 'url-shortener',
                name: 'URL Shortener',
                description: 'Create short, memorable links with detailed analytics and custom domains support.',
                icon: '🔗',
                status: 'active',
                path: '/tools/url-shortener'
            },
            {
                id: 'markdown-editor',
                name: 'Markdown Editor',
                description: 'A powerful, real-time markdown editor with live preview and export capabilities.',
                icon: '📝',
                status: 'coming-soon',
                path: '/tools/markdown-editor'
            },
            {
                id: 'qr-generator',
                name: 'QR Code Generator',
                description: 'Generate QR codes for URLs, text, WiFi credentials, and more with customizable styling.',
                icon: '📱',
                status: 'active',
                path: '/tools/qr-generator'
            },
            {
                id: 'password-generator',
                name: 'Password Generator',
                description: 'Create secure, customizable passwords with advanced options for length and character sets.',
                icon: '🔐',
                status: 'active',
                path: '/tools/password-generator'
            }
        ];

        // Initialize the application
        async function init() {
            try {
                await loadTools();
            } catch (error) {
                console.error('Error loading tools:', error);
                showError();
                allTools = fallbackTools;
            }
            
            filteredTools = [...allTools];
            renderTools();
            setupEventListeners();
            hideLoading();
        }

        // Attempt to load tools dynamically (simulated for demo)
        async function loadTools() {
            // In a real implementation, this would fetch from your tools directory
            // For now, we'll simulate the API call
            return new Promise((resolve, reject) => {
                setTimeout(() => {
                    // Simulate trying to load from tools directory
                    // This would normally make requests to discover tools
                    allTools = fallbackTools;
                    resolve(allTools);
                }, 1000);
            });
        }

        // Render tools in the grid
        function renderTools() {
            const grid = document.getElementById('toolsGrid');
            const noToolsMessage = document.getElementById('no-tools');
            
            if (filteredTools.length === 0) {
                grid.innerHTML = '';
                noToolsMessage.style.display = 'block';
                return;
            }

            noToolsMessage.style.display = 'none';
            
            const toolCards = filteredTools.map(tool => createToolCard(tool)).join('');
            const addToolCard = `
                <div class="add-tool-card" onclick="showAddToolInfo()">
                    <div class="icon">➕</div>
                    <h3>Add New Tool</h3>
                    <p>Follow the README to add your next amazing tool</p>
                </div>
            `;
            
            grid.innerHTML = toolCards + addToolCard;
        }

        // Create individual tool card HTML
        function createToolCard(tool) {
            const statusClass = `status-${tool.status.replace(' ', '-').toLowerCase()}`;
            const statusText = tool.status === 'coming-soon' ? 'Coming Soon' : 
                              tool.status.charAt(0).toUpperCase() + tool.status.slice(1);
            
            const isDisabled = tool.status === 'coming-soon';
            const clickHandler = isDisabled ? '' : `onclick="loadTool('${tool.id}')"`;
            
            return `
                <div class="tool-card" ${clickHandler}>
                    <div class="tool-status ${statusClass}">${statusText}</div>
                    <div class="tool-icon">${tool.icon}</div>
                    <h3>${tool.name}</h3>
                    <p>${tool.description}</p>
                    <a href="#" class="tool-link" ${isDisabled ? 'style="opacity: 0.5; pointer-events: none;"' : ''}>
                        ${isDisabled ? 'Coming Soon' : 'Launch Tool →'}
                    </a>
                </div>
            `;
        }

        // Load and display a specific tool
        async function loadTool(toolId) {
            const tool = allTools.find(t => t.id === toolId);
            if (!tool) return;

            showToolView();
            document.getElementById('tool-title').textContent = tool.name;
            
            const content = document.getElementById('tool-content');
            content.innerHTML = '<div style="text-align: center; padding: 2rem;">Loading tool... ⏳</div>';

            try {
                // In a real implementation, this would load the actual tool
                // For demo purposes, we'll show a placeholder
                setTimeout(() => {
                    content.innerHTML = `
                        <div style="text-align: center; padding: 2rem;">
                            <div style="font-size: 4rem; margin-bottom: 1rem;">${tool.icon}</div>
                            <h2>${tool.name}</h2>
                            <p style="margin: 1rem 0; color: var(--text-secondary);">${tool.description}</p>
                            <div style="background: #f8fafc; border-radius: 8px; padding: 2rem; margin: 2rem 0;">
                                <p><strong>Tool implementation would go here!</strong></p>
                                <p>In a real setup, this would load the tool from <code>${tool.path}/index.html</code></p>
                                <p>The tool would have its own interface, functionality, and features.</p>
                            </div>
                            <button onclick="showHome()" style="background: var(--primary-color); color: white; border: none; padding: 0.75rem 1.5rem; border-radius: 6px; cursor: pointer; font-weight: 500;">
                                Back to Tools
                            </button>
                        </div>
                    `;
                }, 800);
            } catch (error) {
                content.innerHTML = `
                    <div style="text-align: center; padding: 2rem; color: #dc2626;">
                        <p>Error loading tool: ${tool.name}</p>
                        <button onclick="showHome()" style="background: var(--primary-color); color: white; border: none; padding: 0.75rem 1.5rem; border-radius: 6px; cursor: pointer; font-weight: 500; margin-top: 1rem;">
                            Back to Tools
                        </button>
                    </div>
                `;
            }
        }

        // Search functionality
        function filterTools(query) {
            const searchTerm = query.toLowerCase().trim();
            
            if (searchTerm === '') {
                filteredTools = [...allTools];
            } else {
                filteredTools = allTools.filter(tool => 
                    tool.name.toLowerCase().includes(searchTerm) ||
                    tool.description.toLowerCase().includes(searchTerm)
                );
            }
            
            renderTools();
        }

        // View management
        function showHome() {
            document.getElementById('home-view').style.display = 'block';
            document.getElementById('tool-view').style.display = 'none';
            document.getElementById('about-view').style.display = 'none';
            currentView = 'home';
        }

        function showToolView() {
            document.getElementById('home-view').style.display = 'none';
            document.getElementById('tool-view').style.display = 'block';
            document.getElementById('about-view').style.display = 'none';
            currentView = 'tool';
        }

        function showAbout() {
            document.getElementById('home-view').style.display = 'none';
            document.getElementById('tool-view').style.display = 'none';
            document.getElementById('about-view').style.display = 'block';
            currentView = 'about';
        }

        function scrollToTools() {
            if (currentView !== 'home') showHome();
            setTimeout(() => {
                document.getElementById('tools').scrollIntoView({
                    behavior: 'smooth',
                    block: 'start'
                });
            }, 100);
        }

        function showAddToolInfo() {
            alert('To add a new tool:\n\n1. Create a folder in /tools/your-tool-name/\n2. Add index.html with your tool\n3. Add config.json with metadata\n4. Tool will be auto-discovered!\n\nCheck the README for detailed instructions.');
        }

        // Utility functions
        function hideLoading() {
            document.getElementById('loading').style.display = 'none';
        }

        function showError() {
            document.getElementById('error').style.display = 'block';
        }

        // Event listeners
        function setupEventListeners() {
            const searchInput = document.getElementById('searchInput');
            searchInput.addEventListener('input', (e) => {
                filterTools(e.target.value);
            });

            // Handle browser back/forward
            window.addEventListener('popstate', (e) => {
                if (e.state && e.state.view) {
                    switch(e.state.view) {
                        case 'home': showHome(); break;
                        case 'about': showAbout(); break;
                        case 'tool': 
                            if (e.state.toolId) loadTool(e.state.toolId);
                            break;
                    }
                }
            });
        }

        // Initialize the app when DOM is loaded
        document.addEventListener('DOMContentLoaded', init);

        // Handle smooth scrolling for anchor links
        document.querySelectorAll('a[href^="#"]').forEach(anchor => {
            anchor.addEventListener('click', function (e) {
                e.preventDefault();
                const target = document.querySelector(this.getAttribute('href'));
                if (target) {
                    target.scrollIntoView({
                        behavior: 'smooth',
                        block: 'start'
                    });
                }
            });
        });