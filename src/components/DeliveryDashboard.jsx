import { useState, useEffect } from 'react';
import { db, auth } from '../firebase/config';
import { collection, query, where, onSnapshot, doc, updateDoc } from 'firebase/firestore';
import { FaMotorcycle, FaMapMarkerAlt, FaWhatsapp, FaTrash, FaCheck, FaMapSigns } from 'react-icons/fa';
import { showToast } from '../stores/toastStore';
import { onAuthStateChanged } from 'firebase/auth';

export default function DeliveryDashboard() {
  const [orders, setOrders] = useState([]);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubAuth = onAuthStateChanged(auth, (u) => setUser(u));
    return () => unsubAuth();
  }, []);

  useEffect(() => {
    const q = query(
      collection(db, "orders"),
      where("status", "in", ["listo", "en_camino"])
    );
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const list = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      
      // FILTRO CORREGIDO: AHORA SOLO MUESTRA PEDIDOS "DOMICILIO"
      const deliveryOrders = list.filter(order => order.type === 'domicilio');

      deliveryOrders.sort((a, b) => {
          const dateA = a.createdAt?.toDate ? a.createdAt.toDate() : new Date(a.createdAt);
          const dateB = b.createdAt?.toDate ? b.createdAt.toDate() : new Date(b.createdAt);
          return dateA - dateB;
      });
      
      setOrders(deliveryOrders);
      setLoading(false);
    }, (error) => {
        console.error("Error cargando repartos:", error);
        setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // --- BOTÓN UBICACIÓN: ABRIR RUTA EN GOOGLE MAPS ---
  const openLocation = (order) => {
      let destination = "";

      // 1. Si el pedido guardó explícitamente latitud y longitud
      if (order.location && order.location.lat && order.location.lng) {
          destination = `${order.location.lat},${order.location.lng}`;
      } 
      // 2. Extraer coordenadas del texto si las hay
      else if (order.detail) {
          const regexCoord = /(-?\d+(\.\d+)?),\s*(-?\d+(\.\d+)?)/;
          const match = order.detail.match(regexCoord);
          
          if (match) {
              destination = `${match[1]},${match[3]}`;
          } else {
              // Si es solo texto puro (calle y colonia), lo codificamos
              destination = encodeURIComponent(order.detail);
          }
      }

      if (destination) {
          // Genera el enlace correcto de la API de Google Maps para trazar la ruta
          const mapsUrl = `https://www.google.com/maps/dir/?api=1&destination=${destination}`;
          window.open(mapsUrl, '_blank');
      } else {
          showToast("No hay ubicación válida", "error");
      }
  };

  const takeOrder = async (orderId) => {
      if (!user) return;
      try {
          await updateDoc(doc(db, "orders", orderId), { 
              status: 'en_camino', 
              deliveredBy: user.uid, 
              deliveredByName: user.displayName || user.email 
          });
          showToast("🛵 ¡Pedido asignado a ti!", 'success');
      } catch (error) { showToast("Error al tomar pedido", 'error'); }
  };

  const completeOrder = async (orderId) => {
      if(!confirm("¿Confirmar que el pedido fue entregado y cobrado?")) return;
      try { 
          await updateDoc(doc(db, "orders", orderId), { status: 'entregado' }); 
          showToast("✅ ¡Entrega completada!", 'success'); 
      } catch (error) { showToast("Error al finalizar", 'error'); }
  };

  const cancelOrder = async (orderId) => {
      if(!confirm("¿Cancelar este pedido definitivamente?")) return;
      try { 
          await updateDoc(doc(db, "orders", orderId), { status: 'cancelado' }); 
          showToast("🚫 Pedido Cancelado", 'error'); 
      } catch (error) { showToast("Error al cancelar", 'error'); }
  };

  const visibleOrders = orders.filter(order => {
      const isTakenByMe = order.deliveredBy === user?.uid;
      const isTakenByOther = order.status === 'en_camino' && !isTakenByMe;
      return !isTakenByOther; 
  });

  if (loading) return <div className="p-10 text-center text-white animate-pulse">Cargando repartos...</div>;

  return (
    <div className="p-4 min-h-screen pb-20 bg-zinc-900 text-white">
      
      {/* HEADER */}
      <div className="flex justify-between items-center mb-6 bg-black p-4 rounded-xl border border-yellow-500/30 shadow-lg">
          <h1 className="text-2xl font-black text-yellow-500 flex items-center gap-3">
              <FaMotorcycle className="text-3xl" /> Repartos a Domicilio
          </h1>
          <span className="bg-yellow-500 text-black px-4 py-1.5 rounded-full font-black text-sm shadow-[0_0_10px_rgba(234,179,8,0.3)]">
              {visibleOrders.length} {visibleOrders.length === 1 ? 'Pedido' : 'Pedidos'}
          </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {visibleOrders.map(order => {
            const isTakenByMe = order.deliveredBy === user?.uid;

            // ESTILOS DE TARJETA ADAPTADOS
            let cardColor = isTakenByMe ? 'border-yellow-500 shadow-yellow-500/10' : 'border-zinc-600 shadow-black'; 
            let headerColor = isTakenByMe ? 'bg-yellow-600 text-black' : 'bg-zinc-950 text-yellow-500 border-b border-yellow-900/50';

            return (
                <div key={order.id} className={`bg-black rounded-xl border-l-4 shadow-xl overflow-hidden flex flex-col animate-fade-in ${cardColor}`}>
                    
                    {/* CABECERA DE LA TARJETA */}
                    <div className={`${headerColor} p-3 font-black flex justify-between items-center tracking-wide`}>
                        <span className="flex items-center gap-2 text-lg">
                            <FaMotorcycle/>
                            {isTakenByMe ? 'EN CAMINO' : 'DOMICILIO'}
                        </span>
                        <div className="text-right">
                            <span className="text-[10px] block opacity-90 uppercase tracking-widest">{order.status}</span>
                            <span className={`text-xs font-mono mt-0.5 block ${isTakenByMe ? 'text-black/70' : 'text-yellow-600'}`}>
                                {new Date(order.createdAt?.toDate ? order.createdAt.toDate() : order.createdAt).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}
                            </span>
                        </div>
                    </div>

                    {/* DETALLES DEL PEDIDO */}
                    <div className="p-4 flex-1 space-y-3">
                        <p className="font-bold text-white text-lg flex items-center gap-2 border-b border-yellow-900/30 pb-2">
                            {order.userName}
                            {order.userPhone && (
                                <a href={`https://wa.me/521${order.userPhone.replace(/\D/g,'')}`} target="_blank" rel="noreferrer" className="ml-auto text-black bg-yellow-500 p-1.5 rounded-full text-sm hover:bg-yellow-400 transition shadow-md">
                                    <FaWhatsapp size={16} />
                                </a>
                            )}
                        </p>
                        
                        {/* DIRECCIÓN */}
                        <div className="text-sm text-gray-300 mt-2 flex items-start gap-2 bg-zinc-950 p-3 rounded-lg border border-yellow-900/30">
                            <FaMapMarkerAlt className="text-red-500 mt-0.5 flex-shrink-0"/>
                            <span className="leading-tight">{order.detail}</span>
                        </div>

                        {/* LISTA DE PLATILLOS */}
                        <div className="space-y-2 mt-3 bg-zinc-950 p-3 rounded-lg border border-yellow-900/30">
                            {order.items.map((item, i) => (
                                <div key={i} className="flex items-start gap-2 text-sm text-gray-300">
                                    <span className="text-yellow-500 font-bold bg-yellow-900/20 px-1.5 py-0.5 rounded text-xs border border-yellow-900/50">{item.quantity}x</span> 
                                    <div className="flex-1">
                                        <span className="font-bold text-white">{item.name}</span>
                                        {item.customizationDescription && <span className="block text-[10px] text-gray-500 italic mt-0.5">{item.customizationDescription}</span>}
                                    </div>
                                </div>
                            ))}
                        </div>

                        {/* COBRO */}
                        <div className="flex justify-between items-center text-sm font-bold border-t border-yellow-900/30 pt-3 mt-3">
                            <span className="uppercase text-gray-500 tracking-wider">Cobrar al cliente:</span>
                            <span className="text-green-500 text-2xl">${order.total}</span>
                        </div>
                    </div>

                    {/* BOTONERA INFERIOR */}
                    <div className="p-3 bg-[#0a0a0a] border-t border-yellow-900/30 flex flex-col gap-2">
                        
                        {/* 1. BOTÓN UBICACIÓN */}
                        <button 
                            onClick={() => openLocation(order)} 
                            className="w-full bg-black hover:bg-zinc-900 text-yellow-500 font-bold py-2.5 rounded-lg transition flex items-center justify-center gap-2 border border-yellow-700/50 shadow-sm"
                        >
                            <FaMapSigns/> Ubicación
                        </button>

                        {/* 2. BOTONES PRINCIPALES */}
                        <div className="grid grid-cols-1 gap-2">
                            {!isTakenByMe ? (
                                <button 
                                    onClick={() => takeOrder(order.id)} 
                                    className="w-full bg-yellow-500 hover:bg-yellow-400 text-black font-black py-3 rounded-lg transition shadow-[0_0_15px_rgba(234,179,8,0.2)] flex items-center justify-center gap-2"
                                >
                                    <FaMotorcycle size={18}/> Tomar Pedido
                                </button>
                            ) : (
                                <button 
                                    onClick={() => completeOrder(order.id)} 
                                    className="w-full bg-green-600 hover:bg-green-500 text-white font-bold py-3 rounded-lg transition shadow-[0_0_15px_rgba(22,163,7,0.3)] animate-pulse flex items-center justify-center gap-2"
                                >
                                    <FaCheck size={18}/> Pedido Entregado
                                </button>
                            )}
                        </div>

                        {/* 3. BOTÓN CANCELAR */}
                        <button 
                            onClick={() => cancelOrder(order.id)} 
                            className="w-full bg-black hover:bg-red-900/20 text-red-500 border border-red-900/30 text-xs font-bold py-2.5 rounded-lg transition flex items-center justify-center gap-1 mt-1"
                        >
                            <FaTrash/> Cancelar Orden
                        </button>
                    </div>
                </div>
            );
        })}
        
        {visibleOrders.length === 0 && (
            <div className="col-span-full flex flex-col items-center justify-center py-24 text-yellow-500/30">
                <FaMotorcycle size={70} className="mb-4 drop-shadow-lg"/>
                <p className="text-xl font-black text-gray-400">Sin repartos pendientes</p>
                <p className="text-sm mt-2 text-gray-600">Aparecerán aquí cuando la cocina termine.</p>
            </div>
        )}
      </div>
    </div>
  );
}