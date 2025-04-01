<template>
  <div v-if="gameState.room.status === 'completed'" 
       class="fixed top-4 left-1/2 transform -translate-x-1/2 z-40 
              bg-red-900/90 text-yellow-400 px-6 py-2 rounded-lg shadow-lg 
              border border-red-500 max-w-[90%] sm:max-w-md">
    <b>Game Over!</b> The captain must now decide which pod(s) to leave behind.
  </div>
</template>

<script setup>
defineProps({
  gameState: {
    type: Object,
    required: true
  }
});
</script> 