# AI Code Review System Architecture

## System Overview

```
┌─────────────────────────────────────────────────────────────────────┐
│                         GitHub Pull Request                          │
└────────────────────────────┬────────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────────┐
│                    GitHub Actions Workflow                           │
│  (.github/workflows/ai-code-review.yml)                             │
│                                                                       │
│  1. Checkout Code                                                    │
│  2. Setup Environment                                                │
│  3. Install Dependencies                                             │
│  4. Build AI Review Tools                                            │
└────────────────────────────┬────────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────────┐
│                      Review Engine Core                              │
│  (tools/ai-review/src/engine/review-engine.ts)                      │
│                                                                       │
│  ┌───────────────────────────────────────────────────────────────┐ │
│  │  1. Fetch PR files from GitHub API                           │ │
│  │  2. Filter excluded files                                     │ │
│  │  3. Dispatch to analyzers in parallel                        │ │
│  └───────────────────────────────────────────────────────────────┘ │
└──┬─────────┬──────────┬──────────┬──────────┬─────────────────────┘
   │         │          │          │          │
   ▼         ▼          ▼          ▼          ▼
┌──────┐ ┌──────┐ ┌────────┐ ┌──────┐ ┌──────────────┐
│Security│Perf.│Quality│Test│Documentation│
│Analyzer│Analyzer│Analyzer│Analyzer│  Analyzer    │
└──┬───┘ └──┬─┘ └───┬──┘ └──┬─┘ └──────┬───────┘
   │         │          │          │          │
   │    Pattern-Based Analysis (Regex, Rules)│
   │         │          │          │          │
   ▼         ▼          ▼          ▼          ▼
┌─────────────────────────────────────────────────┐
│         AI-Powered Analysis (Claude)            │
│  Model: claude-3-5-sonnet-20241022             │
│  Context: Code changes + patterns + history     │
└──┬─────────┬──────────┬──────────┬──────────┬──┘
   │         │          │          │          │
   └─────────┴──────────┴──────────┴──────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────────────────────────┐
│                  Comprehensive Review Generation                     │
│                                                                       │
│  1. Aggregate all analyzer results                                  │
│  2. AI synthesis of findings                                        │
│  3. Generate actionable suggestions                                 │
│  4. Calculate metrics                                               │
│  5. Classify severity                                               │
└────────────────────────────┬────────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────────┐
│                        Learning Engine                               │
│  (tools/ai-review/src/engine/learning-engine.ts)                    │
│                                                                       │
│  1. Load historical feedback                                        │
│  2. Filter based on acceptance rate                                 │
│  3. Adjust severity levels                                          │
│  4. Reduce false positives                                          │
└────────────────────────────┬────────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────────┐
│                       Reporting Layer                                │
│                                                                       │
│  ┌────────────────┐  ┌────────────────┐  ┌────────────────┐       │
│  │   Markdown     │  │      JSON      │  │    Console     │       │
│  │   Reporter     │  │    Reporter    │  │    Reporter    │       │
│  └────────────────┘  └────────────────┘  └────────────────┘       │
└──┬──────────────────────────────┬──────────────────────────────┬───┘
   │                              │                              │
   ▼                              ▼                              ▼
┌──────────────┐     ┌─────────────────────┐      ┌──────────────────┐
│   GitHub     │     │     Artifacts       │      │   Local Files    │
│   Comments   │     │  (30-day retention) │      │  (.ai-review/)   │
│   + Labels   │     └─────────────────────┘      └──────────────────┘
└──────────────┘
```

## Component Architecture

### 1. Analyzers

```
┌────────────────────────────────────────────────────────┐
│               Base Analyzer Interface                  │
│  analyze(files: FileChange[]): AnalysisResult         │
└────────────────────────────────────────────────────────┘
                        ▲
                        │
        ┌───────────────┼───────────────┐
        │               │               │
        │               │               │
┌───────┴─────┐  ┌──────┴──────┐  ┌───┴────────┐
│  Security   │  │ Performance │  │  Quality   │
│  Analyzer   │  │  Analyzer   │  │  Analyzer  │
│             │  │             │  │            │
│ • Secrets   │  │ • Complexity│  │ • Smells   │
│ • SQL Inj.  │  │ • N+1       │  │ • Best     │
│ • XSS       │  │ • Blocking  │  │   Practices│
│ • Auth      │  │ • Loops     │  │ • Maintain │
└─────────────┘  └─────────────┘  └────────────┘

┌─────────────┐  ┌──────────────────┐
│    Test     │  │  Documentation   │
│  Analyzer   │  │    Analyzer      │
│             │  │                  │
│ • Missing   │  │ • JSDoc          │
│ • Quality   │  │ • Params         │
│ • Coverage  │  │ • Examples       │
│ • Structure │  │ • Complexity     │
└─────────────┘  └──────────────────┘
```

