import { useState, useEffect } from 'react';
import { auth, db } from '../firebase/config';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword } from 'firebase/auth';
import { doc, setDoc } from 'firebase/firestore';

export default function Auth() {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  // --- ESTO ES LO QUE HACE LA MAGIA ---
  useEffect(() => {
    // Si la URL tiene ?email=..., lo ponemos en la cajita
    const params = new URLSearchParams(window.location.search);
    const emailParam = params.get('email');
    if (emailParam) {
      setEmail(emailParam);
    }
  }, []);
  // ------------------------------------

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    try {
      if (isLogin) {
        await signInWithEmailAndPassword(auth, email, password);
      } else {
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;
        const role = email === 'gustavo841lizama@gmail.com' ? 'admin' : 'cliente';
        await setDoc(doc(db, 'users', user.uid), {
          uid: user.uid, email: user.email, role: role, createdAt: new Date(),
          displayName: '', phone: '', address: '', savedAddresses: [], photoURL: ''
        });
      }
      window.location.href = '/menu';
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div className="w-full max-w-sm p-6 bg-white rounded-lg shadow-xl">
      <h2 className="text-2xl font-bold text-center mb-6 text-gray-800">
        {isLogin ? 'Iniciar Sesión' : 'Registrarse'}
      </h2>
      {error && <p className="text-red-500 text-sm mb-4 text-center">{error}</p>}
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <input type="email" placeholder="Correo electrónico" className="p-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500" value={email} onChange={(e) => setEmail(e.target.value)} required />
        <input type="password" placeholder="Contraseña" className="p-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500" value={password} onChange={(e) => setPassword(e.target.value)} required />
        <button type="submit" className="bg-orange-600 text-white font-bold py-3 rounded-lg hover:bg-orange-700 transition">{isLogin ? 'Entrar' : 'Registrarse'}</button>
      </form>
      <p className="mt-4 text-center text-gray-600 text-sm">
        {isLogin ? '¿No tienes cuenta? ' : '¿Ya tienes cuenta? '}
        <button onClick={() => setIsLogin(!isLogin)} className="text-orange-600 font-bold hover:underline">{isLogin ? 'Regístrate' : 'Ingresa'}</button>
      </p>
    </div>
  );
}