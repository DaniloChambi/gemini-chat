# Preguntas para la clase de IA

Guía rápida para demostrar el chat en clase. Los modelos cambian de
disponibilidad a menudo: si uno da 503, la app cambia sola a otro; si falla
todo, elige **`gemini-flash-lite-latest`** o **`gemini-3.6-flash`** en el
selector y vuelve a intentar.

> El chat es **solo texto**: no analiza imágenes ni archivos. No propongas
> preguntas con fotos.

---

## Guion de demo (6–7 minutos)

| Tiempo | Qué hacer | Qué señalar |
|--------|-----------|-------------|
| 0:00 | «Preséntate en dos frases y dime qué puedes hacer.» | La web, el streaming y el render de Markdown |
| 0:40 | «Explícame la recursión con una analogía cotidiana.» | Calidad de explicación |
| 1:30 | «Escríbeme una función en JavaScript que valide un email.» | Bloque de código y botón *Copiar* |
| 2:15 | «Ahora añade pruebas y explica cada caso.» | **Memoria**: entiende el contexto anterior |
| 3:15 | Pegar un párrafo largo → «Resume en 3 puntos.» | Resumen y listas |
| 4:00 | Abrir DevTools → Network al enviar | La petición real a `generativelanguage.googleapis.com` |
| 4:45 | Cambiar temperatura a 1.5 y repetir un eslogan | Creatividad vs precisión |
| 5:30 | «¿Qué limitaciones tienes?» | Pensamiento crítico sobre la IA |
| 6:00 | «Hazme 5 preguntas tipo test sobre lo anterior.» | Cierre y repaso |

**Consejo:** antes de la clase, prueba el modelo que vayas a usar y borra el
historial (botón **+**) para empezar limpio. La demo se ve mejor en pantalla
completa y con la fuente del navegador al 110–125 %.

---

## Preguntas recomendadas

### 1. Para romper el hielo

```
Preséntate en dos frases y dime qué puedes hacer en este chat.
```

```
Explícame qué es un modelo de lenguaje como si tuviera 12 años.
```

**Qué se ve:** respuesta en streaming, formato Markdown, tono adaptado al
público.

### 2. Para demostrar que tiene memoria

```
Quiero montar un huerto urbano en el patio del instituto. Dame 3 ideas para empezar.
```

Después, sin recargar:

```
Ahora conviértelas en un plan de 4 semanas con materiales y responsables.
```

```
¿Y si el presupuesto fuera de cero euros?
```

**Qué se ve:** no repite la pregunta inicial; usa el contexto anterior. Así se
explica que la «memoria» es el historial que enviamos en cada petición.

### 3. Para programación

```
Escríbeme una función en JavaScript que valide un correo electrónico y explícame el regex paso a paso.
```

```
Ahora hazla más estricta y añade 3 pruebas con console.assert.
```

```
Tengo este error en JavaScript: "Cannot read properties of undefined (reading 'map')". ¿Qué significa y cómo lo soluciono?
```

**Qué se ve:** bloques de código con formato, explicación técnica y botón
*Copiar*. Ideal para hablar de productividad y de revisar lo que genera la IA.

### 4. Para escritura y resumen

```
Resume este texto en 3 puntos y luego hazme una pregunta para comprobar si lo entendí:
[pegar aquí un párrafo de un artículo]
```

```
Escribe un correo formal al director para pedir permiso y usar el laboratorio un viernes por la tarde.
```

```
Traduce ese correo al inglés manteniendo el tono formal.
```

**Qué se ve:** resumen, cambio de registro y traducción con contexto.

### 5. Para pensamiento crítico

```
Dame 3 argumentos a favor y 3 en contra de prohibir los móviles en el instituto.
```

```
¿Qué limitaciones tienes? ¿En qué casos no debería confiar en tu respuesta?
```

```
¿Tu conocimiento tiene fecha de corte? ¿Qué implica eso para temas de actualidad?
```

**Qué se ve:** equilibrio de argumentos y honestidad sobre sus límites. Es el
momento de explicar las **alucinaciones**: la IA puede sonar segura y estar
equivocada.

### 6. Para experimentar con la temperatura

En ⚙, mueve la temperatura y repite la misma pregunta:

- **0.2** → respuestas más predecibles y repetitivas.
- **1.5** → respuestas más creativas y dispersas.

```
Dame un eslogan corto para un proyecto de reciclaje en el instituto.
```

**Qué se ve:** el mismo prompt produce resultados distintos según un parámetro.

### 7. Preguntas desafío (para alumnos)

```
Hazme 5 preguntas tipo test sobre IA generativa, con 4 opciones y la respuesta correcta al final.
```

```
Actúa como profesor y corrígeme este texto: [pegar redacción]. Señala 3 mejoras concretas.
```

```
Explícame la diferencia entre IA generativa y un buscador tradicional, con un ejemplo de cada una.
```

---

## Qué explicar mientras se usa

1. **La respuesta se genera en directo**: no hay una respuesta guardada; llega
   por trozos desde Google.
2. **El historial viaja en cada petición**: por eso el chat «recuerda», y por eso
   recortamos a los últimos 40 mensajes.
3. **La clave es del visitante**: se guarda en su navegador y nunca está en el
   código publicado.
4. **Los errores son normales**: 503 por alta demanda, 404 por modelo retirado,
   429 por cuota. La app los traduce y, si puede, cambia de modelo sola.
5. **La IA no es una fuente**: sirve para explorar y redactar, pero los datos
   importantes hay que verificarlos.

## Preguntas que conviene evitar en la demo

- Comparativas con otros chatbots que no puedes verificar en directo.
- Temas de actualidad muy reciente (puede no tener datos).
- Análisis de imágenes o archivos (esta versión no los envía).
- Preguntas que requieran cifras exactas sin comprobar: mejor pedir «dame una
  estimación y explica los supuestos».
