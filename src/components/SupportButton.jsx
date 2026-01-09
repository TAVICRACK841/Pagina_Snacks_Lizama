import { useState, useEffect } from 'react';
import { db } from '../firebase/config';
import { doc, onSnapshot, addDoc, collection } from 'firebase/firestore';
import { FaHeadset, FaWhatsapp, FaEnvelope, FaPaperPlane, FaTimes } from 'react-icons/fa';
import { showToast } from '../stores/toastStore';

export default function SupportButton() {
  const [isOpen, setIsOpen] = useState(false);
  const [contactPhone, setContactPhone] = useState('');

  // Formulario de Quejas
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);

  // Solo escuchamos el teléfono en tiempo real (Lectura)
  useEffect(() => {
    const unsubPhone = onSnapshot(doc(db, "settings", "contact_info"), (docSnap) => {
        if (docSnap.exists()) {
            setContactPhone(docSnap.data().phoneNumber || 'No configurado');
        } else {
            setContactPhone('No configurado'); // Default si no existe
        }
    });

    return () => unsubPhone();
  }, []);

  // Función: Cliente envía queja
  const sendTicket = async (e) => {
    e.preventDefault();
    if (!email.trim() || !message.trim()) return showToast("Llena todos los campos", "error");

    setLoading(true);
    try {
        await addDoc(collection(db, "support_tickets"), {
            email,
            message,
            createdAt: new Date().toISOString(),
            status: 'pending', 
            read: false
        });

        showToast("Mensaje enviado. Te responderemos al correo.", "success");
        setMessage('');
        setEmail('');
        setIsOpen(false);
    } catch (error) {
        console.error(error);
        showToast("Error al enviar mensaje", "error");
    } finally {
        setLoading(false);
    }
  };

  return (
    <>
        {/* --- BOTÓN FLOTANTE --- */}
        <button 
            onClick={() => setIsOpen(true)}
            className="fixed bottom-6 left-6 z-[40] bg-zinc-900 text-yellow-500 p-4 rounded-full shadow-[0_0_15px_rgba(234,179,8,0.4)] border border-yellow-500 hover:scale-110 transition-transform active:scale-95 group"
            title="Ayuda y Quejas"
        >
            <FaHeadset size={24} className="group-hover:animate-wiggle"/>
        </button>

        {/* --- MODAL DE SOPORTE --- */}
        {isOpen && (
            <div className="fixed inset-0 z-[50] bg-black/90 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
                <div className="bg-zinc-900 w-full max-w-md rounded-2xl border border-yellow-500/30 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
                    
                    {/* Header */}
                    <div className="bg-yellow-500 p-4 flex justify-between items-center text-black">
                        <h3 className="font-black text-lg uppercase flex items-center gap-2">
                            <FaHeadset/> Centro de Ayuda
                        </h3>
                        <button onClick={() => setIsOpen(false)} className="hover:bg-black/10 p-2 rounded-full transition-colors">
                            <FaTimes size={20}/>
                        </button>
                    </div>

                    <div className="p-6 overflow-y-auto">
                        
                        {/* SECCIÓN 1: CONTACTO DIRECTO (Solo Lectura) */}
                        <div className="bg-zinc-800 p-4 rounded-xl border border-zinc-700 mb-6 text-center relative">
                            <p className="text-gray-400 text-xs uppercase tracking-widest mb-2 font-bold">Llámanos o WhatsApp</p>
                            
                            <div className="flex justify-center items-center gap-3">
                                <FaWhatsapp className="text-green-500 text-3xl"/>
                                <a 
                                    href={`https://wa.me/52${contactPhone.replace(/\D/g,'')}`} 
                                    target="_blank" 
                                    rel="noreferrer" 
                                    className="text-2xl font-black text-white hover:text-yellow-500 transition-colors"
                                >
                                    {contactPhone}
                                </a>
                            </div>
                            <p className="text-[10px] text-gray-500 mt-2">Atención inmediata en horarios laborales.</p>
                        </div>

                        <hr className="border-zinc-800 mb-6"/>

                        {/* SECCIÓN 2: FORMULARIO DE QUEJAS */}
                        <div className="text-center mb-4">
                            <h4 className="text-white font-bold text-lg flex justify-center items-center gap-2">
                                <FaEnvelope className="text-yellow-500"/> Buzón de Quejas
                            </h4>
                            <p className="text-gray-400 text-sm mt-1">
                                ¿Tuviste un problema? Déjanos tu mensaje y te responderemos por correo.
                            </p>
                        </div>

                        <form onSubmit={sendTicket} className="space-y-4">
                            <div>
                                <label className="text-xs text-gray-400 font-bold ml-1">TU CORREO (Para responderte)</label>
                                <input 
                                    type="email" 
                                    required
                                    placeholder="cliente@ejemplo.com"
                                    className="w-full bg-zinc-800 text-white p-3 rounded-xl border border-zinc-700 focus:border-yellow-500 focus:outline-none"
                                    value={email}
                                    onChange={e => setEmail(e.target.value)}
                                />
                            </div>
                            
                            <div>
                                <label className="text-xs text-gray-400 font-bold ml-1">TU MENSAJE / QUEJA</label>
                                <textarea 
                                    required
                                    rows="4"
                                    placeholder="Cuéntanos qué pasó o qué dudas tienes..."
                                    className="w-full bg-zinc-800 text-white p-3 rounded-xl border border-zinc-700 focus:border-yellow-500 focus:outline-none resize-none"
                                    value={message}
                                    onChange={e => setMessage(e.target.value)}
                                ></textarea>
                            </div>

                            <button 
                                type="submit" 
                                disabled={loading}
                                className="w-full bg-yellow-500 hover:bg-yellow-400 text-black font-black py-3 rounded-xl uppercase tracking-wide flex items-center justify-center gap-2 transition-transform active:scale-95 disabled:opacity-50"
                            >
                                {loading ? 'Enviando...' : <><FaPaperPlane/> Enviar Mensaje</>}
                            </button>
                        </form>

                    </div>
                </div>
            </div>
        )}
    </>
  );
}