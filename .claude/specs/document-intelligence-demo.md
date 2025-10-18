# Document Intelligence Platform - Demo Application Specification

**Application Name**: AI Document Intelligence Platform
**Type**: Demo Application
**Priority**: 1 (Flagship Demo)
**Status**: Planning
**Timeline**: 3-4 days
**Owner**: Demo Team

---

## 1. Executive Summary

### 1.1 Purpose
Showcase ORION platform's AI capabilities through a production-grade document analysis application that demonstrates RAG (Retrieval-Augmented Generation), semantic search, file storage, and real-time processing.

### 1.2 Key Showcases
- ✅ AI Interface Service (GPT-4, Claude, embeddings)
- ✅ Vector DB Service (semantic similarity search)
- ✅ Storage Service (S3/MinIO file management)
- ✅ Search Service (hybrid keyword + semantic search)
- ✅ Notification Service (processing alerts)
- ✅ Cache Service (AI response caching)
- ✅ Webhooks (external integrations)
- ✅ Analytics (usage tracking)

### 1.3 User Value
- Upload any document (PDF, Word, Text) and ask questions
- Get instant AI-powered summaries and insights
- Search across all documents semantically
- Export findings to CRM/tools via webhooks
- Track costs and usage

---

## 2. Features & User Journey

### 2.1 Document Upload & Processing

**User Story:**
> As a user, I want to upload documents so that AI can analyze and extract insights

**Flow:**
```
1. User drags & drops PDF file (contract, report, article)
2. File uploaded to Storage Service → S3
3. Event: document.uploaded published
4. Processing pipeline triggered:
   a. Extract text from PDF (pdf-parse library)
   b. Generate summary with GPT-4
   c. Extract entities (people, dates, amounts, companies)
   d. Create embeddings with text-embedding-3-large
   e. Store vectors in Vector DB
   f. Index for search in Search Service
5. User receives notification: "Document processed"
6. Document appears in library with summary
```

**API Calls:**
```typescript
// Upload document
POST /api/storage/files/upload
  multipart/form-data: { file: File, metadata: { title, description } }
  Response: { id: string, filename: string, url: string }

// Processing triggered automatically via event consumer
// EventConsumer listens to: document.uploaded

// Get processing status
GET /api/documents/:id/status
  Response: {
    status: 'uploading' | 'processing' | 'completed' | 'failed',
    progress: number,
    steps: {
      extraction: 'completed',
      summary: 'in_progress',
      entities: 'pending',
      embeddings: 'pending'
    }
  }
```

**UI Components:**
```tsx
<DocumentUpload>
  <Dropzone
    accept={{
      'application/pdf': ['.pdf'],
      'application/msword': ['.doc', '.docx'],
      'text/plain': ['.txt']
    }}
    maxSize={10 * 1024 * 1024} // 10MB
    onDrop={handleUpload}
  />

  {uploading && (
    <UploadProgress
      progress={uploadProgress}
      status="Uploading..."
    />
  )}

  {processing && (
    <ProcessingSteps
      steps={processingSteps}
      current={currentStep}
    />
  )}
</DocumentUpload>
```

---

### 2.2 AI-Powered Q&A (RAG)

**User Story:**
> As a user, I want to ask questions about my documents and get accurate answers

**Flow:**
```
1. User selects document or searches across all
2. User types question: "What are the payment terms?"
3. System:
   a. Converts question to embedding
   b. Searches Vector DB for relevant chunks (top 5)
   c. Retrieves original text chunks
   d. Sends to GPT-4 with context:
      - System: "Answer based only on provided context"
      - Context: [retrieved chunks]
      - Question: "What are the payment terms?"
   e. Streams response back to user
4. User sees answer with source citations
5. Response cached for 1 hour
```

**API Calls:**
```typescript
// Ask question
POST /api/documents/:id/ask
  Body: {
    question: string,
    model?: 'gpt-4' | 'gpt-3.5-turbo' | 'claude-3-5-sonnet',
    stream?: boolean
  }
  Response: {
    answer: string,
    sources: {
      chunkId: string,
      text: string,
      page: number,
      relevanceScore: number
    }[],
    model: string,
    tokensUsed: number,
    cost: number,
    cached: boolean
  }

// With streaming (SSE)
GET /api/documents/:id/ask/stream?question=...
  Stream: text/event-stream
  Events:
    data: {"type":"chunk","content":"The payment"}
    data: {"type":"chunk","content":" terms are"}
    data: {"type":"done","metadata":{...}}
```

