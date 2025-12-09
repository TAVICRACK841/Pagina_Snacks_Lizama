import { useState, useEffect } from 'react';
import { auth, db } from '../firebase/config';
import { collection, query, where, onSnapshot, doc, updateDoc } from 'firebase/firestore'; 
import { onAuthStateChanged } from 'firebase/auth';
import { showToast } from '../stores/toastStore';

export default function MyOrders() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);
  const [selectedProof, setSelectedProof] = useState(null); // Modal foto

  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, (currentUser) => {
      if (currentUser) {
        setUser(currentUser);
        
        const q = query(collection(db, "orders"), where("userId", "==", currentUser.uid));

        const unsubscribeOrders = onSnapshot(q, (snapshot) => {
          const ordersList = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

          ordersList.sort((a, b) => {
            const dateA = a.createdAt?.toDate ? a.createdAt.toDate() : new Date(a.createdAt);
            const dateB = b.createdAt?.toDate ? b.createdAt.toDate() : new Date(b.createdAt);
            return dateB - dateA;
          });

          setOrders(ordersList);
          setLoading(false);
        });
        return () => unsubscribeOrders();
      } else {
        setUser(null);
        setLoading(false);
      }
    });
    return () => unsubscribeAuth();
  }, []);

  // Función para que el cliente cancele
  const cancelOrder = async (orderId) => {
      if(!confirm("¿Seguro que quieres cancelar tu pedido?")) return;
      try {
          await updateDoc(doc(db, "orders", orderId), { status: 'cancelado' });
          showToast("Pedido cancelado exitosamente", "success");
      } catch (e) {
          showToast("No se pudo cancelar", "error");
      }
  };

  if (loading) return <div className="p-10 text-center text-gray-500 dark:text-gray-400 font-bold animate-pulse">Cargando tus pedidos...</div>;

  if (!user) return (
    <div className="p-10 text-center dark:text-white">
      <p>Inicia sesión para ver tus pedidos.</p>
      <a href="/profile" className="text-orange-600 font-bold underline">Ir a Perfil</a>
    </div>
  );

  return (
    <div className="max-w-4xl mx-auto p-4 mb-20 relative">
      
      {/* MODAL FOTO COMPROBANTE */}
      {selectedProof && (
          <div className="fixed inset-0 bg-black/90 z-[100] flex items-center justify-center p-4" onClick={() => setSelectedProof(null)}>
              <div className="relative max-w-lg w-full bg-white dark:bg-gray-800 rounded-lg p-2">
                <img src={selectedProof} alt="Comprobante" className="w-full h-auto rounded" />
              </div>
          </div>
      )}

      <h1 className="text-3xl font-bold mb-6 text-gray-800 dark:text-white">📦 Mis Pedidos</h1>

      {orders.length === 0 ? (
        <div className="text-center py-10 bg-white dark:bg-gray-800 rounded-lg shadow border border-gray-100 dark:border-gray-700 transition-colors">
          <div className="text-6xl mb-4">🍽️</div>
          <p className="text-gray-500 dark:text-gray-400 font-bold">Aún no has realizado ningún pedido.</p>
          <a href="/menu" className="mt-4 inline-block bg-orange-600 text-white px-6 py-2 rounded-full font-bold hover:bg-orange-700 transition">
            Ir al Menú
          </a>
        </div>
      ) : (
        <div className="space-y-6">
          {orders.map((order) => (
            <div key={order.id} className="bg-white dark:bg-gray-800 rounded-xl shadow-md overflow-hidden border border-gray-100 dark:border-gray-700 hover:shadow-lg transition-all">
              
              {/* Encabezado */}
              <div className="bg-gray-50 dark:bg-gray-700/50 p-4 flex flex-wrap justify-between items-center border-b dark:border-gray-700 gap-2">
                <div>
                  <p className="text-xs text-gray-500 dark:text-gray-400 font-bold uppercase">Fecha</p>
                  <p className="text-sm font-medium dark:text-gray-200">
                    {order.createdAt?.toDate ? order.createdAt.toDate().toLocaleString() : new Date(order.createdAt).toLocaleString()}
                  </p>
                </div>
                <div>
                  <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wide border ${
                    order.status === 'pendiente' ? 'bg-yellow-100 text-yellow-700 border-yellow-200' :
                    order.status === 'cancelado' ? 'bg-red-100 text-red-700 border-red-200' :
                    order.status === 'entregado' || order.status === 'completado' ? 'bg-green-100 text-green-700 border-green-200' :
                    'bg-blue-100 text-blue-700 border-blue-200'
                  }`}>
                    {order.status}
                  </span>
                </div>
              </div>

              {/* Contenido */}
              <div className="p-4">
                <ul className="space-y-2 mb-4">
                  {order.items.map((item, index) => (
                    <li key={index} className="flex justify-between text-sm text-gray-700 dark:text-gray-300 border-b border-dashed dark:border-gray-700 pb-2 last:border-0">
                      <span className="font-medium">{item.quantity}x {item.name}</span>
                      <span className="font-bold text-gray-500 dark:text-gray-400">${item.price * item.quantity}</span>
                    </li>
                  ))}
                </ul>
                
                <div className="border-t dark:border-gray-700 pt-3 flex flex-wrap justify-between items-end gap-4">
                  <div className="text-xs text-gray-500 dark:text-gray-400 space-y-1">
                    <p>Tipo: <span className="font-bold capitalize text-gray-700 dark:text-gray-300">{order.type}</span></p>
                    <p>Pago: <span className="font-bold capitalize text-gray-700 dark:text-gray-300">{order.paymentMethod}</span></p>
                    {/* Botón ver comprobante si existe */}
                    {order.proofOfPayment && (
                        <button onClick={() => setSelectedProof(order.proofOfPayment)} className="text-blue-500 hover:underline font-bold mt-1 block">
                            📄 Ver mi comprobante
                        </button>
                    )}
                  </div>
                  
                  <div className="flex flex-col items-end gap-2">
                    <div className="text-right">
                        <span className="text-xs text-gray-400 font-bold uppercase">Total</span>
                        <p className="text-2xl font-extrabold text-orange-600 dark:text-orange-500">${order.total}</p>
                    </div>
                    
                    {/* BOTÓN CANCELAR (Solo si está pendiente) */}
                    {order.status === 'pendiente' && (
                        <button 
                            onClick={() => cancelOrder(order.id)}
                            className="bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 text-xs font-bold px-3 py-1 rounded-full border border-red-200 dark:border-red-800 hover:bg-red-100 transition"
                        >
                            Cancelar Pedido
                        </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}