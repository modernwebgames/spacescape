<template>
  <div class="flex justify-between items-center mb-4 sm:mb-8">
    <h1 class="text-2xl sm:text-3xl font-bold">
      <img src="/spacescape.png" alt="Spacescape Logo" class="h-8 sm:h-10" />
    </h1>
    
    <div class="flex items-center gap-2 sm:gap-4">            
      <div class="text-blue-400 relative z-10 text-sm sm:text-base">
        Room: 
        <span class="font-semibold text-green-400 select-all bg-gray-900/50 px-2 py-1 rounded cursor-pointer" 
              @click="copyRoomKey" 
              :title="copyStatus">
          {{ roomKey }}
        </span>
      </div>
      
      <button 
        v-if="isMobile"
        @click="$emit('toggle-sidebar')" 
        class="lg:hidden bg-blue-900/90 text-green-400 p-2 rounded-lg shadow-lg border border-blue-500 ml-2 relative z-20"
      >
        <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path v-if="sidebarOpen" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
          <path v-else stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16" />
        </svg>
      </button>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue';

const props = defineProps({
  roomKey: {
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
  }
});

const copyStatus = ref('Click to copy');

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

defineEmits(['toggle-sidebar']);
</script> 