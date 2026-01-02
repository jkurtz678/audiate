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

// Get max total for scaling bars
const maxTotal = computed(() => {
  const max = Math.max(...noteStats.value.map(n => n.total))
  return max > 0 ? max : 1
})

function getBarWidth(note) {
  if (note.total === 0) return 0
  return (note.total / maxTotal.value) * 100
}

function getCorrectWidth(note) {
  if (note.total === 0) return 0
  return (note.correct / note.total) * 100
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
      </div>

      <!-- Title -->
      <div class="title-section">
        <h1 class="title">Statistics</h1>
        <p class="subtitle">Track your progress over time</p>
      </div>

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

      <!-- Bar Chart -->
      <div class="chart">
        <template v-if="hasData">
          <div v-for="note in noteStats" :key="note.noteIndex" class="chart-row">
            <div class="chart-label">{{ note.label }}</div>
            <div class="chart-bar-container">
              <div
                class="chart-bar"
                :style="{ width: getBarWidth(note) + '%' }"
              >
                <div
                  class="chart-bar-correct"
                  :style="{ width: getCorrectWidth(note) + '%' }"
                ></div>
              </div>
            </div>
            <div class="chart-value">
              <span v-if="note.total > 0">
                {{ note.correct }}/{{ note.total }}
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

      <!-- Legend -->
      <div v-if="hasData" class="legend">
        <div class="legend-item">
          <div class="legend-color correct"></div>
          <span>Correct</span>
        </div>
        <div class="legend-item">
          <div class="legend-color incorrect"></div>
          <span>Incorrect</span>
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

.filters {
  display: flex;
  flex-direction: column;
  gap: 16px;
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
  gap: 16px;
  flex-wrap: wrap;
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
  gap: 24px;
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
  font-size: 1.5rem;
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
  font-size: 0.75rem;
  color: #888;
  font-weight: 400;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.summary-divider {
  width: 1px;
  height: 40px;
  background: #e0dcd8;
}

.chart {
  display: flex;
  flex-direction: column;
  gap: 12px;
  background: white;
  border-radius: 8px;
  padding: 20px;
}

.chart-row {
  display: flex;
  align-items: center;
  gap: 12px;
}

.chart-label {
  width: 40px;
  font-size: 0.9rem;
  font-weight: 400;
  color: #444;
  text-align: right;
}

.chart-bar-container {
  flex: 1;
  height: 24px;
  background: #f0ebe5;
  border-radius: 4px;
  overflow: hidden;
}

.chart-bar {
  height: 100%;
  background: #CC5A5A;
  border-radius: 4px;
  transition: width 0.3s ease;
  min-width: 0;
}

.chart-bar-correct {
  height: 100%;
  background: #4A9D68;
  border-radius: 4px 0 0 4px;
}

.chart-value {
  width: 50px;
  font-size: 0.85rem;
  font-weight: 300;
  color: #666;
  text-align: left;
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

.legend {
  display: flex;
  justify-content: center;
  gap: 24px;
}

.legend-item {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 0.85rem;
  color: #666;
  font-weight: 300;
}

.legend-color {
  width: 16px;
  height: 16px;
  border-radius: 4px;
}

.legend-color.correct {
  background: #4A9D68;
}

.legend-color.incorrect {
  background: #CC5A5A;
}
</style>
