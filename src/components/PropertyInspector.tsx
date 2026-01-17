import React from 'react';
import { TimelineFirework, AudioClip, FireworkDefinition } from '../types';
import { formatTime, formatTimeShort } from '../utils/timeUtils';
import { categoryInfo, fireworkColors } from '../data/fireworksDatabase';

interface PropertyInspectorProps {
  selectedFireworks: TimelineFirework[];
  selectedAudioClips: AudioClip[];
  fireworkLibrary: FireworkDefinition[];
  onUpdateFirework: (id: string, updates: Partial<TimelineFirework>) => void;
  onUpdateAudioClip: (id: string, updates: Partial<AudioClip>) => void;
  onDuplicateFirework: (id: string) => void;
  onRemoveFirework: (id: string) => void;
  onRemoveAudioClip: (id: string) => void;
}

export const PropertyInspector: React.FC<PropertyInspectorProps> = ({
  selectedFireworks,
  selectedAudioClips,
  fireworkLibrary,
  onUpdateFirework,
  onUpdateAudioClip,
  onDuplicateFirework,
  onRemoveFirework,
  onRemoveAudioClip,
}) => {
  if (selectedFireworks.length === 0 && selectedAudioClips.length === 0) {
    return (
      <div className="property-inspector empty">
        <p>Select an item to view properties</p>
        <div className="tips">
          <h4>Tips:</h4>
          <ul>
            <li>Drag fireworks from the library to a track</li>
            <li>Click to select, Shift+Click for multi-select</li>
            <li>Right-click to delete</li>
            <li>Drag items to move them on the timeline</li>
          </ul>
        </div>
      </div>
    );
  }

  if (selectedFireworks.length > 0) {
    if (selectedFireworks.length === 1) {
      const firework = selectedFireworks[0];
      const definition = fireworkLibrary.find((d) => d.id === firework.fireworkId);

      if (!definition) {
        return (
          <div className="property-inspector">
            <p>Unknown firework type</p>
          </div>
        );
      }

      const catInfo = categoryInfo[definition.category];

      return (
        <div className="property-inspector">
          <div className="inspector-header">
            <h3>Firework Properties</h3>
          </div>

          <div className="inspector-section">
            <div className="firework-info">
              <div
                className="category-badge"
                style={{ backgroundColor: catInfo?.color }}
              >
                {catInfo?.name || definition.category}
              </div>
              <h4>{definition.name}</h4>
              <div className="color-display">
                {definition.colors.map((color, i) => (
                  <span
                    key={i}
                    className="color-swatch"
                    style={{ background: fireworkColors[color] }}
                    title={color}
                  />
                ))}
              </div>
            </div>
          </div>

          <div className="inspector-section">
            <h4>Timing</h4>
            <div className="property-row">
              <label>Visual Time (Burst):</label>
              <input
                type="number"
                value={Math.round(firework.visualTime)}
                onChange={(e) =>
                  onUpdateFirework(firework.id, { visualTime: Number(e.target.value) })
                }
              />
              <span className="unit">ms</span>
            </div>
            <div className="property-row readonly">
              <label>Fire Time:</label>
              <span>{formatTime(firework.fireTime)}</span>
            </div>
            <div className="property-row readonly">
              <label>Pre-firing Offset:</label>
              <span>{formatTimeShort(definition.preFiringOffset)}</span>
            </div>
          </div>

          <div className="inspector-section">
            <h4>Position</h4>
            <div className="property-row">
              <label>X Position:</label>
              <input
                type="range"
                min={-100}
                max={100}
                value={firework.position.x}
                onChange={(e) =>
                  onUpdateFirework(firework.id, {
                    position: { ...firework.position, x: Number(e.target.value) },
                  })
                }
              />
              <span>{firework.position.x}</span>
            </div>
            <div className="property-row">
              <label>Launch Angle:</label>
              <input
                type="range"
                min={45}
                max={135}
                value={firework.position.angle}
                onChange={(e) =>
                  onUpdateFirework(firework.id, {
                    position: { ...firework.position, angle: Number(e.target.value) },
                  })
                }
              />
              <span>{firework.position.angle}°</span>
            </div>
          </div>

          <div className="inspector-section">
            <h4>Cue</h4>
            <div className="property-row">
              <label>Cue Number:</label>
              <input
                type="text"
                value={firework.cueNumber || ''}
                onChange={(e) =>
                  onUpdateFirework(firework.id, { cueNumber: e.target.value })
                }
                placeholder="e.g., A1"
              />
            </div>
            <div className="property-row">
              <label>Notes:</label>
              <textarea
                value={firework.notes || ''}
                onChange={(e) =>
                  onUpdateFirework(firework.id, { notes: e.target.value })
                }
                placeholder="Add notes..."
              />
            </div>
          </div>

          <div className="inspector-section">
            <h4>Firework Specs</h4>
            <div className="specs-grid">
              <div className="spec">
                <span className="label">Fuse</span>
                <span className="value">{definition.fuseTime}ms</span>
              </div>
              <div className="spec">
                <span className="label">Lift</span>
                <span className="value">{definition.liftTime}ms</span>
              </div>
              <div className="spec">
                <span className="label">Effect</span>
                <span className="value">{formatTimeShort(definition.effectDuration)}</span>
              </div>
              <div className="spec">
                <span className="label">Height</span>
                <span className="value">{definition.maxHeight}m</span>
              </div>
              <div className="spec">
                <span className="label">Burst</span>
                <span className="value">{definition.burstDiameter}m</span>
              </div>
            </div>
          </div>

          <div className="inspector-actions">
            <button onClick={() => onDuplicateFirework(firework.id)}>
              Duplicate
            </button>
            <button className="danger" onClick={() => onRemoveFirework(firework.id)}>
              Delete
            </button>
          </div>
        </div>
      );
    }

    // Multiple fireworks selected
    return (
      <div className="property-inspector">
        <div className="inspector-header">
          <h3>{selectedFireworks.length} Fireworks Selected</h3>
        </div>

        <div className="inspector-section">
          <p>Multiple selection editing coming soon</p>
        </div>

        <div className="inspector-actions">
          <button
            className="danger"
            onClick={() => {
              if (confirm(`Delete ${selectedFireworks.length} fireworks?`)) {
                selectedFireworks.forEach((fw) => onRemoveFirework(fw.id));
              }
            }}
          >
            Delete All Selected
          </button>
        </div>
      </div>
    );
  }

  if (selectedAudioClips.length === 1) {
    const clip = selectedAudioClips[0];

    return (
      <div className="property-inspector">
        <div className="inspector-header">
          <h3>Audio Clip Properties</h3>
        </div>

        <div className="inspector-section">
          <h4>{clip.name}</h4>
          <p className="file-name">{clip.fileName}</p>
        </div>

        <div className="inspector-section">
          <h4>Timing</h4>
          <div className="property-row">
            <label>Start Time:</label>
            <input
              type="number"
              value={Math.round(clip.startTime)}
              onChange={(e) =>
                onUpdateAudioClip(clip.id, { startTime: Number(e.target.value) })
              }
            />
            <span className="unit">ms</span>
          </div>
          <div className="property-row readonly">
            <label>Duration:</label>
            <span>{formatTime(clip.duration)}</span>
          </div>
        </div>

        <div className="inspector-section">
          <h4>Trim</h4>
          <div className="property-row">
            <label>Trim Start:</label>
            <input
              type="number"
              min={0}
              max={clip.duration - clip.trimEnd}
              value={Math.round(clip.trimStart)}
              onChange={(e) =>
                onUpdateAudioClip(clip.id, { trimStart: Number(e.target.value) })
              }
            />
            <span className="unit">ms</span>
          </div>
          <div className="property-row">
            <label>Trim End:</label>
            <input
              type="number"
              min={0}
              max={clip.duration - clip.trimStart}
              value={Math.round(clip.trimEnd)}
              onChange={(e) =>
                onUpdateAudioClip(clip.id, { trimEnd: Number(e.target.value) })
              }
            />
            <span className="unit">ms</span>
          </div>
        </div>

        <div className="inspector-section">
          <h4>Volume</h4>
          <div className="property-row">
            <label>Volume:</label>
            <input
              type="range"
              min={0}
              max={1}
              step={0.01}
              value={clip.volume}
              onChange={(e) =>
                onUpdateAudioClip(clip.id, { volume: Number(e.target.value) })
              }
            />
            <span>{Math.round(clip.volume * 100)}%</span>
          </div>
        </div>

        <div className="inspector-actions">
          <button className="danger" onClick={() => onRemoveAudioClip(clip.id)}>
            Delete
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="property-inspector">
      <p>Select an item to view properties</p>
    </div>
  );
};
