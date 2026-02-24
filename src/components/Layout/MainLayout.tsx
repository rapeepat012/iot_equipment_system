import React, { useState } from 'react';
import { Sidebar } from './Sidebar';
import { Navbar } from './Navbar';
import { FooterNav } from './FooterNav';
import { useAuth } from '../../contexts/AuthContext';

interface MainLayoutProps {
  children: React.ReactNode;
}

export const MainLayout: React.FC<MainLayoutProps> = ({ children }) => {
  // Initialize with saved state to prevent flickering
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => {
    const savedState = localStorage.getItem('sidebarCollapsed');
    return savedState !== null ? JSON.parse(savedState) : false;
  });
  const { user } = useAuth();

  const toggleSidebar = () => {
    const newState = !sidebarCollapsed;
    setSidebarCollapsed(newState);
    // Save to localStorage
    localStorage.setItem('sidebarCollapsed', JSON.stringify(newState));
  };

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Sidebar - Hidden on mobile */}
      <div className="hidden lg:block">
        <Sidebar 
          isCollapsed={sidebarCollapsed} 
          userRole={user?.role as 'admin' | 'staff' | 'user' || 'user'} 
        />
      </div>
      
      {/* Main content area */}
      <div className="flex-1 flex flex-col">
        {/* Navbar - Hidden on mobile */}
        <div className="hidden lg:block">
          <Navbar 
            isCollapsed={sidebarCollapsed} 
            onToggle={toggleSidebar} 
          />
        </div>
        
        {/* Page content */}
        <main className="flex-1 transition-all duration-300 pb-16 lg:pb-0 overflow-y-auto">
          {children}
        </main>
      </div>

      {/* Footer Navigation - Mobile only */}
      <FooterNav userRole={user?.role as 'admin' | 'staff' | 'user' || 'user'} />
    </div>
  );
};

export default MainLayout;
