<script setup>
import { ref, computed, onMounted, onUnmounted, nextTick, watch } from 'vue'
import { useRouter } from 'vue-router'
import { ArrowLeft, RotateCcw, Square, Play, Pause, Settings } from 'lucide-vue-next'
import { usePiano } from '@/composables/usePiano'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'

const router = useRouter()

const {
  isLoaded,
  startAudioContext,
  playCadenceOnly,
  playScaleNote,
  getRandomNoteIndex,
  getRandomKey,
  getRandomOctave,
  getSolfege,
} = usePiano()

const STORAGE_KEY = 'melodic-dictation-settings'

// Setup state
const numberOfNotes = ref(8)
const isInfinite = ref(false)
const speed = ref(1)
const continueOnIncorrect = ref(false)
const keyMode = ref('fixed')
const cadenceType = ref('major')
const octaves = ref(['middle'])
const currentKey = ref(null)
const currentOctave = ref(null)

// Game state
const hasStarted = ref(false)
const isPlaying = ref(false)
const isPaused = ref(false)
const sequence = ref([]) // Array of note indices
const currentGuessIndex = ref(0) // Which note in sequence we're guessing
const playedUpTo = ref(0) // How many notes have been played
const currentlyPlayingIndex = ref(-1) // Which note is currently being played (for highlight)
const guesses = ref([]) // Array of { guessedCorrectly: boolean } or undefined
const correctCount = ref(0)
const incorrectCount = ref(0)

// Button feedback state
const feedbackButtonIndex = ref(null)
const feedbackButtonType = ref(null) // 'correct' | 'wrong'

// Settings modal
const showSettings = ref(false)
const speedSlider = ref(100) // 0-200, with 100 = 1x

// Refs for scrolling
const noteDisplayRef = ref(null)

// Playback timer
let playbackTimer = null

const solfege = computed(() => getSolfege(cadenceType.value))

// Convert slider value (0-200) to speed (0.2-3)
function sliderToSpeed(sliderValue) {
  if (sliderValue <= 100) {
    return 0.2 + (sliderValue / 100) * 0.8
  } else {
    return 1 + ((sliderValue - 100) / 100) * 2
  }
}

// Convert speed (0.2-3) to slider value (0-200)
function speedToSlider(speedValue) {
  if (speedValue <= 1) {
    return ((speedValue - 0.2) / 0.8) * 100
  } else {
    return 100 + ((speedValue - 1) / 2) * 100
  }
}

// Update speed when slider changes
watch(speedSlider, (newValue) => {
  speed.value = Math.round(sliderToSpeed(newValue) * 10) / 10
})

// Update slider when speed is loaded
watch(speed, (newValue) => {
  const expectedSlider = speedToSlider(newValue)
  if (Math.abs(speedSlider.value - expectedSlider) > 0.5) {
    speedSlider.value = Math.round(expectedSlider)
  }
}, { immediate: true })

const speedDisplay = computed(() => `${speed.value.toFixed(1)}x`)

const settingsSummary = computed(() => {
  const keyModeText = keyMode.value === 'fixed' ? 'Fixed' : 'Random'
  const modeText = cadenceType.value === 'major' ? 'major' : 'minor'
  const notesText = isInfinite.value ? 'Infinite' : `${numberOfNotes.value} notes`

  let octaveText
  if (octaves.value.length === 3) {
    octaveText = 'All octaves'
  } else if (octaves.value.length === 1) {
    const octaveName = octaves.value[0].charAt(0).toUpperCase() + octaves.value[0].slice(1)
    octaveText = `${octaveName} octave`
  } else {
    const octaveNames = octaves.value.map(o => o.charAt(0).toUpperCase() + o.slice(1))
    octaveText = octaveNames.join(' & ')
  }

  return `${keyModeText} ${modeText} · ${octaveText} · ${notesText} · ${speed.value}x`
})

const isGameOver = computed(() => {
  if (isInfinite.value) return false
  return currentGuessIndex.value >= numberOfNotes.value && sequence.value.length > 0
})

const visibleNotes = computed(() => {
  // Show all notes in the sequence
  const maxNotes = isInfinite.value ? sequence.value.length : numberOfNotes.value
  return sequence.value.slice(0, maxNotes)
})

const showPauseButton = computed(() => {
  const maxNotes = isInfinite.value ? Infinity : numberOfNotes.value
  return maxNotes > 10
})

// Auto-scroll to current note
watch(currentGuessIndex, () => {
  nextTick(() => {
    if (noteDisplayRef.value) {
      const currentElement = noteDisplayRef.value.querySelector('.note-wrapper.current')
      if (currentElement) {
        currentElement.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' })
      }
    }
  })
})

