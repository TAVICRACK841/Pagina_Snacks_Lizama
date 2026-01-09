import { useStore } from '@nanostores/react';
import { isCartOpen, cartItems } from '../stores/cartStore';
import { FaShoppingCart } from 'react-icons/fa';
import { useState, useEffect } from 'react';

export default function CartFloatingButton() {
  const $cartItems = useStore(cartItems);
  const [animate, setAnimate] = useState(false);

  const totalItems = $cartItems.reduce((acc, item) => acc + item.quantity, 0);
  const totalPrice = $cartItems.reduce((acc, item) => acc + (item.price * item.quantity), 0);

  // Animación cuando cambia la cantidad
  useEffect(() => {
    if (totalItems > 0) {
      setAnimate(true);
      const timer = setTimeout(() => setAnimate(false), 300);
      return () => clearTimeout(timer);
    }
  }, [totalItems]);

  if (totalItems === 0) return null;

  return (
    <button 
      onClick={() => isCartOpen.set(true)}
      /* CAMBIOS: bg-yellow-500, ring-yellow-300, shadow personalizado */
      className={`fixed bottom-6 right-6 z-40 bg-yellow-500 text-white p-4 rounded-full shadow-[0_4px_20px_rgba(234,179,8,0.4)] flex items-center gap-3 transition-all hover:scale-105 hover:bg-yellow-600 active:scale-95 ${animate ? 'scale-110 ring-4 ring-yellow-300' : ''}`}
    >
      <div className="relative">
        <FaShoppingCart className="text-2xl drop-shadow-sm" />
        
        {/* Badge Rojo con borde Amarillo */}
        <span className="absolute -top-3 -right-3 bg-red-600 text-white text-xs font-bold w-6 h-6 flex items-center justify-center rounded-full border-2 border-yellow-500 shadow-sm">
          {totalItems}
        </span>
      </div>
      
      <div className="hidden md:block text-left">
        {/* Texto secundario en amarillo muy claro */}
        <p className="text-xs font-bold text-yellow-100 uppercase">Mi Pedido</p>
        <p className="font-extrabold text-sm">${totalPrice}</p>
      </div>
    </button>
  );
}