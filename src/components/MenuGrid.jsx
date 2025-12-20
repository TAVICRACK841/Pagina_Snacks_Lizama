import { useState, useEffect } from 'react';
import { db } from '../firebase/config';
import { collection, getDocs, query, orderBy } from 'firebase/firestore';
import { addToCart } from '../stores/cartStore';
import { showToast } from '../stores/toastStore';
import { FaSearch, FaEdit, FaShoppingCart } from 'react-icons/fa';

// 1. IMPORTAMOS EL COMPONENTE DE PERSONALIZACIÓN
import ProductCustomizer from './ProductCustomizer';

export default function MenuGrid() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  
  // 2. ESTADO PARA CONTROLAR EL MODAL
  const [customizingProduct, setCustomizingProduct] = useState(null);

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
        console.error(error);
        showToast("Error cargando menú", 'error');
      }
      setLoading(false);
    };
    fetchProducts();
  }, []);

  const filteredProducts = products.filter(p => p.name.toLowerCase().includes(searchTerm.toLowerCase()));

  // 3. FUNCIÓN PARA MANEJAR EL CLICK
  const handleAddToCartClick = (product) => {
      if (product.allowsCustomization) {
          // Si permite personalizar, abrimos el modal
          setCustomizingProduct(product);
      } else {
          // Si es producto simple (ej. refresco), va directo al carrito
          addToCart(product);
          showToast(`¡${product.name} agregado!`, 'success');
      }
  };

  // 4. FUNCIÓN QUE SE EJECUTA AL CONFIRMAR LA PERSONALIZACIÓN
  const handleCustomizedAdd = (finalProduct) => {
      addToCart(finalProduct);
      showToast(`¡${finalProduct.name} agregado!`, 'success');
      setCustomizingProduct(null); // Cerramos el modal
  };

  if (loading) return <div className="p-20 text-center dark:text-white">Cargando...</div>;

  return (
    <div className="max-w-7xl mx-auto p-4 mb-24">
      
      {/* HEADER Y BUSCADOR (Igual que antes) */}
      <div className="mb-8 flex flex-col md:flex-row justify-between items-center gap-4 sticky top-20 bg-gray-100 dark:bg-gray-800 z-40 p-4 rounded-xl transition-colors shadow-sm dark:shadow-md border border-transparent dark:border-gray-700">
        <div>
            <h2 className="text-3xl font-bold text-gray-800 dark:text-white transition-colors">
              Nuestro <span className="text-orange-600">Menú</span>
            </h2>
            <p className="text-gray-500 dark:text-gray-400 text-sm">¡Encuentra tu antojo favorito!</p>
        </div>
        
        <div className="relative w-full md:w-96 group">
          <FaSearch className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 group-focus-within:text-orange-500 transition-colors" />
          <input 
            type="text" 
            placeholder="Buscar alitas, burgers..." 
            className="w-full pl-12 pr-4 py-3 border border-gray-300 dark:border-gray-600 rounded-full shadow-sm focus:outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-200 dark:focus:ring-orange-900 transition-all bg-white dark:bg-gray-700 text-gray-800 dark:text-white"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      {/* GRID DE PRODUCTOS */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-fade-in">
        {filteredProducts.length > 0 ? (
          filteredProducts.map((product) => (
            <div key={product.id} className="bg-white dark:bg-gray-800 rounded-2xl shadow-md overflow-hidden hover:shadow-xl transition-all duration-300 flex flex-col border border-transparent dark:border-gray-700 group">
              <div className="h-52 overflow-hidden relative bg-gray-200 dark:bg-gray-700">
                <img 
                  src={product.image || 'https://via.placeholder.com/300'} 
                  alt={product.name} 
                  className="w-full h-full object-cover transform group-hover:scale-110 transition-transform duration-500"
                />
                {!product.inStock && (
                  <div className="absolute inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center">
                    <span className="bg-red-600 text-white px-4 py-2 rounded-full font-bold text-sm uppercase tracking-wider shadow-lg transform -rotate-12">
                      ¡Agotado!
                    </span>
                  </div>
                )}
              </div>
              
              <div className="p-5 flex-1 flex flex-col justify-between relative">
                  <div className="absolute top-0 right-0 transform translate-x-2 -translate-y-1/2 bg-orange-600 text-white px-3 py-1 rounded-full font-bold shadow-sm text-sm">
                    ${product.price}
                  </div>

                <div>
                  <div className="mb-2 pt-2">
                    <span className="text-xs font-bold text-orange-600 uppercase tracking-wider">{product.category}</span>
                    <h3 className="text-xl font-bold text-gray-800 dark:text-white leading-tight">{product.name}</h3>
                  </div>
                  <p className="text-gray-600 dark:text-gray-300 text-sm mb-4 line-clamp-2">
                    {product.description}
                  </p>
                </div>

                <button 
                  disabled={!product.inStock}
                  onClick={() => handleAddToCartClick(product)} // <--- AQUÍ USAMOS LA NUEVA FUNCIÓN
                  className={`w-full py-3 rounded-xl font-bold transition-all transform active:scale-95 flex items-center justify-center gap-2 ${
                    product.inStock 
                      ? product.allowsCustomization 
                        ? 'bg-blue-600 hover:bg-blue-700 text-white shadow-md' // Color azul si es personalizable
                        : 'bg-gradient-to-r from-orange-500 to-orange-600 text-white hover:from-orange-600 hover:to-orange-700 shadow-md'
                      : 'bg-gray-200 dark:bg-gray-700 text-gray-400 dark:text-gray-500 cursor-not-allowed'
                  }`}
                >
                  {product.inStock ? (
                      product.allowsCustomization ? <><FaEdit /> Personalizar</> : 'Añadir al Carrito'
                  ) : 'No Disponible'}
                </button>
              </div>
            </div>
          ))
        ) : (
          <div className="col-span-full text-center py-20 text-gray-500 dark:text-gray-400 bg-white dark:bg-gray-800 rounded-2xl border dark:border-gray-700 shadow-sm">
            <p className="text-6xl mb-4">🤔</p>
            <p className="text-xl font-bold mb-2">No encontramos resultados</p>
            <button onClick={() => setSearchTerm('')} className="text-orange-600 dark:text-orange-500 font-bold hover:underline">
              Ver todo el menú
            </button>
          </div>
        )}
      </div>

      {/* 5. RENDERIZADO DEL MODAL (FUERA DEL LOOP) */}
      {customizingProduct && (
        <ProductCustomizer 
            product={customizingProduct}
            onClose={() => setCustomizingProduct(null)}
            onAddToCart={handleCustomizedAdd}
        />
      )}

    </div>
  );
}