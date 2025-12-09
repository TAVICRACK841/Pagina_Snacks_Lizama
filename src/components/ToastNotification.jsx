import { useStore } from '@nanostores/react';
import { toastMessage } from '../stores/toastStore';
import { FaCheckCircle, FaExclamationCircle } from 'react-icons/fa';

export default function ToastNotification() {
  const toast = useStore(toastMessage);
  if (!toast) return null;

  return (
    <div className={`fixed top-24 right-4 z-[9999] px-6 py-4 rounded-xl shadow-2xl flex items-center gap-3 animate-fade-in-down text-white ${
      toast.type === 'success' ? 'bg-green-600' : 'bg-red-600'
    }`}>
      <div className="text-xl">
        {toast.type === 'success' ? <FaCheckCircle /> : <FaExclamationCircle />}
      </div>
      <div>
        <p className="font-bold text-sm uppercase">{toast.type === 'success' ? 'Éxito' : 'Error'}</p>
        <p className="text-sm">{toast.message}</p>
      </div>
    </div>
  );
}