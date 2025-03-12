// server/routes/_ws.js
import { generateAIResponse } from '../ai-chat.js';

const rooms = {} // Store our rooms
const clients = {}  // Store client -> room mapping
const clientIds = new WeakMap(); // Store client IDs
const TRANSLATION_COUNTDOWN = 10000; // 10 seconds
const QUESTION_COUNTDOWN = 20000; // 20 seconds
const ANSWER_COUNTDOWN = 30000; // 30 seconds

function generateClientId() {
    return Math.random().toString(36).substring(7);
}

// Initialize a room
function createRoom(roomId) {
    if (rooms[roomId]) {
        return false;
    }

    rooms[roomId] = {
        room: {
            id: roomId,
            status: 'waiting',
            round: 'question',
            countdown: 10,
            cycleCount: 0,
            players: {}
        },
        pendingMessages: {}, // Track messages from each player
        translationTimer: null,
        passengerMapping: null // Will store the mapping of real players to passenger numbers
    };

    return true;
}

function startTranslationCountdown(roomId) {
    const room = rooms[roomId];
    if (!room) return;

    // Clear any existing timer
    if (room.translationTimer) {
        clearTimeout(room.translationTimer);
    }

    // Set the initial countdown based on the round
    if (room.room.round === 'question') {
        room.room.countdown = QUESTION_COUNTDOWN / 1000;
    } else if (room.room.round === 'answer') {
        room.room.countdown = ANSWER_COUNTDOWN / 1000;
    } else {
        room.room.countdown = TRANSLATION_COUNTDOWN / 1000;
    }

    // Broadcast the initial state with the countdown
    broadcastToRoom(roomId, {
        type: 'GAME_STATE',
        payload: room
    });

    // Create a countdown interval that updates clients every second
    const countdownInterval = setInterval(() => {
        if (room.room.countdown > 0) {
            room.room.countdown--;
            
            // Broadcast the updated countdown
            broadcastToRoom(roomId, {
                type: 'GAME_STATE',
                payload: room
            });
        } else {
            // Clear the interval when countdown reaches zero
            clearInterval(countdownInterval);
        }
    }, 1000);

    // Start a new countdown timer for the round transition
    let roundDuration;
    if (room.room.round === 'question') {
        roundDuration = QUESTION_COUNTDOWN;
    } else if (room.room.round === 'answer') {
        roundDuration = ANSWER_COUNTDOWN;
    } else {
        roundDuration = TRANSLATION_COUNTDOWN;
    }

    room.translationTimer = setTimeout(async () => {
        // If we're in translation round, move to question round
        if (room.room.round === 'translation') {
            // Increment cycle count when moving from translation to question
            room.room.cycleCount++;
            
            // Check if we've reached the maximum number of cycles (10)
            if (room.room.cycleCount >= 1) {
                // End the game
                room.room.status = 'completed';
                
                // The passenger reveal will now happen after the captain makes their decision
                // instead of automatically at the end of the game
                
                // Send a game over message without the reveal
                const gameOverMsg = JSON.stringify({
                    type: 'CHAT_MESSAGE',
                    payload: {
                        roomKey: roomId,
                        sender: "System",
                        text: "<b>Game Over!</b> The maximum number of rounds has been reached. The captain must now decide which pod(s) to leave behind.",
                        timestamp: Date.now(),
                        isPrivate: false
                    }
                });
                
                // Broadcast to all clients in the room
                for (const [clientId, clientData] of Object.entries(clients)) {
                    if (clientData.room === roomId) {
                        try {
                            clientData.socket.send(gameOverMsg);
                        } catch (error) {
                            console.error('[WebSocket] Failed to send game over message:', error);
                        }
                    }
                }
                
                // Broadcast final game state
                broadcastToRoom(roomId, {
                    type: 'GAME_STATE',
                    payload: room
                });
                
                return;
            }
            
            room.room.round = 'question';
            room.room.countdown = QUESTION_COUNTDOWN / 1000;
            broadcastToRoom(roomId, {
                type: 'GAME_STATE',
                payload: room
            });
            // Start next countdown
            startTranslationCountdown(roomId);
            return;
        }

        // If we're in question round, move to answer round
        if (room.room.round === 'question') {
            room.room.round = 'answer';
            room.room.countdown = ANSWER_COUNTDOWN / 1000;
            broadcastToRoom(roomId, {
                type: 'GAME_STATE',
                payload: room
            });
            // Start next countdown
            startTranslationCountdown(roomId);
            return;
        }

        // If we're in answer round, process messages and move to translation
        if (room.room.round === 'answer') {
            await processPendingMessages(roomId);
        }
    }, roundDuration);
}

