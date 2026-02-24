import React, { useEffect, useState } from 'react';
import { MainLayout } from '../../components/Layout';
import { apiService, BorrowRequest, User } from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';
import { CheckCircle2, Clock4, XCircle } from 'lucide-react';

const formatThaiDate = (value?: string) => {
  if (!value) return '-';
  const d = new Date(value);
  if (isNaN(d.getTime())) return '-';
  const day = d.getDate();
  const month = d.getMonth() + 1;
  const buddhistYear = d.getFullYear() + 543;
  return `${day}/${month}/${buddhistYear}`;
};

const daysBetween = (a?: string, b?: string) => {
  if (!a || !b) return 0;
  const da = new Date(a).getTime();
  const db = new Date(b).getTime();
  if (isNaN(da) || isNaN(db)) return 0;
  return Math.max(0, Math.ceil((db - da) / (1000 * 60 * 60 * 24)));
};

const statusBadge = (status: BorrowRequest['status']) => {
  if (status === 'approved' || status === 'completed') {
    return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700"><CheckCircle2 className="w-3 h-3" /> อนุมัติ</span>;
  }
  if (status === 'rejected') {
    return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-700"><XCircle className="w-3 h-3" /> ปฏิเสธ</span>;
  }
  return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-700"><Clock4 className="w-3 h-3" /> รอดำเนินการ</span>;
};

const MyRequests: React.FC = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [requests, setRequests] = useState<BorrowRequest[]>([]);

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        setError(null);
        const [reqRes, usersRes] = await Promise.all([
          apiService.listBorrowRequests(),
          apiService.listUsers(),
        ]);
        const all = (reqRes as any).data?.requests || [];
        const users: User[] = (usersRes as any).data?.users || [];
        // Build map with both number and string keys to handle API type differences
        const idToName = new Map<string, string>();
        users.forEach(u => {
          idToName.set(String(u.id), u.fullname);
        });

        const mine = all
          .filter((r: BorrowRequest) => r.user_id === user?.id)
          .map((r: BorrowRequest) => {
            const key = r.approver_id !== undefined && r.approver_id !== null ? String(r.approver_id as any) : '';
            const nameFromId = key ? (idToName.get(key) || '') : '';
            return {
              ...r,
              approver_name: r.approver_name || nameFromId || r.approver_name
            } as BorrowRequest;
          });
        mine.sort((a: BorrowRequest, b: BorrowRequest) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
        setRequests(mine);
      } catch (e: any) {
        setError(e.message || 'โหลดข้อมูลไม่สำเร็จ');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [user?.id]);



  return (
    <MainLayout>
      <div className="p-4">
        <div className="mx-auto max-w-5xl space-y-4">

          {/* Requests list */}
          <div className="bg-white border rounded-xl">
            <div className="p-4 border-b text-sm font-medium text-gray-700">คำขอยืมทั้งหมดของฉัน</div>
            {loading ? (
              <div className="p-6 text-sm text-gray-500">กำลังโหลด...</div>
            ) : error ? (
              <div className="p-6 text-sm text-red-600">{error}</div>
            ) : requests.length === 0 ? (
              <div className="p-6 text-sm text-gray-500">ยังไม่มีคำขอยืม</div>
            ) : (
              <ul className="divide-y">
                {requests.map((r) => {
                  const totalDays = daysBetween(r.borrow_date, r.return_date);
                  return (
                    <li key={r.id} className="p-4">
                      <div className="flex items-center justify-between">
                        <div className="space-y-1">
                          <div className="text-sm text-gray-900">ส่งคำขอเมื่อวันที่ {formatThaiDate(r.created_at)}</div>
                          <div className="text-sm text-gray-600">ยืมจำนวน {totalDays} วัน ต้องคืนภายในวันที่ {formatThaiDate(r.return_date)}</div>
                          {(r.status === 'approved' || r.status === 'completed') && (
                            <div className="text-xs text-gray-600">อนุมัติโดย: {r.approver_name ?? '-'}</div>
                          )}
                        </div>
                        <div>{statusBadge(r.status)}</div>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </div>
      </div>
    </MainLayout>
  );
};

export default MyRequests;
