<!-- components/WelcomeScreen.vue -->
<template>
  <div class="welcome-screen" ref="welcomeScreen">
    <div class="min-h-screen flex items-center justify-center relative">
      <!-- Parallax Background -->
      <div class="parallax-bg" ref="parallaxBg"></div>
      <div class="parallax-overlay"></div>
      
      <!-- Music Toggle Button -->
      <button 
        @click="toggleMusicMute" 
        class="absolute top-4 right-4 p-2 bg-gray-900/70 rounded-full hover:bg-gray-800/90 transition-colors z-10 border border-blue-800"
        :title="audioService.isMuted.value ? 'Turn Music On' : 'Turn Music Off'"
      >
        <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" :class="audioService.isMuted.value ? 'text-red-400' : 'text-green-400'">
          <path v-if="!audioService.isMuted.value" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.536 8.464a5 5 0 010 7.072M17.95 6.05a8 8 0 010 11.9M6.5 8.8l4.5-3.3c.7-.5 1.7 0 1.7.9v11.2c0 .9-1 1.4-1.7.9l-4.5-3.3a.8.8 0 01-.3-.7v-5c0-.3.1-.5.3-.7z" />
          <path v-else stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z M17 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2" />
        </svg>
      </button>
      
      <client-only>
        <div class="max-w-md w-full p-8 bg-gray-900 rounded-lg shadow-lg border border-blue-900 z-10 welcome-dialog">
          <!-- Initial Options -->
          <div v-if="currentView === 'initial'" class="space-y-4">
            <h1 class="text-2xl font-bold text-center">
              <img src="/spacescape.png" alt="Spacescape Logo" class="h-12 mx-auto" />
            </h1>
            <div class="mb-8 text-center">
              <div class="flex flex-col items-center gap-2">
                <span class="text-blue-400">
                  {{ playerNickname ? `Playing as: ${playerNickname}` : 'Set your nickname to start' }}
                </span>
                <button
                    @click="openNicknameModal"
                    class="px-4 py-2 bg-gray-800 text-blue-300 rounded hover:bg-gray-700 border border-blue-800"
                >
                  {{ playerNickname ? 'Change Nickname' : 'Set Nickname' }}
                </button>
              </div>
            </div>
            <button
                @click="handleHostGame"
                class="w-full py-3 bg-blue-700 text-blue-100 rounded-lg hover:bg-blue-600 transition-colors border border-blue-500"
                :disabled="!playerNickname"
                v-if="playerNickname"
            >
              Host Game
            </button>
            <button
                @click="currentView = 'join'"
                class="w-full py-3 bg-green-700 text-green-100 rounded-lg hover:bg-green-600 transition-colors border border-green-500"
                :disabled="!playerNickname"
                v-if="playerNickname"
            >
              Join Game
            </button>
          </div>

          <!-- Join Game View -->
          <div v-if="currentView === 'join'" class="space-y-4">
            <h2 class="text-xl font-bold text-center mb-6 text-green-400">Join a Game</h2>
            <div class="space-y-2">
              <input
                  v-model="roomKey"
                  maxlength="4"
                  class="w-full p-3 bg-gray-800 border border-blue-900 rounded-lg text-center uppercase text-2xl tracking-widest text-blue-300 focus:outline-none focus:border-blue-500"
                  placeholder="ROOM"
                  :disabled="connectionStatus !== 'connected'"
              />
              <p v-if="localError" class="text-red-400 text-sm text-center">{{ localError }}</p>
            </div>
            <button
                @click="handleJoinGame"
                class="w-full py-3 bg-green-700 text-green-100 rounded-lg hover:bg-green-600 transition-colors border border-green-500"
                :disabled="roomKey.length !== 4 || connectionStatus !== 'connected'"
            >
              Join Room
            </button>
            <button
                @click="currentView = 'initial'"
                class="w-full py-2 text-blue-400 hover:text-blue-300"
            >
              Back
            </button>
          </div>

          <!-- Host Game View -->
          <div v-if="currentView === 'host'" class="space-y-4">
            <h2 class="text-xl font-bold text-center mb-6 text-green-400">Host a Game</h2>
            <div class="p-4 bg-gray-800 rounded-lg text-center border border-blue-900">
              <p class="text-sm text-blue-400">Your Room Key</p>
              <p class="text-3xl font-bold tracking-widest text-green-400">{{ generatedRoomKey }}</p>
            </div>
            <button
                @click="handleStartRoom"
                class="w-full py-3 bg-blue-700 text-blue-100 rounded-lg hover:bg-blue-600 transition-colors border border-blue-500"
                :disabled="connectionStatus !== 'connected'"
            >
              Start Room
            </button>
            <button
                @click="currentView = 'initial'"
                class="w-full py-2 text-blue-400 hover:text-blue-300"
            >
              Back
            </button>
          </div>

          <!-- Connection Status -->
          <div class="mt-4 text-center text-sm">
            <p :class="{
              'text-green-400': connectionStatus === 'connected',
              'text-yellow-400': connectionStatus === 'connecting',
              'text-red-400': connectionStatus === 'disconnected'
            }">
              {{ connectionStatus === 'connected' ? 'Connected' :
                connectionStatus === 'connecting' ? 'Connecting...' :
                    'Disconnected' }}
            </p>
          </div>
        </div>
      </client-only>
      
      <!-- Scroll indicator -->
      <div class="absolute bottom-4 left-0 right-0 text-center">
        <p class="text-xs text-gray-400 animate-pulse">Scroll to see credits</p>
      </div>
    </div>
    
    <!-- Credits and version info in bottom footer -->
    <div class="w-full text-xs text-gray-500 border-t border-white/20 bg-gray-900/80 py-2 px-4 text-center">
      <div class="max-w-2xl mx-auto">
        <p class="mb-1 font-bold">v0.3.0 • <a href="https://github.com/modernwebgames/spacescape" target="_blank" class="text-blue-400 hover:text-blue-300">GitHub repository</a></p>
        <p class="mb-1 font-medium">Created by Sefa Şenlik and Korhan Özdemir</p><br>
        <p>Audio credits:</p>
        <p>"Inner Space" by Audiorezout – Source: Free Music Archive – License: CC BY-NC</p>
        <p>"The Ice Planet" by Human Gazpacho – Source: Free Music Archive – License: CC BY-NC</p>
      </div>
    </div>
  </div>
