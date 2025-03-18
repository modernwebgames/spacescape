import { generateAIResponse } from "../ai-chat.js";

// Constants
const QUESTION_COUNTDOWN = 20000; // 20 seconds
const ANSWER_COUNTDOWN = 30000; // 30 seconds

/**
 * Manages game flow, timers, and AI integration
 */
export class GameController {
  constructor(roomManager) {
    this.roomManager = roomManager;
    this.timers = {}; // roomId -> { countdownInterval, translationTimer }
  }

  /**
   * Starts the game countdown timer
   */
  startTranslationCountdown(roomId) {
    // First ensure we've cleaned up any existing timers to prevent memory leaks
    this.clearTimers(roomId);

    const game = this.roomManager.getRoom(roomId);
    if (!game) return false;

    // Set the initial countdown based on the round
    if (game.room.round === "question") {
      game.room.countdown = QUESTION_COUNTDOWN / 1000;
    } else if (game.room.round === "answer") {
      game.room.countdown = ANSWER_COUNTDOWN / 1000;
    } else if (game.room.round === "translation") {
      // For translation round, we don't need a countdown
      game.room.countdown = null;
    }

    // Initialize timer storage for this room if it doesn't exist
    if (!this.timers[roomId]) {
      this.timers[roomId] = {
        countdownInterval: null,
        translationTimer: null
      };
    }

    // Broadcast the initial state with the countdown
    this.roomManager.broadcastToRoom(roomId, {
      type: "GAME_STATE",
      payload: game.getGameState(),
    });

    // Only create a countdown interval for question and answer rounds
    if (game.room.round !== "translation") {
      const countdownInterval = setInterval(() => {
        const currentGame = this.roomManager.getRoom(roomId);
        if (!currentGame) {
          this.clearTimers(roomId);
          return;
        }

        if (currentGame.room.countdown > 0) {
          currentGame.room.countdown--;

          // Broadcast the updated countdown
          this.roomManager.broadcastToRoom(roomId, {
            type: "GAME_STATE",
            payload: currentGame.getGameState(),
          });
        } else {
          // Clear the interval when countdown reaches zero
          if (this.timers[roomId] && this.timers[roomId].countdownInterval) {
            clearInterval(this.timers[roomId].countdownInterval);
            this.timers[roomId].countdownInterval = null;
          }
        }
      }, 1000);

      // Store the interval for cleanup
      this.timers[roomId].countdownInterval = countdownInterval;
    }

    // Start a new countdown timer for the round transition
    let roundDuration;
    if (game.room.round === "question") {
      roundDuration = QUESTION_COUNTDOWN;
    } else if (game.room.round === "answer") {
      roundDuration = ANSWER_COUNTDOWN;
    } else {
      // For translation round, we don't need a timer as it will end after AI response
      return true;
    }

    const translationTimer = setTimeout(async () => {
      const currentGame = this.roomManager.getRoom(roomId);
      if (!currentGame) {
        this.clearTimers(roomId);
        return;
      }

      // Clear reference to the timer since it's already executed
      if (this.timers[roomId]) {
        this.timers[roomId].translationTimer = null;
      }

      // If we're in question round, move to answer round
      if (currentGame.room.round === "question") {
        // Get the most recent captain's question if available
        const captainQuestion = currentGame.getCaptainQuestion();

        // If captain didn't send a question, send system message
        if (!captainQuestion) {
          // Send system message about captain's pod being unreachable
          this.roomManager.broadcastToRoom(roomId, {
            type: "CHAT_MESSAGE",
            payload: {
              roomKey: roomId,
              sender: "System",
              text: "*static* Captain's pod communication systems are not reachable at this moment. While we attempt to restore connection, please share: What were you doing before the catastrophe started?",
              timestamp: Date.now(),
              isPrivate: false,
            },
          });

          // Store the default question for the host
          const [hostNickname] = Object.keys(currentGame.room.players);
          currentGame.pendingMessages[hostNickname] =
            "What were you doing before the catastrophe started?";
        }

        // Advance to answer round
        currentGame.advanceToNextRound();
        currentGame.room.countdown = ANSWER_COUNTDOWN / 1000;

        // Broadcast updated state
        this.roomManager.broadcastToRoom(roomId, {
          type: "GAME_STATE",
          payload: currentGame.getGameState(),
        });

        // Start next countdown - no recursion, direct call
        this.startTranslationCountdown(roomId);
        return;
      }

      // If we're in answer round, immediately transition to translation round
      if (currentGame.room.round === "answer") {
        // First transition to translation round to show loading state
        currentGame.advanceToNextRound();
        currentGame.room.countdown = null; // No countdown for translation round

        // Broadcast updated state
        this.roomManager.broadcastToRoom(roomId, {
          type: "GAME_STATE",
          payload: currentGame.getGameState(),
        });

        // Then process messages
        await this.processPendingMessages(roomId);
      }
    }, roundDuration);

    // Store the timer for cleanup
    this.timers[roomId].translationTimer = translationTimer;

    return true;
  }

