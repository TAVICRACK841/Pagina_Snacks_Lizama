import { useState, useEffect } from 'react';
import { auth, db } from '../firebase/config';
import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  GoogleAuthProvider, 
  signInWithPopup, 
  sendPasswordResetEmail,
  setPersistence,
  browserLocalPersistence,
  onAuthStateChanged
} from 'firebase/auth';
import { doc, setDoc, getDoc } from 'firebase/firestore';
import { FaEnvelope, FaLock, FaSignInAlt, FaUserPlus, FaGoogle, FaTimes, FaEye, FaEyeSlash } from 'react-icons/fa';

export default function Auth() {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false); 

  const [error, setError] = useState('');
  const [success, setSuccess] = useState(''); 
  const [loading, setLoading] = useState(false);

  // Estados para el Modal de Recuperar Contraseña
  const [showResetModal, setShowResetModal] = useState(false);
  const [resetEmail, setResetEmail] = useState('');

  useEffect(() => {
    // Revisar sesión activa y redirigir
    const unsubscribe = onAuthStateChanged(auth, (user) => {
        if (user) {
            window.location.href = '/menu';
        }
    });

    const params = new URLSearchParams(window.location.search);
    const emailParam = params.get('email');
    if (emailParam) {
      setEmail(emailParam);
    }

    return () => unsubscribe();
  }, []);

  // --- 1. LOGIN CON GOOGLE ---
  const handleGoogleLogin = async () => {
    setError('');
    setLoading(true);
    try {
        await setPersistence(auth, browserLocalPersistence);
        const provider = new GoogleAuthProvider();
        const result = await signInWithPopup(auth, provider);
        const user = result.user;

        // Verificar si existe en la BD
        const userRef = doc(db, 'users', user.uid);
        const userSnap = await getDoc(userRef);

        if (!userSnap.exists()) {
            await setDoc(userRef, {
                uid: user.uid,
                email: user.email,
                role: 'cliente',
                createdAt: new Date(),
                displayName: user.displayName || '',
                photoURL: user.photoURL || '',
                phone: '',
                address: '',
                savedAddresses: []
            });
        }
        // La redirección la maneja el onAuthStateChanged, pero por seguridad:
        window.location.href = '/menu';
    } catch (err) {
        console.error(err);
        setError("Error al iniciar con Google.");
        setLoading(false);
    }
  };

  // --- 2. LOGIN CON CORREO ---
  const handleSubmit = async (e) => {
    e.preventDefault(); // IMPORTANTE: Evita que la página se recargue
    setError('');
    setSuccess('');
    
    if (!email || !password) {
        setError("Por favor completa todos los campos.");
        return;
    }

    setLoading(true);
    
    try {
      await setPersistence(auth, browserLocalPersistence);

      if (isLogin) {
        // --- INICIAR SESIÓN ---
        await signInWithEmailAndPassword(auth, email, password);
      } else {
        // --- CREAR CUENTA ---
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
      // Redirección manejada por el observer
    } catch (err) {
      console.error("Auth Error:", err.code);
      if(err.code === 'auth/invalid-credential' || err.code === 'auth/user-not-found' || err.code === 'auth/wrong-password') {
          setError("Correo o contraseña incorrectos.");
      } else if(err.code === 'auth/email-already-in-use') {
          setError("Este correo ya está registrado. Intenta iniciar sesión.");
      } else if(err.code === 'auth/weak-password') {
          setError("La contraseña debe tener al menos 6 caracteres.");
      } else if(err.code === 'auth/missing-password') {
        setError("Falta la contraseña.");
      } else {
          setError("Error de autenticación: " + err.message);
      }
      setLoading(false);
    }
  };

  const handlePasswordReset = async (e) => {
      e.preventDefault();
      if(!resetEmail) {
          setError("Por favor ingresa tu correo.");
          return;
      }
      try {
          await sendPasswordResetEmail(auth, resetEmail);
          setSuccess("Correo enviado. Revisa tu bandeja (incluso Spam).");
          setError('');
          setTimeout(() => {
              setShowResetModal(false);
              setSuccess('');
              setResetEmail('');
          }, 4000); 
      } catch (err) {
          if(err.code === 'auth/user-not-found') setError("No existe cuenta con este correo.");
          else setError("Error al enviar: " + err.message);
      }
  };

  return (
    <div className="bg-white/90 backdrop-blur-md p-8 rounded-3xl shadow-2xl w-full border border-zinc-200 relative overflow-hidden">
      
      {/* Barra superior decorativa */}
      <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-yellow-400 to-yellow-600"></div>

      <h2 className="text-3xl font-black text-center mb-8 text-zinc-800 tracking-tight">
        {isLogin ? 'Bienvenido de nuevo' : 'Únete a Snacks Lizama'}
      </h2>

      {error && (
        <div className="bg-red-50 border-l-4 border-red-500 text-red-700 p-3 rounded mb-4 text-sm font-bold animate-pulse flex items-center gap-2">
           <span>⚠️</span> {error}
        </div>
      )}

      {success && (
        <div className="bg-green-50 border-l-4 border-green-500 text-green-700 p-3 rounded mb-4 text-sm font-bold animate-pulse">
          {success}
        </div>
      )}

      {/* --- FORMULARIO --- */}
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        
        <div className="relative group">
            <FaEnvelope className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 group-focus-within:text-yellow-600 transition-colors z-10"/>
            <input 
                type="email" 
                placeholder="Correo electrónico" 
                className="w-full pl-12 pr-4 py-4 bg-zinc-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:bg-white text-gray-800 font-medium shadow-sm transition-all" 
                value={email} 
                onChange={(e) => setEmail(e.target.value)} 
                required 
            />
        </div>

        <div className="relative group">
            <FaLock className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 group-focus-within:text-yellow-600 transition-colors z-10"/>
            <input 
                type={showPassword ? "text" : "password"} 
                placeholder="Contraseña" 
                className="w-full pl-12 pr-12 py-4 bg-zinc-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:bg-white text-gray-800 font-medium shadow-sm transition-all" 
                value={password} 
                onChange={(e) => setPassword(e.target.value)} 
                required 
            />
            <button 
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-4 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-yellow-600 transition focus:outline-none p-1"
            >
                {showPassword ? <FaEyeSlash size={18} /> : <FaEye size={18} />}
            </button>
        </div>

        {isLogin && (
            <div className="text-right">
                <button 
                    type="button"
                    onClick={() => { setShowResetModal(true); setError(''); }}
                    className="text-xs font-bold text-gray-500 hover:text-yellow-600 transition"
                >
                    ¿Olvidaste tu contraseña?
                </button>
            </div>
        )}

        <button 
            type="submit" 
            disabled={loading}
            className="mt-2 w-full bg-yellow-500 text-zinc-900 font-black py-4 rounded-xl shadow-[0_4px_14px_0_rgba(234,179,8,0.39)] hover:bg-yellow-400 hover:shadow-[0_6px_20px_rgba(234,179,8,0.23)] transform hover:-translate-y-0.5 active:scale-95 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
            {loading ? (
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-zinc-900"></div>
            ) : (
                isLogin ? <><FaSignInAlt /> Iniciar Sesión</> : <><FaUserPlus /> Crear Cuenta</>
            )}
        </button>

      </form>

      <div className="flex items-center my-6">
          <div className="flex-1 h-px bg-gray-200"></div>
          <span className="px-3 text-xs text-gray-400 font-bold uppercase tracking-wider">O usa tu cuenta</span>
          <div className="flex-1 h-px bg-gray-200"></div>
      </div>

      {/* --- BOTÓN DE GOOGLE REDISEÑADO --- */}
      <button 
          type="button"
          onClick={handleGoogleLogin}
          disabled={loading}
          className="w-full bg-white border border-gray-200 text-gray-700 font-bold py-3.5 rounded-xl shadow-sm hover:shadow-md hover:border-gray-300 transition-all flex items-center justify-center gap-3 group active:scale-95"
      >
          <div className="bg-white p-1 rounded-full group-hover:scale-110 transition-transform">
             <FaGoogle className="text-red-500 text-xl" />
          </div>
          <span className="group-hover:text-black transition-colors">Continuar con Google</span>
      </button>

      <div className="text-center pt-6 mt-2">
        <button 
            onClick={() => { setIsLogin(!isLogin); setError(''); setSuccess(''); }} 
            className="text-sm text-gray-600 font-medium hover:text-yellow-600 transition"
        >
          {isLogin ? '¿No tienes cuenta? ' : '¿Ya tienes cuenta? '}
          <span className="font-extrabold text-yellow-600 underline decoration-2 underline-offset-2">
            {isLogin ? 'Regístrate aquí' : 'Ingresa aquí'}
          </span>
        </button>
      </div>

      {/* --- MODAL RECUPERAR --- */}
      {showResetModal && (
          <div className="absolute inset-0 bg-white/95 backdrop-blur-md rounded-3xl z-50 flex flex-col justify-center p-8 animate-fade-in">
              <button 
                  onClick={() => setShowResetModal(false)}
                  className="absolute top-4 right-4 text-gray-400 hover:text-red-500 bg-gray-100 hover:bg-red-50 p-2 rounded-full transition"
              >
                  <FaTimes size={16} />
              </button>

              <div className="text-center mb-6">
                  <div className="bg-yellow-100 text-yellow-600 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 text-2xl">
                      🔐
                  </div>
                  <h3 className="text-2xl font-bold text-gray-800">Recuperar Acceso</h3>
                  <p className="text-gray-500 text-sm mt-2">Te enviaremos un enlace mágico a tu correo.</p>
              </div>

              {error && <p className="text-red-500 text-xs text-center mb-3 font-bold bg-red-50 p-2 rounded">{error}</p>}
              {success && <p className="text-green-500 text-xs text-center mb-3 font-bold bg-green-50 p-2 rounded">{success}</p>}

              <form onSubmit={handlePasswordReset} className="space-y-4">
                  <div className="relative group">
                      <FaEnvelope className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 group-focus-within:text-yellow-600"/>
                      <input 
                          type="email" 
                          placeholder="Tu correo registrado" 
                          className="w-full pl-12 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-yellow-500 text-gray-800" 
                          value={resetEmail} 
                          onChange={(e) => setResetEmail(e.target.value)} 
                          autoFocus
                      />
                  </div>
                  <button type="submit" className="w-full bg-zinc-800 text-white font-bold py-3 rounded-xl hover:bg-black transition shadow-lg hover:shadow-xl active:scale-95">
                      Enviar Enlace
                  </button>
              </form>
          </div>
      )}

    </div>
  );
}