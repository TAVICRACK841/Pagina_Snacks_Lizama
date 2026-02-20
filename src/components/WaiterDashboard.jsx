import { useState, useEffect } from 'react';
import { db, auth } from '../firebase/config';
import { collection, query, where, onSnapshot, doc, updateDoc, getDocs } from 'firebase/firestore';
import { FaConciergeBell, FaUserTie, FaCheckSquare, FaRegSquare, FaLock, FaFire, FaGlassWhiskey, FaPlus, FaTimes, FaCogs, FaPepperHot, FaHamburger } from 'react-icons/fa';
import { showToast } from '../stores/toastStore';
import { onAuthStateChanged } from 'firebase/auth';

export default function WaiterDashboard() {
  const [orders, setOrders] = useState([]);
  const [products, setProducts] = useState([]);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Estados para el Modal Avanzado de Añadir Extras
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [activeOrder, setActiveOrder] = useState(null);
  
  // Pestañas del Modal: 'salsas' o 'comida'
  const [modalTab, setModalTab] = useState('salsas');
  
  // Estado para Salsas Rápidas
  const [selectedQuickSauce, setSelectedQuickSauce] = useState('');

  // Estado para Comida Normal
  const [selectedCategory, setSelectedCategory] = useState(''); 
  const [selectedProductId, setSelectedProductId] = useState('');
  const [selectedProductObj, setSelectedProductObj] = useState(null);
  
  // Compartidos
  const [extraQuantity, setExtraQuantity] = useState(1);
  const [extraNote, setExtraNote] = useState('');

  // Estados de Personalización
  const [custFlavor, setCustFlavor] = useState('');
  const [custIce, setCustIce] = useState('Normal');
  const [custTapioca, setCustTapioca] = useState(false);
  const [custMeat, setCustMeat] = useState('Res');
  const [custExtraSauce, setCustExtraSauce] = useState('');
  const [custExtraPieceCount, setCustExtraPieceCount] = useState(0);

  useEffect(() => {
    const unsubAuth = onAuthStateChanged(auth, (u) => setUser(u));
    return () => unsubAuth();
  }, []);

  // Cargar mesas activas
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

  // Cargar catálogo de productos
  useEffect(() => {
      const fetchProducts = async () => {
          const snap = await getDocs(collection(db, "products"));
          const prods = snap.docs.map(d => ({ id: d.id, ...d.data() }));
          prods.sort((a, b) => a.name.localeCompare(b.name));
          setProducts(prods);
      };
      fetchProducts();
  }, []);

  // Extraer categorías únicas
  const categories = [...new Set(products.map(p => p.category).filter(Boolean))];

  // Actualizar el objeto de producto seleccionado (Comida)
  useEffect(() => {
      if (selectedProductId) {
          const prod = products.find(p => p.id === selectedProductId);
          setSelectedProductObj(prod);
          setCustFlavor(prod?.sauceOptions?.[0] || '');
          setCustIce('Normal');
          setCustTapioca(false);
          setCustMeat('Res');
          setCustExtraSauce('');
          setCustExtraPieceCount(0);
      } else {
          setSelectedProductObj(null);
      }
  }, [selectedProductId, products]);

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
          const allNowDelivered = updatedItems.every(i => i.delivered);
          if (allNowDelivered) {
              newStatus = 'servido';
          } else if (order.status === 'servido') {
              newStatus = updatedItems.some(i => !i.completed && !isItemReady(i)) ? 'preparando' : 'listo';
          }

          await updateDoc(doc(db, "orders", order.id), { 
              items: updatedItems, 
              status: newStatus,
              servedBy: user.uid,
              servedByName: user.displayName || 'Mesero'
          });
      } catch (error) { showToast("Error al marcar", "error"); }
  };

  const openAddModal = (order) => {
      setActiveOrder(order);
      setModalTab('salsas');
      setSelectedQuickSauce('');
      setSelectedCategory(''); 
      setSelectedProductId('');
      setExtraQuantity(1);
      setExtraNote('');
      setIsModalOpen(true);
  };

  const handleAddExtra = async () => {
      if (!activeOrder) return;
      
      let newItem;
      let unitPrice = 0;
      let newStatus = activeOrder.status;

      // 1. LÓGICA SI ES PESTAÑA SALSAS RÁPIDAS
      if (modalTab === 'salsas') {
          if (!selectedQuickSauce) return;
          unitPrice = 10;
          newItem = {
              name: `Extra ${selectedQuickSauce}`,
              price: unitPrice,
              quantity: extraQuantity,
              category: 'salsas extra',
              customizationDescription: extraNote ? `Nota Mesero: ${extraNote}` : 'Agregado en mesa',
              completed: true, // Se marca completado automático para que el mesero lo lleve directo
              delivered: false
          };
          if (newStatus === 'servido') newStatus = 'listo';
      } 
      // 2. LÓGICA SI ES PESTAÑA COMIDA/BEBIDAS
      else {
          if (!selectedProductObj) return;
          unitPrice = Number(selectedProductObj.price);
          let details = [];

          if (selectedProductObj.allowMeatSwap && custMeat) details.push(`Carne: ${custMeat}`);
          if (selectedProductObj.sauceOptions?.length > 0 && custFlavor) details.push(`Sabor: ${custFlavor}`);
          if (selectedProductObj.hasIceOption && custIce) details.push(`Hielo: ${custIce}`);
          if (selectedProductObj.hasTapiocaOption && custTapioca) {
              unitPrice += Number(selectedProductObj.tapiocaPrice || 0);
              details.push(`Con Tapioca`);
          }
          if (selectedProductObj.extraSauceNames?.length > 0 && custExtraSauce) {
              unitPrice += Number(selectedProductObj.extraSaucePotPrice || 0);
              details.push(`Extra: ${custExtraSauce}`);
          }
          if (custExtraPieceCount > 0) {
              unitPrice += (Number(selectedProductObj.pricePerExtraPiece || 0) * custExtraPieceCount);
              details.push(`+${custExtraPieceCount} Piezas Extra`);
          }
          if (extraNote) details.push(`Nota Mesero: ${extraNote}`);

          const finalDescription = details.join('. ');

          newItem = {
              name: selectedProductObj.name,
              price: unitPrice, 
              quantity: extraQuantity,
              category: selectedProductObj.category || '',
              customizationDescription: finalDescription || 'Agregado en mesa',
              completed: false,
              delivered: false
          };

          const isSimple = isItemReady(newItem); 
          if (!isSimple) {
              newStatus = 'preparando';
          } else if (newStatus === 'servido') {
              newStatus = 'listo';
          }
      }

      // 3. ACTUALIZAR BASE DE DATOS
      const updatedItems = [...activeOrder.items, newItem];
      const newTotal = activeOrder.total + (unitPrice * extraQuantity);

      try {
          await updateDoc(doc(db, "orders", activeOrder.id), {
              items: updatedItems,
              total: newTotal,
              status: newStatus
          });
          showToast(`¡Añadido a la mesa exitosamente!`, 'success');
          setIsModalOpen(false);
      } catch (error) {
          showToast("Error al añadir producto", "error");
      }
  };

  const finishOrder = async (order) => {
      if (!user) return;
      const allDelivered = order.items.every(i => i.delivered);
      
      if (!allDelivered && !confirm("⚠️ Faltan platillos por entregar. ¿Cobrar y liberar mesa de todos modos?")) return;

      try {
          await updateDoc(doc(db, "orders", order.id), { 
              status: 'entregado', 
              servedBy: user.uid, 
              servedByName: user.displayName || user.email 
          });
          showToast(`✅ Mesa Liberada y Cobrada`, 'success');
      } catch (error) { showToast("Error", 'error'); }
  };

  const filteredProducts = products.filter(p => p.category === selectedCategory);
  const isAddDisabled = modalTab === 'salsas' ? !selectedQuickSauce : !selectedProductId;

  if (loading) return <div className="p-10 text-center text-white animate-pulse">Cargando mesas...</div>;

  return (
    <div className="p-4 min-h-screen pb-20 bg-zinc-900 text-white">
      
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
            if (order.status === 'listo') { cardColor = 'border-blue-500 bg-zinc-800'; headerColor = 'bg-blue-800 text-white'; }
            if (order.status === 'servido') { cardColor = 'border-green-500 bg-zinc-800'; headerColor = 'bg-green-800 text-green-100'; }

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
                        const isSimpleDrink = ['coca', 'pepsi', 'fanta', 'sidral', 'agua', 'refresco', 'soda', 'botella', 'mineral', 'sangria', 'manzana', 'jugo', 'embotellado', 'horchata', 'jamaica', 'tamarindo', 'cebada', 'salsa extra'].some(d => item.name.toLowerCase().includes(d));

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
                                        {item.completed && !item.delivered && <span className="text-orange-500 animate-bounce" title="¡Terminado en cocina/barra!"><FaFire/></span>}
                                        {ready && !item.completed && !item.delivered && isSimpleDrink && <span className="text-blue-400" title="Listo automático"><FaGlassWhiskey/></span>}
                                    </div>
                                    {item.customizationDescription && <span className="text-[10px] text-yellow-500/80 italic block leading-tight mt-0.5">{item.customizationDescription}</span>}
                                </div>
                            </div>
                        );
                    })}
                </div>

                <div className="p-3 bg-zinc-900 border-t border-zinc-700 flex flex-col gap-2">
                    <button 
                        onClick={() => openAddModal(order)}
                        className="w-full bg-zinc-800 hover:bg-zinc-700 border border-zinc-600 text-yellow-500 text-sm font-bold py-2.5 rounded-lg transition flex items-center justify-center gap-2"
                    >
                        <FaPlus size={12}/> Añadir Extra a la Mesa
                    </button>

                    <button 
                        onClick={() => finishOrder(order)} 
                        className={`w-full font-bold py-3 rounded-lg transition shadow-lg flex items-center justify-center gap-2 ${allDelivered ? 'bg-green-600 hover:bg-green-500 text-white animate-pulse' : 'bg-zinc-800 text-gray-500 opacity-80 border border-zinc-700 hover:border-red-500 hover:text-red-400'}`}
                    >
                        <FaUserTie /> {allDelivered ? '¡Cobrar y Liberar Mesa!' : 'Liberar Mesa Incompleta'}
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

      {/* MODAL AVANZADO CON PESTAÑAS (SALSAS Y COMIDA) */}
      {isModalOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-fade-in">
              <div className="bg-zinc-900 border border-yellow-500/50 p-5 md:p-6 rounded-2xl w-full max-w-md relative shadow-2xl max-h-[90vh] overflow-y-auto">
                  <button onClick={() => setIsModalOpen(false)} className="absolute top-4 right-4 text-gray-400 hover:text-white bg-zinc-800 p-2 rounded-full"><FaTimes size={16} /></button>
                  
                  <h3 className="text-xl font-black text-yellow-500 mb-1 flex items-center gap-2"><FaPlus/> Añadir Extra</h3>
                  <p className="text-gray-400 text-sm mb-4">Destino: <strong className="text-white">{activeOrder?.detail}</strong></p>

                  {/* NAVEGACIÓN DE PESTAÑAS */}
                  <div className="flex gap-2 mb-4 border-b border-zinc-700 pb-2">
                      <button 
                          onClick={() => setModalTab('salsas')} 
                          className={`flex-1 py-2 text-sm font-bold rounded-t-lg transition-colors flex items-center justify-center gap-2 ${modalTab === 'salsas' ? 'bg-yellow-500 text-black' : 'bg-zinc-800 text-gray-400 hover:text-white'}`}
                      >
                          <FaPepperHot/> Salsas Extras
                      </button>
                      <button 
                          onClick={() => setModalTab('comida')} 
                          className={`flex-1 py-2 text-sm font-bold rounded-t-lg transition-colors flex items-center justify-center gap-2 ${modalTab === 'comida' ? 'bg-yellow-500 text-black' : 'bg-zinc-800 text-gray-400 hover:text-white'}`}
                      >
                          <FaHamburger/> Comida / Bebidas
                      </button>
                  </div>

                  <div className="space-y-4">
                      
                      {/* --- PESTAÑA: SALSAS RÁPIDAS --- */}
                      {modalTab === 'salsas' && (
                          <div className="bg-zinc-800/50 p-4 rounded-xl border border-zinc-700 space-y-3">
                              <label className="text-xs text-gray-400 font-bold uppercase tracking-wider block">Elige la Salsa ($10 c/u)</label>
                              <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                                  {['Ranch', 'Búfalo', 'Cátsup'].map(s => (
                                      <button 
                                          key={s} 
                                          onClick={() => setSelectedQuickSauce(s)} 
                                          className={`py-3 px-2 rounded-lg text-sm font-bold border transition-colors shadow-sm ${selectedQuickSauce === s ? 'bg-yellow-500 text-black border-yellow-500 shadow-[0_0_10px_rgba(234,179,8,0.3)]' : 'bg-zinc-800 text-white border-zinc-600 hover:border-yellow-500/50'}`}
                                      >
                                          {s}
                                      </button>
                                  ))}
                              </div>
                          </div>
                      )}

                      {/* --- PESTAÑA: COMIDA / BEBIDAS --- */}
                      {modalTab === 'comida' && (
                          <>
                              <div>
                                  <label className="text-xs text-gray-400 font-bold uppercase tracking-wider mb-1 block">Categoría</label>
                                  <select 
                                      value={selectedCategory} 
                                      onChange={(e) => { setSelectedCategory(e.target.value); setSelectedProductId(''); }}
                                      className="w-full bg-zinc-800 border border-zinc-700 text-white p-3 rounded-lg focus:ring-2 focus:ring-yellow-500 outline-none uppercase text-sm"
                                  >
                                      <option value="" disabled>Selecciona una categoría...</option>
                                      {categories.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                                  </select>
                              </div>

                              {selectedCategory && (
                                  <div>
                                      <label className="text-xs text-gray-400 font-bold uppercase tracking-wider mb-1 block">Producto</label>
                                      <select 
                                          value={selectedProductId} 
                                          onChange={(e) => setSelectedProductId(e.target.value)}
                                          className="w-full bg-zinc-800 border border-zinc-700 text-white p-3 rounded-lg focus:ring-2 focus:ring-yellow-500 outline-none"
                                      >
                                          <option value="" disabled>Selecciona un producto...</option>
                                          {filteredProducts.map(p => (
                                              <option key={p.id} value={p.id}>{p.name} - ${p.price}</option>
                                          ))}
                                      </select>
                                  </div>
                              )}

                              {selectedProductObj && (
                                  <div className="bg-black/30 p-3 rounded-xl border border-zinc-700/50 space-y-3">
                                      <h4 className="text-xs font-bold text-yellow-500 uppercase flex items-center gap-1"><FaCogs/> Personalización</h4>
                                      
                                      {selectedProductObj.allowMeatSwap && (
                                          <div>
                                              <label className="text-[10px] text-gray-400 uppercase">Tipo de Carne</label>
                                              <select value={custMeat} onChange={e=>setCustMeat(e.target.value)} className="w-full bg-zinc-800 text-white p-2 rounded text-sm outline-none border border-zinc-700">
                                                  <option value="Res">Res (Normal)</option>
                                                  <option value="Pechuga Crispy">Pechuga Crispy</option>
                                                  <option value="Tiras">Tiras de Pollo</option>
                                              </select>
                                          </div>
                                      )}

                                      {selectedProductObj.sauceOptions?.length > 0 && (
                                          <div>
                                              <label className="text-[10px] text-gray-400 uppercase">Sabor / Salsa</label>
                                              <select value={custFlavor} onChange={e=>setCustFlavor(e.target.value)} className="w-full bg-zinc-800 text-white p-2 rounded text-sm outline-none border border-zinc-700">
                                                  {selectedProductObj.sauceOptions.map(s => <option key={s} value={s}>{s}</option>)}
                                              </select>
                                          </div>
                                      )}

                                      {selectedProductObj.hasIceOption && (
                                          <div>
                                              <label className="text-[10px] text-gray-400 uppercase">Nivel de Hielo</label>
                                              <select value={custIce} onChange={e=>setCustIce(e.target.value)} className="w-full bg-zinc-800 text-white p-2 rounded text-sm outline-none border border-zinc-700">
                                                  <option value="Normal">Normal</option><option value="Poco Hielo">Poco Hielo</option><option value="Sin Hielo">Sin Hielo</option>
                                              </select>
                                          </div>
                                      )}

                                      {selectedProductObj.hasTapiocaOption && (
                                          <div className="flex items-center gap-2 bg-zinc-800 p-2 rounded border border-zinc-700 text-sm">
                                              <input type="checkbox" className="w-4 h-4 accent-yellow-500" checked={custTapioca} onChange={e=>setCustTapioca(e.target.checked)}/>
                                              <span>Agregar Tapioca (+${selectedProductObj.tapiocaPrice})</span>
                                          </div>
                                      )}

                                      {selectedProductObj.extraSauceNames?.length > 0 && (
                                          <div>
                                              <label className="text-[10px] text-gray-400 uppercase">Botecito Extra (+${selectedProductObj.extraSaucePotPrice})</label>
                                              <select value={custExtraSauce} onChange={e=>setCustExtraSauce(e.target.value)} className="w-full bg-zinc-800 text-white p-2 rounded text-sm outline-none border border-zinc-700">
                                                  <option value="">Ninguno</option>
                                                  {selectedProductObj.extraSauceNames.map(s => <option key={s} value={s}>{s}</option>)}
                                              </select>
                                          </div>
                                      )}

                                      {selectedProductObj.pricePerExtraPiece > 0 && (
                                          <div>
                                              <label className="text-[10px] text-gray-400 uppercase">Añadir Piezas Extra (+${selectedProductObj.pricePerExtraPiece} c/u)</label>
                                              <input type="number" min="0" value={custExtraPieceCount} onChange={e=>setCustExtraPieceCount(Number(e.target.value))} className="w-full bg-zinc-800 text-white p-2 rounded text-sm outline-none border border-zinc-700" />
                                          </div>
                                      )}
                                  </div>
                              )}
                          </>
                      )}

                      {/* --- SECCIÓN COMPARTIDA: CANTIDAD Y NOTAS --- */}
                      <div className="flex gap-4 border-t border-zinc-800 pt-4">
                          <div className="w-1/3">
                              <label className="text-xs text-gray-400 font-bold uppercase tracking-wider mb-1 block">Cantidad</label>
                              <input 
                                  type="number" 
                                  min="1" 
                                  value={extraQuantity} 
                                  onChange={(e) => setExtraQuantity(Number(e.target.value))}
                                  className="w-full bg-zinc-800 border border-zinc-700 text-white p-3 rounded-lg text-center font-bold outline-none focus:ring-2 focus:ring-yellow-500"
                              />
                          </div>
                          <div className="flex-1">
                              <label className="text-xs text-gray-400 font-bold uppercase tracking-wider mb-1 block">Nota Mesero (Opcional)</label>
                              <input 
                                  type="text" 
                                  placeholder="Ej: Sin cebolla..." 
                                  value={extraNote} 
                                  onChange={(e) => setExtraNote(e.target.value)}
                                  className="w-full bg-zinc-800 border border-zinc-700 text-white p-3 rounded-lg outline-none focus:ring-2 focus:ring-yellow-500 text-sm"
                              />
                          </div>
                      </div>

                      <button 
                          onClick={handleAddExtra}
                          disabled={isAddDisabled}
                          className={`w-full mt-2 font-black py-3 rounded-xl shadow-lg transition-all flex items-center justify-center gap-2 ${!isAddDisabled ? 'bg-yellow-500 hover:bg-yellow-400 text-black' : 'bg-zinc-700 text-zinc-500 cursor-not-allowed'}`}
                      >
                          <FaPlus /> Añadir a la Cuenta
                      </button>
                  </div>
              </div>
          </div>
      )}
    </div>
  );
}