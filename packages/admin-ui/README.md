# ORION Admin Dashboard

Modern, responsive admin dashboard for the ORION microservices platform.

## Features

- Modern UI built with React 18 + TypeScript
- Fast development with Vite
- Styled with Tailwind CSS + shadcn/ui
- State management with Zustand
- Data fetching with TanStack Query
- Authentication & authorization
- Real-time updates via WebSockets
- Comprehensive analytics & monitoring

## Tech Stack

- **Framework**: React 18.2.0 + TypeScript 5.3.3
- **Build Tool**: Vite 5.0.0
- **Styling**: Tailwind CSS 3.4.0 + shadcn/ui
- **State Management**: Zustand 4.4.0
- **Data Fetching**: TanStack Query 5.0.0
- **Routing**: React Router 6.20.0
- **Charts**: Recharts 2.10.0 + Tremor 3.13.0
- **Icons**: Lucide React

## Getting Started

### Prerequisites

- Node.js 20.x or later
- pnpm 8.x or later

### Installation

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

### Environment Variables

Create a `.env` file based on `.env.example`:

```env
VITE_API_URL=http://localhost:3100
VITE_WS_URL=ws://localhost:3100
```

## Project Structure

```
src/
├── components/          # Reusable UI components
│   ├── ui/             # shadcn/ui components
│   ├── layout/         # Layout components (Header, Sidebar)
│   └── features/       # Feature-specific components
├── pages/              # Page components
├── hooks/              # Custom React hooks
├── lib/                # Utility functions
├── services/           # API services
├── store/              # Zustand stores
├── styles/             # Global styles
└── types/              # TypeScript type definitions
```

## Available Pages

- **Dashboard** - Overview with key metrics and recent activity
- **Services** - Microservices management and monitoring
- **Users** - User management and authentication
- **Feature Flags** - Feature flag configuration
- **Webhooks** - Webhook management and delivery logs
- **Analytics** - Usage analytics and insights
- **Logs** - System logs and debugging
- **Settings** - Application settings and configuration

## Development

### Code Style

- ESLint for code linting
- TypeScript for type safety
- Prettier for code formatting

### Best Practices

- Use TypeScript for all new files
- Follow React best practices and hooks guidelines
- Keep components small and focused
- Use TanStack Query for server state
- Use Zustand for client state
- Implement proper error handling
- Write accessible HTML (ARIA attributes)

## License

MIT
