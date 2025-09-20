// Slop-ify Background Service Worker
// Handles Sapling API communication and extension lifecycle

console.log('🚀 Slop-ify background service worker loaded');

/**
 * Rate Limiter for API calls
 */
class RateLimiter {
    constructor(maxPerMinute = 30) {
        this.requests = [];
        this.maxPerMinute = maxPerMinute;
    }

    canMakeRequest() {
        const now = Date.now();
        // Remove requests older than 1 minute
        this.requests = this.requests.filter(timestamp => now - timestamp < 60000);

        if (this.requests.length >= this.maxPerMinute) {
            console.warn(`🚫 Rate limit reached: ${this.requests.length}/${this.maxPerMinute} requests per minute`);
            return false;
        }

        this.requests.push(now);
        return true;
    }

    getTimeUntilReset() {
        if (this.requests.length === 0) return 0;

        const oldestRequest = Math.min(...this.requests);
        const resetTime = oldestRequest + 60000;
        return Math.max(0, resetTime - Date.now());
    }

    getStatus() {
        return {
            requestsThisMinute: this.requests.length,
            maxPerMinute: this.maxPerMinute,
            timeUntilReset: this.getTimeUntilReset()
        };
    }
}

/**
 * Cache for detection results
 */
class DetectionCache {
    constructor(maxSize = 1000, ttlMs = 3600000) { // 1 hour TTL
        this.cache = new Map();
        this.maxSize = maxSize;
        this.ttl = ttlMs;
        this.hits = 0;
        this.misses = 0;
    }

    _hashText(text) {
        // Simple hash function for text caching
        let hash = 0;
        for (let i = 0; i < text.length; i++) {
            const char = text.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash; // Convert to 32-bit integer
        }
        return hash.toString(36);
    }

    set(text, result) {
        if (this.cache.size >= this.maxSize) {
            // Remove oldest entry
            const firstKey = this.cache.keys().next().value;
            this.cache.delete(firstKey);
        }

        const key = this._hashText(text);
        this.cache.set(key, {
            result,
            timestamp: Date.now()
        });
    }

    get(text) {
        const key = this._hashText(text);
        const item = this.cache.get(key);

        if (!item) {
            this.misses++;
            return null;
        }

        // Check if expired
        if (Date.now() - item.timestamp > this.ttl) {
            this.cache.delete(key);
            this.misses++;
            return null;
        }

        this.hits++;
        return item.result;
    }

    getHitRate() {
        const total = this.hits + this.misses;
        return total === 0 ? 0 : Math.round((this.hits / total) * 100);
    }

    getStats() {
        return {
            hits: this.hits,
            misses: this.misses,
            hitRate: this.getHitRate(),
            cacheSize: this.cache.size
        };
    }

    clear() {
        this.cache.clear();
        this.hits = 0;
        this.misses = 0;
    }
}

// Global instances
const rateLimiter = new RateLimiter(30);
const detectionCache = new DetectionCache();

// API Configuration
const SAPLING_API_URL = 'https://api.sapling.ai/api/v1/aidetect';
const SAPLING_API_KEY = 'LYJS7X6ZH6PSHQRT5X1L0NUWQ0ZQX3B5';

// Statistics tracking
let stats = {
    totalRequests: 0,
    successfulRequests: 0,
    failedRequests: 0,
    cacheHits: 0,
    rateLimitHits: 0,
    errors: []
};

/**
 * Call Sapling AI Detection API
 */
async function callSaplingAPI(text) {
    console.log(`🌐 Background: Calling Sapling API for text: "${text.substring(0, 50)}..."`);

    const requestBody = {
        key: SAPLING_API_KEY,
        text: text,
        sent_scores: true
    };

    try {
        const response = await fetch(SAPLING_API_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(requestBody)
        });

        if (!response.ok) {
            throw new Error(`API error: ${response.status} ${response.statusText}`);
        }

        const data = await response.json();

        if (typeof data.score !== 'number') {
            throw new Error('Invalid API response format');
        }

        console.log(`✅ Background: Sapling API success - Score: ${Math.round(data.score * 100)}%`);
        stats.successfulRequests++;

        return {
            success: true,
            data: {
                score: data.score,
                sentence_scores: data.sentence_scores || [],
                version: data.version || 'unknown'
            }
        };

    } catch (error) {
        console.error('❌ Background: Sapling API error:', error);
        stats.failedRequests++;
        stats.errors.push({
            timestamp: Date.now(),
            error: error.message,
            text: text.substring(0, 100)
        });

        return {
            success: false,
            error: error.message
        };
    }
}

/**
 * Handle AI detection requests from content script
 */
