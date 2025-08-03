\# Bot de Pedidos para WhatsApp con Twilio, Render y AppSheet

\# Bot de Pedidos para WhatsApp con Twilio, Render y AppSheet



Este proyecto implementa un bot de chat para WhatsApp que permite a los usuarios realizar pedidos. El bot está construido con Node.js y Express, utiliza la API de Twilio para comunicarse a través de WhatsApp y usa AppSheet como base de datos para gestionar productos y pedidos. Está diseñado para ser desplegado fácilmente en la plataforma de hosting Render.



\## Características



\- \*\*Flujo de Conversación Guiado\*\*: El bot guía al usuario desde el saludo inicial hasta la finalización del pedido.

\- \*\*Recopilación de Datos del Cliente\*\*: Solicita y almacena el nombre, dirección y celular del cliente.

\- \*\*Búsqueda de Productos\*\*: Busca productos en una tabla de AppSheet.

\- \*\*Manejo de Múltiples Coincidencias\*\*: Si la búsqueda arroja varios resultados, le permite al usuario elegir el correcto.

\- \*\*Carrito de Compras\*\*: Los usuarios pueden añadir múltiples productos a un solo pedido.

\- \*\*Resumen de Pedido\*\*: Muestra un resumen detallado antes de finalizar y al confirmar el pedido.

\- \*\*Persistencia de Datos\*\*: Guarda toda la información del pedido en tablas de AppSheet.



\## Arquitectura



1\.  \*\*WhatsApp\*\*: Interfaz de usuario final.

2\.  \*\*Twilio\*\*: Actúa como pasarela, conectando WhatsApp con nuestra aplicación.

3\.  \*\*Render\*\*: Plataforma de hosting donde se ejecuta nuestra aplicación Node.js.

4\.  \*\*Node.js / Express\*\*: El backend que contiene toda la lógica del bot.

5\.  \*\*AppSheet\*\*: La base de datos donde se almacenan los productos y se registran los pedidos.



---



\## 📋 Requisitos Previos



Antes de comenzar, asegúrate de tener cuentas en los siguientes servicios:



1\.  \*\*Node.js\*\*: Instalado en tu máquina local (v16 o superior).

2\.  \*\*Cuenta de Twilio\*\*: Con un número de teléfono habilitado para WhatsApp o con el Sandbox de WhatsApp configurado.

3\.  \*\*Cuenta de AppSheet\*\*: Donde crearás tu aplicación y tus tablas.

4\.  \*\*Cuenta de Render\*\*: Para desplegar la aplicación.

5\.  \*\*Git\*\*: Para clonar el repositorio y desplegar en Render.



---



\## 🛠️ Paso 1: Configuración de AppSheet



Tu base de datos vivirá en AppSheet. Debes crear una aplicación y configurar las tablas y la API.



\### 1.1. Crear las Tablas



Crea una nueva aplicación en AppSheet y añade las siguientes tres tablas. Puedes crearlas a partir de una hoja de cálculo de Google Sheets.



\*\*Tabla: `Productos`\*\*

| Nombre de Columna | Tipo de Dato | Notas |

| :--- | :--- | :--- |

| `nombreProducto` | `Text` | (Clave) Nombre y descripción del producto. |

| `valor` | `Number` | Precio del producto. |



\*\*Tabla: `enc\\\_pedido` (Encabezado del Pedido)\*\*

| Nombre de Columna | Tipo de Dato | Notas |

| :--- | :--- | :--- |

| `pedidoid` | `Text` | (Clave) El ID único del pedido. |

| `enc\\\_total` | `Number` | El valor total de todos los productos del pedido. |

| `fecha` | `Date` | La fecha en que se realizó el pedido. |

| `cliente` | `Text` | Nombre completo del cliente. |

| `dirección` | `Address` | Dirección de entrega del cliente. |

| `celular` | `Phone` | Número de contacto del cliente. |



\*\*Tabla: `Pedido` (Detalle del Pedido)\*\*

| Nombre de Columna | Tipo de Dato | Notas |

