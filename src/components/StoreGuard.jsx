import { useState, useEffect } from 'react';
import { db, auth } from '../firebase/config';
import { doc, onSnapshot, getDoc } from 'firebase/firestore';
import { FaLock, FaClock } from 'react-icons/fa';

export default function StoreGuard({ children }) {
  const [isOpen, setIsOpen] = useState(true);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    // Verificar si es admin (para dejarlo pasar aunque esté cerrado)
    const checkAdmin = async (user) => {
        if (!user) return;
        const userSnap = await getDoc(doc(db, "users", user.uid));
        if (userSnap.exists() && userSnap.data().role === 'admin') {
            setIsAdmin(true);
        }
    };

    const unsubAuth = auth.onAuthStateChanged((user) => {
        if (user) checkAdmin(user);
    });

    const unsubConfig = onSnapshot(doc(db, "store_config", "main"), (docSnap) => {
      if (docSnap.exists()) {
        setIsOpen(docSnap.data().isOpen);
      }
      setLoading(false);
    });

    return () => { unsubConfig(); unsubAuth(); };
  }, []);

  if (loading) return <div className="min-h-screen bg-zinc-950 flex items-center justify-center text-yellow-400 animate-pulse text-xl font-bold">Cargando...</div>;

  // Si está cerrado y NO es admin, mostramos la pantalla de bloqueo
  if (!isOpen && !isAdmin) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-6 text-center bg-zinc-950 relative overflow-hidden">
        
        {/* Fondo decorativo sutil */}
        <div className="absolute top-0 left-0 w-full h-full opacity-10 pointer-events-none">
            <div className="absolute top-10 left-10 w-32 h-32 bg-yellow-500 rounded-full blur-[100px]"></div>
            <div className="absolute bottom-10 right-10 w-32 h-32 bg-red-500 rounded-full blur-[100px]"></div>
        </div>

        <div className="bg-zinc-900/80 backdrop-blur-md p-10 rounded-3xl border border-zinc-800 shadow-[0_0_50px_rgba(0,0,0,0.5)] max-w-lg w-full transform hover:scale-[1.02] transition-transform duration-500">
            
            <div className="mb-6 flex justify-center">
                <div className="bg-zinc-800 p-6 rounded-full shadow-inner border border-zinc-700">
                    <FaLock className="text-6xl text-yellow-400 animate-bounce" />
                </div>
            </div>
            
            <h1 className="text-4xl md:text-5xl font-black text-white mb-4 uppercase tracking-wider drop-shadow-lg">
                Local <span className="text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 to-red-500">Cerrado</span>
            </h1>
            
            <p className="text-gray-300 text-lg mb-8 font-light">
                Nuestro equipo está recargando energías. 
                <br/>¡Vuelve pronto por tus snacks favoritos!
            </p>

            <div className="inline-flex items-center gap-2 bg-zinc-800 px-5 py-2 rounded-full border border-yellow-500/30 shadow-lg">
                <FaClock className="text-yellow-400"/>
                <span className="text-sm font-bold text-gray-200">Horario: Consulta nuestras redes</span>
            </div>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}