// Load settings from localStorage on mount
onMounted(async () => {
  const saved = localStorage.getItem(STORAGE_KEY)
  if (saved) {
    try {
      const settings = JSON.parse(saved)
      if (settings.numberOfNotes) numberOfNotes.value = settings.numberOfNotes
      if (settings.isInfinite !== undefined) isInfinite.value = settings.isInfinite
      if (settings.speed) speed.value = settings.speed
      if (settings.continueOnIncorrect !== undefined) continueOnIncorrect.value = settings.continueOnIncorrect
      if (settings.keyMode) keyMode.value = settings.keyMode
      if (settings.cadenceType) cadenceType.value = settings.cadenceType
      if (settings.octaves) {
        const selectedOctaves = Object.entries(settings.octaves)
          .filter(([_, selected]) => selected)
          .map(([octave]) => octave)
        if (selectedOctaves.length > 0) {
          octaves.value = selectedOctaves
        }
      }
    } catch (e) {
      console.warn('Failed to load settings from localStorage')
    }
  }

  // Auto-start the exercise
  await handleStart()
})

onUnmounted(() => {
  stopPlayback()
})

function handleSettingsSave() {
  // Save speed and continueOnIncorrect to localStorage
  const saved = localStorage.getItem(STORAGE_KEY)
  if (saved) {
    try {
      const settings = JSON.parse(saved)
      settings.speed = speed.value
      settings.continueOnIncorrect = continueOnIncorrect.value
      localStorage.setItem(STORAGE_KEY, JSON.stringify(settings))
    } catch (e) {
      console.warn('Failed to save settings')
    }
  }
  showSettings.value = false
}

function generateSequence(length) {
  const seq = []
  const actualLength = isInfinite.value ? 100 : length
  for (let i = 0; i < actualLength; i++) {
    seq.push(getRandomNoteIndex())
  }
  return seq
}

function extendSequence() {
  for (let i = 0; i < 50; i++) {
    sequence.value.push(getRandomNoteIndex())
  }
}

async function handleStart() {
  // Reset state
  const numNotes = isInfinite.value ? 100 : numberOfNotes.value
  sequence.value = generateSequence(numNotes)
  currentGuessIndex.value = 0
  playedUpTo.value = 0
  guesses.value = []
  correctCount.value = 0
  incorrectCount.value = 0
  isPaused.value = false

  // Set key and octave
  currentKey.value = getRandomKey()
  currentOctave.value = getRandomOctave(octaves.value)

  await startAudioContext()
  hasStarted.value = true
  isPlaying.value = true

  // Play cadence first
  await playCadenceOnly(currentKey.value, cadenceType.value)

  // Wait a moment after cadence
  await new Promise(resolve => setTimeout(resolve, 500))

  // Start playing notes
  startPlayback()
}

function startPlayback() {
  if (playbackTimer) clearInterval(playbackTimer)

  const interval = 1000 / speed.value

  // Play first note immediately
  playNextNote()

  playbackTimer = setInterval(() => {
    if (!isPaused.value && isPlaying.value) {
      playNextNote()
    }
  }, interval)
}

function playNextNote() {
  if (isGameOver.value) {
    stopPlayback()
    return
  }

  // For infinite mode, extend sequence if needed
  if (isInfinite.value && playedUpTo.value >= sequence.value.length - 10) {
    extendSequence()
  }

  const maxNotes = isInfinite.value ? Infinity : numberOfNotes.value
  if (playedUpTo.value < sequence.value.length && playedUpTo.value < maxNotes) {
    const noteIndex = sequence.value[playedUpTo.value]

    // Set yellow highlight for currently playing note - stays until next note plays
    currentlyPlayingIndex.value = playedUpTo.value

    playScaleNote(noteIndex, currentKey.value, cadenceType.value, currentOctave.value, 0.5)
    playedUpTo.value++

    // Check if this was the last note
    if (!isInfinite.value && playedUpTo.value >= maxNotes) {
      // Keep highlight on last note, then clear and stop
      setTimeout(() => {
        currentlyPlayingIndex.value = -1
        stopPlayback()
      }, 1000 / speed.value)
    }
  } else if (!isInfinite.value) {
    // Already stopped, just clear highlight
    currentlyPlayingIndex.value = -1
    stopPlayback()
  }
}

function stopPlayback() {
  if (playbackTimer) {
    clearInterval(playbackTimer)
    playbackTimer = null
  }
  isPlaying.value = false
}

