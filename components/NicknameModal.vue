<!-- components/NicknameModal.vue -->
<template>
  <TransitionRoot :show="showModal">
    <Dialog as="div" @close="close" class="relative z-50">
      <TransitionChild
          enter="duration-300 ease-out"
          enter-from="opacity-0"
          enter-to="opacity-100"
          leave="duration-200 ease-in"
          leave-from="opacity-100"
          leave-to="opacity-0"
      >
        <div class="fixed inset-0 bg-black bg-opacity-25" />
      </TransitionChild>

      <div class="fixed inset-0 overflow-y-auto">
        <div class="flex min-h-full items-center justify-center p-4">
          <TransitionChild
              enter="duration-300 ease-out"
              enter-from="opacity-0 scale-95"
              enter-to="opacity-100 scale-100"
              leave="duration-200 ease-in"
              leave-from="opacity-100 scale-100"
              leave-to="opacity-0 scale-95"
          >
            <DialogPanel class="w-full max-w-md transform overflow-hidden rounded-2xl bg-white p-6 shadow-xl transition-all">
              <DialogTitle as="h3" class="text-lg font-medium leading-6 text-gray-900">
                Choose Your Nickname
              </DialogTitle>

              <div class="mt-4">
                <input
                    v-model="nickname"
                    type="text"
                    class="w-full px-4 py-2 border rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    :class="{ 'border-red-500': error }"
                    placeholder="Enter nickname..."
                    maxlength="15"
                    @keyup.enter="save"
                />
                <p v-if="error" class="mt-1 text-sm text-red-500">{{ error }}</p>
              </div>

              <div class="mt-4 flex gap-2">
                <button
                    @click="save"
                    class="flex-1 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
                >
                  Save
                </button>
                <button
                    @click="close"
                    class="flex-1 py-2 bg-gray-200 rounded hover:bg-gray-300 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </DialogPanel>
          </TransitionChild>
        </div>
      </div>
    </Dialog>
  </TransitionRoot>
</template>

<script setup>
import { Dialog, DialogPanel, DialogTitle, TransitionRoot, TransitionChild } from '@headlessui/vue';
import { ref, watch } from 'vue';

const props = defineProps({
  isOpen: {
    type: Boolean,
    required: true,
    default: false
  },
  initialNickname: {
    type: String,
    default: ''
  }
});
const emit = defineEmits(['update:isOpen', 'save']);

const nickname = ref(props.initialNickname || '');
const error = ref('');

function close() {
  emit('update:isOpen', false);
}

function save() {
  if (!nickname.value?.trim()) {
    error.value = 'Nickname is required';
    return;
  }
  if (nickname.value.length < 2 || nickname.value.length > 15) {
    error.value = 'Nickname must be between 2 and 15 characters';
    return;
  }

  emit('save', nickname.value.trim());
  close();
}

// Reset nickname when modal opens
watch(() => props.isOpen, (newValue) => {
  if (newValue) {
    nickname.value = props.initialNickname || '';
    error.value = '';
  }
});
const showModal = computed(() => Boolean(props.isOpen));
</script>