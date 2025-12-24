import { useState, useEffect } from 'react';
import { db, auth } from '../firebase/config';
import { collection, query, onSnapshot, doc, updateDoc, getDoc } from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';
import { showToast } from '../stores/toastStore';
import { FaEye, FaBan, FaCheck, FaClipboardList, FaClock } from 'react-icons/fa';

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
      
      // Mostrar solo activos
      const activeOrders = ordersList.filter(o => o.status !== 'completado' && o.status !== 'cancelado');
      
      // Ordenar por fecha (FIFO)
      activeOrders.sort((a, b) => {
          const dateA = a.createdAt?.toDate ? a.createdAt.toDate() : new Date(a.createdAt);
          const dateB = b.createdAt?.toDate ? b.createdAt.toDate() : new Date(b.createdAt);
          return dateA - dateB;
      });

      setOrders(activeOrders);
      setLoading(false);
    });

    return () => { unsubscribeAuth(); unsubscribeOrders(); };
  }, []);

  const updateStatus = async (orderId, newStatus) => {
    if (newStatus === 'cancelado' && !window.confirm("¿Seguro que quieres CANCELAR este pedido?")) return;
    try {
      await updateDoc(doc(db, "orders", orderId), { status: newStatus });
      showToast(`Pedido ${newStatus}`, 'success');
    } catch (error) { showToast("Error al actualizar", 'error'); }
  };

  const shouldShowItem = (itemCategory) => {
    if (!userRole) return false;
    const role = userRole.toLowerCase();
    const cat = itemCategory ? itemCategory.toLowerCase() : '';

    if (['admin', 'mesero 1', 'mesero 2', 'repartidor 1', 'repartidor 2'].includes(role)) return true;
    if (role === 'hamburguesero' && (cat.includes('hamburguesa') || cat.includes('perros'))) return true;
    if (role === 'freidor' && (cat.includes('alitas') || cat.includes('boneless') || cat.includes('tiras') || cat.includes('papas') || cat.includes('snacks') || cat.includes('box'))) return true;
    if (role === 'productor' && (cat.includes('bebida') || cat.includes('frappe') || cat.includes('jugo') || cat.includes('agua') || cat.includes('embotellado'))) return true;
    
    return false; 
  };

  if (loading) return <div className="p-10 text-center text-xl font-bold animate-pulse dark:text-white">Cargando cocina...</div>;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 p-4 mb-20 relative">
      
      {selectedProof && (
          <div className="fixed inset-0 bg-black/90 z-[100] flex items-center justify-center p-4" onClick={() => setSelectedProof(null)}>
              <div className="relative max-w-2xl w-full bg-white dark:bg-gray-800 rounded-lg p-2">
                <button className="absolute top-2 right-2 bg-red-600 text-white rounded-full w-8 h-8 font-bold" onClick={() => setSelectedProof(null)}>X</button>
                <img src={selectedProof} alt="Comprobante" className="w-full h-auto rounded" />
              </div>
          </div>
      )}

      <div className="col-span-full mb-2 flex justify-between items-center">
          <h1 className="text-3xl font-bold text-gray-800 dark:text-white flex items-center gap-2">
            👨‍🍳 Comandas Activas <span className="bg-orange-600 text-white text-sm px-3 py-1 rounded-full">{orders.length}</span>
          </h1>
      </div>

      {orders.map((order) => {
        // Filtrar ítems según el rol del cocinero
        const visibleItems = order.items.filter(item => shouldShowItem(item.category || item.name)); // Fallback a name si no hay category
        
        // Si el cocinero no tiene nada que ver en esta orden, no la mostramos (salvo admin/meseros)
        if (visibleItems.length === 0 && !['admin', 'mesero 1', 'mesero 2', 'repartidor 1', 'repartidor 2'].includes(userRole)) return null;

        return (
          <div key={order.id} className={`bg-white dark:bg-gray-800 rounded-xl shadow-md border-l-8 p-5 relative transition-all hover:shadow-lg flex flex-col justify-between ${
            order.status === 'pendiente' ? 'border-yellow-400 dark:border-yellow-600' : 'border-blue-500 dark:border-blue-600'
          }`}>
            
            {/* ENCABEZADO */}
            <div>
                <div className="flex justify-between items-start mb-4 border-b dark:border-gray-700 pb-3">
                  <div>
                    <span className="block font-black text-2xl text-gray-800 dark:text-white leading-tight">
                      {order.type === 'mesa' ? `🍽️ ${order.detail}` : 
                       order.type === 'domicilio' ? `🛵 Domicilio` : `🥡 Para Llevar`}
                    </span>
                    <span className="text-xs text-gray-500 dark:text-gray-400 font-mono flex items-center gap-1 mt-1">
                      <FaClock/> {new Date(order.createdAt?.toDate ? order.createdAt.toDate() : order.createdAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                    </span>
                  </div>
                  <span className={`px-3 py-1 rounded text-xs font-bold uppercase shadow-sm h-fit ${
                     order.type === 'mesa' ? 'bg-purple-100 text-purple-800' : 'bg-orange-100 text-orange-800'
                  }`}>
                    {order.type}
                  </span>
                </div>

                {/* LISTA DE ITEMS (CON PERSONALIZACIÓN) */}
                <div className="space-y-4 mb-6">
                  {visibleItems.map((item, index) => (
                    <div key={index} className="border-b dark:border-gray-700 pb-3 last:border-0">
                      <div className="flex items-start gap-3">
                          <span className="font-bold text-gray-800 dark:text-white text-xl bg-gray-100 dark:bg-gray-700 w-8 h-8 flex items-center justify-center rounded-lg shadow-sm shrink-0">
                              {item.quantity}
                          </span>
                          <div className="flex-1">
                              <p className="text-gray-800 dark:text-gray-200 font-bold text-lg leading-tight">{item.name}</p>
                              
                              {/* --- AQUÍ ESTÁ LA MAGIA: MOSTRAR DETALLES --- */}
                              {item.customizationDescription && (
                                  <div className="bg-yellow-50 dark:bg-yellow-900/30 p-2 rounded-lg border border-yellow-200 dark:border-yellow-700 mt-2">
                                      <p className="text-sm font-semibold text-gray-800 dark:text-gray-200 leading-snug">
                                          <span className="text-yellow-600 dark:text-yellow-400 mr-1">📝:</span> 
                                          {item.customizationDescription}
                                      </p>
                                  </div>
                              )}
                          </div>
                      </div>
                    </div>
                  ))}
                  
                  {visibleItems.length < order.items.length && (
                    <p className="text-xs text-center text-gray-400 italic mt-2 pt-2 border-t dark:border-gray-700">
                      (+{order.items.length - visibleItems.length} productos de otras áreas)
                    </p>
                  )}
                </div>
            </div>

            {/* INFO EXTRA + ACCIONES */}
            <div className="mt-auto">
                <div className="bg-gray-50 dark:bg-gray-700/50 p-3 rounded-lg text-sm mb-4 border dark:border-gray-700">
                    <p className="dark:text-gray-300 mb-1"><span className="font-bold text-gray-600 dark:text-gray-400">Cliente:</span> {order.userName || 'Anónimo'}</p>
                    {order.type === 'domicilio' && <p className="mb-2 dark:text-gray-300"><span className="font-bold">📍:</span> {order.detail}</p>}
                    
                    <div className="border-t border-gray-200 dark:border-gray-600 pt-2 flex justify-between items-center">
                      <div className="flex items-center gap-2">
                          <span className="capitalize bg-white dark:bg-gray-600 px-2 py-1 rounded text-xs border dark:border-gray-500 font-bold dark:text-gray-200">{order.paymentMethod}</span>
                          {order.proofOfPayment && (
                              <button onClick={() => setSelectedProof(order.proofOfPayment)} className="text-blue-600 dark:text-blue-400 hover:scale-110 transition bg-white dark:bg-gray-600 p-1 rounded border dark:border-gray-500" title="Ver Comprobante">
                                  <FaEye />
                              </button>
                          )}
                      </div>
                      <span className="font-black text-xl text-green-600 dark:text-green-400">${order.total}</span>
                    </div>
                </div>

                {/* BOTONES */}
                <div className="flex gap-2">
                    {/* Cancelar (Solo ciertos roles) */}
                    {['admin', 'mesero 1', 'mesero 2'].includes(userRole) && (
                        <button 
                            onClick={() => updateStatus(order.id, 'cancelado')}
                            className="bg-red-100 dark:bg-red-900/40 text-red-600 dark:text-red-400 p-3 rounded-xl hover:bg-red-200 dark:hover:bg-red-900/60 transition"
                            title="Cancelar"
                        >
                            <FaBan size={20} />
                        </button>
                    )}
                    
                    {/* Botón Principal de Estado */}
                    <button
                      onClick={() => updateStatus(order.id, order.status === 'pendiente' ? 'preparando' : order.status === 'preparando' ? 'en_camino' : 'completado')}
                      className={`flex-1 py-3 rounded-xl font-bold text-white shadow-lg active:scale-95 transition-all flex items-center justify-center gap-2 ${
                          order.status === 'pendiente' ? 'bg-blue-600 hover:bg-blue-700' :
                          order.status === 'preparando' ? 'bg-yellow-500 hover:bg-yellow-600' :
                          'bg-green-600 hover:bg-green-700'
                      }`}
                    >
                      {order.status === 'pendiente' ? '🔥 Empezar' : order.status === 'preparando' ? '🛵 Listo / Reparto' : '✅ Finalizar'}
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