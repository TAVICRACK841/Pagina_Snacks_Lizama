import { useState, useEffect } from 'react';
import { auth } from '../firebase/config';
import { confirmPasswordReset, verifyPasswordResetCode } from 'firebase/auth';
import { FaLock, FaCheckCircle, FaExclamationTriangle, FaArrowRight } from 'react-icons/fa';

export default function ResetPassword() {
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [email, setEmail] = useState('');
  const [oobCode, setOobCode] = useState(null);
  const [validating, setValidating] = useState(true);

  useEffect(() => {
    // Extraer el código secreto de la URL (lo envía Firebase)
    const params = new URLSearchParams(window.location.search);
    const code = params.get('oobCode');
    
    if (!code) {
      setError("Enlace inválido o incompleto. Por favor, vuelve a solicitar el cambio de contraseña desde la app.");
      setValidating(false);
      return;
    }

    setOobCode(code);
    
    // Verificar si el código es válido y no ha expirado
    verifyPasswordResetCode(auth, code)
      .then((userEmail) => {
        setEmail(userEmail);
        setValidating(false);
      })
      .catch((err) => {
        setError("Este enlace ha caducado o ya fue utilizado. Vuelve a solicitar uno nuevo.");
        setValidating(false);
      });
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setMessage('');

    if (newPassword !== confirmPassword) {
      return setError("Las contraseñas no coinciden.");
    }
    if (newPassword.length < 6) {
      return setError("La contraseña debe tener al menos 6 caracteres.");
    }

    setLoading(true);
    try {
      // Confirmar la nueva contraseña con Firebase
      await confirmPasswordReset(auth, oobCode, newPassword);
      setMessage("¡Contraseña actualizada con éxito!");
      
      // Redirigir al inicio de sesión después de 3 segundos
      setTimeout(() => {
        window.location.href = '/login'; 
      }, 3000);
    } catch (err) {
      setError("Hubo un error al guardar tu contraseña. Inténtalo de nuevo.");
    }
    setLoading(false);
  };

  return (
    <div className="min-h-[80vh] flex items-center justify-center bg-zinc-900 p-4">
      <div className="w-full max-w-md bg-zinc-800 p-8 rounded-2xl shadow-2xl border border-zinc-700">
        
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-yellow-500 rounded-full flex items-center justify-center mx-auto mb-4 shadow-[0_0_15px_rgba(234,179,8,0.4)]">
            <FaLock className="text-zinc-900 text-2xl" />
          </div>
          <h2 className="text-2xl font-black text-white">Recuperar Contraseña</h2>
          <p className="text-gray-400 text-sm mt-2">Snacks Lizama</p>
        </div>

        {validating ? (
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-yellow-500 mx-auto mb-4"></div>
            <p className="text-gray-400">Verificando enlace seguro...</p>
          </div>
        ) : error ? (
          <div className="text-center space-y-6 animate-fade-in">
            <div className="bg-red-900/30 p-4 rounded-xl border border-red-500/50 flex flex-col items-center">
              <FaExclamationTriangle className="text-red-500 text-3xl mb-2" />
              <p className="text-red-200 font-medium">{error}</p>
            </div>
            <a href="/login" className="inline-flex items-center gap-2 bg-zinc-700 hover:bg-zinc-600 text-white px-6 py-3 rounded-xl font-bold transition">
              Volver al Inicio
            </a>
          </div>
        ) : message ? (
          <div className="text-center space-y-6 animate-fade-in">
            <div className="bg-green-900/30 p-6 rounded-xl border border-green-500/50 flex flex-col items-center">
              <FaCheckCircle className="text-green-500 text-4xl mb-3" />
              <p className="text-green-400 font-bold text-lg">{message}</p>
              <p className="text-gray-400 text-sm mt-2">Redirigiendo al inicio de sesión...</p>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-5 animate-fade-in">
            <div className="bg-zinc-900 p-3 rounded-lg border border-zinc-700 text-center mb-6">
              <p className="text-xs text-gray-500 uppercase tracking-widest mb-1">Cuenta verificada</p>
              <p className="text-yellow-500 font-bold text-sm">{email}</p>
            </div>

            <div>
              <label className="block text-gray-300 text-sm font-bold mb-2">Nueva Contraseña</label>
              <input 
                type="password" 
                placeholder="Mínimo 6 caracteres"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="w-full bg-zinc-900 border border-zinc-700 text-white p-3 rounded-xl focus:border-yellow-500 focus:ring-1 focus:ring-yellow-500 outline-none"
                required
              />
            </div>

            <div>
              <label className="block text-gray-300 text-sm font-bold mb-2">Confirmar Contraseña</label>
              <input 
                type="password" 
                placeholder="Repite la contraseña"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full bg-zinc-900 border border-zinc-700 text-white p-3 rounded-xl focus:border-yellow-500 focus:ring-1 focus:ring-yellow-500 outline-none"
                required
              />
            </div>

            <button 
              type="submit" 
              disabled={loading || !newPassword || !confirmPassword}
              className={`w-full py-4 rounded-xl font-black text-lg flex items-center justify-center gap-2 transition-all shadow-lg 
                ${loading || !newPassword || !confirmPassword ? 'bg-zinc-700 text-zinc-500 cursor-not-allowed' : 'bg-yellow-500 hover:bg-yellow-400 text-zinc-900 shadow-yellow-500/20 active:scale-95'}`}
            >
              {loading ? 'Guardando...' : <>Guardar Contraseña <FaArrowRight/></>}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}