import { useState, useEffect } from 'react';
import { db } from '../firebase/config';
import { collection, addDoc, getDocs, doc, updateDoc, setDoc, onSnapshot, query, deleteDoc } from 'firebase/firestore';
import { jsPDF } from "jspdf";
import autoTable from 'jspdf-autotable';
import { showToast } from '../stores/toastStore';
// IMPORTAMOS LA CONFIGURACIÓN DE MESAS
import { getTableCount, updateTableCount } from '../firebase/tablesConfig';

export default function AdminDashboard() {
  const [activeTab, setActiveTab] = useState('menu');
  const [loading, setLoading] = useState(false);
  const [isStoreOpen, setIsStoreOpen] = useState(true);
  
  // Estado para las mesas
  const [tableCount, setTableCount] = useState(10);

  const CLOUD_NAME = "dw5mio6d9"; 
  const UPLOAD_PRESET = "Snacks_Lizama"; 

  const [newProduct, setNewProduct] = useState({
    name: '', price: '', category: 'hamburguesas', description: '', inStock: true
  });
  const [imageFile, setImageFile] = useState(null);
  
  const [users, setUsers] = useState([]);
  const [orders, setOrders] = useState([]);
  const [products, setProducts] = useState([]); 

  // 1. CARGAR DATOS INICIALES
  useEffect(() => {
    const unsub = onSnapshot(doc(db, "store_config", "main"), (docSnap) => {
      if (docSnap.exists()) setIsStoreOpen(docSnap.data().isOpen);
    });
    
    // Cargar número de mesas actual
    getTableCount().then(val => setTableCount(val));

    return () => unsub();
  }, []);

  const toggleStore = async () => {
    try {
      const newState = !isStoreOpen;
      await setDoc(doc(db, "store_config", "main"), { isOpen: newState }, { merge: true });
      showToast(newState ? "Local ABIERTO" : "Local CERRADO", 'success');
    } catch (error) {
      showToast("Error al cambiar estado", 'error');
    }
  };

  const handleUpdateTables = async () => {
      setLoading(true);
      const success = await updateTableCount(Number(tableCount));
      if (success) showToast("Número de mesas actualizado", 'success');
      else showToast("Error al actualizar mesas", 'error');
      setLoading(false);
  };

  // 2. LOGICA DE PESTAÑAS
  useEffect(() => {
    if (activeTab === 'menu') fetchProducts();
    if (activeTab === 'roles') fetchUsers();
    if (activeTab === 'finanzas') fetchOrders();
  }, [activeTab]);

  const fetchProducts = async () => {
    const s = await getDocs(collection(db, "products"));
    setProducts(s.docs.map(d => ({ id: d.id, ...d.data() })));
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
        return [date, order.userEmail || 'Anonimo', order.type, `$${order.total}`, order.status];
      });

      autoTable(doc, { head: [['Fecha', 'Cliente', 'Tipo', 'Total', 'Estado']], body: tableRows, startY: 35 });

      const totalSales = orders.reduce((acc, curr) => acc + curr.total, 0);
      const finalY = (doc.lastAutoTable && doc.lastAutoTable.finalY) || 150;
      doc.setFontSize(14);
      doc.text(`Venta Total: $${totalSales}`, 14, finalY + 15);
      doc.save(`reporte.pdf`);
    } catch (error) { console.error(error); }
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
    } catch(err) { showToast("Error", 'error'); }
    setLoading(false);
  };

  const toggleProductStock = async (product) => {
      try {
          await updateDoc(doc(db, "products", product.id), { inStock: !product.inStock });
          showToast("Stock actualizado", 'success');
          fetchProducts();
      } catch (error) { showToast("Error", 'error'); }
  };

  const handleDeleteProduct = async (id) => {
      if(confirm("¿Eliminar producto?")) {
          await deleteDoc(doc(db, "products", id));
          fetchProducts();
          showToast("Eliminado", 'success');
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
      
      {/* HEADER */}
      <div className="flex justify-between items-center mb-6 bg-white p-4 rounded-lg shadow border">
        <h1 className="text-2xl font-bold text-gray-800">Panel Admin</h1>
        <div className="flex items-center gap-3">
          <span className={`font-bold text-sm ${isStoreOpen ? 'text-green-600' : 'text-red-600'}`}>{isStoreOpen ? '🟢 ABIERTO' : '🔴 CERRADO'}</span>
          <button onClick={toggleStore} className={`px-4 py-2 rounded text-white font-bold text-xs ${isStoreOpen ? 'bg-red-500' : 'bg-green-500'}`}>
            {isStoreOpen ? 'Cerrar' : 'Abrir'}
          </button>
        </div>
      </div>

      {/* PESTAÑAS (Aquí agregué CONFIG) */}
      <div className="flex border-b mb-6 overflow-x-auto bg-white rounded-t-lg shadow-sm">
        {['menu', 'roles', 'finanzas', 'config'].map((tab) => (
          <button key={tab} onClick={() => setActiveTab(tab)} className={`px-6 py-3 font-bold uppercase text-xs whitespace-nowrap ${activeTab === tab ? 'border-b-4 border-orange-600 text-orange-600 bg-orange-50' : 'text-gray-500'}`}>
            {tab}
          </button>
        ))}
      </div>

      {/* --- PESTAÑA MENÚ --- */}
      {activeTab === 'menu' && (
        <div className="grid md:grid-cols-3 gap-6">
            <div className="bg-white p-6 rounded-lg shadow-md h-fit">
                <h2 className="font-bold text-lg mb-4">Agregar Producto</h2>
                <form onSubmit={handleAddProduct} className="flex flex-col gap-3">
                    <input type="text" placeholder="Nombre" className="p-2 border rounded" value={newProduct.name} onChange={e => setNewProduct({...newProduct, name: e.target.value})} required />
                    <input type="number" placeholder="Precio" className="p-2 border rounded" value={newProduct.price} onChange={e => setNewProduct({...newProduct, price: e.target.value})} required />
                    <select className="p-2 border rounded" value={newProduct.category} onChange={e => setNewProduct({...newProduct, category: e.target.value})}>
                        <option value="hamburguesas">Hamburguesas</option>
                        <option value="alitas">Alitas</option>
                        <option value="boneless">Boneless</option>
                        <option value="pastas">Pastas</option>
                        <option value="snacks">Snacks</option>
                        <option value="bebidas">Bebidas</option>
                        <option value="box">Box Familiar</option>
                    </select>
                    <textarea placeholder="Descripción" className="p-2 border rounded" value={newProduct.description} onChange={e => setNewProduct({...newProduct, description: e.target.value})} />
                    <input type="file" onChange={e => setImageFile(e.target.files[0])} className="p-2 border text-xs" />
                    <button disabled={loading} className="bg-green-600 text-white p-2 rounded hover:bg-green-700 font-bold">{loading ? 'Subiendo...' : 'Guardar'}</button>
                </form>
            </div>
            <div className="md:col-span-2 bg-white p-6 rounded-lg shadow-md">
                <h2 className="font-bold text-lg mb-4">Inventario</h2>
                <div className="overflow-y-auto max-h-[500px] space-y-2">
                    {products.map(p => (
                        <div key={p.id} className="flex items-center justify-between p-3 border rounded hover:bg-gray-50">
                            <div className="flex items-center gap-3">
                                <img src={p.image || 'https://via.placeholder.com/40'} className="w-10 h-10 rounded object-cover" />
                                <div><p className="font-bold text-sm">{p.name}</p><p className="text-xs text-gray-500">${p.price}</p></div>
                            </div>
                            <div className="flex items-center gap-2">
                                <button onClick={() => toggleProductStock(p)} className={`px-3 py-1 rounded text-xs font-bold ${p.inStock ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>{p.inStock ? 'En Stock' : 'Agotado'}</button>
                                <button onClick={() => handleDeleteProduct(p.id)} className="text-gray-400 hover:text-red-500 px-2">🗑️</button>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
      )}

      {/* --- PESTAÑA ROLES --- */}
      {activeTab === 'roles' && (
        <div className="bg-white p-6 rounded-lg shadow-md overflow-x-auto">
           <h2 className="font-bold text-lg mb-4">Personal</h2>
           <table className="w-full text-left">
             <thead><tr className="bg-orange-100 text-sm"><th>Usuario</th><th>Rol</th><th>Cambiar</th></tr></thead>
             <tbody>
               {users.map(u => (
                 <tr key={u.id} className="border-b hover:bg-gray-50">
                   <td className="p-3"><p className="font-bold text-sm">{u.displayName}</p><p className="text-xs text-gray-500">{u.email}</p></td>
                   <td className="p-3 uppercase font-bold text-xs text-orange-600">{u.role || 'cliente'}</td>
                   <td className="p-3">
                     <select onChange={(e) => handleUpdateRole(u.id, e.target.value)} value={u.role || 'cliente'} className="border p-1 rounded text-sm bg-white">
                       {ROLES.map(rol => <option key={rol} value={rol}>{rol.toUpperCase()}</option>)}
                     </select>
                   </td>
                 </tr>
               ))}
             </tbody>
           </table>
        </div>
      )}

      {/* --- PESTAÑA FINANZAS --- */}
      {activeTab === 'finanzas' && (
        <div className="bg-white p-6 rounded-lg shadow-md">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold">Finanzas</h2>
            <div className="text-right"><p className="text-xs text-gray-500">TOTAL</p><p className="text-3xl font-extrabold text-green-600">${totalRevenue}</p></div>
          </div>
          <button onClick={downloadReport} className="mb-4 bg-gray-800 text-white px-4 py-2 rounded text-sm font-bold shadow">📄 Descargar PDF</button>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead><tr className="bg-gray-100 text-xs uppercase"><th className="p-3">Fecha</th><th className="p-3">Total</th><th className="p-3">Estado</th></tr></thead>
              <tbody className="text-sm">
                {orders.map((order) => (
                    <tr key={order.id} className="border-b">
                        <td className="p-3 text-gray-500">{new Date(order.createdAt?.toDate ? order.createdAt.toDate() : order.createdAt).toLocaleDateString()}</td>
                        <td className="p-3 font-bold text-green-600">${order.total}</td>
                        <td className="p-3"><span className="px-2 py-1 bg-yellow-100 text-yellow-800 rounded text-xs font-bold">{order.status}</span></td>
                    </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* --- PESTAÑA CONFIGURACIÓN (AQUÍ ESTÁ LO DE LAS MESAS) --- */}
      {activeTab === 'config' && (
          <div className="bg-white p-6 rounded-lg shadow-md max-w-md">
              <h2 className="text-xl font-bold mb-4 text-gray-800">⚙️ Configuración General</h2>
              
              <div className="mb-6">
                  <label className="block text-sm font-bold text-gray-700 mb-2">Cantidad de Mesas Disponibles</label>
                  <p className="text-xs text-gray-500 mb-3">Define cuántas mesas aparecerán en el carrito de los clientes.</p>
                  <div className="flex gap-2">
                      <input 
                          type="number" 
                          min="1" 
                          max="100"
                          value={tableCount}
                          onChange={(e) => setTableCount(e.target.value)}
                          className="border p-2 rounded w-24 text-center font-bold text-lg"
                      />
                      <button 
                          onClick={handleUpdateTables}
                          disabled={loading}
                          className="bg-orange-600 text-white px-4 py-2 rounded font-bold hover:bg-orange-700"
                      >
                          {loading ? 'Guardando...' : 'Actualizar'}
                      </button>
                  </div>
              </div>
          </div>
      )}

    </div>
  );
}