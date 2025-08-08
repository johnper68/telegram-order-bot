// appsheet.js
const axios = require('axios');

// --- Configuración de AppSheet ---
const APPSHEET_API_URL = 'https://api.appsheet.com/api/v2';
const APP_ID = process.env.APPSHEET_APP_ID;
const ACCESS_KEY = process.env.APPSHEET_ACCESS_KEY;

// Verifica que las variables de entorno cruciales estén cargadas.
if (!APP_ID || !ACCESS_KEY) {
    console.error("[FATAL STARTUP ERROR] Las variables de AppSheet (APP_ID o ACCESS_KEY) no están definidas. Revisa tu archivo .env o la configuración del entorno en producción.");
}

const apiHeaders = {
    'Content-Type': 'application/json',
    'ApplicationAccessKey': ACCESS_KEY
};

const TABLES = {
    PRODUCTS: 'Productos',
    ORDER_DETAILS: 'Pedido',
    ORDER_HEADER: 'enc_pedido',
    FAQS: 'Precfrec' // Nueva tabla de preguntas frecuentes
};

/**
 * NUEVA FUNCIÓN: Busca una respuesta en la tabla de preguntas frecuentes.
 * @param {string} userQuestion - La pregunta textual del usuario.
 * @returns {Promise<string|null>} La respuesta encontrada o null si no hay coincidencia.
 */
async function findFaqAnswer(userQuestion) {
    if (!APP_ID || !ACCESS_KEY) return null;
    try {
        const response = await axios.post(
            `${APPSHEET_API_URL}/apps/${APP_ID}/tables/${TABLES.FAQS}/Action`,
            { "Action": "Find", "Properties": {}, "Rows": [] },
            { headers: apiHeaders }
        );
        
        const lowerCaseQuestion = userQuestion.toLowerCase();
        // Busca una fila donde el campo 'pregunta' (en minúsculas) incluya el texto del usuario.
        const foundFaq = response.data.find(faq => 
            faq.pregunta && faq.pregunta.toLowerCase().includes(lowerCaseQuestion)
        );

        if (foundFaq && foundFaq.respuesta) {
            console.log(`[LOG APPSHEET] Respuesta encontrada para: "${userQuestion}"`);
            return foundFaq.respuesta;
        } else {
            console.log(`[LOG APPSHEET] No se encontró respuesta para: "${userQuestion}"`);
            return null;
        }
    } catch (error) {
        console.error(`[ERROR APPSHEET] Falla en findFaqAnswer. Tabla: ${TABLES.FAQS}.`, error.response ? `Status ${error.response.status} - ${JSON.stringify(error.response.data)}` : error.message);
        return null; // Devuelve null en caso de error para que el bot pueda manejarlo.
    }
}


// --- FUNCIONES EXISTENTES (SIN CAMBIOS) ---

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
        console.error(`[ERROR APPSHEET] Falla en findProducts. Tabla: ${TABLES.PRODUCTS}.`, error.response ? `Status ${error.response.status} - ${JSON.stringify(error.response.data)}` : error.message);
        return [];
    }
}

async function saveOrder(orderData) {
    if (!APP_ID || !ACCESS_KEY) return false;

    // Guardar detalles del pedido
    try {
        const detalleRows = orderData.items.map(item => ({
            "pedidoid": item.pedidoid,
            "fecha": new Date().toISOString(),
            "nombreProducto": item.nombreProducto,
            "cantidadProducto": item.cantidadProducto,
            "valor_unit": item.valor_unit,
            "valor": item.valor
        }));
        await axios.post(
            `${APPSHEET_API_URL}/apps/${APP_ID}/tables/${TABLES.ORDER_DETAILS}/Action`,
            { "Action": "Add", "Properties": {}, "Rows": detalleRows },
            { headers: apiHeaders }
        );
        console.log(`[LOG APPSHEET] Detalles del pedido ${orderData.pedidoid} guardados.`);
    } catch (error) {
        console.error(`[ERROR APPSHEET] Falla al guardar detalles. Tabla: ${TABLES.ORDER_DETAILS}.`, error.response ? `Status ${error.response.status} - ${JSON.stringify(error.response.data)}` : error.message);
        return false;
    }

    // Guardar encabezado del pedido
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
        console.error(`[ERROR APPSHEET] Falla al guardar encabezado. Tabla: ${TABLES.ORDER_HEADER}.`, error.response ? `Status ${error.response.status} - ${JSON.stringify(error.response.data)}` : error.message);
        return false;
    }
    
    console.log(`[LOG APPSHEET] ✅ Pedido ${orderData.pedidoid} guardado exitosamente.`);
    return true;
}

// Exporta la nueva función junto con las existentes.
module.exports = { findProducts, saveOrder, findFaqAnswer };