// Firework types and categories
export type FireworkCategory =
  | 'aerial_shell'
  | 'roman_candle'
  | 'fountain'
  | 'cake'
  | 'mine'
  | 'comet'
  | 'crossette'
  | 'willow'
  | 'peony'
  | 'chrysanthemum'
  | 'strobe'
  | 'finale';

export type FireworkColor =
  | 'red'
  | 'blue'
  | 'green'
  | 'gold'
  | 'silver'
  | 'purple'
  | 'orange'
  | 'white'
  | 'multicolor';

// Firework definition from datasheet
export interface FireworkDefinition {
  id: string;
  name: string;
  category: FireworkCategory;
  manufacturer: string;

  // Timing parameters (in milliseconds)
  fuseTime: number;           // Time from ignition to launch
  liftTime: number;           // Time from launch to burst
  effectDuration: number;     // Duration of the visual effect

  // Total time from fire signal to end of effect
  totalDuration: number;

  // Visual properties
  colors: FireworkColor[];
  burstDiameter: number;      // In meters at max height
  maxHeight: number;          // In meters

  // Audio cue offset (when to fire relative to desired visual moment)
  // Calculated as: fuseTime + liftTime
  preFiringOffset: number;

  // Description and notes
  description: string;
  safetyNotes?: string;
}

// An instance of a firework placed on the timeline
export interface TimelineFirework {
  id: string;
  fireworkId: string;          // Reference to FireworkDefinition

  // Timing on timeline (in milliseconds)
  visualTime: number;          // When the effect should be VISIBLE (burst time)
  fireTime: number;            // When to actually fire (calculated from preFiringOffset)

  // Position on the show (for multi-position shows)
  position: {
    x: number;                 // -100 to 100 (left to right)
    angle: number;             // Launch angle in degrees
  };

  // Track assignment
  trackId: string;

  // Notes
  cueNumber?: string;
  notes?: string;
}

// Audio clip on the timeline
export interface AudioClip {
  id: string;
  name: string;
  fileName: string;

  // Timing (in milliseconds)
  startTime: number;           // When clip starts on timeline
  duration: number;            // Total duration of the clip
  trimStart: number;           // Trim from beginning
  trimEnd: number;             // Trim from end

  // Audio data
  audioBuffer?: AudioBuffer;
  waveformData?: number[];     // Normalized amplitude data for visualization

  // Playback
  volume: number;              // 0 to 1

  // Track assignment
  trackId: string;
}

// Track in the timeline
export interface Track {
  id: string;
  name: string;
  type: 'audio' | 'firework';
  color: string;
  muted: boolean;
  solo: boolean;
  height: number;              // Track height in pixels
}

// Complete show project
export interface FireworkShow {
  id: string;
  name: string;
  createdAt: Date;
  updatedAt: Date;

  // Timeline settings
  duration: number;            // Total show duration in milliseconds
  bpm?: number;                // Optional BPM for grid snapping

  // Tracks
  tracks: Track[];

  // Content
  audioClips: AudioClip[];
  fireworks: TimelineFirework[];

  // Firework library (show-specific additions)
  customFireworks: FireworkDefinition[];
}

// Playback state
export interface PlaybackState {
  isPlaying: boolean;
  currentTime: number;         // Current playback position in ms
  loopStart?: number;
  loopEnd?: number;
  isLooping: boolean;
}

// Timeline viewport
export interface ViewportState {
  scrollX: number;             // Horizontal scroll in pixels
  scrollY: number;             // Vertical scroll in pixels
  zoom: number;                // Pixels per millisecond
  pixelsPerSecond: number;     // Derived from zoom
}

// Selection state
export interface SelectionState {
  selectedFireworks: string[];
  selectedAudioClips: string[];
  selectedTrack?: string;
}

// Editor mode
export type EditorMode = 'select' | 'draw' | 'erase' | 'trim';

// Application state
export interface AppState {
  show: FireworkShow;
  playback: PlaybackState;
  viewport: ViewportState;
  selection: SelectionState;
  editorMode: EditorMode;
  fireworkLibrary: FireworkDefinition[];
}
