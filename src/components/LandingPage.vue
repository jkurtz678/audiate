<script setup>
import { useRouter } from 'vue-router'

const router = useRouter()

function goToScaleDegrees() {
  router.push('/scale-degrees/setup')
}

function goToMelodicDictation() {
  router.push('/melodic-dictation/setup')
}
</script>

<template>
  <div class="page">
    <div class="card">
      <h1 class="title">Ear Training</h1>
      <p class="subtitle">Choose a training mode to get started</p>

      <div class="options">
        <button class="option" @click="goToScaleDegrees">
          <h2>Functional Scale Degrees</h2>
          <p>Identify scale degrees by ear in the context of a key</p>
        </button>

        <button class="option" @click="goToMelodicDictation">
          <h2>Melodic Dictation</h2>
          <p>Transcribe melodies by ear</p>
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
}

.option:hover {
  background: #F0EBE5;
  transform: translateY(-2px);
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
