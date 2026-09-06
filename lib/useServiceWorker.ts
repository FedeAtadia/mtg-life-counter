"use client";

import { useEffect, useState } from "react";

/**
 * Where the worker is served from.
 *
 * A worker only controls the directory it is served from and below, so this has
 * to sit at the root or most of the app would go uncached.
 */
export const SERVICE_WORKER_PATH = "/sw.js";

/**
 * Whether there is a worker looking after an offline copy.
 *
 * - `registered` — the worker is in place; a later visit with no signal works.
 * - `unavailable` — no service worker support here, or a development server,
 *   where a cached shell would only serve back stale code.
 * - `refused` — the browser said no. An insecure origin and blocked site data
 *   are the usual reasons.
 */
export type ServiceWorkerStatus = "registered" | "unavailable" | "refused";

/**
 * Registers the worker that keeps a copy of the app (PWA-5).
 *
 * Best-effort in the same way the wake lock is: the game does not depend on it,
 * so a browser without workers or one that refuses plays exactly as it did
 * before (PWA-8).
 */
export function useServiceWorker(): ServiceWorkerStatus {
  // Starts pessimistic and is corrected after mount, so nothing here reads
  // `navigator` during a render the static export also does.
  const [status, setStatus] = useState<ServiceWorkerStatus>("unavailable");

  useEffect(() => {
    // Never on a dev server: a cached shell there serves yesterday's code back
    // to the person editing it, which is a genuinely baffling afternoon
    // (PWA-9).
    if (process.env.NODE_ENV !== "production") return;
    if (!("serviceWorker" in navigator)) return;

    let gone = false;
    navigator.serviceWorker
      .register(SERVICE_WORKER_PATH)
      .then(() => {
        if (!gone) setStatus("registered");
      })
      .catch(() => {
        // An insecure origin, or a browser told to block site data. Losing the
        // offline copy is acceptable; losing the game is not.
        if (!gone) setStatus("refused");
      });

    return () => {
      gone = true;
    };
  }, []);

  return status;
}