### 2. Review Flow

```
┌─────────────────────────────────────────────────┐
│              Pull Request Event                 │
└────────────────┬────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────┐
│          Collect Changed Files                  │
│  • Get file list from GitHub API                │
│  • Read file contents                           │
│  • Filter exclusions                            │
└────────────────┬────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────┐
│         Run Analyzers (Parallel)                │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐     │
│  │ Security │  │   Perf   │  │ Quality  │     │
│  └──────────┘  └──────────┘  └──────────┘     │
│  ┌──────────┐  ┌──────────┐                   │
│  │   Test   │  │   Docs   │                   │
│  └──────────┘  └──────────┘                   │
└────────────────┬────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────┐
│      AI Review with Claude 3.5 Sonnet          │
│  • Analyze all findings                         │
│  • Generate context-aware suggestions          │
│  • Classify severity                           │
│  • Create auto-fix code                        │
└────────────────┬────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────┐
│           Apply Learning Engine                 │
│  • Filter based on historical acceptance       │
│  • Adjust severity levels                      │
│  • Remove false positives                      │
└────────────────┬────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────┐
│         Post to GitHub PR                       │
│  • Inline comments on specific lines           │
│  • Summary comment                             │
│  • Add severity labels                         │
│  • Update PR status                            │
└────────────────┬────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────┐
│          Collect Metrics                        │
│  • Review time                                  │
│  • Issues found                                 │
│  • Severity distribution                        │
│  • Save to .ai-review-metrics/                 │
└─────────────────────────────────────────────────┘
```

### 3. Data Flow

```
┌─────────────┐
│   GitHub    │
│     PR      │
└──────┬──────┘
       │
       │ Files + Patches
       ▼
┌─────────────────────────────────────┐
│        Review Engine                │
│  ┌──────────────────────────────┐  │
│  │  FileChange[]                │  │
│  │  - filename                  │  │
│  │  - content                   │  │
│  │  - patch                     │  │
│  │  - status                    │  │
│  └──────────────────────────────┘  │
└──────────┬──────────────────────────┘
           │
           │ Distribute
           ▼
┌─────────────────────────────────────┐
│         Analyzers                   │
│  ┌──────────────────────────────┐  │
│  │  AnalysisResult<Issue>       │  │
│  │  - category                  │  │
│  │  - issues[]                  │  │
│  │  - summary                   │  │
│  │  - metrics                   │  │
│  └──────────────────────────────┘  │
└──────────┬──────────────────────────┘
           │
           │ Aggregate
           ▼
┌─────────────────────────────────────┐
│      Claude AI Analysis             │
│  Prompt:                            │
│  - File changes                     │
│  - Analyzer results                 │
│  - Historical patterns              │
│  Response:                          │
│  - Comprehensive review             │
│  - Suggestions                      │
│  - Auto-fixes                       │
└──────────┬──────────────────────────┘
           │
           │ Structure
           ▼
┌─────────────────────────────────────┐
│       ReviewResult                  │
│  - summary                          │
│  - recommendation (APPROVE/REJECT)  │
│  - issues[] (with severity)         │
│  - positives[]                      │
│  - metrics                          │
│  - timestamp                        │
└──────────┬──────────────────────────┘
           │
           │ Format
           ▼
┌─────────────────────────────────────┐
│         Reporters                   │
│  - Markdown (GitHub comment)        │
│  - JSON (artifacts)                 │
│  - Console (CI logs)                │
└──────────┬──────────────────────────┘
           │
           │ Output
           ▼
┌─────────────────────────────────────┐
│       GitHub PR                     │
│  - Inline comments                  │
│  - Summary comment                  │
│  - Labels                           │
│  - Status checks                    │
└─────────────────────────────────────┘
```

