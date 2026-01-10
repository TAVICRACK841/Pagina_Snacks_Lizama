import { useState, useEffect } from 'react';
import { auth, db } from '../firebase/config';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { doc, onSnapshot, getDoc, setDoc } from 'firebase/firestore';
import { FaSignOutAlt, FaDownload, FaShare, FaPlusSquare, FaTimes } from 'react-icons/fa'; // <--- ICONOS NUEVOS AGREGADOS

export default function Navbar() {
  const [user, setUser] = useState(null);
  const [userData, setUserData] = useState({});
  const [menuOpen, setMenuOpen] = useState(false);
  const [storeLogo, setStoreLogo] = useState(null);
  const [currentTheme, setCurrentTheme] = useState('normal');

  // --- ESTADOS PARA PWA (Instalación) ---
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [isIOS, setIsIOS] = useState(false);
  const [showIOSInstructions, setShowIOSInstructions] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);

  useEffect(() => {
    // 1. Configuración de Tienda
    const unsubscribeConfig = onSnapshot(doc(db, "store_config", "main"), (docSnap) => {
        if (docSnap.exists()) {
            const data = docSnap.data();
            if (data.logo) setStoreLogo(data.logo);
            if (data.theme) setCurrentTheme(data.theme);
        }
    });

    // 2. Autenticación
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
            await setDoc(userRef, { displayName: finalName, email: currentUser.email, photoURL: googlePhoto || null, role: 'cliente', savedAddresses: [], createdAt: new Date().toISOString() });
        }
        
        onSnapshot(userRef, (docSnap) => {
            if (docSnap.exists()) setUserData(docSnap.data());
        });
      } else {
        setUser(null);
        setUserData({});
      }
    });

    // 3. Lógica PWA (Instalación)
    // Detectar si ya está instalada (Standalone)
    if (window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true) {
        setIsStandalone(true);
    }

    // Detectar evento en Android/PC
    const handleBeforeInstallPrompt = (e) => {
        e.preventDefault();
        setDeferredPrompt(e);
    };
    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    // Detectar si es iOS (iPhone/iPad)
    const ios = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
    setIsIOS(ios);

    return () => { 
        unsubscribeAuth(); 
        unsubscribeConfig(); 
        window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const handleLogout = async () => {
    await signOut(auth);
    window.location.href = '/';
  };

  // Función del botón "Instalar App"
  const handleInstallClick = async () => {
    if (isIOS) {
        // En iOS mostramos las instrucciones manuales
        setShowIOSInstructions(true);
    } else if (deferredPrompt) {
        // En Android/PC lanzamos el instalador nativo
        deferredPrompt.prompt();
        const { outcome } = await deferredPrompt.userChoice;
        if (outcome === 'accepted') {
            setDeferredPrompt(null);
        }
    }
  };

  const getFestiveIcon = () => {
      switch(currentTheme) {
          case 'navidad': return <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" className="w-8 h-8 ml-2 animate-bounce fill-white drop-shadow-lg"><path d="m24,20.998v3.002l-24,.002v-3.002c0-1.654,1.346-3,3-3h18c1.654,0,3,1.344,3,2.998Zm-4.114-11.133c-2.223-.508-3.886-2.488-3.886-4.865,0-.4.06-.784.149-1.157.351-.843.797-1.528,1.351-1.343.584.194.885.382,1.178.622-.417.515-.678,1.163-.678,1.878,0,1.657,1.343,3,3,3s3-1.343,3-3-1.343-3-3-3c-.18,0-.353.023-.524.053-1.187-1.032-2.951-2.053-5.333-2.053C11.116,0,4.323,4.395,2.297,16h19.337c-.408-2.334-1.016-4.361-1.747-6.135Z"/></svg>;
          case 'halloween': return <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" className="w-8 h-8 ml-2 animate-pulse fill-white drop-shadow-lg"><path d="m17.144,6c-.407,0-.769.115-1.091.329,0,0-.17.113-.417.284-.603-.391-1.209-.613-1.765-.613-.288,0-.568.069-.84.179.31-4.126,2.94-4.179,2.969-4.179.551,0,1,.449,1.001,1v2c1.102,0,1.999-.897,1.999-2,0-1.654-1.346-3-3-3-1.121,0-2.884.623-3.99,2.563-.592-1.07-1.441-1.897-2.563-2.457l-.895,1.789c1.466.733,2.257,2.142,2.414,4.284-.272-.11-.551-.179-.838-.179-.561,0-1.172.226-1.781.623-.237-.178-.4-.294-.4-.294-.322-.215-.684-.329-1.091-.329C4.446,6,0,10.029,0,15s4.465,9,6.874,9c.516,0,.956-.199,1.337-.538.541.342,1.088.538,1.606.538.253,0,.693-.137,1.072-.29.356.183.726.29,1.11.29s.755-.108,1.11-.29c.379.154.818.29,1.072.29.518,0,1.066-.196,1.607-.538.381.34.821.538,1.337.538,2.41,0,6.874-4.029,6.874-9s-4.446-9-6.856-9Zm-1.644,4l2.286,4h-4.571l2.286-4Zm-7,0l2.286,4h-4.571l2.286-4Zm6.5,9.5v-1.5h-2v1.924c-.163.016-.318.041-.488.049-.169.017-.339.027-.512.027-6,0-8-5-8-5,0,0,1.587,1.262,5,1.78v1.22h2v-1.023c.322.015.655.023,1,.023,5.5,0,8-2,8-2,0,0-1.325,3.252-5,4.5Z"/></svg>;
          case 'reyes': return <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" className="w-8 h-8 ml-2 animate-bounce fill-white drop-shadow-lg"><path d="M22.053,3.053l-2.63,2.63-2.884-3.75c-.322-.419-.956-.419-1.278,0l-2.884,3.75-2.884-3.75c-.322-.419-.956-.419-1.278,0l-2.884,3.75L2.697,3.053c-.689-.689-1.848-.376-2.096.566l-1.385,5.253c-1.164,4.416,2.158,8.128,6.284,8.128h13c4.126,0,7.448-3.712,6.284-8.128l-1.385-5.253c-.248-.942-1.407-1.255-2.096-.566ZM1.503,19c-.828,0-1.5.672-1.5,1.5v.5c0,1.657,1.343,3,3,3h17c1.657,0,3-1.343,3-3v-.5c0-.828-.672-1.5-1.5-1.5H1.503Z"/></svg>;
          default: return null;
      }
  };

  const displayName = userData.displayName || user?.displayName || user?.email?.split('@')[0];
  const photoURL = userData.photoURL || user?.photoURL;
  const role = userData.role;

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
                
                {/* --- BOTÓN DE INSTALAR APP (Solo si no está instalada) --- */}
                {!isStandalone && (deferredPrompt || isIOS) && (
                    <button 
                        onClick={handleInstallClick}
                        className="hidden md:flex bg-yellow-500 hover:bg-yellow-400 text-black px-3 py-1.5 rounded-lg font-bold text-xs items-center gap-2 transition animate-pulse shadow-lg"
                    >
                        <FaDownload /> App
                    </button>
                )}

                {/* Versión móvil del botón de instalar (ícono solo) */}
                {!isStandalone && (deferredPrompt || isIOS) && (
                    <button 
                        onClick={handleInstallClick}
                        className="md:hidden bg-yellow-500 text-black p-2 rounded-full font-bold shadow-lg animate-pulse"
                    >
                        <FaDownload size={14} />
                    </button>
                )}
                {/* -------------------------------------------------------- */}

                {user ? (
                <div className="flex items-center gap-4">
                    <div className="relative">
                    <button onClick={() => setMenuOpen(!menuOpen)} className="flex items-center gap-2 focus:outline-none">
                        <div className="w-10 h-10 rounded-full bg-zinc-800 text-white flex items-center justify-center font-bold overflow-hidden border-2 border-yellow-400 ring-2 ring-transparent hover:ring-yellow-400/50 transition">
                        {photoURL ? <img src={photoURL} alt="Perfil" className="w-full h-full object-cover" /> : displayName?.charAt(0).toUpperCase()}
                        </div>
                    </button>

                    {menuOpen && (
                        <div className="absolute right-0 mt-4 w-64 bg-zinc-800 rounded-xl shadow-2xl py-2 text-white z-50 animate-fade-in-down border border-zinc-700">
                        
                        {role && <div className="px-4 py-3 border-b border-zinc-700 text-xs font-bold text-red-600 uppercase tracking-widest">Rol: {role}</div>}
                        
                        <a href="/menu" className="block px-4 py-3 hover:bg-zinc-700 transition font-medium">📋 Ver Menú</a>
                        <a href="/orders" className="block px-4 py-3 hover:bg-zinc-700 transition font-medium">📦 Mis Pedidos</a>
                        <a href="/profile" className="block px-4 py-3 hover:bg-zinc-700 transition font-medium">👤 Mi Perfil</a>
                        
                        {/* COCINA */}
                        {['admin', 'hamburguesero'].includes(role) && (
                            <a href="/kitchen" className="block px-4 py-3 hover:bg-zinc-700 transition font-medium text-yellow-400 font-bold">👨‍🍳 Cocina</a>
                        )}

                        {/* PRODUCCIÓN */}
                        {['admin', 'freidor', 'productor'].includes(role) && (
                            <a href="/production" className="block px-4 py-3 hover:bg-zinc-700 transition font-medium text-orange-400 font-bold">🔥 Producción</a>
                        )}

                        {/* MESAS */}
                        {['admin', 'mesero 1', 'mesero 2'].includes(role) && (
                            <a href="/waiter" className="block px-4 py-3 hover:bg-zinc-700 transition font-medium text-blue-400 font-bold">🛎️ Mesas</a>
                        )}

                        {/* REPARTOS */}
                        {['admin', 'repartidor 1', 'repartidor 2'].includes(role) && (
                            <a href="/delivery" className="block px-4 py-3 hover:bg-zinc-700 transition font-medium text-green-400 font-bold">🛵 Repartos</a>
                        )}

                        {/* ADMIN */}
                        {role === 'admin' && (
                            <a href="/admin" className="block px-4 py-3 hover:bg-zinc-700 text-red-600 font-bold transition">🛠️ Administración</a>
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

        {/* --- MODAL INSTRUCCIONES PARA iOS (IPHONE/IPAD) --- */}
        {showIOSInstructions && (
            <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-fade-in">
                <div className="bg-zinc-900 border border-zinc-700 p-6 rounded-2xl max-w-sm w-full relative shadow-2xl">
                    <button onClick={() => setShowIOSInstructions(false)} className="absolute top-3 right-3 text-gray-400 hover:text-white">
                        <FaTimes size={20} />
                    </button>
                    
                    <div className="text-center">
                        <div className="bg-zinc-800 w-16 h-16 rounded-2xl mx-auto mb-4 flex items-center justify-center border-2 border-yellow-500 shadow-lg">
                             {storeLogo ? <img src={storeLogo} alt="Logo" className="rounded-xl w-full h-full object-cover" /> : <span className="text-2xl">🍔</span>}
                        </div>
                        <h3 className="text-xl font-bold text-white mb-2">Instalar en iPhone</h3>
                        <p className="text-gray-300 text-sm mb-6">Esta App no está en la App Store, pero puedes instalarla así:</p>
                        
                        <div className="bg-zinc-800 p-4 rounded-xl text-left space-y-4">
                            <div className="flex items-center gap-3">
                                <FaShare className="text-blue-500 text-xl" />
                                <p className="text-sm text-gray-200">1. Toca el botón <span className="font-bold text-white">Compartir</span> en la barra inferior.</p>
                            </div>
                            <div className="h-px bg-zinc-700"></div>
                            <div className="flex items-center gap-3">
                                <FaPlusSquare className="text-gray-200 text-xl" />
                                <p className="text-sm text-gray-200">2. Baja y selecciona <span className="font-bold text-white">"Agregar a Inicio"</span>.</p>
                            </div>
                        </div>

                        <button onClick={() => setShowIOSInstructions(false)} className="mt-6 w-full bg-yellow-500 text-black font-bold py-3 rounded-xl hover:bg-yellow-400 transition">
                            ¡Entendido!
                        </button>
                    </div>
                </div>
            </div>
        )}
    </>
  );
}