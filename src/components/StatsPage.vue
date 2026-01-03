<script setup>
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import { ArrowLeft } from 'lucide-vue-next'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Label } from '@/components/ui/label'
import { useStats } from '@/composables/useStats'

const router = useRouter()
const { getFilteredStats, getTotalStats } = useStats()

// Filter state
const exerciseFilter = ref('all')
const modeFilter = ref('major')

// Computed stats based on filters
const noteStats = computed(() => {
  return getFilteredStats(exerciseFilter.value, modeFilter.value)
})

const totalStats = computed(() => {
  return getTotalStats(exerciseFilter.value, modeFilter.value)
})

// Check if there's any data at all
const hasData = computed(() => {
  return noteStats.value.some(n => n.total > 0)
})

function getPercentage(note) {
  if (note.total === 0) return 0
  return Math.round((note.correct / note.total) * 100)
}

// Get min/max percentages for relative coloring
const percentageRange = computed(() => {
  const notesWithData = noteStats.value.filter(n => n.total > 0)
  if (notesWithData.length === 0) return { min: 0, max: 100 }

  const percentages = notesWithData.map(n => getPercentage(n))
  return {
    min: Math.min(...percentages),
    max: Math.max(...percentages)
  }
})

function getBarColor(note) {
  const pct = getPercentage(note)
  if (note.total === 0) return 'transparent'

  const { min, max } = percentageRange.value

  // If all notes have the same percentage, use a neutral gold color
  if (min === max) {
    return 'rgb(196, 170, 80)' // gold
  }

  // Normalize to 0-1 based on the data range
  const normalized = (pct - min) / (max - min)

  // Color stops: 0 = deep coral, 0.5 = warm orange, 0.8 = gold, 1 = fresh green
  const deepRed = { r: 198, g: 78, b: 78 }    // #C64E4E
  const orange = { r: 218, g: 140, b: 75 }    // #DA8C4B
  const gold = { r: 196, g: 170, b: 80 }      // #C4AA50
  const green = { r: 74, g: 168, b: 110 }     // #4AA86E

  let r, g, b
  if (normalized <= 0.5) {
    // Deep red to orange
    const t = normalized / 0.5
    r = Math.round(deepRed.r + (orange.r - deepRed.r) * t)
    g = Math.round(deepRed.g + (orange.g - deepRed.g) * t)
    b = Math.round(deepRed.b + (orange.b - deepRed.b) * t)
  } else if (normalized <= 0.8) {
    // Orange to gold
    const t = (normalized - 0.5) / 0.3
    r = Math.round(orange.r + (gold.r - orange.r) * t)
    g = Math.round(orange.g + (gold.g - orange.g) * t)
    b = Math.round(orange.b + (gold.b - orange.b) * t)
  } else {
    // Gold to green
    const t = (normalized - 0.8) / 0.2
    r = Math.round(gold.r + (green.r - gold.r) * t)
    g = Math.round(gold.g + (green.g - gold.g) * t)
    b = Math.round(gold.b + (green.b - gold.b) * t)
  }

  return `rgb(${r}, ${g}, ${b})`
}
</script>

<template>
  <div class="page">
    <div class="card">
      <!-- Header -->
      <div class="header">
        <button class="back-btn" @click="router.push('/')">
          <ArrowLeft :size="20" />
          <span>Back</span>
        </button>
        <!-- Title (desktop) -->
        <div class="title-section title-desktop">
          <h1 class="title">Statistics</h1>
        </div>
        <div class="header-spacer"></div>
      </div>

      <!-- Title (mobile) -->
      <div class="title-section title-mobile">
        <h1 class="title">Statistics</h1>
        <p class="subtitle">Track your progress over time</p>
      </div>

      <!-- Main content area -->
      <div class="main-content">
        <!-- Left column: Filters + Summary -->
        <div class="left-column">
          <!-- Filters -->
          <div class="filters">
            <div class="filter-group">
              <Label class="filter-label">Exercise</Label>
              <RadioGroup v-model="exerciseFilter" class="filter-options">
                <div class="filter-option">
                  <RadioGroupItem id="all" value="all" />
                  <Label for="all" class="font-light cursor-pointer">All</Label>
                </div>
                <div class="filter-option">
                  <RadioGroupItem id="scaleDegrees" value="scaleDegrees" />
                  <Label for="scaleDegrees" class="font-light cursor-pointer">Scale Degrees</Label>
                </div>
                <div class="filter-option">
                  <RadioGroupItem id="melodicDictation" value="melodicDictation" />
                  <Label for="melodicDictation" class="font-light cursor-pointer">Melodic Dictation</Label>
                </div>
              </RadioGroup>
            </div>

            <div class="filter-group">
              <Label class="filter-label">Mode</Label>
              <RadioGroup v-model="modeFilter" class="filter-options">
                <div class="filter-option">
                  <RadioGroupItem id="major" value="major" />
                  <Label for="major" class="font-light cursor-pointer">Major</Label>
                </div>
                <div class="filter-option">
                  <RadioGroupItem id="minor" value="minor" />
                  <Label for="minor" class="font-light cursor-pointer">Minor</Label>
                </div>
              </RadioGroup>
            </div>
          </div>

          <!-- Stats Summary -->
          <div v-if="hasData" class="summary">
            <div class="summary-stat">
              <span class="summary-value correct">{{ totalStats.correct }}</span>
              <span class="summary-label">Correct</span>
            </div>
            <div class="summary-divider"></div>
            <div class="summary-stat">
              <span class="summary-value incorrect">{{ totalStats.incorrect }}</span>
              <span class="summary-label">Incorrect</span>
            </div>
            <div class="summary-divider"></div>
            <div class="summary-stat">
              <span class="summary-value">{{ totalStats.accuracy }}%</span>
              <span class="summary-label">Accuracy</span>
            </div>
          </div>

        </div>

        <!-- Right column: Chart -->
        <div class="right-column">
          <!-- Bar Chart -->
          <div class="chart">
            <template v-if="hasData">
              <div v-for="note in noteStats" :key="note.noteIndex" class="chart-row">
                <div class="chart-label">{{ note.label }}</div>
                <div class="chart-bar-container">
                  <div
                    class="chart-bar"
                    :style="{ width: getPercentage(note) + '%', backgroundColor: getBarColor(note) }"
                  ></div>
                </div>
                <div class="chart-value">
                  <span v-if="note.total > 0">
                    {{ getPercentage(note) }}% <span class="chart-count">({{ note.correct }}/{{ note.total }})</span>
                  </span>
                  <span v-else class="no-data">-</span>
                </div>
              </div>
            </template>

            <div v-else class="empty-state">
              <p class="empty-text">No data yet</p>
              <p class="empty-subtext">Complete some exercises to see your stats here</p>
            </div>
          </div>

        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.page {
  min-height: 100dvh;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
  background: #e8e4e0;
}

