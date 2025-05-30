const fs = require('fs');
const path = require('path');

class ToolHubBuilder {
    constructor() {
        this.rootDir = process.cwd();
        this.toolsDir = path.join(this.rootDir, 'tools');
        this.outputDir = path.join(this.rootDir, 'dist');
        this.tools = [];
    }

    scanTools() {
        console.log('Scanning for tools...');
        
        if (!fs.existsSync(this.toolsDir)) {
            fs.mkdirSync(this.toolsDir, { recursive: true });
            console.log('Created tools directory');
            return [];
        }

        const toolDirs = fs.readdirSync(this.toolsDir, { withFileTypes: true })
            .filter(d => d.isDirectory() && !d.name.startsWith('.'))
            .map(d => d.name);

        this.tools = [];

        toolDirs.forEach(dir => {
            const configPath = path.join(this.toolsDir, dir, 'config.json');
            
            if (fs.existsSync(configPath)) {
                try {
                    const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
                    
                    if (this.validateTool(config)) {
                        this.tools.push({
                            id: dir,
                            path: `/tools/${dir}`,
                            ...config
                        });
                        console.log(`✅ ${config.name}`);
                    } else {
                        console.log(`❌ Invalid: ${dir}`);
                    }
                } catch (error) {
                    console.log(`❌ JSON error: ${dir}`);
                }
            }
        });

        console.log(`Found ${this.tools.length} tools`);
        return this.tools;
    }

    validateTool(config) {
        return config.name && 
               config.description && 
               config.icon && 
               config.name.length >= 2 && 
               config.description.length >= 10;
    }

    generateManifest() {
        return {
            version: '1.0.0',
            generated: new Date().toISOString(),
            tools: this.tools
        };
    }

    copyTools() {
        console.log('Copying tools...');
        
        const toolsOutput = path.join(this.outputDir, 'tools');
        
        if (fs.existsSync(toolsOutput)) {
            fs.rmSync(toolsOutput, { recursive: true, force: true });
        }
        fs.mkdirSync(toolsOutput, { recursive: true });

        this.tools.forEach(tool => {
            const srcPath = path.join(this.toolsDir, tool.id);
            const destPath = path.join(toolsOutput, tool.id);
            
            try {
                this.copyDir(srcPath, destPath);
                console.log(`Copied: ${tool.name}`);
            } catch (error) {
                console.log(`Failed: ${tool.name}`);
            }
        });
    }

    copyDir(src, dest) {
        fs.mkdirSync(dest, { recursive: true });
        
        fs.readdirSync(src).forEach(file => {
            if (file.startsWith('.')) return;
            
            const srcPath = path.join(src, file);
            const destPath = path.join(dest, file);
            
            if (fs.statSync(srcPath).isDirectory()) {
                this.copyDir(srcPath, destPath);
            } else {
                fs.copyFileSync(srcPath, destPath);
            }
        });
    }

    clean() {
        console.log('Cleaning...');
        if (fs.existsSync(this.outputDir)) {
            fs.rmSync(this.outputDir, { recursive: true, force: true });
        }
        console.log('Done');
    }

    build() {
        console.log('Building Tool Hub...');
        
        if (!fs.existsSync(this.outputDir)) {
            fs.mkdirSync(this.outputDir, { recursive: true });
        }

        this.scanTools();
        this.copyTools();
        
        const manifest = this.generateManifest();
        fs.writeFileSync(
            path.join(this.outputDir, 'manifest.json'),
            JSON.stringify(manifest, null, 2)
        );
        
        console.log('Build complete!');
    }
}

// CLI
if (require.main === module) {
    const builder = new ToolHubBuilder();
    const command = process.argv[2] || 'build'; // Default to build
    
    switch (command) {
        case 'scan':
            builder.scanTools();
            break;
        case 'build':
            builder.build();
            break;
        case 'clean':
            builder.clean();
            break;
        case 'help':
            console.log('Usage: node build.js [scan|build|clean]');
            console.log('  scan  - Scan for tools');
            console.log('  build - Build tool hub (default)');
            console.log('  clean - Clean output directory');
            break;
        default:
            console.log('Unknown command. Use: node build.js help');
    }
}

module.exports = ToolHubBuilder;