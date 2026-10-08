/**
 * Disparador de respuesta háptica ultra-rápida (50ms) para terminales táctiles (Android).
 * En iOS o navegadores de escritorio se degrada silenciosamente sin errores.
 */
export function triggerHaptic(durationMs: number = 50): void {
  try {
    if (typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function') {
      navigator.vibrate(durationMs);
    }
  } catch {
    // Ignorado de forma segura
  }
}
