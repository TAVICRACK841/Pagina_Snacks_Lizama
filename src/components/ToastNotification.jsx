import { useStore } from '@nanostores/react';
import { toastMessage } from '../stores/toastStore'; // Importamos el atom creado arriba
import { FaCheckCircle, FaExclamationCircle } from 'react-icons/fa';

export default function ToastNotification() {
  // Leemos el estado del atom
  const toast = useStore(toastMessage);

  // Si está null, no mostramos nada
  if (!toast) return null;

  return (
    <div className={`fixed top-24 right-4 z-50 flex items-center gap-3 px-6 py-4 rounded-xl shadow-2xl text-white font-bold transition-all transform translate-y-0 animate-bounce-in ${
      toast.type === 'success' ? 'bg-green-600' : 'bg-red-600'
    }`}>
      <div className="text-2xl">
        {toast.type === 'success' ? <FaCheckCircle /> : <FaExclamationCircle />}
      </div>
      <div>
        <p className="text-xs font-light uppercase opacity-90">{toast.type === 'success' ? 'Éxito' : 'Error'}</p>
        <p className="text-sm">{toast.message}</p>
      </div>
    </div>
  );
}