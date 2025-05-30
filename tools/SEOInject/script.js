const fs = require('fs');
const path = require('path');

class ToolHubBuilder {
    constructor() {
        this.toolsDir = path.join(__dirname, '..', 'tools');
        this.outputDir = path.join(__dirname, '..', 'dist');
        this.tools = [];
    }

    // Scan the tools directory for available tools
    async scanTools() {
        console.log('🔍 Scanning for tools...');
        
        if (!fs.existsSync(this.toolsDir)) {
            console.log('⚠️  Tools directory not found, creating it...');
            fs.mkdirSync(this.toolsDir, { recursive: true });
            this.createExampleTool();
        }

        const toolDirs = fs.readdirSync(this.toolsDir, { withFileTypes: true })
            .filter(dirent => dirent.isDirectory())
            .map(dirent => dirent.name);

        for (const toolDir of toolDirs) {
            const toolPath = path.join(this.toolsDir, toolDir);
            const configPath = path.join(toolPath, 'config.json');
            const indexPath = path.join(toolPath, 'index.html');

            // Check if tool has required files
            if (fs.existsSync(configPath) && fs.existsSync(indexPath)) {
                try {
                    const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
                    const tool = {
                        id: toolDir,
                        path: `/tools/${toolDir}`,
                        indexPath: indexPath,
                        ...config
                    };
                    
                    // Validate required fields
                    if (this.validateTool(tool)) {
                        this.tools.push(tool);
                        console.log(`✅ Found tool: ${tool.name}`);
                    } else {
                        console.log(`❌ Invalid tool config: ${toolDir}`);
                    }
                } catch (error) {
                    console.log(`❌ Error reading config for ${toolDir}:`, error.message);
                }
            } else {
                console.log(`⚠️  Skipping ${toolDir}: missing config.json or index.html`);
            }
        }

        console.log(`📊 Found ${this.tools.length} valid tools`);
        return this.tools;
    }

    // Validate tool configuration
    validateTool(tool) {
        const required = ['name', 'description', 'icon', 'status'];
        return required.every(field => tool[field] !== undefined);
    }

    // Generate the tools manifest
    generateManifest() {
        const manifest = {
            version: '1.0.0',
            generated: new Date().toISOString(),
            tools: this.tools.map(tool => ({
                id: tool.id,
                name: tool.name,
                description: tool.description,
                icon: tool.icon,
                status: tool.status,
                path: tool.path,
                category: tool.category || 'utility',
                tags: tool.tags || []
            }))
        };

        return manifest;
    }

    // Build the main index.html with dynamic tool loading
    async buildIndex() {
        console.log('🏗️  Building main index.html...');
        
        const indexTemplate = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
        const manifest = this.generateManifest();

        // Inject tools data into the HTML
        const toolsData = `
        <script>
        // Auto-generated tools data
        window.TOOLS_MANIFEST = ${JSON.stringify(manifest, null, 2)};
        </script>`;

        // Insert before closing head tag
        const updatedIndex = indexTemplate.replace('</head>', `${toolsData}\n</head>`);

        // Ensure output directory exists
        if (!fs.existsSync(this.outputDir)) {
            fs.mkdirSync(this.outputDir, { recursive: true });
        }

        // Write the updated index.html
        fs.writeFileSync(path.join(this.outputDir, 'index.html'), updatedIndex);
        console.log('✅ Built index.html');
    }

    // Copy tools to output directory
    async copyTools() {
        console.log('📁 Copying tools...');
        
        const toolsOutput = path.join(this.outputDir, 'tools');
        if (!fs.existsSync(toolsOutput)) {
            fs.mkdirSync(toolsOutput, { recursive: true });
        }

        for (const tool of this.tools) {
            const sourcePath = path.join(this.toolsDir, tool.id);
            const destPath = path.join(toolsOutput, tool.id);
            
            this.copyDirectorySync(sourcePath, destPath);
            console.log(`📋 Copied ${tool.name}`);
        }
    }

    // Utility function to copy directories recursively
    copyDirectorySync(src, dest) {
        if (!fs.existsSync(dest)) {
            fs.mkdirSync(dest, { recursive: true });
        }

        const files = fs.readdirSync(src);
        
        for (const file of files) {
            const srcPath = path.join(src, file);
            const destPath = path.join(dest, file);
            const stat = fs.statSync(srcPath);

            if (stat.isDirectory()) {
                this.copyDirectorySync(srcPath, destPath);
            } else {
                fs.copyFileSync(srcPath, destPath);
            }
        }
    }

