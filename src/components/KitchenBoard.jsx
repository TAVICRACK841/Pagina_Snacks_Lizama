import { useState, useEffect } from 'react';
import { db, auth } from '../firebase/config';
import { collection, query, onSnapshot, doc, updateDoc, getDoc } from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';
import { showToast } from '../stores/toastStore';
import { FaEye, FaBan, FaCheck, FaClipboardList, FaClock, FaCheckSquare, FaRegSquare, FaMotorcycle, FaUtensils } from 'react-icons/fa';

export default function KitchenBoard() {
  const [orders, setOrders] = useState([]);
  const [userRole, setUserRole] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedProof, setSelectedProof] = useState(null);

  useEffect(() => {
    // 1. OBTENER ROL
    const unsubscribeAuth = onAuthStateChanged(auth, async (user) => {
      if (user) {
        try {
          const userDoc = await getDoc(doc(db, "users", user.uid));
          if (userDoc.exists()) setUserRole(userDoc.data().role);
        } catch (error) { console.error("Error rol", error); }
      } else { setUserRole(null); }
    });

    // 2. ESCUCHAR PEDIDOS
    const q = query(collection(db, "orders"));
    
    const unsubscribeOrders = onSnapshot(q, (snapshot) => {
      const ordersList = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      
      // FILTRO: Solo mostramos lo que la cocina debe trabajar
      // Ocultamos 'completado', 'cancelado', 'en_camino' y 'entregado'.
      // La cocina ve 'pendiente', 'preparando' y 'listo' (para saber que ya acabaron y esperan recolecta)
      const activeOrders = ordersList.filter(o => 
          ['pendiente', 'preparando', 'listo'].includes(o.status)
      );
      
      activeOrders.sort((a, b) => {
          // Prioridad a 'listo' para que se vayan abajo o arriba (decisión visual, aquí los pongo al final)
          if (a.status === 'listo' && b.status !== 'listo') return 1;
          if (a.status !== 'listo' && b.status === 'listo') return -1;

          if (a.scheduledTime && !b.scheduledTime) return -1;
          if (!a.scheduledTime && b.scheduledTime) return 1;
          
          const dateA = a.createdAt?.toDate ? a.createdAt.toDate() : new Date(a.createdAt);
          const dateB = b.createdAt?.toDate ? b.createdAt.toDate() : new Date(b.createdAt);
          return dateA - dateB;
      });

      setOrders(activeOrders);
      setLoading(false);
    });

    return () => { unsubscribeAuth(); unsubscribeOrders(); };
  }, []);

  // --- LÓGICA DE CHECKBOX INDIVIDUAL ---
  const toggleItemCompletion = async (order, originalIndex) => {
      const updatedItems = [...order.items];
      
      const currentState = updatedItems[originalIndex].completed || false;
      updatedItems[originalIndex].completed = !currentState;

      const allDone = updatedItems.every(item => item.completed === true);
      
      // CAMBIO CLAVE: Si todo está checkeado, pasa a 'listo' (NO a en_camino)
      let newStatus = order.status;
      if (allDone) {
          newStatus = 'listo'; 
          showToast('✅ ¡Orden Lista! Aparecerá en Repartos/Mesas.', 'success');
      } else if (order.status === 'pendiente') {
          newStatus = 'preparando'; 
      }

      try {
          await updateDoc(doc(db, "orders", order.id), {
              items: updatedItems,
              status: newStatus
          });
      } catch (error) {
          console.error(error);
          showToast("Error al marcar producto", "error");
      }
  };

  // --- LÓGICA DEL BOTÓN GRANDE ---
  const updateStatus = async (orderId, newStatus) => {
    if (newStatus === 'cancelado' && !window.confirm("¿Seguro que quieres CANCELAR este pedido?")) return;
    try {
      await updateDoc(doc(db, "orders", orderId), { status: newStatus });
      
      if(newStatus === 'listo') {
          showToast('🔔 ¡Notificando a Repartidores/Meseros!', 'success');
      } else {
          showToast(`Estado actualizado: ${newStatus.toUpperCase()}`, 'success');
      }
    } catch (error) { showToast("Error al actualizar", 'error'); }
  };

  const shouldShowItem = (itemCategory) => {
    if (!userRole) return false;
    const role = userRole.toLowerCase();
    const cat = itemCategory ? itemCategory.toLowerCase() : 'general';

    if (['admin', 'mesero 1', 'mesero 2', 'repartidor 1', 'repartidor 2'].includes(role)) return true;
    if (role === 'hamburguesero' && (cat.includes('hamburguesa') || cat.includes('perros') || cat.includes('hot dog'))) return true;
    if (role === 'freidor' && (cat.includes('alitas') || cat.includes('boneless') || cat.includes('tiras') || cat.includes('papas') || cat.includes('snacks') || cat.includes('box'))) return true;
    if (role === 'productor' && (cat.includes('bebida') || cat.includes('frappe') || cat.includes('jugo') || cat.includes('agua') || cat.includes('embotellado'))) return true;
    return false; 
  };

  if (loading) return <div className="p-10 text-center text-lg md:text-xl font-bold animate-pulse dark:text-white">Cargando cocina...</div>;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 md:gap-6 p-3 md:p-6 mb-20 relative">
      
      {selectedProof && (
          <div className="fixed inset-0 bg-black/90 z-[100] flex items-center justify-center p-4" onClick={() => setSelectedProof(null)}>
              <div className="relative max-w-full md:max-w-2xl w-full bg-white dark:bg-gray-800 rounded-lg p-2 shadow-2xl">
                <button className="absolute top-2 right-2 bg-red-600 text-white rounded-full w-10 h-10 flex items-center justify-center font-bold z-10 shadow-md" onClick={() => setSelectedProof(null)}>X</button>
                <img src={selectedProof} alt="Comprobante" className="w-full h-auto max-h-[80vh] object-contain rounded bg-gray-100" />
              </div>
          </div>
      )}

      <div className="col-span-full mb-2 flex justify-between items-center">
          <h1 className="text-2xl md:text-3xl font-bold text-gray-800 dark:text-white flex items-center gap-2">
            👨‍🍳 Cocina <span className="bg-orange-600 text-white text-sm md:text-base px-3 py-1 rounded-full shadow-sm animate-bounce">{orders.filter(o=>o.status!=='listo').length}</span>
          </h1>
      </div>

      {orders.map((order) => {
        const visibleItemsWithIndex = order.items
            .map((item, originalIndex) => ({ ...item, originalIndex }))
            .filter(item => shouldShowItem(item.category || item.name));
        
        if (visibleItemsWithIndex.length === 0 && !['admin', 'mesero 1', 'mesero 2', 'repartidor 1', 'repartidor 2'].includes(userRole)) return null;

        return (
          <div key={order.id} className={`bg-white dark:bg-gray-800 rounded-xl shadow-md border-l-8 p-4 md:p-5 relative transition-all hover:shadow-xl flex flex-col justify-between animate-fade-in ${
            order.status === 'pendiente' ? 'border-red-500 dark:border-red-600' : 
            order.status === 'preparando' ? 'border-yellow-400 dark:border-yellow-500' : 
            'border-green-500 dark:border-green-500 opacity-70' // Opacidad si ya está listo
          }`}>
            
            {order.status === 'listo' && (
                <div className="absolute inset-0 bg-green-500/10 z-0 pointer-events-none flex items-center justify-center">
                    <span className="text-green-600 font-black text-4xl -rotate-12 border-4 border-green-600 p-2 rounded opacity-30">LISTO</span>
                </div>
            )}

            {order.scheduledTime && (
                <div className="absolute -top-3 right-4 bg-purple-600 text-white px-3 py-1 rounded-full shadow-lg text-xs font-bold animate-pulse z-10 flex items-center gap-1">
                    <FaClock /> Entregar a las: {order.scheduledTime}
                </div>
            )}

            <div className="relative z-10">
                <div className="flex justify-between items-start mb-3 border-b dark:border-gray-700 pb-2 pt-2">
                  <div className="overflow-hidden">
                    <span className="block font-black text-xl md:text-2xl text-gray-800 dark:text-white leading-tight truncate flex items-center gap-2">
                      {order.type === 'mesa' ? '🍽️' : order.type === 'domicilio' ? '🛵' : '🥡'} {order.detail}
                    </span>
                    <span className="text-xs text-gray-500 dark:text-gray-400 font-mono flex items-center gap-1 mt-1">
                      <FaClock/> {new Date(order.createdAt?.toDate ? order.createdAt.toDate() : order.createdAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                    </span>
                  </div>
                  <span className={`px-2 py-1 rounded text-[10px] md:text-xs font-bold uppercase shadow-sm whitespace-nowrap ${
                      order.type === 'mesa' ? 'bg-purple-100 text-purple-800' : 'bg-orange-100 text-orange-800'
                  }`}>
                    {order.type}
                  </span>
                </div>

                <div className="space-y-3 mb-4 md:mb-6">
                  {visibleItemsWithIndex.map((item) => (
                    <div 
                        key={item.originalIndex} 
                        className={`border-b dark:border-gray-700 pb-2 last:border-0 transition-all duration-300 ${item.completed ? 'opacity-50 grayscale' : 'opacity-100'}`}
                    >
                      <div className="flex items-start gap-2 md:gap-3 cursor-pointer select-none" onClick={() => toggleItemCompletion(order, item.originalIndex)}>
                          <div className={`mt-1 text-2xl transition-transform transform active:scale-90 ${item.completed ? 'text-green-500' : 'text-gray-300 dark:text-gray-600 hover:text-orange-500'}`}>
                              {item.completed ? <FaCheckSquare /> : <FaRegSquare />}
                          </div>
                          <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                  <span className={`font-bold text-lg md:text-xl w-8 h-8 flex items-center justify-center rounded-lg shadow-sm shrink-0 ${item.completed ? 'bg-green-100 text-green-700' : 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-white'}`}>
                                      {item.quantity}
                                  </span>
                                  <p className={`font-bold text-base md:text-lg leading-tight break-words ${item.completed ? 'line-through text-gray-400' : 'text-gray-800 dark:text-gray-200'}`}>
                                      {item.name}
                                  </p>
                              </div>
                              {item.customizationDescription && (
                                  <div className={`mt-2 p-2 rounded-lg border-l-4 text-xs md:text-sm font-bold leading-snug ${item.completed ? 'bg-gray-100 border-gray-400 text-gray-400' : 'bg-yellow-100 dark:bg-yellow-900/40 border-yellow-500 dark:border-yellow-600 text-gray-900 dark:text-gray-100'}`}>
                                      📝 {item.customizationDescription}
                                  </div>
                              )}
                          </div>
                      </div>
                    </div>
                  ))}
                </div>
            </div>

            <div className="mt-auto relative z-10">
                <div className="flex gap-2">
                    {['admin', 'mesero 1', 'mesero 2'].includes(userRole) && (
                        <button 
                            onClick={() => updateStatus(order.id, 'cancelado')}
                            className="bg-red-100 dark:bg-red-900/40 text-red-600 dark:text-red-400 p-3 rounded-xl hover:bg-red-200 dark:hover:bg-red-900/60 transition shadow-sm"
                            title="Cancelar"
                        >
                            <FaBan size={20} />
                        </button>
                    )}
                    
                    {/* BOTÓN PRINCIPAL DE ESTADO */}
                    <button
                      onClick={() => {
                          // CAMBIO CLAVE AQUÍ: De 'preparando' pasa a 'listo'
                          const nextStatus = order.status === 'pendiente' ? 'preparando' : 'listo';
                          updateStatus(order.id, nextStatus);
                      }}
                      disabled={order.status === 'listo'}
                      className={`flex-1 py-3 rounded-xl font-bold text-white shadow-md active:scale-95 transition-all flex items-center justify-center gap-2 text-sm md:text-base ${
                          order.status === 'pendiente' ? 'bg-red-600 hover:bg-red-700 animate-pulse' :
                          order.status === 'preparando' ? 'bg-green-600 hover:bg-green-700' :
                          'bg-gray-500 cursor-not-allowed' // Si ya está listo, se desactiva
                      }`}
                    >
                      {order.status === 'pendiente' ? '🔥 Empezar' : 
                       order.status === 'preparando' ? '✅ Finalizar (Avisar Reparto)' : 
                       '👍 Orden Lista'}
                    </button>
                </div>
            </div>

          </div>
        );
      })}
      
      {orders.length === 0 && !loading && (
        <div className="col-span-full flex flex-col items-center justify-center py-20 text-gray-400 dark:text-gray-500">
          <FaClipboardList className="text-6xl mb-4 opacity-20"/>
          <p className="text-xl font-bold">La cocina está tranquila...</p>
        </div>
      )}
    </div>
  );
}