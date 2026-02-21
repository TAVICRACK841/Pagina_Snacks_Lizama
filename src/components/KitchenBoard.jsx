import { useState, useEffect } from 'react';
import { db, auth } from '../firebase/config';
import { collection, query, where, onSnapshot, doc, updateDoc, getDoc } from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';
import { showToast } from '../stores/toastStore';
import { FaFire, FaCheck, FaClock, FaCheckSquare, FaRegSquare, FaUtensils, FaUserShield, FaBan, FaGlassWhiskey } from 'react-icons/fa';

export default function KitchenBoard() {
  const [orders, setOrders] = useState([]);
  const [userRoles, setUserRoles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);

  const ROLE_CATEGORIES = {
      'hamburguesero': ['hamburguesa', 'burger', 'perros', 'hot dog', 'box', 'mini box', 'carne', 'arrachera', 'pollo'],
      'freidor': ['alitas', 'boneless', 'papas', 'dedos', 'tiras', 'nuggets', 'aros', 'snack', 'box'],
      'productor': ['pasta', 'camarones', 'ensalada'],
  };

  const DRINK_KEYWORDS = ['frappe', 'horchata', 'jamaica', 'soda', 'refresco', 'limonada', 'coca', 'pepsi', 'fanta', 'sidral', 'agua', 'té', 'café'];

  useEffect(() => {
    const unsubAuth = onAuthStateChanged(auth, async (u) => {
      if (u) {
        try {
          const userDoc = await getDoc(doc(db, "users", u.uid));
          if (userDoc.exists()) {
              const data = userDoc.data();
              const roles = (data.roles || (data.role ? [data.role] : [])).map(r => r.toLowerCase());
              setUserRoles(roles);
              setIsAdmin(roles.includes('admin'));
          }
        } catch (error) { console.error("Error rol", error); }
      }
    });

    const q = query(
        collection(db, "orders"),
        where("status", "in", ["pendiente", "preparando", "servido"])
    );
    
    const unsubscribeOrders = onSnapshot(q, (snapshot) => {
      const ordersList = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      ordersList.sort((a, b) => {
          const dateA = a.createdAt?.toDate ? a.createdAt.toDate() : new Date(a.createdAt);
          const dateB = b.createdAt?.toDate ? b.createdAt.toDate() : new Date(b.createdAt);
          return dateA - dateB;
      });
      setOrders(ordersList);
      setLoading(false);
    });

    return () => { unsubAuth(); unsubscribeOrders(); };
  }, []);

  const isDrink = (item) => {
      const name = item.name.toLowerCase();
      return DRINK_KEYWORDS.some(d => name.includes(d));
  };

  const shouldShowItem = (item) => {
    if (isAdmin) return true; 
    
    if (isDrink(item)) return false;
    
    let myKeywords = [];
    userRoles.forEach(role => { if (ROLE_CATEGORIES[role]) myKeywords = [...myKeywords, ...ROLE_CATEGORIES[role]]; });
    if (myKeywords.length === 0) return false;
    
    const name = item.name.toLowerCase();
    return myKeywords.some(k => name.includes(k));
  };

  const toggleItemCompletion = async (order, originalIndex) => {
      const itemToUpdate = order.items[originalIndex];
      
      // Bloqueamos que el admin pueda marcar bebidas en esta pantalla
      if (isAdmin && isDrink(itemToUpdate)) {
          showToast("Las bebidas las marcan en barra/frappes", "info");
          return;
      }

      const updatedItems = [...order.items];
      updatedItems[originalIndex].completed = !updatedItems[originalIndex].completed;
      
      try {
          await updateDoc(doc(db, "orders", order.id), { items: updatedItems });

          // Filtrar items que SÍ le corresponden a cocina (No bebidas)
          const kitchenItems = updatedItems.filter(i => !isDrink(i));
          const allDone = kitchenItems.every(i => i.completed);

          if (allDone && kitchenItems.length > 0) {
              await updateStatus(order.id, 'listo');
          } else {
              if (order.status === 'pendiente') {
                  await updateDoc(doc(db, "orders", order.id), { status: 'preparando' });
              }
          }

      } catch (error) { showToast("Error al actualizar", "error"); }
  };

  const updateStatus = async (orderId, newStatus) => {
    if (newStatus === 'cancelado' && !confirm("¿Cancelar pedido?")) return;
    try {
      const updateData = { status: newStatus };
      if (newStatus === 'listo') {
          updateData.preparedBy = auth.currentUser?.uid;
          updateData.preparedByName = auth.currentUser?.displayName || 'Cocina';
      }
      await updateDoc(doc(db, "orders", orderId), updateData);
      if(newStatus === 'listo') showToast('✅ ¡Orden Completada!', 'success');
    } catch (error) { showToast("Error", 'error'); }
  };

  if (loading) return <div className="p-10 text-center text-white animate-pulse">Cargando cocina...</div>;

  return (
    <div className="p-4 md:p-6 mb-20 relative min-h-screen">
      <div className="mb-6 flex justify-between items-center bg-zinc-800 p-4 rounded-xl border border-yellow-500/20 shadow-lg">
          <h1 className="text-2xl md:text-3xl font-black text-yellow-400 flex items-center gap-2">👨‍🍳 Cocina Caliente</h1>
          <span className="bg-zinc-700 text-white px-4 py-2 rounded-lg font-bold text-sm">Pendientes: {orders.length}</span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 md:gap-6">
        {orders.map((order) => {
            const visibleItems = order.items.map((item, index) => ({...item, originalIndex: index})).filter(item => shouldShowItem(item));
            
            // Verificamos si toda LA COMIDA está lista para ocultar la tarjeta
            const kitchenItems = visibleItems.filter(i => !isDrink(i));
            const allKitchenDone = kitchenItems.length > 0 && kitchenItems.every(i => i.completed);
            
            if (visibleItems.length === 0 || allKitchenDone) return null;

            return (
            <div key={order.id} className={`bg-zinc-800 rounded-xl shadow-xl border-l-8 p-4 relative transition-all flex flex-col justify-between animate-fade-in ${order.status === 'pendiente' ? 'border-red-500' : 'border-yellow-400'}`}>
                
                <div className="flex justify-between items-start mb-3 border-b border-zinc-700 pb-2">
                    <div className="overflow-hidden">
                        <span className="block font-black text-xl text-white leading-tight truncate flex items-center gap-2">
                        {order.type === 'mesa' ? '🍽️' : order.type === 'domicilio' ? '🛵' : '🥡'} {order.detail}
                        </span>
                        <span className="text-xs text-gray-400 font-mono flex items-center gap-1 mt-1">
                        <FaClock/> {new Date(order.createdAt?.toDate ? order.createdAt.toDate() : order.createdAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                        </span>
                    </div>
                    <div className="text-right">
                        <span className={`px-2 py-1 rounded text-[10px] font-bold uppercase ${order.status === 'pendiente' ? 'bg-red-900 text-red-200' : 'bg-yellow-900 text-yellow-200'}`}>
                            {order.status}
                        </span>
                    </div>
                </div>

                <div className="space-y-3 mb-4">
                    {visibleItems.map((item) => {
                        const itemIsDrink = isDrink(item);
                        
                        return (
                        <div key={item.originalIndex} className={`border-b border-zinc-700 pb-2 last:border-0 transition-all ${item.completed ? 'opacity-50' : 'opacity-100'} ${itemIsDrink ? 'bg-zinc-900/50 p-2 rounded-lg' : ''}`}>
                            <div className={`flex items-start gap-3 ${itemIsDrink && isAdmin ? 'cursor-not-allowed' : 'cursor-pointer select-none'}`} onClick={() => toggleItemCompletion(order, item.originalIndex)}>
                                
                                {/* Si es Admin y es bebida, no mostramos checkbox, solo un ícono */}
                                {itemIsDrink && isAdmin ? (
                                    <div className="mt-1 text-2xl text-cyan-700/50" title="Las bebidas se marcan en barra">
                                        <FaGlassWhiskey />
                                    </div>
                                ) : (
                                    <div className={`mt-1 text-2xl ${item.completed ? 'text-green-500' : 'text-gray-500 hover:text-yellow-500'}`}>
                                        {item.completed ? <FaCheckSquare /> : <FaRegSquare />}
                                    </div>
                                )}

                                <div className="flex-1">
                                    <div className="flex items-center gap-2">
                                        <span className={`font-bold text-lg w-7 h-7 flex items-center justify-center rounded-md text-white ${itemIsDrink ? 'bg-cyan-900' : 'bg-zinc-700'}`}>{item.quantity}</span>
                                        <p className={`font-bold text-lg leading-tight ${item.completed ? 'line-through text-gray-500' : itemIsDrink ? 'text-cyan-200/50' : 'text-yellow-100'}`}>{item.name}</p>
                                    </div>
                                    {item.customizationDescription && <div className={`mt-1 ml-9 p-1.5 rounded text-xs ${itemIsDrink ? 'bg-black/20 text-gray-500 border-l-2 border-cyan-800' : 'bg-zinc-700/50 text-gray-300 border-l-2 border-yellow-600'}`}>📝 {item.customizationDescription}</div>}
                                </div>
                            </div>
                        </div>
                    )})}
                </div>

                {isAdmin && (
                    <div className="mt-auto pt-2 border-t border-zinc-700 flex gap-2">
                        <button onClick={() => updateStatus(order.id, 'listo')} className="flex-1 py-2 rounded-lg font-bold text-white bg-green-600 hover:bg-green-500 text-xs">
                            Forzar Finalizar
                        </button>
                        <button onClick={() => updateStatus(order.id, 'cancelado')} className="flex-1 py-2 rounded-lg font-bold text-red-400 bg-zinc-700 hover:bg-red-900/50 border border-zinc-600 text-xs">
                            <FaBan className="inline" /> Cancelar
                        </button>
                    </div>
                )}
            </div>
            );
        })}
        
        {orders.length === 0 && !loading && <div className="col-span-full py-20 text-center text-gray-500"><FaUtensils className="text-6xl mb-4 mx-auto opacity-50"/><p>Sin pedidos pendientes</p></div>}
      </div>
    </div>
  );
}