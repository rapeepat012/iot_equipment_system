import React from 'react';
import { 
  LayoutDashboard, 
  Package, 
  Users, 
  History, 
  ShoppingCart,
  UserPlus,
  FileText,
  PackageCheck,
} from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';

interface SidebarProps {
  isCollapsed: boolean;
  userRole: 'admin' | 'staff' | 'user';
}

const menuItems = {
  admin: [
    {
      category: 'Dashboard',
      items: [
        { icon: LayoutDashboard, label: 'Dashboard', path: '/dashboard' },
      ]
    },
    {
      category: 'การยืม-คืน',
      items: [
        { icon: ShoppingCart, label: 'ยืมอุปกรณ์', path: '/borrow' },
        { icon: PackageCheck, label: 'คืนอุปกรณ์', path: '/return-equipment' },
        { icon: History, label: 'ประวัติการยืม-คืน', path: '/history' },
      ]
    },
    {
      category: 'การจัดการ',
      items: [
        { icon: Package, label: 'จัดการอุปกรณ์', path: '/equipment' },
        { icon: Users, label: 'จัดการสมาชิก', path: '/users' },
        { icon: UserPlus, label: 'จัดการคำขอสมัคร', path: '/pending-registrations' },
        { icon: FileText, label: 'จัดการคำขอยืม', path: '/borrow-requests' },
      ]
    }
  ],
  staff: [
    {
      category: 'Dashboard',
      items: [
        { icon: LayoutDashboard, label: 'Dashboard', path: '/dashboard' },
      ]
    },
    {
      category: 'การยืม-คืน',
      items: [
        { icon: ShoppingCart, label: 'ยืมอุปกรณ์', path: '/borrow' },
        { icon: PackageCheck, label: 'คืนอุปกรณ์', path: '/return-equipment' },
        { icon: History, label: 'ประวัติการยืม-คืน', path: '/history' },
      ]
    },
    {
      category: 'การจัดการ',
      items: [
        { icon: FileText, label: 'จัดการคำขอยืม', path: '/borrow-requests' },
      ]
    }
  ],
  user: [
    {
      category: 'การยืม-คืน',
      items: [
        { icon: ShoppingCart, label: 'ยืมอุปกรณ์', path: '/borrow' },
        { icon: History, label: 'ประวัติการยืม-คืน', path: '/history' },
        { icon: FileText, label: 'สถานะคำขอของฉัน', path: '/my-requests' }

      ]
    }
  ]
};

export const Sidebar: React.FC<SidebarProps> = ({ isCollapsed, userRole }) => {
  const location = useLocation();
  const items = menuItems[userRole] || menuItems.user;

  return (
    <div className={`bg-white shadow-lg transition-all duration-300 ${isCollapsed ? 'w-20' : 'w-64'} h-screen flex flex-col`}>
      {/* Header */}
      <div className={`${isCollapsed ? 'p-2' : 'p-4'} border-b border-gray-200`}>
        <div className="flex items-center justify-center">
          {!isCollapsed && (
            <div className="flex items-center space-x-2">
              <img 
                src="/images/logo_bar.png" 
                alt="Logo" 
                className="w-12 h-12 object-contain"
              />
              <span className="font-bold text-gray-600 text-sm">บริการยืม-คืนอุปกรณ์ IoT</span>
            </div>
          )}
          {isCollapsed && (
            <div className="flex justify-center">
              <img 
                src="/images/logo_bar.png" 
                alt="Logo" 
                className="w-8 h-8 object-contain"
              />
            </div>
          )}
        </div>
      </div>

      {/* Navigation */}
      <nav className={`flex-1 ${isCollapsed ? 'p-2' : 'p-4'}`}>
        <div className="space-y-6">
          {items.map((category, categoryIndex) => (
            <div key={category.category}>
              {/* Category Header */}
              {!isCollapsed && (
                <div className="mb-3">
                  <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    {category.category}
                  </h3>
                </div>
              )}
              
              {/* Category Items */}
              <ul className="space-y-1">
                {category.items.map((item) => {
                  const Icon = item.icon;
                  const isActive = location.pathname === item.path;
                  
                  return (
                    <li key={item.path}>
                      <Link
                        to={item.path}
                        className={`flex items-center rounded-lg transition-all duration-300 ease-in-out ${
                          isCollapsed 
                            ? 'justify-center px-3 py-2' 
                            : 'space-x-3 px-3 py-2'
                        } ${
                          isActive
                            ? 'text-[#21a0dc] shadow-sm'
                            : 'text-gray-700 hover:bg-gray-50'
                        }`}
                        style={isActive ? { backgroundColor: 'rgba(33, 160, 220, 0.15)' } : {}}
                        title={isCollapsed ? item.label : ''}
                      >
                        <Icon className={`w-5 h-5 flex-shrink-0 ${
                          isActive ? 'text-[#21a0dc]' : 'text-gray-500'
                        }`} />
                        {!isCollapsed && (
                          <span className={`font-medium ${
                            isActive ? 'text-[#21a0dc]' : 'text-gray-700'
                          }`}>
                            {item.label}
                          </span>
                        )}
                      </Link>
                    </li>
                  );
                })}
              </ul>
              
              {/* Divider Line */}
              {categoryIndex < items.length - 1 && (
                <div className="mt-4 mb-2">
                  <hr className="border-gray-200" />
                </div>
              )}
            </div>
          ))}
        </div>
      </nav>

      {/* Footer (user info and logout removed per requirements) */}
      <div className={`${isCollapsed ? 'p-2' : 'p-4'} border-t border-gray-200`}></div>
    </div>
  );
};