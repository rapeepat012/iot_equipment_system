import React from "react";
import { Input } from "../ui/input";
import { CheckCircle, XCircle, Mail, IdCard, User, Shield, ToggleLeft } from "lucide-react";

interface EditUserFormProps {
  editForm: {
    fullname: string;
    email: string;
    student_id: string;
    role: string;
    status: string;
  };
  setEditForm: (form: any) => void;
  editError: string | null;
}

export const EditUserForm: React.FC<EditUserFormProps> = ({
  editForm,
  setEditForm,
  editError,
}) => {
  const editEmailValid = /^\d{12}-st@rmutsb\.ac\.th$/.test(editForm.email || "");
  const editStudentValid = /^\d{12}$/.test(editForm.student_id || "");

  const nameValid = /^[ก-๙a-zA-Z\s]+$/.test(editForm.fullname.split(' ')[0] || '');
  const lastNameValid = /^[ก-๙a-zA-Z\s]+$/.test(editForm.fullname.split(' ').slice(1).join(' ') || '');

  return (
    <>
      {editError && (
        <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {editError}
        </div>
      )}
      <div className="space-y-6">
        <div className="bg-white rounded-xl shadow p-5">
          <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2"><User className="h-5 w-5 text-gray-500" /> ข้อมูลส่วนตัว</h3>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700 flex items-center gap-2"><User className="h-4 w-4 text-gray-400" /> ชื่อ</label>
              <Input
                value={editForm.fullname.split(' ')[0] || ''}
                onChange={(e) => {
                  const lastName = editForm.fullname.split(' ').slice(1).join(' ');
                  setEditForm({ ...editForm, fullname: `${e.target.value} ${lastName}`.trim() });
                }}
                className={`h-11 ${editForm.fullname.split(' ')[0] && !nameValid
                  ? "border-rose-300 focus:border-rose-500"
                  : ""
                  }`}
                placeholder="กรอกชื่อ"
              />
              {editForm.fullname.split(' ')[0] && !nameValid && (
                <p className="mt-1 text-xs text-rose-600">
                  กรอกได้เฉพาะตัวอักษรเท่านั้น
                </p>
              )}
            </div>
            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700 flex items-center gap-2"><User className="h-4 w-4 text-gray-400" /> นามสกุล</label>
              <Input
                value={editForm.fullname.split(' ').slice(1).join(' ') || ''}
                onChange={(e) => {
                  const firstName = editForm.fullname.split(' ')[0] || '';
                  setEditForm({ ...editForm, fullname: `${firstName} ${e.target.value}`.trim() });
                }}
                className={`h-11 ${editForm.fullname.split(' ').slice(1).join(' ') && !lastNameValid
                  ? "border-rose-300 focus:border-rose-500"
                  : ""
                  }`}
                placeholder="กรอกนามสกุล"
              />
              {editForm.fullname.split(' ').slice(1).join(' ') && !lastNameValid && (
                <p className="mt-1 text-xs text-rose-600">
                  กรอกได้เฉพาะตัวอักษรเท่านั้น
                </p>
              )}
            </div>
            <div className="sm:col-span-2">
              <label className="mb-2 flex items-center justify-between text-sm font-medium text-gray-700">
                <span className="flex items-center gap-2">
                  <Mail className="h-4 w-4 text-gray-400" /> อีเมลมหาลัย
                </span>
                {editForm.email ? (
                  editEmailValid ? (
                    <span className="flex items-center gap-1 text-emerald-600">
                      <CheckCircle className="h-4 w-4" />
                      ถูกต้อง
                    </span>
                  ) : (
                    <span className="flex items-center gap-1 text-rose-600">
                      <XCircle className="h-4 w-4" />
                      ไม่ถูกต้อง
                    </span>
                  )
                ) : null}
              </label>
              <Input
                value={editForm.email}
                onChange={(e) =>
                  setEditForm({ ...editForm, email: e.target.value })
                }
                className={`h-11 ${editForm.email
                  ? editEmailValid
                    ? "border-emerald-300 focus:border-emerald-500"
                    : "border-rose-300 focus:border-rose-500"
                  : ""
                  }`}
                placeholder="กรอกอีเมล"
              />
              {editForm.email && !editEmailValid && (
                <p className="mt-1 text-xs text-rose-600">
                  รูปแบบอีเมลต้องเป็น รหัส 12 หลัก + -st@rmutsb.ac.th
                </p>
              )}
            </div>
            <div className="sm:col-span-2">
              <label className="mb-2 flex items-center justify-between text-sm font-medium text-gray-700">
                <span className="flex items-center gap-2">
                  <IdCard className="h-4 w-4 text-gray-400" /> รหัสนักศึกษา
                </span>
                {editForm.student_id ? (
                  editStudentValid ? (
                    <span className="flex items-center gap-1 text-emerald-600">
                      <CheckCircle className="h-4 w-4" />
                      ถูกต้อง
                    </span>
                  ) : (
                    <span className="flex items-center gap-1 text-rose-600">
                      <XCircle className="h-4 w-4" />
                      ไม่ถูกต้อง
                    </span>
                  )
                ) : null}
              </label>
              <Input
                value={editForm.student_id}
                onChange={(e) =>
                  setEditForm({ ...editForm, student_id: e.target.value })
                }
                className={`h-11 ${editForm.student_id
                  ? editStudentValid
                    ? "border-emerald-300 focus:border-emerald-500"
                    : "border-rose-300 focus:border-rose-500"
                  : ""
                  }`}
                placeholder="กรอกรหัสนักศึกษา"
              />
              {editForm.student_id && !editStudentValid && (
                <p className="mt-1 text-xs text-rose-600">
                  ต้องเป็นตัวเลข 12 หลัก
                </p>
              )}
            </div>
          </div>
        </div>

        {/* สถานะ Section */}
        <div className="bg-white rounded-xl shadow p-5">
          <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2"><Shield className="h-5 w-5 text-gray-500" /> สถานะ</h3>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700 flex items-center gap-2"><Shield className="h-4 w-4 text-gray-400" /> บทบาท</label>
              <select
                className="h-11 w-full rounded-md border border-gray-300 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={editForm.role}
                onChange={(e) =>
                  setEditForm({ ...editForm, role: e.target.value })
                }
              >
                <option value="user">นักศึกษา</option>
                <option value="staff">อาจารย์</option>
                <option value="admin">ผู้ดูแลระบบ</option>
              </select>
            </div>
            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700 flex items-center gap-2"><ToggleLeft className="h-4 w-4 text-gray-400" /> สถานะบัญชี</label>
              <select
                className="h-11 w-full rounded-md border border-gray-300 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={editForm.status}
                onChange={(e) =>
                  setEditForm({ ...editForm, status: e.target.value })
                }
              >
                <option value="active">กำลังใช้งาน</option>
                <option value="suspended">ระงับบัญชี</option>
              </select>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default EditUserForm;
