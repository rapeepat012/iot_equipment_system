import React, { useEffect, useMemo, useState } from 'react';
import { MainLayout } from '../../components/Layout';
import { apiService } from '../../services/api';
import { User, Package, CheckCircle, ChevronDown, ChevronRight } from 'lucide-react';
import SearchInput from '../../components/ui/SearchInput';
import PageSizeSelect from '../../components/ui/PageSizeSelect';
import { useAuth } from '../../contexts/AuthContext';

interface HistoryEntry {
  borrowing_id: number;
  user_id: number;
  user_fullname: string;
  user_student_id: string;
  borrow_date: string;
  due_date: string;
  return_date?: string;
  status: string;
  notes?: string;
  borrowing_count: number;
  equipment_count: number;
  equipment_names: string;
  equipment_details: string[];
  categories: string;
  approver_name: string;
  request_time?: string;
  action_type: 'borrow' | 'return';
}

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

export const History: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [entries, setEntries] = useState<HistoryEntry[]>([]);
  const [query, setQuery] = useState('');
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [activeTab, setActiveTab] = useState<'all' | 'borrow' | 'return'>('all');
  // Pagination
  const [itemsPerPage, setItemsPerPage] = useState<number>(50);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const { user } = useAuth();

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await apiService.raw<{ success: boolean; data: { history: HistoryEntry[] } }>('/borrowing_history.php', { method: 'GET' });
      const data = (res as any).data?.history || [];
      setEntries(data);
    } catch (e: any) {
      setError(e.message || 'โหลดประวัติไม่สำเร็จ');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  const filtered = useMemo(() => {
    let filteredEntries = entries;
    // Role-based filter: users see only their own history
    if (user?.role === 'user') {
      filteredEntries = filteredEntries.filter(e => (
        e.user_id === user.id || e.user_student_id === user.student_id
      ));
    }

    // Filter by tab
    if (activeTab === 'borrow') {
      filteredEntries = filteredEntries.filter(e => e.status !== 'returned');
    } else if (activeTab === 'return') {
      filteredEntries = filteredEntries.filter(e => e.status === 'returned');
    }

    // Filter by search query
    const q = query.trim().toLowerCase();
    if (q) {
      filteredEntries = filteredEntries.filter(e =>
        [e.user_fullname, e.user_student_id, e.equipment_names, e.approver_name].some(v =>
          String(v ?? '').toLowerCase().includes(q)
        )
      );
    }

    return filteredEntries;
  }, [entries, query, activeTab, user]);

  const totalItems = filtered.length;
  const totalPages = Math.ceil(totalItems / itemsPerPage) || 1;
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginated = filtered.slice(startIndex, endIndex);
  React.useEffect(() => { setCurrentPage(1); }, [query, activeTab]);

  return (
    <MainLayout>
      <div className="min-h-screen p-4">
        <div className="mx-auto max-w-6xl space-y-4">
          {/* Tab Navigation */}
          <div className="flex space-x-1 bg-gray-100 p-1 rounded-lg">
            <button
              onClick={() => setActiveTab('all')}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${activeTab === 'all'
                ? 'bg-white text-blue-600 shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
                }`}
            >
              ทั้งหมด
            </button>
            <button
              onClick={() => setActiveTab('borrow')}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${activeTab === 'borrow'
                ? 'bg-white text-blue-600 shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
                }`}
            >
              การยืม
            </button>
            <button
              onClick={() => setActiveTab('return')}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${activeTab === 'return'
                ? 'bg-white text-blue-600 shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
                }`}
            >
              การคืน
            </button>
          </div>

          <div className="flex items-center justify-between gap-3">
            <div className="w-full max-w-sm">
              <SearchInput value={query} onChange={setQuery} placeholder="ค้นหา ผู้ยืม | รหัส | อุปกรณ์ | ผู้อนุมัติ" />
            </div>
          </div>

          {/* Pagination Controls */}
          <div className="flex items-center justify-between">
            <div className="text-sm text-gray-600">{totalItems} รายการ</div>
            <div className="flex items-center gap-2">
              <PageSizeSelect value={itemsPerPage} onChange={(v) => { setItemsPerPage(v); setCurrentPage(1); }} totalItems={totalItems} options={[5, 10, 15, 20, 50]} />
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
            <div className="p-6 text-sm text-gray-500 bg-white rounded-xl border">กำลังโหลด...</div>
          ) : error ? (
            <div className="p-6 text-sm text-red-600 bg-white rounded-xl border">{error}</div>
          ) : (
            <div className="space-y-3">
              {paginated.map(h => {
                const isOpen = expandedId === h.borrowing_id;
                return (
                  <div key={h.borrowing_id} className="bg-white border rounded-xl">
                    {/* Handle */}
                    <div className="flex items-center justify-between p-4 cursor-pointer" onClick={() => setExpandedId(isOpen ? null : h.borrowing_id)}>
                      <div className="flex items-center gap-3">
                        {isOpen ? <ChevronDown className="w-5 h-5 text-gray-500" /> : <ChevronRight className="w-5 h-5 text-gray-500" />}
                        <div>
                          <div className="font-semibold text-gray-900 flex items-center gap-2">
                            <User className="w-4 h-4 text-blue-600" /> {h.user_fullname} | {h.user_student_id}
                          </div>
                          <div className="text-xs text-gray-500">
                            <span className="inline-flex items-center gap-1">
                              <Package className="w-3 h-3" />
                              {h.status === 'returned' ? 'คืนอุปกรณ์' : 'ยืมอุปกรณ์'} {h.equipment_count} รายการ ({h.borrowing_count} ชิ้น)
                            </span>
                            <span className="mx-2">•</span>
                            <span className="inline-flex items-center gap-1">
                              <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${h.status === 'returned'
                                ? 'bg-green-100 text-green-700'
                                : h.status === 'overdue'
                                  ? 'bg-red-100 text-red-700'
                                  : 'bg-yellow-100 text-yellow-700'
                                }`}>
                                <CheckCircle className="w-3 h-3 mr-1" />
                                {h.status === 'returned' ? 'คืนแล้ว' : h.status === 'overdue' ? 'เกินกำหนด' : 'กำลังยืมอยู่'}
                              </span>
                            </span>
                            <span className="mx-2">•</span>
                            {h.status === 'returned' && h.return_date
                              ? formatThaiDateTime(h.return_date)
                              : formatThaiDateTime(h.request_time || h.borrow_date)
                            }
                          </div>
                        </div>
                      </div>
                      <div>
                        <span className="text-sm text-gray-600">อนุมัติโดย: {h.approver_name}</span>
                      </div>
                    </div>

                    {/* Expanded Content */}
                    <div className={`px-4 transition-all duration-300 ease-in-out ${isOpen ? 'max-h-[500px] opacity-100 pb-4' : 'max-h-0 opacity-0'} overflow-hidden`}>
                      <div className="bg-gray-50 rounded-lg overflow-hidden">
                        <div className="p-4">
                          <h4 className="font-medium text-gray-900 mb-2">
                            {h.status === 'returned' ? 'รายละเอียดการคืน' : 'รายละเอียดการยืม'}
                          </h4>
                          <dl className="grid grid-cols-2 gap-4">
                            <div>
                              <dt className="text-sm font-medium text-gray-500">
                                {h.status === 'returned' ? 'อุปกรณ์ที่คืน' : 'อุปกรณ์ที่ยืม'}
                              </dt>
                              <dd className="mt-1 text-sm text-gray-900">
                                {h.equipment_details && h.equipment_details.length > 0 ? (
                                  <ol className="list-decimal list-inside space-y-1">
                                    {h.equipment_details.map((equipment, index) => (
                                      <li key={index} className="text-gray-900">
                                        {equipment}
                                      </li>
                                    ))}
                                  </ol>
                                ) : (
                                  <span className="text-gray-500">ไม่มีข้อมูลอุปกรณ์</span>
                                )}
                              </dd>
                            </div>
                            <div>
                              <dt className="text-sm font-medium text-gray-500">อนุมัติโดย</dt>
                              <dd className="mt-1 text-sm text-gray-900">{h.approver_name}</dd>
                            </div>
                            <div>
                              <dt className="text-sm font-medium text-gray-500">
                                {h.status === 'returned' ? 'วันที่คืน' : 'วันที่ยืม'}
                              </dt>
                              <dd className="mt-1 text-sm text-gray-900">
                                {h.status === 'returned' && h.return_date
                                  ? formatThaiDateTime(h.return_date)
                                  : formatThaiDateTime(h.borrow_date).split(' ')[0]
                                }
                              </dd>
                            </div>
                            {h.status !== 'returned' && (
                              <div>
                                <dt className="text-sm font-medium text-gray-500">วันที่ครบกำหนด</dt>
                                <dd className="mt-1 text-sm text-gray-900">{formatThaiDateTime(h.due_date).split(' ')[0]}</dd>
                              </div>
                            )}
                            <div>
                              <dt className="text-sm font-medium text-gray-500">สถานะ</dt>
                              <dd className="mt-1">
                                <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${h.status === 'returned'
                                  ? 'bg-green-100 text-green-700'
                                  : h.status === 'overdue'
                                    ? 'bg-red-100 text-red-700'
                                    : 'bg-yellow-100 text-yellow-700'
                                  }`}>
                                  {h.status === 'returned' ? 'คืนแล้ว' : h.status === 'overdue' ? 'เกินกำหนด' : 'กำลังยืมอยู่'}
                                </span>
                              </dd>
                            </div>
                          </dl>
                        </div>
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

export default History;



