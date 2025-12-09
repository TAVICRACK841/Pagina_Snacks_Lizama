import { useStore } from '@nanostores/react';
import { isCartOpen, cartItems, removeFromCart, updateQuantity, clearCart } from '../stores/cartStore';
import { useState, useEffect } from 'react';
import { auth, db } from '../firebase/config';
import { addDoc, collection, doc, onSnapshot, getDoc } from 'firebase/firestore';
import { showToast } from '../stores/toastStore'; // <--- USAMOS NOTIFICACIONES BONITAS

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

  useEffect(() => {
    const fetchConfig = async () => {
        try {
            const configSnap = await getDoc(doc(db, "store_config", "main"));
            const total = configSnap.exists() && configSnap.data().tableCount ? configSnap.data().tableCount : 15;
            setAvailableTables(Array.from({length: total}, (_, i) => i + 1));
        } catch (e) { setAvailableTables(Array.from({length: 15}, (_, i) => i + 1)); }
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

  const handleCheckout = async () => {
    // AQUÍ ESTABA LA ALERTA FEA -> AHORA ES TOAST
    if (!user) return showToast("Inicia sesión para pedir", 'error');
    if ($cartItems.length === 0) return showToast("Carrito vacío", 'error');
    if (orderType === 'mesa' && !tableNumber) return showToast("Selecciona tu mesa", 'error');
    if (orderType === 'domicilio' && !selectedAddress) return showToast("Selecciona una dirección", 'error');

    setLoading(true);
    try {
      const orderData = {
        userId: user.uid,
        userEmail: user.email,
        userName: userData.displayName || user.displayName || 'Cliente',
        items: $cartItems,
        total: total,
        type: orderType, 
        detail: orderType === 'mesa' ? `Mesa ${tableNumber}` : selectedAddress,
        paymentMethod: paymentMethod,
        status: 'pendiente',
        date: new Date(),
        createdAt: new Date().toISOString() 
      };

      await addDoc(collection(db, "orders"), orderData);
      
      // MENSAJE DE ÉXITO VERDE (No alerta blanca)
      showToast(`¡Pedido Enviado! Total: $${total}`, 'success');
      
      clearCart();
      isCartOpen.set(false);
    } catch (error) {
      console.error(error);
      showToast("Error al enviar", 'error');
    }
    setLoading(false);
  };

  if (!$isCartOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="absolute inset-0 bg-black bg-opacity-50" onClick={() => isCartOpen.set(false)}></div>
      <div className="relative w-full max-w-md bg-white h-full shadow-2xl flex flex-col overflow-y-auto p-6">
        <div className="flex justify-between items-center mb-6 border-b pb-4">
          <h2 className="text-2xl font-bold text-gray-800">Tu Pedido</h2>
          <button onClick={() => isCartOpen.set(false)} className="text-gray-500 hover:text-red-500 font-bold text-xl">✕</button>
        </div>

        <div className="flex-1 overflow-y-auto mb-6">
          {$cartItems.map((item) => (
            <div key={item.id} className="flex gap-4 mb-4 border-b pb-4">
              <img src={item.image} className="w-16 h-16 rounded object-cover" />
              <div className="flex-1">
                <h4 className="font-bold">{item.name}</h4>
                <p className="text-orange-600 font-bold">${item.price}</p>
                <div className="flex items-center gap-2 mt-2">
                  <button onClick={() => updateQuantity(item.id, item.quantity - 1)} className="w-6 h-6 bg-gray-200 rounded font-bold">-</button>
                  <span>{item.quantity}</span>
                  <button onClick={() => updateQuantity(item.id, item.quantity + 1)} className="w-6 h-6 bg-gray-200 rounded font-bold">+</button>
                  <button onClick={() => removeFromCart(item.id)} className="ml-auto text-red-500 text-xs underline">Quitar</button>
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="space-y-4">
            <div>
              <label className="block font-bold mb-2">¿Cómo lo quieres?</label>
              <select value={orderType} onChange={(e) => setOrderType(e.target.value)} className="w-full p-2 border rounded bg-gray-50">
                <option value="mesa">Comer en Mesa</option>
                <option value="llevar">Para Llevar</option>
                <option value="domicilio">A Domicilio</option>
              </select>
            </div>

            {orderType === 'mesa' && (
              <div>
                  <label className="block text-sm font-bold text-gray-600 mb-1">Número de Mesa</label>
                  <select className="w-full p-2 border rounded" value={tableNumber} onChange={(e) => setTableNumber(e.target.value)}>
                      <option value="">-- Selecciona --</option>
                      {availableTables.map(num => <option key={num} value={num}>Mesa {num}</option>)}
                  </select>
              </div>
            )}

            {orderType === 'domicilio' && (
              <div>
                  <label className="block text-sm font-bold text-gray-600 mb-1">Dirección de Entrega</label>
                  {userData.savedAddresses && userData.savedAddresses.length > 0 ? (
                      <select className="w-full p-2 border rounded" value={selectedAddress} onChange={(e) => setSelectedAddress(e.target.value)}>
                          <option value="">-- Elige una guardada --</option>
                          {userData.savedAddresses.map(addr => <option key={addr.id} value={addr.text}>{addr.alias} - {addr.text.substring(0, 25)}...</option>)}
                      </select>
                  ) : <p className="text-red-500 text-xs">No tienes direcciones. Ve a tu Perfil.</p>}
                  <a href="/profile" className="text-blue-600 text-xs hover:underline block mt-1 font-bold">+ Agregar nueva ubicación</a>
              </div>
            )}

            <div>
              <label className="block font-bold mb-2">Método de Pago</label>
              <div className="flex gap-2">
                {['efectivo', 'tarjeta', 'transferencia'].map((method) => (
                  <button key={method} onClick={() => setPaymentMethod(method)} className={`flex-1 py-2 text-sm rounded border capitalize ${paymentMethod === method ? 'bg-orange-100 border-orange-500 text-orange-700 font-bold' : 'bg-white text-gray-600'}`}>{method}</button>
                ))}
              </div>
            </div>

            <div className="border-t pt-4 mt-4">
              <div className="flex justify-between text-xl font-bold mb-4"><span>Total:</span><span>${total}</span></div>
              <button onClick={handleCheckout} disabled={loading} className="w-full bg-green-600 text-white py-3 rounded-lg font-bold hover:bg-green-700 disabled:bg-gray-400">
                {loading ? 'Enviando...' : 'Confirmar Pedido'}
              </button>
            </div>
        </div>
      </div>
    </div>
  );
}