| :--- | :--- | :--- |

| `RowID` | `Text` | (Clave) Un ID único para cada fila, puede ser autogenerado. |

| `pedidoid` | `Text` | El mismo ID de la tabla `enc\\\_pedido` para relacionarlos. |

| `fecha` | `DateTime` | Fecha y hora exactas en que se añadió el producto. |

| `nombreProducto` | `Text` | Nombre del producto pedido. |

| `cantidadProducto` | `Number` | Cantidad de unidades de este producto. |

| `valor\\\_unit` | `Number` | Precio unitario del producto. |

| `valor` | `Number` | Valor total (cantidad \* valor\_unit). |



\### 1.2. Habilitar la API y Obtener Claves



1\.  En el editor de AppSheet, ve a \*\*Manage > Integrations\*\*.

2\.  Haz clic en \*\*"Enable"\*\* para la sección de API.

3\.  Se generará una \*\*Application Access Key\*\*. Cópiala y guárdala en un lugar seguro.

4\.  También necesitarás tu \*\*App ID\*\*. Lo puedes encontrar en la URL del editor de tu aplicación (`.../appName/yourapp-12345/`) o en \*\*Manage > Integrations\*\*.



---



\## 🚀 Paso 2: Configuración y Despliegue en Render



Esta fase consiste en preparar tu código localmente y luego subirlo a Render para que sea accesible públicamente en internet y Twilio pueda conectarse a él.



\### 2.1. Preparar el Código Localmente



Antes de poder desplegar, necesitas organizar los archivos de tu proyecto y manejar las claves secretas de forma segura.



1\.  \*\*Organiza tus archivos\*\*: Asegúrate de tener los tres archivos (`index.js`, `appsheet.js`, `package.json`) en una misma carpeta en tu computadora.



2\.  \*\*Crea el archivo `.env` para tus secretos\*\*:

    \* Dentro de la carpeta de tu proyecto, crea un nuevo archivo llamado `.env`.

    \* Este archivo contendrá tus credenciales. Es una práctica de seguridad estándar para evitar que tus claves secretas se suban a repositorios públicos como GitHub.

    \* Abre el archivo `.env` y pega lo siguiente, reemplazando los valores de ejemplo con tus credenciales reales:



    ```

    # Credenciales de AppSheet (reemplaza con tus datos)

    APPSHEET\_APP\_ID=your\_app\_id-12345

    APPSHEET\_ACCESS\_KEY=your\_appsheet\_access\_key

    ```

    \* \*\*Importante\*\*: Asegúrate de que este archivo esté incluido en tu `.gitignore` para que nunca se suba a tu repositorio. Si no tienes un archivo `.gitignore`, créalo y añade una línea que diga `.env`.



3\.  \*\*Instala las dependencias\*\*:

    \* Abre una terminal o línea de comandos en la carpeta de tu proyecto.

    \* Ejecuta el comando `npm install`.

    \* Este comando lee el archivo `package.json` y descarga todas las librerías necesarias (Express, Twilio, Axios, etc.) en una carpeta llamada `node\\\_modules`. Esto te permite probar el bot localmente si lo deseas.



\### 2.2. Subir el Código a GitHub



Render se conecta a tu repositorio de GitHub para desplegar tu código.



1\.  \*\*Crea un nuevo repositorio en GitHub\*\*: Ve a tu cuenta de GitHub y crea un nuevo repositorio. Puedes llamarlo `whatsapp-bot-render` o como prefieras.

2\.  \*\*Sube tu código\*\*: Sigue las instrucciones de GitHub para subir los archivos de tu proyecto (`index.js`, `appsheet.js`, `package.json`, `.gitignore`) a este nuevo repositorio. \*\*Recuerda no subir el archivo `.env` ni la carpeta `node\\\_modules`.\*\*



\### 2.3. Desplegar en Render



Ahora, le diremos a Render que use tu repositorio de GitHub para crear y ejecutar tu aplicación.



