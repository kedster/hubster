const fs = require('fs');
const path = require('path');

class ToolHubBuilder {
    constructor(rootDir = process.cwd()) {
        this.rootDir = rootDir;
        this.toolsDir = path.join(this.rootDir, 'tools');
        this.outputDir = path.join(this.rootDir, 'dist');
        this.tools = [];
        this.categories = new Set();
        this.tags = new Set();
    }

    // Scan the tools directory for available tools
    async scanTools() {
        console.log('🔍 Scanning for tools...');
        
        if (!fs.existsSync(this.toolsDir)) {
            console.log('📁 Creating tools directory...');
            fs.mkdirSync(this.toolsDir, { recursive: true });
            this.generateToolTemplate();
            console.log('📋 Created tool template and documentation');
        }

        const toolDirs = fs.readdirSync(this.toolsDir, { withFileTypes: true })
            .filter(dirent => dirent.isDirectory())
            .map(dirent => dirent.name);

        this.tools = []; // Reset tools array
        this.categories.clear();
        this.tags.clear();

        for (const toolDir of toolDirs) {
            if (toolDir.startsWith('.') || toolDir === 'template') {
                continue; // Skip hidden directories and template
            }

            const toolPath = path.join(this.toolsDir, toolDir);
            const configPath = path.join(toolPath, 'config.json');

            if (fs.existsSync(configPath)) {
                try {
                    const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
                    const tool = {
                        id: toolDir,
                        path: `/tools/${toolDir}`,
                        indexPath: path.join(toolPath, 'index.html'),
                        configPath: configPath,
                        hasIndex: fs.existsSync(path.join(toolPath, 'index.html')),
                        lastModified: fs.statSync(configPath).mtime,
                        ...config
                    };
                    
                    if (this.validateTool(tool)) {
                        this.tools.push(tool);
                        
                        // Collect categories and tags for analytics
                        if (tool.category) this.categories.add(tool.category);
                        if (tool.tags) tool.tags.forEach(tag => this.tags.add(tag));
                        
                        console.log(`✅ ${tool.name} (${tool.status}) ${!tool.hasIndex ? '[no HTML]' : ''}`);
                    } else {
                        console.log(`❌ Invalid config: ${toolDir}`);
                    }
                } catch (error) {
                    console.log(`❌ JSON error in ${toolDir}: ${error.message}`);
                }
            } else {
                console.log(`⚠️  Skipping ${toolDir}: no config.json`);
            }
        }

        console.log(`\n📊 Discovery Summary:`);
        console.log(`   Tools found: ${this.tools.length}`);
        console.log(`   Categories: ${Array.from(this.categories).join(', ') || 'none'}`);
        console.log(`   Unique tags: ${this.tags.size}`);
        
        return this.tools;
    }

    // Validate tool configuration
    validateTool(tool) {
        const required = ['name', 'description', 'icon', 'status'];
        const missing = required.filter(field => !tool[field]);
        
        if (missing.length > 0) {
            console.log(`   ❌ Missing: ${missing.join(', ')}`);
            return false;
        }
        
        // Validate status
        const validStatuses = ['active', 'beta', 'coming-soon', 'deprecated', 'maintenance'];
        if (!validStatuses.includes(tool.status)) {
            console.log(`   ❌ Invalid status: ${tool.status}`);
            return false;
        }
        
        // Validate required string fields
        if (typeof tool.name !== 'string' || tool.name.length < 2) {
            console.log(`   ❌ Invalid name: must be string with 2+ characters`);
            return false;
        }
        
        if (typeof tool.description !== 'string' || tool.description.length < 10) {
            console.log(`   ❌ Invalid description: must be string with 10+ characters`);
            return false;
        }
        
        return true;
    }

    // Generate comprehensive manifest
    generateManifest() {
        const activeTools = this.tools.filter(t => t.status === 'active');
        const betaTools = this.tools.filter(t => t.status === 'beta');
        
        const manifest = {
            version: '1.0.0',
            generated: new Date().toISOString(),
            buildId: this.generateBuildId(),
            summary: {
                total: this.tools.length,
                active: activeTools.length,
                beta: betaTools.length,
                categories: Array.from(this.categories).sort(),
                tags: Array.from(this.tags).sort()
            },
            tools: this.tools.map(tool => ({
                id: tool.id,
                name: tool.name,
                description: tool.description,
                icon: tool.icon,
                status: tool.status,
                path: tool.path,
                category: tool.category || 'utility',
                tags: tool.tags || [],
                hasIndex: tool.hasIndex,
                lastModified: tool.lastModified?.toISOString(),
                // Optional fields
                ...(tool.author && { author: tool.author }),
                ...(tool.version && { version: tool.version }),
                ...(tool.repository && { repository: tool.repository }),
                ...(tool.license && { license: tool.license })
            }))
        };

        return manifest;
    }

