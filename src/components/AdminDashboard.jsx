import { useState, useEffect } from 'react';
import { db } from '../firebase/config';
import { collection, addDoc, getDocs, doc, updateDoc, setDoc, onSnapshot, deleteDoc } from 'firebase/firestore';
import { jsPDF } from "jspdf";
import autoTable from 'jspdf-autotable';
import { showToast } from '../stores/toastStore';

export default function AdminDashboard() {
  const [activeTab, setActiveTab] = useState('menu');
  const [loading, setLoading] = useState(false);
  const [isStoreOpen, setIsStoreOpen] = useState(true);
  const [tableCount, setTableCount] = useState(15); 

  const CLOUD_NAME = import.meta.env.PUBLIC_CLOUDINARY_CLOUD_NAME || "dw5mio6d9"; 
  const UPLOAD_PRESET = import.meta.env.PUBLIC_CLOUDINARY_PRESET || "Snacks_Lizama"; 

  const [newProduct, setNewProduct] = useState({
    name: '', price: '', category: 'hamburguesas', description: '', inStock: true
  });
  const [imageFile, setImageFile] = useState(null);
  const [users, setUsers] = useState([]);
  const [orders, setOrders] = useState([]);
  const [products, setProducts] = useState([]); 

  // 1. CARGAR CONFIGURACIÓN GENERAL
  useEffect(() => {
    const unsub = onSnapshot(doc(db, "store_config", "main"), (docSnap) => {
      if (docSnap.exists()) {
          const data = docSnap.data();
          setIsStoreOpen(data.isOpen);
          if (data.tableCount) setTableCount(data.tableCount);
      }
    });
    return () => unsub();
  }, []);

  const toggleStore = async () => {
    try {
      const newState = !isStoreOpen;
      await setDoc(doc(db, "store_config", "main"), { isOpen: newState }, { merge: true });
      showToast(newState ? "Local ABIERTO" : "Local CERRADO", newState ? 'success' : 'error');
    } catch (error) {
      showToast("Error al cambiar estado", 'error');
    }
  };

  const handleUpdateTables = async () => {
      setLoading(true);
      try {
        await setDoc(doc(db, "store_config", "main"), { tableCount: Number(tableCount) }, { merge: true });
        showToast("Número de mesas actualizado", 'success');
      } catch (error) {
        showToast("Error al guardar mesas", 'error');
      }
      setLoading(false);
  };

  // 2. CARGAR DATOS
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

  const fetchUsers = async () => {
    const s = await getDocs(collection(db, "users"));
    setUsers(s.docs.map(d => ({ id: d.id, ...d.data() })));
  };

  const fetchOrders = async () => {
    const s = await getDocs(collection(db, "orders"));
    const data = s.docs.map(d => ({ id: d.id, ...d.data() }));
    data.sort((a, b) => {
        const dateA = a.createdAt?.toDate ? a.createdAt.toDate() : new Date(a.createdAt);
        const dateB = b.createdAt?.toDate ? b.createdAt.toDate() : new Date(b.createdAt);
        return dateB - dateA;
    });
    setOrders(data);
  };

  // 3. PDF
  const downloadReport = () => {
    try {
      const doc = new jsPDF();
      doc.text("Reporte Financiero - Snacks Lizama", 14, 20);
      doc.setFontSize(10);
      doc.text(`Generado el: ${new Date().toLocaleDateString()}`, 14, 26);
      const tableRows = orders.map(order => {
        const date = order.createdAt?.toDate ? order.createdAt.toDate().toLocaleDateString() : new Date(order.createdAt).toLocaleDateString();
        return [date, order.userName || 'Anónimo', order.type, `$${order.total}`, order.status];
      });
      autoTable(doc, { head: [['Fecha', 'Cliente', 'Tipo', 'Total', 'Estado']], body: tableRows, startY: 35 });
      const totalSales = orders.reduce((acc, curr) => acc + curr.total, 0);
      const finalY = (doc.lastAutoTable && doc.lastAutoTable.finalY) || 150;
      doc.setFontSize(14);
      doc.text(`Venta Total Histórica: $${totalSales}`, 14, finalY + 15);
      doc.save(`reporte_ventas_${new Date().toISOString().split('T')[0]}.pdf`);
      showToast("PDF descargado", 'success');
    } catch (error) { showToast("Error generando PDF", 'error'); }
  };

  // 4. PRODUCTOS
  const handleAddProduct = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      let imageUrl = '';
      if (imageFile) {
          const fd = new FormData();
          fd.append("file", imageFile);
          fd.append("upload_preset", UPLOAD_PRESET);
          const res = await fetch(`https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`, { method: "POST", body: fd });
          const data = await res.json();
          imageUrl = data.secure_url;
      }
      await addDoc(collection(db, "products"), { ...newProduct, price: Number(newProduct.price), image: imageUrl, createdAt: new Date() });
      showToast("Producto Agregado", 'success');
      setNewProduct({ name: '', price: '', category: 'hamburguesas', description: '', inStock: true });
      setImageFile(null);
      fetchProducts();
    } catch(err) { showToast("Error al guardar", 'error'); }
    setLoading(false);
  };

  const toggleProductStock = async (product) => {
      try {
          await updateDoc(doc(db, "products", product.id), { inStock: !product.inStock });
          showToast(`Producto ${!product.inStock ? 'Disponible' : 'Agotado'}`, 'success');
          fetchProducts();
      } catch (error) { showToast("Error", 'error'); }
  };

  const handleDeleteProduct = async (id) => {
      if(confirm("¿Seguro que quieres eliminar este producto?")) {
          await deleteDoc(doc(db, "products", id));
          fetchProducts();
          showToast("Producto eliminado", 'success');
      }
  }

  // 5. ROLES
  const handleUpdateRole = async (uid, role) => {
    if(window.confirm(`¿Cambiar rol a ${role}?`)) {
      await updateDoc(doc(db, "users", uid), { role });
      fetchUsers();
      showToast("Rol actualizado", 'success');
    }
  };

  const ROLES = ['cliente', 'admin', 'hamburguesero', 'productor', 'freidor', 'mesero 1', 'mesero 2', 'repartidor 1', 'repartidor 2'];
  const totalRevenue = orders.reduce((acc, order) => acc + order.total, 0);

  return (
    <div className="p-4 max-w-6xl mx-auto mb-20">
      
      {/* HEADER PRINCIPAL (Con soporte Dark Mode) */}
      <div className="flex justify-between items-center mb-6 bg-white dark:bg-gray-800 p-4 rounded-lg shadow border border-gray-200 dark:border-gray-700 transition-colors">
        <h1 className="text-2xl font-bold text-gray-800 dark:text-white">Panel de Administración</h1>
        <div className="flex items-center gap-3">
          <span className={`font-bold text-sm px-3 py-1 rounded-full ${isStoreOpen ? 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300' : 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300'}`}>
            {isStoreOpen ? '🟢 ABIERTO' : '🔴 CERRADO'}
          </span>
          <button onClick={toggleStore} className={`px-4 py-2 rounded text-white font-bold text-xs shadow ${isStoreOpen ? 'bg-red-500 hover:bg-red-600' : 'bg-green-500 hover:bg-green-600'}`}>
            {isStoreOpen ? 'Cerrar Local' : 'Abrir Local'}
          </button>
        </div>
      </div>

      {/* NAVEGACIÓN PESTAÑAS (Con soporte Dark Mode) */}
      <div className="flex border-b dark:border-gray-700 mb-6 overflow-x-auto bg-white dark:bg-gray-800 rounded-t-lg shadow-sm transition-colors">
        {['menu', 'roles', 'finanzas', 'config'].map((tab) => (
          <button key={tab} onClick={() => setActiveTab(tab)} className={`px-6 py-3 font-bold uppercase text-xs whitespace-nowrap border-b-4 transition-colors ${activeTab === tab ? 'border-orange-600 text-orange-600 bg-orange-50 dark:bg-gray-700 dark:text-orange-400' : 'border-transparent text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700'}`}>
            {tab === 'config' ? '⚙️ Config' : tab}
          </button>
        ))}
      </div>

      {/* --- PESTAÑA 1: MENÚ --- */}
      {activeTab === 'menu' && (
        <div className="grid md:grid-cols-3 gap-6">
            {/* Formulario (Dark Mode) */}
            <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md h-fit border dark:border-gray-700 transition-colors">
                <h2 className="font-bold text-lg mb-4 text-gray-700 dark:text-white border-b dark:border-gray-700 pb-2">Nuevo Producto</h2>
                <form onSubmit={handleAddProduct} className="flex flex-col gap-3">
                    <input type="text" placeholder="Nombre del producto" className="p-2 border dark:border-gray-600 rounded focus:border-orange-500 outline-none dark:bg-gray-700 dark:text-white" value={newProduct.name} onChange={e => setNewProduct({...newProduct, name: e.target.value})} required />
                    <input type="number" placeholder="Precio ($)" className="p-2 border dark:border-gray-600 rounded focus:border-orange-500 outline-none dark:bg-gray-700 dark:text-white" value={newProduct.price} onChange={e => setNewProduct({...newProduct, price: e.target.value})} required />
                    <select className="p-2 border dark:border-gray-600 rounded dark:bg-gray-700 dark:text-white" value={newProduct.category} onChange={e => setNewProduct({...newProduct, category: e.target.value})}>
                        <option value="hamburguesas">Hamburguesas</option>
                        <option value="alitas">Alitas</option>
                        <option value="boneless">Boneless</option>
                        <option value="pastas">Pastas</option>
                        <option value="snacks">Snacks</option>
                        <option value="bebidas">Bebidas</option>
                        <option value="box">Box Familiar</option>
                    </select>
                    <textarea placeholder="Descripción breve" className="p-2 border dark:border-gray-600 rounded focus:border-orange-500 outline-none dark:bg-gray-700 dark:text-white" value={newProduct.description} onChange={e => setNewProduct({...newProduct, description: e.target.value})} />
                    <label className="text-xs font-bold text-gray-500 dark:text-gray-400">Imagen:</label>
                    <input type="file" onChange={e => setImageFile(e.target.files[0])} className="text-xs dark:text-gray-300" />
                    <button disabled={loading} className="bg-green-600 text-white p-2 rounded hover:bg-green-700 font-bold shadow mt-2">{loading ? 'Subiendo...' : 'Guardar Producto'}</button>
                </form>
            </div>

            {/* Lista Inventario (Dark Mode) */}
            <div className="md:col-span-2 bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md border dark:border-gray-700 transition-colors">
                <h2 className="font-bold text-lg mb-4 text-gray-700 dark:text-white border-b dark:border-gray-700 pb-2">Inventario & Stock</h2>
                <div className="overflow-y-auto max-h-[600px] space-y-2 pr-2">
                    {products.map(p => (
                        <div key={p.id} className="flex items-center justify-between p-3 border dark:border-gray-700 rounded hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                            <div className="flex items-center gap-3">
                                <img src={p.image || 'https://via.placeholder.com/40'} className="w-12 h-12 rounded object-cover border dark:border-gray-600" />
                                <div>
                                    <p className="font-bold text-sm text-gray-800 dark:text-white">{p.name}</p>
                                    <p className="text-xs text-gray-500 dark:text-gray-400 font-mono">${p.price} • {p.category}</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-3">
                                <button onClick={() => toggleProductStock(p)} className={`px-3 py-1 rounded-full text-xs font-bold border transition-colors ${p.inStock ? 'bg-green-100 text-green-700 border-green-200 dark:bg-green-900 dark:text-green-300 dark:border-green-800' : 'bg-red-100 text-red-700 border-red-200 dark:bg-red-900 dark:text-red-300 dark:border-red-800'}`}>{p.inStock ? 'En Stock' : 'Agotado'}</button>
                                <button onClick={() => handleDeleteProduct(p.id)} className="text-gray-400 hover:text-red-500 p-2">🗑️</button>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
      )}

      {/* --- PESTAÑA 2: ROLES (Dark Mode) --- */}
      {activeTab === 'roles' && (
        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md overflow-x-auto border dark:border-gray-700 transition-colors">
           <h2 className="font-bold text-lg mb-4 text-gray-700 dark:text-white border-b dark:border-gray-700 pb-2">Gestión de Personal</h2>
           <table className="w-full text-left border-collapse">
             <thead>
                <tr className="bg-orange-50 dark:bg-gray-700 text-orange-800 dark:text-orange-300 text-xs uppercase tracking-wider">
                    <th className="p-3 rounded-tl-lg">Usuario</th>
                    <th className="p-3">Rol Actual</th>
                    <th className="p-3 rounded-tr-lg">Asignar Nuevo Rol</th>
                </tr>
             </thead>
             <tbody className="text-sm">
               {users.map(u => (
                 <tr key={u.id} className="border-b dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                   <td className="p-3">
                       <p className="font-bold text-gray-800 dark:text-white">{u.displayName || 'Sin Nombre'}</p>
                       <p className="text-xs text-gray-500 dark:text-gray-400">{u.email}</p>
                   </td>
                   <td className="p-3">
                       <span className="bg-gray-100 dark:bg-gray-600 px-2 py-1 rounded text-xs font-bold uppercase text-gray-600 dark:text-gray-200 border dark:border-gray-500">{u.role || 'cliente'}</span>
                   </td>
                   <td className="p-3">
                     <select onChange={(e) => handleUpdateRole(u.id, e.target.value)} value={u.role || 'cliente'} className="border dark:border-gray-600 p-2 rounded text-sm bg-white dark:bg-gray-700 dark:text-white focus:border-orange-500 outline-none cursor-pointer">
                       {ROLES.map(rol => <option key={rol} value={rol}>{rol.toUpperCase()}</option>)}
                     </select>
                   </td>
                 </tr>
               ))}
             </tbody>
           </table>
        </div>
      )}

      {/* --- PESTAÑA 3: FINANZAS (Dark Mode) --- */}
      {activeTab === 'finanzas' && (
        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md border dark:border-gray-700 transition-colors">
          <div className="flex flex-col md:flex-row justify-between items-center mb-6 gap-4">
            <div><h2 className="text-2xl font-bold text-gray-800 dark:text-white">Reporte Financiero</h2><p className="text-gray-500 dark:text-gray-400 text-sm">Historial completo de ventas</p></div>
            <div className="bg-green-50 dark:bg-green-900/30 p-4 rounded-xl border border-green-100 dark:border-green-800 text-center min-w-[200px]">
              <p className="text-xs text-green-600 dark:text-green-400 font-bold uppercase tracking-wider">Ingreso Total</p>
              <p className="text-3xl font-extrabold text-green-700 dark:text-green-300">${totalRevenue}</p>
            </div>
          </div>
          <div className="flex justify-end mb-4"><button onClick={downloadReport} className="bg-gray-800 dark:bg-gray-700 text-white px-4 py-2 rounded hover:bg-gray-700 dark:hover:bg-gray-600 flex items-center gap-2 text-sm font-bold shadow transition-transform active:scale-95">📄 Descargar Reporte PDF</button></div>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 text-xs uppercase">
                    <th className="p-3 rounded-tl-lg">Fecha</th><th className="p-3">Cliente</th><th className="p-3">Detalle</th><th className="p-3">Total</th><th className="p-3 rounded-tr-lg">Estado</th>
                </tr>
              </thead>
              <tbody className="text-sm">
                {orders.map((order) => (
                    <tr key={order.id} className="border-b dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                        <td className="p-3 text-gray-500 dark:text-gray-400 font-mono text-xs">{new Date(order.createdAt?.toDate ? order.createdAt.toDate() : order.createdAt).toLocaleDateString()}</td>
                        <td className="p-3"><p className="font-bold text-gray-700 dark:text-white">{order.userName || 'Anónimo'}</p><p className="text-xs text-gray-400">{order.userEmail}</p></td>
                        <td className="p-3"><span className="capitalize dark:text-gray-300">{order.type}</span><span className="text-xs text-gray-400 block">{order.paymentMethod}</span></td>
                        <td className="p-3 font-bold text-green-600 dark:text-green-400">${order.total}</td>
                        <td className="p-3"><span className={`px-2 py-1 rounded text-xs font-bold text-white ${order.status === 'completado' || order.status === 'entregado' ? 'bg-green-500' : order.status === 'cancelado' ? 'bg-red-500' : 'bg-yellow-500'}`}>{order.status}</span></td>
                    </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* --- PESTAÑA 4: CONFIG (Dark Mode) --- */}
      {activeTab === 'config' && (
          <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md max-w-lg border dark:border-gray-700 transition-colors">
              <h2 className="text-xl font-bold mb-4 text-gray-800 dark:text-white border-b dark:border-gray-700 pb-2">⚙️ Configuración del Restaurante</h2>
              <div className="mb-6">
                  <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">Cantidad de Mesas Disponibles</label>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">Define cuántas mesas aparecerán en el menú desplegable del carrito.</p>
                  <div className="flex gap-3 items-center">
                      <input type="number" min="1" max="100" value={tableCount} onChange={(e) => setTableCount(e.target.value)} className="border-2 border-gray-300 dark:border-gray-600 p-2 rounded-lg w-24 text-center font-bold text-xl focus:border-orange-500 outline-none dark:bg-gray-700 dark:text-white" />
                      <button onClick={handleUpdateTables} disabled={loading} className="bg-orange-600 text-white px-6 py-3 rounded-lg font-bold hover:bg-orange-700 shadow transition-transform active:scale-95 disabled:bg-gray-400">{loading ? 'Guardando...' : 'Actualizar Mesas'}</button>
                  </div>
              </div>
          </div>
      )}
    </div>
  );
}