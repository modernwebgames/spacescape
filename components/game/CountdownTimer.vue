<template>
  <div v-if="gameState.room.status === 'playing'">
    <!-- Wide screen layout (default: overlapping) -->
    <div class="hidden lg:block fixed top-4 left-1/2 transform -translate-x-1/2 z-40">
      <div class="bg-blue-900/90 text-green-400 px-6 py-2 rounded-lg shadow-lg 
                  border border-blue-500 max-w-[90%] sm:max-w-md">
        <div class="flex flex-col items-center">
          <div class="flex items-center justify-center w-full space-x-2">
            <b>{{ gameState.room.round === 'answer' ? 'Answer' : gameState.room.round === 'question' ? 'Question' : 'Translation' }} Round</b>
            <span>• Cycle {{ gameState.room.cycleCount + 1 }}/10</span>
          </div>
          <div v-if="gameState.room.round !== 'translation'" class="w-full mt-2 bg-gray-700 rounded-full h-2.5">
            <div class="bg-green-500 h-2.5 rounded-full transition-all duration-1000 ease-linear" 
                 :style="{ width: timerProgressPercentage + '%' }"></div>
          </div>
          <div v-else class="w-full mt-2 flex justify-center">
            <div class="loading-dots">
              <span></span>
              <span></span>
              <span></span>
            </div>
          </div>
          <div class="text-sm mt-1 w-full text-right">
            <span v-if="gameState.room.round !== 'translation'">{{ formatCountdown(clientCountdown) }}</span>
            <span v-else>Translating passenger communications...</span>
          </div>
        </div>
      </div>
    </div>

    <!-- Narrow screen layout (separate area) -->
    <div class="lg:hidden w-full bg-blue-900/90 text-green-400 border-b border-blue-500">
      <div class="max-w-4xl mx-auto px-4 py-3">
        <div class="flex flex-col items-center">
          <div class="flex items-center justify-center w-full space-x-2">
            <b>{{ gameState.room.round === 'answer' ? 'Answer' : gameState.room.round === 'question' ? 'Question' : 'Translation' }} Round</b>
            <span>• Cycle {{ gameState.room.cycleCount + 1 }}/10</span>
          </div>
          <div v-if="gameState.room.round !== 'translation'" class="w-full mt-2 bg-gray-700 rounded-full h-2.5">
            <div class="bg-green-500 h-2.5 rounded-full transition-all duration-1000 ease-linear" 
                  :style="{ width: timerProgressPercentage + '%' }"></div>
          </div>
          <div v-else class="w-full mt-2 flex justify-center">
            <div class="loading-dots">
              <span></span>
              <span></span>
              <span></span>
            </div>
          </div>
          <div class="text-sm mt-1 w-full text-right">
            <span v-if="gameState.room.round !== 'translation'">{{ formatCountdown(clientCountdown) }}</span>
            <span v-else>Translating passenger communications...</span>
          </div>
        </div>     
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted, onUnmounted } from 'vue';

const props = defineProps({
  gameState: {
    type: Object,
    required: true
  }
});

// Timer-related refs and computed properties
const lastCountdownValue = ref(null);
const clientCountdown = ref(null);
const timerProgress = ref(100);
const timerProgressPercentage = computed(() => timerProgress.value);
const timerInterval = ref(null);

// Round durations in seconds (matching server constants)
const ROUND_DURATIONS = {
  'translation': 10,
  'question': 30,
  'answer': 20
};

const formatCountdown = (seconds) => {
  if (seconds === null) return '';
  if (seconds < 60) {
    return `${seconds} second${seconds !== 1 ? 's' : ''}`;
  } else {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds < 10 ? '0' : ''}${remainingSeconds}`;
  }
};

const startClientTimer = () => {
  if (timerInterval.value) {
    clearInterval(timerInterval.value);
  }
  
  if (props.gameState.room.round === 'translation') {
    return;
  }
  
  timerInterval.value = setInterval(() => {
    if (clientCountdown.value > 0) {
      clientCountdown.value--;
      timerProgress.value = (clientCountdown.value / lastCountdownValue.value) * 100;
    } else {
      clearInterval(timerInterval.value);
    }
  }, 1000);
};

watch([() => props.gameState.room.countdown, () => props.gameState.room.round], 
  ([newCountdown, newRound], [oldCountdown, oldRound]) => {
    if (newRound !== oldRound || lastCountdownValue.value === null) {
      if (newRound === 'translation') {
        if (timerInterval.value) {
          clearInterval(timerInterval.value);
        }
        return;
      }
      
      let maxCountdown;
      if (newRound === 'question' && props.gameState.room.cycleCount === 0) {
        maxCountdown = 20;
      } else {
        maxCountdown = ROUND_DURATIONS[newRound] || newCountdown;
      }
      
      lastCountdownValue.value = maxCountdown;
      clientCountdown.value = newCountdown;
      timerProgress.value = (newCountdown / maxCountdown) * 100;
      
      startClientTimer();
    } else if (newCountdown !== oldCountdown && newRound !== 'translation') {
      clientCountdown.value = newCountdown;
      timerProgress.value = (newCountdown / lastCountdownValue.value) * 100;
    }
  }
);

onMounted(() => {
  if (props.gameState.room.status === 'playing') {
    startClientTimer();
  }
});

onUnmounted(() => {
  if (timerInterval.value) {
    clearInterval(timerInterval.value);
  }
});
</script>

<style scoped>
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
</style>
