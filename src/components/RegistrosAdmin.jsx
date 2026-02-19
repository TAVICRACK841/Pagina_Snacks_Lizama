import { useState, useEffect } from 'react';
import { db } from '../firebase/config';
import { collection, query, onSnapshot, doc, deleteDoc, getDocs, orderBy } from 'firebase/firestore';
import { FaTrash, FaChevronDown, FaChevronUp, FaMotorcycle, FaConciergeBell, FaGlassWhiskey, FaCalendarDay, FaUserTie, FaMapMarkerAlt, FaUsersCog } from 'react-icons/fa';
import { showToast } from '../stores/toastStore';

// Helper para detectar qué es un frappe
const isFrappeItem = (item) => {
    if (!item) return false;
    const name = (item.name || '').toLowerCase();
    const cat = (item.category || '').toLowerCase();
    const keywords = ['frappe', 'malteada', 'chamoyada', 'smoothie', 'esquimo'];
    return keywords.some(k => name.includes(k)) || cat.includes('frappe');
};

export default function RegistrosAdmin() {
  const [orders, setOrders] = useState([]);
  const [users, setUsers] = useState([]);
  const [selectedRole, setSelectedRole] = useState('todos'); 
  const [expandedOrderId, setExpandedOrderId] = useState(null);
  const [loading, setLoading] = useState(true);

  const ROLES_FILTERS = [
      { id: 'todos', label: 'Todos', icon: <FaUsersCog/> },
      { id: 'frappero', label: 'Frappe', icon: <FaGlassWhiskey/> },
      { id: 'mesero', label: 'Mesero', icon: <FaConciergeBell/> },
      { id: 'mesero 1', label: 'Mesero 1', icon: <FaConciergeBell/> },
      { id: 'mesero 2', label: 'Mesero 2', icon: <FaConciergeBell/> },
      { id: 'repartidor', label: 'Repartidor', icon: <FaMotorcycle/> },
      { id: 'repartidor 1', label: 'Repartidor 1', icon: <FaMotorcycle/> },
      { id: 'repartidor 2', label: 'Repartidor 2', icon: <FaMotorcycle/> }
  ];

  useEffect(() => {
    const fetchUsers = async () => {
        const snap = await getDocs(collection(db, "users"));
        setUsers(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    };
    fetchUsers();

    const q = query(
      collection(db, "orders"),
      orderBy("createdAt", "desc")
    );
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const list = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      const historyOrders = list.filter(o => ['entregado', 'completado', 'servido', 'cancelado'].includes(o.status));
      setOrders(historyOrders);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const getFilteredOrders = () => {
      if (selectedRole === 'todos') return orders;

      const targetUserIds = users.filter(u => {
          const userRoles = u.roles || (u.role ? [u.role] : []);
          return userRoles.includes(selectedRole);
      }).map(u => u.id);

      const adminUserIds = users.filter(u => {
          const userRoles = u.roles || (u.role ? [u.role] : []);
          return userRoles.includes('admin');
      }).map(u => u.id);

      return orders.filter(o => {
          if (selectedRole.includes('frappe')) {
              const hasFrappes = o.items && o.items.some(isFrappeItem);
              return (targetUserIds.includes(o.preparedBy) || adminUserIds.includes(o.preparedBy)) && hasFrappes;
          }
          if (selectedRole.includes('mesero')) {
              return targetUserIds.includes(o.servedBy) || (adminUserIds.includes(o.servedBy) && o.type === 'mesa');
          }
          if (selectedRole.includes('repartidor')) {
              return targetUserIds.includes(o.deliveredBy) || (adminUserIds.includes(o.deliveredBy) && o.type === 'domicilio');
          }
          return false;
      });
  };

  const filteredOrders = getFilteredOrders();

  const groupedData = filteredOrders.reduce((acc, order) => { 
      const date = new Date(order.createdAt?.toDate ? order.createdAt.toDate() : order.createdAt).toLocaleDateString(); 
      if (!acc[date]) acc[date] = []; 
      acc[date].push(order); 
      return acc; 
  }, {});

  const sortedDates = Object.keys(groupedData).sort((a, b) => { 
      const [dA, mA, yA] = a.split('/'); const [dB, mB, yB] = b.split('/'); 
      return new Date(yB, mB - 1, dB) - new Date(yA, mA - 1, dA); 
  });

  const deleteSpecificOrder = async (e, orderId) => {
      e.stopPropagation();
      if(!confirm("⚠️ ¿Estás seguro de eliminar este registro permanentemente de la base de datos?")) return;
      try {
          await deleteDoc(doc(db, "orders", orderId));
          showToast("Registro eliminado con éxito", "success");
      } catch (err) { showToast("Error al eliminar", "error"); }
  };

  const toggleExpand = (id) => setExpandedOrderId(expandedOrderId === id ? null : id);

  if (loading) return <div className="p-10 text-center text-yellow-500 font-bold animate-pulse">Cargando registros...</div>;

  return (
    <div className="p-4 min-h-screen pb-20 bg-zinc-900 text-white max-w-5xl mx-auto">
      
      <div className="flex justify-between items-center mb-6 bg-black p-4 rounded-xl border border-yellow-500/30 shadow-lg">
          <h1 className="text-2xl font-black text-yellow-500 flex items-center gap-3">
              <FaUserTie className="text-3xl" /> Registros de Empleados
          </h1>
      </div>

      <div className="flex flex-wrap gap-3 mb-8 bg-zinc-800 p-4 rounded-xl border border-zinc-700">
          {ROLES_FILTERS.map(role => (
              <button 
                  key={role.id}
                  onClick={() => setSelectedRole(role.id)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg font-bold text-sm transition-all shadow-md
                      ${selectedRole === role.id 
                          ? 'bg-yellow-500 text-black shadow-[0_0_10px_rgba(234,179,8,0.4)]' 
                          : 'bg-zinc-900 text-gray-400 hover:text-yellow-400 border border-zinc-700 hover:border-yellow-500/50'
                      }`}
              >
                  {role.icon} <span className="capitalize">{role.label}</span>
              </button>
          ))}
      </div>

      {sortedDates.length === 0 ? (
          <div className="text-center py-20 text-gray-500 opacity-50 flex flex-col items-center">
              <FaCalendarDay size={60} className="mb-4 text-yellow-500/20"/>
              <p className="text-xl font-bold">No hay registros para este perfil.</p>
          </div>
      ) : (
          <div className="space-y-8">
              {sortedDates.map(date => {
                  const dayOrders = groupedData[date];
                  
                  // LÓGICA DE SUMA: Si es "frappe", suma solo los frappes. Si no, suma toda la orden.
                  const dayNetTotal = dayOrders
                      .filter(o => o.status !== 'cancelado')
                      .reduce((sum, o) => {
                          if (selectedRole.includes('frappe')) {
                              const frappes = o.items.filter(isFrappeItem);
                              return sum + frappes.reduce((acc, item) => acc + (item.price * item.quantity), 0);
                          }
                          return sum + (o.total - (o.serviceFee || 0));
                      }, 0);

                  return (
                      <div key={date} className="bg-zinc-800 rounded-xl border border-zinc-700 overflow-hidden shadow-lg">
                          
                          <div className="bg-zinc-950 p-4 border-b border-yellow-900/50 flex justify-between items-center">
                              <h2 className="text-xl font-black text-white flex items-center gap-2">
                                  <FaCalendarDay className="text-yellow-500"/> {date}
                              </h2>
                              <div className="text-right">
                                  <p className="text-[10px] text-gray-400 uppercase tracking-widest">
                                      {selectedRole.includes('frappe') ? 'Total Frappes del Día' : 'Neto del Día (Sin propinas)'}
                                  </p>
                                  <p className="text-2xl font-black text-green-500">${dayNetTotal}</p>
                              </div>
                          </div>

                          <div className="p-4 space-y-3">
                              {dayOrders.map(order => {
                                  const isCanceled = order.status === 'cancelado';
                                  
                                  // LÓGICA DE FILTRADO PARA LA TARJETA
                                  let visibleItems = order.items || [];
                                  let netPrice = order.total - (order.serviceFee || 0);

                                  if (selectedRole.includes('frappe')) {
                                      visibleItems = order.items.filter(isFrappeItem);
                                      netPrice = visibleItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);
                                  }

                                  // Evitar renderizar si en la vista de frappes no hay frappes (seguridad extra)
                                  if (selectedRole.includes('frappe') && visibleItems.length === 0) return null;

                                  return (
                                      <div key={order.id} className={`bg-black rounded-lg border-l-4 overflow-hidden transition-all ${isCanceled ? 'border-red-600' : 'border-yellow-500'}`}>
                                          <button onClick={() => toggleExpand(order.id)} className="w-full flex justify-between items-center p-4 hover:bg-zinc-900 transition text-left">
                                              <div className="flex-1 pr-4">
                                                  <div className="flex items-center gap-2 mb-1">
                                                      <span className={`font-black text-lg ${isCanceled ? 'text-red-400 line-through' : 'text-white'}`}>
                                                          {order.userName || 'Cliente'}
                                                      </span>
                                                      <span className={`text-[9px] px-2 py-0.5 rounded uppercase font-bold tracking-widest ${isCanceled ? 'bg-red-900/50 text-red-400' : 'bg-zinc-800 text-yellow-500'}`}>
                                                          {order.status}
                                                      </span>
                                                  </div>
                                                  <p className="text-sm text-gray-400 flex items-center gap-2 truncate">
                                                      {order.type === 'domicilio' ? <FaMapMarkerAlt className="text-red-400 flex-shrink-0"/> : <FaConciergeBell className="text-blue-400 flex-shrink-0"/>}
                                                      <span className="truncate">{order.detail}</span> • {new Date(order.createdAt?.toDate ? order.createdAt.toDate() : order.createdAt).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}
                                                  </p>
                                              </div>
                                              
                                              <div className="flex items-center gap-4">
                                                  <span className={`font-mono font-bold text-xl ${isCanceled ? 'text-red-600' : 'text-green-500'}`}>
                                                      ${netPrice}
                                                  </span>
                                                  <div onClick={(e) => deleteSpecificOrder(e, order.id)} className="text-zinc-600 hover:text-red-500 bg-zinc-900 hover:bg-red-900/20 p-2 rounded-lg transition-colors" title="Eliminar registro">
                                                      <FaTrash size={16}/>
                                                  </div>
                                                  <div className="text-yellow-500 ml-2">
                                                      {expandedOrderId === order.id ? <FaChevronUp/> : <FaChevronDown/>}
                                                  </div>
                                              </div>
                                          </button>
                                          
                                          {expandedOrderId === order.id && (
                                              <div className="bg-[#0a0a0a] p-4 border-t border-zinc-800">
                                                  <div className="mb-3 pb-2 border-b border-zinc-800 flex flex-wrap gap-4 text-[10px] text-gray-500 uppercase tracking-widest">
                                                      <span>Mesero: <strong className="text-yellow-400">{order.servedByName || 'N/A'}</strong></span>
                                                      <span>Frappe/Cocina: <strong className="text-yellow-400">{order.preparedByName || 'N/A'}</strong></span>
                                                      <span>Repartidor: <strong className="text-yellow-400">{order.deliveredByName || 'N/A'}</strong></span>
                                                  </div>
                                                  <div className="space-y-1">
                                                      {/* Mapeamos SOLO los visibleItems (Si es Frappe, solo muestra Frappes) */}
                                                      {visibleItems.map((item, i) => (
                                                          <div key={i} className="flex justify-between text-sm text-gray-300 py-1">
                                                              <span>
                                                                  <span className="text-yellow-500 font-bold mr-2">{item.quantity}x</span> 
                                                                  {item.name} 
                                                                  {item.customizationDescription && <span className="text-[10px] text-gray-500 italic block ml-5">{item.customizationDescription}</span>}
                                                              </span>
                                                              <span className="text-gray-500">${item.price * item.quantity}</span>
                                                          </div>
                                                      ))}
                                                  </div>
                                                  
                                                  {/* Ocultamos la propina en la vista de Frappes para que no confunda el cálculo matemático */}
                                                  {!selectedRole.includes('frappe') && order.serviceFee > 0 && (
                                                      <div className="flex justify-between text-yellow-600 text-xs mt-3 pt-2 border-t border-zinc-800 font-bold">
                                                          <span>Propina registrada (No incluida en el total mostrado):</span>
                                                          <span>${order.serviceFee}</span>
                                                      </div>
                                                  )}
                                              </div>
                                          )}
                                      </div>
                                  );
                              })}
                          </div>
                      </div>
                  );
              })}
          </div>
      )}
    </div>
  );
}