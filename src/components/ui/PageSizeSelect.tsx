import React from "react";

interface PageSizeSelectProps {
  value: number;
  onChange: (value: number) => void;
  totalItems?: number;
  className?: string;
  options?: number[]; // default: [5,10,15,20,50]
}

export const PageSizeSelect: React.FC<PageSizeSelectProps> = ({ value, onChange, totalItems, className, options }) => {
  const pageOptions = options && options.length > 0 ? options : [5, 10, 15, 20, 50];
  return (
    <select
      value={value}
      onChange={(e) => onChange(Number(e.target.value))}
      className={("px-1.5 py-0.5 border border-gray-300 rounded text-xs focus:outline-none focus:ring-1 focus:ring-blue-500 min-w-[60px] ") + (className || "")}
    >
      {pageOptions.map((n) => (
        <option key={n} value={n}>{n} รายการ</option>
      ))}
      {typeof totalItems === 'number' && (
        <option value={totalItems}>ทั้งหมด</option>
      )}
    </select>
  );
};

export default PageSizeSelect;


