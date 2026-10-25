/* Service worker semplice di Russian Coach.
 * - Pagine e risorse statiche: rete prima, cache come ripiego (l'app funziona offline dopo la prima visita).
 * - /data/*.json: cache prima con aggiornamento in background.
 * - Al primo avvio l'app manda un messaggio "warm" con l'elenco di pagine e dati: il service worker li scarica
 *   (e con essi i file /_next/static citati dall'HTML), cosi' l'app funziona offline anche per le pagine non ancora visitate.
 * Nessuna API: tutto e' statico. Cambiare VERSION per invalidare le cache. */
const VERSION = "rc-v2";
const CORE = ["./", "./manifest.webmanifest", "./icon.svg"];

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(VERSION).then((c) => c.addAll(CORE)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== VERSION).map((k) => caches.delete(k)))).then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;

  const isData = url.pathname.includes("/data/");
  if (isData) {
    event.respondWith(
      caches.open(VERSION).then(async (cache) => {
        const cached = await cache.match(req);
        const fresh = fetch(req).then((res) => {
          if (res.ok) cache.put(req, res.clone());
          return res;
        }).catch(() => cached);
        return cached || fresh;
      }),
    );
    return;
  }

  event.respondWith(
    fetch(req)
      .then((res) => {
        if (res.ok) {
          const copy = res.clone();
          caches.open(VERSION).then((c) => c.put(req, copy));
        }
        return res;
      })
      .catch(() => caches.match(req).then((hit) => hit || (req.mode === "navigate" ? caches.match("./") : undefined))),
  );
});

async function warm(urls) {
  const cache = await caches.open(VERSION);
  const assets = new Set();
  for (const u of urls) {
    try {
      const res = await fetch(u, { cache: "reload" });
      if (!res.ok) continue;
      await cache.put(u, res.clone());
      if ((res.headers.get("content-type") || "").includes("text/html")) {
        const html = await res.text();
        for (const m of html.matchAll(/["'(]([^"'()\s\\]*\/_next\/static\/[^"'()\s\\]+)/g)) assets.add(m[1]);
      }
    } catch (e) {
      /* offline o file mancante: si riprova al prossimo avvio */
    }
  }
  for (const a of assets) {
    try {
      if (await cache.match(a)) continue;
      const r = await fetch(a);
      if (r.ok) await cache.put(a, r);
    } catch (e) {
      /* ignorato */
    }
  }
}

self.addEventListener("message", (event) => {
  if (event.data && event.data.type === "warm" && Array.isArray(event.data.urls)) event.waitUntil(warm(event.data.urls));
});
