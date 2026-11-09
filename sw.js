/* =========================================================
 * 四象限待办 · Service Worker
 * 作用：让页面能被安装成 APP，并在断网时仍可打开
 * ========================================================= */

const CACHE = "quadrant-v2";

// 首次安装时预缓存核心文件
const PRECACHE = [
  "./index.html",
  "./manifest.json",
  "./icon-192.png",
  "./icon-512.png",
  "./icon-180.png",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE).then((cache) =>
      // 单个失败不影响整体安装
      Promise.all(
        PRECACHE.map((url) =>
          cache.add(url).catch(() => {
            /* 忽略缺失文件 */
          })
        )
      )
    ).then(() => self.skipWaiting())
  );
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

  event.respondWith(
    caches.match(req).then((cached) => {
      if (cached) return cached;

      return fetch(req)
        .then((resp) => {
          // 同源成功响应、或跨域（Tailwind CDN）的 opaque 响应都缓存
          if (resp && (resp.status === 200 || resp.type === "opaque")) {
            const copy = resp.clone();
            caches.open(CACHE).then((c) => c.put(req, copy)).catch(() => {});
          }
          return resp;
        })
        .catch(() => {
          // 离线兜底：导航请求回退到首页
          if (req.mode === "navigate") return caches.match("./index.html");
          return new Response("", { status: 504, statusText: "Offline" });
        });
    })
  );
});
