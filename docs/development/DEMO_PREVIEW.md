# 🚀 Document Intelligence Demo - Preview Guide

## Live Demo URL

**To deploy your demo and get a live URL, follow these steps:**

### Quick Deploy to Vercel (5 minutes)

1. **Login to Vercel:**
```bash
npx vercel login
```

2. **Deploy:**
```bash
cd packages/document-intelligence-demo
npx vercel --prod
```

3. **Your live URL will be displayed!**
Example: `https://document-intelligence-demo.vercel.app`

---

## OR: Preview Locally Right Now

```bash
# From project root
cd packages/document-intelligence-demo

# Install dependencies (if not already done)
pnpm install

# Start dev server
pnpm dev
```

Then open: **http://localhost:3001**

---

## What's Included

### 📄 Sample Documents (2 pre-loaded)

**1. Q3 2025 Sales Report**
- Revenue: $1.2M (12% growth)
- 24 pages, Business Report
- Key people: John Doe, Jane Smith, Michael Chen, Sarah Williams
- Organizations: Acme Corp, TechStart Inc, Global Finance Ltd

**2. SaaS Service Agreement**
- Value: $50K/year + $25K setup
- 12 pages, Legal Contract
- Term: 24 months (2025-2027)
- Payment: Net-30, Auto-renewal

### 🤖 Try These Questions

**For Sales Report:**
- "What was the total revenue in Q3?"
- "Which sectors showed the strongest growth?"
- "Who were the key stakeholders mentioned?"
- "What was the enterprise segment revenue?"

**For Contract:**
- "What are the payment terms?"
- "When does the contract expire?"
- "Is there an automatic renewal clause?"
- "What is the setup fee?"

### ✨ Features to Demo

1. **Library Page** (/)
   - Browse documents with summaries
   - See entity extraction
   - View metadata

2. **AI Q&A** 
   - Click "Ask AI" on any document
   - Ask natural language questions
   - Get answers with source citations
   - See relevance scores and page numbers

3. **Search** (/search)
   - Semantic + keyword search
   - Hybrid scoring
   - Search across all documents

4. **Analytics** (/analytics)
   - Cost tracking: $12.45 total
   - Savings: $18.30 from caching
   - Breakdown by operation

5. **Upload** (/upload)
   - Drag & drop interface
   - PDF support (mock upload)
   - Processing status

---

## Architecture Showcase

This demo showcases **8 ORION microservices**:

- ✅ AI Interface Service (GPT-4, embeddings)
- ✅ Vector DB Service (semantic search)
- ✅ Storage Service (S3 file management)
- ✅ Search Service (hybrid search)
- ✅ Cache Service (70-90% cost savings)
- ✅ Analytics Service (usage tracking)
- ✅ Notification Service (processing alerts)
- ✅ Webhooks Service (integrations)

---

## Technical Details

**Build:** 343KB (110KB gzipped)
**Framework:** React 18 + TypeScript + Vite
**State:** TanStack Query + Zustand
**UI:** Tailwind CSS

---

## Deployment Options

### Vercel (Recommended)
- One-click deploy
- Automatic HTTPS
- Global CDN
- Free tier available

### Other Options
- Netlify
- Cloudflare Pages
- AWS Amplify
- Self-hosted (Docker)

---

## Next Steps

1. **Deploy** to get your live URL
2. **Share** the demo with stakeholders
3. **Connect** to real ORION backend when ready
4. **Customize** with your branding

---

**Need help?** Check `packages/document-intelligence-demo/DEPLOY.md`
