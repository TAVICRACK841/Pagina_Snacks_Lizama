import { useEffect, useState } from 'react';
import { auth, db } from '../firebase/config';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc, onSnapshot } from 'firebase/firestore';
import { FaStoreSlash } from 'react-icons/fa';

export default function StoreGuard({ allowedRoles, children }) {
  const [authorized, setAuthorized] = useState(null); 
  const [isStoreOpen, setIsStoreOpen] = useState(true);
  const [isStaff, setIsStaff] = useState(false);

  useEffect(() => {
    // 1. Escuchar si el local está abierto o cerrado
    const unsubConfig = onSnapshot(doc(db, "store_config", "main"), (docSnap) => {
        if (docSnap.exists()) {
            setIsStoreOpen(docSnap.data().isOpen !== false);
        }
    });

    // 2. Escuchar la sesión del usuario
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        if (!allowedRoles || allowedRoles.length === 0) {
            // Es página pública (ej. menú), dejamos pasar pero sabemos que NO es staff
            setIsStaff(false);
            setAuthorized(true);
        } else {
            window.location.href = '/login';
        }
        return;
      }

      // Buscar roles en la base de datos
      const userRef = doc(db, 'users', user.uid);
      const userSnap = await getDoc(userRef);

      if (userSnap.exists()) {
        const userData = userSnap.data();
        const userRoles = userData.roles || (userData.role ? [userData.role] : ['cliente']);

        // Verificar si es empleado/admin (Para dejarlo pasar aunque esté cerrado)
        const staffRoles = ['admin', 'hamburguesero', 'frappero', 'productor', 'freidor', 'mesero', 'mesero 1', 'mesero 2', 'repartidor', 'repartidor 1', 'repartidor 2'];
        const userIsStaff = userRoles.some(r => staffRoles.includes(r));
        setIsStaff(userIsStaff);

        if (!allowedRoles || allowedRoles.length === 0) {
          setAuthorized(true);
          return;
        }

        if (userRoles.includes('admin')) {
          setAuthorized(true);
          return;
        }

        const hasPermission = allowedRoles.some(allowed => userRoles.includes(allowed));

        if (hasPermission) {
          setAuthorized(true);
        } else {
          window.location.href = '/menu'; 
        }
      } else {
        if (!allowedRoles || allowedRoles.length === 0) {
            setAuthorized(true);
        } else {
            window.location.href = '/menu';
        }
      }
    });

    return () => { unsubscribe(); unsubConfig(); };
  }, [allowedRoles]);

  if (authorized === null) {
    return (
        <div className="min-h-screen flex items-center justify-center bg-zinc-900">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-yellow-500"></div>
        </div>
    );
  }

  // --- PANTALLA DE CERRADO ---
  // Si la tienda está cerrada, y la persona NO es un trabajador, mostramos pantalla
  if (!isStoreOpen && !isStaff) {
      return (
          <div className="min-h-[80vh] flex items-center justify-center bg-zinc-900 p-4">
              <div className="bg-zinc-800 p-8 rounded-3xl border-2 border-red-900/50 shadow-2xl text-center max-w-lg animate-fade-in-down relative overflow-hidden mt-10">
                  <div className="absolute top-0 left-0 w-full h-2 bg-red-600"></div>
                  <div className="w-24 h-24 bg-red-900/30 rounded-full flex items-center justify-center mx-auto mb-6 border-4 border-red-500/50 shadow-[0_0_30px_rgba(239,68,68,0.3)]">
                      <FaStoreSlash className="text-red-500 text-4xl" />
                  </div>
                  <h1 className="text-4xl font-black text-white mb-3 tracking-tight">CERRADO</h1>
                  <p className="text-gray-400 text-lg mb-8 leading-relaxed">
                      En este momento no estamos recibiendo pedidos. Por favor, verifica nuestros horarios de atención o regresa más tarde.
                  </p>
                  <div className="bg-black/40 p-4 rounded-xl border border-zinc-700">
                      <p className="text-sm font-bold text-yellow-500 uppercase tracking-widest mb-1">¡Gracias por tu preferencia!</p>
                      <p className="text-xs text-gray-500">Te esperamos pronto en Snacks Lizama 🍔</p>
                  </div>
              </div>
          </div>
      );
  }

  // Si todo está bien, mostramos la página normal
  return authorized ? children : null;
}