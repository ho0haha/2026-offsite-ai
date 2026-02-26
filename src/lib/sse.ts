// Simple SSE broadcast manager
type Client = {
  id: string;
  controller: ReadableStreamDefaultController;
};

class SSEBroadcaster {
  private clients: Client[] = [];

  addClient(id: string, controller: ReadableStreamDefaultController) {
    this.clients.push({ id, controller });
  }

  removeClient(id: string) {
    this.clients = this.clients.filter((c) => c.id !== id);
  }

  broadcast(event: string, data: unknown) {
    const message = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
    const encoded = new TextEncoder().encode(message);
    this.clients = this.clients.filter((client) => {
      try {
        client.controller.enqueue(encoded);
        return true;
      } catch {
        return false;
      }
    });
  }

  get clientCount() {
    return this.clients.length;
  }
}

// Global singleton (survives HMR in dev via globalThis)
const globalForSSE = globalThis as unknown as { sseBroadcaster: SSEBroadcaster };
export const sseBroadcaster =
  globalForSSE.sseBroadcaster || new SSEBroadcaster();
globalForSSE.sseBroadcaster = sseBroadcaster;
