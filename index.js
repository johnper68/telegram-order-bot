// index.js
// Importar las librerías necesarias
const express = require('express');
const bodyParser = require('body-parser');
// const { v4: uuidv4 } = require('uuid'); // Ya no es necesario para el ID del pedido
const { twiml } = require('twilio');
const appsheet = require('./appsheet'); // Módulo para interactuar con AppSheet

// --- Configuración Inicial ---
const app = express();
app.use(bodyParser.urlencoded({ extended: false }));

// Objeto para mantener el estado de la conversación de cada usuario.
// En un entorno de producción, es recomendable usar una base de datos como Redis para persistencia.
const userSessions = {};

// --- Lógica Principal del Webhook ---
app.post('/whatsapp', async (req, res) => {
    const { MessagingResponse } = twiml;
    const twimlResponse = new MessagingResponse();
    
    const incomingMsg = req.body.Body.trim();
    const from = req.body.From; // Número del usuario en formato whatsapp:+54...

    // Obtener o inicializar la sesión del usuario
    let session = userSessions[from];
    if (!session) {
        session = initializeSession();
        userSessions[from] = session;
    }

    // --- Máquina de Estados para el Flujo de Conversación ---
    try {
        switch (session.state) {
            case 'AWAITING_START':
                if (incomingMsg.toLowerCase() === 'hola') {
                    twimlResponse.message('¡Hola! 👋 Bienvenido a nuestro servicio de pedidos. \n\nEscribe *PEDIDO* para comenzar a ordenar o *FIN* para salir.');
                    session.state = 'AWAITING_CHOICE';
                } else {
                    twimlResponse.message('Por favor, escribe *HOLA* para iniciar.');
                }
                break;

            case 'AWAITING_CHOICE':
                if (incomingMsg.toLowerCase() === 'pedido') {
                    twimlResponse.message('¡Excelente! Para comenzar, por favor, dime tu *nombre completo*.');
                    session.state = 'AWAITING_NAME';
                } else if (incomingMsg.toLowerCase() === 'fin') {
                    twimlResponse.message('Entendido. ¡Hasta la próxima!');
                    delete userSessions[from]; // Limpiar sesión
                } else {
                    twimlResponse.message('Opción no válida. Escribe *PEDIDO* para ordenar o *FIN* para salir.');
                }
                break;

            // Recolección de datos del cliente
            case 'AWAITING_NAME':
                session.order.cliente = incomingMsg;
                twimlResponse.message('Gracias. Ahora, por favor, indícame tu *dirección de entrega*.');
                session.state = 'AWAITING_ADDRESS';
                break;

            case 'AWAITING_ADDRESS':
                session.order.direccion = incomingMsg;
                twimlResponse.message('Perfecto. Por último, tu *número de celular*.');
                session.state = 'AWAITING_PHONE';
                break;

            case 'AWAITING_PHONE':
                session.order.celular = incomingMsg;
                twimlResponse.message('¡Datos guardados! \n\nAhora, dime ¿qué *producto* estás buscando?');
                session.state = 'AWAITING_PRODUCT';
                break;

            // Lógica de búsqueda y adición de productos
            case 'AWAITING_PRODUCT':
                if (incomingMsg.toLowerCase() === 'fin') {
                    await handleFinalizeOrder(session, twimlResponse);
                    delete userSessions[from]; // Finalizar y limpiar sesión
                } else {
                    await handleProductSearch(incomingMsg, session, twimlResponse);
                }
                break;
            
            case 'AWAITING_PRODUCT_CHOICE':
                const choiceIndex = parseInt(incomingMsg, 10) - 1;
                if (session.tempProductMatches && session.tempProductMatches[choiceIndex]) {
                    session.tempSelectedItem = session.tempProductMatches[choiceIndex];
                    twimlResponse.message(`Has elegido: *${session.tempSelectedItem.nombreProducto}*. \n\n¿Qué *cantidad* deseas pedir?`);
                    session.state = 'AWAITING_QUANTITY';
                } else {
                    twimlResponse.message('Selección no válida. Por favor, elige un número de la lista.');
                }
                break;

            case 'AWAITING_QUANTITY':
                const quantity = parseInt(incomingMsg, 10);
                if (isNaN(quantity) || quantity <= 0) {
                    twimlResponse.message('Por favor, introduce una cantidad válida (un número mayor que 0).');
                } else {
                    const product = session.tempSelectedItem;
                    const totalItemValue = product.valor * quantity;
                    
                    session.order.items.push({
                        nombreProducto: product.nombreProducto,
                        cantidadProducto: quantity,
                        valor_unit: product.valor,
                        valor: totalItemValue
                    });
                    session.order.total += totalItemValue;

                    let summary = `*Producto añadido:*\n- Nombre: ${product.nombreProducto}\n- Cantidad: ${quantity}\n- Valor Unit.: $${product.valor}\n- Valor Total: $${totalItemValue}`;
                    summary += `\n\n*Total actual del pedido: $${session.order.total}*`;
                    summary += `\n\nEscribe el nombre de otro producto que desees añadir, o escribe *FIN* para completar tu pedido.`;
                    
                    twimlResponse.message(summary);
                    session.state = 'AWAITING_PRODUCT';
                    session.tempSelectedItem = null;
                    session.tempProductMatches = [];
                }
                break;

            default:
                twimlResponse.message('Lo siento, ha ocurrido un error. Por favor, escribe *HOLA* para empezar de nuevo.');
                delete userSessions[from];
                break;
        }
    } catch (error) {
        console.error('Error in webhook:', error);
        twimlResponse.message('Lo siento, no pude procesar tu solicitud en este momento. Inténtalo de nuevo más tarde.');
        // Opcional: podrías querer resetear la sesión aquí también
        // delete userSessions[from];
    }
    
    // Enviar la respuesta a Twilio
    res.type('text/xml').send(twimlResponse.toString());
});

