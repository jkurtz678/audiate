<script setup>
import { useRouter } from 'vue-router'

const router = useRouter()

function goToScaleDegrees() {
  router.push('/scale-degrees/setup')
}

function goToMelodicDictation() {
  router.push('/melodic-dictation/setup')
}

function goToStats() {
  router.push('/stats')
}
</script>

<template>
  <div class="page">
    <div class="card">
      <h1 class="title">Eario (?)</h1>
      <p class="subtitle">Choose a training mode to get started</p>

      <div class="options">
        <button class="option" @click="goToScaleDegrees">
          <div class="option-content">
            <h2>Scale Degrees</h2>
            <p>Identify scale degrees by ear</p>
          </div>
          <div class="icon-container">
            <span class="note-icon">♩</span>
          </div>
        </button>

        <button class="option" @click="goToMelodicDictation">
          <div class="option-content">
            <h2>Melodic Dictation</h2>
            <p>Transcribe melodies by ear</p>
          </div>
          <div class="icon-container">
            <span class="note-icon">♩</span>
            <span class="note-icon">♩</span>
            <span class="note-icon">♩</span>
          </div>
        </button>

        <button class="option" @click="goToStats">
          <div class="option-content">
            <h2>Statistics</h2>
            <p>View your progress and accuracy</p>
          </div>
          <div class="icon-container">
            <span class="chart-icon">
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <line x1="18" y1="20" x2="18" y2="10"></line>
                <line x1="12" y1="20" x2="12" y2="4"></line>
                <line x1="6" y1="20" x2="6" y2="14"></line>
              </svg>
            </span>
          </div>
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
  padding: 48px;
  width: 100%;
  max-width: 500px;
  text-align: center;
}

.title {
  font-size: 2rem;
  font-weight: 500;
  margin: 0 0 8px 0;
}

.subtitle {
  color: #888;
  font-size: 1rem;
  font-weight: 300;
  margin: 0 0 32px 0;
}

.options {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.option {
  background: white;
  border: none;
  border-radius: 8px;
  padding: 24px;
  cursor: pointer;
  transition: all 0.2s;
  text-align: left;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
}

.option:hover {
  background: #F0EBE5;
  transform: translateY(-2px);
}

.option-content {
  flex: 1;
}

.icon-container {
  display: flex;
  gap: 4px;
  flex-shrink: 0;
}

.note-icon {
  font-size: 1.5rem;
  color: #B8956D;
  line-height: 1;
}

.chart-icon {
  color: #B8956D;
  display: flex;
  align-items: center;
}

.option h2 {
  margin: 0 0 8px 0;
  font-size: 1.1rem;
  font-weight: 500;
  color: #3d3d3d;
}

.option p {
  color: #888;
  margin: 0;
  font-size: 0.9rem;
  font-weight: 300;
  line-height: 1.5;
}
</style>
