# CLAUDE.md - Project Development Guide

## Project: Slop-ify Chrome Extension

A Chrome extension that replaces LinkedIn post and message text with "slop slop slop".

## TaskMaster Integration with Claude Code

This project uses TaskMaster CLI for AI-powered task management, configured to work with Claude Code.

### Installation
```bash
npm install -g task-master-ai
```

### Claude Code Configuration

Create `.taskmaster/config.json` with:
```json
{
  "models": {
    "main": {
      "provider": "claude-code",
      "modelId": "sonnet",
      "maxTokens": 64000,
      "temperature": 0.2
    }
  }
}
```

Available models:
- "opus" (SWE score: 0.725)
- "sonnet" (SWE score: 0.727)

### Usage
```bash
# Parse PRD to generate tasks
task-master parse-prd --input=PRD.md

# View all tasks
task-master list

# Get next task
task-master next

# Show specific task
task-master show task-001

# Update task status
task-master set-status --id=task-001 --status=in-progress

# Analyze project complexity
task-master analyze-complexity
```

## Development Workflow

1. Use TaskMaster to parse the PRD and generate structured tasks
2. Work through tasks systematically using `task-master next`
3. Test the extension locally before packaging
4. Follow security best practices throughout development

## Key Requirements

- **Manifest V3** compliance
- **No user data collection**
- **Client-side only** (no backend)
- **MIT License**
- **Minimal permissions** (only linkedin.com)
- **MutationObserver** for dynamic content
- **textContent** over innerHTML for security

## Testing

1. Load unpacked extension in Chrome
2. Navigate to LinkedIn
3. Verify text replacement in feed and messages
4. Check console for any errors
5. Test with dynamic content (scrolling)

## Chrome Web Store Publishing

1. Create developer account
2. Package as .zip
3. Submit with privacy policy
4. Enable 2FA on developer account