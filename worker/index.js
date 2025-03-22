// worker/index.js

// Import the Durable Object class
import { GameRoom } from "./durable_objects/GameRoom.js";

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    // Basic health check endpoint
    if (url.pathname === "/") {
      return new Response("Game Room is running", {
        headers: { "Content-Type": "text/plain" },
      });
    }

    // WebSocket upgrade handler
    if (request.headers.get("Upgrade") === "websocket") {
      // Extract room ID from query param
      const roomId = url.searchParams.get("room") || "default";

      // Get or create the Durable Object for this room
      const roomObjectId = env.GAMEROOM.idFromName(roomId);
      const room = env.GAMEROOM.get(roomObjectId);

      // Forward the request to the Durable Object
      return room.fetch(request);
    }

    // Room status endpoint
    if (url.pathname.startsWith("/room/") && url.pathname.length > 6) {
      const roomId = url.pathname.slice(6); // Extract room ID from URL

      // Get the Durable Object for this room
      const roomObjectId = env.GAMEROOM.idFromName(roomId);
      const room = env.GAMEROOM.get(roomObjectId);

      // Forward the request to get room status
      return room.fetch(request);
    }

    // Not found
    return new Response("Not found", { status: 404 });
  },
};

// Export the Durable Object class
export { GameRoom };
