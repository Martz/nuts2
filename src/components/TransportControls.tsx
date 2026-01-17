import React from 'react';
import { PlaybackState, ViewportState } from '../types';
import { formatTime } from '../utils/timeUtils';

interface TransportControlsProps {
  playback: PlaybackState;
  viewport: ViewportState;
  duration: number;
  showName: string;
  onPlay: () => void;
  onPause: () => void;
  onStop: () => void;
  onSeek: (time: number) => void;
  onZoom: (zoom: number) => void;
  onUpdateShowName: (name: string) => void;
  onUpdateDuration: (duration: number) => void;
  onExport: () => void;
  onImport: (data: string) => void;
  onAddAudio: (file: File, trackId: string) => void;
  audioTrackId?: string;
}

export const TransportControls: React.FC<TransportControlsProps> = ({
  playback,
  viewport,
  duration,
  showName,
  onPlay,
  onPause,
  onStop,
  onSeek,
  onZoom,
  onUpdateShowName,
  onUpdateDuration,
  onExport,
  onImport,
  onAddAudio,
  audioTrackId,
}) => {
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const audioInputRef = React.useRef<HTMLInputElement>(null);

  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const data = event.target?.result as string;
        onImport(data);
      };
      reader.readAsText(file);
    }
  };

  const handleAudioClick = () => {
    audioInputRef.current?.click();
  };

  const handleAudioChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && audioTrackId) {
      onAddAudio(file, audioTrackId);
    }
  };

  const handleDurationChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const minutes = parseInt(e.target.value, 10);
    if (!isNaN(minutes) && minutes > 0) {
      onUpdateDuration(minutes * 60000);
    }
  };

  return (
    <div className="transport-controls">
      <div className="transport-section project">
        <input
          type="text"
          className="show-name-input"
          value={showName}
          onChange={(e) => onUpdateShowName(e.target.value)}
          placeholder="Show Name"
        />

        <div className="duration-control">
          <label>Duration:</label>
          <input
            type="number"
            min="1"
            max="60"
            value={Math.round(duration / 60000)}
            onChange={handleDurationChange}
          />
          <span>min</span>
        </div>
      </div>

      <div className="transport-section playback">
        <button
          className="transport-btn"
          onClick={onStop}
          title="Stop (Home)"
        >
          ⏹
        </button>
        <button
          className="transport-btn primary"
          onClick={playback.isPlaying ? onPause : onPlay}
          title={playback.isPlaying ? 'Pause (Space)' : 'Play (Space)'}
        >
          {playback.isPlaying ? '⏸' : '▶'}
        </button>

        <div className="time-display">
          <span className="current-time">{formatTime(playback.currentTime)}</span>
          <span className="separator">/</span>
          <span className="total-time">{formatTime(duration)}</span>
        </div>

        <input
          type="range"
          className="seek-slider"
          min={0}
          max={duration}
          value={playback.currentTime}
          onChange={(e) => onSeek(Number(e.target.value))}
        />
      </div>

      <div className="transport-section zoom">
        <label>Zoom:</label>
        <input
          type="range"
          min={0.1}
          max={5}
          step={0.1}
          value={viewport.zoom}
          onChange={(e) => onZoom(Number(e.target.value))}
        />
        <span>{Math.round(viewport.pixelsPerSecond)}px/s</span>
      </div>

      <div className="transport-section actions">
        <button className="action-btn" onClick={handleAudioClick} title="Add Audio">
          🎵 Add Audio
        </button>
        <button className="action-btn" onClick={onExport} title="Export Show">
          💾 Save
        </button>
        <button className="action-btn" onClick={handleImportClick} title="Import Show">
          📂 Load
        </button>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept=".fwshow,.json"
        style={{ display: 'none' }}
        onChange={handleFileChange}
      />
      <input
        ref={audioInputRef}
        type="file"
        accept="audio/*"
        style={{ display: 'none' }}
        onChange={handleAudioChange}
      />
    </div>
  );
};
