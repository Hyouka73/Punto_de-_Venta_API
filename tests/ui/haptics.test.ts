import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { triggerHaptic } from '@/ui/utils/haptics';

describe('Respuesta Háptica de Mostrador (F2.1)', () => {
  const originalNavigator = globalThis.navigator;

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    Object.defineProperty(globalThis, 'navigator', {
      value: originalNavigator,
      configurable: true,
      writable: true,
    });
  });

  it('debe invocar navigator.vibrate(50) cuando está disponible en Android/PWA', () => {
    const vibrateMock = vi.fn();
    Object.defineProperty(globalThis, 'navigator', {
      value: { vibrate: vibrateMock },
      configurable: true,
      writable: true,
    });

    triggerHaptic(50);
    expect(vibrateMock).toHaveBeenCalledWith(50);
  });

  it('debe degradarse silenciosamente si navigator.vibrate no está soportado (iOS/Desktop)', () => {
    Object.defineProperty(globalThis, 'navigator', {
      value: {},
      configurable: true,
      writable: true,
    });

    expect(() => triggerHaptic(50)).not.toThrow();
  });

  it('debe tolerar excepciones sin interrumpir la experiencia de usuario', () => {
    Object.defineProperty(globalThis, 'navigator', {
      value: {
        vibrate: () => {
          throw new Error('Permiso denegado');
        },
      },
      configurable: true,
      writable: true,
    });

    expect(() => triggerHaptic(50)).not.toThrow();
  });
});
