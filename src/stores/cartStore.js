import { atom } from 'nanostores';

// Intentamos leer del localStorage para no perder datos al recargar
const savedCart = typeof window !== 'undefined' ? JSON.parse(localStorage.getItem('cart') || '[]') : [];

export const isCartOpen = atom(false);
export const cartItems = atom(savedCart);

// Función auxiliar para guardar en el navegador
const save = (items) => {
    if (typeof window !== 'undefined') {
        localStorage.setItem('cart', JSON.stringify(items));
    }
};

export function addToCart(product) {
  const currentItems = cartItems.get();
  const existingItem = currentItems.find((item) => item.id === product.id);
  let newItems;

  if (existingItem) {
    newItems = currentItems.map((item) =>
        item.id === product.id ? { ...item, quantity: item.quantity + 1 } : item
      );
  } else {
    newItems = [...currentItems, { ...product, quantity: 1 }];
  }
  
  cartItems.set(newItems);
  save(newItems);
  isCartOpen.set(true);
}

export function removeFromCart(id) {
  const newItems = cartItems.get().filter((item) => item.id !== id);
  cartItems.set(newItems);
  save(newItems);
}

export function updateQuantity(id, newQuantity) {
  if (newQuantity < 1) return;
  const newItems = cartItems.get().map((item) =>
      item.id === id ? { ...item, quantity: newQuantity } : item
    );
  cartItems.set(newItems);
  save(newItems);
}

export function clearCart() {
  cartItems.set([]);
  save([]);
}