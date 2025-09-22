# Slop-ify

[![MIT License](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Version](https://img.shields.io/badge/version-1.0.0-blue.svg)](https://github.com/gurnoornatt/deslop)
[![Manifest V3](https://img.shields.io/badge/manifest-v3-green.svg)](https://developer.chrome.com/docs/extensions/mv3/intro/)

A Chrome extension that replaces LinkedIn text with "slop slop slop" for a more mindful browsing experience.

## Overview

Slop-ify is a privacy-focused Chrome extension that helps reduce information overload on LinkedIn by replacing text content. Use it to maintain access to your professional network while avoiding endless scrolling.

## Features

- **Simple Toggle**: Enable/disable with one click
- **Smart Detection**: Optional AI content targeting using local analysis
- **Word Counter**: Track replaced text with the "Slop Meter"
- **Real-time**: Works as you scroll through LinkedIn
- **Privacy-First**: Zero data collection, all processing happens locally
- **Lightweight**: Minimal resource usage

## Installation

### Chrome Web Store
*Coming soon*

### Manual Installation

1. Download or clone this repository
2. Open Chrome and go to `chrome://extensions/`
3. Enable "Developer mode" (top right toggle)
4. Click "Load unpacked" and select the project folder
5. The Slop-ify icon will appear in your Chrome toolbar

## Usage

1. Visit [LinkedIn](https://linkedin.com)
2. Click the Slop-ify extension icon
3. Toggle the extension on/off as needed
4. View your "Slop Meter" to see words replaced

The extension replaces text in LinkedIn posts, messages, comments, and profiles.

## Technical Details

**Files:**
- `manifest.json` - Extension configuration (Manifest V3)
- `content.js` - Main text replacement logic
- `background.js` - Service worker
- `popup.html/js` - User interface
- `aiDetector.js` - AI content detection

**Privacy & Security:**
- No external requests - all processing is local
- No data collection or transmission
- Minimal permissions (linkedin.com only)
- Content Security Policy compliant

## Browser Support

- ✅ Chrome 88+
- ✅ Edge 88+ (Chromium-based)
- ❌ Firefox (Manifest V3 extensions only)
- ❌ Safari (Chrome extensions only)

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test on real LinkedIn pages
5. Submit a pull request

## License

MIT License - see [LICENSE](LICENSE) file for details.

## Support

- [Issues](https://github.com/gurnoornatt/deslop/issues)
- [Discussions](https://github.com/gurnoornatt/deslop/discussions)