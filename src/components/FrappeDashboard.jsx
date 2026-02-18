import { useState, useEffect } from 'react';
import { db, auth } from '../firebase/config';
import { collection, query, where, onSnapshot, doc, updateDoc } from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';
import { FaCheck, FaClock, FaGlassWhiskey, FaBan, FaCheckSquare, FaRegSquare, FaFire } from 'react-icons/fa';
import { showToast } from '../stores/toastStore';

export default function FrappeDashboard() {
  const [orders, setOrders] = useState([]);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true); 

  useEffect(() => {
    const unsubAuth = onAuthStateChanged(auth, (u) => setUser(u));
    return () => unsubAuth();
  }, []);

  // --- FILTRO ESTRICTO: SOLO FRAPPES ---
  const isFrappeItem = (item) => {
      const name = item.name.toLowerCase();
      const cat = item.category ? item.category.toLowerCase() : '';
      
      const keywords = ['frappe', 'malteada', 'chamoyada', 'smoothie', 'esquimo'];
      
      return keywords.some(k => name.includes(k)) || cat.includes('frappe');
  };

  useEffect(() => {
    const q = query(
        collection(db, "orders"), 
        where("status", "in", ["pendiente", "preparando", "listo"])
    );
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const ordersList = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      
      ordersList.sort((a, b) => {
          const dateA = a.createdAt?.toDate ? a.createdAt.toDate() : new Date(a.createdAt);
          const dateB = b.createdAt?.toDate ? b.createdAt.toDate() : new Date(b.createdAt);
          return dateA - dateB;
      });
      
      const frappeOrders = ordersList.filter(order => {
          const hasFrappes = order.items.some(isFrappeItem);
          const hasPendingFrappes = order.items.some(item => isFrappeItem(item) && !item.completed);
          return hasFrappes && hasPendingFrappes;
      });
      
      setOrders(frappeOrders);
      setLoading(false);
    }, (error) => setLoading(false));
    return () => unsubscribe();
  }, []);

  const toggleItemCompletion = async (order, originalIndex) => {
      const updatedItems = [...order.items];
      updatedItems[originalIndex].completed = !updatedItems[originalIndex].completed;
      
      try {
          let newStatus = order.status;
          if (newStatus === 'pendiente') newStatus = 'preparando';

          await updateDoc(doc(db, "orders", order.id), { 
              items: updatedItems,
              status: newStatus
          });
          
          const allItemsCompleted = updatedItems.every(i => i.completed);
          if (allItemsCompleted && newStatus !== 'listo') {
              updateStatus(order.id, 'listo');
          }
      } catch (error) { showToast("Error al marcar", "error"); }
  };

  const updateStatus = async (orderId, newStatus) => {
    if (newStatus === 'cancelado' && !confirm("¿Cancelar orden? Se borrará para todos.")) return;
    if(!user) return;

    try {
      await updateDoc(doc(db, "orders", orderId), { 
          status: newStatus,
          preparedBy: user.uid,
          preparedByName: user.displayName || 'Barra Frappes'
      });
      if(newStatus === 'listo') showToast(`✅ Barra lista`, 'success');
      if(newStatus === 'preparando') showToast(`🔥 Preparando...`, 'success');
    } catch (error) { showToast("Error", 'error'); }
  };

  if (loading) return <div className="p-10 text-center text-white animate-pulse">Cargando barra...</div>;

  return (
    <div className="p-4 min-h-screen pb-20 bg-zinc-900 text-white">
      
      {/* TÍTULO CORREGIDO (Igual al de Mesas) */}
      <div className="flex justify-between items-center mb-6 bg-zinc-800 p-4 rounded-xl border border-zinc-700 shadow-lg">
          <h1 className="text-2xl font-black text-pink-400 flex items-center gap-2"><FaGlassWhiskey /> Barra Frappes</h1>
          <span className="bg-pink-600 text-white px-3 py-1 rounded-full font-bold text-sm shadow">{orders.length}</span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {orders.map(order => {
            const visibleItems = order.items.map((item, index) => ({...item, originalIndex: index})).filter(item => isFrappeItem(item));
            if (visibleItems.length === 0) return null;

            return (
                <div key={order.id} className={`bg-zinc-800 rounded-xl border-l-4 shadow-lg overflow-hidden flex flex-col animate-fade-in ${order.status === 'pendiente' ? 'border-pink-500' : 'border-pink-400'}`}>
                    
                    <div className={`p-3 text-white font-bold flex justify-between items-center ${order.status === 'pendiente' ? 'bg-pink-700' : 'bg-pink-900'}`}>
                        <span className="text-lg">#{order.id.slice(-4)}</span>
                        <div className="text-right">
                            <span className="text-[10px] uppercase block tracking-wider font-black opacity-90">{order.status}</span>
                            <span className="text-xs font-mono mt-0.5 block">
                                <FaClock className="inline mr-1 mb-0.5" /> 
                                {new Date(order.createdAt?.toDate ? order.createdAt.toDate() : order.createdAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                            </span>
                        </div>
                    </div>
                    
                    <div className="p-4 flex-1 space-y-3">
                        <p className="font-bold text-pink-200 text-lg leading-tight border-b border-zinc-700 pb-1">{order.detail}</p>
                        <p className="text-xs text-gray-400 uppercase mt-1">{order.userName}</p>
                        
                        {visibleItems.map((item) => (
                            <div key={item.originalIndex} className={`flex items-start gap-3 p-2 rounded transition cursor-pointer select-none ${item.completed ? 'bg-zinc-700 opacity-50' : 'bg-zinc-700/50 hover:bg-zinc-600'}`} onClick={() => toggleItemCompletion(order, item.originalIndex)}>
                                <div className={`mt-1 text-xl transition-transform active:scale-90 ${item.completed ? 'text-green-500' : 'text-gray-500 hover:text-pink-500'}`}>
                                    {item.completed ? <FaCheckSquare /> : <FaRegSquare />}
                                </div>
                                <div className="flex-1">
                                    <div className="flex justify-between font-bold text-sm">
                                        <span className={item.completed ? 'text-gray-400 line-through' : 'text-white'}>{item.quantity}x {item.name}</span>
                                    </div>
                                    {item.customizationDescription && <span className="text-[10px] text-pink-300 italic block">{item.customizationDescription}</span>}
                                </div>
                            </div>
                        ))}
                    </div>

                    <div className="p-3 bg-zinc-900 border-t border-zinc-700 flex flex-col gap-2">
                        {order.status === 'pendiente' ? (
                            <button onClick={() => updateStatus(order.id, 'preparando')} className="w-full bg-yellow-600 hover:bg-yellow-500 text-white font-bold py-3 rounded-lg transition shadow-md flex items-center justify-center gap-2">
                                <FaFire/> Empezar a Preparar
                            </button>
                        ) : (
                            <button onClick={() => updateStatus(order.id, 'listo')} className="w-full bg-green-600 hover:bg-green-500 text-white font-bold py-3 rounded-lg transition flex items-center justify-center gap-2 animate-pulse shadow-md">
                                <FaCheck /> Forzar Fin de Orden
                            </button>
                        )}
                    </div>
                </div>
            );
        })}
        {orders.length === 0 && (
            <div className="col-span-full flex flex-col items-center justify-center py-20 text-gray-500 opacity-50">
                <FaGlassWhiskey size={60} className="mb-4 mx-auto"/>
                <p className="text-xl font-bold">Todo limpio, sin frappes pendientes.</p>
            </div>
        )}
      </div>
    </div>
  );
}