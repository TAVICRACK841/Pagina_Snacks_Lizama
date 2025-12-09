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
      } else { setUser(null); setLoading(false); }
    });
    return () => unsubscribeAuth();
  }, []);

  if (loading) return <div className="p-10 text-center dark:text-white">Cargando...</div>;
  if (!user) return <div className="p-10 text-center dark:text-white">Inicia sesión.</div>;

  return (
    <div className="max-w-4xl mx-auto p-4 mb-20">
      <h1 className="text-3xl font-bold mb-6 text-gray-800 dark:text-white">📦 Mis Pedidos</h1>
      {orders.length === 0 ? (
        <div className="text-center py-10 bg-white dark:bg-gray-800 rounded-lg shadow border dark:border-gray-700">
          <p className="text-gray-500 dark:text-gray-400 font-bold">Aún no has realizado ningún pedido.</p>
        </div>
      ) : (
        <div className="space-y-6">
          {orders.map((order) => (
            <div key={order.id} className="bg-white dark:bg-gray-800 rounded-xl shadow-md overflow-hidden border border-gray-100 dark:border-gray-700 hover:shadow-lg transition-colors">
              <div className="bg-gray-50 dark:bg-gray-700/50 p-4 flex flex-wrap justify-between items-center border-b dark:border-gray-700 gap-2">
                <div>
                  <p className="text-xs text-gray-500 dark:text-gray-400 font-bold uppercase">Fecha</p>
                  <p className="text-sm font-medium dark:text-gray-200">{order.createdAt?.toDate ? order.createdAt.toDate().toLocaleString() : new Date(order.createdAt).toLocaleString()}</p>
                </div>
                <div><span className="px-3 py-1 rounded-full text-xs font-bold uppercase bg-orange-100 dark:bg-orange-900 text-orange-700 dark:text-orange-300">{order.status}</span></div>
              </div>
              <div className="p-4">
                <ul className="space-y-2 mb-4">
                  {order.items.map((item, index) => (
                    <li key={index} className="flex justify-between text-sm text-gray-700 dark:text-gray-300 border-b dark:border-gray-700 border-dashed pb-2">
                      <span className="font-medium">{item.quantity}x {item.name}</span>
                      <span className="font-bold text-gray-500 dark:text-gray-400">${item.price * item.quantity}</span>
                    </li>
                  ))}
                </ul>
                <div className="border-t dark:border-gray-700 pt-3 flex justify-between items-end">
                  <div className="text-xs text-gray-500 dark:text-gray-400"><p>Tipo: <span className="font-bold dark:text-gray-300">{order.type}</span></p><p>Pago: <span className="font-bold dark:text-gray-300">{order.paymentMethod}</span></p></div>
                  <div className="text-right"><span className="text-xs text-gray-400 font-bold uppercase">Total</span><p className="text-2xl font-extrabold text-orange-600 dark:text-orange-500">${order.total}</p></div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}