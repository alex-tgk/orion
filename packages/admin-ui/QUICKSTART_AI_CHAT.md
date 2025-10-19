# AI Chat Quick Start Guide

## 🚀 Get Started in 3 Steps

### Step 1: Environment Setup

Create a `.env` file in `/packages/admin-ui/`:

```bash
# Copy from example
cp .env.example .env

# Or create manually with:
VITE_AI_WRAPPER_URL=http://localhost:3200
VITE_USE_AI_PROXY=false
```

### Step 2: Ensure AI Wrapper is Running

The AI wrapper service must be running on port 3200:

```bash
# Test connection
curl http://localhost:3200/ai/providers

# Expected response:
{
  "available": ["claude", "copilot", "q", "gemini", "codex"],
  "providers": [...]
}
```

If not running, start the ai-wrapper service first!

### Step 3: Start Admin UI

```bash
cd packages/admin-ui
pnpm install  # If dependencies not installed
pnpm dev
```

Visit: **http://localhost:3000/ai-chat**

## ✨ Features

### Send Your First Message

1. Click "AI Chat" in the sidebar
2. Select a provider (Claude, Copilot, Q, Gemini, or Codex)
3. Type your message
4. Press Enter (or Shift+Enter for multi-line)
5. Watch the AI respond!

### Try These Example Prompts

**Coding:**
```
Write a TypeScript function to validate email addresses with regex
```

**Debugging:**
```
Explain this error: TypeError: Cannot read property 'map' of undefined
```

**Architecture:**
```
What's the difference between microservices and monolithic architecture?
```

**Code Review:**
```
Review this code and suggest improvements:
[paste your code]
```

### Provider Comparison

Test the same question across all providers:

1. Send message to Claude
2. Click provider selector
3. Switch to Copilot
4. Send the same message
5. Compare responses!

### Markdown & Code Highlighting

AI responses support:
- **Bold** and *italic* text
- `inline code`
- Code blocks with syntax highlighting
- Lists and tables
- Links

Try asking:
```
Show me a Python function with proper docstrings
```

## 🎯 Pro Tips

### Keyboard Shortcuts
- `Enter`: Send message
- `Shift + Enter`: New line
- `Ctrl/Cmd + K`: Copy AI response (hover over message)

### Chat Management
- **New Chat**: Click "New" in history sidebar
- **Search**: Use search bar to find past conversations
- **Export**: Click download icon to save as Markdown
- **Delete**: Click trash icon to remove session

### Best Practices

1. **Be Specific**: Clear questions get better answers
2. **Use Context**: Include relevant code or details
3. **Try Multiple Providers**: Different AIs excel at different tasks
4. **Save Good Responses**: Export important conversations
5. **Check Token Usage**: Visible in message metadata

## 🧪 Test the Integration

Open browser console:

```javascript
// Quick connection test
const response = await fetch('http://localhost:3200/ai/providers');
const data = await response.json();
console.log('Available providers:', data.available);

// Send a test message
const chatResponse = await fetch('http://localhost:3200/ai/chat', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    message: 'Hello AI!',
    provider: 'claude'
  })
});
const chatData = await chatResponse.json();
console.log('AI says:', chatData.content);
```

## 🔧 Troubleshooting

### "Service not responding"
- ✅ Check ai-wrapper is running: `curl http://localhost:3200/ai/providers`
- ✅ Verify port 3200 is not blocked
- ✅ Check VITE_AI_WRAPPER_URL in .env

### "Provider offline"
- ✅ Check provider credentials in ai-wrapper config
- ✅ Click refresh icon to update provider status
- ✅ Try a different provider

### "Request timed out"
- ✅ AI requests can take 5-30 seconds
- ✅ Wait for the loading indicator
- ✅ Check ai-wrapper logs for errors

### "No chat history"
- ✅ localStorage might be cleared
- ✅ Check browser's localStorage in DevTools
- ✅ Sessions are browser-specific

## 📊 Usage Examples

### Example 1: Code Generation
```
User: Create a React hook for debouncing input

AI: Here's a custom debounce hook:

```typescript
import { useEffect, useState } from 'react';

export function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
}
```

Usage:
```typescript
const [searchTerm, setSearchTerm] = useState('');
const debouncedSearch = useDebounce(searchTerm, 500);
```
```

### Example 2: Bug Diagnosis
```
User: My React component re-renders too often. How do I debug this?

AI: Here are steps to diagnose excessive re-renders:

1. Use React DevTools Profiler
2. Add console.log in component body
3. Check for:
   - Inline object/array creation in props
   - Missing dependency arrays in hooks
   - Parent component re-renders

Example fix with useMemo:
[AI provides detailed code example with syntax highlighting]
```

### Example 3: Architecture Discussion
```
User: Should I use REST or GraphQL for my new API?

AI: Here's a comparison to help you decide:

**REST:**
- ✅ Simple, well-understood
- ✅ Great for CRUD operations
- ❌ Over-fetching/under-fetching

**GraphQL:**
- ✅ Fetch exactly what you need
- ✅ Single endpoint
- ❌ Steeper learning curve

For your use case...
[AI provides detailed recommendation]
```

## 🎨 UI Features

### Three-Column Layout
```
┌──────────────┬─────────────────┬──────────────┐
│   History    │   Active Chat   │   Providers  │
│              │                 │              │
│ • Session 1  │  User: Hello    │  Claude ✓    │
│ • Session 2  │  AI: Hi there!  │  Copilot ✓   │
│ • Session 3  │                 │  Q ✗         │
│              │  [Input box]    │  Gemini ✓    │
│              │                 │  Codex ✗     │
└──────────────┴─────────────────┴──────────────┘
```

### Mobile Responsive
- History slides out on small screens
- Provider panel collapses to dropdown
- Full-width chat on mobile

## 📱 Mobile Usage

1. Tap hamburger menu to open history
2. Tap provider chip to change AI
3. Swipe to dismiss sidebars
4. Tap and hold message to copy

## 🔐 Privacy

- **Local Storage**: All chats saved in browser only
- **No Server Storage**: Messages not persisted on backend
- **Clear Anytime**: Use "Clear All History" to delete everything
- **Provider Specific**: Each provider handles data per their policies

## 📈 What's Next?

After you're comfortable:
1. Explore provider differences
2. Try complex multi-turn conversations
3. Use for code reviews
4. Export important conversations
5. Create prompt templates

## 🆘 Need Help?

- **Documentation**: See `/packages/admin-ui/src/components/features/ai-chat/README.md`
- **Test Utilities**: Check `test-integration.ts` for debugging
- **API Details**: Review `ai.service.ts` for implementation

---

**Happy Chatting! 🤖✨**
