import React from 'react';
import { LucideProps } from 'lucide-react';

interface StatsCardProps {
  title: string;
  value: string | number;
  icon: React.ComponentType<LucideProps>;
  color?: string;
  onClick?: () => void;
}

export const StatsCard: React.FC<StatsCardProps> = ({ 
  title, 
  value, 
  icon: Icon, 
  color = '#0EA5E9',
  onClick
}) => {
  return (
    <div 
      className="rounded-xl shadow-sm border border-gray-100 p-6 hover:shadow-md transition-all duration-300 cursor-pointer group"
      style={{ backgroundColor: `${color}15` }}
      onMouseEnter={(e) => {
        e.currentTarget.style.backgroundColor = `${color}25`;
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.backgroundColor = `${color}15`;
      }}
      onClick={onClick}
    >
      <div className="flex items-center justify-between">
        <div className="flex-1">
          <p className="text-sm font-medium text-gray-700 mb-1">{title}</p>
          <p className="text-2xl font-bold text-gray-900">{value}</p>
        </div>
        <div 
          className="w-12 h-12 rounded-lg flex items-center justify-center group-hover:scale-110 transition-transform duration-300"
          style={{ backgroundColor: `${color}30` }}
        >
          <Icon className="w-6 h-6" style={{ color }} />
        </div>
      </div>
    </div>
  );
};