/**
 * ============================================================
 * ARCHIVO: public/worker.js
 * ROL: Web Worker — Hilo Secundario de Procesamiento
 * Actividad 4 — Arquitectura de Software
 * ============================================================
 *
 * CONCEPTO DE HILO (Thread):
 * Los navegadores son single-threaded por defecto. Todo el JavaScript
 * (UI, eventos, logica) corre en el "Main Thread" (hilo principal).
 * Si ejecutamos un calculo costoso en el Main Thread, la UI se congela.
 *
 * Un Web Worker crea un HILO SEPARADO en el navegador.
 * Este archivo corre en ese hilo secundario, completamente aislado:
 *   - No tiene acceso al DOM
 *   - Se comunica con el hilo principal SOLO por mensajes (postMessage)
 *   - El hilo principal NUNCA se bloquea mientras el Worker trabaja
 *
 * ANALOGIA CON SISTEMAS DISTRIBUIDOS:
 * En un sistema distribuido real, esto equivale a un "worker node"
 * que recibe una tarea del "master node" (hilo principal), la procesa
 * de forma independiente y devuelve el resultado al terminar.
 * ============================================================
 */

/**
 * Escucha mensajes enviados desde el hilo principal.
 * El hilo principal usa: worker.postMessage({ ... })
 * El Worker responde con: self.postMessage({ ... })
 *
 * La comunicacion entre hilos ocurre EXCLUSIVAMENTE mediante el paso
 * de mensajes (message passing), lo que garantiza aislamiento de
 * memoria entre el Main Thread y el Worker Thread.
 */
self.addEventListener('message', (event) => {
  const { taskId, payload } = event.data;

  // Notificar al hilo principal que el Worker acepto la tarea.
  // En este momento, el hilo principal sigue ejecutandose normalmente;
  // la UI no esta bloqueada en absoluto.
  self.postMessage({
    type: 'TASK_STARTED',
    taskId,
    message: `Worker activo para tarea ${taskId}. Hilo principal no bloqueado.`,
    timestamp: Date.now(),
  });

  // -----------------------------------------------------------------
  // SIMULACION DE TAREA PESADA (CPU-Intensive)
  //
  // Esto simula el tipo de calculo que en un sistema distribuido real
  // podria ser: procesamiento de un dataset grande, compresion,
  // renderizado, criptografia, mineria de datos, etc.
  //
  // Si este bucle corriera en el Main Thread (hilo principal),
  // congelaria la interfaz completamente durante varios segundos.
  // Al correr en el Worker, el usuario ni siquiera lo nota.
  // -----------------------------------------------------------------
  const result = realizarCalculoIntensivo(payload?.iterations || 50_000_000);

  // Notificar al hilo principal que la tarea fue completada
  self.postMessage({
    type: 'TASK_COMPLETED',
    taskId,
    result,
    message: `Tarea ${taskId} completada. Resultado: ${result.toLocaleString()} operaciones.`,
    timestamp: Date.now(),
  });
});

/**
 * Funcion de calculo intensivo que simula procesamiento distribuido.
 * Corre en el hilo secundario (Worker), nunca en el Main Thread.
 *
 * Se reporta el progreso cada 10 millones de iteraciones para que
 * el hilo principal pueda actualizar la barra de progreso en la UI.
 *
 * @param {number} iteraciones - Numero de iteraciones del calculo
 * @returns {number} - Resultado del computo (acumulador matematico)
 */
function realizarCalculoIntensivo(iteraciones) {
  let acumulador = 0;
  const inicio = Date.now();

  for (let i = 1; i <= iteraciones; i++) {
    // Operacion matematica no trivial para evitar optimizaciones del motor JS.
    // En un caso real seria algo como: procesamiento de un pixel, una fila de
    // base de datos, un paquete de red, etc.
    acumulador += Math.sqrt(i) * Math.sin(i * 0.0001);

    // Cada 10 millones de iteraciones, reportar progreso al hilo principal.
    // Esto demuestra que ambos hilos se comunican mientras trabajan en paralelo.
    if (i % 10_000_000 === 0) {
      const progreso = Math.round((i / iteraciones) * 100);
      self.postMessage({
        type: 'TASK_PROGRESS',
        progress: progreso,
        message: `Procesando: ${progreso}% completado (${i.toLocaleString()} / ${iteraciones.toLocaleString()} ops)`,
        timestamp: Date.now(),
      });
    }
  }

  const tiempoTotal = Date.now() - inicio;
  console.log(`[Worker Thread] Calculo completado en ${tiempoTotal}ms`);

  return Math.round(Math.abs(acumulador));
}
