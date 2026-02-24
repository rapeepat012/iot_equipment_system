import Swal from 'sweetalert2';

const API_BASE_URL = import.meta.env.VITE_API_URL || 
  (import.meta.env.PROD 
    ? window.location.origin + '/api'  
    : 'http://localhost/iot_equipment_system/api'  
  ); 

/**
 * Check if backend is configured and available
 */
export const isBackendConfigured = (): boolean => {
  // Check if API URL is set and not the default fallback
  const isConfigured = !!API_BASE_URL && 
    API_BASE_URL !== window.location.origin + '/api' &&
    !API_BASE_URL.includes('vercel.app/api');
  return isConfigured;
};

export interface LoginRequest {
  student_id: string;
  password: string;
}

export interface RegisterRequest {
  fullname: string;
  email: string;
  student_id: string;
  password: string;
  confirm_password: string;
}

export interface User {
  id: number;
  student_id: string;
  email: string;
  fullname: string;
  role: string;
  status: string;
}

export interface ListUsersResponse {
  success: boolean;
  message: string;
  data: { users: User[] };
}

export interface LoginResponse {
  success: boolean;
  message: string;
  data: {
    user: User;
    token: string;
    login_time: string;
    session_expires: string;
  };
}

export interface RegisterResponse {
  success: boolean;
  message: string;
  data: {
    user: User;
    message: string;
  };
}

export interface ApiError {
  success: false;
  message: string;
  errors?: any;
}

export interface Equipment {
  id: number;
  name: string;
  description?: string;
  category: string;
  image_url?: string;
  quantity_total: number;
  quantity_available: number;
  status: string;
  created_at?: string;
  updated_at?: string;
}

export interface ListEquipmentResponse {
  success: boolean;
  message: string;
  data: { equipment: Equipment[] };
}

export interface EquipmentMutationResponse {
  success: boolean;
  message: string;
  data: { equipment: Equipment };
}

export interface BorrowRequest {
  id: number;
  user_id: number;
  fullname: string;
  student_id: string;
  request_date: string;
  borrow_date: string;
  return_date: string;
  status: 'pending' | 'approved' | 'rejected' | 'completed';
  notes?: string;
  approver_id?: number;
  approver_name?: string;
  approved_at?: string;
  created_at: string;
  updated_at: string;
  items: BorrowRequestItem[];
}

export interface BorrowRequestItem {
  id: number;
  equipment_id: number;
  equipment_name: string;
  category: string;
  quantity_requested: number;
  quantity_approved: number;
}

export interface CreateBorrowRequestData {
  user_id: number;
  borrow_date: string;
  return_date: string;
  notes?: string;
  items: Array<{
    equipment_id: number;
    quantity: number;
  }>;
}

export interface ListBorrowRequestsResponse {
  success: boolean;
  message: string;
  data: { requests: BorrowRequest[] };
}

export interface BorrowRequestResponse {
  success: boolean;
  message: string;
  data: { request: BorrowRequest };
}

// Pending registration types
export interface PendingRegistration {
  id: number;
  fullname: string;
  email: string;
  student_id: string;
  role: 'admin' | 'staff' | 'user';
  status: 'pending' | 'approved' | 'rejected';
  requested_at: string;
  reviewed_at?: string;
}

export interface ListPendingResponse {
  success: boolean;
  message: string;
  data: { requests: PendingRegistration[] };
}

// Return Equipment types
export interface Borrower {
  borrowing_id: number;
  user_id: number;
  fullname: string;
  student_id: string;
  borrow_date: string;
  due_date: string;
  total_items: number;
  unique_equipment: number;
  status: 'normal' | 'warning' | 'overdue';
  days_remaining: number;
}

export interface BorrowedItem {
  equipment_id: number;
  equipment_name: string;
  category: string;
  image_url?: string;
  quantity_borrowed: number;
  borrow_date: string;
  due_date: string;
  borrowing_ids: string;
}

export interface BorrowerDetails {
  user: {
    id: number;
    fullname: string;
    student_id: string;
    email: string;
  };
  items: BorrowedItem[];
}

export interface ReturnItem {
  equipment_id: number;
  quantity_returned: number;
  quantity_damaged: number;
  quantity_lost: number;
  notes?: string;
}

export interface ReturnEquipmentRequest {
  borrowing_id: number;
  staff_id?: number;
  staff_name?: string;
  items: ReturnItem[];
}

export interface ListBorrowersResponse {
  success: boolean;
  message: string;
  data: { borrowers: Borrower[] };
}

export interface BorrowerDetailsResponse {
  success: boolean;
  message: string;
  data: BorrowerDetails;
}

class ApiService {
  private baseURL: string;

  constructor(baseURL: string = API_BASE_URL) {
    this.baseURL = baseURL;
  }