**Implementation:**
```typescript
// services/rag.service.ts
async answerQuestion(documentId: string, question: string) {
  // 1. Check cache
  const cacheKey = `rag:${documentId}:${hashQuestion(question)}`;
  const cached = await cacheService.get(cacheKey);
  if (cached) return { ...cached, cached: true };

  // 2. Generate question embedding
  const questionEmbedding = await aiService.createEmbedding({
    model: 'text-embedding-3-large',
    input: question
  });

  // 3. Search Vector DB
  const relevantChunks = await vectorDb.search({
    vector: questionEmbedding,
    filter: { documentId },
    topK: 5,
    minSimilarity: 0.7
  });

  if (relevantChunks.length === 0) {
    return {
      answer: "I couldn't find relevant information to answer that question.",
      sources: [],
      tokensUsed: 0,
      cost: 0
    };
  }

  // 4. Build context
  const context = relevantChunks
    .map((chunk, i) => `[${i + 1}] ${chunk.text}`)
    .join('\n\n');

  // 5. Generate answer with GPT-4
  const response = await aiService.chat({
    model: 'gpt-4',
    messages: [
      {
        role: 'system',
        content: 'Answer the question based ONLY on the provided context. If the answer is not in the context, say so. Cite sources using [1], [2], etc.'
      },
      {
        role: 'user',
        content: `Context:\n${context}\n\nQuestion: ${question}`
      }
    ],
    temperature: 0.1 // Low temperature for factual answers
  });

  const result = {
    answer: response.content,
    sources: relevantChunks.map((chunk, i) => ({
      index: i + 1,
      text: chunk.text,
      page: chunk.metadata.page,
      relevanceScore: chunk.score
    })),
    model: 'gpt-4',
    tokensUsed: response.usage.total_tokens,
    cost: calculateCost(response.usage, 'gpt-4'),
    cached: false
  };

  // 6. Cache for 1 hour
  await cacheService.set(cacheKey, result, 3600);

  return result;
}
```

**UI Components:**
```tsx
<DocumentChat document={document}>
  <ChatMessages>
    {messages.map(msg => (
      <Message
        key={msg.id}
        role={msg.role}
        content={msg.content}
        sources={msg.sources}
        timestamp={msg.timestamp}
      />
    ))}

    {streaming && (
      <Message
        role="assistant"
        content={streamedContent}
        isStreaming
      />
    )}
  </ChatMessages>

  <ChatInput>
    <Textarea
      placeholder="Ask a question about this document..."
      value={question}
      onChange={setQuestion}
      onKeyDown={handleKeyDown}
    />
    <Button onClick={askQuestion} disabled={!question}>
      Ask
    </Button>
  </ChatInput>

  <ModelSelector
    value={selectedModel}
    onChange={setSelectedModel}
    options={['gpt-4', 'gpt-3.5-turbo', 'claude-3-5-sonnet']}
  />
</DocumentChat>

<SourcesPanel sources={currentSources}>
  {sources.map(source => (
    <SourceCard key={source.chunkId}>
      <SourceHeader
        page={source.page}
        relevance={source.relevanceScore}
      />
      <SourceText text={source.text} />
      <Button onClick={() => navigateToPage(source.page)}>
        View in Document
      </Button>
    </SourceCard>
  ))}
</SourcesPanel>
```

---

### 2.3 Semantic Search

**User Story:**
> As a user, I want to search across all my documents to find relevant information

**Flow:**
```
1. User enters search query: "renewable energy contracts"
2. System performs hybrid search:
   a. Keyword search in Search Service (PostgreSQL full-text)
   b. Semantic search in Vector DB (embeddings)
   c. Combines results with weighted scoring:
      - Keyword: 40%
      - Semantic: 40%
      - Recency: 10%
      - Popularity: 10%
3. Returns ranked documents and chunks
4. User can filter by type, date, author
```

**API Calls:**
```typescript
// Search documents
POST /api/search
  Body: {
    query: string,
    type: 'keyword' | 'semantic' | 'hybrid',
    filters?: {
      documentType?: string[],
      dateRange?: { from: string, to: string },
      author?: string[]
    },
    limit?: number
  }
  Response: {
    results: SearchResult[],
    totalResults: number,
    searchType: string,
    duration: number
  }

interface SearchResult {
  documentId: string;
  title: string;
  snippet: string;
  score: number;
  scoreBreakdown: {
    keyword: number,
    semantic: number,
    recency: number,
    popularity: number
  };
  metadata: {
    type: string,
    author: string,
    uploadedAt: string,
    pages: number
  };
}
```

