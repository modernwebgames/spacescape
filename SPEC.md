# Technical Specification

## System Overview
The system is a real-time multiplayer social deduction game built using Nuxt 3, Vue 3 Composition API, Nitro's WebSocket, and Tailwind CSS. The purpose of the system is to provide an engaging multiplayer experience where players participate in a space-themed scenario where a captain must determine which passengers are real humans and which are AI entities. The main components include frontend Vue components, backend WebSocket services, and OpenAI API integration for AI-generated responses.

### Main Components and Their Roles
- **Frontend Components**: Handle user interactions, display game states, and manage player inputs.
  - `components/GameChat.vue`: Manages in-game chat functionality and message display.
  - `components/NicknameModal.vue`: Handles player nickname input and validation.
  - `components/WelcomeScreen.vue`: Manages the initial screen where players can host or join a game.
  - `components/game/Board.vue`: The main game board component where the gameplay occurs, including the starfield animation, game rounds, and captain's decision interface.
- **Backend Services**: Manage game logic, WebSocket connections, and real-time updates.
  - `server/ai-chat.js`: Handles AI-generated chat responses using OpenAI API.
  - `server/routes/_ws.js`: Manages WebSocket connections, room creation, game state transitions, and message processing.
- **Composables**: Manage game state and WebSocket logic.
  - `composables/useGame.js`: Centralizes game state management, WebSocket interactions, and player actions.
- **Configuration Files**: Set up the development environment and project configurations.
  - `nuxt.config.ts`: Configures the Nuxt.js application.
  - `tailwind.config.js`: Configures TailwindCSS for the project.
  - `package.json`: Defines project dependencies and scripts.
  - `tsconfig.json`: Configures TypeScript for the project.

## Core Functionality
### Primary Features and Their Implementation
1. **Real-time Multiplayer Gameplay**
   - **Components**: `components/game/Board.vue`
   - **Functions**: 
     - `toggleReady`: Manages player readiness.
     - `onStartGame`: Starts the game if all conditions are met.
     - `startClientTimer`: Manages client-side timer for countdown display.
     - `submitCaptainDecision`: Processes the captain's final decision on which passengers to leave behind.
   - **Data Models**: 
     - `gameState`: Tracks the current state of the game including room status, round type, and player information.
     - `clientCountdown`: Client-side countdown timer for synchronization.
     - `selectedPassengers`: Tracks which passengers the captain has selected to leave behind.
     - `captainDecisionMade`: Indicates whether the captain has made the final decision.

2. **Game Rounds System**
   - **Server Functions**:
     - `startTranslationCountdown`: Manages the timing for each game round.
     - `processPendingMessages`: Processes player messages and generates AI responses during translation rounds.
     - `moveToNextRound`: Transitions the game to the next round after processing.
   - **Round Types**:
     - `question`: Captain asks a question to all passengers.
     - `answer`: Players respond to the captain's question.
     - `translation`: AI-generated responses are processed and displayed.
   - **Timing**:
     - Question round: 20 seconds
     - Answer round: 30 seconds
     - Translation round: Variable duration based on AI processing

3. **Nickname Management**
   - **Components**: `components/NicknameModal.vue`
   - **Functions**: 
     - `save`: Validates and saves the nickname.
     - `close`: Closes the modal and emits an event.
   - **Data Models**: 
     - `nickname`: Holds the current nickname input.
     - `error`: Holds any validation error messages.

4. **Game Chat**
   - **Components**: `components/GameChat.vue`
   - **Functions**: 
     - `sendMessage`: Handles sending a chat message.
     - `formatTime`: Formats the timestamp of a message.
   - **Data Models**: 
     - `visibleMessages`: Filters messages to be displayed based on visibility rules.
     - `newMessage`: Holds the current message input.

5. **Welcome Screen**
   - **Components**: `components/WelcomeScreen.vue`
   - **Functions**: 
     - `handleHostGame`: Hosts a new game room.
     - `handleJoinGame`: Joins an existing game room.
     - `openNicknameModal`: Opens the nickname modal.
   - **Data Models**: 
     - `currentView`: Determines the current view state.
     - `roomKey`: Holds the room key for joining a game.
     - `generatedRoomKey`: Holds the generated room key for hosting a game.