function handlePause() {
  isPaused.value = !isPaused.value
}

function handleStop() {
  stopPlayback()
  currentlyPlayingIndex.value = -1
}

async function handleReplay() {
  stopPlayback()

  isPlaying.value = true
  isPaused.value = false

  // Reset playback position
  const previousPlayedUpTo = playedUpTo.value
  playedUpTo.value = 0

  // Replay cadence
  await playCadenceOnly(currentKey.value, cadenceType.value)
  await new Promise(resolve => setTimeout(resolve, 500))

  // Replay notes that were already played
  const interval = 1000 / speed.value

  if (previousPlayedUpTo === 0) {
    // Nothing was played yet, just start fresh
    startPlayback()
  } else {
    // Replay notes that were already played
    const replayNext = () => {
      if (playedUpTo.value < previousPlayedUpTo && !isPaused.value && isPlaying.value) {
        const noteIndex = sequence.value[playedUpTo.value]

        // Set yellow highlight for currently playing note - stays until next note plays
        currentlyPlayingIndex.value = playedUpTo.value

        playScaleNote(noteIndex, currentKey.value, cadenceType.value, currentOctave.value, 0.5)
        playedUpTo.value++

        if (playedUpTo.value < previousPlayedUpTo) {
          setTimeout(replayNext, interval)
        } else {
          // Finished replaying - check if we should continue or end
          const maxNotes = isInfinite.value ? Infinity : numberOfNotes.value
          if (playedUpTo.value < maxNotes) {
            // More notes to play, continue with normal playback
            startPlayback()
          } else {
            // This was the last note overall, keep highlight then stop
            setTimeout(() => {
              currentlyPlayingIndex.value = -1
              isPlaying.value = false
            }, interval)
          }
        }
      }
    }

    replayNext()
  }
}

function showButtonFeedback(buttonIndex, type) {
  feedbackButtonIndex.value = buttonIndex
  feedbackButtonType.value = type
  setTimeout(() => {
    feedbackButtonIndex.value = null
    feedbackButtonType.value = null
  }, 300)
}

function handleGuess(guessIndex) {
  if (!hasStarted.value || isGameOver.value) return

  const maxNotes = isInfinite.value ? sequence.value.length : numberOfNotes.value
  if (currentGuessIndex.value >= maxNotes) return

  const correctNoteIndex = sequence.value[currentGuessIndex.value]

  // Check if correct (including Do/La equivalence for indices 0 and 7)
  const isTonicMatch = (guessIndex === 0 && correctNoteIndex === 7) ||
                       (guessIndex === 7 && correctNoteIndex === 0)
  const isCorrect = guessIndex === correctNoteIndex || isTonicMatch

  // Check if user already had a wrong guess on this note
  const hadPreviousWrongGuess = guesses.value[currentGuessIndex.value]?.hasGuessed

  if (isCorrect) {
    showButtonFeedback(guessIndex, 'correct')

    if (hadPreviousWrongGuess) {
      // They got it right after wrong guess(es) - stays red, just move on
      currentGuessIndex.value++
    } else {
      // First try correct
      guesses.value[currentGuessIndex.value] = { guessedCorrectly: true }
      correctCount.value++
      currentGuessIndex.value++
    }

    if (isGameOver.value) {
      stopPlayback()
    }
  } else {
    // Wrong guess
    showButtonFeedback(guessIndex, 'wrong')

    if (!hadPreviousWrongGuess) {
      incorrectCount.value++
      guesses.value[currentGuessIndex.value] = { guessedCorrectly: false, hasGuessed: true }
    }

    if (continueOnIncorrect.value) {
      currentGuessIndex.value++

      if (isGameOver.value) {
        stopPlayback()
      }
    }
  }
}

function getButtonClass(index) {
  if (feedbackButtonIndex.value === index) {
    return feedbackButtonType.value === 'correct' ? 'correct' : 'wrong'
  }
  return ''
}

function getNoteStatus(index) {
  // Currently playing note is highlighted
  if (currentlyPlayingIndex.value === index) {
    return 'playing'
  }
  // Already guessed notes show their result
  if (guesses.value[index]) {
    return guesses.value[index].guessedCorrectly ? 'correct' : 'incorrect'
  }
  // Not yet guessed
  return 'pending'
}
</script>

