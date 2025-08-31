// appsheet.js (MODIFICADO para búsqueda sin tildes)
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

/**
 * Normaliza un texto: lo convierte a minúsculas y le quita las tildes.
 * @param {string} str El texto a normalizar.
 * @returns {string} El texto normalizado.
 */
function normalizeText(str) {
    if (!str) return "";
    return str
        .normalize("NFD") // Separa las tildes de las letras (e.g., "á" -> "a" + "´")
        .replace(/[\u0300-\u036f]/g, "") // Elimina los caracteres de tildes
        .toLowerCase(); // Convierte todo a minúsculas
}

async function findProducts(searchString) {
    if (!APP_ID || !ACCESS_KEY) return [];
    try {
        const response = await axios.post(
            `${APPSHEET_API_URL}/apps/${APP_ID}/tables/${TABLES.PRODUCTS}/Action`,
            { "Action": "Find", "Properties": {}, "Rows": [] },
            { headers: apiHeaders }
        );

        // ✅ **AQUÍ ESTÁ LA MAGIA**
        // Normalizamos el término de búsqueda del usuario una sola vez.
        const normalizedSearch = normalizeText(searchString);

        // Filtramos los productos comparando sus nombres también normalizados.
        return response.data.filter(p => {
            const normalizedProductName = normalizeText(p.nombreProducto);
            return normalizedProductName.includes(normalizedSearch);
        });

    } catch (error) {
        console.error(`[ERROR APPSHEET] Falla en findProducts.`, error.response ? error.response.data : error.message);
        return [];
    }
}

async function saveOrder(orderData) {
    if (!APP_ID || !ACCESS_KEY) return false;

    // 1. Guardar encabezado del pedido (PRIMERO)
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
            { "Action": "Add", "Properties": { "Locale": "es-US" }, "Rows": encabezadoRow },
            { headers: apiHeaders }
        );
        console.log(`[LOG APPSHEET] Encabezado del pedido ${orderData.pedidoid} guardado.`);
    } catch (error) {
        console.error(`[ERROR APPSHEET] Falla al guardar encabezado. Tabla: ${TABLES.ORDER_HEADER}.`, error.response ? JSON.stringify(error.response.data) : error.message);
        return false; // Si el encabezado falla, no continuamos.
    }

    // 2. Guardar detalles del pedido (DESPUÉS)
    try {
        const detalleRows = orderData.items.map(item => ({
            "pedidoid": item.pedidoid,
            "fecha": new Date().toISOString(),
            "nombreProducto": item.nombreProducto,
            "cantidadProducto": item.cantidadProducto,
            "valor_unit": item.valor_unit,
            "valor": item.valor
        }));

        console.log(`[LOG APPSHEET] Intentando guardar ${detalleRows.length} items para el pedido ${orderData.pedidoid}`);
        
        await axios.post(
            `${APPSHEET_API_URL}/apps/${APP_ID}/tables/${TABLES.ORDER_DETAILS}/Action`,
            { "Action": "Add", "Properties": { "Locale": "es-US" }, "Rows": detalleRows },
            { headers: apiHeaders }
        );
        console.log(`[LOG APPSHEET] Detalles del pedido ${orderData.pedidoid} guardados.`);
    } catch (error) {
        console.error(`[ERROR APPSHEET] Falla al guardar detalles. Tabla: ${TABLES.ORDER_DETAILS}.`, error.response ? JSON.stringify(error.response.data) : error.message);
        // Aunque los detalles fallen, el encabezado ya se creó. Podrías implementar una lógica para borrarlo si es necesario.
        return false;
    }
    
    console.log(`[LOG APPSHEET] ✅ Pedido ${orderData.pedidoid} guardado exitosamente.`);
    return true;
}

module.exports = { findProducts, saveOrder };