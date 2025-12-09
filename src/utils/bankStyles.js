// Función simple para dar color a las tarjetas según el banco
export const getBankStyle = (bankName) => {
    const styles = {
        'BBVA': 'bg-gradient-to-r from-blue-900 to-blue-700 text-white',
        'Nu': 'bg-purple-700 text-white',
        'Mercado Pago': 'bg-blue-500 text-white',
        'Banco Azteca': 'bg-green-700 text-white',
        'HSBC': 'bg-red-700 text-white',
        'Santander': 'bg-red-600 text-white',
        'Citibanamex': 'bg-blue-800 text-white',
        'Banorte': 'bg-red-800 text-white',
        'Scotiabank': 'bg-red-500 text-white',
        'Oxxo': 'bg-yellow-500 text-gray-900',
    };
    // Estilo por defecto si no coincide ninguno
    return styles[bankName] || 'bg-gray-700 text-white';
};

export const BANK_OPTIONS = [
    'BBVA', 'Nu', 'Mercado Pago', 'Banco Azteca', 'HSBC', 
    'Santander', 'Citibanamex', 'Banorte', 'Scotiabank', 'Oxxo', 'Otro'
];