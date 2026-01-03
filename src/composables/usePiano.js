import { ref } from 'vue'
import * as Tone from 'tone'
import { Note, Scale } from 'tonal'

// All possible root notes
const ALL_KEYS = ['C', 'Db', 'D', 'Eb', 'E', 'F', 'Gb', 'G', 'Ab', 'A', 'Bb', 'B']

// Octave mapping
const OCTAVE_MAP = {
  low: 3,
  middle: 4,
  high: 5,
}

// Solfège labels
const MAJOR_SOLFEGE = ['Do', 'Re', 'Mi', 'Fa', 'Sol', 'La', 'Ti', 'Do']
const MINOR_SOLFEGE = ['La', 'Ti', 'Do', 'Re', 'Mi', 'Fa', 'Sol', 'La'] // La-based minor

// MusyngKite Acoustic Grand Piano samples
const SAMPLE_BASE_URL = 'https://gleitz.github.io/midi-js-soundfonts/MusyngKite/acoustic_grand_piano-mp3/'

export function usePiano() {
  const isLoaded = ref(false)
  const isPlaying = ref(false)
  const currentKey = ref(null)
  const currentMode = ref(null)

  let sampler = null
  let limiter = null
  let gain = null

  async function initPiano() {
    if (sampler) return

    return new Promise((resolve) => {
      // Light limiter just to prevent clipping
      limiter = new Tone.Limiter(-1).toDestination()

      // Gain stage to boost overall volume (+12dB ≈ 4x louder)
      gain = new Tone.Gain(12, 'decibels').connect(limiter)

      sampler = new Tone.Sampler({
        urls: {
          A0: 'A0.mp3',
          C1: 'C1.mp3',
          Eb1: 'Eb1.mp3',
          Gb1: 'Gb1.mp3',
          A1: 'A1.mp3',
          C2: 'C2.mp3',
          Eb2: 'Eb2.mp3',
          Gb2: 'Gb2.mp3',
          A2: 'A2.mp3',
          C3: 'C3.mp3',
          Eb3: 'Eb3.mp3',
          Gb3: 'Gb3.mp3',
          A3: 'A3.mp3',
          C4: 'C4.mp3',
          Eb4: 'Eb4.mp3',
          Gb4: 'Gb4.mp3',
          A4: 'A4.mp3',
          C5: 'C5.mp3',
          Eb5: 'Eb5.mp3',
          Gb5: 'Gb5.mp3',
          A5: 'A5.mp3',
        },
        release: 1,
        baseUrl: SAMPLE_BASE_URL,
        onload: () => {
          isLoaded.value = true
          resolve()
        },
      }).connect(gain)
    })
  }

  async function startAudioContext() {
    // On iOS Safari 16.4+, use the audioSession API to bypass silent mode
    if ('audioSession' in navigator) {
      try {
        navigator.audioSession.type = 'playback'
      } catch (e) {
        // Silently ignore - not critical
      }
    }

    // Try to resume the audio context with a timeout
    // Tone.start() hangs forever if browser blocks autoplay, so we race it
    const startPromise = Tone.start()
    const timeoutPromise = new Promise((_, reject) =>
      setTimeout(() => reject(new Error('timeout')), 500)
    )

    try {
      await Promise.race([startPromise, timeoutPromise])
    } catch (e) {
      // Timeout or error - check state to determine if blocked
    }

    // If still suspended, browser blocked autoplay
    if (Tone.context.state !== 'running') {
      return false
    }

    await initPiano()
    return true
  }

  function getRandomKey() {
    return ALL_KEYS[Math.floor(Math.random() * ALL_KEYS.length)]
  }

  function getScaleNotes(key, mode, octave = 4) {
    const scaleType = mode === 'major' ? 'major' : 'minor'
    const scale = Scale.get(`${key} ${scaleType}`)
    const tonic = `${key}${octave}`

    // Use intervals to transpose from tonic - this handles octave wrapping correctly
    const scaleNotes = scale.intervals.map(interval => {
      return Note.transpose(tonic, interval)
    })

    // Add high tonic (octave above)
    scaleNotes.push(Note.transpose(tonic, '8P'))

    return scaleNotes
  }

  function getRandomOctave(octaves) {
    const octave = octaves[Math.floor(Math.random() * octaves.length)]
    return OCTAVE_MAP[octave]
  }

  function getMajorCadence(key) {
    // I -> V -> I with smooth voice leading
    const root = `${key}4`
    const third = Note.transpose(root, '3M')
    const fifth = Note.transpose(root, '5P')

    // V chord (in first inversion for voice leading)
    const vRoot = Note.transpose(root, '5P')
    const vThird = Note.transpose(vRoot, '3M') // leading tone
    const vThirdLower = Note.transpose(vThird, '-8P') // octave down
    const vFifth = Note.transpose(vRoot, '5P')
    const vFifthLower = Note.transpose(vFifth, '-8P')

    return [
      [root, third, fifth],                           // I
      [vThirdLower, vFifthLower, vRoot],              // V (B3, D4, G4 in C)
      [root, third, fifth],                           // I
    ]
  }

  function getMinorCadence(key) {
    // i -> V -> i (minor i, major V)
    const root = `${key}4`
    const third = Note.transpose(root, '3m') // minor third
    const fifth = Note.transpose(root, '5P')

    // V chord (major, with raised 7th for harmonic minor sound)
    const vRoot = Note.transpose(root, '5P')
    const vThird = Note.transpose(vRoot, '3M') // major third (raised 7th of the scale)
    const vThirdLower = Note.transpose(vThird, '-8P')
    const vFifth = Note.transpose(vRoot, '5P')
    const vFifthLower = Note.transpose(vFifth, '-8P')

    return [
      [root, third, fifth],                           // i
      [vThirdLower, vFifthLower, vRoot],              // V
      [root, third, fifth],                           // i
    ]
  }

  async function playCadenceAndNote(noteIndex, key, mode, octave = 4) {
    if (!isLoaded.value || isPlaying.value) return

    isPlaying.value = true
    currentKey.value = key
    currentMode.value = mode

    const cadence = mode === 'major' ? getMajorCadence(key) : getMinorCadence(key)
    const scaleNotes = getScaleNotes(key, mode, octave)

    const chordDuration = 0.5
    const chordGap = 0.6

    let time = Tone.now()

    for (const chord of cadence) {
      chord.forEach(note => {
        sampler.triggerAttackRelease(note, chordDuration, time, 0.25)
      })
      time += chordGap
    }

    time += 0.3

    const mysteryNote = scaleNotes[noteIndex]
    sampler.triggerAttackRelease(mysteryNote, 1, time, 0.45)

    // Account for release time (1s) in addition to note duration
    const totalDuration = (cadence.length * chordGap) + 0.3 + 1 + 1
    setTimeout(() => {
      isPlaying.value = false
    }, totalDuration * 1000)
  }

  function playCadenceOnly(key, mode) {
    return new Promise((resolve) => {
      if (!isLoaded.value) {
        resolve()
        return
      }

      const cadence = mode === 'major' ? getMajorCadence(key) : getMinorCadence(key)

      const chordDuration = 0.5
      const chordGap = 0.6

      let time = Tone.now()

      for (const chord of cadence) {
        chord.forEach(note => {
          sampler.triggerAttackRelease(note, chordDuration, time, 0.25)
        })
        time += chordGap
      }

      const totalDuration = cadence.length * chordGap
      setTimeout(() => {
        resolve()
      }, totalDuration * 1000)
    })
  }

  function playNoteOnly(noteIndex, key, mode, octave = 4) {
    if (!isLoaded.value || isPlaying.value) return

    isPlaying.value = true
    const scaleNotes = getScaleNotes(key, mode, octave)
    const note = scaleNotes[noteIndex]
    sampler.triggerAttackRelease(note, 1, Tone.now(), 0.45)

    // Account for note duration + release time
    setTimeout(() => {
      isPlaying.value = false
    }, 2000) // 1s duration + 1s release
  }

  function playScaleNote(noteIndex, key, mode, octave = 4, duration = 0.4) {
    if (!isLoaded.value) return

    const scaleNotes = getScaleNotes(key, mode, octave)
    const note = scaleNotes[noteIndex]
    sampler.triggerAttackRelease(note, duration, Tone.now(), 0.45)
  }

  function getRandomNoteIndex() {
    return Math.floor(Math.random() * 8)
  }

  function getSolfege(mode) {
    return mode === 'major' ? MAJOR_SOLFEGE : MINOR_SOLFEGE
  }

  function formatKeyDisplay(key, mode) {
    const modeName = mode === 'major' ? 'Major' : 'Minor'
    return `${key} ${modeName}`
  }

  return {
    isLoaded,
    isPlaying,
    currentKey,
    currentMode,
    startAudioContext,
    playCadenceAndNote,
    playCadenceOnly,
    playNoteOnly,
    playScaleNote,
    getRandomNoteIndex,
    getRandomKey,
    getRandomOctave,
    getSolfege,
    formatKeyDisplay,
  }
}
