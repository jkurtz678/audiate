import { createRouter, createWebHistory } from 'vue-router'
import LandingPage from '../components/LandingPage.vue'
import EarTrainer from '../components/EarTrainer.vue'
import MelodicDictation from '../components/MelodicDictation.vue'
import MelodicDictationSetupPage from '../components/MelodicDictationSetupPage.vue'
import ScaleDegreesSetup from '../components/ScaleDegreesSetup.vue'
import ScaleDegreesResults from '../components/ScaleDegreesResults.vue'
import ScaleDegreesExercise_Layout1 from '../components/ScaleDegreesExercise_Layout1.vue'
import ScaleDegreesExercise_Layout2 from '../components/ScaleDegreesExercise_Layout2.vue'
import ScaleDegreesExercise_Layout3 from '../components/ScaleDegreesExercise_Layout3.vue'

const routes = [
  {
    path: '/',
    name: 'home',
    component: LandingPage,
  },
  // Old route (kept for backwards compatibility)
  {
    path: '/scale-degrees',
    name: 'scale-degrees',
    component: EarTrainer,
  },
  // New routes for refactored functional scale degrees
  {
    path: '/scale-degrees/setup',
    name: 'scale-degrees-setup',
    component: ScaleDegreesSetup,
  },
  {
    path: '/scale-degrees/exercise-layout1',
    name: 'scale-degrees-exercise-layout1',
    component: ScaleDegreesExercise_Layout1,
  },
  {
    path: '/scale-degrees/exercise-layout2',
    name: 'scale-degrees-exercise-layout2',
    component: ScaleDegreesExercise_Layout2,
  },
  {
    path: '/scale-degrees/exercise-layout3',
    name: 'scale-degrees-exercise-layout3',
    component: ScaleDegreesExercise_Layout3,
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
]

const router = createRouter({
  history: createWebHistory(),
  routes,
})

export default router
