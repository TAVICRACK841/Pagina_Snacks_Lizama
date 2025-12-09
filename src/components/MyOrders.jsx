import { useState, useEffect } from 'react';
import { auth, db } from '../firebase/config';
import { collection, query, where, onSnapshot } from 'firebase/firestore'; 
import { onAuthStateChanged } from 'firebase/auth';

export default function MyOrders() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);

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

  if (loading) return <div className="p-10 text-center text-gray-500 dark:text-gray-400 font-bold animate-pulse">Cargando tus pedidos...</div>;

  if (!user) return (
    <div className="p-10 text-center dark:text-white">
      <p>Inicia sesión para ver tus pedidos.</p>
      <a href="/profile" className="text-orange-600 font-bold underline">Ir a Perfil</a>
    </div>
  );

  return (
    <div className="max-w-4xl mx-auto p-4 mb-20">
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
              <div className="bg-gray-50 dark:bg-gray-700/50 p-4 flex flex-wrap justify-between items-center border-b dark:border-gray-700 gap-2 transition-colors">
                <div>
                  <p className="text-xs text-gray-500 dark:text-gray-400 font-bold uppercase">Fecha</p>
                  <p className="text-sm font-medium dark:text-gray-200">
                    {order.createdAt?.toDate 
                      ? order.createdAt.toDate().toLocaleString() 
                      : new Date(order.createdAt).toLocaleString()}
                  </p>
                </div>
                <div>
                  <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wide border ${
                    order.status === 'pendiente' ? 'bg-yellow-100 text-yellow-700 border-yellow-200 dark:bg-yellow-900/30 dark:text-yellow-300 dark:border-yellow-800' :
                    order.status === 'preparando' ? 'bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-900/30 dark:text-blue-300 dark:border-blue-800' :
                    order.status === 'listo' ? 'bg-purple-100 text-purple-700 border-purple-200 dark:bg-purple-900/30 dark:text-purple-300 dark:border-purple-800' :
                    order.status === 'entregado' ? 'bg-green-100 text-green-700 border-green-200 dark:bg-green-900/30 dark:text-green-300 dark:border-green-800' :
                    'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300 dark:border-gray-600'
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
                
                <div className="border-t dark:border-gray-700 pt-3 flex justify-between items-end transition-colors">
                  <div className="text-xs text-gray-500 dark:text-gray-400 space-y-1">
                    <p>Tipo: <span className="font-bold capitalize text-gray-700 dark:text-gray-300">{order.type}</span></p>
                    <p>Pago: <span className="font-bold capitalize text-gray-700 dark:text-gray-300">{order.paymentMethod}</span></p>
                    {order.detail && <p>Detalle: <span className="font-medium">{order.detail}</span></p>}
                  </div>
                  <div className="text-right">
                    <span className="text-xs text-gray-400 font-bold uppercase">Total</span>
                    <p className="text-2xl font-extrabold text-orange-600 dark:text-orange-500">${order.total}</p>
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