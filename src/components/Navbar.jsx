import { useState, useEffect } from 'react';
import { auth, db } from '../firebase/config';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { doc, onSnapshot, getDoc, setDoc } from 'firebase/firestore';
import { FaSignOutAlt, FaDownload, FaShare, FaPlusSquare, FaTimes, FaEllipsisV, FaDesktop } from 'react-icons/fa';

export default function Navbar() {
  const [user, setUser] = useState(null);
  const [userData, setUserData] = useState({});
  const [menuOpen, setMenuOpen] = useState(false);
  const [storeLogo, setStoreLogo] = useState(null);
  const [currentTheme, setCurrentTheme] = useState('normal');

  // --- ESTADOS PARA PWA ---
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [isIOS, setIsIOS] = useState(false);
  const [showInstallModal, setShowInstallModal] = useState(false); 
  const [isStandalone, setIsStandalone] = useState(false);

  useEffect(() => {
    const unsubscribeConfig = onSnapshot(doc(db, "store_config", "main"), (docSnap) => {
        if (docSnap.exists()) {
            const data = docSnap.data();
            if (data.logo) setStoreLogo(data.logo);
            if (data.theme) setCurrentTheme(data.theme);
        }
    });

    const unsubscribeAuth = onAuthStateChanged(auth, async (currentUser) => {
      if (currentUser) {
        setUser(currentUser);
        const userRef = doc(db, "users", currentUser.uid);
        const userSnap = await getDoc(userRef);
        
        const googleName = currentUser.displayName;
        const googlePhoto = currentUser.photoURL;
        const emailName = currentUser.email.split('@')[0];
        const finalName = googleName || emailName;

        if (userSnap.exists()) {
            const currentData = userSnap.data();
            if (!currentData.displayName || currentData.displayName === currentUser.email || (!currentData.photoURL && googlePhoto)) {
                await setDoc(userRef, { displayName: currentData.displayName || finalName, photoURL: currentData.photoURL || googlePhoto, lastLogin: new Date().toISOString() }, { merge: true });
            }
        } else {
            await setDoc(userRef, { displayName: finalName, email: currentUser.email, photoURL: googlePhoto || null, role: 'cliente', roles: ['cliente'], savedAddresses: [], createdAt: new Date().toISOString() });
        }
        
        onSnapshot(userRef, (docSnap) => {
            if (docSnap.exists()) setUserData(docSnap.data());
        });
      } else {
        setUser(null);
        setUserData({});
      }
    });

    if (typeof window !== 'undefined') {
        if (window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true) {
            setIsStandalone(true);
        }
        const handleBeforeInstallPrompt = (e) => {
            e.preventDefault();
            setDeferredPrompt(e);
        };
        window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
        const ios = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
        setIsIOS(ios);

        return () => { 
            unsubscribeAuth(); 
            unsubscribeConfig(); 
            window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
        };
    }
  }, []);

  const handleLogout = async () => {
    await signOut(auth);
    window.location.href = '/';
  };

  const handleInstallClick = async () => {
    if (deferredPrompt) {
        deferredPrompt.prompt();
        const { outcome } = await deferredPrompt.userChoice;
        if (outcome === 'accepted') setDeferredPrompt(null);
        return;
    }
    setShowInstallModal(true);
  };

  const getFestiveIcon = () => {
      switch(currentTheme) {
          case 'navidad': return <span className="text-2xl animate-bounce">🎄</span>;
          case 'halloween': return <span className="text-2xl animate-pulse">🎃</span>;
          case 'reyes': return <span className="text-2xl animate-bounce">👑</span>;
          default: return null;
      }
  };

  const displayName = userData.displayName || user?.displayName || user?.email?.split('@')[0];
  const photoURL = userData.photoURL || user?.photoURL;
  
  const userRoles = userData.roles || (userData.role ? [userData.role] : []);
  
  const hasRole = (targetRoles) => {
      if (userRoles.includes('admin')) return true; 
      const targets = Array.isArray(targetRoles) ? targetRoles : [targetRoles];
      return targets.some(r => userRoles.includes(r));
  };

  return (
    <>
        <nav className="bg-zinc-900 p-3 shadow-2xl text-white sticky top-0 z-50 border-b border-yellow-500/20">
        <div className="container mx-auto flex justify-between items-center">
            
            <a href="/menu" className="flex items-center gap-3 hover:scale-105 transition group">
                <div className="h-14 w-14 rounded-full overflow-hidden border-2 border-yellow-400 shadow-[0_0_15px_rgba(250,204,21,0.3)] flex items-center justify-center shrink-0 bg-zinc-800">
                {storeLogo ? <img src={storeLogo} alt="Logo" className="h-full w-full object-cover" /> : <span className="text-3xl">🍔</span>}
                </div>
                <div className="flex items-center">
                    <span className="text-xl md:text-2xl font-black tracking-tight italic text-white drop-shadow-md [-webkit-text-stroke:1px_#ca8a04]">
                        Snacks Lizama
                    </span>
                    {getFestiveIcon()}
                </div>
            </a>

            <div className="flex items-center gap-4">
                
                {!isStandalone && (
                    <button 
                        onClick={handleInstallClick}
                        className="bg-yellow-500 hover:bg-yellow-400 text-black px-3 py-1.5 rounded-lg font-bold text-xs flex items-center gap-2 transition animate-pulse shadow-lg"
                    >
                        <FaDownload /> <span className="hidden md:inline">Instalar App</span>
                    </button>
                )}

                {user ? (
                <div className="flex items-center gap-4">
                    <div className="relative">
                    <button onClick={() => setMenuOpen(!menuOpen)} className="flex items-center gap-2 focus:outline-none">
                        <div className="w-10 h-10 rounded-full bg-zinc-800 text-white flex items-center justify-center font-bold overflow-hidden border-2 border-yellow-400 ring-2 ring-transparent hover:ring-yellow-400/50 transition">
                        {photoURL ? <img src={photoURL} alt="Perfil" className="w-full h-full object-cover" /> : displayName?.charAt(0).toUpperCase()}
                        </div>
                    </button>

                    {menuOpen && (
                        <div className="absolute right-0 mt-4 w-64 bg-zinc-800 rounded-xl shadow-2xl py-2 text-white z-50 animate-fade-in-down border border-zinc-700 max-h-[80vh] overflow-y-auto">
                        
                        <div className="px-4 py-3 border-b border-zinc-700">
                             <p className="text-sm font-bold text-white truncate">{displayName}</p>
                             <div className="flex flex-wrap gap-1 mt-1">
                                {userRoles.map(r => (
                                    <span key={r} className="text-[10px] bg-zinc-700 px-2 py-0.5 rounded text-gray-300 uppercase tracking-wider">{r}</span>
                                ))}
                             </div>
                        </div>
                        
                        <a href="/menu" className="block px-4 py-3 hover:bg-zinc-700 transition font-medium">📋 Ver Menú</a>
                        <a href="/orders" className="block px-4 py-3 hover:bg-zinc-700 transition font-medium">📦 Mis Pedidos</a>
                        <a href="/profile" className="block px-4 py-3 hover:bg-zinc-700 transition font-medium">👤 Mi Perfil</a>
                        
                        {hasRole(['hamburguesero']) && (
                            <a href="/kitchen" className="block px-4 py-3 hover:bg-zinc-700 transition font-medium text-yellow-400 font-bold">👨‍🍳 Cocina</a>
                        )}

                        {hasRole(['frappero']) && (
                            <a href="/frappes" className="block px-4 py-3 hover:bg-zinc-700 transition font-medium text-pink-400 font-bold">🥤 Frappes</a>
                        )}

                        {hasRole(['freidor', 'productor']) && (
                            <a href="/production" className="block px-4 py-3 hover:bg-zinc-700 transition font-medium text-orange-400 font-bold">🔥 Producción</a>
                        )}

                        {hasRole(['mesero', 'mesero 1', 'mesero 2']) && (
                            <a href="/waiter" className="block px-4 py-3 hover:bg-zinc-700 transition font-medium text-blue-400 font-bold">🛎️ Mesas</a>
                        )}

                        {hasRole(['repartidor', 'repartidor 1', 'repartidor 2']) && (
                            <a href="/delivery" className="block px-4 py-3 hover:bg-zinc-700 transition font-medium text-green-400 font-bold">🛵 Repartos</a>
                        )}

                        {hasRole('admin') && (
                            <>
                                <a href="/admin" className="block px-4 py-3 hover:bg-zinc-700 text-red-600 font-bold transition">🛠️ Administración</a>
                                <a href="/registros" className="block px-4 py-3 hover:bg-zinc-700 transition font-bold text-cyan-400">🗂️ Registros Empleados</a>
                            </>
                        )}

                        <div className="border-t border-zinc-700 mt-2 pt-2">
                            <button onClick={handleLogout} className="block w-full text-left px-4 py-3 hover:bg-red-900/30 text-red-600 font-bold transition flex items-center gap-2">
                                <FaSignOutAlt /> Cerrar Sesión
                            </button>
                        </div>
                        </div>
                    )}
                    </div>
                </div>
                ) : (
                    <a href="/login" className="bg-yellow-400 text-black px-6 py-2 rounded-full font-bold shadow-[0_0_10px_rgba(250,204,21,0.4)] hover:bg-yellow-300 hover:scale-105 transition-all">
                        Iniciar Sesión
                    </a>
                )}
            </div>
        </div>
        </nav>

        {showInstallModal && (
            <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-fade-in">
                <div className="bg-zinc-900 border border-zinc-700 p-6 rounded-2xl max-w-sm w-full relative shadow-2xl">
                    <button onClick={() => setShowInstallModal(false)} className="absolute top-3 right-3 text-gray-400 hover:text-white"><FaTimes size={20} /></button>
                    <div className="text-center">
                        <div className="bg-zinc-800 w-16 h-16 rounded-2xl mx-auto mb-4 flex items-center justify-center border-2 border-yellow-500 shadow-lg">
                             {storeLogo ? <img src={storeLogo} alt="Logo" className="rounded-xl w-full h-full object-cover" /> : <span className="text-2xl">🍔</span>}
                        </div>
                        <h3 className="text-xl font-bold text-white mb-2">Instalar Aplicación</h3>
                        {isIOS ? (
                            <>
                                <p className="text-gray-300 text-sm mb-6">En iPhone/iPad:</p>
                                <div className="bg-zinc-800 p-4 rounded-xl text-left space-y-4">
                                    <div className="flex items-center gap-3"><FaShare className="text-blue-500 text-xl" /><p className="text-sm text-gray-200">1. Toca <span className="font-bold text-white">Compartir</span>.</p></div>
                                    <div className="h-px bg-zinc-700"></div>
                                    <div className="flex items-center gap-3"><FaPlusSquare className="text-gray-200 text-xl" /><p className="text-sm text-gray-200">2. Selecciona <span className="font-bold text-white">"Agregar a Inicio"</span>.</p></div>
                                </div>
                            </>
                        ) : (
                            <>
                                <p className="text-gray-300 text-sm mb-6">Si no se instaló automáticamente:</p>
                                <div className="bg-zinc-800 p-4 rounded-xl text-left space-y-4">
                                    <div className="flex items-center gap-3"><FaEllipsisV className="text-gray-400 text-xl" /><p className="text-sm text-gray-200">1. Toca los <span className="font-bold text-white">3 puntos</span>.</p></div>
                                    <div className="h-px bg-zinc-700"></div>
                                    <div className="flex items-center gap-3"><FaDesktop className="text-gray-200 text-xl" /><p className="text-sm text-gray-200">2. Busca <span className="font-bold text-white">"Instalar Aplicación"</span>.</p></div>
                                </div>
                            </>
                        )}
                        <button onClick={() => setShowInstallModal(false)} className="mt-6 w-full bg-yellow-500 text-black font-bold py-3 rounded-xl hover:bg-yellow-400 transition">¡Entendido!</button>
                    </div>
                </div>
            </div>
        )}
    </>
  );
}