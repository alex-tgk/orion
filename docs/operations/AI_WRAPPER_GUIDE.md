# 🚀 AI Wrapper Service - Complete Guide

## Overview

The AI Wrapper Service enables you to use your existing AI subscriptions (Claude, GitHub Copilot, Amazon Q) through a unified REST API **without any API keys**. It wraps CLI tools and enables parallel generation across multiple providers.

## 🎯 Key Benefits

✅ **No API Keys Required** - Uses your logged-in CLI sessions  
✅ **Zero Additional Cost** - Leverages existing subscriptions  
✅ **Parallel Execution** - Run multiple AI providers simultaneously  
✅ **Automatic Fallback** - If one provider fails, try the next  
✅ **Unified Interface** - Same API for all providers  

---

## 📦 Installation & Setup

### Prerequisites

You need at least ONE of these CLI tools installed:

#### 1. Claude (Recommended)
```bash
# Option A: Install Claude Desktop
# Download from: https://claude.ai/download

# Option B: Install Claude Code
npm install -g claude-code
# Login via the app
```

#### 2. GitHub Copilot
```bash
# Install GitHub CLI
brew install gh  # macOS
# or: https://cli.github.com

# Install Copilot extension
gh extension install github/gh-copilot

# Login
gh auth login
```

#### 3. Amazon Q
```bash
# Download from AWS Console
# https://aws.amazon.com/q/developer/

# Configure
q configure
```

### Install AI Wrapper Service

```bash
cd packages/ai-wrapper
pnpm install
```

---

## 🚀 Quick Start

### 1. Start the AI Wrapper Service

```bash
cd packages/ai-wrapper
pnpm run dev
```

Service starts on **http://localhost:3200**

### 2. Check Available Providers

```bash
curl http://localhost:3200/ai/providers
```

Response:
```json
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

### 3. Generate with Your AI

```bash
curl -X POST http://localhost:3200/ai/chat \
  -H "Content-Type: application/json" \
  -d '{
    "message": "Explain quantum computing in simple terms",
    "context": "For a beginner audience"
  }'
```

---

## 🔌 Use with Document Intelligence Demo

### Enable Real AI

Create `.env` file in `packages/document-intelligence-demo/`:

```env
VITE_AI_WRAPPER_URL=http://localhost:3200
VITE_USE_REAL_AI=true
```

### Start Both Services

Terminal 1 (AI Wrapper):
```bash
cd packages/ai-wrapper
pnpm run dev
```

Terminal 2 (Document Intelligence):
```bash
cd packages/document-intelligence-demo
pnpm dev
```

Open **http://localhost:3001** and ask questions - they'll be answered by REAL AI using your Claude subscription!

---

## 📡 API Reference

### GET /ai/providers
List available AI providers based on installed CLI tools.

**Response:**
```json
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

### POST /ai/generate
Generate with automatic fallback (tries providers in order).

**Request:**
```json
{
  "prompt": "Write a React component",
  "context": "Using TypeScript and hooks",
  "maxTokens": 1000,
  "temperature": 0.7
}
```

**Response:**
```json
{
  "content": "Here's a React component...",
  "model": "claude-3-5-sonnet",
  "provider": "claude",
  "executionTime": 2340,
  "tokensUsed": 450
}
```

### POST /ai/generate/parallel
Run multiple providers in parallel.

**Request:**
```json
{
  "prompts": [
    { "prompt": "Explain REST APIs" },
    { "prompt": "Explain GraphQL" }
  ],
  "providers": ["claude", "copilot"],
  "strategy": "fastest"
}
```

**Strategies:**
- `fastest` - Return first successful response
- `all` - Return all responses
- `consensus` - Combine similar, show differences

**Response:**
```json
{
  "results": [...],
  "fastest": { "content": "...", "provider": "claude", "executionTime": 1200 },
  "totalExecutionTime": 3400
}
```

### POST /ai/chat
Simple chat interface.

**Request:**
```json
{
  "message": "How do I use async/await?",
  "context": "In JavaScript"
}
```

---

