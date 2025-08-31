require('dotenv').config();
const TelegramBot = require('node-telegram-bot-api');
const appsheet = require('./appsheet');

// --- Configuración del Bot ---
const token = process.env.TELEGRAM_BOT_TOKEN;
if (!token) {
    console.error("[FATAL STARTUP ERROR] No se proporcionó el TELEGRAM_BOT_TOKEN en el archivo .env.");
    process.exit(1);
}
const bot = new TelegramBot(token, { polling: true });

const userSessions = {};

// --- Listener Principal de Mensajes ---
bot.on('message', async (msg) => {
    const chatId = msg.chat.id;
    const incomingMsg = msg.text || '';

    let session = userSessions[chatId];
    if (!session) {
        session = initializeSession(chatId);
        userSessions[chatId] = session;
    }
    
    // Ignorar mensajes que no son de texto
    if (!msg.text) {
        bot.sendMessage(chatId, "Por favor, envíame solo mensajes de texto.");
        return;
    }

    const normalizedInput = incomingMsg.toLowerCase();
    console.log(`[CONVO LOG] User: ${chatId} | Message: "${incomingMsg}" | State: ${session.state}`);

    try {
        if (normalizedInput === '/start' || (normalizedInput === 'menu' && session.state !== 'AWAITING_START')) {
            sendWelcomeMenu(chatId);
            session.state = 'AWAITING_MAIN_MENU_SELECTION';
            return;
        }

        switch (session.state) {
            case 'AWAITING_START':
                sendWelcomeMenu(chatId);
                session.state = 'AWAITING_MAIN_MENU_SELECTION';
                break;

            case 'AWAITING_MAIN_MENU_SELECTION':
                await handleMainMenuSelection(normalizedInput, session, chatId);
                break;

            case 'AWAITING_NAME':
                session.order.cliente = incomingMsg;
                bot.sendMessage(chatId, 'Gracias. Ahora, por favor, indícame tu *dirección de entrega*.', { parse_mode: 'Markdown' });
                session.state = 'AWAITING_ADDRESS';
                break;

            case 'AWAITING_ADDRESS':
                session.order.direccion = incomingMsg;
                bot.sendMessage(chatId, 'Perfecto. Por último, tu *número de celular*.', { parse_mode: 'Markdown' });
                session.state = 'AWAITING_PHONE';
                break;

            case 'AWAITING_PHONE':
                session.order.celular = incomingMsg;
                bot.sendMessage(chatId, '¡Datos guardados! \n\nAhora, dime ¿qué *producto* estás buscando?', { parse_mode: 'Markdown' });
                session.state = 'AWAITING_PRODUCT';
                break;

            case 'AWAITING_PRODUCT':
                if (normalizedInput === 'fin' || normalizedInput === 'finalizar') {
                    await handleFinalizeOrder(session, chatId);
                } else {
                    await handleProductSearch(incomingMsg, session, chatId);
                }
                break;
            
            case 'AWAITING_PRODUCT_CHOICE':
                await handleProductChoice(incomingMsg, session, chatId);
                break;

            case 'AWAITING_QUANTITY':
                await handleQuantity(incomingMsg, session, chatId);
                break;

            case 'AWAITING_ANOTHER_FROM_LIST':
                if (normalizedInput === 'si') {
                    let message = 'Perfecto. Aquí está la lista de nuevo. Por favor, elige un número:\n\n';
                    session.tempProductMatches.forEach((p, index) => {
                        message += `*${index + 1}.* ${p.nombreProducto} - $${p.valor}\n`;
                    });
                    bot.sendMessage(chatId, message, { parse_mode: 'Markdown' });
                    session.state = 'AWAITING_PRODUCT_CHOICE';
                } else if (normalizedInput === 'no') {
                    session.tempProductMatches = [];
                    bot.sendMessage(chatId, 'Entendido. Escribe el nombre de otro producto que desees buscar, o escribe *FIN* para completar tu pedido.', { parse_mode: 'Markdown' });
                    session.state = 'AWAITING_PRODUCT';
                } else {
                    bot.sendMessage(chatId, 'Por favor, responde solo *SI* o *NO*.');
                }
                break;

            default:
                bot.sendMessage(chatId, 'Parece que nos perdimos un poco. No te preocupes, empecemos de nuevo. Escribe /start para ver las opciones.');
                delete userSessions[chatId];
                break;
        }
    } catch (error) {
        console.error('[FATAL ERROR] Error en el bot:', error);
        bot.sendMessage(chatId, 'Lo siento, ocurrió un error inesperado. Por favor, intenta de nuevo en un momento.');
        delete userSessions[chatId];
    }
});


// --- Funciones Auxiliares ---

