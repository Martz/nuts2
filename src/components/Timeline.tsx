import React, { useRef, useEffect, useCallback, useState } from 'react';
import {
  Track,
  AudioClip,
  TimelineFirework,
  FireworkDefinition,
  ViewportState,
  PlaybackState,
} from '../types';
import { formatTime, msToPixels, pixelsToMs, generateRulerTicks } from '../utils/timeUtils';
import { categoryInfo, fireworkColors } from '../data/fireworksDatabase';

interface TimelineProps {
  tracks: Track[];
  audioClips: AudioClip[];
  fireworks: TimelineFirework[];
  fireworkLibrary: FireworkDefinition[];
  viewport: ViewportState;
  playback: PlaybackState;
  duration: number;
  selectedFireworks: string[];
  selectedAudioClips: string[];
  onSeek: (time: number) => void;
  onScroll: (scrollX: number, scrollY: number) => void;
  onAddFirework: (fireworkId: string, trackId: string, time: number) => void;
  onUpdateFirework: (id: string, updates: Partial<TimelineFirework>) => void;
  onSelectFirework: (id: string, addToSelection: boolean) => void;
  onRemoveFirework: (id: string) => void;
  onUpdateAudioClip: (id: string, updates: Partial<AudioClip>) => void;
  onSelectAudioClip: (id: string, addToSelection: boolean) => void;
  onRemoveAudioClip: (id: string) => void;
  onClearSelection: () => void;
}