.card {
  background: linear-gradient(180deg, #f5f3f0 0%, #ebe7e3 100%);
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.08);
  border-radius: 16px;
  padding: 32px;
  width: 100%;
  max-width: 900px;
  display: flex;
  flex-direction: column;
}

.header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}

.header-spacer {
  width: 80px; /* Balance the back button */
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

.title-desktop {
  display: block;
}

.title-mobile {
  display: none;
  margin-bottom: 12px;
}

.title {
  font-size: 1.75rem;
  margin: 0;
  font-weight: 300;
  color: #3d3d3d;
}

.subtitle {
  color: #888;
  font-size: 0.95rem;
  font-weight: 300;
  margin: 8px 0 0 0;
}

/* Two-column layout for desktop */
.main-content {
  display: flex;
  gap: 16px;
  align-items: flex-start;
}

.left-column {
  display: flex;
  flex-direction: column;
  gap: 16px;
  width: 280px;
  flex-shrink: 0;
}

.right-column {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
}

.filters {
  display: flex;
  flex-direction: row;
  gap: 24px;
  background: white;
  border-radius: 8px;
  padding: 16px 20px;
}

.filter-group {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.filter-label {
  font-size: 0.75rem;
  color: #888;
  font-weight: 400;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.filter-options {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.filter-option {
  display: flex;
  align-items: center;
  gap: 6px;
}

.summary {
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 12px;
  padding: 16px;
  background: white;
  border-radius: 8px;
}

.summary-stat {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
}

.summary-value {
  font-size: 1.35rem;
  font-weight: 500;
  color: #444;
}

.summary-value.correct {
  color: #4A9D68;
}

.summary-value.incorrect {
  color: #CC5A5A;
}

.summary-label {
  font-size: 0.7rem;
  color: #888;
  font-weight: 400;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.summary-divider {
  width: 1px;
  height: 36px;
  background: #e0dcd8;
}

.chart {
  display: flex;
  flex-direction: column;
  gap: 10px;
  background: white;
  border-radius: 8px;
  padding: 16px 20px;
  width: 100%;
}

.chart-row {
  display: flex;
  align-items: center;
  gap: 12px;
}

.chart-label {
  width: 36px;
  font-size: 0.85rem;
  font-weight: 400;
  color: #444;
  text-align: right;
}

.chart-bar-container {
  flex: 1;
  min-width: 80px;
  height: 22px;
  background: #f0ebe5;
  border-radius: 4px;
  overflow: hidden;
}

.chart-bar {
  height: 100%;
  border-radius: 4px;
  transition: width 0.3s ease, background-color 0.3s ease;
  min-width: 0;
}

.chart-value {
  width: 90px;
  font-size: 0.8rem;
  font-weight: 300;
  color: #666;
  text-align: left;
  white-space: nowrap;
}

.chart-count {
  color: #999;
}

.chart-value .no-data {
  color: #aaa;
}

.empty-state {
  padding: 40px 20px;
  text-align: center;
}

.empty-text {
  font-size: 1.1rem;
  color: #666;
  font-weight: 400;
  margin: 0 0 8px 0;
}

.empty-subtext {
  font-size: 0.9rem;
  color: #999;
  font-weight: 300;
  margin: 0;
}


/* Tablet/smaller desktop - stack but keep wider card */
@media (max-width: 768px) {
  .card {
    max-width: 600px;
  }

  .main-content {
    flex-direction: column;
  }

  .left-column {
    width: 100%;
  }

  .right-column {
    width: 100%;
  }

  .title-desktop {
    display: none;
  }

  .title-mobile {
    display: block;
  }

  .header-spacer {
    display: none;
  }

  .summary {
    gap: 20px;
  }
}

/* Mobile responsive styles */
@media (max-width: 500px) {
  .page {
    padding: 0;
    align-items: flex-start;
    background: #f5f3f0;
  }

  .card {
    border-radius: 0;
    padding: 24px 16px;
    padding-top: calc(24px + env(safe-area-inset-top, 0px));
    min-height: 100dvh;
    min-height: 100dvh;
    box-shadow: none;
  }

  .title {
    font-size: 1.5rem;
  }

  .filters {
    padding: 14px 16px;
  }

  .chart {
    padding: 16px;
  }
}
</style>