function initializeSession(chatId) {
    console.log(`[SESSION] Inicializando nueva sesión para ${chatId}`);
    return {
        chatId: chatId,
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

function sendWelcomeMenu(chatId) {
    const message = `¡Hola! 😄 Te damos una cordial bienvenida a *Occiquimicos*.\n\nEstoy aquí para ayudarte. ¿Qué te gustaría hacer hoy?\n\n*1.* 🛍️ Realizar un pedido\n*2.* 🧑‍💼 Hablar con un asesor\n\nPor favor, responde con el *número* de la opción que elijas.`;
    bot.sendMessage(chatId, message, { parse_mode: 'Markdown' });
}

async function handleMainMenuSelection(selection, session, chatId) {
    switch (selection) {
        case '1':
            bot.sendMessage(chatId, '¡Excelente! Iniciemos con tu pedido. Para comenzar, por favor, dime tu *nombre completo*.', { parse_mode: 'Markdown' });
            session.state = 'AWAITING_NAME';
            break;
        case '2':
            const asesorUsername = process.env.TELEGRAM_ASESOR_USERNAME;
            if (asesorUsername) {
                const link = `https://t.me/${asesorUsername}`;
                bot.sendMessage(chatId, `Con gusto. Para hablar directamente con un asesor, por favor haz clic en el siguiente enlace:\n\n${link}\n\nSerás redirigido a su chat. ¡Que tengas un buen día!`);
            } else {
                bot.sendMessage(chatId, 'Lo siento, no tenemos un asesor disponible en este momento. Por favor, intenta más tarde.');
            }
            delete userSessions[chatId];
            break;
        default:
            bot.sendMessage(chatId, 'Opción no válida. Por favor, elige un número del *1 al 2*.', { parse_mode: 'Markdown' });
            break;
    }
}

async function handleProductSearch(productName, session, chatId) {
    session.tempProductMatches = [];
    const products = await appsheet.findProducts(productName);

    if (!products || products.length === 0) {
        bot.sendMessage(chatId, `No encontré productos que coincidan con "*${productName}*". Intenta con otro nombre o escribe *FIN* para cerrar el pedido.`, { parse_mode: 'Markdown' });
        return;
    }
    if (products.length === 1) {
        session.tempSelectedItem = products[0];
        bot.sendMessage(chatId, `Encontré: *${products[0].nombreProducto}* (Valor: $${products[0].valor}).\n\n¿Qué *cantidad* deseas pedir?`, { parse_mode: 'Markdown' });
        session.state = 'AWAITING_QUANTITY';
    } else {
        session.tempProductMatches = products;
        let message = 'Encontré varias coincidencias. Por favor, elige un número de la lista:\n\n';
        products.forEach((p, index) => {
            message += `*${index + 1}.* ${p.nombreProducto} - $${p.valor}\n`;
        });
        bot.sendMessage(chatId, message, { parse_mode: 'Markdown' });
        session.state = 'AWAITING_PRODUCT_CHOICE';
    }
}

async function handleProductChoice(choice, session, chatId) {
    const choiceIndex = parseInt(choice, 10) - 1;
    if (session.tempProductMatches && session.tempProductMatches[choiceIndex]) {
        session.tempSelectedItem = session.tempProductMatches[choiceIndex];
        bot.sendMessage(chatId, `Has elegido: *${session.tempSelectedItem.nombreProducto}*. \n\nAhora, dime ¿qué *cantidad* deseas?`, { parse_mode: 'Markdown' });
        session.state = 'AWAITING_QUANTITY';
    } else {
        bot.sendMessage(chatId, 'Selección no válida. Por favor, elige un número de la lista que te mostré.');
    }
}

async function handleQuantity(quantityStr, session, chatId) {
    const quantity = parseInt(quantityStr, 10);
    if (isNaN(quantity) || quantity <= 0) {
        bot.sendMessage(chatId, 'Por favor, introduce una cantidad válida (un número mayor que 0).');
        return;
    }
    const product = session.tempSelectedItem;
    const totalItemValue = product.valor * quantity;
    
    session.order.items.push({
        "pedidoid": session.order.pedidoid,
        nombreProducto: product.nombreProducto,
        cantidadProducto: quantity,
        valor_unit: product.valor,
        valor: totalItemValue
    });
    session.order.total += totalItemValue;

    let summary = `*Producto añadido:* ✅\n- ${product.nombreProducto} (x${quantity})\n\n*Total actual del pedido: $${session.order.total}*`;

    if (session.tempProductMatches.length > 1) {
        summary += `\n\n¿Deseas añadir otro producto de esta lista? Responde *SI* o *NO*.`;
        session.state = 'AWAITING_ANOTHER_FROM_LIST';
    } else {
        summary += `\n\nEscribe el nombre de *otro producto* para añadirlo, o escribe *FIN* para completar y guardar tu pedido.`;
        session.state = 'AWAITING_PRODUCT';
    }
    
    bot.sendMessage(chatId, summary, { parse_mode: 'Markdown' });
    session.tempSelectedItem = null;
}

async function handleFinalizeOrder(session, chatId) {
    if (session.order.items.length === 0) {
        bot.sendMessage(chatId, 'No has añadido ningún producto. Tu pedido ha sido cancelado. Escribe /start para empezar de nuevo.');
        delete userSessions[chatId];
        return;
    }
    
    const success = await appsheet.saveOrder(session.order);
    if (!success) {
        bot.sendMessage(chatId, 'Hubo un problema al registrar tu pedido. Por favor, contacta a un asesor.');
        delete userSessions[chatId];
        return;
    }

    let finalSummary = `*¡Pedido registrado con éxito!* 🎉\n\n*Resumen de tu compra:*\n\n`;
    finalSummary += `*Cliente:* ${session.order.cliente}\n`;
    finalSummary += `*Dirección:* ${session.order.direccion}\n`;
    finalSummary += `*Celular:* ${session.order.celular}\n\n`;
    finalSummary += `*Productos:*\n`;
    session.order.items.forEach(item => {
        finalSummary += `- ${item.nombreProducto} (x${item.cantidadProducto}) = $${item.valor}\n`;
    });
    finalSummary += `\n*TOTAL A PAGAR: $${session.order.total}*\n\n`;
    finalSummary += `Gracias por tu compra. En breve nos pondremos en contacto contigo para coordinar el pago y la entrega.`;
    
    bot.sendMessage(chatId, finalSummary, { parse_mode: 'Markdown' });
    delete userSessions[chatId];
}

console.log('Bot de Telegram iniciado y esperando mensajes...');