<template>
  <!-- Settings Modal -->
  <Dialog :open="showSettings" @update:open="(val) => showSettings = val">
    <DialogContent class="sm:max-w-md bg-card" @pointerDownOutside.prevent>
      <DialogHeader class="mb-6">
        <DialogTitle class="text-xl font-medium tracking-heading">Settings</DialogTitle>
      </DialogHeader>

      <div class="flex flex-col gap-6 mb-6">
        <!-- Speed -->
        <div class="flex flex-col gap-3">
          <Label class="text-sm font-normal text-muted-foreground tracking-caps uppercase">Speed: {{ speedDisplay }}</Label>
          <input
            type="range"
            v-model.number="speedSlider"
            min="0"
            max="200"
            step="1"
            class="w-full accent-primary"
          />
          <div class="relative text-xs text-muted-foreground font-light h-4">
            <span class="absolute left-0">0.2x (slower)</span>
            <span class="absolute left-1/2 -translate-x-1/2">1x</span>
            <span class="absolute right-0">3x (faster)</span>
          </div>
        </div>

        <!-- On Incorrect Guess -->
        <div class="flex flex-col gap-3">
          <Label class="text-sm font-normal text-muted-foreground tracking-caps uppercase">On Incorrect Guess</Label>
          <RadioGroup v-model="continueOnIncorrect" class="flex gap-6">
            <div class="flex items-center gap-2">
              <RadioGroupItem id="retry" :value="false" />
              <Label for="retry" class="font-light cursor-pointer">Keep guessing</Label>
            </div>
            <div class="flex items-center gap-2">
              <RadioGroupItem id="continue" :value="true" />
              <Label for="continue" class="font-light cursor-pointer">Move to next</Label>
            </div>
          </RadioGroup>
        </div>
      </div>

      <DialogFooter>
        <Button @click="handleSettingsSave" class="w-full">Done</Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>

  <div class="page">
    <div class="card">
      <!-- Header -->
      <div class="header">
        <button class="back-btn" @click="router.push({ name: 'melodic-dictation-setup' })">
          <ArrowLeft :size="20" />
          <span>Back</span>
        </button>
        <button class="settings-btn" @click="showSettings = true">
          <Settings :size="20" />
        </button>
      </div>

      <!-- Title & Settings -->
      <div class="title-section">
        <h1 class="title">Melodic Dictation</h1>
        <p class="settings-summary">{{ settingsSummary }}</p>
      </div>

      <!-- Score -->
      <div class="score">
        <span class="correct-score">{{ correctCount }}</span>
        <span class="score-divider">/</span>
        <span class="incorrect-score">{{ incorrectCount }}</span>
      </div>

      <!-- Note display -->
      <div class="note-display-container">
        <div class="note-display" ref="noteDisplayRef">
          <div
            v-for="(noteIndex, index) in visibleNotes"
            :key="index"
            class="note-wrapper"
            :class="{ 'current': index === currentGuessIndex }"
          >
            <div class="arrow" v-if="index === currentGuessIndex">&#9660;</div>
            <div v-else class="arrow-placeholder"></div>
            <div class="quarter-note" :class="getNoteStatus(index)">
              &#9833;
            </div>
          </div>
        </div>
      </div>

      <!-- Game over message -->
      <div v-if="isGameOver" class="game-over">
        <p>Sequence complete! Final score: {{ correctCount }} / {{ correctCount + incorrectCount }}</p>
        <button class="control-btn start-btn" @click="handleStart">
          Next
        </button>
      </div>

      <!-- Solfege buttons -->
      <div v-if="hasStarted && !isGameOver" class="solfege-buttons">
        <button
          v-for="(note, index) in solfege"
          :key="index"
          class="solfege-btn"
          :class="getButtonClass(index)"
          @click="handleGuess(index)"
        >
          {{ note }}
        </button>
      </div>

      <!-- Playback controls -->
      <div v-if="hasStarted && !isGameOver" class="playback-controls">
        <button class="control-btn replay-btn" @click="handleReplay" :disabled="isPlaying && !isPaused">
          <RotateCcw :size="20" />
          <span>Replay</span>
        </button>
        <button v-if="showPauseButton && isPlaying" class="control-btn pause-btn" @click="handlePause">
          <Pause :size="20" v-if="!isPaused" />
          <Play :size="20" v-else />
          <span>{{ isPaused ? 'Resume' : 'Pause' }}</span>
        </button>
        <button class="control-btn stop-btn" @click="handleStop">
          <Square :size="20" />
          <span>Stop</span>
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.page {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
  background: #e8e4e0;
}

