import { useState, useEffect } from 'react';
import { auth, db } from '../firebase/config';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword } from 'firebase/auth';
import { doc, setDoc } from 'firebase/firestore';
import { FaEnvelope, FaLock, FaSignInAlt, FaUserPlus } from 'react-icons/fa';

export default function Auth() {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const emailParam = params.get('email');
    if (emailParam) {
      setEmail(emailParam);
    }
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      if (isLogin) {
        await signInWithEmailAndPassword(auth, email, password);
      } else {
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;
        const role = email === 'gustavo841lizama@gmail.com' ? 'admin' : 'cliente';
        
        await setDoc(doc(db, 'users', user.uid), {
          uid: user.uid, 
          email: user.email, 
          role: role, 
          createdAt: new Date(),
          displayName: '', 
          phone: '', 
          address: '', 
          savedAddresses: [], 
          photoURL: ''
        });
      }
      window.location.href = '/menu';
    } catch (err) {
      if(err.code === 'auth/invalid-credential') setError("Correo o contraseña incorrectos.");
      else if(err.code === 'auth/email-already-in-use') setError("Este correo ya está registrado.");
      else if(err.code === 'auth/weak-password') setError("La contraseña debe tener al menos 6 caracteres.");
      else setError(err.message);
    }
    setLoading(false);
  };

  return (
    // CAMBIO: Fondo Gris Claro (bg-zinc-100) en lugar de blanco
    <div className="bg-zinc-100 p-8 rounded-3xl shadow-2xl w-full transition-all duration-300 transform hover:shadow-yellow-500/20 border border-zinc-200">
      
      <h2 className="text-3xl font-extrabold text-center mb-6 text-gray-800 flex justify-center items-center gap-2">
        {/* CAMBIO: Icono Amarillo */}
        {isLogin ? <><FaSignInAlt className="text-yellow-500"/> Iniciar Sesión</> : <><FaUserPlus className="text-yellow-500"/> Crear Cuenta</>}
      </h2>

      {error && (
        <div className="bg-red-50 border-l-4 border-red-500 text-red-700 p-3 rounded mb-4 text-sm font-medium animate-pulse">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="flex flex-col gap-5">
        
        <div className="relative group">
            {/* CAMBIO: Icono Amarillo al enfocar */}
            <FaEnvelope className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 group-focus-within:text-yellow-500 transition-colors"/>
            {/* CAMBIO: Input Blanco con borde Amarillo al enfocar */}
            <input 
                type="email" 
                placeholder="Correo electrónico" 
                className="w-full pl-12 pr-4 py-4 bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-yellow-500 text-gray-700 font-medium shadow-sm transition-all" 
                value={email} 
                onChange={(e) => setEmail(e.target.value)} 
                required 
            />
        </div>

        <div className="relative group">
            <FaLock className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 group-focus-within:text-yellow-500 transition-colors"/>
            <input 
                type="password" 
                placeholder="Contraseña" 
                className="w-full pl-12 pr-4 py-4 bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-yellow-500 text-gray-700 font-medium shadow-sm transition-all" 
                value={password} 
                onChange={(e) => setPassword(e.target.value)} 
                required 
            />
        </div>

        {/* CAMBIO: Botón Amarillo con Texto Negro (Mejor contraste) */}
        <button 
            type="submit" 
            disabled={loading}
            className="mt-2 w-full bg-yellow-500 text-black font-black py-4 rounded-xl shadow-lg hover:bg-yellow-400 hover:shadow-yellow-500/40 transform hover:-translate-y-1 active:scale-95 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed uppercase tracking-wide"
        >
            {loading ? 'Procesando...' : (isLogin ? 'Entrar a la App' : 'Registrarme Gratis')}
        </button>

      </form>

      <div className="mt-6 text-center pt-4 border-t border-gray-200">
        <p className="text-gray-500 text-sm mb-2">
          {isLogin ? '¿Aún no tienes cuenta?' : '¿Ya tienes una cuenta?'}
        </p>
        <button 
            onClick={() => { setIsLogin(!isLogin); setError(''); }} 
            // CAMBIO: Texto Amarillo oscuro para legibilidad
            className="text-yellow-600 font-extrabold hover:text-yellow-700 hover:underline transition uppercase tracking-wide text-sm"
        >
          {isLogin ? 'Crear cuenta nueva' : 'Ingresar ahora'}
        </button>
      </div>

    </div>
  );
}