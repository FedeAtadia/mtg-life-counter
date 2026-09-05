"use client";

import { useEffect, useState } from "react";

/**
 * What the browser is doing about the screen going to sleep.
 *
 * - `held` — a screen wake lock is in hand and the phone stays lit.
 * - `unavailable` — no Wake Lock API here at all: iOS before Safari 16.4, or
 *   any insecure origin, where `navigator.wakeLock` simply is not there.
 * - `refused` — the API answered no. Battery saver is the usual reason.
 */
export type WakeLockStatus = "held" | "unavailable" | "refused";

/**
 * Keeps the screen lit while the page is on screen.
 *
 * A phone lying face-up in the middle of the table is not being touched, so it
 * dims and locks in the middle of somebody's turn. A wake lock is the only
 * thing a page can do about that, and the browser hands it back every time the
 * page is hidden — so this asks again on the way back rather than once, at
 * mount, which would keep the screen lit only until the phone was first picked
 * up (AWAKE-2).
 */
export function useWakeLock(): WakeLockStatus {
  // Starts pessimistic and is corrected after mount, so nothing here has to
  // read `navigator` during a render the static export also does.
  const [status, setStatus] = useState<WakeLockStatus>("unavailable");

  useEffect(() => {
    if (!("wakeLock" in navigator)) return;

    let sentinel: WakeLockSentinel | null = null;
    let asking = false;
    let gone = false;

    const acquire = async () => {
      // Asking while hidden is refused by every browser that implements this,
      // and asking twice over would leak the first sentinel.
      if (gone || asking) return;
      if (document.visibilityState !== "visible") return;
      if (sentinel && !sentinel.released) return;

      asking = true;
      try {
        const held = await navigator.wakeLock.request("screen");
        // The board can go away while the request is still in flight, which
        // would otherwise leave a lock held with nobody left to release it.
        if (gone) {
          await held.release();
          return;
        }
        sentinel = held;
        setStatus("held");
      } catch {
        // Battery saver, a policy, an origin the browser does not trust. All
        // of them mean the same thing here: the screen will dim, and the game
        // carries on. Nothing is retried until the page next becomes visible.
        setStatus("refused");
      } finally {
        asking = false;
      }
    };

    void acquire();
    document.addEventListener("visibilitychange", acquire);

    return () => {
      gone = true;
      document.removeEventListener("visibilitychange", acquire);
      void sentinel?.release().catch(() => {});
      sentinel = null;
    };
  }, []);

  return status;
}
