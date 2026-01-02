<script setup>
import { ref, computed, onMounted, onUnmounted, nextTick, watch } from 'vue'
import { useRouter } from 'vue-router'
import { ArrowLeft, RotateCcw, Square, Play, Pause, Settings } from 'lucide-vue-next'
import { usePiano } from '@/composables/usePiano'
import { useStats } from '@/composables/useStats'
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

const { recordStat } = useStats()

const STORAGE_KEY = 'melodic-dictation-settings'

// Setup state
const numberOfNotes = ref(8)
const numberOfQuestions = ref(10)
const isInfinite = ref(false)
const speed = ref(1)
const continueOnIncorrect = ref(false)
const keyMode = ref('fixed')
const cadenceType = ref('major')
const octaves = ref(['middle'])
const currentKey = ref(null)
const currentOctave = ref(null)

// Game state
const currentQuestionNumber = ref(1)
const hasStarted = ref(false)
const isPlaying = ref(false)
const isPaused = ref(false)
const sequence = ref([]) // Array of { noteIndex, octave }
const currentGuessIndex = ref(0) // Which note in sequence we're guessing
const playedUpTo = ref(0) // How many notes have been played
const currentlyPlayingIndex = ref(-1) // Which note is currently being played (for highlight)
const hasPlayedFirstNote = ref(false) // Track if first note has been played in this sequence
const guesses = ref([]) // Array of { guessedCorrectly: boolean } or undefined
const correctCount = ref(0)
const incorrectCount = ref(0)
const notePlayedTimes = ref([]) // Array of timestamps when each note was played (for thinking time tracking)

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
let replayGeneration = 0 // Counter to invalidate stale replay callbacks

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

const settingsSummaryParts = computed(() => {
  const parts = []

  const keyModeText = keyMode.value === 'fixed' ? 'Fixed' : 'Random'
  const modeText = cadenceType.value === 'major' ? 'Major' : 'Minor'
  parts.push(`${keyModeText} ${modeText}`)

  if (octaves.value.length === 3) {
    parts.push('All octaves')
  } else if (octaves.value.length === 1) {
    const octaveName = octaves.value[0].charAt(0).toUpperCase() + octaves.value[0].slice(1)
    parts.push(`${octaveName} octave`)
  } else if (octaves.value.length > 0) {
    const octaveNames = octaves.value.map(o => o.charAt(0).toUpperCase() + o.slice(1))
    parts.push(octaveNames.join(' & ') + ' octaves')
  }

  parts.push(speedDisplay.value)

  return parts
})

const progressPercentage = computed(() => {
  if (isInfinite.value || numberOfQuestions.value === 0) return 0
  return (currentQuestionNumber.value / numberOfQuestions.value) * 100
})

const isSequenceComplete = computed(() => {
  if (isInfinite.value) return false
  return currentGuessIndex.value >= numberOfNotes.value && sequence.value.length > 0
})

const isAllQuestionsComplete = computed(() => {
  if (isInfinite.value) return false
  return currentQuestionNumber.value > numberOfQuestions.value
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
      if (settings.numberOfQuestions) numberOfQuestions.value = settings.numberOfQuestions
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
    seq.push({
      noteIndex: getRandomNoteIndex(),
      octave: getRandomOctave(octaves.value)
    })
  }
  return seq
}

function extendSequence() {
  for (let i = 0; i < 50; i++) {
    sequence.value.push({
      noteIndex: getRandomNoteIndex(),
      octave: getRandomOctave(octaves.value)
    })
  }
}

async function handleStart() {
  // Reset ALL state (first time starting)
  currentQuestionNumber.value = 1
  correctCount.value = 0
  incorrectCount.value = 0

  await startNewSequence()
}

