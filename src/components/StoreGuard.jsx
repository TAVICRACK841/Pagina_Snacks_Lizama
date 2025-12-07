import { useState, useEffect } from 'react';
import { db, auth } from '../firebase/config';
import { doc, onSnapshot, getDoc } from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';

export default function StoreGuard({ children }) {
  const [isOpen, setIsOpen] = useState(true);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    // 1. Verificar si el usuario es Admin
    const unsubscribeAuth = onAuthStateChanged(auth, async (user) => {
      if (user) {
        const userDoc = await getDoc(doc(db, "users", user.uid));
        if (userDoc.exists() && userDoc.data().role === 'admin') {
          setIsAdmin(true);
        }
      }
    });

    // 2. Escuchar si la tienda está abierta o cerrada
    const unsubscribeStore = onSnapshot(doc(db, "store_config", "main"), (doc) => {
      if (doc.exists()) {
        setIsOpen(doc.data().isOpen);
      } else {
        // Si no existe la config, asumimos abierto
        setIsOpen(true);
      }
      setLoading(false);
    });

    return () => {
      unsubscribeAuth();
      unsubscribeStore();
    };
  }, []);

  if (loading) return null;

  // Si está cerrado y NO eres admin, mostramos el cartel de cerrado
  if (!isOpen && !isAdmin) {
    return (
      <div className="fixed inset-0 bg-orange-600 flex flex-col items-center justify-center text-white z-50 p-4 text-center">
        <div className="text-8xl mb-4">🔒</div>
        <h1 className="text-4xl font-extrabold mb-4">NO ESTAMOS LABORANDO</h1>
        <p className="text-xl">Nuestro horario de servicio ha terminado por hoy.</p>
        <p className="mt-2 text-orange-200">¡Vuelve pronto por tus snacks favoritos!</p>
      </div>
    );
  }

  // Si está abierto O eres admin, dejamos pasar
  return <>{children}</>;
}