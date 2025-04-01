<template>
  <div 
    class="fixed top-0 right-0 h-screen bg-gray-900 shadow-lg z-30 border-l border-blue-900 transition-all duration-300 ease-in-out"
    :class="{
      'w-64': !isMobile || (isMobile && sidebarOpen),
      'w-0 border-l-0 overflow-hidden': isMobile && !sidebarOpen,
      'translate-x-0': !isMobile || (isMobile && sidebarOpen),
      'translate-x-full': isMobile && !sidebarOpen
    }"
  >
    <div class="p-4 space-y-4 w-64 overflow-y-auto h-full">
      <!-- Room Status -->
      <div class="pb-4 border-b border-blue-800 relative">
        <div class="flex justify-between items-center mb-2">
          <div class="text-left">
            <div class="text-blue-400">
              Playing as: <span class="font-semibold text-green-400">{{ playerNickname }}</span>
            </div>
            <p class="text-sm mt-2" :class="gameState.room.status === 'waiting' ? 'text-yellow-500' : 'text-green-500'">
              {{ gameState.room.status === 'waiting' ? 'Waiting for players...' : 'Game in progress' }}
            </p>
          </div>
          
          <button 
            v-if="isMobile"
            @click="$emit('toggle-sidebar')" 
            class="lg:hidden bg-blue-900/90 text-red-400 p-2 rounded-lg shadow-lg border border-blue-500"
          >
            <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        
        <!-- Music Toggle Button (Mobile) -->
        <button 
          v-if="isMobile"
          @click="$emit('toggle-music')" 
          class="w-full flex items-center justify-center gap-2 mt-2 p-2 bg-gray-800/70 rounded-lg hover:bg-gray-700/90 transition-colors border border-blue-800"
          :title="isMusicMuted ? 'Turn Music On' : 'Turn Music Off'"
        >
          <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" :class="isMusicMuted ? 'text-red-400' : 'text-green-400'">
            <path v-if="!isMusicMuted" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.536 8.464a5 5 0 010 7.072M17.95 6.05a8 8 0 010 11.9M6.5 8.8l4.5-3.3c.7-.5 1.7 0 1.7.9v11.2c0 .9-1 1.4-1.7.9l-4.5-3.3a.8.8 0 01-.3-.7v-5c0-.3.1-.5.3-.7z" />
            <path v-else stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z M17 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2" />
          </svg>
          <span :class="isMusicMuted ? 'text-red-400' : 'text-green-400'">
            {{ isMusicMuted ? 'Music Off' : 'Music On' }}
          </span>
        </button>
      </div>

      <!-- Player List -->
      <div class="space-y-2">
        <h4 class="font-medium text-blue-400">Players</h4>
        <ul class="space-y-2">
          <li
              v-for="[nickname, player] in (gameState.room.players instanceof Map 
                                            ? Array.from(gameState.room.players.entries()) 
                                            : Object.entries(gameState.room.players))"
              :key="nickname"
              class="flex items-center justify-between p-2 bg-gray-800 rounded border border-blue-900"
          >
           <span class="flex items-center gap-2 text-blue-300">
             {{ nickname }}
             <span v-if="isHost(nickname)" class="text-xs text-green-400">(Captain)</span>
           </span>
            <span v-if="gameState.room.status === 'waiting' && !isHost(nickname)"
                  :class="player.ready ? 'text-green-500' : 'text-gray-500'"
            >
             {{ player.ready ? '✓ Ready' : 'Not ready' }}
           </span>
           <span v-else-if="gameState.room.scores && gameState.room.scores[nickname] !== undefined" 
                 :class="gameState.room.scores[nickname] >= 0 ? 'text-green-500' : 'text-red-500'"
           >
             {{ gameState.room.scores[nickname] }} pts
           </span>
          </li>
        </ul>
      </div>   

      <!-- Scoreboard -->
      <div v-if="gameState.room.status !== 'waiting' && gameState.room.scores" class="mt-6 space-y-2">
        <h4 class="font-medium text-blue-400 flex items-center">
          <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 mr-1" viewBox="0 0 20 20" fill="currentColor">
            <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clip-rule="evenodd" />
          </svg>
          Scoreboard
        </h4>
        <div class="bg-gray-800/70 rounded-lg border border-blue-900 p-3">
          <div class="text-sm text-blue-200 mb-2">
            <div class="grid grid-cols-2 gap-1">
              <div class="font-semibold">Action</div>
              <div class="font-semibold text-right">Points</div>
              
              <div>Captain asks question</div>
              <div class="text-right text-green-400">+10</div>
              
              <div class="col-span-2 my-1 border-b border-blue-800/50"></div>
              
              <div>Player answers</div>
              <div class="text-right text-green-400">+5</div>
              
              <div class="col-span-2 my-1 border-b border-blue-800/50"></div>
              
              <div>Captain identifies AI</div>
              <div class="text-right text-green-400">+50</div>
              
              <div class="col-span-2 my-1 border-b border-blue-800/50"></div>
              
              <div>Captain mistakes real player</div>
              <div class="text-right text-red-400">-30</div>
              
              <div class="col-span-2 my-1 border-b border-blue-800/50"></div>
              
              <div>Player survives</div>
              <div class="text-right text-green-400">+20</div>
            </div>
          </div>
        </div>
      </div>

      <!-- Game Actions -->
      <div v-if="gameState.room.status === 'waiting'" class="space-y-2">
        <button
            v-if="!isHost(playerNickname)"
            @click="$emit('toggle-ready')"
            :class="[
             'w-full py-2 rounded transition-colors border',
             isPlayerReady 
               ? 'bg-green-700 hover:bg-green-600 text-green-100 border-green-500'
               : 'bg-gray-800 hover:bg-gray-700 text-gray-300 border-gray-600'
           ]"
        >
          {{ isPlayerReady ? 'Ready' : 'Not Ready' }}
        </button>

        <button
            v-if="isHost(playerNickname)"
            @click="$emit('start-game')"
            :disabled="!canStartGame"
            class="w-full py-2 bg-blue-700 text-blue-100 rounded hover:bg-blue-600 
                  border border-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Start Game
        </button>
        <p v-if="isHost(playerNickname) && !canStartGame" class="text-sm text-red-400 text-center">
          Waiting for all players to be ready
        </p>
      </div>
    </div>
  </div>
</template>

<script setup>
const props = defineProps({
  gameState: {
    type: Object,
    required: true
  },
  playerNickname: {
    type: String,
    required: true
  },
  isMobile: {
    type: Boolean,
    required: true
  },
  sidebarOpen: {
    type: Boolean,
    required: true
  },
  isPlayerReady: {
    type: Boolean,
    required: true
  },
  canStartGame: {
    type: Boolean,
    required: true
  },
  isMusicMuted: {
    type: Boolean,
    required: true
  }
});

function isHost(nickname) {
  const [host] = Object.keys(props.gameState.room.players);
  return host === nickname;
}

defineEmits(['toggle-sidebar', 'toggle-music', 'toggle-ready', 'start-game']);
</script> 