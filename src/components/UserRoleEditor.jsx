import { useState } from 'react';
import { FaSave, FaTimes, FaUserTag, FaCheck } from 'react-icons/fa';

// --- 1. UTILIDAD DE COLORES (Regresamos los colores) ---
const getRoleColorClasses = (roleId, isActive) => {
    const base = "border shadow-sm transition-all duration-200 group hover:shadow-md";
    // Si no está activo, se ve apagado. Si está activo, brilla con su color.
    const activeState = isActive ? "bg-opacity-90 text-white scale-[1.02]" : "bg-zinc-800/50 text-gray-400 border-zinc-700 hover:border-zinc-500 hover:text-gray-200";

    switch(roleId) {
        case 'admin': return `${base} ${isActive ? 'bg-gradient-to-br from-red-900 to-red-700 border-red-500 shadow-red-900/50' : activeState}`;
        case 'hamburguesero':
        case 'frappero':
        case 'productor':
        case 'freidor': return `${base} ${isActive ? 'bg-gradient-to-br from-yellow-700 to-yellow-600 border-yellow-500 shadow-yellow-900/50 text-yellow-100' : activeState}`;
        case 'mesero': case 'mesero 1': case 'mesero 2':
        case 'repartidor': case 'repartidor 1': case 'repartidor 2': return `${base} ${isActive ? 'bg-gradient-to-br from-green-800 to-green-600 border-green-500 shadow-green-900/50' : activeState}`;
        case 'cliente': return `${base} ${isActive ? 'bg-gradient-to-br from-blue-900 to-blue-700 border-blue-500 shadow-blue-900/50' : activeState}`;
        default: return `${base} ${isActive ? 'bg-zinc-600 border-zinc-400' : activeState}`;
    }
};


export default function UserRoleEditor({ user, roleOptions, onSave, onCancel }) {
    // Inicializamos los roles temporales con los roles actuales del usuario
    const [tempRoles, setTempRoles] = useState(user.roles || (user.role ? [user.role] : []));

    const toggleTempRole = (roleId) => {
        if (tempRoles.includes(roleId)) {
            setTempRoles(tempRoles.filter(r => r !== roleId));
        } else {
            setTempRoles([...tempRoles, roleId]);
        }
    };

    const handleSave = () => {
        onSave(tempRoles);
    };

    return (
        <div className="bg-zinc-900/80 p-4 rounded-xl border-2 border-yellow-500/50 shadow-[0_0_20px_rgba(234,179,8,0.15)] animate-fade-in relative overflow-hidden">
            {/* Decoración de fondo */}
            <div className="absolute top-0 right-0 -mt-4 -mr-4 w-24 h-24 bg-yellow-500/10 rounded-full blur-2xl pointer-events-none"></div>

            <div className="flex justify-between items-center mb-4 border-b border-zinc-800 pb-2 relative z-10">
                <h3 className="text-sm font-bold text-yellow-400 flex items-center gap-2 uppercase tracking-wider">
                    <FaUserTag /> Editando Roles: <span className="text-white normal-case">{user.displayName}</span>
                </h3>
            </div>
            
            {/* GRID DE CHECKBOXES "LLAMATIVO" */}
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2 mb-4 relative z-10">
                {roleOptions.map(opt => {
                    const isActive = tempRoles.includes(opt.id);
                    return (
                        <label 
                            key={opt.id} 
                            className={`flex items-center gap-3 p-2 rounded-lg cursor-pointer relative overflow-hidden select-none ${getRoleColorClasses(opt.id, isActive)}`}
                            onClick={() => toggleTempRole(opt.id)}
                        >
                            {/* Checkbox visual personalizado */}
                            <div className={`w-5 h-5 rounded flex items-center justify-center border transition-all ${isActive ? 'bg-white border-white text-black scale-110' : 'border-zinc-600 bg-zinc-800/80'}`}>
                                {isActive && <FaCheck size={12} className="text-current"/>}
                            </div>
                            <span className={`text-xs font-bold ${isActive ? 'text-white' : 'text-gray-300 group-hover:text-white'}`}>
                                {opt.label}
                            </span>
                        </label>
                    );
                })}
            </div>

            {/* BOTONES DE ACCIÓN TEMÁTICOS */}
            <div className="flex gap-3 justify-end border-t border-zinc-800 pt-3 relative z-10">
                <button 
                    onClick={onCancel} 
                    className="px-4 py-2 rounded-lg text-xs font-bold text-red-400 border border-red-900/50 hover:bg-red-900/20 hover:border-red-700 transition flex items-center gap-2"
                >
                    <FaTimes /> Cancelar
                </button>
                <button 
                    onClick={handleSave} 
                    className="px-5 py-2 rounded-lg text-xs font-bold text-black bg-gradient-to-r from-yellow-500 to-yellow-600 hover:from-yellow-400 hover:to-yellow-500 shadow-lg shadow-yellow-500/20 hover:shadow-yellow-500/40 transform hover:-translate-y-0.5 transition-all flex items-center gap-2"
                >
                    <FaSave /> Guardar Cambios
                </button>
            </div>
        </div>
    );
}