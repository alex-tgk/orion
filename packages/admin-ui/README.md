# ORION Admin Dashboard

A modern, extensible admin dashboard for the ORION microservices platform. Built with React 18, TypeScript, Tailwind CSS, and NestJS.

## Features

- **Modern React Frontend** - Built with React 18+ and TypeScript
- **Extensible Widget System** - Plugin architecture for easy widget addition
- **Responsive Grid Layout** - 12-column grid system with customizable widgets
- **Tailwind CSS** - Modern, utility-first styling
- **NestJS Backend** - Serves the frontend and provides API endpoints
- **Real-time Updates** - Widgets auto-refresh to show live data
- **Professional UI** - Clean, modern design with sidebar navigation

## Architecture

### Frontend Structure

```
src/frontend/
├── components/          # Reusable UI components
│   ├── DashboardLayout.tsx    # Main layout wrapper
│   ├── Header.tsx             # Top navigation header
│   ├── Sidebar.tsx            # Side navigation
│   └── WidgetGrid.tsx         # Grid layout for widgets
├── widgets/             # Dashboard widgets
│   ├── SystemOverviewWidget.tsx
│   ├── RecentActivityWidget.tsx
│   ├── QuickStatsWidget.tsx
│   └── index.ts
├── services/            # Business logic services
│   ├── widget-registry.ts     # Widget plugin system
│   └── api.ts                 # Backend API client
├── types/               # TypeScript type definitions
│   └── index.ts
├── styles/              # Global styles
│   └── globals.css
├── App.tsx              # Main application component
└── index.tsx            # Application entry point
```

### Backend Structure

```
src/app/
├── app.module.ts        # Main NestJS module
├── app.controller.ts    # API controllers
└── app.service.ts       # Business logic
```

## Getting Started

### Prerequisites

- Node.js 18+
- pnpm package manager
- Nx workspace (already configured)

### Installation

Dependencies are managed at the workspace root. The package includes:

- React 18+
- TypeScript
- Tailwind CSS
- NestJS
- Webpack 5

### Development

Build and run the dashboard:

```bash
# From workspace root
nx serve admin-ui

# Or with specific configuration
nx serve admin-ui --configuration=development
```

The dashboard will be available at `http://localhost:3000` (or configured port).

### Production Build

```bash
nx build admin-ui --configuration=production
```

Built files will be in `dist/packages/admin-ui/`.

## Widget System

The dashboard uses an extensible widget plugin architecture. See [WIDGETS.md](./WIDGETS.md) for detailed documentation.

### Quick Widget Creation

1. **Create widget component** in `src/frontend/widgets/YourWidget.tsx`
2. **Export widget** from `src/frontend/widgets/index.ts`
3. **Register widget** in `src/frontend/App.tsx`
4. **Add to dashboard** in the `defaultWidgets` array

### Available Widgets

- **System Overview** - System health and service status
- **Recent Activity** - Event log and activity feed
- **Quick Stats** - Key performance metrics

## API Integration

### API Service

The `API` service in `src/frontend/services/api.ts` handles all backend communication:

```typescript
import { API } from '../services/api';

// Example usage
const data = await API.getSystemStatus();
```

### Adding New Endpoints

1. Add method to `ApiService` class in `api.ts`
2. Create corresponding backend endpoint in `app.controller.ts`
3. Use in widgets via the `API` singleton

## Customization

### Styling

Tailwind configuration is in `tailwind.config.js`. Custom colors and utilities are defined there.

Global styles are in `src/frontend/styles/globals.css`.

### Navigation

Update navigation items in `App.tsx`:

```typescript
const defaultNavItems: NavItem[] = [
  {
    id: 'dashboard',
    label: 'Dashboard',
    icon: '📊',
    path: '/',
  },
  // Add more items...
];
```

### Layout

The grid system is configured in `WidgetGrid.tsx`:

- 12 columns by default
- Responsive widget sizing
- Customizable gap spacing

## Development Workflow

### Adding a New Feature

1. Create components in `src/frontend/components/`
2. Add types to `src/frontend/types/`
3. Implement business logic in `src/frontend/services/`
4. Create widgets in `src/frontend/widgets/`
5. Update `App.tsx` to integrate

### Code Quality

- TypeScript strict mode enabled
- ESLint configured (workspace level)
- Follow React functional component patterns
- Use TypeScript types for all components

### Testing

```bash
nx test admin-ui
```

## Backend API

### Health Endpoint

```
GET /health
```

Returns system health status.

### Future Endpoints

The backend is ready to be extended with additional API endpoints:

- `/api/services` - Service management
- `/api/analytics` - Analytics data
- `/api/users` - User management
- `/api/settings` - Configuration

## Technology Stack

### Frontend
- **React 18.2+** - UI framework
- **TypeScript 5+** - Type safety
- **Tailwind CSS 4+** - Styling
- **Webpack 5** - Module bundler

### Backend
- **NestJS 11+** - Backend framework
- **Express** - HTTP server
- **TypeScript** - Type safety

### Build Tools
- **Nx** - Monorepo build system
- **Webpack** - Module bundling
- **PostCSS** - CSS processing

## File Structure

```
admin-ui/
├── src/
│   ├── app/              # NestJS backend
│   └── frontend/         # React frontend
├── dist/                 # Build output
├── node_modules/         # Dependencies (workspace)
├── webpack.config.js     # Webpack configuration
├── tailwind.config.js    # Tailwind configuration
├── postcss.config.js     # PostCSS configuration
├── tsconfig.json         # TypeScript base config
├── tsconfig.app.json     # Backend TypeScript config
├── tsconfig.frontend.json # Frontend TypeScript config
├── project.json          # Nx project configuration
├── README.md             # This file
└── WIDGETS.md            # Widget development guide
```

## Environment Variables

Configure in `.env` or environment:

- `PORT` - Server port (default: 3000)
- `NODE_ENV` - Environment (development/production)

## Troubleshooting

### Build Issues

```bash
# Clean build cache
nx reset

# Rebuild
nx build admin-ui --skip-nx-cache
```

### TypeScript Errors

- Ensure `tsconfig.frontend.json` is used for frontend code
- Check that all imports have proper types
- Run `tsc --noEmit` to check for errors

### Styling Not Applied

- Verify Tailwind is configured in `tailwind.config.js`
- Check that `globals.css` is imported in `index.tsx`
- Ensure PostCSS is processing CSS files

### Widgets Not Loading

- Check widget is registered in `WidgetRegistry`
- Verify widget component is exported
- Check browser console for errors

## Contributing

### Code Style

- Use functional components with hooks
- Prefer TypeScript interfaces over types
- Use Tailwind utility classes
- Keep components small and focused
- Add JSDoc comments for public APIs

### Component Guidelines

- Props should be typed with interfaces
- Use `React.FC<Props>` for components
- Handle loading and error states
- Make components reusable when possible

## Future Enhancements

- [ ] Drag-and-drop widget repositioning
- [ ] Widget resize handles
- [ ] User-customizable dashboards
- [ ] Dark mode support
- [ ] Export dashboard configurations
- [ ] Widget marketplace/catalog
- [ ] Real-time WebSocket updates
- [ ] Advanced filtering and search
- [ ] Mobile responsive improvements
- [ ] Keyboard shortcuts

## License

Part of the ORION microservices platform.

## Support

For questions or issues, please refer to the main ORION documentation or create an issue in the repository.
