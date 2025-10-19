# AI Chat Interface

A production-quality AI chat interface that connects to the REAL ai-wrapper service with support for all 5 AI providers.

## Features

- **Real AI Integration**: Connects to ai-wrapper service (no mocks!)
- **5 AI Providers**: Claude, GitHub Copilot, Amazon Q, Google Gemini, OpenAI Codex
- **Rich Message Display**: Markdown rendering with syntax highlighting
- **Chat History**: Persistent storage in localStorage
- **Provider Switching**: Easy provider selection with online/offline indicators
- **Export**: Export conversations as Markdown
- **Search**: Search through chat history
- **Responsive Design**: Three-column layout that collapses on mobile

## Components

### ChatInterface
Main chat UI component with message list and input area.

**Props:**
- `session`: Current chat session
- `isLoading`: Loading state during AI generation
- `onSendMessage`: Callback when user sends a message

### ChatMessage
Individual message bubble with markdown and syntax highlighting.

**Features:**
- User messages (right-aligned, blue)
- AI messages (left-aligned, gray)
- Code syntax highlighting (react-syntax-highlighter)
- Copy button for AI messages
- Markdown rendering (react-markdown)
- Provider badge
- Timestamp

### ChatInput
Auto-resizing textarea with send button.

**Features:**
- Auto-resize based on content
- Character counter (10,000 max)
- Enter to send, Shift+Enter for newline
- Loading state during AI generation

### ProviderSelector
Dropdown to select AI provider.

**Features:**
- Shows all 5 providers
- Online/offline status indicators
- Provider grid view
- Warning for offline providers

### ChatHistory
Sidebar showing past chat sessions.

**Features:**
- List of all chat sessions
- Search functionality
- Export as Markdown
- Delete sessions
- Clear all history

## Usage

```typescript
import { AIChat } from '@/pages/AIChat';

// Add to router
<Route path="/ai-chat" element={<AIChat />} />
```

## API Integration

### Service Configuration

The AI service connects to:
- **Direct**: `http://localhost:3200/ai/*`
- **Proxy**: `http://localhost:3004/api/ai/*` (optional)

Configure via environment variables:
```env
VITE_AI_WRAPPER_URL=http://localhost:3200
VITE_USE_AI_PROXY=false
```

### API Endpoints

#### List Providers
```typescript
GET /ai/providers

Response:
{
  available: ['claude', 'copilot'],
  providers: [
    {
      id: 'claude',
      name: 'Claude (Anthropic)',
      available: true,
      status: 'online',
      models: ['claude-3-opus-20240229']
    }
  ]
}
```

#### Send Chat Message
```typescript
POST /ai/chat

Request:
{
  message: 'Hello AI!',
  provider: 'claude'
}

Response:
{
  content: 'Hello! How can I help?',
  provider: 'claude',
  model: 'claude-3-opus-20240229',
  tokens: {
    prompt: 10,
    completion: 15,
    total: 25
  }
}
```

## Storage

### localStorage Schema

**Chat Sessions:**
```typescript
Key: 'ai-chat-sessions'
Value: ChatSession[]

interface ChatSession {
  id: string;
  title: string;
  messages: AIMessage[];
  provider: AIProvider;
  createdAt: number;
  updatedAt: number;
}
```

**Active Session:**
```typescript
Key: 'ai-active-session'
Value: string (session ID)
```

## Custom Hook

### useAIChat

Main hook for AI chat functionality.

```typescript
const {
  sessions,              // All chat sessions
  activeSession,         // Current active session
  activeSessionId,       // ID of active session
  setActiveSessionId,    // Set active session
  createSession,         // Create new session
  deleteSession,         // Delete a session
  clearAllSessions,      // Clear all history
  sendMessage,           // Send message to AI
  isLoading,            // Loading state
  error,                // Error state
  providers,            // All providers info
  availableProviders,   // Online providers
  refetchProviders,     // Refresh provider status
} = useAIChat();
```

## Dependencies

- `react-markdown` - Markdown rendering
- `react-syntax-highlighter` - Code syntax highlighting
- `remark-gfm` - GitHub Flavored Markdown
- `rehype-raw` - HTML in markdown
- `socket.io-client` - WebSocket (for streaming, optional)
- `@tanstack/react-query` - Data fetching
- `@tremor/react` - UI components
- `lucide-react` - Icons

## Testing

### Test Real AI Connection

```typescript
import { testConnection } from '@/services/ai.service';

const { connected, providers } = await testConnection();
console.log('Connected:', connected);
console.log('Available providers:', providers);
```

### Test Chat

```typescript
import { sendChat } from '@/services/ai.service';

const response = await sendChat({
  message: 'Write a hello world in Python',
  provider: 'claude'
});
console.log('AI response:', response.content);
```

## Error Handling

The service includes comprehensive error handling:
- Network timeouts (30s)
- Connection errors
- Provider unavailability
- Invalid responses
- Fallback to offline state

## Architecture

```
pages/
  AIChat.tsx              # Main page with 3-column layout

components/features/ai-chat/
  ChatInterface.tsx       # Main chat UI
  ChatMessage.tsx         # Message bubble
  ChatInput.tsx           # Input area
  ChatHistory.tsx         # History sidebar
  ProviderSelector.tsx    # Provider dropdown

hooks/
  useAIChat.ts            # Chat logic & state

services/
  ai.service.ts           # API client (REAL HTTP)

types/
  ai.ts                   # TypeScript types
```

## Best Practices

1. **No Mocks**: Always use real AI integration
2. **Error Handling**: Display clear error messages to users
3. **Loading States**: Show loading indicators during AI generation
4. **Persistence**: Save chat history in localStorage
5. **Provider Status**: Check provider availability before sending
6. **Timeout Handling**: AI can take 5-10s, handle gracefully
7. **Markdown Safety**: Sanitize markdown content
8. **Code Highlighting**: Use appropriate language detection

## Future Enhancements

- [ ] Streaming responses (SSE or WebSocket)
- [ ] File uploads for context
- [ ] Conversation threads
- [ ] Model selection per provider
- [ ] Custom system prompts
- [ ] Rate limiting indicators
- [ ] Token usage analytics
- [ ] Dark mode optimization
- [ ] Keyboard shortcuts
- [ ] Voice input

## License

Part of ORION microservices platform.
