import { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, useMapEvents } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

// SOLUCIÓN AL BUG DEL ICONO INVISIBLE EN LEAFLET
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

function LocationMarker({ onLocationSelect }) {
  const [position, setPosition] = useState(null);
  
  const map = useMapEvents({
    click(e) {
      setPosition(e.latlng);
      onLocationSelect(e.latlng);
    },
    locationfound(e) {
      setPosition(e.latlng);
      map.flyTo(e.latlng, map.getZoom());
      onLocationSelect(e.latlng);
    },
  });

  useEffect(() => {
    map.locate(); // Pide ubicación al celular/PC
  }, [map]);

  return position === null ? null : (
    <Marker position={position}></Marker>
  );
}

export default function MapPicker({ onConfirm, onClose }) {
  const [selectedPos, setSelectedPos] = useState(null);
  const [alias, setAlias] = useState(''); // Nombre del lugar

  const handleConfirm = () => {
    if (!selectedPos) return alert("Toca el mapa para poner un pin");
    if (!alias.trim()) return alert("Ponle un nombre a esta ubicación (ej. Casa, Trabajo)");

    // Creamos el texto final
    const locationString = `[${alias}] Ubicación GPS: ${selectedPos.lat.toFixed(5)}, ${selectedPos.lng.toFixed(5)}`;
    
    // Guardamos objeto completo
    onConfirm({
        text: locationString,
        alias: alias,
        coords: { lat: selectedPos.lat, lng: selectedPos.lng }
    }); 
  };

  return (
    <div className="fixed inset-0 z-[200] bg-black/80 flex items-center justify-center p-4">
      <div className="bg-white w-full max-w-lg rounded-xl overflow-hidden shadow-2xl h-[600px] flex flex-col relative">
        
        {/* Encabezado */}
        <div className="p-4 bg-orange-600 text-white flex justify-between items-center shadow-md z-10">
          <h3 className="font-bold text-lg">📍 Selecciona Ubicación</h3>
          <button onClick={onClose} className="text-2xl font-bold hover:text-gray-200">×</button>
        </div>
        
        {/* Mapa */}
        <div className="flex-1 relative z-0">
          <MapContainer center={[20.96, -89.61]} zoom={13} style={{ height: '100%', width: '100%' }}>
            <TileLayer
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              attribution='&copy; OpenStreetMap'
            />
            <LocationMarker onLocationSelect={setSelectedPos} />
          </MapContainer>
        </div>

        {/* Formulario Flotante Inferior */}
        <div className="p-4 bg-white border-t z-10 flex flex-col gap-3">
            <p className="text-xs text-gray-500 text-center">1. Toca el mapa para ubicarte. 2. Ponle nombre. 3. Confirma.</p>
            
            <input 
                type="text" 
                placeholder="Nombre del lugar (Ej. Casa de Juan)" 
                className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-orange-500 outline-none font-bold"
                value={alias}
                onChange={(e) => setAlias(e.target.value)}
                autoFocus
            />

            <button 
                onClick={handleConfirm}
                className="w-full bg-green-600 text-white py-3 rounded-lg font-bold hover:bg-green-700 text-lg shadow-lg"
            >
            Confirmar Ubicación
            </button>
        </div>
      </div>
    </div>
  );
}