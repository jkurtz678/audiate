const STORAGE_KEY = 'ear-tuner-stats'
const STATS_VERSION = 2

const MAJOR_SOLFEGE = ['Do', 'Re', 'Mi', 'Fa', 'Sol', 'La', 'Ti', 'Do']
const MINOR_SOLFEGE = ['La', 'Ti', 'Do', 'Re', 'Mi', 'Fa', 'Sol', 'La']

function getEmptyStats() {
  return {
    version: STATS_VERSION,
    attempts: []
  }
}

/**
 * Migrate old aggregated stats format to new individual attempts format
 * Old format stored counts per note, new format stores individual attempts
 */
function migrateOldStats(oldStats) {
  const newStats = getEmptyStats()

  // If already new format, return as-is
  if (oldStats.version === STATS_VERSION) {
    return oldStats
  }

  // Migrate from old format (aggregated counts)
  const exercises = ['scaleDegrees', 'melodicDictation']
  const modes = ['major', 'minor']

  for (const exercise of exercises) {
    if (!oldStats[exercise]) continue

    for (const mode of modes) {
      if (!oldStats[exercise][mode]) continue

      for (const noteIndex in oldStats[exercise][mode]) {
        const noteStats = oldStats[exercise][mode][noteIndex]
        const correct = noteStats.correct || 0
        const incorrect = noteStats.incorrect || 0

        // Determine octave distribution if available
        const octaveDistribution = noteStats.octaves || { low: 0, middle: 0, high: 0 }
        const totalOctaves = octaveDistribution.low + octaveDistribution.middle + octaveDistribution.high

        // Create synthetic attempts for correct guesses
        for (let i = 0; i < correct; i++) {
          const octave = getDistributedOctave(octaveDistribution, totalOctaves, i)
          newStats.attempts.push({
            timestamp: null, // Unknown for migrated data
            exercise,
            mode,
            noteIndex: parseInt(noteIndex),
            octave,
            correct: true,
            thinkingTime: null // Unknown for migrated data
          })
        }

        // Create synthetic attempts for incorrect guesses
        for (let i = 0; i < incorrect; i++) {
          const octave = getDistributedOctave(octaveDistribution, totalOctaves, correct + i)
          newStats.attempts.push({
            timestamp: null, // Unknown for migrated data
            exercise,
            mode,
            noteIndex: parseInt(noteIndex),
            octave,
            correct: false,
            thinkingTime: null // Unknown for migrated data
          })
        }
      }
    }
  }

  return newStats
}

/**
 * Helper to distribute octaves proportionally when migrating
 */
function getDistributedOctave(distribution, total, index) {
  if (total === 0) return 'middle'

  const lowThreshold = distribution.low
  const middleThreshold = lowThreshold + distribution.middle

  const position = index % total
  if (position < lowThreshold) return 'low'
  if (position < middleThreshold) return 'middle'
  return 'high'
}

