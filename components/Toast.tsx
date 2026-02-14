import React from 'react';
import { CheckCircle, XCircle, Info } from 'lucide-react';
import { ToastMessage } from '../types';

interface ToastProps {
  toasts: ToastMessage[];
}

const icons = {
  success: <CheckCircle className="text-green-400" />,
  error: <XCircle className="text-red-400" />,
  info: <Info className="text-blue-400" />,
};

export const ToastContainer: React.FC<ToastProps> = ({ toasts }) => {
  return (
    <div className="fixed bottom-6 right-6 z-[100] flex flex-col items-end gap-3 pointer-events-none">
      {toasts.map(toast => (
        <div
          key={toast.id}
          className="pointer-events-auto flex items-center gap-3 bg-slate-900/60 backdrop-blur-xl border border-white/10 shadow-[0_8px_32px_rgba(0,0,0,0.3)] rounded-2xl px-5 py-4 animate-in fade-in slide-in-from-bottom-8 duration-500 ease-out"
        >
          {icons[toast.type]}
          <p className="text-sm font-medium text-white shadow-black drop-shadow-sm">{toast.message}</p>
        </div>
      ))}
    </div>
  );
};