const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const platform = process.platform;
const args = process.argv.slice(2);
const isRelease = args.includes('--release');

console.log('🚀 Building Desktop GPT...');
console.log(`Platform: ${platform}`);
console.log(`Release mode: ${isRelease}`);

// Ensure directories exist
const buildDir = path.join(__dirname, '..', 'build');
const distDir = path.join(__dirname, '..', 'dist');

if (!fs.existsSync(buildDir)) {
    fs.mkdirSync(buildDir, { recursive: true });
}

if (!fs.existsSync(distDir)) {
    fs.mkdirSync(distDir, { recursive: true });
}

try {
    // Install dependencies
    console.log('📦 Installing dependencies...');
    execSync('npm install', { stdio: 'inherit' });

    // Build based on platform
    let buildCommand;
    
    if (platform === 'win32') {
        buildCommand = isRelease ? 'npm run release' : 'npm run build:win';
        console.log('🪟 Building for Windows...');
    } else if (platform === 'darwin') {
        buildCommand = isRelease ? 'npm run release' : 'npm run build:mac';
        console.log('🍎 Building for macOS...');
    } else {
        buildCommand = isRelease ? 'npm run release' : 'npm run build:linux';
        console.log('🐧 Building for Linux...');
    }

    execSync(buildCommand, { stdio: 'inherit' });

    console.log('✅ Build completed successfully!');
    console.log(`📁 Output directory: ${distDir}`);
    
    // List generated files
    if (fs.existsSync(distDir)) {
        const files = fs.readdirSync(distDir);
        console.log('\n📋 Generated files:');
        files.forEach(file => {
            const filePath = path.join(distDir, file);
            const stats = fs.statSync(filePath);
            const size = (stats.size / 1024 / 1024).toFixed(2);
            console.log(`  • ${file} (${size} MB)`);
        });
    }

} catch (error) {
    console.error('❌ Build failed:', error.message);
    process.exit(1);
}
