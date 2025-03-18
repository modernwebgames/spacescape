import { GameLogic } from "../game/GameLogic.js";

/**
 * Manages all game rooms
 */
export class RoomManager {
  constructor() {
    this.rooms = {};
    this.clients = {}; // clientId -> { socket, room }
  }

  /**
   * Creates a new game room
   */
  createRoom(roomId) {
    if (this.rooms[roomId]) {
      return null;
    }

    this.rooms[roomId] = new GameLogic(roomId);
    return this.rooms[roomId];
  }

  /**
   * Gets an existing room or creates a new one
   */
  getOrCreateRoom(roomId) {
    return this.rooms[roomId] || this.createRoom(roomId);
  }

  /**
   * Gets a room by ID
   */
  getRoom(roomId) {
    return this.rooms[roomId];
  }

  /**
   * Associates a client with a room
   */
  registerClient(clientId, socket, roomId) {
    this.clients[clientId] = {
      socket,
      room: roomId,
    };
  }

  /**
   * Removes a client from its room
   */
  removeClient(clientId) {
    const client = this.clients[clientId];
    if (!client) return false;

    const roomId = client.room;
    const room = this.rooms[roomId];

    if (room) {
      // Find the player nickname associated with this client
      let playerToRemove = null;
      Object.entries(room.room.players).forEach(([nickname, player]) => {
        if (player.clientId === clientId) {
          playerToRemove = nickname;
        }
      });

      // Remove the player if found
      if (playerToRemove) {
        room.removePlayer(playerToRemove);
      }

      // Delete the room if it's empty
      if (Object.keys(room.room.players).length === 0) {
        delete this.rooms[roomId];
      }
    }

    // Remove the client
    delete this.clients[clientId];
    return true;
  }

  /**
   * Gets the room ID for a client
   */
  getClientRoom(clientId) {
    return this.clients[clientId]?.room;
  }

  /**
   * Broadcasts a message to all clients in a room
   */
  broadcastToRoom(roomId, message) {
    const room = this.rooms[roomId];
    if (!room) return false;

    // Create a message string to send
    const messageStr = JSON.stringify(message);

    // Send to all clients in the room
    Object.entries(this.clients).forEach(([clientId, client]) => {
      if (client.room === roomId) {
        try {
          client.socket.send(messageStr);
        } catch (error) {
          console.error("[RoomManager] Failed to send to client:", error);
          this.removeClient(clientId);
        }
      }
    });

    return true;
  }
}
