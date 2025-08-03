// appsheet.js (Modificado)
const axios = require('axios');

// --- Configuración de AppSheet ---
const APPSHEET_API_URL = 'https://api.appsheet.com/api/v2';
const APP_ID = process.env.APPSHEET_APP_ID;
const ACCESS_KEY = process.env.APPSHEET_ACCESS_KEY;

// Configuración de la cabecera para las peticiones a la API
const apiHeaders = {
    'Content-Type': 'application/json',
    'ApplicationAccessKey': ACCESS_KEY
};

/**
 * Busca productos en la tabla 'Productos' de AppSheet.
 * (Esta función no ha sido modificada)
 */
async function findProducts(searchString) {
    const payload = {
        "Action": "Find",
        "Properties": {},
        "Rows": []
    };

    try {
        const response = await axios.post(
            `${APPSHEET_API_URL}/apps/${APP_ID}/tables/Productos/Action`,
            payload,
            { headers: apiHeaders }
        );
        
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
 * Guarda un pedido completo, registrando primero los detalles y luego el encabezado.
 * @param {object} orderData - El objeto completo del pedido.
 * @returns {Promise<boolean>} - True si el pedido se guardó con éxito, de lo contrario false.
 */
async function saveOrder(orderData) {
    // --- MODIFICACIÓN ---
    // Paso 1 (NUEVO): Guardar cada item del detalle del pedido en la tabla 'Pedido'.
    const detallePedidoRows = orderData.items.map(item => ({
        "pedidoid": orderData.pedidoid,
        "fecha": new Date().toISOString(),
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
        console.log(`Detalles del pedido ${orderData.pedidoid} guardados exitosamente.`);
    } catch (error) {
        console.error('Error al guardar los detalles del pedido en AppSheet:', error.response ? error.response.data : error.message);
        return false; // Si fallan los detalles, no continuamos.
    }

    // Paso 2 (NUEVO): Guardar el encabezado del pedido en la tabla 'enc_pedido'.
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
        console.log(`Encabezado del pedido ${orderData.pedidoid} guardado exitosamente.`);
    } catch (error) {
        console.error('Error al guardar el encabezado del pedido en AppSheet:', error.response ? error.response.data : error.message);
        // Nota: En este punto, los detalles ya fueron guardados en AppSheet.
        // Se podría implementar lógica adicional para borrarlos si el encabezado falla.
        return false;
    }

    console.log(`✅ Pedido ${orderData.pedidoid} completado y guardado exitosamente.`);
    return true;
}

module.exports = {
    findProducts,
    saveOrder
};


