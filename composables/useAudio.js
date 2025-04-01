// composables/useAudio.js
import { ref } from 'vue';

// --- Singleton State ---
const mainAudio = ref(null);
const gameAudio = ref(null);
const isMainPlaying = ref(false);
const isGamePlaying = ref(false);
const fadeInterval = ref(null);
const audioInitialized = ref(false);
const isMuted = ref(false);
const previousVolume = ref(0.7); // Store volume level before muting
let initPromise = null; // To ensure initAudio runs only once

// --- Core Logic (moved outside the composable function) ---

// Initialize audio elements
const initAudio = () => {
  if (typeof window === 'undefined' || audioInitialized.value) return Promise.resolve(); // Already initialized or SSR

  // Use a promise to handle asynchronous initialization and prevent multiple calls
  if (!initPromise) {
    initPromise = new Promise((resolve) => {
      // Check if user has previously set mute preference
      if (localStorage.getItem('spacescapeMuted') === 'true') {
        isMuted.value = true;
      }

      // Create main menu audio
      mainAudio.value = new Audio('/main.mp3');
      mainAudio.value.loop = true;
      mainAudio.value.volume = isMuted.value ? 0 : 0.7; // Use initial previousVolume
      mainAudio.value.preload = 'auto';

      // Create game audio
      gameAudio.value = new Audio('/game.mp3');
      gameAudio.value.loop = true;
      gameAudio.value.volume = 0; // Start game audio muted
      gameAudio.value.preload = 'auto';

      let mainReady = false;
      let gameReady = false;

      const checkReady = () => {
        if (mainReady && gameReady) {
          console.log('Both audio tracks loaded and ready.');
          audioInitialized.value = true;
          resolve(); // Resolve the promise once both are ready
        }
      };

      // Add event listeners to handle audio loading
      mainAudio.value.addEventListener('canplaythrough', () => {
        console.log('Main audio loaded and ready to play');
        mainReady = true;
        checkReady();
      }, { once: true }); // Use { once: true } to avoid repeated logs if event fires multiple times

      gameAudio.value.addEventListener('canplaythrough', () => {
        console.log('Game audio loaded and ready to play');
        gameReady = true;
        checkReady();
      }, { once: true });

      // Handle potential loading errors
      mainAudio.value.addEventListener('error', (e) => {
        console.error('Error loading main audio:', e);
        // Optionally reject the promise or handle the error
      });
      gameAudio.value.addEventListener('error', (e) => {
        console.error('Error loading game audio:', e);
        // Optionally reject the promise or handle the error
      });

      // Attempt to load the audio
      mainAudio.value.load();
      gameAudio.value.load();
    });
  }

  return initPromise; // Return the promise
};


// Toggle mute/unmute
const toggleMute = () => {
  if (!audioInitialized.value) return;

  isMuted.value = !isMuted.value;

  // Save preference to localStorage
  if (typeof window !== 'undefined') {
    localStorage.setItem('spacescapeMuted', isMuted.value.toString());
  }

  if (isMuted.value) {
    // Store current volume before muting
    if (mainAudio.value && mainAudio.value.volume > 0) {
      previousVolume.value = mainAudio.value.volume;
    } else if (gameAudio.value && gameAudio.value.volume > 0) {
      previousVolume.value = gameAudio.value.volume;
    } else {
      // If both are 0, keep the stored previous volume (or default)
    }

    // Mute both audio tracks
    if (mainAudio.value) mainAudio.value.volume = 0;
    if (gameAudio.value) gameAudio.value.volume = 0;
  } else {
    // Restore volume only to the currently active track
    if (isMainPlaying.value && mainAudio.value) {
      mainAudio.value.volume = previousVolume.value;
    }
    if (isGamePlaying.value && gameAudio.value) {
       // When unmuting during game, restore volume and potentially fade in if needed
       // For simplicity, just setting volume. A fade-in could be added here.
      gameAudio.value.volume = previousVolume.value;
    }
  }

  return isMuted.value;
};

// Generic Fade In
const fadeIn = (audioElement, targetVolume = previousVolume.value, duration = 1000) => {
  if (!audioElement || isMuted.value) return; // Don't fade if muted

  // Clear any existing fade interval
  if (fadeInterval.value) clearInterval(fadeInterval.value);

  let currentVolume = audioElement.volume;
  const step = (targetVolume - currentVolume) / (duration / 50); // Calculate volume change per step (50ms interval)

  fadeInterval.value = setInterval(() => {
    currentVolume += step;
    if ((step > 0 && currentVolume >= targetVolume) || (step < 0 && currentVolume <= targetVolume)) {
      audioElement.volume = targetVolume; // Ensure final volume is exact
      clearInterval(fadeInterval.value);
      fadeInterval.value = null;
    } else {
      audioElement.volume = currentVolume;
    }
  }, 50);
};

