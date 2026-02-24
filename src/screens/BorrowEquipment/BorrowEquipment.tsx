import React, { useState, useEffect, useMemo } from "react";
import { MainLayout } from '../../components/Layout';
import { EquipmentCard, EquipmentStatus } from "../../components/ui/EquipmentCard";
import { BorrowRequestModal } from "../../components/borrow-requests/BorrowRequestModal";
import { apiService } from "../../services/api";
import { ShoppingCart, Trash2 } from "lucide-react";
import Swal from 'sweetalert2';
import SearchInput from "../../components/ui/SearchInput";
import PageSizeSelect from "../../components/ui/PageSizeSelect";

interface EquipmentItem {
  id: number;
  name: string;
  category: string;
  quantity: number;
  status: EquipmentStatus;
  image_url?: string;
  description?: string;
  quantity_total?: number;
  quantity_available?: number;
}

interface SelectedEquipment {
  id: number;
  name: string;
  category: string;
  quantity_available: number;
  image_url?: string;
  description?: string;
  selected_quantity: number;
}

export const BorrowEquipment: React.FC = () => {
  const [items, setItems] = useState<EquipmentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [selectedItems, setSelectedItems] = useState<SelectedEquipment[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>("");
  const [showBorrowModal, setShowBorrowModal] = useState(false);

  // Pagination state
  const [itemsPerPage, setItemsPerPage] = useState(50);
  const [currentPage, setCurrentPage] = useState(1);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await apiService.listEquipment();
      const data = res.data.equipment.map((e: any) => ({
        id: e.id,
        name: e.name,
        category: e.category,
        quantity: e.quantity_available ?? e.quantity_total ?? 0,
        status: (e.status as EquipmentStatus) ?? 'available',
        image_url: e.image_url,
        description: e.description,
        quantity_total: e.quantity_total,
        quantity_available: e.quantity_available,
      }));
      setItems(data);
    } catch (e: any) {
      setError(e.message || "โหลดข้อมูลไม่สำเร็จ");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    let filteredItems = items;

    // กรองตามหมวดหมู่
    if (selectedCategory) {
      filteredItems = filteredItems.filter(item => item.category === selectedCategory);
    }

    // กรองตามคำค้นหา
    if (q) {
      filteredItems = filteredItems.filter((it) =>
        it.name.toLowerCase().includes(q) ||
        it.category.toLowerCase().includes(q) ||
        it.description?.toLowerCase().includes(q)
      );
    }

    return filteredItems;
  }, [items, query, selectedCategory]);

  // ดึงรายการหมวดหมู่ที่ไม่ซ้ำ
  const categories = useMemo(() => {
    const uniqueCategories = Array.from(new Set(items.map(item => item.category).filter(Boolean)));
    return uniqueCategories.sort();
  }, [items]);

  const totalItems = filtered.length;
  const totalPages = Math.ceil(totalItems / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedItems = filtered.slice(startIndex, endIndex);

  const handleEquipmentSelect = (item: EquipmentItem) => {
    // ตรวจสอบว่าอุปกรณ์พร้อมยืมหรือไม่ (ยืมได้เมื่อสถานะ available หรือ limited และมีจำนวนคงเหลือ > 0)
    if ((item.status !== 'available' && item.status !== 'limited') || item.quantity_available === 0) {
      return;
    }

    // ตรวจสอบว่าอุปกรณ์นี้ถูกเลือกแล้วหรือไม่
    const existingItem = selectedItems.find(selected => selected.id === item.id);

    if (existingItem) {
      // ถ้าเลือกแล้ว ให้เพิ่มจำนวน 1 ชิ้น
      if (existingItem.selected_quantity < (item.quantity_available || 0)) {
        setSelectedItems(prev => prev.map(selected =>
          selected.id === item.id
            ? { ...selected, selected_quantity: selected.selected_quantity + 1 }
            : selected
        ));
      }
    } else {
      // ถ้ายังไม่เลือก ให้เพิ่มเข้าไป 1 ชิ้น
      setSelectedItems(prev => [...prev, {
        id: item.id,
        name: item.name,
        category: item.category,
        quantity_available: item.quantity_available || 0,
        image_url: item.image_url,
        description: item.description,
        selected_quantity: 1,
      }]);
    }
  };

  const handleRemoveSelected = (id: number) => {
    setSelectedItems(prev => prev.filter(item => item.id !== id));
  };

  const handleIncreaseQuantity = (id: number, maxAvailable: number) => {
    setSelectedItems(prev => prev.map(item =>
      item.id === id && item.selected_quantity < maxAvailable
        ? { ...item, selected_quantity: item.selected_quantity + 1 }
        : item
    ));
  };

  const handleDecreaseQuantity = (id: number) => {
    setSelectedItems(prev => prev.map(item =>
      item.id === id && item.selected_quantity > 1
        ? { ...item, selected_quantity: item.selected_quantity - 1 }
        : item
    ).filter(item => item.selected_quantity > 0));
  };

  const handleBorrowRequest = () => {
    if (selectedItems.length === 0) {
      alert('กรุณาเลือกอุปกรณ์ที่ต้องการยืม');
      return;
    }

    setShowBorrowModal(true);
  };

  const handleSubmitBorrowRequest = async (data: {
    borrow_date: string;
    return_date: string;
    notes: string;
    items: Array<{
      equipment_id: number;
      quantity: number;
    }>;
  }) => {
    try {
      const currentUser = apiService.getCurrentUser();
      if (!currentUser) {
        await Swal.fire({
          icon: 'warning',
          title: 'กรุณาเข้าสู่ระบบ',
          text: 'กรุณาเข้าสู่ระบบก่อนทำรายการ',
          confirmButtonText: 'ตกลง',
          confirmButtonColor: '#0EA5E9'
        });
        return;
      }

      const requestData = {
        user_id: currentUser.id,
        borrow_date: data.borrow_date,
        return_date: data.return_date,
        notes: data.notes,
        items: data.items
      };

      await apiService.createBorrowRequest(requestData);

      // รีเซ็ตข้อมูล
      setSelectedItems([]);
      setShowBorrowModal(false);

      await Swal.fire({
        icon: 'success',
        title: 'สำเร็จ!',
        text: 'ส่งคำขอยืมเรียบร้อยแล้ว',
        confirmButtonText: 'ตกลง',
        confirmButtonColor: '#0EA5E9'
      });


    } catch (error) {
      console.error('Error creating borrow request:', error);
      await Swal.fire({
        icon: 'error',
        title: 'ผิดพลาด',
        text: 'เกิดข้อผิดพลาดในการส่งคำขอ กรุณาลองใหม่อีกครั้ง',
        confirmButtonText: 'ตกลง',
        confirmButtonColor: '#0EA5E9'
      });
    }
  };

  if (loading) {
    return (
      <MainLayout>
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div>
            <p className="mt-4 text-gray-600">กำลังโหลดข้อมูล...</p>
          </div>
        </div>
      </MainLayout>
    );
  }

  if (error) {
    return (
      <MainLayout>
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <div className="text-red-500 text-6xl mb-4">⚠️</div>
            <p className="text-red-600 text-lg">{error}</p>
            <button
              onClick={fetchData}
              className="mt-4 px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600"
            >
              ลองใหม่
            </button>
          </div>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <style>
        {`
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
          
          @keyframes slideInFromRight {
            from {
              transform: translateX(100%);
              opacity: 0;
            }
            to {
              transform: translateX(0);
              opacity: 1;
            }
          }
          .animate-slide-in-right {
            animation: slideInFromRight 0.3s ease-out forwards;
          }
        `}
      </style>
      <div className="flex-1 flex flex-col overflow-hidden">



        {/* Main Content */}
        <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
          {/* Left Side - Equipment List */}
          <div className="flex-1 flex flex-col overflow-hidden">
            {/* Search and Controls */}
            <div className="p-2 sm:p-4 bg-white border-b">
              <div className="flex items-center gap-2">
                <div className="flex-1">
                  <SearchInput value={query} onChange={setQuery} placeholder="ค้นหาอุปกรณ์ตามชื่อ..." />
                </div>

                {/* ช่องเลือกหมวดหมู่ */}
                <div className="min-w-[120px]">
                  <select
                    value={selectedCategory}
                    onChange={(e) => setSelectedCategory(e.target.value)}
                    className="w-full px-1.5 py-1 text-xs border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="">ทุกหมวดหมู่</option>
                    {categories.map((category) => (
                      <option key={category} value={category}>
                        {category}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Pagination Controls */}
              <div className="flex items-center justify-end gap-1.5 mt-2">
                <PageSizeSelect value={itemsPerPage} onChange={(v) => { setItemsPerPage(v); setCurrentPage(1); }} totalItems={totalItems} options={[5, 10, 20, 50]} />
                <button
                  onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                  disabled={currentPage === 1}
                  className="px-1.5 py-0.5 text-xs border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  ก่อนหน้า
                </button>
                <span className="px-1.5 text-xs text-gray-600 whitespace-nowrap">หน้า {currentPage} จาก {totalPages}</span>
                <button
                  onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                  disabled={currentPage === totalPages}
                  className="px-1.5 py-0.5 text-xs border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  ถัดไป
                </button>
              </div>
            </div>

            {/* Equipment Grid */}
            <div className="flex-1 p-1 sm:p-4">
              <div className="h-[600px] overflow-y-auto border border-gray-200 rounded-lg bg-gray-50 p-2">
                <div className="grid grid-cols-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-1 sm:gap-3">
                  {paginatedItems.map((item, index) => {
                    const isSelected = selectedItems.some(selected => selected.id === item.id);
                    const isAvailable = (item.status === 'available' || item.status === 'limited') && (item.quantity_available || 0) > 0;

                    return (
                      <div
                        key={item.id}
                        className={`relative ${isSelected ? 'ring-2 ring-[#0EA5E9] rounded-xl' : ''} ${!isAvailable ? 'opacity-50' : ''} animate-fade-in-up transition-all hover:shadow-lg`}
                        style={{ animationDelay: `${index * 100}ms` }}
                      >
                        <EquipmentCard
                          name={item.name}
                          category={item.category}
                          quantityAvailable={item.quantity_available ?? item.quantity}
                          quantityTotal={item.quantity_total ?? item.quantity}
                          status={item.status}
                          imageUrl={item.image_url}
                          onSelect={() => handleEquipmentSelect(item)}
                        />
                        {isSelected && (
                          <div className="absolute top-2 right-2 bg-blue-500 text-white rounded-full w-8 h-8 flex items-center justify-center text-sm font-bold">
                            {selectedItems.find(selected => selected.id === item.id)?.selected_quantity || 0}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>

          {/* Right Side - Selected Items */}
          <div className="w-full lg:w-80 bg-white border-t lg:border-t-0 lg:border-l flex flex-col">
            <div className="p-2 sm:p-4 border-b flex flex-col items-center gap-2">
              <div className="w-full flex items-center justify-between text-xs text-gray-600">
                <span>จำนวนทั้งหมด</span>
                <span className="text-[10px] sm:text-xs">
                  {selectedItems.length} รายการ | {selectedItems.reduce((s, it) => s + it.selected_quantity, 0)} ชิ้น
                </span>
              </div>
              <button
                onClick={handleBorrowRequest}
                disabled={selectedItems.length === 0}
                className="w-full bg-[#0EA5E9] text-white px-2 sm:px-4 py-2 sm:py-4 rounded-lg sm:rounded-xl text-sm sm:text-lg font-semibold hover:bg-[#0284C7] disabled:opacity-50 disabled:cursor-not-allowed"
                aria-label="ส่งคำขอยืม"
              >
                ส่งคำขอยืม
              </button>
            </div>

            <div className="p-2 sm:p-4">
              <div className="rounded-xl bg-white">
                {selectedItems.length === 0 ? (
                  <div className="text-center text-gray-500 py-8 sm:py-10">
                    <ShoppingCart className="h-10 w-10 sm:h-12 sm:w-12 mx-auto mb-3 sm:mb-4 text-gray-300" />
                    <p className="text-sm sm:text-base">ยังไม่ได้เลือกอุปกรณ์</p>
                    <p className="text-xs sm:text-sm">คลิกที่อุปกรณ์เพื่อเลือก</p>
                  </div>
                ) : (
                  <div className="max-h-[400px] sm:max-h-[520px] overflow-y-auto p-2 sm:p-3 space-y-2 sm:space-y-3">
                    {selectedItems.map((item, index) => (
                      <div key={item.id} className="border rounded-lg p-2 sm:p-3 bg-[#F0F9FF] animate-slide-in-right transition-all hover:shadow-md" style={{ animationDelay: `${index * 50}ms` }}>
                        <div className="flex items-start gap-2 sm:gap-3">
                          <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gray-200 rounded-lg flex items-center justify-center flex-shrink-0">
                            {item.image_url ? (
                              <img
                                src={item.image_url}
                                alt={item.name}
                                className="w-full h-full object-cover rounded-lg"
                              />
                            ) : (
                              <svg className="w-5 h-5 sm:w-6 sm:h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                              </svg>
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <h3 className="font-medium text-xs sm:text-sm truncate">{item.name}</h3>
                            <p className="text-xs text-gray-500">{item.category}</p>
                            <p className="text-xs text-gray-600 mt-1">
                              คงเหลือ: {item.quantity_available} ชิ้น
                            </p>

                            {/* ปุ่มควบคุมจำนวน */}
                            <div className="flex items-center gap-1 sm:gap-2 mt-2">
                              <button
                                onClick={() => handleDecreaseQuantity(item.id)}
                                className="w-5 h-5 sm:w-6 sm:h-6 bg-gray-200 hover:bg-gray-300 rounded-full flex items-center justify-center text-xs"
                              >
                                -
                              </button>
                              <span className="text-xs sm:text-sm font-medium min-w-[16px] sm:min-w-[20px] text-center">
                                {item.selected_quantity}
                              </span>
                              <button
                                onClick={() => handleIncreaseQuantity(item.id, item.quantity_available || 0)}
                                disabled={item.selected_quantity >= (item.quantity_available || 0)}
                                className="w-5 h-5 sm:w-6 sm:h-6 bg-gray-200 hover:bg-gray-300 rounded-full flex items-center justify-center text-xs disabled:opacity-50 disabled:cursor-not-allowed"
                              >
                                +
                              </button>
                            </div>
                          </div>
                          <button
                            onClick={() => handleRemoveSelected(item.id)}
                            className="text-red-500 hover:text-red-700 p-1 flex-shrink-0"
                            aria-label="ลบรายการ"
                          >
                            <Trash2 className="w-3 h-3 sm:w-4 sm:h-4" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

          </div>
        </div>
      </div>

      {/* Borrow Request Modal */}
      <BorrowRequestModal
        isOpen={showBorrowModal}
        onClose={() => setShowBorrowModal(false)}
        selectedItems={selectedItems}
        onSubmit={handleSubmitBorrowRequest}
      />
    </MainLayout>
  );
};

