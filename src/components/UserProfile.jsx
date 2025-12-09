import { useState, useEffect, Suspense } from 'react';
import React from 'react';
import { auth, db } from '../firebase/config';
import { doc, onSnapshot, updateDoc, arrayUnion, arrayRemove } from 'firebase/firestore';
import { updatePassword, signOut } from 'firebase/auth';
import { showToast } from '../stores/toastStore';
import { FaTrash, FaMapMarkerAlt, FaHome, FaKey, FaUserPlus, FaExchangeAlt, FaTimes, FaPen, FaSave } from 'react-icons/fa';

const MapPicker = React.lazy(() => import('./MapPicker'));

export default function UserProfile() {
  const [user, setUser] = useState(null);
  const [userData, setUserData] = useState({});
  const [showMap, setShowMap] = useState(false);
  const [tempName, setTempName] = useState('');
  const [editingAddress, setEditingAddress] = useState(null);
  const [showAccountSwitcher, setShowAccountSwitcher] = useState(false);
  const [savedAccounts, setSavedAccounts] = useState([]);
  const [newPassword, setNewPassword] = useState('');
  const [showPasswordForm, setShowPasswordForm] = useState(false);

  const CLOUD_NAME = import.meta.env.PUBLIC_CLOUDINARY_CLOUD_NAME || "dw5mio6d9"; 
  const UPLOAD_PRESET = import.meta.env.PUBLIC_CLOUDINARY_PRESET || "Snacks_Lizama"; 

  useEffect(() => {
    const unsub = auth.onAuthStateChanged((u) => {
      if (u) {
        setUser(u);
        const unsubDoc = onSnapshot(doc(db, "users", u.uid), (docSnap) => {
            if (docSnap.exists()) {
                const data = docSnap.data();
                setUserData(data);
                setTempName(data.displayName || u.displayName || '');
                saveAccountToHistory({ uid: u.uid, email: u.email, displayName: data.displayName || u.displayName || 'Usuario', photoURL: data.photoURL || u.photoURL || '' });
            }
        });
        return () => unsubDoc();
      }
    });
    loadSavedAccounts();
    return () => unsub();
  }, []);

  const loadSavedAccounts = () => {
      if (typeof window !== 'undefined') {
        const accounts = JSON.parse(localStorage.getItem('snacks_saved_accounts') || '[]');
        setSavedAccounts(accounts);
      }
  };

  const saveAccountToHistory = (account) => {
      if (typeof window === 'undefined') return;
      let accounts = JSON.parse(localStorage.getItem('snacks_saved_accounts') || '[]');
      accounts = accounts.filter(a => a.uid !== account.uid); 
      accounts.push(account);
      localStorage.setItem('snacks_saved_accounts', JSON.stringify(accounts));
      setSavedAccounts(accounts);
  };

  const handleSwitchAccount = async (targetEmail) => { await signOut(auth); window.location.href = `/?email=${targetEmail}`; };
  const handleAddAccount = async () => { await signOut(auth); window.location.href = '/'; };
  const handleRemoveAccountFromHistory = (e, uidToRemove) => {
      e.stopPropagation();
      const updated = savedAccounts.filter(a => a.uid !== uidToRemove);
      localStorage.setItem('snacks_saved_accounts', JSON.stringify(updated));
      setSavedAccounts(updated);
  };

  const handleMapConfirm = async (addressData) => {
    if (!addressData) return;
    try {
        const docRef = doc(db, "users", user.uid);
        if (editingAddress) await updateDoc(docRef, { savedAddresses: arrayRemove(editingAddress) });
        const newAddressObj = { id: editingAddress ? editingAddress.id : Date.now(), text: addressData.text, alias: addressData.alias, coords: addressData.coords };
        await updateDoc(docRef, { savedAddresses: arrayUnion(newAddressObj), address: newAddressObj.text });
        setShowMap(false); setEditingAddress(null);
        showToast(editingAddress ? "Dirección actualizada" : "Dirección guardada", "success");
    } catch (e) { showToast("Error al guardar", "error"); }
  };

  const startEditAddress = (addr) => { setEditingAddress(addr); setShowMap(true); showToast(`Editando: ${addr.alias}`, 'info'); };
  const removeAddress = async (addr) => { if(!confirm("¿Borrar dirección?")) return; await updateDoc(doc(db, "users", user.uid), { savedAddresses: arrayRemove(addr) }); };
  const handleSaveName = async () => { if (!tempName.trim()) return; try { await updateDoc(doc(db, "users", user.uid), { displayName: tempName }); showToast("Nombre actualizado", "success"); } catch (e) { showToast("Error", "error"); } };
  const handleImageUpload = async (e) => {
    const file = e.target.files[0]; if (!file) return;
    const fd = new FormData(); fd.append('file', file); fd.append('upload_preset', UPLOAD_PRESET);
    try { const res = await fetch(`https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`, { method: 'POST', body: fd }); const data = await res.json(); await updateDoc(doc(db, "users", user.uid), { photoURL: data.secure_url }); showToast("Foto actualizada", "success"); } catch (err) { showToast("Error al subir", "error"); }
  };
  const handleChangePassword = async () => { if (newPassword.length < 6) return showToast("Mínimo 6 caracteres", "error"); try { await updatePassword(user, newPassword); showToast("Contraseña actualizada", "success"); setNewPassword(''); setShowPasswordForm(false); } catch (error) { showToast("Error: Re-inicia sesión", "error"); } };

  if (!user) return <div className="p-10 text-center dark:text-white">Cargando...</div>;

  return (
    <div className="max-w-3xl mx-auto p-6 mt-8 bg-white dark:bg-gray-800 rounded-xl shadow-lg mb-20 relative transition-colors border dark:border-gray-700">
      {showMap && <Suspense fallback={<div>Cargando Mapa...</div>}><MapPicker onConfirm={handleMapConfirm} onClose={() => { setShowMap(false); setEditingAddress(null); }} /></Suspense>}

      <div className="flex justify-between items-center mb-6 border-b dark:border-gray-700 pb-4 relative">
          <h2 className="text-2xl font-bold text-gray-800 dark:text-white">Mi Perfil</h2>
          <div className="relative">
            <button onClick={() => setShowAccountSwitcher(!showAccountSwitcher)} className="text-sm bg-gray-100 dark:bg-gray-700 px-4 py-2 rounded-full flex items-center gap-2 hover:bg-gray-200 dark:hover:bg-gray-600 font-bold transition shadow-sm border dark:border-gray-600">
                <span className="text-orange-600 dark:text-orange-400 truncate max-w-[150px]">{userData.displayName || 'Usuario'}</span>
                <FaExchangeAlt className="text-gray-500 dark:text-gray-400" />
            </button>
            {showAccountSwitcher && (
                <div className="absolute right-0 top-12 w-80 bg-white dark:bg-gray-800 rounded-xl shadow-2xl border border-gray-100 dark:border-gray-700 z-50 animate-fade-in-down overflow-hidden">
                    <div className="p-3 bg-gray-50 dark:bg-gray-900 border-b dark:border-gray-700 font-bold text-xs text-gray-500 dark:text-gray-400 uppercase">Cambiar Cuenta</div>
                    <div className="max-h-60 overflow-y-auto">
                        {savedAccounts.map(acc => (
                            <div key={acc.uid} onClick={() => acc.uid !== user.uid && handleSwitchAccount(acc.email)} className={`flex items-center gap-3 p-3 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 transition border-b border-gray-50 dark:border-gray-700 ${acc.uid === user.uid ? 'bg-orange-50 dark:bg-gray-700/50 border-l-4 border-orange-500' : ''}`}>
                                <img src={acc.photoURL || `https://ui-avatars.com/api/?name=${acc.displayName}&background=random`} className="w-10 h-10 rounded-full object-cover border bg-gray-200 dark:border-gray-600" onError={(e) => e.target.src = `https://ui-avatars.com/api/?name=${acc.displayName}`} />
                                <div className="flex-1 overflow-hidden">
                                    <p className="font-bold text-sm truncate text-gray-800 dark:text-white">{acc.displayName}</p>
                                    <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{acc.email}</p>
                                </div>
                                {acc.uid === user.uid ? <span className="text-green-500 dark:text-green-400 text-xs font-bold px-2 py-1 bg-green-100 dark:bg-green-900/30 rounded-full">Activa</span> : <button onClick={(e) => handleRemoveAccountFromHistory(e, acc.uid)} className="text-gray-400 dark:text-gray-500 hover:text-red-500 p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700"><FaTimes /></button>}
                            </div>
                        ))}
                    </div>
                    <div onClick={handleAddAccount} className="p-3 bg-blue-50 dark:bg-gray-900/50 text-center text-blue-600 dark:text-blue-400 font-bold text-sm cursor-pointer hover:bg-blue-100 dark:hover:bg-gray-900 transition flex items-center justify-center gap-2 border-t dark:border-gray-700">
                        <FaUserPlus /> Agregar Cuenta Nueva
                    </div>
                </div>
            )}
          </div>
      </div>

      <div className="flex flex-col items-center mb-8 gap-4">
        <div className="relative w-32 h-32 group">
            <img src={userData.photoURL || user.photoURL || `https://ui-avatars.com/api/?name=${userData.displayName}&size=150`} className="w-full h-full rounded-full object-cover border-4 border-orange-100 dark:border-orange-900 shadow-sm bg-white dark:bg-gray-700" onError={(e) => e.target.src=`https://ui-avatars.com/api/?name=${userData.displayName}`} />
            <label className="absolute bottom-0 right-0 bg-orange-600 text-white p-2 rounded-full cursor-pointer hover:bg-orange-700 shadow-lg transition-transform hover:scale-110">
                📷 <input type="file" className="hidden" onChange={handleImageUpload} />
            </label>
        </div>
        <div className="text-center w-full max-w-sm">
            <p className="text-xs text-gray-400 dark:text-gray-500 font-bold uppercase mb-1">Nombre Visible</p>
            <div className="flex gap-2 justify-center">
                <input type="text" value={tempName} onChange={(e) => setTempName(e.target.value)} className="text-center font-bold text-xl border-b border-gray-300 dark:border-gray-600 focus:border-orange-500 outline-none bg-transparent transition-colors pb-1 dark:text-white" placeholder="Escribe tu nombre" />
                <button onClick={handleSaveName} className="bg-green-600 text-white p-2 rounded-lg hover:bg-green-700 shadow text-xs flex items-center gap-1 h-fit self-center"><FaSave /> Guardar</button>
            </div>
            <p className="text-gray-500 dark:text-gray-400 text-sm mt-2 font-mono bg-gray-100 dark:bg-gray-700 px-3 py-1 rounded-full inline-block">{user.email}</p>
        </div>
      </div>

      <div className="mb-8 border-t dark:border-gray-700 pt-6">
          <button onClick={() => setShowPasswordForm(!showPasswordForm)} className="text-blue-600 dark:text-blue-400 text-sm font-bold flex items-center gap-2 hover:underline"><FaKey /> Cambiar Contraseña</button>
          {showPasswordForm && (
              <div className="mt-3 flex gap-2 animate-fade-in-down bg-blue-50 dark:bg-gray-700/50 p-4 rounded-lg border dark:border-gray-700">
                  <input type="password" placeholder="Nueva contraseña (min 6 chars)" className="border dark:border-gray-600 p-2 rounded w-full focus:ring-2 focus:ring-blue-500 outline-none dark:bg-gray-700 dark:text-white" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} />
                  <button onClick={handleChangePassword} className="bg-blue-600 text-white px-4 py-2 rounded font-bold hover:bg-blue-700 shadow">Actualizar</button>
              </div>
          )}
      </div>

      <div className="border-t dark:border-gray-700 pt-6">
          <div className="flex justify-between items-center mb-4">
              <h3 className="font-bold text-lg flex items-center gap-2 text-gray-700 dark:text-white"><FaMapMarkerAlt className="text-orange-500"/> Mis Direcciones</h3>
              <button onClick={() => { setEditingAddress(null); setShowMap(true); }} className="bg-blue-600 text-white px-3 py-1 rounded text-sm font-bold flex items-center gap-1 hover:bg-blue-700 shadow">+ Nueva</button>
          </div>
          <div className="space-y-3">
              {userData.savedAddresses?.map(addr => (
                  <div key={addr.id} className="flex justify-between items-center p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg border dark:border-gray-700 hover:shadow-md transition-shadow group">
                      <div><p className="font-bold text-sm text-gray-800 dark:text-white flex items-center gap-2"><FaHome className="text-orange-500"/> {addr.alias}</p><p className="text-xs text-gray-500 dark:text-gray-400 truncate max-w-[200px]">{addr.text}</p></div>
                      <div className="flex gap-2"><button onClick={() => startEditAddress(addr)} className="text-blue-500 dark:text-blue-400 hover:text-blue-700 p-2 bg-white dark:bg-gray-800 rounded-full shadow-sm hover:bg-blue-50 dark:hover:bg-gray-700 border dark:border-gray-600"><FaPen size={12} /></button><button onClick={() => removeAddress(addr)} className="text-red-500 dark:text-red-400 hover:text-red-700 p-2 bg-white dark:bg-gray-800 rounded-full shadow-sm hover:bg-red-50 dark:hover:bg-gray-700 border dark:border-gray-600"><FaTrash size={12} /></button></div>
                  </div>
              ))}
              {(!userData.savedAddresses || userData.savedAddresses.length === 0) && <p className="text-gray-400 dark:text-gray-500 text-sm text-center italic py-4 bg-gray-50 dark:bg-gray-800/50 rounded border dark:border-gray-700 border-dashed">No tienes direcciones guardadas.</p>}
          </div>
      </div>
    </div>
  );
}