async function startNewSequence() {
  // Reset sequence-specific state (keep score and question number)
  const numNotes = isInfinite.value ? 100 : numberOfNotes.value
  sequence.value = generateSequence(numNotes)
  currentGuessIndex.value = 0
  playedUpTo.value = 0
  guesses.value = []
  isPaused.value = false
  hasPlayedFirstNote.value = false
  notePlayedTimes.value = [] // Reset thinking time tracking

  // Set key and octave (random new key if random mode)
  if (keyMode.value === 'random') {
    currentKey.value = getRandomKey()
  } else if (!currentKey.value) {
    currentKey.value = getRandomKey()
  }
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

async function handleNextQuestion() {
  currentQuestionNumber.value++

  if (isAllQuestionsComplete.value) {
    // Navigate to results page
    router.push({
      name: 'melodic-dictation-results',
      state: {
        correctCount: correctCount.value,
        incorrectCount: incorrectCount.value,
        totalQuestions: numberOfQuestions.value,
      },
    })
    return
  }

  await startNewSequence()
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
  if (isSequenceComplete.value) {
    stopPlayback()
    return
  }

  // For infinite mode, extend sequence if needed
  if (isInfinite.value && playedUpTo.value >= sequence.value.length - 10) {
    extendSequence()
  }

  const maxNotes = isInfinite.value ? Infinity : numberOfNotes.value
  if (playedUpTo.value < sequence.value.length && playedUpTo.value < maxNotes) {
    const { noteIndex, octave } = sequence.value[playedUpTo.value]

    // Set yellow highlight for currently playing note - stays until next note plays
    currentlyPlayingIndex.value = playedUpTo.value

    playScaleNote(noteIndex, currentKey.value, cadenceType.value, octave, 0.5)

    // Record when this note was played (for thinking time calculation)
    notePlayedTimes.value[playedUpTo.value] = Date.now()

    // Mark that first note has been played
    if (playedUpTo.value === 0) {
      hasPlayedFirstNote.value = true
    }

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
  // If currently playing, stop playback and return
  if (isPlaying.value && !isPaused.value) {
    stopPlayback()
    currentlyPlayingIndex.value = -1
    return
  }

  // In infinite mode, reset the entire test with new notes
  if (isInfinite.value) {
    stopPlayback()
    await startNewSequence()
    return
  }

  stopPlayback()

  isPlaying.value = true
  isPaused.value = false

  // Increment generation to invalidate any pending callbacks from previous replay
  replayGeneration++
  const currentGeneration = replayGeneration

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
      // Check if this callback is from a stale replay
      if (currentGeneration !== replayGeneration) return

      if (playedUpTo.value < previousPlayedUpTo && !isPaused.value && isPlaying.value) {
        const { noteIndex, octave } = sequence.value[playedUpTo.value]

        // Set yellow highlight for currently playing note - stays until next note plays
        currentlyPlayingIndex.value = playedUpTo.value

        playScaleNote(noteIndex, currentKey.value, cadenceType.value, octave, 0.5)

        // Update the timestamp for this note (for thinking time calculation on replay)
        notePlayedTimes.value[playedUpTo.value] = Date.now()

        playedUpTo.value++

        if (playedUpTo.value < previousPlayedUpTo) {
          setTimeout(replayNext, interval)
        } else {
          // Finished replaying - check if we should continue or end
          const maxNotes = isInfinite.value ? Infinity : numberOfNotes.value
          if (playedUpTo.value < maxNotes) {
            // Wait for interval before continuing with normal playback
            // to avoid playing two notes simultaneously
            setTimeout(() => {
              if (currentGeneration === replayGeneration && isPlaying.value && !isPaused.value) {
                startPlayback()
              }
            }, interval)
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
  if (!hasStarted.value || isSequenceComplete.value) return

  const maxNotes = isInfinite.value ? sequence.value.length : numberOfNotes.value
  if (currentGuessIndex.value >= maxNotes) return

  // Prevent guessing notes that haven't been played yet
  if (currentGuessIndex.value >= playedUpTo.value) return

  const correctNoteIndex = sequence.value[currentGuessIndex.value].noteIndex

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
      const noteOctave = sequence.value[currentGuessIndex.value].octave
      // Calculate thinking time (time from note played to guess made)
      const notePlayedTime = notePlayedTimes.value[currentGuessIndex.value]
      const thinkingTime = notePlayedTime ? Date.now() - notePlayedTime : null
      recordStat('melodicDictation', cadenceType.value, correctNoteIndex, true, noteOctave, thinkingTime)
      currentGuessIndex.value++
    }

    if (isSequenceComplete.value) {
      stopPlayback()
    }
  } else {
    // Wrong guess
    showButtonFeedback(guessIndex, 'wrong')

    if (!hadPreviousWrongGuess) {
      incorrectCount.value++
      const noteOctave = sequence.value[currentGuessIndex.value].octave
      // Calculate thinking time (time from note played to guess made)
      const notePlayedTime = notePlayedTimes.value[currentGuessIndex.value]
      const thinkingTime = notePlayedTime ? Date.now() - notePlayedTime : null
      recordStat('melodicDictation', cadenceType.value, correctNoteIndex, false, noteOctave, thinkingTime)
      guesses.value[currentGuessIndex.value] = { guessedCorrectly: false, hasGuessed: true }
    }

    if (continueOnIncorrect.value) {
      currentGuessIndex.value++

      if (isSequenceComplete.value) {
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

function shouldShowSolfege(index) {
  // Show solfege if we've moved past this note (either guessed or skipped)
  return index < currentGuessIndex.value
}

function getNoteSolfege(index) {
  const noteIndex = sequence.value[index].noteIndex
  return solfege.value[noteIndex]
}
</script>

<template>
  <div>
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

      <!-- Center Content -->
      <div class="center-content">
        <!-- Test Badge (Settings Summary) -->
        <div class="test-badge">
          <template v-for="(part, index) in settingsSummaryParts" :key="index">
            <span>{{ part }}</span>
            <span v-if="index < settingsSummaryParts.length - 1" class="summary-separator"> · </span>
          </template>
        </div>

        <!-- Progress Display -->
        <div class="progress-display">
          <div class="progress-bar-track">
            <div class="progress-bar-fill" :style="{ width: progressPercentage + '%' }"></div>
          </div>
          <div class="progress-meta">
            <span class="progress-text">{{ isInfinite ? 'Infinite Mode' : `Question ${currentQuestionNumber} of ${numberOfQuestions}` }}</span>
            <span class="score-text">
              <span class="score-correct">{{ correctCount }}</span> / <span class="score-incorrect">{{ incorrectCount }}</span>
            </span>
          </div>
        </div>

        <!-- Replay Orb -->
        <div class="playback-controls-center">
          <button
            class="playback-orb"
            :class="{ listening: isPlaying }"
            @click="handleReplay"
            title="Replay cadence and sequence"
          >
            <div v-if="isPlaying && !isPaused" class="wave-bars">
              <div class="bar"></div>
              <div class="bar"></div>
              <div class="bar"></div>
            </div>
            <RotateCcw v-else :size="24" />
          </button>
        </div>
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
            <div class="solfege-label">
              {{ shouldShowSolfege(index) ? getNoteSolfege(index) : '?' }}
            </div>
          </div>
        </div>
      </div>

      <!-- Divider and Label -->
      <div class="answer-section">
        <div class="answer-label-row">
          <div class="answer-label" :class="{ invisible: !hasPlayedFirstNote && !isSequenceComplete }">
            {{ isSequenceComplete ? 'Sequence complete!' : 'Select each note you heard' }}
          </div>
          <button
            v-if="isSequenceComplete"
            class="next-question-btn"
            @click="handleNextQuestion"
          >
            Next Question
          </button>
        </div>
      </div>

      <!-- Solfege buttons -->
      <div class="solfege-buttons">
        <button
          v-for="(note, index) in solfege"
          :key="index"
          class="solfege-btn"
          :class="getButtonClass(index)"
          :disabled="!isLoaded || isSequenceComplete"
          @click="handleGuess(index)"
        >
          {{ note }}
        </button>
      </div>
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
  gap: 0px;
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
  border-radius: 8px;
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

/* Center Content */
.center-content {
  display: flex;
  flex-direction: column;
  align-items: center;
}

.test-badge {
  font-size: 0.7rem;
  text-transform: uppercase;
  letter-spacing: 0.1em;
  color: #888;
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 8px;
}

.summary-separator {
  color: #B8956D;
  font-size: 1.2rem;
  font-weight: 500;
}

/* Progress Display */
.progress-display {
  margin-bottom: 32px;
  width: 240px;
}

.progress-bar-track {
  width: 100%;
  height: 4px;
  background: #e0dcd8;
  border-radius: 2px;
  overflow: hidden;
}

.progress-bar-fill {
  height: 100%;
  background: #B8956D;
  border-radius: 2px;
  transition: width 0.3s ease;
}

.progress-meta {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: 8px;
}

.progress-text {
  font-size: 0.75rem;
  color: #999;
}

.score-text {
  font-size: 0.75rem;
  font-weight: 500;
}

.score-correct {
  color: #4a9d5b;
}

.score-incorrect {
  color: #CC5A5A;
}

/* Playback Controls Center */
.playback-controls-center {
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 16px;
  margin-top: 16px;
}

.playback-orb {
  width: 48px;
  height: 48px;
  border-radius: 50%;
  background: white;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.2s ease;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
  border: none;
  color: #888;
}

.playback-orb:hover {
  transform: scale(1.05);
  background: #F0EBE5;
  color: #B8956D;
}

.playback-orb.listening {
  animation: orbPulse 1.5s ease-in-out infinite;
}

@keyframes orbPulse {
  0%, 100% {
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
  }
  50% {
    box-shadow: 0 2px 16px rgba(0, 0, 0, 0.12);
  }
}

/* Wave bars animation inside orb */
.wave-bars {
  display: flex;
  gap: 3px;
  align-items: flex-end;
  height: 20px;
  animation: fade-in 0.3s ease-in;
}

.wave-bars .bar {
  width: 2px;
  background: #B8956D;
  border-radius: 1px;
  animation: wave-bounce 0.8s ease-in-out infinite;
}

.wave-bars .bar:nth-child(1) {
  animation-delay: 0s;
}

.wave-bars .bar:nth-child(2) {
  animation-delay: 0.15s;
}

.wave-bars .bar:nth-child(3) {
  animation-delay: 0.3s;
}

@keyframes fade-in {
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
}

@keyframes wave-bounce {
  0%, 100% {
    height: 6px;
  }
  50% {
    height: 20px;
  }
}

.start-section {
  display: flex;
  justify-content: center;
  padding: 32px 0;
}

.note-display-container {
  width: 100%;
  overflow-x: hidden;
  padding: 24px 0;
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

.solfege-label {
  font-size: 0.75rem;
  color: #888;
  margin-top: 4px;
  font-weight: 400;
  text-align: center;
  min-height: 1.125rem;
}

/* Answer Section */
.answer-section {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 15px 0px 10px 0px; 
  min-height: 70px;
  transition: opacity 0.5s ease;
  opacity: 1;
}

.answer-label-row {
  display: flex;
  align-items: center;
  gap: 12px;
  min-height: 32px;
}

.divider {
  width: 100%;
  max-width: 400px;
  height: 1px;
  background: #e0dcd8;
  margin-bottom: 24px;
}

.loading {
  color: #aaa;
  text-align: center;
  font-weight: 300;
  text-transform: uppercase;
  font-size: 0.7rem;
  letter-spacing: 0.1em;
  min-height: 1em;
}

.answer-label {
  font-size: 0.7rem;
  text-transform: uppercase;
  letter-spacing: 0.1em;
  color: #888;
  min-height: 1em;
}

.answer-label.invisible {
  visibility: hidden;
}

.next-question-btn {
  padding: 8px 16px;
  font-size: 0.8rem;
  font-weight: 400;
  border: none;
  border-radius: 6px;
  background: #B8956D;
  color: white;
  cursor: pointer;
  transition: all 0.2s;
  white-space: nowrap;
}

.next-question-btn:hover {
  background: #A6845E;
}

.solfege-buttons {
  display: flex;
  gap: 8px;
  justify-content: center;
  flex-wrap: nowrap;
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

/* Mobile responsive styles */
@media (max-width: 500px) {
  .page {
    padding: 0;
    align-items: flex-start;
  }

  .card {
    border-radius: 0;
    padding: 24px 16px;
    min-height: 100vh;
    box-shadow: none;
  }

  .solfege-buttons {
    gap: 4px;
  }

  .solfege-btn {
    padding: 12px 4px;
    font-size: 0.85rem;
    min-width: 0;
    flex: 1;
    border-radius: 6px;
  }
}

.solfege-btn:hover:not(:disabled) {
  background: #F0EBE5;
}

.solfege-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
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

.pause-btn {
  background: #FF9800;
  color: white;
}

.pause-btn:hover {
  background: #F57C00;
}
</style>
