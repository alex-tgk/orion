import { Link, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  Server,
  Users,
  Flag,
  Webhook,
  BarChart,
  FileText,
  MessageSquare,
  Settings,
  Layers
} from 'lucide-react';
import { cn } from '@/lib/utils';

const navigation = [
  { name: 'Dashboard', href: '/', icon: LayoutDashboard },
  { name: 'Services', href: '/services', icon: Server },
  { name: 'Users', href: '/users', icon: Users },
  { name: 'Feature Flags', href: '/feature-flags', icon: Flag },
  { name: 'Queues', href: '/queues', icon: Layers },
  { name: 'Webhooks', href: '/webhooks', icon: Webhook },
  { name: 'Analytics', href: '/analytics', icon: BarChart },
  { name: 'Logs', href: '/logs', icon: FileText },
  { name: 'AI Chat', href: '/ai-chat', icon: MessageSquare },
  { name: 'Settings', href: '/settings', icon: Settings },
];

export function Sidebar() {
  const location = useLocation();

  return (
    <div className="w-64 bg-white border-r border-gray-200 flex flex-col">
      <div className="h-16 flex items-center px-6 border-b border-gray-200">
        <h1 className="text-xl font-bold text-primary">ORION</h1>
      </div>
      <nav className="flex-1 px-4 py-6 space-y-1 overflow-y-auto">
        {navigation.map((item) => {
          const isActive = location.pathname === item.href;
          return (
            <Link
              key={item.name}
              to={item.href}
              className={cn(
                'flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors',
                isActive
                  ? 'bg-primary text-white'
                  : 'text-gray-700 hover:bg-gray-100'
              )}
            >
              <item.icon className="h-5 w-5" />
              {item.name}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
