// Slop-ify Popup Script

document.addEventListener('DOMContentLoaded', async () => {
    console.log('Slop-ify popup loaded');

    // Get current tab info
    try {
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        const domain = new URL(tab.url).hostname;
        document.getElementById('currentDomain').textContent = domain;

        // Check if we're on LinkedIn
        if (domain.includes('linkedin.com')) {
            document.getElementById('status').textContent = 'Ready to replace LinkedIn text with slop!';
            document.getElementById('status').className = 'status success';
        } else {
            document.getElementById('status').textContent = 'Navigate to LinkedIn to use Slop-ify';
            document.getElementById('status').className = 'status warning';
        }
    } catch (error) {
        console.error('Error getting tab info:', error);
        document.getElementById('status').textContent = 'Error: Unable to access current tab';
        document.getElementById('status').className = 'status warning';
    }

    // Test button functionality
    document.getElementById('testBtn').addEventListener('click', async () => {
        console.log('Test button clicked');

        // Update status to show testing in progress
        document.getElementById('status').textContent = 'Running tests...';
        document.getElementById('status').className = 'status warning';

        try {
            // Test 1: Storage functionality
            const storageTest = await chrome.storage.local.get(['enabled']);
            console.log('✅ Storage test passed:', storageTest);

            // Test 2: Get current tab
            const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
            console.log('✅ Tab access test passed:', tab.url);

            // Test 3: Check if on LinkedIn
            const domain = new URL(tab.url).hostname;
            if (!domain.includes('linkedin.com')) {
                throw new Error('Not on LinkedIn - navigate to LinkedIn first');
            }
            console.log('✅ LinkedIn domain test passed');

            // Test 4: Content script messaging with fallback injection
            let response;
            try {
                response = await chrome.tabs.sendMessage(tab.id, { type: 'test' });
                console.log('✅ Content script messaging test passed:', response);
            } catch (msgError) {
                console.log('⚠️ Content script not responding, attempting to inject...');

                // Try to inject the content script manually
                await chrome.scripting.executeScript({
                    target: { tabId: tab.id },
                    files: ['content.js']
                });

                // Wait a moment for the script to load
                await new Promise(resolve => setTimeout(resolve, 500));

                // Try messaging again
                response = await chrome.tabs.sendMessage(tab.id, { type: 'test' });
                console.log('✅ Content script injected and messaging test passed:', response);
            }

            if (response && response.status === 'success') {
                const results = response.results;
                const selectorSummary = Object.entries(results.selectorsFound || {})
                    .map(([type, count]) => `${type}: ${count}`)
                    .join(', ');

                document.getElementById('status').textContent =
                    `Tests passed! Replacements: ${results.totalReplacements || 0}, Elements found: ${selectorSummary}`;
                document.getElementById('status').className = 'status success';

                console.log('🎯 Complete test results:', results);
            } else {
                throw new Error('Content script returned unexpected response');
            }

        } catch (error) {
            console.error('❌ Test failed:', error);

            // Provide specific error messages
            let errorMessage = 'Test failed: ';
            if (error.message.includes('Could not establish connection')) {
                errorMessage += 'Content script failed to load. Try: 1) Refresh LinkedIn page 2) Reload extension 3) Check if JavaScript is enabled';
            } else if (error.message.includes('Cannot access')) {
                errorMessage += 'Permission denied. Make sure you are on LinkedIn and the extension has permissions.';
            } else if (error.message.includes('Not on LinkedIn')) {
                errorMessage += 'Navigate to LinkedIn first';
            } else {
                errorMessage += error.message;
            }

            document.getElementById('status').textContent = errorMessage;
            document.getElementById('status').className = 'status warning';
        }
    });

    // Rescan button functionality
    document.getElementById('rescanBtn').addEventListener('click', async () => {
        console.log('Rescan button clicked');

        // Update status to show rescanning in progress
        document.getElementById('status').textContent = 'Rescanning page for new content...';
        document.getElementById('status').className = 'status warning';

        try {
            // Get current tab
            const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

            // Check if on LinkedIn
            const domain = new URL(tab.url).hostname;
            if (!domain.includes('linkedin.com')) {
                throw new Error('Not on LinkedIn - navigate to LinkedIn first');
            }

            // Send rescan request to content script
            const response = await chrome.tabs.sendMessage(tab.id, { type: 'rescan' });
            console.log('✅ Rescan completed:', response);

            if (response && response.status === 'success') {
                document.getElementById('status').textContent =
                    `Rescan complete! Processed: ${response.processed}, Total replacements: ${response.totalReplacements}`;
                document.getElementById('status').className = 'status success';
            } else {
                throw new Error('Rescan failed - unexpected response');
            }

        } catch (error) {
            console.error('❌ Rescan failed:', error);

            let errorMessage = 'Rescan failed: ';
            if (error.message.includes('Could not establish connection')) {
                errorMessage += 'Content script not responding. Refresh page and try again.';
            } else if (error.message.includes('Not on LinkedIn')) {
                errorMessage += 'Navigate to LinkedIn first';
            } else {
                errorMessage += error.message;
            }

            document.getElementById('status').textContent = errorMessage;
            document.getElementById('status').className = 'status warning';
        }
    });

    // Debug info button
    document.getElementById('debugBtn').addEventListener('click', async () => {
        console.log('Debug button clicked');

        try {
            const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
            const debugInfo = {
                tabId: tab.id,
                url: tab.url,
                domain: new URL(tab.url).hostname,
                status: tab.status,
                extensionId: chrome.runtime.id,
                permissions: await chrome.permissions.getAll()
            };

            console.log('🔍 Debug Info:', debugInfo);

            // Try to check if content script is injected
            try {
                await chrome.tabs.sendMessage(tab.id, { type: 'ping' });
                debugInfo.contentScriptStatus = 'Responding';
            } catch (e) {
                debugInfo.contentScriptStatus = 'Not responding: ' + e.message;
            }

            document.getElementById('status').textContent =
                `Debug: TabID=${tab.id}, Content Script=${debugInfo.contentScriptStatus.split(':')[0]}`;
            document.getElementById('status').className = 'status warning';

        } catch (error) {
            console.error('Debug failed:', error);
            document.getElementById('status').textContent = 'Debug failed: ' + error.message;
            document.getElementById('status').className = 'status warning';
        }
    });

    // Settings button (placeholder)
    document.getElementById('settingsBtn').addEventListener('click', () => {
        console.log('Settings clicked - not implemented yet');
        document.getElementById('status').textContent = 'Settings coming soon!';
        document.getElementById('status').className = 'status warning';
    });
});