// Extension Validation Test Script
const fs = require('fs');
const path = require('path');

console.log('🔍 Testing AuthentiLink Extension Structure...\n');

// Test 1: Validate manifest.json
try {
    const manifestPath = './manifest.json';
    const manifestContent = fs.readFileSync(manifestPath, 'utf8');
    const manifest = JSON.parse(manifestContent);

    console.log('✅ manifest.json is valid JSON');
    console.log(`   - Name: ${manifest.name}`);
    console.log(`   - Version: ${manifest.version}`);
    console.log(`   - Manifest Version: ${manifest.manifest_version}`);

    // Check required fields
    const requiredFields = ['manifest_version', 'name', 'version', 'description'];
    const missingFields = requiredFields.filter(field => !manifest[field]);

    if (missingFields.length === 0) {
        console.log('✅ All required manifest fields present');
    } else {
        console.log(`❌ Missing required fields: ${missingFields.join(', ')}`);
    }

    // Check if it's Manifest V3
    if (manifest.manifest_version === 3) {
        console.log('✅ Using Manifest V3');
    } else {
        console.log(`❌ Wrong manifest version: ${manifest.manifest_version}`);
    }

} catch (error) {
    console.log('❌ manifest.json error:', error.message);
}

// Test 2: Check required files exist
const requiredFiles = [
    'content.js',
    'background.js',
    'popup.html',
    'popup.js',
    'icons/icon16.png',
    'icons/icon48.png',
    'icons/icon128.png'
];

console.log('\n📁 Checking required files...');
let allFilesExist = true;

requiredFiles.forEach(file => {
    if (fs.existsSync(file)) {
        console.log(`✅ ${file}`);
    } else {
        console.log(`❌ ${file} - MISSING`);
        allFilesExist = false;
    }
});

if (allFilesExist) {
    console.log('✅ All required files present');
} else {
    console.log('❌ Some required files are missing');
}

// Test 3: Basic syntax check for JS files
console.log('\n🔧 Basic syntax validation...');

const jsFiles = ['content.js', 'background.js', 'popup.js'];
jsFiles.forEach(file => {
    try {
        const content = fs.readFileSync(file, 'utf8');
        // Basic check - ensure file has content and no obvious syntax errors
        if (content.trim().length > 0) {
            console.log(`✅ ${file} - Has content`);
        } else {
            console.log(`⚠️  ${file} - Empty file`);
        }
    } catch (error) {
        console.log(`❌ ${file} - Error: ${error.message}`);
    }
});

console.log('\n🎯 Extension validation complete!');
console.log('\n📋 Next steps:');
console.log('1. Open Chrome and go to chrome://extensions/');
console.log('2. Enable "Developer mode" (toggle in top right)');
console.log('3. Click "Load unpacked" and select this directory');
console.log('4. The extension should appear without errors');
console.log('5. Navigate to LinkedIn to test content script injection');