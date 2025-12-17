import { useState, useEffect } from 'react';
import { db, auth } from '../firebase/config';
import { doc, updateDoc, arrayUnion, arrayRemove, onSnapshot } from 'firebase/firestore';
import { showToast } from '../stores/toastStore';
import { FaCreditCard, FaTrash, FaPlus, FaCcVisa, FaCcMastercard, FaCcAmex} from 'react-icons/fa';
import { getBankStyle, BANK_OPTIONS } from '../utils/bankStyles';

export default function Wallet() {
  const [user, setUser] = useState(null);
  const [userData, setUserData] = useState({});
  const [cards, setCards] = useState([]);
  const [showForm, setShowForm] = useState(false);
  
  // Estado para nueva tarjeta
  const [newCard, setNewCard] = useState({
    bank: 'BBVA',       // Banco por defecto
    cardType: 'debito', // Tipo por defecto
    alias: '',
    number: '',
    expiry: '',
    cvv: '',
    network: 'unknown' // Visa, MC, etc.
  });

  useEffect(() => {
    const unsub = auth.onAuthStateChanged((u) => {
      if (u) {
        setUser(u);
        onSnapshot(doc(db, "users", u.uid), (docSnap) => {
          if (docSnap.exists()) {
            setUserData(docSnap.data());
            setCards(docSnap.data().savedCards || []);
          }
        });
      } else {
          window.location.href = '/login';
      }
    });
    return () => unsub();
  }, []);

  // Detectar Visa/Mastercard
  const detectNetwork = (number) => {
    const cleanNum = number.replace(/\D/g, '');
    if (/^4/.test(cleanNum)) return 'visa';
    if (/^5[1-5]/.test(cleanNum)) return 'mastercard';
    if (/^3[47]/.test(cleanNum)) return 'amex';
    return 'unknown';
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    let finalValue = value;

    if (name === 'number') {
      finalValue = value.replace(/\D/g, '').slice(0, 16).replace(/(\d{4})(?=\d)/g, '$1 ');
      setNewCard(prev => ({ ...prev, [name]: finalValue, network: detectNetwork(finalValue) }));
      return;
    }
    if (name === 'expiry') {
      finalValue = value.replace(/\D/g, '').slice(0, 4).replace(/(\d{2})(?=\d)/g, '$1/');
    }
    if (name === 'cvv') {
      finalValue = value.replace(/\D/g, '').slice(0, 4);
    }

    setNewCard(prev => ({ ...prev, [name]: finalValue }));
  };

  const handleAddCard = async (e) => {
    e.preventDefault();
    if (newCard.number.length < 19 || newCard.expiry.length < 5 || newCard.cvv.length < 3 || !newCard.alias) {
      return showToast("Completa todos los datos", "error");
    }

    try {
      const cardToSave = {
        id: Date.now(),
        bank: newCard.bank,
        cardType: newCard.cardType,
        alias: newCard.alias,
        number: newCard.number, // (En producción usar tokens)
        last4: newCard.number.slice(-4),
        network: newCard.network,
        expiry: newCard.expiry
      };

      await updateDoc(doc(db, "users", user.uid), {
        savedCards: arrayUnion(cardToSave)
      });

      showToast("Tarjeta guardada exitosamente", "success");
      setShowForm(false);
      setNewCard({ bank: 'BBVA', cardType: 'debito', alias: '', number: '', expiry: '', cvv: '', network: 'unknown' });
    } catch (error) {
      showToast("Error al guardar", "error");
    }
  };

  const handleDeleteCard = async (card) => {
    if (!confirm("¿Eliminar esta tarjeta?")) return;
    try {
      await updateDoc(doc(db, "users", user.uid), { savedCards: arrayRemove(card) });
      showToast("Tarjeta eliminada", "success");
    } catch (error) { showToast("Error", "error"); }
  };

  const NetworkIcon = ({ type }) => {
    if (type === 'visa') return <FaCcVisa className="text-4xl" />;
    if (type === 'mastercard') return <FaCcMastercard className="text-4xl" />;
    if (type === 'amex') return <FaCcAmex className="text-4xl" />;
    return <FaCreditCard className="text-4xl opacity-50" />;
  };

  return (
    <div className="max-w-5xl mx-auto p-6 mb-20">
      <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold text-gray-800 dark:text-white flex items-center gap-3">
            💳 Mi Billetera
          </h1>
          <button 
            onClick={() => setShowForm(!showForm)} 
            className="bg-orange-600 text-white px-4 py-2 rounded-lg font-bold shadow hover:bg-orange-700 transition flex items-center gap-2"
          >
            {showForm ? 'Cancelar' : '+ Agregar Nueva'}
          </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        
        {/* COLUMNA IZQUIERDA: FORMULARIO (Si está activo) O LISTA VACÍA */}
        <div className="space-y-6">
            {showForm ? (
                <form onSubmit={handleAddCard} className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-lg border dark:border-gray-700 animate-fade-in-down">
                    <h2 className="text-xl font-bold mb-4 dark:text-white">Datos de la Tarjeta</h2>
                    
                    {/* SELECCIÓN DE BANCO */}
                    <div className="mb-4">
                        <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 mb-1">Banco</label>
                        <select 
                            name="bank" 
                            value={newCard.bank} 
                            onChange={(e) => setNewCard({...newCard, bank: e.target.value})}
                            className="w-full p-3 border dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-700 dark:text-white"
                        >
                            {BANK_OPTIONS.map(bank => <option key={bank} value={bank}>{bank}</option>)}
                        </select>
                    </div>

                    {/* TIPO DE TARJETA (RADIO BUTTONS) */}
                    <div className="mb-4">
                        <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 mb-2">Tipo</label>
                        <div className="flex gap-4">
                            <label className={`flex-1 p-3 rounded-lg border cursor-pointer flex items-center justify-center gap-2 transition ${newCard.cardType === 'debito' ? 'bg-orange-50 border-orange-500 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300' : 'dark:border-gray-600 dark:text-gray-300'}`}>
                                <input type="radio" name="cardType" value="debito" checked={newCard.cardType === 'debito'} onChange={(e) => setNewCard({...newCard, cardType: e.target.value})} className="hidden"/>
                                🏦 Débito
                            </label>
                            <label className={`flex-1 p-3 rounded-lg border cursor-pointer flex items-center justify-center gap-2 transition ${newCard.cardType === 'credito' ? 'bg-orange-50 border-orange-500 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300' : 'dark:border-gray-600 dark:text-gray-300'}`}>
                                <input type="radio" name="cardType" value="credito" checked={newCard.cardType === 'credito'} onChange={(e) => setNewCard({...newCard, cardType: e.target.value})} className="hidden"/>
                                💳 Crédito
                            </label>
                        </div>
                    </div>

                    <div className="mb-4">
                        <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 mb-1">Nombre / Alias</label>
                        <input type="text" name="alias" placeholder="Ej: Mi Nómina" value={newCard.alias} onChange={handleInputChange} className="w-full p-3 border dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white"/>
                    </div>

                    <div className="mb-4">
                        <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 mb-1">Número</label>
                        <input type="text" name="number" placeholder="0000 0000 0000 0000" value={newCard.number} onChange={handleInputChange} className="w-full p-3 border dark:border-gray-600 rounded-lg font-mono dark:bg-gray-700 dark:text-white"/>
                    </div>

                    <div className="flex gap-4 mb-6">
                        <div className="w-1/2">
                            <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 mb-1">Vence</label>
                            <input type="text" name="expiry" placeholder="MM/AA" value={newCard.expiry} onChange={handleInputChange} className="w-full p-3 border dark:border-gray-600 rounded-lg text-center dark:bg-gray-700 dark:text-white"/>
                        </div>
                        <div className="w-1/2">
                            <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 mb-1">CVV</label>
                            <input type="password" name="cvv" placeholder="123" value={newCard.cvv} onChange={handleInputChange} className="w-full p-3 border dark:border-gray-600 rounded-lg text-center dark:bg-gray-700 dark:text-white"/>
                        </div>
                    </div>

                    <button className="w-full bg-green-600 text-white py-3 rounded-lg font-bold hover:bg-green-700 shadow-lg transform active:scale-95 transition">Guardar Tarjeta</button>
                </form>
            ) : (
                // LISTA DE TARJETAS GUARDADAS
                <div className="space-y-4">
                    {cards.length === 0 ? (
                        <div className="text-center py-20 bg-white dark:bg-gray-800 rounded-2xl border border-dashed dark:border-gray-700">
                            <FaCreditCard className="text-6xl text-gray-300 mx-auto mb-4"/>
                            <p className="text-gray-500 dark:text-gray-400">No tienes tarjetas guardadas.</p>
                            <p className="text-sm text-gray-400">Agrega una para pagar más rápido.</p>
                        </div>
                    ) : (
                        cards.map(card => (
                            <div key={card.id} className={`relative overflow-hidden p-6 rounded-2xl shadow-lg transition-transform hover:scale-[1.02] ${getBankStyle(card.bank)}`}>
                                <div className="flex justify-between items-start mb-8 relative z-10">
                                    <div>
                                        <p className="font-bold text-lg tracking-wider">{card.bank}</p>
                                        <p className="text-xs opacity-80 uppercase tracking-widest">{card.cardType}</p>
                                    </div>
                                    <NetworkIcon type={card.network} />
                                </div>
                                <div className="relative z-10">
                                    <p className="font-mono text-2xl tracking-widest mb-2 shadow-black drop-shadow-md">•••• •••• •••• {card.last4}</p>
                                    <div className="flex justify-between items-end">
                                        <p className="text-sm uppercase opacity-90 font-medium">{card.alias}</p>
                                        <p className="text-xs opacity-80">Vence: {card.expiry}</p>
                                    </div>
                                </div>
                                {/* Decoración fondo */}
                                <div className="absolute -right-6 -bottom-6 text-9xl opacity-10 pointer-events-none"><FaCreditCard/></div>
                                <button onClick={() => handleDeleteCard(card)} className="absolute top-4 right-14 text-white/50 hover:text-white p-2 z-20"><FaTrash/></button>
                            </div>
                        ))
                    )}
                </div>
            )}
        </div>

        {/* COLUMNA DERECHA: PREVIEW EN TIEMPO REAL (Solo visible al agregar) */}
        {showForm && (
            <div className="hidden md:block sticky top-24 h-fit">
                <h2 className="text-xl font-bold mb-4 text-gray-700 dark:text-white text-center">Así se verá tu tarjeta</h2>
                
                {/* TARJETA PREVIEW DINÁMICA */}
                <div className={`w-full aspect-[1.586/1] rounded-2xl shadow-2xl p-8 relative overflow-hidden transition-all duration-500 ${getBankStyle(newCard.bank)}`}>
                    
                    {/* Chip */}
                    <div className="absolute top-8 left-8">
                        <div className="w-12 h-9 bg-yellow-400/80 rounded-md flex items-center justify-center border border-yellow-600 overflow-hidden">
                             <div className="w-full h-[1px] bg-yellow-700 absolute top-1/3"></div>
                             <div className="w-full h-[1px] bg-yellow-700 absolute bottom-1/3"></div>
                             <div className="h-full w-[1px] bg-yellow-700 absolute left-1/3"></div>
                             <div className="h-full w-[1px] bg-yellow-700 absolute right-1/3"></div>
                        </div>
                    </div>

                    {/* Logo Banco */}
                    <div className="absolute top-8 right-8 text-right">
                        <p className="font-bold text-xl tracking-wider uppercase">{newCard.bank}</p>
                        <p className="text-[10px] uppercase opacity-80">{newCard.cardType}</p>
                    </div>

                    {/* Número */}
                    <div className="absolute top-1/2 left-0 w-full px-8 -translate-y-1/2">
                        <p className="font-mono text-2xl tracking-widest text-white drop-shadow-md">
                            {newCard.number || '0000 0000 0000 0000'}
                        </p>
                    </div>

                    {/* Datos Footer */}
                    <div className="absolute bottom-8 left-8 w-[calc(100%-4rem)] flex justify-between items-end">
                        <div>
                            <p className="text-[10px] uppercase opacity-70 mb-1">Titular / Alias</p>
                            <p className="text-sm font-bold uppercase tracking-wide truncate max-w-[200px]">
                                {newCard.alias || userData.displayName || 'NOMBRE TITULAR'}
                            </p>
                        </div>
                        <div className="text-right">
                            <p className="text-[10px] uppercase opacity-70 mb-1">Vence</p>
                            <p className="text-sm font-bold">{newCard.expiry || 'MM/AA'}</p>
                        </div>
                    </div>

                    {/* Logo Red (Visa/MC) */}
                    <div className="absolute bottom-8 right-8 text-white">
                        <NetworkIcon type={newCard.network} />
                    </div>
                </div>

                <p className="text-center text-gray-400 text-sm mt-6">
                    Tus datos están protegidos y encriptados. 🔒
                </p>
            </div>
        )}
      </div>
    </div>
  );
}