**UI Components:**
```tsx
<SearchPage>
  <SearchBar>
    <Input
      placeholder="Search documents..."
      value={query}
      onChange={setQuery}
      onSearch={performSearch}
    />
    <Select
      value={searchType}
      options={['hybrid', 'keyword', 'semantic']}
    />
  </SearchBar>

  <SearchFilters>
    <MultiSelect
      label="Document Type"
      options={['Contract', 'Report', 'Article']}
    />
    <DateRangePicker label="Date Range" />
    <Input label="Author" />
  </SearchFilters>

  <SearchResults>
    {results.map(result => (
      <SearchResultCard key={result.documentId}>
        <ResultHeader
          title={result.title}
          score={result.score}
        />
        <ResultSnippet snippet={result.snippet} />
        <ResultMetadata metadata={result.metadata} />
        <ScoreBreakdown breakdown={result.scoreBreakdown} />
        <Button onClick={() => openDocument(result.documentId)}>
          Open Document
        </Button>
      </SearchResultCard>
    ))}
  </SearchResults>

  {totalResults > results.length && (
    <LoadMore onClick={loadMoreResults} />
  )}
</SearchPage>
```

---

### 2.4 Document Library

**User Story:**
> As a user, I want to see all my uploaded documents with summaries and metadata

**API Calls:**
```typescript
GET /api/documents?
  page=1&
  limit=20&
  sort=uploadedAt&
  order=desc&
  type=contract
  Response: {
    documents: Document[],
    total: number,
    page: number
  }

interface Document {
  id: string;
  title: string;
  filename: string;
  type: 'contract' | 'report' | 'article' | 'other';
  summary: string;
  entities: {
    people: string[],
    organizations: string[],
    dates: string[],
    amounts: string[]
  };
  metadata: {
    pages: number,
    fileSize: number,
    uploadedAt: string,
    uploadedBy: string
  };
  status: 'processing' | 'completed' | 'failed';
  thumbnail?: string;
}
```

**UI Components:**
```tsx
<DocumentLibrary>
  <LibraryHeader>
    <SearchBar />
    <ViewToggle options={['grid', 'list']} />
    <SortSelect options={['Recent', 'Title', 'Type']} />
    <Button onClick={openUploadDialog}>+ Upload</Button>
  </LibraryHeader>

  <DocumentGrid view={viewMode}>
    {documents.map(doc => (
      <DocumentCard key={doc.id}>
        {doc.thumbnail && (
          <Thumbnail src={doc.thumbnail} />
        )}
        <CardHeader>
          <Title>{doc.title}</Title>
          <Badge>{doc.type}</Badge>
        </CardHeader>
        <Summary text={doc.summary} maxLines={3} />
        <EntityTags entities={doc.entities} />
        <CardFooter>
          <Metadata>
            {doc.metadata.pages} pages • {formatBytes(doc.metadata.fileSize)}
          </Metadata>
          <Actions>
            <Button onClick={() => openDocument(doc)}>Open</Button>
            <Button onClick={() => askQuestion(doc)}>Ask</Button>
            <DropdownMenu>
              <MenuItem onClick={() => downloadDocument(doc)}>Download</MenuItem>
              <MenuItem onClick={() => shareDocument(doc)}>Share</MenuItem>
              <MenuItem onClick={() => deleteDocument(doc)}>Delete</MenuItem>
            </DropdownMenu>
          </Actions>
        </CardFooter>
      </DocumentCard>
    ))}
  </DocumentGrid>
</DocumentLibrary>
```

---

### 2.5 Cost & Usage Analytics

**User Story:**
> As a user, I want to see how much I'm spending on AI processing

**API Calls:**
```typescript
GET /api/analytics/ai-usage?period=30d
  Response: {
    totalCost: number,
    breakdown: {
      embeddings: { cost: number, requests: number },
      chat: { cost: number, requests: number, byModel: {} },
      summaries: { cost: number, requests: number }
    },
    savings: {
      cachingEnabled: number,
      modelOptimization: number
    },
    topDocuments: {
      documentId: string,
      title: string,
      cost: number,
      requests: number
    }[]
  }
```

**UI Components:**
```tsx
<UsageDashboard>
  <CostOverview>
    <MetricCard
      title="Total Cost (30 days)"
      value={`$${totalCost.toFixed(2)}`}
      trend={trend}
    />
    <MetricCard
      title="Cost Savings"
      value={`$${savings.toFixed(2)}`}
      subtitle="From caching & optimization"
    />
  </CostOverview>

  <CostBreakdownChart data={breakdown} />

  <TopDocumentsTable documents={topDocuments} />

  <SavingsTips>
    <Tip>Enable caching: Save 70-90% on repeat questions</Tip>
    <Tip>Use GPT-3.5 for simple summaries: 90% cost reduction</Tip>
    <Tip>Batch process documents: 30% savings</Tip>
  </SavingsTips>
</UsageDashboard>
```

---

### 2.6 Webhook Integrations

**User Story:**
> As a user, I want to automatically send document insights to my CRM when processing completes

