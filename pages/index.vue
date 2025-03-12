<template>
  <div>
    <WelcomeScreen
        v-if="!currentRoom"
        @roomJoined="handleRoomJoined"
        @roomCreated="handleRoomCreated"
    />
    <GameBoard
        v-else
        :room-key="currentRoom"
    />
  </div>
  <NicknameModal
      v-model:isOpen="gameInstance.isNicknameModalOpen.value"
      :initial-nickname="gameInstance.playerNickname?.value"
      @save="gameInstance.setNickname"
  />
</template>

<script setup>
const currentRoom = ref(null);
import { provide } from 'vue';

const gameInstance = useGame(); // Create single instance
provide('game', gameInstance);  // Provide it to components

function handleRoomJoined(roomKey) {
  currentRoom.value = roomKey;
}

function handleRoomCreated(roomKey) {
  currentRoom.value = roomKey;
}

function handleNicknameChosen(nickname) {
  if (import.meta.client) {
    localStorage.setItem('playerNickname', nickname);
    gameInstance.connect(currentRoom.value);
  }
}
</script>