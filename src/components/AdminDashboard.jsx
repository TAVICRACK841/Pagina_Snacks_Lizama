import { useState, useEffect } from 'react';
import { db } from '../firebase/config';
import { collection, addDoc, getDocs, doc, updateDoc } from 'firebase/firestore';

export default function AdminDashboard() {
  const [activeTab, setActiveTab] = useState('menu');
  const [loading, setLoading] = useState(false);
  
  const CLOUD_NAME = "dw5mio6d9"; 
  const UPLOAD_PRESET = "Snacks_Lizama"; 

  const [newProduct, setNewProduct] = useState({
    name: '',
    price: '',
    category: 'hamburguesas',
    description: '',
    inStock: true
  });
  const [imageFile, setImageFile] = useState(null);

  const [users, setUsers] = useState([]);
  const [usersLoading, setUsersLoading] = useState(false);

  useEffect(() => {
    if (activeTab === 'roles') {
      fetchUsers();
    }
  }, [activeTab]);

  const fetchUsers = async () => {
    setUsersLoading(true);
    try {
      const querySnapshot = await getDocs(collection(db, "users"));
      const usersList = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setUsers(usersList);
    } catch (error) {
      console.error(error);
    }
    setUsersLoading(false);
  };

  const handleUpdateRole = async (userId, newRole) => {
    try {
      const userRef = doc(db, "users", userId);
      await updateDoc(userRef, { role: newRole });
      alert(`Rol actualizado a: ${newRole}`);
      fetchUsers();
    } catch (error) {
      console.error(error);
      alert("Error al actualizar rol");
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setNewProduct({ ...newProduct, [name]: value });
  };

  const handleImageChange = (e) => {
    if (e.target.files[0]) setImageFile(e.target.files[0]);
  };

  const handleAddProduct = async (e) => {
    e.preventDefault();
    if (!imageFile || !newProduct.name || !newProduct.price) {
      alert("Faltan datos o la imagen");
      return;
    }
    setLoading(true);
    try {
      const formData = new FormData();
      formData.append("file", imageFile);
      formData.append("upload_preset", UPLOAD_PRESET);

      const res = await fetch(`https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`, { method: "POST", body: formData });
      const data = await res.json();
      
      if (!data.secure_url) throw new Error("Error Cloudinary");

      await addDoc(collection(db, "products"), {
        ...newProduct,
        price: Number(newProduct.price),
        image: data.secure_url,
        createdAt: new Date()
      });
      alert("Producto agregado");
      setNewProduct({ name: '', price: '', category: 'hamburguesas', description: '', inStock: true });
      setImageFile(null);
      document.getElementById('fileInput').value = '';
    } catch (error) {
      console.error(error);
      alert("Error al subir");
    }
    setLoading(false);
  };

  return (
    <div className="p-4 max-w-6xl mx-auto">
      <div className="flex border-b mb-6 overflow-x-auto bg-white rounded-t-lg shadow-sm">
        {['menu', 'roles', 'finanzas'].map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-8 py-4 font-bold uppercase text-sm whitespace-nowrap transition-colors ${
              activeTab === tab 
                ? 'border-b-4 border-orange-600 text-orange-600 bg-orange-50' 
                : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {activeTab === 'menu' && (
        <div className="bg-white p-6 rounded-lg shadow-md">
          <h2 className="text-xl font-bold mb-4">Agregar Nuevo Producto</h2>
          <form onSubmit={handleAddProduct} className="flex flex-col gap-4">
            
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1">
                <label className="block text-gray-700 font-bold mb-2">Nombre</label>
                <input type="text" name="name" value={newProduct.name} onChange={handleInputChange} className="w-full p-2 border rounded" placeholder="Ej: Hamburguesa Sencilla" />
              </div>
              <div className="w-32">
                <label className="block text-gray-700 font-bold mb-2">Precio ($)</label>
                <input type="number" name="price" value={newProduct.price} onChange={handleInputChange} className="w-full p-2 border rounded" placeholder="0" />
              </div>
            </div>

            <div>
              <label className="block text-gray-700 font-bold mb-2">Categoría</label>
              <select name="category" value={newProduct.category} onChange={handleInputChange} className="w-full p-2 border rounded bg-white">
                <option value="hamburguesas">Hamburguesas</option>
                <option value="alitas">Alitas / Boneless</option>
                <option value="bebidas">Bebidas</option>
                <option value="otros">Otros</option>
              </select>
            </div>

            <div>
              <label className="block text-gray-700 font-bold mb-2">Descripción</label>
              <textarea name="description" value={newProduct.description} onChange={handleInputChange} className="w-full p-2 border rounded" rows="2"></textarea>
            </div>

            <div>
              <label className="block text-gray-700 font-bold mb-2">Imagen</label>
              <input id="fileInput" type="file" accept="image/*" onChange={handleImageChange} className="w-full p-2 border border-dashed rounded bg-gray-50" />
            </div>

            <button type="submit" disabled={loading} className="mt-4 py-3 bg-green-600 text-white font-bold rounded shadow hover:bg-green-700 disabled:bg-gray-400">
              {loading ? 'Subiendo...' : 'Guardar Producto'}
            </button>
          </form>
        </div>
      )}

      {activeTab === 'roles' && (
        <div className="bg-white p-6 rounded-lg shadow-md">
          <h2 className="text-2xl font-bold mb-6 text-gray-800">Gestión de Personal</h2>
          
          {usersLoading ? (
            <div className="text-center py-10"><p>Cargando lista de personal...</p></div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-orange-100 text-orange-800">
                    <th className="p-3 border-b">Email</th>
                    <th className="p-3 border-b">Rol Actual</th>
                    <th className="p-3 border-b">Asignar Nuevo Rol</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((user) => (
                    <tr key={user.id} className="hover:bg-gray-50 border-b">
                      <td className="p-3 font-medium text-gray-700">{user.email}</td>
                      <td className="p-3">
                        <span className={`px-2 py-1 rounded text-xs font-bold uppercase ${
                          user.role === 'admin' ? 'bg-purple-100 text-purple-700' :
                          user.role === 'cliente' ? 'bg-blue-100 text-blue-700' :
                          'bg-yellow-100 text-yellow-800'
                        }`}>
                          {user.role}
                        </span>
                      </td>
                      <td className="p-3">
                        <select
                          className="p-2 border rounded bg-white focus:ring-2 focus:ring-orange-500"
                          defaultValue={user.role}
                          onChange={(e) => handleUpdateRole(user.id, e.target.value)}
                        >
                          <option value="cliente">Cliente</option>
                          <option value="admin">Jefe / Admin</option>
                          <option value="hamburguesero">Hamburguesero</option>
                          <option value="freidor">Freidor</option>
                          <option value="productor">Productor</option>
                          <option value="mesero">Mesero</option>
                          <option value="repartidor">Repartidor</option>
                        </select>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {activeTab === 'finanzas' && (
        <div className="text-center p-10 text-gray-500">
          <p>Panel Financiero (Próximamente)</p>
        </div>
      )}
    </div>
  );
}