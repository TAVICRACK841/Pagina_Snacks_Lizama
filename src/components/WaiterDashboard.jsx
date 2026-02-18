import { useState, useEffect } from 'react';
import { db, auth } from '../firebase/config';
import { collection, query, where, onSnapshot, doc, updateDoc } from 'firebase/firestore';
import { FaConciergeBell, FaUserTie, FaCheckSquare, FaRegSquare, FaLock, FaFire, FaGlassWhiskey } from 'react-icons/fa';
import { showToast } from '../stores/toastStore';
import { onAuthStateChanged } from 'firebase/auth';

export default function WaiterDashboard() {
  const [orders, setOrders] = useState([]);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubAuth = onAuthStateChanged(auth, (u) => setUser(u));
    return () => unsubAuth();
  }, []);

  // --- ACTIVOS ---
  useEffect(() => {
    const q = query(
      collection(db, "orders"),
      where("status", "in", ["pendiente", "preparando", "listo", "servido"]), 
      where("type", "==", "mesa")
    );
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const list = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      list.sort((a, b) => {
          const dateA = a.createdAt?.toDate ? a.createdAt.toDate() : new Date(a.createdAt);
          const dateB = b.createdAt?.toDate ? b.createdAt.toDate() : new Date(b.createdAt);
          return dateA - dateB;
      });
      setOrders(list);
      setLoading(false);
    }, (err) => setLoading(false));
    return () => unsubscribe();
  }, []);

  // --- LÓGICA DE CANDADOS Y DESBLOQUEOS ---
  const isItemReady = (item) => {
      if (item.delivered) return true;
      if (item.completed) return true; 

      const name = item.name.toLowerCase();
      const cat = item.category ? item.category.toLowerCase() : '';

      if (['frappe', 'malteada', 'chamoyada', 'smoothie', 'esquimo'].some(d => name.includes(d)) || cat.includes('frappe')) {
          return false;
      }

      const simpleDrinks = ['coca', 'pepsi', 'fanta', 'sidral', 'agua', 'refresco', 'soda', 'botella', 'mineral', 'sangria', 'manzana', 'jugo', 'embotellado', 'horchata', 'jamaica', 'tamarindo', 'cebada'];
      if (simpleDrinks.some(d => name.includes(d)) || cat.includes('aguas naturales') || cat.includes('embotellado')) {
          return true;
      }

      return false;
  };

  const toggleItemDelivered = async (order, index) => {
      const item = order.items[index];
      
      if (!isItemReady(item) && !item.delivered) {
          showToast("⏳ Aún no está listo en cocina o barra", "info");
          return;
      }

      const updatedItems = [...order.items];
      updatedItems[index].delivered = !updatedItems[index].delivered;
      
      try {
          let newStatus = order.status;
          if (order.status === 'listo') {
              newStatus = 'servido';
          }

          await updateDoc(doc(db, "orders", order.id), { 
              items: updatedItems, 
              status: newStatus,
              servedBy: user.uid,
              servedByName: user.displayName || 'Mesero'
          });
      } catch (error) { showToast("Error al marcar", "error"); }
  };

  const finishOrder = async (order) => {
      if (!user) return;
      const allDelivered = order.items.every(i => i.delivered);
      
      if (!allDelivered && !confirm("⚠️ Faltan platillos por entregar. ¿Cerrar mesa de todos modos?")) return;

      try {
          await updateDoc(doc(db, "orders", order.id), { 
              status: 'entregado', 
              servedBy: user.uid, 
              servedByName: user.displayName || user.email 
          });
          showToast(`✅ Mesa Liberada`, 'success');
      } catch (error) { showToast("Error", 'error'); }
  };

  if (loading) return <div className="p-10 text-center text-white animate-pulse">Cargando mesas...</div>;

  return (
    <div className="p-4 min-h-screen pb-20 bg-zinc-900 text-white">
      
      {/* HEADER LIMPIO (Sin pestañas) */}
      <div className="flex justify-between items-center mb-6 bg-zinc-800 p-4 rounded-xl border border-zinc-700 shadow-lg">
          <h1 className="text-2xl font-black text-blue-400 flex items-center gap-3">
              <FaConciergeBell className="text-3xl" /> Mesas Activas
          </h1>
          <span className="bg-blue-600 text-white px-4 py-1.5 rounded-full font-bold text-sm shadow-md">
              {orders.length} Mesas
          </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {orders.map(order => {
            const allDelivered = order.items.every(i => i.delivered);
            
            let cardColor = 'border-red-500 bg-zinc-800'; 
            let headerColor = 'bg-red-900 text-red-100';
            
            if (order.status === 'preparando') { cardColor = 'border-yellow-500 bg-zinc-800'; headerColor = 'bg-yellow-800 text-yellow-100'; }
            if (order.status === 'listo') { cardColor = 'border-green-500 bg-zinc-800'; headerColor = 'bg-green-700 text-white'; }
            if (order.status === 'servido') { cardColor = 'border-blue-500 bg-zinc-800'; headerColor = 'bg-blue-900 text-blue-100'; }

            return (
            <div key={order.id} className={`rounded-xl border-l-4 shadow-lg overflow-hidden flex flex-col animate-fade-in ${cardColor}`}>
                <div className={`${headerColor} p-3 font-bold flex justify-between items-center`}>
                    <span className="text-lg">{order.detail}</span>
                    <div className="text-right">
                        <span className="text-[10px] block opacity-90 uppercase font-black tracking-widest">
                            {order.status === 'pendiente' ? 'NUEVO' : order.status === 'preparando' ? 'En Cocina' : order.status}
                        </span>
                        <span className="text-xs font-mono">{new Date(order.createdAt?.toDate ? order.createdAt.toDate() : order.createdAt).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}</span>
                    </div>
                </div>
                
                <div className="p-4 flex-1 space-y-3">
                    <p className="text-sm text-gray-400 font-bold uppercase border-b border-zinc-700 pb-1">{order.userName}</p>
                    
                    {order.items.map((item, idx) => {
                        const ready = isItemReady(item);
                        const isSimpleDrink = ['coca', 'pepsi', 'fanta', 'sidral', 'agua', 'refresco', 'soda', 'botella', 'mineral', 'sangria', 'manzana', 'jugo', 'embotellado', 'horchata', 'jamaica', 'tamarindo', 'cebada'].some(d => item.name.toLowerCase().includes(d));

                        return (
                            <div 
                                key={idx} 
                                className={`flex items-start gap-3 p-2 rounded transition select-none 
                                    ${item.delivered ? 'bg-green-900/20 opacity-50' : ready ? 'bg-zinc-700 cursor-pointer hover:bg-zinc-600' : 'bg-zinc-800 opacity-40 cursor-not-allowed'}`} 
                                onClick={() => toggleItemDelivered(order, idx)}
                            >
                                <div className={`mt-1 text-xl ${item.delivered ? 'text-green-500' : ready ? 'text-white' : 'text-gray-600'}`}>
                                    {item.delivered ? <FaCheckSquare /> : ready ? <FaRegSquare /> : <FaLock size={14}/>}
                                </div>
                                <div className="flex-1">
                                    <div className="flex justify-between font-bold text-sm">
                                        <span className={ready ? 'text-white' : 'text-gray-500'}>{item.quantity}x {item.name}</span>
                                        
                                        {/* Icono de listo en cocina */}
                                        {item.completed && !item.delivered && <span className="text-orange-500 animate-bounce" title="¡Terminado en cocina/barra!"><FaFire/></span>}
                                        
                                        {/* Icono de bebida automática */}
                                        {ready && !item.completed && !item.delivered && isSimpleDrink && <span className="text-blue-400" title="Bebida Lista"><FaGlassWhiskey/></span>}
                                    </div>
                                    {item.customizationDescription && <span className="text-[10px] text-gray-400 italic block">{item.customizationDescription}</span>}
                                </div>
                            </div>
                        );
                    })}
                </div>

                <div className="p-3 bg-zinc-900 border-t border-zinc-700">
                    <button 
                        onClick={() => finishOrder(order)} 
                        className={`w-full font-bold py-3 rounded-lg transition shadow-lg flex items-center justify-center gap-2 ${allDelivered ? 'bg-green-600 hover:bg-green-500 text-white animate-pulse' : 'bg-zinc-700 text-gray-500 opacity-80'}`}
                    >
                        <FaUserTie /> {allDelivered ? '¡Entregar y Liberar Mesa!' : 'Marca todo para finalizar'}
                    </button>
                </div>
            </div>
            );
        })}
        {orders.length === 0 && (
            <div className="col-span-full flex flex-col items-center justify-center py-20 text-gray-500 opacity-50">
                <FaConciergeBell size={60} className="mb-4 mx-auto"/>
                <p className="text-xl font-bold">No hay mesas activas</p>
            </div>
        )}
      </div>
    </div>
  );
}