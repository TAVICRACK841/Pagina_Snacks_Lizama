import { useState, useEffect } from 'react';
import { FaCheck, FaTimes, FaPlus, FaMinus, FaHamburger, FaDrumstickBite, FaUtensils, FaSnowflake, FaThermometerHalf, FaStickyNote } from 'react-icons/fa';
import { showToast } from '../stores/toastStore';

export default function ProductCustomizer({ product, initialValues, onClose, onAddToCart }) {
  // --- 1. DETECCIÓN INTELIGENTE DE CATEGORÍA ---
  const c = product.category ? product.category.toLowerCase() : '';
  
  const isBurger = c.includes('hamburguesa');
  const isPasta = c.includes('pasta');
  
  // Alitas, Boneless o Tiras (solas, que NO son parte de una pasta)
  const isWingsType = (c.includes('alitas') || c.includes('boneless') || c.includes('tiras')) && !isPasta; 
  const isTiras = c.includes('tiras') && !isPasta; 
  
  // Pastas que SÍ requieren elegir sabor (las que llevan alitas, boneless o tiras)
  const isPastaProtein = isPasta && (c.includes('alitas') || c.includes('boneless') || c.includes('tiras'));
  
  // Pastas que NO requieren sabor (camarones, dedos)
  const isPastaNoFlavor = isPasta && (c.includes('camarones') || c.includes('dedos'));
  
  const isHotDog = c.includes('perros') || c.includes('hot dog');
  const isBox = c.includes('box');
  
  // Categorías de Bebidas
  const isDrink = c.includes('embotellado') || c.includes('aguas') || c.includes('jugo');
  const isFrappe = c.includes('frappe');
  const isAguas = c.includes('aguas');
  const isEmbotellado = c.includes('embotellado');

  // Categorías Simples
  const isSimple = ['papas', 'media papas', 'pasta', 'media pasta', 'dedos de queso'].includes(c) && !isPastaProtein && !isPastaNoFlavor;

  // Categorías que deben mostrar la lista de añadir piezas extras
  const showExtraSnacksList = isBurger || isWingsType || isPasta || isBox || c.includes('dedos');

  // --- 2. VARIABLES DE PRECIO ---
  const POT_PRICE = Number(product.extraSaucePotPrice || 0);
  const SNACK_PRICE = Number(product.extraSnackPrice || product.pricePerExtraPiece || 0); 
  const TAPIOCA_PRICE = Number(product.tapiocaPrice || 0);

  // --- 3. ESTADOS ---
  const [currentPrice, setCurrentPrice] = useState(product.price);
  
  // NOTA ESPECIAL DEL CLIENTE
  const [specialNote, setSpecialNote] = useState(() => initialValues?.rawState?.specialNote || '');

  // GENERAL
  const [friesType, setFriesType] = useState(() => initialValues?.rawState?.friesType || 'Papas a la Francesa');
  
  // SALSAS EXTRAS (Lista del admin)
  const [extraSaucePots, setExtraSaucePots] = useState(initialValues?.rawState?.extraSaucePots || 0);
  const [chosenSauces, setChosenSauces] = useState(initialValues?.rawState?.chosenSauces || []);

  // PIEZAS EXTRAS
  const [extraSnacks, setExtraSnacks] = useState(() => initialValues?.rawState?.extraSnacks || { alitas: 0, boneless: 0, tiras: 0 });
  const [extraSnackSauce, setExtraSnackSauce] = useState(() => initialValues?.rawState?.extraSnackSauce || 'Natural');

  // HAMBURGUESA
  const [activeIngredients, setActiveIngredients] = useState(() => initialValues?.rawState?.activeIngredients || product.standardIngredients || []);
  const [extraIngredients, setExtraIngredients] = useState(() => initialValues?.rawState?.extraIngredients || []);
  const [meatType, setMeatType] = useState(() => initialValues?.rawState?.meatType || 'Pechuga Crispy');
  const [burgerBathedFlavor, setBurgerBathedFlavor] = useState(() => initialValues?.rawState?.burgerBathedFlavor || ''); 
  
  // ALITAS / BONELESS / TIRAS / PASTA
  const [sauceMode, setSauceMode] = useState(() => initialValues?.rawState?.sauceMode || 'Natural'); 
  const [useSplitFlavors, setUseSplitFlavors] = useState(() => initialValues?.rawState?.useSplitFlavors || false);
  const [selectedFlavors, setSelectedFlavors] = useState(() => initialValues?.rawState?.selectedFlavors || { flavor1: '', flavor2: '' });

  // HOT DOG
  const [isCombo, setIsCombo] = useState(() => initialValues?.rawState?.isCombo || false);

  // BEBIDAS
  const [drinkFlavor, setDrinkFlavor] = useState(() => initialValues?.rawState?.drinkFlavor || '');
  const [iceLevel, setIceLevel] = useState(() => initialValues?.rawState?.iceLevel || 'Normal');
  const [drinkTemp, setDrinkTemp] = useState(() => initialValues?.rawState?.drinkTemp || 'Helada');
  const [frappeOptions, setFrappeOptions] = useState(() => initialValues?.rawState?.frappeOptions || { chantilly: 'Normal', ice: 'Normal', tapioca: false });

  // BOX FAMILIAR
  const [boxConfig, setBoxConfig] = useState(() => initialValues?.rawState?.boxConfig || {
      mainChoice: 'Pasta y Hamburguesa', 
      proteinChoice: 'Alitas y Boneless',
      tirasMode: 'Natural',
      tirasFlavor: '', 
      burgerMeat: 'Pechuga Crispy',
      burgerBathed: '', 
      wingsBonelessFlavors: { f1: '', f2: '' }, 
      splitWingsBoneless: false
  });

  const [selectedExtras, setSelectedExtras] = useState(initialValues?.extras || []);
  const SAUCES_LIST = product.sauceOptions || ['BBQ', 'Búfalo', 'Mango Habanero'];

  // --- 4. CÁLCULO DE PRECIO ---
  useEffect(() => {
    let newPrice = Number(product.price);
    selectedExtras.forEach(extra => newPrice += Number(extra.price));
    
    const totalExtraSauces = product.extraSauceNames?.length > 0 ? chosenSauces.length : extraSaucePots;
    if (totalExtraSauces > 0) newPrice += (totalExtraSauces * POT_PRICE);

    const totalSnacks = extraSnacks.alitas + extraSnacks.boneless + extraSnacks.tiras;
    if (totalSnacks > 0) newPrice += (totalSnacks * SNACK_PRICE);

    if (isBurger) {
        if (extraIngredients.length > 0) newPrice += (extraIngredients.length * (product.standardIngredientsPrice || 0));
        if (burgerBathedFlavor) newPrice += 5; 
    }

    if (isHotDog && isCombo) newPrice = (Number(product.price) * 2) + 10;
    if (isFrappe && frappeOptions.tapioca) newPrice += TAPIOCA_PRICE;

    if (isBox) {
        if (extraIngredients.length > 0 && boxConfig.mainChoice.includes('Hamburguesa')) {
             newPrice += (extraIngredients.length * (product.standardIngredientsPrice || 0));
        }
    }

    setCurrentPrice(newPrice);
  }, [selectedExtras, extraSaucePots, chosenSauces, extraIngredients, extraSnacks, product, burgerBathedFlavor, isCombo, frappeOptions.tapioca, boxConfig.mainChoice]);

  // --- UI HELPERS ---
  const toggleStandardIngredient = (ing) => activeIngredients.includes(ing) ? setActiveIngredients(activeIngredients.filter(i => i !== ing)) : setActiveIngredients([...activeIngredients, ing]);
  const toggleExtraIngredient = (ing) => extraIngredients.includes(ing) ? setExtraIngredients(extraIngredients.filter(i => i !== ing)) : setExtraIngredients([...extraIngredients, ing]);
  const toggleExtra = (extra) => selectedExtras.find(e => e.name === extra.name) ? setSelectedExtras(selectedExtras.filter(e => e.name !== extra.name)) : setSelectedExtras([...selectedExtras, extra]);
  const updateExtraSnack = (type, delta) => { const val = extraSnacks[type] + delta; if (val >= 0) setExtraSnacks({ ...extraSnacks, [type]: val }); };

  const addSpecificSauce = (sauceName) => { setChosenSauces([...chosenSauces, sauceName]); };
  const removeSpecificSauce = (sauceName) => {
      const index = chosenSauces.indexOf(sauceName);
      if (index > -1) {
          const newArr = [...chosenSauces];
          newArr.splice(index, 1);
          setChosenSauces(newArr);
      }
  };
  const getSauceCount = (sauceName) => chosenSauces.filter(s => s === sauceName).length;

  const handleConfirm = () => {
      if ((isWingsType || isPastaProtein) && !isTiras && useSplitFlavors && (!selectedFlavors.flavor1 || !selectedFlavors.flavor2)) return showToast("Elige ambos sabores", "error");
      if ((isWingsType || isPastaProtein) && !isTiras && !useSplitFlavors && !selectedFlavors.flavor1) return showToast("Elige un sabor", "error");
      if (isTiras && sauceMode === 'Bañado' && !selectedFlavors.flavor1) return showToast("Elige la salsa para bañar las tiras", "error");
      if ((isDrink || isFrappe) && product.flavorOptions?.length > 0 && !drinkFlavor) return showToast("Elige el sabor de la bebida", "error");
      
      if (isBox) {
          if (boxConfig.tirasMode === 'Bañadas' && !boxConfig.tirasFlavor) return showToast("Elige la salsa para las tiras del Box", "error");
          if (boxConfig.splitWingsBoneless) {
              if (!boxConfig.wingsBonelessFlavors.f1 || !boxConfig.wingsBonelessFlavors.f2) {
                  return showToast("Debes elegir los DOS sabores (Mitad y Mitad) para Alitas/Boneless", "error");
              }
          } else {
              if (!boxConfig.wingsBonelessFlavors.f1) {
                  return showToast("Debes elegir el sabor para Alitas/Boneless del Box", "error");
              }
          }
      }

      let desc = [];

      // --- CONSTRUCCIÓN DESCRIPCIÓN ---
      if (isBurger) {
          if (meatType) desc.push(`Carne: ${meatType}`);
          if (burgerBathedFlavor) desc.push(`Bañada en: ${burgerBathedFlavor}`);
          if (friesType) desc.push(`${friesType}`);
          
          const removed = (product.standardIngredients || []).filter(ing => !activeIngredients.includes(ing));
          if (removed.length > 0) desc.push(`Sin: ${removed.join(', ')}`);
          if (extraIngredients.length > 0) desc.push(`Extra: ${extraIngredients.join(', ')}`);
      }

      if (isWingsType || isPastaProtein) {
          let flavorStr = '';
          if (isTiras && sauceMode === 'Natural') flavorStr = 'Naturales';
          else flavorStr = useSplitFlavors ? `${selectedFlavors.flavor1} / ${selectedFlavors.flavor2}` : selectedFlavors.flavor1;
          
          desc.push(`Sabor: ${flavorStr}`);
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
          if (boxConfig.mainChoice.includes('Hamburguesa')) {
              desc.push(`Burger: ${boxConfig.burgerMeat} ${boxConfig.burgerBathed ? `(${boxConfig.burgerBathed})` : ''}`);
              const removed = (product.standardIngredients || []).filter(ing => !activeIngredients.includes(ing));
              if (removed.length > 0) desc.push(`Burger Sin: ${removed.join(', ')}`);
              if (extraIngredients.length > 0) desc.push(`Burger Extra: ${extraIngredients.join(', ')}`);
          }
          
          const tirasDesc = boxConfig.tirasMode === 'Bañadas' ? `Bañadas en ${boxConfig.tirasFlavor}` : 'Naturales';
          desc.push(`Tiras: ${tirasDesc}`);
          
          const boxFlavors = boxConfig.splitWingsBoneless ? `${boxConfig.wingsBonelessFlavors.f1} / ${boxConfig.wingsBonelessFlavors.f2}` : boxConfig.wingsBonelessFlavors.f1;
          desc.push(`Salsas Alitas/Boneless: ${boxFlavors}`);
          desc.push(friesType);
      }

      // --- PIEZAS EXTRAS ---
      const totalSnacks = extraSnacks.alitas + extraSnacks.boneless + extraSnacks.tiras;
      if (totalSnacks > 0) {
          let snacksDesc = [];
          if (extraSnacks.alitas > 0) snacksDesc.push(`${extraSnacks.alitas} Alitas`);
          if (extraSnacks.boneless > 0) snacksDesc.push(`${extraSnacks.boneless} Boneless`);
          if (extraSnacks.tiras > 0) snacksDesc.push(`${extraSnacks.tiras} Tiras`);
          desc.push(`Piezas Extras: ${snacksDesc.join(', ')} (${extraSnackSauce})`);
      }

      if (isDrink || isFrappe) {
          if (drinkFlavor) desc.push(`Sabor: ${drinkFlavor}`);
          if (isAguas && product.hasIceOption) desc.push(`Hielo: ${iceLevel}`);
          if (isEmbotellado && product.hasTempOption) desc.push(`Temperatura: ${drinkTemp}`);
          if (isFrappe) {
              desc.push(`Chantilly: ${frappeOptions.chantilly}`);
              desc.push(`Hielo: ${frappeOptions.ice}`);
              if (frappeOptions.tapioca) desc.push(`Con Tapioca`);
              else desc.push(`Sin Tapioca`);
          }
      }

      // Salsas Extras (Botecitos)
      if (product.extraSauceNames?.length > 0) {
          if (chosenSauces.length > 0) {
              const counts = {};
              chosenSauces.forEach(x => { counts[x] = (counts[x] || 0) + 1; });
              const sauceStr = Object.entries(counts).map(([name, count]) => `${name} (x${count})`).join(', ');
              desc.push(`Salsas Extras (Botecitos): ${sauceStr}`);
          }
      } else if (extraSaucePots > 0) {
          desc.push(`+${extraSaucePots} botes salsa extra`);
      }

      if (selectedExtras.length > 0) desc.push(`Extras: ${selectedExtras.map(e => e.name).join(', ')}`);

      if (specialNote.trim() !== '') {
          desc.push(`👉 NOTA: ${specialNote.trim()}`);
      }

      const rawState = { activeIngredients, extraIngredients, friesType, extraSaucePots, chosenSauces, meatType, burgerBathedFlavor, extraSnacks, extraSnackSauce, sauceMode, selectedFlavors, useSplitFlavors, isCombo, boxConfig, drinkFlavor, iceLevel, drinkTemp, frappeOptions, specialNote };

      onAddToCart({ ...product, price: currentPrice, customization: { removed: [], extras: selectedExtras, rawState, finalPrice: currentPrice }, customizationDescription: desc.join('. ') });
      onClose();
  };

  if (!product) return null;

  const optionBtnClass = (active) => `cursor-pointer rounded-xl p-3 flex items-center justify-center gap-2 font-bold text-sm transition-all border-2 ${active ? 'bg-yellow-500 text-black border-yellow-500 shadow-md' : 'bg-zinc-800 text-gray-400 border-zinc-700 hover:border-zinc-500'}`;
  const selectClass = "w-full p-3 rounded-xl bg-zinc-800 border border-zinc-600 text-white focus:border-yellow-500 focus:outline-none focus:ring-1 focus:ring-yellow-500 appearance-none";
  const counterBtnClass = "w-8 h-8 rounded-full flex items-center justify-center font-bold text-lg transition-colors bg-zinc-700 hover:bg-yellow-500 hover:text-black text-white";

  return (
    <div className="fixed inset-0 z-[999] flex items-center justify-center bg-black/90 p-4 backdrop-blur-md animate-fade-in">
      <div className="bg-zinc-900 w-full max-w-md rounded-2xl shadow-2xl overflow-hidden border border-yellow-500/30 flex flex-col max-h-[85vh]">
        
        <div className="bg-yellow-500 p-4 flex justify-between items-center shrink-0">
            <h3 className="font-black text-lg text-zinc-900 uppercase tracking-wide truncate pr-4">{product.name}</h3>
            <button onClick={onClose} className="text-zinc-900 hover:bg-black/10 p-2 rounded-full transition"><FaTimes size={20}/></button>
        </div>

        <div className="p-5 overflow-y-auto custom-scrollbar space-y-6 flex-1 text-gray-100">
            
            {/* --- HAMBURGUESA --- */}
            {isBurger && (
                <div className="space-y-6">
                    {product.allowMeatSwap && (
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
                    )}

                    <div className="bg-zinc-800/50 p-3 rounded-xl border border-zinc-700">
                        <p className="text-xs font-bold text-gray-400 mb-2 uppercase">¿Bañar Carne? (+$5)</p>
                        <select className={selectClass} value={burgerBathedFlavor} onChange={e=>setBurgerBathedFlavor(e.target.value)}>
                            <option value="">No, natural</option>
                            {SAUCES_LIST.map(s => <option key={s} value={s}>{s}</option>)}
                        </select>
                    </div>

                    {product.hasFriesOption && (
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
                    )}

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
                </div>
            )}

            {/* --- ALITAS / BONELESS / TIRAS / PASTA CON SALSAS --- */}
            {(isWingsType || isPastaProtein) && (
                <div className="space-y-6">
                    {isTiras && (
                        <div className="grid grid-cols-2 gap-3 mb-4">
                            <div onClick={()=>{setSauceMode('Natural'); setSelectedFlavors({flavor1:'', flavor2:''})}} className={optionBtnClass(sauceMode === 'Natural')}>Naturales</div>
                            <div onClick={()=>setSauceMode('Bañado')} className={optionBtnClass(sauceMode === 'Bañado')}>Bañadas</div>
                        </div>
                    )}

                    {(!isTiras || sauceMode === 'Bañado') && (
                        <div className="bg-zinc-800 p-4 rounded-xl border border-zinc-700">
                            <div className="flex justify-between items-center mb-3">
                                <h4 className="font-bold text-yellow-500 text-xs uppercase tracking-wide">Sabor (Incluido)</h4>
                                <button onClick={()=>setUseSplitFlavors(!useSplitFlavors)} className="text-xs bg-zinc-700 px-2 py-1 rounded text-white hover:bg-zinc-600 transition border border-zinc-600">
                                    {useSplitFlavors ? 'Un solo sabor' : 'Combinar Mitad y Mitad'}
                                </button>
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

            {/* --- SECCIÓN PIEZAS EXTRAS (UNIFICADA) --- */}
            {showExtraSnacksList && (
                <div className="bg-zinc-800 p-4 rounded-xl border border-zinc-700">
                    <h4 className="font-bold mb-3 flex items-center gap-2 text-blue-400 text-xs uppercase tracking-wide"><FaDrumstickBite/> Agregar Piezas Extra (+${SNACK_PRICE} c/u)</h4>
                    <div className="space-y-3">
                        {['alitas', 'boneless', 'tiras'].map(snack => (
                            <div key={snack} className="flex justify-between items-center capitalize text-sm bg-zinc-900 p-2 rounded-lg">
                                <span className="ml-2 font-medium">{snack}</span>
                                <div className="flex items-center gap-3">
                                    <button onClick={()=>updateExtraSnack(snack, -1)} className={counterBtnClass}><FaMinus size={10}/></button>
                                    <span className="font-bold text-yellow-500 w-4 text-center">{extraSnacks[snack]}</span>
                                    <button onClick={()=>updateExtraSnack(snack, 1)} className={counterBtnClass}><FaPlus size={10}/></button>
                                </div>
                            </div>
                        ))}
                    </div>
                    {(extraSnacks.alitas > 0 || extraSnacks.boneless > 0 || extraSnacks.tiras > 0) && (
                        <div className="mt-3 pt-3 border-t border-zinc-700">
                            <p className="text-xs mb-1 font-bold text-gray-400">Salsa para piezas extra:</p>
                            <select className={selectClass} value={extraSnackSauce} onChange={e=>setExtraSnackSauce(e.target.value)}>
                                <option>Natural</option>
                                {SAUCES_LIST.map(s=><option key={s} value={s}>{s}</option>)}
                            </select>
                        </div>
                    )}
                </div>
            )}

            {/* --- HOT DOGS --- */}
            {isHotDog && (
                <div className="space-y-5">
                    {product.hasComboOption ? (
                        <div className="grid grid-cols-2 gap-3">
                            <div onClick={() => setIsCombo(false)} className={optionBtnClass(!isCombo)}>Individual</div>
                            <div onClick={() => setIsCombo(true)} className={optionBtnClass(isCombo)}>Combo</div>
                        </div>
                    ) : (
                        <div className="text-center text-sm font-bold text-white bg-zinc-800 p-2 rounded">Perro Caliente Individual</div>
                    )}
                    
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
                                
                                {product.standardIngredients?.length > 0 && (
                                    <div className="mt-3 space-y-3">
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
                            </div>
                        )}

                        <div className="pt-3 border-t border-zinc-700">
                            <p className="font-bold mb-2 text-yellow-500 text-xs uppercase">Configurar Tiras:</p>
                            <div className="grid grid-cols-2 gap-3 mb-2">
                                {['Natural', 'Bañadas'].map(mode => (<div key={mode} onClick={()=>setBoxConfig({...boxConfig, tirasMode:mode, tirasFlavor: mode === 'Natural' ? '' : boxConfig.tirasFlavor})} className={`p-2 border rounded-lg text-center text-xs font-bold cursor-pointer ${boxConfig.tirasMode===mode ? 'bg-orange-500 text-white border-orange-500' : 'bg-zinc-900 border-zinc-600'}`}>{mode}</div>))}
                            </div>
                            {boxConfig.tirasMode === 'Bañadas' && (
                                <select className={selectClass} value={boxConfig.tirasFlavor} onChange={e=>setBoxConfig({...boxConfig, tirasFlavor:e.target.value})}>
                                    <option value="">Selecciona Salsa...</option>
                                    {SAUCES_LIST.map(s=><option key={s} value={s}>{s}</option>)}
                                </select>
                            )}
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
                </div>
            )}

            {/* --- BEBIDAS --- */}
            {(isDrink || isFrappe) && (
                <div className="bg-zinc-800/80 p-4 rounded-xl border border-zinc-700 space-y-4">
                    {product.flavorOptions?.length > 0 && (
                        <div>
                            <p className="text-xs font-bold mb-1 text-yellow-500 uppercase">Sabor:</p>
                            <select className={selectClass} value={drinkFlavor} onChange={e=>setDrinkFlavor(e.target.value)}>
                                <option value="">Selecciona sabor...</option>
                                {product.flavorOptions.map(f=><option key={f} value={f}>{f}</option>)}
                            </select>
                        </div>
                    )}

                    {isAguas && product.hasIceOption && (
                        <div>
                            <p className="text-xs font-bold text-blue-300 mb-2 flex items-center gap-1"><FaSnowflake/> Nivel de Hielo</p>
                            <div className="grid grid-cols-4 gap-2">
                                {['Mucho', 'Normal', 'Poco', 'Sin'].map(opt => (
                                    <button key={opt} onClick={()=>setIceLevel(opt)} className={`p-2 rounded-lg border text-[10px] font-bold ${iceLevel===opt ? 'bg-blue-500 text-white border-blue-500' : 'bg-zinc-800 border-zinc-600'}`}>
                                        {opt}
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}

                    {isEmbotellado && product.hasTempOption && (
                        <div>
                            <p className="text-xs font-bold text-cyan-300 mb-2 flex items-center gap-1"><FaThermometerHalf/> Temperatura</p>
                            <div className="grid grid-cols-2 gap-2">
                                <button onClick={()=>setDrinkTemp('Helada')} className={`p-3 rounded-lg border text-xs font-bold ${drinkTemp==='Helada' ? 'bg-cyan-600 text-white border-cyan-500' : 'bg-zinc-800 border-zinc-600'}`}>Helada ❄️</button>
                                <button onClick={()=>setDrinkTemp('Al Tiempo')} className={`p-3 rounded-lg border text-xs font-bold ${drinkTemp==='Al Tiempo' ? 'bg-orange-600 text-white border-orange-500' : 'bg-zinc-800 border-zinc-600'}`}>Al Tiempo ☀️</button>
                            </div>
                        </div>
                    )}

                    {isFrappe && (
                        <div className="space-y-4">
                            <div>
                                <p className="text-xs font-bold text-gray-300 mb-2">Chantilly:</p>
                                <div className="grid grid-cols-4 gap-2">
                                    {['Mucho', 'Normal', 'Poco', 'Sin'].map(opt => (
                                        <button key={opt} onClick={()=>setFrappeOptions({...frappeOptions, chantilly: opt})} className={`p-2 rounded-lg border text-[10px] font-bold ${frappeOptions.chantilly===opt ? 'bg-purple-600 text-white border-purple-500' : 'bg-zinc-800 border-zinc-600'}`}>
                                            {opt}
                                        </button>
                                    ))}
                                </div>
                            </div>
                            <div>
                                <p className="text-xs font-bold text-gray-300 mb-2">Hielo:</p>
                                <div className="grid grid-cols-3 gap-2">
                                    {['Mucho', 'Normal', 'Poco'].map(opt => (
                                        <button key={opt} onClick={()=>setFrappeOptions({...frappeOptions, ice: opt})} className={`p-2 rounded-lg border text-[10px] font-bold ${frappeOptions.ice===opt ? 'bg-blue-600 text-white border-blue-500' : 'bg-zinc-800 border-zinc-600'}`}>
                                            {opt}
                                        </button>
                                    ))}
                                </div>
                            </div>
                            {product.hasTapiocaOption && (
                                <div onClick={()=>setFrappeOptions({...frappeOptions, tapioca:!frappeOptions.tapioca})} className={`p-4 rounded-xl border-2 cursor-pointer flex justify-between items-center transition ${frappeOptions.tapioca ? 'bg-purple-900/50 border-purple-500' : 'bg-zinc-800 border-zinc-700'}`}>
                                    <span className="font-bold text-sm text-white flex items-center gap-2">
                                        🧋 Agregar Tapioca
                                    </span>
                                    <div className="flex items-center gap-2">
                                        <span className="text-xs text-purple-300">+${TAPIOCA_PRICE}</span>
                                        {frappeOptions.tapioca ? <FaCheck className="text-purple-400"/> : <div className="w-4 h-4 rounded-full border border-gray-500"></div>}
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            )}

            {/* --- COMUNES (Botes Salsa y Extras) --- */}
            {(!isDrink && !isFrappe && !isSimple) && (
                <div className="bg-zinc-800 p-3 rounded-xl border border-zinc-700">
                    <div className="flex justify-between items-center mb-3">
                        <div>
                            <p className="font-bold text-sm text-gray-200">Botecito Salsa Extra</p>
                            <p className="text-xs text-gray-500">+${POT_PRICE} c/u</p>
                        </div>
                        {(!product.extraSauceNames || product.extraSauceNames.length === 0) && (
                            <div className="flex items-center gap-3">
                                <button onClick={()=>setExtraSaucePots(Math.max(0,extraSaucePots-1))} className={counterBtnClass}><FaMinus size={10}/></button>
                                <span className="font-bold text-yellow-500 w-4 text-center">{extraSaucePots}</span>
                                <button onClick={()=>setExtraSaucePots(extraSaucePots+1)} className={counterBtnClass}><FaPlus size={10}/></button>
                            </div>
                        )}
                    </div>
                    
                    {product.extraSauceNames?.length > 0 && (
                        <div className="space-y-2 border-t border-zinc-700 pt-2">
                            {product.extraSauceNames.map(sauceName => {
                                const count = getSauceCount(sauceName);
                                return (
                                    <div key={sauceName} className="flex justify-between items-center bg-zinc-900/50 p-2 rounded-lg">
                                        <span className="text-sm font-medium text-gray-300 ml-2">{sauceName}</span>
                                        <div className="flex items-center gap-3">
                                            <button onClick={()=>removeSpecificSauce(sauceName)} className={`w-6 h-6 rounded-full flex items-center justify-center bg-zinc-700 hover:bg-red-500 transition ${count===0 ? 'opacity-50 pointer-events-none' : ''}`}>
                                                <FaMinus size={8} className="text-white"/>
                                            </button>
                                            <span className="font-bold text-white w-4 text-center text-xs">{count}</span>
                                            <button onClick={()=>addSpecificSauce(sauceName)} className="w-6 h-6 rounded-full flex items-center justify-center bg-zinc-700 hover:bg-green-500 transition">
                                                <FaPlus size={8} className="text-white"/>
                                            </button>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            )}

            {/* EXTRAS ADICIONALES (Tocino, Queso, etc.) */}
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

            {/* CAMPO DE NOTAS ESPECIALES */}
            <div className="bg-zinc-800/50 p-4 rounded-xl border border-zinc-700">
                <label className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-2 flex items-center gap-2">
                    <FaStickyNote className="text-yellow-500"/> Notas Especiales (Opcional)
                </label>
                <textarea 
                    rows="2"
                    placeholder="Ej: Sin cebolla, aderezo aparte, poca sal..."
                    value={specialNote}
                    onChange={(e) => setSpecialNote(e.target.value)}
                    className="w-full bg-zinc-900 border border-zinc-600 text-white p-3 rounded-lg text-sm focus:border-yellow-500 focus:outline-none focus:ring-1 focus:ring-yellow-500 resize-none"
                />
            </div>

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