// Slop-ify Content Script
// This script runs on LinkedIn pages to replace text with "slop slop slop"

// Enhanced Error Handling and Logging System
let debugMode = false;
let errorStats = {
    selectorErrors: 0,
    domErrors: 0,
    replacementErrors: 0,
    recoveredErrors: 0
};

/**
 * Enhanced logging system with debug mode support
 */
const Logger = {
    debug: (...args) => {
        if (debugMode) {
            console.debug('[Slop-ify DEBUG]', ...args);
        }
    },
    info: (...args) => console.info('[Slop-ify INFO]', ...args),
    warn: (...args) => console.warn('[Slop-ify WARN]', ...args),
    error: (...args) => console.error('[Slop-ify ERROR]', ...args),

    logError: (context, error, additionalInfo = {}) => {
        const errorData = {
            context,
            message: error.message,
            stack: error.stack,
            timestamp: new Date().toISOString(),
            url: window.location.href,
            ...additionalInfo
        };

        console.error('[Slop-ify ERROR]', errorData);

        // Update error statistics
        if (context.includes('selector')) errorStats.selectorErrors++;
        else if (context.includes('dom')) errorStats.domErrors++;
        else if (context.includes('replacement')) errorStats.replacementErrors++;

        return errorData;
    }
};

/**
 * Safe DOM operation wrapper with error handling
 */
const SafeDOM = {
    querySelector: (selector, root = document) => {
        try {
            if (!selector || typeof selector !== 'string') {
                throw new Error(`Invalid selector: ${selector}`);
            }
            return root.querySelector(selector);
        } catch (error) {
            Logger.logError('safe-dom-querySelector', error, { selector, rootType: root.constructor.name });
            return null;
        }
    },

    querySelectorAll: (selector, root = document) => {
        try {
            if (!selector || typeof selector !== 'string') {
                throw new Error(`Invalid selector: ${selector}`);
            }
            return Array.from(root.querySelectorAll(selector));
        } catch (error) {
            Logger.logError('safe-dom-querySelectorAll', error, { selector, rootType: root.constructor.name });
            return [];
        }
    },

    isValidElement: (element) => {
        return element &&
               element.nodeType === Node.ELEMENT_NODE &&
               typeof element.textContent === 'string' &&
               element.isConnected;
    },

    safeTextContentAccess: (element) => {
        try {
            if (!SafeDOM.isValidElement(element)) {
                return null;
            }
            return element.textContent;
        } catch (error) {
            Logger.logError('safe-dom-textContent', error, { elementTag: element?.tagName });
            return null;
        }
    },

    safeTextContentSet: (element, text) => {
        try {
            if (!SafeDOM.isValidElement(element)) {
                return false;
            }
            element.textContent = text;
            return true;
        } catch (error) {
            Logger.logError('safe-dom-setTextContent', error, { elementTag: element?.tagName, text });
            return false;
        }
    }
};

// Initialize debug mode from storage
async function initializeDebugMode() {
    try {
        const result = await chrome.storage.local.get(['debugMode']);
        debugMode = result.debugMode || false;
        Logger.debug('Debug mode initialized:', debugMode);
    } catch (error) {
        Logger.warn('Could not initialize debug mode from storage:', error.message);
    }
}

// Error boundary wrapper for all major functions
function withErrorBoundary(fn, context) {
    return function(...args) {
        try {
            return fn.apply(this, args);
        } catch (error) {
            Logger.logError(`error-boundary-${context}`, error, {
                functionName: fn.name,
                argsCount: args.length
            });
            errorStats.recoveredErrors++;
            return null; // Safe fallback
        }
    };
}

console.log('Slop-ify content script loaded on:', window.location.href);

