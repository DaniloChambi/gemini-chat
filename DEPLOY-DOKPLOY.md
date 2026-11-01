# Despliegue en Dokploy

Dokploy es un panel autoalojado (tipo Vercel/Coolify) que construye tu proyecto
en un contenedor y lo publica detrás de Traefik con HTTPS. Este proyecto es
**100 % estático**, así que el despliegue es corto: no hay variables de entorno,
ni base de datos, ni build de Node.

> La app pide la API key a cada visitante y la guarda en **su** navegador. No
> configures ninguna clave en Dokploy: no hace falta y sería un riesgo.

Tienes dos caminos. Elige **uno**:

| | Opción A · Static | Opción B · Dockerfile |
|---|---|---|
| Esfuerzo | Mínimo (sin archivos extra) | Bajo (ya está en el repo) |
| Qué publica | Todo el repo, incluidos `.md` y PDF | Solo `index.html`, `styles.css`, `app.js` y `presentacion/` |
| Cabeceras y caché | Las de nginx por defecto | gzip, caché y cabeceras de seguridad |
| Healthcheck | No | Sí, `/healthz` |

---

## Requisitos

1. Un servidor con **Dokploy** instalado y accesible por HTTPS.
2. (Recomendado) Un dominio o subdominio, por ejemplo `chat.tudominio.com`,
   con un registro **DNS A** apuntando a la IP del servidor.
3. Puertos **80** y **443** abiertos en el firewall del servidor.

Sin dominio también puedes probar: Dokploy genera uno temporal tipo
`gemini-chat-<ip>.traefik.me`.

---

## Opción A · Build Type «Static» (la más rápida)

1. En Dokploy: **Create Project** → ponle un nombre (ej. `clase-ia`).
2. Dentro del proyecto: **Create Application** → nombre `gemini-chat` →
   **Create**.
3. Pestaña **General** → sección **Provider**:
   - Elige **Git** (no necesitas instalar la GitHub App: el repo es público).
   - **Repository URL**: `https://github.com/DaniloChambi/gemini-chat`
   - **Branch**: `main`
4. En **Build Type** elige **Static**.
   - **Root Directory**: déjalo vacío o `.` (la raíz del repo).
5. Pulsa **Deploy**. En la pestaña **Deployments** verás el log; termina con el
   contenedor en estado *running*.
6. Pestaña **Domains** → **Add Domain**:
   - **Host**: `chat.tudominio.com`
   - **Port**: `80` ← importante, el contenedor de Dokploy escucha en 80.
   - **HTTPS**: activado, con certificado **Let's Encrypt**.
7. Abre `https://chat.tudominio.com` y prueba el chat.

> Con este modo se sirve también `README.md`, `DEPLOY.md` y el PDF. No hay
> secretos en ellos, pero si prefieres publicar solo el sitio, usa la opción B.

---

## Opción B · Build Type «Dockerfile» (recomendada)

El repo ya incluye `Dockerfile`, `nginx.conf` y `.dockerignore`.

1. Crea el proyecto y la aplicación igual que en los pasos 1–3 de la opción A.
2. En **Build Type** elige **Dockerfile**:
   - **Dockerfile Path**: `Dockerfile`
   - **Docker Context Path**: `.`
   - **Docker Build Stage**: vacío
3. **Deploy**.
4. Añade el dominio igual que en el paso 6 (puerto **80**, HTTPS con Let's
   Encrypt).
5. Comprueba que responde el healthcheck:
   ```bash
   curl -s https://chat.tudominio.com/healthz   # → ok
   ```

La imagen se construye con `nginx:1.27-alpine` y copia únicamente los archivos
del sitio. No hay build de JavaScript: el `Dockerfile` solo empaqueta.

---

## Dominio, DNS y HTTPS

1. En tu proveedor de DNS crea:
   ```
   Tipo: A    Nombre: chat    Valor: IP_PUBLICA_DEL_SERVIDOR
   ```