// --- Funciones Auxiliares ---

/**
 * Inicializa una nueva sesión de usuario.
 */
function initializeSession() {
    return {
        state: 'AWAITING_START',
        order: {
            // ----- INICIO DE LA MODIFICACIÓN -----
            pedidoid: Date.now().toString(), // Genera un ID numérico basado en el timestamp actual
            // ----- FIN DE LA MODIFICACIÓN -----
            cliente: '',
            direccion: '',
            celular: '',
            items: [],
            total: 0,
            fecha: new Date().toISOString().split('T')[0] // Fecha en formato YYYY-MM-DD
        },
        tempProductMatches: [],
        tempSelectedItem: null
    };
}

/**
 * Maneja la búsqueda de productos en AppSheet.
 * @param {string} productName - El nombre del producto a buscar.
 * @param {object} session - La sesión del usuario.
 * @param {object} twimlResponse - El objeto de respuesta de Twilio.
 */
async function handleProductSearch(productName, session, twimlResponse) {
    const products = await appsheet.findProducts(productName);
    
    if (!products || products.length === 0) {
        twimlResponse.message(`No encontré productos que coincidan con "*${productName}*". Por favor, intenta con otro nombre o revisa la ortografía.`);
        return;
    }

    if (products.length === 1) {
        session.tempSelectedItem = products[0];
        twimlResponse.message(`Encontré: *${products[0].nombreProducto}* (Valor: $${products[0].valor}).\n\n¿Qué *cantidad* deseas pedir?`);
        session.state = 'AWAITING_QUANTITY';
    } else {
        session.tempProductMatches = products;
        let message = 'Encontré varias coincidencias. Por favor, elige una de la lista respondiendo con el número correspondiente:\n\n';
        products.forEach((p, index) => {
            message += `*${index + 1}.* ${p.nombreProducto} - $${p.valor}\n`;
        });
        twimlResponse.message(message);
        session.state = 'AWAITING_PRODUCT_CHOICE';
    }
}

/**
 * Finaliza el pedido, lo guarda en AppSheet y envía el resumen final.
 * @param {object} session - La sesión del usuario.
 * @param {object} twimlResponse - El objeto de respuesta de Twilio.
 */
async function handleFinalizeOrder(session, twimlResponse) {
    if (session.order.items.length === 0) {
        twimlResponse.message('No has añadido ningún producto a tu pedido. Escribe *HOLA* si quieres empezar uno nuevo. ¡Hasta pronto!');
        return;
    }
    // Guardar el pedido en AppSheet
    const success = await appsheet.saveOrder(session.order);

    if (!success) {
        twimlResponse.message('Hubo un problema al registrar tu pedido. Por favor, inténtalo de nuevo en unos minutos.');
        return;
    }

    // Construir el resumen final
    let finalSummary = '*¡Pedido registrado con éxito!* 🎉\n\n';
    finalSummary += '*Resumen de tu pedido:*\n\n';
    finalSummary += `*Datos del Cliente:*\n`;
    finalSummary += `- Nombre: ${session.order.cliente}\n`;
    finalSummary += `- Dirección: ${session.order.direccion}\n`;
    finalSummary += `- Celular: ${session.order.celular}\n\n`;

    finalSummary += `*Productos:*\n`;
    session.order.items.forEach(item => {
        finalSummary += `- ${item.nombreProducto} (x${item.cantidadProducto}) - *$${item.valor}*\n`;
    });

    finalSummary += `\n*TOTAL DEL PEDIDO: $${session.order.total}*\n\n`;
    finalSummary += 'Gracias por tu compra. ¡Pronto nos pondremos en contacto contigo!';
    
    twimlResponse.message(finalSummary);
}

// --- Iniciar el Servidor ---
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server listening on port ${PORT}`);
});
