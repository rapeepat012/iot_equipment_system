import React, { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import {
  ChevronDown,
  LogOut,
  Mail,
  Shield
} from 'lucide-react';
import Swal from 'sweetalert2';

interface NavbarProps {
  isCollapsed: boolean;
  onToggle: () => void;
}

const getPageTitle = (pathname: string): string => {
  const pageTitles: { [key: string]: string } = {
    '/dashboard': 'Dashboard',
    '/borrow': 'ยืมอุปกรณ์',
    '/return-equipment': 'คืนอุปกรณ์',
    '/equipment': 'จัดการอุปกรณ์',
    '/users': 'จัดการสมาชิก',
    '/history': 'ประวัติการยืม-คืน',
    '/pending-registrations': 'คำขอสมัครสมาชิก',
    '/borrow-requests': 'จัดการคำขอยืม',
    '/my-requests': 'สถานะคำขอของฉัน',
  };

  return pageTitles[pathname] || 'Dashboard';
};

const getRoleDisplay = (role: string): string => {
  switch (role) {
    case 'admin':
      return 'ผู้ดูแลระบบ';
    case 'staff':
      return 'อาจารย์';
    case 'user':
      return 'นักศึกษา';
    default:
      return 'ผู้ใช้';
  }
};

export const Navbar: React.FC<NavbarProps> = ({ onToggle }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const [showUserDropdown, setShowUserDropdown] = useState(false);

  const currentPageTitle = getPageTitle(location.pathname);

  const handleLogout = async () => {
    const result = await Swal.fire({
      title: 'ยืนยันการออกจากระบบ',
      text: 'คุณต้องการออกจากระบบหรือไม่?',
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: 'ออกจากระบบ',
      cancelButtonText: 'ยกเลิก',
      confirmButtonColor: '#dc2626',
      cancelButtonColor: '#6b7280'
    });

    if (result.isConfirmed) {
      logout();
      navigate('/login', { replace: true });
    }
  };

  const toggleUserDropdown = () => {
    setShowUserDropdown(!showUserDropdown);
  };

  return (
    <nav className="bg-white shadow-sm border-b border-gray-200 px-4 py-3">
      <div className="flex items-center justify-between">
        {/* Left side - Page title and toggle button */}
        <div className="flex items-center gap-4">
          <button
            onClick={onToggle}
            className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
          >
            <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>

          <div className="flex items-center gap-3">
            <div className="w-1 h-6 rounded-full" style={{ backgroundColor: '#21a0dc' }}></div>
            <h1 className="text-xl font-semibold text-gray-900">
              {currentPageTitle}
            </h1>
          </div>
        </div>

        {/* Right side - User dropdown */}
        <div className="flex items-center gap-4">
          {/* User dropdown trigger */}
          <div className="relative">
            <button
              onClick={toggleUserDropdown}
              className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-100 transition-colors"
            >
              <div className="text-right">
                <p className="text-sm font-medium text-gray-900">
                  {user?.fullname || 'ผู้ใช้งาน'}
                </p>
                <p className="text-xs text-gray-500">
                  {user?.student_id || '-'}
                </p>
              </div>
              <ChevronDown className="w-4 h-4 text-gray-500" />
            </button>

            {/* User dropdown */}
            {showUserDropdown && (
              <div className="absolute right-0 top-full mt-2 w-80 bg-white rounded-xl shadow-lg border border-gray-200 z-50">
                <div className="p-6">
                  {/* Centered user summary */}
                  <div className="mb-4 text-center">
                    <div className="mx-auto w-12 h-12 rounded-full bg-green-100 flex items-center justify-center">
                      <Shield className="w-6 h-6 text-green-600" />
                    </div>
                    <div className="mt-3 text-sm text-green-600 font-medium">
                      {getRoleDisplay(user?.role || 'user')}
                    </div>
                    <h3 className="mt-1 text-lg font-semibold text-gray-900">
                      {user?.fullname || 'ผู้ใช้งาน'}
                    </h3>
                    <div className="mt-1 flex items-center justify-center gap-2 text-sm text-gray-600">
                      <Mail className="w-4 h-4 text-gray-400" />
                      <span>{user?.email || '-'}</span>
                    </div>
                  </div>

                  {/* Divider */}
                  <div className="border-t border-gray-200 my-4"></div>

                  {/* Logout button */}
                  <button
                    onClick={handleLogout}
                    className="w-full flex items-center gap-3 px-4 py-3 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                  >
                    <LogOut className="w-4 h-4" />
                    <span className="font-medium">ออกจากระบบ</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Backdrop for dropdown */}
      {showUserDropdown && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => setShowUserDropdown(false)}
        />
      )}
    </nav>
  );
};

export default Navbar;
