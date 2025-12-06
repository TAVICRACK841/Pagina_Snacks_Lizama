import { atom } from 'nanostores';

export const isCartOpen = atom(false);
export const cartItems = atom([]);

export function addToCart(product) {
  const currentItems = cartItems.get();
  const existingItem = currentItems.find((item) => item.id === product.id);

  if (existingItem) {
    cartItems.set(
      currentItems.map((item) =>
        item.id === product.id ? { ...item, quantity: item.quantity + 1 } : item
      )
    );
  } else {
    cartItems.set([...currentItems, { ...product, quantity: 1 }]);
  }
  isCartOpen.set(true);
}

export function removeFromCart(id) {
  cartItems.set(cartItems.get().filter((item) => item.id !== id));
}

export function updateQuantity(id, newQuantity) {
  if (newQuantity < 1) return;
  cartItems.set(
    cartItems.get().map((item) =>
      item.id === id ? { ...item, quantity: newQuantity } : item
    )
  );
}

export function clearCart() {
  cartItems.set([]);
}