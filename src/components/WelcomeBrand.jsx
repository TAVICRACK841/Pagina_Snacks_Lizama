import { useState, useEffect } from 'react';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../firebase/config';

export default function WelcomeBrand() {
  const [logo, setLogo] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchLogo = async () => {
      try {
        const docRef = doc(db, "store_config", "main");
        const docSnap = await getDoc(docRef);
        if (docSnap.exists() && docSnap.data().logo) {
          setLogo(docSnap.data().logo);
        }
      } catch (e) {
        console.error("Error al cargar logo", e);
      }
      setLoading(false);
    };
    fetchLogo();
  }, []);

  return (
    <div className="text-center transform transition-all hover:scale-105 duration-500 mb-8 flex flex-col items-center">
      
      {/* Círculo del Logo */}
      <div className="h-40 w-40 rounded-full overflow-hidden border-4 border-white/30 shadow-2xl flex items-center justify-center bg-white/10 mb-6 backdrop-blur-sm relative">
        {loading ? (
           <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-white"></div>
        ) : logo ? (
            // Logo dinámico
            <img src={logo} alt="Snacks Lizama Logo" className="h-full w-full object-cover" />
        ) : (
            // Fallback (Hamburguesa) si no han subido logo
            <span className="text-7xl">🍔</span>
        )}
      </div>

      {/* Título con contorno amarillo */}
      <h1 className="text-5xl md:text-6xl font-extrabold text-white tracking-tight italic drop-shadow-xl [-webkit-text-stroke:2px_#FACC15]">
        Snacks Lizama
      </h1>
      
      <p className="mt-3 text-orange-100 text-lg font-medium tracking-wide">
        ¡Tu antojo favorito, rápido y fácil!
      </p>
    </div>
  );
}