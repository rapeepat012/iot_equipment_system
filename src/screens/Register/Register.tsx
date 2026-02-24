import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "../../components/ui/button";
import { Card } from "../../components/ui/card";
import { Input } from "../../components/ui/input";
import { Label } from "../../components/ui/label";
import { Eye, EyeOff, User, Mail, IdCard, Lock, Loader2 } from "lucide-react";
import apiService from "../../services/api";
import Swal from 'sweetalert2';

const formFields = [
  {
    id: "fullname",
    label: "ชื่อ-นามสกุล",
    type: "text",
    icon: User,
    placeholder: ""
  },
  {
    id: "email",
    label: "อีเมล (รหัส 12 หลัก + -st@rmutsb.ac.th)",
    type: "email",
    icon: Mail,
    placeholder: ""
  },
  {
    id: "studentId",
    label: "รหัสนักศึกษา",
    type: "text",
    icon: IdCard,
    placeholder: ""
  },
  {
    id: "password",
    label: "รหัสผ่าน",
    type: "password",
    icon: Lock,
    placeholder: ""
  },
  {
    id: "confirmPassword",
    label: "ยืนยันรหัสผ่าน",
    type: "password",
    icon: Lock,
    placeholder: ""
  },
];

export const SignUp = (): JSX.Element => {
  const [showPassword, setShowPassword] = useState<{ [key: string]: boolean }>({});
  const [formData, setFormData] = useState<{ [key: string]: string }>({});
  const [errors, setErrors] = useState<{ [key: string]: string | undefined }>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const navigate = useNavigate();


  const togglePasswordVisibility = (fieldId: string) => {
    setShowPassword(prev => ({
      ...prev,
      [fieldId]: !prev[fieldId]
    }));
  };

  const validateStudentId = (studentId: string): boolean => {
    const pattern = /^\d{12}$/;
    return pattern.test(studentId);
  };

  const validateEmail = (email: string): boolean => {
    const pattern = /^\d{12}-st@rmutsb\.ac\.th$/;
    return pattern.test(email);
  };

  const validatePassword = (password: string): boolean => {
    return password.length >= 6;
  };

  const handleInputChange = (fieldId: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [fieldId]: value
    }));

    // Validate email
    if (fieldId === "email") {
      if (value && !validateEmail(value)) {
        setErrors(prev => ({ ...prev, email: "รูปแบบอีเมลไม่ถูกต้อง (รหัส 12 หลัก + -st@rmutsb.ac.th)" }));
      } else {
        setErrors(prev => ({ ...prev, email: undefined }));
      }
    }

    // Validate student ID
    if (fieldId === "studentId") {
      if (value && !validateStudentId(value)) {
        setErrors(prev => ({ ...prev, studentId: "รูปแบบรหัสนักศึกษาไม่ถูกต้อง (รหัส 12 หลัก)" }));
      } else {
        setErrors(prev => ({ ...prev, studentId: undefined }));
      }
    }

    // Validate password
    if (fieldId === "password") {
      if (value && !validatePassword(value)) {
        setErrors(prev => ({ ...prev, password: "รหัสผ่านต้องมีอย่างน้อย 6 ตัวอักษร" }));
      } else {
        setErrors(prev => ({ ...prev, password: undefined }));
      }
    }

    // Validate confirm password
    if (fieldId === "confirmPassword") {
      if (value && value !== formData.password) {
        setErrors(prev => ({ ...prev, confirmPassword: "รหัสผ่านไม่ตรงกัน" }));
      } else {
        setErrors(prev => ({ ...prev, confirmPassword: undefined }));
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSubmitting(true);
    setErrors({});
    
    try {
      // Validate all fields
      const newErrors: { [key: string]: string } = {};
      
      if (!formData.fullname) {
        newErrors.fullname = "กรุณากรอกชื่อ-นามสกุล";
      }
      
      if (!validateEmail(formData.email)) {
        newErrors.email = "รูปแบบอีเมลไม่ถูกต้อง (รหัส 12 หลัก + -st@rmutsb.ac.th)";
      }
      
      if (!validateStudentId(formData.studentId)) {
        newErrors.studentId = "รูปแบบรหัสนักศึกษาไม่ถูกต้อง (รหัส 12 หลัก)";
      }
      
      if (!validatePassword(formData.password)) {
        newErrors.password = "รหัสผ่านต้องมีอย่างน้อย 6 ตัวอักษร";
      }
      
      if (formData.password !== formData.confirmPassword) {
        newErrors.confirmPassword = "รหัสผ่านไม่ตรงกัน";
      }
      
      if (Object.keys(newErrors).length > 0) {
        setErrors(newErrors);
        return;
      }
      
      // ส่งคำขอสมัครไปยัง pending_registrations (ไม่สร้างผู้ใช้จริง)
      await apiService.createPendingRegistration({
        fullname: formData.fullname,
        email: formData.email,
        student_id: formData.studentId,
        password: formData.password,
        role: 'user'
      });

      // แจ้งเตือนและไปหน้า login
      await Swal.fire({
        title: 'สมัครสมาชิกสำเร็จ',
        text: 'โปรดรอเจ้าหน้าที่อนุมัติ ก่อนเข้าสู่ระบบ',
        icon: 'success',
        confirmButtonText: 'ไปหน้าเข้าสู่ระบบ',
        confirmButtonColor: '#0EA5E9'
      });
      // ตั้งค่า flag เพื่อข้าม loading
      sessionStorage.setItem('fromSignup', 'true');
      navigate('/login', { replace: true });
      
    } catch (error: any) {
      console.error('Register error:', error);
      setErrors(prev => ({ 
        ...prev, 
        general: error.message || "เกิดข้อผิดพลาดในการสมัครสมาชิก" 
      }));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-3" style={{ backgroundColor: '#EDF7FD' }}>
      <div className="w-full max-w-md">
        <Card className="bg-white shadow-2xl border-0 rounded-2xl overflow-hidden">
          <div className="flex min-h-[600px]">
            {/* Signup Form */}
            <div className="w-full flex flex-col justify-center p-6 lg:p-8">
              <div className="w-full max-w-sm mx-auto">
                <div className="text-center mb-6">
                  <div className="mb-4">
                    <img
                      src="/images/logo_bar.png"
                      alt="SCI NEXT Logo"
                      className="w-16 h-16 mx-auto"
                    />
                  </div>
                  <h2 className="text-2xl font-bold text-gray-800 mb-1">
                    สมัครสมาชิก
                  </h2>
                 
                </div>

                <form 
                  className="space-y-4"
                  onSubmit={handleSubmit}
                >
                  {formFields.map((field) => {
                    const Icon = field.icon;
                    const isPassword = field.type === "password";
                    const showPass = showPassword[field.id];
                    
                    return (
                      <div 
                        key={field.id} 
                        className="space-y-1.5"
                      >
                        <Label 
                          htmlFor={field.id}
                          className="text-xs font-semibold text-gray-700 flex items-center gap-2"
                        >
                          <Icon className="w-3 h-3 text-[#0EA5E9]" />
                          {field.label}
                        </Label>
                        <div className="relative">
                          <Input
                            id={field.id}
                            type={isPassword ? (showPass ? "text" : "password") : field.type}
                            placeholder={field.placeholder}
                            value={formData[field.id] || ""}
                            onChange={(e) => handleInputChange(field.id, e.target.value)}
                            className={`w-full h-10 pl-3 pr-8 bg-white border rounded-lg focus:ring-0 transition-all duration-300 placeholder:text-gray-400 text-sm ${
                              errors[field.id] 
                                ? 'border-red-500 focus:border-red-500' 
                                : 'border-gray-300 focus:border-[#0EA5E9]'
                            }`}
                          />
                          {isPassword && (
                            <button
                              type="button"
                              onClick={() => togglePasswordVisibility(field.id)}
                              className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                            >
                              {showPass ? (
                                <EyeOff className="w-4 h-4" />
                              ) : (
                                <Eye className="w-4 h-4" />
                              )}
                            </button>
                          )}
                        </div>
                        {errors[field.id] && (
                          <p className="text-red-500 text-xs mt-1">{errors[field.id]}</p>
                        )}
                      </div>
                    );
                  })}

                  {errors.general && (
                    <div className="bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded-lg">
                      <p className="text-xs">{errors.general}</p>
                    </div>
                  )}

                  <div>
                    <Button 
                      type="submit"
                      disabled={isSubmitting}
                      className="w-full h-10 bg-gradient-to-r from-[#0EA5E9] to-[#0284C7] hover:from-[#0284C7] hover:to-[#0369A1] text-white font-semibold rounded-lg shadow-md hover:shadow-lg transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                    >
                      {isSubmitting ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          กำลังสมัครสมาชิก...
                        </>
                      ) : (
                        'ลงทะเบียน'
                      )}
                    </Button>
                  </div>

                  <div className="flex items-center justify-center space-x-2 text-xs text-gray-600 pt-3">
                    <span>คุณมีบัญชีอยู่แล้วใช่มั้ย?</span>
                    <Link
                      to="/login"
                      onClick={() => sessionStorage.setItem('fromSignup', 'true')}
                      className="text-[#0EA5E9] hover:text-[#0284C7] font-semibold hover:underline transition-all duration-300"
                    >
                      เข้าสู่ระบบ
                    </Link>
                  </div>
                </form>
              </div>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
};