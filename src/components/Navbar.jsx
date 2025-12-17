import { useState, useEffect } from 'react';
import { auth, db } from '../firebase/config';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { doc, onSnapshot } from 'firebase/firestore';
import { FaMoon, FaSun } from 'react-icons/fa'; 

export default function Navbar() {
  const [user, setUser] = useState(null);
  const [userData, setUserData] = useState({});
  const [menuOpen, setMenuOpen] = useState(false);
  const [theme, setTheme] = useState('light'); 

  useEffect(() => {
    // 1. Detectar tema
    if (document.documentElement.classList.contains('dark')) {
        setTheme('dark');
    }

    // 2. Auth
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      if (currentUser) {
        setUser(currentUser);
        onSnapshot(doc(db, "users", currentUser.uid), (docSnap) => {
            if (docSnap.exists()) setUserData(docSnap.data());
        });
      } else {
        setUser(null);
        setUserData({});
      }
    });
    return () => unsubscribe();
  }, []);

  const toggleTheme = () => {
      if (theme === 'light') {
          setTheme('dark');
          localStorage.theme = 'dark';
          document.documentElement.classList.add('dark');
      } else {
          setTheme('light');
          localStorage.theme = 'light';
          document.documentElement.classList.remove('dark');
      }
  };

  const handleLogout = async () => {
    await signOut(auth);
    window.location.href = '/';
  };

  const displayName = userData.displayName || user?.displayName || user?.email?.split('@')[0];
  const photoURL = userData.photoURL || user?.photoURL;
  const role = userData.role;

  return (
    <nav className="bg-orange-600 dark:bg-gray-800 p-4 shadow-md text-white sticky top-0 z-50 transition-colors duration-300">
      <div className="container mx-auto flex justify-between items-center">
        
        <a href="/menu" className="text-xl font-bold tracking-tighter hover:scale-105 transition flex items-center gap-2">
          🍔 Snacks Lizama
        </a>

        <div className="flex items-center gap-4">
            
            {/* BOTÓN MODO OSCURO */}
            <button 
                onClick={toggleTheme} 
                className="p-2 rounded-full bg-black/20 hover:bg-black/40 transition text-yellow-300 border border-transparent dark:border-gray-600"
                title="Cambiar Tema"
            >
                {theme === 'dark' ? <FaSun /> : <FaMoon className="text-white"/>}
            </button>

            {user ? (
              <div className="flex items-center gap-4">
                {role && role !== 'cliente' && (
                  <a href="/kitchen" className="hidden md:block bg-orange-700 dark:bg-gray-700 px-3 py-1 rounded hover:bg-orange-800 font-bold text-sm border border-transparent dark:border-gray-600">
                    👨‍🍳 Cocina
                  </a>
                )}

                <div className="relative">
                  <button onClick={() => setMenuOpen(!menuOpen)} className="flex items-center gap-2 focus:outline-none">
                    <div className="w-10 h-10 rounded-full bg-white text-orange-600 flex items-center justify-center font-bold overflow-hidden border-2 border-white dark:border-gray-500">
                      {photoURL ? (
                        <img src={photoURL} alt="Perfil" className="w-full h-full object-cover" />
                      ) : (
                        displayName?.charAt(0).toUpperCase()
                      )}
                    </div>
                  </button>

                  {menuOpen && (
                    <div className="absolute right-0 mt-2 w-56 bg-white dark:bg-gray-800 rounded-md shadow-lg py-1 text-gray-800 dark:text-white z-50 animate-fade-in-down border dark:border-gray-700">
                      {role && <div className="px-4 py-2 border-b dark:border-gray-700 text-xs text-gray-500 dark:text-gray-400 capitalize">Rol: {role}</div>}
                      
                      <a href="/menu" className="block px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-700">📋 Ver Menú</a>
                      <a href="/orders" className="block px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-700">📦 Mis Pedidos</a>
                      <a href="/profile" className="block px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-700">👤 Mi Perfil</a>
                      <a href="/wallet" className="block px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-700">💳 Mi Billetera</a>
                      
                      {role === 'admin' && (
                        <a href="/admin" className="block px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-700 text-orange-600 font-semibold">🛠️ Administración</a>
                      )}

                      <button 
                        onClick={handleLogout}
                        className="block w-full text-left px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-700 text-red-600 font-bold"
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
      </div>
    </nav>
  );
}