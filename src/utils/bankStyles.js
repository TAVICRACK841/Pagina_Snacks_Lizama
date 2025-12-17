export const getBankStyle = (bankName) => {
    const styles = {
        'BBVA': 'bg-blue-900 text-white',
        'Nu': 'bg-purple-700 text-white',
        'Banco Azteca': 'bg-green-700 text-white',
        'Mercado Pago': 'bg-blue-500 text-white',
        'Santander': 'bg-red-600 text-white',
        'Banorte': 'bg-red-800 text-white',
        'Citibanamex': 'bg-blue-800 text-white',
        'HSBC': 'bg-red-700 text-white',
        'Scotiabank': 'bg-red-500 text-white',
        'Oxxo': 'bg-yellow-500 text-gray-900',
        'Otro': 'bg-gray-700 text-white'
    };
    return styles[bankName] || 'bg-gray-700 text-white';
};

export const BANK_OPTIONS = [
    'BBVA', 'Nu', 'Banco Azteca', 'Mercado Pago', 'Santander', 
    'Banorte', 'Citibanamex', 'HSBC', 'Scotiabank', 'Oxxo', 'Otro'
];