// Add helper to process all pending messages
async function processPendingMessages(roomId) {
    const room = rooms[roomId];
    if (!room) return;
    if (room.room.round !== 'answer') {
        return;
    }

    try {
        // Get the passenger mapping (created when the game started)
        const passengerMapping = room.passengerMapping || {};
        
        // Create an array to hold all passenger messages (real and AI)
        const allPassengerMessages = [null, null, null, null]; // Initialize with nulls for all 4 passengers
        
        // Format messages for all players, excluding host
        const nonHostPlayers = Object.entries(room.room.players)
            .filter(([nickname, _]) => nickname !== Object.keys(room.room.players)[0]);
        
        // Place real player messages in their assigned positions
        nonHostPlayers.forEach(([nickname, player]) => {
            const passengerNumber = passengerMapping[nickname];
            if (passengerNumber && passengerNumber >= 1 && passengerNumber <= 4) {
                allPassengerMessages[passengerNumber - 1] = {
                    clientID: player.clientId,
                    message: room.pendingMessages[nickname] || "NO_MESSAGE_SENT",
                    isReal: true,
                    passengerNumber: passengerNumber
                };
            }
        });
        
        // Count how many real player messages we have
        const realMessageCount = allPassengerMessages.filter(msg => msg !== null).length;
        const fakeCount = 4 - realMessageCount;
        
        // Identify which positions need AI-generated messages
        const emptyPositions = [];
        allPassengerMessages.forEach((msg, index) => {
            if (msg === null) {
                emptyPositions.push(index + 1); // Passenger numbers are 1-indexed
            }
        });
        
        // Get the most recent captain's question if available
        let captainQuestion = "";
        const hostNickname = Object.keys(room.room.players)[0];
        const recentMessages = [...Object.entries(room.pendingMessages)];
        for (let i = recentMessages.length - 1; i >= 0; i--) {
            if (recentMessages[i][0] === hostNickname) {
                captainQuestion = recentMessages[i][1];
                break;
            }
        }

        // Format real player messages for AI processing with their assigned passenger numbers
        const playersMessagesWithPositions = [];
        nonHostPlayers.forEach(([nickname, player]) => {
            const passengerNumber = passengerMapping[nickname];
            const message = room.pendingMessages[nickname];
            
            if (passengerNumber) {
                playersMessagesWithPositions.push({
                    passengerNumber: passengerNumber,
                    clientID: player.clientId,
                    message: message || "NO_MESSAGE_SENT",
                    isReal: true
                });
            }
        });

        const extendedMessage = {
            instruction: `Perform the following tasks:
1. Rephrase ALL real player messages with standard language, maintaining their meaning but changing the wording.
2. For positions where NO_MESSAGE_SENT is indicated, randomly do one of the following with equal probability (50/50):
   a. Generate a relevant response based on the captain's question: "${captainQuestion}"
   b. Generate static noise or garbled communication (like "*static* ...can't...hear..." or "*interference* ...system...malfunction...")
3. For empty passenger positions (${emptyPositions.join(', ')}), generate completely new responses.

The output must be valid JSON formatted as:
{ "players": [ { "player": "Passenger 1", "message": "..." }, { "player": "Passenger 2", "message": "..." }, { "player": "Passenger 3", "message": "..." }, { "player": "Passenger 4", "message": "..." } ] }
`,
            players: playersMessagesWithPositions,
            emptyPositions: emptyPositions,
            captainQuestion: captainQuestion
        };

        const aiResponse = await generateAIResponse(JSON.stringify(extendedMessage));
        
        if (aiResponse) {
            try {
                const parsedResponse = JSON.parse(aiResponse);
                
                // Process all messages from the AI response
                parsedResponse.players.forEach(player => {
                    // Extract passenger number from the player string (e.g., "Passenger 1" -> 1)
                    const passengerNumber = parseInt(player.player.replace('Passenger ', ''));
                    
                    if (passengerNumber >= 1 && passengerNumber <= 4) {
                        // Check if this position already has a real player message
                        const existingMessage = allPassengerMessages[passengerNumber - 1];
                        
                        if (existingMessage) {
                            // Update the message content with the AI's rephrased version
                            existingMessage.message = player.message;
                        } else {
                            // This is an AI-generated message for an empty position
                            allPassengerMessages[passengerNumber - 1] = {
                                message: player.message,
                                isReal: false,
                                passengerNumber: passengerNumber
                            };
                        }
                    }
                });
                
                // Format all messages in passenger number order
                const formattedResponse = allPassengerMessages
                    .map((msg, index) => {
                        const passengerNum = index + 1;
                        const message = msg?.message === "NO_MESSAGE_SENT" ? "Did not send a message" : msg?.message || "Error: Missing message";
                        return `<b>Passenger ${passengerNum}</b>: "${message}"`;
                    })
                    .join('<br>');
                console.log(formattedResponse);

                const aiMessageStr = JSON.stringify({
                    type: 'CHAT_MESSAGE',
                    payload: {
                        roomKey: roomId,
                        sender: "DigiTranslate 3000",
                        text: formattedResponse,
                        timestamp: Date.now(),
                        isPrivate: false
                    }
                });

                // Broadcast AI response to all clients
                for (const [clientId, clientData] of Object.entries(clients)) {
                    if (clientData.room === roomId) {
                        try {
                            clientData.socket.send(aiMessageStr);
                        } catch (error) {
                            console.error('[WebSocket] Failed to send AI message to client:', error);
                            removeClientFromRoom(clientData.socket, roomId);
                        }
                    }
                }
            } catch (innerError) {
                console.error('[WebSocket] Error parsing AI response:', innerError);
            }
        }
    } catch (error) {
        console.error('[WebSocket] Error processing messages:', error);
    } finally {
        // Clear pending messages
        room.pendingMessages = {};

        // Reset hasSentMessage flag for all players
        Object.values(room.room.players).forEach(player => {
            player.hasSentMessage = false;
        });

        // If still in answer round, transition to translation
        if (room.room.round === 'answer') {
            room.room.round = 'translation';
            room.room.countdown = TRANSLATION_COUNTDOWN / 1000;
            broadcastToRoom(roomId, {
                type: 'GAME_STATE',
                payload: room
            });
        }

        // Restart the countdown for the next round
        startTranslationCountdown(roomId);
    }
}