// Generic Fade Out
const fadeOut = (audioElement, duration = 1000, onComplete = () => {}) => {
   if (!audioElement) {
     onComplete();
     return;
   }

   // Clear any existing fade interval
   if (fadeInterval.value) clearInterval(fadeInterval.value);

   let currentVolume = audioElement.volume;
   if (currentVolume === 0) { // Already faded out
      onComplete();
      return;
   }
   const step = -currentVolume / (duration / 50); // Calculate volume change per step

   fadeInterval.value = setInterval(() => {
     currentVolume += step;
     if (currentVolume <= 0) {
       audioElement.volume = 0;
       clearInterval(fadeInterval.value);
       fadeInterval.value = null;
       onComplete(); // Execute callback after fade out
     } else {
       audioElement.volume = currentVolume;
     }
   }, 50);
};


// Crossfade between two audio elements
const crossFade = (fadeOutElement, fadeInElement, duration = 1000, onComplete = () => {}) => {
  if (!fadeOutElement || !fadeInElement || isMuted.value) {
      // If muted, just stop the old and set the new volume (silently)
      if (fadeOutElement) {
          fadeOutElement.pause();
          fadeOutElement.currentTime = 0;
      }
      if (fadeInElement) {
          fadeInElement.volume = 0; // Keep it muted
          // Ensure it's playing if it should be
          if (!fadeInElement.paused) {
              // Already playing (started earlier)
          } else {
             fadeInElement.play().catch(e => console.error("Error playing fade-in element during muted crossfade:", e));
          }
      }
      onComplete();
      return;
  }

  // Clear any existing fade interval
  if (fadeInterval.value) clearInterval(fadeInterval.value);

  let fadeOutVolume = fadeOutElement.volume;
  let fadeInVolume = fadeInElement.volume; // Should usually start at 0
  const targetFadeInVolume = previousVolume.value;

  const fadeOutStep = -fadeOutVolume / (duration / 50);
  const fadeInStep = (targetFadeInVolume - fadeInVolume) / (duration / 50);

  // Ensure fadeInElement is playing
  fadeInElement.play().catch(e => console.error("Error playing fade-in element:", e));

  fadeInterval.value = setInterval(() => {
    let fadeOutDone = false;
    let fadeInDone = false;

    // Fade out
    fadeOutVolume += fadeOutStep;
    if (fadeOutVolume <= 0) {
      fadeOutElement.volume = 0;
      fadeOutDone = true;
    } else {
      fadeOutElement.volume = fadeOutVolume;
    }

    // Fade in
    fadeInVolume += fadeInStep;
    if (fadeInVolume >= targetFadeInVolume) {
      fadeInElement.volume = targetFadeInVolume;
      fadeInDone = true;
    } else {
      fadeInElement.volume = fadeInVolume;
    }

    // Check if both fades are complete
    if (fadeOutDone && fadeInDone) {
      clearInterval(fadeInterval.value);
      fadeInterval.value = null;
      onComplete(); // Execute callback
    }
  }, 50);
};


// Play main menu music
const playMainMusic = async () => {
  await initAudio(); // Ensure audio is initialized
  if (!mainAudio.value || isMainPlaying.value) return; // Don't play if already playing

  console.log('Attempting to play main music');

  // Stop game music if it's playing
  if (isGamePlaying.value) {
    await new Promise(resolve => stopGameMusic(resolve)); // Wait for fade out
  }

  const playAttempt = () => {
    // Reset just before playing
    mainAudio.value.currentTime = 0;
    mainAudio.value.volume = isMuted.value ? 0 : previousVolume.value; // Set initial volume based on mute state

    mainAudio.value.play()
      .then(() => {
        console.log('Main music playing successfully');
        isMainPlaying.value = true;
        isGamePlaying.value = false; // Ensure game state is off
        document.removeEventListener('click', playAttempt);
        document.removeEventListener('keydown', playAttempt);
        // No fade-in needed here usually, starts at full volume unless muted
      })
      .catch(err => {
        console.error('Error playing main music:', err);
        // Keep listeners active if initial play fails due to interaction requirement
        if (!document.onclick && !document.onkeydown) { // Avoid adding multiple listeners
            document.addEventListener('click', playAttempt, { once: true });
            document.addEventListener('keydown', playAttempt, { once: true });
        }
      });
  };

  // Try to play immediately
   mainAudio.value.play()
      .then(() => {
        console.log('Main music playing successfully on first attempt');
        isMainPlaying.value = true;
        isGamePlaying.value = false;
        mainAudio.value.volume = isMuted.value ? 0 : previousVolume.value;
      })
      .catch(err => {
        console.warn('Autoplay prevented for main music, waiting for user interaction:', err);
        // Add event listeners to play on first interaction
         document.addEventListener('click', playAttempt, { once: true });
         document.addEventListener('keydown', playAttempt, { once: true });
      });
};

