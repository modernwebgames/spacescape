<template>
  <div class="starfield-container">
    <div class="starfield"></div>
  </div>
</template>

<script setup>
import { onMounted, onUnmounted } from 'vue';

// Function to create a rotating starfield
function createStarfield() {
  const starfield = document.querySelector('.starfield');
  if (!starfield) return;
  
  // Clear any existing stars
  starfield.innerHTML = '';
  
  // Create stars - reduced count since we're optimizing distribution
  const starCount = 1000; 
  const colors = ['#ffffff', '#fffafa', '#f8f8ff', '#e6e6fa', '#b0e0e6', '#87cefa', '#add8e6'];
  
  // Calculate the diagonal length of the screen to ensure full coverage during rotation
  const screenWidth = window.innerWidth;
  const screenHeight = window.innerHeight;
  const screenDiagonal = Math.sqrt(Math.pow(screenWidth, 2) + Math.pow(screenHeight, 2));
  
  // Set the container size based on the screen diagonal
  const starfieldContainer = document.querySelector('.starfield-container');
  if (starfieldContainer) {
    // Make the container a perfect circle with diameter = screenDiagonal
    const containerSize = screenDiagonal;
    starfieldContainer.style.width = `${containerSize}px`;
    starfieldContainer.style.height = `${containerSize}px`;
  }
  
  // Radius of our circular distribution (half the diagonal)
  const radius = screenDiagonal / 2;
  
  for (let i = 0; i < starCount; i++) {
    const star = document.createElement('div');
    star.className = 'star';
    
    const randomRadius = radius * Math.sqrt(Math.random());
    const angle = Math.random() * Math.PI * 2;
    
    const x = radius + randomRadius * Math.cos(angle);
    const y = radius + randomRadius * Math.sin(angle);
    
    const size = 0.5 + Math.random() * 4.5;
    const color = colors[Math.floor(Math.random() * colors.length)];
    const opacity = 0.5 + Math.random() * 0.5;
    
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

let resizeTimeout;

const handleResize = () => {
  clearTimeout(resizeTimeout);
  resizeTimeout = setTimeout(() => {
    createStarfield();
  }, 300);
};

onMounted(() => {
  createStarfield();
  window.addEventListener('resize', handleResize);
  window.addEventListener('orientationchange', handleResize);
});

onUnmounted(() => {
  window.removeEventListener('resize', handleResize);
  window.removeEventListener('orientationchange', handleResize);
});
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
</style> 