  /**
   * Clears all timers for a room
   */
  clearTimers(roomId) {
    if (this.timers[roomId]) {
      if (this.timers[roomId].countdownInterval) {
        clearInterval(this.timers[roomId].countdownInterval);
      }
      if (this.timers[roomId].translationTimer) {
        clearTimeout(this.timers[roomId].translationTimer);
      }
      delete this.timers[roomId];
    }
  }

  /**
   * Processes all pending messages and generates AI responses
   */
  async processPendingMessages(roomId) {
    const game = this.roomManager.getRoom(roomId);
    if (!game || game.room.round !== "translation") {
      console.log(
        "[GameController] processPendingMessages called but not in translation round:",
        game?.room.round
      );
      return false;
    }

    console.log("[GameController] Processing messages for room:", roomId);

    // Set a processing flag for this room
    if (!this.timers[roomId]) {
      this.timers[roomId] = {};
    }
    
    // Setup AI processing timeout
    const AI_TIMEOUT = 10000; // 10 seconds max wait time for AI response
    let aiTimeoutTimer = null;
    
    try {
      // First inform clients that processing has started
      this.roomManager.broadcastToRoom(roomId, {
        type: "CHAT_MESSAGE",
        payload: {
          roomKey: roomId,
          sender: "DigiTranslate 3000",
          text: "<i>Processing communication translations...</i>",
          timestamp: Date.now(),
          isPrivate: false,
        },
      });

      // Get player messages for AI processing
      const playerMessages = game.getPlayerMessages();

      // Add instructions for the AI
      const extendedMessage = {
        ...playerMessages,
        instruction: `You are assisting with a multiplayer game where players are passengers on a spaceship. The captain asks questions to identify which passengers are AI androids. Follow these instructions EXACTLY:

TASK 1 - REPHRASE REAL PLAYER MESSAGES (HIGHEST PRIORITY TASK):
- Take each real player message (marked isRealPlayer:true) and rephrase it completely
- CRITICAL: You MUST preserve the EXACT same meaning, context, specific details, and emotional tone
- For example, if someone says "I was brushing my teeth", your rephrasing MUST still mention "teeth" and "brushing"
- You MUST change the structure and wording significantly - NEVER use the original message verbatim
- Your rephrasing should sound natural as if the original player rewrote their own message differently
- Maintain the same level of detail, formality, and personality as the original message

TASK 2 - HANDLE NO_MESSAGE_SENT:
For any position with "NO_MESSAGE_SENT":
- Generate a natural, relevant response to the captain's question: "${
          playerMessages.captainQuestion
        }"
- Match the tone and style of the real player responses

TASK 3 - FILL EMPTY POSITIONS:
For empty passenger positions (${playerMessages.emptyPositions.join(", ")}):
- Generate responses that directly answer the captain's question: "${
          playerMessages.captainQuestion
        }"
- Create distinct personality traits for each AI passenger
- May include casual language, hesitations, or minor typos to sound natural
- Must match the overall tone and style of the real player responses
- Never reference other passengers' responses

CRITICAL REQUIREMENTS:
1. Each response must have a unique style and personality
2. ALL responses must directly address the captain's question with relevant details
3. Vary response length and complexity naturally
4. ALWAYS maintain specific details from real player messages (activities, objects, locations mentioned)
5. Make the rephrased real player messages difficult to distinguish from AI-generated ones`,
      };

      // Set up a timeout to handle AI response delays
      const timeoutPromise = new Promise((_, reject) => {
        aiTimeoutTimer = setTimeout(() => {
          reject(new Error("AI response timeout"));
        }, AI_TIMEOUT);
      });

      // Race between AI response and timeout
      const aiResponse = await Promise.race([
        generateAIResponse(JSON.stringify(extendedMessage)),
        timeoutPromise
      ]);

      // Clear the timeout timer since we got a response
      if (aiTimeoutTimer) {
        clearTimeout(aiTimeoutTimer);
        aiTimeoutTimer = null;
      }

      if (aiResponse) {
        try {
          const parsedResponse = JSON.parse(aiResponse);

          // Debug output to verify response quality
          console.log(
            "[GameController] AI Response received successfully"
          );

          // Format all messages in passenger number order
          const formattedResponse = parsedResponse.players
            .map((player) => {
              const passengerNum = parseInt(
                player.player.replace("Passenger ", "")
              );
              return `<b>Passenger ${passengerNum}</b>: "${
                player.message || "Did not send a message"
              }"`;
            })
            .join("<br>");

          // Send AI message to all clients in the room
          this.roomManager.broadcastToRoom(roomId, {
            type: "CHAT_MESSAGE",
            payload: {
              roomKey: roomId,
              sender: "DigiTranslate 3000",
              text: formattedResponse,
              timestamp: Date.now(),
              isPrivate: false,
            },
          });

          // Move to the next question round
          const result = game.advanceToNextRound();

          // Check if the game is over
          if (result && result.gameOver) {
            // Send game over message
            this.roomManager.broadcastToRoom(roomId, {
              type: "CHAT_MESSAGE",
              payload: result.message,
            });

            // Broadcast final game state
            this.roomManager.broadcastToRoom(roomId, {
              type: "GAME_STATE",
              payload: game.getGameState(),
            });
          } else {
            // Broadcast updated game state
            this.roomManager.broadcastToRoom(roomId, {
              type: "GAME_STATE",
              payload: game.getGameState(),
            });

            // Start the countdown for the next question round
            this.startTranslationCountdown(roomId);
          }

          return true;
        } catch (error) {
          console.error("[GameController] Error parsing AI response:", error);
          // Use a fallback response instead of failing
          this.sendFallbackResponse(roomId);
          this.moveToNextRound(roomId);
          return false;
        }
      } else {
        console.error("[GameController] No AI response received");
        this.sendFallbackResponse(roomId);
        this.moveToNextRound(roomId);
        return false;
      }
    } catch (error) {
      // Clear the timeout timer in case of error
      if (aiTimeoutTimer) {
        clearTimeout(aiTimeoutTimer);
      }
      
      console.error("[GameController] Error processing messages:", error);
      
      // Send a fallback response to avoid freezing the game
      this.sendFallbackResponse(roomId);
      this.moveToNextRound(roomId);
      return false;
    }
  }
  
