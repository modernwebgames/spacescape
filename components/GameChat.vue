<!-- components/GameChat.vue -->
<template>
    <div class="h-[80vh] flex flex-col bg-gray-900/95 rounded-lg shadow-md border border-blue-900 relative z-10">
  
      <!-- Chat Messages Area -->
      <div class="flex-1 p-4 overflow-y-auto" ref="chatContainer">
        <!-- Story Introduction -->
        <div class="mb-4 p-4 border rounded-lg border-blue-900 bg-gray-800/50">
          <p class="text-gray-400 text-sm whitespace-pre-line">
            <b class="text-yellow-700">13.05.2998 – 43:23 AM (XMT+22)</b><br>
            <i class="text-yellow-700">Somewhere between the Shenlooq and Ossdemar galaxies</i>

            <br><br>You are passenger GДß3424/05 aboard LI-TRAVEL™ Flight RØШ79003. A few hours ago, you were partying with other passengers. Now, you're jolted awake by violent tremors and a blaring alarm.

            <br><br>The ship's reactor has failed. In <b><i>10 minutes</i></b>, it will explode. Through flames and chaos, you manage to reach an escape pod. As you strap in, the pod's communication system crackles to life. This system, though rather primitive, can translate 8594 languages from 72 galaxies.

            <br><br>The captain's voice echoes through the pod speakers:
            <i>"We don't have enough fuel. Some pods must be left behind."</i>

            <br><br>But there's more—androids have also boarded the pods, disguising as passengers. The captain will leave those pods behind to rescue the human passengers… if he can figure out who is who.

            <br><br>You must convince the captain to pick your pod for launch—before time runs out...
          </p>
        </div>

        <div v-for="(message, index) in visibleMessages" 
             :key="index"
             class="mb-4"
             :class="message.sender === playerNickname ? 'text-right' : 'text-left'"
        >
          <div class="inline-block max-w-[80%] rounded-lg px-4 py-2"
               :class="message.sender === playerNickname ? 'bg-blue-700 text-blue-100 border border-blue-500' 
                 : message.sender === 'System' ? 'bg-gray-800 text-green-400 border border-green-500'
                 : message.sender === 'DigiTranslate 3000' ? 'bg-purple-900 text-purple-100 border border-purple-500'
                 : 'bg-gray-800 text-blue-100 border border-blue-900'"
          >
            <div class="text-sm font-semibold mb-1">
              {{ message.sender }}
            </div>
            <div class="break-words" v-html="message.text">
            </div>
            <div class="text-xs opacity-75 mt-1">
              {{ formatTime(message.timestamp) }}
            </div>
          </div>
        </div>
      </div>
  
      <!-- Message Input -->
      <div class="p-4 border-t border-blue-900 bg-gray-900">
        <div class="flex gap-2 w-full">
          <input
            v-model="newMessage"
            type="text"
            placeholder="Type your message..."
            class="w-4/5 px-4 py-2 bg-gray-800 text-blue-100 border border-blue-900 rounded-lg 
                   focus:outline-none focus:ring-2 focus:ring-blue-500 placeholder-blue-300
                   relative z-10"
            @keyup.enter="sendMessage"
            :disabled="isSendDisabled"
          />

          <!-- Send button -->
          <button
            class="w-1/5 px-3 py-2 rounded-lg hover:bg-blue-600 transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 border border-blue-500"
            :class="{ 'bg-blue-700 text-blue-100': !isSendDisabled, 'bg-gray-600 text-gray-400': isSendDisabled }"
            @click="sendMessage"
            :disabled="isSendDisabled"
          >
            Send
          </button>
        </div>
      </div>
    </div>
  </template>
  
  <script setup>
  import { ref, watch, computed } from 'vue';
  
  const props = defineProps({
    playerNickname: {
      type: String,
      required: true
    },
    roomKey: {
      type: String,
      required: true
    },
    messages: {
      type: Array,
      required: true
    },
    isSendDisabled: {
      type: Boolean,
      required: true
    }
  });

  const emit = defineEmits(['sendMessage']);
  
  const newMessage = ref('');
  const chatContainer = ref(null);
  
  // Computed property to filter messages
  const visibleMessages = computed(() => {
    return props.messages.filter(message => 
        !message.isPrivate || // Show non-private messages (AI Translation, System)
        message.sender === props.playerNickname || // Show user's own messages
        message.sender === 'System' || // Always show system messages
        message.sender === 'DigiTranslate 3000' // Always show AI translations
    );
  });
  
  // Send message
  const sendMessage = () => {
    if (!newMessage.value.trim()) return;
    
    emit('sendMessage', newMessage.value);
    newMessage.value = '';
  };
  
  // Format timestamp
  const formatTime = (timestamp) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };
  
  // Scroll to bottom when new messages arrive
  watch(() => props.messages, () => {
    setTimeout(() => {
      if (chatContainer.value) {
        chatContainer.value.scrollTop = chatContainer.value.scrollHeight;
      }
    }, 0);
  }, { deep: true });
  </script>