/* Simple offline cache for Operations HQ */
var CACHE = "ops-hq-v1";
var ASSETS = ["./", "./index.html", "./app.js", "./manifest.json"];

self.addEventListener("install", function (e) {
  e.waitUntil(caches.open(CACHE).then(function (c) { return c.addAll(ASSETS); }));
  self.skipWaiting();
});
self.addEventListener("activate", function (e) {
  e.waitUntil(caches.keys().then(function (keys) {
    return Promise.all(keys.map(function (k) { if (k !== CACHE) return caches.delete(k); }));
  }));
  self.clients.claim();
});
self.addEventListener("fetch", function (e) {
  /* never cache Google's API/auth calls */
  if (e.request.url.indexOf("googleapis.com") > -1 || e.request.url.indexOf("accounts.google.com") > -1) return;
  e.respondWith(
    caches.match(e.request).then(function (hit) {
      return hit || fetch(e.request).then(function (resp) {
        if (e.request.method === "GET" && resp.status === 200) {
          var copy = resp.clone(); caches.open(CACHE).then(function (c) { c.put(e.request, copy); });
        }
        return resp;
      }).catch(function () { return caches.match("./index.html"); });
    })
  );
});
