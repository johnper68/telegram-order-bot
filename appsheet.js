// appsheet.js
const axios = require('axios');

// --- Configuración de AppSheet ---
// Estas variables deben estar en tu archivo .env
const APPSHEET_API_URL = 'https://api.appsheet.com/api/v2';
const APP_ID = process.env.APPSHEET_APP_ID;
const ACCESS_KEY = process.env.APPSHEET_ACCESS_KEY;

// Configuración de la cabecera para las peticiones a la API
const apiHeaders = {
    'Content-Type': 'application/json',
    'ApplicationAccessKey': ACCESS_KEY
};

/**
 * Busca productos en la tabla 'Productos' de AppSheet que contengan el texto de búsqueda.
 * @param {string} searchString - El texto a buscar en el nombre del producto.
 * @returns {Promise<Array>} - Una promesa que resuelve a un array de productos encontrados.
 */
async function findProducts(searchString) {
    const payload = {
        "Action": "Find",
        "Properties": {},
        "Rows": [] // Para "Find", Rows se deja vacío. AppSheet devuelve todas las filas.
    };

    try {
        const response = await axios.post(
            `${APPSHEET_API_URL}/apps/${APP_ID}/tables/Productos/Action`,
            payload,
            { headers: apiHeaders }
        );
        
        // La API de AppSheet 'Find' devuelve todas las filas. Filtramos aquí.
        const allProducts = response.data;
        const lowerCaseSearchString = searchString.toLowerCase();

        const matchingProducts = allProducts.filter(product => 
            product.nombreProducto && product.nombreProducto.toLowerCase().includes(lowerCaseSearchString)
        );

        return matchingProducts;

    } catch (error) {
        console.error('Error finding products in AppSheet:', error.response ? error.response.data : error.message);
        return [];
    }
}

/**
 * Guarda un pedido completo en las tablas 'enc_pedido' y 'Pedido' de AppSheet.
 * @param {object} orderData - El objeto completo del pedido.
 * @returns {Promise<boolean>} - True si el pedido se guardó con éxito, de lo contrario false.
 */
async function saveOrder(orderData) {
    // 1. Guardar el encabezado del pedido
    const encPedidoPayload = {
        "Action": "Add",
        "Properties": {
            "Locale": "es-US"
        },
        "Rows": [
            {
                "pedidoid": orderData.pedidoid,
                "enc_total": orderData.total,
                "fecha": orderData.fecha,
                "cliente": orderData.cliente,
                "direccion": orderData.direccion,
                "celular": orderData.celular
            }
        ]
    };

    try {
        await axios.post(
            `${APPSHEET_API_URL}/apps/${APP_ID}/tables/enc_pedido/Action`,
            encPedidoPayload,
            { headers: apiHeaders }
        );
    } catch (error) {
        console.error('Error saving order header to AppSheet:', error.response ? error.response.data : error.message);
        return false;
    }

    // 2. Guardar cada item del detalle del pedido
    const detallePedidoRows = orderData.items.map(item => ({
        "pedidoid": orderData.pedidoid,
        "fecha": new Date().toISOString(), // Usamos fecha y hora actual para el detalle
        "nombreProducto": item.nombreProducto,
        "cantidadProducto": item.cantidadProducto,
        "valor_unit": item.valor_unit,
        "valor": item.valor
    }));

    const detallePedidoPayload = {
        "Action": "Add",
        "Properties": {
            "Locale": "es-US"
        },
        "Rows": detallePedidoRows
    };

    try {
        await axios.post(
            `${APPSHEET_API_URL}/apps/${APP_ID}/tables/Pedido/Action`,
            detallePedidoPayload,
            { headers: apiHeaders }
        );
    } catch (error) {
        console.error('Error saving order details to AppSheet:', error.response ? error.response.data : error.message);
        // Opcional: Aquí podrías implementar lógica para eliminar el encabezado si falla el detalle.
        return false;
    }

    console.log(`Order ${orderData.pedidoid} saved successfully.`);
    return true;
}

module.exports = {
    findProducts,
    saveOrder
};