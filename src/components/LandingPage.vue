<script setup>
import { useRouter } from 'vue-router'

const router = useRouter()

function goToScaleDegrees() {
  router.push('/scale-degrees')
}

function goToMelodicDictation() {
  router.push('/melodic-dictation')
}
</script>

<template>
  <div class="landing-page">
    <h1 class="title">Ear Training</h1>

    <div class="cards">
      <div class="card" @click="goToScaleDegrees">
        <h2>Functional Scale Degrees</h2>
        <p>Identify scale degrees by ear in the context of a key</p>
      </div>

      <div class="card" @click="goToMelodicDictation">
        <h2>Melodic Dictation</h2>
        <p>Transcribe melodies by ear</p>
      </div>
    </div>
  </div>
</template>

<style scoped>
.landing-page {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 2rem;
  min-height: 100vh;
  font-family: system-ui, -apple-system, sans-serif;
}

.title {
  font-size: 2.5rem;
  color: #333;
  margin-bottom: 3rem;
}

.cards {
  display: flex;
  gap: 2rem;
  flex-wrap: wrap;
  justify-content: center;
}

.card {
  background: white;
  border: 2px solid #ddd;
  border-radius: 12px;
  padding: 2rem;
  width: 280px;
  cursor: pointer;
  transition: all 0.2s;
}

.card:hover {
  border-color: #2196F3;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  transform: translateY(-2px);
}

.card h2 {
  color: #333;
  margin: 0 0 1rem 0;
  font-size: 1.3rem;
}

.card p {
  color: #666;
  margin: 0;
  font-size: 0.95rem;
  line-height: 1.4;
}
</style>
