import { vi } from "vitest";

/**
 * A stand-in for `navigator.wakeLock`, which jsdom does not implement.
 *
 * The real thing hands back a sentinel the page holds on to, and takes the
 * lock away again whenever the page is hidden. Both halves are faked here:
 * the tests can see what was asked for, and what was released.
 */
export interface FakeSentinel {
  released: boolean;
  release: () => Promise<void>;
}

export interface FakeWakeLock {
  request: ReturnType<typeof vi.fn>;
  /** Every sentinel handed out, oldest first. */
  sentinels: FakeSentinel[];
  latest: () => FakeSentinel | undefined;
}

/**
 * Installs the stub. `refuse` is the browser saying no — battery saver, an
 * insecure origin — which is a rejected promise rather than an exception.
 */
/** The fake browser's own listener, so it can be taken off again. */
let dropOnHide: (() => void) | null = null;

export function stubWakeLock({ refuse = false } = {}): FakeWakeLock {
  const sentinels: FakeSentinel[] = [];

  const request = vi.fn(async () => {
    if (refuse) throw new DOMException("refused", "NotAllowedError");
    const sentinel: FakeSentinel = {
      released: false,
      release: vi.fn(async () => {
        sentinel.released = true;
      }),
    };
    sentinels.push(sentinel);
    return sentinel;
  });

  Object.defineProperty(navigator, "wakeLock", {
    value: { request },
    configurable: true,
    writable: true,
  });

  // What every real implementation does, and the reason the page has to ask
  // again on the way back: hiding the page takes the lock away. Registered
  // before the page's own listener, so it has already happened by the time the
  // page hears about it.
  dropOnHide = () => {
    if (document.visibilityState === "visible") return;
    for (const sentinel of sentinels) sentinel.released = true;
  };
  document.addEventListener("visibilitychange", dropOnHide);

  return { request, sentinels, latest: () => sentinels.at(-1) };
}

/** Back to a browser that has never heard of the Wake Lock API. */
export function removeWakeLock(): void {
  if (dropOnHide) document.removeEventListener("visibilitychange", dropOnHide);
  dropOnHide = null;
  Reflect.deleteProperty(navigator, "wakeLock");
}

export function setVisibility(state: "visible" | "hidden"): void {
  Object.defineProperty(document, "visibilityState", {
    value: state,
    configurable: true,
  });
}

/** The page being hidden or shown, as the browser reports it. */
export function visibilityChanges(state: "visible" | "hidden"): void {
  setVisibility(state);
  document.dispatchEvent(new Event("visibilitychange"));
}
