import { useEffect, useState } from 'react';
import { auth, db } from '../firebase/config';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';

export default function StoreGuard({ allowedRoles, children }) {
  const [authorized, setAuthorized] = useState(null); // null = cargando, false = denegado, true = pase

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        window.location.href = '/login';
        return;
      }

      // Si no se requieren roles (acceso público logueado), pasar
      if (!allowedRoles || allowedRoles.length === 0) {
          setAuthorized(true);
          return;
      }

      // Buscar roles en BD
      const userRef = doc(db, 'users', user.uid);
      const userSnap = await getDoc(userRef);

      if (userSnap.exists()) {
        const userData = userSnap.data();
        
        // --- LÓGICA MULTI-ROL ---
        // Combinamos el rol antiguo (string) y el nuevo (array) en una sola lista
        const userRoles = userData.roles || (userData.role ? [userData.role] : []);

        // El usuario es ADMIN? Pase directo.
        if (userRoles.includes('admin')) {
            setAuthorized(true);
            return;
        }

        // ¿Tiene ALGUNO de los roles permitidos?
        // Ejemplo: allowedRoles = ['mesero'] y userRoles = ['mesero', 'frappero'] -> TRUE
        const hasPermission = allowedRoles.some(allowed => userRoles.includes(allowed));

        if (hasPermission) {
            setAuthorized(true);
        } else {
            // Logueado pero sin permiso
            window.location.href = '/menu'; 
        }
      } else {
        // No existe en BD (error raro)
        window.location.href = '/menu';
      }
    });

    return () => unsubscribe();
  }, [allowedRoles]);

  if (authorized === null) {
    return (
        <div className="min-h-screen flex items-center justify-center bg-zinc-900">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-yellow-500"></div>
        </div>
    );
  }

  return authorized ? children : null;
}