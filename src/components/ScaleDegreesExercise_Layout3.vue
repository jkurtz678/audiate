<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { Settings, ArrowLeft, RotateCcw, Music2 } from 'lucide-vue-next'
import { usePiano } from '@/composables/usePiano'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Checkbox } from '@/components/ui/checkbox'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'

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
} = usePiano()

const STORAGE_KEY = 'ear-trainer-settings'

// Settings from setup
const numberOfQuestions = ref(10)
const keyMode = ref('fixed')
const cadenceType = ref('major')
const octaves = ref(['middle'])
const walkToRoot = ref(false)
const currentKey = ref(null)

// Game state
const currentQuestionNumber = ref(1)
const currentNoteIndex = ref(null)
const currentOctave = ref(null)
const feedbackIndex = ref(null)
const feedbackType = ref(null)
const walkHighlightIndex = ref(null)
const correctCount = ref(0)
const incorrectCount = ref(0)
const hasGuessedThisRound = ref(false)
const showSettings = ref(false)

const solfege = computed(() => getSolfege(cadenceType.value))

const settingsSummaryParts = computed(() => {
  const parts = []

  // Key mode + Cadence type combined
  const keyModeText = keyMode.value === 'fixed' ? 'Fixed' : 'Random'
  const modeText = cadenceType.value === 'major' ? 'Major' : 'Minor'
  parts.push(`${keyModeText} ${modeText}`)

  // Octaves
  if (octaves.value.length === 3) {
    parts.push('All octaves')
  } else if (octaves.value.length === 1) {
    const octaveName = octaves.value[0].charAt(0).toUpperCase() + octaves.value[0].slice(1)
    parts.push(`${octaveName} octave`)
  } else if (octaves.value.length > 0) {
    const octaveNames = octaves.value.map(o => o.charAt(0).toUpperCase() + o.slice(1))
    parts.push(octaveNames.join(' & ') + ' octaves')
  }

  return parts
})

// Load settings and start
onMounted(async () => {
  const saved = localStorage.getItem(STORAGE_KEY)
  if (saved) {
    try {
      const settings = JSON.parse(saved)
      if (settings.numberOfQuestions) numberOfQuestions.value = settings.numberOfQuestions
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
      if (settings.walkToRoot !== undefined) walkToRoot.value = settings.walkToRoot
    } catch (e) {
      console.warn('Failed to load settings')
    }
  }

  // Set initial key
  if (keyMode.value === 'fixed') {
    currentKey.value = getRandomKey()
  }

  await startAudioContext()
  startNewRound()
})

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
  const sequence = []
  if (fromIndex <= 3) {
    for (let i = fromIndex; i >= 0; i--) {
      sequence.push(i)
    }
  } else {
    for (let i = fromIndex; i <= 7; i++) {
      sequence.push(i)
    }
  }
  return sequence
}

async function playWalkSequence(sequence) {
  const noteDelay = 350
  for (let i = 0; i < sequence.length; i++) {
    const noteIndex = sequence[i]
    walkHighlightIndex.value = noteIndex
    const duration = i === 0 ? 0.6 : 0.3
    const delay = i === 0 ? noteDelay * 2 : noteDelay
    playScaleNote(noteIndex, currentKey.value, cadenceType.value, currentOctave.value, duration)
    if (i < sequence.length - 1) {
      await new Promise(resolve => setTimeout(resolve, delay))
    }
  }
  await new Promise(resolve => setTimeout(resolve, 1200))
  walkHighlightIndex.value = null
}

