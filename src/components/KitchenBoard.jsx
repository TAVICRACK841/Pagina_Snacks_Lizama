import { useState, useEffect } from 'react';
import { db, auth } from '../firebase/config';
import { collection, query, orderBy, onSnapshot, doc, updateDoc, getDoc } from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';

export default function KitchenBoard() {
  const [orders, setOrders] = useState([]);
  const [userRole, setUserRole] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // 1. Escuchar el estado de autenticación (CORRECCIÓN CRÍTICA)
    const unsubscribeAuth = onAuthStateChanged(auth, async (user) => {
      if (user) {
        try {
          const userDoc = await getDoc(doc(db, "users", user.uid));
          if (userDoc.exists()) {
            const role = userDoc.data().role;
            console.log("Rol detectado:", role); // Para depuración en consola
            setUserRole(role);
          }
        } catch (error) {
          console.error("Error obteniendo rol:", error);
        }
      } else {
        setUserRole(null);
      }
    });

    // 2. Escuchar los pedidos en tiempo real
    // Nota: Si te sale error de índice en consola, quita provisionalmente: , orderBy("createdAt", "asc")
    const q = query(collection(db, "orders"), orderBy("createdAt", "asc"));
    
    const unsubscribeOrders = onSnapshot(q, (snapshot) => {
      const ordersList = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      // Filtramos visualmente los completados
      setOrders(ordersList.filter(o => o.status !== 'completado'));
      setLoading(false);
    }, (error) => {
      console.error("Error en pedidos:", error);
      // Si falla por falta de índice, avisa
      if (error.code === 'failed-precondition') {
        alert("Falta crear un índice en Firebase. Abre la consola (F12) y sigue el link que te da Google.");
      }
    });

    return () => {
      unsubscribeAuth();
      unsubscribeOrders();
    };
  }, []);

  const completeOrder = async (orderId) => {
    if (!window.confirm("¿Marcar pedido como completado?")) return;
    try {
      await updateDoc(doc(db, "orders", orderId), { status: 'completado' });
    } catch (error) {
      console.error(error);
      alert("Error al completar orden");
    }
  };

  const shouldShowItem = (itemCategory) => {
    // Si no ha cargado el rol, no mostramos nada por seguridad
    if (!userRole) return false;

    // Lógica de permisos
    if (userRole === 'admin' || userRole === 'mesero' || userRole === 'repartidor') return true;
    if (userRole === 'hamburguesero' && itemCategory === 'hamburguesas') return true;
    if (userRole === 'freidor' && (itemCategory === 'alitas' || itemCategory === 'boneless')) return true;
    
    return false;
  };

  if (loading) return <div className="p-10 text-center text-xl font-bold animate-pulse">Cargando sistema de cocina...</div>;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 p-4">
      {orders.map((order) => {
        const visibleItems = order.items.filter(item => shouldShowItem(item.category));
        
        // Si este rol no tiene nada que ver con este pedido, lo ocultamos
        if (visibleItems.length === 0 && userRole !== 'admin' && userRole !== 'mesero' && userRole !== 'repartidor') return null;

        return (
          <div key={order.id} className={`bg-white rounded-lg shadow-lg border-l-8 p-4 relative ${
            order.status === 'pendiente' ? 'border-yellow-400' : 'border-green-500'
          }`}>
            <div className="flex justify-between items-start mb-4 border-b pb-2">
              <div>
                <span className="block font-black text-xl text-gray-800">
                  {order.type === 'mesa' ? `🍽️ ${order.detail}` : 
                   order.type === 'domicilio' ? `🛵 Domicilio` : `🥡 Para Llevar`}
                </span>
                <span className="text-xs text-gray-500 font-mono">
                  {new Date(order.createdAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                </span>
              </div>
              <span className={`px-2 py-1 rounded text-xs font-bold uppercase ${
                 order.type === 'mesa' ? 'bg-blue-100 text-blue-800' : 'bg-orange-100 text-orange-800'
              }`}>
                {order.type}
              </span>
            </div>

            {/* Lista de Items */}
            <div className="space-y-3 mb-4">
              {visibleItems.map((item, index) => (
                <div key={index} className="flex justify-between items-center bg-gray-50 p-2 rounded">
                  <span className="font-bold text-gray-800 text-lg">{item.quantity}</span>
                  <span className="flex-1 ml-3 text-gray-700 font-medium">{item.name}</span>
                </div>
              ))}
              
              {visibleItems.length < order.items.length && (
                <p className="text-xs text-center text-gray-400 italic mt-2">
                  (+{order.items.length - visibleItems.length} productos de otra área)
                </p>
              )}
            </div>

            {/* Info Extra para Admin/Mesero/Repartidor */}
            {(userRole === 'admin' || userRole === 'repartidor' || userRole === 'mesero') && (
              <div className="bg-orange-50 p-3 rounded text-sm mb-4 border border-orange-100">
                 <p><span className="font-bold">Cliente:</span> {order.userEmail}</p>
                 {order.type === 'domicilio' && <p className="mt-1"><span className="font-bold">Dirección:</span> {order.detail}</p>}
                 <p className="mt-1 border-t border-orange-200 pt-1 flex justify-between">
                    <span>Pago: {order.paymentMethod}</span>
                    <span className="font-bold text-lg">${order.total}</span>
                 </p>
              </div>
            )}

            <button
              onClick={() => completeOrder(order.id)}
              className="w-full bg-gray-800 text-white py-3 rounded-lg font-bold hover:bg-gray-700 transition shadow-lg active:transform active:scale-95"
            >
              ✅ Terminar Pedido
            </button>
          </div>
        );
      })}
      
      {orders.length === 0 && !loading && (
        <div className="col-span-full flex flex-col items-center justify-center py-20 text-gray-400">
          <div className="text-6xl mb-4">👨‍🍳</div>
          <p className="text-xl">La cocina está tranquila...</p>
          <p className="text-sm">Esperando nuevos pedidos.</p>
        </div>
      )}
    </div>
  );
}