<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { useRouter } from 'vue-router'
import { ArrowLeft, Settings } from 'lucide-vue-next'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'

const router = useRouter()

const STORAGE_KEY = 'melodic-dictation-settings'

// Main settings (visible on page)
const numberOfNotes = ref(8)
const isInfinite = ref(false)
const speed = ref(1)
const speedSlider = ref(100) // 0-200, with 100 = 1x

// Modal settings
const continueOnIncorrect = ref(false)
const keyMode = ref('fixed')
const cadenceType = ref('major')
const octaves = ref({
  low: false,
  middle: true,
  high: false,
})
const showSettingsModal = ref(false)

// Convert slider value (0-200) to speed (0.2-3)
function sliderToSpeed(sliderValue) {
  if (sliderValue <= 100) {
    // 0-100 maps to 0.2-1
    return 0.2 + (sliderValue / 100) * 0.8
  } else {
    // 100-200 maps to 1-3
    return 1 + ((sliderValue - 100) / 100) * 2
  }
}

// Convert speed (0.2-3) to slider value (0-200)
function speedToSlider(speedValue) {
  if (speedValue <= 1) {
    // 0.2-1 maps to 0-100
    return ((speedValue - 0.2) / 0.8) * 100
  } else {
    // 1-3 maps to 100-200
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

// Settings summary
const settingsSummaryParts = computed(() => {
  const parts = []

  // On incorrect guess
  parts.push(continueOnIncorrect.value ? 'Skip incorrect' : 'Retry until correct')

  // Key mode + Cadence type combined
  const keyModeText = keyMode.value === 'fixed' ? 'Fixed' : 'Random'
  const modeText = cadenceType.value === 'major' ? 'Major' : 'Minor'
  parts.push(`${keyModeText} ${modeText}`)

  // Octaves
  const selectedOctaves = Object.entries(octaves.value)
    .filter(([_, selected]) => selected)
    .map(([octave]) => octave.charAt(0).toUpperCase() + octave.slice(1))

  if (selectedOctaves.length === 3) {
    parts.push('All octaves')
  } else if (selectedOctaves.length === 1) {
    parts.push(selectedOctaves[0] + ' octave')
  } else if (selectedOctaves.length > 0) {
    parts.push(selectedOctaves.join(' & ') + ' octaves')
  }

  return parts
})

// Load settings from localStorage on mount
onMounted(() => {
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
      if (settings.octaves) octaves.value = settings.octaves
    } catch (e) {
      console.warn('Failed to load settings from localStorage')
    }
  }
})

function handleSettingsSave() {
  // Ensure at least one octave is selected
  const selectedOctaves = Object.entries(octaves.value)
    .filter(([_, selected]) => selected)
    .map(([octave]) => octave)

  if (selectedOctaves.length === 0) {
    octaves.value.middle = true
  }

  showSettingsModal.value = false
}

function handleStart() {
  // Ensure at least one octave is selected
  const selectedOctaves = Object.entries(octaves.value)
    .filter(([_, selected]) => selected)
    .map(([octave]) => octave)

  if (selectedOctaves.length === 0) {
    selectedOctaves.push('middle')
    octaves.value.middle = true
  }

  // Save to localStorage
  const settings = {
    numberOfNotes: numberOfNotes.value,
    isInfinite: isInfinite.value,
    speed: speed.value,
    continueOnIncorrect: continueOnIncorrect.value,
    keyMode: keyMode.value,
    cadenceType: cadenceType.value,
    octaves: octaves.value,
  }
  localStorage.setItem(STORAGE_KEY, JSON.stringify(settings))

  // Navigate to melodic dictation (you'll need to update the route)
  router.push({
    name: 'melodic-dictation',
    state: { settings }
  })
}
</script>

