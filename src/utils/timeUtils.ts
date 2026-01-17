// Time utility functions

export function formatTime(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  const milliseconds = Math.floor((ms % 1000) / 10);

  return `${minutes.toString().padStart(2, '0')}:${seconds
    .toString()
    .padStart(2, '0')}.${milliseconds.toString().padStart(2, '0')}`;
}

export function formatTimeShort(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;

  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}

export function parseTime(timeStr: string): number {
  const parts = timeStr.split(':');
  if (parts.length === 2) {
    const [minutes, secondsPart] = parts;
    const [seconds, ms] = secondsPart.split('.');
    return (
      parseInt(minutes) * 60000 +
      parseInt(seconds) * 1000 +
      (ms ? parseInt(ms) * 10 : 0)
    );
  }
  return 0;
}

export function msToPixels(ms: number, pixelsPerSecond: number): number {
  return (ms / 1000) * pixelsPerSecond;
}

export function pixelsToMs(pixels: number, pixelsPerSecond: number): number {
  return (pixels / pixelsPerSecond) * 1000;
}

export function snapToGrid(ms: number, gridSize: number): number {
  return Math.round(ms / gridSize) * gridSize;
}

export function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

// Generate tick marks for the timeline ruler
export function generateRulerTicks(
  startMs: number,
  endMs: number,
  pixelsPerSecond: number
): { time: number; isMajor: boolean }[] {
  const ticks: { time: number; isMajor: boolean }[] = [];

  // Determine tick interval based on zoom level
  let minorInterval = 1000; // 1 second
  let majorInterval = 5000; // 5 seconds

  if (pixelsPerSecond < 20) {
    minorInterval = 10000;
    majorInterval = 60000;
  } else if (pixelsPerSecond < 50) {
    minorInterval = 5000;
    majorInterval = 30000;
  } else if (pixelsPerSecond < 100) {
    minorInterval = 1000;
    majorInterval = 10000;
  } else if (pixelsPerSecond > 200) {
    minorInterval = 500;
    majorInterval = 5000;
  }

  const start = Math.floor(startMs / minorInterval) * minorInterval;

  for (let time = start; time <= endMs; time += minorInterval) {
    ticks.push({
      time,
      isMajor: time % majorInterval === 0,
    });
  }

  return ticks;
}
