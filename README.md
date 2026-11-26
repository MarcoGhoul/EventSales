# EventSales · Render + Netlify + Google AI Studio

Un repositorio para dos despliegues. Render ejecuta la API y PostgreSQL con pgvector. Netlify publica el frontend Angular. HampCode responde por escrito y permite escuchar cada respuesta en español latinoamericano.

## 1. Sube el proyecto a GitHub

Descomprime el ZIP. Crea un repositorio vacío en GitHub y sube **el contenido** de `EventSales_Cloud/`. Debes ver `render.yaml`, `netlify.toml`, `event-api/` y `event_sales/` en la raíz. Si usas Git desde Terminal o PowerShell, ejecuta dentro de esa carpeta lo siguiente, sustituyendo la URL por la de tu repositorio.

```sh
git init -b main
git add .
git commit -m "Despliegue de EventSales"
git remote add origin https://github.com/TU_USUARIO/TU_REPOSITORIO.git
git push -u origin main
```

## 2. Configura Gemini y despliega la API en Render

1. En [Google AI Studio](https://aistudio.google.com/apikey), selecciona tu proyecto, pulsa **Create API key** y copia la clave.
2. En [Render](https://dashboard.render.com), selecciona **New → Blueprint**, conecta el repositorio y elige la rama `main`. Cuando se solicite **`GEMINI_API_KEY`**, pega la clave y confirma el despliegue.
3. Espera a que el servicio diga **Live**. Copia su URL pública HTTPS y abre esa URL seguida de `/api/home`. Debes ver un JSON con `categories` y `upcomingEvents`.

La plantilla crea la base de datos, la conexión interna y la firma de sesión. El primer arranque indexa el PDF con `gemini-embedding-2`. El chat usa `gemini-3.1-flash-lite` y la lectura usa `gemini-3.1-flash-tts-preview`. Puedes cambiar los modelos de chat y voz en **Render → Environment**.

## 3. Publica la web en Netlify

1. En [Netlify](https://app.netlify.com), selecciona **Add new project → Import an existing project → GitHub** y elige el mismo repositorio.
2. Antes de desplegar, añade **`RENDER_ORIGIN`** en las variables de entorno de compilación. Pega la URL real del backend, por ejemplo `https://mi-api.onrender.com`, **sin `/api`**. El archivo `netlify.toml` configura automáticamente la compilación.
3. Pulsa **Deploy** y copia la URL pública principal del sitio, por ejemplo `https://mi-eventsales.netlify.app`.

## 4. Conecta ambos y prueba la voz

1. En **Render → servicio web → Environment**, añade **`CORS_ORIGINS`** con la URL exacta de Netlify **sin barra final**. Guarda con **Save and deploy** y espera a que vuelva a **Live**.
2. Abre la web de Netlify, crea una cuenta de participante, inicia sesión y entra en **Agente HampCode**. Escribe **«¿Qué eventos hay en Lima?»**.
3. Pulsa **Escuchar respuesta** debajo del mensaje. Aparecerá un reproductor con pausa y repetición. Si el navegador bloquea la reproducción automática, pulsa ▶. Puedes probarlo sin micrófono. Si Gemini TTS falla, el botón intenta usar una voz latinoamericana instalada en el dispositivo.

| Variable | Dónde va | Valor |
| --- | --- | --- |
| `GEMINI_API_KEY` | Render · backend | Clave privada de Google AI Studio |
| `RENDER_ORIGIN` | Netlify · compilación | Origen HTTPS de Render |
| `CORS_ORIGINS` | Render · backend | Origen HTTPS de Netlify |

**Si algo falla.** Para un error CORS, revisa que `CORS_ORIGINS` coincida con la dirección que muestra el navegador. Si cambias `RENDER_ORIGIN`, vuelve a desplegar **Netlify**. Para un error 403, 404 o 429 del modelo, consulta **Render → Logs** y revisa en AI Studio el acceso de la clave al modelo y la cuota. La clave permanece en Render.

**Datos de la demo.** Las ventas, los documentos vectorizados y las imágenes nuevas se guardan en PostgreSQL. La plantilla usa planes gratuitos y crea una base nueva. Render indica que su base gratuita caduca a los 30 días. [Condiciones del plan gratuito](https://render.com/docs/free#free-postgres)

Proyecto académico original de Henry Antonio Mendoza Puerta (HampCode).
