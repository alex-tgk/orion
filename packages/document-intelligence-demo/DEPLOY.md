# Deployment Guide - Document Intelligence Demo

## Quick Deploy to Vercel (Recommended)

### Option 1: One-Click Deploy

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/alex-tgk/orion/tree/main/packages/document-intelligence-demo)

### Option 2: Deploy via CLI

1. Install Vercel CLI:
```bash
npm install -g vercel
```

2. Login to Vercel:
```bash
vercel login
```

3. Navigate to the demo directory:
```bash
cd packages/document-intelligence-demo
```

4. Deploy to production:
```bash
vercel --prod
```

Your demo will be live at: `https://your-project.vercel.app`

### Option 3: Deploy via GitHub Integration

1. Go to [Vercel](https://vercel.com)
2. Click "Add New Project"
3. Import your GitHub repository
4. Select `packages/document-intelligence-demo` as the root directory
5. Click "Deploy"

## Local Preview

```bash
# Install dependencies
pnpm install

# Start dev server
pnpm dev

# Open browser to http://localhost:3001
```

## Build Settings (Vercel)

- **Framework**: Vite
- **Build Command**: `pnpm run build`
- **Output Directory**: `dist`
- **Install Command**: `pnpm install`
- **Root Directory**: `packages/document-intelligence-demo`

## Environment Variables

No environment variables required - demo uses mock data!

(Optional) To connect to real ORION backend:
```
VITE_API_URL=https://api.yourdomain.com
```

## What You'll See

Once deployed, your demo includes:

### 📚 Library Page
- 2 pre-loaded sample documents
- AI-generated summaries
- Entity extraction (people, organizations, amounts, dates)

### 🤖 AI Q&A
- Click "Ask AI" on any document
- Try these sample questions:
  - "What was the total revenue in Q3?"
  - "What are the payment terms?"
  - "Which sectors showed the strongest growth?"
- See source citations with page numbers
- View cost tracking (tokens, pricing)

### 🔍 Search
- Hybrid semantic + keyword search
- Search across all documents
- Relevance scoring

### 📊 Analytics
- Cost breakdown by operation
- Savings from caching
- Usage metrics

## Sample Documents

**1. Q3 2025 Sales Report**
- 24 pages
- $1.2M revenue (12% YoY growth)
- Enterprise segment: $890K
- Entities: 4 people, 3 organizations

**2. SaaS Service Agreement**
- 12 pages
- $50K annual + $25K setup
- 24-month term
- Auto-renewal clause

## Tech Stack

- React 18 + TypeScript
- Vite 5
- TanStack Query
- Tailwind CSS
- React Dropzone
- Mock AI responses

## Performance

- Build size: 343KB (110KB gzipped)
- First load: <2s
- Lighthouse score: 95+

---

**Questions?** Check the main [README.md](./README.md)
