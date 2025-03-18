// server/routes/_ws.js
import { RoomManager } from "../services/RoomManager.js";
import { GameController } from "../services/GameController.js";

// Initialize singletons
const roomManager = new RoomManager();
const gameController = new GameController(roomManager);

// Store client IDs
const clientIds = new WeakMap();

// Generate unique client ID
function generateClientId() {
  return Math.random().toString(36).substring(7);
}

export default defineWebSocketHandler({
  open(peer) {
    // Store unique ID for this client
    clientIds.set(peer, generateClientId());
    console.log("[WebSocket] Client connected:", clientIds.get(peer));
  },

  async message(peer, message) {
    try {
      const data = JSON.parse(message.text());
      const clientId = clientIds.get(peer);
      
      // Don't log ping messages to avoid console spam
      if (data.type !== "PING") {
        console.log("[WebSocket] Received from", clientId, ":", data);
      }

      switch (data.type) {
        case "PING": {
          // Respond to ping with pong to maintain connection
          peer.send(
            JSON.stringify({
              type: "PONG",
              timestamp: Date.now(),
            })
          );
          break;
        }
          
        case "CHAT_MESSAGE": {
          const roomId = roomManager.getClientRoom(clientId);
          if (!roomId) return;

          const game = roomManager.getRoom(roomId);
          if (!game) return;

          // Add the message to the game
          const result = game.addMessage(
            data.payload.sender,
            data.payload.text,
            data.payload.timestamp
          );

          if (!result.success) {
            peer.send(
              JSON.stringify({
                type: "ERROR",
                payload: result.error,
              })
            );
            return;
          }

          if (result.isHostMessage) {
            // If host message, broadcast to all clients
            roomManager.broadcastToRoom(roomId, {
              type: "CHAT_MESSAGE",
              payload: result.message,
            });
          } else {
            // If non-host message, only send to sender
            peer.send(
              JSON.stringify({
                type: "CHAT_MESSAGE",
                payload: result.message,
              })
            );
          }
          break;
        }

        case "CREATE_ROOM": {
          console.log("Server received CREATE_ROOM request:", data);

          if (!data.roomId || !data.playerNickname) {
            peer.send(
              JSON.stringify({
                type: "ERROR",
                payload: "Invalid room creation data",
              })
            );
            return;
          }

          // Create the room
          const game = roomManager.createRoom(data.roomId);
          if (!game) {
            peer.send(
              JSON.stringify({
                type: "ERROR",
                payload: "Room already exists",
              })
            );
            return;
          }

          // Add the player
          const result = game.addPlayer(data.playerNickname, clientId);
          if (!result.success) {
            peer.send(
              JSON.stringify({
                type: "ERROR",
                payload: result.error,
              })
            );
            return;
          }

          // Register the client
          roomManager.registerClient(clientId, peer, data.roomId);

          // Send success response
          peer.send(
            JSON.stringify({
              type: "ROOM_CREATED",
              roomId: data.roomId,
              payload: game.getGameState(),
            })
          );

          peer.send(
            JSON.stringify({
              type: "GAME_STATE",
              payload: game.getGameState(),
            })
          );
          break;
        }

        case "JOIN_ROOM": {
          console.log("Server received JOIN_ROOM request:", data);

          const game = roomManager.getRoom(data.roomId);
          if (!game) {
            peer.send(
              JSON.stringify({
                type: "ERROR",
                payload: "Room not found",
              })
            );
            return;
          }

          // Add the player
          const result = game.addPlayer(data.playerNickname, clientId);
          if (!result.success) {
            peer.send(
              JSON.stringify({
                type: "ERROR",
                payload: result.error,
              })
            );
            return;
          }

          // Register the client
          roomManager.registerClient(clientId, peer, data.roomId);

          // Broadcast updated game state
          roomManager.broadcastToRoom(data.roomId, {
            type: "GAME_STATE",
            payload: game.getGameState(),
          });
          break;
        }

        case "PLAYER_READY": {
          const roomId = roomManager.getClientRoom(clientId);
          if (!roomId) return;

          const game = roomManager.getRoom(roomId);
          if (!game) return;

          // Set player ready status
          const result = game.setPlayerReady(data.playerNickname, data.isReady);
          if (!result.success) {
            peer.send(
              JSON.stringify({
                type: "ERROR",
                payload: result.error,
              })
            );
            return;
          }

          // Broadcast updated game state
          roomManager.broadcastToRoom(roomId, {
            type: "GAME_STATE",
            payload: game.getGameState(),
          });
          break;
        }

        case "START_GAME": {
          const roomId = roomManager.getClientRoom(clientId);
          if (!roomId) return;

          const game = roomManager.getRoom(roomId);
          if (!game) return;

          // Start the game
          const result = game.startGame(data.playerNickname);
          if (!result.success) {
            peer.send(
              JSON.stringify({
                type: "ERROR",
                payload: result.error,
              })
            );
            return;
          }

          // Broadcast updated game state
          roomManager.broadcastToRoom(roomId, {
            type: "GAME_STATE",
            payload: game.getGameState(),
          });

          // Send system message
          if (result.systemMessage) {
            roomManager.broadcastToRoom(roomId, {
              type: "CHAT_MESSAGE",
              payload: result.systemMessage,
            });
          }

          // Start game timer
          gameController.startTranslationCountdown(roomId);
          break;
        }

        case "CAPTAIN_DECISION": {
          const { roomKey, selectedPassengers } = data.payload;
          console.log(
            `[WebSocket] Captain's decision for room ${roomKey}:`,
            selectedPassengers
          );

          // Handle captain's decision
          gameController.handleCaptainDecision(roomKey, selectedPassengers);
          break;
        }
      }
    } catch (error) {
      console.error("[WebSocket] Error:", error);
      peer.send(
        JSON.stringify({
          type: "ERROR",
          payload: "Server error",
        })
      );
    }
  },

  close(peer) {
    const clientId = clientIds.get(peer);
    if (clientId) {
      roomManager.removeClient(clientId);
      console.log("[WebSocket] Client disconnected:", clientId);
    }
  },
});
