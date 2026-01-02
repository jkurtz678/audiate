# Ear Tuner - AI Development Guide

This document provides comprehensive information about the Ear Tuner project for AI agents working on future development.

## Project Overview

Ear Tuner is a web-based ear training application built with Vue 3, featuring two main exercises:
1. **Functional Scale Degrees** - Identify scale degrees after hearing a cadence
2. **Melodic Dictation** - Transcribe melodic sequences note by note

## Technology Stack

- **Framework**: Vue 3 (Composition API) + Vite
- **Router**: Vue Router
- **Audio**: Tone.js with MusyngKite piano samples
- **Music Theory**: Tonal.js for scale calculations and transposition
- **UI Components**: shadcn-vue (Dialog, Button, RadioGroup, Checkbox, Label)
- **Styling**: Tailwind CSS v3 with PostCSS
- **State**: localStorage for settings persistence

## Project Structure

```
src/
├── components/
│   ├── LandingPage.vue           # Home screen with exercise cards
│   ├── EarTrainer.vue            # Functional Scale Degrees exercise
│   ├── SetupModal.vue            # Settings for Functional Scale Degrees
│   ├── MelodicDictation.vue      # Melodic Dictation exercise
│   └── MelodicDictationSetup.vue # Settings for Melodic Dictation
├── composables/
│   └── usePiano.js               # Audio playback and music theory logic
└── router/
    └── index.js                  # Route configuration
```

## Audio System (`usePiano.js`)

### Key Functions

- `startAudioContext()` - Initialize Tone.js and load piano samples
- `playCadenceAndNote(noteIndex, key, mode, octave)` - Play I→V→I cadence + mystery note
- `playCadenceOnly(key, mode)` - Play only the cadence (returns Promise)
- `playNoteOnly(noteIndex, key, mode, octave)` - Play single scale degree
- `playScaleNote(noteIndex, key, mode, octave, duration)` - Play note with custom duration
- `getRandomNoteIndex()` - Random 0-7 (8 notes including high Do/La)
- `getRandomKey()` - Random key from all 12 keys
- `getRandomOctave(octaves)` - Random octave from ['low', 'middle', 'high']
- `getSolfege(mode)` - Returns solfège array for major or minor
- `getScaleNotes(key, mode, octave)` - Returns 8-note scale with correct octave wrapping

### Important Details

**Piano Samples**: MusyngKite soundfont from https://gleitz.github.io/midi-js-soundfonts/
- Uses Tone.Sampler with light limiter (-1dB) to prevent clipping
- Chord velocity: 0.4, Single note velocity: 0.7

**Cadence**: I → V → I with smooth voice leading (triads around middle C)
- Major: Uses major triads
- Minor: Uses minor i with major V (harmonic minor sound)

**Solfège**:
- Major: Do, Re, Mi, Fa, Sol, La, Ti, Do
- Minor: La, Ti, Do, Re, Mi, Fa, Sol, La (La-based minor)

**Scale Generation**: Uses Tonal.js intervals from tonic to handle octave wrapping correctly
- Example: G major middle octave = G4, A4, B4, C5, D5, E5, F#5, G5

**Do/La Equivalence**: Low Do (index 0) and high Do (index 7) are treated as correct for each other

## Functional Scale Degrees

### Features

**Game Flow**:
1. User clicks green "Start" button
2. Audio context starts, random key/octave selected
3. Plays cadence (I→V→I) + mystery note
4. User guesses scale degree with solfège buttons
5. On correct: plays optional walk to root, moves to next question
6. On wrong: button flashes red, user can retry

**Settings** (persist in localStorage):
- **Key Mode**: Fixed key vs Random keys per question
- **Cadence Type**: Major or Minor
- **Octaves**: Low (3), Middle (4), High (5) - can select multiple
- **Walk to Root**: Optional feature that plays scale walk after correct guess

**Walk to Root Logic**:
- Do through Fa (indices 0-3): Walk DOWN to low Do
- Sol through high Do (indices 4-7): Walk UP to high Do
- First note emphasized (doubled duration and delay)
- Each note lights up blue as it plays
- 1200ms pause after walk before next question

**Scoring**: Tracks correct/incorrect, only first guess counts

**UI Elements**:
- Settings gear icon next to title
- Settings summary bar (e.g., "Fixed major | Middle octave")
- Score display (green correct / red incorrect)
- 8 solfège buttons (Do through high Do)
- Replay and Note buttons below solfège buttons
- Back button to return to landing page

## Melodic Dictation

### Features

