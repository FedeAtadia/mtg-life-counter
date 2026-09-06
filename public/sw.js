/**
 * The offline copy of the app (PWA-5, PWA-6, PWA-7).
 *
 * Served as-is from `public/`, so it is plain JavaScript with no build step and
 * no imports — a worker is fetched by the browser directly, not bundled.
 *
 * It caches what the app actually asks for rather than a list written down at
 * build time. A precache list has to name every hashed chunk, which means
 * generating it during the build and keeping it correct; caching on demand
 * needs none of that and reaches exactly the files a real visit uses.
 *
 * Bump CACHE when this file changes. The name is what `activate` compares
 * against, so a new name is what clears the copies an older worker left
 * (PWA-7).
 */
const CACHE = "mtg-life-counter-v1";

// Take over from the previous worker rather than waiting for every tab to
// close, which on a phone can be days.
self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const names = await caches.keys();
      await Promise.all(
        names.filter((name) => name !== CACHE).map((name) => caches.delete(name)),
      );
      await self.clients.claim();
    })(),
  );
});

/**
 * Answer from the copy, then refresh it behind the game (PWA-6).
 *
 * A game never waits on the network this way, and the next launch has whatever
 * the refresh brought back. The alternative — network first — would make every
 * launch wait out a timeout on the bad hotel wifi this is most useful on.
 */
self.addEventListener("fetch", (event) => {
  const { request } = event;

  // Only our own files, and only reads. A POST is not ours to replay, and
  // another origin's response is not ours to keep.
  if (request.method !== "GET") return;
  if (new URL(request.url).origin !== self.location.origin) return;

  event.respondWith(
    (async () => {
      const cache = await caches.open(CACHE);
      const cached = await cache.match(request);

      const fromNetwork = fetch(request)
        .then((response) => {
          // Opaque and error responses are not worth keeping: caching one
          // would serve the failure back for as long as the cache lives.
          if (response.ok && response.type === "basic") {
            void cache.put(request, response.clone());
          }
          return response;
        })
        .catch(() => null);

      if (cached) {
        // Kick the refresh off but do not wait for it — that is the whole
        // point. waitUntil keeps the worker alive long enough to finish.
        event.waitUntil(fromNetwork);
        return cached;
      }

      const response = await fromNetwork;
      if (response) return response;

      // Nothing cached and nothing reachable. A navigation can still be
      // answered with whatever shell we hold, which is what makes a cold
      // launch with no signal deal a board rather than a browser error page.
      if (request.mode === "navigate") {
        const shell = await cache.match("/");
        if (shell) return shell;
      }

      return Response.error();
    })(),
  );
});
