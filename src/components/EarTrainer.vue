<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { Settings } from 'lucide-vue-next'
import { usePiano } from '@/composables/usePiano'
import SetupModal from '@/components/SetupModal.vue'

const router = useRouter()

const {
  isLoaded,
  isPlaying,
  startAudioContext,
  playCadenceAndNote,
  playNoteOnly,
  playScaleNote,
  getRandomNoteIndex,
  getRandomKey,
  getRandomOctave,
  getSolfege,
  formatKeyDisplay,
} = usePiano()

const STORAGE_KEY = 'ear-trainer-settings'

// Setup state
const showSetup = ref(false)
const keyMode = ref('fixed') // 'fixed' | 'random'
const cadenceType = ref('major') // 'major' | 'minor'
const octaves = ref(['middle']) // ['low', 'middle', 'high']
const walkToRoot = ref(false)
const currentKey = ref(null)

// Game state
const hasStarted = ref(false)
const currentNoteIndex = ref(null)
const currentOctave = ref(null)
const feedbackIndex = ref(null)
const feedbackType = ref(null)
const walkHighlightIndex = ref(null)
const correctCount = ref(0)
const incorrectCount = ref(0)
const hasGuessedThisRound = ref(false)

const solfege = computed(() => getSolfege(cadenceType.value))
const keyDisplay = computed(() => formatKeyDisplay(currentKey.value, cadenceType.value))
const buttonsDisabled = computed(() => !hasStarted.value || isPlaying.value || feedbackType.value === 'correct')

const settingsSummary = computed(() => {
  const keyModeText = keyMode.value === 'fixed' ? 'Fixed' : 'Random'
  const modeText = cadenceType.value === 'major' ? 'major' : 'minor'

  let octaveText
  if (octaves.value.length === 3) {
    octaveText = 'All octaves'
  } else if (octaves.value.length === 1) {
    const octaveName = octaves.value[0].charAt(0).toUpperCase() + octaves.value[0].slice(1)
    octaveText = `${octaveName} octave`
  } else {
    const octaveNames = octaves.value.map(o => o.charAt(0).toUpperCase() + o.slice(1))
    octaveText = octaveNames.join(' & ') + ' octaves'
  }

  return `${keyModeText} ${modeText} | ${octaveText}`
})

// Load settings from localStorage on mount
onMounted(() => {
  const saved = localStorage.getItem(STORAGE_KEY)
  if (saved) {
    try {
      const settings = JSON.parse(saved)
      if (settings.keyMode) keyMode.value = settings.keyMode
      if (settings.cadenceType) cadenceType.value = settings.cadenceType
      if (settings.octaves) {
        // Convert octaves object to array
        const selectedOctaves = Object.entries(settings.octaves)
          .filter(([_, selected]) => selected)
          .map(([octave]) => octave)
        if (selectedOctaves.length > 0) {
          octaves.value = selectedOctaves
        }
      }
      if (settings.walkToRoot !== undefined) walkToRoot.value = settings.walkToRoot
    } catch (e) {
      console.warn('Failed to load settings from localStorage')
    }
  }
})

async function handleInitialStart() {
  // Set initial key
  if (keyMode.value === 'fixed') {
    currentKey.value = getRandomKey()
  }

  await startAudioContext()
  hasStarted.value = true
  startNewRound()
}

function handleSetupStart(settings) {
  keyMode.value = settings.keyMode
  cadenceType.value = settings.cadenceType
  octaves.value = settings.octaves
  walkToRoot.value = settings.walkToRoot
  showSetup.value = false
}

function startNewRound() {
  feedbackIndex.value = null
  feedbackType.value = null
  walkHighlightIndex.value = null
  hasGuessedThisRound.value = false

  // Get new key if random mode
  if (keyMode.value === 'random') {
    currentKey.value = getRandomKey()
  }

  currentNoteIndex.value = getRandomNoteIndex()
  currentOctave.value = getRandomOctave(octaves.value)
  playCadenceAndNote(currentNoteIndex.value, currentKey.value, cadenceType.value, currentOctave.value)
}

