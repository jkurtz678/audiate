import { createRouter, createWebHistory } from 'vue-router'
import LandingPage from '../components/LandingPage.vue'
import EarTrainer from '../components/EarTrainer.vue'
import MelodicDictation from '../components/MelodicDictation.vue'

const routes = [
  {
    path: '/',
    name: 'home',
    component: LandingPage,
  },
  {
    path: '/scale-degrees',
    name: 'scale-degrees',
    component: EarTrainer,
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
