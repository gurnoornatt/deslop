# Slop-ify 🗂️

[![MIT License](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Version](https://img.shields.io/badge/version-1.0.0-blue.svg)](https://github.com/gurnoornatt/deslop/releases)
[![Manifest](https://img.shields.io/badge/manifest-v3-green.svg)](https://developer.chrome.com/docs/extensions/mv3/intro/)
[![Chrome Extension](https://img.shields.io/badge/Chrome-Extension-orange.svg)](https://chrome.google.com/webstore/)

A Chrome extension that replaces LinkedIn text with "slop slop slop" - featuring AI detection, user controls, and complete privacy protection.

## 📖 Overview

Slop-ify is a lightweight, privacy-focused Chrome extension designed to help users reduce information overload on LinkedIn. It offers smart AI detection to target only AI-generated content, or can replace all text for complete digital wellness. Perfect for maintaining professional network access while avoiding doom-scrolling.

### ✨ Key Features

- **🧠 Smart AI Detection**: Optionally target only AI-generated content using local pattern analysis
- **🎛️ Complete User Control**: Enable/disable extension with easy toggle controls
- **📊 Slop Meter**: Track how many words you've "slopped"
- **🔄 Real-time Processing**: Instantly processes content as you scroll
- **🔒 Privacy-First**: Zero data collection, all processing happens locally
- **⚡ Lightweight**: Minimal resource usage with efficient algorithms
- **🛠️ Professional UI**: Clean popup interface with intuitive controls

## 📥 Installation

### Chrome Web Store (Recommended)

1. Visit the [Chrome Web Store](https://chrome.google.com/webstore/) (coming soon)
2. Search for "Slop-ify"
3. Click "Add to Chrome"
4. Confirm installation by clicking "Add extension"

### Manual Installation (Developer)

1. **Clone the repository**
   ```bash
   git clone https://github.com/gurnoornatt/deslop.git
   cd deslop
   ```

2. **Open Chrome Extensions**
   - Navigate to `chrome://extensions/`
   - Enable "Developer mode" (top right toggle)

3. **Load the extension**
   - Click "Load unpacked"
   - Select the project directory
   - The extension icon should appear in your Chrome toolbar

## 🚀 Usage

### Quick Start

1. **Navigate to LinkedIn**: Visit [linkedin.com](https://linkedin.com)
2. **Extension Auto-Activates**: Text replacement begins immediately
3. **Use Popup Controls**: Click the extension icon for additional options

### Extension Controls

Click the Slop-ify icon in your Chrome toolbar to access:

- **Enable Slop-ify**: Master on/off toggle for the entire extension
- **AI Detection Only**: Toggle between targeting AI content vs all text
- **AI Confidence Threshold**: Adjust sensitivity (50-90%) for AI detection
- **🥄 Slop Meter**: View total words replaced
- **Test Extension**: Verify functionality on current page
- **Rescan Page**: Manually trigger content replacement

### What Gets Replaced

The extension targets:
- ✅ LinkedIn feed posts
- ✅ Message conversations
- ✅ Comment sections
- ✅ Article content
- ✅ Profile descriptions
- ✅ Company updates

## 🏗️ Technical Architecture

### Core Components

| Component | Purpose | Technology |
|-----------|---------|------------|
| `manifest.json` | Extension configuration | Manifest V3 |
| `content.js` | Main replacement logic | JavaScript |
| `background.js` | Service worker | JavaScript |
| `popup.html/js` | User interface | HTML/CSS/JS |

### Key Features

```javascript
// MutationObserver for dynamic content
const observer = new MutationObserver((mutations) => {
    mutations.forEach((mutation) => {
        if (mutation.type === 'childList') {
            replaceTextInNewNodes(mutation.addedNodes);
        }
    });
});
```

### Security & Privacy

- **🔐 No External Requests**: All processing happens locally
- **🛡️ CSP Compliant**: Strict Content Security Policy
- **🚫 No Data Collection**: Zero user data storage or transmission
- **🎯 Minimal Permissions**: Only `linkedin.com` access required

## 🧪 Testing

### Automated Tests

Run the comprehensive test suite:

```bash
# Test core functionality
node test-extension.js

# Test error handling
node test-error-handling.js

# Test icon rendering
node test-icons.js

# Visual DPI testing
open test-dpi-display.html
```

### Manual Testing Checklist

- [ ] Extension loads without errors
- [ ] Text replacement works on LinkedIn feed
- [ ] Dynamic content (scrolling) is handled
- [ ] Popup interface functions correctly
- [ ] No console errors or warnings
- [ ] Performance remains optimal

### Browser Compatibility

| Browser | Support | Notes |
|---------|---------|--------|
| Chrome 88+ | ✅ Full | Primary target |
| Edge 88+ | ✅ Full | Chromium-based |
| Firefox | ❌ No | Manifest V3 only |
| Safari | ❌ No | Chrome extensions only |

## 🛠️ Development

### Prerequisites

- Chrome 88+ or Edge 88+
- Basic knowledge of JavaScript
- Familiarity with Chrome Extension APIs

### Development Setup

1. **Fork the repository**
2. **Make your changes**
3. **Test thoroughly** using provided test files
4. **Ensure code quality**:
   ```bash
   # No specific linting configured yet
   # Follow existing code style
   ```

### Project Structure

```
deslop/
├── icons/              # Extension icons (16, 32, 48, 128px)
├── .playwright-mcp/    # Test screenshots and results
├── .taskmaster/        # Project management files
├── manifest.json       # Extension configuration
├── content.js          # Main content script
├── background.js       # Service worker
├── popup.html          # Extension popup UI
├── popup.js            # Popup functionality
├── test-*.js          # Test suites
├── LICENSE            # MIT License
└── README.md          # This file
```

## 🤝 Contributing

We welcome contributions! Please follow these guidelines:

### How to Contribute

1. **Fork the repository**
2. **Create a feature branch**: `git checkout -b feature/amazing-feature`
3. **Make your changes** following the existing code style
4. **Test thoroughly** with real LinkedIn data
5. **Commit your changes**: `git commit -m 'Add amazing feature'`
6. **Push to the branch**: `git push origin feature/amazing-feature`
7. **Open a Pull Request**

### Contribution Guidelines

- Write clear, concise commit messages
- Include tests for new functionality
- Ensure backward compatibility
- Follow security best practices
- Test on real LinkedIn pages (no mocks)

### Code Style

- Use meaningful variable names
- Comment complex logic
- Follow existing patterns
- Prefer readability over cleverness

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 📞 Support

- **Issues**: [GitHub Issues](https://github.com/gurnoornatt/deslop/issues)
- **Discussions**: [GitHub Discussions](https://github.com/gurnoornatt/deslop/discussions)
- **Email**: Contact through GitHub profile

## 🙏 Acknowledgments

- LinkedIn for providing the platform
- Chrome Extensions documentation team
- Open source community for inspiration
- TaskMaster CLI for project management

---

**Made with ❤️ for a more mindful LinkedIn experience**

*Slop-ify v1.0.0 - Manifest V3 - Privacy-First*