import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';

/**
 * RoleBasedRedirect component สำหรับ redirect ไปหน้าที่เหมาะสมตาม role
 */
export const RoleBasedRedirect: React.FC = () => {
    const { isLoggedIn, isLoading, user } = useAuth();

    // แสดง loading ระหว่างตรวจสอบสถานะ
    if (isLoading) {
        return (
            <div className="min-h-screen bg-white flex items-center justify-center">
                <div className="text-center">
                    <img src="/images/logo_login.png" alt="Loading" className="w-48 h-auto mx-auto mb-4" />
                </div>
            </div>
        );
    }

    // ถ้าไม่ได้ล็อกอิน ให้ไปหน้า login
    if (!isLoggedIn) {
        return <Navigate to="/login" replace />;
    }

    // Redirect ตาม role
    const redirectTo = user?.role === 'user' ? '/borrow' : '/dashboard';
    return <Navigate to={redirectTo} replace />;
};