<template>
  <!-- Settings Modal -->
  <Dialog :open="showSettingsModal" @update:open="(val) => showSettingsModal = val">
    <DialogContent class="sm:max-w-md bg-card" @pointerDownOutside.prevent>
      <DialogHeader class="mb-6">
        <DialogTitle class="text-xl font-medium tracking-heading">Test Configuration</DialogTitle>
      </DialogHeader>

      <div class="flex flex-col gap-6 mb-6">
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

        <div class="flex flex-col gap-3">
          <Label class="text-sm font-normal text-muted-foreground tracking-caps uppercase">Key Mode</Label>
          <RadioGroup v-model="keyMode" class="flex gap-6">
            <div class="flex items-center gap-2">
              <RadioGroupItem id="fixed" value="fixed" />
              <Label for="fixed" class="font-light cursor-pointer">Fixed Key</Label>
            </div>
            <div class="flex items-center gap-2">
              <RadioGroupItem id="random" value="random" />
              <Label for="random" class="font-light cursor-pointer">Random Keys</Label>
            </div>
          </RadioGroup>
        </div>

        <div class="flex flex-col gap-3">
          <Label class="text-sm font-normal text-muted-foreground tracking-caps uppercase">Cadence Type</Label>
          <RadioGroup v-model="cadenceType" class="flex gap-6">
            <div class="flex items-center gap-2">
              <RadioGroupItem id="major" value="major" />
              <Label for="major" class="font-light cursor-pointer">Major</Label>
            </div>
            <div class="flex items-center gap-2">
              <RadioGroupItem id="minor" value="minor" />
              <Label for="minor" class="font-light cursor-pointer">Minor</Label>
            </div>
          </RadioGroup>
        </div>

        <div class="flex flex-col gap-3">
          <Label class="text-sm font-normal text-muted-foreground tracking-caps uppercase">Octaves</Label>
          <div class="flex gap-6">
            <div class="flex items-center gap-2">
              <Checkbox id="low" v-model="octaves.low" />
              <Label for="low" class="font-light cursor-pointer">Low</Label>
            </div>
            <div class="flex items-center gap-2">
              <Checkbox id="middle" v-model="octaves.middle" />
              <Label for="middle" class="font-light cursor-pointer">Middle</Label>
            </div>
            <div class="flex items-center gap-2">
              <Checkbox id="high" v-model="octaves.high" />
              <Label for="high" class="font-light cursor-pointer">High</Label>
            </div>
          </div>
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
        <button class="back-btn" @click="router.push('/')">
          <ArrowLeft :size="20" />
          <span>Back</span>
        </button>
      </div>

      <!-- Title -->
      <div class="title-section">
        <h1 class="title">Melodic Dictation</h1>
        <p class="subtitle">Setup your practice session</p>
      </div>

      <!-- Streamlined Settings -->
      <div class="settings-simple">
        <!-- Number of Notes Card -->
        <div class="config-card">
          <div class="config-content">
            <span class="config-label">Number of Notes</span>
            <div class="notes-container">
              <div class="checkbox-item">
                <Checkbox id="infinite" v-model="isInfinite" />
                <Label for="infinite" class="checkbox-label">Infinite</Label>
              </div>
              <div v-if="!isInfinite" class="number-input-group">
                <input
                  v-model.number="numberOfNotes"
                  type="number"
                  min="2"
                  max="100"
                  class="number-input-inline"
                />
                <span class="notes-label">notes</span>
              </div>
            </div>
          </div>
        </div>

        <!-- Speed Card -->
        <div class="config-card">
          <div class="config-content">
            <div class="speed-header">
              <span class="config-label">Speed</span>
              <span class="speed-value">{{ speedDisplay }}</span>
            </div>
            <div class="slider-container">
              <input
                v-model.number="speedSlider"
                type="range"
                min="0"
                max="200"
                step="1"
                class="slider"
              />
            </div>
            <div class="speed-labels">
              <span style="width: 23px;">0.2x</span>
              <span style="width: 23px; text-align: center">1x</span>
              <span style="width: 23px; text-align: right">3x</span>
            </div>
          </div>
        </div>

        <!-- Test Configuration Card -->
        <div class="config-card clickable" @click="showSettingsModal = true">
          <div class="config-content">
            <span class="config-label">Test Configuration</span>
            <div class="config-summary">
              <template v-for="(part, index) in settingsSummaryParts" :key="index">
                <span>{{ part }}</span>
                <span v-if="index < settingsSummaryParts.length - 1" class="summary-separator">·</span>
              </template>
            </div>
          </div>
          <Settings :size="20" class="config-icon" />
        </div>
      </div>

      <!-- Start Button -->
      <div class="start-section">
        <button class="start-btn" @click="handleStart">
          Start Practice
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
  gap: 32px;
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

