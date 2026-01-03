import * as Tone from 'tone'

// Hardcoded settings for MusyngKite Piano
// Note: MusyngKite samples are single-velocity, so velocity only affects volume
const CHORD_VELOCITY = 0.25   // Tone.js uses 0-1 range
const NOTE_VELOCITY = 0.45
const GAIN_DB = 2            // Reduced boost to match Salamander levels

// MusyngKite sample URLs (CDN hosted)
const SAMPLE_BASE_URL = 'https://gleitz.github.io/midi-js-soundfonts/MusyngKite/acoustic_grand_piano-mp3/'

export class MusyngKitePiano {
  static id = 'musyng'
  static displayName = 'MusyngKite'

  constructor({ audioContext, destination }) {
    // Note: We don't use the passed audioContext/destination
    // Tone.js manages its own audio context
    this.sampler = null
    this.limiter = null
    this.gain = null
  }

  async load() {
    // Set up Tone.js audio chain: Sampler -> Gain -> Limiter -> Destination
    this.limiter = new Tone.Limiter(-1).toDestination()
    this.gain = new Tone.Gain(GAIN_DB, 'decibels').connect(this.limiter)

    this.sampler = new Tone.Sampler({
      urls: {
        A0: 'A0.mp3',
        C1: 'C1.mp3',
        'Eb1': 'Eb1.mp3',
        'Gb1': 'Gb1.mp3',
        A1: 'A1.mp3',
        C2: 'C2.mp3',
        'Eb2': 'Eb2.mp3',
        'Gb2': 'Gb2.mp3',
        A2: 'A2.mp3',
        C3: 'C3.mp3',
        'Eb3': 'Eb3.mp3',
        'Gb3': 'Gb3.mp3',
        A3: 'A3.mp3',
        C4: 'C4.mp3',
        'Eb4': 'Eb4.mp3',
        'Gb4': 'Gb4.mp3',
        A4: 'A4.mp3',
        C5: 'C5.mp3',
        'Eb5': 'Eb5.mp3',
        'Gb5': 'Gb5.mp3',
        A5: 'A5.mp3',
      },
      release: 1,
      baseUrl: SAMPLE_BASE_URL,
    }).connect(this.gain)

    // Wait for samples to load
    await Tone.loaded()
  }

  playNote(note, duration) {
    this.sampler.triggerAttackRelease(note, duration, Tone.now(), NOTE_VELOCITY)
  }

  playChord(notes, duration) {
    const now = Tone.now()
    notes.forEach(note => {
      this.sampler.triggerAttackRelease(note, duration, now, CHORD_VELOCITY)
    })
  }

  stop() {
    if (this.sampler) {
      this.sampler.releaseAll()
    }
  }

  dispose() {
    if (this.sampler) {
      this.sampler.releaseAll()
      this.sampler.dispose()
      this.sampler = null
    }
    if (this.gain) {
      this.gain.dispose()
      this.gain = null
    }
    if (this.limiter) {
      this.limiter.dispose()
      this.limiter = null
    }
  }
}
