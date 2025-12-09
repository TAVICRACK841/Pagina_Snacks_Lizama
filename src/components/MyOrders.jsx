import { useState, useEffect } from 'react';
import { auth, db } from '../firebase/config';
import { collection, query, where, onSnapshot } from 'firebase/firestore'; // Quitamos orderBy de aquí
import { onAuthStateChanged } from 'firebase/auth';

export default function MyOrders() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);

  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, (currentUser) => {
      if (currentUser) {
        setUser(currentUser);
        
        // 1. CONSULTA SIMPLIFICADA (Sin orderBy para evitar error de índice)
        const q = query(
          collection(db, "orders"),
          where("userId", "==", currentUser.uid)
        );

        const unsubscribeOrders = onSnapshot(q, (snapshot) => {
          const ordersList = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
          }));

          // 2. ORDENAMOS AQUÍ (Javascript)
          // Ordenar del más nuevo al más viejo
          ordersList.sort((a, b) => {
            const dateA = new Date(a.createdAt);
            const dateB = new Date(b.createdAt);
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

  if (loading) return <div className="p-10 text-center text-gray-500 font-bold animate-pulse">Cargando tus pedidos...</div>;

  if (!user) return (
    <div className="p-10 text-center">
      <p>Inicia sesión para ver tus pedidos.</p>
      <a href="/profile" className="text-orange-600 font-bold underline">Ir a Perfil</a>
    </div>
  );

  return (
    <div className="max-w-4xl mx-auto p-4 mb-20">
      <h1 className="text-3xl font-bold mb-6 text-gray-800">📦 Mis Pedidos</h1>

      {orders.length === 0 ? (
        <div className="text-center py-10 bg-white rounded-lg shadow border border-gray-100">
          <div className="text-6xl mb-4">🍽️</div>
          <p className="text-gray-500 font-bold">Aún no has realizado ningún pedido.</p>
          <a href="/menu" className="mt-4 inline-block bg-orange-600 text-white px-6 py-2 rounded-full font-bold hover:bg-orange-700 transition">
            Ir al Menú
          </a>
        </div>
      ) : (
        <div className="space-y-6">
          {orders.map((order) => (
            <div key={order.id} className="bg-white rounded-xl shadow-md overflow-hidden border border-gray-100 hover:shadow-lg transition-shadow">
              
              {/* Encabezado */}
              <div className="bg-gray-50 p-4 flex flex-wrap justify-between items-center border-b gap-2">
                <div>
                  <p className="text-xs text-gray-500 font-bold uppercase">Fecha</p>
                  <p className="text-sm font-medium">
                    {/* Manejamos ambos formatos de fecha por seguridad */}
                    {order.createdAt?.toDate 
                      ? order.createdAt.toDate().toLocaleString() 
                      : new Date(order.createdAt).toLocaleString()}
                  </p>
                </div>
                <div>
                  <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wide ${
                    order.status === 'pendiente' ? 'bg-yellow-100 text-yellow-700 border border-yellow-200' :
                    order.status === 'preparando' ? 'bg-blue-100 text-blue-700 border border-blue-200' :
                    order.status === 'listo' ? 'bg-purple-100 text-purple-700 border border-purple-200' :
                    order.status === 'entregado' ? 'bg-green-100 text-green-700 border border-green-200' :
                    'bg-gray-100 text-gray-600'
                  }`}>
                    {order.status}
                  </span>
                </div>
              </div>

              {/* Contenido */}
              <div className="p-4">
                <ul className="space-y-2 mb-4">
                  {order.items.map((item, index) => (
                    <li key={index} className="flex justify-between text-sm text-gray-700 border-b border-dashed pb-2 last:border-0">
                      <span className="font-medium">{item.quantity}x {item.name}</span>
                      <span className="font-bold text-gray-500">${item.price * item.quantity}</span>
                    </li>
                  ))}
                </ul>
                
                <div className="border-t pt-3 flex justify-between items-end">
                  <div className="text-xs text-gray-500 space-y-1">
                    <p>Tipo: <span className="font-bold capitalize text-gray-700">{order.type}</span></p>
                    <p>Pago: <span className="font-bold capitalize text-gray-700">{order.paymentMethod}</span></p>
                    {order.detail && <p>Detalle: <span className="font-medium">{order.detail}</span></p>}
                  </div>
                  <div className="text-right">
                    <span className="text-xs text-gray-400 font-bold uppercase">Total</span>
                    <p className="text-2xl font-extrabold text-orange-600">${order.total}</p>
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