// Create a safe copy of the room object for JSON serialization
function createSafeRoomCopy(room) {
    if (!room) return null;
    
    // Create a new object with only the properties we want to send to clients
    return {
        room: { ...room.room },
        pendingMessages: { ...room.pendingMessages },
        passengerMapping: room.passengerMapping
        // Exclude circular references like timers
    };
}

// Broadcast to all clients in a room
function broadcastToRoom(roomId, message) {
    const room = rooms[roomId];
    if (!room) return;
    
    // Handle the payload, ensuring we don't include circular references
    let payload;
    if (message.payload === room) {
        // If the payload is the room object, create a safe copy
        payload = createSafeRoomCopy(room);
    } else {
        // Otherwise use the provided payload
        payload = message.payload || {};
    }
    
    const messageStr = JSON.stringify({
        type: message.type,
        payload
    });

    for (const [clientId, clientData] of Object.entries(clients)) {
        if (clientData.room === roomId) {
            try {
                clientData.socket.send(messageStr);
            } catch (error) {
                console.error('[WebSocket] Failed to send to client:', error);
                removeClientFromRoom(clientData.socket, roomId);
            }
        }
    }
}

// Remove client from room and cleanup if needed
function removeClientFromRoom(client, roomId) {
    const room = rooms[roomId];
    if (!room) return;

    // Find and remove player
    let disconnectedPlayer = null;
    const clientId = clientIds.get(client);

    Object.entries(room.room.players).forEach(([nickname, player]) => {
        if (player.clientId === clientId) {
            disconnectedPlayer = nickname;
        }
    });

    if (disconnectedPlayer) {
        delete room.room.players[disconnectedPlayer];
    }

    delete clients[clientId];
    // No need to delete from clientIds as it's a WeakMap

    // Cleanup empty room
    if (Object.keys(room.room.players).length === 0) {
        delete rooms[roomId];
        console.log(`[WebSocket] Room ${roomId} deleted (empty)`);
        return;
    }

    // Notify remaining players
    broadcastToRoom(roomId, {
        type: 'GAME_STATE',
        payload: room
    });
}

