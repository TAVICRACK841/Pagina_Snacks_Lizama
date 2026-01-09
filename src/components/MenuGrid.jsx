import { useState, useEffect } from 'react';
import { db } from '../firebase/config';
import { collection, getDocs, query, orderBy } from 'firebase/firestore';
import { addToCart } from '../stores/cartStore';
import { showToast } from '../stores/toastStore';
import { FaSearch, FaShoppingCart } from 'react-icons/fa';
import ProductCustomizer from './ProductCustomizer';

export default function MenuGrid() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  
  const [customizingProduct, setCustomizingProduct] = useState(null);

  useEffect(() => {
    const fetchProducts = async () => {
      try {
        const q = query(collection(db, "products"), orderBy("createdAt", "desc"));
        const querySnapshot = await getDocs(q);
        setProducts(querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      } catch (error) { console.error(error); showToast("Error cargando menú", 'error'); }
      setLoading(false);
    };
    fetchProducts();
  }, []);

  const filteredProducts = products.filter(p => p.name.toLowerCase().includes(searchTerm.toLowerCase()));

  const handleProductAction = (product) => {
      const c = product.category ? product.category.toLowerCase() : '';
      const complexCategories = [
          'alitas', 'media alitas', 'boneless', 'media boneless',
          'tiras', 'media tiras', 'pasta con alitas', 'media pasta con alitas',
          'pasta con boneless', 'media pasta con boneless', 'pasta con tiras', 'media pasta con tiras',
          'box familiar', 'mini box', 'hamburguesas', 'perros calientes'
      ];

      const needsCustomization = product.allowsCustomization || complexCategories.some(cat => c.includes(cat));

      if (needsCustomization) {
          setCustomizingProduct(product); 
      } else {
          addToCart(product); 
          showToast(`¡${product.name} agregado!`, 'success');
      }
  };

  const handleAddToCartFromModal = (customizedProduct) => {
      addToCart(customizedProduct);
      setCustomizingProduct(null);
      showToast('¡Agregado al pedido!', 'success');
  };

  if (loading) return <div className="p-20 text-center dark:text-white animate-pulse font-bold text-xl">Cargando delicias...</div>;

  return (
    <div className="max-w-7xl mx-auto p-4 mb-24">
      
      {/* BARRA DE BÚSQUEDA */}
      <div className="mb-8 flex flex-col md:flex-row justify-between items-center gap-4 sticky top-20 bg-white/80 dark:bg-zinc-800/90 backdrop-blur-md z-40 p-4 rounded-2xl shadow-sm border border-gray-100 dark:border-zinc-700">
        <div className="w-full md:w-auto text-center md:text-left">
            {/* TEXTO NARANJA CAMBIADO A AMARILLO */}
            <h2 className="text-3xl font-extrabold text-gray-800 dark:text-white tracking-tight">Nuestro <span className="text-yellow-500">Menú</span></h2>
            <p className="text-gray-500 dark:text-gray-400 text-sm">¡Encuentra tu antojo favorito!</p>
        </div>
        <div className="relative w-full md:w-96 group">
            <FaSearch className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 group-focus-within:text-yellow-500 transition-colors" />
            <input 
                type="text" 
                placeholder="Buscar..." 
                /* Focus ring cambiado a amarillo */
                className="w-full pl-12 pr-4 py-3 border border-gray-200 dark:border-zinc-600 rounded-xl shadow-inner focus:outline-none focus:ring-2 focus:ring-yellow-500 bg-gray-50 dark:bg-zinc-700 text-gray-800 dark:text-white transition-all" 
                value={searchTerm} 
                onChange={(e) => setSearchTerm(e.target.value)} 
            />
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 animate-fade-in">
        {filteredProducts.map((product) => (
            <div key={product.id} className="bg-white dark:bg-zinc-800 rounded-2xl shadow-lg overflow-hidden hover:shadow-2xl transition-all duration-300 flex flex-col border border-gray-100 dark:border-zinc-700 group transform hover:-translate-y-1">
              <div className="h-52 overflow-hidden relative bg-gray-100 dark:bg-zinc-700">
                  <img src={product.image || 'https://via.placeholder.com/300'} alt={product.name} className="w-full h-full object-cover transform group-hover:scale-110 transition-transform duration-700" />
                  {!product.inStock && <div className="absolute inset-0 bg-black/60 backdrop-blur-[2px] flex items-center justify-center z-10"><span className="bg-red-600 text-white px-4 py-2 rounded-full font-bold text-sm uppercase tracking-wider shadow-lg transform -rotate-12 border-2 border-white">¡Agotado!</span></div>}
                  <div className="absolute top-3 right-3 bg-white/90 dark:bg-zinc-900/90 backdrop-blur text-gray-900 dark:text-white px-3 py-1 rounded-lg font-black shadow-lg text-lg border border-gray-200 dark:border-zinc-600">${product.price}</div>
              </div>
              <div className="p-5 flex-1 flex flex-col justify-between">
                <div>
                    <div className="mb-2">
                        {/* BADGE DE CATEGORÍA CAMBIADO A AMARILLO */}
                        <span className="inline-block px-2 py-0.5 rounded-md bg-yellow-100 dark:bg-yellow-900/30 text-[10px] font-bold text-yellow-700 dark:text-yellow-400 uppercase tracking-wider mb-1">{product.category}</span>
                        <h3 className="text-xl font-bold text-gray-800 dark:text-white leading-tight mb-2">{product.name}</h3>
                    </div>
                    <p className="text-gray-600 dark:text-gray-400 text-sm mb-4 line-clamp-2 leading-relaxed">{product.description || "Delicioso y preparado al momento."}</p>
                </div>
                
                {/* BOTÓN AGREGAR CAMBIADO A AMARILLO */}
                <button 
                    disabled={!product.inStock} 
                    onClick={() => handleProductAction(product)} 
                    className={`w-full py-3 rounded-xl font-bold transition-all transform active:scale-95 flex items-center justify-center gap-2 shadow-md ${
                        product.inStock 
                        ? 'bg-yellow-500 text-white hover:bg-yellow-600 shadow-yellow-500/20' 
                        : 'bg-gray-200 dark:bg-zinc-700 text-gray-400 cursor-not-allowed'
                    }`}
                >
                    {product.inStock ? <><FaShoppingCart /> Agregar</> : 'No Disponible'}
                </button>
              </div>
            </div>
        ))}
      </div>

      {customizingProduct && <ProductCustomizer product={customizingProduct} onClose={() => setCustomizingProduct(null)} onAddToCart={handleAddToCartFromModal} />}
    </div>
  );
}