**Game Flow**:
1. User clicks green "Start" button
2. Plays cadence, then notes play automatically at set speed
3. All notes appear as black quarter notes (♩) upfront
4. As notes play, they light up yellow
5. Blue arrow points at current note to guess
6. User guesses each note, buttons flash green/red
7. Correct guesses turn note green, incorrect turn red
8. Sequence completes, shows score and "Next" button

**Settings** (persist in localStorage):
- **Number of Notes**: Any number 2-100, or Infinite mode
- **Speed**: 0.2x to 3x (non-linear slider, 1x in middle)
  - Left half (0-100): 0.2x to 1x
  - Right half (100-200): 1x to 3x
  - Displays in tenths (e.g., 1.0x, 2.5x)
- **On Incorrect Guess**:
  - Keep guessing: Stay on note until correct
  - Move to next: Advance immediately
- **Key Mode**: Fixed or Random
- **Cadence Type**: Major or Minor
- **Octaves**: Low, Middle, High (can select multiple)

**Important Behaviors**:

**"Keep Guessing" Mode**: If user guesses wrong first, then gets it right, the note stays RED (doesn't count as correct). This is intentional - only first-try correct guesses turn green.

**Yellow Highlighting**: Currently playing note stays yellow until the next note plays (or until sequence ends). This applies to both initial playback and replay.

**Playback Controls**:
- **Replay**: Replays cadence + all notes played so far
- **Pause/Resume**: Only shows when sequence has >10 notes
- **Stop**: Stops playback (can resume with Replay)

**Visual Notes**:
- Quarter note symbols (♩) with absolute-positioned arrow above
- Arrow positioned at `top: -28px` for proper spacing
- Notes show as: black (pending), yellow (playing), green (correct), red (incorrect)
- Auto-scrolls to keep current note visible
- For infinite mode, shows rolling window that extends as needed

**Scoring**: Per-note correct/incorrect count

## Style Guide

### Colors

**Primary Accent**: `#B8956D` (warm tan/gold)
**Primary Accent Hover**: `#A6845E` (darker tan - for buttons)
**Hover Background**: `#F0EBE5` (very light tan - for card/button hover backgrounds)
**Success/Correct**: `#4A9D68` (green)
**Error/Incorrect**: `#CC5A5A` (red)
**Background**: `#e8e4e0` (warm beige)
**Card Background**: `#f5f3f0` (off-white/cream)
**Text**: `#444`, `#3d3d3d` (dark gray)
**Muted Text**: `#666`, `#888`, `#999`, `#aaa`
**Dividers**: `#e0dcd8` (warm light gray)

### Typography

**Font**: System font stack
**Weights**:
- Light (300) for body text
- Normal (400) for buttons
- Medium (500) for headings and scores
**Letter Spacing**:
- `tracking-caps` for uppercase labels (0.1em)
- `tracking-heading` for headings (0.02em)

### Components

**Buttons**:
```css
/* Primary Button */
background: #B8956D;
color: white;
padding: 14px 32px;
border-radius: 8px;
border: none;
hover: #A6845E;

/* Secondary/Borderless Button */
background: white;
color: #444;
border: none;
hover: background #F0EBE5;

/* Stop Button (de-emphasized) */
background: white;
color: #CC5A5A;
border: 1px solid #CC5A5A;
hover: background rgba(204, 90, 90, 0.1);
```

**Solfège Buttons** (borderless design):
```css
background: white;
border: none;
border-radius: 8px;
padding: 18px 24px;
/* No box shadow */
hover: background #F0EBE5;

/* Correct Flash */
background: rgba(74, 157, 104, 0.15);
color: #4A9D68;

/* Wrong Flash */
background: rgba(204, 90, 90, 0.15);
color: #CC5A5A;
```

**Circular Playback Buttons**:
```css
/* Main Playback Orb */
width: 100px;
height: 100px;
border-radius: 50%;
background: #B8956D;
color: white;
border: none;
box-shadow: 0 4px 20px rgba(184, 149, 109, 0.3);
hover: scale(1.05), background #A6845E;

/* Small Note Button */
width: 48px;
height: 48px;
border-radius: 50%;
background: white;
color: #888;
border: none;
box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
hover: background #F0EBE5, color #B8956D;
```

**Dialogs (shadcn-vue)**:
- Use `bg-card` for DialogContent background
- Labels: `text-sm font-normal text-muted-foreground tracking-caps uppercase`
- Radio/Checkbox labels: `font-light cursor-pointer`
- Number inputs: `border-border bg-card text-foreground font-light`

### Layout

**Spacing**:
- Use rem units (0.5rem, 1rem, 1.5rem, 2rem)
- Consistent gaps: 8px, 12px, 16px, 24px, 32px

**Cards**:
```css
background: #f5f3f0;
border-radius: 16px;
padding: 32px;
box-shadow: 0 1px 3px rgba(0, 0, 0, 0.08);
```

**Dividers**:
```css
background: #e0dcd8;
height: 1px;
```

## Key Technical Patterns

### State Management

**Settings Persistence**:
```javascript
const STORAGE_KEY = 'component-name-settings'

onMounted(() => {
  const saved = localStorage.getItem(STORAGE_KEY)
  if (saved) {
    const settings = JSON.parse(saved)
    // Load settings...
  }
})

function saveSettings() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify({
    // settings object
  }))
}
```

**Settings Modal Flow**:
1. Modal doesn't open by default
2. Settings load from localStorage on component mount
3. Clicking "Done" saves to localStorage and closes modal
4. Settings accessible anytime via gear icon

### Audio Playback Patterns

**Starting Audio Context** (required for Tone.js):
```javascript
await startAudioContext()
```

**Playing Notes Sequentially**:
```javascript
let time = Tone.now()
for (const chord of cadence) {
  chord.forEach(note => {
    sampler.triggerAttackRelease(note, duration, time, velocity)
  })
  time += interval
}
```

**Async Playback with Promises**:
```javascript
function playCadenceOnly(key, mode) {
  return new Promise((resolve) => {
    // Play audio...
    const totalDuration = // calculate...
    setTimeout(() => resolve(), totalDuration * 1000)
  })
}
```

### Component Patterns

**Settings Summary Computed**:
```javascript
const settingsSummary = computed(() => {
  const parts = []
  parts.push(keyMode.value === 'fixed' ? 'Fixed' : 'Random')
  parts.push(cadenceType.value)
  // Add octave info...
  return parts.join(' | ')
})
```

**Button Feedback** (flash green/red):
```javascript
function showButtonFeedback(buttonIndex, type) {
  feedbackButtonIndex.value = buttonIndex
  feedbackButtonType.value = type // 'correct' | 'wrong'
  setTimeout(() => {
    feedbackButtonIndex.value = null
    feedbackButtonType.value = null
  }, 300)
}
```

## Common Pitfalls & Solutions

### Audio Issues

**Problem**: Distortion when playing chords
**Solution**: Use low velocity (0.4) for chords, add limiter, avoid over-compressing

**Problem**: Notes in wrong octave
**Solution**: Use Tonal.js intervals with `Note.transpose()` from a tonic with octave number

### Timing Issues

**Problem**: Yellow highlight clears too early on last note
**Solution**: When detecting last note, delay clearing highlight by the note interval duration

**Problem**: Replay doesn't work after stop
**Solution**: Check if `previousPlayedUpTo === 0` and call `startPlayback()` directly

### UI Issues

**Problem**: Arrow pushing note down vertically
**Solution**: Use absolute positioning for arrow: `position: absolute; top: -28px`

**Problem**: Slider label not centered
**Solution**: Use `absolute left-1/2 -translate-x-1/2` for center label

## Development Guidelines

### When Adding Features

1. **Settings**: Always use localStorage persistence with a unique `STORAGE_KEY`
2. **Audio**: Call `startAudioContext()` before any audio playback
3. **Timing**: Use `setTimeout` for delays, not blocking loops
4. **Octaves**: Use key-relative octaves (tonic-based), not fixed octaves
5. **Colors**: Follow the style guide, especially for feedback states

### Testing Checklist

- [ ] Test with both major and minor modes
- [ ] Test with all octave combinations (low, middle, high, all)
- [ ] Test Do/La equivalence (low and high Do should both be correct)
- [ ] Test settings persistence (refresh page, settings should load)
- [ ] Test with different speeds (melodic dictation)
- [ ] Check for audio distortion with headphones

### Code Style

- Use Composition API (`ref`, `computed`, `onMounted`, etc.)
- Prefer `const` over `let`
- Use template refs with `ref()` and access with `.value`
- Use computed properties for derived state
- Keep components focused (single responsibility)
- Comment complex music theory logic

## Future Enhancement Ideas

- Additional exercises (interval identification, chord quality, etc.)
- Progress tracking and statistics
- Custom key selection (not just random)
- Adjustable cadence types (ii-V-I, etc.)
- Export/import settings
- Mobile-optimized UI
- Keyboard shortcuts for solfège buttons
- Visual keyboard display
- Different instrument options beyond piano
