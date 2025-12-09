import { atom } from 'nanostores';

// Creamos el átomo (estado) inicializado en null
export const toastMessage = atom(null); 

// Función para disparar la alerta
export function showToast(message, type = 'success') {
  toastMessage.set({ message, type });
  
  // Se quita sola a los 3 segundos
  setTimeout(() => {
    toastMessage.set(null);
  }, 3000);
}