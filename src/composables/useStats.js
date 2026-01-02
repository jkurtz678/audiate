const STORAGE_KEY = 'ear-tuner-stats'

const MAJOR_SOLFEGE = ['Do', 'Re', 'Mi', 'Fa', 'Sol', 'La', 'Ti', 'Do']
const MINOR_SOLFEGE = ['La', 'Ti', 'Do', 'Re', 'Mi', 'Fa', 'Sol', 'La']

function getEmptyStats() {
  return {
    scaleDegrees: {
      major: {},
      minor: {}
    },
    melodicDictation: {
      major: {},
      minor: {}
    }
  }
}

function getStats() {
  const saved = localStorage.getItem(STORAGE_KEY)
  if (saved) {
    try {
      return JSON.parse(saved)
    } catch (e) {
      console.error('Failed to parse stats:', e)
      return getEmptyStats()
    }
  }
  return getEmptyStats()
}

function saveStats(stats) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(stats))
}

/**
 * Record a stat for a guess attempt
 * @param {string} exercise - 'scaleDegrees' or 'melodicDictation'
 * @param {string} mode - 'major' or 'minor'
 * @param {number} noteIndex - 0-7 (the actual note, not the guessed note)
 * @param {boolean} correct - whether the first guess was correct
 * @param {string} octave - 'low', 'middle', or 'high'
 */
function recordStat(exercise, mode, noteIndex, correct, octave) {
  const stats = getStats()

  // Initialize note entry if needed
  if (!stats[exercise][mode][noteIndex]) {
    stats[exercise][mode][noteIndex] = {
      correct: 0,
      incorrect: 0,
      octaves: { low: 0, middle: 0, high: 0 }
    }
  }

  const noteStats = stats[exercise][mode][noteIndex]

  if (correct) {
    noteStats.correct++
  } else {
    noteStats.incorrect++
  }

  // Track octave for future use
  if (octave && noteStats.octaves[octave] !== undefined) {
    noteStats.octaves[octave]++
  }

  saveStats(stats)
}

/**
 * Get stats filtered by exercise and mode
 * @param {string} exercise - 'scaleDegrees', 'melodicDictation', or 'all'
 * @param {string} mode - 'major' or 'minor'
 * @returns {Array} Array of { noteIndex, label, correct, incorrect, total, accuracy }
 */
function getFilteredStats(exercise, mode) {
  const stats = getStats()
  const solfege = mode === 'major' ? MAJOR_SOLFEGE : MINOR_SOLFEGE
  const result = []

  for (let i = 0; i < 8; i++) {
    let correct = 0
    let incorrect = 0

    if (exercise === 'all') {
      // Combine both exercises
      const sd = stats.scaleDegrees[mode][i]
      const md = stats.melodicDictation[mode][i]
      correct = (sd?.correct || 0) + (md?.correct || 0)
      incorrect = (sd?.incorrect || 0) + (md?.incorrect || 0)
    } else {
      const noteStats = stats[exercise][mode][i]
      correct = noteStats?.correct || 0
      incorrect = noteStats?.incorrect || 0
    }

    const total = correct + incorrect
    const accuracy = total > 0 ? Math.round((correct / total) * 100) : 0

    result.push({
      noteIndex: i,
      label: solfege[i],
      correct,
      incorrect,
      total,
      accuracy
    })
  }

  return result
}

/**
 * Get total stats summary
 * @param {string} exercise - 'scaleDegrees', 'melodicDictation', or 'all'
 * @param {string} mode - 'major' or 'minor'
 * @returns {{ correct: number, incorrect: number, total: number, accuracy: number }}
 */
function getTotalStats(exercise, mode) {
  const filtered = getFilteredStats(exercise, mode)
  const correct = filtered.reduce((sum, n) => sum + n.correct, 0)
  const incorrect = filtered.reduce((sum, n) => sum + n.incorrect, 0)
  const total = correct + incorrect
  const accuracy = total > 0 ? Math.round((correct / total) * 100) : 0

  return { correct, incorrect, total, accuracy }
}

export function useStats() {
  return {
    recordStat,
    getStats,
    getFilteredStats,
    getTotalStats
  }
}
