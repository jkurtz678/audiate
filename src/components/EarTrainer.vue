<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { Settings, ArrowLeft, RotateCcw, Music2 } from 'lucide-vue-next'
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
const walkToRoot = ref(true)
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

  return `${keyModeText} ${modeText} · ${octaveText}`
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
  // Prevent guessing during correct animation/transition
  if (feedbackType.value === 'correct') return

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
  <div>
  <SetupModal :open="showSetup" @start="handleSetupStart" @close="showSetup = false" />

  <div class="page">
    <div class="card">
      <!-- Header -->
      <div class="header">
        <button class="back-btn" @click="router.push('/')">
          <ArrowLeft :size="20" />
          <span>Back</span>
        </button>
        <div class="header-right">
          <div v-if="hasStarted && isPlaying" class="wave-bars">
            <div class="bar"></div>
            <div class="bar"></div>
            <div class="bar"></div>
            <div class="bar"></div>
          </div>
          <button class="settings-btn" @click="showSetup = true">
            <Settings :size="20" />
          </button>
        </div>
      </div>

      <!-- Title & Settings -->
      <div class="title-section">
        <h1 class="title">Functional Scale Degrees</h1>
        <p class="settings-summary">{{ settingsSummary }}</p>
      </div>

      <!-- Score -->
      <div v-if="hasStarted" class="score">
        <span class="correct-score">{{ correctCount }}</span>
        <span class="score-divider">/</span>
        <span class="incorrect-score">{{ incorrectCount }}</span>
      </div>

      <!-- Loading -->
      <div v-if="!isLoaded && hasStarted" class="loading">
        Loading piano...
      </div>

      <!-- Start Button (before game) -->
      <div v-if="!hasStarted" class="start-section">
        <button class="control-btn start-btn" @click="handleInitialStart">
          Start
        </button>
      </div>

      <!-- Solfege Buttons -->
      <div v-if="hasStarted" class="solfege-buttons">
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

      <!-- Controls -->
      <div v-if="hasStarted" class="controls">
        <button
          class="control-btn replay-btn"
          :disabled="isPlaying"
          @click="handleReplay"
        >
          <RotateCcw :size="18" />
          <span>Replay</span>
        </button>
        <button
          class="control-btn note-btn"
          :disabled="isPlaying"
          @click="handlePlayNote"
        >
          <Music2 :size="18" />
          <span>Note</span>
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
  background: #E5E4E2;
}

.card {
  background: #FAF9F7;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.08);
  padding: 32px;
  width: 100%;
  max-width: 600px;
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.header-right {
  display: flex;
  align-items: center;
  gap: 12px;
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
  font-size: 0.95rem;
  font-weight: 300;
  margin: 0;
}

.score {
  font-size: 2rem;
  font-weight: 400;
  text-align: center;
  padding: 16px 0;
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

.loading {
  color: #888;
  text-align: center;
  font-weight: 300;
}

.start-section {
  display: flex;
  justify-content: center;
  padding: 32px 0;
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
  border: 1px solid #E0E0E0;
  border-radius: 8px;
  background: white;
  color: #444;
  cursor: pointer;
  transition: all 0.2s;
  min-width: 60px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.08);
}

/* Mobile responsive styles */
@media (max-width: 500px) {
  .card {
    padding: 24px 16px;
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

.solfege-btn:hover {
  border-color: #B8956D;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.12);
}

.solfege-btn.correct,
.solfege-btn.correct:hover {
  background: rgba(74, 157, 104, 0.15);
  border-color: #4A9D68;
  color: #4A9D68;
  border-left: 3px solid #4A9D68;
}

.solfege-btn.wrong,
.solfege-btn.wrong:hover {
  background: rgba(204, 90, 90, 0.15);
  border-color: #CC5A5A;
  color: #CC5A5A;
  border-left: 3px solid #CC5A5A;
}

.solfege-btn.walk-highlight,
.solfege-btn.walk-highlight:hover {
  background: rgba(74, 157, 104, 0.15);
  border-color: #4A9D68;
  color: #4A9D68;
}

.controls {
  display: flex;
  gap: 12px;
  justify-content: center;
}

.control-btn {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 24px;
  font-size: 1rem;
  font-weight: 400;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s;
  letter-spacing: 0.02em;
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
  background: #B8956D;
  color: white;
}

.replay-btn:hover:not(:disabled) {
  background: #A6845E;
}

.replay-btn:disabled,
.note-btn:disabled {
  background: #E0E0E0;
  color: #888;
  cursor: not-allowed;
}

.note-btn {
  background: white;
  color: #444;
  border: 1px solid #E0E0E0;
}

.note-btn:hover:not(:disabled) {
  background: #f5f5f5;
  border-color: #B8956D;
}

/* Audio Indicator - Wave Bars */
.wave-bars {
  display: flex;
  gap: 3px;
  align-items: flex-end;
  height: 20px;
  animation: fade-in 0.3s ease-in;
}

.wave-bars .bar {
  width: 3px;
  background: #B8956D;
  border-radius: 2px;
  animation: wave-bounce 0.8s ease-in-out infinite;
}

@keyframes fade-in {
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
}

.wave-bars .bar:nth-child(1) {
  animation-delay: 0s;
}

.wave-bars .bar:nth-child(2) {
  animation-delay: 0.1s;
}

.wave-bars .bar:nth-child(3) {
  animation-delay: 0.2s;
}

.wave-bars .bar:nth-child(4) {
  animation-delay: 0.3s;
}

@keyframes wave-bounce {
  0%, 100% {
    height: 6px;
  }
  50% {
    height: 20px;
  }
}
</style>
