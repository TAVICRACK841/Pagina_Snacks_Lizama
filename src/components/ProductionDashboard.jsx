import { useState, useEffect } from 'react';
import { db, auth } from '../firebase/config';
import { collection, addDoc, onSnapshot, doc, updateDoc, deleteDoc, query, orderBy, getDoc } from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';
import { FaClipboardList, FaTrash, FaCheckSquare, FaRegSquare, FaFire } from 'react-icons/fa';
import { showToast } from '../stores/toastStore';

// LISTA DE PRODUCTOS QUE SE PUEDEN PRODUCIR
const PRODUCTION_ITEMS = [
    'Hamburguesas',
    'Alitas',
    'Boneless',
    'Tiras de Pollo',
    'Papas',
    'Dedos de Queso',
    'Salchichas',
];

export default function ProductionDashboard() {
  const [lists, setLists] = useState([]);
  const [userRole, setUserRole] = useState(null);
  
  // Estados para CREAR (Solo Admin)
  // NOTA: Eliminé 'newTitle' porque ahora es automático
  const [quantities, setQuantities] = useState({}); 

  useEffect(() => {
    // 1. Obtener Rol
    const unsubAuth = onAuthStateChanged(auth, async (user) => {
        if (user) {
            const snap = await getDoc(doc(db, "users", user.uid));
            if(snap.exists()) setUserRole(snap.data().role);
        }
    });

    // 2. Escuchar Listas (TIEMPO REAL)
    const q = query(collection(db, "production_lists"), orderBy("createdAt", "desc"));
    const unsubLists = onSnapshot(q, (snapshot) => {
        setLists(snapshot.docs.map(d => ({ id: d.id, ...d.data() })));
    });

    return () => { unsubAuth(); unsubLists(); };
  }, []);

  // --- ALGORITMO PARA OBTENER EL SIGUIENTE ID (RELLENO DE HUECOS) ---
  const getNextId = () => {
      // Extraemos solo los customId de las listas existentes
      // Filtramos para asegurar que sean números
      const ids = lists
          .map(l => l.customId)
          .filter(id => typeof id === 'number')
          .sort((a, b) => a - b); // Ordenar ascendente: 1, 2, 4...

      let expected = 1;
      for (let id of ids) {
          if (id === expected) expected++;
          else if (id > expected) return expected; // ¡Encontramos un hueco!
      }
      return expected; // Si no hay huecos, el siguiente
  };

  // Calculamos el título actual para mostrarlo en la UI
  const nextIdToUse = getNextId();
  const autoTitle = `Producción #${nextIdToUse}`;

  // --- LOGICA DE INPUTS NUMÉRICOS ---
  const handleQuantityChange = (item, value) => {
      const num = parseInt(value);
      setQuantities(prev => ({
          ...prev,
          [item]: isNaN(num) ? 0 : num
      }));
  };

  const publishList = async () => {
      // FILTRAR: Solo items con cantidad > 0
      const itemsToSave = PRODUCTION_ITEMS.map(name => {
          const qty = quantities[name] || 0;
          return { name, qty };
      }).filter(item => item.qty > 0)
        .map(item => ({
            text: `${item.qty} ${item.name}`, 
            completed: false
        }));

      if (itemsToSave.length === 0) return showToast("Pon cantidad a al menos un producto", "error");
      
      try {
          // Calculamos el ID justo antes de guardar para mayor precisión
          const finalId = getNextId();
          const finalTitle = `Producción #${finalId}`;

          await addDoc(collection(db, "production_lists"), {
              customId: finalId, // GUARDAMOS EL NÚMERO PARA CALCULOS FUTUROS
              title: finalTitle,
              items: itemsToSave,
              createdAt: new Date().toISOString(),
              status: 'active',
              createdBy: userRole
          });
          showToast(`¡${finalTitle} enviada a cocina!`, "success");
          
          // Resetear formulario
          setQuantities({});
      } catch (error) {
          console.error(error);
          showToast("Error al publicar", "error");
      }
  };

  const deleteList = async (id) => {
      if(!confirm("¿Borrar esta lista? Si la borras, su número quedará disponible.")) return;
      await deleteDoc(doc(db, "production_lists", id));
      // Al borrar, el onSnapshot se dispara, actualiza 'lists', y 'nextIdToUse' se recalcula solo.
  };

  const toggleItem = async (list, itemIndex) => {
      const isListComplete = list.items.every(i => i.completed);
      if (isListComplete && !['admin'].includes(userRole)) return; 

      const newItems = [...list.items];
      newItems[itemIndex].completed = !newItems[itemIndex].completed;

      await updateDoc(doc(db, "production_lists", list.id), { items: newItems });
  };

  return (
    <div className="p-4 max-w-6xl mx-auto pb-24">
        <h1 className="text-3xl font-black text-white mb-6 flex items-center gap-2">
            <FaFire className="text-orange-500"/> Producción & Freidora
        </h1>

        {/* --- PANEL DE CREACIÓN (SOLO ADMIN) --- */}
        {userRole === 'admin' && (
            <div className="bg-zinc-800 p-5 rounded-2xl border border-yellow-500/50 mb-8 shadow-lg">
                <div className="flex justify-between items-center mb-6">
                    <h3 className="text-yellow-500 font-bold uppercase text-sm tracking-widest flex items-center gap-2">
                        <FaClipboardList/> Nueva Orden
                    </h3>
                    {/* VISUALIZADOR DEL TÍTULO AUTOMÁTICO */}
                    <span className="bg-yellow-500 text-black font-black px-4 py-1 rounded-full text-sm shadow-lg">
                        {autoTitle}
                    </span>
                </div>
                
                {/* GRID DE PRODUCTOS CON INPUTS */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                    {PRODUCTION_ITEMS.map((item) => {
                        const qty = quantities[item] || 0;
                        return (
                            <div key={item} className={`p-3 rounded-xl border flex flex-col items-center justify-between transition-colors ${qty > 0 ? 'bg-yellow-900/20 border-yellow-500' : 'bg-zinc-900 border-zinc-700'}`}>
                                <span className={`text-xs md:text-sm font-bold mb-2 text-center h-10 flex items-center ${qty > 0 ? 'text-yellow-500' : 'text-gray-400'}`}>
                                    {item}
                                </span>
                                
                                {/* INPUT NUMÉRICO */}
                                <input 
                                    type="number" 
                                    min="0"
                                    placeholder="0"
                                    className={`w-full text-center p-2 rounded-lg font-black text-xl outline-none border focus:ring-2 focus:ring-yellow-500 transition-all ${qty > 0 ? 'bg-yellow-500 text-black border-yellow-500' : 'bg-zinc-800 text-gray-500 border-zinc-600'}`}
                                    value={quantities[item] || ''}
                                    onChange={(e) => handleQuantityChange(item, e.target.value)}
                                    onFocus={(e) => e.target.select()} 
                                />
                            </div>
                        );
                    })}
                </div>

                <button onClick={publishList} className="w-full bg-yellow-500 hover:bg-yellow-400 text-black font-black py-4 rounded-xl uppercase shadow-lg transition-transform active:scale-95 text-lg flex justify-center items-center gap-2">
                    Publicar {autoTitle}
                </button>
            </div>
        )}

        {/* --- LISTAS ACTIVAS --- */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {lists.map(list => {
                const isAllDone = list.items && list.items.length > 0 && list.items.every(i => i.completed);

                return (
                    <div key={list.id} className={`bg-zinc-800 rounded-2xl overflow-hidden shadow-2xl border-2 transition-all ${isAllDone ? 'border-green-600 opacity-60 grayscale-[50%]' : 'border-zinc-600'}`}>
                        
                        {/* Header Lista */}
                        <div className={`p-4 flex justify-between items-center ${isAllDone ? 'bg-green-900/50' : 'bg-zinc-900'}`}>
                            <div>
                                <h3 className={`font-black text-xl ${isAllDone ? 'text-green-400 line-through' : 'text-white'}`}>
                                    {list.title}
                                </h3>
                                <p className="text-xs text-gray-400">
                                    {new Date(list.createdAt).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}
                                </p>
                            </div>
                            {userRole === 'admin' && (
                                <button onClick={() => deleteList(list.id)} className="text-red-500 hover:bg-red-900/30 p-2 rounded-full transition-colors">
                                    <FaTrash/>
                                </button>
                            )}
                        </div>

                        {/* Items (Checklist) */}
                        <div className="p-4 space-y-2">
                            {list.items && list.items.map((item, idx) => (
                                <div 
                                    key={idx} 
                                    onClick={() => !isAllDone && toggleItem(list, idx)}
                                    className={`flex items-center gap-3 p-3 rounded-xl border transition-all cursor-pointer select-none ${
                                        item.completed 
                                            ? 'bg-green-900/20 border-green-800 text-gray-500' 
                                            : isAllDone 
                                                ? 'bg-zinc-700 border-zinc-600 cursor-not-allowed'
                                                : 'bg-zinc-700/50 border-zinc-600 hover:bg-zinc-700 text-white'
                                    }`}
                                >
                                    <div className={`text-2xl ${item.completed ? 'text-green-500' : 'text-gray-400'}`}>
                                        {item.completed ? <FaCheckSquare/> : <FaRegSquare/>}
                                    </div>
                                    <span className={`font-bold text-lg ${item.completed ? 'line-through decoration-2' : ''}`}>
                                        {item.text}
                                    </span>
                                </div>
                            ))}
                        </div>

                        {/* Footer Status */}
                        <div className="p-3 bg-zinc-900 border-t border-zinc-700 text-center">
                            {isAllDone ? (
                                <span className="text-green-500 font-black uppercase flex items-center justify-center gap-2"><FaCheckSquare/> ¡Terminado!</span>
                            ) : (
                                <span className="text-yellow-500 font-bold text-xs uppercase animate-pulse">Producción en Curso...</span>
                            )}
                        </div>
                    </div>
                );
            })}

            {lists.length === 0 && (
                <div className="col-span-full text-center py-20 text-gray-500">
                    <FaClipboardList className="text-6xl mx-auto mb-4 opacity-20"/>
                    <p>No hay listas de producción pendientes.</p>
                </div>
            )}
        </div>
    </div>
  );
}