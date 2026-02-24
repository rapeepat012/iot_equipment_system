import React, { useMemo, useState } from 'react';
import { X, Calendar, Package, FileText } from 'lucide-react';
import { apiService } from '../../services/api';

interface BorrowRequestModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedItems: Array<{
    id: number;
    name: string;
    category: string;
    quantity_available: number;
    image_url?: string;
    description?: string;
    selected_quantity: number;
  }>;
  onSubmit: (data: {
    borrow_date: string;
    return_date: string;
    notes: string;
    items: Array<{
      equipment_id: number;
      quantity: number;
    }>;
  }) => void;
}

export const BorrowRequestModal: React.FC<BorrowRequestModalProps> = ({
  isOpen,
  onClose,
  selectedItems,
  onSubmit
}) => {
  const todayStr = useMemo(() => new Date().toISOString().split('T')[0], []);
  const maxReturnStr = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() + 7);
    return d.toISOString().split('T')[0];
  }, []);

  const currentUser = apiService.getCurrentUser();

  const [formData, setFormData] = useState({
    borrow_date: todayStr,
    return_date: '',
    notes: ''
  });

    const formatThaiDate = (value: string | number | Date) => {
    const d = new Date(value);
    if (isNaN(d.getTime())) return '';
    const day = d.getDate();
    const month = d.getMonth() + 1;
    const yearBuddhist = d.getFullYear() + 543;
    return `${day}/${month}/${yearBuddhist}`;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.borrow_date || !formData.return_date) {
      alert('กรุณาเลือกวันที่ยืมและวันที่คืน');
      return;
    }

    // borrow_date must be today
    if (formData.borrow_date !== todayStr) {
      alert('วันที่ต้องการยืมต้องเป็นวันปัจจุบันเท่านั้น');
      return;
    }

    // return must be after borrow and within 7 days
    const borrow = new Date(formData.borrow_date);
    const ret = new Date(formData.return_date);
    if (borrow >= ret) {
      alert('วันที่คืนต้องมากกว่าวันที่ยืม');
      return;
    }
    const diffDays = Math.ceil((ret.getTime() - borrow.getTime()) / (1000 * 60 * 60 * 24));
    if (diffDays > 7) {
      alert('วันที่ต้องการคืนต้องไม่เกิน 7 วันนับจากวันนี้');
      return;
    }

    const items = selectedItems.map(item => ({
      equipment_id: item.id,
      quantity: item.selected_quantity
    }));

    onSubmit({
      ...formData,
      items
    });
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const totalItems = selectedItems.reduce((sum, item) => sum + item.selected_quantity, 0);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 animate-in fade-in duration-300">
      <div className="bg-white rounded-xl shadow-xl max-w-md w-full max-h-[90vh] overflow-hidden animate-in zoom-in-95 duration-300">
        {/* Header */}
        <div className="bg-white border-b p-6 relative text-center">
          <h2 className="text-2xl font-bold text-gray-900">ยืนยันส่งคำขอยืม</h2>
          <p className="mt-1 text-sm text-gray-600">{currentUser?.fullname || 'ผู้ใช้ระบบ'}</p>
          <button
            onClick={onClose}
            className="absolute right-4 top-4 text-gray-600 hover:bg-gray-100 rounded-full p-2 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 overflow-y-auto max-h-[calc(90vh-120px)]">
          <form onSubmit={handleSubmit}>
            {/* รายละเอียดแบบย่อ */}
            <div className="space-y-3 text-sm text-gray-700 mb-6">
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-[#0ea5e9]" />
                <span>วันที่ต้องการยืม:</span>
                <input
                  type="date"
                  name="borrow_date"
                  value={formData.borrow_date}
                  onChange={handleInputChange}
                  min={todayStr}
                  max={todayStr}
                  disabled
                  title="กำหนดให้ยืมได้เฉพาะวันนี้"
                  className="ml-1 px-2 py-1 border border-gray-300 rounded bg-gray-100 text-gray-600 cursor-not-allowed"
                  required
                />
              </div>
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-[#0ea5e9]" />
                <span>วันที่ต้องการคืน:</span>
                <input
                  type="date"
                  name="return_date"
                  value={formData.return_date}
                  onChange={handleInputChange}
                  min={todayStr}
                  max={maxReturnStr}
                  className={`ml-1 px-2 py-1 border rounded focus:outline-none focus:ring-2 ${
                    formData.return_date ? 'border-emerald-500 focus:ring-emerald-500' : 'border-red-500 focus:ring-red-500'
                  }`}
                  required
                />
              </div>
            </div>

            {/* รายการอุปกรณ์ (แบบข้อความ) */}
            <div className="mb-6">
              <div className="flex items-center space-x-2 mb-2">
                
                <h3 className="text-base font-semibold text-gray-800">รายการอุปกรณ์</h3>
              </div>
              <ol className="list-decimal pl-5 space-y-1 text-sm text-gray-700">
                {selectedItems.map((item) => (
                  <li key={item.id}>
                    <div className="flex items-center justify-between gap-4">
                      <span className="font-medium truncate">{item.name}</span>
                      <span className="whitespace-nowrap">× {item.selected_quantity}</span>
                    </div>
                  </li>
                ))}
              </ol>
              <div className="mt-3 flex items-center justify-between text-sm font-semibold text-gray-900">
                <span className="text-emerald-600" >รวมทั้งหมด</span>
                <span className="text-emerald-600">{totalItems} ชิ้น</span>
              </div>
            </div>

            {/* หมายเหตุ */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                หมายเหตุเพิ่มเติม
              </label>
              <textarea
                name="notes"
                value={formData.notes}
                onChange={handleInputChange}
                rows={1}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0ea5e9] focus:border-transparent"
                placeholder="ระบุรายละเอียดเพิ่มเติม (ถ้ามี)..."
              />
            </div>

            {/* ปุ่ม */}
            <div className="flex justify-end space-x-3">
              <button
                type="button"
                onClick={onClose}
                className="px-6 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
              >
                ยกเลิก
              </button>
              <button
                type="submit"
                className="px-6 py-2 bg-[#0ea5e9] text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                ส่งคำขอยืม
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};
