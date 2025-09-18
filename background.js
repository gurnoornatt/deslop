// AuthentiLink Background Service Worker
// Handles API communication and extension lifecycle

console.log('AuthentiLink background service worker loaded');

// Installation event
chrome.runtime.onInstalled.addListener((details) => {
    console.log('AuthentiLink installed:', details.reason);

    if (details.reason === 'install') {
        console.log('AuthentiLink: First time installation');
        // Set up default settings
        chrome.storage.local.set({
            apiKey: '',
            threshold: 0.7,
            enabled: true,
            contentTypes: {
                posts: true,
                comments: true,
                profiles: true
            }
        });
    }
});

// Test storage permissions
chrome.storage.local.get(['enabled'], (result) => {
    console.log('AuthentiLink: Storage test successful, enabled:', result.enabled);
});

// Test context menu creation
try {
    chrome.contextMenus.create({
        id: 'authentilink-test',
        title: 'AuthentiLink Test Menu',
        contexts: ['page'],
        documentUrlPatterns: ['*://*.linkedin.com/*']
    });
    console.log('AuthentiLink: Context menu created successfully');
} catch (error) {
    console.error('AuthentiLink: Error creating context menu:', error);
}

// Handle context menu clicks
chrome.contextMenus.onClicked.addListener((info, tab) => {
    if (info.menuItemId === 'authentilink-test') {
        console.log('AuthentiLink: Test context menu clicked');
    }
});

// Listen for messages from content script
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    console.log('AuthentiLink: Message received from content script:', request);

    if (request.type === 'test') {
        sendResponse({ status: 'success', message: 'Background script responding' });
    }

    return true; // Keep message channel open for async response
});