// Enhanced Configuration with Fallback Selectors and Priority Levels
const LINKEDIN_SELECTORS = {
    // Post content selectors with fallback hierarchy
    posts: {
        primary: [
            '.feed-shared-update-v2__description .update-components-text',
            '.feed-shared-text__text-view',
            '.feed-shared-update-v2__commentary .update-components-text'
        ],
        secondary: [
            'div[data-test-id="main-feed-activity-card"] .break-words',
            '.social-details-social-activity .break-words',
            '[data-test-id="post-text"]'
        ],
        fallback: [
            'article p',
            '.feed-shared-text span',
            '.update-components-text',
            '[role="article"] p',
            '.artdeco-card p'
        ]
    },

    // Message selectors with fallbacks
    messages: {
        primary: [
            '.msg-s-event-listitem__body',
            '.msg-s-message-list__event .break-words',
            '.message-item-content__body'
        ],
        secondary: [
            '.msg-form__contenteditable',
            '.msg-s-message-group__event-text',
            '.msg-overlay-conversation-bubble__text'
        ],
        fallback: [
            '.messaging-thread-item p',
            '.msg-conversation-card p',
            '[data-test-id="message-text"]'
        ]
    },

    // Comment selectors with fallbacks
    comments: {
        primary: [
            '.comments-comment-item__main-content .break-words',
            '.comment .break-words',
            '.social-details-social-activity__comment-item .break-words'
        ],
        secondary: [
            '.comments-comment-item-content-body',
            '.comment-content .break-words'
        ],
        fallback: [
            '.comment p',
            '.comment-text',
            '[data-test-id="comment-text"]'
        ]
    },

    // Profile content selectors with fallbacks
    profiles: {
        primary: [
            '.pv-about__summary-text .break-words',
            '.pv-profile-section__card-item-v2 .break-words',
            '.experience-item__description .break-words'
        ],
        secondary: [
            '.pv-about-section .break-words',
            '.pv-profile-section__card-header .break-words'
        ],
        fallback: [
            '.profile-section p',
            '.experience-item p',
            '.profile-content .break-words'
        ]
    }
};

/**
 * Smart selector resolver with fallback support and error recovery
 */
const SelectorResolver = {
    /**
     * Get all selectors for a category with priority ordering
     */
    getAllSelectors: (category) => {
        const categorySelectors = LINKEDIN_SELECTORS[category];
        if (!categorySelectors) {
            Logger.warn(`Unknown selector category: ${category}`);
            return [];
        }

        return [
            ...categorySelectors.primary,
            ...categorySelectors.secondary,
            ...categorySelectors.fallback
        ];
    },

    /**
     * Test selector validity before use
     */
    isValidSelector: (selector) => {
        try {
            document.querySelector(selector);
            return true;
        } catch (error) {
            Logger.debug(`Invalid selector detected: ${selector}`, error.message);
            return false;
        }
    },

    /**
     * Find elements with intelligent fallback logic
     */
    findElements: (category, root = document) => {
        const allSelectors = SelectorResolver.getAllSelectors(category);
        let foundElements = [];
        let successfulSelectors = [];

        for (const selector of allSelectors) {
            if (!SelectorResolver.isValidSelector(selector)) {
                continue;
            }

            try {
                const elements = SafeDOM.querySelectorAll(selector, root);
                if (elements.length > 0) {
                    foundElements.push(...elements);
                    successfulSelectors.push(selector);
                    Logger.debug(`Found ${elements.length} elements with selector: ${selector}`);
                }
            } catch (error) {
                Logger.debug(`Selector failed: ${selector}`, error.message);
            }
        }

        // Remove duplicates while preserving order
        const uniqueElements = [];
        const seenElements = new Set();

        for (const element of foundElements) {
            if (!seenElements.has(element)) {
                uniqueElements.push(element);
                seenElements.add(element);
            }
        }

        Logger.debug(`Category ${category}: found ${uniqueElements.length} unique elements using ${successfulSelectors.length} selectors`);

        return {
            elements: uniqueElements,
            successfulSelectors,
            totalAttempted: allSelectors.length
        };
    }
};

// Performance monitoring
const performance = {
    start: (label) => console.time(`Slop-ify: ${label}`),
    end: (label) => console.timeEnd(`Slop-ify: ${label}`),
    replacementCount: 0,
    processedElements: new WeakSet()
};

/**
 * Enhanced secure text replacement function with comprehensive error handling
 * @param {Element} element - The DOM element to process
 * @param {string} replacementText - The text to replace with ("slop slop slop")
 * @returns {Object} - Detailed result object with success status and metrics
 */
