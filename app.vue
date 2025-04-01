<!-- app.vue -->
<template>
  <div>
    <NuxtPage />
  </div>
</template>

<script setup>
import { onMounted } from 'vue'
import { useAudio } from '@/composables/useAudio'

const { initAudio } = useAudio()

onMounted(() => {
  // Initialize audio when the app mounts on the client-side
  if (typeof window !== 'undefined') {
    initAudio()
      .then(() => {
        console.log('Audio initialized from app.vue');
      })
      .catch(err => {
        console.error('Error initializing audio from app.vue:', err);
      });
  }
})
</script>