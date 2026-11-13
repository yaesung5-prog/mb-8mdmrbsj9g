// 나의 시장일보 서비스 워커
// - 같은 사이트의 페이지/파일: 네트워크 우선, 실패하면 마지막으로 받아 둔 사본(오프라인에서도 보이게)
// - 다른 사이트(실시간 시세, 글꼴, 차트 라이브러리): 건드리지 않음
const CACHE = "mb-v1";
const CORE = ["./", "./manifest.webmanifest", "./icon-192.png", "./icon-512.png"];

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE).then((c) => c.addAll(CORE)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;
  if (url.pathname.endsWith("/version.json")) return; // 항상 서버에서 직접
  // 페이지는 매번 서버에 새 판이 있는지 확인(no-cache)하고 받습니다.
  const fresh = req.mode === "navigate" ? fetch(req.url, { cache: "no-cache", credentials: "same-origin" }) : fetch(req);
  event.respondWith(
    fresh
      .then((res) => {
        if (res.ok) {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put(req, copy));
        }
        return res;
      })
      .catch(() => caches.match(req, { ignoreSearch: true }).then((hit) => hit || caches.match("./")))
  );
});