</template>

<script setup>
import { inject, onMounted, ref, onUnmounted } from 'vue';
import { useAudio } from '~/composables/useAudio';

const {
  connect,
  createRoom,
  joinRoom,
  connectionStatus,
  gameState,
  playerNickname,
  openNicknameModal
} = inject('game');

const audioService = useAudio();
const currentView = ref('initial');
const roomKey = ref('');
const generatedRoomKey = ref('');
const emit = defineEmits(['roomJoined', 'roomCreated']);
const localError = ref('');

// Parallax effect references
const welcomeScreen = ref(null);
const parallaxBg = ref(null);

// Connect on mount and initialize audio
onMounted(() => {
  connect();
  
  // Start playing main menu music (initialization is handled in app.vue)
  audioService.playMainMusic();
  
  // Initialize parallax effect
  initParallax();
});

// Clean up event listeners
onUnmounted(() => {
  if (welcomeScreen.value) {
    welcomeScreen.value.removeEventListener('mousemove', handleMouseMove);
  }
});

// Initialize parallax effect
function initParallax() {
  if (welcomeScreen.value) {
    welcomeScreen.value.addEventListener('mousemove', handleMouseMove);
  }
}

// Handle mouse movement for parallax effect
function handleMouseMove(e) {
  if (!parallaxBg.value) return;
  
  const xPos = (e.clientX / window.innerWidth - 0.5) * 30; // -15px to +15px movement
  const yPos = (e.clientY / window.innerHeight - 0.5) * 30; // -15px to +15px movement
  
  // Apply smooth transform to the background
  parallaxBg.value.style.transform = `translate(${xPos}px, ${yPos}px) scale(1.1)`; // Scale to ensure no edges show
}

// Toggle music mute state
function toggleMusicMute() {
  audioService.toggleMute();
}

async function handleHostGame() {
  try {
    if (!playerNickname.value) {
      localError.value = 'Please set a nickname first';
      return;
    }
    generatedRoomKey.value = await createRoom();
    if (generatedRoomKey.value) {
      emit('roomCreated', generatedRoomKey.value);
    }
  } catch (err) {
    localError.value = err.message;
  }
}

function handleStartRoom() {
  emit('roomCreated', generatedRoomKey.value);
  console.log('room created', gameState.value);
}

async function handleJoinGame() {
  try {
    localError.value = ''; // Clear previous errors
    await joinRoom(roomKey.value.toUpperCase());
    emit('roomJoined', roomKey.value.toUpperCase());
  } catch (err) {
    localError.value = err; // Show error to user
  }
}
</script>

<style scoped>
.welcome-screen {
  height: 100%;
  overflow-y: auto;
  position: relative;
}

.welcome-screen > div:first-child {
  min-height: 100vh;
  position: relative;
  z-index: 1;
}

.welcome-screen > div:last-child {
  margin-top: 1vh; /* Push credits below the visible viewport */
  position: relative;
  z-index: 1;
}

/* Welcome dialog transparency for wide screens */
@media (min-width: 768px) {
  .welcome-dialog {
    opacity: 0.5;
    transition: opacity 0.3s ease;
  }
  
  .welcome-dialog:hover {
    opacity: 1;
  }
}

.parallax-bg {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background-image: url('/mainbg.jpg');
  background-size: cover;
  background-position: center;
  background-repeat: no-repeat;
  transform: translate(0, 0);
  transition: transform 0.1s ease-out;
  z-index: 0;
}

.parallax-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background-color: rgba(0, 0, 0, 0.4); /* Darkening overlay */
  z-index: 0;
  pointer-events: none;
}
</style>