function replaceTextContent(element, replacementText = 'slop slop slop') {
    const result = {
        success: false,
        reason: null,
        originalText: null,
        elementInfo: null,
        error: null
    };

    try {
        // Comprehensive element validation
        if (!SafeDOM.isValidElement(element)) {
            result.reason = 'invalid_element';
            Logger.debug('Element validation failed:', {
                element,
                nodeType: element?.nodeType,
                isConnected: element?.isConnected
            });
            return result;
        }

        // Avoid processing already replaced elements
        if (performance.processedElements.has(element)) {
            result.reason = 'already_processed';
            Logger.debug('Element already processed, skipping');
            return result;
        }

        // Safe text content access with validation
        const originalText = SafeDOM.safeTextContentAccess(element);
        if (!originalText) {
            result.reason = 'no_text_content';
            Logger.debug('No text content available for element');
            return result;
        }

        const trimmedText = originalText.trim();
        result.originalText = trimmedText;

        // Content validation checks
        if (trimmedText.length < 3) {
            result.reason = 'text_too_short';
            Logger.debug(`Text too short (${trimmedText.length} chars):`, trimmedText);
            return result;
        }

        // Avoid replacing our own replacement text
        if (trimmedText === replacementText) {
            result.reason = 'already_replaced';
            Logger.debug('Text already contains replacement text');
            return result;
        }

        // Check for protected content (e.g., navigation, buttons, etc.)
        const elementInfo = {
            tag: element.tagName.toLowerCase(),
            className: element.className || '',
            id: element.id || '',
            role: element.getAttribute('role') || '',
            ariaLabel: element.getAttribute('aria-label') || ''
        };

        result.elementInfo = elementInfo;

        // Skip if element appears to be UI/navigation content
        const protectedPatterns = /nav|menu|button|toolbar|breadcrumb|search|filter/i;
        if (protectedPatterns.test(elementInfo.className + ' ' + elementInfo.role + ' ' + elementInfo.ariaLabel)) {
            result.reason = 'protected_content';
            Logger.debug('Skipping protected UI element:', elementInfo);
            return result;
        }

        // Perform safe text replacement
        const replacementSuccess = SafeDOM.safeTextContentSet(element, replacementText);
        if (!replacementSuccess) {
            result.reason = 'replacement_failed';
            result.error = 'SafeDOM.safeTextContentSet returned false';
            return result;
        }

        // Verify replacement was successful
        const verificationText = SafeDOM.safeTextContentAccess(element);
        if (verificationText !== replacementText) {
            result.reason = 'verification_failed';
            result.error = `Expected "${replacementText}", got "${verificationText}"`;
            Logger.warn('Text replacement verification failed:', {
                expected: replacementText,
                actual: verificationText,
                element: elementInfo
            });
            return result;
        }

        // Mark as processed and update metrics
        performance.processedElements.add(element);
        performance.replacementCount++;

        result.success = true;
        result.reason = 'success';

        Logger.debug(`Text replaced successfully in ${elementInfo.tag}:`, {
            original: trimmedText.substring(0, 50) + (trimmedText.length > 50 ? '...' : ''),
            replacement: replacementText,
            element: elementInfo
        });

        return result;

    } catch (error) {
        result.error = error.message;
        result.reason = 'exception';
        Logger.logError('replacement-text-content', error, {
            element: result.elementInfo || { tag: element?.tagName },
            replacementText,
            originalText: result.originalText
        });
        errorStats.replacementErrors++;
        return result;
    }
}

/**
 * Enhanced scan and replace function with comprehensive error handling and fallback logic
 * @param {Element} rootElement - Root element to search within (default: document)
 * @returns {Object} - Detailed results with metrics and error information
 */
