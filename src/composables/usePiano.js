import { ref } from 'vue'
import * as Tone from 'tone'
import { Note, Scale } from 'tonal'
import { createPiano, getPianoTypeList, getSelectedPianoId, setSelectedPianoId } from './piano/pianoTypes'

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

export function usePiano() {
  const isLoaded = ref(false)
  const isPlaying = ref(false)
  const currentKey = ref(null)
  const currentMode = ref(null)
  const currentPianoId = ref(getSelectedPianoId())

  let piano = null
  let audioContext = null
  let limiter = null
  let playbackTimeoutId = null
  let visibilityListenerAdded = false

  async function initPiano() {
    if (piano) return

    // Create AudioContext and limiter for Salamander piano
    // (MusyngKite manages its own audio chain via Tone.js)
    if (!audioContext) {
      audioContext = new AudioContext()
    }

    // Create a limiter to prevent clipping when multiple notes play together
    if (!limiter) {
      limiter = audioContext.createDynamicsCompressor()
      limiter.threshold.value = -1
      limiter.knee.value = 12
      limiter.ratio.value = 4
      limiter.attack.value = 0.002
      limiter.release.value = 0.4
      limiter.connect(audioContext.destination)
    }

    piano = createPiano({
      audioContext,
      destination: limiter,
    }, currentPianoId.value)

    await piano.load()
    isLoaded.value = true
  }

  // Resume audio context when app returns from background (iOS suspends it)
  function handleVisibilityChange() {
    if (document.visibilityState === 'visible') {
      if (audioContext?.state === 'suspended') {
        audioContext.resume()
      }
      if (Tone.context.state === 'suspended') {
        Tone.context.resume()
      }
    }
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

    // Create AudioContext if needed
    if (!audioContext) {
      audioContext = new AudioContext()
    }

    // Try to resume native AudioContext with timeout
    if (audioContext.state === 'suspended') {
      const resumePromise = audioContext.resume()
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('timeout')), 500)
      )

      try {
        await Promise.race([resumePromise, timeoutPromise])
      } catch (e) {
        // Timeout or error
      }
    }

    // Also start Tone.js context (needed for MusyngKite)
    try {
      await Tone.start()
    } catch (e) {
      // Tone.start may fail if already running or blocked
    }

    // If still suspended, browser blocked autoplay
    if (audioContext.state !== 'running') {
      return false
    }

    // Add visibility listener to resume audio when returning from background (iOS)
    if (!visibilityListenerAdded) {
      document.addEventListener('visibilitychange', handleVisibilityChange)
      visibilityListenerAdded = true
    }

    await initPiano()
    return true
  }

  async function switchPiano(pianoId) {
    if (currentPianoId.value === pianoId) return

    const wasLoaded = isLoaded.value

    // Dispose current piano
    if (piano) {
      piano.dispose()
      piano = null
    }
    isLoaded.value = false

    // Update selection
    currentPianoId.value = pianoId
    setSelectedPianoId(pianoId)

    // Reload if was previously loaded
    if (wasLoaded) {
      await initPiano()
    }
  }

  function getRandomKey() {
    return ALL_KEYS[Math.floor(Math.random() * ALL_KEYS.length)]
  }

  function stopPlayback() {
    if (playbackTimeoutId) {
      clearTimeout(playbackTimeoutId)
      playbackTimeoutId = null
    }
    if (piano) {
      piano.stop()
    }
    isPlaying.value = false
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

    // Stop any currently playing notes
    piano.stop()

    let delay = 0

    // Schedule cadence chords
    for (const chord of cadence) {
      const chordDelay = delay
      setTimeout(() => {
        piano.playChord(chord, chordDuration)
      }, chordDelay * 1000)
      delay += chordGap
    }

    delay += 0.3

    // Schedule mystery note
    const mysteryNote = scaleNotes[noteIndex]
    setTimeout(() => {
      piano.playNote(mysteryNote, 1)
    }, delay * 1000)

    // Account for note duration + some release time
    const totalDuration = delay + 1 + 1
    playbackTimeoutId = setTimeout(() => {
      isPlaying.value = false
      playbackTimeoutId = null
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

      // Stop any currently playing notes
      piano.stop()

      let delay = 0

      for (const chord of cadence) {
        const chordDelay = delay
        setTimeout(() => {
          piano.playChord(chord, chordDuration)
        }, chordDelay * 1000)
        delay += chordGap
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

    // Stop any currently playing notes
    piano.stop()

    const scaleNotes = getScaleNotes(key, mode, octave)
    const note = scaleNotes[noteIndex]

    piano.playNote(note, 1)

    // Account for note duration + release time
    playbackTimeoutId = setTimeout(() => {
      isPlaying.value = false
      playbackTimeoutId = null
    }, 2000) // 1s duration + 1s release
  }

  function playScaleNote(noteIndex, key, mode, octave = 4, duration = 0.4) {
    if (!isLoaded.value) return

    const scaleNotes = getScaleNotes(key, mode, octave)
    const note = scaleNotes[noteIndex]
    piano.playNote(note, duration)
  }

  function getRandomNoteIndex() {
    // 7 unique scale degrees, but 8 indices (0-7)
    // Index 0 and 7 are both tonic (Do in major, La in minor)
    // Give each scale degree equal 1/7 probability
    const degree = Math.floor(Math.random() * 7)

    if (degree === 0) {
      // Tonic - randomly choose low (0) or high (7)
      return Math.random() < 0.5 ? 0 : 7
    }

    return degree
  }

  function getSolfege(mode) {
    return mode === 'major' ? MAJOR_SOLFEGE : MINOR_SOLFEGE
  }

  function formatKeyDisplay(key, mode) {
    const modeName = mode === 'major' ? 'Major' : 'Minor'
    return `${key} ${modeName}`
  }

  return {
    // Existing API (unchanged)
    isLoaded,
    isPlaying,
    currentKey,
    currentMode,
    startAudioContext,
    stopPlayback,
    playCadenceAndNote,
    playCadenceOnly,
    playNoteOnly,
    playScaleNote,
    getRandomNoteIndex,
    getRandomKey,
    getRandomOctave,
    getSolfege,
    formatKeyDisplay,

    // New piano selection API
    currentPianoId,
    switchPiano,
    getPianoTypeList,
  }
}