6. **WebSocket Management**
   - **Composables**: `composables/useGame.js`
   - **Functions**: 
     - `connect`: Establishes WebSocket connection.
     - `handleWebSocketMessage`: Processes incoming WebSocket messages.
     - `sendChatMessage`: Sends chat messages to the server.
     - `sendCaptainDecision`: Sends the captain's final decision to the server.
   - **Data Flow**: 
     - Manages connection status, error handling, game state, and messages.

7. **AI Chat Integration**
   - **Backend**: `server/ai-chat.js`
   - **Functions**: 
     - `generateAIResponse`: Sends a message to the OpenAI API to generate a response.
   - **Model**: Uses GPT-4o-mini for generating AI passenger responses.
   - **Context**: Provides game context to the AI model to generate appropriate responses.

8. **Captain's Decision Interface**
   - **Components**: `components/game/Board.vue`
   - **Functions**:
     - `submitCaptainDecision`: Submits the captain's decision on which passengers to leave behind.
     - `getFakePassengerCount`: Calculates how many passengers should be left behind.
   - **Data Models**:
     - `selectedPassengers`: Tracks which passengers the captain has selected.
     - `selectedPassengerCount`: Counts how many passengers have been selected.

9. **WebSocket Server Handling**
   - **Backend**: `server/routes/_ws.js`
   - **Functions**: 
     - `createRoom`: Initializes a new game room.
     - `startTranslationCountdown`: Starts a countdown timer for game rounds.
     - `processPendingMessages`: Processes pending messages and generates AI responses.
     - `broadcastToRoom`: Sends a message to all clients in a room.
     - `removeClientFromRoom`: Removes a client from a room and handles cleanup.
     - `sendPassengerReveal`: Reveals which passengers were real players vs. AI.

## Architecture
### Data Flow and Component Interaction
1. **User Interaction**:
   - Users interact with the frontend components (`GameChat.vue`, `NicknameModal.vue`, `WelcomeScreen.vue`, `Board.vue`) to perform actions like sending messages, setting nicknames, hosting/joining games, and playing the game.
   
2. **Frontend to Backend Communication**:
   - Frontend components emit events and call functions in `composables/useGame.js` to manage game state and WebSocket interactions.
   - `useGame` composable handles WebSocket connections, room management, and state updates.

3. **Backend Processing**:
   - WebSocket server (`server/routes/_ws.js`) receives messages from clients, processes them, and broadcasts updates to all clients in a room.
   - AI chat responses are generated by `server/ai-chat.js` using OpenAI API and sent back to clients.

4. **Game Flow**:
   - **Room Creation**: Captain (first player) creates a room and shares the room key with other players.
   - **Player Joining**: Players join the room using the room key and set their nicknames.
   - **Game Start**: Once all players are ready, the captain starts the game.
   - **Game Rounds**: The game cycles through question, answer, and translation rounds for a total of 10 cycles.
   - **Captain's Decision**: After all cycles, the captain must decide which passenger pods to leave behind.
   - **Game Conclusion**: The game reveals which pods contained real players vs AI-generated characters.

5. **Real-time Updates**:
   - WebSocket server manages real-time updates, ensuring all clients receive synchronized game states and messages.
   - Countdown timers and game round transitions are handled by the server and broadcasted to clients.
   - Client-side timers provide smooth countdown experiences while staying synchronized with the server.

6. **Configuration and Setup**:
   - `nuxt.config.ts` configures the Nuxt.js application, enabling experimental WebSocket support and integrating TailwindCSS.
   - `tailwind.config.js` configures TailwindCSS to scan and style all project files.
   - `package.json` defines project dependencies and scripts for building, developing, and deploying the application.
   - `tsconfig.json` configures TypeScript for the project, ensuring compatibility with Nuxt.js.

## UI/UX Design
1. **Space Theme**:
   - Animated starfield background creates an immersive space environment.
   - Color scheme uses dark backgrounds with blue, green, and purple accents to create a futuristic space interface.

2. **Game Interface**:
   - Chat panel for communication between players.
   - Sidebar displaying player information and game status.
   - Round timer showing current round type and remaining time.
   - Captain's decision interface for the final phase of the game.

3. **Responsive Design**:
   - Tailwind CSS provides responsive design capabilities.
   - Interface adapts to different screen sizes while maintaining functionality.

## Deployment
1. **Development Environment**:
   - Local development using Node.js and pnpm.
   - WebSocket server runs locally during development.

2. **Production Environment**:
   - Deployed on Cloudflare Pages.
   - WebSocket server deployed separately to handle real-time communication.