import { useState, useEffect } from 'react';
import { db } from '../firebase/config';
import { collection, addDoc, getDocs, doc, updateDoc, setDoc, onSnapshot, deleteDoc, query, orderBy } from 'firebase/firestore';
import { jsPDF } from "jspdf";
import autoTable from 'jspdf-autotable';
import { showToast } from '../stores/toastStore';
import { 
    FaTrash, FaEdit, FaFilePdf, FaPlus, FaTimes, FaCogs, FaListUl, 
    FaUtensils, FaHamburger, FaDrumstickBite, FaPepperHot, FaIceCream, FaWineBottle, FaMoneyBillWave, FaCamera, FaPalette, FaBoxOpen 
} from 'react-icons/fa';

export default function AdminDashboard() {
  const [activeTab, setActiveTab] = useState('menu'); // Inicia en Menú por defecto
  const [loading, setLoading] = useState(false);
  const [isStoreOpen, setIsStoreOpen] = useState(true);
  
  // CONFIGURACIÓN GENERAL
  const [tableCount, setTableCount] = useState(15); 
  const [accounts, setAccounts] = useState([]);
  const [cardDepositId, setCardDepositId] = useState(null); 
  const [newAccount, setNewAccount] = useState({ bank: 'BBVA', name: '', number: '' });
  const [storeLogo, setStoreLogo] = useState('');
  const [currentTheme, setCurrentTheme] = useState('normal');

  // GASTOS Y PEDIDOS (HISTORIAL)
  const [expenses, setExpenses] = useState([]);
  const [newExpense, setNewExpense] = useState({ description: '', amount: '' });
  const [orders, setOrders] = useState([]); // Solo para Finanzas (Historial)
  const [users, setUsers] = useState([]);
  const [products, setProducts] = useState([]); 

  // IMAGENES
  const [imageFile, setImageFile] = useState(null);
  const [logoFile, setLogoFile] = useState(null);

  const CLOUD_NAME = import.meta.env.PUBLIC_CLOUDINARY_CLOUD_NAME || "dw5mio6d9"; 
  const UPLOAD_PRESET = import.meta.env.PUBLIC_CLOUDINARY_PRESET || "Snacks_Lizama"; 

  // --- CATEGORÍAS ---
  const CATEGORIES = [
      'hamburguesas', 
      'alitas', 'media alitas',
      'boneless', 'media boneless',
      'tiras', 'media tiras',
      'pasta con alitas', 'media pasta con alitas',
      'pasta con boneless', 'media pasta con boneless',
      'pasta con tiras', 'media pasta con tiras',
      'perros calientes', 
      'papas', 'media papas',
      'pasta', 'media pasta',
      'box familiar', 'mini box',
      'embotellado', 'aguas naturales', 'frappe', 'jugo'
  ];

  // --- ESTADO DEL PRODUCTO ---
  const initialProductState = { 
      name: '', price: '', category: 'hamburguesas', description: '', inStock: true,
      allowsCustomization: true,
      
      // Listas Comunes
      standardIngredients: [], 
      extras: [], 
      sauceOptions: [], 
      flavorOptions: [], 

      // Configuración Alitas/Boneless/Tiras
      isCountable: false,
      pricePerExtraPiece: 0,
      canSplitSauces: false,
      extraSaucePotPrice: 0, 

      // Configuración Hamburguesa
      allowMeatSwap: false, 
      allowExtraSnacks: false, 
      extraSnackPrice: 0, 
      standardIngredientsPrice: 0, 
      
      // Configuración Bebidas
      hasIceOption: false,
      hasTempOption: false,
      hasChantillyOption: false,
      hasTapiocaOption: false,
      
      // Configuración General
      hasFriesOption: false
  };

  const [productForm, setProductForm] = useState(initialProductState);
  const [isEditing, setIsEditing] = useState(false);
  const [editId, setEditId] = useState(null);
  
  // Inputs temporales
  const [tempStandard, setTempStandard] = useState('');
  const [tempSauce, setTempSauce] = useState('');
  const [tempFlavor, setTempFlavor] = useState('');
  const [tempExtra, setTempExtra] = useState({ name: '', price: '' });

  // --- EFECTOS ---
  useEffect(() => {
    const unsub = onSnapshot(doc(db, "store_config", "main"), (docSnap) => {
      if (docSnap.exists()) {
          const data = docSnap.data();
          setIsStoreOpen(data.isOpen);
          if (data.tableCount) setTableCount(data.tableCount);
          if (data.accounts) setAccounts(data.accounts);
          if (data.logo) setStoreLogo(data.logo);
          if (data.theme) setCurrentTheme(data.theme);
      }
    });
    return () => unsub();
  }, []);

  useEffect(() => {
    if (activeTab === 'menu') fetchProducts();
    if (activeTab === 'roles') fetchUsers();
    if (activeTab === 'finanzas') { fetchOrders(); fetchExpenses(); }
  }, [activeTab]);

  // --- LOGICA LISTAS ---
  const addToList = (listName, value) => { if (!value) return; setProductForm({ ...productForm, [listName]: [...(productForm[listName] || []), value] }); };
  const removeFromList = (listName, index) => { const updatedList = productForm[listName].filter((_, i) => i !== index); setProductForm({ ...productForm, [listName]: updatedList }); };
  
  const addStandardIngredient = () => { addToList('standardIngredients', tempStandard.trim()); setTempStandard(''); };
  const addSauceOption = () => { addToList('sauceOptions', tempSauce.trim()); setTempSauce(''); };
  const addFlavorOption = () => { addToList('flavorOptions', tempFlavor.trim()); setTempFlavor(''); };
  
  const addExtraOption = () => { 
      if (!tempExtra.name.trim()) return;
      const price = tempExtra.price ? Number(tempExtra.price) : 0;
      setProductForm({ ...productForm, extras: [...(productForm.extras || []), { ...tempExtra, price }] });
      setTempExtra({ name: '', price: '' });
  };

  // --- DETECTORES DE CATEGORÍA ---
  const c = productForm.category;
  const isBurger = c === 'hamburguesas';
  const isWingsType = ['alitas', 'boneless', 'tiras', 'media alitas', 'media boneless', 'media tiras'].includes(c);
  const isPastaProtein = ['pasta con alitas', 'pasta con boneless', 'pasta con tiras', 'media pasta con alitas', 'media pasta con boneless', 'media pasta con tiras'].includes(c);
  const isHotDog = c === 'perros calientes';
  const isBox = ['box familiar', 'mini box'].includes(c);
  const isDrinkFlavor = ['embotellado', 'aguas naturales'].includes(c);
  const isFrappe = c === 'frappe';
  const isNoCustom = ['papas', 'media papas', 'pasta', 'media pasta', 'jugo'].includes(c);

  // --- CRUD PRODUCTOS ---
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

  // --- FINANZAS & GASTOS ---
  const fetchOrders = async () => { 
      const q = query(collection(db, "orders"), orderBy("createdAt", "desc"));
      const s = await getDocs(q);
      // Solo mostramos completados/entregados en finanzas
      const data = s.docs.map(d => ({ id: d.id, ...d.data() })).filter(o => ['completado', 'entregado'].includes(o.status));
      setOrders(data);
  };
  const fetchExpenses = async () => {
      const q = query(collection(db, "expenses"), orderBy("createdAt", "desc"));
      const s = await getDocs(q);
      setExpenses(s.docs.map(d => ({ id: d.id, ...d.data() })));
  };
  const handleAddExpense = async (e) => {
      e.preventDefault();
      if (!newExpense.description || !newExpense.amount) return;
      await addDoc(collection(db, "expenses"), { ...newExpense, amount: Number(newExpense.amount), createdAt: new Date().toISOString() });
      setNewExpense({ description: '', amount: '' });
      fetchExpenses(); showToast("Gasto Agregado", "warning");
  };
  const handleDeleteExpense = async (id) => { if(confirm("¿Borrar gasto?")) { await deleteDoc(doc(db, "expenses", id)); fetchExpenses(); } };

  // --- ELIMINAR REPORTE DIARIO ---
  const handleDeleteReport = async (ordersList, expensesList, dateLabel) => {
      if (!window.confirm(`⚠️ PELIGRO: ¿Estás seguro de ELIMINAR todo el historial del ${dateLabel}?\n\nSe borrarán:\n- ${ordersList.length} Pedidos\n- ${expensesList.length} Gastos\n\nEsta acción NO se puede deshacer.`)) return;
      setLoading(true);
      try {
          const orderPromises = ordersList.map(order => deleteDoc(doc(db, "orders", order.id)));
          const expensePromises = expensesList.map(exp => deleteDoc(doc(db, "expenses", exp.id)));
          await Promise.all([...orderPromises, ...expensePromises]);
          showToast("Historial eliminado correctamente", 'success');
          fetchOrders(); fetchExpenses();
      } catch (error) { showToast("Error al eliminar", 'error'); }
      setLoading(false);
  };

  // --- PDF ---
  const generateDailyReport = (date, dailyOrders, dailyExpenses) => {
      const doc = new jsPDF();
      doc.text(`Reporte de Ventas - ${date}`, 14, 15);
      
      const tableRows = dailyOrders.map(order => [
          new Date(order.createdAt).toLocaleTimeString(),
          order.userName || 'Cliente',
          order.type,
          order.paymentMethod,
          `$${order.total}`
      ]);
      
      autoTable(doc, { head: [['Hora', 'Cliente', 'Tipo', 'Pago', 'Total']], body: tableRows, startY: 20 });

      const income = dailyOrders.reduce((sum, o) => sum + o.total, 0);
      const expenseTotal = dailyExpenses.reduce((sum, e) => sum + e.amount, 0);
      const netTotal = income - expenseTotal;

      let finalY = doc.lastAutoTable.finalY + 10;
      doc.text(`Ingresos Totales: $${income}`, 14, finalY);
      
      if (dailyExpenses.length > 0) {
          finalY += 10;
          doc.text(`Gastos del Día:`, 14, finalY);
          dailyExpenses.forEach(exp => { finalY += 7; doc.setFontSize(10); doc.text(`- ${exp.description}: $${exp.amount}`, 14, finalY); });
          finalY += 10; doc.setFontSize(14); doc.text(`Total Gastos: -$${expenseTotal}`, 14, finalY);
      }
      finalY += 15; doc.setFontSize(16); doc.setTextColor(netTotal >= 0 ? 0 : 255, netTotal >= 0 ? 128 : 0, 0);
      doc.text(`GANANCIA NETA: $${netTotal}`, 14, finalY);
      doc.save(`Reporte_${date.replace(/\//g, '-')}.pdf`);
  };

  // --- CONFIG ---
  const handleLogoUpload = async () => {
      if (!logoFile) return;
      const fd = new FormData(); fd.append("file", logoFile); fd.append("upload_preset", UPLOAD_PRESET);
      const res = await fetch(`https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`, { method: "POST", body: fd });
      const data = await res.json();
      await setDoc(doc(db, "store_config", "main"), { logo: data.secure_url }, { merge: true });
      showToast("Logo Actualizado", "success");
  };
  const updateTheme = async (theme) => {
      await setDoc(doc(db, "store_config", "main"), { theme: theme }, { merge: true });
      showToast(`Tema cambiado a ${theme}`, "success");
  };

  // --- HELPERS ---
  const fetchProducts = async () => { const s = await getDocs(collection(db, "products")); const data = s.docs.map(d => ({ id: d.id, ...d.data() })); data.sort((a, b) => a.name.localeCompare(b.name)); setProducts(data); };
  const fetchUsers = async () => { const s = await getDocs(collection(db, "users")); setUsers(s.docs.map(d => ({ id: d.id, ...d.data() }))); };
  const handleUpdateRole = async (uid, role) => { if(window.confirm(`¿Cambiar rol?`)) { await updateDoc(doc(db, "users", uid), { role }); fetchUsers(); showToast("Rol actualizado", 'success'); } };
  const toggleStore = async () => { try { const newState = !isStoreOpen; await setDoc(doc(db, "store_config", "main"), { isOpen: newState }, { merge: true }); showToast(newState ? "Local ABIERTO" : "Local CERRADO", newState ? 'success' : 'error'); } catch (error) { showToast("Error", 'error'); } };
  const handleUpdateConfig = async () => { setLoading(true); try { await setDoc(doc(db, "store_config", "main"), { tableCount: Number(tableCount), accounts: accounts }, { merge: true }); showToast("Guardado", 'success'); } catch (error) { showToast("Error", 'error'); } setLoading(false); };
  const handleAddAccount = (e) => { e.preventDefault(); if(!newAccount.name || !newAccount.number) return showToast("Faltan datos", "error"); setAccounts([...accounts, { ...newAccount, id: Date.now() }]); setNewAccount({ bank: 'BBVA', name: '', number: '' }); showToast("Cuenta agregada", "info"); };
  const handleDeleteAccount = (id) => { setAccounts(accounts.filter(acc => acc.id !== id)); };
  const handleCardInput = (e) => { let val = e.target.value.replace(/\D/g, ''); if (val.length > 18) val = val.slice(0, 18); val = val.replace(/(\d{4})(?=\d)/g, '$1 '); setNewAccount({ ...newAccount, number: val }); };
  const ROLES = ['cliente', 'admin', 'hamburguesero', 'productor', 'freidor', 'mesero 1', 'mesero 2', 'repartidor 1', 'repartidor 2'];

  const groupedData = orders.reduce((acc, order) => { const date = new Date(order.createdAt).toLocaleDateString(); if (!acc[date]) acc[date] = { orders: [], expenses: [] }; acc[date].orders.push(order); return acc; }, {});
  expenses.forEach(exp => { const date = new Date(exp.createdAt).toLocaleDateString(); if (!groupedData[date]) groupedData[date] = { orders: [], expenses: [] }; groupedData[date].expenses.push(exp); });
  const sortedDates = Object.keys(groupedData).sort((a, b) => { const [dA, mA, yA] = a.split('/'); const [dB, mB, yB] = b.split('/'); return new Date(yB, mB - 1, dB) - new Date(yA, mA - 1, dA); });

  return (
    <div className="p-4 max-w-6xl mx-auto mb-20">
      <div className="flex justify-between items-center mb-6 bg-white dark:bg-gray-800 p-4 rounded-lg shadow border dark:border-gray-700">
        <h1 className="text-2xl font-bold dark:text-white">Panel Admin</h1>
        <div className="flex gap-3"><span className={`font-bold text-sm px-3 py-1 rounded-full ${isStoreOpen ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>{isStoreOpen ? '🟢 ABIERTO' : '🔴 CERRADO'}</span><button onClick={toggleStore} className={`px-4 py-2 rounded text-white font-bold text-xs shadow ${isStoreOpen ? 'bg-red-500' : 'bg-green-500'}`}>{isStoreOpen ? 'Cerrar Local' : 'Abrir Local'}</button></div>
      </div>

      {/* PESTAÑAS (SIN COCINA) */}
      <div className="flex border-b dark:border-gray-700 mb-6 overflow-x-auto bg-white dark:bg-gray-800 rounded-t-lg shadow-sm">{['menu', 'roles', 'finanzas', 'config'].map((tab) => (<button key={tab} onClick={() => setActiveTab(tab)} className={`px-6 py-3 font-bold uppercase text-xs border-b-4 transition ${activeTab === tab ? 'border-orange-600 text-orange-600 bg-orange-50 dark:bg-gray-700' : 'border-transparent text-gray-500 hover:bg-gray-50 dark:hover:bg-gray-700'}`}>{tab}</button>))}</div>

      {activeTab === 'menu' && (
        <div className="grid md:grid-cols-2 gap-6">
            <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md h-fit border dark:border-gray-700">
                <div className="flex justify-between mb-4 border-b dark:border-gray-700 pb-2"><h2 className="font-bold text-lg dark:text-white">{isEditing ? '✏️ Editando' : '➕ Nuevo Producto'}</h2>{isEditing && <button onClick={cancelEdit} className="text-red-500 text-xs underline">Cancelar</button>}</div>
                <form onSubmit={handleSaveProduct} className="flex flex-col gap-4">
                    <div className="grid grid-cols-2 gap-3"><input placeholder="Nombre" className="p-2 border rounded dark:bg-gray-700 dark:text-white" value={productForm.name} onChange={e => setProductForm({...productForm, name: e.target.value})} required /><input type="number" placeholder="Precio ($)" className="p-2 border rounded dark:bg-gray-700 dark:text-white" value={productForm.price} onChange={e => setProductForm({...productForm, price: e.target.value})} required /></div>
                    <div className="grid grid-cols-2 gap-3">
                        <select className="p-2 border rounded dark:bg-gray-700 dark:text-white uppercase text-xs" value={productForm.category} onChange={e => setProductForm({...productForm, category: e.target.value})}>{CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}</select>
                        <input type="file" onChange={e => setImageFile(e.target.files[0])} className="text-xs dark:text-gray-300" />
                    </div>
                    <textarea placeholder="Descripción" className="p-2 border rounded dark:bg-gray-700 dark:text-white" value={productForm.description} onChange={e => setProductForm({...productForm, description: e.target.value})} />

                    {!isNoCustom && (
                        <div className="border rounded-lg p-4 bg-gray-50 dark:bg-gray-700/50 dark:border-gray-600 space-y-4">
                            <h4 className="font-bold text-sm text-gray-700 dark:text-white border-b pb-2 flex items-center gap-2"><FaCogs/> Personalización: <span className="uppercase text-orange-600">{productForm.category}</span></h4>
                            
                            {/* HAMBURGUESAS */}
                            {isBurger && (
                                <>
                                    <div className="flex items-center gap-2 mb-2"><input type="checkbox" checked={productForm.hasFriesOption} onChange={e => setProductForm({...productForm, hasFriesOption: e.target.checked})} /> Opción Papas (Francesa vs Gajo)</div>
                                    
                                    {/* Ingredientes Base + Precio si piden extra */}
                                    <div className="bg-white dark:bg-gray-700 p-2 rounded border">
                                        <p className="text-xs font-bold mb-1">Ingredientes Base (Quitar/Extra):</p>
                                        <div className="flex gap-2 mb-1"><input className="flex-1 p-1 border rounded text-xs" placeholder="Ej: Cebolla" value={tempStandard} onChange={e=>setTempStandard(e.target.value)}/><button type="button" onClick={addStandardIngredient} className="bg-blue-500 text-white px-2 rounded">+</button></div>
                                        <div className="flex flex-wrap gap-1 mb-2">{productForm.standardIngredients?.map((item,i)=><span key={i} className="text-xs bg-gray-200 px-1 rounded flex items-center gap-1">{item}<FaTimes onClick={()=>removeFromList('standardIngredients',i)} className="cursor-pointer"/></span>)}</div>
                                        <div className="flex items-center gap-2 text-xs"><span className="text-gray-500">Precio Ingrediente Extra: $</span><input type="number" className="w-16 p-1 border rounded" value={productForm.standardIngredientsPrice} onChange={e=>setProductForm({...productForm, standardIngredientsPrice:Number(e.target.value)})}/></div>
                                    </div>

                                    {/* Salsas para Bañar */}
                                    <div className="bg-white dark:bg-gray-700 p-2 rounded border">
                                        <p className="text-xs font-bold mb-1">Salsas para Bañar:</p>
                                        <div className="flex gap-2 mb-1"><input className="flex-1 p-1 border rounded text-xs" placeholder="Ej: BBQ" value={tempSauce} onChange={e=>setTempSauce(e.target.value)}/><button type="button" onClick={addSauceOption} className="bg-orange-500 text-white px-2 rounded">+</button></div>
                                        <div className="flex flex-wrap gap-1">{productForm.sauceOptions?.map((item,i)=><span key={i} className="text-xs bg-orange-100 px-1 rounded flex items-center gap-1">{item}<FaTimes onClick={()=>removeFromList('sauceOptions',i)} className="cursor-pointer"/></span>)}</div>
                                    </div>

                                    {/* Extras */}
                                    <div className="grid grid-cols-2 gap-2 text-xs">
                                        <label className="flex items-center gap-1"><input type="checkbox" checked={productForm.allowMeatSwap} onChange={e => setProductForm({...productForm, allowMeatSwap: e.target.checked})} /> Cambio Carne (Pechuga/Tiras)</label>
                                        <div><p>Precio Botecito Salsa:</p><input type="number" className="w-full p-1 border rounded" value={productForm.extraSaucePotPrice} onChange={e=>setProductForm({...productForm, extraSaucePotPrice:Number(e.target.value)})}/></div>
                                    </div>

                                    <div className="bg-gray-100 dark:bg-gray-600 p-2 rounded mt-2">
                                        <label className="flex items-center gap-1 text-xs font-bold mb-1"><input type="checkbox" checked={productForm.allowExtraSnacks} onChange={e => setProductForm({...productForm, allowExtraSnacks: e.target.checked})} /> Agregar Snacks (Alitas/Boneless/Tiras)</label>
                                        {productForm.allowExtraSnacks && (
                                            <div className="text-xs ml-4"><p>Precio por pieza extra:</p><input type="number" className="w-20 p-1 border rounded" value={productForm.extraSnackPrice} onChange={e => setProductForm({...productForm, extraSnackPrice: Number(e.target.value)})} /></div>
                                        )}
                                    </div>
                                </>
                            )}

                            {/* ALITAS, BONELESS, TIRAS, PASTAS PROTEINA */}
                            {(isWingsType || isPastaProtein) && (
                                <>
                                    {!isPastaProtein && <div className="flex items-center gap-2"><input type="checkbox" checked={productForm.hasFriesOption} onChange={e => setProductForm({...productForm, hasFriesOption: e.target.checked})} /> Opción Papas (Francesa vs Gajo)</div>}
                                    
                                    <div>
                                        <p className="text-xs font-bold mb-1">Sabores Disponibles:</p>
                                        <div className="flex gap-2"><input className="flex-1 p-1 border rounded text-xs" placeholder="Ej: BBQ" value={tempSauce} onChange={e=>setTempSauce(e.target.value)}/><button type="button" onClick={addSauceOption} className="bg-orange-500 text-white px-2 rounded">+</button></div>
                                        <div className="flex flex-wrap gap-1 mt-1">{productForm.sauceOptions?.map((item,i)=><span key={i} className="text-xs bg-orange-100 px-1 rounded flex items-center gap-1">{item}<FaTimes onClick={()=>removeFromList('sauceOptions',i)} className="cursor-pointer"/></span>)}</div>
                                    </div>

                                    <div className="grid grid-cols-2 gap-2 text-xs">
                                        <div><p>Precio Pieza Extra:</p><input type="number" className="w-full p-1 border rounded" value={productForm.pricePerExtraPiece} onChange={e=>setProductForm({...productForm, pricePerExtraPiece:Number(e.target.value)})}/></div>
                                        <div><p>Precio Botecito Salsa:</p><input type="number" className="w-full p-1 border rounded" value={productForm.extraSaucePotPrice} onChange={e=>setProductForm({...productForm, extraSaucePotPrice:Number(e.target.value)})}/></div>
                                    </div>
                                    
                                    <div className="pt-2 border-t dark:border-gray-600">
                                        <label className="flex items-center gap-2 text-xs font-bold cursor-pointer"><input type="checkbox" checked={productForm.isCountable} onChange={e => setProductForm({...productForm, isCountable: e.target.checked})} /> Activar Conteo de Piezas</label>
                                        {productForm.isCountable && <label className="flex items-center gap-2 text-xs mt-1 ml-4 cursor-pointer"><input type="checkbox" checked={productForm.canSplitSauces} onChange={e => setProductForm({...productForm, canSplitSauces: e.target.checked})} /> Permitir Mitad y Mitad</label>}
                                    </div>
                                </>
                            )}

                            {/* PERROS CALIENTES */}
                            {isHotDog && (
                                <>
                                    <div className="flex items-center gap-2"><input type="checkbox" checked={productForm.hasFriesOption} onChange={e => setProductForm({...productForm, hasFriesOption: e.target.checked})} /> Opción Papas (Si es Combo)</div>
                                    <div><p className="text-xs font-bold mb-1">Ingredientes a Quitar:</p><div className="flex gap-2"><input className="flex-1 p-1 border rounded text-xs" placeholder="Ej: Cebolla" value={tempIngredient} onChange={e=>setTempIngredient(e.target.value)}/><button type="button" onClick={addIngredient} className="bg-blue-500 text-white px-2 rounded">+</button></div><div className="flex flex-wrap gap-1 mt-1">{productForm.standardIngredients?.map((item,i)=><span key={i} className="text-xs bg-gray-200 px-1 rounded flex items-center gap-1">{item}<FaTimes onClick={()=>removeFromList('standardIngredients',i)} className="cursor-pointer"/></span>)}</div></div>
                                </>
                            )}

                            {/* BOX FAMILIAR */}
                            {isBox && (
                                <>
                                    <div className="bg-orange-50 dark:bg-gray-700 p-2 rounded mb-2">
                                        <p className="text-xs font-bold mb-1"><FaBoxOpen/> Configuración Box</p>
                                        <div className="flex items-center gap-2 mb-2"><input type="checkbox" checked={productForm.hasFriesOption} onChange={e => setProductForm({...productForm, hasFriesOption: e.target.checked})} /> Opción Papas (Francesa vs Gajo)</div>
                                        <div className="grid grid-cols-2 gap-2 text-xs">
                                            <div><p>Precio Pieza Extra (Tiras/Boneless/Alitas):</p><input type="number" className="w-full p-1 border rounded" value={productForm.extraSnackPrice} onChange={e=>setProductForm({...productForm, extraSnackPrice:Number(e.target.value)})}/></div>
                                            <div><p>Precio Botecito Salsa:</p><input type="number" className="w-full p-1 border rounded" value={productForm.extraSaucePotPrice} onChange={e=>setProductForm({...productForm, extraSaucePotPrice:Number(e.target.value)})}/></div>
                                        </div>
                                    </div>
                                    <div>
                                        <p className="text-xs font-bold mb-1">Salsas Disponibles (Para bañar snacks):</p>
                                        <div className="flex gap-2"><input className="flex-1 p-1 border rounded text-xs" placeholder="Ej: BBQ" value={tempSauce} onChange={e=>setTempSauce(e.target.value)}/><button type="button" onClick={addSauceOption} className="bg-orange-500 text-white px-2 rounded">+</button></div>
                                        <div className="flex flex-wrap gap-1 mt-1">{productForm.sauceOptions?.map((item,i)=><span key={i} className="text-xs bg-orange-100 px-1 rounded flex items-center gap-1">{item}<FaTimes onClick={()=>removeFromList('sauceOptions',i)} className="cursor-pointer"/></span>)}</div>
                                    </div>
                                </>
                            )}

                            {/* BEBIDAS */}
                            {isDrinkFlavor && (
                                <div><p className="text-xs font-bold mb-1">Sabores:</p><div className="flex gap-2"><input className="flex-1 p-1 border rounded text-xs" placeholder="Ej: Jamaica" value={tempFlavor} onChange={e=>setTempFlavor(e.target.value)}/><button type="button" onClick={addFlavorOption} className="bg-blue-500 text-white px-2 rounded">+</button></div><div className="flex flex-wrap gap-1 mt-1">{productForm.flavorOptions?.map((item,i)=><span key={i} className="text-xs bg-blue-100 px-1 rounded flex items-center gap-1">{item}<FaTimes onClick={()=>removeFromList('flavorOptions',i)} className="cursor-pointer"/></span>)}</div>
                                <div className="mt-2 flex gap-4"><label className="flex items-center gap-1 text-xs"><input type="checkbox" checked={productForm.hasIceOption} onChange={e=>setProductForm({...productForm, hasIceOption:e.target.checked})}/> Hielo</label><label className="flex items-center gap-1 text-xs"><input type="checkbox" checked={productForm.hasTempOption} onChange={e=>setProductForm({...productForm, hasTempOption:e.target.checked})}/> Temperatura</label></div></div>
                            )}

                            {/* FRAPPE */}
                            {isFrappe && (
                                <div className="flex gap-4 text-xs"><label className="flex items-center gap-1"><input type="checkbox" checked={productForm.hasChantillyOption} onChange={e=>setProductForm({...productForm, hasChantillyOption:e.target.checked})}/> Chantilly</label><label className="flex items-center gap-1"><input type="checkbox" checked={productForm.hasTapiocaOption} onChange={e=>setProductForm({...productForm, hasTapiocaOption:e.target.checked})}/> Tapioca</label></div>
                            )}
                        </div>
                    )}

                    <button disabled={loading} className={`text-white p-3 rounded font-bold shadow ${isEditing?'bg-blue-600':'bg-green-600'}`}>{loading?'...':(isEditing?'Actualizar':'Crear')}</button>
                </form>
            </div>
            <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md border dark:border-gray-700"><h2 className="font-bold mb-4 dark:text-white">Inventario</h2><div className="overflow-y-auto max-h-[600px] space-y-2 pr-2">{products.map(p => (<div key={p.id} className="flex justify-between p-3 border rounded dark:border-gray-700"><div className="flex gap-3"><img src={p.image} className="w-12 h-12 rounded object-cover" /><div><p className="font-bold text-sm dark:text-white">{p.name}</p><p className="text-xs text-gray-500">${p.price}</p></div></div><div className="flex gap-2"><button onClick={()=>startEditProduct(p)} className="text-blue-500"><FaEdit/></button><button onClick={()=>toggleProductStock(p)} className={`px-2 py-1 text-xs rounded border ${p.inStock?'bg-green-100':'bg-red-100'}`}>{p.inStock?'Stock':'Agotado'}</button><button onClick={()=>handleDeleteProduct(p.id)} className="text-red-500"><FaTrash/></button></div></div>))}</div></div>
        </div>
      )}

      {/* --- FINANZAS MEJORADO --- */}
      {activeTab === 'finanzas' && (
        <div className="space-y-8">
            <div className="bg-red-50 dark:bg-red-900/20 p-4 rounded-lg border border-red-200 dark:border-red-800 flex gap-2 items-center">
                <span className="font-bold text-red-700 dark:text-red-300 whitespace-nowrap">Registrar Gasto:</span>
                <input placeholder="Descripción" className="flex-1 p-2 rounded border text-sm" value={newExpense.description} onChange={e=>setNewExpense({...newExpense, description:e.target.value})}/>
                <input type="number" placeholder="$" className="w-24 p-2 rounded border text-sm" value={newExpense.amount} onChange={e=>setNewExpense({...newExpense, amount:e.target.value})}/>
                <button onClick={handleAddExpense} className="bg-red-600 text-white px-4 py-2 rounded font-bold hover:bg-red-700">Agregar</button>
            </div>

            {sortedDates.map(date => {
                const dayData = groupedData[date];
                const income = dayData.orders.reduce((sum, o) => sum + o.total, 0);
                const expenseSum = dayData.expenses.reduce((sum, e) => sum + e.amount, 0);
                const net = income - expenseSum;

                return (
                    <div key={date} className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md border dark:border-gray-700">
                        <div className="flex justify-between items-center mb-4 border-b dark:border-gray-700 pb-4">
                            <div><h3 className="text-xl font-bold text-gray-800 dark:text-white">{date}</h3><p className="text-sm text-gray-500">{dayData.orders.length} pedidos</p></div>
                            <div className="text-right"><p className="text-sm text-green-600 font-bold">Ingreso: +${income}</p><p className="text-sm text-red-500 font-bold">Gastos: -${expenseSum}</p><p className={`text-xl font-black ${net >= 0 ? 'text-green-700' : 'text-red-600'}`}>Neto: ${net}</p></div>
                            <div className="flex gap-2">
                                <button onClick={() => generateDailyReport(date, dayData.orders, dayData.expenses)} className="bg-blue-600 text-white px-3 py-2 rounded flex items-center gap-2 hover:bg-blue-700"><FaFilePdf/> PDF</button>
                                <button onClick={() => handleDeleteReport(dayData.orders, dayData.expenses, date)} className="bg-red-600 text-white px-3 py-2 rounded flex items-center gap-2 hover:bg-red-700"><FaTrash/></button>
                            </div>
                        </div>
                        {dayData.expenses.length > 0 && (<div className="mb-4 p-3 bg-red-50 dark:bg-gray-700 rounded text-sm"><p className="font-bold text-red-800 dark:text-red-300 mb-2">Gastos del día:</p>{dayData.expenses.map(exp => (<div key={exp.id} className="flex justify-between border-b border-red-100 last:border-0 py-1"><span>{exp.description}</span><div className="flex gap-2"><span className="font-bold">-${exp.amount}</span><button onClick={()=>handleDeleteExpense(exp.id)} className="text-red-500 hover:text-red-700"><FaTrash/></button></div></div>))}</div>)}
                        <div className="text-sm text-gray-600 dark:text-gray-400 max-h-40 overflow-y-auto">{dayData.orders.map(o => <div key={o.id} className="flex justify-between py-1 border-b dark:border-gray-700 last:border-0"><span>{new Date(o.createdAt).toLocaleTimeString()} - {o.userName}</span><span className="font-bold">${o.total}</span></div>)}</div>
                    </div>
                );
            })}
        </div>
      )}

      {/* --- CONFIG --- */}
      {activeTab === 'config' && (
          <div className="grid md:grid-cols-2 gap-6">
              <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md border dark:border-gray-700">
                  <h2 className="font-bold mb-4 dark:text-white flex items-center gap-2"><FaCamera/> Logo & Tema</h2>
                  <div className="mb-4"><p className="text-xs mb-1">Subir Logo:</p><div className="flex gap-2"><input type="file" onChange={e => setLogoFile(e.target.files[0])} className="text-xs" /><button onClick={handleLogoUpload} className="bg-blue-600 text-white px-3 rounded text-xs">Subir</button></div>{storeLogo && <img src={storeLogo} className="w-16 h-16 mt-2 object-contain bg-gray-100 rounded"/>}</div>
                  <div><p className="text-xs mb-2 flex items-center gap-1"><FaPalette/> Tema:</p><div className="grid grid-cols-2 gap-2">{['normal', 'navidad', 'reyes', 'halloween'].map(t => (<button key={t} onClick={() => updateTheme(t)} className={`p-2 rounded capitalize text-xs border ${currentTheme === t ? 'bg-orange-500 text-white border-orange-500' : 'border-gray-300 dark:text-white'}`}>{t}</button>))}</div></div>
              </div>
              <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md border dark:border-gray-700">
                  <h2 className="font-bold mb-4 dark:text-white">⚙️ Mesas & Cuentas</h2>
                  <div className="mb-4"><label className="text-xs block mb-1">Cantidad Mesas:</label><input type="number" value={tableCount} onChange={(e) => setTableCount(e.target.value)} className="border p-2 rounded w-20 text-center dark:bg-gray-700 dark:text-white" /></div>
                  <div className="border-t pt-4"><form onSubmit={handleAddAccount} className="flex gap-2 mb-4"><input placeholder="Banco" value={newAccount.bank} onChange={e=>setNewAccount({...newAccount, bank: e.target.value})} className="border p-2 rounded w-20 dark:bg-gray-700 dark:text-white text-xs"/><input placeholder="Titular" value={newAccount.name} onChange={e=>setNewAccount({...newAccount, name: e.target.value})} className="border p-2 rounded flex-1 dark:bg-gray-700 dark:text-white text-xs"/><input placeholder="Número" value={newAccount.number} onChange={handleCardInput} className="border p-2 rounded flex-1 dark:bg-gray-700 dark:text-white text-xs"/><button className="bg-blue-600 text-white px-3 rounded">+</button></form><div className="space-y-2">{accounts.map(acc => <div key={acc.id} className="flex justify-between p-2 border rounded dark:border-gray-600 dark:text-white text-xs"><span>{acc.bank} - {acc.number}</span><FaTrash className="cursor-pointer text-red-400" onClick={()=>handleDeleteAccount(acc.id)}/></div>)}</div></div>
              </div>
              <button onClick={handleUpdateConfig} disabled={loading} className="col-span-2 bg-green-600 text-white py-3 rounded font-bold shadow hover:bg-green-700">Guardar Configuración General</button>
          </div>
      )}

      {activeTab === 'roles' && (<div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md overflow-x-auto border dark:border-gray-700"><table className="w-full text-left"><thead><tr className="bg-orange-50 dark:bg-gray-700/50 text-orange-800 dark:text-orange-300 text-xs"><th className="p-3">Usuario</th><th className="p-3">Rol</th><th className="p-3">Asignar</th></tr></thead><tbody>{users.map(u => (<tr key={u.id} className="border-b dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700"><td className="p-3"><p className="font-bold text-gray-800 dark:text-white">{u.displayName || 'Sin Nombre'}</p><p className="text-xs text-gray-500 dark:text-gray-400">{u.email}</p></td><td className="p-3"><span className="bg-gray-100 dark:bg-gray-600 px-2 py-1 rounded text-xs uppercase text-gray-600 dark:text-gray-200">{u.role}</span></td><td className="p-3"><select onChange={(e) => handleUpdateRole(u.id, e.target.value)} value={u.role || 'cliente'} className="border dark:border-gray-600 p-2 rounded text-sm bg-white dark:bg-gray-700 dark:text-white">{ROLES.map(rol => <option key={rol} value={rol}>{rol.toUpperCase()}</option>)}</select></td></tr>))}</tbody></table></div>)}
    </div>
  );
}