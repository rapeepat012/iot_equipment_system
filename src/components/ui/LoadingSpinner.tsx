import React from 'react';

interface LoadingSpinnerProps {
  isLoading: boolean;
}

export const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({ isLoading }) => {
  if (!isLoading) return null;

  return (
    // <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 animate-in fade-in duration-200">
    //   <div className="bg-white rounded-lg p-6 flex flex-col items-center space-y-4 shadow-xl animate-in zoom-in-95 duration-200">
    //     <img src="/images/logo_login.png" alt="Loading" className="w-48 h-auto" />
    //   </div>
    // </div>
    null
  );
};
