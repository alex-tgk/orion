import React, { ReactNode } from 'react';
import { Sidebar } from './Sidebar';
import { Header } from './Header';
import { NavItem, User } from '../types';

interface DashboardLayoutProps {
  children: ReactNode;
  navItems?: NavItem[];
  user?: User;
  onNavClick?: (item: NavItem) => void;
}

export const DashboardLayout: React.FC<DashboardLayoutProps> = ({
  children,
  navItems = [],
  user,
  onNavClick,
}) => {
  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar navItems={navItems} onNavClick={onNavClick} />

      <div className="flex-1 flex flex-col overflow-hidden">
        <Header user={user} />

        <main className="flex-1 overflow-auto bg-gray-50 p-6">
          {children}
        </main>
      </div>
    </div>
  );
};
