import { useState, useEffect, useMemo } from 'react';
import { db, auth } from '../firebase/config';
import { collection, query, where, onSnapshot, doc, updateDoc, orderBy } from 'firebase/firestore';
import { FaMotorcycle, FaCheck, FaMapMarkerAlt, FaWhatsapp, FaHistory, FaChevronDown, FaChevronUp, FaMoneyBillWave } from 'react-icons/fa';
import { showToast } from '../stores/toastStore';

export default function DeliveryDashboard() {
  const [activeTab, setActiveTab] = useState('active');
  const [orders, setOrders] = useState([]);
  const [historyOrders, setHistoryOrders] = useState([]);
  const [user, setUser] = useState(null);
  const [expandedOrderId, setExpandedOrderId] = useState(null);

  useEffect(() => {
    const unsubAuth = auth.onAuthStateChanged((u) => setUser(u));
    return () => unsubAuth();
  }, []);

  // 1. ACTIVOS
  useEffect(() => {
    const q = query(
      collection(db, "orders"),
      where("status", "in", ["listo", "en_camino"]),
      where("type", "==", "domicilio"),
      orderBy("createdAt", "asc")
    );
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setOrders(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });
    return () => unsubscribe();
  }, []);

  // 2. HISTORIAL DE HOY
  useEffect(() => {
    if (!user || activeTab !== 'history') return;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayISO = today.toISOString();

    const q = query(
      collection(db, "orders"),
      where("status", "==", "entregado"),
      where("deliveredBy", "==", user.uid),
      where("createdAt", ">=", todayISO),
      orderBy("createdAt", "desc")
    );
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setHistoryOrders(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });
    return () => unsubscribe();
  }, [user, activeTab]);

  const takeOrder = async (orderId) => {
      if (!user) return;
      try {
          await updateDoc(doc(db, "orders", orderId), { 
              status: 'en_camino', deliveredBy: user.uid, deliveredByName: user.displayName || user.email 
          });
          showToast("¡Pedido asignado!", 'success');
      } catch (error) { showToast("Error", 'error'); }
  };

  const completeOrder = async (orderId) => {
      try { await updateDoc(doc(db, "orders", orderId), { status: 'entregado' }); showToast("¡Entregado!", 'success'); } 
      catch (error) { showToast("Error", 'error'); }
  };

  const toggleExpand = (id) => setExpandedOrderId(expandedOrderId === id ? null : id);

  const totals = useMemo(() => {
      let totalSold = 0;
      let totalShipping = 0;
      let cashOnHand = 0;

      historyOrders.forEach(o => {
          if (o.paymentMethod === 'efectivo') {
              totalSold += o.total;
              totalShipping += (o.serviceFee || 0); // serviceFee es el envío en Domicilio
              cashOnHand += o.total;
          }
      });

      return {
          totalSold,
          totalShipping,
          payToBoss: cashOnHand - totalShipping // Le quita el envío
      };
  }, [historyOrders]);

  return (
    <div className="p-4 min-h-screen pb-20 bg-zinc-900 text-white">
      
      <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-black text-green-400 flex items-center gap-2">
            {activeTab === 'active' ? <><FaMotorcycle /> Repartos</> : <><FaHistory /> Mi Registro</>}
          </h1>
          <div className="bg-zinc-800 p-1 rounded-lg flex border border-zinc-700">
              <button onClick={() => setActiveTab('active')} className={`px-4 py-2 rounded-md text-sm font-bold transition ${activeTab === 'active' ? 'bg-green-600 text-white shadow' : 'text-gray-400 hover:text-white'}`}>Activos</button>
              <button onClick={() => setActiveTab('history')} className={`px-4 py-2 rounded-md text-sm font-bold transition ${activeTab === 'history' ? 'bg-yellow-600 text-white shadow' : 'text-gray-400 hover:text-white'}`}>Registro</button>
          </div>
      </div>

      {activeTab === 'active' && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {orders.map(order => {
                const isTakenByMe = order.deliveredBy === user?.uid;
                const isTakenByOther = order.status === 'en_camino' && !isTakenByMe;
                if (isTakenByOther) return null;

                return (
                    <div key={order.id} className={`rounded-xl border-2 shadow-lg overflow-hidden flex flex-col ${isTakenByMe ? 'bg-green-900/20 border-green-500' : 'bg-zinc-800 border-zinc-700'}`}>
                        <div className={`p-3 font-bold flex justify-between items-center ${isTakenByMe ? 'bg-green-700 text-white' : 'bg-zinc-700 text-gray-300'}`}>
                            <span>{isTakenByMe ? '🛵 En Curso' : '📦 Disponible'}</span>
                            <span className="text-xs bg-black/20 px-2 py-1 rounded">{new Date(order.createdAt).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}</span>
                        </div>
                        <div className="p-4 flex-1 space-y-3">
                            <div>
                                <p className="font-bold text-white text-lg flex items-center gap-2">
                                    {order.userName}
                                    {order.userPhone && <a href={`https://wa.me/521${order.userPhone.replace(/\D/g,'')}`} target="_blank" className="text-green-400 bg-green-900/30 p-1 rounded-full text-xs"><FaWhatsapp /></a>}
                                </p>
                                <p className="text-sm text-gray-400 mt-1 flex items-start gap-2 bg-black/30 p-2 rounded"><FaMapMarkerAlt className="text-red-400 mt-1 flex-shrink-0"/> {order.detail}</p>
                            </div>
                            <div className="bg-zinc-900/50 p-2 rounded text-sm text-gray-300 max-h-32 overflow-y-auto">
                                {order.items.map((item, i) => (
                                    <div key={i} className="flex justify-between border-b border-zinc-700/50 pb-1 mb-1 last:border-0"><span>{item.quantity}x {item.name}</span></div>
                                ))}
                            </div>
                            <div className="flex justify-between items-center text-sm font-bold border-t border-zinc-700 pt-2"><span>Total a cobrar:</span><span className="text-green-400 text-lg">${order.total}</span></div>
                            <p className="text-xs text-gray-500">Método: {order.paymentMethod}</p>
                        </div>
                        <div className="p-3 bg-zinc-900 border-t border-zinc-700">
                            {isTakenByMe ? (
                                <button onClick={() => completeOrder(order.id)} className="w-full bg-green-500 hover:bg-green-400 text-white font-bold py-3 rounded-lg transition shadow-lg animate-pulse">✅ Entregado</button>
                            ) : (
                                <button onClick={() => takeOrder(order.id)} className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-3 rounded-lg transition shadow-lg">🛵 Tomar Pedido</button>
                            )}
                        </div>
                    </div>
                );
            })}
            {orders.length === 0 && (
                <div className="col-span-full flex flex-col items-center justify-center py-20 text-gray-500 opacity-50"><FaMotorcycle size={50} className="mb-4"/><p className="text-xl font-bold">No hay repartos pendientes</p></div>
            )}
          </div>
      )}

      {activeTab === 'history' && (
          <div className="max-w-2xl mx-auto space-y-6">
              <div className="bg-gradient-to-br from-zinc-800 to-zinc-900 p-6 rounded-2xl border border-green-500/30 shadow-[0_0_15px_rgba(34,197,94,0.1)]">
                  <h2 className="text-xl font-bold text-white mb-4 border-b border-zinc-700 pb-2">📊 Corte de Hoy: <span className="text-green-400">{user?.displayName}</span></h2>
                  <div className="space-y-3">
                      <div className="flex justify-between text-gray-400 text-sm"><span>Cobrado (Efectivo):</span><span>${totals.totalSold}</span></div>
                      <div className="flex justify-between text-gray-400 text-sm"><span>Mis Envíos:</span><span>-${totals.totalShipping}</span></div>
                      <div className="border-t border-dashed border-zinc-600 my-2 pt-2 flex justify-between items-center"><span className="text-lg font-bold text-white">💰 Entregar al Jefe:</span><span className="text-2xl font-black text-yellow-400">${totals.payToBoss}</span></div>
                      <p className="text-[10px] text-gray-500 text-center mt-2">* Solo calcula pedidos cobrados en efectivo.</p>
                  </div>
              </div>

              <div className="space-y-2">
                  <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-2">Historial de Entregas ({historyOrders.length})</h3>
                  {historyOrders.map(order => (
                      <div key={order.id} className="bg-zinc-800 rounded-lg border border-zinc-700 overflow-hidden">
                          <button onClick={() => toggleExpand(order.id)} className="w-full flex justify-between items-center p-4 hover:bg-zinc-700/50 transition">
                              <div className="flex items-center gap-3 text-left">
                                  <div className={`p-2 rounded-full ${order.paymentMethod === 'efectivo' ? 'bg-green-900/50 text-green-400' : 'bg-blue-900/50 text-blue-400'}`}><FaMoneyBillWave size={14} /></div>
                                  <div><p className="font-bold text-white text-sm">{order.detail}</p><p className="text-xs text-gray-400">{new Date(order.createdAt).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})} • {order.paymentMethod}</p></div>
                              </div>
                              <div className="text-right flex items-center gap-3"><span className="font-bold text-green-500">${order.total}</span>{expandedOrderId === order.id ? <FaChevronUp className="text-gray-500"/> : <FaChevronDown className="text-gray-500"/>}</div>
                          </button>
                          {expandedOrderId === order.id && (
                              <div className="bg-black/20 p-4 border-t border-zinc-700 text-sm text-gray-300 animate-fade-in">
                                  <p className="text-xs font-bold text-gray-500 mb-2 uppercase">Cliente: {order.userName}</p>
                                  <ul className="space-y-2 mb-3">{order.items.map((item, i) => (<li key={i} className="flex justify-between border-b border-white/5 pb-1"><span>{item.quantity}x {item.name}</span><span>${item.price * item.quantity}</span></li>))}</ul>
                                  <div className="flex justify-between text-xs pt-1"><span>Subtotal:</span> <span>${order.subtotal}</span></div>
                                  <div className="flex justify-between text-xs text-green-500"><span>Envío:</span> <span>${order.serviceFee}</span></div>
                                  <div className="flex justify-between font-bold text-white border-t border-white/10 mt-1 pt-1"><span>Total:</span> <span>${order.total}</span></div>
                              </div>
                          )}
                      </div>
                  ))}
                  {historyOrders.length === 0 && <p className="text-center text-gray-600 py-4">Aún no has entregado pedidos hoy.</p>}
              </div>
          </div>
      )}
    </div>
  );
}