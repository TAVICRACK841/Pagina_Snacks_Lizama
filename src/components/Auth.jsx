import { useState, useEffect } from 'react';
import { auth, db } from '../firebase/config';
import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  GoogleAuthProvider, 
  signInWithPopup, 
  sendPasswordResetEmail,
  setPersistence,           // <--- IMPORTANTE PARA MANTENER SESIÓN
  browserLocalPersistence,   // <--- IMPORTANTE PARA MANTENER SESIÓN
  onAuthStateChanged
} from 'firebase/auth';
import { doc, setDoc, getDoc } from 'firebase/firestore';
import { FaEnvelope, FaLock, FaSignInAlt, FaUserPlus, FaGoogle, FaTimes, FaEye, FaEyeSlash } from 'react-icons/fa'; // <--- ICONOS NUEVOS

export default function Auth() {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  
  // Estado para mostrar/ocultar contraseña
  const [showPassword, setShowPassword] = useState(false); 

  const [error, setError] = useState('');
  const [success, setSuccess] = useState(''); 
  const [loading, setLoading] = useState(false);

  // Estados para el Modal de Recuperar Contraseña
  const [showResetModal, setShowResetModal] = useState(false);
  const [resetEmail, setResetEmail] = useState('');

  // --- EFECTO NUEVO: SI YA TIENE SESIÓN, REDIRIGIR AL MENÚ ---
  useEffect(() => {
    // Esto revisa si el usuario ya estaba logueado de antes
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

  // --- 1. LÓGICA GOOGLE ---
  const handleGoogleLogin = async () => {
    setError('');
    try {
        // FORZAMOS LA PERSISTENCIA LOCAL ANTES DE INICIAR
        await setPersistence(auth, browserLocalPersistence);

        const provider = new GoogleAuthProvider();
        const result = await signInWithPopup(auth, provider);
        const user = result.user;

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
        window.location.href = '/menu';
    } catch (err) {
        console.error(err);
        setError("Error al iniciar con Google. Intenta de nuevo.");
    }
  };

  // --- 2. LÓGICA CORREO/CONTRASEÑA ---
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);
    
    try {
      // FORZAMOS LA PERSISTENCIA LOCAL ANTES DE CUALQUIER COSA
      await setPersistence(auth, browserLocalPersistence);

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
      if(err.code === 'auth/invalid-credential' || err.code === 'auth/user-not-found' || err.code === 'auth/wrong-password') setError("Correo o contraseña incorrectos.");
      else if(err.code === 'auth/email-already-in-use') setError("Este correo ya está registrado.");
      else if(err.code === 'auth/weak-password') setError("La contraseña debe tener al menos 6 caracteres.");
      else setError(err.message);
    }
    setLoading(false);
  };

  // --- 3. LÓGICA RECUPERAR PASSWORD ---
  const handlePasswordReset = async (e) => {
      e.preventDefault();
      if(!resetEmail) {
          setError("Por favor ingresa tu correo.");
          return;
      }
      try {
          await sendPasswordResetEmail(auth, resetEmail);
          setSuccess("Correo de recuperación enviado. Revisa tu bandeja.");
          setError('');
          setTimeout(() => {
              setShowResetModal(false);
              setSuccess('');
              setResetEmail('');
          }, 3000); 
      } catch (err) {
          if(err.code === 'auth/user-not-found') setError("No existe cuenta con este correo.");
          else setError("Error al enviar correo: " + err.message);
      }
  };

  return (
    <div className="bg-zinc-100 p-8 rounded-3xl shadow-2xl w-full transition-all duration-300 transform hover:shadow-yellow-500/20 border border-zinc-200 relative">
      
      <h2 className="text-3xl font-extrabold text-center mb-6 text-gray-800 flex justify-center items-center gap-2">
        {isLogin ? <><FaSignInAlt className="text-yellow-500"/> Iniciar Sesión</> : <><FaUserPlus className="text-yellow-500"/> Crear Cuenta</>}
      </h2>

      {error && (
        <div className="bg-red-50 border-l-4 border-red-500 text-red-700 p-3 rounded mb-4 text-sm font-medium animate-pulse">
          {error}
        </div>
      )}

      {success && (
        <div className="bg-green-50 border-l-4 border-green-500 text-green-700 p-3 rounded mb-4 text-sm font-medium animate-pulse">
          {success}
        </div>
      )}

      {/* --- FORMULARIO PRINCIPAL --- */}
      <form onSubmit={handleSubmit} className="flex flex-col gap-5">
        
        <div className="relative group">
            <FaEnvelope className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 group-focus-within:text-yellow-500 transition-colors"/>
            <input 
                type="email" 
                placeholder="Correo electrónico" 
                className="w-full pl-12 pr-4 py-4 bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-yellow-500 text-gray-700 font-medium shadow-sm transition-all" 
                value={email} 
                onChange={(e) => setEmail(e.target.value)} 
                required 
            />
        </div>

        {/* INPUT DE CONTRASEÑA CON OJITO */}
        <div className="relative group">
            <FaLock className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 group-focus-within:text-yellow-500 transition-colors"/>
            <input 
                type={showPassword ? "text" : "password"} // <--- AQUÍ CAMBIA EL TIPO
                placeholder="Contraseña" 
                className="w-full pl-12 pr-12 py-4 bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-yellow-500 text-gray-700 font-medium shadow-sm transition-all" 
                value={password} 
                onChange={(e) => setPassword(e.target.value)} 
                required 
            />
            
            {/* Botón del Ojo */}
            <button 
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-4 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-yellow-600 transition focus:outline-none"
            >
                {showPassword ? <FaEyeSlash size={20} /> : <FaEye size={20} />}
            </button>
        </div>

        {isLogin && (
            <div className="text-right -mt-2">
                <button 
                    type="button"
                    onClick={() => { setShowResetModal(true); setError(''); setSuccess(''); }}
                    className="text-xs font-bold text-gray-500 hover:text-yellow-600 underline transition"
                >
                    ¿Olvidaste tu contraseña?
                </button>
            </div>
        )}

        <button 
            type="submit" 
            disabled={loading}
            className="mt-2 w-full bg-yellow-500 text-black font-black py-4 rounded-xl shadow-lg hover:bg-yellow-400 hover:shadow-yellow-500/40 transform hover:-translate-y-1 active:scale-95 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed uppercase tracking-wide"
        >
            {loading ? 'Procesando...' : (isLogin ? 'Entrar a la App' : 'Registrarme Gratis')}
        </button>

      </form>

      <div className="flex items-center my-6">
          <div className="flex-1 h-px bg-gray-300"></div>
          <span className="px-3 text-xs text-gray-400 font-bold uppercase">O continúa con</span>
          <div className="flex-1 h-px bg-gray-300"></div>
      </div>

      <button 
          type="button"
          onClick={handleGoogleLogin}
          className="w-full bg-white border border-gray-300 text-gray-700 font-bold py-3 rounded-xl shadow-sm hover:bg-gray-50 hover:shadow-md transition flex items-center justify-center gap-2 mb-4"
      >
          <FaGoogle className="text-red-500 text-lg" />
          <span className="text-sm">Iniciar con Google</span>
      </button>

      <div className="text-center pt-2 border-t border-gray-200">
        <p className="text-gray-500 text-sm mb-2">
          {isLogin ? '¿Aún no tienes cuenta?' : '¿Ya tienes una cuenta?'}
        </p>
        <button 
            onClick={() => { setIsLogin(!isLogin); setError(''); setSuccess(''); }} 
            className="text-yellow-600 font-extrabold hover:text-yellow-700 hover:underline transition uppercase tracking-wide text-sm"
        >
          {isLogin ? 'Crear cuenta nueva' : 'Ingresar ahora'}
        </button>
      </div>

      {/* --- MODAL RECUPERAR CONTRASEÑA --- */}
      {showResetModal && (
          <div className="absolute inset-0 bg-white/95 backdrop-blur-sm rounded-3xl z-50 flex flex-col justify-center p-8 animate-fade-in">
              <button 
                  onClick={() => setShowResetModal(false)}
                  className="absolute top-4 right-4 text-gray-400 hover:text-red-500 transition"
              >
                  <FaTimes size={24} />
              </button>

              <h3 className="text-2xl font-bold text-gray-800 mb-2 text-center">Recuperar Acceso</h3>
              <p className="text-gray-500 text-center mb-6 text-sm">Ingresa tu correo y te enviaremos un enlace mágico.</p>

              {error && <p className="text-red-500 text-xs text-center mb-3 font-bold">{error}</p>}
              {success && <p className="text-green-500 text-xs text-center mb-3 font-bold">{success}</p>}

              <form onSubmit={handlePasswordReset} className="space-y-4">
                  <div className="relative group">
                      <FaEnvelope className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400"/>
                      <input 
                          type="email" 
                          placeholder="Tu correo registrado" 
                          className="w-full pl-12 pr-4 py-3 bg-gray-50 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-yellow-500 text-gray-800" 
                          value={resetEmail} 
                          onChange={(e) => setResetEmail(e.target.value)} 
                          autoFocus
                      />
                  </div>
                  <button type="submit" className="w-full bg-gray-800 text-white font-bold py-3 rounded-xl hover:bg-black transition shadow-lg">
                      Enviar Enlace
                  </button>
              </form>
          </div>
      )}

    </div>
  );
}