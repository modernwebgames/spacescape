<!-- components/GameBoard.vue -->
<template>
  <div class="relative min-h-screen bg-black overflow-hidden">
    <!-- Rotating Stars Background -->
    <div class="starfield-container">
      <div class="starfield"></div>
    </div>

    <!-- Translation Countdown Timer -->
    <div v-if="gameState.room.status === 'playing'" 
         class="fixed top-4 left-1/2 transform -translate-x-1/2 z-50 
                bg-blue-900/90 text-green-400 px-6 py-2 rounded-lg shadow-lg 
                border border-blue-500">
      <b> {{ gameState.room.round === 'answer' ? 'Answer' : gameState.room.round === 'question' ? 'Question' : 'Translation' }} Round </b> • Ends in {{ gameState.room.countdown }} second(s)... • Cycle {{ gameState.room.cycleCount + 1 }}/10
    </div>

    <!-- Game Completed Banner -->
    <div v-if="gameState.room.status === 'completed'" 
         class="fixed top-4 left-1/2 transform -translate-x-1/2 z-50 
                bg-red-900/90 text-yellow-400 px-6 py-2 rounded-lg shadow-lg 
                border border-red-500">
      <b>Game Over!</b> The captain must now decide which pod(s) to leave behind.
    </div>

    <!-- Game Over Modal for Captain -->
    <div v-if="gameState.room.status === 'completed' && isHost(playerNickname) && !captainDecisionMade" 
         class="fixed inset-0 bg-black/80 flex items-center justify-center z-50">
      <div class="bg-gray-900 border border-red-500 rounded-lg p-6 max-w-2xl w-full mx-4">
        <h2 class="text-2xl text-red-400 font-bold mb-4">Captain's Final Decision</h2>
        <p class="text-blue-300 mb-6">
          The reactor is about to explode. You must decide which passenger pod(s) to leave behind.
          <br><br>
          <b>Select {{ getFakePassengerCount() }} passenger(s) to leave behind:</b>
        </p>
        
        <div class="space-y-3 mb-6">
          <div v-for="i in 4" :key="i" class="flex items-center space-x-3 p-3 border border-blue-800 rounded-lg bg-gray-800/50">
            <input 
              type="checkbox" 
              :id="'passenger-' + i" 
              v-model="selectedPassengers[i-1]"
              :disabled="selectedPassengerCount >= getFakePassengerCount() && !selectedPassengers[i-1]"
              class="w-5 h-5 text-blue-600 rounded focus:ring-blue-500"
            />
            <label :for="'passenger-' + i" class="text-blue-300 flex-1">
              <b>Passenger {{ i }}</b>
            </label>
          </div>
        </div>
        
        <div class="flex justify-end space-x-4">
          <button 
            @click="submitCaptainDecision" 
            :disabled="selectedPassengerCount !== getFakePassengerCount()"
            class="px-6 py-2 bg-red-700 text-white rounded-lg hover:bg-red-600 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Confirm Decision
          </button>
        </div>
      </div>
    </div>

    <!-- Main game content with padding for lobby -->
    <div class="p-8 pr-72">
      <div class="max-w-4xl mx-auto">
        <!-- Header with room info -->
        <div class="flex justify-between items-center mb-8">
          <h1 class="text-3xl font-bold">
            <img src="/spacescape.png" alt="Spacescape Logo" class="h-10" />
          </h1>
          
          <div class="flex items-center gap-4">            
            <div class="text-blue-400 relative z-10">
              Room: 
              <span class="font-semibold text-green-400 select-all bg-gray-900/50 px-2 py-1 rounded cursor-pointer" 
                    @click="copyRoomKey" 
                    :title="copyStatus">
                {{ roomKey }}
              </span>
            </div>
          </div>
        </div>

        <!-- Chat Panel -->
        <div class="flex justify-between items-center">
          <div class="p-4 w-full">
            <!-- Chat Component -->
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

    <!-- Fixed Lobby Sidebar -->
    <div class="fixed top-0 right-0 h-screen w-64 bg-gray-900 shadow-lg z-20 border-l border-blue-900">
      <div class="p-4 space-y-4">
        <!-- Room Status -->
        <div class="text-center pb-4 border-b border-blue-800">
          <div class="text-blue-400">
            Playing as: <span class="font-semibold text-green-400">{{ playerNickname }}</span>
          </div>
          <p class="text-sm mt-2" :class="gameState.room.status === 'waiting' ? 'text-yellow-500' : 'text-green-500'">
            {{ gameState.room.status === 'waiting' ? 'Waiting for players...' : 'Game in progress' }}
          </p>
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
            </li>
          </ul>
        </div>   

        <!-- Game Actions -->
        <div v-if="gameState.room.status === 'waiting'" class="space-y-2">
          <!-- Ready button for non-host players -->
          <button
              v-if="!isHost(playerNickname)"
              @click="toggleReady"
              :class="[
               'w-full py-2 rounded transition-colors border',
               isPlayerReady 
                 ? 'bg-green-700 hover:bg-green-600 text-green-100 border-green-500'
                 : 'bg-gray-800 hover:bg-gray-700 text-gray-300 border-gray-600'
             ]"
          >
            {{ isPlayerReady ? 'Ready' : 'Not Ready' }}
          </button>

          <!-- Start button for host -->
          <button
              v-if="isHost(playerNickname)"
              @click="onStartGame"
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
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted } from 'vue';