.title-section {
  text-align: center;
}

.title {
  font-size: 1.75rem;
  margin: 0 0 8px 0;
  font-weight: 500;
}

.subtitle {
  color: #888;
  font-size: 0.95rem;
  font-weight: 300;
  margin: 0;
}

.settings-simple {
  display: flex;
  flex-direction: column;
  gap: 20px;
  min-width: 500px;
  margin: 0 auto;
}

.config-card {
  background: white;
  border: 1px solid #E0E0E0;
  border-radius: 8px;
  padding: 16px 20px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  transition: all 0.2s;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.08);
}

.config-card.clickable {
  cursor: pointer;
}

.config-card.clickable:hover {
  border-color: #B8956D;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.12);
}

.config-content {
  display: flex;
  flex-direction: column;
  gap: 8px;
  flex: 1;
}

.config-label {
  font-size: 0.75rem;
  color: #888;
  font-weight: 400;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.config-summary {
  font-size: 0.95rem;
  color: #444;
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

.notes-container {
  display: flex;
  align-items: center;
  gap: 16px;
}

.checkbox-item {
  display: flex;
  align-items: center;
  gap: 8px;
}

.checkbox-label {
  font-weight: 300;
  cursor: pointer;
  font-size: 0.95rem;
}

.number-input-group {
  display: flex;
  align-items: center;
  gap: 8px;
}

.number-input-inline {
  border: none;
  background: transparent;
  color: #444;
  font-size: 0.95rem;
  font-weight: 300;
  padding: 0;
  width: 50px;
  outline: none;
}

.number-input-inline:focus {
  color: #B8956D;
}

.notes-label {
  font-size: 0.85rem;
  color: #888;
  font-weight: 300;
}

.speed-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.speed-value {
  font-size: 0.95rem;
  color: #444;
  font-weight: 400;
}

.slider-container {
  display: flex;
  align-items: center;
  gap: 12px;
  width: 100%;
}

.slider {
  flex: 1;
  height: 6px;
  border-radius: 3px;
  background: #E0E0E0;
  outline: none;
  -webkit-appearance: none;
  appearance: none;
}

.slider::-webkit-slider-thumb {
  -webkit-appearance: none;
  appearance: none;
  width: 18px;
  height: 18px;
  border-radius: 50%;
  background: #B8956D;
  cursor: pointer;
  transition: all 0.2s;
}

.slider::-webkit-slider-thumb:hover {
  background: #A6845E;
  transform: scale(1.1);
}

.slider::-moz-range-thumb {
  width: 18px;
  height: 18px;
  border-radius: 50%;
  background: #B8956D;
  cursor: pointer;
  border: none;
  transition: all 0.2s;
}

.slider::-moz-range-thumb:hover {
  background: #A6845E;
  transform: scale(1.1);
}

.speed-labels {
  display: flex;
  justify-content: space-between;
  font-size: 0.75rem;
  color: #888;
  font-weight: 300;
}

.config-icon {
  color: #888;
  transition: color 0.2s;
}

.config-card.clickable:hover .config-icon {
  color: #B8956D;
}

.start-section {
  display: flex;
  justify-content: center;
  padding-top: 8px;
}

.start-btn {
  background: #B8956D;
  color: white;
  padding: 14px 48px;
  font-size: 1.1rem;
  font-weight: 400;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s;
  letter-spacing: 0.02em;
}

.start-btn:hover {
  background: #A6845E;
}
</style>
