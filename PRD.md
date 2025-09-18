# Product Requirements Document (PRD) - "AuthentiLink" AI Detector

**Version**: 2.1 (Enhanced with Resilience, User Experience, and Compliance)
**Project**: A Chrome extension to detect AI-generated content on LinkedIn.

## 1. Vision & Mission

**Vision**: To empower LinkedIn users with the tools to critically assess the authenticity of the content they consume, fostering a more transparent and genuine professional ecosystem.

**Mission**: To develop a secure, user-centric Chrome extension that accurately identifies and visually flags potentially AI-generated text across LinkedIn, including posts, comments, and profiles, while prioritizing user privacy and control.

## 2. Core Features & Functionality

### 2.1. Feature: Comprehensive Text Extraction Engine

**Target Content Areas**: Posts, comments, profile summaries, articles, shared content captions.

**Selector Resilience**: The extension will not rely on a single CSS selector. For each content type, it will use a prioritized array of fallback selectors. If the primary selector fails to find content, the system will automatically try the secondary and tertiary selectors, ensuring higher resilience against LinkedIn UI updates.

**Dynamic Content Handling**: Utilizes MutationObserver to process new content loaded by scrolling or navigation.

### 2.2. Feature: AI-Generated Content Detection Module

**Primary Detection Method**: Integration with a professional-grade AI detection API (e.g., GPTZero).

**API Key Management**: User provides their own API key, stored securely in chrome.storage.local.

**API Call Throttling**: To prevent hitting API provider rate limits and manage costs, the extension will implement a client-side request queue. It will throttle outgoing API calls to a configurable maximum (e.g., 1 call per 1-2 seconds), ensuring a smooth flow even during rapid scrolling.

**Robust Error Handling**: The system will gracefully handle API failures (e.g., invalid key, network timeout, provider outage). The UI will clearly communicate the error state to the user (e.g., a red badge with an exclamation mark) with a tooltip explaining the issue ("Invalid API Key" or "API Unreachable").

**Data Caching**: To minimize redundant API calls, detection results are cached.

### 2.3. Feature: Intuitive User Interface (UI) for Detection Results

**Visual Indicators**: Subtle highlighting and unobtrusive badges next to analyzed content.

**Confidence Scores & Tooltips**: Hovering over a badge reveals the AI probability score and any error messages.

### 2.4. Feature: User Onboarding & Control Panel

**First-Time Onboarding Flow**: Upon first installation, the extension will open a setup page. This wizard will:
- Briefly explain the extension's purpose
- Emphasize the need for a user-provided API key
- Provide direct links to supported AI detection services to get a key
- Guide the user to the settings page to input their key

**Popup Settings Panel**:
- Secure field for API key management
- Sensitivity threshold slider
- Enable/disable toggles for different content types

**Whitelist/Blacklist Functionality**: Right-click context menu to trust specific authors or ignore posts.

### 2.5. Feature: Statistics Dashboard & Data Export

**Dashboard**: Within the popup UI, a "Statistics" tab will show users aggregate data, including:
- Total posts/comments analyzed
- Number of items flagged as likely AI-generated
- Average AI probability across all flagged content

**Export Functionality**: A button on the dashboard will allow users to export a list of all flagged content as a CSV file. The export will include the flagged text, the AI probability score, and a link to the original LinkedIn content (if possible).

## 3. Technical Architecture & Specifications

This project's complexity necessitates a multi-part architecture. No backend or database (e.g., Supabase, Next.js) is required, but the extension itself will be more complex than a single script.

### 3.1. Architecture Components:

**Architecture**: manifest.json, Content Script (content.js), Background Service Worker (background.js), Popup UI (popup.html, popup.js).

**Permissions**: storage (for settings/cache), contextMenus (for whitelist/blacklist), host_permissions (for the chosen AI API's domain).

### 3.2. CSS Selectors:

Defined in a configuration object as arrays for resilience:
- **POST_SELECTORS**: ['.primary-post-selector', '.secondary-post-fallback']

**Performance Monitoring**: (Developer-facing) An optional "debug mode" will use performance.now() to log the execution time of critical functions to the browser console, helping to identify and mitigate performance bottlenecks on page load and interaction.

### 3.3. Addressing Anti-Scraping Measures:

**Client-Side Nature**: As an extension running in the user's browser, it avoids IP-based rate limiting that affects server-side scrapers.

**DOM Instability**: The primary threat is LinkedIn changing its class names. The extension's code must be structured so that these CSS selectors are defined in a single, easily updatable configuration section. The README.md must document this as the most likely point of failure and maintenance.

## 4. Security, Privacy, and Compliance

**No User Data Collection**: The extension will not collect, store, or transmit any user data to the developers.

**Third-Party Data Transmission**: Privacy policy will clearly state that text snippets are sent to the user's configured third-party AI detection service.

**API Key Security**: API keys are stored in chrome.storage.local and are only accessible by the background service worker.

**Data Retention Policy**: Cached detection results stored in chrome.storage.local will have a defined expiration policy of 24 hours. A timestamp will be stored with each result, and any results older than 24 hours will be purged or re-analyzed upon next view.

## 5. Legal & User Responsibility

**Terms of Service**: A clear, concise ToS will be accessible from the extension's settings and web store page. This document will explicitly state that:
- The user is solely responsible for all costs incurred through the use of their personal API key
- The user must comply with the terms of service of their chosen API provider
- The extension developers provide the tool "as-is" and are not liable for any API charges or service disruptions

## 6. Deployment & Open Source Plan

**Repository**: The project will be hosted publicly on GitHub.

**License**: MIT License.

**Documentation**: The README.md will be comprehensive, detailing the architecture, the need for API keys, how to update CSS selectors, and a clear contribution guide.

**Chrome Web Store**:
- The extension will be packaged and submitted for review
- The store listing's description and privacy policy section must be transparent about the API integration and data handling
- The developer is responsible for the one-time $5 registration fee

## 7. Project Structure

```
AuthentiLink/
├── manifest.json
├── content.js
├── background.js
├── popup.html
├── popup.js
├── popup.css
├── styles.css
├── icons/
│   ├── icon16.png
│   ├── icon48.png
│   └── icon128.png
├── LICENSE
└── README.md
```

## 8. Implementation Tasks

1. **Create Manifest V3 Configuration** with proper permissions and architecture
2. **Implement Onboarding Flow** and setup wizard
3. **Build Text Extraction Engine** with fallback selectors
4. **Implement API Throttling and Error Handling**
5. **Create Background Service Worker** with secure API communication
6. **Design Statistics Dashboard** with data export functionality
7. **Implement Visual Indicators** with comprehensive error states
8. **Add Caching System** with 24-hour expiration policy
9. **Create User Controls** and context menu functionality
10. **Implement Performance Monitoring** and debug mode
11. **Create Terms of Service** and legal compliance documentation
12. **Add Comprehensive Testing** and deployment preparation