const props = defineProps({
  roomKey: {
    type: String,
    required: true
  }
});

const {
  gameState,
  playerNickname,
  setPlayerReady,
  startGame,
  messages,
  sendChatMessage
} = inject('game');

// Add these refs for copy functionality
const copyStatus = ref('Click to copy');

// Add refs for captain's decision modal
const selectedPassengers = ref([false, false, false, false]);
const captainDecisionMade = ref(false);
const selectedPassengerCount = computed(() => {
  return selectedPassengers.value.filter(selected => selected).length;
});

// Function to get the number of fake passengers (total - real)
function getFakePassengerCount() {
  // Count real passengers (excluding captain)
  const realPlayerCount = Object.keys(gameState.value.room.players).length - 1;
  // We always have 4 passengers total, so fake count is (4 - real)
  return Math.max(0, 4 - realPlayerCount);
}

// Function to submit the captain's decision
function submitCaptainDecision() {
  const selectedIndices = [];
  selectedPassengers.value.forEach((selected, index) => {
    if (selected) {
      selectedIndices.push(index + 1);
    }
  });
  
  // Create a decision message
  const decisionMessage = `Captain's Decision: I have decided to leave behind Passenger${selectedIndices.length > 1 ? 's' : ''} ${selectedIndices.join(', ')}.`;
  
  // Send the message as the captain
  sendChatMessage(decisionMessage);
  
  // Disable the modal after decision is made
  captainDecisionMade.value = true;
}

// Chat handler
const sendMessage = (text) => {
  sendChatMessage(text);
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

// Helper functions
function isHost(nickname) {
  // First player in the room is the host
  const [host] = Object.keys(gameState.value.room.players);
  return host === nickname;
}

// Move the computed property below the isHost function
const isChatDisabled = computed(() => {
  const round = gameState.value.room.round;
  const isHostPlayer = isHost(playerNickname.value);
  const hasPlayerSentMessage = gameState.value.room.players[playerNickname.value]?.hasSentMessage;

  // Disable if game not playing or during translation
  if (gameState.value.room.status !== 'playing' || round === 'translation') return true;
  
  // Disable if player already sent message this round
  if (hasPlayerSentMessage) return true;
  
  // Disable if question round and not host
  if (round === 'question' && !isHostPlayer) return true;
  
  // Disable if answer round and is host
  if (round === 'answer' && isHostPlayer) return true;

  return false;
});

function toggleReady() {
  setPlayerReady(!isPlayerReady.value);
}

function onStartGame() {
  if (canStartGame.value) {
    startGame();
  }
}

// Generate star background
onMounted(() => {
  createStarfield();
});

// Function to create a rotating starfield
function createStarfield() {
  const starfield = document.querySelector('.starfield');
  if (!starfield) return;
  
  // Clear any existing stars
  starfield.innerHTML = '';
  
  // Create stars
  const starCount = 1200; 
  const colors = ['#ffffff', '#fffafa', '#f8f8ff', '#e6e6fa', '#b0e0e6', '#87cefa', '#add8e6'];
  
  for (let i = 0; i < starCount; i++) {
    const star = document.createElement('div');
    star.className = 'star';
    
    // Random position - ensure stars are scattered across the entire screen
    const x = Math.random() * window.innerWidth * 2;
    const y = Math.random() * window.innerHeight * 2;
    
    // Random size (0.5px to 3px)
    const size = 0.5 + Math.random() * 2.5;
    
    // Random color
    const color = colors[Math.floor(Math.random() * colors.length)];
    
    // Random opacity
    const opacity = 0.5 + Math.random() * 0.5;
    
    // Apply styles directly to ensure proper positioning
    star.style.cssText = `
      position: absolute;
      left: ${x}px;
      top: ${y}px;
      width: ${size}px;
      height: ${size}px;
      background-color: ${color};
      opacity: ${opacity};
      border-radius: 50%;
      box-shadow: 0 0 4px 1px rgba(255, 255, 255, 0.4);
    `;
    
    starfield.appendChild(star);
  }
}

// Add copy function
async function copyRoomKey() {
  try {
    await navigator.clipboard.writeText(props.roomKey);
    copyStatus.value = 'Copied!';
    setTimeout(() => {
      copyStatus.value = 'Click to copy';
    }, 2000);
  } catch (err) {
    copyStatus.value = 'Failed to copy';
    setTimeout(() => {
      copyStatus.value = 'Click to copy';
    }, 2000);
  }
}
</script>

<style scoped>
.starfield-container {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  z-index: 0;
  overflow: hidden;
}

.starfield {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  animation: rotate 240s linear infinite;
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
</style>