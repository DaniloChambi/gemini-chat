# Imagen mínima para servir el chat como sitio estático.
# Dokploy: Build Type = Dockerfile · Dockerfile Path = Dockerfile · Context = .

FROM nginx:1.27-alpine

LABEL org.opencontainers.image.title="gemini-chat" \
      org.opencontainers.image.description="Chat con la API de Gemini (Google AI Studio) en HTML, CSS y JS puro." \
      org.opencontainers.image.source="https://github.com/DaniloChambi/gemini-chat"

# Configuración propia de nginx (gzip, caché, cabeceras y /healthz).
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Solo se publican los archivos del sitio: el resto del repo no entra en la imagen.
COPY index.html styles.css app.js /usr/share/nginx/html/
COPY presentacion/ /usr/share/nginx/html/presentacion/

EXPOSE 80

HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget -q -O /dev/null http://127.0.0.1/healthz || exit 1
