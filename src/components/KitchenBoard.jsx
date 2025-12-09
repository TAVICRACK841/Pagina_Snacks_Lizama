import { useState, useEffect } from 'react';
import { db, auth } from '../firebase/config';
import { collection, query, onSnapshot, doc, updateDoc, getDoc } from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';
import { showToast } from '../stores/toastStore';
import { FaEye, FaBan, FaCheck } from 'react-icons/fa';

export default function KitchenBoard() {
  const [orders, setOrders] = useState([]);
  const [userRole, setUserRole] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedProof, setSelectedProof] = useState(null); // Estado para el modal de la foto

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

    // 2. ESCUCHAR PEDIDOS (Filtramos y ordenamos en JS para evitar errores de índice)
    const q = query(collection(db, "orders"));
    
    const unsubscribeOrders = onSnapshot(q, (snapshot) => {
      const ordersList = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      
      // Mostrar solo los activos (no completados ni cancelados)
      // Opcional: Si quieres ver cancelados en cocina, quita esa condición
      const activeOrders = ordersList.filter(o => o.status !== 'completado' && o.status !== 'cancelado');
      
      // Ordenar: Primero lo más viejo (FIFO)
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
    // Si es cancelar, pedimos confirmación extra
    if (newStatus === 'cancelado' && !window.confirm("¿Seguro que quieres CANCELAR este pedido?")) return;
    
    try {
      await updateDoc(doc(db, "orders", orderId), { status: newStatus });
      showToast(`Pedido ${newStatus}`, 'success');
    } catch (error) { showToast("Error al actualizar", 'error'); }
  };

  const shouldShowItem = (itemCategory) => {
    if (!userRole) return false;
    if (['admin', 'mesero 1', 'mesero 2', 'repartidor 1', 'repartidor 2'].includes(userRole)) return true;
    if (userRole === 'hamburguesero' && itemCategory === 'hamburguesas') return true;
    if (userRole === 'freidor' && ['alitas', 'boneless', 'snacks'].includes(itemCategory)) return true;
    if (userRole === 'productor' && itemCategory === 'bebidas') return true;
    return false;
  };

  if (loading) return <div className="p-10 text-center text-xl font-bold animate-pulse dark:text-white">Cargando cocina...</div>;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 p-4 mb-20 relative">
      
      {/* MODAL FOTO COMPROBANTE */}
      {selectedProof && (
          <div className="fixed inset-0 bg-black/90 z-[100] flex items-center justify-center p-4" onClick={() => setSelectedProof(null)}>
              <div className="relative max-w-2xl w-full bg-white dark:bg-gray-800 rounded-lg p-2">
                <button className="absolute top-2 right-2 bg-red-600 text-white rounded-full w-8 h-8 font-bold" onClick={() => setSelectedProof(null)}>X</button>
                <img src={selectedProof} alt="Comprobante" className="w-full h-auto rounded" />
              </div>
          </div>
      )}

      {/* TÍTULO */}
      <div className="col-span-full mb-2 flex justify-between items-center">
          <h1 className="text-3xl font-bold text-gray-800 dark:text-white flex items-center gap-2">
            👨‍🍳 Comandas Activas <span className="bg-orange-600 text-white text-sm px-3 py-1 rounded-full">{orders.length}</span>
          </h1>
      </div>

      {orders.map((order) => {
        const visibleItems = order.items.filter(item => shouldShowItem(item.category));
        
        // Filtro de seguridad por rol
        if (visibleItems.length === 0 && !['admin', 'mesero 1', 'mesero 2', 'repartidor 1', 'repartidor 2'].includes(userRole)) return null;

        return (
          <div key={order.id} className={`bg-white dark:bg-gray-800 rounded-xl shadow-md border-l-8 p-5 relative transition-all hover:shadow-lg ${
            order.status === 'pendiente' ? 'border-yellow-400 dark:border-yellow-600' : 'border-blue-500 dark:border-blue-600'
          }`}>
            
            {/* ENCABEZADO */}
            <div className="flex justify-between items-start mb-4 border-b dark:border-gray-700 pb-3">
              <div>
                <span className="block font-black text-2xl text-gray-800 dark:text-white">
                  {order.type === 'mesa' ? `🍽️ ${order.detail}` : 
                   order.type === 'domicilio' ? `🛵 Domicilio` : `🥡 Para Llevar`}
                </span>
                <span className="text-sm text-gray-500 dark:text-gray-400 font-mono flex items-center gap-1">
                  🕒 {new Date(order.createdAt?.toDate ? order.createdAt.toDate() : order.createdAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                </span>
              </div>
              <span className={`px-3 py-1 rounded text-xs font-bold uppercase shadow-sm ${
                 order.type === 'mesa' ? 'bg-blue-100 text-blue-800' : 'bg-orange-100 text-orange-800'
              }`}>
                {order.type}
              </span>
            </div>

            {/* LISTA DE ITEMS */}
            <div className="space-y-3 mb-6">
              {visibleItems.map((item, index) => (
                <div key={index} className="flex justify-between items-center bg-gray-50 dark:bg-gray-700/50 p-3 rounded-lg border dark:border-gray-700">
                  <span className="font-bold text-gray-800 dark:text-white text-xl bg-white dark:bg-gray-600 w-8 h-8 flex items-center justify-center rounded-full shadow-sm">{item.quantity}</span>
                  <span className="flex-1 ml-3 text-gray-700 dark:text-gray-200 font-bold text-lg leading-tight">{item.name}</span>
                </div>
              ))}
              
              {visibleItems.length < order.items.length && (
                <p className="text-xs text-center text-gray-400 italic mt-2 border-t dark:border-gray-700 pt-2">
                  (+{order.items.length - visibleItems.length} productos de otras áreas)
                </p>
              )}
            </div>

            {/* INFO EXTRA + COMPROBANTE */}
            <div className="bg-orange-50 dark:bg-orange-900/20 p-4 rounded-lg text-sm mb-4 border border-orange-100 dark:border-orange-900/50">
                <p className="dark:text-gray-300"><span className="font-bold text-gray-700 dark:text-orange-200">Cliente:</span> {order.userName || 'Anónimo'}</p>
                {order.type === 'domicilio' && <p className="mt-1 dark:text-gray-300"><span className="font-bold text-gray-700 dark:text-orange-200">📍:</span> {order.detail}</p>}
                
                <div className="mt-2 border-t border-orange-200 dark:border-orange-800 pt-2 flex justify-between items-center">
                  <div className="flex items-center gap-2">
                      <span className="capitalize bg-white dark:bg-gray-800 px-2 py-1 rounded text-xs border dark:border-gray-600 dark:text-gray-300">{order.paymentMethod}</span>
                      {/* BOTÓN VER FOTO SI EXISTE */}
                      {order.proofOfPayment && (
                          <button onClick={() => setSelectedProof(order.proofOfPayment)} className="text-blue-600 dark:text-blue-400 hover:scale-110 transition bg-white dark:bg-gray-800 p-1 rounded border dark:border-gray-600" title="Ver Comprobante">
                              <FaEye />
                          </button>
                      )}
                  </div>
                  <span className="font-bold text-xl text-gray-800 dark:text-white">${order.total}</span>
                </div>
            </div>

            {/* BOTONES DE ACCIÓN */}
            <div className="flex gap-3">
                {/* Cancelar (Solo Admin y Meseros) */}
                {['admin', 'mesero 1', 'mesero 2'].includes(userRole) && (
                    <button 
                        onClick={() => updateStatus(order.id, 'cancelado')}
                        className="bg-red-100 dark:bg-red-900/40 text-red-600 dark:text-red-400 p-3 rounded-xl hover:bg-red-200 dark:hover:bg-red-900/60 transition"
                        title="Cancelar Pedido"
                    >
                        <FaBan size={20} />
                    </button>
                )}
                
                {/* Terminar */}
                <button
                  onClick={() => updateStatus(order.id, order.status === 'pendiente' ? 'preparando' : order.status === 'preparando' ? 'listo' : 'completado')}
                  className="flex-1 bg-gray-800 dark:bg-gray-700 text-white py-3 rounded-xl font-bold hover:bg-green-600 dark:hover:bg-green-600 transition-all shadow-lg active:scale-95 flex items-center justify-center gap-2"
                >
                  {order.status === 'pendiente' ? '🔥 Cocinar' : order.status === 'preparando' ? '✅ Listo' : '📦 Entregar'}
                </button>
            </div>
          </div>
        );
      })}
      
      {orders.length === 0 && !loading && (
        <div className="col-span-full flex flex-col items-center justify-center py-20 text-gray-400 dark:text-gray-500">
          <div className="text-7xl mb-4 grayscale opacity-50">👨‍🍳</div>
          <p className="text-2xl font-bold">La cocina está tranquila...</p>
        </div>
      )}
    </div>
  );
}