    // Create an example tool for demonstration
    createExampleTool() {
        const exampleToolDir = path.join(this.toolsDir, 'example-calculator');
        
        if (!fs.existsSync(exampleToolDir)) {
            fs.mkdirSync(exampleToolDir, { recursive: true });

            // Create config.json
            const config = {
                name: "Simple Calculator",
                description: "A basic calculator for quick mathematical operations.",
                icon: "🧮",
                status: "active",
                category: "utility",
                tags: ["math", "calculator", "utility"]
            };

            fs.writeFileSync(
                path.join(exampleToolDir, 'config.json'),
                JSON.stringify(config, null, 2)
            );

            // Create index.html
            const html = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Simple Calculator</title>
    <style>
        body {
            font-family: 'Inter', sans-serif;
            max-width: 400px;
            margin: 2rem auto;
            padding: 2rem;
            background: #f8fafc;
        }
        .calculator {
            background: white;
            border-radius: 12px;
            padding: 2rem;
            box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
        }
        .display {
            width: 100%;
            height: 60px;
            font-size: 2rem;
            text-align: right;
            padding: 0 1rem;
            border: 2px solid #e2e8f0;
            border-radius: 8px;
            margin-bottom: 1rem;
            background: #f8fafc;
        }
        .buttons {
            display: grid;
            grid-template-columns: repeat(4, 1fr);
            gap: 0.5rem;
        }
        button {
            height: 60px;
            border: none;
            border-radius: 8px;
            font-size: 1.2rem;
            font-weight: 500;
            cursor: pointer;
            transition: all 0.2s;
        }
        .number, .operator {
            background: #f1f5f9;
            color: #334155;
        }
        .number:hover, .operator:hover {
            background: #e2e8f0;
        }
        .equals {
            background: #6366f1;
            color: white;
        }
        .equals:hover {
            background: #4f46e5;
        }
        .clear {
            background: #ef4444;
            color: white;
        }
        .clear:hover {
            background: #dc2626;
        }
    </style>
</head>
<body>
    <div class="calculator">
        <h2>🧮 Simple Calculator</h2>
        <input type="text" class="display" id="display" readonly>
        <div class="buttons">
            <button class="clear" onclick="clearDisplay()">C</button>
            <button class="operator" onclick="appendToDisplay('/')">/</button>
            <button class="operator" onclick="appendToDisplay('*')">×</button>
            <button class="operator" onclick="deleteLast()">⌫</button>
            <button class="number" onclick="appendToDisplay('7')">7</button>
            <button class="number" onclick="appendToDisplay('8')">8</button>
            <button class="number" onclick="appendToDisplay('9')">9</button>
            <button class="operator" onclick="appendToDisplay('-')">-</button>
            <button class="number" onclick="appendToDisplay('4')">4</button>
            <button class="number" onclick="appendToDisplay('5')">5</button>
            <button class="number" onclick="appendToDisplay('6')">6</button>
            <button class="operator" onclick="appendToDisplay('+')">+</button>
            <button class="number" onclick="appendToDisplay('1')">1</button>
            <button class="number" onclick="appendToDisplay('2')">2</button>
            <button class="number" onclick="appendToDisplay('3')">3</button>
            <button class="equals" onclick="calculate()" rowspan="2">=</button>
            <button class="number" onclick="appendToDisplay('0')" colspan="2">0</button>
            <button class="number" onclick="appendToDisplay('.')">.</button>
        </div>
    </div>

    <script>
        let display = document.getElementById('display');
        
        function appendToDisplay(value) {
            display.value += value;
        }
        
        function clearDisplay() {
            display.value = '';
        }
        
        function deleteLast() {
            display.value = display.value.slice(0, -1);
        }
        
        function calculate() {
            try {
                // Replace × with * for calculation
                let expression = display.value.replace(/×/g, '*');
                let result = eval(expression);
                display.value = result;
            } catch (error) {
                display.value = 'Error';
                setTimeout(() => clearDisplay(), 1500);
            }
        }
        
        // Keyboard support
        document.addEventListener('keydown', function(event) {
            const key = event.key;
            if ('0123456789+-*/.'.includes(key)) {
                appendToDisplay(key === '*' ? '×' : key);
            } else if (key === 'Enter' || key === '=') {
                calculate();
            } else if (key === 'Escape' || key === 'c' || key === 'C') {
                clearDisplay();
            } else if (key === 'Backspace') {
                deleteLast();
            }
        });
    </script>
</body>
</html>`;

            fs.writeFileSync(path.join(exampleToolDir, 'index.html'), html);
            console.log('📝 Created example calculator tool');
        }
    }

    // Generate a README with instructions
    generateReadme() {
        const readme = `# Tool Hub

A dynamic collection of web tools and utilities.

## Adding New Tools

To add a new tool to the hub:

1. Create a new directory in the \`tools/\` folder with your tool name (e.g., \`tools/my-awesome-tool/\`)

2. Create a \`config.json\` file with the following structure:
\`\`\`json
{
  "name": "My Awesome Tool",
  "description": "A brief description of what your tool does",
  "icon": "🚀",
  "status": "active",
  "category": "utility",
  "tags": ["tag1", "tag2"]
}
\`\`\`

3. Create an \`index.html\` file with your tool's interface and functionality

4. Run the build script: \`npm run build\`

## Configuration Options

### Status Values
- \`active\`: Tool is fully functional
- \`beta\`: Tool is in beta testing
- \`coming-soon\`: Tool is planned but not yet available

### Categories
- \`utility\`: General utilities
- \`developer\`: Developer tools
- \`design\`: Design and creative tools
- \`productivity\`: Productivity tools
- \`converter\`: File/data converters

## Build Process

The build script will:
1. Scan the \`tools/\` directory for valid tools
2. Generate a manifest with all available tools
3. Build the main index.html with dynamic tool loading
4. Copy all tools to the output directory

## Directory Structure

\`\`\`
tool-hub/
├── index.html          # Main hub page
├── tools/              # Individual tools
│   ├── tool-name/
│   │   ├── config.json # Tool metadata
│   │   └── index.html  # Tool interface
├── scripts/
│   └── build.js        # Build automation
└── dist/               # Built output
\`\`\`

## Development

1. Install dependencies: \`npm install\`
2. Create your tools in the \`tools/\` directory
3. Build the project: \`npm run build\`
4. Serve the \`dist/\` directory

Happy building! 🛠️
`;

        fs.writeFileSync(path.join(__dirname, '..', 'README.md'), readme);
        console.log('📚 Generated README.md');
    }

    // Main build process
    async build() {
        console.log('🚀 Starting Tool Hub build process...\n');
        
        try {
            await this.scanTools();
            await this.buildIndex();
            await this.copyTools();
            this.generateReadme();
            
            console.log('\n✅ Build completed successfully!');
            console.log(`📊 Built ${this.tools.length} tools`);
            console.log(`📁 Output directory: ${this.outputDir}`);
            
            // Generate manifest file for external use
            const manifest = this.generateManifest();
            fs.writeFileSync(
                path.join(this.outputDir, 'manifest.json'),
                JSON.stringify(manifest, null, 2)
            );
            console.log('📋 Generated manifest.json');
            
        } catch (error) {
            console.error('❌ Build failed:', error);
            process.exit(1);
        }
    }

    // Development server (basic)
    serve(port = 3000) {
        const http = require('http');
        const url = require('url');
        const mime = require('mime-types');

        const server = http.createServer((req, res) => {
            const parsedUrl = url.parse(req.url);
            let pathname = parsedUrl.pathname;
            
            // Default to index.html
            if (pathname === '/') {
                pathname = '/index.html';
            }
            
            const filePath = path.join(this.outputDir, pathname);
            
            fs.readFile(filePath, (err, data) => {
                if (err) {
                    res.writeHead(404);
                    res.end('File not found');
                    return;
                }
                
                const mimeType = mime.lookup(filePath) || 'text/html';
                res.writeHead(200, { 'Content-Type': mimeType });
                res.end(data);
            });
        });
        
        server.listen(port, () => {
            console.log(`🌐 Development server running at http://localhost:${port}`);
        });
    }
}

// CLI interface
if (require.main === module) {
    const builder = new ToolHubBuilder();
    const command = process.argv[2];
    
    switch (command) {
        case 'build':
            builder.build();
            break;
        case 'serve':
            const port = process.argv[3] || 3000;
            builder.build().then(() => {
                builder.serve(port);
            });
            break;
        case 'scan':
            builder.scanTools().then(tools => {
                console.log('Found tools:', tools.map(t => t.name));
            });
            break;
        default:
            console.log('Usage: node build.js [build|serve|scan]');
            break;
    }
}

module.exports = ToolHubBuilder;