### 4. Severity Classification

```
Input: Issue from Analyzer
           │
           ▼
┌─────────────────────────────────────┐
│    Pattern-Based Classification     │
│  • Check severity rules              │
│  • Check thresholds                  │
└──────────┬──────────────────────────┘
           │
           ▼
┌─────────────────────────────────────┐
│     AI-Enhanced Classification       │
│  • Context analysis                  │
│  • Impact assessment                 │
│  • Historical patterns               │
└──────────┬──────────────────────────┘
           │
           ▼
┌─────────────────────────────────────┐
│    Learning-Based Adjustment         │
│  • Check acceptance rate             │
│  • Adjust based on feedback          │
│  • Apply team preferences            │
└──────────┬──────────────────────────┘
           │
           ▼
    Final Severity Level
    ┌────────────────┐
    │  🚨 Critical   │ Block PR
    │  ⚠️  High       │ Warning
    │  💡 Medium     │ Suggestion
    │  📝 Low        │ Info
    │  ℹ️  Info       │ FYI
    └────────────────┘
```

### 5. Configuration Hierarchy

```
┌─────────────────────────────────────┐
│      config.json (Default)          │
│  • Base configuration                │
│  • Default thresholds                │
│  • Analyzer settings                 │
└──────────┬──────────────────────────┘
           │
           ▼ Merge
┌─────────────────────────────────────┐
│    Environment Variables             │
│  • ANTHROPIC_API_KEY                │
│  • GITHUB_TOKEN                     │
│  • AI_REVIEW_DEBUG                  │
└──────────┬──────────────────────────┘
           │
           ▼ Merge
┌─────────────────────────────────────┐
│    Learning Data                     │
│  • Historical feedback               │
│  • Acceptance rates                  │
│  • Pattern adjustments               │
└──────────┬──────────────────────────┘
           │
           ▼ Result
┌─────────────────────────────────────┐
│     Runtime Configuration            │
│  Used by Review Engine               │
└─────────────────────────────────────┘
```

## Integration Points

### GitHub Integration

```
┌─────────────────────────────────────┐
│         Octokit REST API             │
├─────────────────────────────────────┤
│  • pulls.get()                       │
│  • pulls.listFiles()                 │
│  • repos.getContent()                │
│  • pulls.createReview()              │
│  • pulls.createReviewComment()       │
│  • issues.createComment()            │
│  • issues.addLabels()                │
└─────────────────────────────────────┘
```

### Claude Integration

```
┌─────────────────────────────────────┐
│     Anthropic Messages API           │
├─────────────────────────────────────┤
│  Model: claude-3-5-sonnet-20241022  │
│  Max Tokens: 8000                   │
│  Temperature: 0.3                   │
│                                     │
│  Input:                             │
│  - Code changes                     │
│  - Analyzer results                 │
│  - Context                          │
│                                     │
│  Output:                            │
│  - Comprehensive review             │
│  - Suggestions                      │
│  - Auto-fix code                    │
└─────────────────────────────────────┘
```

## File Organization

```
orion/
├── .github/
│   └── workflows/
│       └── ai-code-review.yml          # GitHub Actions workflow
├── .claude/
│   └── commands/
│       └── code-review.md              # Slash command
├── docs/
│   └── development/
│       ├── ai-code-review.md           # Main documentation
│       ├── ai-code-review-implementation-summary.md
│       ├── ai-code-review-architecture.md
│       └── sample-reviews/             # Example reviews
│           ├── security-review-example.md
│           ├── performance-review-example.md
│           └── comprehensive-review-example.md
└── tools/
    └── ai-review/
        ├── src/
        │   ├── analyzers/              # Specialized analyzers
        │   ├── engine/                 # Core review logic
        │   ├── reporters/              # Output formatters
        │   ├── utils/                  # Helper utilities
        │   ├── types/                  # TypeScript types
        │   ├── cli.ts                  # CLI interface
        │   └── index.ts                # Main exports
        ├── config.json                 # Configuration
        ├── package.json                # Dependencies
        ├── tsconfig.json               # TypeScript config
        ├── README.md                   # Tool documentation
        ├── .gitignore                  # Git exclusions
        └── .env.example                # Environment template
```
