import { useState, useEffect } from 'react';
import { db } from '../firebase/config';
import { collection, addDoc, getDocs, doc, updateDoc, setDoc, onSnapshot, deleteDoc } from 'firebase/firestore';
import { jsPDF } from "jspdf";
import autoTable from 'jspdf-autotable';
import { showToast } from '../stores/toastStore';
import { FaTrash, FaCreditCard, FaEye, FaFilePdf, FaCalendarAlt } from 'react-icons/fa';
import { getBankStyle, BANK_OPTIONS } from '../utils/bankStyles';

export default function AdminDashboard() {
  const [activeTab, setActiveTab] = useState('menu');
  const [loading, setLoading] = useState(false);
  const [isStoreOpen, setIsStoreOpen] = useState(true);
  
  const [tableCount, setTableCount] = useState(15); 
  const [accounts, setAccounts] = useState([]);
  const [newAccount, setNewAccount] = useState({ bank: 'BBVA', name: '', number: '' });

  const CLOUD_NAME = import.meta.env.PUBLIC_CLOUDINARY_CLOUD_NAME || "dw5mio6d9"; 
  const UPLOAD_PRESET = import.meta.env.PUBLIC_CLOUDINARY_PRESET || "Snacks_Lizama"; 

  const [newProduct, setNewProduct] = useState({ name: '', price: '', category: 'hamburguesas', description: '', inStock: true });
  const [imageFile, setImageFile] = useState(null);
  const [users, setUsers] = useState([]);
  const [orders, setOrders] = useState([]);
  const [products, setProducts] = useState([]); 
  const [selectedProof, setSelectedProof] = useState(null);

  useEffect(() => {
    const unsub = onSnapshot(doc(db, "store_config", "main"), (docSnap) => {
      if (docSnap.exists()) {
          const data = docSnap.data();
          setIsStoreOpen(data.isOpen);
          if (data.tableCount) setTableCount(data.tableCount);
          if (data.accounts && Array.isArray(data.accounts)) setAccounts(data.accounts);
      }
    });
    return () => unsub();
  }, []);

  const toggleStore = async () => {
    try {
      const newState = !isStoreOpen;
      await setDoc(doc(db, "store_config", "main"), { isOpen: newState }, { merge: true });
      showToast(newState ? "Local ABIERTO" : "Local CERRADO", newState ? 'success' : 'error');
    } catch (error) { showToast("Error", 'error'); }
  };

  const handleUpdateConfig = async () => {
      setLoading(true);
      try {
        await setDoc(doc(db, "store_config", "main"), { 
            tableCount: Number(tableCount),
            accounts: accounts
        }, { merge: true });
        showToast("Configuración guardada", 'success');
      } catch (error) { showToast("Error al guardar", 'error'); }
      setLoading(false);
  };

  const handleCardInput = (e) => {
      let val = e.target.value.replace(/\D/g, '');
      if (val.length > 18) val = val.slice(0, 18);
      val = val.replace(/(\d{4})(?=\d)/g, '$1 ');
      setNewAccount({ ...newAccount, number: val });
  };
  const handleAddAccount = (e) => {
      e.preventDefault();
      if(!newAccount.name || !newAccount.number) return showToast("Faltan datos", "error");
      setAccounts([...accounts, { ...newAccount, id: Date.now() }]);
      setNewAccount({ bank: 'BBVA', name: '', number: '' });
      showToast("Cuenta agregada", "info");
  };
  const handleDeleteAccount = (id) => setAccounts(accounts.filter(acc => acc.id !== id));

  useEffect(() => {
    if (activeTab === 'menu') fetchProducts();
    if (activeTab === 'roles') fetchUsers();
    if (activeTab === 'finanzas') fetchOrders();
  }, [activeTab]);

  const fetchProducts = async () => {
    const s = await getDocs(collection(db, "products"));
    const data = s.docs.map(d => ({ id: d.id, ...d.data() }));
    data.sort((a, b) => a.name.localeCompare(b.name));
    setProducts(data);
  };
  const fetchUsers = async () => { const s = await getDocs(collection(db, "users")); setUsers(s.docs.map(d => ({ id: d.id, ...d.data() }))); };
  
  const fetchOrders = async () => {
    const s = await getDocs(collection(db, "orders"));
    const data = s.docs.map(d => ({ id: d.id, ...d.data() }));
    const finishedOrders = data.filter(o => ['completado', 'entregado', 'cancelado'].includes(o.status));
    finishedOrders.sort((a, b) => {
        const dateA = a.createdAt?.toDate ? a.createdAt.toDate() : new Date(a.createdAt);
        const dateB = b.createdAt?.toDate ? b.createdAt.toDate() : new Date(b.createdAt);
        return dateB - dateA;
    });
    setOrders(finishedOrders);
  };

  const groupedOrders = orders.reduce((groups, order) => {
      const dateObj = order.createdAt?.toDate ? order.createdAt.toDate() : new Date(order.createdAt);
      const dateStr = dateObj.toLocaleDateString();
      if (!groups[dateStr]) groups[dateStr] = [];
      groups[dateStr].push(order);
      return groups;
  }, {});

  const sortedDates = Object.keys(groupedOrders).sort((a, b) => {
      const [dA, mA, yA] = a.split('/');
      const [dB, mB, yB] = b.split('/');
      return new Date(yB, mB - 1, dB) - new Date(yA, mA - 1, dA);
  });

  // --- PDF CORREGIDO PARA MOSTRAR NOMBRE ---
  const downloadReport = (ordersList, dateLabel) => {
    try {
      const doc = new jsPDF();
      
      doc.setFillColor(234, 88, 12); 
      doc.rect(0, 0, 210, 20, 'F'); 
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(16);
      doc.text("SNACKS LIZAMA - Reporte de Ventas", 14, 13);
      
      doc.setTextColor(0, 0, 0);
      doc.setFontSize(12);
      doc.text(`Fecha del Reporte: ${dateLabel}`, 14, 30);
      
      const tableRows = ordersList.map(order => [
        order.createdAt?.toDate ? order.createdAt.toDate().toLocaleTimeString() : new Date(order.createdAt).toLocaleTimeString(),
        // AQUÍ ESTÁ EL CAMBIO: userName en lugar de userEmail
        order.userName || 'Cliente', 
        order.type.toUpperCase(), 
        order.paymentMethod.toUpperCase(),
        `$${order.total}`, 
        order.status.toUpperCase()
      ]);

      autoTable(doc, { 
          head: [['HORA', 'CLIENTE', 'TIPO', 'PAGO', 'TOTAL', 'ESTADO']], 
          body: tableRows, 
          startY: 35,
          theme: 'striped',
          headStyles: { fillColor: [31, 41, 55] }, 
          styles: { fontSize: 10 },
          alternateRowStyles: { fillColor: [243, 244, 246] }
      });

      const totalSales = ordersList.reduce((acc, curr) => curr.status !== 'cancelado' ? acc + curr.total : acc, 0);
      const finalY = (doc.lastAutoTable && doc.lastAutoTable.finalY) || 150;
      
      doc.setFillColor(220, 252, 231); 
      doc.rect(140, finalY + 5, 50, 10, 'F');
      doc.setFontSize(12);
      doc.setTextColor(22, 163, 74); 
      doc.text(`VENTA TOTAL: $${totalSales}`, 142, finalY + 12);
      
      doc.save(`reporte_${dateLabel.replace(/\//g, '-')}.pdf`);
      showToast("PDF descargado", 'success');
    } catch (e) { showToast("Error PDF", 'error'); }
  };

  const handleAddProduct = async (e) => {
    e.preventDefault(); setLoading(true);
    try {
      let imageUrl = '';
      if (imageFile) {
          const fd = new FormData(); fd.append("file", imageFile); fd.append("upload_preset", UPLOAD_PRESET);
          const res = await fetch(`https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`, { method: "POST", body: fd });
          const data = await res.json(); imageUrl = data.secure_url;
      }
      await addDoc(collection(db, "products"), { ...newProduct, price: Number(newProduct.price), image: imageUrl, createdAt: new Date() });
      showToast("Agregado", 'success'); setNewProduct({ name: '', price: '', category: 'hamburguesas', description: '', inStock: true }); setImageFile(null); fetchProducts();
    } catch(err) { showToast("Error", 'error'); } setLoading(false);
  };
  const toggleProductStock = async (product) => { try { await updateDoc(doc(db, "products", product.id), { inStock: !product.inStock }); showToast("Stock actualizado", 'success'); fetchProducts(); } catch (error) { showToast("Error", 'error'); } };
  const handleDeleteProduct = async (id) => { if(confirm("¿Eliminar?")) { await deleteDoc(doc(db, "products", id)); fetchProducts(); showToast("Eliminado", 'success'); } }
  const handleUpdateRole = async (uid, role) => { if(window.confirm(`¿Cambiar rol?`)) { await updateDoc(doc(db, "users", uid), { role }); fetchUsers(); showToast("Rol actualizado", 'success'); } };
  
  const ROLES = ['cliente', 'admin', 'hamburguesero', 'productor', 'freidor', 'mesero 1', 'mesero 2', 'repartidor 1', 'repartidor 2'];

  return (
    <div className="p-4 max-w-6xl mx-auto mb-20 transition-colors duration-300 relative">
      
      {selectedProof && ( <div className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-4" onClick={() => setSelectedProof(null)}> <div className="relative max-w-2xl w-full bg-white dark:bg-gray-800 rounded-lg p-2"> <button className="absolute top-2 right-2 bg-red-600 text-white rounded-full w-8 h-8 font-bold" onClick={() => setSelectedProof(null)}>X</button> <img src={selectedProof} className="w-full h-auto rounded" /> </div> </div> )}

      <div className="flex justify-between items-center mb-6 bg-white dark:bg-gray-800 p-4 rounded-lg shadow border border-gray-200 dark:border-gray-700 transition-colors">
        <h1 className="text-2xl font-bold text-gray-800 dark:text-white">Panel de Administración</h1>
        <div className="flex items-center gap-3">
          <span className={`font-bold text-sm px-3 py-1 rounded-full ${isStoreOpen ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'}`}>{isStoreOpen ? '🟢 ABIERTO' : '🔴 CERRADO'}</span>
          <button onClick={toggleStore} className={`px-4 py-2 rounded text-white font-bold text-xs shadow ${isStoreOpen ? 'bg-red-500' : 'bg-green-500'}`}>{isStoreOpen ? 'Cerrar Local' : 'Abrir Local'}</button>
        </div>
      </div>

      <div className="flex border-b dark:border-gray-700 mb-6 overflow-x-auto bg-white dark:bg-gray-800 rounded-t-lg shadow-sm">
        {['menu', 'roles', 'finanzas', 'config'].map((tab) => (
          <button key={tab} onClick={() => setActiveTab(tab)} className={`px-6 py-3 font-bold uppercase text-xs whitespace-nowrap border-b-4 transition-colors ${activeTab === tab ? 'border-orange-600 text-orange-600 bg-orange-50 dark:bg-gray-700 dark:text-orange-400' : 'border-transparent text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700'}`}>{tab === 'config' ? '⚙️ Config' : tab}</button>
        ))}
      </div>

      {activeTab === 'menu' && (
        <div className="grid md:grid-cols-3 gap-6">
            <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md h-fit border dark:border-gray-700">
                <h2 className="font-bold text-lg mb-4 text-gray-700 dark:text-white border-b dark:border-gray-700 pb-2">Nuevo Producto</h2>
                <form onSubmit={handleAddProduct} className="flex flex-col gap-3">
                    <input type="text" placeholder="Nombre" className="p-2 border dark:border-gray-600 rounded dark:bg-gray-700 dark:text-white" value={newProduct.name} onChange={e => setNewProduct({...newProduct, name: e.target.value})} required />
                    <input type="number" placeholder="Precio ($)" className="p-2 border dark:border-gray-600 rounded dark:bg-gray-700 dark:text-white" value={newProduct.price} onChange={e => setNewProduct({...newProduct, price: e.target.value})} required />
                    <select className="p-2 border dark:border-gray-600 rounded dark:bg-gray-700 dark:text-white" value={newProduct.category} onChange={e => setNewProduct({...newProduct, category: e.target.value})}>
                        {['hamburguesas', 'alitas', 'boneless', 'pastas', 'snacks', 'bebidas', 'box'].map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                    <textarea placeholder="Descripción" className="p-2 border dark:border-gray-600 rounded dark:bg-gray-700 dark:text-white" value={newProduct.description} onChange={e => setNewProduct({...newProduct, description: e.target.value})} />
                    <input type="file" onChange={e => setImageFile(e.target.files[0])} className="text-xs dark:text-gray-300" />
                    <button disabled={loading} className="bg-green-600 text-white p-2 rounded font-bold">{loading ? 'Subiendo...' : 'Guardar'}</button>
                </form>
            </div>
            <div className="md:col-span-2 bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md border dark:border-gray-700">
                <h2 className="font-bold text-lg mb-4 text-gray-700 dark:text-white">Inventario</h2>
                <div className="overflow-y-auto max-h-[600px] space-y-2 pr-2">
                    {products.map(p => (
                        <div key={p.id} className="flex items-center justify-between p-3 border dark:border-gray-700 rounded hover:bg-gray-50 dark:hover:bg-gray-700">
                            <div className="flex items-center gap-3">
                                <img src={p.image} className="w-12 h-12 rounded object-cover border dark:border-gray-600" />
                                <div><p className="font-bold text-sm text-gray-800 dark:text-white">{p.name}</p><p className="text-xs text-gray-500 dark:text-gray-400">${p.price} • {p.category}</p></div>
                            </div>
                            <div className="flex gap-2"><button onClick={() => toggleProductStock(p)} className={`px-2 py-1 text-xs rounded border ${p.inStock ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>{p.inStock ? 'Stock' : 'Agotado'}</button><button onClick={() => handleDeleteProduct(p.id)} className="text-gray-400 hover:text-red-500">🗑️</button></div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
      )}

      {activeTab === 'roles' && (
        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md overflow-x-auto border dark:border-gray-700">
           <table className="w-full text-left">
             <thead><tr className="bg-orange-50 dark:bg-gray-700/50 text-orange-800 dark:text-orange-300 text-xs"><th className="p-3">Usuario</th><th className="p-3">Rol</th><th className="p-3">Asignar</th></tr></thead>
             <tbody>
               {users.map(u => (
                 <tr key={u.id} className="border-b dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700">
                   <td className="p-3"><p className="font-bold text-gray-800 dark:text-white">{u.displayName || 'Sin Nombre'}</p><p className="text-xs text-gray-500 dark:text-gray-400">{u.email}</p></td>
                   <td className="p-3"><span className="bg-gray-100 dark:bg-gray-600 px-2 py-1 rounded text-xs uppercase text-gray-600 dark:text-gray-200">{u.role}</span></td>
                   <td className="p-3"><select onChange={(e) => handleUpdateRole(u.id, e.target.value)} value={u.role || 'cliente'} className="border dark:border-gray-600 p-2 rounded text-sm bg-white dark:bg-gray-700 dark:text-white">{ROLES.map(rol => <option key={rol} value={rol}>{rol.toUpperCase()}</option>)}</select></td>
                 </tr>
               ))}
             </tbody>
           </table>
        </div>
      )}

      {activeTab === 'finanzas' && (
        <div className="space-y-8">
            <h2 className="text-2xl font-bold text-gray-800 dark:text-white mb-4">Reportes por Día</h2>
            {sortedDates.length === 0 && <p className="text-gray-500 dark:text-gray-400">No hay ventas registradas.</p>}
            
            {sortedDates.map(date => {
                const dailyOrders = groupedOrders[date];
                const dailyTotal = dailyOrders.reduce((sum, o) => o.status !== 'cancelado' ? sum + o.total : sum, 0);
                
                return (
                    <div key={date} className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md border dark:border-gray-700">
                        <div className="flex flex-col md:flex-row justify-between items-center mb-4 border-b dark:border-gray-700 pb-4 gap-4">
                            <div className="flex items-center gap-3">
                                <FaCalendarAlt className="text-orange-500 text-xl" />
                                <div>
                                    <h3 className="text-xl font-bold text-gray-800 dark:text-white">{date}</h3>
                                    <p className="text-xs text-gray-500 dark:text-gray-400">{dailyOrders.length} pedidos cerrados</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-4">
                                <div className="text-right"><p className="text-xs text-gray-500 dark:text-gray-400 uppercase">Venta</p><p className="text-2xl font-extrabold text-green-600 dark:text-green-400">${dailyTotal}</p></div>
                                <button onClick={() => downloadReport(dailyOrders, date)} className="bg-gray-800 dark:bg-gray-700 text-white px-4 py-2 rounded flex items-center gap-2 text-sm font-bold shadow"><FaFilePdf /> PDF</button>
                            </div>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse">
                                <thead><tr className="bg-gray-50 dark:bg-gray-700/50 text-xs uppercase text-gray-600 dark:text-gray-300"><th className="p-3">Hora</th><th className="p-3">Cliente</th><th className="p-3">Tipo</th><th className="p-3">Total</th><th className="p-3">Estado</th><th className="p-3">Acciones</th></tr></thead>
                                <tbody className="text-sm">
                                    {dailyOrders.map(order => (
                                        <tr key={order.id} className="border-b dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                                            <td className="p-3 text-gray-500 dark:text-gray-400 font-mono">{order.createdAt?.toDate ? order.createdAt.toDate().toLocaleTimeString() : new Date(order.createdAt).toLocaleTimeString()}</td>
                                            <td className="p-3"><p className="font-bold text-gray-700 dark:text-white">{order.userName || 'Anónimo'}</p><p className="text-xs text-gray-400">{order.userEmail}</p></td>
                                            <td className="p-3 capitalize dark:text-gray-300">{order.type} <span className="text-xs text-gray-400">({order.paymentMethod})</span></td>
                                            <td className="p-3 font-bold text-green-600 dark:text-green-400">${order.total}</td>
                                            <td className="p-3"><span className={`px-2 py-1 rounded text-xs font-bold text-white ${order.status === 'cancelado' ? 'bg-red-500' : 'bg-green-500'}`}>{order.status}</span></td>
                                            <td className="p-3 flex gap-2">
                                                {order.proofOfPayment && <button onClick={() => setSelectedProof(order.proofOfPayment)} className="text-blue-500" title="Ver Comprobante"><FaEye/></button>}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                );
            })}
        </div>
      )}

      {activeTab === 'config' && (
          <div className="grid md:grid-cols-2 gap-6">
              <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md border dark:border-gray-700 h-fit">
                  <h2 className="text-xl font-bold mb-4 text-gray-800 dark:text-white border-b dark:border-gray-700 pb-2">⚙️ General</h2>
                  <div className="mb-4">
                      <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">Mesas</label>
                      <input type="number" min="1" max="100" value={tableCount} onChange={(e) => setTableCount(e.target.value)} className="border-2 p-2 rounded w-20 text-center font-bold dark:bg-gray-700 dark:text-white dark:border-gray-600" />
                  </div>
              </div>

              <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md border dark:border-gray-700 relative">
                  <h2 className="text-xl font-bold mb-4 text-gray-800 dark:text-white border-b dark:border-gray-700 pb-2">💳 Cuentas Bancarias</h2>
                  <form onSubmit={handleAddAccount} className="mb-6 bg-gray-50 dark:bg-gray-700/30 p-4 rounded border dark:border-gray-700">
                      <div className="grid grid-cols-2 gap-3 mb-3">
                          <div>
                              <label className="text-xs font-bold text-gray-500 dark:text-gray-400">Banco</label>
                              <select value={newAccount.bank} onChange={e => setNewAccount({...newAccount, bank: e.target.value})} className="w-full p-2 border rounded text-sm dark:bg-gray-700 dark:text-white dark:border-gray-600">
                                  {BANK_OPTIONS.map(b => <option key={b} value={b}>{b}</option>)}
                              </select>
                          </div>
                          <div>
                              <label className="text-xs font-bold text-gray-500 dark:text-gray-400">Titular</label>
                              <input type="text" value={newAccount.name} onChange={e => setNewAccount({...newAccount, name: e.target.value})} className="w-full p-2 border rounded text-sm dark:bg-gray-700 dark:text-white dark:border-gray-600" />
                          </div>
                      </div>
                      <div className="mb-3">
                          <label className="text-xs font-bold text-gray-500 dark:text-gray-400">Tarjeta / CLABE</label>
                          <input type="text" placeholder="0000 0000 0000 0000" value={newAccount.number} onChange={handleCardInput} className="w-full p-2 border rounded font-mono text-sm dark:bg-gray-700 dark:text-white dark:border-gray-600" />
                      </div>
                      <button className="w-full bg-blue-600 text-white py-2 rounded font-bold text-sm">+ Agregar</button>
                  </form>

                  <div className="space-y-3 max-h-80 overflow-y-auto pr-1">
                      {accounts.map(acc => (
                          <div key={acc.id} className={`p-4 rounded-xl shadow-md relative overflow-hidden text-white ${getBankStyle(acc.bank)}`}>
                              <div className="flex justify-between items-start relative z-10">
                                  <div className="flex items-center gap-2"><FaCreditCard className="opacity-80"/><span className="font-bold tracking-wider">{acc.bank}</span></div>
                                  <button onClick={() => handleDeleteAccount(acc.id)} className="opacity-60 hover:opacity-100"><FaTrash/></button>
                              </div>
                              <div className="mt-4 relative z-10">
                                  <p className="font-mono text-lg tracking-wider mb-2 break-all">{acc.number}</p>
                                  <p className="text-xs uppercase opacity-90 font-bold">{acc.name}</p>
                              </div>
                          </div>
                      ))}
                  </div>
              </div>
              <div className="md:col-span-2 text-right mt-4">
                  <button onClick={handleUpdateConfig} disabled={loading} className="bg-orange-600 text-white px-8 py-3 rounded-lg font-bold shadow hover:bg-orange-700">{loading ? '...' : 'Guardar Configuración General'}</button>
              </div>
          </div>
      )}
    </div>
  );
}