import { useState, useEffect } from 'react';
import { db } from '../firebase/config';
import { collection, addDoc, getDocs, doc, updateDoc, setDoc, onSnapshot, query, orderBy } from 'firebase/firestore';
import { jsPDF } from "jspdf";
import autoTable from 'jspdf-autotable';

export default function AdminDashboard() {
  const [activeTab, setActiveTab] = useState('menu');
  const [loading, setLoading] = useState(false);
  const [isStoreOpen, setIsStoreOpen] = useState(true);
  
  // --- TUS DATOS DE CLOUDINARY ---
  const CLOUD_NAME = "dw5mio6d9"; 
  const UPLOAD_PRESET = "Snacks_Lizama"; 
  // -------------------------------

  const [newProduct, setNewProduct] = useState({
    name: '', price: '', category: 'hamburguesas', description: '', inStock: true
  });
  const [imageFile, setImageFile] = useState(null);
  const [users, setUsers] = useState([]);
  const [orders, setOrders] = useState([]);

  // 1. CARGAR ESTADO DE LA TIENDA (ABIERTO/CERRADO)
  useEffect(() => {
    const unsub = onSnapshot(doc(db, "store_config", "main"), (docSnap) => {
      if (docSnap.exists()) setIsStoreOpen(docSnap.data().isOpen);
    });
    return () => unsub();
  }, []);

  const toggleStore = async () => {
    const newState = !isStoreOpen;
    await setDoc(doc(db, "store_config", "main"), { isOpen: newState }, { merge: true });
  };

  // 2. LOGICA DE PESTAÑAS
  useEffect(() => {
    if (activeTab === 'roles') fetchUsers();
    if (activeTab === 'finanzas') fetchOrders();
  }, [activeTab]);

  const fetchUsers = async () => {
    const s = await getDocs(collection(db, "users"));
    setUsers(s.docs.map(d => ({ id: d.id, ...d.data() })));
  };

  const fetchOrders = async () => {
    const q = query(collection(db, "orders"), orderBy("createdAt", "desc"));
    const s = await getDocs(q);
    setOrders(s.docs.map(d => ({ id: d.id, ...d.data() })));
  };

  // 3. GENERAR PDF
  const downloadReport = () => {
    try {
      const doc = new jsPDF();
      doc.text("Reporte Financiero - Snacks Lizama", 14, 20);
      
      const tableRows = orders.map(order => [
        new Date(order.createdAt).toLocaleDateString(),
        order.userEmail,
        order.type,
        `$${order.total}`,
        order.status
      ]);

      // Usamos la función importada directamente para evitar fallos
      autoTable(doc, {
        head: [['Fecha', 'Cliente', 'Tipo', 'Total', 'Estado']],
        body: tableRows,
        startY: 30,
      });

      const totalSales = orders.reduce((acc, curr) => acc + curr.total, 0);
      
      // Calculamos dónde terminó la tabla para poner el total abajo
      // (lastAutoTable.finalY a veces falla, así que usamos una posición fija o segura)
      const finalY = (doc.lastAutoTable && doc.lastAutoTable.finalY) || 150;
      
      doc.text(`Venta Total Histórica: $${totalSales}`, 14, finalY + 10);

      doc.save("reporte_financiero.pdf");
    } catch (error) {
      console.error("Error al generar PDF:", error);
      alert("Hubo un error al generar el PDF. Revisa la consola (F12).");
    }
  };

  // ... (Funciones de Productos y Roles se mantienen igual que antes) ...
  const handleUpdateRole = async (uid, role) => {
    if(window.confirm(`Cambiar rol a ${role}?`)) {
      await updateDoc(doc(db, "users", uid), { role });
      fetchUsers();
    }
  };

  const handleAddProduct = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const fd = new FormData();
      fd.append("file", imageFile);
      fd.append("upload_preset", UPLOAD_PRESET);
      const res = await fetch(`https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`, { method: "POST", body: fd });
      const data = await res.json();
      await addDoc(collection(db, "products"), { ...newProduct, price: Number(newProduct.price), image: data.secure_url, createdAt: new Date() });
      alert("Producto Agregado");
      setNewProduct({ name: '', price: '', category: 'hamburguesas', description: '', inStock: true });
    } catch(err) { alert("Error al subir"); }
    setLoading(false);
  };

  // CALCULO TOTAL FINANZAS
  const totalRevenue = orders.reduce((acc, order) => acc + order.total, 0);

  return (
    <div className="p-4 max-w-6xl mx-auto">
      
      {/* CABECERA CON INTERRUPTOR */}
      <div className="flex justify-between items-center mb-6 bg-white p-4 rounded-lg shadow">
        <h1 className="text-2xl font-bold text-gray-800">Panel de Control</h1>
        <div className="flex items-center gap-3">
          <span className={`font-bold ${isStoreOpen ? 'text-green-600' : 'text-red-600'}`}>
            {isStoreOpen ? '🟢 LOCAL ABIERTO' : '🔴 LOCAL CERRADO'}
          </span>
          <button 
            onClick={toggleStore}
            className={`px-4 py-2 rounded text-white font-bold ${isStoreOpen ? 'bg-red-500 hover:bg-red-600' : 'bg-green-500 hover:bg-green-600'}`}
          >
            {isStoreOpen ? 'Cerrar Local' : 'Abrir Local'}
          </button>
        </div>
      </div>

      <div className="flex border-b mb-6 overflow-x-auto bg-white rounded-t-lg shadow-sm">
        {['menu', 'roles', 'finanzas'].map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-8 py-4 font-bold uppercase text-sm whitespace-nowrap ${activeTab === tab ? 'border-b-4 border-orange-600 text-orange-600 bg-orange-50' : 'text-gray-500'}`}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* PESTAÑA MENU */}
      {activeTab === 'menu' && (
        <div className="bg-white p-6 rounded-lg shadow-md">
          <h2 className="font-bold text-xl mb-4">Nuevo Producto</h2>
          <form onSubmit={handleAddProduct} className="flex flex-col gap-4">
             <input type="text" placeholder="Nombre" className="p-2 border rounded" value={newProduct.name} onChange={e => setNewProduct({...newProduct, name: e.target.value})} />
             <input type="number" placeholder="Precio" className="p-2 border rounded" value={newProduct.price} onChange={e => setNewProduct({...newProduct, price: e.target.value})} />
             <select className="p-2 border rounded" value={newProduct.category} onChange={e => setNewProduct({...newProduct, category: e.target.value})}>
                <option value="hamburguesas">Hamburguesas</option>
                <option value="alitas">Alitas</option>
                <option value="bebidas">Bebidas</option>
             </select>
             <input type="file" onChange={e => setImageFile(e.target.files[0])} className="p-2 border" />
             <button disabled={loading} className="bg-green-600 text-white p-2 rounded">{loading ? 'Subiendo...' : 'Guardar'}</button>
          </form>
        </div>
      )}

      {/* PESTAÑA ROLES */}
      {activeTab === 'roles' && (
        <div className="bg-white p-6 rounded-lg shadow-md">
           <h2 className="font-bold text-xl mb-4">Personal</h2>
           <table className="w-full text-left">
             <thead><tr className="bg-orange-100"><th>Email</th><th>Rol</th><th>Cambiar</th></tr></thead>
             <tbody>
               {users.map(u => (
                 <tr key={u.id} className="border-b">
                   <td className="p-3">{u.email}</td>
                   <td className="p-3 uppercase font-bold text-xs">{u.role}</td>
                   <td className="p-3">
                     <select onChange={(e) => handleUpdateRole(u.id, e.target.value)} defaultValue={u.role} className="border p-1 rounded">
                       <option value="cliente">Cliente</option>
                       <option value="admin">Admin</option>
                       <option value="hamburguesero">Hamburguesero</option>
                       <option value="mesero">Mesero</option>
                     </select>
                   </td>
                 </tr>
               ))}
             </tbody>
           </table>
        </div>
      )}

      {/* PESTAÑA FINANZAS (FINAL) */}
      {activeTab === 'finanzas' && (
        <div className="bg-white p-6 rounded-lg shadow-md">
          <div className="flex justify-between items-center mb-6">
            <div>
              <h2 className="text-2xl font-bold text-gray-800">Reporte Financiero</h2>
              <p className="text-gray-500">Historial completo de pedidos</p>
            </div>
            <div className="text-right">
              <p className="text-sm text-gray-500">Venta Total</p>
              <p className="text-3xl font-extrabold text-green-600">${totalRevenue}</p>
            </div>
          </div>

          <button 
            onClick={downloadReport}
            className="mb-4 bg-gray-800 text-white px-4 py-2 rounded hover:bg-gray-700 flex items-center gap-2"
          >
            📄 Descargar PDF
          </button>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-100 text-gray-700">
                  <th className="p-3">Fecha</th>
                  <th className="p-3">Cliente</th>
                  <th className="p-3">Tipo</th>
                  <th className="p-3">Pago</th>
                  <th className="p-3">Total</th>
                  <th className="p-3">Estado</th>
                </tr>
              </thead>
              <tbody>
                {orders.map((order) => (
                  <tr key={order.id} className="border-b hover:bg-gray-50">
                    <td className="p-3">{new Date(order.createdAt).toLocaleDateString()}</td>
                    <td className="p-3 text-sm">{order.userEmail}</td>
                    <td className="p-3 capitalize">{order.type}</td>
                    <td className="p-3 capitalize">{order.paymentMethod}</td>
                    <td className="p-3 font-bold text-green-600">${order.total}</td>
                    <td className="p-3">
                      <span className={`px-2 py-1 rounded text-xs text-white ${order.status === 'completado' ? 'bg-green-500' : 'bg-yellow-500'}`}>
                        {order.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}