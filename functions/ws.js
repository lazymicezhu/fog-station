export class ChatRoom {
  constructor(state, env) {
    this.state = state;
    this.env = env;
    this.sessions = [];
    this.history = [];
  }

  broadcast(message) {
    this.sessions = this.sessions.filter(ws => {
      if (ws.readyState === 1) {
        ws.send(message);
        return true;
      }
      return false;
    });
  }

  handleMessage(text) {
    let payload;
    try {
      payload = JSON.parse(text);
    } catch (err) {
      return;
    }
    const content = (payload?.text || "").toString().trim();
    if (!content) return;

    const user = (payload?.user || "研究员").toString().slice(0, 32);
    const safeText = content.slice(0, 320);
    const message = {
      type: "chat",
      user,
      text: safeText,
      ts: Date.now()
    };

    this.history.push(message);
    if (this.history.length > 50) {
      this.history.shift();
    }

    this.broadcast(JSON.stringify(message));
  }

  acceptWebSocket(ws) {
    ws.accept();
    // Send recent history to newcomer
    if (this.history.length) {
      ws.send(JSON.stringify({ type: "history", messages: this.history }));
    }

    ws.addEventListener("message", evt => this.handleMessage(evt.data));
    ws.addEventListener("close", () => {
      this.sessions = this.sessions.filter(s => s !== ws);
    });
    ws.addEventListener("error", () => {
      ws.close();
    });

    this.sessions.push(ws);
  }

  async fetch(request) {
    const upgradeHeader = request.headers.get("Upgrade");
    if (!upgradeHeader || upgradeHeader.toLowerCase() !== "websocket") {
      return new Response("Expected websocket", { status: 426 });
    }

    const pair = new WebSocketPair();
    const [client, server] = Object.values(pair);
    this.acceptWebSocket(server);
    return new Response(null, { status: 101, webSocket: client });
  }
}

export default {
  async onRequest(context) {
    const { request, env } = context;
    const id = env.CHAT_ROOM.idFromName("global");
    const stub = env.CHAT_ROOM.get(id);
    return stub.fetch(request);
  }
};

// Named export for Pages Functions detection
export async function onRequest(context) {
  const { request, env } = context;
  const id = env.CHAT_ROOM.idFromName("global");
  const stub = env.CHAT_ROOM.get(id);
  return stub.fetch(request);
}
