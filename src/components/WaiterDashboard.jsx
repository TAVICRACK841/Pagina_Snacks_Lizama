import { useState, useEffect } from 'react';
import { db } from '../firebase/config';
import { collection, onSnapshot, doc, updateDoc } from 'firebase/firestore';
import { FaConciergeBell, FaCheckDouble, FaPlusCircle, FaUtensils, FaClock, FaExclamationCircle } from 'react-icons/fa';
import { showToast } from '../stores/toastStore';

export default function WaiterDashboard() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // 1. TRAER TODO (Sin filtros complejos para evitar errores de índices)
    const unsub = onSnapshot(collection(db, "orders"), (snapshot) => {
        const list = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

        // 2. FILTRO MANUAL EN JAVASCRIPT
        const filtered = list.filter(order => {
            // Solo pedidos de MESA
            const isTable = order.type === 'mesa';
            // Solo estados activos (Pendiente, Preparando o LISTO para servir)
            // Ocultamos 'entregado', 'completado', 'cancelado'
            const isActive = ['pendiente', 'preparando', 'listo'].includes(order.status);
            
            return isTable && isActive;
        });

        // 3. ORDENAR (Lo que ya está LISTO va primero arriba)
        filtered.sort((a, b) => {
            const statusPriority = { 'listo': 1, 'preparando': 2, 'pendiente': 3 };
            return statusPriority[a.status] - statusPriority[b.status];
        });

        setOrders(filtered);
        setLoading(false);
    });

    return () => unsub();
  }, []);

  const markServed = async (id) => {
      if(!confirm("¿Ya entregaste la comida a la mesa?")) return;
      try {
          // Al marcar entregado, desaparece de esta lista (porque filtramos 'entregado')
          await updateDoc(doc(db, "orders", id), { status: 'entregado' }); 
          showToast("Mesa servida", "success");
      } catch (error) {
          showToast("Error al actualizar", "error");
      }
  };

  if (loading) return <div className="p-10 text-center text-white animate-pulse">Cargando comandas...</div>;

  return (
    <div className="p-4 max-w-6xl mx-auto pb-24">
        
        {/* HEADER */}
        <div className="flex flex-col md:flex-row justify-between items-center mb-6 gap-4 bg-zinc-800 p-4 rounded-xl border border-zinc-700 shadow-lg">
            <div className="flex items-center gap-3">
                <div className="bg-yellow-500 p-3 rounded-full text-black"><FaConciergeBell size={24}/></div>
                <div>
                    <h1 className="text-2xl font-black text-white uppercase">Comandas Mesas</h1>
                    <p className="text-xs text-gray-400">{orders.length} mesas activas</p>
                </div>
            </div>
            {/* BOTÓN NUEVA ORDEN (Acceso rápido al menú) */}
            <a href="/menu" className="w-full md:w-auto bg-blue-600 hover:bg-blue-500 text-white font-black px-6 py-3 rounded-xl shadow-lg flex items-center justify-center gap-2 transition-transform active:scale-95">
                <FaPlusCircle /> TOMAR NUEVA ORDEN
            </a>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {orders.length === 0 ? (
                <div className="col-span-full text-center py-20 bg-zinc-900 rounded-xl border border-dashed border-zinc-700">
                    <FaUtensils className="text-4xl text-gray-600 mx-auto mb-3"/>
                    <p className="text-gray-500 font-bold text-lg">Todas las mesas servidas 👌</p>
                </div>
            ) : (
                orders.map(order => (
                    <div key={order.id} className={`bg-zinc-800 border-2 rounded-2xl p-4 shadow-xl flex flex-col justify-between relative overflow-hidden transition-all ${
                        order.status === 'listo' ? 'border-green-500 shadow-green-500/20 scale-[1.02]' : 'border-zinc-700'
                    }`}>
                        
                        {/* AVISO DE COMIDA LISTA */}
                        {order.status === 'listo' && (
                            <div className="bg-green-600 text-white text-center text-sm font-black uppercase py-2 absolute top-0 left-0 right-0 animate-pulse flex items-center justify-center gap-2 z-10">
                                <FaUtensils /> ¡COMIDA LISTA PARA LLEVAR! <FaUtensils />
                            </div>
                        )}

                        <div className={`mt-${order.status === 'listo' ? '10' : '0'}`}>
                            {/* NUMERO DE MESA Y ESTADO */}
                            <div className="flex justify-between items-center mb-3">
                                <span className="bg-yellow-500 text-black font-black px-4 py-2 rounded-lg text-xl uppercase shadow-sm">
                                    {order.detail}
                                </span>
                                <div className="text-right">
                                    <span className={`font-bold text-[10px] px-2 py-1 rounded uppercase border ${
                                        order.status==='listo' ? 'bg-green-500 text-black border-green-500' : 
                                        order.status==='preparando' ? 'bg-yellow-900/50 text-yellow-500 border-yellow-600' :
                                        'bg-zinc-700 text-gray-400 border-zinc-600'
                                    }`}>
                                        {order.status}
                                    </span>
                                    <p className="text-[10px] text-gray-500 mt-1 flex items-center justify-end gap-1">
                                        <FaClock/> {new Date(order.createdAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                                    </p>
                                </div>
                            </div>
                            
                            {/* LISTA DE PLATILLOS */}
                            <div className="bg-black/30 p-3 rounded-lg mb-3 max-h-60 overflow-y-auto custom-scrollbar border border-zinc-700/50">
                                <ul className="space-y-3 text-gray-200 text-sm">
                                    {order.items.map((item, i) => (
                                        <li key={i} className="border-b border-zinc-700 pb-2 last:border-0 last:pb-0">
                                            <div className="flex items-start gap-2">
                                                <span className="font-black text-yellow-500 text-lg leading-none mt-1">{item.quantity}x</span> 
                                                <div>
                                                    <span className="font-bold block leading-tight">{item.name}</span>
                                                    {item.customizationDescription && (
                                                        <p className="text-[10px] text-gray-400 mt-1 pl-2 border-l-2 border-zinc-600">
                                                            {item.customizationDescription}
                                                        </p>
                                                    )}
                                                </div>
                                            </div>
                                        </li>
                                    ))}
                                </ul>
                            </div>

                            <div className="flex justify-between items-center mb-4 px-1">
                                <span className="text-xs text-gray-400 uppercase font-bold">Total Cuenta</span>
                                <span className="text-xl font-black text-white">${order.total}</span>
                            </div>
                        </div>
                        
                        {/* BOTÓN DE ACCIÓN */}
                        {order.status === 'listo' ? (
                            <button 
                                onClick={() => markServed(order.id)}
                                className="w-full bg-green-600 hover:bg-green-500 text-white font-black py-4 rounded-xl flex items-center justify-center gap-2 shadow-lg shadow-green-900/20 active:scale-95 transition-transform animate-bounce-short"
                            >
                                <FaCheckDouble size={20}/> YA LO ENTREGUÉ
                            </button>
                        ) : (
                            <button disabled className="w-full bg-zinc-700 text-gray-500 font-bold py-3 rounded-xl flex items-center justify-center gap-2 cursor-not-allowed border border-zinc-600">
                                <FaClock /> Esperando Cocina...
                            </button>
                        )}

                    </div>
                ))
            )}
        </div>
    </div>
  );
}