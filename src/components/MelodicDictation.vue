<script setup>
import { useRouter } from 'vue-router'

const router = useRouter()
</script>

<template>
  <div class="melodic-dictation">
    <button class="back-btn" @click="router.push('/')">&larr; Back</button>
    <h1>Melodic Dictation</h1>
  </div>
</template>

<style scoped>
.melodic-dictation {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 2rem;
  min-height: 100vh;
  font-family: system-ui, -apple-system, sans-serif;
  position: relative;
}

.back-btn {
  position: absolute;
  top: 1rem;
  left: 1rem;
  padding: 0.5rem 1rem;
  font-size: 1rem;
  border: none;
  background: none;
  color: #666;
  cursor: pointer;
  transition: color 0.2s;
}

.back-btn:hover {
  color: #333;
}

h1 {
  font-size: 2.5rem;
  color: #333;
}
</style>