## 💡 Use Cases

### 1. Document Q&A
```javascript
const response = await fetch('http://localhost:3200/ai/chat', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    message: 'What are the payment terms?',
    context: documentContent
  })
});
```

### 2. Code Generation
```javascript
const response = await fetch('http://localhost:3200/ai/generate', {
  method: 'POST',
  body: JSON.stringify({
    prompt: 'Create a TypeScript interface for a user profile',
    context: 'Include name, email, and avatar'
  })
});
```

### 3. Parallel Code Review
```javascript
const response = await fetch('http://localhost:3200/ai/generate/parallel', {
  method: 'POST',
  body: JSON.stringify({
    prompts: [
      { prompt: 'Review this code for bugs', context: codeSnippet }
    ],
    providers: ['claude', 'copilot'],
    strategy: 'consensus'
  })
});
```

### 4. Multi-Model Comparison
```javascript
const response = await fetch('http://localhost:3200/ai/generate/parallel', {
  method: 'POST',
  body: JSON.stringify({
    prompts: [
      { prompt: 'Design a database schema for an e-commerce site' }
    ],
    providers: ['claude', 'copilot', 'amazonq'],
    strategy: 'all'
  })
});

// Compare responses from all providers
response.results.forEach(result => {
  console.log(`${result.provider}: ${result.content}`);
});
```

---

## 🔧 How It Works

```
1. Your Request
     ↓
2. AI Wrapper Service (NestJS)
     ↓
3. Provider Selection
     ├─→ Claude Wrapper
     │     ↓
     │   Executes: claude --prompt "..."
     │     ↓
     │   Uses your Claude Desktop session
     │
     ├─→ Copilot Wrapper
     │     ↓
     │   Executes: gh copilot suggest "..."
     │     ↓
     │   Uses your GitHub authentication
     │
     └─→ Amazon Q Wrapper
           ↓
         Executes: q chat --message "..."
           ↓
         Uses your AWS session
     ↓
4. Response (NO API KEYS, NO COSTS!)
```

---

## 🎛️ Configuration

### Environment Variables

`packages/ai-wrapper/.env`:
```env
PORT=3200
NODE_ENV=development
```

`packages/document-intelligence-demo/.env`:
```env
VITE_AI_WRAPPER_URL=http://localhost:3200
VITE_USE_REAL_AI=true
```

### Production Deployment

```bash
# Build
cd packages/ai-wrapper
pnpm run build

# Start
pnpm start
```

Or use PM2:
```bash
pm2 start dist/main.js --name ai-wrapper
```

---

## 🐛 Troubleshooting

### "No AI providers available"
**Solution:** Install at least one CLI tool:
```bash
# Check what's available
which claude  # Claude
which gh      # GitHub Copilot
which q       # Amazon Q
```

### "Claude CLI not available"
**Solution:** Verify Claude Desktop is installed and you're logged in, OR install Claude Code CLI.

### "GitHub Copilot failed"
**Solution:**
```bash
gh extension install github/gh-copilot
gh auth login
gh copilot --version
```

### Port 3200 already in use
**Solution:**
```bash
# Change port
PORT=3201 pnpm run dev
```

---

## 📊 Performance

**Typical Response Times:**
- Claude Desktop: 1-3 seconds
- GitHub Copilot: 2-4 seconds
- Amazon Q: 1-3 seconds

**Parallel Execution:**
- 2 providers: ~2-3 seconds (fastest wins)
- 3 providers: ~3-4 seconds (fastest wins)

**Cost:** $0 (uses your existing subscriptions!)

---

## 🔮 Future Enhancements

- [ ] Session cookie extraction for direct API calls
- [ ] Response caching layer (Redis)
- [ ] Rate limiting per provider
- [ ] Streaming responses (SSE)
- [ ] WebSocket support
- [ ] More providers (Gemini, Mistral, Llama)
- [ ] Load balancing across instances
- [ ] Response quality scoring

---

## 📝 License

MIT

---

**Questions?** Check the [main README](packages/ai-wrapper/README.md)
