import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from './config';

// ID del documento donde guardaremos la configuración
const CONFIG_DOC_ID = 'restaurant_settings';

// Función para obtener el número de mesas
export const getTableCount = async () => {
  try {
    const docRef = doc(db, 'config', CONFIG_DOC_ID);
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      return docSnap.data().tableCount || 10; // Si existe, devuelve el número, si no, 10 por defecto
    } else {
      // Si no existe el documento, lo creamos con 10 mesas por defecto
      await setDoc(docRef, { tableCount: 10 });
      return 10;
    }
  } catch (error) {
    console.error("Error obteniendo mesas:", error);
    return 10; // Valor seguro en caso de error
  }
};

// Función para que el Admin actualice el número de mesas
export const updateTableCount = async (count) => {
  try {
    const docRef = doc(db, 'config', CONFIG_DOC_ID);
    await setDoc(docRef, { tableCount: count }, { merge: true });
    return true;
  } catch (error) {
    console.error("Error actualizando mesas:", error);
    return false;
  }
};