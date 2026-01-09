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
  const isSimple = ['papas', 'media papas', 'pasta', 'media pasta', 'jugo', 'dedos de queso'].includes(c);

  // --- 2. VARIABLES DE PRECIO ---
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

  // --- 4. CÁLCULO DE PRECIO ---
  useEffect(() => {
    let newPrice = Number(product.price);
    selectedExtras.forEach(extra => newPrice += Number(extra.price));
    if (extraSaucePots > 0) newPrice += (extraSaucePots * POT_PRICE);

    if (isBurger) {
        if (extraIngredients.length > 0) newPrice += (extraIngredients.length * (product.standardIngredientsPrice || 0));
        const totalBurgerSnacks = burgerSnacks.alitas + burgerSnacks.boneless + burgerSnacks.tiras;
        if (totalBurgerSnacks > 0) newPrice += (totalBurgerSnacks * SNACK_PRICE);
        if (burgerBathedFlavor) newPrice += 5; 
    }

    if ((isWingsType || isPastaProtein) && extraPieces > 0) {
        newPrice += (extraPieces * PIECE_PRICE);
    }

    if (isBox) {
        const totalBoxExtras = boxExtras.alitas + boxExtras.boneless + boxExtras.tiras;
        if (totalBoxExtras > 0) newPrice += (totalBoxExtras * SNACK_PRICE);
        if (extraPieces > 0) newPrice += (extraPieces * PIECE_PRICE);
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

  // --- ESTILOS VISUALES ---
  const optionBtnClass = (active) => `cursor-pointer rounded-xl p-3 flex items-center justify-center gap-2 font-bold text-sm transition-all border-2 ${active ? 'bg-yellow-500 text-black border-yellow-500 shadow-md' : 'bg-zinc-800 text-gray-400 border-zinc-700 hover:border-zinc-500'}`;
  const selectClass = "w-full p-3 rounded-xl bg-zinc-800 border border-zinc-600 text-white focus:border-yellow-500 focus:outline-none focus:ring-1 focus:ring-yellow-500 appearance-none";
  const counterBtnClass = "w-8 h-8 rounded-full flex items-center justify-center font-bold text-lg transition-colors bg-zinc-700 hover:bg-yellow-500 hover:text-black text-white";

  return (
    <div className="fixed inset-0 z-[999] flex items-center justify-center bg-black/90 p-4 backdrop-blur-md animate-fade-in">
      {/* CAMBIO: max-h-[70vh] para hacerlo más compacto verticalmente */}
      <div className="bg-zinc-900 w-full max-w-md rounded-2xl shadow-2xl overflow-hidden border border-yellow-500/30 flex flex-col max-h-[70vh]">
        
        {/* Header */}
        <div className="bg-yellow-500 p-4 flex justify-between items-center shrink-0">
            <h3 className="font-black text-lg text-zinc-900 uppercase tracking-wide truncate pr-4">{product.name}</h3>
            <button onClick={onClose} className="text-zinc-900 hover:bg-black/10 p-2 rounded-full transition"><FaTimes size={20}/></button>
        </div>

        {/* Scroll Content */}
        <div className="p-5 overflow-y-auto custom-scrollbar space-y-6 flex-1 text-gray-100">
            
            {/* --- HAMBURGUESA --- */}
            {isBurger && (
                <div className="space-y-6">
                    <div>
                        <p className="font-bold text-yellow-500 mb-2 uppercase text-xs tracking-widest flex items-center gap-2"><FaHamburger/> Tipo de Carne</p>
                        <div className="grid grid-cols-2 gap-3">
                            {['Pechuga Crispy', 'Tiras de Pollo'].map(type => (
                                <div key={type} onClick={() => setMeatType(type)} className={optionBtnClass(meatType === type)}>
                                    {meatType === type && <FaCheck/>} {type}
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="bg-zinc-800/50 p-3 rounded-xl border border-zinc-700">
                        <p className="text-xs font-bold text-gray-400 mb-2 uppercase">¿Bañar Carne? (+$5)</p>
                        <select className={selectClass} value={burgerBathedFlavor} onChange={e=>setBurgerBathedFlavor(e.target.value)}>
                            <option value="">No, natural</option>
                            {SAUCES_LIST.map(s => <option key={s} value={s}>{s}</option>)}
                        </select>
                    </div>

                    <div>
                        <p className="font-bold text-yellow-500 mb-2 uppercase text-xs tracking-widest flex items-center gap-2"><FaUtensils/> Papas</p>
                        <div className="grid grid-cols-2 gap-3">
                            {['Papas a la Francesa', 'Papas Gajo'].map(type => (
                                <div key={type} onClick={() => setFriesType(type)} className={optionBtnClass(friesType === type)}>
                                    {friesType === type && <FaCheck/>} {type.replace('Papas ', '')}
                                </div>
                            ))}
                        </div>
                    </div>

                    {product.standardIngredients?.length > 0 && (
                        <div className="space-y-3">
                            <div>
                                <p className="text-xs font-bold mb-2 text-red-400 uppercase">Quitar Ingredientes:</p>
                                <div className="flex flex-wrap gap-2">
                                    {product.standardIngredients.map(ing => {
                                        const isActive = activeIngredients.includes(ing);
                                        return (
                                            <button key={ing} onClick={() => toggleStandardIngredient(ing)} className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-all ${isActive ? 'bg-zinc-800 text-gray-400 border-zinc-600' : 'bg-red-900/40 text-red-400 border-red-500 line-through'}`}>
                                                {ing}
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>
                            <div>
                                <p className="text-xs font-bold mb-2 text-green-400 uppercase">Extra (+${product.standardIngredientsPrice}):</p>
                                <div className="flex flex-wrap gap-2">
                                    {product.standardIngredients.map(ing => (
                                        <button key={ing} onClick={() => toggleExtraIngredient(ing)} className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-all ${extraIngredients.includes(ing) ? 'bg-green-600 text-white border-green-500 shadow-md' : 'bg-zinc-800 text-gray-400 border-zinc-600'}`}>
                                            {ing} {extraIngredients.includes(ing) && '+'}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>
                    )}

                    {product.allowExtraSnacks && (
                        <div className="bg-zinc-800 p-4 rounded-xl border border-zinc-700">
                            <h4 className="font-bold mb-3 flex items-center gap-2 text-blue-400 text-xs uppercase tracking-wide"><FaDrumstickBite/> Agregar Piezas (+${SNACK_PRICE} c/u)</h4>
                            <div className="space-y-3">
                                {['alitas', 'boneless', 'tiras'].map(snack => (
                                    <div key={snack} className="flex justify-between items-center capitalize text-sm bg-zinc-900 p-2 rounded-lg">
                                        <span className="ml-2 font-medium">{snack}</span>
                                        <div className="flex items-center gap-3">
                                            <button onClick={()=>updateBurgerSnack(snack, -1)} className={counterBtnClass}><FaMinus size={10}/></button>
                                            <span className="font-bold text-yellow-500 w-4 text-center">{burgerSnacks[snack]}</span>
                                            <button onClick={()=>updateBurgerSnack(snack, 1)} className={counterBtnClass}><FaPlus size={10}/></button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                            {(burgerSnacks.alitas > 0 || burgerSnacks.boneless > 0 || burgerSnacks.tiras > 0) && (
                                <div className="mt-3 pt-3 border-t border-zinc-700">
                                    <p className="text-xs mb-1 font-bold text-gray-400">Salsa para piezas extra:</p>
                                    <select className={selectClass} value={burgerSnackSauce} onChange={e=>setBurgerSnackSauce(e.target.value)}>
                                        <option>Natural</option>
                                        {SAUCES_LIST.map(s=><option key={s} value={s}>{s}</option>)}
                                    </select>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            )}

            {/* --- ALITAS / BONELESS / TIRAS / PASTA --- */}
            {(isWingsType || isPastaProtein) && (
                <div className="space-y-6">
                    {/* Modo Tiras */}
                    {isTiras && (
                        <div className="grid grid-cols-2 gap-3 mb-4">
                            <div onClick={()=>{setSauceMode('Natural'); setSelectedFlavors({flavor1:'', flavor2:''})}} className={optionBtnClass(sauceMode === 'Natural')}>Naturales</div>
                            <div onClick={()=>setSauceMode('Bañado')} className={optionBtnClass(sauceMode === 'Bañado')}>Bañadas</div>
                        </div>
                    )}

                    {/* Selector Salsas */}
                    {(!isTiras || sauceMode === 'Bañado') && (
                        <div className="bg-zinc-800 p-4 rounded-xl border border-zinc-700">
                            <div className="flex justify-between items-center mb-3">
                                <h4 className="font-bold text-yellow-500 text-xs uppercase tracking-wide">Sabor (Incluido)</h4>
                                {product.canSplitSauces && (
                                    <button onClick={()=>setUseSplitFlavors(!useSplitFlavors)} className="text-xs bg-zinc-700 px-2 py-1 rounded text-white hover:bg-zinc-600 transition border border-zinc-600">
                                        {useSplitFlavors ? 'Un solo sabor' : 'Mitad y Mitad'}
                                    </button>
                                )}
                            </div>
                            {useSplitFlavors ? (
                                <div className="space-y-3">
                                    <select className={selectClass} value={selectedFlavors.flavor1} onChange={e => setSelectedFlavors({...selectedFlavors, flavor1: e.target.value})}><option value="">Mitad 1...</option>{SAUCES_LIST.map(s=><option key={s} value={s}>{s}</option>)}</select>
                                    <select className={selectClass} value={selectedFlavors.flavor2} onChange={e => setSelectedFlavors({...selectedFlavors, flavor2: e.target.value})}><option value="">Mitad 2...</option>{SAUCES_LIST.map(s=><option key={s} value={s}>{s}</option>)}</select>
                                </div>
                            ) : (
                                <select className={selectClass} value={selectedFlavors.flavor1} onChange={e => setSelectedFlavors({...selectedFlavors, flavor1: e.target.value})}><option value="">Elige Sabor...</option>{SAUCES_LIST.map(s=><option key={s} value={s}>{s}</option>)}</select>
                            )}
                        </div>
                    )}

                    {/* Piezas Extra */}
                    <div className="flex justify-between items-center bg-zinc-800 p-3 rounded-xl border border-zinc-700">
                        <div><p className="font-bold text-sm text-white">Agregar Piezas Extra</p><p className="text-xs text-gray-400">+${PIECE_PRICE} c/u</p></div>
                        <div className="flex items-center gap-3">
                            <button onClick={()=>setExtraPieces(Math.max(0,extraPieces-1))} className={counterBtnClass}><FaMinus size={10}/></button>
                            <span className="font-bold text-yellow-500 w-4 text-center">{extraPieces}</span>
                            <button onClick={()=>setExtraPieces(extraPieces+1)} className={counterBtnClass}><FaPlus size={10}/></button>
                        </div>
                    </div>

                    {/* Papas */}
                    {!isPastaProtein && (
                        <div>
                            <p className="font-bold text-yellow-500 mb-2 uppercase text-xs tracking-widest flex items-center gap-2"><FaUtensils/> Acompañamiento</p>
                            <div className="grid grid-cols-2 gap-3">
                                {['Papas a la Francesa', 'Papas Gajo'].map(type => (
                                    <div key={type} onClick={() => setFriesType(type)} className={optionBtnClass(friesType === type)}>
                                        {friesType === type && <FaCheck/>} {type.replace('Papas ', '')}
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* --- HOT DOGS --- */}
            {isHotDog && (
                <div className="space-y-5">
                    <div className="grid grid-cols-2 gap-3">
                        <div onClick={() => setIsCombo(false)} className={optionBtnClass(!isCombo)}>Individual</div>
                        <div onClick={() => setIsCombo(true)} className={optionBtnClass(isCombo)}>Combo</div>
                    </div>
                    
                    {isCombo && (
                        <div className="bg-zinc-800 p-4 rounded-xl border border-zinc-700 animate-fade-in">
                            <p className="text-xs font-bold text-gray-400 mb-2 uppercase">Papas del Combo:</p>
                            <div className="grid grid-cols-2 gap-3">
                                {['Papas a la Francesa', 'Papas Gajo'].map(type => (
                                    <div key={type} onClick={() => setFriesType(type)} className={optionBtnClass(friesType === type)}>
                                        {type.replace('Papas ', '')}
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {product.standardIngredients?.length > 0 && (
                        <div>
                            <p className="text-xs font-bold mb-2 text-red-400 uppercase">Quitar Ingredientes:</p>
                            <div className="flex flex-wrap gap-2">
                                {product.standardIngredients.map(ing => (
                                    <button key={ing} onClick={() => toggleStandardIngredient(ing)} className={`px-3 py-1 rounded-full text-xs font-bold border transition ${activeIngredients.includes(ing) ? 'bg-zinc-800 text-gray-400 border-zinc-600' : 'bg-red-900/30 text-red-400 border-red-500 line-through'}`}>
                                        {ing}
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* --- BOX FAMILIAR --- */}
            {isBox && (
                <div className="space-y-5 text-sm">
                    <div className="bg-zinc-800 border border-zinc-700 p-4 rounded-xl space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div><p className="font-bold text-gray-400 mb-1 text-xs uppercase">Base:</p><select className={selectClass} value={boxConfig.mainChoice} onChange={e=>setBoxConfig({...boxConfig, mainChoice:e.target.value})}><option>Pasta y Hamburguesa</option><option>2 Pastas</option><option>2 Hamburguesas</option></select></div>
                            <div><p className="font-bold text-gray-400 mb-1 text-xs uppercase">Proteínas:</p><select className={selectClass} value={boxConfig.proteinChoice} onChange={e=>setBoxConfig({...boxConfig, proteinChoice:e.target.value})}><option>Alitas y Boneless</option><option>Solo Alitas</option><option>Solo Boneless</option></select></div>
                        </div>
                        
                        {boxConfig.mainChoice.includes('Hamburguesa') && (
                            <div className="pt-3 border-t border-zinc-700">
                                <p className="font-bold mb-2 text-yellow-500 text-xs uppercase">Configurar Hamburguesa:</p>
                                <div className="grid grid-cols-2 gap-3 mb-3">
                                    {['Pechuga Crispy', 'Tiras de Pollo'].map(m => (<div key={m} onClick={()=>setBoxConfig({...boxConfig, burgerMeat:m})} className={`p-2 border rounded-lg text-center text-xs font-bold cursor-pointer ${boxConfig.burgerMeat===m ? 'bg-yellow-500 text-black border-yellow-500' : 'bg-zinc-900 border-zinc-600'}`}>{m}</div>))}
                                </div>
                                <select className={selectClass} value={boxConfig.burgerBathed} onChange={e=>setBoxConfig({...boxConfig, burgerBathed:e.target.value})}><option value="">Carne Natural</option>{SAUCES_LIST.map(s=><option key={s} value={s}>Bañada en {s}</option>)}</select>
                            </div>
                        )}

                        <div className="pt-3 border-t border-zinc-700">
                            <p className="font-bold mb-2 text-yellow-500 text-xs uppercase">Configurar Tiras:</p>
                            <div className="grid grid-cols-2 gap-3">
                                {['Natural', 'Bañadas'].map(mode => (<div key={mode} onClick={()=>setBoxConfig({...boxConfig, tirasMode:mode})} className={`p-2 border rounded-lg text-center text-xs font-bold cursor-pointer ${boxConfig.tirasMode===mode ? 'bg-orange-500 text-white border-orange-500' : 'bg-zinc-900 border-zinc-600'}`}>{mode}</div>))}
                            </div>
                        </div>
                    </div>

                    <div className="bg-zinc-800 border border-zinc-700 p-4 rounded-xl">
                        <div className="mb-3">
                            <div className="flex justify-between mb-2">
                                <span className="font-bold text-yellow-500 text-xs uppercase">Salsas (Alitas/Boneless):</span>
                                <button onClick={()=>setBoxConfig({...boxConfig, splitWingsBoneless: !boxConfig.splitWingsBoneless})} className="text-blue-400 text-xs underline">{boxConfig.splitWingsBoneless ? 'Un solo sabor' : 'Combinar'}</button>
                            </div>
                            {boxConfig.splitWingsBoneless ? (
                                <div className="grid grid-cols-2 gap-2"><select className={selectClass} value={boxConfig.wingsBonelessFlavors.f1} onChange={e=>setBoxConfig({...boxConfig, wingsBonelessFlavors:{...boxConfig.wingsBonelessFlavors, f1:e.target.value}})}><option value="">Sabor 1...</option>{SAUCES_LIST.map(s=><option key={s} value={s}>{s}</option>)}</select><select className={selectClass} value={boxConfig.wingsBonelessFlavors.f2} onChange={e=>setBoxConfig({...boxConfig, wingsBonelessFlavors:{...boxConfig.wingsBonelessFlavors, f2:e.target.value}})}><option value="">Sabor 2...</option>{SAUCES_LIST.map(s=><option key={s} value={s}>{s}</option>)}</select></div>
                            ) : (
                                <select className={selectClass} value={boxConfig.wingsBonelessFlavors.f1} onChange={e=>setBoxConfig({...boxConfig, wingsBonelessFlavors:{...boxConfig.wingsBonelessFlavors, f1:e.target.value}})}><option value="">Sabor...</option>{SAUCES_LIST.map(s=><option key={s} value={s}>{s}</option>)}</select>
                            )}
                        </div>
                        <div>
                            <span className="font-bold mr-2 text-yellow-500 text-xs uppercase">Papas Box:</span>
                            <div className="grid grid-cols-2 gap-3 mt-2">
                                {['Papas a la Francesa', 'Papas Gajo'].map(type => (
                                    <div key={type} onClick={() => setFriesType(type)} className={`p-2 rounded-lg text-center text-xs font-bold border cursor-pointer ${friesType === type ? 'bg-yellow-500 text-black border-yellow-500' : 'bg-zinc-900 border-zinc-600'}`}>
                                        {type.replace('Papas ', '')}
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>

                    <div className="bg-zinc-800 border border-zinc-700 p-4 rounded-xl">
                        <p className="font-bold mb-3 text-blue-400 text-xs uppercase">Extras al Box (+${SNACK_PRICE} c/u)</p>
                        {['alitas', 'boneless', 'tiras'].map(snack => (
                            <div key={snack} className="flex justify-between items-center capitalize mb-2 bg-zinc-900 p-2 rounded-lg">
                                <span className="ml-2 font-medium">{snack}</span>
                                <div className="flex items-center gap-3">
                                    <button onClick={()=>updateBoxExtra(snack, -1)} className={counterBtnClass}><FaMinus size={10}/></button>
                                    <span className="font-bold text-yellow-500 w-4 text-center">{boxExtras[snack]}</span>
                                    <button onClick={()=>updateBoxExtra(snack, 1)} className={counterBtnClass}><FaPlus size={10}/></button>
                                </div>
                            </div>
                        ))}
                        {(boxExtras.alitas > 0 || boxExtras.boneless > 0 || boxExtras.tiras > 0) && (
                            <div className="mt-3 pt-3 border-t border-zinc-700">
                                <span className="text-xs font-bold text-gray-400 block mb-2">Salsa Extras:</span>
                                <select className={selectClass} value={boxExtraSauce} onChange={e=>setBoxExtraSauce(e.target.value)}>
                                    <option>Natural</option>{SAUCES_LIST.map(s=><option key={s} value={s}>{s}</option>)}
                                </select>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* --- BEBIDAS --- */}
            {(isDrink || isFrappe) && (
                <div className="bg-blue-900/20 p-4 rounded-xl border border-blue-800 space-y-4">
                    <div>
                        <p className="text-xs font-bold mb-1 text-blue-300 uppercase">Sabor:</p>
                        <select className={selectClass} value={drinkFlavor} onChange={e=>setDrinkFlavor(e.target.value)}>
                            <option value="">Selecciona...</option>{product.flavorOptions?.map(f=><option key={f} value={f}>{f}</option>)}
                        </select>
                    </div>
                    {isDrink && (
                        <div className="grid grid-cols-2 gap-4">
                            {product.hasIceOption && (
                                <div>
                                    <p className="text-xs font-bold text-blue-300 mb-1">Hielo</p>
                                    <div className="flex gap-2">
                                        <button onClick={()=>setDrinkOptions({...drinkOptions, ice:true})} className={`flex-1 p-2 rounded border text-xs font-bold ${drinkOptions.ice ? 'bg-blue-500 text-white border-blue-500' : 'bg-zinc-800 border-zinc-600'}`}>Sí</button>
                                        <button onClick={()=>setDrinkOptions({...drinkOptions, ice:false})} className={`flex-1 p-2 rounded border text-xs font-bold ${!drinkOptions.ice ? 'bg-blue-500 text-white border-blue-500' : 'bg-zinc-800 border-zinc-600'}`}>No</button>
                                    </div>
                                </div>
                            )}
                            {product.hasTempOption && (
                                <div>
                                    <p className="text-xs font-bold text-blue-300 mb-1">Temp</p>
                                    <div className="flex gap-2">
                                        <button onClick={()=>setDrinkOptions({...drinkOptions, temp:'Fría'})} className={`flex-1 p-2 rounded border text-xs font-bold ${drinkOptions.temp==='Fría' ? 'bg-blue-500 text-white border-blue-500' : 'bg-zinc-800 border-zinc-600'}`}>Fría</button>
                                        <button onClick={()=>setDrinkOptions({...drinkOptions, temp:'Al Tiempo'})} className={`flex-1 p-2 rounded border text-xs font-bold ${drinkOptions.temp==='Al Tiempo' ? 'bg-blue-500 text-white border-blue-500' : 'bg-zinc-800 border-zinc-600'}`}>Tiempo</button>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                    {isFrappe && (
                        <div className="space-y-3">
                            <div className="flex justify-between items-center">
                                <span className="text-sm font-bold text-blue-200">Chantilly:</span>
                                <select className="bg-zinc-800 border border-zinc-600 rounded p-1 text-sm w-32 text-white" value={frappeOptions.chantilly} onChange={e=>setFrappeOptions({...frappeOptions, chantilly:e.target.value})}><option>Normal</option><option>Mucho</option><option>Poco</option><option>Sin</option></select>
                            </div>
                            <div className="flex justify-between items-center">
                                <span className="text-sm font-bold text-blue-200">Hielo:</span>
                                <select className="bg-zinc-800 border border-zinc-600 rounded p-1 text-sm w-32 text-white" value={frappeOptions.ice} onChange={e=>setFrappeOptions({...frappeOptions, ice:e.target.value})}><option>Normal</option><option>Poco</option><option>Mucho</option></select>
                            </div>
                            {product.hasTapiocaOption && (
                                <div onClick={()=>setFrappeOptions({...frappeOptions, tapioca:!frappeOptions.tapioca})} className={`p-3 rounded-lg border text-center font-bold text-sm cursor-pointer transition ${frappeOptions.tapioca ? 'bg-blue-500 text-white border-blue-500' : 'bg-zinc-800 border-zinc-600 text-gray-400'}`}>
                                    {frappeOptions.tapioca ? 'Con Tapioca' : 'Sin Tapioca'}
                                </div>
                            )}
                        </div>
                    )}
                </div>
            )}

            {/* --- COMUNES --- */}
            {(!isDrink && !isFrappe && !isSimple) && (
                <div className="bg-zinc-800 p-3 rounded-xl border border-zinc-700 flex justify-between items-center">
                    <div><p className="font-bold text-sm text-gray-200">Botecito Salsa Extra</p><p className="text-xs text-gray-500">+${POT_PRICE} c/u</p></div>
                    <div className="flex items-center gap-3">
                        <button onClick={()=>setExtraSaucePots(Math.max(0,extraSaucePots-1))} className={counterBtnClass}><FaMinus size={10}/></button>
                        <span className="font-bold text-yellow-500 w-4 text-center">{extraSaucePots}</span>
                        <button onClick={()=>setExtraSaucePots(extraSaucePots+1)} className={counterBtnClass}><FaPlus size={10}/></button>
                    </div>
                </div>
            )}

            {/* EXTRAS ADICIONALES */}
            {product.extras?.length > 0 && (
                <div>
                    <h4 className="font-bold mb-2 text-sm text-yellow-500 uppercase tracking-widest">Extras Adicionales</h4>
                    <div className="grid grid-cols-1 gap-2">
                        {product.extras.map((extra, idx) => {
                            const isSelected = selectedExtras.find(e => e.name === extra.name);
                            return (
                                <div key={idx} onClick={() => toggleExtra(extra)} className={`flex items-center justify-between p-3 rounded-xl border cursor-pointer transition ${isSelected ? 'bg-green-900/30 border-green-500' : 'bg-zinc-800 border-zinc-700 hover:border-zinc-500'}`}>
                                    <div className="flex items-center gap-3">
                                        <div className={`w-5 h-5 rounded border flex items-center justify-center ${isSelected ? 'bg-green-500 border-green-500' : 'border-gray-500'}`}>
                                            {isSelected && <FaCheck className="text-white text-xs"/>}
                                        </div>
                                        <span className="text-sm font-bold">{extra.name}</span>
                                    </div>
                                    <span className="font-bold text-green-400 text-sm">+${extra.price}</span>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}
        </div>

        {/* Footer Actions */}
        <div className="p-4 border-t border-zinc-800 bg-zinc-900 shrink-0">
            <div className="flex justify-between items-center mb-4">
                <div className="flex flex-col">
                    <span className="text-xs text-gray-400 uppercase font-bold">Total Final</span>
                    <span className="text-3xl font-black text-yellow-500">${currentPrice}</span>
                </div>
            </div>
            <button onClick={handleConfirm} className="w-full bg-yellow-500 text-black px-8 py-4 rounded-xl font-black text-lg hover:bg-yellow-400 shadow-lg shadow-yellow-500/20 transform active:scale-95 transition flex items-center justify-center gap-2 uppercase tracking-wider">
                <FaCheck /> {initialValues ? 'Guardar Cambios' : 'Agregar al Pedido'}
            </button>
        </div>

      </div>
    </div>
  );
}