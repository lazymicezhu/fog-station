import handler, { onRequest as onWsRequest, ChatRoom as ChatRoomImpl } from "./functions/ws.js";

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

// Minimal static asset handler for Worker Sites (uses __STATIC_CONTENT bindings)
async function serveStaticAsset(request, env) {
  const url = new URL(request.url);
  let path = decodeURIComponent(url.pathname);
  if (path === "/") path = "/index.html";
  if (path.endsWith("/")) path = path + "index.html";

  const manifest = env.__STATIC_CONTENT_MANIFEST ? JSON.parse(env.__STATIC_CONTENT_MANIFEST) : {};
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
      return new Response(asset, { headers: { "Content-Type": "text/html; charset=utf-8" } });
    }
    return new Response("Not Found", { status: 404 });
  }

  const asset = await env.__STATIC_CONTENT.get(key, "arrayBuffer");
  if (!asset) return new Response("Not Found", { status: 404 });

  const contentType = getContentType(path);
  const headers = new Headers();
  if (contentType) headers.set("Content-Type", contentType);
  return new Response(asset, { headers });
}

function getContentType(path) {
  const ext = path.split(".").pop()?.toLowerCase();
  switch (ext) {
    case "html": return "text/html; charset=utf-8";
    case "js": return "application/javascript; charset=utf-8";
    case "mjs": return "application/javascript; charset=utf-8";
    case "css": return "text/css; charset=utf-8";
    case "json": return "application/json; charset=utf-8";
    case "png": return "image/png";
    case "jpg":
    case "jpeg": return "image/jpeg";
    case "gif": return "image/gif";
    case "svg": return "image/svg+xml";
    case "webp": return "image/webp";
    case "woff": return "font/woff";
    case "woff2": return "font/woff2";
    default: return "application/octet-stream";
  }
}
