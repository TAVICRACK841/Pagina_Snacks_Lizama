import { useStore } from '@nanostores/react';
import { isCartOpen, cartItems, removeFromCart, updateQuantity, clearCart } from '../stores/cartStore';
import { useState, useEffect } from 'react';
import { auth, db } from '../firebase/config';
import { addDoc, collection, doc, getDoc } from 'firebase/firestore';
import { showToast } from '../stores/toastStore'; // Importamos las notificaciones
import { getTableCount } from '../firebase/tablesConfig'; // Importamos la función de mesas

export default function Cart() {
  const $isCartOpen = useStore(isCartOpen);
  const $cartItems = useStore(cartItems);
  const [user, setUser] = useState(null);

  const [orderType, setOrderType] = useState('mesa'); 
  const [tableNumber, setTableNumber] = useState(''); // Ahora guardará el número seleccionado
  const [address, setAddress] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('efectivo');
  const [loading, setLoading] = useState(false);
  
  // Nuevo estado para la lista de mesas disponibles
  const [availableTables, setAvailableTables] = useState([]);

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(async (u) => {
      setUser(u);
      if (u) {
        // Cargar dirección guardada
        try {
          const docRef = doc(db, "users", u.uid);
          const docSnap = await getDoc(docRef);
          if (docSnap.exists() && docSnap.data().address) {
            setAddress(docSnap.data().address);
          }
        } catch (e) { console.error(e); }
      }
    });

    // Cargar el número de mesas disponibles desde Firebase
    const loadTables = async () => {
      const count = await getTableCount();
      // Creamos un array de números desde 1 hasta 'count'
      const tablesArray = Array.from({ length: count }, (_, i) => i + 1);
      setAvailableTables(tablesArray);
    };
    loadTables();

    return () => unsubscribe();
  }, []);

  const total = $cartItems.reduce((acc, item) => acc + item.price * item.quantity, 0);

  const handleCheckout = async () => {
    // Validaciones con Notificaciones Bonitas (Rojas)
    if (!user) return showToast("Debes iniciar sesión para pedir", 'error');
    if ($cartItems.length === 0) return showToast("El carrito está vacío", 'error');
    
    if (orderType === 'mesa' && !tableNumber) {
        return showToast("⚠️ Por favor, selecciona tu número de mesa.", 'error');
    }
    
    if (orderType === 'domicilio' && !address.trim()) {
        return showToast("⚠️ Por favor, ingresa tu dirección de entrega.", 'error');
    }

    setLoading(true);
    try {
      const orderData = {
        userId: user.uid,
        userEmail: user.email,
        userName: user.displayName || "Cliente", // Intentamos guardar el nombre
        items: $cartItems,
        total: total,
        type: orderType, 
        detail: orderType === 'mesa' ? `Mesa ${tableNumber}` : address,
        paymentMethod: paymentMethod,
        status: 'pendiente',
        date: new Date(),
        createdAt: new Date().toISOString() 
      };

      await addDoc(collection(db, "orders"), orderData);
      
      // Notificación de Éxito Verde
      showToast(`¡Pedido Enviado a ${orderType === 'mesa' ? 'Mesa ' + tableNumber : orderType}!`, 'success');
      
      clearCart();
      isCartOpen.set(false);
    } catch (error) {
      console.error(error);
      showToast("Error al enviar el pedido. Intenta de nuevo.", 'error');
    }
    setLoading(false);
  };

  if (!$isCartOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div 
        className="absolute inset-0 bg-black bg-opacity-50 transition-opacity" 
        onClick={() => isCartOpen.set(false)}
      ></div>
      
      <div className="relative w-full max-w-md bg-white h-full shadow-2xl flex flex-col overflow-y-auto p-6 animate-slide-in">
        <div className="flex justify-between items-center mb-6 border-b pb-4">
          <h2 className="text-2xl font-bold text-gray-800">Tu Pedido</h2>
          <button 
            onClick={() => isCartOpen.set(false)}
            className="text-gray-500 hover:text-red-500 font-bold text-xl p-2"
          >
            ✕
          </button>
        </div>

        <div className="flex-1 overflow-y-auto mb-6 pr-2">
          {$cartItems.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-gray-400">
                <span className="text-6xl mb-4">🛒</span>
                <p>Tu carrito está vacío.</p>
            </div>
          ) : (
            $cartItems.map((item) => (
              <div key={item.id} className="flex gap-4 mb-4 border-b pb-4 last:border-0">
                <img src={item.image} alt={item.name} className="w-20 h-20 rounded-lg object-cover bg-gray-100" />
                <div className="flex-1 flex flex-col justify-between">
                  <div>
                      <h4 className="font-bold text-lg leading-tight">{item.name}</h4>
                      <p className="text-orange-600 font-bold">${item.price * item.quantity}</p>
                  </div>
                  <div className="flex items-center gap-3 mt-2 bg-gray-50 w-fit p-1 rounded-lg">
                    <button onClick={() => updateQuantity(item.id, item.quantity - 1)} className="w-8 h-8 bg-white rounded shadow-sm flex items-center justify-center font-bold hover:bg-gray-100 transition">-</button>
                    <span className="font-bold w-6 text-center">{item.quantity}</span>
                    <button onClick={() => updateQuantity(item.id, item.quantity + 1)} className="w-8 h-8 bg-white rounded shadow-sm flex items-center justify-center font-bold hover:bg-gray-100 transition">+</button>
                  </div>
                </div>
                <button onClick={() => removeFromCart(item.id)} className="text-red-500 text-sm hover:underline self-start p-1">
                  Quitar
                </button>
              </div>
            ))
          )}
        </div>

        {$cartItems.length > 0 && (
          <div className="space-y-5 bg-gray-50 p-4 rounded-xl">
            <div>
              <label className="block font-bold mb-2 text-gray-700">¿Cómo lo quieres?</label>
              <select 
                value={orderType} 
                onChange={(e) => setOrderType(e.target.value)}
                className="w-full p-3 border border-gray-300 rounded-lg bg-white focus:ring-2 focus:ring-orange-500 outline-none appearance-none"
                style={{ backgroundImage: 'url("data:image/svg+xml;charset=US-ASCII,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%22292.4%22%20height%3D%22292.4%22%3E%3Cpath%20fill%3D%22%23007CB2%22%20d%3D%22M287%2069.4a17.6%2017.6%200%200%200-13-5.4H18.4c-5%200-9.3%201.8-12.9%205.4A17.6%2017.6%200%200%200%200%2082.2c0%205%201.8%209.3%205.4%2012.9l128%20127.9c3.6%203.6%207.8%205.4%2012.8%205.4s9.2-1.8%2012.8-5.4L287%2095c3.5-3.5%205.4-7.8%205.4-12.8%200-5-1.9-9.2-5.5-12.8z%22%2F%3E%3C%2Fsvg%3E")', backgroundRepeat: 'no-repeat', backgroundPosition: 'right .7em top 50%', backgroundSize: '.65em auto' }}
              >
                <option value="mesa">🍽️ Comer en Mesa</option>
                <option value="llevar">🛍️ Para Llevar (Paso por él)</option>
                <option value="domicilio">🛵 A Domicilio</option>
              </select>
            </div>

            {/* SELECCIÓN DE MESA DESPLEGABLE */}
            {orderType === 'mesa' && (
              <div className="animate-fade-in-down">
                 <label className="block font-bold mb-2 text-gray-700">Selecciona tu Mesa:</label>
                 <select 
                    value={tableNumber}
                    onChange={(e) => setTableNumber(e.target.value)}
                    className={`w-full p-3 border rounded-lg bg-white focus:outline-none appearance-none ${!tableNumber ? 'border-orange-300 ring-2 ring-orange-100' : 'border-gray-300 focus:ring-2 focus:ring-orange-500'}`}
                    style={{ backgroundImage: 'url("data:image/svg+xml;charset=US-ASCII,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%22292.4%22%20height%3D%22292.4%22%3E%3Cpath%20fill%3D%22%23007CB2%22%20d%3D%22M287%2069.4a17.6%2017.6%200%200%200-13-5.4H18.4c-5%200-9.3%201.8-12.9%205.4A17.6%2017.6%200%200%200%200%2082.2c0%205%201.8%209.3%205.4%2012.9l128%20127.9c3.6%203.6%207.8%205.4%2012.8%205.4s9.2-1.8%2012.8-5.4L287%2095c3.5-3.5%205.4-7.8%205.4-12.8%200-5-1.9-9.2-5.5-12.8z%22%2F%3E%3C%2Fsvg%3E")', backgroundRepeat: 'no-repeat', backgroundPosition: 'right .7em top 50%', backgroundSize: '.65em auto' }}
                  >
                    <option value="">-- Elige una mesa --</option>
                    {availableTables.map(num => (
                        <option key={num} value={num}>Mesa {num}</option>
                    ))}
                 </select>
                 {!tableNumber && <p className="text-orange-600 text-xs mt-1 font-bold">⚠️ Campo obligatorio</p>}
              </div>
            )}

            {orderType === 'domicilio' && (
              <div className="animate-fade-in-down">
                <textarea 
                  placeholder="📍 Dirección completa, número, colonia y referencias..." 
                  className={`w-full p-3 border rounded-lg focus:outline-none resize-none ${!address ? 'border-orange-300 ring-2 ring-orange-100' : 'border-gray-300 focus:ring-2 focus:ring-orange-500'}`}
                  rows="3"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                />
                {!address.trim() && <p className="text-orange-600 text-xs mt-1 font-bold">⚠️ Campo obligatorio</p>}
              </div>
            )}

            <div>
              <label className="block font-bold mb-2 text-gray-700">Método de Pago</label>
              <div className="flex gap-2 bg-gray-200 p-1 rounded-lg">
                {['efectivo', 'tarjeta', 'transferencia'].map((method) => (
                  <button
                    key={method}
                    onClick={() => setPaymentMethod(method)}
                    className={`flex-1 py-2 text-sm rounded-md font-bold capitalize transition-all ${
                      paymentMethod === method 
                        ? 'bg-white text-orange-600 shadow-sm' 
                        : 'text-gray-600 hover:bg-gray-300'
                    }`}
                  >
                    {method}
                  </button>
                ))}
              </div>
            </div>

            <div className="border-t border-gray-200 pt-4 mt-4">
              <div className="flex justify-between text-xl font-extrabold mb-4 text-gray-800">
                <span>Total:</span>
                <span>${total}</span>
              </div>
              <button 
                onClick={handleCheckout}
                disabled={loading || (orderType === 'mesa' && !tableNumber) || (orderType === 'domicilio' && !address.trim())}
                className="w-full bg-green-600 text-white py-4 rounded-xl font-bold text-lg hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors shadow-lg"
              >
                {loading ? 'Enviando...' : 'Confirmar Pedido'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}