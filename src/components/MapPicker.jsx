import { useState, useEffect } from 'react';
import { FaMapMarkerAlt, FaLocationArrow, FaCheck, FaTimes, FaSatelliteDish, FaExclamationTriangle } from 'react-icons/fa';
import { MapContainer, TileLayer, Marker, useMapEvents, useMap } from 'react-leaflet';
import { renderToStaticMarkup } from 'react-dom/server';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

// --- COORDENADAS BASE: BUCTZOTZ ---
const START_COORDS = { lat: 21.2033, lng: -88.7885 };

// --- ICONO SVG ---
const createCustomIcon = () => {
  const iconMarkup = renderToStaticMarkup(
    <div style={{ position: 'relative', display: 'flex', justifyContent: 'center', alignItems: 'center', width: '50px', height: '50px' }}>
        <FaMapMarkerAlt style={{ color: '#eab308', fontSize: '45px', filter: 'drop-shadow(0px 4px 4px rgba(0,0,0,0.6))' }} />
    </div>
  );
  return L.divIcon({
    html: iconMarkup,
    className: 'custom-marker-dummy', 
    iconSize: [50, 50],
    iconAnchor: [25, 50],
  });
};
const customIcon = createCustomIcon();

// --- COMPONENTE INTERNO ---
function LocationMarker({ position, setPosition }) {
  const map = useMap();

  useMapEvents({
    click(e) {
      setPosition(e.latlng);
      map.flyTo(e.latlng, map.getZoom(), { animate: true, duration: 0.8 });
    },
  });

  useEffect(() => {
    if (position) {
        map.flyTo(position, 17, { animate: true, duration: 1.5 });
    }
  }, [position, map]);

  return position === null ? null : <Marker position={position} icon={customIcon}></Marker>;
}

