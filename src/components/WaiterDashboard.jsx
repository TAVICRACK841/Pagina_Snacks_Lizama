import { useState, useEffect, useMemo } from 'react';
import { db, auth } from '../firebase/config';
import { collection, query, where, onSnapshot, doc, updateDoc, orderBy } from 'firebase/firestore';
import { FaConciergeBell, FaUserTie, FaHistory, FaChevronDown, FaChevronUp, FaMoneyBillWave } from 'react-icons/fa';
import { showToast } from '../stores/toastStore';

export default function WaiterDashboard() {
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

  // ACTIVOS: Detecta 'listo' (cocina terminó) o 'servido' (ya en mesa)
  useEffect(() => {
    const q = query(
      collection(db, "orders"),
      where("status", "in", ["listo", "servido"]), 
      where("type", "==", "mesa"),
      orderBy("createdAt", "desc")
    );
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setOrders(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      setLoading(false);
    }, (err) => setLoading(false));
    return () => unsubscribe();
  }, []);

  // HISTORIAL
  useEffect(() => {
    if (!user || activeTab !== 'history') return;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayISO = today.toISOString();

    const q = query(
      collection(db, "orders"),
      where("status", "==", "entregado"), // Estado final
      where("servedBy", "==", user.uid),
      where("createdAt", ">=", todayISO),
      orderBy("createdAt", "desc")
    );
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setHistoryOrders(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });
    return () => unsubscribe();
  }, [user, activeTab]);

  const handleServeOrder = async (order) => {
      if (!user) return;
      try {
          const orderRef = doc(db, "orders", order.id);
          await updateDoc(orderRef, { 
              status: 'entregado', 
              servedBy: user.uid,
              servedByName: user.displayName || user.email 
          });
          showToast(`¡Pedido entregado!`, 'success');
      } catch (error) { showToast("Error", 'error'); }
  };

  const toggleExpand = (id) => setExpandedOrderId(expandedOrderId === id ? null : id);

  const totals = useMemo(() => {
      let totalSold = 0;
      let totalTips = 0;
      let cashOnHand = 0;

      historyOrders.forEach(o => {
          if (o.paymentMethod === 'efectivo') {
              totalSold += o.total;
              totalTips += (o.serviceFee || 0);
              cashOnHand += o.total;
          }
      });

      return { totalSold, totalTips, payToBoss: cashOnHand - totalTips };
  }, [historyOrders]);

  if (loading) return <div className="p-10 text-center text-white animate-pulse">Cargando comandas...</div>;

  return (
    <div className="p-4 min-h-screen pb-20 bg-zinc-900 text-white">
      <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-black text-blue-400 flex items-center gap-2"><FaConciergeBell /> Comandas</h1>
          <div className="bg-zinc-800 p-1 rounded-lg flex border border-zinc-700">
              <button onClick={() => setActiveTab('active')} className={`px-4 py-2 rounded-md text-sm font-bold transition ${activeTab === 'active' ? 'bg-blue-600 text-white' : 'text-gray-400'}`}>Activos</button>
              <button onClick={() => setActiveTab('history')} className={`px-4 py-2 rounded-md text-sm font-bold transition ${activeTab === 'history' ? 'bg-yellow-600 text-white' : 'text-gray-400'}`}>Registro</button>
          </div>
      </div>

      {activeTab === 'active' && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {orders.length === 0 ? (
                <div className="col-span-full flex flex-col items-center justify-center py-20 text-gray-500 opacity-50"><FaConciergeBell size={50} className="mb-4"/><p className="text-xl font-bold">Sin platillos listos</p></div>
            ) : (
                orders.map(order => (
                    <div key={order.id} className="bg-zinc-800 rounded-xl border border-blue-500/30 shadow-lg overflow-hidden flex flex-col animate-fade-in">
                        <div className="bg-blue-600 p-3 text-white font-bold flex justify-between items-center">
                            <span className="text-lg">{order.detail}</span>
                            <span className="text-xs bg-black/20 px-2 py-1 rounded">{new Date(order.createdAt).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}</span>
                        </div>
                        <div className="p-4 flex-1 space-y-2">
                            <p className="text-sm text-gray-400 mb-2 font-bold uppercase">{order.userName}</p>
                            {order.items.map((item, idx) => (
                                <div key={idx} className="flex justify-between border-b border-zinc-700 pb-1 last:border-0 text-sm">
                                    <span>{item.quantity}x {item.name}</span>
                                </div>
                            ))}
                        </div>
                        <div className="p-3 bg-zinc-900 border-t border-zinc-700">
                            <button onClick={() => handleServeOrder(order)} className="w-full bg-green-600 hover:bg-green-500 text-white font-bold py-3 rounded-lg transition shadow-lg active:scale-95 flex items-center justify-center gap-2"><FaUserTie /> ¡Yo lo serví!</button>
                        </div>
                    </div>
                ))
            )}
          </div>
      )}

      {activeTab === 'history' && (
          <div className="max-w-2xl mx-auto space-y-6 animate-fade-in">
              <div className="bg-gradient-to-br from-zinc-800 to-zinc-900 p-6 rounded-2xl border border-yellow-500/30 shadow-lg">
                  <h2 className="text-xl font-bold text-white mb-4 border-b border-zinc-700 pb-2">📊 Corte de Hoy</h2>
                  <div className="space-y-3">
                      <div className="flex justify-between text-gray-400 text-sm"><span>Ventas (Efectivo):</span><span>${totals.totalSold}</span></div>
                      <div className="flex justify-between text-gray-400 text-sm"><span>Propinas:</span><span>-${totals.totalTips}</span></div>
                      <div className="border-t border-dashed border-zinc-600 my-2 pt-2 flex justify-between items-center"><span className="text-lg font-bold text-white">💰 Entregar al Jefe:</span><span className="text-2xl font-black text-green-400">${totals.payToBoss}</span></div>
                  </div>
              </div>
              <div className="space-y-2">
                  {historyOrders.map(order => (
                      <div key={order.id} className="bg-zinc-800 rounded-lg border border-zinc-700 overflow-hidden">
                          <button onClick={() => toggleExpand(order.id)} className="w-full flex justify-between items-center p-4 hover:bg-zinc-700/50 transition">
                              <div className="text-left"><p className="font-bold text-white text-sm">{order.detail}</p><p className="text-xs text-gray-400">{new Date(order.createdAt).toLocaleTimeString()}</p></div>
                              <div>{expandedOrderId === order.id ? <FaChevronUp/> : <FaChevronDown/>}</div>
                          </button>
                          {expandedOrderId === order.id && (
                              <div className="bg-black/20 p-4 border-t border-zinc-700 text-sm text-gray-300">
                                  {order.items.map((item, i) => <div key={i} className="flex justify-between"><span>{item.quantity}x {item.name}</span><span>${item.price}</span></div>)}
                              </div>
                          )}
                      </div>
                  ))}
                  {historyOrders.length === 0 && <p className="text-center text-gray-500">Sin historial hoy.</p>}
              </div>
          </div>
      )}
    </div>
  );
}