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

// Función para introducir una pequeña pausa
const delay = ms => new Promise(resolve => setTimeout(resolve, ms));

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

    // 1. Guardar detalles del pedido (uno por uno para máxima fiabilidad)
    for (const item of orderData.items) {
        try {
            const detalleRow = [{
                "pedidoid": item.pedidoid,
                "fecha": new Date().toISOString(),
                "nombreProducto": item.nombreProducto,
                "cantidadProducto": item.cantidadProducto,
                "valor_unit": item.valor_unit,
                "valor": item.valor
            }];

            console.log(`[LOG APPSHEET] Guardando item: ${item.nombreProducto}`);
            await axios.post(
                `${APPSHEET_API_URL}/apps/${APP_ID}/tables/${TABLES.ORDER_DETAILS}/Action`,
                { "Action": "Add", "Properties": { "Locale": "es-US" }, "Rows": detalleRow },
                { headers: apiHeaders }
            );
            // Pequeña pausa para no saturar la API de AppSheet
            await delay(200); 
        } catch (error) {
            console.error(`[ERROR APPSHEET] Falla al guardar el item "${item.nombreProducto}".`, error.response ? JSON.stringify(error.response.data) : error.message);
            // Si un item falla, detenemos el proceso para evitar pedidos incompletos.
            return false;
        }
    }
    console.log(`[LOG APPSHEET] Todos los ${orderData.items.length} items del pedido ${orderData.pedidoid} han sido guardados.`);

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
            { "Action": "Add", "Properties": { "Locale": "es-US" }, "Rows": encabezadoRow },
            { headers: apiHeaders }
        );
        console.log(`[LOG APPSHEET] Encabezado del pedido ${orderData.pedidoid} guardado.`);
    } catch (error) {
        console.error(`[ERROR APPSHEET] Falla al guardar encabezado.`, error.response ? JSON.stringify(error.response.data) : error.message);
        return false;
    }
    
    console.log(`[LOG APPSHEET] ✅ Pedido ${orderData.pedidoid} completado y guardado exitosamente.`);
    return true;
}

module.exports = { findProducts, saveOrder };
