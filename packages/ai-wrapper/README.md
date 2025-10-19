# AI Wrapper Service

CLI-based AI wrapper service that uses your logged-in subscriptions to enable parallel AI generation without API keys.

## Overview

This service wraps CLI tools for various AI providers, leveraging your existing logged-in sessions:
- **Claude** (via Claude Desktop/Claude Code)
- **GitHub Copilot** (via gh CLI extension)
- **Amazon Q** (via AWS CLI)

No API keys required - uses your active subscriptions!

## Architecture

```
Client Request
     ↓
AI Wrapper Service (NestJS)
     ↓
Parallel Execution Coordinator
     ├─→ Claude Wrapper → Claude Desktop CLI
     ├─→ Copilot Wrapper → gh copilot
     └─→ Amazon Q Wrapper → q chat
```

## Prerequisites

### 1. Claude
- Install [Claude Desktop](https://claude.ai/download)
- OR install [Claude Code](https://github.com/anthropics/claude-code)
- Login with your Anthropic account

### 2. GitHub Copilot
```bash
# Install GitHub CLI
brew install gh  # macOS
# or download from https://cli.github.com

# Install Copilot extension
gh extension install github/gh-copilot

# Authenticate
gh auth login
```

### 3. Amazon Q
```bash
# Install from AWS Console
# https://aws.amazon.com/q/developer/

# Login with your AWS account
q configure
```

## Installation

```bash
cd packages/ai-wrapper
pnpm install
pnpm run build
```

## Usage

### Start the Service

```bash
pnpm run dev
```

Service runs on port 3200 by default.

### API Endpoints

#### Get Available Providers
```bash
GET /ai/providers

Response:
{
  "available": ["claude", "copilot"],
  "total": 2,
  "providers": {
    "claude": true,
    "copilot": true,
    "amazonq": false
  }
}
```

#### Generate with Fallback
```bash
POST /ai/generate

Body:
{
  "prompt": "Explain quantum computing",
  "context": "For a beginner audience",
  "maxTokens": 1000
}

Response:
{
  "content": "Quantum computing is...",
  "model": "claude-3-5-sonnet",
  "provider": "claude",
  "executionTime": 2340
}
```

#### Parallel Generation
```bash
POST /ai/generate/parallel

Body:
{
  "prompts": [
    { "prompt": "Explain REST APIs" },
    { "prompt": "Explain GraphQL" }
  ],
  "providers": ["claude", "copilot"],
  "strategy": "fastest"
}

Response:
{
  "results": [...],
  "fastest": { ... },
  "totalExecutionTime": 3200
}
```

#### Simple Chat
```bash
POST /ai/chat

Body:
{
  "message": "How do I create a React component?",
  "context": "Using TypeScript"
}
```

## Integration with Document Intelligence

Update your document-intelligence-demo API service:

```typescript
// src/services/api.ts

const AI_WRAPPER_URL = 'http://localhost:3200';

export const chatApi = {
  async askQuestion(documentId: string, question: string) {
    const response = await axios.post(AI_WRAPPER_URL + '/ai/chat', {
      message: question,
      context: 'Document ID: ' + documentId
    });
    
    return {
      answer: response.data.content,
      model: response.data.model,
      provider: response.data.provider,
      tokensUsed: response.data.tokensUsed,
      cost: 0, // Free - using logged-in session
      cached: false
    };
  }
};
```

## Parallel Generation Strategies

### 1. Fastest
Returns the first successful response:
```javascript
{
  "strategy": "fastest"
}
```

### 2. All
Returns all responses from all providers:
```javascript
{
  "strategy": "all"
}
```

### 3. Consensus
Combines responses when similar, shows differences when divergent:
```javascript
{
  "strategy": "consensus"
}
```

## Use Cases

### 1. Document Q&A
```javascript
const response = await fetch('http://localhost:3200/ai/generate', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    prompt: 'What are the payment terms?',
    context: documentText
  })
});
```

### 2. Code Generation
```javascript
const response = await fetch('http://localhost:3200/ai/generate/parallel', {
  method: 'POST',
  body: JSON.stringify({
    prompts: [
      { prompt: 'Create a React component for user authentication' }
    ],
    providers: ['copilot', 'claude'],
    strategy: 'all'
  })
});
```

### 3. Content Summarization
```javascript
const response = await fetch('http://localhost:3200/ai/chat', {
  method: 'POST',
  body: JSON.stringify({
    message: 'Summarize this document',
    context: longDocument
  })
});
```

## Benefits

✅ **No API Keys Required** - Uses your existing subscriptions
✅ **Cost-Free** - Leverages logged-in sessions
✅ **Parallel Execution** - Run multiple providers simultaneously
✅ **Fallback Support** - Automatic failover if one provider fails
✅ **Provider Agnostic** - Same interface for all providers

## Limitations

- Requires CLI tools to be installed and authenticated
- Response times depend on CLI tool performance
- Some features may be limited by CLI capabilities
- Session management handled by underlying tools

## Future Enhancements

- [ ] Session cookie extraction for direct API calls
- [ ] Response caching layer
- [ ] Rate limiting per provider
- [ ] Streaming responses
- [ ] WebSocket support for real-time generation
- [ ] More providers (Gemini, Mistral, etc.)

## Troubleshooting

### "Claude CLI not available"
```bash
# Install Claude Desktop or Claude Code
# Verify with:
which claude
```

### "GitHub Copilot not available"
```bash
# Install extension:
gh extension install github/gh-copilot

# Verify:
gh copilot --version
```

### "Service not starting"
```bash
# Check port 3200 is available
lsof -i :3200

# Install dependencies
pnpm install
```

## License

MIT
