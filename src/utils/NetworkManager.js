/**
 * ============================================================
 * ARCHIVO: src/utils/NetworkManager.js  (también en public/NetworkManager.js)
 * ROL: Gestion de red inter-nodos con patrones de diseno
 * Actividad 4 — Arquitectura de Software
 * ============================================================
 *
 * PATRONES DE DISENO IMPLEMENTADOS:
 *
 * 1. SINGLETON (ver metodo getInstance)
 *    Garantiza que solo exista UNA instancia de NetworkManager por pestana.
 *    Esto evita multiples canales BroadcastChannel duplicados por nodo,
 *    lo que causaria recibir mensajes repetidos y estados inconsistentes.
 *
 * 2. OBSERVER (ver metodos subscribe / unsubscribe / notifyObservers)
 *    Permite que la UI se suscriba a los eventos de red sin conocer
 *    los detalles de implementacion de BroadcastChannel.
 *    Cuando llega un mensaje, todos los observadores son notificados.
 *
 * TECNOLOGIA DE RED: BroadcastChannel API
 *    API nativa del navegador para comunicacion entre pestanas del
 *    mismo origen. Simula la "red" del sistema distribuido sin backend.
 * ============================================================
 */

// -----------------------------------------------------------------
// TIPOS DE MENSAJES DE RED
// Define el "protocolo de comunicacion" entre los nodos del sistema.
// En un sistema real, esto seria algo como los tipos de paquetes TCP/IP.
// -----------------------------------------------------------------
export const MessageType = {
  NODE_JOINED:     'NODE_JOINED',     // Un nodo se conecto a la red
  NODE_LEFT:       'NODE_LEFT',       // Un nodo abandono la red
  TASK_DISPATCHED: 'TASK_DISPATCHED', // Un nodo despacho una tarea
  TASK_ACCEPTED:   'TASK_ACCEPTED',   // Un nodo acepto procesar la tarea
  TASK_PROGRESS:   'TASK_PROGRESS',   // Reporte de progreso de una tarea
  TASK_COMPLETED:  'TASK_COMPLETED',  // Una tarea fue completada
  HEARTBEAT:       'HEARTBEAT',       // Señal de vida de un nodo
  SYSTEM_EVENT:    'SYSTEM_EVENT',    // Evento general del sistema
};

// =================================================================
// PATRON SINGLETON — Clase NetworkManager
// =================================================================
/**
 * NetworkManager maneja TODA la comunicacion de red del nodo.
 *
 * El patron Singleton garantiza que sin importar cuantas veces se
 * llame a NetworkManager.getInstance(), siempre se devuelve la
 * MISMA instancia de la clase. Esto es critico porque:
 *
 *   - Multiples instancias crearian multiples listeners de BroadcastChannel
 *   - Cada listener recibiria los mensajes por duplicado
 *   - El estado de los contadores y observers se fragmentaria
 *
 * En sistemas distribuidos reales, este patron se aplica en los
 * gestores de conexiones de red (connection pools), en los clientes
 * de bases de datos y en los gestores de configuracion global.
 */
export class NetworkManager {

  // Variable estatica que almacena la unica instancia (Singleton).
  // Se declara como campo privado para que no pueda modificarse desde afuera.
  static #instance = null;

  // Identificador unico del nodo que posee esta instancia
  #nodeId;

  // El canal BroadcastChannel: la "interfaz de red" del nodo.
  // Todos los nodos con el mismo nombre de canal reciben todos los mensajes.
  #channel;

  // Lista de funciones observadoras suscritas a eventos de red (patron Observer)
  #observers = new Set();

