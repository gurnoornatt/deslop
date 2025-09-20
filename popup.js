// Slop-ify Popup Script

document.addEventListener('DOMContentLoaded', async () => {
    console.log('Slop-ify popup loaded');

    // Get current tab info with robust error handling
    try {
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

        // Handle cases where tab.url might be invalid or special
        let domain = 'Unknown';
        let isValidWebPage = false;

        // Check if tab exists and has a valid URL property
        if (tab && tab.url && typeof tab.url === 'string' && tab.url.length > 0) {
            try {
                const url = new URL(tab.url);
                domain = url.hostname || 'Unknown';
                // Check if it's a regular web page (not chrome://, chrome-extension://, etc.)
                isValidWebPage = url.protocol === 'http:' || url.protocol === 'https:';
            } catch (urlError) {
                // URL construction failed, safely handle the error
                console.log('Invalid URL detected:', typeof tab.url === 'string' ? tab.url : 'non-string URL');

                // Safely extract protocol or show truncated URL
                try {
                    const urlStr = String(tab.url); // Ensure it's a string
                    if (urlStr.includes('://')) {
                        domain = urlStr.split('://')[0] + '://...';
                    } else {
                        domain = urlStr.length > 20 ? urlStr.substring(0, 20) + '...' : urlStr;
                    }
                } catch (stringError) {
                    domain = 'Restricted Page';
                }
            }
        } else {
            // No URL available (restricted page or permission issue)
            domain = 'Restricted Page';
            console.log('Tab URL not accessible - likely a restricted page');
        }

        document.getElementById('currentDomain').textContent = domain;

        // Provide appropriate status based on page type
        if (!isValidWebPage) {
            document.getElementById('status').textContent = 'Slop-ify only works on web pages (http/https)';
            document.getElementById('status').className = 'status warning';
        } else if (domain.includes('linkedin.com')) {
            document.getElementById('status').textContent = 'Ready to replace LinkedIn text with slop!';
            document.getElementById('status').className = 'status success';
        } else {
            document.getElementById('status').textContent = 'Navigate to LinkedIn to use Slop-ify';
            document.getElementById('status').className = 'status warning';
        }
    } catch (error) {
        console.error('Error getting tab info:', error);
        document.getElementById('currentDomain').textContent = 'Unknown';
        document.getElementById('status').textContent = 'Error: Unable to access current tab';
        document.getElementById('status').className = 'status warning';
    }

    // Initialize AI Detection Controls
    await initializeAIControls();

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
            let domain;
            try {
                const url = new URL(tab.url);
                domain = url.hostname;

                // Check if it's a valid web page
                if (url.protocol !== 'http:' && url.protocol !== 'https:') {
                    throw new Error('Not on a web page - navigate to LinkedIn first');
                }
            } catch (urlError) {
                throw new Error('Invalid page URL - navigate to LinkedIn first');
            }

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
            let domain;
            try {
                const url = new URL(tab.url);
                domain = url.hostname;

                // Check if it's a valid web page
                if (url.protocol !== 'http:' && url.protocol !== 'https:') {
                    throw new Error('Not on a web page - navigate to LinkedIn first');
                }
            } catch (urlError) {
                throw new Error('Invalid page URL - navigate to LinkedIn first');
            }

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

            // Safe domain extraction with comprehensive error handling
            let domain = 'Unknown';

            if (tab && tab.url && typeof tab.url === 'string' && tab.url.length > 0) {
                try {
                    domain = new URL(tab.url).hostname || 'Unknown';
                } catch (urlError) {
                    // Safely handle malformed URLs with nested try-catch
                    try {
                        const urlStr = String(tab.url);
                        if (urlStr.includes('://')) {
                            domain = urlStr.split('://')[0] + '://...';
                        } else {
                            domain = urlStr.length > 20 ? urlStr.substring(0, 20) + '...' : urlStr;
                        }
                    } catch (stringError) {
                        domain = 'Restricted Page';
                    }
                }
            } else {
                domain = 'Restricted Page';
            }

            const debugInfo = {
                tabId: tab ? tab.id : 'Unknown',
                url: (tab && typeof tab.url === 'string') ? tab.url : 'Restricted/Unavailable',
                domain: domain,
                status: tab ? tab.status : 'Unknown',
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

    // Test API button functionality
    document.getElementById('testApiBtn').addEventListener('click', async () => {
        console.log('Test API button clicked');

        document.getElementById('status').textContent = 'Testing Sapling API...';
        document.getElementById('status').className = 'status warning';

        try {
            // Test API via background script
            const response = await new Promise((resolve, reject) => {
                chrome.runtime.sendMessage({ type: 'test_api' }, (response) => {
                    if (chrome.runtime.lastError) {
                        reject(new Error(chrome.runtime.lastError.message));
                    } else {
                        resolve(response);
                    }
                });
            });

            console.log('🧪 Popup: API test result:', response);

            if (response.success) {
                document.getElementById('status').textContent =
                    `API test passed! Test score: ${Math.round((response.testScore || 0) * 100)}%`;
                document.getElementById('status').className = 'status success';
            } else {
                document.getElementById('status').textContent =
                    `API test failed: ${response.message}`;
                document.getElementById('status').className = 'status warning';
            }

            // Update stats after test
            await updateAIStats();

        } catch (error) {
            console.error('❌ API test failed:', error);
            document.getElementById('status').textContent = `API test error: ${error.message}`;
            document.getElementById('status').className = 'status warning';
        }
    });

    // Clear Cache button functionality
    document.getElementById('clearCacheBtn').addEventListener('click', async () => {
        try {
            // Clear background cache
            await new Promise((resolve, reject) => {
                chrome.runtime.sendMessage({ type: 'clear_cache' }, (response) => {
                    if (chrome.runtime.lastError) {
                        reject(new Error(chrome.runtime.lastError.message));
                    } else {
                        resolve(response);
                    }
                });
            });

            // Also try to clear content script cache
            try {
                const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
                await chrome.tabs.sendMessage(tab.id, { type: 'clearCache' });
            } catch (contentError) {
                console.log('Content script cache clear failed (expected if not on LinkedIn):', contentError.message);
            }

            document.getElementById('status').textContent = 'Cache cleared successfully!';
            document.getElementById('status').className = 'status success';

            // Update stats
            await updateAIStats();
        } catch (error) {
            console.error('Clear cache failed:', error);
            document.getElementById('status').textContent = 'Failed to clear cache';
            document.getElementById('status').className = 'status warning';
        }
    });
});

/**
 * Initialize AI Detection Controls
 */
async function initializeAIControls() {
    try {
        // Load settings from storage
        const settings = await chrome.storage.local.get([
            'enabled',
            'aiDetectionEnabled',
            'aiConfidenceThreshold'
        ]);

        const mainEnabled = settings.enabled !== false; // Default true
        const aiDetectionEnabled = settings.aiDetectionEnabled !== false; // Default true
        const aiThreshold = settings.aiConfidenceThreshold || 65;

        // Set initial toggle states
        const mainToggle = document.getElementById('mainToggle');
        const aiToggle = document.getElementById('aiDetectionToggle');
        const slider = document.getElementById('aiThreshold');
        const thresholdValue = document.getElementById('thresholdValue');

        if (mainEnabled) {
            mainToggle.classList.add('active');
        }

        if (aiDetectionEnabled) {
            aiToggle.classList.add('active');
        }

        slider.value = aiThreshold;
        thresholdValue.textContent = aiThreshold + '%';

        // Main toggle event listener
        mainToggle.addEventListener('click', async () => {
            const isEnabled = mainToggle.classList.contains('active');
            const newState = !isEnabled;

            mainToggle.classList.toggle('active', newState);
            await chrome.storage.local.set({ enabled: newState });

            // Update status
            document.getElementById('status').textContent =
                `Slop-ify ${newState ? 'enabled' : 'disabled'}`;
            document.getElementById('status').className = 'status success';

            console.log('Main toggle:', newState);
        });

        // AI Detection toggle event listener
        aiToggle.addEventListener('click', async () => {
            const isEnabled = aiToggle.classList.contains('active');
            const newState = !isEnabled;

            aiToggle.classList.toggle('active', newState);
            await chrome.storage.local.set({ aiDetectionEnabled: newState });

            // Update status
            document.getElementById('status').textContent =
                `AI Detection ${newState ? 'enabled' : 'disabled'}`;
            document.getElementById('status').className = 'status success';

            console.log('AI Detection toggled:', newState);
        });

        // Threshold slider event listener
        slider.addEventListener('input', async (e) => {
            const value = parseInt(e.target.value);
            thresholdValue.textContent = value + '%';
            await chrome.storage.local.set({ aiConfidenceThreshold: value });
        });

        // Initialize AI stats (now displays slop meter)
        await updateAIStats();

        // Set up periodic stats refresh
        setInterval(updateAIStats, 5000); // Update every 5 seconds

    } catch (error) {
        console.error('Failed to initialize AI controls:', error);
    }
}

/**
 * Update AI Detection Statistics (now shows slop meter)
 */
async function updateAIStats() {
    try {
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

        if (!tab || !tab.url || !tab.url.includes('linkedin.com')) {
            // Not on LinkedIn, show default state
            document.getElementById('wordsReplaced').textContent = 'Not on LinkedIn';
            return;
        }

        // Get stats from content script
        const response = await chrome.tabs.sendMessage(tab.id, { type: 'getAIStats' });

        if (response && response.status === 'success') {
            const stats = response.stats;

            // Update slop meter with replacement count
            const totalReplacements = response.totalReplacements || 0;
            document.getElementById('wordsReplaced').textContent = `${totalReplacements} words`;

            console.log('🥄 Popup: Slop meter updated:', totalReplacements, 'words replaced');
        } else {
            document.getElementById('wordsReplaced').textContent = '0 words';
        }

    } catch (error) {
        // Content script not responding or other error
        document.getElementById('wordsReplaced').textContent = 'Not available';
        console.log('🥄 Popup: Slop meter update failed:', error.message);
    }
}