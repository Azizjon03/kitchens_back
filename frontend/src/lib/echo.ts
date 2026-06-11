import Echo from 'laravel-echo';
import Pusher from 'pusher-js';

// laravel-echo uses the Pusher protocol client under the hood (Reverb is
// Pusher-protocol compatible), so it must be available on `window`.
(window as unknown as { Pusher: typeof Pusher }).Pusher = Pusher;

let echoInstance: Echo<'reverb'> | null = null;

/**
 * Lazily-created Echo singleton configured for the Laravel Reverb server.
 * The auth token is read from localStorage when the instance is created
 * (i.e. after login), so the private broadcasting auth endpoint succeeds.
 */
export function getEcho(): Echo<'reverb'> {
  if (echoInstance) return echoInstance;

  const scheme = (import.meta.env.VITE_REVERB_SCHEME as string) || 'http';

  echoInstance = new Echo<'reverb'>({
    broadcaster: 'reverb',
    key: (import.meta.env.VITE_REVERB_APP_KEY as string) || 'kitchens-key',
    wsHost: (import.meta.env.VITE_REVERB_HOST as string) || window.location.hostname,
    wsPort: Number(import.meta.env.VITE_REVERB_PORT ?? 8080),
    wssPort: Number(import.meta.env.VITE_REVERB_PORT ?? 8080),
    forceTLS: scheme === 'https',
    enabledTransports: ['ws', 'wss'],
    authEndpoint: '/api/broadcasting/auth',
    auth: {
      headers: {
        Authorization: `Bearer ${localStorage.getItem('access_token') ?? ''}`,
      },
    },
  });

  return echoInstance;
}

/** Disconnect and reset the singleton (e.g. on logout). */
export function resetEcho(): void {
  if (echoInstance) {
    echoInstance.disconnect();
    echoInstance = null;
  }
}

/** Private channel name shared by the kitchen display and waiter screen. */
export function kitchenChannel(companyId: number, branchId: number): string {
  return `kitchen.${companyId}.${branchId}`;
}