function getStats() {
  const saved = localStorage.getItem(STORAGE_KEY)
  if (saved) {
    try {
      const parsed = JSON.parse(saved)

      // Check if migration is needed
      if (!parsed.version || parsed.version < STATS_VERSION) {
        const migrated = migrateOldStats(parsed)
        saveStats(migrated)
        return migrated
      }

      return parsed
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
 * @param {number|null} thinkingTime - milliseconds from note heard to guess made (optional)
 * @param {string|null} key - the key of the question (e.g., 'C', 'F#') (optional)
 * @param {number|null} firstWrongAnswer - noteIndex of first wrong guess, only when correct is false (optional)
 */
function recordStat(exercise, mode, noteIndex, correct, octave, thinkingTime = null, key = null, firstWrongAnswer = null) {
  const stats = getStats()

  stats.attempts.push({
    timestamp: Date.now(),
    exercise,
    mode,
    noteIndex,
    octave,
    correct,
    thinkingTime,
    key,
    firstWrongAnswer: correct ? null : firstWrongAnswer
  })

  saveStats(stats)
}

/**
 * Get stats filtered by exercise, mode, and optional time range
 * @param {string} exercise - 'scaleDegrees', 'melodicDictation', or 'all'
 * @param {string} mode - 'major' or 'minor'
 * @param {object} options - Optional filters
 * @param {number} options.startTime - Filter attempts after this timestamp
 * @param {number} options.endTime - Filter attempts before this timestamp
 * @returns {Array} Array of { noteIndex, label, correct, incorrect, total, accuracy, avgThinkingTime }
 */
function getFilteredStats(exercise, mode, options = {}) {
  const stats = getStats()
  const solfege = mode === 'major' ? MAJOR_SOLFEGE : MINOR_SOLFEGE
  const { startTime, endTime } = options

  // Filter attempts by exercise, mode, and time range
  const filtered = stats.attempts.filter(attempt => {
    if (exercise !== 'all' && attempt.exercise !== exercise) return false
    if (attempt.mode !== mode) return false
    if (startTime && attempt.timestamp && attempt.timestamp < startTime) return false
    if (endTime && attempt.timestamp && attempt.timestamp > endTime) return false
    return true
  })

  // Aggregate by note index (merge high Do/La with low Do/La)
  const result = []
  for (let i = 0; i < 7; i++) {
    // For index 0 (low Do/La), also include index 7 (high Do/La)
    const noteAttempts = i === 0
      ? filtered.filter(a => a.noteIndex === 0 || a.noteIndex === 7)
      : filtered.filter(a => a.noteIndex === i)
    const correct = noteAttempts.filter(a => a.correct).length
    const incorrect = noteAttempts.filter(a => !a.correct).length
    const total = correct + incorrect
    const accuracy = total > 0 ? Math.round((correct / total) * 100) : 0

    // Calculate average thinking time (only from attempts with valid thinking time)
    const validThinkingTimes = noteAttempts
      .filter(a => a.thinkingTime !== null && a.thinkingTime !== undefined)
      .map(a => a.thinkingTime)
    const avgThinkingTime = validThinkingTimes.length > 0
      ? Math.round(validThinkingTimes.reduce((sum, t) => sum + t, 0) / validThinkingTimes.length)
      : null

    result.push({
      noteIndex: i,
      label: solfege[i],
      correct,
      incorrect,
      total,
      accuracy,
      avgThinkingTime
    })
  }

  return result
}

/**
 * Get total stats summary
 * @param {string} exercise - 'scaleDegrees', 'melodicDictation', or 'all'
 * @param {string} mode - 'major' or 'minor'
 * @param {object} options - Optional filters (same as getFilteredStats)
 * @returns {{ correct: number, incorrect: number, total: number, accuracy: number, avgThinkingTime: number|null }}
 */
function getTotalStats(exercise, mode, options = {}) {
  const filtered = getFilteredStats(exercise, mode, options)
  const correct = filtered.reduce((sum, n) => sum + n.correct, 0)
  const incorrect = filtered.reduce((sum, n) => sum + n.incorrect, 0)
  const total = correct + incorrect
  const accuracy = total > 0 ? Math.round((correct / total) * 100) : 0

  // Calculate overall average thinking time
  const stats = getStats()
  const { startTime, endTime } = options

  const attempts = stats.attempts.filter(attempt => {
    if (exercise !== 'all' && attempt.exercise !== exercise) return false
    if (attempt.mode !== mode) return false
    if (startTime && attempt.timestamp && attempt.timestamp < startTime) return false
    if (endTime && attempt.timestamp && attempt.timestamp > endTime) return false
    return true
  })

  const validThinkingTimes = attempts
    .filter(a => a.thinkingTime !== null && a.thinkingTime !== undefined)
    .map(a => a.thinkingTime)
  const avgThinkingTime = validThinkingTimes.length > 0
    ? Math.round(validThinkingTimes.reduce((sum, t) => sum + t, 0) / validThinkingTimes.length)
    : null

  return { correct, incorrect, total, accuracy, avgThinkingTime }
}

/**
 * Get all raw attempts for advanced analysis
 * @param {object} options - Optional filters
 * @param {string} options.exercise - 'scaleDegrees', 'melodicDictation', or 'all'
 * @param {string} options.mode - 'major', 'minor', or 'all'
 * @param {number} options.startTime - Filter attempts after this timestamp
 * @param {number} options.endTime - Filter attempts before this timestamp
 * @returns {Array} Array of attempt objects
 */
function getAttempts(options = {}) {
  const stats = getStats()
  const { exercise = 'all', mode = 'all', startTime, endTime } = options

  return stats.attempts.filter(attempt => {
    if (exercise !== 'all' && attempt.exercise !== exercise) return false
    if (mode !== 'all' && attempt.mode !== mode) return false
    if (startTime && attempt.timestamp && attempt.timestamp < startTime) return false
    if (endTime && attempt.timestamp && attempt.timestamp > endTime) return false
    return true
  })
}

export function useStats() {
  return {
    recordStat,
    getStats,
    getFilteredStats,
    getTotalStats,
    getAttempts
  }
}
