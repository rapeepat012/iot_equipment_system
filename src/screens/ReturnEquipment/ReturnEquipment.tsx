import React, { useEffect, useState, useMemo } from 'react';
import { MainLayout } from '../../components/Layout';
import { apiService, type Borrower } from '../../services/api';
import { Package, Calendar, AlertCircle, CheckCircle, Clock } from 'lucide-react';
import SearchInput from '../../components/ui/SearchInput';
import PageSizeSelect from '../../components/ui/PageSizeSelect';
import { ReturnEquipmentModal } from '../../components/equipment/modals/ReturnEquipmentModal';
import Swal from 'sweetalert2';

const formatThaiDate = (value: string | number | Date) => {
  const d = new Date(value);
  if (isNaN(d.getTime())) return '';
  const day = d.getDate();
  const month = d.getMonth() + 1;
  const buddhistYear = d.getFullYear() + 543;
  return `${day}/${month}/${buddhistYear}`;
};

export const ReturnEquipment: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [borrowers, setBorrowers] = useState<Borrower[]>([]);
  const [query, setQuery] = useState('');
  const [selectedBorrower, setSelectedBorrower] = useState<Borrower | null>(null);
  const [showReturnModal, setShowReturnModal] = useState(false);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [borrowerDetails, setBorrowerDetails] = useState<any>(null);
  // Pagination
  const [itemsPerPage, setItemsPerPage] = useState<number>(50);
  const [currentPage, setCurrentPage] = useState<number>(1);
  // Status filter: 'all' | 'overdue' | 'warning' | 'normal'
  const [statusFilter, setStatusFilter] = useState<'all' | 'overdue' | 'warning' | 'normal'>('all');

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await apiService.listActiveBorrowers();
      setBorrowers(res.data.borrowers || []);
    } catch (e: any) {
      setError(e.message || 'โหลดข้อมูลไม่สำเร็จ');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    let list = borrowers;
    if (statusFilter !== 'all') {
      list = list.filter(b => b.status === statusFilter);
    }
    if (!q) return list;
    return list.filter(b =>
      b.fullname.toLowerCase().includes(q) ||
      b.student_id.toLowerCase().includes(q)
    );
  }, [borrowers, query, statusFilter]);

  const totalItems = filtered.length;
  const totalPages = Math.ceil(totalItems / itemsPerPage) || 1;
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginated = filtered.slice(startIndex, endIndex);

  React.useEffect(() => { setCurrentPage(1); }, [query, statusFilter]);

  const stats = useMemo(() => {
    const total = borrowers.length;
    const overdue = borrowers.filter(b => b.status === 'overdue').length;
    const warning = borrowers.filter(b => b.status === 'warning').length;
    const normal = borrowers.filter(b => b.status === 'normal').length;

    return { total, overdue, warning, normal };
  }, [borrowers]);

  const handleReturnClick = (borrower: Borrower) => {
    setSelectedBorrower(borrower);
    setShowReturnModal(true);
  };

  const handleCardClick = async (borrower: Borrower) => {
    try {
      const res = await apiService.getBorrowerDetails(borrower.borrowing_id);
      setBorrowerDetails(res.data);
      setShowDetailsModal(true);
    } catch (error) {
      console.error('Error fetching borrower details:', error);
      Swal.fire({
        title: 'ผิดพลาด',
        text: 'ไม่สามารถโหลดรายละเอียดได้',
        icon: 'error',
        confirmButtonColor: '#0EA5E9',
      });
    }
  };

  const handleReturnSuccess = () => {
    setShowReturnModal(false);
    setSelectedBorrower(null);
    fetchData();
    Swal.fire({
      title: 'สำเร็จ',
      text: 'บันทึกการคืนอุปกรณ์เรียบร้อยแล้ว',
      icon: 'success',
      confirmButtonColor: '#0EA5E9'
    });
  };

  const getStatusBadge = (status: string, daysRemaining: number) => {
    if (status === 'overdue') {
      return (
        <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-red-100 text-red-700">
          <AlertCircle className="w-3 h-3 mr-1" />
          เกินกำหนด {Math.abs(daysRemaining)} วัน
        </span>
      );
    }
    if (status === 'warning') {
      return (
        <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-yellow-100 text-yellow-700">
          <Clock className="w-3 h-3 mr-1" />
          เหลือ {daysRemaining} วัน
        </span>
      );
    }
    return (
      <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-green-100 text-green-700">
        <CheckCircle className="w-3 h-3 mr-1" />
        เหลือ {daysRemaining} วัน
      </span>
    );
  };

  const getStatusColor = (status: string) => {
    if (status === 'overdue') return 'border-l-4 border-red-500 bg-red-50';
    if (status === 'warning') return 'border-l-4 border-yellow-500 bg-yellow-50';
    return 'border-l-4 border-green-500 bg-white';
  };

  return (
    <MainLayout>
      <style>
        {`
          @keyframes slideInFromRight {
            from {
              transform: translateX(100%);
            }
            to {
              transform: translateX(0);
            }
          }
          .slide-in-right {
            animation: slideInFromRight 0.3s ease-out;
          }
          
          @keyframes fadeInUp {
            from {
              opacity: 0;
              transform: translateY(20px);
            }
            to {
              opacity: 1;
              transform: translateY(0);
            }
          }
          .animate-fade-in-up {
            animation: fadeInUp 0.5s ease-out forwards;
            opacity: 0;
          }
        `}
      </style>
      <div className="min-h-screen p-6">
        <div className="mx-auto max-w-7xl space-y-6">
          {/* Header (removed refresh button) */}
          <div className="flex items-center justify-between">
            <div></div>
          </div>

          {/* Stats Cards (click to filter) */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <button
              type="button"
              onClick={() => setStatusFilter(prev => prev === 'all' ? 'all' : 'all')}
              className={`text-left bg-white rounded-xl shadow-sm p-6 border transition ${statusFilter === 'all' ? 'border-sky-400 ring-2 ring-sky-100' : 'border-gray-200 hover:border-gray-300'}`}
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">ผู้ยืมทั้งหมด</p>
                  <p className="text-3xl font-bold text-gray-900 mt-2">{stats.total}</p>
                </div>
                <div className="p-3 bg-blue-100 rounded-lg">
                  <Package className="w-6 h-6 text-blue-600" />
                </div>
              </div>
            </button>

            <button
              type="button"
              onClick={() => setStatusFilter(prev => prev === 'overdue' ? 'all' : 'overdue')}
              className={`text-left bg-white rounded-xl shadow-sm p-6 border transition ${statusFilter === 'overdue' ? 'border-red-400 ring-2 ring-red-100' : 'border-gray-200 hover:border-gray-300'}`}
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">คืนล่าช้า</p>
                  <p className="text-3xl font-bold text-red-600 mt-2">{stats.overdue}</p>
                </div>
                <div className="p-3 bg-red-100 rounded-lg">
                  <AlertCircle className="w-6 h-6 text-red-600" />
                </div>
              </div>
            </button>

            <button
              type="button"
              onClick={() => setStatusFilter(prev => prev === 'warning' ? 'all' : 'warning')}
              className={`text-left bg-white rounded-xl shadow-sm p-6 border transition ${statusFilter === 'warning' ? 'border-yellow-400 ring-2 ring-yellow-100' : 'border-gray-200 hover:border-gray-300'}`}
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">ใกล้ครบกำหนด</p>
                  <p className="text-3xl font-bold text-yellow-600 mt-2">{stats.warning}</p>
                </div>
                <div className="p-3 bg-yellow-100 rounded-lg">
                  <Clock className="w-6 h-6 text-yellow-600" />
                </div>
              </div>
            </button>

            <button
              type="button"
              onClick={() => setStatusFilter(prev => prev === 'normal' ? 'all' : 'normal')}
              className={`text-left bg-white rounded-xl shadow-sm p-6 border transition ${statusFilter === 'normal' ? 'border-emerald-400 ring-2 ring-emerald-100' : 'border-gray-200 hover:border-gray-300'}`}
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">ปกติ</p>
                  <p className="text-3xl font-bold text-green-600 mt-2">{stats.normal}</p>
                </div>
                <div className="p-3 bg-green-100 rounded-lg">
                  <CheckCircle className="w-6 h-6 text-green-600" />
                </div>
              </div>
            </button>
          </div>

          {/* Search */}
          <div className="bg-white rounded-xl shadow-sm p-4 border border-gray-200">
            <SearchInput value={query} onChange={setQuery} placeholder="ค้นหา ชื่อ | รหัสนักศึกษา..." />
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

          {/* Borrowers List */}
          {loading ? (
            <div className="bg-white rounded-xl shadow-sm p-8 text-center border border-gray-200">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div>
              <p className="mt-4 text-gray-600">กำลังโหลดข้อมูล...</p>
            </div>
          ) : error ? (
            <div className="bg-white rounded-xl shadow-sm p-8 text-center border border-red-200">
              <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
              <p className="text-red-600">{error}</p>
            </div>
          ) : filtered.length === 0 ? (
            <div className="bg-white rounded-xl shadow-sm p-8 text-center border border-gray-200">
              <Package className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600">ไม่พบรายการผู้ยืม</p>
            </div>
          ) : (
            <div className="space-y-4">
              {paginated.map((borrower, index) => (
                <div
                  key={borrower.borrowing_id}
                  className={`bg-white rounded-xl shadow-sm overflow-hidden transition-all hover:shadow-md cursor-pointer ${getStatusColor(borrower.status)} animate-fade-in-up`}
                  style={{ animationDelay: `${index * 100}ms` }}
                  onClick={() => handleCardClick(borrower)}
                >
                  <div className="p-6">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        {/* User Info */}
                        <div className="mb-4">
                          <div className="flex items-center gap-3 mb-2">
                            <h3 className="text-xl font-semibold text-gray-900">
                              {borrower.fullname}
                            </h3>
                            <span className="text-sm text-gray-600">
                              รหัส: {borrower.student_id}
                            </span>
                            {getStatusBadge(borrower.status, borrower.days_remaining)}
                          </div>
                        </div>

                        {/* Equipment Info */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          <div className="flex items-center gap-2">
                            <Package className="w-5 h-5 text-gray-400" />
                            <div>
                              <p className="text-xs text-gray-500">จำนวนอุปกรณ์</p>
                              <p className="text-sm font-semibold text-gray-900">
                                {borrower.total_items} ชิ้น ({borrower.unique_equipment} รายการ)
                              </p>
                            </div>
                          </div>

                          <div className="flex items-center gap-2">
                            <Calendar className="w-5 h-5 text-gray-400" />
                            <div>
                              <p className="text-xs text-gray-500">วันที่ยืม</p>
                              <p className="text-sm font-semibold text-gray-900">
                                {formatThaiDate(borrower.borrow_date)}
                              </p>
                            </div>
                          </div>

                          <div className="flex items-center gap-2">
                            <Calendar className="w-5 h-5 text-gray-400" />
                            <div>
                              <p className="text-xs text-gray-500">วันที่ครบกำหนด</p>
                              <p className="text-sm font-semibold text-gray-900">
                                {formatThaiDate(borrower.due_date)}
                              </p>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Action Button */}
                      <div className="ml-4">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleReturnClick(borrower);
                          }}
                          className="px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors font-medium flex items-center gap-2 shadow-sm"
                        >
                          <CheckCircle className="w-5 h-5" />
                          คืนอุปกรณ์
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Return Modal */}
      {showReturnModal && selectedBorrower && (
        <ReturnEquipmentModal
          borrower={selectedBorrower}
          onClose={() => {
            setShowReturnModal(false);
            setSelectedBorrower(null);
          }}
          onSuccess={handleReturnSuccess}
        />
      )}

      {/* Details Slide Panel */}
      {showDetailsModal && borrowerDetails && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-50 animate-in fade-in duration-300"
          onClick={() => {
            setShowDetailsModal(false);
            setBorrowerDetails(null);
          }}
        >
          <div
            className="absolute right-0 top-0 h-full w-96 bg-white shadow-2xl transform transition-transform duration-300 ease-in-out slide-in-right"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
              <h3 className="text-lg font-semibold text-gray-900">รายการอุปกรณ์ที่ยืม</h3>
            </div>

            {/* Content */}
            <div className="h-full overflow-y-auto p-6">
              <div className="space-y-4">
                {borrowerDetails.items.map((item: any) => (
                  <div key={item.equipment_id} className="bg-gray-50 rounded-xl p-4 border border-gray-200">
                    <div className="flex items-center gap-4">
                      <div className="w-16 h-16 bg-white rounded-lg flex items-center justify-center shadow-sm">
                        {item.image_url ? (
                          <img
                            src={item.image_url}
                            alt={item.equipment_name}
                            className="w-full h-full object-cover rounded-lg"
                          />
                        ) : (
                          <Package className="w-8 h-8 text-gray-400" />
                        )}
                      </div>
                      <div className="flex-1">
                        <h4 className="text-lg font-semibold text-gray-900">
                          {item.equipment_name}
                        </h4>
                        <p className="text-sm text-gray-600 mb-2">
                          หมวดหมู่: {item.category}
                        </p>
                        <div className="flex items-center gap-2">
                          <Package className="w-4 h-4 text-gray-400" />
                          <span className="text-sm text-gray-600">จำนวนที่ยืม:</span>
                          <span className="text-sm font-semibold text-gray-900">
                            {item.quantity_borrowed} ชิ้น
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </MainLayout>
  );
};

export default ReturnEquipment;

