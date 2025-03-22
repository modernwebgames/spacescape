/**
 * Core game logic that's independent of any specific platform (WebSocket, Cloudflare, etc.)
 * This class handles all game state and rules.
 */
export class GameLogic {
  constructor(roomId) {
    this.roomId = roomId;
    this.room = {
      id: roomId,
      status: "waiting",
      round: "question",
      countdown: 10,
      cycleCount: 0,
      players: {},
      scores: {}, // Track player scores
    };
    this.pendingMessages = {}; // Track messages from each player
    this.passengerMapping = null; // Will store the mapping of real players to passenger numbers
  }

  // Player Management
  addPlayer(nickname, clientId) {
    if (this.room.status !== "waiting") {
      return { success: false, error: "Game already in progress" };
    }

    if (nickname in this.room.players) {
      return { success: false, error: "Nickname already taken in this room" };
    }

    const isFirstPlayer = Object.keys(this.room.players).length === 0;

    this.room.players[nickname] = {
      nickname,
      ready: isFirstPlayer, // First player (captain) is automatically ready
      clientId,
      hasSentMessage: false,
    };
    
    // Initialize score for the player
    this.room.scores[nickname] = 0;

    return {
      success: true,
      state: this.getGameState(),
    };
  }

  removePlayer(nickname) {
    if (!this.room.players[nickname]) {
      return false;
    }

    // Get the current host before removing the player
    const [currentHost] = Object.keys(this.room.players);
    const isHostLeaving = nickname === currentHost;

    delete this.room.players[nickname];

    // If the host was the one who left and there are other players, make the new host ready
    if (isHostLeaving && Object.keys(this.room.players).length > 0) {
      const [newHost] = Object.keys(this.room.players);
      this.room.players[newHost].ready = true;
    }

    return true;
  }

  // Game State Management
  setPlayerReady(nickname, isReady) {
    const player = this.room.players[nickname];
    if (!player) {
      return { success: false, error: "Player not found" };
    }

    player.ready = isReady;
    return { success: true, state: this.getGameState() };
  }

  startGame(nickname) {
    // Verify request is from host (first player)
    const [hostNickname] = Object.keys(this.room.players);
    if (nickname !== hostNickname) {
      return { success: false, error: "Only the host can start the game" };
    }

    // Check if all players are ready
    if (!Object.values(this.room.players).every((p) => p.ready)) {
      return { success: false, error: "Not all players are ready" };
    }

    // Create a mapping of real players to passenger numbers
    this.createPassengerMapping();

    // Set game state to playing
    this.room.status = "playing";

    return {
      success: true,
      state: this.getGameState(),
      systemMessage: {
        sender: "System",
        text: "The game has commenced. Captain will ask questions to determine which pods hold androids. Don't get left behind.",
        timestamp: Date.now(),
        isPrivate: false,
      },
    };
  }

  createPassengerMapping() {
    // Get the host nickname
    const [hostNickname] = Object.keys(this.room.players);

    // Get non-host player nicknames
    const nonHostPlayers = Object.entries(this.room.players).filter(
      ([nickname, _]) => nickname !== hostNickname
    );

    // Create an array of passenger positions (1-4)
    const passengerPositions = [1, 2, 3, 4];

    // Shuffle the passenger positions
    for (let i = passengerPositions.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [passengerPositions[i], passengerPositions[j]] = [
        passengerPositions[j],
        passengerPositions[i],
      ];
    }

    // Create the mapping: { playerNickname: passengerNumber }
    const mapping = {};
    nonHostPlayers.forEach(([nickname, player], index) => {
      // Assign player to a random position (up to the number of real players)
      mapping[nickname] = passengerPositions[index];
    });

    // Store the mapping in the game state
    this.passengerMapping = mapping;
    return mapping;
  }

  // Message Handling
  addMessage(sender, text, timestamp) {
    const player = this.room.players[sender];
    if (!player) {
      return { success: false, error: "Player not found" };
    }

    // Check if player has already sent a message this round
    if (player.hasSentMessage) {
      return {
        success: false,
        error: "You can only send one message per round",
      };
    }

    // Get host nickname (first player in the room)
    const [hostNickname] = Object.keys(this.room.players);
    const isHostMessage = sender === hostNickname;

    // Mark that the player has sent a message this round
    player.hasSentMessage = true;

    // Store the message for translation
    this.pendingMessages[sender] = text;
    
    // Award points for sending messages
    if (isHostMessage && this.room.round === "question") {
      // Captain gets points for asking a question
      this.room.scores[sender] += 10;
    } else if (!isHostMessage && this.room.round === "answer") {
      // Players get points for answering
      this.room.scores[sender] += 5;
    }

    return {
      success: true,
      message: {
        roomKey: this.roomId,
        sender,
        text,
        timestamp,
        isPrivate: !isHostMessage, // Only non-host messages are private
      },
      isHostMessage,
    };
  }

