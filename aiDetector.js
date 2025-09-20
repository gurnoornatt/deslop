// AI Content Detection Module
// Dual-layer detection: Sapling API + Local Pattern Analysis

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

    clear() {
        this.cache.clear();
        this.hits = 0;
        this.misses = 0;
    }
}

/**
 * Main AI Detector Class
 */
class AIDetector {
    constructor() {
        // Sapling API disabled for security (no hardcoded keys in public extension)
        // this.SAPLING_API_URL = 'https://api.sapling.ai/api/v1/aidetect';
        // this.SAPLING_API_KEY = 'REMOVED_FOR_SECURITY';

        this.cache = new DetectionCache();
        this.rateLimiter = new RateLimiter(30); // 30 requests per minute (for local detection)

        this.stats = {
            totalAnalyzed: 0,
            aiDetected: 0,
            humanDetected: 0,
            apiCalls: 0,
            localDetections: 0,
            errors: 0
        };

        // Local pattern detection configuration
        this.patterns = this._initializePatterns();

        console.log('🤖 AIDetector initialized with Sapling API + Local fallback');
    }

    _initializePatterns() {
        return {
            // High-confidence AI phrases
            formalPhrases: [
                'delve into', 'it is worth noting', 'in conclusion', 'furthermore',
                'moreover', 'nevertheless', 'consequently', 'it should be noted',
                'it is important to understand', 'in today\'s rapidly evolving',
                'comprehensive understanding', 'multifaceted approach',
                'holistic perspective', 'strategic implementation'
            ],

            // AI-typical vocabulary
            buzzwords: [
                'leverage', 'utilize', 'optimize', 'streamline', 'facilitate',
                'comprehensive', 'robust', 'pivotal', 'invaluable', 'pertinent',
                'cutting-edge', 'state-of-the-art', 'paradigm', 'synergy',
                'scalable', 'sustainable', 'innovative', 'transformative'
            ],

            // Politeness markers common in AI
            politenessMarkers: [
                'thank you for', 'i\'m sorry but', 'i apologize', 'certainly',
                'i\'d be happy to', 'please note', 'i hope this helps',
                'feel free to', 'don\'t hesitate to', 'i understand your'
            ],

            // Structural patterns
            structures: {
                bulletLists: /^[\-\*•]\s+/gm,
                numberedLists: /^\d+\.\s+/gm,
                colonHeaders: /^[A-Z][^:]{2,30}:\s*[A-Z]/gm,
                perfectPunctuation: /[.!?]\s+[A-Z]/g
            },

            // Statistical thresholds
            thresholds: {
                minTextLength: 50,
                maxSentenceLength: 35,
                minBurstiness: 0.3,
                maxTypoRate: 0.01
            }
        };
    }

    /**
     * Main detection method
     * @param {string} text - Text to analyze
     * @returns {Object} Detection result
     */
    async detectAI(text) {
        if (!text || typeof text !== 'string') {
            return this._createResult(false, 0, 'invalid_input', 'Invalid text input');
        }

        const cleanText = text.trim();
        if (cleanText.length < this.patterns.thresholds.minTextLength) {
            return this._createResult(false, 0, 'too_short', 'Text too short for analysis');
        }

        this.stats.totalAnalyzed++;

        // Check cache first
        const cached = this.cache.get(cleanText);
        if (cached) {
            console.log(`💾 Cache hit for text: "${cleanText.substring(0, 50)}..."`);
            return cached;
        }

        // Use local pattern detection only (Sapling API disabled for security)
        console.log('🧠 Using local AI detection patterns only');
        const localResult = this._detectWithPatterns(cleanText);
        this.cache.set(cleanText, localResult);
        this.stats.localDetections++;
        return localResult;
    }

    /**
     * Detect using Sapling API - DISABLED for security
     * External API calls removed to prevent exposure of hardcoded keys
     * @param {string} text - Text to analyze
     * @returns {Object} API detection result
     */
    /*
    async _detectWithSapling(text) {
        // DISABLED: External API calls removed for security
        // No hardcoded API keys in public extensions
        throw new Error('Sapling API disabled for security - using local detection only');
    }
    */

    /**
     * Local pattern-based detection
     * @param {string} text - Text to analyze
     * @returns {Object} Local detection result
     */
    _detectWithPatterns(text) {
        const features = this._extractFeatures(text);
        const score = this._calculateLocalScore(features);
        const isAI = score > 0.65;

        console.log(`🧠 Local detection: ${Math.round(score * 100)}% AI confidence`);
        console.log(`📊 Features:`, features);

        if (isAI) {
            this.stats.aiDetected++;
        } else {
            this.stats.humanDetected++;
        }

        return this._createResult(
            isAI,
            score,
            'local_patterns',
            'Local pattern analysis',
            features
        );
    }

    /**
     * Extract linguistic features from text
     * @param {string} text - Text to analyze
     * @returns {Object} Extracted features
     */
    _extractFeatures(text) {
        const lowerText = text.toLowerCase();
        const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 5);
        const words = text.split(/\s+/).filter(w => w.length > 0);

