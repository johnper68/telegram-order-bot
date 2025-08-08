// appsheet.js (Corregido para asegurar el guardado de todos los productos)
const axios = require('axios');

// --- Configuración de AppSheet ---
const APPSHEET_API_URL = 'https://api.appsheet.com/api/v2';
const APP_ID = process.env.APPSHEET_APP_ID;
const ACCESS_KEY = process.env.APPSHEET_ACCESS_KEY;

if (!APP_ID || !ACCESS_KEY) {
    console.error("[FATAL STARTUP ERROR] Las variables de AppSheet (APP_ID o ACCESS_KEY) no están definidas.");
}

const apiHeaders = {
    'Content-Type': 'application/json',
    'ApplicationAccessKey': ACCESS_KEY
};

const TABLES = {
    PRODUCTS: 'Productos',
    ORDER_DETAILS: 'Pedido',
    ORDER_HEADER: 'enc_pedido'
};

async function findProducts(searchString) {
    if (!APP_ID || !ACCESS_KEY) return [];
    try {
        const response = await axios.post(
            `${APPSHEET_API_URL}/apps/${APP_ID}/tables/${TABLES.PRODUCTS}/Action`,
            { "Action": "Find", "Properties": {}, "Rows": [] },
            { headers: apiHeaders }
        );
        const lowerCaseSearch = searchString.toLowerCase();
        return response.data.filter(p => p.nombreProducto && p.nombreProducto.toLowerCase().includes(lowerCaseSearch));
    } catch (error) {
        console.error(`[ERROR APPSHEET] Falla en findProducts.`, error.response ? error.response.data : error.message);
        return [];
    }
}

async function saveOrder(orderData) {
    if (!APP_ID || !ACCESS_KEY) return false;

    // 1. Guardar detalles del pedido (todos los productos)
    try {
        // Mapea cada item del pedido al formato que AppSheet espera
        const detalleRows = orderData.items.map(item => ({
            "pedidoid": item.pedidoid,
            "fecha": new Date().toISOString(),
            "nombreProducto": item.nombreProducto,
            "cantidadProducto": item.cantidadProducto,
            "valor_unit": item.valor_unit,
            "valor": item.valor
        }));

        // Envía TODAS las filas de detalles en una sola petición
        await axios.post(
            `${APPSHEET_API_URL}/apps/${APP_ID}/tables/${TABLES.ORDER_DETAILS}/Action`,
            { "Action": "Add", "Properties": {}, "Rows": detalleRows },
            { headers: apiHeaders }
        );
        console.log(`[LOG APPSHEET] Detalles del pedido ${orderData.pedidoid} guardados. (${detalleRows.length} items)`);
    } catch (error) {
        console.error(`[ERROR APPSHEET] Falla al guardar detalles. Tabla: ${TABLES.ORDER_DETAILS}.`, error.response ? error.response.data : error.message);
        return false;
    }

    // 2. Guardar encabezado del pedido
    try {
        const encabezadoRow = [{
            "pedidoid": orderData.pedidoid,
            "enc_total": orderData.total,
            "fecha": orderData.fecha,
            "cliente": orderData.cliente,
            "direccion": orderData.direccion,
            "celular": orderData.celular
        }];
        await axios.post(
            `${APPSHEET_API_URL}/apps/${APP_ID}/tables/${TABLES.ORDER_HEADER}/Action`,
            { "Action": "Add", "Properties": {}, "Rows": encabezadoRow },
            { headers: apiHeaders }
        );
        console.log(`[LOG APPSHEET] Encabezado del pedido ${orderData.pedidoid} guardado.`);
    } catch (error) {
        console.error(`[ERROR APPSHEET] Falla al guardar encabezado. Tabla: ${TABLES.ORDER_HEADER}.`, error.response ? error.response.data : error.message);
        return false;
    }
    
    console.log(`[LOG APPSHEET] ✅ Pedido ${orderData.pedidoid} guardado exitosamente.`);
    return true;
}

module.exports = { findProducts, saveOrder };
