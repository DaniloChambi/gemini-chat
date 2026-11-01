# Despliegue en CloudPanel

El proyecto es **100 % estático**: `index.html`, `styles.css` y `app.js`. No hay
build, ni Node, ni base de datos. CloudPanel lo sirve con nginx tal cual.

> ¿Usas **Dokploy**? Tienes una guía específica en
> [DEPLOY-DOKPLOY.md](DEPLOY-DOKPLOY.md).

> Requisito importante: la app pide la API key a cada visitante y la guarda en
> **su** navegador. Nunca subas tu clave dentro de los archivos.

## 1. Preparar el dominio

1. En tu proveedor de DNS, crea un registro **A** para `tudominio.com` (y `www`)
   apuntando a la IP del servidor CloudPanel.
2. Espera la propagación antes de pedir el certificado SSL.

## 2. Crear el sitio en CloudPanel

1. Entra en CloudPanel → **Sites** → **Add Site**.
2. Elige **Create a Static HTML Site** (en algunas versiones aparece como
   *Static Site* o *HTML Site*). No necesitas PHP: la app es solo HTML, CSS y JS.
   - Si más adelante quieres usar un proxy PHP para ocultar una clave propia,
     crea mejor un **PHP Site** desde el principio; el tipo de sitio no se puede
     cambiar después.
3. Rellena:
   - **Domain Name**: `tudominio.com`
   - **Site User**: el que proponga CloudPanel (ej. `tudominio`)
4. Pulsa **Create**.

La ruta del sitio será:

```
/home/<site-user>/htdocs/tudominio.com/
```

## 3. Subir los archivos

Tienes dos opciones.

### Opción A · File Manager de CloudPanel

1. **Sites** → tu dominio → **File Manager**.
2. Entra en `htdocs/tudominio.com/`.
3. Sube `index.html`, `styles.css` y `app.js` (o el ZIP `conexionapi.zip` y
   descomprímelo allí).
4. Borra el `index.html` de bienvenida de CloudPanel si existe.

### Opción B · SFTP

```
Host:     IP_DEL_SERVIDOR
Usuario:  <site-user>
Puerto:   22
Ruta:     /home/<site-user>/htdocs/tudominio.com/
```

Sube los tres archivos a esa carpeta.

### Permisos (solo si algo da 403)

Por SSH, con el usuario del sitio o como root:

```bash
chown -R <site-user>:<site-user> /home/<site-user>/htdocs/tudominio.com
find /home/<site-user>/htdocs/tudominio.com -type d -exec chmod 755 {} \;
find /home/<site-user>/htdocs/tudominio.com -type f -exec chmod 644 {} \;
```

## 4. Activar HTTPS

1. **Sites** → tu dominio → **SSL/TLS** → **Let's Encrypt**.
2. Selecciona `tudominio.com` y `www.tudominio.com` → **Create Certificate**.

El HTTPS no es solo estético: el botón **Copiar** usa la API del portapapeles,
que el navegador solo permite en contextos seguros (`https` o `localhost`).

## 5. Comprobar

Abre `https://tudominio.com` y verifica:

- Se ve el chat y el aviso de «Falta tu API key».
- ⚙ → pegar una key → guardar → enviar un mensaje y ver la respuesta en streaming.
- En la pestaña Network del navegador aparece la petición a
  `generativelanguage.googleapis.com` con estado 200.

## Actualizaciones

Vuelve a subir `index.html`, `styles.css` y `app.js` sobrescribiendo los
anteriores. No hay que reiniciar nada: nginx sirve los archivos nuevos al
instante. Si el navegador muestra una versión vieja, fuerza recarga
(`Ctrl/Cmd + Shift + R`).

> Si Google responde **503** (modelo saturado) o **404** (modelo retirado), la
> app cambia automáticamente a otro modelo de la familia Flash y avisa en el
> mensaje. No es un fallo del despliegue.

## Seguridad de la API key

Este proyecto usa el modelo **«trae tu propia clave»**: cada visitante pega la
suya y se guarda en su `localStorage`. Es lo correcto para un sitio público y
no expone ninguna clave.

**No** pongas tu clave en `app.js` ni en `index.html`: cualquiera podría leerla
con «Ver código fuente» y gastar tu cuota.

Si quieres que el sitio use **tu** clave para todos los visitantes, necesitas un
proxy en el servidor:

1. Crea un sitio **PHP** en CloudPanel.
2. Guarda la clave fuera del webroot (por ejemplo en
   `/home/<site-user>/gemini.key`) o como variable de entorno de PHP-FPM.
3. Añade un `api.php` que reciba el JSON del chat, llame a Google con la clave
   del servidor y redevuelva el stream.
4. En `app.js`, cambia la URL de `streamReply` por `api.php`.

Con ese esquema protege el endpoint (Basic Auth, rate limit por IP o un token
propio), porque si no cualquiera podría consumir tu cuota.

## Nginx: caché y cabeceras (opcional)

**Sites** → tu dominio → **Vhost**, y añade dentro del bloque `server`:

```nginx
location ~* \.(css|js)$ {
    expires 7d;
    add_header Cache-Control "public, max-age=604800";
}

add_header X-Content-Type-Options nosniff;
add_header Referrer-Policy strict-origin-when-cross-origin;
```

Guarda y recarga nginx. Ojo: al actualizar `app.js`, los visitantes pueden
seguir viendo la versión cacheada hasta 7 días; si iteras mucho, baja el
`max-age` o añade un parámetro de versión (`app.js?v=2`).
