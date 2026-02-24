import React from "react";
import { X } from "lucide-react";

interface SlideInPanelProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  width?: "sm" | "md" | "lg" | "xl";
  headerActions?: React.ReactNode;
  className?: string;
  disableBackdropClick?: boolean;
}

export const SlideInPanel: React.FC<SlideInPanelProps> = ({
  isOpen,
  onClose,
  title,
  children,
  width = "lg",
  headerActions,
  className = "",
  disableBackdropClick = false,
}) => {
  const widthClasses = {
    sm: "max-w-sm",
    md: "max-w-md", 
    lg: "max-w-lg",
    xl: "max-w-xl",
  };

  return (
    <div className={`fixed inset-0 z-50 transition-opacity duration-300 ${
      isOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
    }`}>
      {/* Backdrop */}
      <div
        className={`absolute inset-0 bg-black/30 transition-opacity duration-300 ${
          isOpen ? 'opacity-100' : 'opacity-0'
        }`}
        onClick={disableBackdropClick ? undefined : onClose}
      />
      
      {/* Panel */}
      <div className={`fixed h-full bg-white shadow-xl transform transition-all duration-300 ease-out right-0 top-0 w-full ${widthClasses[width]} ${
        isOpen ? 'translate-x-0' : 'translate-x-full'
      } ${className}`}>
        {/* Header */}
        <div className="flex justify-between items-center border-b border-gray-200 px-6 py-5 bg-white">
          <div className="flex-1">
            <h2 className="text-xl font-semibold text-gray-800">
              {title}
            </h2>
          </div>
          <div className="flex gap-3 items-center">
            {headerActions}
            <button
              type="button"
              className="bg-gray-100 hover:bg-gray-200 rounded-lg h-9 w-9 flex justify-center items-center transition-colors"
              onClick={onClose}
            >
              <X className="h-4 w-4 text-gray-600" />
            </button>
          </div>
        </div>
        
        {/* Content */}
        <div className="overflow-y-auto h-full pb-6">
          <div className="px-6 py-6 bg-gray-50 min-h-full">
            {children}
          </div>
        </div>
      </div>
    </div>
  );
};

export default SlideInPanel;
