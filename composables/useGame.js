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
  const connect = () => {
    if (!import.meta.client || connectionStatus.value === "connecting") return;

    connectionStatus.value = "connecting";
    error.value = null;

    const wsUrl =
      process.env.NODE_ENV === "production"
        ? "wss://spacescape-worker.bkorhanozdemir.workers.dev"
        : `${location.protocol === "https:" ? "wss" : "ws"}://${
            location.host
          }/_ws`;

    ws = new WebSocket(wsUrl);

    ws.onopen = () => {
      console.log("[WebSocket] Connected");
      connectionStatus.value = "connected";
    };

    ws.onmessage = handleWebSocketMessage;

    ws.onerror = (err) => {
      console.error("[WebSocket] Error:", err);
      error.value = "Connection error";
    };

    ws.onclose = () => {
      console.log("[WebSocket] Disconnected");
      connectionStatus.value = "disconnected";
      ws = null;
    };
  };

  const disconnect = () => {
    if (ws) {
      ws.close();
      ws = null;
    }
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
    if (connectionStatus.value !== "connected") {
      await connect();
    }

    // Generate room key
    const roomKey = Math.random().toString(36).substring(2, 6).toUpperCase();

    const createMessage = {
      type: "CREATE_ROOM",
      roomId: roomKey,
      playerNickname: playerNickname.value,
    };
    console.log("Sending create room request:", createMessage); // Log the message

    ws.send(JSON.stringify(createMessage));

    return roomKey;
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
