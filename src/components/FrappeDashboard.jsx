import { useState, useEffect, useMemo } from 'react';
import { db, auth } from '../firebase/config';
import { collection, query, where, onSnapshot, doc, updateDoc, orderBy } from 'firebase/firestore';
import { FaCheck, FaClock, FaGlassWhiskey, FaBan, FaChevronDown, FaChevronUp } from 'react-icons/fa';
import { showToast } from '../stores/toastStore';

export default function FrappeDashboard() {
  const [activeTab, setActiveTab] = useState('active'); 
  const [orders, setOrders] = useState([]);
  const [historyOrders, setHistoryOrders] = useState([]);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true); 
  const [expandedOrderId, setExpandedOrderId] = useState(null);

  useEffect(() => {
    const unsubAuth = auth.onAuthStateChanged((u) => setUser(u));
    return () => unsubAuth();
  }, []);

  // --- FILTRO DE BEBIDAS CORREGIDO Y EXPANDIDO ---
  const isDrinkItem = (item) => {
      const name = item.name.toLowerCase();
      const keywords = [
          'frappe', 'jugo', 'agua', 'soda', 'refresco', 'litro', 'malteada', 
          'horchata', 'jamaica', 'limonada', 'tamarindo', 'cebada', 'té', 'café', 
          'embotellado', 'coca', 'pepsi', 'sprite', 'fanta', 'sidral', 'bebida', 'manzana'
      ];
      return keywords.some(k => name.includes(k));
  };

  // --- 1. PEDIDOS ACTIVOS ---
  useEffect(() => {
    const q = query(
      collection(db, "orders"),
      where("status", "in", ["pendiente", "preparando"]),
      orderBy("createdAt", "asc")
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const ordersData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      const drinkOrders = ordersData.filter(order => order.items.some(isDrinkItem));
      setOrders(drinkOrders);
      setLoading(false);
    }, (error) => setLoading(false));
    return () => unsubscribe();
  }, []);

  // --- 2. HISTORIAL DE HOY ---
  useEffect(() => {
    if (!user || activeTab !== 'history') return;
    
    // Calculamos el inicio del día para filtrar
    const startOfDay = new Date();
    startOfDay.setHours(0,0,0,0);
    const startIso = startOfDay.toISOString();

    const q = query(
      collection(db, "orders"),
      // Muestra órdenes donde este usuario participó (preparedBy) o si es Admin, todas las listas hoy.
      where("status", "in", ["listo", "entregado", "servido"]), 
      where("createdAt", ">=", startIso),
      orderBy("createdAt", "desc")
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const list = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      // Filtramos en cliente para asegurar que sean bebidas Y preparadas por él (opcional)
      const myHistory = list.filter(o => o.preparedBy === user.uid || user.email.includes('admin')); 
      setHistoryOrders(myHistory);
    });
    return () => unsubscribe();
  }, [user, activeTab]);

  const updateStatus = async (orderId, newStatus) => {
    if (newStatus === 'cancelado' && !confirm("¿Cancelar este pedido?")) return;
    if(!user) return;

    try {
      const orderRef = doc(db, "orders", orderId);
      await updateDoc(orderRef, { 
          status: newStatus,
          preparedBy: user.uid,
          preparedByName: user.displayName || 'Frappero'
      });
      
      if(newStatus === 'listo') showToast(`¡Bebidas Listas!`, 'success');
      else if(newStatus === 'cancelado') showToast(`Cancelado`, 'error');
      else showToast(`En preparación`, 'success');

    } catch (error) { showToast("Error al actualizar", 'error'); }
  };

  const toggleExpand = (id) => setExpandedOrderId(expandedOrderId === id ? null : id);

  const totals = useMemo(() => {
      let count = 0;
      let totalValue = 0;
      historyOrders.forEach(order => {
          order.items.forEach(item => {
              if (isDrinkItem(item)) {
                  count += item.quantity;
                  totalValue += (item.price * item.quantity);
              }
          });
      });
      return { count, totalValue };
  }, [historyOrders]);

  if (loading) return <div className="p-10 text-center text-white animate-pulse">Cargando bebidas...</div>;

  return (
    <div className="p-4 md:p-6 min-h-screen pb-20 bg-zinc-900 text-white">
      
      <div className="flex justify-between items-center mb-6 bg-zinc-800 p-3 rounded-xl border border-pink-500/20">
          <h1 className="text-2xl font-black text-pink-400 flex items-center gap-2"><FaGlassWhiskey /> Frappes</h1>
          <div className="bg-zinc-900 p-1 rounded-lg flex border border-zinc-700">
              <button onClick={() => setActiveTab('active')} className={`px-4 py-2 rounded-md text-xs font-bold transition ${activeTab === 'active' ? 'bg-pink-600 text-white shadow' : 'text-gray-400 hover:text-white'}`}>Pendientes</button>
              <button onClick={() => setActiveTab('history')} className={`px-4 py-2 rounded-md text-xs font-bold transition ${activeTab === 'history' ? 'bg-zinc-600 text-white shadow' : 'text-gray-400 hover:text-white'}`}>Registro</button>
          </div>
      </div>

      {activeTab === 'active' && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {orders.length === 0 ? (
                <div className="col-span-full flex flex-col items-center justify-center py-20 text-gray-500 opacity-50"><FaGlassWhiskey size={60} className="mb-4 text-pink-500/30"/><p className="text-xl font-bold">No hay bebidas pendientes</p></div>
            ) : (
                orders.map(order => {
                    const myItems = order.items.filter(isDrinkItem);
                    if (myItems.length === 0) return null;

                    return (
                        <div key={order.id} className={`rounded-xl border-2 shadow-xl overflow-hidden flex flex-col ${order.status === 'pendiente' ? 'bg-zinc-800 border-pink-500/50' : 'bg-pink-900/20 border-pink-500'}`}>
                            <div className={`p-3 text-white font-bold flex justify-between items-center ${order.status === 'pendiente' ? 'bg-pink-600' : 'bg-green-600'}`}>
                                <span className="text-sm">#{order.id.slice(-4)}</span>
                                <span className="text-xs bg-black/20 px-2 py-1 rounded flex items-center gap-1"><FaClock /> {new Date(order.createdAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                            </div>
                            <div className="p-3 bg-zinc-900/50 border-b border-zinc-700">
                                <p className="font-bold text-pink-200 text-lg">{order.detail}</p>
                                <p className="text-xs text-gray-400 uppercase">{order.userName}</p>
                            </div>
                            <div className="p-4 flex-1 space-y-3">
                                {myItems.map((item, index) => (
                                    <div key={index} className="flex justify-between items-start border-b border-zinc-700/50 pb-2 last:border-0">
                                        <div>
                                            <div className="flex items-center gap-2">
                                                <span className="font-black text-white bg-pink-600 w-6 h-6 flex items-center justify-center rounded-full text-xs">x{item.quantity}</span>
                                                <span className="font-bold text-white text-md">{item.name}</span>
                                            </div>
                                            {(item.customizationDescription) && <p className="text-xs text-pink-300 mt-1 pl-8 italic">{item.customizationDescription}</p>}
                                        </div>
                                    </div>
                                ))}
                            </div>
                            <div className="p-3 bg-zinc-900 border-t border-zinc-700 flex flex-col gap-2">
                                {order.status === 'pendiente' ? (
                                    <button onClick={() => updateStatus(order.id, 'preparando')} className="w-full bg-yellow-600 hover:bg-yellow-500 text-white font-bold py-3 rounded-lg transition">👨‍🍳 Preparar</button>
                                ) : (
                                    <button onClick={() => updateStatus(order.id, 'listo')} className="w-full bg-green-600 hover:bg-green-500 text-white font-bold py-3 rounded-lg transition flex items-center justify-center gap-2 animate-pulse"><FaCheck /> ¡Listo!</button>
                                )}
                                <button onClick={() => updateStatus(order.id, 'cancelado')} className="w-full bg-zinc-800 hover:bg-red-900/50 text-red-400 text-xs font-bold py-2 rounded-lg transition border border-zinc-700 hover:border-red-800"><FaBan className="inline mr-1"/> Cancelar</button>
                            </div>
                        </div>
                    );
                })
            )}
          </div>
      )}

      {activeTab === 'history' && (
          <div className="max-w-2xl mx-auto space-y-6 animate-fade-in">
              <div className="bg-zinc-800 p-6 rounded-2xl border border-pink-500/30 shadow-lg">
                  <h2 className="text-xl font-bold text-white mb-4">📊 Producción de Hoy</h2>
                  <div className="grid grid-cols-2 gap-4 text-center">
                      <div className="bg-zinc-700 p-3 rounded-xl"><p className="text-gray-400 text-xs uppercase">Bebidas</p><p className="text-3xl font-black text-pink-400">{totals.count}</p></div>
                      <div className="bg-zinc-700 p-3 rounded-xl"><p className="text-gray-400 text-xs uppercase">Valor</p><p className="text-3xl font-black text-green-400">${totals.totalValue}</p></div>
                  </div>
              </div>
              <div className="space-y-2">
                  {historyOrders.map(order => (
                      <div key={order.id} className="bg-zinc-800 rounded-lg border border-zinc-700 overflow-hidden">
                          <button onClick={() => toggleExpand(order.id)} className="w-full flex justify-between items-center p-4 hover:bg-zinc-700/50 transition">
                              <div className="text-left"><p className="font-bold text-white text-sm">{order.detail}</p><p className="text-xs text-gray-400">{new Date(order.createdAt).toLocaleTimeString()}</p></div>
                              <div className="flex items-center gap-3"><span className="text-xs bg-green-900 text-green-300 px-2 py-1 rounded">Terminado</span>{expandedOrderId === order.id ? <FaChevronUp/> : <FaChevronDown/>}</div>
                          </button>
                          {expandedOrderId === order.id && (
                              <div className="bg-black/20 p-4 border-t border-zinc-700 text-sm text-gray-300">
                                  <ul className="space-y-1">{order.items.filter(isDrinkItem).map((item, i) => (<li key={i} className="flex justify-between"><span>{item.quantity}x {item.name}</span> <span>${item.price * item.quantity}</span></li>))}</ul>
                              </div>
                          )}
                      </div>
                  ))}
                  {historyOrders.length === 0 && <p className="text-center text-gray-500 py-4">No has preparado bebidas hoy.</p>}
              </div>
          </div>
      )}
    </div>
  );
}