// Add a new function to handle the passenger reveal
function sendPassengerReveal(roomId) {
    const room = rooms[roomId];
    if (!room) return;
    
    // Generate a message revealing which passengers were real and which were AI
    let revealMessage = "<b>Passenger Reveal:</b><br>";
    
    // Get the passenger mapping
    const passengerMapping = room.passengerMapping || {};
    
    // Reverse the mapping to get passenger number -> player name
    const reversedMapping = {};
    Object.entries(passengerMapping).forEach(([playerName, passengerNum]) => {
        reversedMapping[passengerNum] = playerName;
    });
    
    // Create the reveal message for each passenger
    for (let i = 1; i <= 4; i++) {
        const playerName = reversedMapping[i];
        if (playerName) {
            revealMessage += `Passenger ${i}: <span style="color: #4ade80;">Real Player (${playerName})</span><br>`;
        } else {
            revealMessage += `Passenger ${i}: <span style="color: #f87171;">AI-Generated</span><br>`;
        }
    }
    
    // Send the reveal message
    const revealMsg = JSON.stringify({
        type: 'CHAT_MESSAGE',
        payload: {
            roomKey: roomId,
            sender: "System",
            text: revealMessage,
            timestamp: Date.now(),
            isPrivate: false
        }
    });
    
    // Broadcast to all clients in the room
    for (const [clientId, clientData] of Object.entries(clients)) {
        if (clientData.room === roomId) {
            try {
                clientData.socket.send(revealMsg);
            } catch (err) {
                console.error(`[WebSocket] Error sending reveal message to client ${clientId}:`, err);
            }
        }
    }
}