export const Timeline: React.FC<TimelineProps> = ({
  tracks,
  audioClips,
  fireworks,
  fireworkLibrary,
  viewport,
  playback,
  duration,
  selectedFireworks,
  selectedAudioClips,
  onSeek,
  onScroll,
  onAddFirework,
  onUpdateFirework,
  onSelectFirework,
  onRemoveFirework,
  onUpdateAudioClip,
  onSelectAudioClip,
  onRemoveAudioClip,
  onClearSelection,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [dragging, setDragging] = useState<{
    type: 'firework' | 'audio' | 'playhead';
    id?: string;
    startX: number;
    startTime: number;
  } | null>(null);

  const timelineWidth = msToPixels(duration, viewport.pixelsPerSecond);
  const playheadPosition = msToPixels(playback.currentTime, viewport.pixelsPerSecond);

  // Handle scroll
  const handleScroll = useCallback(
    (e: React.UIEvent<HTMLDivElement>) => {
      const target = e.target as HTMLDivElement;
      onScroll(target.scrollLeft, target.scrollTop);
    },
    [onScroll]
  );

  // Handle ruler click for seeking
  const handleRulerClick = useCallback(
    (e: React.MouseEvent) => {
      const rect = e.currentTarget.getBoundingClientRect();
      const x = e.clientX - rect.left + viewport.scrollX;
      const time = pixelsToMs(x, viewport.pixelsPerSecond);
      onSeek(Math.max(0, Math.min(duration, time)));
    },
    [viewport, duration, onSeek]
  );

  // Handle drop for fireworks
  const handleDrop = useCallback(
    (e: React.DragEvent, trackId: string) => {
      e.preventDefault();
      const fireworkId = e.dataTransfer.getData('firework-id');
      if (!fireworkId) return;

      const rect = e.currentTarget.getBoundingClientRect();
      const x = e.clientX - rect.left + viewport.scrollX;
      const time = pixelsToMs(x, viewport.pixelsPerSecond);

      onAddFirework(fireworkId, trackId, Math.max(0, time));
    },
    [viewport, onAddFirework]
  );

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy';
  }, []);

  // Mouse handlers for dragging elements
  const handleMouseDown = useCallback(
    (e: React.MouseEvent, type: 'firework' | 'audio' | 'playhead', id?: string, time?: number) => {
      e.stopPropagation();
      setDragging({
        type,
        id,
        startX: e.clientX,
        startTime: time || playback.currentTime,
      });
    },
    [playback.currentTime]
  );

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!dragging) return;

      const deltaX = e.clientX - dragging.startX;
      const deltaTime = pixelsToMs(deltaX, viewport.pixelsPerSecond);
      const newTime = Math.max(0, Math.min(duration, dragging.startTime + deltaTime));

      if (dragging.type === 'playhead') {
        onSeek(newTime);
      } else if (dragging.type === 'firework' && dragging.id) {
        onUpdateFirework(dragging.id, { visualTime: newTime });
      } else if (dragging.type === 'audio' && dragging.id) {
        onUpdateAudioClip(dragging.id, { startTime: newTime });
      }
    };

    const handleMouseUp = () => {
      setDragging(null);
    };

    if (dragging) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
    }

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [dragging, viewport, duration, onSeek, onUpdateFirework, onUpdateAudioClip]);

  // Auto-scroll when playing
  useEffect(() => {
    if (playback.isPlaying && containerRef.current) {
      const container = containerRef.current;
      const containerWidth = container.clientWidth;
      const playheadX = playheadPosition;

      if (playheadX > viewport.scrollX + containerWidth - 100) {
        container.scrollLeft = playheadX - 100;
      } else if (playheadX < viewport.scrollX) {
        container.scrollLeft = playheadX;
      }
    }
  }, [playback.isPlaying, playheadPosition, viewport.scrollX]);

  // Generate ruler ticks
  const ticks = generateRulerTicks(0, duration, viewport.pixelsPerSecond);

  // Calculate total tracks height
  const tracksHeight = tracks.reduce((sum, t) => sum + t.height, 0);

  return (
    <div className="timeline-container">
      {/* Ruler */}
      <div className="timeline-ruler" onClick={handleRulerClick}>
        <div className="ruler-content" style={{ width: timelineWidth }}>
          {ticks.map((tick, i) => (
            <div
              key={i}
              className={`ruler-tick ${tick.isMajor ? 'major' : 'minor'}`}
              style={{ left: msToPixels(tick.time, viewport.pixelsPerSecond) }}
            >
              {tick.isMajor && <span className="tick-label">{formatTime(tick.time)}</span>}
            </div>
          ))}
        </div>
        {/* Playhead in ruler */}
        <div
          className="playhead-marker"
          style={{ left: playheadPosition - viewport.scrollX }}
        />
      </div>

      {/* Tracks area */}
      <div
        ref={containerRef}
        className="timeline-tracks-container"
        onScroll={handleScroll}
        onClick={(e) => {
          if (e.target === e.currentTarget) onClearSelection();
        }}
      >
        <div
          className="timeline-tracks"
          style={{ width: timelineWidth, height: tracksHeight }}
        >
          {/* Track lanes */}
          {tracks.map((track, trackIndex) => {
            const trackTop = tracks.slice(0, trackIndex).reduce((sum, t) => sum + t.height, 0);

            return (
              <div
                key={track.id}
                className={`timeline-track ${track.type} ${track.muted ? 'muted' : ''}`}
                style={{
                  top: trackTop,
                  height: track.height,
                  borderLeftColor: track.color,
                }}
                onDragOver={handleDragOver}
                onDrop={(e) => handleDrop(e, track.id)}
              >
                {/* Audio clips on this track */}
                {track.type === 'audio' &&
                  audioClips
                    .filter((clip) => clip.trackId === track.id)
                    .map((clip) => (
                      <AudioClipElement
                        key={clip.id}
                        clip={clip}
                        viewport={viewport}
                        isSelected={selectedAudioClips.includes(clip.id)}
                        onMouseDown={(e) =>
                          handleMouseDown(e, 'audio', clip.id, clip.startTime)
                        }
                        onSelect={(addToSelection) => onSelectAudioClip(clip.id, addToSelection)}
                        onRemove={() => onRemoveAudioClip(clip.id)}
                      />
                    ))}

                {/* Fireworks on this track */}
                {track.type === 'firework' &&
                  fireworks
                    .filter((fw) => fw.trackId === track.id)
                    .map((fw) => {
                      const def = fireworkLibrary.find((d) => d.id === fw.fireworkId);
                      if (!def) return null;

                      return (
                        <FireworkElement
                          key={fw.id}
                          firework={fw}
                          definition={def}
                          viewport={viewport}
                          isSelected={selectedFireworks.includes(fw.id)}
                          onMouseDown={(e) =>
                            handleMouseDown(e, 'firework', fw.id, fw.visualTime)
                          }
                          onSelect={(addToSelection) => onSelectFirework(fw.id, addToSelection)}
                          onRemove={() => onRemoveFirework(fw.id)}
                        />
                      );
                    })}
              </div>
            );
          })}

          {/* Playhead */}
          <div
            className="playhead"
            style={{ left: playheadPosition }}
            onMouseDown={(e) => handleMouseDown(e, 'playhead')}
          >
            <div className="playhead-head" />
            <div className="playhead-line" style={{ height: tracksHeight }} />
          </div>
        </div>
      </div>
    </div>
  );
};

