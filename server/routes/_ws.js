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
        translationTimer: null
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
            if (room.room.cycleCount >= 2) {
                // End the game
                room.room.status = 'completed';
                
                // Send a game over message
                const gameOverMsg = JSON.stringify({
                    type: 'CHAT_MESSAGE',
                    payload: {
                        roomKey: roomId,
                        sender: "System",
                        text: "<b>Game Over!</b> The maximum number of cycles has been reached. The captain must now decide which pod to leave behind.",
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
        // Format messages for all players, excluding host
        const playersMessages = Object.entries(room.room.players).map(([nickname, player]) => {
            if (nickname === Object.keys(room.room.players)[0]) {
                return null;
            }
            return {
                clientID: player.clientId,
                message: room.pendingMessages[nickname] || "NO_MESSAGE_SENT"
            };
        }).filter(Boolean);

        const fakeCount = 4 - playersMessages.length;

        const extendedMessage = {
            instruction: `Rephrase the following messages with standard language. Then, based on the provided messages, generate ${fakeCount} additional fake player's responses so that the total number of passenger responses equals 4. The output must be valid JSON formatted as { "players": [ { "player": "Passenger 1", "message": "..." }, { "player": "Passenger 2", "message": "..." }, { "player": "Passenger 3", "message": "..." }, { "player": "Passenger 4", "message": "..." } ] }.`,
            players: playersMessages
        };

        const aiResponse = await generateAIResponse(JSON.stringify(extendedMessage));
        
        if (aiResponse) {
            try {
                const parsedResponse = JSON.parse(aiResponse);
                const formattedResponse = parsedResponse.players
                    .map((player, index) => {
                        const message = player.message === "NO_MESSAGE_SENT" ? "Did not send a message" : player.message;
                        return `<b>Passenger ${index + 1}</b>: "${message}"`;
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

// Broadcast to all clients in a room
function broadcastToRoom(roomId, message) {
    const room = rooms[roomId];
    if (!room) return;
    
    const payload = room
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
                    const roomId = clients[clientId]?.room;
                    const room = rooms[roomId];
                    if (!room) return;

                    const player = room.room.players[data.playerNickname]
                    if (player && player.clientId === clientId) {
                        player.ready = data.isReady;
                        broadcastToRoom(roomId, {
                            type: 'GAME_STATE',
                            payload: room
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