function scanAndReplace(rootElement = document) {
    performance.start('scanAndReplace');

    const results = {
        totalProcessed: 0,
        successfulReplacements: 0,
        failedReplacements: 0,
        categoriesProcessed: 0,
        categoryResults: {},
        errors: [],
        startTime: Date.now()
    };

    try {
        // Validate root element
        if (!rootElement || !rootElement.querySelectorAll) {
            throw new Error('Invalid root element provided');
        }

        Logger.debug('Starting scan and replace operation', {
            rootElement: rootElement.constructor.name,
            rootElementTag: rootElement.tagName || 'Document'
        });

        // Process each category with enhanced error handling
        const categories = Object.keys(LINKEDIN_SELECTORS);

        for (const category of categories) {
            try {
                const categoryResult = {
                    category,
                    elementsFound: 0,
                    replacements: 0,
                    failures: 0,
                    selectorsUsed: 0,
                    errors: []
                };

                Logger.debug(`Processing category: ${category}`);

                // Use enhanced selector resolver
                const selectorResult = SelectorResolver.findElements(category, rootElement);

                categoryResult.elementsFound = selectorResult.elements.length;
                categoryResult.selectorsUsed = selectorResult.successfulSelectors.length;

                if (selectorResult.elements.length === 0) {
                    Logger.debug(`No elements found for category: ${category}`);
                    results.categoryResults[category] = categoryResult;
                    continue;
                }

                // Process each found element with error recovery
                for (const element of selectorResult.elements) {
                    results.totalProcessed++;

                    try {
                        const replacementResult = replaceTextContent(element);

                        if (replacementResult.success) {
                            categoryResult.replacements++;
                            results.successfulReplacements++;
                        } else {
                            categoryResult.failures++;
                            results.failedReplacements++;

                            if (replacementResult.error) {
                                categoryResult.errors.push({
                                    reason: replacementResult.reason,
                                    error: replacementResult.error,
                                    element: replacementResult.elementInfo
                                });
                            }
                        }
                    } catch (elementError) {
                        categoryResult.failures++;
                        results.failedReplacements++;
                        categoryResult.errors.push({
                            reason: 'element_processing_exception',
                            error: elementError.message,
                            element: { tag: element?.tagName }
                        });

                        Logger.logError('scan-replace-element', elementError, {
                            category,
                            element: element?.tagName
                        });
                    }
                }

                results.categoryResults[category] = categoryResult;
                results.categoriesProcessed++;

                Logger.debug(`Category ${category} complete:`, {
                    found: categoryResult.elementsFound,
                    replaced: categoryResult.replacements,
                    failed: categoryResult.failures
                });

            } catch (categoryError) {
                results.errors.push({
                    category,
                    error: categoryError.message,
                    type: 'category_processing_error'
                });

                Logger.logError('scan-replace-category', categoryError, { category });
            }
        }

        // Calculate final metrics
        results.endTime = Date.now();
        results.processingTime = results.endTime - results.startTime;
        results.successRate = results.totalProcessed > 0
            ? (results.successfulReplacements / results.totalProcessed * 100).toFixed(2)
            : 0;

        Logger.info('Scan and replace operation completed:', {
            processed: results.totalProcessed,
            successful: results.successfulReplacements,
            failed: results.failedReplacements,
            categories: results.categoriesProcessed,
            successRate: results.successRate + '%',
            processingTime: results.processingTime + 'ms',
            totalReplacements: performance.replacementCount
        });

    } catch (error) {
        results.errors.push({
            type: 'scan_replace_critical_error',
            error: error.message,
            stack: error.stack
        });

        Logger.logError('scan-replace-critical', error, {
            rootElement: rootElement?.constructor?.name
        });
    }

    performance.end('scanAndReplace');
    return results;
}

/**
 * Enhanced script injection test with comprehensive error handling
 */
const testContentScriptInjection = withErrorBoundary(async function() {
    Logger.info('Content script successfully injected');
    Logger.debug('DOM ready state:', document.readyState);
    Logger.debug('Page title:', document.title);
    Logger.debug('User agent:', navigator.userAgent);

    // Initialize debug mode from storage
    await initializeDebugMode();

    // Check if we're on LinkedIn with enhanced validation
    const isLinkedIn = window.location.hostname.includes('linkedin.com');
    Logger.debug('LinkedIn detection:', {
        hostname: window.location.hostname,
        isLinkedIn,
        pathname: window.location.pathname
    });

    if (!isLinkedIn) {
        Logger.warn('Not on LinkedIn domain, extension may not function properly');
        return;
    }

    Logger.info('Confirmed we are on LinkedIn');

    // Enhanced LinkedIn container detection with fallbacks
    const containerSelectors = [
        '[data-chameleon-result-urn]',
        '.feed-container',
        '.application-outlet',
        'main[role="main"]',
        'main',
        '#main-content',
        '.global-nav'
    ];

    let feedContainer = null;
    for (const selector of containerSelectors) {
        try {
            feedContainer = SafeDOM.querySelector(selector);
            if (feedContainer) {
                Logger.debug(`Found LinkedIn container with selector: ${selector}`);
                break;
            }
        } catch (error) {
            Logger.debug(`Selector failed: ${selector}`, error.message);
        }
    }

    if (!feedContainer) {
        Logger.warn('Could not find LinkedIn container, attempting scan anyway');
    } else {
        Logger.info('LinkedIn container found, starting text replacement...');
    }

    // Perform initial scan and replace with enhanced error handling
    try {
        const results = scanAndReplace();
        Logger.info('Initial scan complete:', {
            processed: results.totalProcessed,
            successful: results.successfulReplacements,
            failed: results.failedReplacements,
            successRate: results.successRate + '%',
            processingTime: results.processingTime + 'ms'
        });

        // Report any errors found during scanning
        if (results.errors.length > 0) {
            Logger.warn(`Scan completed with ${results.errors.length} errors:`, results.errors);
        }

    } catch (scanError) {
        Logger.logError('initial-scan', scanError, {
            containerFound: !!feedContainer,
            readyState: document.readyState
        });
    }

    // Set up error monitoring and recovery
    setupErrorMonitoring();

}, 'test-content-script-injection');

