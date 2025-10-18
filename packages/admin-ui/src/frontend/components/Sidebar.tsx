import React from 'react';
import { NavItem } from '../types';

interface SidebarProps {
  navItems: NavItem[];
  activeItem?: string;
  onNavClick?: (item: NavItem) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ navItems, activeItem, onNavClick }) => {
  const renderNavItem = (item: NavItem, depth = 0) => {
    const isActive = activeItem === item.id;
    const hasChildren = item.children && item.children.length > 0;

    return (
      <div key={item.id}>
        <button
          onClick={() => onNavClick?.(item)}
          className={`
            w-full flex items-center justify-between px-4 py-3 text-sm font-medium
            transition-colors duration-150
            ${depth > 0 ? 'pl-8' : ''}
            ${isActive
              ? 'bg-sidebar-active text-white'
              : 'text-gray-300 hover:bg-sidebar-hover hover:text-white'
            }
          `}
        >
          <div className="flex items-center gap-3">
            {item.icon && <span className="text-lg">{item.icon}</span>}
            <span>{item.label}</span>
          </div>
          {item.badge && (
            <span className="px-2 py-1 text-xs font-bold bg-primary-600 text-white rounded-full">
              {item.badge}
            </span>
          )}
        </button>
        {hasChildren && (
          <div className="mt-1">
            {item.children!.map(child => renderNavItem(child, depth + 1))}
          </div>
        )}
      </div>
    );
  };

  return (
    <aside className="w-64 bg-sidebar-bg text-white flex flex-col h-full">
      <div className="p-6 border-b border-gray-700">
        <h1 className="text-2xl font-bold text-white">ORION</h1>
        <p className="text-xs text-gray-400 mt-1">Admin Dashboard</p>
      </div>

      <nav className="flex-1 overflow-y-auto py-4">
        {navItems.map(item => renderNavItem(item))}
      </nav>

      <div className="p-4 border-t border-gray-700">
        <div className="text-xs text-gray-400">
          <div className="flex items-center gap-2 mb-1">
            <span className="w-2 h-2 bg-green-500 rounded-full"></span>
            <span>System Online</span>
          </div>
          <div>Version 1.0.0</div>
        </div>
      </div>
    </aside>
  );
};
