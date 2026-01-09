import { useState, useEffect } from 'react';
import { db } from '../firebase/config';
import { collection, onSnapshot, doc, updateDoc } from 'firebase/firestore';
import { FaMotorcycle, FaMapMarkedAlt, FaCheck, FaLocationArrow, FaPhone, FaBoxOpen } from 'react-icons/fa';
import { showToast } from '../stores/toastStore';

export default function DeliveryDashboard() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // ESCUCHAMOS TODA LA COLECCIÓN (Sin filtros complejos para evitar error de índices)
    const unsub = onSnapshot(collection(db, "orders"), (snapshot) => {
        const list = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

        // FILTRADO MANUAL: Solo Domicilio y estados activos (incluyendo 'listo')
        const filtered = list.filter(order => 
            order.type === 'domicilio' && 
            ['pendiente', 'preparando', 'listo', 'en_camino'].includes(order.status)
        );

        // ORDENAR: Prioridad a los que están LISTOS y EN CAMINO
        filtered.sort((a, b) => {
            const statusOrder = { 'listo': 1, 'en_camino': 2, 'preparando': 3, 'pendiente': 4 };
            return statusOrder[a.status] - statusOrder[b.status];
        });

        setOrders(filtered);
        setLoading(false);
    });

    return () => unsub();
  }, []);

  const startRoute = async (order) => {
      // Al dar click en "Iniciar Ruta" o "Recoger", pasamos a 'en_camino'
      if(order.status !== 'en_camino') {
          await updateDoc(doc(db, "orders", order.id), { status: 'en_camino' });
      }

      // Generar URL del Mapa
      let url = '';
      if (order.locationCoords && order.locationCoords.lat) {
          const { lat, lng } = order.locationCoords;
          url = `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}&travelmode=driving`;
      } else {
          const addressQuery = encodeURIComponent(`${order.detail}, Tizimín, Yucatan`);
          url = `https://www.google.com/maps/dir/?api=1&destination=${addressQuery}&travelmode=driving`;
      }
      window.open(url, '_blank');
  };

  const markDelivered = async (id) => {
      if(!confirm("¿Entregado y cobrado?")) return;
      await updateDoc(doc(db, "orders", id), { status: 'entregado' });
      showToast("¡Entrega exitosa!", "success");
  };

  if (loading) return <div className="p-10 text-center text-white animate-pulse">Cargando repartos...</div>;

  return (
    <div className="p-4 max-w-2xl mx-auto pb-24">
        <div className="flex items-center gap-3 mb-6 bg-zinc-800 p-4 rounded-xl border border-zinc-700 shadow-lg">
            <div className="bg-yellow-500 p-3 rounded-full text-black"><FaMotorcycle size={24}/></div>
            <div>
                <h1 className="text-2xl font-black text-white uppercase">Repartos</h1>
                <p className="text-xs text-gray-400">{orders.length} pedidos activos</p>
            </div>
        </div>

        <div className="space-y-6">
            {orders.length === 0 ? (
                <div className="text-center py-20 bg-zinc-900 rounded-xl border border-dashed border-zinc-700">
                    <p className="text-gray-500 font-bold">Sin pedidos pendientes 😴</p>
                </div>
            ) : (
                orders.map(order => (
                    <div key={order.id} className={`bg-zinc-800 border-2 rounded-2xl overflow-hidden shadow-2xl relative transition-all ${order.status === 'listo' ? 'border-green-500 shadow-green-500/30' : 'border-zinc-700'}`}>
                        
                        {/* AVISO IMPORTANTE: LISTO EN COCINA */}
                        {order.status === 'listo' && (
                            <div className="bg-green-600 text-white text-center text-sm font-black uppercase py-2 animate-pulse flex items-center justify-center gap-2">
                                <FaBoxOpen /> ¡PEDIDO LISTO EN COCINA! <FaBoxOpen />
                            </div>
                        )}

                        <div className="p-5">
                            {/* Header Cliente */}
                            <div className="flex justify-between items-start mb-4">
                                <div>
                                    <h2 className="text-xl font-black text-white">{order.userName}</h2>
                                    {order.userPhone && (
                                        <a href={`tel:${order.userPhone}`} className="text-blue-400 text-sm font-bold flex items-center gap-1 hover:underline"><FaPhone/> {order.userPhone}</a>
                                    )}
                                </div>
                                <span className={`px-3 py-1 rounded text-xs font-bold uppercase ${order.status === 'en_camino' ? 'bg-blue-600 text-white' : 'bg-zinc-700 text-gray-400'}`}>
                                    {order.status.replace('_', ' ')}
                                </span>
                            </div>

                            {/* Dirección */}
                            <div className="bg-black/30 p-3 rounded-lg mb-4 border-l-4 border-yellow-500">
                                <p className="text-gray-400 text-[10px] uppercase font-bold mb-1">Destino:</p>
                                <p className="text-white font-bold text-lg leading-tight flex gap-2">
                                    <FaMapMarkedAlt className="text-yellow-500 mt-1 shrink-0"/> {order.detail}
                                </p>
                                {order.locationCoords && <p className="text-[10px] text-green-500 mt-1">📡 GPS Exacto</p>}
                            </div>

                            {/* Info Pago */}
                            <div className="flex justify-between items-center bg-zinc-700/30 p-3 rounded-xl mb-4 border border-zinc-700">
                                <div><p className="text-[10px] text-gray-400 uppercase font-bold">Cobrar</p><p className="text-3xl font-black text-green-500">${order.total}</p></div>
                                <div className="text-right"><p className="text-[10px] text-gray-400 uppercase font-bold">Pago</p><p className="font-bold text-white uppercase text-sm bg-zinc-600 px-2 py-1 rounded">{order.paymentMethod}</p></div>
                            </div>

                            {/* Botones */}
                            <div className="grid grid-cols-1 gap-3">
                                {/* EL BOTÓN CAMBIA SEGÚN EL ESTADO */}
                                <button 
                                    onClick={() => startRoute(order)}
                                    className={`w-full py-4 rounded-xl font-black flex items-center justify-center gap-2 shadow-lg active:scale-95 transition-transform text-lg ${order.status === 'listo' ? 'bg-yellow-500 text-black hover:bg-yellow-400 animate-bounce-short' : 'bg-blue-600 text-white hover:bg-blue-500'}`}
                                >
                                    {order.status === 'listo' ? <><FaMotorcycle/> RECOGER Y LLEVAR</> : <><FaLocationArrow/> VER MAPA / RUTA</>}
                                </button>

                                <button 
                                    onClick={() => markDelivered(order.id)}
                                    className="bg-zinc-700 hover:bg-green-600 hover:text-white text-gray-300 font-bold py-4 rounded-xl flex items-center justify-center gap-2 border border-zinc-600 transition-colors active:scale-95"
                                >
                                    <FaCheck /> YA ENTREGUÉ
                                </button>
                            </div>
                        </div>
                    </div>
                ))
            )}
        </div>
    </div>
  );
}