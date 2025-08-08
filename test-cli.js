// test-cli.js
const axios = require('axios');
const readline = require('readline');

// La URL de tu servidor local
// const API_URL = 'http://localhost:3000/whatsapp';
const API_URL = 'https://boq-twilio.onrender.com/whatsapp';

// Un número de usuario fijo para toda la sesión de prueba
const USER_NUMBER = 'whatsapp:+573001234567';

// Configura la interfaz de la consola
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

/**
 * Extrae el texto del mensaje de la respuesta TwiML.
 * @param {string} twimlResponse - La respuesta XML de tu bot.
 * @returns {string} El texto del mensaje del bot.
 */
function parseTwiml(twimlResponse) {
  // Intenta extraer el contenido de la etiqueta <Body>
  const bodyMatch = twimlResponse.match(/<Body>(.*?)<\/Body>/s);
  if (bodyMatch && bodyMatch[1]) {
    // Reemplaza saltos de línea y otros caracteres para una mejor lectura en la consola
    return bodyMatch[1].replace(/<br\s*\/?>/gi, '\n').trim();
  }

  // Si no hay <Body>, podría haber solo un <Message> con un enlace (ej. asesor)
  const messageMatch = twimlResponse.match(/<Message>(.*?)<\/Message>/s);
  if (messageMatch && messageMatch[1]) {
    return messageMatch[1].trim();
  }

  return "No se recibió una respuesta legible.";
}

/**
 * Simula una conversación de chat en la terminal.
 */
async function chat() {
  rl.question('Tú: ', async (message) => {
    if (message.toLowerCase() === 'exit') {
      rl.close();
      return;
    }

    try {
      // Prepara los datos como si vinieran de Twilio
      const response = await axios.post(
        API_URL,
        new URLSearchParams({
          From: USER_NUMBER,
          Body: message,
        })
      );

      const botResponse = parseTwiml(response.data);
      console.log(`\nBot: ${botResponse}\n`);

    } catch (error) {
      console.error('Error al conectar con el servidor local:', error.message);
    }

    // Continúa la conversación
    chat();
  });
}

console.log('--- Chat de Prueba Local ---');
console.log('Escribe tu mensaje y presiona Enter. Escribe "exit" para salir.');
console.log('Bot: ¡Hola! ¿Cómo puedo ayudarte? (simulado)\n');
chat();