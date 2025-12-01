import handler, { onRequest as onWsRequest, ChatRoom as ChatRoomImpl } from "./functions/ws.js";
import manifestJson from "__STATIC_CONTENT_MANIFEST";

// Export Durable Object class so Wrangler can bind it
export class ChatRoom extends ChatRoomImpl {}

// Module Worker entry: route /ws to chat, others to static assets
export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    if (url.pathname === "/ws") {
      return onWsRequest({ request, env, ctx });
    }
    try {
      return await serveStaticAsset(request, env);
    } catch (err) {
      console.error("Static asset error", err);
      return new Response("Internal Error", { status: 500 });
    }
  }
};

// Optimized static asset handler with caching
async function serveStaticAsset(request, env) {
  const url = new URL(request.url);
  let path = decodeURIComponent(url.pathname);
  if (path === "/") path = "/index.html";
  if (path.endsWith("/")) path = path + "index.html";

  // Check cache first
  const cache = caches.default;
  let response = await cache.match(request);
  if (response) return response;

  // Manifest comes from bundled import in module Worker
  let manifest = {};
  if (manifestJson) {
    manifest = typeof manifestJson === "string" ? JSON.parse(manifestJson) : manifestJson;
  } else if (env.__STATIC_CONTENT_MANIFEST) {
    manifest = JSON.parse(env.__STATIC_CONTENT_MANIFEST);
  }

  const candidates = [
    path.slice(1),
    path.startsWith("/") ? path.slice(1) : path,
    path.replace(/^\.\//, "")
  ];

  let key = null;
  for (const c of candidates) {
    if (manifest[c]) { key = manifest[c]; break; }
  }

  // SPA fallback：未命中静态资源则返回首页
  if (!key) {
    const indexKey = manifest["index.html"];
    if (indexKey) {
      const asset = await env.__STATIC_CONTENT.get(indexKey, "arrayBuffer");
      const headers = new Headers({
        "Content-Type": "text/html; charset=utf-8",
        "Cache-Control": "public, max-age=0, must-revalidate" // HTML不缓存
      });
      return new Response(asset, { headers });
    }
    return new Response("Not Found", { status: 404 });
  }

  const asset = await env.__STATIC_CONTENT.get(key, "arrayBuffer");
  if (!asset) return new Response("Not Found", { status: 404 });

  const contentType = getContentType(path);
  const headers = new Headers();
  if (contentType) headers.set("Content-Type", contentType);

  // 设置缓存策略
  const cacheControl = getCacheControl(path);
  headers.set("Cache-Control", cacheControl);

  // 添加 ETag
  const etag = await generateETag(asset);
  headers.set("ETag", etag);

  // 检查 If-None-Match
  const ifNoneMatch = request.headers.get("If-None-Match");
  if (ifNoneMatch && ifNoneMatch === etag) {
    return new Response(null, { status: 304, headers });
  }

  response = new Response(asset, { headers });

  // 缓存静态资源（HTML除外）
  if (!path.endsWith(".html")) {
    await cache.put(request, response.clone());
  }

  return response;
}

function getContentType(path) {
  const ext = path.split(".").pop()?.toLowerCase();
  const mimeTypes = {
    // Text
    html: "text/html; charset=utf-8",
    css: "text/css; charset=utf-8",
    xml: "text/xml; charset=utf-8",
    txt: "text/plain; charset=utf-8",
    // JavaScript
    js: "application/javascript; charset=utf-8",
    mjs: "application/javascript; charset=utf-8",
    json: "application/json; charset=utf-8",
    // Images
    png: "image/png",
    jpg: "image/jpeg",
    jpeg: "image/jpeg",
    gif: "image/gif",
    svg: "image/svg+xml",
    webp: "image/webp",
    ico: "image/x-icon",
    // Fonts
    woff: "font/woff",
    woff2: "font/woff2",
    ttf: "font/ttf",
    otf: "font/otf",
    eot: "application/vnd.ms-fontobject",
    // Media
    mp3: "audio/mpeg",
    mp4: "video/mp4",
    webm: "video/webm",
    // Archives
    zip: "application/zip",
    // Others
    pdf: "application/pdf",
  };
  return mimeTypes[ext] || "application/octet-stream";
}

// 缓存控制策略
function getCacheControl(path) {
  const ext = path.split(".").pop()?.toLowerCase();

  // HTML: 不缓存，每次验证
  if (ext === "html") {
    return "public, max-age=0, must-revalidate";
  }

  // 静态资源（JS, CSS, 图片, 字体）: 长期缓存
  if (["js", "mjs", "css", "png", "jpg", "jpeg", "gif", "svg", "webp", "woff", "woff2", "ttf", "otf"].includes(ext)) {
    return "public, max-age=31536000, immutable"; // 1年
  }

  // JSON数据: 短期缓存
  if (ext === "json") {
    return "public, max-age=300"; // 5分钟
  }

  // 默认: 中等缓存
  return "public, max-age=3600"; // 1小时
}

// 生成 ETag
async function generateETag(content) {
  const buffer = content instanceof ArrayBuffer ? content : await content.arrayBuffer();
  const hashBuffer = await crypto.subtle.digest("SHA-256", buffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray.map(b => b.toString(16).padStart(2, "0")).join("");
  return `"${hashHex.substring(0, 16)}"`;
}
