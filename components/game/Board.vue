<!-- components/GameBoard.vue -->
<template>
  <div class="relative min-h-screen bg-black overflow-hidden flex flex-col">
    <!-- Background -->
    <StarfieldBackground />

    <!-- Music Toggle Button (Desktop) -->
    <button 
      v-if="!isMobile" 
      @click="toggleMusicMute" 
      class="fixed top-4 right-4 p-2 bg-gray-900/70 rounded-full hover:bg-gray-800/90 transition-colors z-50 border border-blue-800"
      :title="audioService.isMuted.value ? 'Turn Music On' : 'Turn Music Off'"
    >
      <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" :class="audioService.isMuted.value ? 'text-red-400' : 'text-green-400'">
        <path v-if="!audioService.isMuted.value" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.536 8.464a5 5 0 010 7.072M17.95 6.05a8 8 0 010 11.9M6.5 8.8l4.5-3.3c.7-.5 1.7 0 1.7.9v11.2c0 .9-1 1.4-1.7.9l-4.5-3.3a.8.8 0 01-.3-.7v-5c0-.3.1-.5.3-.7z" />
        <path v-else stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z M17 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2" />
      </svg>
    </button>

    <!-- Timer Component - Now part of the main layout -->
    <CountdownTimer :game-state="gameState" />

    <!-- Game Completed Banner -->
    <GameCompletedBanner :game-state="gameState" />

    <!-- Captain's Decision Modal -->
    <CaptainDecisionModal 
      v-if="gameState.room.status === 'completed'"
      :game-state="gameState"
      :is-host="isHost(playerNickname)"
      :on-submit-decision="handleCaptainDecision"
    />

    <!-- Main game content - Now starts below the timer -->
    <div class="flex-1">
      <div class="p-4 sm:p-6 md:p-8" :class="{'lg:pr-72': !isMobile || (isMobile && sidebarOpen)}">
        <div class="max-w-4xl mx-auto">
          <!-- Header Component -->
          <GameHeader 
            :room-key="roomKey"
            :is-mobile="isMobile"
            :sidebar-open="sidebarOpen"
            @toggle-sidebar="toggleSidebar"
          />

          <!-- Chat Panel -->
          <div class="flex justify-between items-center">
            <div class="p-2 sm:p-4 w-full">
              <GameChat 
                :player-nickname="playerNickname"
                :room-key="roomKey"
                :messages="messages"
                :is-send-disabled="isChatDisabled"
                :current-round="gameState.room.round"
                @send-message="sendMessage"
              />
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Sidebar Component -->
    <GameSidebar
      :game-state="gameState"
      :player-nickname="playerNickname"
      :is-mobile="isMobile"
      :sidebar-open="sidebarOpen"
      :is-player-ready="isPlayerReady"
      :can-start-game="canStartGame"
      :is-music-muted="audioService.isMuted.value"
      @toggle-sidebar="toggleSidebar"
      @toggle-music="toggleMusicMute"
      @toggle-ready="toggleReady"
      @start-game="onStartGame"
    />
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted, onUnmounted, inject } from 'vue';
import { useAudio } from '~/composables/useAudio';
import StarfieldBackground from './StarfieldBackground.vue';
import CountdownTimer from './CountdownTimer.vue';
import GameCompletedBanner from './GameCompletedBanner.vue';
import CaptainDecisionModal from './CaptainDecisionModal.vue';
import GameHeader from './GameHeader.vue';
import GameSidebar from './GameSidebar.vue';
import GameChat from './GameChat.vue';

const props = defineProps({
  roomKey: {
    type: String,
    required: true
  }
});

// Game state and services
const { 
  gameState,
  playerNickname,
  setPlayerReady,
  startGame,
  messages,
  sendChatMessage,
  sendCaptainDecision
} = inject('game');
const audioService = useAudio();

// Mobile responsiveness
const isMobile = ref(false);
const sidebarOpen = ref(false);

