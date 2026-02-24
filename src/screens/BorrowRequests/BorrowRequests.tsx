import React, { useEffect, useMemo, useState } from 'react';
import { MainLayout } from '../../components/Layout';
import { apiService, type BorrowRequest } from '../../services/api';
import { ChevronDown, ChevronRight, Check, X, User, Inbox } from 'lucide-react';
import SearchInput from '../../components/ui/SearchInput';
import PageSizeSelect from '../../components/ui/PageSizeSelect';
import Swal from 'sweetalert2';

const formatThaiDateTime = (value: string | number | Date) => {
  const d = new Date(value);
  if (isNaN(d.getTime())) return '';
  const day = d.getDate();
  const month = d.getMonth() + 1;
  const buddhistYear = d.getFullYear() + 543;
  const hh = String(d.getHours()).padStart(2, '0');
  const mm = String(d.getMinutes()).padStart(2, '0');
  return `${day}/${month}/${buddhistYear} ${hh}:${mm}`;
};

const formatThaiDate = (value: string | number | Date) => {
  const d = new Date(value);
  if (isNaN(d.getTime())) return '';
  const day = d.getDate();
  const month = d.getMonth() + 1;
  const buddhistYear = d.getFullYear() + 543;
  return `${day}/${month}/${buddhistYear}`;
};

const getDurationDays = (start: string | number | Date, end: string | number | Date): number => {
  const s = new Date(start as any).getTime();
  const e = new Date(end as any).getTime();
  if (isNaN(s) || isNaN(e) || e <= s) return 0;
  return Math.ceil((e - s) / (1000 * 60 * 60 * 24));
};

