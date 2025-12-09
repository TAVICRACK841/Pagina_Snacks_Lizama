import { useState, useEffect } from 'react';
import { db } from '../firebase/config';
import { collection, getDocs, query, orderBy } from 'firebase/firestore';
import { addToCart } from '../stores/cartStore';
import { showToast } from '../stores/toastStore'; // <--- IMPORTAMOS LA NOTIFICACIÓN BONITA

export default function MenuGrid() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    const fetchProducts = async () => {
      try {
        const q = query(collection(db, "products"), orderBy("createdAt", "desc"));
        const querySnapshot = await getDocs(q);
        const productsList = querySnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        setProducts(productsList);
      } catch (error) {
        console.error("Error al cargar menú:", error);
      }
      setLoading(false);
    };

    fetchProducts();
  }, []);

  // Lógica del buscador
  const filteredProducts = products.filter(product => 
    product.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return (
      <div className="flex justify-center items-center h-40">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-600"></div>
      </div>
    );
  }

  return (
    <div className="p-4 max-w-7xl mx-auto">
      
      {/* BARRA DE BÚSQUEDA */}
      <div className="mb-8 flex flex-col md:flex-row justify-between items-center gap-4">
        <h2 className="text-3xl font-bold text-gray-800">Nuestro <span className="text-orange-600">Menú</span></h2>
        
        <div className="relative w-full md:w-96">
          <input 
            type="text" 
            placeholder="🔍 Buscar alitas, hamburguesas..." 
            className="w-full pl-4 pr-4 py-3 border border-gray-300 rounded-full shadow-sm focus:outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-200 transition-all"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      {/* GRID DE PRODUCTOS */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredProducts.length > 0 ? (
          filteredProducts.map((product) => (
            <div key={product.id} className="bg-white rounded-xl shadow-lg overflow-hidden hover:shadow-xl transition-shadow duration-300 flex flex-col">
              <div className="h-48 overflow-hidden relative">
                <img 
                  src={product.image} 
                  alt={product.name} 
                  className="w-full h-full object-cover transform hover:scale-105 transition-transform duration-500"
                />
                {!product.inStock && (
                  <div className="absolute top-0 right-0 bg-red-600 text-white text-xs font-bold px-2 py-1 m-2 rounded">
                    AGOTADO
                  </div>
                )}
              </div>
              
              <div className="p-5 flex-1 flex flex-col justify-between">
                <div>
                  <div className="flex justify-between items-start mb-2">
                    <h3 className="text-xl font-bold text-gray-800">{product.name}</h3>
                    <span className="text-lg font-bold text-orange-600">${product.price}</span>
                  </div>
                  <p className="text-gray-600 text-sm mb-4 line-clamp-2">
                    {product.description}
                  </p>
                </div>

                <button 
                  disabled={!product.inStock}
                  // AQUÍ ESTÁ EL CAMBIO IMPORTANTE:
                  onClick={() => {
                    addToCart(product);
                    showToast(`Agregaste ${product.name}`, 'success');
                  }}
                  className={`w-full py-2 rounded-lg font-bold transition-colors ${
                    product.inStock 
                      ? 'bg-orange-500 text-white hover:bg-orange-600 shadow-md active:transform active:scale-95' 
                      : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                  }`}
                >
                  {product.inStock ? 'Agregar al Pedido' : 'No Disponible'}
                </button>
              </div>
            </div>
          ))
        ) : (
          <div className="col-span-full text-center py-10 text-gray-500">
            <p className="text-xl">😢 No encontramos productos con ese nombre.</p>
            <button onClick={() => setSearchTerm('')} className="mt-2 text-orange-600 font-bold hover:underline">
              Ver todo el menú
            </button>
          </div>
        )}
      </div>
    </div>
  );
}