    // Generate unique build ID
    generateBuildId() {
        const timestamp = Date.now();
        const hash = require('crypto')
            .createHash('md5')
            .update(this.tools.map(t => `${t.id}-${t.lastModified}`).join(''))
            .digest('hex')
            .substring(0, 8);
        return `${timestamp}-${hash}`;
    }

    // Copy tools to output directory with error handling
    async copyTools() {
        console.log('\n📁 Copying tools to output...');
        
        const toolsOutput = path.join(this.outputDir, 'tools');
        
        // Clean and recreate output directory
        if (fs.existsSync(toolsOutput)) {
            fs.rmSync(toolsOutput, { recursive: true, force: true });
        }
        fs.mkdirSync(toolsOutput, { recursive: true });

        let copiedCount = 0;
        let skippedCount = 0;

        for (const tool of this.tools) {
            const sourcePath = path.join(this.toolsDir, tool.id);
            const destPath = path.join(toolsOutput, tool.id);
            
            try {
                this.copyDirectorySync(sourcePath, destPath);
                console.log(`📋 ${tool.name}`);
                copiedCount++;
            } catch (error) {
                console.log(`⚠️  Skipped ${tool.name}: ${error.message}`);
                skippedCount++;
            }
        }
        
        console.log(`\n📁 Copy Summary: ${copiedCount} copied, ${skippedCount} skipped`);
    }