1\.  \*\*Crea un nuevo servicio en Render\*\*:

    \* Inicia sesión en tu cuenta de Render.

    \* En el dashboard, haz clic en \*\*New + > Web Service\*\*.



2\.  \*\*Conecta tu repositorio\*\*:

    \* Elige la opción "Build and deploy from a Git repository".

    \* Busca y selecciona el repositorio de GitHub que acabas de crear. Dale los permisos necesarios si es la primera vez que lo haces.



3\.  \*\*Configura el servicio web\*\*:

    \* \*\*Name\*\*: Dale un nombre único a tu servicio (ej: `mi-bot-pedidos`). Este nombre formará parte de tu URL.

    \* \*\*Region\*\*: Elige una región cercana a tu ubicación (ej: `Ohio (US East)`).

    \* \*\*Branch\*\*: Asegúrate de que esté seleccionada la rama principal de tu repositorio (`main` o `master`).

    \* \*\*Root Directory\*\*: Déjalo en blanco si tus archivos están en la raíz del repositorio.

    \* \*\*Runtime\*\*: Render debería detectar automáticamente `Node`.

    \* \*\*Build Command\*\*: `npm install`. Este es el comando que Render ejecutará para instalar las dependencias.

    \* \*\*Start Command\*\*: `node index.js`. Este es el comando que Render ejecutará para iniciar tu aplicación después de la instalación.

    \* \*\*Instance Type\*\*: El plan `Free` es suficiente para empezar.



4\.  \*\*Añade las Variables de Entorno\*\*:

    \* Esta es la parte más importante para la seguridad. En lugar de usar el archivo `.env`, le darás las claves a Render directamente.

    \* Desplázate hacia abajo hasta la sección \*\*"Environment"\*\* y haz clic en \*\*"Add Environment Variable"\*\*.

    \* Añade cada una de las claves de tu archivo `.env` una por una:

        \* \*\*Key\*\*: `APPSHEET\\\_APP\\\_ID`, \*\*Value\*\*: `tu\\\_id\\\_de\\\_app\\\_aqui`

        \* \*\*Key\*\*: `APPSHEET\\\_ACCESS\\\_KEY`, \*\*Value\*\*: `tu\\\_access\\\_key\\\_aqui`

    \* De esta forma, tus credenciales están seguras en Render y no expuestas en tu código.



5\.  \*\*Crea el servicio\*\*:

    \* Haz clic en el botón \*\*"Create Web Service"\*\* en la parte inferior.

    \* Render comenzará el proceso de despliegue. Verás un registro (log) en tiempo real. Primero, ejecutará el `Build Command` y luego el `Start Command`.

    \* Si todo va bien, verás un mensaje que dice "Your service is live 🎉".



6\.  \*\*Obtén tu URL pública\*\*:

    \* En la parte superior de la página de tu servicio en Render, verás la URL pública de tu aplicación, algo como: `https://mi-bot-pedidos.onrender.com`.

    \* \*\*¡Copia esta URL!\*\* La necesitarás en el siguiente paso para configurar Twilio.



---



\## 🔗 Paso 3: Conectar Twilio a tu Aplicación



