# Gemini Chat · Google AI Studio

Proyecto pequeño en **HTML, CSS y JavaScript puro** (sin frameworks ni build) que
conversa con los modelos de Gemini usando la **API de Google AI Studio**.

## Funciones

- Chat con **respuestas en streaming** (`streamGenerateContent` + SSE).
- **Selector de modelo** con Gemini Flash por defecto.
- **Cambio automático de modelo** si Google devuelve 503 (alta demanda) o 404
  (modelo retirado), con aviso en el mensaje.
- Botón para **detectar automáticamente** los modelos disponibles con tu clave.
- API key y conversación guardadas en `localStorage` (solo en tu navegador).
- Temperatura ajustable, detener generación, reintentar y copiar respuestas.
- Render Markdown básico (negritas, listas, código, enlaces).
- UI responsive con tema oscuro.

## Archivos

```
ConexionAPI/
├── index.html    # estructura de la interfaz
├── styles.css    # estilos
├── app.js        # lógica y llamadas a la API
└── README.md
```

## Cómo usarlo

1. Consigue una API key gratuita en <https://aistudio.google.com/apikey>.
2. Sirve la carpeta con un servidor local (recomendado):

   ```bash
   cd /Users/danilo/Proyectos/ConexionAPI
   python3 -m http.server 8000
   ```

3. Abre <http://localhost:8000>.
4. Pulsa el engranaje (⚙) o **Configurar**, pega tu API key y guarda.
5. Escribe un mensaje. Opcionalmente pulsa **↻ Actualizar modelos** para cargar
   la lista real de modelos de tu cuenta.

> También puedes abrir `index.html` directamente, pero con `file://` algunos
> navegadores bloquean las peticiones. Usa el servidor local si algo falla.

## Despliegue

Es un sitio 100 % estático (sin build ni backend). Tienes dos guías:

- **[DEPLOY-DOKPLOY.md](DEPLOY-DOKPLOY.md)** — Dokploy con Dockerfile (o *Static*
  build type), dominio, HTTPS y auto deploy con cada push.
- **[DEPLOY.md](DEPLOY.md)** — CloudPanel: crear *Static Site*, subir los
  archivos a `htdocs` y activar Let's Encrypt.

> No subas tu API key dentro del código: la app la pide a cada visitante y la
> guarda en su navegador. Si quieres usar una clave propia para todos, necesitas
> un proxy PHP (explicado en DEPLOY.md).

## Material para la clase

- **[PREGUNTAS.md](PREGUNTAS.md)** — guion de demo y preguntas recomendadas para
  usar el chat en una clase de IA.
- **[presentacion/index.html](presentacion/index.html)** — presentación
  navegable del proyecto (flechas ← →, `N` para notas del expositor, botón
  **PDF** para exportarla). También se puede abrir directamente en el navegador.

## Cómo funciona la conexión

La petición principal está en `app.js` (`streamReply`):

```js
POST https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:streamGenerateContent?alt=sse&key=TU_API_KEY
Content-Type: application/json

{
  "contents": [
    { "role": "user",  "parts": [{ "text": "Hola" }] },
    { "role": "model", "parts": [{ "text": "¡Hola!" }] }
  ],
  "generationConfig": { "temperature": 0.7, "maxOutputTokens": 4096 }
}
```

La respuesta llega como Server-Sent Events; cada línea `data: {...}` contiene un
fragmento de texto que se va pintando en pantalla.

## Seguridad

- La clave se guarda **en claro en localStorage** y viaja desde el navegador: es
  válido para pruebas y proyectos personales, no para producción.
- **No subas tu clave a Git ni la publiques** en una web pública. Si necesitas
  exponer esto en internet, mueve la llamada a un backend (Node, Python, etc.)
  que guarde la clave en variables de entorno.
- Si una clave se filtra, revócala en Google AI Studio.

## Errores habituales

| Código | Significado |
|--------|-------------|
| 400 | Modelo o petición inválida |
| 401/403 | Clave incorrecta o API no habilitada |
| 404 | El modelo ya no existe: usa «Actualizar modelos» y elige otro |
| 429 | Cuota agotada para ese modelo (los modelos Pro suelen requerir facturación) |
| 503 | Modelo con alta demanda: la app prueba otro automáticamente; si no, reintenta en unos segundos |