  /**
   * Sends a fallback response when AI generation fails
   */
  sendFallbackResponse(roomId) {
    // Create a fallback message for players
    const fallbackMessage = {
      roomKey: roomId,
      sender: "DigiTranslate 3000",
      text: "<b>System Alert:</b> Translation buffer overflow detected. <br><i>Communication fragments recovered:</i><br>" +
            "<b>Passenger 1</b>: \"*static* Signal interference... can't establish clear connection.\"<br>" +
            "<b>Passenger 2</b>: \"*static* ...systems malfunction... retry communication...\"<br>" +
            "<b>Passenger 3</b>: \"*static* ...please standby for connection reattempt...\"<br>" +
            "<b>Passenger 4</b>: \"*static* Emergency protocols activated... communication disrupted...\"",
      timestamp: Date.now(),
      isPrivate: false,
    };
    
    // Send the fallback message to all clients
    this.roomManager.broadcastToRoom(roomId, {
      type: "CHAT_MESSAGE",
      payload: fallbackMessage,
    });
  }

  /**
   * Helper function to move to the next round after an error
   */
  moveToNextRound(roomId) {
    const game = this.roomManager.getRoom(roomId);
    if (!game) return false;

    // Just advance to the next round and start the timer
    const result = game.advanceToNextRound();

    // Check if the game is over
    if (result && result.gameOver) {
      // Send game over message
      this.roomManager.broadcastToRoom(roomId, {
        type: "CHAT_MESSAGE",
        payload: result.message,
      });

      // Broadcast final game state
      this.roomManager.broadcastToRoom(roomId, {
        type: "GAME_STATE",
        payload: game.getGameState(),
      });
    } else {
      // Broadcast updated game state
      this.roomManager.broadcastToRoom(roomId, {
        type: "GAME_STATE",
        payload: game.getGameState(),
      });

      // Start the countdown for the next question round
      this.startTranslationCountdown(roomId);
    }

    return true;
  }

  /**
   * Handles the captain's final decision at the end of the game
   */
  handleCaptainDecision(roomId, selectedPassengers) {
    const game = this.roomManager.getRoom(roomId);
    if (!game) return false;

    // Get the passenger reveal message
    const revealMessage = game.getPassengerReveal();

    // Send the reveal message to all clients in the room
    this.roomManager.broadcastToRoom(roomId, {
      type: "CHAT_MESSAGE",
      payload: revealMessage,
    });

    return true;
  }
}