export default function MapPicker({ onConfirm, onClose }) {
  const [position, setPosition] = useState(null); 
  const [addressAlias, setAddressAlias] = useState('');
  const [loading, setLoading] = useState(false); // Iniciamos en false para evitar bloqueos
  const [gpsError, setGpsError] = useState(null); // Para mostrar avisos

  // --- AUTOAJUSTE GPS ROBUSTO ---
  const autoAdjustToDevice = () => {
    setGpsError(null);
    setLoading(true);

    // 1. Verificar Seguridad (HTTPS vs HTTP)
    const isSecure = window.isSecureContext;
    if (!isSecure && window.location.hostname !== 'localhost') {
        setLoading(false);
        setGpsError("GPS requiere HTTPS. Usa el mapa manual.");
        return; 
    }

    if (!navigator.geolocation) {
        setLoading(false);
        return;
    }

    // 2. Timeout de seguridad (Si en 8 seg no responde, cancelamos)
    const timeoutId = setTimeout(() => {
        if(loading) {
            setLoading(false);
            setGpsError("La señal GPS tardó mucho.");
        }
    }, 8000);

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        clearTimeout(timeoutId); // Cancelamos el timeout porque sí respondió
        setPosition({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setLoading(false);
      },
      (err) => {
        clearTimeout(timeoutId);
        console.error("GPS Error:", err);
        setLoading(false);
        // No mostramos error invasivo, solo dejamos de cargar
      },
      { enableHighAccuracy: true, timeout: 7000, maximumAge: 0 }
    );
  };

  // Intentar una vez al abrir
  useEffect(() => { autoAdjustToDevice(); }, []);

  // --- FUNCIÓN DE GUARDADO CORREGIDA (Arregla error de Laptop) ---
  const handleConfirm = () => {
    if (!position) return alert("Toca el mapa para poner el pin.");
    if (!addressAlias.trim()) return alert("Escribe un nombre.");
    
    // LIMPIEZA DE DATOS: Creamos un objeto simple
    const cleanCoords = {
        lat: Number(position.lat),
        lng: Number(position.lng)
    };

    onConfirm({
      text: `${cleanCoords.lat.toFixed(5)}, ${cleanCoords.lng.toFixed(5)}`, 
      coords: cleanCoords, 
      alias: addressAlias
    });
  };

  return (
    <div className="fixed inset-0 z-[9999] bg-black/95 flex items-center justify-center p-3 animate-fade-in backdrop-blur-sm">
      
      <div className="bg-zinc-900 w-full max-w-lg rounded-2xl overflow-hidden shadow-2xl border-2 border-yellow-500/50 flex flex-col h-[65vh] md:h-[80vh]">
        
        {/* HEADER */}
        <div className="bg-yellow-500 p-3 flex justify-between items-center text-black shrink-0 z-10 shadow-md">
            <h3 className="font-black text-base md:text-lg uppercase flex items-center gap-2">
                <FaMapMarkerAlt/> Ubicación
            </h3>
            <button onClick={onClose} className="hover:bg-black/10 p-2 rounded-full transition-colors">
                <FaTimes size={20}/>
            </button>
        </div>

        {/* MAPA */}
        <div className="flex-1 relative w-full bg-zinc-800">
             <MapContainer 
                center={[START_COORDS.lat, START_COORDS.lng]} 
                zoom={15} 
                style={{ height: '100%', width: '100%', background: '#222' }}
             >
                <TileLayer
                    url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
                    attribution='&copy; CARTO'
                />
                <LocationMarker position={position} setPosition={setPosition} />
            </MapContainer>

            {/* OVERLAYS (Carga y Errores) */}
            {loading && (
                <div className="absolute inset-0 bg-black/60 z-[500] flex items-center justify-center backdrop-blur-sm pointer-events-none">
                    <div className="text-yellow-500 font-bold animate-pulse flex flex-col items-center text-sm">
                        <FaSatelliteDish className="animate-bounce mb-2" size={24}/>
                        Localizando...
                    </div>
                </div>
            )}

            {/* AVISO DISCRETO SI FALLA EL GPS */}
            {!loading && gpsError && (
                 <div className="absolute top-2 left-1/2 -translate-x-1/2 bg-zinc-800/90 text-yellow-500 px-3 py-1 rounded-full text-[10px] border border-yellow-500/30 flex items-center gap-2 z-[400] shadow-lg whitespace-nowrap">
                    <FaExclamationTriangle/> {gpsError}
                 </div>
            )}
            
            <button 
                onClick={autoAdjustToDevice}
                className="absolute bottom-4 right-4 z-[400] bg-zinc-900 text-yellow-500 p-3 rounded-full shadow-lg border border-yellow-500 hover:bg-yellow-500 hover:text-black transition-all active:scale-95"
            >
                <FaLocationArrow size={18} />
            </button>
        </div>

        {/* FOOTER */}
        <div className="p-4 bg-zinc-900 border-t border-zinc-700 shrink-0 space-y-3">
            <div className="text-center h-5">
                {position ? (
                    <span className="text-green-500 text-[10px] md:text-xs font-bold uppercase tracking-widest flex items-center justify-center gap-2">
                        <FaCheck/> Ubicación fijada
                    </span>
                ) : (
                    <span className="text-gray-400 text-[10px] md:text-xs animate-pulse">
                        📍 Toca el mapa para ajustar
                    </span>
                )}
            </div>
            
            <input 
                type="text" 
                placeholder="Nombre (Ej: Casa portón negro...)" 
                className="w-full p-3 rounded-xl bg-zinc-800 border border-zinc-600 text-white placeholder-gray-500 focus:border-yellow-500 focus:outline-none font-bold text-base"
                value={addressAlias}
                onChange={(e) => setAddressAlias(e.target.value)}
            />
            
            <button 
                onClick={handleConfirm} 
                className="w-full bg-yellow-500 hover:bg-yellow-400 text-black font-black py-3 rounded-xl shadow-lg flex items-center justify-center gap-2 transition-transform active:scale-95 uppercase tracking-wide text-sm md:text-base"
            >
                Confirmar
            </button>
        </div>
      </div>
    </div>
  );
}