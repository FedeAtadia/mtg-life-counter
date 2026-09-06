import { vi } from "vitest";

/**
 * A stand-in for `navigator.serviceWorker`, in the shape the wake lock stub
 * uses: install one, drive it, take it away again. jsdom has no service worker
 * container at all, so the property has to be defined rather than assigned.
 */
export interface ServiceWorkerStub {
  register: ReturnType<typeof vi.fn>;
}

export function stubServiceWorker(
  register: () => Promise<unknown> = () => Promise.resolve({}),
): ServiceWorkerStub {
  const stub = { register: vi.fn(register) };
  Object.defineProperty(navigator, "serviceWorker", {
    value: stub,
    configurable: true,
    writable: true,
  });
  return stub;
}

/** Leaves the browser looking like one that has never heard of workers. */
export function removeServiceWorker() {
  if ("serviceWorker" in navigator) {
    Reflect.deleteProperty(navigator, "serviceWorker");
  }
}