function handleGuess(index) {
  if (feedbackType.value === 'correct') return

  feedbackIndex.value = index
  const isTonicMatch = (index === 0 && currentNoteIndex.value === 7) ||
                       (index === 7 && currentNoteIndex.value === 0)
  const isCorrect = index === currentNoteIndex.value || isTonicMatch

  if (isCorrect) {
    feedbackType.value = 'correct'
    if (!hasGuessedThisRound.value) {
      correctCount.value++
    }

    const moveToNext = async () => {
      if (currentQuestionNumber.value >= numberOfQuestions.value) {
        // Go to results
        router.push({
          name: 'scale-degrees-results',
          state: {
            correctCount: correctCount.value,
            incorrectCount: incorrectCount.value,
            totalQuestions: numberOfQuestions.value,
          }
        })
      } else {
        currentQuestionNumber.value++
        startNewRound()
      }
    }

    if (walkToRoot.value) {
      const sequence = getWalkSequence(currentNoteIndex.value)
      feedbackIndex.value = null
      feedbackType.value = null
      playWalkSequence(sequence).then(moveToNext)
    } else {
      setTimeout(moveToNext, 800)
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

function saveWalkToRootSetting() {
  const saved = localStorage.getItem(STORAGE_KEY)
  if (saved) {
    try {
      const settings = JSON.parse(saved)
      settings.walkToRoot = walkToRoot.value
      localStorage.setItem(STORAGE_KEY, JSON.stringify(settings))
    } catch (e) {
      console.warn('Failed to save setting')
    }
  }
}

function handleSettingsDone() {
  saveWalkToRootSetting()
  showSettings.value = false
}
</script>

<template>
  <!-- Settings Modal -->
  <Dialog :open="showSettings" @update:open="(val) => !val && handleSettingsDone()">
    <DialogContent class="sm:max-w-md bg-card" @pointerDownOutside.prevent>
      <DialogHeader class="mb-6">
        <DialogTitle class="text-xl font-medium tracking-heading">Settings</DialogTitle>
      </DialogHeader>

      <div class="flex flex-col gap-3 mb-6">
        <Label class="text-sm font-normal text-muted-foreground tracking-caps uppercase">After Correct Guess</Label>
        <div class="flex items-center gap-2">
          <Checkbox id="walkToRoot" v-model="walkToRoot" />
          <Label for="walkToRoot" class="font-light cursor-pointer">Play walk to root</Label>
        </div>
      </div>

      <DialogFooter>
        <Button @click="handleSettingsDone" class="w-full">Done</Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>

  <div class="page">
    <div class="card">
      <!-- Header -->
      <div class="header">
        <button class="back-btn" @click="router.push({ name: 'scale-degrees-setup' })">
          <ArrowLeft :size="20" />
          <span>Back</span>
        </button>
        <p class="title-small">Functional Scale Degrees</p>
        <button class="settings-btn" @click="showSettings = true">
          <Settings :size="20" />
        </button>
      </div>

      <!-- Settings Summary + Score combined -->
      <div class="info-bar">
        <div class="settings-summary">
          <template v-for="(part, index) in settingsSummaryParts" :key="index">
            <span>{{ part }}</span>
            <span v-if="index < settingsSummaryParts.length - 1" class="summary-separator">·</span>
          </template>
        </div>
        <div class="score-compact">
          <span class="score-label">Score:</span>
          <span class="score-correct">{{ correctCount }}</span>
          <span class="score-sep">/</span>
          <span class="score-incorrect">{{ incorrectCount }}</span>
        </div>
      </div>

      <!-- LAYOUT 3: Compact card with everything on one row -->
      <div class="status-section">
        <div class="question-card" :class="{ 'is-playing': isPlaying }">
          <div class="question-row">
            <div class="question-info">
              <span class="question-label">Question</span>
              <span class="question-number">{{ currentQuestionNumber }} <span class="of-total">of {{ numberOfQuestions }}</span></span>
            </div>

            <div class="controls-and-status">
              <div class="audio-status">
                <template v-if="isPlaying">
                  <div class="wave-bars-small">
                    <div class="bar"></div>
                    <div class="bar"></div>
                    <div class="bar"></div>
                  </div>
                  <span class="status-text">Listening...</span>
                </template>
              </div>

              <button
                class="icon-btn replay-icon-btn"
                :disabled="isPlaying"
                @click="handleReplay"
                title="Replay cadence and note"
              >
                <RotateCcw :size="18" />
              </button>
              <button
                class="icon-btn note-icon-btn"
                :disabled="isPlaying"
                @click="handlePlayNote"
                title="Play note only"
              >
                <Music2 :size="18" />
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- Loading -->
      <div v-if="!isLoaded" class="loading">
        Loading piano...
      </div>

      <!-- Solfege Buttons -->
      <div class="solfege-buttons">
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

.title-small {
  font-size: 0.85rem;
  color: #888;
  font-weight: 300;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  margin: 0;
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

/* Info bar - Settings Summary + Score on same line */
.info-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 0;
}

.settings-summary {
  color: #888;
  font-size: 0.9rem;
  font-weight: 300;
  display: flex;
  align-items: center;
  gap: 8px;
}

.summary-separator {
  color: #B8956D;
  font-size: 1.2rem;
  font-weight: 500;
}

.score-compact {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 1.1rem;
}

.score-label {
  color: #888;
  font-weight: 300;
  font-size: 0.9rem;
}

.score-correct {
  color: #4A9D68;
  font-weight: 500;
}

.score-sep {
  color: #ccc;
}

.score-incorrect {
  color: #CC5A5A;
  font-weight: 500;
}

/* LAYOUT 3: Compact card with fixed-height audio area */
.status-section {
  display: flex;
  justify-content: center;
}

.question-card {
  background: white;
  border: 2px solid #E0E0E0;
  border-radius: 12px;
  padding: 20px 24px;
  width: 100%;
  max-width: 400px;
  transition: all 0.3s ease;
}

.question-card.is-playing {
  border-color: #B8956D;
  box-shadow: 0 0 0 3px rgba(184, 149, 109, 0.1);
}

.question-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.question-info {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.question-label {
  font-size: 0.7rem;
  color: #888;
  font-weight: 300;
  text-transform: uppercase;
  letter-spacing: 0.08em;
}

.question-number {
  font-size: 2rem;
  font-weight: 500;
  color: #444;
  line-height: 1;
}

.of-total {
  font-size: 1.2rem;
  font-weight: 300;
  color: #888;
}

.controls-and-status {
  display: flex;
  align-items: center;
  gap: 8px;
}

.audio-status {
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 120px;
}

.status-text {
  font-size: 0.85rem;
  color: #B8956D;
  font-weight: 400;
}

.icon-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.2s;
  border: none;
}

.replay-icon-btn {
  background: #B8956D;
  color: white;
}

.replay-icon-btn:hover:not(:disabled) {
  background: #A6845E;
  transform: scale(1.05);
}

.replay-icon-btn:disabled {
  background: #E0E0E0;
  color: #888;
  cursor: not-allowed;
}

.note-icon-btn {
  background: white;
  color: #444;
  border: 1px solid #E0E0E0;
}

.note-icon-btn:hover:not(:disabled) {
  background: #f5f5f5;
  border-color: #B8956D;
  color: #B8956D;
  transform: scale(1.05);
}

.note-icon-btn:disabled {
  background: #E0E0E0;
  color: #888;
  cursor: not-allowed;
  border-color: #E0E0E0;
}

.loading {
  color: #888;
  text-align: center;
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
  border: 1px solid #E0E0E0;
  border-radius: 8px;
  background: white;
  color: #444;
  cursor: pointer;
  transition: all 0.2s;
  min-width: 60px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.08);
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

/* Audio Indicator - Small Wave Bars */
.wave-bars-small {
  display: flex;
  gap: 2px;
  align-items: flex-end;
  height: 16px;
  animation: fade-in 0.3s ease-in;
}

.wave-bars-small .bar {
  width: 2px;
  background: #B8956D;
  border-radius: 1px;
  animation: wave-bounce-small 0.8s ease-in-out infinite;
}

@keyframes fade-in {
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
}

.wave-bars-small .bar:nth-child(1) {
  animation-delay: 0s;
}

.wave-bars-small .bar:nth-child(2) {
  animation-delay: 0.15s;
}

.wave-bars-small .bar:nth-child(3) {
  animation-delay: 0.3s;
}

@keyframes wave-bounce-small {
  0%, 100% {
    height: 4px;
  }
  50% {
    height: 16px;
  }
}
</style>