2. Espera la propagación (`dig +short chat.tudominio.com` debe devolver la IP).
3. En Dokploy, **Domains** → **Add Domain** con ese host, puerto `80` y
   **HTTPS** + **Let's Encrypt** activados.
4. Si usas **Cloudflare**, pon el registro en modo **DNS only** (nube gris)
   durante el primer despliegue: el proxy naranja puede impedir el reto HTTP-01
   de Let's Encrypt. Cuando el certificado ya exista, puedes activar el proxy con
   SSL/TLS en **Full (strict)**.

El HTTPS no es opcional en la práctica: el botón **Copiar** usa la API del
portapapeles, que el navegador solo permite en contextos seguros.

---

## Despliegues automáticos con cada push

**Opción 1 · GitHub App (recomendada por Dokploy)**

1. En Dokploy: **Settings → Git Sources → GitHub** → instala la GitHub App en tu
   cuenta y dale acceso al repo `gemini-chat`.
2. En la aplicación, cambia el provider a **GitHub** y selecciona el repo.
3. Activa **Auto Deploy**. Cada `git push` a `main` desplegará solo.

**Opción 2 · Webhook manual**

En **Deployments → Webhook**, copia la URL y añádela en GitHub:
*Settings → Webhooks → Add webhook*, evento *Just the push event*.

Si no configuras nada de esto, basta con pulsar **Deploy** (o **Redeploy**) en
Dokploy después de cada cambio.

---

## Verificación después del deploy

- [ ] `https://chat.tudominio.com` muestra el chat y el aviso «Falta tu API key».
- [ ] ⚙ → pegar la key → **Guardar** → enviar un mensaje: la respuesta aparece
      en streaming.
- [ ] DevTools → **Network**: aparece `generativelanguage.googleapis.com` con
      estado `200`.
- [ ] DevTools → **Console**: sin errores.
- [ ] `https://chat.tudominio.com/presentacion/` abre la presentación.
- [ ] (Solo opción B) `/healthz` responde `ok`.

---

## Problemas frecuentes

| Síntoma | Causa habitual | Solución |
|---|---|---|
| 404 al abrir la raíz | Root directory o `COPY` incorrectos | Opción A: Root `.` · Opción B: revisa el `Dockerfile` |
| 502 / 504 de Traefik | El dominio apunta a un puerto que no escucha | Pon puerto **80** en *Domains* |
| «No se pudo emitir el certificado» | DNS sin propagar, puerto 80 cerrado o Cloudflare en proxy | Revisa el registro A, el firewall y pon Cloudflare en *DNS only* |
| El botón **Copiar** no funciona | La página se abrió por HTTP | Usa HTTPS |
| Google responde **503** | Modelo saturado en Google | No es el deploy: la app cambia de modelo sola; si insiste, elige `gemini-flash-lite-latest` |
| Google responde **404** | Modelo retirado | Elige otro modelo en ⚙ |
| Google responde **429** | Cuota de la key agotada | Espera o usa otra key |
| Cambios que no se ven | Caché del navegador o deploy sin aplicar | Fuerza recarga (`Ctrl/Cmd + Shift + R`) y revisa *Deployments* |

Los logs del contenedor y del build están en **Deployments** (build) y **Logs**
(runtime).

---

## Probar la imagen en local (opcional)

```bash
docker build -t gemini-chat .
docker run --rm -p 8080:80 gemini-chat
# → http://localhost:8080
```

Con Podman es igual (`podman build`, `podman run`). La app funcionará en
`http://localhost:8080` porque `localhost` cuenta como contexto seguro; en un
dominio necesitas HTTPS.

---

## Notas

- Este proyecto **no usa variables de entorno**. Si algún día mueves la llamada
  a un backend proxy, entonces sí guardarías la clave como variable de entorno
  (o *secret*) en Dokploy, nunca en el código.
- El contenedor es sin estado: no necesitas volúmenes.
- Para producción a mayor escala, considera añadir límites de recursos,
  *zero downtime* y backups del panel; nada de eso es necesario para una demo de
  clase.
