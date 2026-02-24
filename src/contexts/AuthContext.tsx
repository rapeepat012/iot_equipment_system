import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import Swal from 'sweetalert2';
import { apiService, User } from '../services/api';

interface AuthContextType {
  user: User | null;
  isLoggedIn: boolean;
  isLoading: boolean;
  login: (studentId: string, password: string) => Promise<void>;
  register: (userData: {
    fullname: string;
    email: string;
    student_id: string;
    password: string;
    confirm_password: string;
  }) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // ตรวจสอบสถานะการ login เมื่อ component mount
  useEffect(() => {
    const checkAuthStatus = async () => {
      try {
        if (apiService.isLoggedIn()) {
          const currentUser = apiService.getCurrentUser();
          if (currentUser) {
            // ตรวจสอบสถานะบัญชีจากเซิร์ฟเวอร์
            try {
              const response = await apiService.raw('/users.php', { method: 'GET' }) as any;
              if (response.success && response.data?.users) {
                const updatedUser = response.data.users.find((u: User) => u.id === currentUser.id);
                if (updatedUser) {
                  if (updatedUser.status === 'suspended') {
                    // บัญชีถูกระงับ - ออกจากระบบทันที
                    apiService.logout();
                    setUser(null);
                    await Swal.fire({
                      title: 'บัญชีถูกระงับ',
                      text: 'บัญชีของคุณถูกระงับ โปรดติดต่อเจ้าหน้าที่',
                      icon: 'warning',
                      confirmButtonColor: '#0EA5E9'
                    });
                    window.location.href = '/login';
                    return;
                  } else {
                    // อัปเดตข้อมูลผู้ใช้
                    setUser(updatedUser);
                    apiService.setUserData(updatedUser, localStorage.getItem('token') || '', localStorage.getItem('login_time') || '');
                  }
                } else {
                  // ไม่พบผู้ใช้ - ออกจากระบบ
                  apiService.logout();
                  setUser(null);
                }
              } else {
                setUser(currentUser);
              }
            } catch (error) {
              // ถ้าไม่สามารถตรวจสอบได้ ให้ใช้ข้อมูลเดิม
              setUser(currentUser);
            }
          }
        }
      } catch (error) {
        console.error('Error checking auth status:', error);
        apiService.logout();
        setUser(null);
      } finally {
        setIsLoading(false);
      }
    };

    checkAuthStatus();

    // ตรวจสอบสถานะบัญชีทุก 30 วินาที
    const interval = setInterval(async () => {
      if (apiService.isLoggedIn()) {
        try {
          const currentUser = apiService.getCurrentUser();
          if (currentUser) {
            const response = await apiService.raw('/users.php', { method: 'GET' }) as any;
            if (response.success && response.data?.users) {
              const updatedUser = response.data.users.find((u: User) => u.id === currentUser.id);
              if (updatedUser && updatedUser.status === 'suspended') {
                // บัญชีถูกระงับ - ออกจากระบบทันที
                apiService.logout();
                setUser(null);
                await Swal.fire({
                  title: 'บัญชีถูกระงับ',
                  text: 'บัญชีของคุณถูกระงับ โปรดติดต่อเจ้าหน้าที่',
                  icon: 'warning',
                  confirmButtonColor: '#0EA5E9'
                });
                window.location.href = '/login';
              }
            }
          }
        } catch (error) {
          // ไม่ต้องทำอะไรถ้าเกิดข้อผิดพลาด
        }
      }
    }, 30000); // ตรวจสอบทุก 30 วินาที

    return () => {
      clearInterval(interval);
    };
  }, []);

  const login = async (studentId: string, password: string): Promise<void> => {
    try {
      const response = await apiService.login({ student_id: studentId, password });

      if (response.success) {
        const { user, token, login_time } = response.data;
        apiService.setUserData(user, token, login_time);
        setUser(user);
      } else {
        throw new Error(response.message || 'เกิดข้อผิดพลาดในการเข้าสู่ระบบ');
      }
    } catch (error) {
      throw error;
    }
  };

  const register = async (userData: {
    fullname: string;
    email: string;
    student_id: string;
    password: string;
    confirm_password: string;
  }): Promise<void> => {
    try {
      setIsLoading(true);
      const response = await apiService.register(userData);

      if (response.success) {
        // สมัครสำเร็จ - ไม่ทำการล็อกอินอัตโนมัติ
        // ปล่อยให้ผู้ใช้ไปล็อกอินด้วยตัวเองที่หน้า Login
      } else {
        throw new Error(response.message);
      }
    } catch (error) {
      console.error('Register error:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = (): void => {
    apiService.logout();
    setUser(null);
  };

  const value: AuthContextType = {
    user,
    isLoggedIn: !!user,
    isLoading,
    login,
    register,
    logout,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
