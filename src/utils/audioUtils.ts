// Audio utility functions

let audioContext: AudioContext | null = null;

export function getAudioContext(): AudioContext {
  if (!audioContext) {
    audioContext = new AudioContext();
  }
  return audioContext;
}

export async function loadAudioFile(file: File): Promise<AudioBuffer> {
  const ctx = getAudioContext();
  const arrayBuffer = await file.arrayBuffer();
  return ctx.decodeAudioData(arrayBuffer);
}

export function generateWaveformData(
  audioBuffer: AudioBuffer,
  samples: number = 1000
): number[] {
  const channelData = audioBuffer.getChannelData(0);
  const blockSize = Math.floor(channelData.length / samples);
  const waveform: number[] = [];

  for (let i = 0; i < samples; i++) {
    const start = i * blockSize;
    let sum = 0;

    for (let j = 0; j < blockSize; j++) {
      sum += Math.abs(channelData[start + j] || 0);
    }

    waveform.push(sum / blockSize);
  }

  // Normalize
  const max = Math.max(...waveform);
  return waveform.map((v) => v / max);
}

export function generateDetailedWaveform(
  audioBuffer: AudioBuffer,
  startTime: number,
  endTime: number,
  samples: number
): number[] {
  const channelData = audioBuffer.getChannelData(0);
  const sampleRate = audioBuffer.sampleRate;

  const startSample = Math.floor(startTime * sampleRate);
  const endSample = Math.floor(endTime * sampleRate);
  const totalSamples = endSample - startSample;
  const blockSize = Math.max(1, Math.floor(totalSamples / samples));

  const waveform: number[] = [];

  for (let i = 0; i < samples; i++) {
    const start = startSample + i * blockSize;
    let min = 0;
    let max = 0;

    for (let j = 0; j < blockSize; j++) {
      const sample = channelData[start + j] || 0;
      if (sample < min) min = sample;
      if (sample > max) max = sample;
    }

    // Store the peak-to-peak amplitude
    waveform.push(Math.max(Math.abs(min), Math.abs(max)));
  }

  return waveform;
}

// Audio playback controller
export class AudioPlayer {
  private ctx: AudioContext;
  private sources: Map<string, AudioBufferSourceNode> = new Map();
  private gainNodes: Map<string, GainNode> = new Map();
  private startTime: number = 0;
  private pauseTime: number = 0;
  private isPlaying: boolean = false;

  constructor() {
    this.ctx = getAudioContext();
  }

  scheduleClip(
    id: string,
    buffer: AudioBuffer,
    startTimeMs: number,
    volume: number = 1,
    trimStartMs: number = 0
  ): void {
    const source = this.ctx.createBufferSource();
    const gainNode = this.ctx.createGain();

    source.buffer = buffer;
    source.connect(gainNode);
    gainNode.connect(this.ctx.destination);
    gainNode.gain.value = volume;

    this.sources.set(id, source);
    this.gainNodes.set(id, gainNode);
  }

  play(
    clips: Array<{
      id: string;
      buffer: AudioBuffer;
      startTimeMs: number;
      volume: number;
      trimStartMs: number;
      trimEndMs: number;
    }>,
    currentTimeMs: number
  ): void {
    this.stop();
    this.isPlaying = true;
    this.startTime = this.ctx.currentTime - currentTimeMs / 1000;

    clips.forEach((clip) => {
      const source = this.ctx.createBufferSource();
      const gainNode = this.ctx.createGain();

      source.buffer = clip.buffer;
      source.connect(gainNode);
      gainNode.connect(this.ctx.destination);
      gainNode.gain.value = clip.volume;

      const clipStartTime = clip.startTimeMs / 1000;
      const trimStart = clip.trimStartMs / 1000;
      const duration =
        clip.buffer.duration - trimStart - clip.trimEndMs / 1000;

      // Calculate when to start playing this clip
      const playbackOffset = currentTimeMs / 1000 - clipStartTime;

      if (playbackOffset >= 0 && playbackOffset < duration) {
        // Current time is within this clip
        source.start(0, trimStart + playbackOffset, duration - playbackOffset);
      } else if (playbackOffset < 0) {
        // Clip starts in the future
        source.start(
          this.ctx.currentTime - playbackOffset,
          trimStart,
          duration
        );
      }

      this.sources.set(clip.id, source);
      this.gainNodes.set(clip.id, gainNode);
    });
  }

  stop(): void {
    this.sources.forEach((source) => {
      try {
        source.stop();
      } catch {
        // Source may not have started yet
      }
    });
    this.sources.clear();
    this.gainNodes.clear();
    this.isPlaying = false;
  }

  getCurrentTime(): number {
    if (!this.isPlaying) return this.pauseTime;
    return (this.ctx.currentTime - this.startTime) * 1000;
  }

  setVolume(id: string, volume: number): void {
    const gainNode = this.gainNodes.get(id);
    if (gainNode) {
      gainNode.gain.value = volume;
    }
  }

  getIsPlaying(): boolean {
    return this.isPlaying;
  }
}

// Singleton audio player instance
let audioPlayer: AudioPlayer | null = null;

export function getAudioPlayer(): AudioPlayer {
  if (!audioPlayer) {
    audioPlayer = new AudioPlayer();
  }
  return audioPlayer;
}