1\.  Ve a tu \[Consola de Twilio](https://www.twilio.com/console).

2\.  Navega a \*\*Messaging > Try it out > WhatsApp Sandbox Settings\*\*.

3\.  En el campo \*\*"WHEN A MESSAGE COMES IN"\*\*, pega la URL de tu aplicación de Render y añade la ruta del webhook:

    ```

    \[https://your-bot.onrender.com/whatsapp](https://your-bot.onrender.com/whatsapp)

    ```

4\.  Asegúrate de que el método esté configurado como `HTTP POST`.

5\.  Guarda la configuración.



---



\## ✅ ¡Listo! Cómo Probar tu Bot



1\.  Envía el mensaje de activación (que se muestra en la página del Sandbox de Twilio) desde tu WhatsApp al número del Sandbox.

2\.  Una vez conectado, envía la palabra `hola` para iniciar la conversación con tu bot.

3\.  Sigue las instrucciones del bot para realizar un pedido de prueba.

4\.  Verifica que los datos se guarden correctamente en tus tablas de AppSheet.



Este proyecto implementa un bot de chat para WhatsApp que permite a los usuarios realizar pedidos. El bot está construido con Node.js y Express, utiliza la API de Twilio para comunicarse a través de WhatsApp y usa AppSheet como base de datos para gestionar productos y pedidos. Está diseñado para ser desplegado fácilmente en la plataforma de hosting Render.



\## Características



\- \*\*Flujo de Conversación Guiado\*\*: El bot guía al usuario desde el saludo inicial hasta la finalización del pedido.

\- \*\*Recopilación de Datos del Cliente\*\*: Solicita y almacena el nombre, dirección y celular del cliente.

\- \*\*Búsqueda de Productos\*\*: Busca productos en una tabla de AppSheet.

\- \*\*Manejo de Múltiples Coincidencias\*\*: Si la búsqueda arroja varios resultados, le permite al usuario elegir el correcto.

\- \*\*Carrito de Compras\*\*: Los usuarios pueden añadir múltiples productos a un solo pedido.

\- \*\*Resumen de Pedido\*\*: Muestra un resumen detallado antes de finalizar y al confirmar el pedido.

\- \*\*Persistencia de Datos\*\*: Guarda toda la información del pedido en tablas de AppSheet.



\## Arquitectura



1\.  \*\*WhatsApp\*\*: Interfaz de usuario final.

2\.  \*\*Twilio\*\*: Actúa como pasarela, conectando WhatsApp con nuestra aplicación.

3\.  \*\*Render\*\*: Plataforma de hosting donde se ejecuta nuestra aplicación Node.js.

4\.  \*\*Node.js / Express\*\*: El backend que contiene toda la lógica del bot.

5\.  \*\*AppSheet\*\*: La base de datos donde se almacenan los productos y se registran los pedidos.



---



\## 📋 Requisitos Previos



Antes de comenzar, asegúrate de tener cuentas en los siguientes servicios:



1\.  \*\*Node.js\*\*: Instalado en tu máquina local (v16 o superior).

2\.  \*\*Cuenta de Twilio\*\*: Con un número de teléfono habilitado para WhatsApp o con el Sandbox de WhatsApp configurado.

3\.  \*\*Cuenta de AppSheet\*\*: Donde crearás tu aplicación y tus tablas.

4\.  \*\*Cuenta de Render\*\*: Para desplegar la aplicación.

5\.  \*\*Git\*\*: Para clonar el repositorio y desplegar en Render.



---



\## 🛠️ Paso 1: Configuración de AppSheet



Tu base de datos vivirá en AppSheet. Debes crear una aplicación y configurar las tablas y la API.



\### 1.1. Crear las Tablas



Crea una nueva aplicación en AppSheet y añade las siguientes tres tablas. Puedes crearlas a partir de una hoja de cálculo de Google Sheets.



\*\*Tabla: `Productos`\*\*

| Nombre de Columna | Tipo de Dato | Notas |

| :--- | :--- | :--- |

| `nombreProducto` | `Text` | (Clave) Nombre y descripción del producto. |

| `valor` | `Number` | Precio del producto. |



\*\*Tabla: `enc\\\_pedido` (Encabezado del Pedido)\*\*

| Nombre de Columna | Tipo de Dato | Notas |

| :--- | :--- | :--- |

| `pedidoid` | `Text` | (Clave) El ID único del pedido. |

| `enc\\\_total` | `Number` | El valor total de todos los productos del pedido. |

| `fecha` | `Date` | La fecha en que se realizó el pedido. |

| `cliente` | `Text` | Nombre completo del cliente. |

| `dirección` | `Address` | Dirección de entrega del cliente. |

| `celular` | `Phone` | Número de contacto del cliente. |



\*\*Tabla: `Pedido` (Detalle del Pedido)\*\*

| Nombre de Columna | Tipo de Dato | Notas |

| :--- | :--- | :--- |

| `RowID` | `Text` | (Clave) Un ID único para cada fila, puede ser autogenerado. |

| `pedidoid` | `Text` | El mismo ID de la tabla `enc\\\_pedido` para relacionarlos. |

| `fecha` | `DateTime` | Fecha y hora exactas en que se añadió el producto. |

| `nombreProducto` | `Text` | Nombre del producto pedido. |

| `cantidadProducto` | `Number` | Cantidad de unidades de este producto. |

| `valor\\\_unit` | `Number` | Precio unitario del producto. |

| `valor` | `Number` | Valor total (cantidad \* valor\_unit). |



\### 1.2. Habilitar la API y Obtener Claves



1\.  En el editor de AppSheet, ve a \*\*Manage > Integrations\*\*.

2\.  Haz clic en \*\*"Enable"\*\* para la sección de API.

3\.  Se generará una \*\*Application Access Key\*\*. Cópiala y guárdala en un lugar seguro.

4\.  También necesitarás tu \*\*App ID\*\*. Lo puedes encontrar en la URL del editor de tu aplicación (`.../appName/yourapp-12345/`) o en \*\*Manage > Integrations\*\*.



---



\## 🚀 Paso 2: Configuración y Despliegue en Render



Esta fase consiste en preparar tu código localmente y luego subirlo a Render para que sea accesible públicamente en internet y Twilio pueda conectarse a él.



\### 2.1. Preparar el Código Localmente



Antes de poder desplegar, necesitas organizar los archivos de tu proyecto y manejar las claves secretas de forma segura.



1\.  \*\*Organiza tus archivos\*\*: Asegúrate de tener los tres archivos (`index.js`, `appsheet.js`, `package.json`) en una misma carpeta en tu computadora.



2\.  \*\*Crea el archivo `.env` para tus secretos\*\*:

    \* Dentro de la carpeta de tu proyecto, crea un nuevo archivo llamado `.env`.

    \* Este archivo contendrá tus credenciales. Es una práctica de seguridad estándar para evitar que tus claves secretas se suban a repositorios públicos como GitHub.

    \* Abre el archivo `.env` y pega lo siguiente, reemplazando los valores de ejemplo con tus credenciales reales:



    ```

    # Credenciales de AppSheet (reemplaza con tus datos)

    APPSHEET\_APP\_ID=your\_app\_id-12345

    APPSHEET\_ACCESS\_KEY=your\_appsheet\_access\_key

    ```

    \* \*\*Importante\*\*: Asegúrate de que este archivo esté incluido en tu `.gitignore` para que nunca se suba a tu repositorio. Si no tienes un archivo `.gitignore`, créalo y añade una línea que diga `.env`.



3\.  \*\*Instala las dependencias\*\*:

    \* Abre una terminal o línea de comandos en la carpeta de tu proyecto.

    \* Ejecuta el comando `npm install`.

    \* Este comando lee el archivo `package.json` y descarga todas las librerías necesarias (Express, Twilio, Axios, etc.) en una carpeta llamada `node\\\_modules`. Esto te permite probar el bot localmente si lo deseas.



\### 2.2. Subir el Código a GitHub



Render se conecta a tu repositorio de GitHub para desplegar tu código.



1\.  \*\*Crea un nuevo repositorio en GitHub\*\*: Ve a tu cuenta de GitHub y crea un nuevo repositorio. Puedes llamarlo `whatsapp-bot-render` o como prefieras.

2\.  \*\*Sube tu código\*\*: Sigue las instrucciones de GitHub para subir los archivos de tu proyecto (`index.js`, `appsheet.js`, `package.json`, `.gitignore`) a este nuevo repositorio. \*\*Recuerda no subir el archivo `.env` ni la carpeta `node\\\_modules`.\*\*



\### 2.3. Desplegar en Render



Ahora, le diremos a Render que use tu repositorio de GitHub para crear y ejecutar tu aplicación.



1\.  \*\*Crea un nuevo servicio en Render\*\*:

    \* Inicia sesión en tu cuenta de Render.

    \* En el dashboard, haz clic en \*\*New + > Web Service\*\*.



2\.  \*\*Conecta tu repositorio\*\*:

    \* Elige la opción "Build and deploy from a Git repository".

    \* Busca y selecciona el repositorio de GitHub que acabas de crear. Dale los permisos necesarios si es la primera vez que lo haces.



3\.  \*\*Configura el servicio web\*\*:

    \* \*\*Name\*\*: Dale un nombre único a tu servicio (ej: `mi-bot-pedidos`). Este nombre formará parte de tu URL.

    \* \*\*Region\*\*: Elige una región cercana a tu ubicación (ej: `Ohio (US East)`).

    \* \*\*Branch\*\*: Asegúrate de que esté seleccionada la rama principal de tu repositorio (`main` o `master`).

    \* \*\*Root Directory\*\*: Déjalo en blanco si tus archivos están en la raíz del repositorio.

    \* \*\*Runtime\*\*: Render debería detectar automáticamente `Node`.

    \* \*\*Build Command\*\*: `npm install`. Este es el comando que Render ejecutará para instalar las dependencias.

    \* \*\*Start Command\*\*: `node index.js`. Este es el comando que Render ejecutará para iniciar tu aplicación después de la instalación.

    \* \*\*Instance Type\*\*: El plan `Free` es suficiente para empezar.



4\.  \*\*Añade las Variables de Entorno\*\*:

    \* Esta es la parte más importante para la seguridad. En lugar de usar el archivo `.env`, le darás las claves a Render directamente.

    \* Desplázate hacia abajo hasta la sección \*\*"Environment"\*\* y haz clic en \*\*"Add Environment Variable"\*\*.

    \* Añade cada una de las claves de tu archivo `.env` una por una:

        \* \*\*Key\*\*: `APPSHEET\\\_APP\\\_ID`, \*\*Value\*\*: `tu\\\_id\\\_de\\\_app\\\_aqui`

        \* \*\*Key\*\*: `APPSHEET\\\_ACCESS\\\_KEY`, \*\*Value\*\*: `tu\\\_access\\\_key\\\_aqui`

    \* De esta forma, tus credenciales están seguras en Render y no expuestas en tu código.



5\.  \*\*Crea el servicio\*\*:

    \* Haz clic en el botón \*\*"Create Web Service"\*\* en la parte inferior.

    \* Render comenzará el proceso de despliegue. Verás un registro (log) en tiempo real. Primero, ejecutará el `Build Command` y luego el `Start Command`.

    \* Si todo va bien, verás un mensaje que dice "Your service is live 🎉".



6\.  \*\*Obtén tu URL pública\*\*:

    \* En la parte superior de la página de tu servicio en Render, verás la URL pública de tu aplicación, algo como: `https://mi-bot-pedidos.onrender.com`.

    \* \*\*¡Copia esta URL!\*\* La necesitarás en el siguiente paso para configurar Twilio.



---



\## 🔗 Paso 3: Conectar Twilio a tu Aplicación



1\.  Ve a tu \[Consola de Twilio](https://www.twilio.com/console).

2\.  Navega a \*\*Messaging > Try it out > WhatsApp Sandbox Settings\*\*.

3\.  En el campo \*\*"WHEN A MESSAGE COMES IN"\*\*, pega la URL de tu aplicación de Render y añade la ruta del webhook:

    ```

    \[https://your-bot.onrender.com/whatsapp](https://your-bot.onrender.com/whatsapp)

    ```

4\.  Asegúrate de que el método esté configurado como `HTTP POST`.

5\.  Guarda la configuración.



---



\## ✅ ¡Listo! Cómo Probar tu Bot



1\.  Envía el mensaje de activación (que se muestra en la página del Sandbox de Twilio) desde tu WhatsApp al número del Sandbox.

2\.  Una vez conectado, envía la palabra `hola` para iniciar la conversación con tu bot.

3\.  Sigue las instrucciones del bot para realizar un pedido de prueba.

4\.  Verifica que los datos se guarden correctamente en tus tablas de AppSheet.

