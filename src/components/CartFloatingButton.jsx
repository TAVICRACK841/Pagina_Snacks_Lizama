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
      className={`fixed bottom-6 right-6 z-40 bg-orange-600 text-white p-4 rounded-full shadow-2xl flex items-center gap-3 transition-transform hover:scale-105 active:scale-95 ${animate ? 'scale-110 ring-4 ring-orange-300' : ''}`}
    >
      <div className="relative">
        <FaShoppingCart className="text-2xl" />
        <span className="absolute -top-3 -right-3 bg-red-600 text-white text-xs font-bold w-6 h-6 flex items-center justify-center rounded-full border-2 border-orange-600">
          {totalItems}
        </span>
      </div>
      <div className="hidden md:block text-left">
        <p className="text-xs font-bold text-orange-200 uppercase">Mi Pedido</p>
        <p className="font-extrabold text-sm">${totalPrice}</p>
      </div>
    </button>
  );
}