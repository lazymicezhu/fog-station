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
    return env.ASSETS.fetch(request);
  }
};