  // Estadisticas de actividad del nodo
  #stats = {
    messagesSent:     0,
    messagesReceived: 0,
    tasksCompleted:   0,
    startTime:        Date.now(),
  };

  /**
   * Constructor de la clase.
   * No se debe llamar directamente; usar NetworkManager.getInstance().
   * Si se intenta crear una segunda instancia, se lanza un error para
   * alertar al desarrollador que esta violando el patron Singleton.
   *
   * @param {string} nodeId - ID unico del nodo
   */
  constructor(nodeId) {
    if (NetworkManager.#instance) {
      // Proteccion del Singleton: no permitir una segunda instanciacion directa
      throw new Error(
        '[Singleton] NetworkManager ya fue instanciado. ' +
        'Usa NetworkManager.getInstance() en lugar de new NetworkManager().'
      );
    }

    this.#nodeId = nodeId;

    // Crear el canal BroadcastChannel con nombre fijo.
    // TODOS los nodos (pestanas) usan 'distributed-network' para estar
    // en la misma "red". Es como sintonizar la misma frecuencia de radio.
    this.#channel = new BroadcastChannel('distributed-network');

    // Configurar el receptor de mensajes entrantes del canal de red.
    // Cada vez que otro nodo hace postMessage(), este evento se dispara.
    this.#channel.addEventListener('message', (event) => {
      this.#handleIncomingMessage(event.data);
    });

    console.log(`[NetworkManager - Singleton] Instancia creada para nodo: ${nodeId}`);
  }

  // =================================================================
  // PATRON SINGLETON — Metodo de acceso global (getInstance)
  // =================================================================
  /**
   * Punto de entrada del patron Singleton.
   * Retorna SIEMPRE la misma instancia de NetworkManager por pestana.
   *
   * Logica:
   *   - Primera llamada: crea la instancia y la guarda en #instance.
   *   - Llamadas siguientes: devuelve #instance directamente sin crear nada nuevo.
   *
   * @param {string} [nodeId] - ID del nodo (solo se usa en la primera llamada)
   * @returns {NetworkManager} La unica instancia de la clase
   */
  static getInstance(nodeId) {
    if (!NetworkManager.#instance) {
      // Primera llamada: se instancia la clase normalmente
      NetworkManager.#instance = new NetworkManager(nodeId);
      console.log('[Singleton] Nueva instancia creada — solo ocurrira una vez por pestana.');
    } else {
      // Llamadas posteriores: se reutiliza la instancia existente
      console.log('[Singleton] Instancia existente reutilizada — no se creo un canal duplicado.');
    }
    return NetworkManager.#instance;
  }

  // =================================================================
  // PATRON OBSERVER — Gestion de suscriptores
  // =================================================================

  /**
   * Registra un nuevo observador (suscriptor) de eventos de red.
   *
   * La UI llama a este metodo para indicar que quiere recibir notificaciones
   * cuando lleguen mensajes de la red. El NetworkManager no necesita saber
   * que hara la UI con el mensaje; solo la notifica cuando sea necesario.
   *
   * Esto es el patron Observer: desacoplamiento entre el emisor (NetworkManager)
   * y los receptores (UI, modulos de estadisticas, etc.)
   *
   * @param {Function} callback - Funcion que sera llamada con cada mensaje
   * @returns {Function} La misma funcion (para facilitar la des-suscripcion)
   */
  subscribe(callback) {
    if (typeof callback !== 'function') {
      throw new TypeError('[Observer] El suscriptor debe ser una funcion.');
    }
    this.#observers.add(callback);
    console.log(`[Observer] Nuevo observador registrado. Total activos: ${this.#observers.size}`);
    return callback;
  }

  /**
   * Elimina un observador previamente registrado.
   * Es importante llamar a este metodo cuando un componente se desmonta
   * para evitar memory leaks (fugas de memoria).
   *
   * @param {Function} callback - La funcion a des-suscribir
   */
  unsubscribe(callback) {
    this.#observers.delete(callback);
    console.log(`[Observer] Observador removido. Restantes: ${this.#observers.size}`);
  }

  /**
   * Notifica a TODOS los observadores registrados con el mensaje recibido.
   * Este es el metodo "notify" del patron Observer clasico.
   *
   * El NetworkManager (Subject) no conoce a los observadores individuales;
   * simplemente itera la lista y llama a cada callback con el mensaje.
   *
   * @param {Object} message - El mensaje de red a distribuir
   */
  #notifyObservers(message) {
    this.#observers.forEach((callback) => {
      try {
        callback(message);
      } catch (error) {
        // Si un observer falla, no debe romper a los demas
        console.error('[Observer] Error en un observador:', error);
      }
    });
  }

  // =================================================================
  // RED (BroadcastChannel) — Envio y recepcion de mensajes
  // =================================================================

  /**
   * Maneja mensajes ENTRANTES del canal de red (provenientes de otros nodos).
   * Descarta mensajes propios para evitar que un nodo se notifique a si mismo
   * de sus propios envios (el BroadcastChannel puede enviar al remitente en
   * ciertos navegadores).
   *
   * @param {Object} data - Datos del mensaje recibido por el canal
   */
  #handleIncomingMessage(data) {
    // Ignorar mensajes que este mismo nodo envio
    if (data.senderId === this.#nodeId) return;

    this.#stats.messagesReceived++;

    // Notificar a todos los observadores con el mensaje entrante
    this.#notifyObservers({
      ...data,
      receivedAt: Date.now(),
      direction: 'INCOMING',
    });
  }

  /**
   * Envia (difunde) un mensaje a TODOS los nodos conectados en la red.
   *
   * BroadcastChannel.postMessage() transmite el mensaje a todas las pestanas
   * del mismo origen que esten suscritas al canal 'distributed-network'.
   * Es el equivalente a un "broadcast" en redes de computadoras.
   *
   * Ademas de enviarlo a la red, tambien notifica localmente a la UI
   * del nodo emisor para que pueda registrar el evento en su propio log.
   *
   * @param {string} type - Tipo de mensaje (usar constantes de MessageType)
   * @param {Object} payload - Datos adicionales del mensaje
   * @returns {Object} El mensaje enviado
   */
  broadcast(type, payload = {}) {
    const message = {
      type,
      senderId: this.#nodeId,
      payload,
      timestamp: Date.now(),
      // ID unico del mensaje para trazabilidad
      messageId: `msg_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`,
    };

    // Enviar al canal — llega a TODAS las otras pestanas activas con el mismo canal
    this.#channel.postMessage(message);
    this.#stats.messagesSent++;

    // Notificar localmente (para que la UI del emisor tambien vea el evento)
    this.#notifyObservers({
      ...message,
      direction: 'OUTGOING',
      receivedAt: Date.now(),
    });

    return message;
  }

  /**
   * Desconecta el nodo de la red y limpia todos los recursos.
   * Debe llamarse cuando la pestana se cierra (evento beforeunload).
   */
  disconnect() {
    // Avisar a los demas nodos que este nodo se va
    this.broadcast(MessageType.NODE_LEFT, {
      nodeId: this.#nodeId,
      reason: 'Desconexion normal',
      uptime: Date.now() - this.#stats.startTime,
    });

    // Cerrar el canal de red y limpiar referencias
    this.#channel.close();
    this.#observers.clear();
    NetworkManager.#instance = null;

    console.log(`[NetworkManager] Nodo ${this.#nodeId} desconectado de la red.`);
  }

  // Getters de solo lectura para acceder al estado del nodo
  get nodeId()      { return this.#nodeId; }
  get stats()       { return { ...this.#stats }; }
  get uptime()      { return Date.now() - this.#stats.startTime; }
  get channelName() { return this.#channel.name; }
}

/**
 * Genera un ID legible y unico para el nodo.
 * Formato: "NODE-" seguido de 6 caracteres hexadecimales en mayusculas.
 * Ejemplo: "NODE-A3F2B1"
 *
 * @returns {string} ID unico del nodo
 */
export function generateNodeId() {
  const randomHex = Math.random().toString(16).substring(2, 8).toUpperCase();
  return `NODE-${randomHex}`;
}
