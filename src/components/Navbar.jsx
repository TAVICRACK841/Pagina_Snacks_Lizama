import { useState, useEffect } from 'react';
import { auth, db } from '../firebase/config';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';

export default function Navbar() {
  const [user, setUser] = useState(null);
  const [role, setRole] = useState(null);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (currentUser) {
        setUser(currentUser);
        try {
            const docRef = doc(db, "users", currentUser.uid);
            const docSnap = await getDoc(docRef);
            if (docSnap.exists()) {
              setRole(docSnap.data().role);
            }
        } catch (e) { console.log(e); }
      } else {
        setUser(null);
        setRole(null);
      }
    });
    return () => unsubscribe();
  }, []);

  const handleLogout = async () => {
    await signOut(auth);
    window.location.href = '/';
  };

  return (
    <nav className="bg-orange-600 p-4 shadow-md text-white sticky top-0 z-50">
      <div className="container mx-auto flex justify-between items-center">
        
        <a href="/menu" className="text-xl font-bold tracking-tighter hover:scale-105 transition">
          🍔 Snacks Lizama
        </a>

        {user ? (
          <div className="flex items-center gap-4">
            
            {role && role !== 'cliente' && (
              <a href="/kitchen" className="hidden md:block bg-orange-700 px-3 py-1 rounded hover:bg-orange-800 font-bold text-sm">
                👨‍🍳 Cocina
              </a>
            )}

            <div className="relative">
              <button 
                onClick={() => setMenuOpen(!menuOpen)}
                className="flex items-center gap-2 focus:outline-none"
              >
                <div className="w-10 h-10 rounded-full bg-white text-orange-600 flex items-center justify-center font-bold overflow-hidden border-2 border-white">
                  {user.photoURL ? (
                    <img src={user.photoURL} alt="Perfil" className="w-full h-full object-cover" />
                  ) : (
                    user.email?.charAt(0).toUpperCase()
                  )}
                </div>
              </button>

              {menuOpen && (
                <div className="absolute right-0 mt-2 w-56 bg-white rounded-md shadow-lg py-1 text-gray-800 z-50 animate-fade-in-down">
                  {role && <div className="px-4 py-2 border-b text-xs text-gray-500 capitalize">Rol: {role}</div>}
                  
                  <a href="/menu" className="block px-4 py-2 hover:bg-gray-100">📋 Ver Menú</a>
                  
                  {/* --- AQUÍ AGREGAMOS EL ENLACE NUEVO --- */}
                  <a href="/orders" className="block px-4 py-2 hover:bg-gray-100">📦 Mis Pedidos</a>
                  {/* -------------------------------------- */}

                  <a href="/profile" className="block px-4 py-2 hover:bg-gray-100">👤 Mi Perfil</a>

                  {role && role !== 'cliente' && (
                    <a href="/kitchen" className="block px-4 py-2 hover:bg-gray-100 text-blue-600 font-semibold">👨‍🍳 Ver Pedidos</a>
                  )}

                  {role === 'admin' && (
                    <a href="/admin" className="block px-4 py-2 hover:bg-gray-100 text-orange-600 font-semibold">
                      🛠️ Administración
                    </a>
                  )}

                  <button 
                    onClick={handleLogout}
                    className="block w-full text-left px-4 py-2 hover:bg-gray-100 text-red-600 font-bold"
                  >
                    🚪 Cerrar Sesión
                  </button>
                </div>
              )}
            </div>
          </div>
        ) : (
            <a href="/login" className="bg-white text-orange-600 px-4 py-2 rounded-full font-bold shadow hover:bg-gray-100 transition">Iniciar Sesión</a>
        )}
      </div>
    </nav>
  );
}