/**
 * Set up global error monitoring for the content script
 */
function setupErrorMonitoring() {
    // Monitor for uncaught errors in the content script
    window.addEventListener('error', (event) => {
        if (event.filename && event.filename.includes('content.js')) {
            Logger.logError('uncaught-error', {
                message: event.message,
                filename: event.filename,
                lineno: event.lineno,
                colno: event.colno,
                stack: event.error?.stack
            });
        }
    });

    // Monitor for unhandled promise rejections
    window.addEventListener('unhandledrejection', (event) => {
        Logger.logError('unhandled-promise-rejection', {
            message: event.reason?.message || event.reason,
            stack: event.reason?.stack
        });
    });

    Logger.debug('Error monitoring set up successfully');
}

// Run test when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', testContentScriptInjection);
} else {
    testContentScriptInjection();
}

// MutationObserver for dynamic content detection
let mutationObserver = null;
let debounceTimer = null;

/**
 * Debounced function to handle mutations
 * @param {MutationRecord[]} mutations - Array of mutation records
 */
function handleMutations(mutations) {
    // Clear existing timer
    if (debounceTimer) {
        clearTimeout(debounceTimer);
    }

    // Debounce rapid changes for performance (100ms as per requirements)
    debounceTimer = setTimeout(() => {
        performance.start('handleMutations');
        let newElementsProcessed = 0;

        for (const mutation of mutations) {
            if (mutation.type === 'childList') {
                // Process newly added nodes
                mutation.addedNodes.forEach(node => {
                    if (node.nodeType === Node.ELEMENT_NODE) {
                        // Scan the new element and its children
                        const processed = scanAndReplace(node);
                        newElementsProcessed += processed;
                    }
                });
            }
        }

        if (newElementsProcessed > 0) {
            console.log(`Slop-ify: Processed ${newElementsProcessed} new elements from mutations`);
        }

        performance.end('handleMutations');
    }, 100); // 100ms debounce as specified in requirements
}

/**
 * Set up MutationObserver to detect dynamically loaded content
 */
function setupMutationObserver() {
    try {
        // Disconnect existing observer if present
        if (mutationObserver) {
            mutationObserver.disconnect();
        }

        // Create new observer
        mutationObserver = new MutationObserver(handleMutations);

        // Configure observer for optimal performance
        const observerConfig = {
            childList: true,    // Detect additions/removals of child nodes
            subtree: true,      // Observe changes in descendant nodes
            attributes: false,  // Don't observe attribute changes for performance
            characterData: false // Don't observe text changes for performance
        };

        // Start observing the main content area
        const targetNode = document.querySelector('main') ||
                          document.querySelector('.application-outlet') ||
                          document.body;

        mutationObserver.observe(targetNode, observerConfig);

        console.log('Slop-ify: MutationObserver set up successfully, watching for dynamic content');
        return true;
    } catch (error) {
        console.error('Slop-ify: Error setting up MutationObserver:', error);
        return false;
    }
}

/**
 * Clean up observer on page unload to prevent memory leaks
 */
function cleanup() {
    if (mutationObserver) {
        mutationObserver.disconnect();
        console.log('Slop-ify: MutationObserver disconnected for cleanup');
    }

    if (debounceTimer) {
        clearTimeout(debounceTimer);
    }
}

// Set up cleanup on page unload
window.addEventListener('beforeunload', cleanup);
window.addEventListener('pagehide', cleanup);

// Additional test when window loads completely
window.addEventListener('load', () => {
    console.log('Slop-ify: Window fully loaded, running additional checks');
    testContentScriptInjection();

    // Set up MutationObserver after initial load
    setupMutationObserver();
});

