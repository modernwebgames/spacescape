<!-- components/WelcomeScreen.vue -->
<template>
  <div class="min-h-screen flex items-center justify-center welcome-screen">
    <client-only>
      <div class="max-w-md w-full p-8 bg-gray-900 rounded-lg shadow-lg border border-blue-900">
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
    
    <!-- Version number in bottom-right corner -->
    <div class="absolute bottom-2 right-2 text-xs text-gray-300 opacity-70">
      v0.1.0-alpha
    </div>
  </div>
</template>

<script setup>
import { inject } from 'vue';

const {
  connect,
  createRoom,
  joinRoom,
  connectionStatus,
  gameState,
  playerNickname,
  openNicknameModal
} = inject('game');

const currentView = ref('initial');
const roomKey = ref('');
const generatedRoomKey = ref('');
const emit = defineEmits(['roomJoined', 'roomCreated']);
const localError = ref('');

// Connect on mount
onMounted(() => {
  connect();
});

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
  background-image: url('/mainbg.jpg');
  background-size: cover;
  background-position: center;
  background-repeat: no-repeat;
}
</style>