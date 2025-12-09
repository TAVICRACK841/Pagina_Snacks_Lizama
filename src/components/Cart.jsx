import { useStore } from '@nanostores/react';
import { isCartOpen, cartItems, removeFromCart, updateQuantity, clearCart } from '../stores/cartStore';
import { useState, useEffect } from 'react';
import { auth, db } from '../firebase/config';
import { addDoc, collection, doc, onSnapshot, getDoc } from 'firebase/firestore';
import { showToast } from '../stores/toastStore';
import { FaCopy, FaArrowRight, FaArrowLeft, FaUpload, FaCheck, FaCreditCard, FaTrash } from 'react-icons/fa';
import { getBankStyle } from '../utils/bankStyles'; // Asegúrate de tener este archivo creado

export default function Cart() {
  const $isCartOpen = useStore(isCartOpen);
  const $cartItems = useStore(cartItems);
  const [user, setUser] = useState(null);
  const [userData, setUserData] = useState({});

  // ESTADOS
  const [orderType, setOrderType] = useState('mesa');
  const [tableNumber, setTableNumber] = useState('');
  const [selectedAddress, setSelectedAddress] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('efectivo');
  const [loading, setLoading] = useState(false);
  const [availableTables, setAvailableTables] = useState([]);
  
  // ESTADOS TRANSFERENCIA
  const [transferStep, setTransferStep] = useState(1);
  const [transferFile, setTransferFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  
  // ESTADOS BANCO DINÁMICO
  const [accounts, setAccounts] = useState([]);
  const [selectedBankInfo, setSelectedBankInfo] = useState(null);

  const CLOUD_NAME = import.meta.env.PUBLIC_CLOUDINARY_CLOUD_NAME || "dw5mio6d9"; 
  const UPLOAD_PRESET = import.meta.env.PUBLIC_CLOUDINARY_PRESET || "Snacks_Lizama"; 

  useEffect(() => {
    // 1. Cargar Configuración (Mesas y Cuentas Bancarias)
    const fetchConfig = async () => {
        try {
            const configSnap = await getDoc(doc(db, "store_config", "main"));
            if (configSnap.exists()) {
                const data = configSnap.data();
                // Mesas
                const total = data.tableCount || 15;
                setAvailableTables(Array.from({length: total}, (_, i) => i + 1));
                // Cuentas Bancarias
                if (data.accounts && Array.isArray(data.accounts)) {
                    setAccounts(data.accounts);
                }
            } else {
                setAvailableTables(Array.from({length: 15}, (_, i) => i + 1));
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

  const total = $cartItems.reduce((acc, item) => acc + item.price * item.quantity, 0);

  const copyToClipboard = () => {
      if(!selectedBankInfo) return;
      // Quitamos espacios al copiar
      navigator.clipboard.writeText(selectedBankInfo.number.replace(/\s/g, ''));
      showToast("¡Número copiado sin espacios!", "success");
  };

  const handleUploadProof = async () => {
      if (!transferFile) return null;
      const fd = new FormData();
      fd.append('file', transferFile);
      fd.append('upload_preset', UPLOAD_PRESET);
      const res = await fetch(`https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`, { method: 'POST', body: fd });
      const data = await res.json();
      return data.secure_url;
  };

  const handleCheckout = async () => {
    if (!user) return showToast("Inicia sesión para pedir", 'error');
    if ($cartItems.length === 0) return showToast("Carrito vacío", 'error');
    if (orderType === 'mesa' && !tableNumber) return showToast("Selecciona mesa", 'error');
    if (orderType === 'domicilio' && !selectedAddress) return showToast("Selecciona dirección", 'error');
    if (paymentMethod === 'transferencia') {
        if (!selectedBankInfo) return showToast("Selecciona una cuenta", 'error');
        if (!transferFile) return showToast("Sube el comprobante", 'error');
    }

    setLoading(true);
    try {
      let proofUrl = '';
      if (paymentMethod === 'transferencia') {
          setUploading(true);
          proofUrl = await handleUploadProof();
          setUploading(false);
      }

      const orderData = {
        userId: user.uid,
        userEmail: user.email,
        userName: userData.displayName || user.displayName || 'Cliente',
        items: $cartItems,
        total: total,
        type: orderType, 
        detail: orderType === 'mesa' ? `Mesa ${tableNumber}` : selectedAddress,
        paymentMethod: paymentMethod,
        // Guardamos detalles de a qué banco se pagó para referencia
        bankDetails: selectedBankInfo ? `${selectedBankInfo.bank} (${selectedBankInfo.name})` : null,
        proofOfPayment: proofUrl,
        status: 'pendiente',
        date: new Date(),
        createdAt: new Date().toISOString() 
      };

      await addDoc(collection(db, "orders"), orderData);
      showToast(`¡Pedido Enviado!`, 'success');
      clearCart();
      isCartOpen.set(false);
      // Resetear estados
      setPaymentMethod('efectivo'); setTransferStep(1); setTransferFile(null); setSelectedBankInfo(null);
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
      
      <div className="relative w-full max-w-md bg-white dark:bg-gray-900 h-full shadow-2xl flex flex-col overflow-y-auto p-6 transition-colors border-l dark:border-gray-800">
        <div className="flex justify-between items-center mb-6 border-b dark:border-gray-800 pb-4">
          <h2 className="text-2xl font-bold text-gray-800 dark:text-white">Tu Pedido</h2>
          <button onClick={() => isCartOpen.set(false)} className="text-gray-500 dark:text-gray-400 hover:text-red-500 font-bold text-xl">✕</button>
        </div>

        {/* LISTA DE ITEMS */}
        <div className="flex-1 overflow-y-auto mb-6 pr-1">
          {$cartItems.map((item) => (
            <div key={item.id} className="flex gap-4 mb-4 border-b dark:border-gray-800 pb-4">
              <img src={item.image} className="w-16 h-16 rounded object-cover bg-gray-100" />
              <div className="flex-1">
                <h4 className="font-bold dark:text-white">{item.name}</h4>
                <p className="text-orange-600 font-bold">${item.price}</p>
                <div className="flex items-center gap-2 mt-2">
                  <button onClick={() => updateQuantity(item.id, item.quantity - 1)} className="w-6 h-6 bg-gray-200 dark:bg-gray-700 dark:text-white rounded font-bold">-</button>
                  <span className="dark:text-white">{item.quantity}</span>
                  <button onClick={() => updateQuantity(item.id, item.quantity + 1)} className="w-6 h-6 bg-gray-200 dark:bg-gray-700 dark:text-white rounded font-bold">+</button>
                  <button onClick={() => removeFromCart(item.id)} className="ml-auto text-red-500 text-xs underline">Quitar</button>
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="space-y-4">
            <div>
              <label className="block font-bold mb-2 dark:text-white">¿Cómo lo quieres?</label>
              <select value={orderType} onChange={(e) => setOrderType(e.target.value)} className="w-full p-2 border rounded bg-gray-50 dark:bg-gray-800 dark:text-white dark:border-gray-700">
                <option value="mesa">Comer en Mesa</option>
                <option value="llevar">Para Llevar</option>
                <option value="domicilio">A Domicilio</option>
              </select>
            </div>

            {orderType === 'mesa' && (
              <div>
                  <label className="block text-sm font-bold text-gray-600 dark:text-gray-400 mb-1">Mesa</label>
                  <select className="w-full p-2 border rounded dark:bg-gray-800 dark:text-white dark:border-gray-700" value={tableNumber} onChange={(e) => setTableNumber(e.target.value)}>
                      <option value="">-- Selecciona --</option>
                      {availableTables.map(num => <option key={num} value={num}>Mesa {num}</option>)}
                  </select>
              </div>
            )}

            {orderType === 'domicilio' && (
              <div>
                  <label className="block text-sm font-bold text-gray-600 dark:text-gray-400 mb-1">Dirección</label>
                  {userData.savedAddresses && userData.savedAddresses.length > 0 ? (
                      <select className="w-full p-2 border rounded dark:bg-gray-800 dark:text-white dark:border-gray-700" value={selectedAddress} onChange={(e) => setSelectedAddress(e.target.value)}>
                          <option value="">-- Selecciona --</option>
                          {userData.savedAddresses.map(addr => <option key={addr.id} value={addr.text}>{addr.alias} - {addr.text.substring(0, 20)}...</option>)}
                      </select>
                  ) : <p className="text-red-500 text-xs">No tienes direcciones. Ve a tu Perfil.</p>}
                  <a href="/profile" className="text-blue-600 text-xs hover:underline block mt-1 font-bold">+ Agregar nueva ubicación</a>
              </div>
            )}

            <div>
              <label className="block font-bold mb-2 dark:text-white">Pago</label>
              <div className="flex gap-2">
                {['efectivo', 'tarjeta', 'transferencia'].map((method) => (
                  <button key={method} onClick={() => handlePaymentChange(method)} className={`flex-1 py-2 text-sm rounded border capitalize ${paymentMethod === method ? 'bg-orange-100 border-orange-500 text-orange-700 dark:bg-orange-900 dark:text-orange-300 dark:border-orange-700 font-bold' : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 dark:border-gray-700'}`}>{method}</button>
                ))}
              </div>
            </div>

            {/* LÓGICA DE TRANSFERENCIA */}
            {paymentMethod === 'transferencia' && (
                <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-xl border border-blue-100 dark:border-blue-800 animate-fade-in-down">
                    
                    {/* PASO 1: SELECCIONAR CUENTA (LISTA) */}
                    {transferStep === 1 && !selectedBankInfo && (
                        <>
                            <p className="text-sm font-bold text-blue-800 dark:text-blue-300 mb-2">Selecciona la cuenta:</p>
                            {accounts.length === 0 ? (
                                <p className="text-red-500 text-xs">No hay cuentas disponibles.</p>
                            ) : (
                                <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                                    {accounts.map(acc => (
                                        <div 
                                            key={acc.id} 
                                            onClick={() => setSelectedBankInfo(acc)}
                                            className={`p-3 rounded-lg cursor-pointer transition-transform hover:scale-[1.02] relative overflow-hidden shadow-sm text-white ${getBankStyle(acc.bank)}`}
                                        >
                                            <div className="flex items-center gap-2 relative z-10">
                                                <FaCreditCard className="opacity-80"/>
                                                <span className="font-bold tracking-wider text-sm">{acc.bank}</span>
                                            </div>
                                            <p className="font-mono text-sm tracking-widest mt-1 relative z-10 truncate">{acc.number}</p>
                                            {/* Decoración */}
                                            <div className="absolute -bottom-2 -right-2 text-4xl opacity-10 pointer-events-none"><FaCreditCard/></div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </>
                    )}

                    {/* PASO 1.5: CONFIRMAR Y COPIAR */}
                    {transferStep === 1 && selectedBankInfo && (
                        <>
                            <button onClick={() => setSelectedBankInfo(null)} className="text-xs text-blue-600 dark:text-blue-400 mb-2 flex items-center gap-1 hover:underline"><FaArrowLeft/> Cambiar cuenta</button>
                            <p className="text-sm font-bold text-blue-800 dark:text-blue-300 mb-2">Realiza la transferencia:</p>
                            
                            {/* Preview Tarjeta Seleccionada */}
                            <div className={`p-4 rounded-xl shadow-md relative overflow-hidden mb-3 text-white ${getBankStyle(selectedBankInfo.bank)}`}>
                                <div className="flex items-center gap-2 relative z-10">
                                    <FaCreditCard className="text-xl opacity-80"/>
                                    <span className="font-bold text-lg tracking-wider">{selectedBankInfo.bank}</span>
                                </div>
                                <div className="mt-3 relative z-10">
                                    <div className="flex justify-between items-center gap-2">
                                        {/* Break-all para evitar desbordamiento */}
                                        <p className="font-mono text-lg tracking-widest mb-1 break-all leading-tight">{selectedBankInfo.number}</p>
                                        <button onClick={copyToClipboard} className="bg-white/20 hover:bg-white/40 p-2 rounded-full transition text-sm flex-shrink-0" title="Copiar"><FaCopy/></button>
                                    </div>
                                    <p className="text-xs uppercase opacity-80 font-bold mt-1">{selectedBankInfo.name}</p>
                                </div>
                                <div className="absolute -bottom-4 -right-4 text-8xl opacity-10 pointer-events-none"><FaCreditCard/></div>
                            </div>

                            <button onClick={() => setTransferStep(2)} className="w-full bg-blue-600 text-white py-2 rounded font-bold text-sm hover:bg-blue-700 flex items-center justify-center gap-2">Siguiente: Subir Comprobante <FaArrowRight/></button>
                        </>
                    )}

                    {/* PASO 2: SUBIR COMPROBANTE */}
                    {transferStep === 2 && selectedBankInfo && (
                        <>
                            <button onClick={() => setTransferStep(1)} className="text-xs text-blue-600 dark:text-blue-400 mb-2 flex items-center gap-1 hover:underline"><FaArrowLeft/> Ver datos de pago</button>
                            <p className="text-sm font-bold text-blue-800 dark:text-blue-300 mb-2">Paso 2: Sube tu comprobante</p>
                            <label className="w-full h-32 border-2 border-dashed border-blue-300 dark:border-blue-700 rounded-lg flex flex-col items-center justify-center cursor-pointer hover:bg-blue-50 dark:hover:bg-blue-900/30 transition-colors relative overflow-hidden bg-white dark:bg-gray-800">
                                {transferFile ? (
                                    <div className="text-center"><FaCheck className="text-green-500 text-3xl mx-auto mb-1"/><span className="text-green-600 font-bold text-xs">Imagen seleccionada</span></div>
                                ) : (
                                    <><FaUpload className="text-blue-400 text-2xl mb-2"/><span className="text-blue-600 dark:text-blue-400 font-bold text-xs">Toca para subir foto</span></>
                                )}
                                <input type="file" accept="image/*" onChange={(e) => setTransferFile(e.target.files[0])} className="hidden" />
                            </label>
                        </>
                    )}
                </div>
            )}

            <div className="border-t dark:border-gray-800 pt-4 mt-4">
              <div className="flex justify-between text-xl font-bold mb-4 dark:text-white"><span>Total:</span><span>${total}</span></div>
              <button 
                onClick={handleCheckout} 
                disabled={loading || uploading || (paymentMethod === 'transferencia' && (!selectedBankInfo || !transferFile))}
                className="w-full bg-green-600 text-white py-3 rounded-lg font-bold hover:bg-green-700 disabled:bg-gray-400 dark:disabled:bg-gray-700 transition-all shadow-lg active:scale-95"
              >
                {loading || uploading ? 'Procesando...' : 'Confirmar Pedido'}
              </button>
            </div>
        </div>
      </div>
    </div>
  );
}