export default defineWebSocketHandler({
    open(peer) {
        // Store unique ID for this client
        clientIds.set(peer, generateClientId());
        console.log('[WebSocket] Client connected:', clientIds.get(peer));
    },

    async message(peer, message) {
        try {
            const data = JSON.parse(message.text());
            const clientId = clientIds.get(peer);
            console.log('[WebSocket] Received from', clientId, ':', data);

            switch (data.type) {
                case 'CHAT_MESSAGE': {
                    const roomId = clients[clientId]?.room;
                    const room = rooms[roomId];
                    if (!room) return;

                    // Verify the sender is in the room
                    const player = room.room.players[data.payload.sender];
                    if (!player || player.clientId !== clientId) {
                        return;
                    }

                    // Check if player has already sent a message this round
                    if (player.hasSentMessage) {
                        peer.send(JSON.stringify({
                            type: 'ERROR',
                            payload: 'You can only send one message per round'
                        }));
                        return;
                    }

                    // Get host nickname (first player in the room)
                    const [hostNickname] = Object.keys(room.room.players);
                    const isHostMessage = data.payload.sender === hostNickname;

                    // Mark that the player has sent a message this round
                    player.hasSentMessage = true;

                    // Create message payload
                    const messagePayload = {
                        roomKey: roomId,
                        sender: data.payload.sender,
                        text: data.payload.text,
                        timestamp: data.payload.timestamp,
                        isPrivate: !isHostMessage // Only non-host messages are private
                    };

                    if (isHostMessage) {
                        // If host message, broadcast to all clients
                        for (const [clientId, clientData] of Object.entries(clients)) {
                            if (clientData.room === roomId) {
                                try {
                                    clientData.socket.send(JSON.stringify({
                                        type: 'CHAT_MESSAGE',
                                        payload: messagePayload
                                    }));
                                } catch (error) {
                                    console.error('[WebSocket] Failed to send chat message to client:', error);
                                    removeClientFromRoom(clientData.socket, roomId);
                                }
                            }
                        }
                    } else {
                        // If non-host message, only send to sender and store for translation
                        peer.send(JSON.stringify({
                            type: 'CHAT_MESSAGE',
                            payload: messagePayload
                        }));
                        
                        // Store the message for translation
                        room.pendingMessages[data.payload.sender] = data.payload.text;
                    }

                    break;
                }
                
                case 'CREATE_ROOM': {
                    console.log('Server received CREATE_ROOM request:', data);  // Log the received data

                    if (!data.roomId || !data.playerNickname) {
                        console.log('Invalid data:', { roomId: data.roomId, nickname: data.playerNickname });  // Log the invalid data
                        peer.send(JSON.stringify({
                            type: 'ERROR',
                            payload: 'Invalid room creation data'
                        }));
                        return;
                    }

                    if (!createRoom(data.roomId)) {
                        peer.send(JSON.stringify({
                            type: 'ERROR',
                            payload: 'Room already exists'
                        }));
                        return;
                    }

                    const room = rooms[data.roomId];
                    room.room.players[data.playerNickname] = {
                        nickname: data.playerNickname,
                        ready: true,
                        clientId,
                        hasSentMessage: false
                    };

                    clients[clientId] = {
                        socket: peer,
                        room: data.roomId
                    };

                    peer.send(JSON.stringify({
                        type: 'ROOM_CREATED',
                        roomId: data.roomId,
                        payload: room
                    }));

                    peer.send(JSON.stringify({
                        type: 'GAME_STATE',
                        payload: room
                    }));
                    break;
                }

                case 'JOIN_ROOM': {
                    console.log('Server received JOIN_ROOM request:', data);  // Add this log
                    console.log('Available rooms:', Object.keys(rooms));      // Add this log

                    const room = rooms[data.roomId];
                    if (!room) {
                        console.log('Room not found:', data.roomId);         // Add this log
                        peer.send(JSON.stringify({
                            type: 'ERROR',
                            payload: 'Room not found'
                        }));
                        return;
                    }

                    if (room.room.status !== 'waiting') {
                        peer.send(JSON.stringify({
                            type: 'ERROR',
                            payload: 'Game already in progress'
                        }));
                        return;
                    }

                    if (data.playerNickname in room.room.players) {
                        peer.send(JSON.stringify({
                            type: 'ERROR',
                            payload: 'Nickname already taken in this room'
                        }));
                        return;
                    }

                    room.room.players[data.playerNickname] = {
                        nickname: data.playerNickname,
                        ready: false,
                        clientId,
                        hasSentMessage: false
                    };

                    clients[clientId] = {
                        socket: peer,
                        room: data.roomId
                    };
                    
                    broadcastToRoom(data.roomId, {
                        type: 'GAME_STATE',
                        payload: room
                    });
                    break;
                }

                case 'PLAYER_READY': {
                    const { playerNickname, isReady } = data;
                    const roomId = clients[clientId]?.room;
                    const room = rooms[roomId];
                    if (!room) return;

                    // Update player ready status
                    const player = room.room.players[playerNickname];
                    if (player && player.clientId === clientId) {
                        player.ready = isReady;
                        broadcastToRoom(roomId, {
                            type: 'GAME_STATE',
                            payload: createSafeRoomCopy(room)
                        });
                    }
                    break;
                }

                case 'START_GAME': {
                    const roomId = clients[clientId]?.room;
                    const room = rooms[roomId];
                    if (!room) return;

                    // Verify request is from host (first player)
                    const [hostNickname] = Object.keys(room.room.players);
                    const requestingPlayer = room.room.players[data.playerNickname]
                    
                    console.log('start game',requestingPlayer?.clientId,clientId,
                        data.playerNickname, hostNickname)
                    if (requestingPlayer?.clientId !== clientId ||
                        data.playerNickname !== hostNickname) {
                        return;
                    }
                    
                    if (Array.from(Object.values(room.room.players)).every(p => p.ready)) {
                        // Create a mapping of real players to passenger numbers
                        // Get non-host player nicknames
                        const nonHostPlayers = Object.entries(room.room.players)
                            .filter(([nickname, _]) => nickname !== hostNickname)
                            .map(([nickname, _]) => nickname);
                        
                        // Create an array of passenger positions (1-4)
                        const passengerPositions = [1, 2, 3, 4];
                        
                        // Shuffle the passenger positions
                        for (let i = passengerPositions.length - 1; i > 0; i--) {
                            const j = Math.floor(Math.random() * (i + 1));
                            [passengerPositions[i], passengerPositions[j]] = [passengerPositions[j], passengerPositions[i]];
                        }
                        
                        // Create the mapping: { playerNickname: passengerNumber }
                        const passengerMapping = {};
                        nonHostPlayers.forEach((nickname, index) => {
                            // Assign player to a random position (up to the number of real players)
                            passengerMapping[nickname] = passengerPositions[index];
                        });
                        
                        // Store the mapping in the room state
                        room.passengerMapping = passengerMapping;
                        console.log(`[WebSocket] Created passenger mapping:`, passengerMapping);
                        
                        room.room.status = 'playing';
                        broadcastToRoom(roomId, {
                            type: 'GAME_STATE',
                            payload: room
                        });
                    }

                    // System message is sent to all clients
                    const messageStr = JSON.stringify({
                        type: 'CHAT_MESSAGE',
                        payload: {
                            roomKey: roomId,
                            sender: "System",
                            text: "The game has commenced. Captain will ask questions to determine which pod holds the android. Don't get left behind.",
                            timestamp: Date.now(),
                            isPrivate: false
                        }
                    });
                   
                    // Send the system message to all clients
                    for (const [clientId, clientData] of Object.entries(clients)) {
                        if (clientData.room === roomId) {
                            try {
                                clientData.socket.send(messageStr);
                            } catch (error) {
                                console.error('[WebSocket] Failed to send chat message to client:', error);
                                removeClientFromRoom(clientData.socket, roomId);
                            }
                        }
                    }

                    // Start translation countdown
                    startTranslationCountdown(roomId);

                    break;
                }

                case 'CAPTAIN_DECISION': {
                    const { roomKey, selectedPassengers } = data.payload;
                    console.log(`[WebSocket] Captain's decision for room ${roomKey}:`, selectedPassengers);
                    
                    // Send the passenger reveal after the captain's decision
                    sendPassengerReveal(roomKey);
                    break;
                }
            }
        } catch (error) {
            console.error('[WebSocket] Error:', error);
            peer.send(JSON.stringify({
                type: 'ERROR',
                payload: 'Server error'
            }));
        }
    },

    close(peer) {
        const clientId = clientIds.get(peer);
        const roomId = clients[clientId]?.room;
        if (roomId) {
            removeClientFromRoom(peer, roomId);
            console.log('[WebSocket] Client disconnected from room:', roomId);
        }
    },
});