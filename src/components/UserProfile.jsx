import { useState, useEffect, Suspense } from 'react';
import React from 'react';
import { auth, db } from '../firebase/config';
import { doc, onSnapshot, updateDoc, arrayUnion, arrayRemove } from 'firebase/firestore';
import { updatePassword, signOut } from 'firebase/auth';
import { showToast } from '../stores/toastStore';
import { FaTrash, FaMapMarkerAlt, FaHome, FaKey, FaUserPlus, FaExchangeAlt, FaPen, FaSave } from 'react-icons/fa';

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
                saveAccountToHistory({ uid: u.uid, email: u.email, displayName: data.displayName || u.displayName || 'Usuario', photoURL: data.photoURL || u.photoURL });
            }
        });
        return () => unsubDoc();
      }
    });
    loadSavedAccounts();
    return () => unsub();
  }, []);

  const loadSavedAccounts = () => { if (typeof window !== 'undefined') { const accounts = JSON.parse(localStorage.getItem('snacks_saved_accounts') || '[]'); setSavedAccounts(accounts); } };
  const saveAccountToHistory = (account) => { if (typeof window === 'undefined') return; let accounts = JSON.parse(localStorage.getItem('snacks_saved_accounts') || '[]'); accounts = accounts.filter(a => a.uid !== account.uid); accounts.push(account); localStorage.setItem('snacks_saved_accounts', JSON.stringify(accounts)); setSavedAccounts(accounts); };
  const handleSwitchAccount = async (targetEmail) => { await signOut(auth); window.location.href = `/?email=${targetEmail}`; };
  const handleAddAccount = async () => { await signOut(auth); window.location.href = '/'; };
  const handleMapConfirm = async (addressData) => { if (!addressData) return; try { const docRef = doc(db, "users", user.uid); if (editingAddress) await updateDoc(docRef, { savedAddresses: arrayRemove(editingAddress) }); const newAddressObj = { id: editingAddress ? editingAddress.id : Date.now(), text: addressData.text, alias: addressData.alias, coords: addressData.coords }; await updateDoc(docRef, { savedAddresses: arrayUnion(newAddressObj), address: newAddressObj.text }); setShowMap(false); setEditingAddress(null); showToast("Dirección guardada", "success"); } catch (e) { showToast("Error", "error"); } };
  const startEditAddress = (addr) => { setEditingAddress(addr); setShowMap(true); };
  const removeAddress = async (addr) => { if(!confirm("¿Borrar?")) return; await updateDoc(doc(db, "users", user.uid), { savedAddresses: arrayRemove(addr) }); };
  const handleSaveName = async () => { if (!tempName.trim()) return; try { await updateDoc(doc(db, "users", user.uid), { displayName: tempName }); showToast("Guardado", "success"); } catch (e) { showToast("Error", "error"); } };
  const handleImageUpload = async (e) => { const file = e.target.files[0]; if (!file) return; const fd = new FormData(); fd.append('file', file); fd.append('upload_preset', UPLOAD_PRESET); try { const res = await fetch(`https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`, { method: 'POST', body: fd }); const data = await res.json(); await updateDoc(doc(db, "users", user.uid), { photoURL: data.secure_url }); showToast("Foto actualizada", "success"); } catch (err) { showToast("Error", "error"); } };
  const handleChangePassword = async () => { if (newPassword.length < 6) return showToast("Mínimo 6 caracteres", "error"); try { await updatePassword(user, newPassword); showToast("Actualizada", "success"); setNewPassword(''); setShowPasswordForm(false); } catch (error) { showToast("Error", "error"); } };

  if (!user) return <div className="p-10 text-center dark:text-white">Cargando...</div>;

  return (
    <div className="max-w-3xl mx-auto p-6 mt-8 bg-white dark:bg-zinc-800 rounded-xl shadow-lg mb-20 relative border dark:border-zinc-700 transition-colors">
      {showMap && <Suspense fallback={<div>Cargando...</div>}><MapPicker onConfirm={handleMapConfirm} onClose={() => { setShowMap(false); setEditingAddress(null); }} /></Suspense>}

      <div className="flex justify-between items-center mb-6 border-b dark:border-zinc-700 pb-4 relative">
          <h2 className="text-2xl font-bold text-gray-800 dark:text-white">Mi Perfil</h2>
          <div className="relative">
            <button onClick={() => setShowAccountSwitcher(!showAccountSwitcher)} className="text-sm bg-gray-100 dark:bg-zinc-700 border dark:border-zinc-600 px-4 py-2 rounded-full flex items-center gap-2 hover:bg-gray-200 dark:hover:bg-zinc-600 font-bold transition">
                {/* CAMBIO: Texto Amarillo */}
                <span className="text-yellow-600 dark:text-yellow-400 truncate max-w-[120px]">{userData.displayName || 'Usuario'}</span>
                <FaExchangeAlt className="text-gray-500 dark:text-gray-400" />
            </button>
            {showAccountSwitcher && (
                <div className="absolute right-0 top-12 w-80 bg-white dark:bg-zinc-800 rounded-xl shadow-2xl border border-gray-100 dark:border-zinc-700 z-50 animate-fade-in-down overflow-hidden">
                    <div className="p-3 bg-gray-50 dark:bg-zinc-900 border-b dark:border-zinc-700 font-bold text-xs text-gray-500 uppercase">Cambiar Cuenta</div>
                    <div className="max-h-60 overflow-y-auto">
                        {savedAccounts.map(acc => (
                            <div key={acc.uid} onClick={() => acc.uid !== user.uid && handleSwitchAccount(acc.email)} className={`flex items-center gap-3 p-3 cursor-pointer hover:bg-gray-50 dark:hover:bg-zinc-700 border-b dark:border-zinc-700 transition ${acc.uid === user.uid ? 'bg-yellow-50 dark:bg-zinc-700/50 border-l-4 border-yellow-500' : ''}`}>
                                <img src={acc.photoURL || `https://ui-avatars.com/api/?name=${acc.displayName}`} className="w-10 h-10 rounded-full object-cover border dark:border-zinc-600" />
                                <div className="flex-1 overflow-hidden">
                                    <p className="font-bold text-sm truncate text-gray-800 dark:text-white">{acc.displayName}</p>
                                    <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{acc.email}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                    {/* CAMBIO: Botón Rojo */}
                    <div onClick={handleAddAccount} className="p-3 text-center text-red-600 dark:text-red-400 font-bold text-sm cursor-pointer hover:bg-gray-100 dark:hover:bg-zinc-700 flex items-center justify-center gap-2"><FaUserPlus /> Agregar Cuenta</div>
                </div>
            )}
          </div>
      </div>

      <div className="flex flex-col items-center mb-8 gap-4">
        <div className="relative w-32 h-32 group">
            {/* CAMBIO: Borde Amarillo */}
            <img src={userData.photoURL || user.photoURL || `https://ui-avatars.com/api/?name=${userData.displayName}`} className="w-full h-full rounded-full object-cover border-4 border-yellow-100 dark:border-yellow-900/50 shadow-sm bg-white dark:bg-zinc-700" />
            <label className="absolute bottom-0 right-0 bg-yellow-500 text-white p-2 rounded-full cursor-pointer hover:bg-yellow-600"><input type="file" className="hidden" onChange={handleImageUpload} />📷</label>
        </div>
        <div className="text-center w-full max-w-sm">
            <div className="flex gap-2 justify-center">
                {/* CAMBIO: Focus Amarillo */}
                <input type="text" value={tempName} onChange={(e) => setTempName(e.target.value)} className="text-center font-bold text-xl border-b border-gray-300 dark:border-zinc-600 focus:border-yellow-500 outline-none bg-transparent transition-colors pb-1 dark:text-white" placeholder="Escribe tu nombre" />
                <button onClick={handleSaveName} className="bg-green-600 text-white p-2 rounded-lg hover:bg-green-700 shadow text-xs"><FaSave /></button>
            </div>
            <p className="text-gray-500 dark:text-gray-400 text-sm mt-2">{user.email}</p>
        </div>
      </div>

      <div className="mb-8 border-t dark:border-zinc-700 pt-6">
          {/* CAMBIO: Texto Rojo */}
          <button onClick={() => setShowPasswordForm(!showPasswordForm)} className="text-red-600 dark:text-red-400 text-sm font-bold flex items-center gap-2 hover:underline"><FaKey /> Cambiar Contraseña</button>
          {/* CAMBIO: Botón Rojo */}
          {showPasswordForm && <div className="mt-3 flex gap-2 animate-fade-in-down"><input type="password" placeholder="Nueva contraseña" className="border dark:border-zinc-600 dark:bg-zinc-700 dark:text-white p-2 rounded w-full" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} /><button onClick={handleChangePassword} className="bg-red-600 text-white px-4 py-2 rounded font-bold">Guardar</button></div>}
      </div>

      <div className="border-t dark:border-zinc-700 pt-6">
          <div className="flex justify-between items-center mb-4">
              {/* CAMBIO: Icono Amarillo */}
              <h3 className="font-bold text-lg flex items-center gap-2 text-gray-700 dark:text-white"><FaMapMarkerAlt className="text-yellow-500"/> Mis Direcciones</h3>
              {/* CAMBIO: Botón Rojo */}
              <button onClick={() => { setEditingAddress(null); setShowMap(true); }} className="bg-red-600 text-white px-3 py-1 rounded text-sm font-bold flex items-center gap-1 hover:bg-red-700 shadow">+ Nueva</button>
          </div>
          <div className="space-y-3">
              {userData.savedAddresses?.map(addr => (
                  <div key={addr.id} className="flex justify-between items-center p-3 bg-gray-50 dark:bg-zinc-700/50 border dark:border-zinc-700 rounded-lg hover:shadow-md transition-shadow">
                      {/* CAMBIO: Icono Amarillo */}
                      <div><p className="font-bold text-sm text-gray-800 dark:text-white flex items-center gap-2"><FaHome className="text-yellow-500"/> {addr.alias}</p><p className="text-xs text-gray-500 dark:text-gray-400 truncate max-w-[200px]">{addr.text}</p></div>
                      {/* CAMBIO: Icono Editar Rojo (antes azul) */}
                      <div className="flex gap-2"><button onClick={() => startEditAddress(addr)} className="text-red-500 hover:text-red-700 p-2"><FaPen/></button><button onClick={() => removeAddress(addr)} className="text-gray-500 hover:text-red-500 p-2"><FaTrash/></button></div>
                  </div>
              ))}
          </div>
      </div>
    </div>
  );
}