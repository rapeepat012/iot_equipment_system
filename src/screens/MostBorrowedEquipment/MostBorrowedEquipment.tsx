import React from 'react';
import { MainLayout } from '../../components/Layout';

export const MostBorrowedEquipment: React.FC = () => {
  return (
    <MainLayout>
      <div className="min-h-screen p-4">
        <div className="mx-auto max-w-6xl">
          <h1 className="text-2xl font-bold text-gray-900 mb-6">อุปกรณ์ยืมเยอะที่สุด</h1>
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <p className="text-gray-600">หน้าแสดงอุปกรณ์ยืมเยอะที่สุด</p>
          </div>
        </div>
      </div>
    </MainLayout>
  );
};

export default MostBorrowedEquipment;