// Check if device is mobile
const checkMobile = () => {
  const wasMobile = isMobile.value;
  isMobile.value = window.innerWidth < 1024; // lg breakpoint in Tailwind
  
  if (!wasMobile && isMobile.value) {
    sidebarOpen.value = false;
  } else if (isMobile.value && !sidebarOpen.value) {
    sidebarOpen.value = false;
  }
};

// Toggle sidebar visibility
const toggleSidebar = () => {
  sidebarOpen.value = !sidebarOpen.value;
};

// Computed properties
const isPlayerReady = computed(() => {
  const player = gameState.value.room.players[playerNickname.value];
  return player?.ready || false;
});

const canStartGame = computed(() => {
  const players = Object.values(gameState.value.room.players);
  return players.length >= 2 && players.every(player => player.ready);
});

const isChatDisabled = computed(() => {
  const round = gameState.value.room.round;
  const isHostPlayer = isHost(playerNickname.value);
  const hasPlayerSentMessage = gameState.value.room.players[playerNickname.value]?.hasSentMessage;

  if (gameState.value.room.status !== 'playing' || round === 'translation') return true;
  if (hasPlayerSentMessage) return true;
  if (round === 'question' && !isHostPlayer) return true;
  if (round === 'answer' && isHostPlayer) return true;

  return false;
});

// Helper functions
function isHost(nickname) {
  const [host] = Object.keys(gameState.value.room.players);
  return host === nickname;
}

function toggleReady() {
  setPlayerReady(!isPlayerReady.value);
}

function onStartGame() {
  if (isHost(playerNickname.value)) {
    startGame();
  }
}

function toggleMusicMute() {
  audioService.toggleMute();
}

function handleCaptainDecision(selectedIndices) {
  const decisionMessage = `Captain's Decision: I have decided to leave behind Passenger${selectedIndices.length > 1 ? 's' : ''} ${selectedIndices.join(', ')}.`;
  sendChatMessage(decisionMessage);
  sendCaptainDecision(selectedIndices);
}

function sendMessage(text) {
  sendChatMessage(text);
}

// Lifecycle hooks
onMounted(() => {
  checkMobile();
  window.addEventListener('resize', checkMobile);
  window.addEventListener('orientationchange', checkMobile);
  
  // Watch for game status changes to control audio
  watchGameStatus();
  
  if (gameState.value.room.status === 'playing') {
    audioService.transitionToGameMusic();
  }
});

onUnmounted(() => {
  window.removeEventListener('resize', checkMobile);
  window.removeEventListener('orientationchange', checkMobile);
});

// Watch game status for audio control
function watchGameStatus() {
  watch(() => gameState.value.room.status, (newStatus, oldStatus) => {
    if (newStatus === 'playing' && oldStatus === 'waiting') {
      audioService.transitionToGameMusic();
    }
    if (newStatus === 'completed' && oldStatus === 'playing') {
      audioService.stopGameMusic();
    }
  });
}
</script>

<style scoped>
.starfield-container {
  position: fixed;
  top: 0;
  left: 0;
  z-index: 0;
  overflow: hidden;
  transform: translate(-50%, -50%);
  left: 50%;
  top: 50%;
  /* Width and height will be set dynamically in JS based on screen diagonal */
}

.starfield {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  animation: rotate 450s linear infinite;
  transform-origin: center center;
}

@keyframes rotate {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
}

/* Loading dots animation */
.loading-dots {
  display: flex;
  justify-content: center;
  align-items: center;
  height: 10px;
}

.loading-dots span {
  display: inline-block;
  width: 8px;
  height: 8px;
  margin: 0 3px;
  background-color: #4ade80;
  border-radius: 50%;
  opacity: 0.6;
  animation: loading-dots 1.4s infinite ease-in-out both;
}

.loading-dots span:nth-child(1) {
  animation-delay: -0.32s;
}

.loading-dots span:nth-child(2) {
  animation-delay: -0.16s;
}

@keyframes loading-dots {
  0%, 80%, 100% { 
    transform: scale(0);
  }
  40% { 
    transform: scale(1);
  }
}

/* Mobile responsive styles */
@media (max-width: 1023px) {
  /* No need for special container sizing for mobile since we're calculating dynamically */
}
</style>