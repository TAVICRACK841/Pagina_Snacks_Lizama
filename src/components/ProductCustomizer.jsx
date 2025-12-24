import { useState, useEffect } from 'react';
import { FaCheck, FaTimes, FaPlus, FaMinus, FaHamburger, FaDrumstickBite, FaIceCream, FaUtensils, FaWineBottle, FaBoxOpen } from 'react-icons/fa';
import { showToast } from '../stores/toastStore';

export default function ProductCustomizer({ product, initialValues, onClose, onAddToCart }) {
  // --- 1. DETECCIÓN DE CATEGORÍA ---
  const c = product.category ? product.category.toLowerCase() : '';
  
  const isBurger = c.includes('hamburguesa');
  const isWingsType = c.includes('alitas') || c.includes('boneless') || c.includes('tiras'); 
  const isTiras = c.includes('tiras'); 
  const isPastaProtein = c.includes('pasta con');
  const isHotDog = c.includes('perros') || c.includes('hot dog');
  const isBox = c.includes('box');
  const isDrink = c.includes('embotellado') || c.includes('aguas');
  const isFrappe = c.includes('frappe');
  const isSimple = ['papas', 'media papas', 'pasta', 'media pasta', 'jugo'].includes(c);

  // --- 2. UNIFICACIÓN DE VARIABLES DE PRECIO ---
  // El error se arregla aquí: busca ambas formas de nombrar la variable
  const PIECE_PRICE = Number(product.extraPiecePrice || product.pricePerExtraPiece || 0);
  const POT_PRICE = Number(product.extraSaucePotPrice || 0);
  const SNACK_PRICE = Number(product.extraSnackPrice || 0);

  // --- 3. ESTADOS ---
  const [currentPrice, setCurrentPrice] = useState(product.price);

  // GENERAL
  const [friesType, setFriesType] = useState(() => initialValues?.rawState?.friesType || 'Papas a la Francesa');
  const [extraSaucePots, setExtraSaucePots] = useState(initialValues?.rawState?.extraSaucePots || 0);

  // HAMBURGUESA
  const [activeIngredients, setActiveIngredients] = useState(() => initialValues?.rawState?.activeIngredients || product.standardIngredients || []);
  const [extraIngredients, setExtraIngredients] = useState(() => initialValues?.rawState?.extraIngredients || []);
  const [meatType, setMeatType] = useState(() => initialValues?.rawState?.meatType || 'Pechuga Crispy');
  const [burgerBathedFlavor, setBurgerBathedFlavor] = useState(() => initialValues?.rawState?.burgerBathedFlavor || ''); 
  const [burgerSnacks, setBurgerSnacks] = useState(() => initialValues?.rawState?.burgerSnacks || { alitas: 0, boneless: 0, tiras: 0 });
  const [burgerSnackSauce, setBurgerSnackSauce] = useState(() => initialValues?.rawState?.burgerSnackSauce || 'Natural');

  // ALITAS / BONELESS / TIRAS
  const [extraPieces, setExtraPieces] = useState(initialValues?.rawState?.extraPieces || 0);
  const [sauceMode, setSauceMode] = useState(() => initialValues?.rawState?.sauceMode || 'Natural'); 
  const [useSplitFlavors, setUseSplitFlavors] = useState(() => initialValues?.rawState?.useSplitFlavors || false);
  const [selectedFlavors, setSelectedFlavors] = useState(() => initialValues?.rawState?.selectedFlavors || { flavor1: '', flavor2: '' });

  // HOT DOG
  const [isCombo, setIsCombo] = useState(() => initialValues?.rawState?.isCombo || false);

  // BEBIDAS
  const [drinkFlavor, setDrinkFlavor] = useState(() => initialValues?.rawState?.drinkFlavor || '');
  const [drinkOptions, setDrinkOptions] = useState(() => initialValues?.rawState?.drinkOptions || { ice: true, temp: 'Al Tiempo' });
  const [frappeOptions, setFrappeOptions] = useState(() => initialValues?.rawState?.frappeOptions || { chantilly: 'Normal', ice: 'Normal', tapioca: true });

  // BOX FAMILIAR
  const [boxConfig, setBoxConfig] = useState(() => initialValues?.rawState?.boxConfig || {
      mainChoice: 'Pasta y Hamburguesa', 
      proteinChoice: 'Alitas y Boneless',
      tirasMode: 'Natural',
      burgerMeat: 'Pechuga Crispy',
      burgerBathed: '', 
      wingsBonelessFlavors: { f1: '', f2: '' }, 
      splitWingsBoneless: false
  });
  const [boxExtras, setBoxExtras] = useState(() => initialValues?.rawState?.boxExtras || { alitas: 0, boneless: 0, tiras: 0 });
  const [boxExtraSauce, setBoxExtraSauce] = useState('Natural');

  const [selectedExtras, setSelectedExtras] = useState(initialValues?.extras || []);
  const SAUCES_LIST = product.sauceOptions || ['BBQ', 'Búfalo', 'Mango Habanero'];

  // --- 4. CÁLCULO DE PRECIO (EFECTO) ---
  useEffect(() => {
    let newPrice = Number(product.price);

    // Extras Generales
    selectedExtras.forEach(extra => newPrice += Number(extra.price));

    // Botecitos Salsa
    if (extraSaucePots > 0) newPrice += (extraSaucePots * POT_PRICE);

    // Hamburguesa
    if (isBurger) {
        if (extraIngredients.length > 0) newPrice += (extraIngredients.length * (product.standardIngredientsPrice || 0));
        const totalBurgerSnacks = burgerSnacks.alitas + burgerSnacks.boneless + burgerSnacks.tiras;
        if (totalBurgerSnacks > 0) newPrice += (totalBurgerSnacks * SNACK_PRICE);
        if (burgerBathedFlavor) newPrice += 5; // Costo por bañar carne
    }

    // Alitas / Boneless / Tiras / Pasta Proteína / Box (Piezas extra genéricas)
    if ((isWingsType || isPastaProtein) && extraPieces > 0) {
        newPrice += (extraPieces * PIECE_PRICE); // AQUÍ USA LA VARIABLE CORREGIDA
    }

    // Box Familiar
    if (isBox) {
        const totalBoxExtras = boxExtras.alitas + boxExtras.boneless + boxExtras.tiras;
        if (totalBoxExtras > 0) newPrice += (totalBoxExtras * SNACK_PRICE);
        if (extraPieces > 0) newPrice += (extraPieces * PIECE_PRICE); // Piezas extra del box
    }

    setCurrentPrice(newPrice);
  }, [selectedExtras, extraSaucePots, extraIngredients, burgerSnacks, extraPieces, boxExtras, product, burgerBathedFlavor, PIECE_PRICE, POT_PRICE, SNACK_PRICE]);

  // --- UI HELPERS ---
  const toggleStandardIngredient = (ing) => activeIngredients.includes(ing) ? setActiveIngredients(activeIngredients.filter(i => i !== ing)) : setActiveIngredients([...activeIngredients, ing]);
  const toggleExtraIngredient = (ing) => extraIngredients.includes(ing) ? setExtraIngredients(extraIngredients.filter(i => i !== ing)) : setExtraIngredients([...extraIngredients, ing]);
  const toggleExtra = (extra) => selectedExtras.find(e => e.name === extra.name) ? setSelectedExtras(selectedExtras.filter(e => e.name !== extra.name)) : setSelectedExtras([...selectedExtras, extra]);
  const updateBurgerSnack = (type, delta) => { const val = burgerSnacks[type] + delta; if (val >= 0) setBurgerSnacks({ ...burgerSnacks, [type]: val }); };
  const updateBoxExtra = (type, delta) => { const val = boxExtras[type] + delta; if (val >= 0) setBoxExtras({ ...boxExtras, [type]: val }); };

  const handleConfirm = () => {
      // Validaciones
      if ((isWingsType || isPastaProtein) && !isTiras && useSplitFlavors && (!selectedFlavors.flavor1 || !selectedFlavors.flavor2)) return showToast("Elige ambos sabores", "error");
      if ((isWingsType || isPastaProtein) && !isTiras && !useSplitFlavors && !selectedFlavors.flavor1) return showToast("Elige un sabor", "error");
      if (isTiras && sauceMode === 'Bañado' && !selectedFlavors.flavor1) return showToast("Elige la salsa para bañar", "error");
      if ((isDrink || isFrappe) && product.flavorOptions?.length > 0 && !drinkFlavor) return showToast("Elige el sabor", "error");

      let desc = [];

      if (isBurger) {
          if (meatType) desc.push(`Carne: ${meatType}`);
          if (burgerBathedFlavor) desc.push(`Bañada en: ${burgerBathedFlavor}`);
          if (friesType) desc.push(`${friesType}`);
          const totalSnacks = burgerSnacks.alitas + burgerSnacks.boneless + burgerSnacks.tiras;
          if (totalSnacks > 0) {
              let snacksDesc = [];
              if (burgerSnacks.alitas > 0) snacksDesc.push(`${burgerSnacks.alitas} Alitas`);
              if (burgerSnacks.boneless > 0) snacksDesc.push(`${burgerSnacks.boneless} Boneless`);
              if (burgerSnacks.tiras > 0) snacksDesc.push(`${burgerSnacks.tiras} Tiras`);
              desc.push(`Extras: ${snacksDesc.join(', ')} (${burgerSnackSauce})`);
          }
          const removed = (product.standardIngredients || []).filter(ing => !activeIngredients.includes(ing));
          if (removed.length > 0) desc.push(`Sin: ${removed.join(', ')}`);
          if (extraIngredients.length > 0) desc.push(`Extra: ${extraIngredients.join(', ')}`);
      }

      if (isWingsType || isPastaProtein) {
          let flavorStr = '';
          if (isTiras && sauceMode === 'Natural') flavorStr = 'Naturales';
          else flavorStr = useSplitFlavors ? `${selectedFlavors.flavor1} / ${selectedFlavors.flavor2}` : selectedFlavors.flavor1;
          
          desc.push(`Sabor: ${flavorStr}`);
          if (extraPieces > 0) desc.push(`+${extraPieces} pz extra`);
          if (!isPastaProtein) desc.push(friesType);
      }

      if (isHotDog) {
          desc.push(isCombo ? `Combo (${friesType})` : "Individual");
          const removed = (product.standardIngredients || []).filter(ing => !activeIngredients.includes(ing));
          if (removed.length > 0) desc.push(`Sin: ${removed.join(', ')}`);
      }

      if (isBox) {
          desc.push(`[${boxConfig.mainChoice}]`);
          desc.push(`[${boxConfig.proteinChoice}]`);
          if (boxConfig.mainChoice.includes('Hamburguesa')) desc.push(`Burger: ${boxConfig.burgerMeat} ${boxConfig.burgerBathed ? `(${boxConfig.burgerBathed})` : ''}`);
          desc.push(`Tiras: ${boxConfig.tirasMode}`);
          const boxFlavors = boxConfig.splitWingsBoneless ? `${boxConfig.wingsBonelessFlavors.f1} / ${boxConfig.wingsBonelessFlavors.f2}` : boxConfig.wingsBonelessFlavors.f1 || 'Al Gusto';
          desc.push(`Salsas: ${boxFlavors}`);
          desc.push(friesType);
          const totalBoxExtras = boxExtras.alitas + boxExtras.boneless + boxExtras.tiras;
          if (totalBoxExtras > 0) {
               let extB = [];
               if (boxExtras.alitas > 0) extB.push(`${boxExtras.alitas} Alitas`);
               if (boxExtras.boneless > 0) extB.push(`${boxExtras.boneless} Boneless`);
               if (boxExtras.tiras > 0) extB.push(`${boxExtras.tiras} Tiras`);
               desc.push(`Extras Box: ${extB.join(', ')} (${boxExtraSauce})`);
          }
          if (extraPieces > 0) desc.push(`+${extraPieces} pz extra (Box)`);
      }

      if (isDrink) desc.push(`${drinkFlavor} ${product.hasIceOption ? (drinkOptions.ice ? 'Con Hielo' : 'Sin Hielo') : ''} ${product.hasTempOption ? drinkOptions.temp : ''}`);
      if (isFrappe) desc.push(`${drinkFlavor}, Chantilly: ${frappeOptions.chantilly}, Hielo: ${frappeOptions.ice}, ${frappeOptions.tapioca ? 'Con Tapioca' : 'Sin Tapioca'}`);

      if (extraSaucePots > 0) desc.push(`+${extraSaucePots} botes salsa`);
      if (selectedExtras.length > 0) desc.push(`Extras: ${selectedExtras.map(e => e.name).join(', ')}`);

      const rawState = { activeIngredients, extraIngredients, friesType, extraSaucePots, meatType, burgerBathedFlavor, burgerSnacks, burgerSnackSauce, extraPieces, sauceMode, selectedFlavors, useSplitFlavors, isCombo, boxConfig, boxExtras, boxExtraSauce, drinkFlavor, drinkOptions, frappeOptions };

      onAddToCart({ ...product, price: currentPrice, customization: { removed: [], extras: selectedExtras, rawState, finalPrice: currentPrice }, customizationDescription: desc.join('. ') });
      onClose();
  };

  if (!product) return null;
  if (isSimple && !product.extras?.length) {}

  return (
    <div className="fixed inset-0 z-[60] flex items-end md:items-center justify-center bg-black/70 p-4 backdrop-blur-sm animate-fade-in">
      <div className="bg-white dark:bg-gray-900 w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden max-h-[90vh] flex flex-col animate-slide-up">
        
        <div className="p-4 bg-orange-600 text-white flex justify-between items-center shrink-0">
            <h3 className="text-xl font-bold">{product.name}</h3>
            <button onClick={onClose} className="text-white/80 hover:text-white"><FaTimes size={20}/></button>
        </div>

        <div className="p-6 overflow-y-auto flex-1 space-y-6 dark:text-white">
            
            {/* --- HAMBURGUESA --- */}
            {isBurger && (
                <div className="space-y-5">
                    <div className="bg-orange-50 dark:bg-gray-800 p-3 rounded-xl border dark:border-gray-700">
                        <h4 className="font-bold mb-2 flex gap-2 items-center"><FaHamburger/> Carne</h4>
                        <div className="flex gap-4 mb-2">
                            <label className="flex items-center gap-1 cursor-pointer"><input type="radio" checked={meatType === 'Pechuga Crispy'} onChange={()=>setMeatType('Pechuga Crispy')} className="text-orange-600"/> Pechuga Crispy</label>
                            <label className="flex items-center gap-1 cursor-pointer"><input type="radio" checked={meatType === 'Tiras de Pollo'} onChange={()=>setMeatType('Tiras de Pollo')} className="text-orange-600"/> Tiras de Pollo</label>
                        </div>
                        <div className="mt-2 pt-2 border-t border-orange-200">
                            <p className="text-xs font-bold mb-1">¿Bañar Carne? (+$5)</p>
                            <select className="w-full p-2 text-sm border rounded dark:bg-gray-700" value={burgerBathedFlavor} onChange={e=>setBurgerBathedFlavor(e.target.value)}><option value="">No, natural</option>{SAUCES_LIST.map(s => <option key={s} value={s}>{s}</option>)}</select>
                        </div>
                    </div>
                    <div className="bg-gray-50 dark:bg-gray-800 p-3 rounded-xl border dark:border-gray-700">
                        <h4 className="font-bold mb-2 text-sm"><FaUtensils/> Acompañamiento</h4>
                        <div className="flex gap-4">
                            <label className="flex items-center gap-1 cursor-pointer"><input type="radio" checked={friesType === 'Papas a la Francesa'} onChange={()=>setFriesType('Papas a la Francesa')} className="text-orange-600"/> A la Francesa</label>
                            <label className="flex items-center gap-1 cursor-pointer"><input type="radio" checked={friesType === 'Papas Gajo'} onChange={()=>setFriesType('Papas Gajo')} className="text-orange-600"/> Gajo</label>
                        </div>
                    </div>
                    {product.standardIngredients?.length > 0 && (
                        <div className="space-y-3">
                            <div><p className="text-xs font-bold mb-1 text-red-500">Quitar Ingredientes:</p><div className="flex flex-wrap gap-2">{product.standardIngredients.map(ing => (<button key={ing} onClick={() => toggleStandardIngredient(ing)} className={`px-2 py-1 rounded text-xs border ${activeIngredients.includes(ing) ? 'bg-gray-100 dark:bg-gray-700 text-gray-500' : 'bg-red-100 text-red-600 border-red-200 font-bold line-through'}`}>{ing} {activeIngredients.includes(ing) ? <FaCheck/> : <FaTimes/>}</button>))}</div></div>
                            <div><p className="text-xs font-bold mb-1 text-green-600">Ingrediente Extra (+${product.standardIngredientsPrice}):</p><div className="flex flex-wrap gap-2">{product.standardIngredients.map(ing => (<button key={ing} onClick={() => toggleExtraIngredient(ing)} className={`px-2 py-1 rounded text-xs border ${extraIngredients.includes(ing) ? 'bg-green-600 text-white font-bold' : 'bg-white dark:bg-gray-700 border-gray-300'}`}>{ing}</button>))}</div></div>
                        </div>
                    )}
                    {product.allowExtraSnacks && (
                        <div className="bg-blue-50 dark:bg-gray-800 p-3 rounded-xl border dark:border-gray-700">
                            <h4 className="font-bold mb-2 flex items-center gap-2"><FaDrumstickBite/> Agregar Piezas (+${SNACK_PRICE} c/u)</h4>
                            <div className="space-y-2">{['alitas', 'boneless', 'tiras'].map(snack => (<div key={snack} className="flex justify-between items-center capitalize text-sm"><span>{snack}</span><div className="flex items-center gap-2"><button onClick={()=>updateBurgerSnack(snack, -1)} className="w-6 h-6 bg-gray-200 rounded-full">-</button><span className="font-bold">{burgerSnacks[snack]}</span><button onClick={()=>updateBurgerSnack(snack, 1)} className="w-6 h-6 bg-blue-600 text-white rounded-full">+</button></div></div>))}</div>
                            {(burgerSnacks.alitas > 0 || burgerSnacks.boneless > 0 || burgerSnacks.tiras > 0) && (<div className="mt-2 pt-2 border-t border-blue-200"><p className="text-xs mb-1 font-bold">Salsa para piezas extra:</p><select className="w-full p-1 text-sm border rounded" value={burgerSnackSauce} onChange={e=>setBurgerSnackSauce(e.target.value)}><option>Natural</option>{SAUCES_LIST.map(s=><option key={s} value={s}>{s}</option>)}</select></div>)}
                        </div>
                    )}
                </div>
            )}

            {/* --- ALITAS / BONELESS / TIRAS / PASTA --- */}
            {(isWingsType || isPastaProtein) && (
                <div className="space-y-5">
                    {isTiras && (
                        <div className="flex gap-4 p-2 bg-gray-100 dark:bg-gray-800 rounded-lg justify-center">
                            <label className="flex items-center gap-2 cursor-pointer"><input type="radio" checked={sauceMode === 'Natural'} onChange={()=>{setSauceMode('Natural'); setSelectedFlavors({flavor1:'', flavor2:''})}} className="text-orange-600"/> Naturales</label>
                            <label className="flex items-center gap-2 cursor-pointer"><input type="radio" checked={sauceMode === 'Bañado'} onChange={()=>setSauceMode('Bañado')} className="text-orange-600"/> Bañadas</label>
                        </div>
                    )}
                    {(!isTiras || sauceMode === 'Bañado') && (
                        <div className="bg-orange-50 dark:bg-gray-800 p-4 rounded-xl border dark:border-gray-700">
                            <div className="flex justify-between items-center mb-2"><h4 className="font-bold text-sm">Sabor (Incluido)</h4>{product.canSplitSauces && <button onClick={()=>setUseSplitFlavors(!useSplitFlavors)} className="text-xs text-blue-600 underline">{useSplitFlavors ? 'Un solo sabor' : 'Mitad y Mitad'}</button>}</div>
                            {useSplitFlavors ? (
                                <div className="grid grid-cols-2 gap-2"><select className="p-2 border rounded text-sm dark:bg-gray-700" value={selectedFlavors.flavor1} onChange={e => setSelectedFlavors({...selectedFlavors, flavor1: e.target.value})}><option value="">Mitad 1...</option>{SAUCES_LIST.map(s=><option key={s} value={s}>{s}</option>)}</select><select className="p-2 border rounded text-sm dark:bg-gray-700" value={selectedFlavors.flavor2} onChange={e => setSelectedFlavors({...selectedFlavors, flavor2: e.target.value})}><option value="">Mitad 2...</option>{SAUCES_LIST.map(s=><option key={s} value={s}>{s}</option>)}</select></div>
                            ) : (
                                <select className="w-full p-2 border rounded text-sm dark:bg-gray-700" value={selectedFlavors.flavor1} onChange={e => setSelectedFlavors({...selectedFlavors, flavor1: e.target.value})}><option value="">Elige Sabor...</option>{SAUCES_LIST.map(s=><option key={s} value={s}>{s}</option>)}</select>
                            )}
                        </div>
                    )}
                    <div className="bg-gray-50 dark:bg-gray-800 p-3 rounded-xl border dark:border-gray-700 flex justify-between items-center"><div><p className="font-bold text-sm">Agregar Más Piezas</p><p className="text-xs text-gray-500">+${PIECE_PRICE} c/u</p></div><div className="flex items-center gap-3 bg-white rounded-full p-1 border"><button onClick={()=>setExtraPieces(Math.max(0,extraPieces-1))} className="w-6 h-6 bg-gray-200 rounded-full">-</button><span className="font-bold w-4 text-center">{extraPieces}</span><button onClick={()=>setExtraPieces(extraPieces+1)} className="w-6 h-6 bg-orange-600 text-white rounded-full">+</button></div></div>
                    {!isPastaProtein && (<div className="bg-gray-50 dark:bg-gray-800 p-3 rounded-xl border dark:border-gray-700"><h4 className="font-bold mb-2 text-sm"><FaUtensils/> Acompañamiento</h4><div className="flex gap-4"><label className="flex items-center gap-1 cursor-pointer"><input type="radio" checked={friesType === 'Papas a la Francesa'} onChange={()=>setFriesType('Papas a la Francesa')} className="text-orange-600"/> A la Francesa</label><label className="flex items-center gap-1 cursor-pointer"><input type="radio" checked={friesType === 'Papas Gajo'} onChange={()=>setFriesType('Papas Gajo')} className="text-orange-600"/> Gajo</label></div></div>)}
                </div>
            )}

            {/* --- HOT DOGS --- */}
            {isHotDog && (
                <div className="space-y-4">
                    <div className="flex gap-4 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg border"><label className="flex items-center gap-2 font-bold cursor-pointer"><input type="radio" checked={!isCombo} onChange={() => setIsCombo(false)} className="text-orange-600"/> Individual</label><label className="flex items-center gap-2 font-bold cursor-pointer"><input type="radio" checked={isCombo} onChange={() => setIsCombo(true)} className="text-orange-600"/> Combo</label></div>
                    {isCombo && (<div className="animate-fade-in p-3 bg-gray-100 rounded-lg"><p className="text-sm font-bold mb-2">Papas del Combo:</p><div className="flex gap-4"><label className="flex items-center gap-1 cursor-pointer"><input type="radio" checked={friesType === 'Papas a la Francesa'} onChange={() => setFriesType('Papas a la Francesa')} className="text-orange-600"/> Francesa</label><label className="flex items-center gap-1 cursor-pointer"><input type="radio" checked={friesType === 'Papas Gajo'} onChange={() => setFriesType('Papas Gajo')} className="text-orange-600"/> Gajo</label></div></div>)}
                    {product.standardIngredients?.length > 0 && (<div><h4 className="font-bold mb-2 text-sm">Quitar Ingredientes:</h4><div className="flex flex-wrap gap-2">{product.standardIngredients.map(ing => (<button key={ing} onClick={() => toggleStandardIngredient(ing)} className={`px-3 py-1 rounded-full text-xs border transition flex items-center gap-1 ${activeIngredients.includes(ing) ? 'bg-gray-100 text-gray-500' : 'bg-red-100 text-red-600 line-through'}`}>{ing}</button>))}</div></div>)}
                </div>
            )}

            {/* --- BOX FAMILIAR --- */}
            {isBox && (
                <div className="space-y-4 text-sm">
                    <div className="bg-white dark:bg-gray-800 border p-3 rounded-lg space-y-3">
                        <div className="grid grid-cols-2 gap-3"><div><p className="font-bold text-gray-500 mb-1">Base:</p><select className="w-full p-1 border rounded" value={boxConfig.mainChoice} onChange={e=>setBoxConfig({...boxConfig, mainChoice:e.target.value})}><option>Pasta y Hamburguesa</option><option>2 Pastas</option><option>2 Hamburguesas</option></select></div><div><p className="font-bold text-gray-500 mb-1">Proteínas:</p><select className="w-full p-1 border rounded" value={boxConfig.proteinChoice} onChange={e=>setBoxConfig({...boxConfig, proteinChoice:e.target.value})}><option>Alitas y Boneless</option><option>Solo Alitas</option><option>Solo Boneless</option></select></div></div>
                        {boxConfig.mainChoice.includes('Hamburguesa') && (<div className="pt-2 border-t"><p className="font-bold mb-1">Hamburguesa:</p><div className="flex gap-2 mb-1"><label><input type="radio" checked={boxConfig.burgerMeat==='Pechuga Crispy'} onChange={()=>setBoxConfig({...boxConfig, burgerMeat:'Pechuga Crispy'})}/> Pechuga</label><label><input type="radio" checked={boxConfig.burgerMeat==='Tiras de Pollo'} onChange={()=>setBoxConfig({...boxConfig, burgerMeat:'Tiras de Pollo'})}/> Tiras</label></div><select className="w-full p-1 border rounded" value={boxConfig.burgerBathed} onChange={e=>setBoxConfig({...boxConfig, burgerBathed:e.target.value})}><option value="">Carne Natural</option>{SAUCES_LIST.map(s=><option key={s} value={s}>Bañada en {s}</option>)}</select></div>)}
                        <div className="pt-2 border-t flex justify-between items-center"><span className="font-bold">Tiras:</span><div className="flex gap-3"><label><input type="radio" checked={boxConfig.tirasMode==='Natural'} onChange={()=>setBoxConfig({...boxConfig, tirasMode:'Natural'})}/> Natural</label><label><input type="radio" checked={boxConfig.tirasMode==='Bañadas'} onChange={()=>setBoxConfig({...boxConfig, tirasMode:'Bañadas'})}/> Bañadas</label></div></div>
                    </div>
                    <div className="bg-orange-50 dark:bg-gray-800 border p-3 rounded-lg"><div className="mb-3"><div className="flex justify-between mb-1"><span className="font-bold">Salsas (Alitas/Boneless):</span><button onClick={()=>setBoxConfig({...boxConfig, splitWingsBoneless: !boxConfig.splitWingsBoneless})} className="text-blue-600 text-xs underline">{boxConfig.splitWingsBoneless ? 'Un solo sabor' : 'Combinar'}</button></div>{boxConfig.splitWingsBoneless ? (<div className="grid grid-cols-2 gap-2"><select className="p-1 border rounded" value={boxConfig.wingsBonelessFlavors.f1} onChange={e=>setBoxConfig({...boxConfig, wingsBonelessFlavors:{...boxConfig.wingsBonelessFlavors, f1:e.target.value}})}><option value="">Sabor 1...</option>{SAUCES_LIST.map(s=><option key={s} value={s}>{s}</option>)}</select><select className="p-1 border rounded" value={boxConfig.wingsBonelessFlavors.f2} onChange={e=>setBoxConfig({...boxConfig, wingsBonelessFlavors:{...boxConfig.wingsBonelessFlavors, f2:e.target.value}})}><option value="">Sabor 2...</option>{SAUCES_LIST.map(s=><option key={s} value={s}>{s}</option>)}</select></div>) : (<select className="w-full p-1 border rounded" value={boxConfig.wingsBonelessFlavors.f1} onChange={e=>setBoxConfig({...boxConfig, wingsBonelessFlavors:{...boxConfig.wingsBonelessFlavors, f1:e.target.value}})}><option value="">Sabor...</option>{SAUCES_LIST.map(s=><option key={s} value={s}>{s}</option>)}</select>)}</div><div><span className="font-bold mr-2">Papas:</span><label className="mr-3"><input type="radio" checked={friesType==='Papas a la Francesa'} onChange={()=>setFriesType('Papas a la Francesa')}/> Francesa</label><label><input type="radio" checked={friesType==='Papas Gajo'} onChange={()=>setFriesType('Papas Gajo')}/> Gajo</label></div></div>
                    <div className="bg-blue-50 dark:bg-gray-800 border p-3 rounded-lg"><p className="font-bold mb-2">Agregar Extras al Box (+${SNACK_PRICE} c/u)</p>{['alitas', 'boneless', 'tiras'].map(snack => (<div key={snack} className="flex justify-between items-center capitalize mb-1"><span>{snack}</span><div className="flex items-center gap-2"><button onClick={()=>updateBoxExtra(snack, -1)} className="w-5 h-5 bg-gray-200 rounded-full flex items-center justify-center">-</button><span>{boxExtras[snack]}</span><button onClick={()=>updateBoxExtra(snack, 1)} className="w-5 h-5 bg-blue-600 text-white rounded-full flex items-center justify-center">+</button></div></div>))}{(boxExtras.alitas > 0 || boxExtras.boneless > 0 || boxExtras.tiras > 0) && (<div className="mt-2 pt-2 border-t border-blue-200"><span className="text-xs mr-2">Salsa Extras:</span><select className="text-xs border rounded p-1" value={boxExtraSauce} onChange={e=>setBoxExtraSauce(e.target.value)}><option>Natural</option>{SAUCES_LIST.map(s=><option key={s} value={s}>{s}</option>)}</select></div>)}</div>
                    <div className="bg-gray-50 dark:bg-gray-800 p-3 rounded-lg border text-center"><p className="text-xs mb-1 font-bold">Piezas Extra (Alitas/Tiras) (+${PIECE_PRICE})</p><div className="flex items-center gap-2 justify-center"><button onClick={()=>setExtraPieces(Math.max(0,extraPieces-1))} className="w-6 h-6 bg-gray-200 rounded-full">-</button><span className="font-bold">{extraPieces}</span><button onClick={()=>setExtraPieces(extraPieces+1)} className="w-6 h-6 bg-orange-500 text-white rounded-full">+</button></div></div>
                </div>
            )}

            {/* --- BEBIDAS --- */}
            {(isDrink || isFrappe) && (
                <div className="bg-blue-50 dark:bg-gray-800 p-4 rounded-xl border space-y-3">
                    <div><p className="text-xs font-bold mb-1">Sabor:</p><select className="w-full p-2 border rounded" value={drinkFlavor} onChange={e=>setDrinkFlavor(e.target.value)}><option value="">Selecciona...</option>{product.flavorOptions?.map(f=><option key={f} value={f}>{f}</option>)}</select></div>
                    {isDrink && (<div className="grid grid-cols-2 gap-4">{product.hasIceOption && <div><p className="text-xs font-bold">Hielo:</p><label className="mr-2 text-sm"><input type="radio" checked={drinkOptions.ice} onChange={()=>setDrinkOptions({...drinkOptions, ice:true})}/> Sí</label><label className="text-sm"><input type="radio" checked={!drinkOptions.ice} onChange={()=>setDrinkOptions({...drinkOptions, ice:false})}/> No</label></div>}{product.hasTempOption && <div><p className="text-xs font-bold">Temp:</p><label className="mr-2 text-sm"><input type="radio" checked={drinkOptions.temp==='Fría'} onChange={()=>setDrinkOptions({...drinkOptions, temp:'Fría'})}/> Fría</label><label className="text-sm"><input type="radio" checked={drinkOptions.temp==='Al Tiempo'} onChange={()=>setDrinkOptions({...drinkOptions, temp:'Al Tiempo'})}/> Tiempo</label></div>}</div>)}
                    {isFrappe && (<div className="space-y-2 text-sm"><div className="flex justify-between items-center"><span>Chantilly:</span><select className="border rounded p-1" value={frappeOptions.chantilly} onChange={e=>setFrappeOptions({...frappeOptions, chantilly:e.target.value})}><option>Normal</option><option>Mucho</option><option>Poco</option><option>Sin</option></select></div><div className="flex justify-between items-center"><span>Hielo:</span><select className="border rounded p-1" value={frappeOptions.ice} onChange={e=>setFrappeOptions({...frappeOptions, ice:e.target.value})}><option>Normal</option><option>Poco</option><option>Mucho</option></select></div>{product.hasTapiocaOption && <label className="flex items-center gap-2"><input type="checkbox" checked={frappeOptions.tapioca} onChange={e=>setFrappeOptions({...frappeOptions, tapioca:e.target.checked})}/> Con Tapioca</label>}</div>)}
                </div>
            )}

            {/* --- COMUNES --- */}
            {(!isDrink && !isFrappe && !isSimple) && (
                <div className="bg-gray-50 dark:bg-gray-800 p-3 rounded-xl border flex justify-between items-center">
                    <div><p className="font-bold text-sm">Botecito Salsa Extra</p><p className="text-xs text-gray-500">+${POT_PRICE} c/u</p></div>
                    <div className="flex items-center gap-3 bg-white rounded-full p-1 border"><button onClick={()=>setExtraSaucePots(Math.max(0,extraSaucePots-1))} className="w-6 h-6 bg-gray-200 rounded-full">-</button><span className="font-bold w-4 text-center">{extraSaucePots}</span><button onClick={()=>setExtraSaucePots(extraSaucePots+1)} className="w-6 h-6 bg-orange-600 text-white rounded-full">+</button></div>
                </div>
            )}
            {product.extras?.length > 0 && (<div><h4 className="font-bold mb-2 text-sm">Extras Adicionales</h4><div className="space-y-2">{product.extras.map((extra, idx) => {const isSelected = selectedExtras.find(e => e.name === extra.name); return (<label key={idx} className="flex items-center justify-between p-2 rounded border cursor-pointer hover:bg-gray-50"><div className="flex items-center gap-2"><input type="checkbox" checked={!!isSelected} onChange={() => toggleExtra(extra)} /><span className="text-sm">{extra.name}</span></div><span className="font-bold text-orange-600 text-sm">+${extra.price}</span></label>);})}</div></div>)}
        </div>

        <div className="p-4 border-t dark:border-gray-800 bg-gray-50 dark:bg-gray-900/50 flex justify-between items-center shrink-0">
            <div><p className="text-xs text-gray-500 dark:text-gray-400 uppercase font-bold">Total Final</p><p className="text-3xl font-extrabold text-orange-600">${currentPrice}</p></div>
            <button onClick={handleConfirm} className="bg-green-600 text-white px-8 py-3 rounded-xl font-bold hover:bg-green-700 shadow-lg transform active:scale-95 transition flex items-center gap-2"><FaCheck /> {initialValues ? 'Guardar' : 'Agregar'}</button>
        </div>
      </div>
    </div>
  );
}