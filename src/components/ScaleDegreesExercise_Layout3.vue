<script setup>
import { ref, computed, onMounted, watch } from 'vue'
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
const showAnswerLabel = ref(false)
const playbackType = ref(null) // 'cadence' or 'note'

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

// Watch for when initial playback completes
watch(isPlaying, (newValue, oldValue) => {
  // When audio stops playing and we haven't shown the label yet this round
  if (oldValue === true && newValue === false && !showAnswerLabel.value) {
    showAnswerLabel.value = true
  }
  // Clear playback type when audio stops
  if (newValue === false) {
    playbackType.value = null
  }
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
  showAnswerLabel.value = false
  playbackType.value = 'cadence'

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
    playbackType.value = 'cadence'
    playCadenceAndNote(currentNoteIndex.value, currentKey.value, cadenceType.value, currentOctave.value)
  }
}

function handlePlayNote() {
  if (currentNoteIndex.value !== null && !isPlaying.value) {
    playbackType.value = 'note'
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
            <div class="progress-bar-fill" :style="{ width: (currentQuestionNumber / numberOfQuestions * 100) + '%' }"></div>
          </div>
          <div class="progress-meta">
            <span class="progress-text">Question {{ currentQuestionNumber }} of {{ numberOfQuestions }}</span>
            <span class="score-text">
              <span class="score-correct">{{ correctCount }}</span> / <span class="score-incorrect">{{ incorrectCount }}</span>
            </span>
          </div>
        </div>

        <!-- Playback Controls -->
        <div class="playback-controls">
          <div style="flex: 1"></div>
          <button
            class="playback-orb"
            :class="{ listening: isPlaying && playbackType === 'cadence' }"
            :disabled="isPlaying"
            @click="handleReplay"
            title="Replay cadence and note"
          >
            <div v-if="isPlaying && playbackType === 'cadence'" class="wave-bars">
              <div class="bar"></div>
              <div class="bar"></div>
              <div class="bar"></div>
            </div>
            <RotateCcw v-else :size="32" />
          </button>
          <div style="flex: 1">
            <button
              class="note-btn"
              :class="{ listening: isPlaying && playbackType === 'note' }"
              :disabled="isPlaying"
              @click="handlePlayNote"
              title="Play note only"
            >
              <div v-if="isPlaying && playbackType === 'note'" class="wave-bars-small">
                <div class="bar"></div>
                <div class="bar"></div>
                <div class="bar"></div>
              </div>
              <Music2 v-else :size="20" />
            </button>
          </div>
        </div>

        <div class="divider"></div>

        <!-- Loading -->
        <div v-if="!isLoaded" class="loading">
          Loading piano...
        </div>

        <div v-else class="answer-label" :class="{ 'label-hidden': !showAnswerLabel }">
          Select the note you heard
        </div>
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
  background: #e8e4e0;
}

.card {
  background: #f5f3f0;
  border-radius: 16px;
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

/* Playback Controls */
.playback-controls {
  display: flex;
  align-items: center;
  gap: 16px;
  width: 100%;
  margin-bottom: 60px;
}

.playback-orb {
  width: 100px;
  height: 100px;
  border-radius: 50%;
  background: #B8956D;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.2s ease;
  box-shadow: 0 4px 20px rgba(184, 149, 109, 0.3);
  border: none;
  color: white;
}

.playback-orb:hover:not(:disabled) {
  transform: scale(1.05);
  background: #A6845E;
}

.playback-orb:disabled {
  cursor: not-allowed;
  opacity: 0.9;
}

.playback-orb.listening {
  animation: orbPulse 1.5s ease-in-out infinite;
}

@keyframes orbPulse {
  0%, 100% {
    box-shadow: 0 4px 20px rgba(184, 149, 109, 0.3);
  }
  50% {
    box-shadow: 0 4px 40px rgba(184, 149, 109, 0.5);
  }
}

/* Wave bars animation inside orb */
.wave-bars {
  display: flex;
  gap: 4px;
  align-items: flex-end;
  height: 32px;
  animation: fade-in 0.3s ease-in;
}

.wave-bars .bar {
  width: 3px;
  background: white;
  border-radius: 1.5px;
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
    height: 8px;
  }
  50% {
    height: 32px;
  }
}

.note-btn {
  width: 48px;
  height: 48px;
  border-radius: 50%;
  background: white;
  border: none;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.15s ease;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
  color: #888;
}

.note-btn:hover:not(:disabled) {
  background: #F0EBE5;
  color: #B8956D;
}

.note-btn:disabled {
  cursor: not-allowed;
  opacity: 0.5;
}

/* Wave bars animation inside note button (smaller) */
.wave-bars-small {
  display: flex;
  gap: 2px;
  align-items: flex-end;
  height: 20px;
  animation: fade-in 0.3s ease-in;
}

.wave-bars-small .bar {
  width: 2px;
  background: #B8956D;
  border-radius: 1px;
  animation: wave-bounce-small 0.8s ease-in-out infinite;
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
    height: 6px;
  }
  50% {
    height: 20px;
  }
}

/* Divider */
.divider {
  width: 100%;
  max-width: 400px;
  height: 1px;
  background: #e0dcd8;
  margin-bottom: 24px;
}

/* Answer Label */
.answer-label {
  font-size: 0.7rem;
  text-transform: uppercase;
  letter-spacing: 0.1em;
  color: #888;
  transition: opacity 0.5s ease;
  opacity: 1;
  min-height: 1em;
}

.answer-label.label-hidden {
  opacity: 0;
}

.loading {
  color: #aaa;
  text-align: center;
  font-weight: 300;
  text-transform: uppercase;
  font-size: 0.7rem;
  letter-spacing: 0.1em;
  min-height: 1em;
  transition: opacity 0.5s ease;
  opacity: 1;
}

.solfege-buttons {
  display: flex;
  gap: 8px;
  justify-content: center;
  flex-wrap: wrap;
}

.solfege-btn {
  width: 56px;
  height: 56px;
  border: none;
  border-radius: 8px;
  font-family: inherit;
  font-size: 0.95rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.15s ease;
  background: white;
  color: #3d3d3d;
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

.solfege-btn.walk-highlight,
.solfege-btn.walk-highlight:hover {
  background: rgba(74, 157, 104, 0.15);
  color: #4A9D68;
}
</style>
