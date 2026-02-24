import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { 
  LayoutDashboard, 
  ShoppingCart, 
  Package, 
  Users, 
  Clock, 
  UserPlus, 
  FileText,
  LogOut,
  ChevronDown,
  Mail,
  Shield
} from 'lucide-react';
import Swal from 'sweetalert2';

interface FooterNavProps {
  userRole: 'admin' | 'staff' | 'user';
}

export const FooterNav: React.FC<FooterNavProps> = ({ userRole }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuth();

  const handleLogout = async () => {
    const result = await Swal.fire({
      title: 'ออกจากระบบ',
      text: 'คุณต้องการออกจากระบบหรือไม่?',
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: 'ออกจากระบบ',
      cancelButtonText: 'ยกเลิก',
      confirmButtonColor: '#ef4444',
      cancelButtonColor: '#6b7280'
    });

    if (result.isConfirmed) {
      logout();
      navigate('/login');
    }
  };

  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'admin':
        return <Shield className="w-3 h-3" />;
      case 'staff':
        return <Users className="w-3 h-3" />;
      default:
        return <Users className="w-3 h-3" />;
    }
  };

  const getRoleDisplay = (role: string) => {
    switch (role) {
      case 'admin':
        return 'ผู้ดูแลระบบ';
      case 'staff':
        return 'เจ้าหน้าที่';
      default:
        return 'ผู้ใช้';
    }
  };

  const navigationItems = [
    { path: '/dashboard', icon: LayoutDashboard, label: 'แดชบอร์ด', roles: ['admin', 'staff'] },
    { path: '/borrow', icon: ShoppingCart, label: 'ยืมอุปกรณ์', roles: ['admin', 'staff', 'user'] },
    { path: '/equipment', icon: Package, label: 'จัดการอุปกรณ์', roles: ['admin', 'staff'] },
    { path: '/return-equipment', icon: Package, label: 'คืนอุปกรณ์', roles: ['admin', 'staff'] },
    { path: '/manage-users', icon: Users, label: 'จัดการผู้ใช้', roles: ['admin'] },
    { path: '/history', icon: Clock, label: 'ประวัติ', roles: ['admin', 'staff'] },
    { path: '/pending-registrations', icon: UserPlus, label: 'รออนุมัติ', roles: ['admin'] },
    { path: '/borrow-requests', icon: FileText, label: 'คำขอยืม', roles: ['admin', 'staff'] },
  ];

  const filteredItems = navigationItems.filter(item => 
    item.roles.includes(userRole)
  );

  return (
    <div className="lg:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 z-50">
      {/* User Info Section */}
      <div className="px-3 py-1.5 border-b border-gray-100">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <div className="flex items-center gap-1 text-blue-600">
              {getRoleIcon(userRole)}
              <span className="text-[10px] font-medium">{getRoleDisplay(userRole)}</span>
            </div>
            <div className="text-[10px] text-gray-600 truncate">
              {user?.fullname}
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="text-red-500 hover:text-red-700 p-0.5"
            aria-label="ออกจากระบบ"
          >
            <LogOut className="w-3 h-3" />
          </button>
        </div>
      </div>

      {/* Navigation Items */}
      <div className="flex items-center justify-around py-1.5">
        {filteredItems.map((item) => {
          const isActive = location.pathname === item.path;
          const Icon = item.icon;
          
          return (
            <button
              key={item.path}
              onClick={() => navigate(item.path)}
              className={`flex flex-col items-center gap-0.5 p-1.5 rounded-lg transition-colors ${
                isActive 
                  ? 'text-blue-600 bg-blue-50' 
                  : 'text-gray-600 hover:text-blue-600 hover:bg-blue-50'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span className="text-[10px] font-medium">{item.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default FooterNav;
