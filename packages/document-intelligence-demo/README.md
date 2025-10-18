# AI Document Intelligence Platform

A production-grade demo showcasing ORION's AI capabilities through document analysis, RAG-powered Q&A, and semantic search.

## Features

- 📄 **Document Library** - Browse documents with AI-generated summaries
- 📤 **Smart Upload** - Drag-and-drop PDF uploads with processing status
- 🤖 **AI Q&A** - Ask questions and get answers with source citations (RAG)
- 🔍 **Semantic Search** - Hybrid keyword + semantic search
- 📊 **Cost Analytics** - Track AI usage and costs with optimization tips

## Sample Documents

The demo includes 2 pre-loaded sample documents:

### 1. Q3 2025 Sales Report
**Type:** Business Report | **Pages:** 24 | **Size:** 2MB

**Summary:**
Quarterly sales report showing 12% revenue growth year-over-year. Strong performance in enterprise segment with key wins in financial services and healthcare sectors.

**Key Entities:**
- People: John Doe, Jane Smith
- Organizations: Acme Corp, TechStart Inc
- Dates: Q3 2025 (July 1 - September 30)
- Amounts: $1.2M total revenue, $890K enterprise segment

**Sample Questions to Ask:**
- "What was the total revenue in Q3?"
- "Which sectors showed the strongest growth?"
- "Who were the key stakeholders mentioned?"

### 2. SaaS Service Agreement
**Type:** Legal Contract | **Pages:** 12 | **Size:** 512KB

**Summary:**
Standard SaaS subscription agreement with 24-month term. Payment terms Net-30, automatic renewal clause included.

**Key Entities:**
- People: Robert Johnson, Sarah Lee
- Organizations: CloudServices LLC
- Dates: January 1, 2025 - January 1, 2027
- Amounts: $50,000 annual fee, $25,000 setup fee

**Sample Questions to Ask:**
- "What are the payment terms?"
- "When does the contract expire?"
- "Is there an automatic renewal clause?"

## Tech Stack

- **Frontend:** React 18 + TypeScript + Vite
- **UI:** Tailwind CSS
- **State:** TanStack Query + Zustand
- **File Upload:** React Dropzone
- **PDF Viewing:** React PDF

## ORION Services Showcased

- ✅ AI Interface Service (GPT-4, embeddings)
- ✅ Vector DB Service (semantic search)
- ✅ Storage Service (S3/MinIO)
- ✅ Search Service (hybrid search)
- ✅ Cache Service (70-90% cost savings)
- ✅ Analytics Service (usage tracking)
- ✅ Notification Service (processing alerts)
- ✅ Webhooks (external integrations)

## Local Development

```bash
# Install dependencies
pnpm install

# Start development server
pnpm dev

# Build for production
pnpm build

# Preview production build
pnpm preview
```

## Deployment

### Vercel (Recommended)

1. Install Vercel CLI:
```bash
npm i -g vercel
```

2. Deploy:
```bash
cd packages/document-intelligence-demo
vercel
```

3. Follow prompts and get your live URL!

### Environment Variables

Create `.env` file:
```env
VITE_API_URL=https://api.yourbackend.com
```

## Demo Flow

1. **Library Page** - See 2 pre-loaded sample documents
2. **Click "Ask AI"** - Open Q&A chat modal
3. **Ask Questions** - Try sample questions or your own
4. **View Sources** - See which document sections answered your question
5. **Search** - Try semantic search across all documents
6. **Upload** - Drag and drop your own PDF (mock upload)
7. **Analytics** - View cost tracking and optimization tips

## Mock Data vs. Real Backend

**Current:** Using mock data for demonstration
**Production:** Connect to real ORION backend services:
- Storage Service for file uploads
- AI Interface for GPT-4 and embeddings
- Vector DB for semantic search
- Cache Service for response caching

## Performance

- Build size: 339KB (108KB gzipped)
- First load: <2s
- Q&A response: ~1.5s (simulated)
- Search: ~400ms (simulated)

## License

MIT

---

**Powered by ORION Microservices Platform**