  /**
   * ส่ง HTTP Request
   */
  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${this.baseURL}${endpoint}`;
    
    const defaultOptions: RequestInit = {
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
    };

    const config = { ...defaultOptions, ...options };

    try {
      const response = await fetch(url, config);

      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        throw { status: 0, message: 'ไม่สามารถเชื่อมต่อกับเซิร์ฟเวอร์ได้ กรุณาตรวจสอบการเชื่อมต่ออินเทอร์เน็ต' };
      }

      const data = await response.json();

      // ตรวจสอบ status 202 (pending registration) ก่อน - ถึงแม้จะเป็น successful status แต่ต้องแสดง alert
      if (response.status === 202) {
        throw { status: response.status, message: data.message || '' };
      }

      if (!response.ok) {
        throw { status: response.status, message: data.message || '' };
      }

      // ตรวจสอบสถานะบัญชีหลังจาก API call สำเร็จ
      if (endpoint !== '/users.php' && data.success) {
        this.checkUserStatus();
      }

      return data;
    } catch (error) {
      // Check if backend is not configured
      if (!isBackendConfigured()) {
        throw { 
          status: 0, 
          message: 'Backend ยังไม่ได้ถูกตั้งค่า - กรุณาติดต่อผู้ดูแลระบบ',
          isBackendError: true 
        };
      }

      // ถ้าเป็น network error หรือ fetch error
      if ((error as any) instanceof TypeError) {
        const errorMessage = (error as any).message || '';
        if (errorMessage.includes('fetch') || errorMessage.includes('Failed to fetch')) {
          throw { 
            status: 0, 
            message: 'ไม่สามารถ เชื่อมต่อกับ Backend ได้ กรุณาตรวจสอบว่า Backend กำลังทำงานอยู่',
            isBackendError: true
          };
        }
      }
      
      throw error as any;
    }
  }

  /**
   * ตรวจสอบสถานะบัญชีผู้ใช้
   */
  private async checkUserStatus(): Promise<void> {
    try {
      const currentUser = this.getCurrentUser();
      if (!currentUser) return;

      const response = await this.raw('/users.php', { method: 'GET' }) as any;
      if (response.success && response.data?.users) {
        const updatedUser = response.data.users.find((u: User) => u.id === currentUser.id);
        if (updatedUser && updatedUser.status === 'suspended') {
          // บัญชีถูกระงับ - ออกจากระบบทันที
          this.logout();
          await Swal.fire({
            title: 'บัญชีถูกระงับ',
            text: 'บัญชีของคุณถูกระงับ โปรดติดต่อเจ้าหน้าที่',
            icon: 'warning',
            confirmButtonColor: '#0EA5E9'
          });
          window.location.href = '/login';
        }
      }
    } catch (error) {
      // ไม่ต้องทำอะไรถ้าเกิดข้อผิดพลาด
    }
  }

  // Expose a safe wrapper for custom calls when needed
  async raw<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    return this.request<T>(endpoint, options);
  }

  /**
   * Login API
   */
  async login(credentials: LoginRequest): Promise<LoginResponse> {
    return this.request<LoginResponse>('/login.php', {
      method: 'POST',
      body: JSON.stringify(credentials),
    });
  }

  /**
   * Equipment APIs
   */
  async listEquipment(): Promise<ListEquipmentResponse> {
    return this.request<ListEquipmentResponse>('/equipment.php', { method: 'GET' });
  }

  async createEquipment(payload: Partial<Equipment>): Promise<EquipmentMutationResponse> {
    return this.request<EquipmentMutationResponse>('/equipment.php', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  async updateEquipment(id: number, payload: Partial<Equipment>): Promise<EquipmentMutationResponse> {
    return this.request<EquipmentMutationResponse>('/equipment.php', {
      method: 'PUT',
      body: JSON.stringify({ id, ...payload }),
    });
  }

  async deleteEquipment(id: number): Promise<{ success: boolean; message: string }> {
    return this.request<{ success: boolean; message: string }>('/equipment.php', {
      method: 'DELETE',
      body: JSON.stringify({ id }),
    });
  }

  /**
   * Register API
   */
  async register(userData: RegisterRequest): Promise<RegisterResponse> {
    return this.request<RegisterResponse>('/register.php', {
      method: 'POST',
      body: JSON.stringify(userData),
    });
  }

  /**
   * List Users
   */
  async listUsers(): Promise<ListUsersResponse> {
    return this.request<ListUsersResponse>('/users.php', {
      method: 'GET',
    });
  }

  /**
   * Create User (admin)
   */
  async createUser(payload: RegisterRequest & { role?: string; status?: string; }): Promise<RegisterResponse> {
    return this.request<RegisterResponse>('/users.php', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  /**
   * Update User (admin)
   */
  async updateUser(id: number, payload: Partial<RegisterRequest> & { role?: string; status?: string; }): Promise<RegisterResponse> {
    return this.request<RegisterResponse>('/users.php', {
      method: 'PUT',
      body: JSON.stringify({ id, ...payload }),
    });
  }

  /**
   * Delete User (admin)
   */
  async deleteUser(id: number): Promise<{ success: boolean; message: string }> {
    return this.request<{ success: boolean; message: string }>('/users.php', {
      method: 'DELETE',
      body: JSON.stringify({ id }),
    });
  }

  /**
   * Borrow Request APIs
   */
  async listBorrowRequests(): Promise<ListBorrowRequestsResponse> {
    return this.request<ListBorrowRequestsResponse>('/borrow_requests.php', {
      method: 'GET',
    });
  }

  async createBorrowRequest(data: CreateBorrowRequestData): Promise<BorrowRequestResponse> {
    return this.request<BorrowRequestResponse>('/borrow_requests.php', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateBorrowRequest(id: number, data: Partial<CreateBorrowRequestData>): Promise<BorrowRequestResponse> {
    return this.request<BorrowRequestResponse>('/borrow_requests.php', {
      method: 'PUT',
      body: JSON.stringify({ id, ...data }),
    });
  }

  async deleteBorrowRequest(id: number): Promise<{ success: boolean; message: string }> {
    return this.request<{ success: boolean; message: string }>('/borrow_requests.php', {
      method: 'DELETE',
      body: JSON.stringify({ id }),
    });
  }

  /**
   * Pending Registration APIs
   */
  async createPendingRegistration(payload: { fullname: string; email: string; student_id: string; password: string; role?: string; }): Promise<{ success: boolean; message: string; }> {
    return this.request<{ success: boolean; message: string; }>('/pending_registrations.php', {
      method: 'POST',
      body: JSON.stringify(payload)
    });
  }

  async listPendingRegistrations(): Promise<ListPendingResponse> {
    return this.request<ListPendingResponse>('/pending_registrations.php', { method: 'GET' });
  }

  async reviewPendingRegistration(id: number, action: 'approve' | 'reject', notes?: string): Promise<{ success: boolean; message: string; }> {
    return this.request<{ success: boolean; message: string; }>('/pending_registrations.php', {
      method: 'PUT',
      body: JSON.stringify({ id, action, notes })
    });
  }

  /**
   * Logout (ลบข้อมูลจาก localStorage)
   */
  logout(): void {
    localStorage.removeItem('user');
    localStorage.removeItem('token');
    localStorage.removeItem('login_time');
  }

  /**
   * ตรวจสอบว่ามีข้อมูลผู้ใช้ใน localStorage หรือไม่
   */
  isLoggedIn(): boolean {
    const user = localStorage.getItem('user');
    const token = localStorage.getItem('token');
    return !!(user && token);
  }

  /**
   * ดึงข้อมูลผู้ใช้จาก localStorage
   */
  getCurrentUser(): User | null {
    const userStr = localStorage.getItem('user');
    if (userStr) {
      try {
        return JSON.parse(userStr);
      } catch (error) {
        console.error('Error parsing user data:', error);
        return null;
      }
    }
    return null;
  }

  /**
   * เก็บข้อมูลผู้ใช้ใน localStorage
   */
  setUserData(user: User, token: string, loginTime: string): void {
    localStorage.setItem('user', JSON.stringify(user));
    localStorage.setItem('token', token);
    localStorage.setItem('login_time', loginTime);
  }

  /**
   * Return Equipment APIs
   */
  async listActiveBorrowers(): Promise<ListBorrowersResponse> {
    return this.request<ListBorrowersResponse>('/return_equipment.php', {
      method: 'GET',
    });
  }

  async getBorrowerDetails(borrowingId: number): Promise<BorrowerDetailsResponse> {
    return this.request<BorrowerDetailsResponse>(`/return_equipment.php?borrowing_id=${borrowingId}`, {
      method: 'GET',
    });
  }

  async returnEquipment(data: ReturnEquipmentRequest): Promise<{ success: boolean; message: string; data: any }> {
    return this.request<{ success: boolean; message: string; data: any }>('/return_equipment.php', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  /**
   * Equipment Statistics APIs
   */
  async getMostBorrowedEquipment(limit: number = 5): Promise<{ success: boolean; message: string; data: { equipment: any[] } }> {
    return this.request<{ success: boolean; message: string; data: { equipment: any[] } }>(`/equipment_stats.php?type=most_borrowed&limit=${limit}`, {
      method: 'GET',
    });
  }

  async getMostDamagedEquipment(limit: number = 5): Promise<{ success: boolean; message: string; data: { equipment: any[] } }> {
    return this.request<{ success: boolean; message: string; data: { equipment: any[] } }>(`/equipment_stats.php?type=most_damaged&limit=${limit}`, {
      method: 'GET',
    });
  }
}

// สร้าง instance ของ ApiService
export const apiService = new ApiService();

// Export default
export default apiService;
