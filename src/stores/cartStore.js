import { atom } from 'nanostores';

export const isCartOpen = atom(false);
export const cartItems = atom([]);

// Cargar carrito desde localStorage al iniciar
if (typeof window !== 'undefined') {
  const savedCart = localStorage.getItem('snacks_cart');
  if (savedCart) {
    cartItems.set(JSON.parse(savedCart));
  }
}

// Suscribirse a cambios para guardar en localStorage
cartItems.subscribe((items) => {
  if (typeof window !== 'undefined') {
    localStorage.setItem('snacks_cart', JSON.stringify(items));
  }
});

// Función auxiliar para comparar objetos de personalización
function areCustomizationsEqual(c1, c2) {
    // Si ambos son null/undefined, son iguales
    if (!c1 && !c2) return true;
    if (!c1 || !c2) return false;
    
    // Comparamos la descripción generada que es única por combinación
    // (Asegúrate de que en ProductCustomizer se genere siempre en el mismo orden)
    // Una forma más robusta es comparar JSON strings
    return JSON.stringify(c1) === JSON.stringify(c2);
}

export function addToCart(product) {
  const currentItems = cartItems.get();
  
  // Buscamos si ya existe el producto CON LA MISMA personalización
  const existingItemIndex = currentItems.findIndex((item) => 
      item.id === product.id && 
      areCustomizationsEqual(item.customization, product.customization)
  );

  if (existingItemIndex !== -1) {
    // Si existe idéntico, aumentamos cantidad
    const updatedItems = [...currentItems];
    updatedItems[existingItemIndex].quantity += 1;
    cartItems.set(updatedItems);
  } else {
    // Si es nuevo o tiene personalización diferente, lo agregamos como nuevo item
    cartItems.set([...currentItems, { ...product, quantity: 1 }]);
  }
  isCartOpen.set(true);
}

export function removeFromCart(productId, customization = null) {
  const currentItems = cartItems.get();
  // Filtramos quitando el item que coincida en ID y Personalización
  cartItems.set(currentItems.filter((item) => 
      !(item.id === productId && areCustomizationsEqual(item.customization, customization))
  ));
}

export function updateQuantity(productId, quantity, customization = null) {
  if (quantity < 1) {
      removeFromCart(productId, customization);
      return;
  }
  
  const currentItems = cartItems.get();
  const updatedItems = currentItems.map((item) => {
    if (item.id === productId && areCustomizationsEqual(item.customization, customization)) {
      return { ...item, quantity };
    }
    return item;
  });
  cartItems.set(updatedItems);
}

export function clearCart() {
  cartItems.set([]);
}