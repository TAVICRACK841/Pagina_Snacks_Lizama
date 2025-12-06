import { useState, useEffect } from 'react';
import { db } from '../firebase/config';
import { collection, getDocs, query, orderBy } from 'firebase/firestore';
import { addToCart } from '../stores/cartStore';

export default function MenuGrid() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);

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

  if (loading) {
    return (
      <div className="flex justify-center items-center h-40">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-600"></div>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 p-4">
      {products.map((product) => (
        <div key={product.id} className="bg-white rounded-xl shadow-lg overflow-hidden hover:shadow-xl transition-shadow duration-300 flex flex-col">
          <div className="h-48 overflow-hidden relative">
            <img 
              src={product.image} 
              alt={product.name} 
              className="w-full h-full object-cover"
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
              onClick={() => addToCart(product)}
              className={`w-full py-2 rounded-lg font-bold transition-colors ${
                product.inStock 
                  ? 'bg-orange-500 text-white hover:bg-orange-600' 
                  : 'bg-gray-300 text-gray-500 cursor-not-allowed'
              }`}
            >
              {product.inStock ? 'Agregar al Pedido' : 'No Disponible'}
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}