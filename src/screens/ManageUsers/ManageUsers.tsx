import React, { useEffect, useState } from "react";
import { MainLayout, SlideInPanel } from '../../components/Layout';
import { EditUserForm } from "../../components/users";
import apiService, { User } from "../../services/api";
import { Card } from "../../components/ui/card";
import { ChevronLeft, ChevronRight, Inbox } from "lucide-react";
import SearchInput from "../../components/ui/SearchInput";
import PageSizeSelect from "../../components/ui/PageSizeSelect";
import Swal from 'sweetalert2';
import { useAuth } from "../../contexts/AuthContext";
import { useNavigate } from "react-router-dom";

export const Users: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [query, setQuery] = useState("");
  // remove create member flow per requirements

  // edit modal state
  const [showEdit, setShowEdit] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editUser, setEditUser] = useState<User | null>(null);
  const [editForm, setEditForm] = useState({
    fullname: "",
    email: "",
    student_id: "",
    role: "user",
    status: "active",
  });
  const [editError, setEditError] = useState<string | null>(null);
  const { user: currentUser, logout } = useAuth();
  const navigate = useNavigate();

  // Pagination state
  const [itemsPerPage, setItemsPerPage] = useState(50);
  const [currentPage, setCurrentPage] = useState(1);

  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        setError(null);
        const res = await apiService.listUsers();
        setUsers(res.data.users);
      } catch (e: any) {
        setError(e.message || "โหลดข้อมูลสมาชิกไม่สำเร็จ");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const filtered = users.filter((u) => {
    const q = query.trim().toLowerCase();
    if (!q) return true;
    return [u.student_id, u.fullname, u.email, u.role, u.status].some((v) =>
      String(v).toLowerCase().includes(q)
    );
  });

  // Pagination logic
  const totalItems = filtered.length;
  const totalPages = Math.ceil(totalItems / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = itemsPerPage === -1 ? totalItems : startIndex + itemsPerPage;
  const paginatedUsers = filtered.slice(startIndex, endIndex);

  // Reset to first page when search changes
  React.useEffect(() => {
    setCurrentPage(1);
  }, [query]);

  return (
    <MainLayout>
      <div className="min-h-screen p-4">
        <div className="mx-auto max-w-6xl space-y-4">
          {/* Search Section */}
          <div className="flex items-center justify-between gap-4">
            {/* Search Input */}
            <div className="flex items-center gap-2 flex-1">
              <SearchInput
                value={query}
                onChange={setQuery}
                placeholder="ค้นหา รหัส | ชื่อ-นามสกุล | อีเมล"
              />
            </div>

            {/* Add Button removed */}
          </div>

          {/* Pagination Controls */}
          <div className="flex items-center justify-between">
            <div className="text-sm text-gray-600">{totalItems} รายการ</div>
            <div className="flex items-center gap-2">
              <PageSizeSelect
                value={itemsPerPage}
                onChange={(v) => { setItemsPerPage(v); setCurrentPage(1); }}
                totalItems={totalItems}
                options={[5, 10, 15, 20, 50]}
              />
              <button
                onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                disabled={currentPage === 1}
                className="px-2 py-1 text-sm border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                ก่อนหน้า
              </button>
              <span className="px-2 text-sm text-gray-600">หน้า {currentPage} จาก {totalPages}</span>
              <button
                onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                disabled={currentPage === totalPages}
                className="px-2 py-1 text-sm border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                ถัดไป
              </button>
            </div>
          </div>

          {loading ? (
            <Card className="p-6 text-sm text-gray-500">
              กำลังโหลดข้อมูลสมาชิก...
            </Card>
          ) : error ? (
            <Card className="p-6 text-sm text-red-600">{error}</Card>
          ) : (
            <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white">
              <table className="min-w-full text-sm">
                <thead className="bg-gray-50 text-left text-gray-600">
                  <tr>
                    <th className="px-4 py-3">รหัสนักศึกษา</th>
                    <th className="px-4 py-3">ชื่อ-นามสกุล</th>
                    <th className="px-4 py-3">อีเมลมหาวิทยาลัย</th>
                    <th className="px-4 py-3">บทบาท</th>
                    <th className="px-4 py-3">สถานะบัญชี</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedUsers.map((u) => (
                    <tr
                      key={u.id}
                      className="cursor-pointer border-t last:border-b hover:bg-gray-50"
                      onClick={() => {
                        setEditUser(u);
                        setEditForm({
                          fullname: u.fullname,
                          email: u.email,
                          student_id: u.student_id,
                          role: u.role,
                          status: u.status,
                        });
                        setEditError(null);
                        setShowEdit(true);
                      }}
                    >
                      <td className="px-4 py-3 text-gray-700">
                        {u.student_id}
                      </td>
                      <td className="px-4 py-3 text-gray-700">
                        {u.fullname}
                      </td>
                      <td className="px-4 py-3 text-gray-700">{u.email}</td>
                      <td className="px-4 py-3">
                        <span className={`rounded-full px-2 py-1 text-xs font-medium ${u.role === 'admin'
                          ? 'bg-purple-100 text-purple-700'
                          : u.role === 'staff'
                            ? 'bg-blue-100 text-blue-700'
                            : 'bg-gray-100 text-gray-700'
                          }`}>
                          {u.role === 'admin' ? 'ผู้ดูแลระบบ' : u.role === 'staff' ? 'อาจารย์' : 'นักศึกษา'}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`rounded-full px-2 py-1 text-xs font-medium ${u.status === 'active'
                          ? 'bg-emerald-100 text-emerald-700'
                          : 'bg-red-100 text-red-700'
                          }`}>
                          {u.status === 'active' ? 'กำลังใช้งาน' : 'ระงับบัญชี'}
                        </span>
                      </td>
                    </tr>
                  ))}
                  {paginatedUsers.length === 0 && (
                    <tr>
                      <td colSpan={5} className="px-4 py-10 text-center text-gray-600">
                        <div className="flex flex-col items-center justify-center">
                          <Inbox className="w-12 h-12 text-gray-300 mb-3" />
                          <div className="text-sm">ไม่พบข้อมูลสมาชิก</div>
                        </div>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Create member panel removed */}

      {/* Slide-in Panel แก้ไขสมาชิก */}
      <SlideInPanel
        isOpen={showEdit && !!editUser}
        onClose={() => !editing && setShowEdit(false)}
        title={`แก้ไขสมาชิก`}
        width="lg"
        disableBackdropClick={editing}
        headerActions={
          <>
            <button
              type="button"
              className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 disabled:opacity-50 w-10 h-10 flex items-center justify-center"
              onClick={async () => {
                const result = await Swal.fire({
                  title: 'ยืนยันการลบสมาชิก',
                  text: `ต้องการลบสมาชิก "${editUser?.fullname}" หรือไม่?`,
                  icon: 'warning',
                  showCancelButton: true,
                  confirmButtonText: 'ใช่, ลบเลย',
                  cancelButtonText: 'ยกเลิก',
                  confirmButtonColor: '#dc2626',
                  cancelButtonColor: '#6b7280'
                });

                if (result.isConfirmed) {
                  try {
                    await apiService.deleteUser(editUser!.id);
                    const usersRes = await apiService.listUsers();
                    setUsers(usersRes.data.users);
                    window.dispatchEvent(new Event('user-updated'));
                    setShowEdit(false);

                    // If the deleted user is the current logged-in user, logout and redirect
                    if (currentUser && editUser && currentUser.id === editUser.id) {
                      await Swal.fire({
                        title: 'บัญชีถูกลบ',
                        text: 'ระบบจะออกจากระบบและพาไปหน้าเข้าสู่ระบบ',
                        icon: 'warning',
                        confirmButtonText: 'ตกลง',
                        confirmButtonColor: '#0EA5E9'
                      });
                      logout();
                      navigate('/login');
                      return;
                    }

                    // Show success alert
                    Swal.fire({
                      title: 'สำเร็จ!',
                      text: 'ลบสมาชิกเรียบร้อยแล้ว',
                      icon: 'success',
                      confirmButtonText: 'ตกลง',
                      confirmButtonColor: '#0EA5E9'
                    });
                  } catch (e: any) {
                    console.error("Delete error:", e);
                    setShowEdit(false);
                  }
                }
              }}

            >
              ลบ
            </button>
            <button
              type="submit"
              className="bg-[#0EA5E9] text-white px-4 py-2 rounded-lg hover:bg-[#0284C7] disabled:opacity-50"
              onClick={async () => {
                try {
                  setEditing(true);
                  setEditError(null);
                  console.log('Sending update data:', editForm); // Debug log
                  await apiService.updateUser(editUser!.id, editForm);
                  const usersRes = await apiService.listUsers();
                  setUsers(usersRes.data.users);
                  setShowEdit(false);

                  // Show success alert
                  Swal.fire({
                    title: 'สำเร็จ!',
                    text: 'แก้ไขสมาชิกเรียบร้อยแล้ว',
                    icon: 'success',
                    confirmButtonText: 'ตกลง',
                    confirmButtonColor: '#0EA5E9'
                  });

                  // ตรวจสอบการระงับบัญชี
                  const updated = usersRes.data.users.find((u: User) => u.id === editUser!.id);
                  if (updated && updated.status === 'suspended') {
                    // ถ้าผู้ใช้ที่ถูกระงับคือผู้ใช้ปัจจุบัน - ออกจากระบบทันที
                    if (currentUser && updated.id === currentUser.id) {
                      await Swal.fire({
                        title: 'บัญชีถูกระงับ',
                        text: 'ระบบจะออกจากระบบและพาไปหน้าเข้าสู่ระบบ',
                        icon: 'warning',
                        confirmButtonText: 'ตกลง',
                        confirmButtonColor: '#0EA5E9'
                      });
                      logout();
                      navigate('/login');
                      return;
                    }
                  }
                } catch (e: any) {
                  setEditError(e.message || "แก้ไขสมาชิกไม่สำเร็จ");
                } finally {
                  setEditing(false);
                }
              }}
              disabled={editing}
            >
              {editing ? "กำลังบันทึก..." : "บันทึก"}
            </button>
          </>
        }
      >
        <EditUserForm
          editForm={editForm}
          setEditForm={setEditForm}
          editError={editError}
        />
      </SlideInPanel>
    </MainLayout>
  );
};

export default Users;
