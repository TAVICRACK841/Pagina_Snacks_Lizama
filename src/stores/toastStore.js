import { atom } from 'nanostores';

export const toastMessage = atom(null);

export function showToast(message, type = 'success') {
  toastMessage.set({ message, type });
  setTimeout(() => {
    toastMessage.set(null);
  }, 3000);
}