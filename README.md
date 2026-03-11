# Sistema Distribuido de Procesamiento de Tareas

**Actividad 4 — Arquitectura de Software**  
Simulacion academica de un sistema distribuido implementado en el frontend, sin necesidad de backend, utilizando APIs nativas del navegador y patrones de diseno clasicos.

---

## Descripcion General

Este proyecto simula el comportamiento de un **sistema distribuido de procesamiento de tareas** directamente en el navegador. Cada pestaña abierta representa un **nodo independiente** de la red. Los nodos se comunican en tiempo real, delegan trabajo a hilos secundarios y aplican patrones de diseno reconocidos en la industria.

El objetivo es academico: demostrar, en codigo ejecutable y sin infraestructura de servidor, conceptos fundamentales de sistemas distribuidos como:

- Comunicacion entre nodos via mensajeria
- Procesamiento concurrente (multihilo)
- Patrones de diseno aplicados a la arquitectura del software

---

## Conceptos Demostrados

### Nodos de Red
Cada pestaña del navegador actua como un nodo independiente del sistema. Al abrir la misma URL en varias pestanas, se forma una red de nodos capaz de enviarse mensajes entre si en tiempo real.

### Comunicacion de Red — BroadcastChannel API
La comunicacion entre nodos se implementa con la API nativa `BroadcastChannel` del navegador. Todos los nodos suscritos al mismo canal (`distributed-network`) reciben cualquier mensaje que otro nodo publique, simulando un sistema de mensajeria distribuida.

### Concurrencia — Web Workers (Hilos)
Las tareas de calculo intensivo se delegan a un **Web Worker** (`public/worker.js`), que corre en un hilo separado del hilo principal (Main Thread). Esto garantiza que la interfaz grafica nunca se bloquee mientras se procesan operaciones costosas.

### Heartbeat
Mecanismo de deteccion de vida: un nodo envia una senal periodica a la red para indicar que sigue activo. En sistemas distribuidos reales se usa para detectar fallos y redistribuir tareas.

---

## Patrones de Diseno Implementados

### Singleton — `src/utils/NetworkManager.js`

Garantiza que cada nodo (pestaña) tenga **una unica instancia** de `NetworkManager`, y por tanto un unico canal `BroadcastChannel`. Sin este patron, multiples modulos podrian crear conexiones duplicadas, causando mensajes repetidos e inconsistencias de estado.

**Implementacion clave:**
```js
static getInstance(nodeId) {
  if (!NetworkManager.#instance) {
    NetworkManager.#instance = new NetworkManager(nodeId);
  }
  return NetworkManager.#instance;
}
```

### Observer — `src/utils/NetworkManager.js`

Permite que la interfaz grafica (y cualquier otro modulo) se **suscriba** a los eventos de red sin conocer los detalles internos de `BroadcastChannel`. Cuando llega un mensaje, el `NetworkManager` notifica a todos los observadores registrados automaticamente.

**Implementacion clave:**
```js
// Suscripcion (registro del observer)
network.subscribe((message) => {
  // La UI reacciona aqui sin saber como llego el mensaje
});

// Notificacion interna del NetworkManager
#notifyObservers(message) {
  this.#observers.forEach(callback => callback(message));
}
```

---

## Estructura del Proyecto

```
sistema-distribuido-arquitectura/
├── public/
│   ├── worker.js          # Web Worker — hilo secundario de procesamiento
│   └── NetworkManager.js  # Copia del modulo de red (accesible por el browser)
├── src/
│   ├── pages/
│   │   └── index.astro    # Pagina principal: UI y logica del cliente
│   └── utils/
│       └── NetworkManager.js  # Modulo con patrones Singleton y Observer
├── astro.config.mjs
└── package.json
```

### Descripcion de archivos clave

| Archivo | Rol |
|---|---|
| `src/pages/index.astro` | UI principal del dashboard. Contiene el HTML, CSS y el script del cliente con todos los patrones. |
| `src/utils/NetworkManager.js` | Implementa el canal BroadcastChannel con los patrones Singleton y Observer. |
| `public/worker.js` | Web Worker que ejecuta el calculo intensivo en un hilo separado. |
| `public/NetworkManager.js` | Copia del modulo de red servida como asset estatico para que el browser pueda importarla. |

---

## Flujo de Ejecucion

```
[Nueva pestaña abierta]
        |
        v
1. generateNodeId()          --> Se genera un ID unico para el nodo (ej: NODE-A3F2B1)
        |
        v
2. NetworkManager.getInstance()  --> SINGLETON: se crea (o reutiliza) la instancia unica
        |
        v
3. new Worker('/worker.js')  --> Se crea el hilo secundario (Web Worker)
        |
        v
4. network.subscribe(callback)   --> OBSERVER: la UI se suscribe a eventos de red
        |
        v
5. network.broadcast(NODE_JOINED)  --> Se anuncia la conexion a todos los nodos

--- Al hacer clic en "Despachar Tarea Pesada" ---

6. network.broadcast(TASK_DISPATCHED)  --> Todos los nodos reciben el anuncio de la tarea
        |
        v
7. worker.postMessage({ taskId, iterations })  --> El calculo se envia al hilo secundario
        |
        v
8. Worker ejecuta 50M iteraciones sin bloquear la UI
        |
        v
9. Worker envia progreso y resultado via postMessage()  --> Main Thread actualiza la UI
        |
        v
10. network.broadcast(TASK_COMPLETED)  --> Resultado disponible para toda la red
```

---

## Instalacion y Ejecucion

### Requisitos
- Node.js >= 22.12.0
- npm

### Pasos

```bash
# 1. Instalar dependencias
npm install

# 2. Iniciar el servidor de desarrollo
npm run dev

# 3. Abrir en el navegador
# http://localhost:4321/
```

Para ver la comunicacion entre nodos, abrir la misma URL en **dos o mas pestanas** del navegador.

### Comandos disponibles

| Comando | Descripcion |
|---|---|
| `npm run dev` | Inicia el servidor de desarrollo en `localhost:4321` |
| `npm run build` | Genera el sitio estatico en `./dist/` |
| `npm run preview` | Previsualiza el build de produccion |

---

## Tecnologias Utilizadas

| Tecnologia | Version | Uso |
|---|---|---|
| [Astro](https://astro.build) | ^6.0.2 | Framework de renderizado estatico |
| BroadcastChannel API | Nativa | Comunicacion entre pestanas (simulacion de red) |
| Web Workers API | Nativa | Procesamiento en hilo secundario (concurrencia) |
| JavaScript ES Modules | Nativo | Modularizacion del codigo (`import/export`) |
| CSS Variables | Nativo | Sistema de diseno con tokens |

---

## Consideraciones Academicas

- **No requiere backend**: toda la logica corre en el navegador con APIs estandar.
- **Sin frameworks de UI**: la interfaz esta construida con HTML y CSS vanilla para mayor claridad pedagogica.
- **Comentarios explicativos**: cada patron de diseno y concepto de concurrencia esta anotado directamente en el codigo fuente con comentarios orientados a la comprension academica.
- **Compatibilidad**: BroadcastChannel y Web Workers son compatibles con todos los navegadores modernos (Chrome, Firefox, Edge, Safari).

---

## Autor

**Ms0910** — Actividad 4, Arquitectura de Software
