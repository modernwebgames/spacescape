# Political Territory Game

A real-time multiplayer territory claiming game built with Nuxt 3 and WebSockets. Players can join with nicknames and compete to claim territories.

## Features

- Real-time multiplayer gameplay
- Nickname-based player identification
- Territory claiming system
- Game state synchronization across all players
- Responsive design with Tailwind CSS

## Tech Stack

- Nuxt 3
- Vue 3 Composition API
- Nitro's WebSocket
- Tailwind CSS
- Cloudflare Pages (hosting)

## Local Development

### Prerequisites

- Node.js (v20 or higher)
- pnpm

### Setup

```bash
# Clone the repository
git clone https://github.com/korhanozdemirr/politicals.git
cd political-game

# Install dependencies
pnpm install

# Start development server
pnpm dev
```

The game will be available at `http://localhost:3000`

## Deployment to Cloudflare Pages

1. Push your code to GitHub

2. In Cloudflare Pages:
    - Create new project
    - Connect your repository
    - Configure build settings:
        - Build command: `pnpm build`
        - Build output directory: `.output/public`
        - Environment variables: (none required for basic setup)

3. Deploy!

## Project Structure

```
├── components/
│   ├── GameBoard.vue       # Main game board component
│   └── NicknameEntry.vue   # Player nickname entry screen
├── composables/
│   └── useGame.js          # Game state and WebSocket logic
├── pages/
│   └── index.vue           # Main game page
├── server/
│   └── routes/
│       └── _ws.js         # WebSocket server handler
├── app.vue                 # Root app component
├── nuxt.config.ts         # Nuxt configuration
└── tailwind.config.js     # Tailwind configuration
```

## Development Notes

- The game uses Nitro's built-in WebSocket capabilities for real-time communication
- Game state is currently held in memory (consider adding persistence for production)
- Players are identified by nicknames stored in localStorage

## Future Improvements

- [ ] Persistent game state
- [ ] Player authentication
- [ ] Leaderboard system
- [ ] Game rounds/sessions
- [ ] Chat system
- [ ] Territory bonuses/special abilities

## Contributing

1. Fork the repository
2. Create your feature branch: `git checkout -b feature/amazing-feature`
3. Commit your changes: `git commit -m 'Add amazing feature'`
4. Push to the branch: `git push origin feature/amazing-feature`
5. Open a Pull Request

## License

MIT

## Author

Your Name - [@korhanozdemir](https://github.com/korhanozdemir)

Project Link: [https://github.com/korhanozdemir/politicals](https://github.com/korhanozdemir/politicals)