async function handleAIDetection(request) {
    const { text } = request;
    stats.totalRequests++;

    console.log(`🔍 Background: AI detection request for text: "${text.substring(0, 50)}..."`);

    // Validate input
    if (!text || typeof text !== 'string' || text.trim().length < 50) {
        return {
            success: false,
            error: 'Text too short or invalid',
            isAI: false,
            confidence: 0,
            method: 'validation_failed'
        };
    }

    const cleanText = text.trim();

    // Check cache first
    const cached = detectionCache.get(cleanText);
    if (cached) {
        console.log(`💾 Background: Cache hit for text`);
        stats.cacheHits++;
        return {
            success: true,
            ...cached,
            fromCache: true
        };
    }

    // Check rate limit
    if (!rateLimiter.canMakeRequest()) {
        console.warn('🚫 Background: Rate limit exceeded');
        stats.rateLimitHits++;
        return {
            success: false,
            error: 'Rate limit exceeded',
            rateLimitStatus: rateLimiter.getStatus()
        };
    }

    // Call Sapling API
    const apiResult = await callSaplingAPI(cleanText);

    if (apiResult.success) {
        const isAI = apiResult.data.score > 0.65; // Threshold for AI detection

        const result = {
            success: true,
            isAI,
            confidence: apiResult.data.score,
            method: 'sapling_api',
            description: 'Sapling API detection',
            details: {
                apiScore: apiResult.data.score,
                sentenceScores: apiResult.data.sentence_scores,
                version: apiResult.data.version
            },
            timestamp: Date.now()
        };

        // Cache the result
        detectionCache.set(cleanText, result);

        console.log(`📊 Background: AI detection result - isAI: ${isAI}, confidence: ${Math.round(apiResult.data.score * 100)}%`);

        return result;
    } else {
        return {
            success: false,
            error: apiResult.error,
            isAI: false,
            confidence: 0,
            method: 'api_failed'
        };
    }
}

/**
 * Get current statistics
 */
function getStats() {
    return {
        ...stats,
        rateLimitStatus: rateLimiter.getStatus(),
        cacheStats: detectionCache.getStats(),
        recentErrors: stats.errors.slice(-5) // Last 5 errors
    };
}

/**
 * Test API connectivity
 */
async function testAPIConnectivity() {
    console.log('🧪 Background: Testing API connectivity...');

    const testText = "This is a test message to verify that the Sapling AI detection API is working correctly and can process text content.";

    try {
        const result = await callSaplingAPI(testText);

        if (result.success) {
            console.log('✅ Background: API connectivity test passed');
            return {
                success: true,
                message: 'API connectivity verified',
                testScore: result.data.score
            };
        } else {
            console.error('❌ Background: API connectivity test failed');
            return {
                success: false,
                message: `API test failed: ${result.error}`
            };
        }
    } catch (error) {
        console.error('❌ Background: API connectivity test error:', error);
        return {
            success: false,
            message: `API test error: ${error.message}`
        };
    }
}

// Installation event
chrome.runtime.onInstalled.addListener((details) => {
    console.log('🎉 Slop-ify installed:', details.reason);

    if (details.reason === 'install') {
        console.log('🆕 Slop-ify: First time installation');
        // Set up default settings
        chrome.storage.local.set({
            enabled: true,
            aiThreshold: 0.65,
            debugMode: false,
            apiCallCount: 0,
            stats: stats
        });
    }
});

// Message handling from content scripts
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    console.log('📨 Background: Message received:', request.type);

    // Handle different message types
    switch (request.type) {
        case 'ai_detection':
            handleAIDetection(request)
                .then(result => {
                    console.log('📤 Background: Sending AI detection result');
                    sendResponse(result);
                })
                .catch(error => {
                    console.error('❌ Background: AI detection error:', error);
                    sendResponse({
                        success: false,
                        error: error.message,
                        isAI: false,
                        confidence: 0
                    });
                });
            return true; // Keep message channel open for async response

        case 'get_stats':
            const currentStats = getStats();
            console.log('📊 Background: Sending stats:', currentStats);
            sendResponse(currentStats);
            return false;

        case 'test_api':
            testAPIConnectivity()
                .then(result => {
                    console.log('🧪 Background: API test result:', result);
                    sendResponse(result);
                })
                .catch(error => {
                    console.error('❌ Background: API test error:', error);
                    sendResponse({
                        success: false,
                        message: `Test failed: ${error.message}`
                    });
                });
            return true; // Keep message channel open for async response

        case 'clear_cache':
            detectionCache.clear();
            stats.cacheHits = 0;
            console.log('🧹 Background: Cache cleared');
            sendResponse({ success: true, message: 'Cache cleared' });
            return false;

        case 'reset_stats':
            stats = {
                totalRequests: 0,
                successfulRequests: 0,
                failedRequests: 0,
                cacheHits: 0,
                rateLimitHits: 0,
                errors: []
            };
            console.log('🔄 Background: Stats reset');
            sendResponse({ success: true, message: 'Stats reset' });
            return false;

        default:
            console.warn('⚠️ Background: Unknown message type:', request.type);
            sendResponse({ success: false, error: 'Unknown message type' });
            return false;
    }
});

// Periodic stats logging (every 5 minutes)
setInterval(() => {
    const currentStats = getStats();
    console.log('📈 Background: Periodic stats update:', {
        totalRequests: currentStats.totalRequests,
        successfulRequests: currentStats.successfulRequests,
        failedRequests: currentStats.failedRequests,
        cacheHits: currentStats.cacheHits,
        rateLimitHits: currentStats.rateLimitHits,
        cacheHitRate: currentStats.cacheStats.hitRate + '%'
    });
}, 5 * 60 * 1000);

// Initial API connectivity test
setTimeout(() => {
    testAPIConnectivity().then(result => {
        console.log('🔌 Background: Initial API connectivity test:', result);
    });
}, 2000);

console.log('✅ Slop-ify background service worker fully initialized');