// Audio clip component
interface AudioClipElementProps {
  clip: AudioClip;
  viewport: ViewportState;
  isSelected: boolean;
  onMouseDown: (e: React.MouseEvent) => void;
  onSelect: (addToSelection: boolean) => void;
  onRemove: () => void;
}

const AudioClipElement: React.FC<AudioClipElementProps> = ({
  clip,
  viewport,
  isSelected,
  onMouseDown,
  onSelect,
  onRemove,
}) => {
  const left = msToPixels(clip.startTime, viewport.pixelsPerSecond);
  const width = msToPixels(clip.duration - clip.trimStart - clip.trimEnd, viewport.pixelsPerSecond);

  return (
    <div
      className={`audio-clip ${isSelected ? 'selected' : ''}`}
      style={{ left, width }}
      onMouseDown={onMouseDown}
      onClick={(e) => {
        e.stopPropagation();
        onSelect(e.shiftKey);
      }}
      onContextMenu={(e) => {
        e.preventDefault();
        onRemove();
      }}
    >
      <div className="clip-header">
        <span className="clip-name">{clip.name}</span>
      </div>
      {clip.waveformData && (
        <div className="waveform">
          {clip.waveformData.map((amp, i) => (
            <div
              key={i}
              className="waveform-bar"
              style={{ height: `${amp * 100}%` }}
            />
          ))}
        </div>
      )}
    </div>
  );
};

// Firework element component
interface FireworkElementProps {
  firework: TimelineFirework;
  definition: FireworkDefinition;
  viewport: ViewportState;
  isSelected: boolean;
  onMouseDown: (e: React.MouseEvent) => void;
  onSelect: (addToSelection: boolean) => void;
  onRemove: () => void;
}

const FireworkElement: React.FC<FireworkElementProps> = ({
  firework,
  definition,
  viewport,
  isSelected,
  onMouseDown,
  onSelect,
  onRemove,
}) => {
  const visualLeft = msToPixels(firework.visualTime, viewport.pixelsPerSecond);
  const fireLeft = msToPixels(firework.fireTime, viewport.pixelsPerSecond);
  const effectWidth = msToPixels(definition.effectDuration, viewport.pixelsPerSecond);
  const preFiringWidth = msToPixels(definition.preFiringOffset, viewport.pixelsPerSecond);

  const catInfo = categoryInfo[definition.category];

  return (
    <div
      className={`firework-event ${isSelected ? 'selected' : ''}`}
      style={{
        left: fireLeft,
        width: preFiringWidth + effectWidth,
      }}
      onMouseDown={onMouseDown}
      onClick={(e) => {
        e.stopPropagation();
        onSelect(e.shiftKey);
      }}
      onContextMenu={(e) => {
        e.preventDefault();
        onRemove();
      }}
    >
      {/* Pre-firing period */}
      <div
        className="pre-firing"
        style={{ width: preFiringWidth }}
        title={`Fire at ${formatTime(firework.fireTime)}`}
      />

      {/* Effect period */}
      <div
        className="effect-period"
        style={{
          left: preFiringWidth,
          width: effectWidth,
          backgroundColor: catInfo?.color || '#666',
        }}
      >
        <div className="effect-colors">
          {definition.colors.slice(0, 3).map((color, i) => (
            <span
              key={i}
              className="color-dot"
              style={{ background: fireworkColors[color] }}
            />
          ))}
        </div>
        <span className="effect-name">{definition.name}</span>
      </div>

      {/* Visual burst marker */}
      <div
        className="visual-marker"
        style={{ left: preFiringWidth }}
        title={`Burst at ${formatTime(firework.visualTime)}`}
      />

      {/* Cue number */}
      {firework.cueNumber && <div className="cue-number">{firework.cueNumber}</div>}
    </div>
  );
};
