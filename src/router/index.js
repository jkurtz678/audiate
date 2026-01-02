import { createRouter, createWebHistory } from 'vue-router'
import LandingPage from '../components/LandingPage.vue'
import EarTrainer from '../components/EarTrainer.vue'
import MelodicDictation from '../components/MelodicDictation.vue'
import MelodicDictationSetupPage from '../components/MelodicDictationSetupPage.vue'
import MelodicDictationResults from '../components/MelodicDictationResults.vue'
import ScaleDegreesSetup from '../components/ScaleDegreesSetup.vue'
import ScaleDegreesResults from '../components/ScaleDegreesResults.vue'
import ScaleDegreesExercise from '../components/ScaleDegreesExercise.vue'
import StatsPage from '../components/StatsPage.vue'

const routes = [
  {
    path: '/',
    name: 'home',
    component: LandingPage,
  },
  // New routes for refactored functional scale degrees
  {
    path: '/scale-degrees/setup',
    name: 'scale-degrees-setup',
    component: ScaleDegreesSetup,
  },
  {
    path: '/scale-degrees/exercise',
    name: 'scale-degrees-exercise',
    component: ScaleDegreesExercise,
  },
  {
    path: '/scale-degrees/results',
    name: 'scale-degrees-results',
    component: ScaleDegreesResults,
  },
  // Melodic Dictation routes
  {
    path: '/melodic-dictation/setup',
    name: 'melodic-dictation-setup',
    component: MelodicDictationSetupPage,
  },
  {
    path: '/melodic-dictation',
    name: 'melodic-dictation',
    component: MelodicDictation,
  },
  {
    path: '/melodic-dictation/results',
    name: 'melodic-dictation-results',
    component: MelodicDictationResults,
  },
  // Stats
  {
    path: '/stats',
    name: 'stats',
    component: StatsPage,
  },
]

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes,
})

export default router
