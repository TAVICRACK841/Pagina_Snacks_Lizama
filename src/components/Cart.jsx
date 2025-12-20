import { useStore } from '@nanostores/react';
import { isCartOpen, cartItems, removeFromCart, updateQuantity, clearCart } from '../stores/cartStore';
import { useState, useEffect, useMemo } from 'react';
import { auth, db } from '../firebase/config';
import { addDoc, collection, doc, onSnapshot, getDoc, query, where, updateDoc } from 'firebase/firestore';
import { showToast } from '../stores/toastStore';
// Importamos TODOS los iconos necesarios
import { FaShoppingBag, FaCreditCard, FaMoneyBillWave, FaTerminal, FaCheckCircle, FaTimes, FaTrash, FaMapMarkerAlt, FaMobileAlt, FaUpload, FaCopy, FaArrowLeft } from 'react-icons/fa';
import { getBankStyle } from '../utils/bankStyles';
import { initMercadoPago, Wallet } from '@mercadopago/sdk-react';

const publicKey = import.meta.env.PUBLIC_MP_KEY;
if (publicKey) { initMercadoPago(publicKey, { locale: 'es-MX' }); }

const MP_PERCENTAGE = 0.05; 
const MP_FIXED_FEE = 5;     

export default function Cart() {
  const $isCartOpen = useStore(isCartOpen);
  const $cartItems = useStore(cartItems);
  const [user, setUser] = useState(null);
  const [userData, setUserData] = useState({});

  const [orderType, setOrderType] = useState('mesa');
  const [selectedTables, setSelectedTables] = useState([]); 
  const [selectedAddress, setSelectedAddress] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('efectivo');
  const [loading, setLoading] = useState(false);
  
  // CONFIGURACIÓN (Mesas y Cuentas)
  const [totalTableCount, setTotalTableCount] = useState(10); // Valor por defecto
  const [accounts, setAccounts] = useState([]);
  const [busyTables, setBusyTables] = useState([]);
  
  // TRANSFERENCIA
  const [transferFile, setTransferFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [selectedBankInfo, setSelectedBankInfo] = useState(null);

  const [preferenceId, setPreferenceId] = useState(null);
  const [currentOrderId, setCurrentOrderId] = useState(null);

  const CLOUD_NAME = import.meta.env.PUBLIC_CLOUDINARY_CLOUD_NAME || "dw5mio6d9"; 
  const UPLOAD_PRESET = import.meta.env.PUBLIC_CLOUDINARY_PRESET || "Snacks_Lizama"; 

  const subtotal = useMemo(() => $cartItems.reduce((acc, item) => acc + item.price * item.quantity, 0), [$cartItems]);
  const commission = paymentMethod === 'mercadopago' ? Math.ceil((subtotal * MP_PERCENTAGE) + MP_FIXED_FEE) : 0;
  const total = subtotal + commission;

  useEffect(() => {
    // 1. CARGAR CONFIGURACIÓN (Mesas y Cuentas)
    const unsubConfig = onSnapshot(doc(db, "store_config", "main"), (docSnap) => {
        if (docSnap.exists()) {
            const data = docSnap.data();
            if (data.tableCount) setTotalTableCount(Number(data.tableCount));
            if (data.accounts) setAccounts(data.accounts);
        }
    });

    // 2. ESCUCHAR MESAS OCUPADAS
    const q = query(collection(db, "orders"), where("status", "in", ["pendiente", "preparando", "en_camino"]), where("type", "==", "mesa"));
    const unsubOrders = onSnapshot(q, (snapshot) => {
        const occupied = [];
        snapshot.docs.forEach(doc => {
            const detailStr = doc.data().detail.replace('Mesa ', '');
            detailStr.split(', ').forEach(numStr => occupied.push(parseInt(numStr)));
        });
        setBusyTables([...new Set(occupied)]);
    });

    // 3. AUTH
    const unsubAuth = auth.onAuthStateChanged((u) => {
      setUser(u);
      if (u) {
        onSnapshot(doc(db, "users", u.uid), (docSnap) => {
            if(docSnap.exists()) setUserData(docSnap.data());
        });
      }
    });

    return () => { unsubConfig(); unsubOrders(); unsubAuth(); };
  }, []);

  // Selección automática de mesa libre al abrir
  useEffect(() => {
      if ($isCartOpen && orderType === 'mesa' && selectedTables.length === 0) {
          for (let i = 1; i <= totalTableCount; i++) {
              if (!busyTables.includes(i)) {
                  setSelectedTables([i]);
                  return;
              }
          }
      }
  }, [$isCartOpen, orderType, totalTableCount]); // Quitamos busyTables para evitar re-selección constante

  const toggleTable = (tableNum) => {
      if (busyTables.includes(tableNum)) return;
      if (selectedTables.includes(tableNum)) {
          setSelectedTables(selectedTables.filter(t => t !== tableNum));
      } else {
          setSelectedTables([...selectedTables, tableNum].sort((a, b) => a - b));
      }
  };

  const createPreference = async () => {
      if (!user || $cartItems.length === 0) return;
      try {
          const orderData = {
            userId: user.uid,
            userName: userData.displayName || user.displayName || 'Cliente',
            items: $cartItems.map(item => ({
                id: item.id, name: item.name, price: item.price, quantity: item.quantity,
                customization: item.customization || null,
                customizationDescription: item.customizationDescription || ''
            })),
            total: total, subtotal: subtotal, commission: commission, type: orderType, 
            detail: orderType === 'mesa' ? `Mesa ${selectedTables.join(', ')}` : selectedAddress || 'Para Llevar',
            paymentMethod: 'mercadopago', bankDetails: 'Procesando pago digital...', 
            status: 'pendiente_pago', createdAt: new Date().toISOString() 
          };

          let orderIdToUse = currentOrderId;
          if (!currentOrderId) {
             const docRef = await addDoc(collection(db, "orders"), orderData);
             orderIdToUse = docRef.id;
             setCurrentOrderId(docRef.id);
          } else {
             await updateDoc(doc(db, "orders", currentOrderId), orderData);
          }

          const items = $cartItems.map(item => ({
              title: `${item.name} ${item.customizationDescription ? `(${item.customizationDescription})` : ''}`,
              quantity: item.quantity,
              unit_price: Number(item.price),
              currency_id: 'MXN'
          }));
          if (commission > 0) items.push({ title: "Comisión uso de Plataforma", quantity: 1, unit_price: Number(commission), currency_id: 'MXN' });

          const response = await fetch('/api/create_preference', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ items, external_reference: orderIdToUse })
          });
          const data = await response.json();
          if (data.id) setPreferenceId(data.id);
      } catch (error) { console.error("Error MP:", error); showToast("Error al generar pago", "error"); }
  };

  useEffect(() => {
      if (paymentMethod === 'mercadopago' && $cartItems.length > 0) createPreference();
      else { setPreferenceId(null); setCurrentOrderId(null); }
  }, [paymentMethod, $cartItems.length, commission]); 

  const copyToClipboard = () => { if(selectedBankInfo) { navigator.clipboard.writeText(selectedBankInfo.number.replace(/\s/g, '')); showToast("Número copiado", "success"); }};
  const handleUploadProof = async () => { if (!transferFile) return null; const fd = new FormData(); fd.append('file', transferFile); fd.append('upload_preset', UPLOAD_PRESET); const res = await fetch(`https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`, { method: 'POST', body: fd }); const data = await res.json(); return data.secure_url; };

  const handleManualCheckout = async () => {
    if (!user) return showToast("Inicia sesión", 'error');
    if ($cartItems.length === 0) return showToast("Carrito vacío", 'error');
    if (orderType === 'mesa' && selectedTables.length === 0) return showToast("Selecciona una mesa", 'error');
    if (orderType === 'domicilio' && !selectedAddress) return showToast("Selecciona dirección", 'error');
    if (paymentMethod === 'transferencia' && (!selectedBankInfo || !transferFile)) return showToast("Faltan datos de pago", 'error');

    setLoading(true);
    try {
      let proofUrl = '';
      let paymentDetail = paymentMethod === 'efectivo' ? 'Pago en Efectivo' : 'Pago con Point Terminal';

      if (paymentMethod === 'transferencia') {
          setUploading(true);
          proofUrl = await handleUploadProof();
          setUploading(false);
          paymentDetail = `Transferencia a: ${selectedBankInfo.bank}`;
      }

      const orderData = {
        userId: user.uid,
        userName: userData.displayName || user.displayName || 'Cliente',
        items: $cartItems.map(item => ({
            id: item.id, name: item.name, price: item.price, quantity: item.quantity,
            customization: item.customization || null, customizationDescription: item.customizationDescription || ''
        })),
        total: total, subtotal: subtotal, commission: commission, type: orderType, 
        detail: orderType === 'mesa' ? `Mesa ${selectedTables.join(', ')}` : selectedAddress,
        paymentMethod: paymentMethod, bankDetails: paymentDetail, proofOfPayment: proofUrl,
        status: 'pendiente', createdAt: new Date().toISOString() 
      };

      await addDoc(collection(db, "orders"), orderData);
      showToast(`¡Pedido Enviado!`, 'success');
      clearCart();
      isCartOpen.set(false);
      setPaymentMethod('efectivo'); 
      setTransferFile(null); setSelectedBankInfo(null); setSelectedTables([]);
    } catch (error) { showToast("Error al enviar", 'error'); setLoading(false); setUploading(false); }
    setLoading(false);
  };

  const handlePaymentChange = (method) => { setPaymentMethod(method); setSelectedBankInfo(null); };

  if (!$isCartOpen) return null;

  const allTablesBusy = busyTables.length >= totalTableCount;

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="absolute inset-0 bg-black bg-opacity-50 backdrop-blur-sm" onClick={() => isCartOpen.set(false)}></div>
      
      <div className="relative w-full max-w-md bg-white dark:bg-gray-900 h-full shadow-2xl flex flex-col border-l dark:border-gray-800 animate-slide-in-right">
        
        <div className="flex justify-between items-center p-5 border-b dark:border-gray-800 bg-white dark:bg-gray-900 shrink-0">
          <h2 className="text-2xl font-bold text-gray-800 dark:text-white">Tu Pedido</h2>
          <button onClick={() => isCartOpen.set(false)} className="text-gray-400 hover:text-red-500 transition"><FaTimes size={24}/></button>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-6 custom-scrollbar">
          
          <div className="space-y-4">
            {$cartItems.length === 0 ? <div className="text-center py-10 text-gray-400 flex flex-col items-center gap-2"><FaShoppingBag size={40}/>Tu carrito está vacío</div> : $cartItems.map((item) => (
                <div key={`${item.id}-${item.customizationDescription}`} className="flex gap-4 pb-4 border-b dark:border-gray-800">
                    <img src={item.image} className="w-16 h-16 rounded-lg object-cover bg-gray-100 shadow-sm" />
                    <div className="flex-1">
                        <div className="flex justify-between items-start">
                             <h4 className="font-bold dark:text-white text-sm">{item.name}</h4>
                             <button onClick={() => removeFromCart(item.id, item.customization)} className="text-gray-400 hover:text-red-500 text-xs"><FaTrash/></button>
                        </div>
                        {item.customizationDescription && <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 italic border-l-2 border-orange-500 pl-2">{item.customizationDescription}</p>}
                        <div className="flex justify-between items-center mt-3">
                            <p className="text-orange-600 font-bold">${item.price}</p>
                            <div className="flex items-center gap-2 bg-gray-100 dark:bg-gray-800 rounded-full p-1">
                                    <button onClick={() => updateQuantity(item.id, item.quantity - 1, item.customization)} className="w-6 h-6 flex items-center justify-center bg-white dark:bg-gray-700 rounded-full shadow-sm hover:bg-gray-200">-</button>
                                    <span className="font-bold dark:text-white text-sm w-4 text-center">{item.quantity}</span>
                                    <button onClick={() => updateQuantity(item.id, item.quantity + 1, item.customization)} className="w-6 h-6 flex items-center justify-center bg-white dark:bg-gray-700 rounded-full shadow-sm hover:bg-gray-200">+</button>
                            </div>
                        </div>
                    </div>
                </div>
            ))}
          </div>

          {/* --- BOTÓN AGREGAR MÁS PRODUCTOS (RESTAURADO) --- */}
          {$cartItems.length > 0 && (
              <button 
                  onClick={() => isCartOpen.set(false)} 
                  className="w-full py-3 border-2 border-dashed border-gray-300 dark:border-gray-600 text-gray-500 dark:text-gray-400 font-bold rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 transition flex items-center justify-center gap-2"
              >
                  <FaShoppingBag /> Agregar más productos
              </button>
          )}

          {$cartItems.length > 0 && (
            <>
                <div className="bg-gray-50 dark:bg-gray-800/50 p-4 rounded-xl border dark:border-gray-700">
                    <label className="block font-bold mb-3 dark:text-white flex items-center gap-2">¿Cómo lo quieres?</label>
                    <select value={orderType} onChange={(e) => setOrderType(e.target.value)} className="w-full p-3 border rounded-xl bg-white dark:bg-gray-800 dark:text-white dark:border-gray-600 mb-4 shadow-sm">
                        <option value="mesa">🍽️ Comer en Mesa</option>
                        <option value="llevar">🥡 Para Llevar</option>
                        <option value="domicilio">🛵 A Domicilio</option>
                    </select>
                    
                    {orderType === 'mesa' && (
                        <div>
                            <p className="font-bold text-sm mb-2 dark:text-white flex justify-between">Selecciona Mesa(s): {allTablesBusy && <span className="text-red-500 text-xs">¡Local Lleno!</span>}</p>
                            <div className="grid grid-cols-5 gap-2 max-h-40 overflow-y-auto p-1">
                                {Array.from({length: totalTableCount}, (_, i) => i + 1).map(num => {
                                    const isBusy = busyTables.includes(num);
                                    const isSelected = selectedTables.includes(num);
                                    return (
                                        <button key={num} onClick={() => toggleTable(num)} disabled={isBusy} className={`p-2 rounded-lg font-bold text-sm transition relative overflow-hidden ${isBusy ? 'bg-red-100 text-red-400 cursor-not-allowed border border-red-200' : isSelected ? 'bg-orange-500 text-white shadow-md scale-105' : 'bg-white dark:bg-gray-700 border dark:border-gray-600 hover:border-orange-400'}`}>
                                            {num}
                                            {isSelected && <FaCheckCircle className="absolute top-1 right-1 text-[10px]"/>}
                                        </button>
                                    );
                                })}
                            </div>
                            {selectedTables.length > 0 && <p className="text-xs text-gray-500 mt-2">Mesa(s): {selectedTables.join(', ')}</p>}
                        </div>
                    )}
                    {orderType === 'domicilio' && (
                         userData.savedAddresses?.length > 0 
                         ? <select className="w-full p-3 border rounded-xl dark:bg-gray-800 dark:text-white dark:border-gray-600 shadow-sm" value={selectedAddress} onChange={e=>setSelectedAddress(e.target.value)}><option value="">Selecciona Dirección...</option>{userData.savedAddresses.map(a=><option key={a.id} value={a.text}>{a.alias}</option>)}</select>
                         : <a href="/profile" className="text-orange-500 underline text-sm flex items-center gap-1"><FaMapMarkerAlt/> Agrega una dirección en tu perfil</a>
                    )}
                </div>

                <div>
                    <label className="block font-bold mb-3 dark:text-white">Método de Pago</label>
                    <div className="grid grid-cols-2 gap-3">
                        <button onClick={() => handlePaymentChange('efectivo')} className={`p-3 rounded-xl border font-bold text-sm flex items-center justify-center gap-2 transition ${paymentMethod === 'efectivo' ? 'bg-green-50 border-green-500 text-green-700 shadow-sm' : 'bg-white dark:bg-gray-800 dark:border-gray-600 hover:bg-gray-50'}`}><FaMoneyBillWave/> Efectivo</button>
                        <button onClick={() => handlePaymentChange('point')} className={`p-3 rounded-xl border font-bold text-sm flex items-center justify-center gap-2 transition ${paymentMethod === 'point' ? 'bg-blue-50 border-blue-500 text-blue-700 shadow-sm' : 'bg-white dark:bg-gray-800 dark:border-gray-600 hover:bg-gray-50'}`}><FaTerminal/> Point Terminal</button>
                        <button onClick={() => handlePaymentChange('transferencia')} className={`p-3 rounded-xl border font-bold text-sm flex items-center justify-center gap-2 transition ${paymentMethod === 'transferencia' ? 'bg-purple-50 border-purple-500 text-purple-700 shadow-sm' : 'bg-white dark:bg-gray-800 dark:border-gray-600 hover:bg-gray-50'}`}><FaMobileAlt/> Transferir</button>
                        <button onClick={() => handlePaymentChange('mercadopago')} className={`p-3 rounded-xl border font-bold text-sm flex items-center justify-center gap-2 transition ${paymentMethod === 'mercadopago' ? 'bg-sky-50 border-sky-500 text-sky-700 shadow-sm' : 'bg-white dark:bg-gray-800 dark:border-gray-600 hover:bg-gray-50'}`}><FaCreditCard/> Pago Digital</button>
                    </div>
                </div>

                <div className="bg-white dark:bg-gray-800 p-4 rounded-xl border dark:border-gray-700 space-y-2 shadow-sm">
                    <div className="flex justify-between text-sm text-gray-600 dark:text-gray-400"><span>Subtotal:</span><span>${subtotal}</span></div>
                    {paymentMethod === 'mercadopago' && <div className="flex justify-between text-sm text-sky-600 font-bold"><span>Comisión Digital:</span><span>+${commission}</span></div>}
                    <div className="flex justify-between text-xl font-extrabold text-gray-800 dark:text-white border-t dark:border-gray-700 pt-3 mt-2">
                        <span>Total:</span>
                        <span className={paymentMethod === 'mercadopago' ? 'text-sky-600' : 'text-green-600'}>${total}</span>
                    </div>
                </div>

                {paymentMethod === 'mercadopago' && (
                    <div className="bg-sky-50 p-4 rounded-xl border border-sky-100 text-center animate-fade-in">
                        {preferenceId ? <Wallet initialization={{ preferenceId }} customization={{ texts: { valueProp: 'smart_option' } }} /> : <div className="py-4"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-sky-600 mx-auto"></div><p className="text-xs text-sky-600 mt-2">Cargando pago seguro...</p></div>}
                    </div>
                )}

                {/* --- SECCIÓN TRANSFERENCIA CORREGIDA --- */}
                {paymentMethod === 'transferencia' && (
                    <div className="bg-purple-50 dark:bg-gray-800 p-4 rounded-xl border border-purple-100 dark:border-gray-700 animate-fade-in space-y-3">
                         {!selectedBankInfo ? (
                             // LISTA DE CUENTAS
                             accounts.length > 0 ? (
                                accounts.map(acc => (
                                    <div key={acc.id} onClick={() => setSelectedBankInfo(acc)} className={`p-3 rounded-lg cursor-pointer text-white shadow-sm hover:scale-[1.01] transition ${getBankStyle(acc.bank)}`}> 
                                        <p className="font-bold">{acc.bank}</p> 
                                        <p className="font-mono text-sm opacity-90">{acc.number}</p> 
                                        <p className="text-xs text-right mt-1">{acc.name}</p> 
                                    </div>
                                ))
                             ) : <p className="text-center text-gray-500">No hay cuentas configuradas.</p>
                         ) : (
                             // DETALLE DE CUENTA SELECCIONADA
                             <div className="text-center">
                                 <div className="flex justify-between items-center mb-2">
                                     <button onClick={() => setSelectedBankInfo(null)} className="text-xs text-purple-600 underline flex items-center gap-1"><FaArrowLeft/> Volver</button>
                                     <p className="font-bold text-gray-700 dark:text-white">Transfiere ${total}</p>
                                 </div>
                                 <div className={`p-4 rounded-lg text-white mb-3 relative ${getBankStyle(selectedBankInfo.bank)}`}> 
                                     <p className="font-bold text-lg mb-1">{selectedBankInfo.bank}</p> 
                                     <p className="font-mono text-xl tracking-widest mb-2">{selectedBankInfo.number}</p>
                                     <button onClick={copyToClipboard} className="absolute top-4 right-4 text-white/80 hover:text-white hover:scale-110 transition"><FaCopy size={20}/></button>
                                     <p className="text-xs opacity-90 uppercase">Titular: {selectedBankInfo.name}</p>
                                 </div>
                                 <label className={`block w-full p-4 border-2 border-dashed rounded-lg cursor-pointer transition text-center ${transferFile ? 'border-green-500 bg-green-50' : 'border-purple-300 bg-white dark:bg-gray-700 hover:bg-purple-50'}`}>
                                     {transferFile ? <FaCheckCircle className="mx-auto text-green-500 text-2xl mb-1"/> : <FaUpload className="mx-auto text-purple-500 text-2xl mb-1"/>}
                                     <span className="text-sm font-bold text-gray-600 dark:text-gray-300">{transferFile ? "Comprobante cargado" : "Subir Comprobante (Foto)"}</span>
                                     <input type="file" onChange={e => setTransferFile(e.target.files[0])} className="hidden" accept="image/*" />
                                 </label>
                             </div>
                         )}
                    </div>
                )}

                {paymentMethod !== 'mercadopago' && (
                    <button 
                        onClick={handleManualCheckout} 
                        disabled={loading || uploading || (orderType === 'mesa' && selectedTables.length === 0)} 
                        className={`w-full py-4 rounded-xl font-bold text-lg shadow-lg transition-transform active:scale-95 flex items-center justify-center gap-2
                            ${paymentMethod === 'efectivo' ? 'bg-green-600 hover:bg-green-700 text-white' : 
                              paymentMethod === 'point' ? 'bg-blue-600 hover:bg-blue-700 text-white' :
                              'bg-purple-600 hover:bg-purple-700 text-white'}
                            ${(loading || uploading || (orderType === 'mesa' && selectedTables.length === 0)) ? 'opacity-50 cursor-not-allowed' : ''}
                        `}
                    >
                        {loading || uploading ? 'Procesando...' : <><FaCheckCircle /> Confirmar Pedido (${total})</>}
                    </button>
                )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}