    // Utility: Copy directory recursively with filtering
    copyDirectorySync(src, dest) {
        if (!fs.existsSync(dest)) {
            fs.mkdirSync(dest, { recursive: true });
        }

        const files = fs.readdirSync(src);
        
        for (const file of files) {
            // Skip hidden files and common dev files
            if (file.startsWith('.') || ['node_modules', 'package-lock.json'].includes(file)) {
                continue;
            }

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

    // Generate tool template and documentation
    generateToolTemplate() {
        const templateDir = path.join(this.toolsDir, 'template');
        fs.mkdirSync(templateDir, { recursive: true });

        // Template config.json
        const templateConfig = {
            name: "My Tool Name",
            description: "A brief description of what this tool does (minimum 10 characters)",
            icon: "🛠️",
            status: "active",
            category: "utility",
            tags: ["example", "template"],
            author: "Your Name",
            version: "1.0.0",
            repository: "https://github.com/username/repo",
            license: "MIT"
        };

        fs.writeFileSync(
            path.join(templateDir, 'config.json'),
            JSON.stringify(templateConfig, null, 2)
        );

        // Template HTML
        const templateHTML = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>My Tool Name</title>
    <style>
        body {
            font-family: system-ui, sans-serif;
            max-width: 800px;
            margin: 0 auto;
            padding: 2rem;
            line-height: 1.6;
        }
        .container {
            background: white;
            border-radius: 8px;
            padding: 2rem;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
        }
        button {
            background: #007bff;
            color: white;
            border: none;
            padding: 0.5rem 1rem;
            border-radius: 4px;
            cursor: pointer;
        }
        button:hover {
            background: #0056b3;
        }
        input, textarea {
            width: 100%;
            padding: 0.5rem;
            border: 1px solid #ddd;
            border-radius: 4px;
            margin: 0.5rem 0;
        }
    </style>
</head>
<body>
    <div class="container">
        <h1>🛠️ My Tool Name</h1>
        <p>Replace this template with your tool's functionality.</p>
        
        <div>
            <label>Input:</label>
            <input type="text" id="input" placeholder="Enter something...">
            <button onclick="processInput()">Process</button>
        </div>
        
        <div id="output" style="margin-top: 1rem; padding: 1rem; background: #f8f9fa; border-radius: 4px;">
            Output will appear here...
        </div>
    </div>

    <script>
        function processInput() {
            const input = document.getElementById('input').value;
            const output = document.getElementById('output');
            
            // Replace with your tool's logic
            output.textContent = input ? \`You entered: \${input}\` : 'Please enter something';
        }
    </script>
</body>
</html>`;

        fs.writeFileSync(path.join(templateDir, 'index.html'), templateHTML);

        // README for developers
        const readme = `# Tool Hub - Adding Your Tool

## Quick Start

1. Copy the \`template\` folder and rename it to your tool name
2. Edit \`config.json\` with your tool details
3. Replace \`index.html\` with your tool interface
4. Run: \`node build.js build\`

## Config.json Reference

\`\`\`json
{
  "name": "Required: Display name (2+ chars)",
  "description": "Required: Description (10+ chars)", 
  "icon": "Required: Single emoji or symbol",
  "status": "Required: active|beta|coming-soon|deprecated|maintenance",
  "category": "Optional: utility|developer|design|productivity|converter",
  "tags": ["Optional", "array", "of", "strings"],
  "author": "Optional: Your name",
  "version": "Optional: Semantic version",
  "repository": "Optional: Git repository URL",
  "license": "Optional: License type"
}
\`\`\`

## Status Meanings

- **active**: Fully functional and ready to use
- **beta**: Working but may have bugs or missing features  
- **coming-soon**: Placeholder for planned tool
- **deprecated**: No longer maintained
- **maintenance**: Temporarily unavailable

## File Structure

\`\`\`
tools/
└── your-tool-name/
    ├── config.json     (Required: Tool metadata)
    ├── index.html      (Optional: Tool interface)
    ├── style.css       (Optional: Custom styles)
    ├── script.js       (Optional: Tool logic)
    └── assets/         (Optional: Images, etc.)
\`\`\`

## Build Commands

\`\`\`bash
node build.js scan    # Discover tools
node build.js build   # Full build process  
node build.js clean   # Clean output directory
\`\`\`
`;

        fs.writeFileSync(path.join(this.toolsDir, 'README.md'), readme);
    }

    // Clean output directory
    clean() {
        console.log('🧹 Cleaning output directory...');
        
        if (fs.existsSync(this.outputDir)) {
            fs.rmSync(this.outputDir, { recursive: true, force: true });
            console.log('✅ Output directory cleaned');
        } else {
            console.log('ℹ️  Output directory already clean');
        }
    }

    // Main build process
    async build() {
        console.log('🚀 Tool Hub Build Process\n');
        
        try {
            // Ensure output directory exists
            if (!fs.existsSync(this.outputDir)) {
                fs.mkdirSync(this.outputDir, { recursive: true });
            }

            await this.scanTools();
            await this.copyTools();
            
            // Generate manifest
            const manifest = this.generateManifest();
            fs.writeFileSync(
                path.join(this.outputDir, 'manifest.json'),
                JSON.stringify(manifest, null, 2)
            );
            
            // Generate build info
            const buildInfo = {
                buildTime: new Date().toISOString(),
                buildId: manifest.buildId,
                toolsCount: this.tools.length,
                categories: Array.from(this.categories),
                outputDir: this.outputDir
            };
            
            fs.writeFileSync(
                path.join(this.outputDir, 'build-info.json'),
                JSON.stringify(buildInfo, null, 2)
            );
            
            console.log('\n✅ Build Complete!');
            console.log(`📋 Manifest: ${this.tools.length} tools`);
            console.log(`📁 Output: ${this.outputDir}`);
            console.log(`🔖 Build ID: ${manifest.buildId}`);
            
        } catch (error) {
            console.error('\n❌ Build Failed:', error.message);
            process.exit(1);
        }
    }

    // Get build statistics
    getStats() {
        return {
            tools: this.tools.length,
            categories: Array.from(this.categories),
            tags: Array.from(this.tags),
            byStatus: {
                active: this.tools.filter(t => t.status === 'active').length,
                beta: this.tools.filter(t => t.status === 'beta').length,
                'coming-soon': this.tools.filter(t => t.status === 'coming-soon').length,
                deprecated: this.tools.filter(t => t.status === 'deprecated').length,
                maintenance: this.tools.filter(t => t.status === 'maintenance').length
            }
        };
    }
}

// CLI Interface
if (require.main === module) {
    const builder = new ToolHubBuilder();
    const command = process.argv[2] || 'help';
    
    switch (command) {
        case 'scan':
            builder.scanTools().then(() => {
                console.log('\n📊 Stats:', builder.getStats());
            });
            break;
            
        case 'build':
            builder.build();
            break;
            
        case 'clean':
            builder.clean();
            break;
            
        case 'stats':
            builder.scanTools().then(() => {
                console.log('📊 Tool Hub Statistics:');
                const stats = builder.getStats();
                console.log(JSON.stringify(stats, null, 2));
            });
            break;
            
        case 'help':
        default:
            console.log(`
🛠️  Tool Hub Builder

Commands:
  scan     Discover and validate tools
  build    Full build process (scan + copy + manifest)
  clean    Remove output directory
  stats    Show detailed statistics
  help     Show this help message

Usage:
  node build.js [command]

Directory Structure:
  tools/           Your tool submissions
  dist/            Generated output
  dist/manifest.json    Tool registry
`);
            break;
    }
}

module.exports = ToolHubBuilder;