function handleReplay() {
  if (currentNoteIndex.value !== null && !isPlaying.value) {
    playCadenceAndNote(currentNoteIndex.value, currentKey.value, cadenceType.value, currentOctave.value)
  }
}

function handlePlayNote() {
  if (currentNoteIndex.value !== null && !isPlaying.value) {
    playNoteOnly(currentNoteIndex.value, currentKey.value, cadenceType.value, currentOctave.value)
  }
}

function getWalkSequence(fromIndex) {
  // Determine the target (low Do = 0, high Do = 7)
  // Notes 0-3 (Do, Re, Mi, Fa) walk DOWN to 0
  // Notes 4-7 (Sol, La, Ti, Do) walk UP to 7
  const sequence = []

  if (fromIndex <= 3) {
    // Walk down to low Do
    for (let i = fromIndex; i >= 0; i--) {
      sequence.push(i)
    }
  } else {
    // Walk up to high Do
    for (let i = fromIndex; i <= 7; i++) {
      sequence.push(i)
    }
  }

  return sequence
}

async function playWalkSequence(sequence) {
  const noteDelay = 350 // ms between notes

  for (let i = 0; i < sequence.length; i++) {
    const noteIndex = sequence[i]
    walkHighlightIndex.value = noteIndex

    // First note (mystery note) gets double duration for emphasis
    const duration = i === 0 ? 0.6 : 0.3
    const delay = i === 0 ? noteDelay * 2 : noteDelay

    playScaleNote(noteIndex, currentKey.value, cadenceType.value, currentOctave.value, duration)

    if (i < sequence.length - 1) {
      await new Promise(resolve => setTimeout(resolve, delay))
    }
  }

  // Keep last note highlighted briefly, then clear
  await new Promise(resolve => setTimeout(resolve, 1200))
  walkHighlightIndex.value = null
}

function handleGuess(index) {
  if (buttonsDisabled.value) return

  feedbackIndex.value = index

  // Low and high tonic (Do/La) are interchangeable (indices 0 and 7)
  const isTonicMatch = (index === 0 && currentNoteIndex.value === 7) ||
                       (index === 7 && currentNoteIndex.value === 0)
  const isCorrect = index === currentNoteIndex.value || isTonicMatch

  if (isCorrect) {
    feedbackType.value = 'correct'
    if (!hasGuessedThisRound.value) {
      correctCount.value++
    }

    if (walkToRoot.value) {
      // Play walk to root immediately, then start new round
      const sequence = getWalkSequence(currentNoteIndex.value)
      feedbackIndex.value = null
      feedbackType.value = null
      playWalkSequence(sequence).then(() => {
        startNewRound()
      })
    } else {
      setTimeout(() => {
        startNewRound()
      }, 800)
    }
  } else {
    feedbackType.value = 'wrong'
    if (!hasGuessedThisRound.value) {
      incorrectCount.value++
      hasGuessedThisRound.value = true
    }
    setTimeout(() => {
      feedbackIndex.value = null
      feedbackType.value = null
    }, 1000)
  }
}

function getButtonClass(index) {
  if (walkHighlightIndex.value === index) {
    return 'walk-highlight'
  }
  if (feedbackIndex.value === index) {
    return feedbackType.value === 'correct' ? 'correct' : 'wrong'
  }
  return ''
}
</script>

