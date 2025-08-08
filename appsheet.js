// appsheet.js
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
    ORDER_HEADER: 'enc_pedido',
    FAQS: 'Precfrec'
};

/**
 * FUNCIÓN MEJORADA: Busca una respuesta en la tabla de FAQs usando concordancia de palabras clave.
 * @param {string} userQuestion - La pregunta textual del usuario.
 * @returns {Promise<string|null>} La respuesta encontrada o null si no hay una buena coincidencia.
 */
async function findFaqAnswer(userQuestion) {
    if (!APP_ID || !ACCESS_KEY) return null;
    try {
        const response = await axios.post(
            `${APPSHEET_API_URL}/apps/${APP_ID}/tables/${TABLES.FAQS}/Action`,
            { "Action": "Find", "Properties": {}, "Rows": [] },
            { headers: apiHeaders }
        );
        
        const allFaqs = response.data;

        // Palabras comunes en español a ignorar para una mejor búsqueda.
        const stopWords = new Set(['a', 'ante', 'bajo', 'con', 'contra', 'de', 'desde', 'en', 'entre', 'hacia', 'hasta', 'para', 'por', 'segun', 'sin', 'sobre', 'tras', 'y', 'o', 'u', 'el', 'la', 'los', 'las', 'un', 'una', 'unos', 'unas', 'es', 'son', 'que', 'cual', 'cuales', 'donde', 'como', 'cuando', 'quien', 'mi', 'mis', 'su', 'sus', 'q', 'k', 'd']);

        // Procesa las palabras clave de la pregunta del usuario.
        const userWords = userQuestion.toLowerCase().split(' ').filter(word => !stopWords.has(word) && word.length > 2);

        if (userWords.length === 0) return null; // No hay suficientes palabras clave para buscar.

        let bestMatch = null;
        let maxScore = 0;

        // Compara la pregunta del usuario con cada FAQ de la base de datos.
        for (const faq of allFaqs) {
            if (!faq.pregunta) continue;

            const faqWords = new Set(faq.pregunta.toLowerCase().split(' ').filter(word => !stopWords.has(word)));
            let currentScore = 0;

            for (const word of userWords) {
                if (faqWords.has(word)) {
                    currentScore++;
                }
            }

            if (currentScore > maxScore) {
                maxScore = currentScore;
                bestMatch = faq;
            }
        }

        // Se considera una coincidencia válida si al menos una palabra clave importante coincide.
        if (maxScore > 0) {
            console.log(`[LOG APPSHEET] Mejor coincidencia para "${userQuestion}" (Puntaje: ${maxScore}): "${bestMatch.pregunta}"`);
            return bestMatch.respuesta;
        }

        console.log(`[LOG APPSHEET] No se encontró una buena coincidencia para: "${userQuestion}"`);
        return null;

    } catch (error) {
        console.error(`[ERROR APPSHEET] Falla en findFaqAnswer. Tabla: ${TABLES.FAQS}.`, error.response ? `Status ${error.response.status} - ${JSON.stringify(error.response.data)}` : error.message);
        return null;
    }
}

// --- FUNCIONES DE PEDIDO (SIN CAMBIOS) ---

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
        console.error(`[ERROR APPSHEET] Falla en findProducts.`, error.message);
        return [];
    }
}

async function saveOrder(orderData) {
    if (!APP_ID || !ACCESS_KEY) return false;
    // ... (resto de la función sin cambios)
    try {
        const detalleRows = orderData.items.map(item => ({"pedidoid": item.pedidoid, "fecha": new Date().toISOString(), "nombreProducto": item.nombreProducto, "cantidadProducto": item.cantidadProducto, "valor_unit": item.valor_unit, "valor": item.valor}));
        await axios.post(`${APPSHEET_API_URL}/apps/${APP_ID}/tables/${TABLES.ORDER_DETAILS}/Action`, { "Action": "Add", "Properties": {}, "Rows": detalleRows }, { headers: apiHeaders });
    } catch (error) {
        console.error(`[ERROR APPSHEET] Falla al guardar detalles.`, error.message);
        return false;
    }
    try {
        const encabezadoRow = [{"pedidoid": orderData.pedidoid, "enc_total": orderData.total, "fecha": orderData.fecha, "cliente": orderData.cliente, "direccion": orderData.direccion, "celular": orderData.celular}];
        await axios.post(`${APPSHEET_API_URL}/apps/${APP_ID}/tables/${TABLES.ORDER_HEADER}/Action`, { "Action": "Add", "Properties": {}, "Rows": encabezadoRow }, { headers: apiHeaders });
    } catch (error) {
        console.error(`[ERROR APPSHEET] Falla al guardar encabezado.`, error.message);
        return false;
    }
    return true;
}

module.exports = { findProducts, saveOrder, findFaqAnswer };