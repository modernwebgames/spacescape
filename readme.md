_Transferred from [/politicals/tree/chatgame](https://github.com/sefasenlik/politicals/tree/chatgame)_

<img src="/public/spacescape.png" alt="Game Logo" width="300"/>

A real-time multiplayer space-themed social deduction game built with Nuxt 3 and WebSockets. Players join as crew members on a spaceship with a malfunctioning reactor, where the captain must ultimately decide which passenger pods to leave behind.

## Features

- Real-time multiplayer gameplay with WebSocket communication
- Nickname-based player identification
- Multiple game rounds (Question, Answer, Translation)
- AI-generated responses for android passengers
- Game state synchronization across all players
- Beautiful space-themed UI with optimized animated starfield
- Responsive design with Tailwind CSS
- Comprehensive scoring system that rewards player actions
- Performance-optimized background animations
- Adaptive UI for both desktop and mobile devices

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
   - Question Round: The Captain asks questions to determine who is human
   - Answer Round: Players respond to questions
   - Translation Round: AI-generated responses for android passengers are shown
4. After 10 cycles, the game ends and the Captain must decide which passenger pods to leave behind
5. The game reveals which pods contained real players vs android passengers
6. Final scores are calculated and displayed to all players

## Scoring System

The game features a comprehensive scoring system:

- **Captain Actions**:
  - Asking a question: +10 points
  - Correctly identifying an android: +50 points
  - Incorrectly identifying a real player: -30 points

- **Player Actions**:
  - Sending a response: +5 points
  - Surviving (not being left behind): +20 points

Scores are displayed in real-time and a final scoreboard is shown at the end of the game.

## Project Structure

```
├── components/
│   ├── NicknameModal.vue            # Player nickname input and validation
│   ├── WelcomeScreen.vue            # Initial screen for hosting/joining games
│   └── game/
│       ├── Board.vue                # Main orchestrator component for game UI
│       ├── GameChat.vue             # In-game chat functionality
│       ├── StarfieldBackground.vue  # Animated space background
│       ├── CountdownTimer.vue       # Game round timer with responsive layout
│       ├── GameCompletedBanner.vue  # Game over notification
│       ├── GameHeader.vue           # Room info and controls
│       ├── GameSidebar.vue          # Player list, scoreboard, and game controls
│       └── CaptainDecisionModal.vue # Interface for captain's final decision
├── composables/
│   ├── useGame.js                   # Game state, WebSocket logic, and score tracking
│   └── useAudio.js                  # Background music and sound effects
├── pages/
│   └── index.vue                    # Main game page
├── server/
│   ├── ai-chat.js                   # AI-generated chat responses
│   └── routes/
│       └── _ws.js                   # WebSocket server handler
├── app.vue                          # Root app component
├── nuxt.config.ts                   # Nuxt configuration
└── tailwind.config.js               # Tailwind configuration
```

## Responsive Design Features

- **Adaptive Layouts**: Different UI arrangements for desktop and mobile devices
- **Responsive Timer**: 
  - On wide screens (≥1024px): Overlays as a floating element
  - On narrow screens (<1024px): Appears as a fixed area at the top
- **Mobile Sidebar**: Collapsible sidebar with toggle button for small screens
- **Audio Controls**: Positioned for optimal access on different device types

## Performance Optimizations

- **Starfield Background**: Optimized to use circular distribution of stars with reduced DOM elements (1,000 stars instead of 8,000)
- **Resource Usage**: Background animations are dynamically sized based on screen diagonal for optimal coverage and performance
- **Rendering**: Improved rendering approach to reduce CPU usage during animations
- **Component Splitting**: Main gameplay components divided into smaller, focused units for better maintainability and performance

## Development Notes

- The game uses Nitro's built-in WebSocket capabilities for real-time communication
- Game state is held in memory on the server
- Players are identified by nicknames
- OpenAI API is used to generate responses for android passengers
- Scoring system is integrated with the game flow to reward player actions
- Component architecture follows single-responsibility principle

## Future Improvements

- [ ] Persistent game state
- [ ] Player authentication
- [ ] Enhanced leaderboard system
- [ ] Additional game modes
- [ ] Enhanced AI character responses
- [ ] Additional scoring mechanics
- [ ] Sound effects for gameplay events
- [ ] Dockerized deployment with SSL support

## Deployment

The game can be deployed using Docker and Nginx for production environments. See the Docker deployment guide in the docs folder for detailed instructions on setting up the application on an Ubuntu server.

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

### Version 0.3.0
- Refactored Board.vue into smaller, more maintainable components
- Added responsive timer layout for different screen sizes
- Improved mobile UI with optimized sidebar
- Enhanced game flow with clearer round indicators

### Version 0.2.0
- Added comprehensive scoring system
- Optimized starfield background for better performance
- Improved UI with score display and game feedback

### Version 0.1.0-alpha
- Initial alpha release of the game
- Core gameplay mechanics implemented
- UI and controls added for PCs and mobile devices