import { GameLogic } from "../game/GameLogic.js";
import { GameController } from "../services/GameController.js";

export class GameRoom {
  constructor(state, env) {
    this.state = state;
    this.env = env;
    this.gameLogic = new GameLogic(state.id);
    this.gameController = new GameController(this);
    this.sessions = new Map();
    this.storage = state.storage;

    // Attempt to load existing state
    this.loadState();
  }

  // WebSocket session handling
  async onConnect(websocket) {
    // Generate a unique session ID
    const sessionId = Math.random().toString(36).substring(7);

    // Store the session
    this.sessions.set(sessionId, websocket);

    // Set up event handlers
    websocket.addEventListener("message", async (event) => {
      try {
        await this.onMessage(sessionId, event.data);
      } catch (error) {
        console.error("Error handling message:", error);
        websocket.send(
          JSON.stringify({
            type: "ERROR",
            payload: "Internal server error",
          })
        );
      }
    });

    websocket.addEventListener("close", () => {
      this.onClose(sessionId);
    });

    websocket.addEventListener("error", () => {
      this.onClose(sessionId);
    });

    console.log("Client connected:", sessionId);
  }

  // Message handling
  async onMessage(sessionId, data) {
    const websocket = this.sessions.get(sessionId);
    if (!websocket) return;

    // Parse the message
    const message = JSON.parse(data);
    console.log("Received message:", message);

    switch (message.type) {
      case "CREATE_ROOM": {
        // Add the player
        const result = this.gameLogic.addPlayer(
          message.playerNickname,
          sessionId
        );
        if (!result.success) {
          websocket.send(
            JSON.stringify({
              type: "ERROR",
              payload: result.error,
            })
          );
          return;
        }

        // Save the state
        await this.saveState();

        // Send success response
        websocket.send(
          JSON.stringify({
            type: "ROOM_CREATED",
            roomId: this.gameLogic.roomId,
            payload: this.gameLogic.getGameState(),
          })
        );

        websocket.send(
          JSON.stringify({
            type: "GAME_STATE",
            payload: this.gameLogic.getGameState(),
          })
        );
        break;
      }

      case "JOIN_ROOM": {
        // Add the player
        const result = this.gameLogic.addPlayer(
          message.playerNickname,
          sessionId
        );
        if (!result.success) {
          websocket.send(
            JSON.stringify({
              type: "ERROR",
              payload: result.error,
            })
          );
          return;
        }

        // Save the state
        await this.saveState();

        // Broadcast updated game state
        this.broadcast({
          type: "GAME_STATE",
          payload: this.gameLogic.getGameState(),
        });
        break;
      }

      case "PLAYER_READY": {
        // Set player ready status
        const result = this.gameLogic.setPlayerReady(
          message.playerNickname,
          message.isReady
        );
        if (!result.success) {
          websocket.send(
            JSON.stringify({
              type: "ERROR",
              payload: result.error,
            })
          );
          return;
        }

        // Save the state
        await this.saveState();

        // Broadcast updated game state
        this.broadcast({
          type: "GAME_STATE",
          payload: this.gameLogic.getGameState(),
        });
        break;
      }

      case "START_GAME": {
        // Start the game
        const result = this.gameLogic.startGame(message.playerNickname);
        if (!result.success) {
          websocket.send(
            JSON.stringify({
              type: "ERROR",
              payload: result.error,
            })
          );
          return;
        }

        // Save the state
        await this.saveState();

        // Broadcast updated game state
        this.broadcast({
          type: "GAME_STATE",
          payload: this.gameLogic.getGameState(),
        });

        // Send system message
        if (result.systemMessage) {
          this.broadcast({
            type: "CHAT_MESSAGE",
            payload: result.systemMessage,
          });
        }

        // Start game timer
        this.gameController.startTranslationCountdown(this.gameLogic.roomId);
        break;
      }

      case "CHAT_MESSAGE": {
        // Add the message to the game
        const result = this.gameLogic.addMessage(
          message.payload.sender,
          message.payload.text,
          message.payload.timestamp
        );

        if (!result.success) {
          websocket.send(
            JSON.stringify({
              type: "ERROR",
              payload: result.error,
            })
          );
          return;
        }

        // Save the state
        await this.saveState();

        if (result.isHostMessage) {
          // If host message, broadcast to all clients
          this.broadcast({
            type: "CHAT_MESSAGE",
            payload: result.message,
          });
        } else {
          // If non-host message, only send to sender
          websocket.send(
            JSON.stringify({
              type: "CHAT_MESSAGE",
              payload: result.message,
            })
          );
        }
        break;
      }

      case "CAPTAIN_DECISION": {
        const { selectedPassengers } = message.payload;
        console.log(`Captain's decision:`, selectedPassengers);

        // Handle captain's decision
        this.gameController.handleCaptainDecision(selectedPassengers);
        break;
      }
    }
  }

  // Connection close handling
  onClose(sessionId) {
    // Remove the session
    this.sessions.delete(sessionId);

    // Find the player associated with this session
    let playerToRemove = null;
    Object.entries(this.gameLogic.room.players).forEach(
      ([nickname, player]) => {
        if (player.clientId === sessionId) {
          playerToRemove = nickname;
        }
      }
    );

    // Remove the player if found
    if (playerToRemove) {
      this.gameLogic.removePlayer(playerToRemove);
      this.saveState();

      // Broadcast updated game state
      this.broadcast({
        type: "GAME_STATE",
        payload: this.gameLogic.getGameState(),
      });
    }

    console.log("Client disconnected:", sessionId);
  }

  // Broadcasting messages to all connected clients
  broadcast(message) {
    const messageStr = JSON.stringify(message);

    this.sessions.forEach((websocket) => {
      try {
        websocket.send(messageStr);
      } catch (error) {
        console.error("Failed to send message:", error);
      }
    });
  }

  // Get a client by ID
  getClient(clientId) {
    return this.sessions.get(clientId);
  }

  // Save the game state to Durable Object storage
  async saveState() {
    try {
      await this.storage.put("gameState", this.gameLogic);
    } catch (error) {
      console.error("Error saving state:", error);
    }
  }

  // Load the game state from Durable Object storage
  async loadState() {
    try {
      const savedState = await this.storage.get("gameState");
      if (savedState) {
        // Restore saved state to our GameLogic instance
        Object.assign(this.gameLogic, savedState);
      }
    } catch (error) {
      console.error("Error loading state:", error);
    }
  }

  // WebSocket handling
  async fetch(request) {
    // Handle WebSocket connection
    if (request.headers.get("Upgrade") === "websocket") {
      // Create a WebSocket pair
      const [client, server] = Object.values(new WebSocketPair());

      // Accept the WebSocket connection
      server.accept();

      // Set up the connection
      await this.onConnect(server);

      // Return the client end of the WebSocket
      return new Response(null, {
        status: 101,
        webSocket: client,
      });
    }

    // Handle HTTP request for room status
    return new Response(
      JSON.stringify({
        roomId: this.gameLogic.roomId,
        status: this.gameLogic.room.status,
        playerCount: Object.keys(this.gameLogic.room.players).length,
      }),
      {
        headers: {
          "Content-Type": "application/json",
        },
      }
    );
  }
}