// Play game music
const playGameMusic = async () => {
  await initAudio(); // Ensure audio is initialized
  if (!gameAudio.value || isGamePlaying.value) return; // Don't play if already playing

  console.log('Attempting to play game music');

  // Stop main music if it's playing
  if (isMainPlaying.value) {
     await new Promise(resolve => stopMainMusic(resolve)); // Wait for fade out
  }

  // Reset and play
  gameAudio.value.currentTime = 0;
  gameAudio.value.volume = 0; // Start muted for fade-in or if globally muted

  gameAudio.value.play()
    .then(() => {
      console.log('Game music playing successfully');
      isGamePlaying.value = true;
      isMainPlaying.value = false; // Ensure main state is off
      // Fade in only if not globally muted
      if (!isMuted.value) {
        fadeIn(gameAudio.value);
      }
    })
    .catch(err => {
      console.error('Error playing game music:', err);
    });
};


// Stop main music
const stopMainMusic = (onComplete = () => {}) => {
  if (!mainAudio.value || !isMainPlaying.value) {
      onComplete();
      return;
  }

  // Fade out then stop
  fadeOut(mainAudio.value, 1000, () => {
    mainAudio.value.pause();
    mainAudio.value.currentTime = 0;
    isMainPlaying.value = false;
    console.log('Main music stopped.');
    onComplete();
  });
};

// Stop game music
const stopGameMusic = (onComplete = () => {}) => {
  if (!gameAudio.value || !isGamePlaying.value) {
      onComplete();
      return;
  }

  // Fade out then stop
  fadeOut(gameAudio.value, 1000, () => {
    gameAudio.value.pause();
    gameAudio.value.currentTime = 0;
    isGamePlaying.value = false;
    console.log('Game music stopped.');
    onComplete();
  });
};

// Transition from main to game music (simplified using stop/start)
const transitionToGameMusic = async () => {
  await initAudio(); // Ensure audio is initialized
  if (!mainAudio.value || !gameAudio.value || isGamePlaying.value) return; // Already playing or not initialized

  console.log('Transitioning to game music');

  if (isMainPlaying.value) {
      // Use crossfade if not muted
      if (!isMuted.value) {
          console.log('Crossfading...');
          isGamePlaying.value = true; // Set state immediately for UI reactivity
          isMainPlaying.value = false;
          crossFade(mainAudio.value, gameAudio.value, 1000, () => {
              mainAudio.value.pause(); // Ensure it's paused after fade
              mainAudio.value.currentTime = 0;
              console.log('Crossfade complete.');
          });
      } else {
          console.log('Switching tracks (muted)...');
          // If muted, just stop main and start game (already muted)
          mainAudio.value.pause();
          mainAudio.value.currentTime = 0;
          isMainPlaying.value = false;

          gameAudio.value.currentTime = 0;
          gameAudio.value.volume = 0;
          gameAudio.value.play().catch(e => console.error("Error playing game audio during muted transition:", e));
          isGamePlaying.value = true;
      }
  } else {
      // If main music wasn't playing, just start game music
      console.log('Main not playing, starting game music directly.');
      playGameMusic(); // This handles initialization and playing
  }
};


// --- Composable Export ---
export function useAudio() {
  // Return the singleton refs and control functions
  return {
    mainAudio,
    gameAudio,
    isMainPlaying,
    isGamePlaying,
    isMuted,
    audioInitialized,
    initAudio, // Expose init, but it should ideally be called once globally
    toggleMute,
    playMainMusic,
    playGameMusic,
    stopMainMusic,
    stopGameMusic,
    transitionToGameMusic,
  };
}