export const BorrowRequests: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [requests, setRequests] = useState<BorrowRequest[]>([]);
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [query, setQuery] = useState('');
  const [seenRequestIds, setSeenRequestIds] = useState<Set<number>>(new Set());
  // Pagination state
  const [itemsPerPage, setItemsPerPage] = useState<number>(50);
  const [currentPage, setCurrentPage] = useState<number>(1);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await apiService.listBorrowRequests();
      // Only show pending requests
      const pendingRequests = (res.data.requests || []).filter(req => req.status === 'pending');
      setRequests(pendingRequests);
    } catch (e: any) {
      setError(e.message || 'โหลดรายการคำขอไม่สำเร็จ');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return requests;
    return requests.filter(r => [r.fullname, r.student_id].some(v => String(v).toLowerCase().includes(q)));
  }, [requests, query]);

  // Pagination slicing
  const totalItems = filtered.length;
  const totalPages = Math.ceil(totalItems / itemsPerPage) || 1;
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginated = filtered.slice(startIndex, endIndex);
  React.useEffect(() => { setCurrentPage(1); }, [query]);

  const handleApprove = async (id: number) => {
    const c = await Swal.fire({ title: 'ยืนยันอนุมัติ', text: 'อนุมัติคำขอนี้และบันทึกการยืมลงฐานข้อมูลหรือไม่?', icon: 'question', showCancelButton: true, confirmButtonText: 'อนุมัติ', cancelButtonText: 'ยกเลิก', confirmButtonColor: '#0EA5E9' });
    if (!c.isConfirmed) return;

    try {
      const approver = apiService.getCurrentUser();
      // Find the request to get details
      const request = requests.find(r => r.id === id);
      if (!request) throw new Error('ไม่พบคำขอ');

      // อนุมัติคำขอผ่าน API (จะสร้าง borrowing records, update equipment, create history, และลบคำขอโดยอัตโนมัติ)
      const approveResponse = await apiService.raw('/borrow_requests.php', { method: 'PUT', body: JSON.stringify({ id, action: 'approve', approver_id: approver?.id }) } as any) as any;
      console.log('Approve response:', approveResponse);

      if (!approveResponse.success) {
        throw new Error(approveResponse.message || 'ไม่สามารถอนุมัติคำขอได้');
      }

      // ลบคำขอออกจาก UI ทันที (เมื่อ API สำเร็จ)
      setRequests(prev => prev.filter(r => r.id !== id));

      await Swal.fire({ title: 'สำเร็จ', text: 'บันทึกการยืมเรียบร้อยแล้ว', icon: 'success', confirmButtonColor: '#0EA5E9' });
    } catch (e: any) {
      console.error('Approve error:', e);
      // แสดงข้อความผิดพลาดที่ได้จาก server
      const msg = e?.message || 'ไม่สามารถอนุมัติคำขอได้';
      await Swal.fire({ title: 'ผิดพลาด', text: msg, icon: 'error', confirmButtonColor: '#0EA5E9' });
    }
  };

  const handleReject = async (id: number) => {
    const c = await Swal.fire({
      title: 'ปฏิเสธคำขอ',
      text: 'ต้องการปฏิเสธคำขอนี้ใช่ไหม?',
      input: 'textarea',
      inputPlaceholder: 'เหตุผล (ถ้ามี)',
      showCancelButton: true,
      confirmButtonText: 'ปฏิเสธ',
      cancelButtonText: 'ยกเลิก',
      confirmButtonColor: '#dc2626'
    });
    if (!c.isConfirmed) return;
    const notes = (c.value || '').toString();
    try {
      // 1) mark as rejected (for history)
      await apiService.raw('/borrow_requests.php', { method: 'PUT', body: JSON.stringify({ id, action: 'reject', notes }) } as any);
      // 2) remove from current list immediately
      setRequests(prev => prev.filter(r => r.id !== id));
      // 3) delete the request record
      await apiService.deleteBorrowRequest(id);
      // 4) refresh in background
      fetchData();
      await Swal.fire({ title: 'สำเร็จ', text: 'ปฏิเสธคำขอและลบออกจากรายการแล้ว', icon: 'success', confirmButtonColor: '#0EA5E9' });
    } catch (e) {
      console.error(e);
      await Swal.fire({ title: 'ผิดพลาด', text: 'ปฏิเสธไม่สำเร็จ', icon: 'error', confirmButtonColor: '#0EA5E9' });
    }
  };

  return (
    <MainLayout>
      <div className="min-h-screen p-4">
        <div className="mx-auto max-w-6xl space-y-7">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2 w-full max-w-full">
              <SearchInput value={query} onChange={setQuery} placeholder="ค้นหา ชื่อ | รหัสนักศึกษา" />
            </div>
          </div>

          {/* Pagination Controls */}
          <div className="flex items-center justify-between">
            <div className="text-sm text-gray-600">{totalItems} รายการ</div>
            <div className="flex items-center gap-2">
              <PageSizeSelect value={itemsPerPage} onChange={(v) => { setItemsPerPage(v); setCurrentPage(1); }} totalItems={totalItems} options={[5, 10, 20, 50]} />
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
            <div className="p-6 text-sm text-gray-500 bg-white rounded-xl border">กำลังโหลดคำขอ...</div>
          ) : error ? (
            <div className="p-6 text-sm text-red-600 bg-white rounded-xl border">{error}</div>
          ) : filtered.length === 0 ? (
            <div className="p-12 bg-white rounded-xl border text-center text-gray-600">
              <Inbox className="w-12 h-12 text-gray-300 mx-auto mb-4" />
              <div className="text-sm">ยังไม่มีคำขอ</div>
            </div>
          ) : (
            <div className="space-y-3">
              {paginated.map(req => {
                const isOpen = expandedId === req.id;
                const hasSeen = seenRequestIds.has(req.id);
                return (
                  <div key={req.id} className={`bg-white border rounded-xl ${!hasSeen ? 'border-red-300' : 'border-gray-200'}`}>
                    {/* Handle */}
                    <div
                      className="flex items-center justify-between p-4 cursor-pointer"
                      onClick={() => {
                        setExpandedId(isOpen ? null : req.id);
                        setSeenRequestIds(prev => new Set(prev).add(req.id));
                      }}
                    >
                      <div className="flex items-center gap-3">
                        {isOpen ? <ChevronDown className="w-5 h-5 text-gray-500" /> : <ChevronRight className="w-5 h-5 text-gray-500" />}
                        <div>
                          <div className="font-semibold text-gray-900 flex items-center gap-2">
                            <User className="w-4 h-4 text-blue-600" /> {req.fullname} | {req.student_id}
                          </div>
                          <div className="text-xs text-gray-500">ยืม {getDurationDays(req.borrow_date as any, req.return_date as any)} วัน | คืนวันที่: {formatThaiDate(req.return_date)} | ส่งคำขอ: {formatThaiDateTime(req.request_date)} </div>

                        </div>
                      </div>
                      {!hasSeen && <span className="inline-block w-2.5 h-2.5 rounded-full bg-red-500" title="คำขอใหม่" />}
                      <div className="flex items-center gap-2">
                        <button className="px-3 py-1 rounded-md text-white bg-[#0EA5E9] hover:bg-[#0EA5E9]/90 flex items-center gap-1" onClick={(e) => { e.stopPropagation(); handleApprove(req.id); }}>
                          <Check className="w-4 h-4" /> อนุมัติ
                        </button>
                        <button className="px-3 py-1 rounded-md text-white bg-red-600 hover:bg-red-700 flex items-center gap-1" onClick={(e) => { e.stopPropagation(); handleReject(req.id); }}>
                          <X className="w-4 h-4" /> ปฏิเสธ
                        </button>
                      </div>
                    </div>
                    {/* Content */}
                    <div className={`px-4 transition-all duration-500 ease-in-out ${isOpen ? 'max-h-[320px] opacity-100 pb-4' : 'max-h-0 opacity-0'} overflow-hidden`}>
                      <div className="bg-gray-50 rounded-lg p-3">
                        <div className="max-h-60 overflow-y-auto">
                          <ol className="space-y-1 text-sm text-gray-700">
                            {(req.items || []).map((it, idx) => (
                              <li key={it.id}>
                                <div className="flex items-center justify-between gap-3">
                                  <span className="w-6 text-gray-500">{idx + 1}.</span>
                                  <span className="flex-1 font-medium truncate">{it.equipment_name}</span>
                                  <span className="whitespace-nowrap">× {it.quantity_requested}</span>
                                </div>
                              </li>
                            ))}
                          </ol>
                        </div>
                        {req.notes && (
                          <div className="mt-3 text-sm text-gray-700">
                            <span className="font-medium">หมายเหตุ:</span> {req.notes}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </MainLayout>
  );
};

export default BorrowRequests;


