import { SplendidGrandPiano } from 'smplr'

// Hardcoded settings for Salamander Grand Piano
// These are tuned for a warm, soft sound with proper velocity layers
const CHORD_VELOCITY = 50    // Soft-medium chords
const NOTE_VELOCITY = 70     // Medium single notes
const VOLUME = 40          // Middle ground volume

export class SalamanderPiano {
  static id = 'salamander'
  static displayName = 'Salamander Grand'

  constructor({ audioContext, destination }) {
    this.audioContext = audioContext
    this.destination = destination
    this.piano = null
  }

  async load() {
    this.piano = new SplendidGrandPiano(this.audioContext, {
      volume: VOLUME,
      destination: this.destination,
    })
    await this.piano.load
  }

  playNote(note, duration) {
    this.piano.start({ note, velocity: NOTE_VELOCITY, duration })
  }

  playChord(notes, duration) {
    notes.forEach(note => {
      this.piano.start({ note, velocity: CHORD_VELOCITY, duration })
    })
  }

  stop() {
    if (this.piano) {
      this.piano.stop()
    }
  }

  dispose() {
    if (this.piano) {
      this.piano.stop()
      this.piano = null
    }
  }
}
