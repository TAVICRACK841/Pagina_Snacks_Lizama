import { useStore } from '@nanostores/react';
import { isCartOpen, cartItems, removeFromCart, updateQuantity, clearCart } from '../stores/cartStore';
import { useState, useEffect } from 'react';
import { auth, db } from '../firebase/config';
import { addDoc, collection, doc, onSnapshot, getDoc, updateDoc } from 'firebase/firestore';
import { showToast } from '../stores/toastStore';
import { FaCopy, FaArrowRight, FaArrowLeft, FaUpload, FaCheck, FaCreditCard, FaMoneyBillWave, FaShoppingBag } from 'react-icons/fa';
import { getBankStyle } from '../utils/bankStyles';
import { initMercadoPago, Wallet } from '@mercadopago/sdk-react';

const publicKey = import.meta.env.PUBLIC_MP_KEY;
if (publicKey) {
    initMercadoPago(publicKey, { locale: 'es-MX' });
}

const MP_PERCENTAGE = 0.05; 
const MP_FIXED_FEE = 5;     

export default function Cart() {
  const $isCartOpen = useStore(isCartOpen);
  const $cartItems = useStore(cartItems);
  const [user, setUser] = useState(null);
  const [userData, setUserData] = useState({});

  const [orderType, setOrderType] = useState('mesa');
  const [tableNumber, setTableNumber] = useState('');
  const [selectedAddress, setSelectedAddress] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('efectivo');
  const [loading, setLoading] = useState(false);
  const [availableTables, setAvailableTables] = useState([]);
  
  const [transferStep, setTransferStep] = useState(1);
  const [transferFile, setTransferFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [accounts, setAccounts] = useState([]);
  const [selectedBankInfo, setSelectedBankInfo] = useState(null);

  const [preferenceId, setPreferenceId] = useState(null);
  // Estado para evitar crear múltiples pedidos si el usuario da muchos clics
  const [currentOrderId, setCurrentOrderId] = useState(null);

  const CLOUD_NAME = import.meta.env.PUBLIC_CLOUDINARY_CLOUD_NAME || "dw5mio6d9"; 
  const UPLOAD_PRESET = import.meta.env.PUBLIC_CLOUDINARY_PRESET || "Snacks_Lizama"; 

  const subtotal = $cartItems.reduce((acc, item) => acc + item.price * item.quantity, 0);
  const commission = paymentMethod === 'mercadopago' 
      ? Math.ceil((subtotal * MP_PERCENTAGE) + MP_FIXED_FEE) 
      : 0;
  const total = subtotal + commission;

  useEffect(() => {
    const fetchConfig = async () => {
        try {
            const configSnap = await getDoc(doc(db, "store_config", "main"));
            if (configSnap.exists()) {
                const data = configSnap.data();
                setAvailableTables(Array.from({length: data.tableCount || 15}, (_, i) => i + 1));
                if (data.accounts && Array.isArray(data.accounts)) setAccounts(data.accounts);
            }
        } catch (e) { console.error(e); }
    };
    fetchConfig();

    const unsubscribe = auth.onAuthStateChanged((u) => {
      setUser(u);
      if (u) {
        onSnapshot(doc(db, "users", u.uid), (docSnap) => {
            if(docSnap.exists()) setUserData(docSnap.data());
        });
      }
    });
    return () => unsubscribe();
  }, []);

  // --- NUEVA LÓGICA DE MERCADO PAGO ---
  const createPreference = async () => {
      // Validaciones básicas antes de generar nada
      if (!user) return showToast("Inicia sesión para pagar", "error");
      if ($cartItems.length === 0) return;

      try {
          // 1. PREPARAMOS LOS DATOS DEL PEDIDO (Igual que en efectivo)
          const orderData = {
            userId: user.uid,
            userName: userData.displayName || user.displayName || 'Cliente',
            items: $cartItems,
            total: total, 
            subtotal: subtotal, 
            commission: commission, 
            type: orderType, 
            detail: orderType === 'mesa' ? `Mesa ${tableNumber}` : selectedAddress || 'Para Llevar',
            paymentMethod: 'mercadopago',
            bankDetails: 'Procesando pago digital...', 
            status: 'pendiente_pago', // <--- OJO: Se guarda como pendiente de pago
            createdAt: new Date().toISOString() 
          };

          let orderIdToUse = currentOrderId;

          // 2. SI NO HEMOS CREADO EL PEDIDO AÚN EN ESTA SESIÓN, LO CREAMOS EN FIREBASE
          if (!currentOrderId) {
             const docRef = await addDoc(collection(db, "orders"), orderData);
             orderIdToUse = docRef.id;
             setCurrentOrderId(docRef.id);
             console.log("📝 Pedido guardado en Firebase con ID:", docRef.id);
          } else {
             // Si ya existe (por si recargó el botón), actualizamos el total por si cambió algo
             await updateDoc(doc(db, "orders", currentOrderId), orderData);
          }

          // 3. PREPARAMOS LOS ITEMS PARA MERCADO PAGO
          const items = $cartItems.map(item => ({
              title: item.name,
              quantity: item.quantity,
              unit_price: Number(item.price),
              currency_id: 'MXN'
          }));

          if (commission > 0) {
              items.push({
                  title: "Comisión uso de Plataforma",
                  quantity: 1,
                  unit_price: Number(commission),
                  currency_id: 'MXN'
              });
          }

          // 4. PEDIMOS EL BOTÓN AL BACKEND, ENVIANDO EL ID DE FIREBASE
          const response = await fetch('/api/create_preference', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ 
                  items: items,
                  external_reference: orderIdToUse // <--- ¡AQUÍ ESTÁ LA MAGIA!
              })
          });

          const data = await response.json();
          if (data.id) {
              setPreferenceId(data.id);
          }
      } catch (error) {
          console.error("Error MP:", error);
          showToast("Error al generar pago", "error");
      }
  };

  useEffect(() => {
      // Solo generamos el botón si el usuario ya seleccionó MP
      if (paymentMethod === 'mercadopago' && $cartItems.length > 0) {
          createPreference();
      } else {
          setPreferenceId(null);
          setCurrentOrderId(null); // Reseteamos si cambia de método
      }
  }, [paymentMethod, $cartItems.length, commission]); 


  // ... Resto de funciones (copyToClipboard, handleUploadProof) iguales ...
  const copyToClipboard = () => { if(selectedBankInfo) { navigator.clipboard.writeText(selectedBankInfo.number.replace(/\s/g, '')); showToast("Copiado", "success"); }};
  const handleUploadProof = async () => { if (!transferFile) return null; const fd = new FormData(); fd.append('file', transferFile); fd.append('upload_preset', UPLOAD_PRESET); const res = await fetch(`https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`, { method: 'POST', body: fd }); const data = await res.json(); return data.secure_url; };

  const handleManualCheckout = async () => {
    if (!user) return showToast("Inicia sesión", 'error');
    if ($cartItems.length === 0) return showToast("Carrito vacío", 'error');
    if (orderType === 'mesa' && !tableNumber) return showToast("Selecciona mesa", 'error');
    if (orderType === 'domicilio' && !selectedAddress) return showToast("Selecciona dirección", 'error');
    if (paymentMethod === 'transferencia' && (!selectedBankInfo || !transferFile)) return showToast("Faltan datos de pago", 'error');

    setLoading(true);
    try {
      let proofUrl = '';
      let paymentDetail = 'Pago en Efectivo';

      if (paymentMethod === 'transferencia') {
          setUploading(true);
          proofUrl = await handleUploadProof();
          setUploading(false);
          paymentDetail = `Transferencia a: ${selectedBankInfo.bank}`;
      }

      const orderData = {
        userId: user.uid,
        userName: userData.displayName || user.displayName || 'Cliente',
        items: $cartItems,
        total: total, 
        subtotal: subtotal, 
        commission: commission, 
        type: orderType, 
        detail: orderType === 'mesa' ? `Mesa ${tableNumber}` : selectedAddress,
        paymentMethod: paymentMethod,
        bankDetails: paymentDetail,
        proofOfPayment: proofUrl,
        status: 'pendiente', // Pedidos manuales entran directo como pendientes
        createdAt: new Date().toISOString() 
      };

      await addDoc(collection(db, "orders"), orderData);
      showToast(`¡Pedido Enviado!`, 'success');
      clearCart();
      isCartOpen.set(false);
      setPaymentMethod('efectivo'); 
      setTransferStep(1); setTransferFile(null); setSelectedBankInfo(null);
    } catch (error) { showToast("Error al enviar", 'error'); setLoading(false); setUploading(false); }
    setLoading(false);
  };

  const handlePaymentChange = (method) => {
      setPaymentMethod(method);
      setTransferStep(1);
      setSelectedBankInfo(null);
  };

  if (!$isCartOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="absolute inset-0 bg-black bg-opacity-50" onClick={() => isCartOpen.set(false)}></div>
      
      <div className="relative w-full max-w-md bg-white dark:bg-gray-900 h-full shadow-2xl flex flex-col border-l dark:border-gray-800">
        
        <div className="flex justify-between items-center p-6 border-b dark:border-gray-800 bg-white dark:bg-gray-900 shrink-0">
          <h2 className="text-2xl font-bold text-gray-800 dark:text-white">Tu Pedido</h2>
          <button onClick={() => isCartOpen.set(false)} className="text-gray-500 hover:text-red-500 font-bold text-xl">✕</button>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          <div className="mb-4 space-y-4">
            {$cartItems.length === 0 ? <p className="text-gray-500 text-center">Vacío</p> : $cartItems.map((item) => (
                <div key={item.id} className="flex gap-4 pb-4 border-b dark:border-gray-800">
                    <img src={item.image} className="w-16 h-16 rounded object-cover bg-gray-100" />
                    <div className="flex-1">
                        <h4 className="font-bold dark:text-white">{item.name}</h4>
                        <p className="text-orange-600 font-bold">${item.price}</p>
                        <div className="flex items-center gap-3 mt-2">
                             <button onClick={() => updateQuantity(item.id, item.quantity - 1)} className="px-2 bg-gray-200 rounded">-</button>
                             <span className="font-bold dark:text-white">{item.quantity}</span>
                             <button onClick={() => updateQuantity(item.id, item.quantity + 1)} className="px-2 bg-gray-200 rounded">+</button>
                             <button onClick={() => removeFromCart(item.id)} className="text-red-500 text-xs ml-auto">Quitar</button>
                        </div>
                    </div>
                </div>
            ))}
          </div>

          {$cartItems.length > 0 && (
              <div className="mb-8">
                  <button onClick={() => isCartOpen.set(false)} className="w-full py-2 border-2 border-dashed border-gray-300 dark:border-gray-600 text-gray-500 dark:text-gray-400 font-bold rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition flex items-center justify-center gap-2">
                      <FaShoppingBag /> Agregar más productos
                  </button>
              </div>
          )}

          {$cartItems.length > 0 && (
            <div className="space-y-6">
                <div>
                    <label className="block font-bold mb-2 dark:text-white">¿Cómo lo quieres?</label>
                    <select value={orderType} onChange={(e) => setOrderType(e.target.value)} className="w-full p-3 border rounded bg-white dark:bg-gray-800 dark:text-white">
                        <option value="mesa">🍽️ Comer en Mesa</option>
                        <option value="llevar">🥡 Para Llevar</option>
                        <option value="domicilio">🛵 A Domicilio</option>
                    </select>
                </div>
                
                {orderType === 'mesa' && (
                    <select className="w-full p-3 border rounded dark:bg-gray-800 dark:text-white" value={tableNumber} onChange={e=>setTableNumber(e.target.value)}><option value="">Mesa...</option>{availableTables.map(n=><option key={n} value={n}>{n}</option>)}</select>
                )}
                {orderType === 'domicilio' && (
                     userData.savedAddresses?.length > 0 
                     ? <select className="w-full p-3 border rounded dark:bg-gray-800 dark:text-white" value={selectedAddress} onChange={e=>setSelectedAddress(e.target.value)}><option value="">Dirección...</option>{userData.savedAddresses.map(a=><option key={a.id} value={a.text}>{a.alias}</option>)}</select>
                     : <p className="text-red-500 text-xs">Agrega dirección en perfil</p>
                )}

                <div>
                    <label className="block font-bold mb-2 dark:text-white">Método de Pago</label>
                    <div className="grid grid-cols-3 gap-2">
                        <button onClick={() => handlePaymentChange('efectivo')} className={`p-2 rounded border font-bold text-xs ${paymentMethod === 'efectivo' ? 'bg-orange-100 border-orange-500 text-orange-700' : 'bg-white dark:bg-gray-800 dark:text-white'}`}>💵 Efectivo</button>
                        <button onClick={() => handlePaymentChange('transferencia')} className={`p-2 rounded border font-bold text-xs ${paymentMethod === 'transferencia' ? 'bg-orange-100 border-orange-500 text-orange-700' : 'bg-white dark:bg-gray-800 dark:text-white'}`}>📲 Transferir</button>
                        <button onClick={() => handlePaymentChange('mercadopago')} className={`p-2 rounded border font-bold text-xs ${paymentMethod === 'mercadopago' ? 'bg-blue-100 border-blue-500 text-blue-700' : 'bg-white dark:bg-gray-800 dark:text-white'}`}>💳 Tarjetas</button>
                    </div>
                </div>

                <div className="bg-gray-50 dark:bg-gray-800/50 p-4 rounded-lg border dark:border-gray-700 space-y-2">
                    <div className="flex justify-between text-sm text-gray-600 dark:text-gray-400">
                        <span>Subtotal productos:</span>
                        <span>${subtotal}</span>
                    </div>
                    {paymentMethod === 'mercadopago' && (
                        <div className="flex justify-between text-sm text-blue-600 dark:text-blue-400 font-bold">
                            <span>Comisión Servicio:</span>
                            <span>+${commission}</span>
                        </div>
                    )}
                    <div className="flex justify-between text-xl font-extrabold text-gray-800 dark:text-white border-t dark:border-gray-700 pt-2 mt-2">
                        <span>Total a Pagar:</span>
                        <span className={paymentMethod === 'mercadopago' ? 'text-blue-600' : 'text-green-600'}>${total}</span>
                    </div>
                    {paymentMethod === 'mercadopago' && <p className="text-[10px] text-gray-400 text-center leading-tight">Incluye tarifa de procesamiento de pagos digitales.</p>}
                </div>

                {paymentMethod === 'mercadopago' && (
                    <div className="bg-blue-50 p-4 rounded-xl border border-blue-100 text-center">
                        <p className="text-xs text-blue-800 mb-2 font-bold">⚠️ Al presionar abajo, tu pedido se guardará temporalmente.</p>
                        {preferenceId ? (
                            <Wallet initialization={{ preferenceId }} customization={{ texts: { valueProp: 'smart_option' } }} />
                        ) : <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>}
                    </div>
                )}

                {paymentMethod === 'transferencia' && (
                    <div className="bg-gray-100 dark:bg-gray-800 p-4 rounded">
                         {!selectedBankInfo ? (
                             accounts.map(acc => <div key={acc.id} onClick={() => setSelectedBankInfo(acc)} className={`p-2 mb-2 rounded cursor-pointer text-white ${getBankStyle(acc.bank)}`}>{acc.bank} - {acc.number}</div>)
                         ) : (
                             <div>
                                 <p className="font-bold text-white p-2 rounded mb-2 bg-gray-800">{selectedBankInfo.bank}: {selectedBankInfo.number}</p>
                                 <input type="file" onChange={e => setTransferFile(e.target.files[0])} className="text-xs" />
                             </div>
                         )}
                    </div>
                )}

                {paymentMethod !== 'mercadopago' && (
                    <button onClick={handleManualCheckout} disabled={loading} className="w-full bg-green-600 text-white py-4 rounded-xl font-bold text-lg hover:bg-green-700 shadow-lg">
                        {loading ? '...' : `Confirmar Pedido ($${total})`}
                    </button>
                )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}