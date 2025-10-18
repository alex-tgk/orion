import { Bell, User } from 'lucide-react';
import { useAuthStore } from '@/store/auth.store';

export function Header() {
  const { user, logout } = useAuthStore();

  return (
    <header className="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-6">
      <div className="flex-1" />
      <div className="flex items-center gap-4">
        <button className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
          <Bell className="h-5 w-5 text-gray-600" />
        </button>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-full bg-primary flex items-center justify-center">
              <User className="h-4 w-4 text-white" />
            </div>
            <div className="text-sm">
              <div className="font-medium">{user?.name || 'Admin'}</div>
              <div className="text-gray-500">{user?.role || 'Administrator'}</div>
            </div>
          </div>
          <button
            onClick={logout}
            className="ml-2 px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
          >
            Logout
          </button>
        </div>
      </div>
    </header>
  );
}
