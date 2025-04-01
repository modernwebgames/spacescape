<template>
    <div v-if="gameState.room.status === 'completed' && isHost && !captainDecisionMade" 
         class="fixed inset-0 bg-black/80 flex items-center justify-center z-50">
      <div class="bg-gray-900 border border-red-500 rounded-lg p-4 sm:p-6 max-w-2xl w-[95%] mx-2 sm:mx-4">
        <h2 class="text-xl sm:text-2xl text-red-400 font-bold mb-4">Captain's Final Decision</h2>
        <p class="text-blue-300 mb-4 sm:mb-6 text-sm sm:text-base">
          The reactor is about to explode. You must decide which passenger pod(s) to leave behind.
          <br><br>
          <b>Select {{ getFakePassengerCount() }} passenger(s) to leave behind:</b>
        </p>
        
        <div class="space-y-2 sm:space-y-3 mb-4 sm:mb-6">
          <div v-for="i in 4" :key="i" class="flex items-center space-x-3 p-2 sm:p-3 border border-blue-800 rounded-lg bg-gray-800/50">
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
        
        <div class="flex justify-between items-center">
          <div class="text-sm text-blue-300">
            <p>Correct identifications: <span class="text-green-400">+50 points</span></p>
            <p>Incorrect identifications: <span class="text-red-400">-30 points</span></p>
          </div>
          <button 
            @click="submitCaptainDecision" 
            :disabled="selectedPassengerCount !== getFakePassengerCount()"
            class="px-4 sm:px-6 py-2 bg-red-700 text-white rounded-lg hover:bg-red-600 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Confirm Decision
          </button>
        </div>
      </div>
    </div>
  </template>
  
  <script setup>
  import { ref, computed } from 'vue';
  
  const props = defineProps({
    gameState: {
      type: Object,
      required: true
    },
    isHost: {
      type: Boolean,
      required: true
    },
    onSubmitDecision: {
      type: Function,
      required: true
    }
  });
  
  const selectedPassengers = ref([false, false, false, false]);
  const captainDecisionMade = ref(false);
  
  const selectedPassengerCount = computed(() => {
    return selectedPassengers.value.filter(selected => selected).length;
  });
  
  function getFakePassengerCount() {
    const realPlayerCount = Object.keys(props.gameState.room.players).length - 1;
    return Math.max(0, 4 - realPlayerCount);
  }
  
  function submitCaptainDecision() {
    const selectedIndices = [];
    selectedPassengers.value.forEach((selected, index) => {
      if (selected) {
        selectedIndices.push(index + 1);
      }
    });
    
    props.onSubmitDecision(selectedIndices);
    captainDecisionMade.value = true;
  }
  </script>