# Spacescape - Project Documentation

## 1. Project Overview
Spacescape is a real-time multiplayer space-themed social deduction game built with Nuxt 3 and WebSockets. Players join as crew members on a spaceship with a malfunctioning reactor, where the captain must ultimately decide which passenger pods to leave behind. The game features real-time gameplay where players must determine which passengers are real humans and which are AI entities through a series of question and answer rounds.

## 2. Key Features
- Real-time multiplayer gameplay with WebSocket communication
- Nickname-based player identification
- Multiple game rounds (Question, Answer, Translation)
- AI-generated responses for non-player characters
- Game state synchronization across all players
- Space-themed UI with animated starfield
- Responsive design with Tailwind CSS

## 3. Tech Stack
- **Frontend**: Nuxt 3, Vue 3 Composition API, Tailwind CSS
- **Backend**: Nitro's WebSocket server
- **AI Integration**: OpenAI API (GPT-4o-mini) for AI-generated responses
- **Deployment**: Cloudflare Pages and Workers

## 4. Project Structure
- **`/components/`**: Vue components for UI elements
  - `GameChat.vue`: In-game chat functionality
  - `NicknameModal.vue`: Player nickname input and validation
  - `WelcomeScreen.vue`: Initial screen for hosting/joining games
  - `game/Board.vue`: Main game board component
- **`/composables/`**: Vue composables for shared logic
  - `useGame.js`: Game state and WebSocket logic
- **`/pages/`**: Nuxt page components
  - `index.vue`: Main game page
- **`/server/`**: Backend server code
  - `ai-chat.js`: AI-generated chat responses
  - `routes/_ws.js`: WebSocket server handler
  - `game/GameLogic.js`: Core game logic implementation
  - `services/`: Service layer
    - `GameController.js`: Game controller for managing game actions
    - `RoomManager.js`: Room management service
- **`/worker/`**: Cloudflare Worker implementation
  - `durable_objects/GameRoom.js`: Durable Objects implementation for game rooms
  - `index.js`: Worker entry point
  - `wrangler.toml`: Cloudflare Worker configuration
- **`/assets/`**: Static assets for the application
- **`/public/`**: Public files served by the application

## 5. Key Configuration Files
- `nuxt.config.ts`: Nuxt configuration with WebSocket setup
- `tailwind.config.js`: Tailwind CSS configuration
- `package.json`: Project dependencies and scripts
- `tsconfig.json`: TypeScript configuration

## 6. Core Gameplay Flow
1. Players join a room with a unique room key
2. The first player becomes the Captain (host)
3. Players go through multiple rounds of gameplay:
   - Question Round: Players submit questions (20 seconds)
   - Answer Round: Players respond to questions (30 seconds)
   - Translation Round: AI-generated responses are shown (variable duration)
4. After 10 cycles, the game ends and the Captain must decide which passenger pods to leave behind
5. The game reveals which pods contained real players vs AI-generated characters

## 7. Development Setup
- **Prerequisites**: Node.js (v20+), pnpm (v8+)
- **Setup**: `pnpm install`
- **Development**: `pnpm dev`
- **Build**: `pnpm build`

## 8. Current Development Status
The project is in active development with core functionality implemented. Future improvements planned include:
- Persistent game state
- Player authentication
- Leaderboard system
- Additional game modes
- Enhanced AI character responses

## 9. Technical Architecture

### 9.1 Main Components and Their Roles
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

### 9.2 Core Functionality Details
1. **Real-time Multiplayer Gameplay**
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

3. **WebSocket Management**
   - **Composables**: `composables/useGame.js`
   - **Functions**: 
     - `connect`: Establishes WebSocket connection.
     - `handleWebSocketMessage`: Processes incoming WebSocket messages.
     - `sendChatMessage`: Sends chat messages to the server.
     - `sendCaptainDecision`: Sends the captain's final decision to the server.
   - **Data Flow**: 
     - Manages connection status, error handling, game state, and messages.

4. **AI Chat Integration**
   - **Backend**: `server/ai-chat.js`
   - **Functions**: 
     - `generateAIResponse`: Sends a message to the OpenAI API to generate a response.
   - **Model**: Uses GPT-4o-mini for generating AI passenger responses.
   - **Context**: Provides game context to the AI model to generate appropriate responses.

5. **Captain's Decision Interface**
   - **Functions**:
     - `submitCaptainDecision`: Submits the captain's decision on which passengers to leave behind.
     - `getFakePassengerCount`: Calculates how many passengers should be left behind.
   - **Data Models**:
     - `selectedPassengers`: Tracks which passengers the captain has selected.
     - `selectedPassengerCount`: Counts how many passengers have been selected.

### 9.3 Data Flow and Component Interaction
1. **User Interaction**:
   - Users interact with the frontend components to perform actions like sending messages, setting nicknames, hosting/joining games, and playing the game.
   
2. **Frontend to Backend Communication**:
   - Frontend components emit events and call functions in `composables/useGame.js` to manage game state and WebSocket interactions.
   - `useGame` composable handles WebSocket connections, room management, and state updates.

3. **Backend Processing**:
   - WebSocket server receives messages from clients, processes them, and broadcasts updates to all clients in a room.
   - AI chat responses are generated using OpenAI API and sent back to clients.

4. **Real-time Updates**:
   - WebSocket server manages real-time updates, ensuring all clients receive synchronized game states and messages.
   - Countdown timers and game round transitions are handled by the server and broadcasted to clients.
   - Client-side timers provide smooth countdown experiences while staying synchronized with the server.

### 9.4 UI/UX Design
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

### 9.5 Deployment
1. **Development Environment**:
   - Local development using Node.js and pnpm.
   - WebSocket server runs locally during development.

2. **Production Environment**:
   - Deployed on Cloudflare Pages.
   - WebSocket server deployed separately to handle real-time communication.

## 10. Known Technical Challenges
- The starfield background in Board.vue is resource-intensive, creating 8,000 DOM elements for stars and animating them with CSS rotation. This causes performance issues. A more efficient approach would be to use Canvas for rendering the starfield instead of DOM manipulation.
- Maintaining WebSocket connections across different deployment environments.
- Ensuring consistent game state synchronization across all clients.
- Optimizing AI response generation for faster translation rounds.
