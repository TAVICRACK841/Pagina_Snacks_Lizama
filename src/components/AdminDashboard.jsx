import { useState, useEffect } from 'react';
import { db } from '../firebase/config';
import { collection, addDoc, getDocs, doc, updateDoc, setDoc, onSnapshot, deleteDoc, query, orderBy } from 'firebase/firestore';
import { jsPDF } from "jspdf";
import autoTable from 'jspdf-autotable';
import { showToast } from '../stores/toastStore';
import { 
    FaTrash, FaEdit, FaFilePdf, FaTimes, FaCogs, FaMoneyBillWave, FaCamera, FaPalette, FaHeadset, FaEnvelope, FaCheckDouble, FaSnowflake, FaThermometerHalf, FaGlassWhiskey, FaCreditCard, FaUserTag 
} from 'react-icons/fa';
// Asegúrate de que este componente exista en la misma carpeta
import UserRoleEditor from './UserRoleEditor';

export default function AdminDashboard() {
  const [activeTab, setActiveTab] = useState('menu'); 
  const [loading, setLoading] = useState(false);
  const [isStoreOpen, setIsStoreOpen] = useState(true);
  
  // CONFIGURACIÓN
  const [tableCount, setTableCount] = useState(15); 
  const [accounts, setAccounts] = useState([]);
  const [newAccount, setNewAccount] = useState({ bank: 'BBVA', name: '', number: '' });
  const [storeLogo, setStoreLogo] = useState('');
  const [supportPhone, setSupportPhone] = useState(''); 
  
  // ESTADO DEL TEMA
  const [currentTheme, setCurrentTheme] = useState('normal');

  // GASTOS, PEDIDOS Y TICKETS
  const [expenses, setExpenses] = useState([]);
  const [newExpense, setNewExpense] = useState({ description: '', amount: '', date: new Date().toISOString().split('T')[0] });
  const [orders, setOrders] = useState([]); 
  const [users, setUsers] = useState([]);
  const [products, setProducts] = useState([]); 
  const [tickets, setTickets] = useState([]); 

  // IMAGENES
  const [imageFile, setImageFile] = useState(null);
  const [logoFile, setLogoFile] = useState(null);

  const CLOUD_NAME = import.meta.env.PUBLIC_CLOUDINARY_CLOUD_NAME || "dw5mio6d9"; 
  const UPLOAD_PRESET = import.meta.env.PUBLIC_CLOUDINARY_PRESET || "Snacks_Lizama"; 

  const CATEGORIES = [
      'hamburguesas', 'alitas', 'media alitas', 'boneless', 'media boneless',
      'tiras', 'media tiras', 'pasta con alitas', 'media pasta con alitas',
      'pasta con boneless', 'media pasta con boneless', 'pasta con tiras', 'media pasta con tiras',
      'perros calientes', 'papas', 'media papas', 'pasta', 'media pasta',
      'box familiar', 'mini box', 'embotellado', 'aguas naturales', 'frappe', 'jugo',
      'pasta con camarones', 'dedos de queso'
  ];

  const BANKS = ['BBVA', 'Santander', 'Banamex', 'Banorte', 'HSBC', 'Banco Azteca', 'Bancoppel', 'Spin by Oxxo', 'Nu', 'Transferencia', 'Otro'];

  // --- LISTA DE ROLES ACTUALIZADA (NOMBRES LIMPIOS) ---
  const ROLES_OPTIONS = [
      { id: 'admin', label: 'Administrador' },
      { id: 'hamburguesero', label: 'Hamburguesero' },
      { id: 'frappero', label: 'Frappero' }, 
      { id: 'productor', label: 'Productor' },
      { id: 'freidor', label: 'Freidor' },
      { id: 'mesero', label: 'Mesero' },
      { id: 'mesero 1', label: 'Mesero 1' },
      { id: 'mesero 2', label: 'Mesero 2' },
      { id: 'repartidor', label: 'Repartidor' },
      { id: 'repartidor 1', label: 'Repartidor 1' },
      { id: 'repartidor 2', label: 'Repartidor 2' },
      { id: 'cliente', label: 'Cliente' }
  ];

  const initialProductState = { 
      name: '', price: '', category: 'hamburguesas', description: '', inStock: true,
      allowsCustomization: true,
      standardIngredients: [], extras: [], sauceOptions: [], flavorOptions: [], 
      extraSauceNames: [], 
      isCountable: false, pricePerExtraPiece: 0, canSplitSauces: false, extraSaucePotPrice: 0, 
      allowMeatSwap: false, 
      allowExtraSnacks: false, extraSnackPrice: 0, standardIngredientsPrice: 0, 
      hasIceOption: false, 
      hasTempOption: false, 
      hasTapiocaOption: false, 
      tapiocaPrice: 0, 
      hasComboOption: false 
  };

  const [productForm, setProductForm] = useState(initialProductState);
  const [isEditing, setIsEditing] = useState(false);
  const [editId, setEditId] = useState(null);
  const [tempStandard, setTempStandard] = useState('');
  const [tempSauce, setTempSauce] = useState('');
  const [tempExtraSauce, setTempExtraSauce] = useState(''); 
  
  // ESTADO PARA EDICIÓN DE ROLES DE USUARIO
  const [editingUserRoles, setEditingUserRoles] = useState(null); // ID del usuario que se está editando

  useEffect(() => {
    const unsubMain = onSnapshot(doc(db, "store_config", "main"), (docSnap) => {
      if (docSnap.exists()) {
          const data = docSnap.data();
          setIsStoreOpen(data.isOpen);
          if (data.tableCount) setTableCount(data.tableCount);
          if (data.accounts) setAccounts(data.accounts);
          if (data.logo) setStoreLogo(data.logo);
          if (data.theme) setCurrentTheme(data.theme);
      }
    });

    const unsubPhone = onSnapshot(doc(db, "settings", "contact_info"), (docSnap) => {
        if (docSnap.exists()) {
            setSupportPhone(docSnap.data().phoneNumber || '');
        }
    });

    return () => { unsubMain(); unsubPhone(); };
  }, []);

  useEffect(() => {
    if (activeTab === 'menu') fetchProducts();
    if (activeTab === 'roles') fetchUsers();
    if (activeTab === 'finanzas') { fetchOrders(); fetchExpenses(); }
    if (activeTab === 'buzon') fetchTickets();
  }, [activeTab]);

  const addToList = (listName, value) => { if (!value) return; setProductForm({ ...productForm, [listName]: [...(productForm[listName] || []), value] }); };
  const removeFromList = (listName, index) => { const updatedList = productForm[listName].filter((_, i) => i !== index); setProductForm({ ...productForm, [listName]: updatedList }); };
  
  const addStandardIngredient = () => { addToList('standardIngredients', tempStandard.trim()); setTempStandard(''); };
  const addSauceOption = () => { addToList('sauceOptions', tempSauce.trim()); setTempSauce(''); };
  const addExtraSauceName = () => { addToList('extraSauceNames', tempExtraSauce.trim()); setTempExtraSauce(''); };
  
  const c = productForm.category;
  const isBurger = c === 'hamburguesas';
  const isHotDog = c === 'perros calientes';
  const isFrappe = c === 'frappe';
  const isAguas = c === 'aguas naturales';
  const isEmbotellado = c === 'embotellado';

  const needsCoatingSauces = ['hamburguesas', 'alitas', 'boneless', 'tiras', 'media alitas', 'media boneless', 'media tiras', 'pasta con alitas', 'pasta con boneless', 'pasta con tiras', 'media pasta con alitas', 'media pasta con boneless', 'media pasta con tiras', 'box familiar', 'mini box'].includes(c);
  const needsExtraSaucesConfig = ['hamburguesas', 'perros calientes', 'alitas', 'boneless', 'tiras', 'media alitas', 'media boneless', 'media tiras', 'pasta con alitas', 'pasta con boneless', 'pasta con tiras', 'media pasta con alitas', 'media pasta con boneless', 'media pasta con tiras', 'box familiar', 'mini box', 'dedos de queso'].includes(c);
  const needsPieceConfig = ['hamburguesas', 'alitas', 'boneless', 'tiras', 'media alitas', 'media boneless', 'media tiras', 'pasta con alitas', 'pasta con boneless', 'pasta con tiras', 'media pasta con alitas', 'media pasta con boneless', 'media pasta con tiras', 'box familiar', 'mini box', 'dedos de queso'].includes(c);
  const needsStandardIngredients = ['hamburguesas', 'box familiar', 'mini box'].includes(c);
  const isNoCustom = ['papas', 'media papas', 'pasta', 'media pasta', 'jugo'].includes(c);

  const handleSaveProduct = async (e) => { 
      e.preventDefault(); setLoading(true); 
      try { 
          let imageUrl = productForm.image; 
          if (imageFile) { 
              const fd = new FormData(); fd.append("file", imageFile); fd.append("upload_preset", UPLOAD_PRESET); 
              const res = await fetch(`https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`, { method: "POST", body: fd }); 
              const data = await res.json(); imageUrl = data.secure_url; 
          } 
          const productData = { ...productForm, price: Number(productForm.price), image: imageUrl || 'https://via.placeholder.com/150' };
          if (isEditing) { await updateDoc(doc(db, "products", editId), productData); showToast("Actualizado", 'success'); setIsEditing(false); setEditId(null); } 
          else { await addDoc(collection(db, "products"), { ...productData, createdAt: new Date() }); showToast("Creado", 'success'); }
          setProductForm(initialProductState); setImageFile(null); fetchProducts(); 
      } catch(err) { showToast("Error al guardar", 'error'); } 
      setLoading(false); 
  };

  const startEditProduct = (product) => { setProductForm({ ...initialProductState, ...product }); setEditId(product.id); setIsEditing(true); window.scrollTo({ top: 0, behavior: 'smooth' }); };
  const cancelEdit = () => { setProductForm(initialProductState); setIsEditing(false); setEditId(null); };
  const toggleProductStock = async (product) => { await updateDoc(doc(db, "products", product.id), { inStock: !product.inStock }); fetchProducts(); };
  const handleDeleteProduct = async (id) => { if(confirm("¿Eliminar?")) { await deleteDoc(doc(db, "products", id)); fetchProducts(); } };

  const fetchOrders = async () => { const q = query(collection(db, "orders"), orderBy("createdAt", "desc")); const s = await getDocs(q); setOrders(s.docs.map(d => ({ id: d.id, ...d.data() })).filter(o => ['completado', 'entregado'].includes(o.status))); };
  const fetchExpenses = async () => { const q = query(collection(db, "expenses"), orderBy("createdAt", "desc")); const s = await getDocs(q); setExpenses(s.docs.map(d => ({ id: d.id, ...d.data() }))); };
  
  const fetchTickets = async () => { const q = query(collection(db, "support_tickets"), orderBy("createdAt", "desc")); const s = await getDocs(q); setTickets(s.docs.map(d => ({ id: d.id, ...d.data() }))); };
  const markTicketAsRead = async (ticket) => { const newStatus = ticket.status === 'pending' ? 'resolved' : 'pending'; await updateDoc(doc(db, "support_tickets", ticket.id), { status: newStatus }); fetchTickets(); showToast(newStatus === 'resolved' ? "Marcado como atendido" : "Marcado como pendiente", "info"); };
  const deleteTicket = async (id) => { if(!confirm("¿Eliminar este mensaje?")) return; await deleteDoc(doc(db, "support_tickets", id)); fetchTickets(); showToast("Mensaje eliminado", "error"); };

  const handleAddExpense = async (e) => { e.preventDefault(); if (!newExpense.description || !newExpense.amount || !newExpense.date) return showToast("Faltan datos", "error"); const expenseDate = new Date(newExpense.date + 'T12:00:00'); await addDoc(collection(db, "expenses"), { ...newExpense, amount: Number(newExpense.amount), createdAt: expenseDate.toISOString() }); setNewExpense({ description: '', amount: '', date: new Date().toISOString().split('T')[0] }); fetchExpenses(); showToast("Gasto Agregado", "warning"); };
  const handleDeleteExpense = async (id) => { if(confirm("¿Borrar gasto?")) { await deleteDoc(doc(db, "expenses", id)); fetchExpenses(); } };
  const handleDeleteReport = async (ordersList, expensesList, dateLabel) => { if (!window.confirm(`¿Borrar historial del ${dateLabel}?`)) return; setLoading(true); try { await Promise.all([...ordersList.map(o => deleteDoc(doc(db, "orders", o.id))), ...expensesList.map(e => deleteDoc(doc(db, "expenses", e.id)))]); showToast("Eliminado", 'success'); fetchOrders(); fetchExpenses(); } catch (e) { showToast("Error", 'error'); } setLoading(false); };
  const generateDailyReport = (date, dailyOrders, dailyExpenses) => { const doc = new jsPDF(); doc.text(`Reporte - ${date}`, 14, 15); autoTable(doc, { head: [['Hora', 'Cliente', 'Tipo', 'Pago', 'Total']], body: dailyOrders.map(o => [new Date(o.createdAt).toLocaleTimeString(), o.userName, o.type, o.paymentMethod, `$${o.total}`]), startY: 20 }); const inc = dailyOrders.reduce((s,o)=>s+o.total,0); const exp = dailyExpenses.reduce((s,e)=>s+e.amount,0); let finalY = doc.lastAutoTable.finalY + 10; doc.text(`Ingresos: $${inc}`, 14, finalY); if(dailyExpenses.length>0){ finalY += 10; doc.text(`Gastos: -$${exp}`, 14, finalY); } finalY += 15; doc.text(`NETO: $${inc-exp}`, 14, finalY); doc.save(`Reporte_${date}.pdf`); };

  const handleLogoUpload = async () => { if (!logoFile) return; const fd = new FormData(); fd.append("file", logoFile); fd.append("upload_preset", UPLOAD_PRESET); const res = await fetch(`https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`, { method: "POST", body: fd }); const data = await res.json(); await setDoc(doc(db, "store_config", "main"), { logo: data.secure_url }, { merge: true }); showToast("Logo Actualizado", "success"); };
  
  const updateTheme = async (theme) => { setCurrentTheme(theme); await setDoc(doc(db, "store_config", "main"), { theme: theme }, { merge: true }); showToast(`Tema cambiado: ${theme}`, "success"); };
  const handleUpdatePhone = async () => { try { await setDoc(doc(db, "settings", "contact_info"), { phoneNumber: supportPhone }, { merge: true }); showToast("Teléfono de soporte actualizado", "success"); } catch (error) { console.error(error); showToast("Error al actualizar teléfono", "error"); } };
  
  const fetchProducts = async () => { const s = await getDocs(collection(db, "products")); const data = s.docs.map(d => ({ id: d.id, ...d.data() })); data.sort((a, b) => a.name.localeCompare(b.name)); setProducts(data); };
  const fetchUsers = async () => { const s = await getDocs(collection(db, "users")); setUsers(s.docs.map(d => ({ id: d.id, ...d.data() }))); };
  
  // --- FUNCIÓN EDITAR ROLES ---
  const startEditUserRoles = (user) => {
      setEditingUserRoles(user.id);
  };

  const saveUserRoles = async (uid, newRoles) => {
      try {
          const mainRole = newRoles.length > 0 ? newRoles[0] : 'cliente';
          await updateDoc(doc(db, "users", uid), { 
              roles: newRoles,
              role: mainRole 
          });
          fetchUsers();
          setEditingUserRoles(null);
          showToast("Roles actualizados", 'success');
      } catch (error) {
          showToast("Error al guardar roles", 'error');
      }
  };

  const toggleStore = async () => { try { const newState = !isStoreOpen; await setDoc(doc(db, "store_config", "main"), { isOpen: newState }, { merge: true }); showToast(newState ? "Local ABIERTO" : "Local CERRADO", newState ? 'success' : 'error'); } catch (error) { showToast("Error", 'error'); } };
  const handleUpdateConfig = async () => { setLoading(true); try { await setDoc(doc(db, "store_config", "main"), { tableCount: Number(tableCount), accounts: accounts }, { merge: true }); showToast("Guardado", 'success'); } catch (error) { showToast("Error", 'error'); } setLoading(false); };
  
  const handleAddAccount = async (e) => { e.preventDefault(); if(!newAccount.name || !newAccount.number) return showToast("Faltan datos", "error"); const updatedAccounts = [...accounts, { ...newAccount, id: Date.now() }]; setAccounts(updatedAccounts); try { await updateDoc(doc(db, "store_config", "main"), { accounts: updatedAccounts }); setNewAccount({ bank: 'BBVA', name: '', number: '' }); showToast("Cuenta agregada correctamente", "success"); } catch (error) { console.error(error); showToast("Error al guardar cuenta", "error"); } };
  const handleDeleteAccount = async (id) => { const updatedAccounts = accounts.filter(acc => acc.id !== id); setAccounts(updatedAccounts); try { await updateDoc(doc(db, "store_config", "main"), { accounts: updatedAccounts }); showToast("Cuenta eliminada", "info"); } catch (error) { console.error(error); showToast("Error al eliminar", "error"); } };

  const handleCardInput = (e) => { let val = e.target.value.replace(/\D/g, ''); if (val.length > 18) val = val.slice(0, 18); val = val.replace(/(\d{4})(?=\d)/g, '$1 '); setNewAccount({ ...newAccount, number: val }); };

  const groupedData = orders.reduce((acc, order) => { const date = new Date(order.createdAt).toLocaleDateString(); if (!acc[date]) acc[date] = { orders: [], expenses: [] }; acc[date].orders.push(order); return acc; }, {});
  expenses.forEach(exp => { const date = new Date(exp.createdAt).toLocaleDateString(); if (!groupedData[date]) groupedData[date] = { orders: [], expenses: [] }; groupedData[date].expenses.push(exp); });
  const sortedDates = Object.keys(groupedData).sort((a, b) => { const [dA, mA, yA] = a.split('/'); const [dB, mB, yB] = b.split('/'); return new Date(yB, mB - 1, dB) - new Date(yA, mA - 1, dA); });

  // --- COLORES DE ETIQUETAS MEJORADOS ---
  const getRoleBadgeColor = (role) => {
    switch(role) {
        case 'admin': return 'bg-red-900/50 text-red-300 border border-red-800';
        case 'cliente': return 'bg-blue-900/50 text-blue-300 border border-blue-800';
        case 'hamburguesero': case 'frappero': case 'freidor': case 'productor': return 'bg-yellow-900/50 text-yellow-300 border border-yellow-800';
        case 'mesero': case 'mesero 1': case 'mesero 2': case 'repartidor': case 'repartidor 1': case 'repartidor 2': return 'bg-green-900/50 text-green-300 border border-green-800';
        default: return 'bg-zinc-700 text-gray-300 border border-zinc-600';
    }
  };

  return (
    <div className="p-2 md:p-4 max-w-7xl mx-auto mb-20 w-full">
      
      {/* HEADER */}
      <div className="flex flex-col md:flex-row justify-between items-center mb-4 bg-zinc-800 p-4 rounded-lg shadow border border-zinc-700 gap-3">
        <h1 className="text-xl md:text-2xl font-bold text-white w-full md:w-auto text-center md:text-left">Panel Admin</h1>
        <div className="flex gap-3 w-full md:w-auto justify-center">
            <span className={`flex-1 md:flex-none font-bold text-xs md:text-sm px-3 py-2 rounded-full flex items-center justify-center ${isStoreOpen ? 'bg-green-900/50 text-green-400 border border-green-700' : 'bg-red-900/50 text-red-400 border border-red-700'}`}>{isStoreOpen ? '🟢 ABIERTO' : '🔴 CERRADO'}</span>
            <button onClick={toggleStore} className={`flex-1 md:flex-none px-4 py-2 rounded text-white font-bold text-xs shadow transition-colors ${isStoreOpen ? 'bg-red-600 hover:bg-red-700' : 'bg-green-600 hover:bg-green-700'}`}>{isStoreOpen ? 'Cerrar' : 'Abrir'}</button>
        </div>
      </div>

      <div className="flex border-b border-zinc-700 mb-6 overflow-x-auto whitespace-nowrap bg-zinc-800 rounded-t-lg shadow-sm">
        {['menu', 'roles', 'finanzas', 'buzon', 'config'].map((tab) => (
            <button key={tab} onClick={() => setActiveTab(tab)} className={`flex-shrink-0 px-6 py-3 font-bold uppercase text-xs border-b-4 transition ${activeTab === tab ? 'border-yellow-500 text-yellow-500 bg-zinc-700' : 'border-transparent text-gray-400 hover:bg-zinc-700 hover:text-white'}`}>{tab === 'buzon' ? '📩 BUZÓN' : tab}</button>
        ))}
      </div>

      {activeTab === 'menu' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* ... Formulario de productos (SIN CAMBIOS) ... */}
            <div className="bg-zinc-800 p-4 md:p-6 rounded-lg shadow-md h-fit border border-zinc-700">
                <div className="flex justify-between mb-4 border-b border-zinc-700 pb-2"><h2 className="font-bold text-lg text-white">{isEditing ? '✏️ Editando' : '➕ Nuevo Producto'}</h2>{isEditing && <button onClick={cancelEdit} className="text-red-400 text-xs underline">Cancelar</button>}</div>
                <form onSubmit={handleSaveProduct} className="flex flex-col gap-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <input placeholder="Nombre" className="p-3 border rounded bg-zinc-700 text-white border-zinc-600 w-full placeholder-gray-400" value={productForm.name} onChange={e => setProductForm({...productForm, name: e.target.value})} required />
                        <input type="number" placeholder="Precio Individual ($)" className="p-3 border rounded bg-zinc-700 text-white border-zinc-600 w-full placeholder-gray-400" value={productForm.price} onChange={e => setProductForm({...productForm, price: e.target.value})} required />
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <select className="p-3 border rounded bg-zinc-700 text-white border-zinc-600 uppercase text-xs w-full" value={productForm.category} onChange={e => setProductForm({...productForm, category: e.target.value})}>{CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}</select>
                        <input type="file" onChange={e => setImageFile(e.target.files[0])} className="text-xs text-gray-300 w-full" />
                    </div>
                    <textarea placeholder="Descripción" className="p-3 border rounded bg-zinc-700 text-white border-zinc-600 w-full placeholder-gray-400" value={productForm.description} onChange={e => setProductForm({...productForm, description: e.target.value})} />
                    {!isNoCustom && (
                        <div className="border rounded-lg p-3 md:p-4 bg-zinc-900/50 border-zinc-600 space-y-4">
                            <h4 className="font-bold text-sm text-white border-b border-zinc-600 pb-2 flex items-center gap-2"><FaCogs/> Personalización</h4>
                            {isBurger && (
                                <>
                                    <div className="flex items-center gap-2 mb-2 text-white text-sm bg-zinc-800 p-2 rounded border border-zinc-600">
                                        <input type="checkbox" checked={productForm.allowMeatSwap} onChange={e => setProductForm({...productForm, allowMeatSwap: e.target.checked})} className="w-4 h-4 accent-yellow-500" /> <span>¿Permitir elegir tipo de carne? (Pechuga/Tiras)</span>
                                    </div>
                                    <div className="flex items-center gap-2 mb-2 text-white text-sm bg-zinc-800 p-2 rounded border border-zinc-600">
                                        <input type="checkbox" checked={productForm.allowExtraSnacks} onChange={e => setProductForm({...productForm, allowExtraSnacks: e.target.checked})} className="w-4 h-4 accent-yellow-500" /> <span>¿Permitir agregar Piezas Extra? (Alitas/Boneless)</span>
                                    </div>
                                </>
                            )}
                            {isHotDog && (
                                <div className="bg-orange-900/30 p-3 rounded border border-orange-700/50 mb-2">
                                    <div className="flex items-center gap-2 mb-2 text-white text-sm font-bold">
                                        <input type="checkbox" checked={productForm.hasComboOption} onChange={e => setProductForm({...productForm, hasComboOption: e.target.checked})} /> Habilitar Opción de Combo
                                    </div>
                                </div>
                            )}
                            {needsStandardIngredients && (
                                <div className="bg-zinc-700 p-2 rounded border border-zinc-600">
                                    <p className="text-xs font-bold mb-1 text-white">Ingredientes Base (Ej: Cebolla, Tomate):</p>
                                    <div className="flex gap-2 mb-1"><input className="flex-1 p-2 border rounded text-xs w-full bg-zinc-600 text-white border-zinc-500" placeholder="Ej: Cebolla" value={tempStandard} onChange={e=>setTempStandard(e.target.value)}/><button type="button" onClick={addStandardIngredient} className="bg-blue-600 text-white px-3 rounded">+</button></div>
                                    <div className="flex flex-wrap gap-1 mb-2">{productForm.standardIngredients?.map((item,i)=><span key={i} className="text-xs bg-zinc-500 text-white px-2 py-1 rounded flex items-center gap-1">{item}<FaTimes onClick={()=>removeFromList('standardIngredients',i)} className="cursor-pointer"/></span>)}</div>
                                    <div className="flex flex-col md:flex-row items-start md:items-center gap-2 text-xs text-gray-300"><span className="">Precio Ingrediente Extra: $</span><input type="number" className="w-20 p-2 border rounded bg-zinc-600 text-white border-zinc-500" value={productForm.standardIngredientsPrice} onChange={e=>setProductForm({...productForm, standardIngredientsPrice:Number(e.target.value)})}/></div>
                                </div>
                            )}
                            {isFrappe && (
                                <div className="bg-purple-900/30 p-3 rounded border border-purple-700/50 mt-2">
                                    <p className="text-xs font-bold text-purple-200 mb-2 flex items-center gap-1"><FaGlassWhiskey/> Configuración Frappe</p>
                                    <div className="flex items-center gap-2 mb-2 text-white text-sm">
                                        <input type="checkbox" checked={productForm.hasTapiocaOption} onChange={e => setProductForm({...productForm, hasTapiocaOption: e.target.checked})} /> Habilitar Tapioca
                                    </div>
                                    {productForm.hasTapiocaOption && (
                                        <div className="flex items-center gap-2 text-xs text-gray-300">
                                            <span>Precio Extra Tapioca: $</span>
                                            <input type="number" className="w-20 p-1 rounded bg-zinc-700 text-white border border-zinc-600" value={productForm.tapiocaPrice} onChange={e=>setProductForm({...productForm, tapiocaPrice:Number(e.target.value)})}/>
                                        </div>
                                    )}
                                </div>
                            )}
                            {isAguas && (
                                <div className="bg-blue-900/30 p-3 rounded border border-blue-700/50 mt-2">
                                    <p className="text-xs font-bold text-blue-200 mb-2 flex items-center gap-1"><FaSnowflake/> Configuración Agua</p>
                                    <div className="flex items-center gap-2 text-white text-sm">
                                        <input type="checkbox" checked={productForm.hasIceOption} onChange={e => setProductForm({...productForm, hasIceOption: e.target.checked})} /> Habilitar elección de Hielo
                                    </div>
                                </div>
                            )}
                            {isEmbotellado && (
                                <div className="bg-cyan-900/30 p-3 rounded border border-cyan-700/50 mt-2">
                                    <p className="text-xs font-bold text-cyan-200 mb-2 flex items-center gap-1"><FaThermometerHalf/> Configuración Botella</p>
                                    <div className="flex items-center gap-2 text-white text-sm">
                                        <input type="checkbox" checked={productForm.hasTempOption} onChange={e => setProductForm({...productForm, hasTempOption: e.target.checked})} /> Habilitar elección Temperatura
                                    </div>
                                </div>
                            )}
                            {needsCoatingSauces && (
                                <div className="bg-zinc-700 p-2 rounded border border-zinc-600 mt-2">
                                    <p className="text-xs font-bold mb-1 text-white">Salsas para Bañar (Sabores):</p>
                                    <div className="flex gap-2 mb-1">
                                        <input className="flex-1 p-2 border rounded text-xs w-full bg-zinc-600 text-white border-zinc-500" placeholder="Ej: BBQ, Mango Habanero" value={tempSauce} onChange={e=>setTempSauce(e.target.value)}/>
                                        <button type="button" onClick={addSauceOption} className="bg-yellow-600 text-white px-3 rounded">+</button>
                                    </div>
                                    <div className="flex flex-wrap gap-1">
                                        {productForm.sauceOptions?.map((item,i)=>(
                                            <span key={i} className="text-xs bg-yellow-900/50 text-yellow-200 border border-yellow-700 px-2 py-1 rounded flex items-center gap-1">
                                                {item}<FaTimes onClick={()=>removeFromList('sauceOptions',i)} className="cursor-pointer"/>
                                            </span>
                                        ))}
                                    </div>
                                </div>
                            )}
                            {needsExtraSaucesConfig && (
                                <div className="bg-zinc-800 p-2 rounded border border-zinc-600 mt-3 relative overflow-hidden">
                                    <div className="absolute top-0 right-0 bg-green-700 text-white text-[9px] px-2 py-1 rounded-bl font-bold">EXTRAS</div>
                                    <p className="text-xs font-bold mb-1 text-white">🥣 Salsas Extras (Botecitos):</p>
                                    <div className="flex gap-2 mb-2 items-end">
                                        <div className="flex-1">
                                            <label className="text-[10px] text-gray-400">Nombres Disponibles:</label>
                                            <div className="flex gap-1">
                                                <input className="flex-1 p-2 border rounded text-xs bg-zinc-700 text-white border-zinc-500" placeholder="Ej: Ranch, Chipotle" value={tempExtraSauce} onChange={e=>setTempExtraSauce(e.target.value)}/>
                                                <button type="button" onClick={addExtraSauceName} className="bg-green-600 text-white px-3 rounded">+</button>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="flex flex-wrap gap-1 mb-2">
                                        {productForm.extraSauceNames?.map((item,i)=>(
                                            <span key={i} className="text-xs bg-green-900/50 text-green-200 border border-green-700 px-2 py-1 rounded flex items-center gap-1">
                                                {item}<FaTimes onClick={()=>removeFromList('extraSauceNames',i)} className="cursor-pointer"/>
                                            </span>
                                        ))}
                                    </div>
                                    <div className="flex items-center gap-2 text-xs text-gray-300 border-t border-zinc-600 pt-2">
                                        <span>Precio Botecito Extra: $</span>
                                        <input type="number" className="w-20 p-2 border rounded bg-zinc-700 text-white border-zinc-500 font-bold text-center" value={productForm.extraSaucePotPrice} onChange={e=>setProductForm({...productForm, extraSaucePotPrice:Number(e.target.value)})}/>
                                    </div>
                                </div>
                            )}
                            {needsPieceConfig && (
                                <div className="grid grid-cols-1 gap-2 text-xs text-gray-300 mt-2">
                                    <div className="flex items-center gap-2">
                                        <span>Precio Pieza Extra (Alita/Tira): $</span>
                                        <input type="number" className="flex-1 p-2 border rounded bg-zinc-600 text-white border-zinc-500" value={productForm.pricePerExtraPiece} onChange={e=>setProductForm({...productForm, pricePerExtraPiece:Number(e.target.value)})}/>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                    <button disabled={loading} className={`text-white p-3 rounded font-bold shadow w-full ${isEditing?'bg-blue-600':'bg-green-600'}`}>{loading?'...':(isEditing?'Actualizar':'Crear')}</button>
                </form>
            </div>
            
            <div className="bg-zinc-800 p-4 rounded-lg shadow-md border border-zinc-700">
                <h2 className="font-bold mb-4 text-white">Inventario</h2>
                <div className="overflow-y-auto max-h-[500px] md:max-h-[600px] space-y-2 pr-1">
                    {products.map(p => (
                        <div key={p.id} className="flex flex-col sm:flex-row justify-between sm:items-center p-3 border rounded border-zinc-700 gap-2 bg-zinc-900/50">
                            <div className="flex gap-3 items-center">
                                <img src={p.image} className="w-12 h-12 rounded object-cover border border-zinc-600 flex-shrink-0" />
                                <div><p className="font-bold text-sm text-white leading-tight">{p.name}</p><p className="text-xs text-gray-400">${p.price}</p></div>
                            </div>
                            <div className="flex gap-2 justify-end sm:justify-start">
                                <button onClick={()=>startEditProduct(p)} className="text-blue-400 p-2 bg-blue-900/30 rounded hover:bg-blue-900/50"><FaEdit/></button>
                                <button onClick={()=>toggleProductStock(p)} className={`px-2 py-1 text-[10px] rounded border uppercase font-bold ${p.inStock?'bg-green-900/30 text-green-400 border-green-800':'bg-red-900/30 text-red-400 border-red-800'}`}>{p.inStock?'Stock':'Agotado'}</button>
                                <button onClick={()=>handleDeleteProduct(p.id)} className="text-red-400 p-2 bg-red-900/30 rounded hover:bg-red-900/50"><FaTrash/></button>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
      )}

      {/* --- PESTAÑA ROLES ACTUALIZADA --- */}
      {activeTab === 'roles' && (
        <div className="bg-zinc-800 p-4 md:p-6 rounded-lg shadow-md border border-zinc-700">
           <h2 className="font-bold text-white mb-4 flex items-center gap-2"><FaUserTag /> Gestión de Roles y Permisos</h2>
           <div className="overflow-x-auto w-full">
             <table className="w-full text-left min-w-[600px] border-collapse">
               <thead>
                   <tr className="bg-zinc-700 text-yellow-400 text-xs">
                       <th className="p-3 rounded-tl-lg">Usuario</th>
                       <th className="p-3">Roles Activos</th>
                       <th className="p-3 rounded-tr-lg text-right">Acciones</th>
                   </tr>
               </thead>
               <tbody>
                   {users.map(u => {
                       const userRoles = u.roles || (u.role ? [u.role] : []);
                       const isEditingThisUser = editingUserRoles === u.id;

                       return (
                           <tr key={u.id} className="border-b border-zinc-700 hover:bg-zinc-700/30 transition group">
                               <td className="p-3 align-middle">
                                   <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-full bg-zinc-600 flex items-center justify-center text-lg font-bold text-yellow-500 border-2 border-zinc-500 overflow-hidden">
                                            {u.photoURL ? <img src={u.photoURL} className="w-full h-full object-cover"/> : u.displayName?.charAt(0).toUpperCase() || 'U'}
                                        </div>
                                        <div>
                                            <p className="font-bold text-white text-sm">{u.displayName || 'Sin Nombre'}</p>
                                            <p className="text-xs text-gray-400">{u.email}</p>
                                        </div>
                                   </div>
                               </td>
                               {/* SI SE ESTÁ EDITANDO, OCUPAMOS LAS DOS CELDAS RESTANTES CON EL EDITOR */}
                               {isEditingThisUser ? (
                                   <td colSpan="2" className="p-2">
                                        <UserRoleEditor 
                                            user={u}
                                            roleOptions={ROLES_OPTIONS}
                                            onSave={(newRoles) => saveUserRoles(u.id, newRoles)}
                                            onCancel={() => setEditingUserRoles(null)}
                                        />
                                   </td>
                               ) : (
                                   <>
                                       <td className="p-3 align-middle">
                                            <div className="flex flex-wrap gap-2">
                                                {userRoles.length > 0 ? userRoles.map(r => (
                                                    <span key={r} className={`px-3 py-1 rounded-full text-[10px] uppercase font-bold tracking-wider ${getRoleBadgeColor(r)} shadow-sm`}>
                                                        {r}
                                                    </span>
                                                )) : (
                                                    <span className="text-gray-500 text-xs italic">Sin roles asignados</span>
                                                )}
                                            </div>
                                       </td>
                                       <td className="p-3 align-middle text-right">
                                           <button 
                                                onClick={() => startEditUserRoles(u)} 
                                                className="text-yellow-500 hover:text-yellow-400 hover:bg-yellow-500/10 px-3 py-2 rounded-lg transition flex items-center gap-2 ml-auto font-bold text-xs border border-yellow-500/30 hover:border-yellow-500"
                                           >
                                               <FaUserTag /> Editar Roles
                                           </button>
                                       </td>
                                   </>
                               )}
                           </tr>
                       );
                   })}
               </tbody>
             </table>
           </div>
        </div>
      )}

      {/* RESTO DE TABS (FINANZAS, BUZON, CONFIG) SE MANTIENEN IGUAL... */}
      {activeTab === 'finanzas' && (
        <div className="space-y-6">
            <div className="bg-red-900/20 p-4 rounded-lg border border-red-800 flex flex-col gap-3">
                <span className="font-bold text-red-300 flex items-center gap-2"><FaMoneyBillWave/> Registrar Gasto:</span>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                    <input type="date" className="p-3 rounded border text-sm bg-zinc-700 text-white border-zinc-600 w-full" value={newExpense.date} onChange={e => setNewExpense({...newExpense, date: e.target.value})} />
                    <input placeholder="Descripción" className="p-3 rounded border text-sm w-full md:col-span-2 bg-zinc-700 text-white border-zinc-600 placeholder-gray-400" value={newExpense.description} onChange={e=>setNewExpense({...newExpense, description:e.target.value})}/>
                    <div className="flex gap-2">
                        <input type="number" placeholder="$" className="w-full p-3 rounded border text-sm bg-zinc-700 text-white border-zinc-600 placeholder-gray-400" value={newExpense.amount} onChange={e=>setNewExpense({...newExpense, amount:e.target.value})}/>
                        <button onClick={handleAddExpense} className="bg-red-600 text-white px-4 rounded font-bold hover:bg-red-700 flex-shrink-0">OK</button>
                    </div>
                </div>
            </div>

            {sortedDates.map(date => {
                const dayData = groupedData[date];
                const income = dayData.orders.reduce((sum, o) => sum + o.total, 0);
                const expenseSum = dayData.expenses.reduce((sum, e) => sum + e.amount, 0);
                const net = income - expenseSum;
                return (
                    <div key={date} className="bg-zinc-800 p-4 rounded-lg shadow-md border border-zinc-700">
                        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-4 border-b border-zinc-700 pb-4 gap-3">
                            <div><h3 className="text-xl font-bold text-white">{date}</h3><p className="text-sm text-gray-400">{dayData.orders.length} pedidos</p></div>
                            <div className="w-full md:w-auto flex flex-col md:items-end bg-zinc-700 p-2 rounded"><p className="text-sm text-green-400 font-bold">Ingreso: +${income}</p><p className="text-sm text-red-400 font-bold">Gastos: -${expenseSum}</p><p className={`text-xl font-black ${net >= 0 ? 'text-green-500' : 'text-red-500'}`}>Neto: ${net}</p></div>
                            <div className="flex gap-2 w-full md:w-auto"><button onClick={() => generateDailyReport(date, dayData.orders, dayData.expenses)} className="flex-1 bg-blue-600 text-white px-3 py-2 rounded flex justify-center items-center gap-2 hover:bg-blue-700"><FaFilePdf/> PDF</button><button onClick={() => handleDeleteReport(dayData.orders, dayData.expenses, date)} className="flex-1 bg-red-600 text-white px-3 py-2 rounded flex justify-center items-center gap-2 hover:bg-red-700"><FaTrash/></button></div>
                        </div>
                        {dayData.expenses.length > 0 && (<div className="mb-4 p-3 bg-red-900/20 rounded text-sm"><p className="font-bold text-red-300 mb-2">Gastos:</p>{dayData.expenses.map(exp => (<div key={exp.id} className="flex justify-between border-b border-red-800/50 last:border-0 py-2 text-gray-300"><span>{exp.description}</span><div className="flex gap-2 items-center"><span className="font-bold text-red-400">-${exp.amount}</span><button onClick={()=>handleDeleteExpense(exp.id)} className="text-red-400 p-1 hover:text-red-300"><FaTrash/></button></div></div>))}</div>)}
                        <div className="text-sm text-gray-400 max-h-40 overflow-y-auto">{dayData.orders.map(o => <div key={o.id} className="flex justify-between py-1 border-b border-zinc-700 last:border-0"><span>{new Date(o.createdAt).toLocaleTimeString()} - {o.userName}</span><span className="font-bold text-white">${o.total}</span></div>)}</div>
                    </div>
                );
            })}
        </div>
      )}

      {activeTab === 'buzon' && (
          <div className="bg-zinc-800 p-4 md:p-6 rounded-lg shadow-md border border-zinc-700">
              <h2 className="font-bold mb-4 text-white flex items-center gap-2"><FaEnvelope/> Buzón de Quejas y Soporte</h2>
              {tickets.length === 0 ? (
                  <p className="text-gray-400 text-center py-10">No hay mensajes pendientes.</p>
              ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {tickets.map(ticket => (
                          <div key={ticket.id} className={`p-4 rounded-xl border relative transition-all ${ticket.status === 'resolved' ? 'bg-zinc-900/50 border-zinc-700 opacity-75' : 'bg-zinc-700 border-yellow-500'}`}>
                               <div className="flex justify-between items-start mb-2">
                                   <span className="text-xs font-bold bg-zinc-900 px-2 py-1 rounded text-gray-300">{new Date(ticket.createdAt).toLocaleDateString()}</span>
                                   <div className="flex gap-2">
                                        <button onClick={() => markTicketAsRead(ticket)} className={`p-2 rounded-full ${ticket.status === 'resolved' ? 'text-green-500 hover:bg-green-900/20' : 'text-gray-400 hover:text-green-400 hover:bg-zinc-600'}`} title={ticket.status === 'resolved' ? "Marcar pendiente" : "Marcar atendido"}>
                                            <FaCheckDouble/>
                                        </button>
                                        <button onClick={() => deleteTicket(ticket.id)} className="p-2 rounded-full text-red-400 hover:bg-red-900/20 hover:text-red-300">
                                            <FaTrash/>
                                        </button>
                                   </div>
                               </div>
                               <h4 className="font-bold text-white text-sm break-words mb-1 flex items-center gap-2">
                                   <FaEnvelope className="text-yellow-500"/> {ticket.email}
                               </h4>
                               <p className="text-gray-300 text-sm italic bg-black/20 p-3 rounded mt-2 border border-white/5">
                                   "{ticket.message}"
                               </p>
                               {ticket.status === 'resolved' && (
                                   <span className="absolute bottom-2 right-2 text-[10px] text-green-500 font-bold uppercase border border-green-500 px-2 rounded">Atendido</span>
                               )}
                          </div>
                      ))}
                  </div>
              )}
          </div>
      )}

      {activeTab === 'config' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-zinc-800 p-4 md:p-6 rounded-lg shadow-md border border-zinc-700">
                  <h2 className="font-bold mb-4 text-white flex items-center gap-2"><FaCamera/> Logo & Tema</h2>
                  <div className="mb-4"><p className="text-xs mb-1 text-gray-300">Subir Logo:</p><div className="flex gap-2"><input type="file" onChange={e => setLogoFile(e.target.files[0])} className="text-xs w-full text-gray-300" /><button onClick={handleLogoUpload} className="bg-blue-600 text-white px-3 rounded text-xs whitespace-nowrap">Subir</button></div>{storeLogo && <img src={storeLogo} className="w-16 h-16 mt-2 object-contain bg-gray-100 rounded"/>}</div>
                  <div><p className="text-xs mb-2 flex items-center gap-1 text-gray-300"><FaPalette/> Tema:</p><div className="grid grid-cols-2 gap-2">{['normal', 'navidad', 'reyes', 'halloween'].map(t => (<button key={t} onClick={() => updateTheme(t)} className={`p-2 rounded capitalize text-xs border ${currentTheme === t ? 'bg-yellow-600 text-white border-yellow-500' : 'border-zinc-600 text-gray-300'}`}>{t}</button>))}</div></div>
              </div>
              
              <div className="bg-zinc-800 p-4 md:p-6 rounded-lg shadow-md border border-zinc-700">
                  <h2 className="font-bold mb-4 text-white">⚙️ Mesas & Cuentas</h2>
                  <div className="mb-4"><label className="text-xs block mb-1 text-gray-300">Cantidad Mesas:</label><input type="number" value={tableCount} onChange={(e) => setTableCount(e.target.value)} className="border p-2 rounded w-full md:w-20 text-center bg-zinc-700 text-white border-zinc-600" /></div>
                  <div className="border-t border-zinc-700 pt-4">
                      <form onSubmit={handleAddAccount} className="flex flex-col gap-2 mb-4">
                          <div className="flex gap-2">
                              <select value={newAccount.bank} onChange={e=>setNewAccount({...newAccount, bank: e.target.value})} className="border p-2 rounded w-1/3 bg-zinc-700 text-white border-zinc-600 text-xs focus:ring-1 focus:ring-yellow-500 outline-none">
                                  {BANKS.map(b => <option key={b} value={b}>{b}</option>)}
                              </select>
                              <input placeholder="Titular" value={newAccount.name} onChange={e=>setNewAccount({...newAccount, name: e.target.value})} className="border p-2 rounded flex-1 bg-zinc-700 text-white border-zinc-600 text-xs"/>
                          </div>
                          <div className="flex gap-2">
                              <input placeholder="Número" value={newAccount.number} onChange={handleCardInput} className="border p-2 rounded flex-1 bg-zinc-700 text-white border-zinc-600 text-xs"/><button className="bg-blue-600 text-white px-3 rounded">+</button>
                          </div>
                      </form>
                      <div className="space-y-2">{accounts.map(acc => <div key={acc.id} className="flex justify-between p-2 border rounded border-zinc-600 text-gray-300 text-xs"><span><FaCreditCard className="inline mr-1 text-yellow-500"/> {acc.bank} - {acc.number} <span className="text-gray-500">({acc.name})</span></span><FaTrash className="cursor-pointer text-red-400" onClick={()=>handleDeleteAccount(acc.id)}/></div>)}</div>
                  </div>
              </div>

              <div className="bg-zinc-800 p-4 md:p-6 rounded-lg shadow-md border border-zinc-700 col-span-1 md:col-span-2">
                  <h2 className="font-bold mb-4 text-white flex items-center gap-2"><FaHeadset/> Contacto & Soporte</h2>
                  <div className="flex flex-col gap-2">
                      <p className="text-xs text-gray-300">Este número aparecerá en el botón de ayuda del cliente:</p>
                      <div className="flex gap-2">
                          <input type="tel" placeholder="Ej: 9991234567" value={supportPhone} onChange={(e) => setSupportPhone(e.target.value)} className="border p-3 rounded w-full bg-zinc-700 text-white border-zinc-600" />
                          <button onClick={handleUpdatePhone} className="bg-yellow-600 text-white px-4 rounded font-bold hover:bg-yellow-700">Actualizar</button>
                      </div>
                  </div>
              </div>

              <button onClick={handleUpdateConfig} disabled={loading} className="col-span-1 md:col-span-2 bg-green-600 text-white py-3 rounded font-bold shadow hover:bg-green-700 w-full">Guardar Configuración General</button>
          </div>
      )}
    </div>
  );
}