.card {
  background: #f5f3f0;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.08);
  border-radius: 16px;
  padding: 32px;
  width: 100%;
  max-width: 700px;
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.back-btn {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 12px;
  font-size: 0.95rem;
  font-weight: 400;
  border: none;
  background: none;
  color: #888;
  cursor: pointer;
  transition: color 0.2s;
  margin-left: -12px;
}

.back-btn:hover {
  color: #444;
}

.settings-btn {
  background: none;
  border: none;
  padding: 8px;
  cursor: pointer;
  color: #888;
  border-radius: 6px;
  transition: all 0.2s;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-right: -8px;
}

.settings-btn:hover {
  color: #444;
  background: rgba(0, 0, 0, 0.04);
}

.title-section {
  text-align: center;
}

.title {
  font-size: 1.75rem;
  margin: 0 0 8px 0;
}

.settings-summary {
  color: #888;
  font-size: 0.9rem;
  font-weight: 300;
  margin: 0;
}

.score {
  font-size: 2rem;
  font-weight: 400;
  text-align: center;
  padding: 8px 0;
}

.correct-score {
  color: #4A9D68;
  font-weight: 500;
}

.score-divider {
  color: #ccc;
  margin: 0 8px;
}

.incorrect-score {
  color: #CC5A5A;
  font-weight: 500;
}

.start-section {
  display: flex;
  justify-content: center;
  padding: 32px 0;
}

.note-display-container {
  width: 100%;
  overflow-x: auto;
  padding: 24px 0;
  scrollbar-width: thin;
}

.note-display {
  display: flex;
  gap: 12px;
  padding: 0 8px;
  min-width: min-content;
  justify-content: center;
}

.note-wrapper {
  display: flex;
  flex-direction: column;
  align-items: center;
  min-width: 36px;
  transition: transform 0.2s;
  position: relative;
}

.arrow {
  position: absolute;
  top: -28px;
  left: 50%;
  transform: translateX(-50%);
  color: #B8956D;
  font-size: 0.9rem;
  animation: bounce 0.5s ease-in-out infinite;
}

.arrow-placeholder {
  display: none;
}

@keyframes bounce {
  0%, 100% { transform: translateX(-50%) translateY(0); }
  50% { transform: translateX(-50%) translateY(4px); }
}

.quarter-note {
  font-size: 2.5rem;
  color: #444;
  transition: color 0.2s;
  line-height: 1;
}

.quarter-note.correct {
  color: #4A9D68;
}

.quarter-note.incorrect {
  color: #CC5A5A;
}

.quarter-note.playing {
  color: #D4B896;
}

.quarter-note.pending {
  color: #444;
}

.game-over {
  text-align: center;
  padding: 16px 0;
}

.game-over p {
  font-size: 1.1rem;
  color: #444;
  margin: 0 0 16px 0;
  font-weight: 300;
}

.solfege-buttons {
  display: flex;
  gap: 8px;
  justify-content: center;
  flex-wrap: wrap;
}

.solfege-btn {
  padding: 16px 12px;
  font-size: 1.1rem;
  font-weight: 400;
  border: none;
  border-radius: 8px;
  background: white;
  color: #3d3d3d;
  cursor: pointer;
  transition: all 0.2s;
  min-width: 60px;
}

.solfege-btn:hover {
  background: #F0EBE5;
}

.solfege-btn.correct,
.solfege-btn.correct:hover {
  background: rgba(74, 157, 104, 0.15);
  color: #4A9D68;
}

.solfege-btn.wrong,
.solfege-btn.wrong:hover {
  background: rgba(204, 90, 90, 0.15);
  color: #CC5A5A;
}

.controls {
  display: flex;
  gap: 12px;
  justify-content: center;
}

.playback-controls {
  display: flex;
  gap: 12px;
  justify-content: center;
  margin-top: 16px;
}

.control-btn {
  padding: 12px 24px;
  font-size: 1rem;
  font-weight: 400;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s;
  letter-spacing: 0.02em;
  display: inline-flex;
  align-items: center;
  gap: 8px;
}

.start-btn {
  background: #B8956D;
  color: white;
  padding: 14px 32px;
  font-size: 1.1rem;
}

.start-btn:hover {
  background: #A6845E;
}

.replay-btn {
  background: white;
  color: #444;
  border: none;
}

.replay-btn:hover:not(:disabled) {
  background: #f5f5f5;
}

.replay-btn:disabled {
  background: #e0dcd8;
  color: #888;
  cursor: not-allowed;
}

.pause-btn {
  background: #FF9800;
  color: white;
}

.pause-btn:hover {
  background: #F57C00;
}

.stop-btn {
  background: white;
  color: #CC5A5A;
  border: 1px solid #CC5A5A;
}

.stop-btn:hover {
  background: rgba(204, 90, 90, 0.1);
  border-color: #B84E4E;
}
</style>
