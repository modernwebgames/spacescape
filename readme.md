_Transferred from [/politicals/tree/chatgame](https://github.com/sefasenlik/politicals/tree/chatgame)_

<img src="/public/spacescape.png" alt="Game Logo" width="300"/>

A real-time multiplayer space-themed social deduction game built with Nuxt 3 and WebSockets. Players join as crew members on a spaceship with a malfunctioning reactor, where the captain must ultimately decide which passenger pods to leave behind.

## Features

- Real-time multiplayer gameplay with WebSocket communication
- Nickname-based player identification
- Multiple game rounds (Question, Answer, Translation)
- AI-generated responses for non-player characters
- Game state synchronization across all players
- Beautiful space-themed UI with optimized animated starfield
- Responsive design with Tailwind CSS
- Comprehensive scoring system that rewards player actions
- Performance-optimized background animations

## Tech Stack

- Nuxt 3
- Vue 3 Composition API
- Nitro's WebSocket
- Tailwind CSS
- OpenAI API for AI-generated responses
- Cloudflare Pages (hosting)

## Local Development

### Prerequisites

- Node.js (v20 or higher)
- pnpm (v8 or higher)

### Setup

```bash
# Clone the repository
git clone https://github.com/modernwebgames/spacescape.git
cd spacescape

# Install dependencies
pnpm install

# Start development server
pnpm dev
```

The game will be available at `http://localhost:3000`

## Gameplay Overview

1. Players join a room with a unique room key
2. The first player becomes the Captain (host)
3. Players go through multiple rounds of gameplay:
   - Question Round: Players submit questions
   - Answer Round: Players respond to questions
   - Translation Round: AI-generated responses are shown
4. After 10 cycles, the game ends and the Captain must decide which passenger pods to leave behind
5. The game reveals which pods contained real players vs AI-generated characters
6. Final scores are calculated and displayed to all players

## Scoring System

The game features a comprehensive scoring system:

- **Captain Actions**:
  - Asking a question: +10 points
  - Correctly identifying an AI passenger: +50 points
  - Incorrectly identifying a real player: -30 points

- **Player Actions**:
  - Sending a response: +5 points
  - Surviving (not being left behind): +20 points

Scores are displayed in real-time and a final scoreboard is shown at the end of the game.

## Project Structure

```
├── components/
│   ├── GameChat.vue         # In-game chat functionality
│   ├── NicknameModal.vue    # Player nickname input and validation
│   ├── WelcomeScreen.vue    # Initial screen for hosting/joining games
│   └── game/
│       └── Board.vue        # Main game board component with starfield
├── composables/
│   └── useGame.js           # Game state, WebSocket logic, and score tracking
├── pages/
│   └── index.vue            # Main game page
├── server/
│   ├── ai-chat.js           # AI-generated chat responses
│   ├── game/
│   │   └── GameLogic.js     # Core game logic and scoring system
│   ├── services/
│   │   └── GameController.js # Game flow and state management
│   └── routes/
│       └── _ws.js           # WebSocket server handler
├── app.vue                  # Root app component
├── nuxt.config.ts           # Nuxt configuration
└── tailwind.config.js       # Tailwind configuration
```

## Performance Optimizations

- **Starfield Background**: Optimized to use circular distribution of stars with reduced DOM elements (1,000 stars instead of 8,000)
- **Resource Usage**: Background animations are dynamically sized based on screen diagonal for optimal coverage and performance
- **Rendering**: Improved rendering approach to reduce CPU usage during animations

## Development Notes

- The game uses Nitro's built-in WebSocket capabilities for real-time communication
- Game state is held in memory on the server
- Players are identified by nicknames
- OpenAI API is used to generate responses for non-player characters
- Scoring system is integrated with the game flow to reward player actions

## Future Improvements

- [ ] Persistent game state
- [ ] Player authentication
- [ ] Enhanced leaderboard system
- [ ] Additional game modes
- [ ] Enhanced AI character responses
- [ ] Mobile-optimized UI
- [ ] Additional scoring mechanics

## Contributing

1. Fork the repository
2. Create your feature branch: `git checkout -b feature/amazing-feature`
3. Commit your changes: `git commit -m 'Add amazing feature'`
4. Push to the branch: `git push origin feature/amazing-feature`
5. Open a Pull Request

## License

MIT

## Authors

Korhan Özdemir - [@korhanozdemir](https://github.com/korhanozdemir)

Sefa Şenlik - [@sefasenlik](https://github.com/sefasenlik)

## Changelog

### Version 0.2.0
- Added comprehensive scoring system
- Optimized starfield background for better performance
- Improved UI with score display and game feedback

### Version 0.1.0-alpha
- Initial alpha release of the game
- Core gameplay mechanics implemented
- UI and controls added for PCs and mobile devices