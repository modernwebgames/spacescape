// composables/useGame.js
import { ref } from "vue";

export function useGame() {
  // Core state
  const connectionStatus = ref("disconnected"); // 'disconnected' | 'connecting' | 'connected'
  const error = ref(null);
  const gameState = ref({
    room: {
      id: null,
      status: "waiting", // 'waiting' | 'playing'
      round: "question", // 'question' | 'answer' | 'translation'
      players: {},
    },
  });
  const playerNickname = ref(null);
  const nicknameError = ref(null);
  const isNicknameModalOpen = ref(false);
  const messages = ref([]);
  const roomId = ref(null);

  let ws = null;

  // Nickname validation and management
  const openNicknameModal = () => {
    isNicknameModalOpen.value = true;
  };
  const validateNickname = (nickname) => {
    if (!nickname?.trim()) {
      throw new Error("Nickname is required");
    }
    if (nickname.length < 2 || nickname.length > 15) {
      throw new Error("Nickname must be between 2 and 15 characters");
    }
    return nickname.trim();
  };

  const setNickname = (newNickname) => {
    try {
      const validatedNickname = validateNickname(newNickname);
      playerNickname.value = validatedNickname;
      if (import.meta.client) {
        localStorage.setItem("playerNickname", validatedNickname);
      }
      nicknameError.value = null;
      return true;
    } catch (err) {
      nicknameError.value = err.message;
      return false;
    }
  };

  const clearNickname = () => {
    playerNickname.value = null;
    if (import.meta.client) {
      localStorage.removeItem("playerNickname");
    }
  };

  // Load stored nickname
  if (import.meta.client) {
    const storedNickname = localStorage.getItem("playerNickname");
    if (storedNickname) {
      try {
        validateNickname(storedNickname);
        playerNickname.value = storedNickname;
      } catch (err) {
        // If stored nickname is invalid, remove it
        localStorage.removeItem("playerNickname");
      }
    }
  }

  // WebSocket setup
  let heartbeatInterval = null;
  let reconnectAttempts = 0;
  const MAX_RECONNECT_ATTEMPTS = 5;
  const RECONNECT_DELAY = 2000; // Start with 2 seconds
  const HEARTBEAT_INTERVAL = 30000; // 30 seconds
  
  const startHeartbeat = () => {
    // Clear any existing heartbeat
    if (heartbeatInterval) {
      clearInterval(heartbeatInterval);
    }
    
    // Start new heartbeat
    heartbeatInterval = setInterval(() => {
      if (ws && ws.readyState === WebSocket.OPEN) {
        // Send a ping message
        try {
          ws.send(JSON.stringify({
            type: "PING",
            timestamp: Date.now()
          }));
        } catch (err) {
          console.error("[WebSocket] Error sending heartbeat:", err);
          reconnect();
        }
      } else if (connectionStatus.value === "connected") {
        // Socket should be open but isn't
        console.warn("[WebSocket] Heartbeat detected closed connection");
        reconnect();
      }
    }, HEARTBEAT_INTERVAL);
  };
  
  const stopHeartbeat = () => {
    if (heartbeatInterval) {
      clearInterval(heartbeatInterval);
      heartbeatInterval = null;
    }
  };
  
  const reconnect = () => {
    if (reconnectAttempts >= MAX_RECONNECT_ATTEMPTS) {
      console.error("[WebSocket] Max reconnection attempts reached");
      error.value = "Connection lost. Please refresh the page.";
      connectionStatus.value = "disconnected";
      return;
    }
    
    // Disconnect properly first
    disconnect();
    
    // Exponential backoff for reconnect
    const delay = RECONNECT_DELAY * Math.pow(1.5, reconnectAttempts);
    
    console.log(`[WebSocket] Reconnecting in ${delay}ms (attempt ${reconnectAttempts + 1}/${MAX_RECONNECT_ATTEMPTS})`);
    
    setTimeout(() => {
      reconnectAttempts++;
      connect().then(() => {
        // Reset attempts on successful connection
        reconnectAttempts = 0;
        
        // If we were in a room, rejoin it
        if (roomId.value && playerNickname.value) {
          joinRoom(roomId.value).catch(err => {
            console.error("[WebSocket] Failed to rejoin room:", err);
            error.value = "Failed to rejoin game room. Please refresh.";
          });
        }
      }).catch(err => {
        console.error("[WebSocket] Reconnection failed:", err);
        // Will trigger next reconnection attempt
        reconnect();
      });
    }, delay);
  };

  const connect = () => {
    return new Promise((resolve, reject) => {
      if (!import.meta.client || connectionStatus.value === "connecting") {
        return resolve(false);
      }

      connectionStatus.value = "connecting";
      error.value = null;

      // Use the current domain for WebSocket connection
      const protocol = location.protocol === "https:" ? "wss" : "ws";
      const wsUrl = `${protocol}://${location.host}/ws`;

      // Close existing connection if any
      if (ws) {
        try {
          ws.close();
        } catch (err) {
          // Ignore errors during close
        }
      }

      try {
        ws = new WebSocket(wsUrl);
        
        // Set a reasonable buffer size to avoid memory issues
        if (ws.binaryType) {
          ws.binaryType = "arraybuffer";
        }

        ws.onopen = () => {
          console.log("[WebSocket] Connected");
          connectionStatus.value = "connected";
          
          // Start the heartbeat
          startHeartbeat();
          
          resolve(true);
        };

        ws.onmessage = handleWebSocketMessage;

        ws.onerror = (err) => {
          console.error("[WebSocket] Error:", err);
          error.value = "Connection error";
          
          // Only reject if we're still connecting
          if (connectionStatus.value === "connecting") {
            reject(err);
          } else {
            // Otherwise try to reconnect
            reconnect();
          }
        };

        ws.onclose = (event) => {
          console.log("[WebSocket] Disconnected with code:", event.code);
          
          // Stop heartbeat on disconnect
          stopHeartbeat();
          
          if (connectionStatus.value === "connected") {
            // Try to reconnect if connection was established before
            connectionStatus.value = "disconnected";
            reconnect();
          } else if (connectionStatus.value === "connecting") {
            // If still connecting, just mark as disconnected
            connectionStatus.value = "disconnected";
            reject(new Error("WebSocket connection closed before establishing"));
          }
        };

        // Add timeout to prevent hanging forever
        setTimeout(() => {
          if (connectionStatus.value === "connecting") {
            connectionStatus.value = "disconnected";
            
            if (ws) {
              try {
                ws.close();
              } catch (err) {
                // Ignore errors during close
              }
              ws = null;
            }
            
            reject(new Error("Connection timeout"));
          }
        }, 5000);
      } catch (err) {
        console.error("[WebSocket] Failed to create WebSocket:", err);
        connectionStatus.value = "disconnected";
        reject(err);
      }
    });
  };

  const disconnect = () => {
    // Stop heartbeat
    stopHeartbeat();
    
    if (ws) {
      try {
        ws.onclose = null; // Prevent reconnect attempts
        ws.onerror = null;
        ws.onmessage = null;
        ws.onopen = null;
        ws.close();
      } catch (err) {
        console.error("[WebSocket] Error during disconnect:", err);
      }
      ws = null;
    }
    
    connectionStatus.value = "disconnected";
  };
  // Room management
  const createRoom = async () => {
    if (!playerNickname.value) {
      throw new Error("Please set your nickname first");
    }

    try {
      validateNickname(playerNickname.value);
    } catch (err) {
      throw new Error("Invalid nickname. Please set a valid nickname first");
    }

    // Ensure we have a connection
    if (connectionStatus.value !== "connected") {
      await connect();
    }

    // Only proceed if we're connected
    if (connectionStatus.value !== "connected") {
      throw new Error("Failed to establish WebSocket connection");
    }

    // Generate room key
    const roomKey = Math.random().toString(36).substring(2, 6).toUpperCase();
    roomId.value = roomKey;

    return new Promise((resolve, reject) => {
      const handleResponse = (event) => {
        const message = JSON.parse(event.data);

        if (message.type === "ROOM_CREATED" && message.roomId === roomKey) {
          ws.removeEventListener("message", handleResponse);
          resolve(roomKey);
        }

        if (message.type === "ERROR") {
          ws.removeEventListener("message", handleResponse);
          reject(new Error(message.payload));
        }
      };

      ws.addEventListener("message", handleResponse);

      const createMessage = {
        type: "CREATE_ROOM",
        roomId: roomKey,
        playerNickname: playerNickname.value,
      };

      console.log("Sending create room request:", createMessage);
      ws.send(JSON.stringify(createMessage));

      // Add timeout to prevent hanging forever
      setTimeout(() => {
        ws.removeEventListener("message", handleResponse);
        reject(new Error("Room creation timeout"));
      }, 5000);
    });
  };

  const joinRoom = async (roomKey) => {
    if (!playerNickname.value) {
      throw new Error("Please set your nickname first");
    }
    try {
      validateNickname(playerNickname.value);
    } catch (err) {
      throw new Error("Invalid nickname. Please set a valid nickname first");
    }

    // Set the room ID for WebSocket connections
    roomId.value = roomKey;

    if (connectionStatus.value !== "connected") {
      await connect();
    }

    return new Promise((resolve, reject) => {
      const handleResponse = (event) => {
        const message = JSON.parse(event.data);
        console.log("Join room response:", message); // Add this log

        if (
          message.type === "GAME_STATE" &&
          message.payload.room.id === roomKey
        ) {
          ws.removeEventListener("message", handleResponse);
          resolve();
        }

        if (message.type === "ERROR") {
          ws.removeEventListener("message", handleResponse);
          error.value = message.payload;
          reject(message.payload);
        }
      };

      ws.addEventListener("message", handleResponse);

      const joinMessage = {
        type: "JOIN_ROOM",
        roomId: roomKey,
        playerNickname: playerNickname.value,
      };
      console.log("Sending join request:", joinMessage); // Add this log
      ws.send(JSON.stringify(joinMessage));
    });
  };

  // Message handling
  const handleWebSocketMessage = (event) => {
    try {
      const message = JSON.parse(event.data);
      console.log("[WebSocket] Received:", message);

      switch (message.type) {
        case "GAME_STATE":
          gameState.value = message.payload;
          break;

        case "CHAT_MESSAGE":
          messages.value.push(message.payload);
          break;

        case "ERROR":
          error.value = message.payload;
          break;

        case "ROOM_CREATED":
          gameState.value.room.id = message.roomId;
          break;

        default:
          console.warn("[WebSocket] Unknown message type:", message.type);
      }
    } catch (err) {
      console.error("[WebSocket] Message parsing error:", err);
    }
  };

  // Game actions
  const setPlayerReady = (isReady) => {
    if (!ws || connectionStatus.value !== "connected") return;

    ws.send(
      JSON.stringify({
        type: "PLAYER_READY",
        playerNickname: playerNickname.value,
        isReady,
      })
    );
  };

  const startGame = () => {
    if (!ws || connectionStatus.value !== "connected") return;

    ws.send(
      JSON.stringify({
        type: "START_GAME",
        playerNickname: playerNickname.value,
        roomId: gameState.value.room.id,
      })
    );
  };

  // Add new method for sending chat messages
  const sendChatMessage = (text) => {
    if (!ws || connectionStatus.value !== "connected") return;

    ws.send(
      JSON.stringify({
        type: "CHAT_MESSAGE",
        payload: {
          roomKey: gameState.value.room.id,
          sender: playerNickname.value,
          text: text,
          timestamp: new Date().toISOString(),
        },
      })
    );
  };

  // Add new method for sending captain's decision
  const sendCaptainDecision = (selectedPassengers) => {
    if (!ws || connectionStatus.value !== "connected") return;

    ws.send(
      JSON.stringify({
        type: "CAPTAIN_DECISION",
        payload: {
          roomKey: gameState.value.room.id,
          selectedPassengers: selectedPassengers,
        },
      })
    );
  };

  return {
    // State
    connectionStatus,
    error,
    gameState,
    playerNickname,
    nicknameError,
    messages,
    roomId,

    // Actions
    connect,
    createRoom,
    joinRoom,
    setPlayerReady,
    startGame,
    disconnect,
    setNickname,
    clearNickname,
    openNicknameModal,
    isNicknameModalOpen,
    sendChatMessage,
    sendCaptainDecision,
  };
}
