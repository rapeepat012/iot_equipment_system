import React from "react";
import { Tag, FileText, Layers, CheckCircle, Hash, Image as ImageIcon } from "lucide-react";

interface EditEquipmentFormProps {
  editForm: {
    name: string;
    description: string;
    category: string;
    image_url: string;
    quantity_total: number;
    quantity_available: number;
    status: string;
  };
  setEditForm: (form: any) => void;
  editError: string | null;
}

export const EditEquipmentForm: React.FC<EditEquipmentFormProps> = ({
  editForm,
  setEditForm,
  editError,
}) => {
  return (
    <>
      {editError && (
        <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {editError}
        </div>
      )}
      <div className="space-y-6">
        {/* ข้อมูลอุปกรณ์ Section */}
        <div className="bg-white rounded-xl shadow p-5">
          <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
            <Tag className="h-5 w-5 text-gray-500" /> ข้อมูลอุปกรณ์
          </h3>
          <div className="grid grid-cols-1 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 flex items-center gap-2">
                <Tag className="h-4 w-4 text-gray-500" /> ชื่ออุปกรณ์
              </label>
              <input
                type="text"
                value={editForm.name}
                onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-sky-500"
                placeholder="กรอกชื่ออุปกรณ์"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 flex items-center gap-2">
                <FileText className="h-4 w-4 text-gray-500" /> คำอธิบาย
              </label>
              <textarea
                value={editForm.description}
                onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-sky-500"
                rows={3}
                placeholder="รายละเอียดของอุปกรณ์..."
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 flex items-center gap-2">
                  <Layers className="h-4 w-4 text-gray-500" /> หมวดหมู่
                </label>
                <input
                  type="text"
                  value={editForm.category}
                  onChange={(e) => setEditForm({ ...editForm, category: e.target.value })}
                  className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-sky-500"
                  placeholder="เช่น Microcontroller, Sensor"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-gray-500" /> สถานะ
                </label>
                <select
                  value={editForm.status}
                  onChange={(e) => setEditForm({ ...editForm, status: e.target.value })}
                  className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-sky-500"
                >
                  <option value="available">พร้อมยืม</option>
                  <option value="limited">เหลือน้อย</option>
                  <option value="unavailable">ไม่พร้อมยืม</option>
                </select>
              </div>
            </div>
          </div>
        </div>

        {/* จำนวนอุปกรณ์ Section */}
        <div className="bg-white rounded-xl shadow p-5">
          <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
            <Hash className="h-5 w-5 text-gray-500" /> จำนวนอุปกรณ์
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 flex items-center gap-2">
                <Hash className="h-4 w-4 text-gray-500" /> จำนวนทั้งหมด
              </label>
              <input
                type="number"
                value={editForm.quantity_total}
                onChange={(e) => setEditForm({ ...editForm, quantity_total: Number(e.target.value) })}
                className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-sky-500"
                min="0"
                placeholder="0"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 flex items-center gap-2">
                <Hash className="h-4 w-4 text-gray-500" /> จำนวนคงเหลือ
              </label>
              <input
                type="number"
                value={editForm.quantity_available}
                onChange={(e) => setEditForm({ ...editForm, quantity_available: Number(e.target.value) })}
                className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-sky-500"
                min="0"
                placeholder="0"
              />
            </div>
          </div>
          <div className="mt-4">
            <label className="block text-sm font-medium text-gray-700 flex items-center gap-2">
              <ImageIcon className="h-4 w-4 text-gray-500" /> รูปภาพ (URL)
            </label>
            <input
              type="text"
              value={editForm.image_url}
              onChange={(e) => setEditForm({ ...editForm, image_url: e.target.value })}
              className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-sky-500"
              placeholder="https://example.com/image.jpg"
            />
          </div>
        </div>
      </div>
    </>
  );
};

export default EditEquipmentForm;