<template>
  <SetupModal :open="showSetup" @start="handleSetupStart" @close="showSetup = false" />

  <div class="ear-trainer">
    <button class="back-btn" @click="router.push('/')">&larr; Back</button>
    <h1 class="title">Functional Scale Degrees</h1>
    <div class="settings-row">
      <span class="settings-summary">{{ settingsSummary }}</span>
      <button class="settings-btn" @click="showSetup = true">
        <Settings :size="18" />
      </button>
    </div>

    <div v-if="hasStarted" class="score">
      <span class="correct-score">{{ correctCount }}</span>
      <span class="score-divider">/</span>
      <span class="incorrect-score">{{ incorrectCount }}</span>
    </div>

    <div v-if="!hasStarted" class="controls">
      <button
        class="control-btn start-btn"
        @click="handleInitialStart"
      >
        Start
      </button>
    </div>

    <div v-if="!isLoaded && hasStarted" class="loading">
      Loading piano...
    </div>

    <div v-if="hasStarted" class="solfege-buttons">
      <button
        v-for="(note, index) in solfege"
        :key="index"
        class="solfege-btn"
        :class="getButtonClass(index)"
        :disabled="buttonsDisabled"
        @click="handleGuess(index)"
      >
        {{ note }}
      </button>
    </div>

    <div v-if="hasStarted" class="controls">
      <button
        class="control-btn replay-btn"
        :disabled="isPlaying"
        @click="handleReplay"
      >
        Replay
      </button>
      <button
        class="control-btn note-btn"
        :disabled="isPlaying"
        @click="handlePlayNote"
      >
        Note
      </button>
    </div>
  </div>
</template>

<style scoped>
.ear-trainer {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 2rem;
  min-height: 100vh;
  font-family: system-ui, -apple-system, sans-serif;
  position: relative;
}

.back-btn {
  position: absolute;
  top: 1rem;
  left: 1rem;
  padding: 0.5rem 1rem;
  font-size: 1rem;
  border: none;
  background: none;
  color: #666;
  cursor: pointer;
  transition: color 0.2s;
}

.back-btn:hover {
  color: #333;
}

.title {
  font-size: 2.5rem;
  color: #333;
  margin-bottom: 0.5rem;
}

.settings-row {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-bottom: 1.5rem;
}

.settings-summary {
  color: #666;
  font-size: 1rem;
}

.settings-btn {
  background: none;
  border: none;
  padding: 0.5rem;
  cursor: pointer;
  color: #666;
  border-radius: 8px;
  transition: all 0.2s;
  display: flex;
  align-items: center;
  justify-content: center;
}

.settings-btn:hover {
  color: #333;
  background: #f0f0f0;
}

.score {
  font-size: 1.5rem;
  margin-bottom: 1.5rem;
}

.correct-score {
  color: #4CAF50;
  font-weight: bold;
}

.score-divider {
  color: #999;
  margin: 0 0.25rem;
}

.incorrect-score {
  color: #f44336;
  font-weight: bold;
}

.controls {
  margin-top: 2rem;
}

.control-btn {
  padding: 1rem 2rem;
  font-size: 1.2rem;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s;
}

.start-btn {
  background: #4CAF50;
  color: white;
}

.start-btn:hover {
  background: #43A047;
}

.replay-btn {
  background: #2196F3;
  color: white;
}

.replay-btn:hover:not(:disabled) {
  background: #1976D2;
}

.replay-btn:disabled,
.note-btn:disabled {
  background: #ccc;
  cursor: not-allowed;
}

.note-btn {
  background: #9C27B0;
  color: white;
  margin-left: 0.5rem;
}

.note-btn:hover:not(:disabled) {
  background: #7B1FA2;
}

.loading {
  color: #666;
  margin-bottom: 1rem;
}

.solfege-buttons {
  display: flex;
  gap: 0.5rem;
  justify-content: center;
}

.solfege-btn {
  padding: 1.5rem 1.5rem;
  font-size: 1.3rem;
  border: 2px solid #ddd;
  border-radius: 8px;
  background: white;
  color: #333;
  cursor: pointer;
  transition: all 0.2s;
  min-width: 70px;
}

.solfege-btn:hover:not(:disabled) {
  border-color: #999;
  background: #f5f5f5;
}

.solfege-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.solfege-btn.correct,
.solfege-btn.correct:hover {
  background: #4CAF50;
  border-color: #4CAF50;
  color: white;
}

.solfege-btn.wrong,
.solfege-btn.wrong:hover {
  background: #f44336;
  border-color: #f44336;
  color: white;
}

.solfege-btn.walk-highlight,
.solfege-btn.walk-highlight:hover {
  background: #2196F3;
  border-color: #2196F3;
  color: white;
}
</style>
