# Spacescape - Project Context

## Project Overview
Spacescape is a real-time multiplayer space-themed social deduction game built with Nuxt 3 and WebSockets. Players join as crew members on a spaceship with a malfunctioning reactor, where the captain must ultimately decide which passenger pods to leave behind. The game features real-time gameplay where players must determine which passengers are real humans and which are AI entities through a series of question and answer rounds.

## Key Features
- Real-time multiplayer gameplay with WebSocket communication
- Nickname-based player identification
- Multiple game rounds (Question, Answer, Translation)
- AI-generated responses for non-player characters
- Game state synchronization across all players
- Space-themed UI with animated starfield
- Responsive design with Tailwind CSS

## Tech Stack
- **Frontend**: Nuxt 3, Vue 3 Composition API, Tailwind CSS
- **Backend**: Nitro's WebSocket server
- **AI Integration**: OpenAI API (GPT-4o-mini) for AI-generated responses
- **Deployment**: Cloudflare Pages and Workers

## Project Structure
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

## Key Configuration Files
- `nuxt.config.ts`: Nuxt configuration with WebSocket setup
- `tailwind.config.js`: Tailwind CSS configuration
- `package.json`: Project dependencies and scripts
- `tsconfig.json`: TypeScript configuration

## Core Gameplay Flow
1. Players join a room with a unique room key
2. The first player becomes the Captain (host)
3. Players go through multiple rounds of gameplay:
   - Question Round: Players submit questions (20 seconds)
   - Answer Round: Players respond to questions (30 seconds)
   - Translation Round: AI-generated responses are shown (variable duration)
4. After 10 cycles, the game ends and the Captain must decide which passenger pods to leave behind
5. The game reveals which pods contained real players vs AI-generated characters

## Architecture
- WebSocket-based real-time communication
- In-memory game state with server-side management
- Client-server synchronization for game rounds and timers
- AI integration for generating responses for non-player characters
- Responsive UI design that works across devices

## Development Setup
- **Prerequisites**: Node.js (v20+), pnpm (v8+)
- **Setup**: `pnpm install`
- **Development**: `pnpm dev`
- **Build**: `pnpm build`

## Current Development Status
The project is in active development with core functionality implemented. Future improvements planned include:
- Persistent game state
- Player authentication
- Leaderboard system
- Additional game modes
- Enhanced AI character responses