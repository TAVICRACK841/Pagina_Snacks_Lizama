import { useState, useEffect } from 'react';
import { FaCheck, FaTimes, FaPlus, FaMinus } from 'react-icons/fa';
import { showToast } from '../stores/toastStore';

export default function ProductCustomizer({ product, onClose, onAddToCart }) {
  const [removedItems, setRemovedItems] = useState([]);
  const [selectedExtras, setSelectedExtras] = useState([]);
  
  // Salsas y Bañados
  const [selectedSauce, setSelectedSauce] = useState(''); // Para hamburguesas
  const [isBathed, setIsBathed] = useState(false); // Checkbox de bañado
  const [wantsExtraSauce, setWantsExtraSauce] = useState(false); // Checkbox de salsa extra ($5)
  
  // Alitas/Boneless
  const [extraPieces, setExtraPieces] = useState(0);
  const [splitSauces, setSplitSauces] = useState({ sauce1: '', sauce2: '' });
  const [useSplitSauces, setUseSplitSauces] = useState(false);
  const [wingFlavor, setWingFlavor] = useState(''); // Sabor base (Gratis)

  const [currentPrice, setCurrentPrice] = useState(product.price);

  // COSTO FIJO POR SALSA EXTRA O BAÑADO
  const SAUCE_EXTRA_COST = 5;

  useEffect(() => {
    let newPrice = Number(product.price);
    
    // 1. Sumar Extras (Ingredientes extra)
    selectedExtras.forEach(extra => {
        newPrice += Number(extra.price);
    });

    // 2. Sumar Piezas Extra (Alitas)
    if (product.isCountable && extraPieces > 0) {
        newPrice += (extraPieces * (product.pricePerExtraPiece || 0));
    }

    // 3. REGLAS DE PRECIO DE SALSAS ($5)
    if (!product.isCountable) {
        // HAMBURGUESAS: Si seleccionó salsa en el dropdown, cobra $5
        if (selectedSauce) newPrice += SAUCE_EXTRA_COST;
    } else {
        // ALITAS/BONELESS/TIRAS:
        // Cobrar si pide "Salsa Extra" O si pide "Bañado" (Para tiras)
        if (wantsExtraSauce || isBathed) newPrice += SAUCE_EXTRA_COST;
    }

    setCurrentPrice(newPrice);
  }, [selectedExtras, extraPieces, product, selectedSauce, isBathed, wantsExtraSauce]);

  const toggleRemoveItem = (item) => {
      if (removedItems.includes(item)) setRemovedItems(removedItems.filter(i => i !== item));
      else setRemovedItems([...removedItems, item]);
  };

  const toggleExtra = (extra) => {
      if (selectedExtras.find(e => e.name === extra.name)) setSelectedExtras(selectedExtras.filter(e => e.name !== extra.name));
      else setSelectedExtras([...selectedExtras, extra]);
  };

  const handleConfirm = () => {
      // Validaciones
      if (product.isCountable && useSplitSauces && (!splitSauces.sauce1 || !splitSauces.sauce2)) {
          return showToast("Selecciona ambas salsas", "error");
      }

      // Construir descripción de Salsas
      let finalSauceDescription = '';
      if (product.isCountable) {
          // Alitas
          finalSauceDescription = useSplitSauces ? `${splitSauces.sauce1} / ${splitSauces.sauce2}` : wingFlavor;
          if (wantsExtraSauce) finalSauceDescription += ` + Salsa Extra`;
          if (isBathed) finalSauceDescription += ` (Bañado)`;
      } else {
          // Hamburguesas
          finalSauceDescription = selectedSauce ? `${selectedSauce} (Extra)` : '';
          if (isBathed && selectedSauce) finalSauceDescription += ` (Bañado)`;
      }

      const customization = {
          removed: removedItems,
          extras: selectedExtras,
          sauce: finalSauceDescription,
          extraPieces: extraPieces,
          finalPrice: currentPrice
      };

      // Descripción legible para el carrito
      let descriptionParts = [];
      if (removedItems.length > 0) descriptionParts.push(`Sin: ${removedItems.join(', ')}`);
      if (selectedExtras.length > 0) descriptionParts.push(`Extras: ${selectedExtras.map(e => e.name).join(', ')}`);
      if (finalSauceDescription) descriptionParts.push(`Salsa: ${finalSauceDescription}`);
      if (extraPieces > 0) descriptionParts.push(`+${extraPieces} pz extra`);

      onAddToCart({
          ...product,
          price: currentPrice, 
          customization: customization,
          customizationDescription: descriptionParts.join('. ')
      });
      onClose();
  };

  if (!product) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-end md:items-center justify-center bg-black/70 p-4 backdrop-blur-sm animate-fade-in">
      <div className="bg-white dark:bg-gray-900 w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden max-h-[90vh] flex flex-col animate-slide-up">
        
        <div className="p-4 bg-orange-600 text-white flex justify-between items-center shrink-0">
            <h3 className="text-xl font-bold">{product.name}</h3>
            <button onClick={onClose} className="text-white/80 hover:text-white"><FaTimes size={20}/></button>
        </div>

        <div className="p-6 overflow-y-auto flex-1 space-y-6 dark:text-white">
            
            {/* 1. INGREDIENTES A QUITAR (NO BAJAN PRECIO) */}
            {product.removableIngredients?.length > 0 && (
                <div>
                    <h4 className="font-bold mb-3 text-sm uppercase text-gray-500 dark:text-gray-400">🚫 Quitar Ingredientes (Sin costo)</h4>
                    <div className="flex flex-wrap gap-2">
                        {product.removableIngredients.map(item => (
                            <button key={item} onClick={() => toggleRemoveItem(item)} className={`px-3 py-2 rounded-full text-sm border transition flex items-center gap-2 ${removedItems.includes(item) ? 'bg-red-100 border-red-500 text-red-700 dark:bg-red-900/30 dark:text-red-300 line-through opacity-80' : 'border-gray-300 dark:border-gray-600'}`}>
                                {item} {removedItems.includes(item) && <FaTimes size={10}/>}
                            </button>
                        ))}
                    </div>
                </div>
            )}

            {/* 2. EXTRAS (SUMAN PRECIO) */}
            {product.extras?.length > 0 && (
                <div>
                    <h4 className="font-bold mb-3 text-sm uppercase text-gray-500 dark:text-gray-400">➕ Agregar Extras</h4>
                    <div className="space-y-2">
                        {product.extras.map((extra, idx) => {
                            const isSelected = selectedExtras.find(e => e.name === extra.name);
                            return (
                                <div key={idx} onClick={() => toggleExtra(extra)} className={`flex justify-between items-center p-3 rounded-lg border cursor-pointer transition ${isSelected ? 'bg-green-50 border-green-500 dark:bg-green-900/20' : 'border-gray-300 dark:border-gray-600'}`}>
                                    <span>{extra.name}</span>
                                    <div className="flex items-center gap-2"><span className="font-bold text-orange-600">+${extra.price}</span>{isSelected && <FaCheck className="text-green-600"/>}</div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}

            {/* 3. ALITAS / BONELESS / TIRAS (CONTABLE) */}
            {product.isCountable && (
                <div className="bg-orange-50 dark:bg-gray-800 p-4 rounded-xl space-y-4 border dark:border-gray-700">
                    {/* Piezas Extra */}
                    <div className="flex justify-between items-center pb-4 border-b dark:border-gray-700">
                        <h4 className="font-bold">🍗 Piezas Extra (+${product.pricePerExtraPiece})</h4>
                        <div className="flex items-center gap-3 bg-white dark:bg-gray-700 rounded-full p-1 border dark:border-gray-600">
                            <button onClick={() => setExtraPieces(Math.max(0, extraPieces - 1))} className="w-8 h-8 flex items-center justify-center bg-gray-200 dark:bg-gray-600 rounded-full hover:bg-orange-200"><FaMinus size={12}/></button>
                            <span className="font-bold w-6 text-center">{extraPieces}</span>
                            <button onClick={() => setExtraPieces(extraPieces + 1)} className="w-8 h-8 flex items-center justify-center bg-orange-500 text-white rounded-full hover:bg-orange-600"><FaPlus size={12}/></button>
                        </div>
                    </div>

                    {/* Elección de Sabor (GRATIS) */}
                    {product.sauceOptions?.length > 0 && (
                        <div>
                             <div className="flex justify-between items-center mb-2">
                                <h4 className="font-bold">Sabor / Salsa (Incluido)</h4>
                                {product.canSplitSauces && <button onClick={() => setUseSplitSauces(!useSplitSauces)} className={`text-xs px-2 py-1 rounded border ${useSplitSauces ? 'bg-orange-100 border-orange-500 text-orange-700' : ''}`}>🔀 Mitad y Mitad</button>}
                             </div>
                             
                             {useSplitSauces ? (
                                 <div className="grid grid-cols-2 gap-3 mb-4">
                                     <select value={splitSauces.sauce1} onChange={e => setSplitSauces({...splitSauces, sauce1: e.target.value})} className="p-2 border rounded text-sm dark:bg-gray-700 dark:text-white"><option value="">Sabor 1...</option>{product.sauceOptions.map(s => <option key={s} value={s}>{s}</option>)}</select>
                                     <select value={splitSauces.sauce2} onChange={e => setSplitSauces({...splitSauces, sauce2: e.target.value})} className="p-2 border rounded text-sm dark:bg-gray-700 dark:text-white"><option value="">Sabor 2...</option>{product.sauceOptions.map(s => <option key={s} value={s}>{s}</option>)}</select>
                                 </div>
                             ) : (
                                 <div className="flex flex-wrap gap-2 mb-4">
                                     {product.sauceOptions.map(sauce => (
                                         <button key={sauce} onClick={() => setWingFlavor(sauce)} className={`px-3 py-1 rounded-full text-sm border transition ${wingFlavor === sauce ? 'bg-orange-600 text-white border-orange-600' : 'border-gray-300 dark:border-gray-600 hover:bg-orange-100 dark:hover:bg-gray-700'}`}>{sauce}</button>
                                     ))}
                                 </div>
                             )}

                             {/* OPCIONES CON COSTO EXTRA ($5) */}
                             <div className="space-y-2 pt-2 border-t dark:border-gray-700">
                                <label className="flex items-center justify-between cursor-pointer p-2 hover:bg-white/50 rounded">
                                    <div className="flex items-center gap-2">
                                        <input type="checkbox" checked={wantsExtraSauce} onChange={e => setWantsExtraSauce(e.target.checked)} className="w-5 h-5 text-orange-600 rounded" />
                                        <span>Poner Salsa Extra</span>
                                    </div>
                                    <span className="font-bold text-orange-600">+$5</span>
                                </label>
                                
                                <label className="flex items-center justify-between cursor-pointer p-2 hover:bg-white/50 rounded">
                                    <div className="flex items-center gap-2">
                                        <input type="checkbox" checked={isBathed} onChange={e => setIsBathed(e.target.checked)} className="w-5 h-5 text-orange-600 rounded" />
                                        <span>Bañar en Salsa</span>
                                    </div>
                                    <span className="font-bold text-orange-600">+$5</span>
                                </label>
                             </div>
                        </div>
                    )}
                </div>
            )}

            {/* 4. HAMBURGUESAS (SALSA EXTRA = $5) */}
            {!product.isCountable && product.sauceOptions?.length > 0 && (
                <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-xl border dark:border-gray-700">
                    <div className="flex justify-between items-center mb-2">
                        <h4 className="font-bold">Salsa Extra / Bañado</h4>
                        <span className="bg-orange-100 text-orange-800 text-xs font-bold px-2 py-1 rounded">+$5</span>
                    </div>
                    
                    <select value={selectedSauce} onChange={e => setSelectedSauce(e.target.value)} className="w-full p-3 border rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white mb-3 outline-none focus:ring-2 focus:ring-orange-500">
                        <option value="">Ninguna</option>
                        {product.sauceOptions.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                    
                    {selectedSauce && (
                        <label className="flex items-center gap-2 cursor-pointer text-sm animate-fade-in">
                            <input type="checkbox" checked={isBathed} onChange={e => setIsBathed(e.target.checked)} className="w-5 h-5 text-orange-600 rounded" />
                            <span>¿Bañar la carne con esta salsa?</span>
                        </label>
                    )}
                </div>
            )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t dark:border-gray-800 bg-gray-50 dark:bg-gray-900/50 flex justify-between items-center shrink-0">
            <div><p className="text-xs text-gray-500 dark:text-gray-400 uppercase font-bold">Total Final</p><p className="text-3xl font-extrabold text-orange-600">${currentPrice}</p></div>
            <button onClick={handleConfirm} className="bg-green-600 text-white px-8 py-3 rounded-xl font-bold hover:bg-green-700 shadow-lg transform active:scale-95 transition flex items-center gap-2"><FaCheck /> Confirmar</button>
        </div>
      </div>
    </div>
  );
}