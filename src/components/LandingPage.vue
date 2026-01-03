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
      <h1 class="title">Audiate</h1>
      <p class="subtitle">Hear the music in your mind</p>

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
            <span class="note-icon">♫</span>
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
  min-height: 100dvh;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
  background: #e8e4e0;
}

.card {
  background: linear-gradient(180deg, #f5f3f0 0%, #ebe7e3 100%);
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.06);
  border-radius: 16px;
  padding: 56px 32px;
  width: 100%;
  max-width: 500px;
  text-align: center;
}

.title {
  font-size: 2.75rem;
  font-weight: 300;
  color: #3d3d3d;
  margin: 0 0 4px 0;
}

.subtitle {
  color: #B8956D;
  font-size: 0.9rem;
  font-weight: 400;
  margin: 0 0 44px 0;
}

.options {
  display: flex;
  flex-direction: column;
  gap: 16px;
  max-width: 360px;
  margin: 0 auto;
}

.option {
  background: white;
  border: none;
  border-radius: 16px;
  padding: 24px;
  cursor: pointer;
  transition: all 0.2s ease;
  text-align: left;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
}

.option:hover {
  background: #F0EBE5;
  transform: translateY(-3px);
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.08);
}

.option-content {
  flex: 1;
}

.icon-container {
  width: 48px;
  height: 48px;
  background: #f5f3f0;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.note-icon {
  font-size: 1.25rem;
  color: #B8956D;
  line-height: 1;
}

.chart-icon {
  color: #B8956D;
  display: flex;
  align-items: center;
}

.option h2 {
  margin: 0 0 4px 0;
  font-size: 1.05rem;
  font-weight: 600;
  color: #3d3d3d;
}

.option p {
  color: #888;
  margin: 0;
  font-size: 0.8rem;
  font-weight: 400;
  line-height: 1.5;
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
    padding: 48px 20px;
    padding-top: calc(48px + env(safe-area-inset-top, 0px));
    min-height: 100dvh;
    box-shadow: none;
  }

  .title {
    font-size: 2.25rem;
  }

  .options {
    max-width: 100%;
  }

  .option {
    padding: 20px 16px;
  }
}
</style>
