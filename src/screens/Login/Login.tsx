import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "../../components/ui/button";
import { Card } from "../../components/ui/card";
import { Input } from "../../components/ui/input";
import { Label } from "../../components/ui/label";
import { User, Lock, Loader2 } from "lucide-react";
import Swal from 'sweetalert2';
import { useAuth } from "../../contexts/AuthContext";
import { apiService } from "../../services/api";

export const Login = (): JSX.Element => {
  const [formData, setFormData] = useState<{
    studentId: string;
    password: string;
  }>({ studentId: "", password: "" });
  const [errors, setErrors] = useState<{
    studentId?: string;
    general?: string;
  }>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { login } = useAuth();
  const navigate = useNavigate();

  const validateStudentId = (studentId: string): boolean => {
    const pattern = /^\d{12}$/;
    return pattern.test(studentId);
  };

  const handleChange = (field: "studentId" | "password", value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));

    if (field === "studentId") {
      if (value && !validateStudentId(value)) {
        setErrors((prev) => ({
          ...prev,
          studentId: "รูปแบบรหัสนักศึกษาไม่ถูกต้อง ",
        }));
      } else {
        setErrors((prev) => ({ ...prev, studentId: undefined }));
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSubmitting(true);
    setErrors({});

    try {
      if (!validateStudentId(formData.studentId)) {
        setErrors((prev) => ({
          ...prev,
          studentId: "รูปแบบรหัสนักศึกษาไม่ถูกต้อง ",
        }));
        setIsSubmitting(false);
        return;
      }

      if (!formData.password) {
        setErrors((prev) => ({ ...prev, general: "กรุณากรอกรหัสผ่าน" }));
        setIsSubmitting(false);
        return;
      }

      try {
        await login(formData.studentId, formData.password);
      } catch (err: any) {
        if (err && typeof err.status === 'number' && err.status === 202) {
          setIsSubmitting(false);
          await Swal.fire({
            title: 'รอการพิจารณา',
            text: 'คำขอสมัครของคุณอยู่ระหว่างรอการพิจารณาจากเจ้าหน้าที่ ',
            icon: 'info',
            confirmButtonColor: '#0EA5E9'
          });
          return;
        }
        if (err && typeof err.status === 'number' && err.status === 403) {
          setIsSubmitting(false);
          await Swal.fire({
            title: 'บัญชีถูกระงับ',
            text: 'บัญชีของคุณถูกระงับ โปรดติดต่อเจ้าหน้าที่',
            icon: 'warning',
            confirmButtonColor: '#0EA5E9'
          });
          return;
        }
        throw err;
      }

      // Redirect based on role: users -> borrow, staff/admin -> dashboard
      const currentUser = apiService.getCurrentUser();
      if (currentUser && currentUser.role === 'user') {
        navigate('/borrow');
      } else {
        navigate('/dashboard');
      }
    } catch (error: any) {
      // จัดการข้อความ error ตามสถานการณ์
      let errorMessage = "เกิดข้อผิดพลาดในการเข้าสู่ระบบ";

      // ถ้ามี error message จาก backend ให้แสดงตามนั้น
      if (error.message && error.message.trim() !== '') {
        errorMessage = error.message;
      }
      // ถ้าเป็น network error
      else if (error.status === 0 || (error instanceof TypeError && error.message.includes('fetch'))) {
        errorMessage = "ไม่สามารถเชื่อมต่อกับเซิร์ฟเวอร์ได้ กรุณาตรวจสอบการเชื่อมต่ออินเทอร์เน็ต";
      }

      console.error("Login error:", error);
      setErrors((prev) => ({
        ...prev,
        general: errorMessage,
      }));
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-3" style={{ backgroundColor: '#EDF7FD' }}>
      <div className="w-full max-w-md">
        <Card className="bg-white shadow-2xl border-0 rounded-2xl overflow-hidden">
          <div className="flex min-h-[600px]">
            {/* Login Form */}
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
                    เข้าสู่ระบบ
                  </h2>
                  <p className="text-gray-600 text-sm">
                    กรอกรหัสนักศึกษาและรหัสผ่านของคุณ
                  </p>
                </div>

                <form className="space-y-4" onSubmit={handleSubmit}>
                  <div className="space-y-1.5">
                    <Label
                      htmlFor="studentId"
                      className="text-xs font-semibold text-gray-700 flex items-center gap-2"
                    >
                      <User className="w-3 h-3 text-[#0EA5E9]" /> รหัสนักศึกษา
                    </Label>
                    <Input
                      id="studentId"
                      type="text"
                      placeholder="รหัสนักศึกษา 12 หลัก"
                      value={formData.studentId}
                      onChange={(e) => handleChange("studentId", e.target.value)}
                      className={`w-full h-10 pl-3 pr-3 bg-white border rounded-lg focus:ring-0 transition-all duration-300 placeholder:text-gray-400 text-sm ${errors.studentId
                        ? "border-red-500 focus:border-red-500"
                        : "border-gray-300 focus:border-[#0EA5E9]"
                        }`}
                    />
                    {errors.studentId && (
                      <p className="text-red-500 text-xs mt-1">
                        {errors.studentId}
                      </p>
                    )}
                  </div>

                  <div className="space-y-1.5">
                    <Label
                      htmlFor="password"
                      className="text-xs font-semibold text-gray-700 flex items-center gap-2"
                    >
                      <Lock className="w-3 h-3 text-[#0EA5E9]" /> รหัสผ่าน
                    </Label>
                    <Input
                      id="password"
                      type="password"
                      placeholder="รหัสผ่าน"
                      value={formData.password}
                      onChange={(e) => handleChange("password", e.target.value)}
                      className="w-full h-10 pl-3 pr-3 bg-white border border-gray-300 rounded-lg focus:border-[#0EA5E9] focus:ring-0 transition-all duration-300 placeholder:text-gray-400 text-sm"
                    />
                  </div>

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
                          กำลังเข้าสู่ระบบ...
                        </>
                      ) : (
                        "เข้าสู่ระบบ"
                      )}
                    </Button>
                  </div>

                  <div className="flex items-center justify-center space-x-2 text-xs text-gray-600 pt-3">
                    <span>ยังไม่มีบัญชี?</span>
                    <Link
                      to="/signup"
                      className="text-[#0EA5E9] hover:text-[#0284C7] font-semibold hover:underline transition-all duration-300"
                    >
                      สมัครสมาชิก
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
