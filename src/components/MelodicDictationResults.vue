<script setup>
import { computed, ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'

const router = useRouter()

// Get data from router state
const correctCount = ref(0)
const incorrectCount = ref(0)
const totalQuestions = ref(10)

onMounted(() => {
  const state = history.state
  if (state && state.correctCount !== undefined) {
    correctCount.value = state.correctCount
    incorrectCount.value = state.incorrectCount
    totalQuestions.value = state.totalQuestions
  }
})

const totalAnswered = computed(() => correctCount.value + incorrectCount.value)
const percentage = computed(() => {
  if (totalAnswered.value === 0) return 0
  return Math.round((correctCount.value / totalAnswered.value) * 100)
})

const getMessage = computed(() => {
  const pct = percentage.value
  if (pct === 100) return 'Perfect!'
  if (pct >= 90) return 'Excellent!'
  if (pct >= 75) return 'Great job!'
  if (pct >= 60) return 'Good work!'
  return 'Keep practicing!'
})

function handleRestart() {
  router.push({ name: 'melodic-dictation-setup' })
}

function handleHome() {
  router.push('/')
}
</script>

<template>
  <div class="page">
    <div class="card">
      <!-- Title -->
      <div class="title-section">
        <h1 class="title">Session Complete</h1>
        <p class="subtitle">{{ getMessage }}</p>
      </div>

      <!-- Score Display -->
      <div class="score-section">
        <div class="percentage">{{ percentage }}%</div>
        <div class="score-breakdown">
          <div class="score-item correct">
            <span class="score-label">Correct</span>
            <span class="score-value">{{ correctCount }}</span>
          </div>
          <div class="score-divider">/</div>
          <div class="score-item incorrect">
            <span class="score-label">Incorrect</span>
            <span class="score-value">{{ incorrectCount }}</span>
          </div>
        </div>
      </div>

      <!-- Actions -->
      <div class="actions">
        <button class="primary-btn" @click="handleRestart">
          Practice Again
        </button>
        <button class="secondary-btn" @click="handleHome">
          Back to Home
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
  background: linear-gradient(180deg, #f5f3f0 0%, #ebe7e3 100%);
  border-radius: 16px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.08);
  padding: 48px 32px;
  width: 100%;
  max-width: 500px;
  display: flex;
  flex-direction: column;
  gap: 40px;
  text-align: center;
}

.title-section {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.title {
  font-size: 1.75rem;
  margin: 0;
  font-weight: 500;
}

.subtitle {
  color: #B8956D;
  font-size: 1.1rem;
  font-weight: 400;
  margin: 0;
}

.score-section {
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.percentage {
  font-size: 4rem;
  font-weight: 500;
  color: #444;
  line-height: 1;
}

.score-breakdown {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 16px;
  font-size: 1.1rem;
}

.score-item {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.score-label {
  font-size: 0.85rem;
  font-weight: 300;
  text-transform: uppercase;
  letter-spacing: 0.1em;
  color: #888;
}

.score-item.correct .score-value {
  color: #4A9D68;
  font-weight: 500;
  font-size: 1.5rem;
}

.score-item.incorrect .score-value {
  color: #CC5A5A;
  font-weight: 500;
  font-size: 1.5rem;
}

.score-divider {
  color: #ccc;
  font-size: 1.5rem;
  margin: 0 8px;
}

.actions {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.primary-btn {
  background: #B8956D;
  color: white;
  padding: 14px 32px;
  font-size: 1.1rem;
  font-weight: 400;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s;
  letter-spacing: 0.02em;
}

.primary-btn:hover {
  background: #A6845E;
}

.secondary-btn {
  background: white;
  color: #444;
  padding: 14px 32px;
  font-size: 1rem;
  font-weight: 400;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s;
}

.secondary-btn:hover {
  background: #F0EBE5;
}

/* Mobile responsive styles */
@media (max-width: 500px) {
  .page {
    padding: 0;
    align-items: flex-start;
  }

  .card {
    border-radius: 0;
    padding: 48px 16px;
    min-height: 100vh;
    box-shadow: none;
  }

  .title {
    font-size: 1.5rem;
  }
}
</style>