**Setup Flow:**
```
1. User navigates to Settings > Integrations
2. Clicks "+ Add Webhook"
3. Enters CRM webhook URL
4. Selects events: ['document.processed', 'document.summary']
5. Configures payload template (optional)
6. Tests webhook with sample document
7. Activates webhook
```

**Webhook Payload:**
```typescript
// Event: document.processed
{
  "event": "document.processed",
  "timestamp": "2025-10-18T14:30:00Z",
  "data": {
    "documentId": "doc_abc123",
    "title": "Q3 2025 Sales Report",
    "summary": "Revenue increased 12% year-over-year...",
    "entities": {
      "people": ["John Doe", "Jane Smith"],
      "amounts": ["$1.2M", "$890K"],
      "dates": ["2025-09-30"]
    },
    "url": "https://app.orion.example.com/documents/doc_abc123",
    "downloadUrl": "https://storage.orion.example.com/files/report.pdf?signature=..."
  }
}
```

**UI Components:**
```tsx
<WebhookSettings>
  <WebhookList>
    {webhooks.map(webhook => (
      <WebhookCard key={webhook.id}>
        <WebhookHeader
          url={webhook.url}
          status={webhook.status}
        />
        <WebhookEvents events={webhook.events} />
        <WebhookStats
          deliveries={webhook.stats.totalDeliveries}
          successRate={webhook.stats.successRate}
        />
        <WebhookActions
          onTest={() => testWebhook(webhook)}
          onEdit={() => editWebhook(webhook)}
          onDisable={() => disableWebhook(webhook)}
        />
      </WebhookCard>
    ))}
  </WebhookList>

  <Button onClick={openCreateDialog}>+ Add Webhook</Button>
</WebhookSettings>
```

---

## 3. Technical Architecture

### 3.1 Frontend Stack
```typescript
{
  "framework": "React 18 + TypeScript",
  "bundler": "Vite 5",
  "ui": "shadcn/ui + Tailwind CSS",
  "state": "TanStack Query + Zustand",
  "pdf": "react-pdf",
  "charts": "Recharts",
  "deployment": "Vercel"
}
```

### 3.2 Backend Services Used
```typescript
{
  "gateway": "API Gateway (routing, auth)",
  "auth": "Auth Service (JWT tokens)",
  "storage": "Storage Service (S3 file uploads)",
  "ai": "AI Interface Service (GPT-4, embeddings)",
  "vector": "Vector DB Service (semantic search)",
  "search": "Search Service (hybrid search)",
  "notifications": "Notification Service (email alerts)",
  "cache": "Cache Service (response caching)",
  "webhooks": "Webhooks Service (integrations)",
  "analytics": "Analytics Service (usage tracking)"
}
```

### 3.3 Data Flow
```
User uploads PDF
  ↓
Storage Service (S3)
  ↓ event: document.uploaded
Document Processor (event consumer)
  ↓
Extract text (pdf-parse)
  ↓
AI Service: Generate summary (GPT-4)
  ↓
AI Service: Extract entities (GPT-4)
  ↓
AI Service: Generate embeddings (text-embedding-3-large)
  ↓
Vector DB: Store embeddings
  ↓
Search Service: Index document
  ↓
Notification: Send "Document processed" email
  ↓
Webhook: Trigger external integrations
```

---

## 4. Implementation Plan

### Phase 1: Core Upload & Processing (Day 1)
- [ ] Setup Vite React project
- [ ] Implement file upload UI
- [ ] Integrate Storage Service API
- [ ] Build document processing pipeline
- [ ] Text extraction from PDFs
- [ ] Basic document library view

### Phase 2: AI Features (Day 2)
- [ ] AI summary generation
- [ ] Entity extraction
- [ ] Generate and store embeddings
- [ ] Q&A interface (RAG)
- [ ] Streaming responses

### Phase 3: Search & Discovery (Day 3)
- [ ] Semantic search implementation
- [ ] Hybrid search UI
- [ ] Search filters and sorting
- [ ] Related documents suggestions

### Phase 4: Analytics & Webhooks (Day 4)
- [ ] Cost tracking dashboard
- [ ] Usage analytics
- [ ] Webhook configuration UI
- [ ] Integration testing
- [ ] Polish and documentation

---

## 5. Success Metrics

### 5.1 Technical
- Upload → Processing complete: <30s for 10-page PDF
- Q&A response time: <2s (with caching)
- Search results: <500ms
- 90%+ cache hit rate on repeat questions

### 5.2 Showcase
- Demonstrates 8+ ORION services
- Shows real-world AI use case
- Production-grade UX
- Cost optimization visible

---

**Status**: Ready for Implementation
**Next**: Create Git repository, setup Vite project
**Timeline**: 3-4 days
