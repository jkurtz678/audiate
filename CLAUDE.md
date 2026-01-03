# Audiate - AI Development Guide

A web-based ear training app for identifying scale degrees and transcribing melodies.

## Tech Stack

- **Vue 3** (Composition API) + **Vite**
- **Tone.js** - Audio (MusyngKite piano samples)
- **Tonal.js** - Music theory calculations
- **shadcn-vue** (reka-ui based) - UI components
- **Tailwind CSS v3** - Styling (see `style.css` for CSS variables)
- **localStorage** - Settings & stats persistence

## Project Structure

```
src/
├── components/
│   ├── LandingPage.vue              # Home with exercise cards
│   ├── ScaleDegreesSetup.vue        # Settings page for scale degrees
│   ├── ScaleDegreesExercise.vue     # Scale degrees game
│   ├── ScaleDegreesResults.vue      # Results after completing
│   ├── MelodicDictationSetupPage.vue # Settings page for melodic dictation
│   ├── MelodicDictation.vue         # Melodic dictation game
│   ├── MelodicDictationResults.vue  # Results after completing
│   ├── StatsPage.vue                # Overall statistics view
│   └── ui/                          # shadcn-vue components
├── composables/
│   ├── usePiano.js                  # Audio playback & music theory
│   └── useStats.js                  # Individual attempt tracking
├── router/index.js
├── style.css                        # Tailwind + CSS variables
└── lib/utils.js                     # shadcn utility (cn function)
```

## Routes

| Path | Component | Purpose |
|------|-----------|---------|
| `/` | LandingPage | Home screen |
| `/scale-degrees/setup` | ScaleDegreesSetup | Configure scale degrees |
| `/scale-degrees/exercise` | ScaleDegreesExercise | Play scale degrees |
| `/scale-degrees/results` | ScaleDegreesResults | View results |
| `/melodic-dictation/setup` | MelodicDictationSetupPage | Configure melodic dictation |
| `/melodic-dictation` | MelodicDictation | Play melodic dictation |
| `/melodic-dictation/results` | MelodicDictationResults | View results |
| `/stats` | StatsPage | View all-time statistics |

## Audio System (usePiano.js)

**Key functions:**
- `startAudioContext()` - Must call before any playback (handles iOS Safari)
- `playCadenceAndNote(noteIndex, key, mode, octave)` - I→V→I cadence + mystery note
- `playCadenceOnly(key, mode)` - Just cadence (returns Promise)
- `playNoteOnly(noteIndex, key, mode, octave)` - Single note replay
- `playScaleNote(noteIndex, key, mode, octave, duration)` - Note with custom duration
- `getRandomNoteIndex()` - Returns 0-7 (8 notes including high Do/La)
- `getRandomKey()` - Random from 12 keys
- `getRandomOctave(octaves)` - Random from ['low', 'middle', 'high']
- `getSolfege(mode)` - Returns solfège array for major or minor

**Important music theory:**
- **Cadence**: I → V → I with smooth voice leading. Minor uses harmonic minor (major V).
- **Solfège**: Major = Do Re Mi Fa Sol La Ti Do. Minor = La Ti Do Re Mi Fa Sol La (La-based).
- **Octaves**: low=3, middle=4, high=5 (key-relative, not fixed pitches)
- **Do/La equivalence**: Index 0 (low Do) and 7 (high Do) are both correct for each other

## Stats System (useStats.js)

Records individual attempts with: exercise, mode, noteIndex, octave, correct/incorrect, thinking time.
- `recordStat(exercise, mode, noteIndex, correct, octave, thinkingTime)`
- `getFilteredStats(exercise, mode, options)` - Aggregated by note
- `getTotalStats(exercise, mode, options)` - Summary totals
- `getAttempts(options)` - Raw attempt data

Stats merge high Do/La with low Do/La when aggregating.

## localStorage Keys

- `ear-trainer-settings` - Scale degrees settings
- `melodic-dictation-setup-settings` - Melodic dictation settings
- `ear-tuner-stats` - All attempt statistics

## Design System

Colors defined as CSS variables in `style.css`:
- `--primary`: #B8956D (golden taupe)
- `--success`: #4A9D68 (green for correct)
- `--error`: #CC5A5A (red for incorrect)
- `--highlight`: #D4B896 (for walk/playing states)
- `--background`: warm gray, `--card`: off-white

Typography: Work Sans font, weights 300/400/500.

## Key Patterns

**Settings flow**: Each exercise has a setup page. Settings load from localStorage on mount, save when user starts.

**Audio timing**: Use `setTimeout` with Promise resolution for sequenced playback. Never block the main thread.

**Button feedback**: Flash green/red for 300ms using `feedbackIndex` and `feedbackType` refs.

**Walk to root** (Scale Degrees): After correct guess, plays notes walking to tonic. Indices 0-3 walk down, 4-7 walk up. Each note highlights as it plays.

## Common Gotchas

1. **Audio won't play**: Must call `startAudioContext()` first (user gesture required)
2. **Wrong octave**: Use Tonal.js `Note.transpose()` from a tonic with octave number
3. **Chord distortion**: Use velocity 0.4 for chords, limiter is applied
4. **iOS silent mode**: Uses `navigator.audioSession.type = 'playback'` where available

## Code Style

- Vue Composition API with `<script setup>`
- `ref()` for reactive state, `computed()` for derived state
- Icons from `lucide-vue-next`
- Follow existing component patterns for consistency
