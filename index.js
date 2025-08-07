// index.js
require('dotenv').config();
const express = require('express');
const bodyParser = require('body-parser');
const { twiml } = require('twilio');
const appsheet = require('./appsheet');

const app = express();
app.use(bodyParser.urlencoded({ extended: false }));

const userSessions = {};

app.post('/whatsapp', async (req, res) => {
    const { MessagingResponse } = twiml;
    const twimlResponse = new MessagingResponse();
    
    const incomingMsg = req.body.Body.trim();
    const from = req.body.From;

    let session = userSessions[from];
    if (!session) {
        session = initializeSession(from);
        userSessions[from] = session;
    }

    // Log principal para rastrear la conversación
    console.log(`[CONVO LOG] User: ${from} | Message: "${incomingMsg}" | State: ${session.state}`);

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
                    delete userSessions[from];
                } else {
                    twimlResponse.message('Opción no válida. Escribe *PEDIDO* para ordenar o *FIN* para salir.');
                }
                break;

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

            case 'AWAITING_PRODUCT':
                if (incomingMsg.toLowerCase() === 'fin') {
                    await handleFinalizeOrder(session, twimlResponse);
                    delete userSessions[from];
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
                        "pedidoid": session.order.pedidoid, // Añadir pedidoid a cada item
                        nombreProducto: product.nombreProducto,
                        cantidadProducto: quantity,
                        valor_unit: product.valor,
                        valor: totalItemValue
                    });
                    session.order.total += totalItemValue;

                    let summary = `*Producto añadido:*\n- Nombre: ${product.nombreProducto}\n- Cantidad: ${quantity}\n- Valor Total: $${totalItemValue}`;
                    summary += `\n\n*Total actual del pedido: $${session.order.total}*`;
                    
                    if (session.tempProductMatches.length > 1) {
                         summary += '\n\n¿Deseas añadir otra de las opciones que te mostré? Responde *SI* para ver la lista de nuevo o *NO* para buscar un producto diferente.';
                         session.state = 'AWAITING_QUANTITY_OR_OTHER_CHOICE';
                    } else {
                         summary += '\n\nEscribe el nombre de otro producto o escribe *FIN* para completar tu pedido.';
                         session.state = 'AWAITING_PRODUCT';
                         session.tempSelectedItem = null;
                         session.tempProductMatches = [];
                    }
                    twimlResponse.message(summary);
                }
                break;

            case 'AWAITING_QUANTITY_OR_OTHER_CHOICE':
                if (incomingMsg.toLowerCase() === 'si') {
                    let message = 'Aquí está la lista de nuevo. Por favor, elige una opción:\n\n';
                    session.tempProductMatches.forEach((p, index) => {
                        message += `*${index + 1}.* ${p.nombreProducto} - $${p.valor}\n`;
                    });
                    twimlResponse.message(message);
                    session.state = 'AWAITING_PRODUCT_CHOICE';
                } else if (incomingMsg.toLowerCase() === 'no') {
                    twimlResponse.message('Entendido. Escribe el nombre de otro producto o escribe *FIN* para completar tu pedido.');
                    session.state = 'AWAITING_PRODUCT';
                    session.tempSelectedItem = null;
                    session.tempProductMatches = [];
                } else {
                    twimlResponse.message('Opción no válida. Por favor, responde *SI* o *NO*.');
                }
                break;

            default:
                twimlResponse.message('Lo siento, no entendí. Escribe *HOLA* para empezar de nuevo.');
                delete userSessions[from];
                break;
        }
    } catch (error) {
        console.error('[FATAL ERROR] Error en el webhook:', error);
        twimlResponse.message('Lo siento, ocurrió un error inesperado. Inténtalo de nuevo.');
    }
    
    res.type('text/xml').send(twimlResponse.toString());
});

function initializeSession(from) {
    console.log(`[SESSION] Inicializando nueva sesión para ${from}`);
    return {
        state: 'AWAITING_START',
        order: {
            pedidoid: Date.now().toString(),
            cliente: '',
            direccion: '',
            celular: '',
            items: [],
            total: 0,
            fecha: new Date().toISOString().split('T')[0]
        },
        tempProductMatches: [],
        tempSelectedItem: null
    };
}

async function handleProductSearch(productName, session, twimlResponse) {
    console.log(`[APPSHEET CALL] Buscando productos para: "${productName}"`);
    const products = await appsheet.findProducts(productName);
    
    if (!products || products.length === 0) {
        twimlResponse.message(`No encontré productos que coincidan con "*${productName}*". Intenta con otro nombre.`);
        return;
    }

    if (products.length === 1) {
        session.tempSelectedItem = products[0];
        twimlResponse.message(`Encontré: *${products[0].nombreProducto}* (Valor: $${products[0].valor}).\n\n¿Qué *cantidad* deseas pedir?`);
        session.state = 'AWAITING_QUANTITY';
    } else {
        session.tempProductMatches = products;
        let message = 'Encontré varias coincidencias. Elige un número de la lista:\n\n';
        products.forEach((p, index) => {
            message += `*${index + 1}.* ${p.nombreProducto} - $${p.valor}\n`;
        });
        twimlResponse.message(message);
        session.state = 'AWAITING_PRODUCT_CHOICE';
    }
}

async function handleFinalizeOrder(session, twimlResponse) {
    if (session.order.items.length === 0) {
        twimlResponse.message('No has añadido ningún producto. Escribe *HOLA* para empezar. ¡Hasta pronto!');
        return;
    }
    console.log(`[APPSHEET CALL] Guardando pedido: ${session.order.pedidoid}`);
    const success = await appsheet.saveOrder(session.order);

    if (!success) {
        twimlResponse.message('Hubo un problema al registrar tu pedido. Por favor, contacta a soporte.');
        return;
    }

    let finalSummary = `*¡Pedido registrado con éxito!* 🎉\n\n*Resumen:*\n- Cliente: ${session.order.cliente}\n- Dirección: ${session.order.direccion}\n`;
    finalSummary += `*Productos:*\n`;
    session.order.items.forEach(item => {
        finalSummary += `- ${item.nombreProducto} (x${item.cantidadProducto})\n`;
    });
    finalSummary += `\n*TOTAL: $${session.order.total}*\n\nGracias por tu compra.`;
    
    twimlResponse.message(finalSummary);
}

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Servidor escuchando en el puerto ${PORT}`);
});