// Enhanced message handling with error recovery and debug support
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    Logger.debug('Message received from popup:', request);

    try {
        switch (request.type) {
            case 'ping':
                sendResponse({
                    status: 'pong',
                    timestamp: Date.now(),
                    debugMode,
                    errorStats: { ...errorStats }
                });
                break;

            case 'toggleDebug':
                toggleDebugMode().then((newDebugMode) => {
                    sendResponse({
                        status: 'success',
                        debugMode: newDebugMode,
                        message: `Debug mode ${newDebugMode ? 'enabled' : 'disabled'}`
                    });
                }).catch((error) => {
                    Logger.logError('toggle-debug', error);
                    sendResponse({
                        status: 'error',
                        message: 'Failed to toggle debug mode: ' + error.message
                    });
                });
                break;

            case 'getErrorStats':
                sendResponse({
                    status: 'success',
                    errorStats: { ...errorStats },
                    debugMode,
                    totalReplacements: performance.replacementCount
                });
                break;

            case 'test':
                handleTestRequest().then(sendResponse).catch((error) => {
                    Logger.logError('test-request', error);
                    sendResponse({
                        status: 'error',
                        message: 'Test failed: ' + error.message
                    });
                });
                break;

            case 'rescan':
                handleRescanRequest().then(sendResponse).catch((error) => {
                    Logger.logError('rescan-request', error);
                    sendResponse({
                        status: 'error',
                        message: 'Rescan failed: ' + error.message
                    });
                });
                break;

            default:
                Logger.warn(`Unknown message type: ${request.type}`);
                sendResponse({
                    status: 'error',
                    message: `Unknown message type: ${request.type}`
                });
        }
    } catch (error) {
        Logger.logError('message-handler', error, { messageType: request.type });
        sendResponse({
            status: 'error',
            message: 'Message handling failed: ' + error.message
        });
    }

    return true; // Keep message channel open for async response
});

/**
 * Toggle debug mode and persist to storage
 */
async function toggleDebugMode() {
    try {
        debugMode = !debugMode;
        await chrome.storage.local.set({ debugMode });
        Logger.info(`Debug mode ${debugMode ? 'enabled' : 'disabled'}`);
        return debugMode;
    } catch (error) {
        Logger.logError('toggle-debug-mode', error);
        throw error;
    }
}

/**
 * Enhanced test request handler
 */
async function handleTestRequest() {
    Logger.info('Running comprehensive test requested by popup');

    const testResults = {
        contentScriptLoaded: true,
        onLinkedIn: window.location.hostname.includes('linkedin.com'),
        domReady: document.readyState === 'complete',
        pageTitle: document.title,
        debugMode,
        errorStats: { ...errorStats },
        feedContainer: false,
        mutationObserverActive: !!mutationObserver,
        categoriesFound: {},
        totalReplacements: performance.replacementCount,
        timestamp: new Date().toISOString()
    };

    // Enhanced container detection
    const containerSelectors = [
        '[data-chameleon-result-urn]',
        '.feed-container',
        '.application-outlet',
        'main'
    ];

    for (const selector of containerSelectors) {
        if (SafeDOM.querySelector(selector)) {
            testResults.feedContainer = true;
            break;
        }
    }

    // Test each category with enhanced selector resolver
    const categories = Object.keys(LINKEDIN_SELECTORS);
    for (const category of categories) {
        try {
            const result = SelectorResolver.findElements(category);
            testResults.categoriesFound[category] = {
                elementsFound: result.elements.length,
                selectorsUsed: result.successfulSelectors.length,
                totalSelectors: result.totalAttempted
            };
        } catch (error) {
            testResults.categoriesFound[category] = {
                error: error.message,
                elementsFound: 0
            };
        }
    }

    // Perform test scan with enhanced error handling
    try {
        const scanResults = scanAndReplace();
        testResults.scanResults = {
            totalProcessed: scanResults.totalProcessed,
            successful: scanResults.successfulReplacements,
            failed: scanResults.failedReplacements,
            successRate: scanResults.successRate,
            processingTime: scanResults.processingTime,
            errors: scanResults.errors.length
        };
    } catch (error) {
        testResults.scanResults = {
            error: error.message
        };
    }

    Logger.info('Test results:', testResults);

    return {
        status: 'success',
        message: 'Comprehensive test completed successfully',
        results: testResults
    };
}

/**
 * Enhanced rescan request handler
 */
async function handleRescanRequest() {
    Logger.info('Manual rescan requested');

    try {
        const results = scanAndReplace();
        return {
            status: 'success',
            message: `Rescan completed - processed ${results.totalProcessed} elements`,
            processed: results.totalProcessed,
            successful: results.successfulReplacements,
            failed: results.failedReplacements,
            totalReplacements: performance.replacementCount,
            successRate: results.successRate,
            processingTime: results.processingTime,
            errors: results.errors
        };
    } catch (error) {
        Logger.logError('manual-rescan', error);
        throw error;
    }
}