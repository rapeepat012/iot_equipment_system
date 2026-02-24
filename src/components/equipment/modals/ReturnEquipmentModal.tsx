import React, { useEffect, useState } from 'react';
import { X, CheckCircle, AlertTriangle, XCircle, Package } from 'lucide-react';
import { apiService, type Borrower, type BorrowedItem, type ReturnItem } from '../../../services/api';
import Swal from 'sweetalert2';

interface ReturnEquipmentModalProps {
  borrower: Borrower;
  onClose: () => void;
  onSuccess: () => void;
}

interface ReturnItemState extends BorrowedItem {
  quantity_returned: number;
  quantity_damaged: number;
  quantity_lost: number;
  notes: string;
}

export const ReturnEquipmentModal: React.FC<ReturnEquipmentModalProps> = ({
  borrower,
  onClose,
  onSuccess,
}) => {
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<ReturnItemState[]>([]);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchBorrowerDetails();
  }, [borrower.borrowing_id]);

  const fetchBorrowerDetails = async () => {
    try {
      setLoading(true);
      const res = await apiService.getBorrowerDetails(borrower.borrowing_id);
      const itemsWithState: ReturnItemState[] = res.data.items.map(item => ({
        ...item,
        quantity_returned: 0,
        quantity_damaged: 0,
        quantity_lost: 0,
        notes: '',
      }));
      setItems(itemsWithState);
    } catch (error) {
      console.error('Error fetching borrower details:', error);
      Swal.fire({
        title: 'ผิดพลาด',
        text: 'ไม่สามารถโหลดข้อมูลอุปกรณ์ได้',
        icon: 'error',
        confirmButtonColor: '#0EA5E9',
      });
      onClose();
    } finally {
      setLoading(false);
    }
  };

  const updateItemQuantity = (index: number, field: 'quantity_returned' | 'quantity_damaged' | 'quantity_lost', value: number) => {
    const newItems = [...items];
    const item = newItems[index];
    const maxValue = item.quantity_borrowed;

    // ตรวจสอบว่าค่าไม่เกิน quantity_borrowed
    const newValue = Math.max(0, Math.min(value, maxValue));
    newItems[index] = { ...item, [field]: newValue };

    // คำนวณค่าอื่นๆ ให้สมดุล
    const total = newItems[index].quantity_returned + newItems[index].quantity_damaged + newItems[index].quantity_lost;
    if (total > maxValue) {
      // ปรับค่าอื่นๆ ให้ไม่เกิน
      const diff = total - maxValue;
      if (field === 'quantity_returned') {
        if (newItems[index].quantity_lost >= diff) {
          newItems[index].quantity_lost -= diff;
        } else {
          const remaining = diff - newItems[index].quantity_lost;
          newItems[index].quantity_lost = 0;
          newItems[index].quantity_damaged = Math.max(0, newItems[index].quantity_damaged - remaining);
        }
      } else if (field === 'quantity_damaged') {
        if (newItems[index].quantity_lost >= diff) {
          newItems[index].quantity_lost -= diff;
        } else {
          const remaining = diff - newItems[index].quantity_lost;
          newItems[index].quantity_lost = 0;
          newItems[index].quantity_returned = Math.max(0, newItems[index].quantity_returned - remaining);
        }
      } else {
        if (newItems[index].quantity_damaged >= diff) {
          newItems[index].quantity_damaged -= diff;
        } else {
          const remaining = diff - newItems[index].quantity_damaged;
          newItems[index].quantity_damaged = 0;
          newItems[index].quantity_returned = Math.max(0, newItems[index].quantity_returned - remaining);
        }
      }
    }

    setItems(newItems);
  };

  const updateItemNotes = (index: number, notes: string) => {
    const newItems = [...items];
    newItems[index] = { ...newItems[index], notes };
    setItems(newItems);
  };

  const getStatusColor = (item: ReturnItemState) => {
    const total = item.quantity_returned + item.quantity_damaged + item.quantity_lost;
    if (total === item.quantity_borrowed && item.quantity_returned === item.quantity_borrowed) {
      return 'border-green-200 bg-green-50';
    }
    if (total < item.quantity_borrowed) {
      return 'border-yellow-200 bg-yellow-50';
    }
    if (item.quantity_damaged > 0 || item.quantity_lost > 0) {
      return 'border-orange-200 bg-orange-50';
    }
    return 'border-gray-200 bg-white';
  };

  const getSummary = () => {
    const totalReturned = items.reduce((sum, item) => sum + item.quantity_returned, 0);
    const totalDamaged = items.reduce((sum, item) => sum + item.quantity_damaged, 0);
    const totalLost = items.reduce((sum, item) => sum + item.quantity_lost, 0);
    const totalBorrowed = items.reduce((sum, item) => sum + item.quantity_borrowed, 0);
    const totalProcessed = totalReturned + totalDamaged + totalLost;

    return {
      totalReturned,
      totalDamaged,
      totalLost,
      totalBorrowed,
      totalProcessed,
      isComplete: totalProcessed === totalBorrowed,
    };
  };

  const handleSubmit = async () => {
    const summary = getSummary();

    if (!summary.isComplete) {
      Swal.fire({
        title: 'ข้อมูลไม่ครบถ้วน',
        text: 'กรุณาตรวจสอบจำนวนอุปกรณ์ให้ครบถ้วน',
        icon: 'warning',
        confirmButtonColor: '#0EA5E9',
      });
      return;
    }

    // ตรวจสอบว่ามีอุปกรณ์เสียหายหรือหายหรือไม่ และต้องมีหมายเหตุ
    const itemsWithIssues = items.filter(item =>
      (item.quantity_damaged > 0 || item.quantity_lost > 0) && !item.notes.trim()
    );

    if (itemsWithIssues.length > 0) {
      Swal.fire({
        title: 'ต้องระบุหมายเหตุ',
        text: 'กรุณาระบุหมายเหตุสำหรับอุปกรณ์ที่เสียหายหรือสูญหาย',
        icon: 'warning',
        confirmButtonColor: '#0EA5E9',
      });
      return;
    }

    const confirm = await Swal.fire({
      title: 'ยืนยันการคืนอุปกรณ์',
      html: `
        <div class="text-left">
          <p class="mb-2"><strong>ผู้คืน:</strong> ${borrower.fullname}</p>
          <p class="mb-2"><strong>รหัส:</strong> ${borrower.student_id}</p>
          <hr class="my-3">
          <p class="mb-2"><strong>คืนปกติ:</strong> ${summary.totalReturned} ชิ้น</p>
          <p class="mb-2"><strong>เสียหาย:</strong> ${summary.totalDamaged} ชิ้น</p>
          <p class="mb-2"><strong>สูญหาย:</strong> ${summary.totalLost} ชิ้น</p>
        </div>
      `,
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: 'ยืนยันการคืน',
      cancelButtonText: 'ยกเลิก',
      confirmButtonColor: '#0EA5E9',
      cancelButtonColor: '#6B7280',
    });

    if (!confirm.isConfirmed) return;

    try {
      setSubmitting(true);
      const currentUser = apiService.getCurrentUser();

      const returnItems: ReturnItem[] = items.map(item => ({
        equipment_id: item.equipment_id,
        quantity_returned: item.quantity_returned,
        quantity_damaged: item.quantity_damaged,
        quantity_lost: item.quantity_lost,
        notes: item.notes,
      }));

      await apiService.returnEquipment({
        borrowing_id: borrower.borrowing_id,
        staff_id: currentUser?.id,
        staff_name: currentUser?.fullname,
        items: returnItems,
      });

      onSuccess();
    } catch (error: any) {
      console.error('Error returning equipment:', error);
      Swal.fire({
        title: 'ผิดพลาด',
        text: error.message || 'ไม่สามารถบันทึกการคืนได้',
        icon: 'error',
        confirmButtonColor: '#0EA5E9',
      });
    } finally {
      setSubmitting(false);
    }
  };

  const summary = getSummary();

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 animate-in fade-in duration-300">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-5xl max-h-[90vh] overflow-hidden flex flex-col animate-in zoom-in-95 duration-300">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between bg-gradient-to-r from-blue-500 to-blue-600">
          <div className="text-white">
            <h2 className="text-2xl font-bold">คืนอุปกรณ์</h2>
            <p className="text-blue-100 text-sm mt-1">
              {borrower.fullname} | {borrower.student_id}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-blue-700 rounded-lg transition-colors text-white"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {loading ? (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div>
              <p className="mt-4 text-gray-600">กำลังโหลดข้อมูล...</p>
            </div>
          ) : (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                รายการอุปกรณ์ที่ยืม
              </h3>

              {items.map((item, index) => (
                <div
                  key={item.equipment_id}
                  className={`border-2 rounded-xl p-5 transition-all ${getStatusColor(item)}`}
                >
                  {/* Equipment Header */}
                  <div className="flex items-center gap-4 mb-4">
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
                      <p className="text-sm text-gray-600">
                        หมวดหมู่: {item.category} | ยืมไป: {item.quantity_borrowed} ชิ้น
                      </p>
                    </div>
                  </div>

                  {/* Quantity Controls */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                    {/* Returned */}
                    <div className="bg-white rounded-lg p-4 border border-gray-200">
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        <CheckCircle className="w-4 h-4 inline mr-1 text-green-600" />
                        คืนปกติ
                      </label>
                      <input
                        type="number"
                        min="0"
                        max={item.quantity_borrowed}
                        value={item.quantity_returned}
                        onChange={(e) => updateItemQuantity(index, 'quantity_returned', parseInt(e.target.value) || 0)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                      />
                    </div>

                    {/* Damaged */}
                    <div className="bg-white rounded-lg p-4 border border-gray-200">
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        <AlertTriangle className="w-4 h-4 inline mr-1 text-orange-600" />
                        เสียหาย
                      </label>
                      <input
                        type="number"
                        min="0"
                        max={item.quantity_borrowed}
                        value={item.quantity_damaged}
                        onChange={(e) => updateItemQuantity(index, 'quantity_damaged', parseInt(e.target.value) || 0)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                      />
                    </div>

                    {/* Lost */}
                    <div className="bg-white rounded-lg p-4 border border-gray-200">
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        <XCircle className="w-4 h-4 inline mr-1 text-red-600" />
                        สูญหาย
                      </label>
                      <input
                        type="number"
                        min="0"
                        max={item.quantity_borrowed}
                        value={item.quantity_lost}
                        onChange={(e) => updateItemQuantity(index, 'quantity_lost', parseInt(e.target.value) || 0)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
                      />
                    </div>
                  </div>

                  {/* Notes */}
                  {(item.quantity_damaged > 0 || item.quantity_lost > 0) && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        หมายเหตุ *
                      </label>
                      <textarea
                        value={item.notes}
                        onChange={(e) => updateItemNotes(index, e.target.value)}
                        placeholder="ระบุเหตุผลที่อุปกรณ์เสียหายหรือสูญหาย..."
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        rows={2}
                      />
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-200 bg-gray-50">
          {/* Actions */}
          <div className="flex items-center justify-between">
            <div>
              {!summary.isComplete && (
                <p className="text-sm text-yellow-600 flex items-center gap-1">
                  <AlertTriangle className="w-4 h-4" />
                  กรุณาตรวจสอบจำนวนอุปกรณ์ให้ครบถ้วน
                </p>
              )}
            </div>
            <div className="flex gap-3">
              <button
                onClick={onClose}
                disabled={submitting}
                className="px-6 py-2.5 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors font-medium disabled:opacity-50"
              >
                ยกเลิก
              </button>
              <button
                onClick={handleSubmit}
                disabled={submitting || !summary.isComplete}
                className="px-6 py-2.5 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {submitting ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    กำลังบันทึก...
                  </>
                ) : (
                  <>
                    <CheckCircle className="w-5 h-5" />
                    ยืนยันการคืน
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