  // Game Flow Management
  advanceToNextRound() {
    if (this.room.round === "question") {
      this.room.round = "answer";
      return true;
    } else if (this.room.round === "answer") {
      this.room.round = "translation";
      return true;
    } else if (this.room.round === "translation") {
      // Reset for next cycle
      this.room.round = "question";
      this.room.cycleCount++;

      // Clear pending messages
      this.pendingMessages = {};

      // Reset hasSentMessage flag for all players
      Object.values(this.room.players).forEach((player) => {
        player.hasSentMessage = false;
      });

      // Check if we've reached the maximum number of cycles
      if (this.room.cycleCount >= 10) {
        this.room.status = "completed";
        return {
          gameOver: true,
          message: {
            sender: "System",
            text: "<b>Game Over!</b> The maximum number of rounds has been reached. The captain must now decide which pod(s) to leave behind.",
            timestamp: Date.now(),
            isPrivate: false,
          },
        };
      }

      return true;
    }

    return false;
  }

  // State Getters
  getGameState() {
    return {
      room: { ...this.room },
      pendingMessages: { ...this.pendingMessages },
      passengerMapping: this.passengerMapping,
    };
  }

  getCaptainQuestion() {
    // Get the most recent captain's question if available
    const [hostNickname] = Object.keys(this.room.players);
    return (
      this.pendingMessages[hostNickname] ||
      "What were you doing before the catastrophe started?"
    );
  }

  getPlayerMessages() {
    // Prepare data structure for player messages
    const playersMessagesWithPositions = [];
    const emptyPositions = [];

    // Get the host nickname
    const [hostNickname] = Object.keys(this.room.players);

    // Fill in player messages based on the mapping
    Object.entries(this.passengerMapping || {}).forEach(
      ([playerNickname, position]) => {
        const message =
          this.pendingMessages[playerNickname] || "NO_MESSAGE_SENT";

        // Store for reference
        if (position >= 1 && position <= 4) {
          playersMessagesWithPositions.push({
            player: `Passenger ${position}`,
            message: message,
            isRealPlayer: true,
            originalNickname: playerNickname,
          });
        }
      }
    );

    // Fill empty positions (1-4) not taken by real players
    for (let i = 1; i <= 4; i++) {
      if (
        !playersMessagesWithPositions.some((p) => p.player === `Passenger ${i}`)
      ) {
        emptyPositions.push(i);

        // Add placeholder for empty position
        playersMessagesWithPositions.push({
          player: `Passenger ${i}`,
          message: null,
          isRealPlayer: false,
        });
      }
    }

    return {
      players: playersMessagesWithPositions,
      emptyPositions: emptyPositions,
      captainQuestion: this.getCaptainQuestion(),
      realPlayerMessages: Object.values(this.pendingMessages).filter(
        (msg) => msg && msg !== "NO_MESSAGE_SENT"
      ),
    };
  }

  // Helper method to get the passenger reveal after the game ends
  getPassengerReveal() {
    let revealMessage = "<b>Passenger Reveal:</b><br>";

    // Reverse the mapping to get passenger number -> player name
    const reversedMapping = {};
    Object.entries(this.passengerMapping || {}).forEach(
      ([playerName, passengerNum]) => {
        reversedMapping[passengerNum] = playerName;
      }
    );

    // Create the reveal message for each passenger
    for (let i = 1; i <= 4; i++) {
      const playerName = reversedMapping[i];
      if (playerName) {
        revealMessage += `Passenger ${i}: <span style="color: #4ade80;">Real Player (${playerName})</span><br>`;
      } else {
        revealMessage += `Passenger ${i}: <span style="color: #f87171;">AI-Generated</span><br>`;
      }
    }

    return {
      sender: "System",
      text: revealMessage,
      timestamp: Date.now(),
      isPrivate: false,
    };
  }
  
  // Process captain's decision and award points
  processCaptainDecision(selectedPassengers) {
    // Get the host nickname (captain)
    const [hostNickname] = Object.keys(this.room.players);
    
    // Create a set of fake passenger positions (positions without real players)
    const realPlayerPositions = new Set(Object.values(this.passengerMapping || {}));
    const fakePositions = new Set();
    for (let i = 1; i <= 4; i++) {
      if (!realPlayerPositions.has(i)) {
        fakePositions.add(i);
      }
    }
    
    // Calculate correct and incorrect decisions
    let correctDecisions = 0;
    let incorrectDecisions = 0;
    
    // Check each selected passenger
    selectedPassengers.forEach((isSelected, index) => {
      const passengerPosition = index + 1;
      if (isSelected) {
        if (fakePositions.has(passengerPosition)) {
          correctDecisions++;
        } else {
          incorrectDecisions++;
        }
      }
    });
    
    // Award points based on decisions
    // Captain gets 50 points for each correct identification
    this.room.scores[hostNickname] += correctDecisions * 50;
    
    // Captain loses 30 points for each incorrect identification (real player left behind)
    this.room.scores[hostNickname] -= incorrectDecisions * 30;
    
    // Real players get 20 points if they were saved (not selected)
    Object.entries(this.passengerMapping || {}).forEach(([playerName, position]) => {
      if (!selectedPassengers[position - 1]) {
        this.room.scores[playerName] += 20;
      }
    });
    
    // Generate a score summary message
    let scoreMessage = "<b>Final Scores:</b><br>";
    Object.entries(this.room.scores).forEach(([player, score]) => {
      scoreMessage += `${player}: <span style="color: ${score >= 0 ? '#4ade80' : '#f87171'};">${score} points</span><br>`;
    });
    
    return {
      scoreMessage: {
        sender: "System",
        text: scoreMessage,
        timestamp: Date.now(),
        isPrivate: false,
      }
    };
  }
}