        return {
            // Vocabulary features
            formalPhraseCount: this._countPhrases(lowerText, this.patterns.formalPhrases),
            buzzwordDensity: this._calculateBuzzwordDensity(lowerText, words.length),
            politenessScore: this._calculatePolitenessScore(lowerText),

            // Structural features
            bulletListCount: (text.match(this.patterns.structures.bulletLists) || []).length,
            numberedListCount: (text.match(this.patterns.structures.numberedLists) || []).length,
            colonHeaderCount: (text.match(this.patterns.structures.colonHeaders) || []).length,

            // Statistical features
            avgSentenceLength: this._calculateAverageLength(sentences),
            sentenceVariance: this._calculateVariance(sentences),
            burstiness: this._calculateBurstiness(sentences),
            typoCount: this._estimateTypos(text),
            perfectPunctuation: this._checkPerfectPunctuation(text),

            // Metadata
            wordCount: words.length,
            sentenceCount: sentences.length,
            characterCount: text.length
        };
    }

    /**
     * Calculate AI confidence score from features
     * @param {Object} features - Extracted features
     * @returns {number} Confidence score (0-1)
     */
    _calculateLocalScore(features) {
        let score = 0;

        // Vocabulary indicators (40% weight)
        if (features.formalPhraseCount > 0) score += 0.15;
        if (features.buzzwordDensity > 0.02) score += 0.15; // 2% buzzword density
        if (features.politenessScore > 0.5) score += 0.10;

        // Structural indicators (30% weight)
        if (features.bulletListCount > 2) score += 0.10;
        if (features.numberedListCount > 1) score += 0.10;
        if (features.colonHeaderCount > 0) score += 0.10;

        // Statistical indicators (30% weight)
        if (features.avgSentenceLength > 20) score += 0.10; // Long sentences
        if (features.burstiness < 0.3) score += 0.10; // Low sentence variation
        if (features.typoCount === 0 && features.wordCount > 20) score += 0.05; // Perfect text
        if (features.perfectPunctuation) score += 0.05;

        return Math.min(1.0, score);
    }

    // Helper methods for feature extraction
    _countPhrases(text, phrases) {
        return phrases.reduce((count, phrase) => {
            const regex = new RegExp(phrase.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi');
            const matches = text.match(regex);
            return count + (matches ? matches.length : 0);
        }, 0);
    }

    _calculateBuzzwordDensity(text, wordCount) {
        const buzzwordCount = this._countPhrases(text, this.patterns.buzzwords);
        return wordCount > 0 ? buzzwordCount / wordCount : 0;
    }

    _calculatePolitenessScore(text) {
        const politenessCount = this._countPhrases(text, this.patterns.politenessMarkers);
        return Math.min(1.0, politenessCount * 0.3);
    }

    _calculateAverageLength(sentences) {
        if (sentences.length === 0) return 0;
        const totalWords = sentences.reduce((sum, sentence) => {
            return sum + sentence.split(/\s+/).filter(w => w.length > 0).length;
        }, 0);
        return totalWords / sentences.length;
    }

    _calculateVariance(sentences) {
        if (sentences.length < 2) return 0;

        const lengths = sentences.map(s => s.split(/\s+/).filter(w => w.length > 0).length);
        const mean = lengths.reduce((a, b) => a + b) / lengths.length;
        const variance = lengths.reduce((sum, length) => sum + Math.pow(length - mean, 2), 0) / lengths.length;

        return variance;
    }

    _calculateBurstiness(sentences) {
        if (sentences.length < 2) return 1;

        const lengths = sentences.map(s => s.split(/\s+/).filter(w => w.length > 0).length);
        const mean = lengths.reduce((a, b) => a + b) / lengths.length;
        const variance = this._calculateVariance(sentences);

        if (mean === 0) return 0;
        return Math.sqrt(variance) / mean;
    }

    _estimateTypos(text) {
        // Simple typo estimation - look for repeated letters and common patterns
        const typoPatterns = [
            /(.)\1{2,}/g, // Three or more repeated characters
            /\b\w*[bcdfghjklmnpqrstvwxyz]{4,}\w*\b/gi, // Long consonant clusters
        ];

        let typoCount = 0;
        typoPatterns.forEach(pattern => {
            const matches = text.match(pattern);
            if (matches) typoCount += matches.length;
        });

        return typoCount;
    }

    _checkPerfectPunctuation(text) {
        // Check for perfect punctuation patterns
        const punctuationChecks = [
            /[.!?]\s+[A-Z]/g, // Proper capitalization after punctuation
            /,\s+/g // Proper spacing after commas
        ];

        let perfectCount = 0;
        punctuationChecks.forEach(pattern => {
            const matches = text.match(pattern);
            if (matches) perfectCount += matches.length;
        });

        const totalPunctuation = (text.match(/[.!?,]/g) || []).length;
        return totalPunctuation > 0 ? perfectCount / totalPunctuation > 0.8 : false;
    }

    /**
     * Create standardized result object
     */
    _createResult(isAI, confidence, method, description, details = {}) {
        return {
            isAI,
            confidence: Math.round(confidence * 100) / 100, // Round to 2 decimal places
            method,
            description,
            details,
            timestamp: Date.now()
        };
    }

    /**
     * Get detector statistics
     * @returns {Object} Statistics
     */
    getStats() {
        return {
            ...this.stats,
            cacheHitRate: this.cache.getHitRate(),
            cacheSize: this.cache.cache.size,
            rateLimitStatus: {
                requestsThisMinute: this.rateLimiter.requests.length,
                maxPerMinute: this.rateLimiter.maxPerMinute,
                timeUntilReset: this.rateLimiter.getTimeUntilReset()
            }
        };
    }

    /**
     * Clear cache and reset stats
     */
    reset() {
        this.cache.clear();
        this.stats = {
            totalAnalyzed: 0,
            aiDetected: 0,
            humanDetected: 0,
            apiCalls: 0,
            localDetections: 0,
            errors: 0
        };
        console.log('🧹 AIDetector reset completed');
    }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { AIDetector, RateLimiter, DetectionCache };
} else {
    // Browser environment
    window.AIDetector = AIDetector;
    window.RateLimiter = RateLimiter;
    window.DetectionCache = DetectionCache;
}

console.log('📦 aiDetector.js module loaded successfully');