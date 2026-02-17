import { useState, useEffect } from 'react';
import { db, auth } from '../firebase/config';
import { collection, query, where, onSnapshot, doc, updateDoc, getDoc, orderBy } from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';
import { showToast } from '../stores/toastStore';
import { FaFire, FaCheck, FaClock, FaCheckSquare, FaRegSquare, FaUtensils, FaBan, FaExclamationTriangle } from 'react-icons/fa';

export default function KitchenBoard() {
  const [orders, setOrders] = useState([]);
  const [userRoles, setUserRoles] = useState([]);
  const [loading, setLoading] = useState(true);

  // --- REGLAS DE FILTRADO (QUÉ VE CADA QUIEN) ---
  const ROLE_CATEGORIES = {
      'hamburguesero': ['hamburguesa', 'burger', 'perros', 'hot dog', 'box', 'mini box', 'carne'],
      'freidor': ['alitas', 'boneless', 'papas', 'dedos', 'tiras', 'nuggets', 'aros', 'snack'],
      'productor': ['pasta', 'camarones', 'ensalada'],
      // Bebidas se filtran fuera
  };

  useEffect(() => {
    const unsubAuth = onAuthStateChanged(auth, async (u) => {
      if (u) {
        try {
          const userDoc = await getDoc(doc(db, "users", u.uid));
          if (userDoc.exists()) {
              const data = userDoc.data();
              setUserRoles(data.roles || (data.role ? [data.role] : []));
          }
        } catch (error) { console.error("Error rol", error); }
      }
    });

    // 2. ESCUCHAR PEDIDOS (SOLO PENDIENTES Y PREPARANDO)
    // El pedido SE MANTIENE aquí mientras se prepara. Solo se va cuando es 'listo'.
    const q = query(
        collection(db, "orders"),
        where("status", "in", ["pendiente", "preparando"]),
        orderBy("createdAt", "asc")
    );
    
    const unsubscribeOrders = onSnapshot(q, (snapshot) => {
      const ordersList = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setOrders(ordersList);
      setLoading(false); // <--- Desbloquea la pantalla
    }, (error) => {
        console.error(error);
        setLoading(false);
    });

    return () => { unsubAuth(); unsubscribeOrders(); };
  }, []);

  const toggleItemCompletion = async (order, originalIndex) => {
      // Clona items para no mutar estado directo
      const updatedItems = order.items.map(i => ({...i}));
      updatedItems[originalIndex].completed = !updatedItems[originalIndex].completed;
      
      try {
          await updateDoc(doc(db, "orders", order.id), { items: updatedItems });
      } catch (error) {
          showToast("Error al marcar", "error");
      }
  };

  const updateStatus = async (orderId, newStatus) => {
    if (newStatus === 'cancelado' && !confirm("¿Seguro que quieres cancelar este pedido? Se borrará de la lista.")) return;

    try {
      const updateData = { status: newStatus };
      
      // Si se completa (Listo), guardamos quien lo hizo
      if (newStatus === 'listo') {
          updateData.preparedBy = auth.currentUser?.uid;
          updateData.preparedByName = auth.currentUser?.displayName || 'Cocina';
      }

      await updateDoc(doc(db, "orders", orderId), updateData);
      
      if(newStatus === 'listo') showToast('🔔 ¡Orden Lista!', 'success');
      else if(newStatus === 'cancelado') showToast('🚫 Cancelado', 'error');
      else showToast('🔥 Cocinando...', 'success');

    } catch (error) { showToast("Error al actualizar", 'error'); }
  };

  // --- FILTRO INTELIGENTE ---
  const shouldShowItem = (item) => {
    const name = item.name.toLowerCase();
    const cat = item.category ? item.category.toLowerCase() : '';

    // EXCLUIR BEBIDAS (Van a Frappes)
    if (name.includes('frappe') || name.includes('horchata') || name.includes('jamaica') || name.includes('soda') || name.includes('refresco') || name.includes('limonada') || name.includes('tamarindo')) return false;

    // ADMIN VE TODO (Resto de comida)
    if (userRoles.includes('admin')) return true;

    // FILTRAR POR ROL
    let myKeywords = [];
    userRoles.forEach(role => {
        if (ROLE_CATEGORIES[role]) {
            myKeywords = [...myKeywords, ...ROLE_CATEGORIES[role]];
        }
    });

    // Si no tiene rol de cocina, no ve nada
    if (myKeywords.length === 0) return false;

    // Verificar coincidencias
    const matches = myKeywords.some(keyword => name.includes(keyword) || cat.includes(keyword));
    return matches;
  };

  if (loading) return <div className="p-10 text-center text-lg font-bold animate-pulse text-white">Cargando cocina...</div>;

  return (
    <div className="p-4 md:p-6 mb-20 relative min-h-screen">
      
      <div className="mb-6 flex justify-between items-center bg-zinc-800 p-4 rounded-xl border border-yellow-500/20 shadow-lg">
          <h1 className="text-2xl md:text-3xl font-black text-yellow-400 flex items-center gap-2">
            👨‍🍳 Cocina Caliente
          </h1>
          <span className="bg-zinc-700 text-white px-4 py-2 rounded-lg font-bold text-sm">
              Pendientes: {orders.length}
          </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 md:gap-6">
        {orders.map((order) => {
            const isTakeOut = order.type === 'llevar';

            // 1. FILTRAR ITEMS: Solo mostramos lo que le toca a este cocinero
            const visibleItems = order.items
                .map((item, index) => ({...item, originalIndex: index})) 
                .filter(item => shouldShowItem(item));
            
            // 2. Si no hay nada para mi rol, no muestro la tarjeta
            if (visibleItems.length === 0) return null;

            return (
            <div key={order.id} className={`bg-zinc-800 rounded-xl shadow-xl border-l-8 p-4 relative transition-all flex flex-col justify-between animate-fade-in ${
                order.status === 'pendiente' ? 'border-red-500' : 'border-yellow-400'
            }`}>
                
                {order.scheduledTime && (
                    <div className="absolute -top-3 right-4 bg-purple-600 text-white px-3 py-1 rounded-full shadow-lg text-xs font-bold animate-pulse z-10 flex items-center gap-1">
                        <FaClock /> {order.scheduledTime}
                    </div>
                )}

                <div className="relative z-10">
                    <div className="flex justify-between items-start mb-3 border-b border-zinc-700 pb-2 pt-2">
                        <div className="overflow-hidden">
                            <span className="block font-black text-xl text-white leading-tight truncate flex items-center gap-2">
                            {order.type === 'mesa' ? '🍽️' : order.type === 'domicilio' ? '🛵' : '🥡'} {order.detail}
                            </span>
                            <span className="text-xs text-gray-400 font-mono flex items-center gap-1 mt-1">
                            <FaClock/> {new Date(order.createdAt?.toDate ? order.createdAt.toDate() : order.createdAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                            </span>
                        </div>
                        <span className={`px-2 py-1 rounded text-[10px] md:text-xs font-bold uppercase shadow-sm whitespace-nowrap ${
                            order.type === 'mesa' ? 'bg-purple-900 text-purple-200' : 'bg-orange-900 text-orange-200'
                        }`}>
                            {order.type}
                        </span>
                    </div>

                    {/* LISTA DE PLATILLOS */}
                    <div className="space-y-3 mb-4">
                        {visibleItems.map((item) => (
                            <div 
                                key={item.originalIndex} 
                                className={`border-b border-zinc-700 pb-2 last:border-0 transition-all duration-300 ${item.completed ? 'opacity-40' : 'opacity-100'}`}
                            >
                            <div className="flex items-start gap-3 cursor-pointer select-none group" onClick={() => toggleItemCompletion(order, item.originalIndex)}>
                                <div className={`mt-1 text-2xl transition-transform transform active:scale-90 ${item.completed ? 'text-green-500' : 'text-gray-500 group-hover:text-yellow-500'}`}>
                                    {item.completed ? <FaCheckSquare /> : <FaRegSquare />}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2">
                                        <span className={`font-bold text-lg w-7 h-7 flex items-center justify-center rounded-md shadow-sm shrink-0 ${item.completed ? 'bg-green-900 text-green-200' : 'bg-zinc-700 text-white'}`}>
                                            {item.quantity}
                                        </span>
                                        <p className={`font-bold text-lg leading-tight break-words ${item.completed ? 'line-through text-gray-500' : 'text-yellow-100'}`}>
                                            {item.name}
                                        </p>
                                    </div>
                                    {item.customizationDescription && (
                                        <div className="mt-1 ml-9 p-1.5 rounded bg-zinc-700/50 border-l-2 border-yellow-600 text-xs text-gray-300">
                                            📝 {item.customizationDescription}
                                        </div>
                                    )}
                                </div>
                            </div>
                            </div>
                        ))}
                    </div>
                </div>

                <div className="mt-auto relative z-10 pt-2 border-t border-zinc-700 space-y-2">
                    {/* BOTÓN PRINCIPAL */}
                    <button
                        onClick={() => {
                            // Si está Pendiente -> Pasa a Preparando (Se queda en pantalla)
                            // Si está Preparando -> Pasa a Listo (Desaparece)
                            let nextStatus = order.status === 'pendiente' ? 'preparando' : 'listo';
                            updateStatus(order.id, nextStatus);
                        }}
                        className={`w-full py-3 rounded-xl font-bold text-white shadow-lg active:scale-95 transition-all flex items-center justify-center gap-2 text-base ${
                            order.status === 'pendiente' ? 'bg-red-600 hover:bg-red-700 animate-pulse' :
                            'bg-green-600 hover:bg-green-500'
                        }`}
                    >
                        {order.status === 'pendiente' ? <><FaFire/> Empezar Orden</> : 
                        <><FaCheck/> ¡Orden Lista!</>}
                    </button>

                    {/* BOTÓN CANCELAR (SIEMPRE VISIBLE) */}
                    <button 
                        onClick={() => updateStatus(order.id, 'cancelado')}
                        className="w-full bg-zinc-700 hover:bg-red-900/50 text-red-400 text-xs font-bold py-2 rounded-lg transition border border-zinc-600 hover:border-red-800 flex items-center justify-center gap-1"
                    >
                        <FaBan /> Cancelar
                    </button>
                </div>

            </div>
            );
        })}
        
        {/* MENSAJE DE VACÍO */}
        {orders.length === 0 && !loading && (
            <div className="col-span-full flex flex-col items-center justify-center py-20 text-gray-500 opacity-60">
                <FaUtensils className="text-6xl mb-4"/>
                <p className="text-xl font-bold">No hay pedidos pendientes</p>
                <p className="text-sm">Todo tranquilo en la cocina.</p>
            </div>
        )}
      </div>
    </div>
  );
}