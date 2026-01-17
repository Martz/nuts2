import React, { useState } from 'react';
import { Track } from '../types';

interface TrackListProps {
  tracks: Track[];
  selectedTrack?: string;
  onUpdateTrack: (trackId: string, updates: Partial<Track>) => void;
  onRemoveTrack: (trackId: string) => void;
  onAddTrack: (type: 'audio' | 'firework', name: string) => void;
  onSelectTrack: (trackId: string) => void;
}

export const TrackList: React.FC<TrackListProps> = ({
  tracks,
  selectedTrack,
  onUpdateTrack,
  onRemoveTrack,
  onAddTrack,
  onSelectTrack,
}) => {
  const [showAddMenu, setShowAddMenu] = useState(false);

  return (
    <div className="track-list">
      <div className="track-list-header">
        <span>Tracks</span>
        <div className="add-track-container">
          <button
            className="btn-icon"
            onClick={() => setShowAddMenu(!showAddMenu)}
            title="Add Track"
          >
            +
          </button>
          {showAddMenu && (
            <div className="add-track-menu">
              <button
                onClick={() => {
                  onAddTrack('audio', `Audio Track ${tracks.filter((t) => t.type === 'audio').length + 1}`);
                  setShowAddMenu(false);
                }}
              >
                Audio Track
              </button>
              <button
                onClick={() => {
                  onAddTrack('firework', `Firework Track ${tracks.filter((t) => t.type === 'firework').length + 1}`);
                  setShowAddMenu(false);
                }}
              >
                Firework Track
              </button>
            </div>
          )}
        </div>
      </div>

      <div className="track-items">
        {tracks.map((track) => (
          <TrackItem
            key={track.id}
            track={track}
            isSelected={track.id === selectedTrack}
            onUpdate={(updates) => onUpdateTrack(track.id, updates)}
            onRemove={() => onRemoveTrack(track.id)}
            onSelect={() => onSelectTrack(track.id)}
          />
        ))}
      </div>
    </div>
  );
};

interface TrackItemProps {
  track: Track;
  isSelected: boolean;
  onUpdate: (updates: Partial<Track>) => void;
  onRemove: () => void;
  onSelect: () => void;
}

const TrackItem: React.FC<TrackItemProps> = ({
  track,
  isSelected,
  onUpdate,
  onRemove,
  onSelect,
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState(track.name);

  const handleNameSubmit = () => {
    if (editName.trim()) {
      onUpdate({ name: editName.trim() });
    }
    setIsEditing(false);
  };

  return (
    <div
      className={`track-item ${isSelected ? 'selected' : ''} ${track.muted ? 'muted' : ''}`}
      style={{
        height: track.height,
        borderLeftColor: track.color,
      }}
      onClick={onSelect}
    >
      <div className="track-info">
        <div
          className="track-color"
          style={{ backgroundColor: track.color }}
        />
        {isEditing ? (
          <input
            type="text"
            value={editName}
            onChange={(e) => setEditName(e.target.value)}
            onBlur={handleNameSubmit}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleNameSubmit();
              if (e.key === 'Escape') setIsEditing(false);
            }}
            autoFocus
            onClick={(e) => e.stopPropagation()}
          />
        ) : (
          <span
            className="track-name"
            onDoubleClick={(e) => {
              e.stopPropagation();
              setIsEditing(true);
            }}
          >
            {track.name}
          </span>
        )}
      </div>

      <div className="track-controls">
        <button
          className={`btn-track ${track.muted ? 'active' : ''}`}
          onClick={(e) => {
            e.stopPropagation();
            onUpdate({ muted: !track.muted });
          }}
          title={track.muted ? 'Unmute' : 'Mute'}
        >
          M
        </button>
        <button
          className={`btn-track ${track.solo ? 'active' : ''}`}
          onClick={(e) => {
            e.stopPropagation();
            onUpdate({ solo: !track.solo });
          }}
          title={track.solo ? 'Unsolo' : 'Solo'}
        >
          S
        </button>
        <button
          className="btn-track delete"
          onClick={(e) => {
            e.stopPropagation();
            if (confirm('Delete this track?')) {
              onRemove();
            }
          }}
          title="Delete Track"
        >
          ×
        </button>
      </div>
    </div>
  );
};
