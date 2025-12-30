<script setup>
import { ref, onMounted } from 'vue'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Checkbox } from '@/components/ui/checkbox'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'

const STORAGE_KEY = 'ear-trainer-settings'

const props = defineProps({
  open: Boolean,
})

const emit = defineEmits(['start', 'close'])

const keyMode = ref('fixed')
const cadenceType = ref('major')
const octaves = ref({
  low: false,
  middle: true,
  high: false,
})

// Load settings from localStorage on mount
onMounted(() => {
  const saved = localStorage.getItem(STORAGE_KEY)
  if (saved) {
    try {
      const settings = JSON.parse(saved)
      if (settings.keyMode) keyMode.value = settings.keyMode
      if (settings.cadenceType) cadenceType.value = settings.cadenceType
      if (settings.octaves) octaves.value = settings.octaves
    } catch (e) {
      console.warn('Failed to load settings from localStorage')
    }
  }
})

function saveSettings() {
  const settings = {
    keyMode: keyMode.value,
    cadenceType: cadenceType.value,
    octaves: octaves.value,
  }
  localStorage.setItem(STORAGE_KEY, JSON.stringify(settings))
}

function handleStart() {
  // Ensure at least one octave is selected
  const selectedOctaves = Object.entries(octaves.value)
    .filter(([_, selected]) => selected)
    .map(([octave]) => octave)

  if (selectedOctaves.length === 0) {
    selectedOctaves.push('middle')
    octaves.value.middle = true
  }

  // Save to localStorage
  saveSettings()

  emit('start', {
    keyMode: keyMode.value,
    cadenceType: cadenceType.value,
    octaves: selectedOctaves,
  })
}
</script>

<template>
  <Dialog :open="open" @update:open="(val) => !val && emit('close')">
    <DialogContent class="sm:max-w-md" @pointerDownOutside.prevent>
      <DialogHeader class="mb-6">
        <DialogTitle class="text-xl font-semibold">Setup</DialogTitle>
      </DialogHeader>

      <div class="flex flex-col gap-6 mb-6">
        <div class="flex flex-col gap-3">
          <Label class="text-base font-medium">Key Mode</Label>
          <RadioGroup v-model="keyMode" class="flex gap-6">
            <div class="flex items-center gap-2">
              <RadioGroupItem id="fixed" value="fixed" />
              <Label for="fixed" class="font-normal cursor-pointer">Fixed Key</Label>
            </div>
            <div class="flex items-center gap-2">
              <RadioGroupItem id="random" value="random" />
              <Label for="random" class="font-normal cursor-pointer">Random Keys</Label>
            </div>
          </RadioGroup>
        </div>

        <div class="flex flex-col gap-3">
          <Label class="text-base font-medium">Cadence Type</Label>
          <RadioGroup v-model="cadenceType" class="flex gap-6">
            <div class="flex items-center gap-2">
              <RadioGroupItem id="major" value="major" />
              <Label for="major" class="font-normal cursor-pointer">Major</Label>
            </div>
            <div class="flex items-center gap-2">
              <RadioGroupItem id="minor" value="minor" />
              <Label for="minor" class="font-normal cursor-pointer">Minor</Label>
            </div>
          </RadioGroup>
        </div>

        <div class="flex flex-col gap-3">
          <Label class="text-base font-medium">Octaves</Label>
          <div class="flex gap-6">
            <div class="flex items-center gap-2">
              <Checkbox id="low" v-model="octaves.low" />
              <Label for="low" class="font-normal cursor-pointer">Low</Label>
            </div>
            <div class="flex items-center gap-2">
              <Checkbox id="middle" v-model="octaves.middle" />
              <Label for="middle" class="font-normal cursor-pointer">Middle</Label>
            </div>
            <div class="flex items-center gap-2">
              <Checkbox id="high" v-model="octaves.high" />
              <Label for="high" class="font-normal cursor-pointer">High</Label>
            </div>
          </div>
        </div>
      </div>

      <DialogFooter>
        <Button @click="handleStart" class="w-full">Done</Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
</template>
