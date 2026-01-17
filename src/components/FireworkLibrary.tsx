import React, { useState } from 'react';
import { FireworkDefinition, FireworkCategory } from '../types';
import { categoryInfo, fireworkColors } from '../data/fireworksDatabase';
import { formatTimeShort } from '../utils/timeUtils';

interface FireworkLibraryProps {
  library: FireworkDefinition[];
  onSelect: (firework: FireworkDefinition) => void;
  selectedFireworkId?: string;
  onAddCustomFirework: (firework: FireworkDefinition) => void;
}

export const FireworkLibrary: React.FC<FireworkLibraryProps> = ({
  library,
  onSelect,
  selectedFireworkId,
  onAddCustomFirework,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<FireworkCategory | 'all'>('all');
  const [showAddForm, setShowAddForm] = useState(false);

  const categories = [...new Set(library.map((f) => f.category))];

  const filteredLibrary = library.filter((fw) => {
    const matchesSearch =
      fw.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      fw.description.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = categoryFilter === 'all' || fw.category === categoryFilter;
    return matchesSearch && matchesCategory;
  });

  const groupedByCategory = filteredLibrary.reduce((acc, fw) => {
    if (!acc[fw.category]) acc[fw.category] = [];
    acc[fw.category].push(fw);
    return acc;
  }, {} as Record<string, FireworkDefinition[]>);

  return (
    <div className="firework-library">
      <div className="library-header">
        <h3>Firework Library</h3>
        <button
          className="btn-icon"
          onClick={() => setShowAddForm(true)}
          title="Add Custom Firework"
        >
          +
        </button>
      </div>

      <div className="library-search">
        <input
          type="text"
          placeholder="Search fireworks..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      <div className="library-filter">
        <select
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value as FireworkCategory | 'all')}
        >
          <option value="all">All Categories</option>
          {categories.map((cat) => (
            <option key={cat} value={cat}>
              {categoryInfo[cat]?.name || cat}
            </option>
          ))}
        </select>
      </div>

      <div className="library-list">
        {Object.entries(groupedByCategory).map(([category, fireworks]) => (
          <div key={category} className="library-category">
            <div
              className="category-header"
              style={{ borderLeftColor: categoryInfo[category]?.color }}
            >
              {categoryInfo[category]?.name || category}
            </div>
            {fireworks.map((fw) => (
              <FireworkItem
                key={fw.id}
                firework={fw}
                isSelected={fw.id === selectedFireworkId}
                onSelect={() => onSelect(fw)}
              />
            ))}
          </div>
        ))}
      </div>

      {showAddForm && (
        <AddFireworkForm
          onAdd={(fw) => {
            onAddCustomFirework(fw);
            setShowAddForm(false);
          }}
          onCancel={() => setShowAddForm(false)}
        />
      )}
    </div>
  );
};

interface FireworkItemProps {
  firework: FireworkDefinition;
  isSelected: boolean;
  onSelect: () => void;
}

const FireworkItem: React.FC<FireworkItemProps> = ({ firework, isSelected, onSelect }) => {
  const [expanded, setExpanded] = useState(false);

  return (
    <div
      className={`firework-item ${isSelected ? 'selected' : ''}`}
      draggable
      onDragStart={(e) => {
        e.dataTransfer.setData('firework-id', firework.id);
        e.dataTransfer.effectAllowed = 'copy';
      }}
      onClick={onSelect}
    >
      <div className="firework-item-header">
        <div className="firework-colors">
          {firework.colors.map((color, i) => (
            <span
              key={i}
              className="color-dot"
              style={{
                background: fireworkColors[color] || color,
              }}
            />
          ))}
        </div>
        <span className="firework-name">{firework.name}</span>
        <button
          className="btn-expand"
          onClick={(e) => {
            e.stopPropagation();
            setExpanded(!expanded);
          }}
        >
          {expanded ? '▼' : '▶'}
        </button>
      </div>

      {expanded && (
        <div className="firework-details">
          <p className="description">{firework.description}</p>
          <div className="timing-info">
            <div className="timing-row">
              <span>Fuse Time:</span>
              <span>{firework.fuseTime}ms</span>
            </div>
            <div className="timing-row">
              <span>Lift Time:</span>
              <span>{firework.liftTime}ms</span>
            </div>
            <div className="timing-row">
              <span>Effect Duration:</span>
              <span>{formatTimeShort(firework.effectDuration)}</span>
            </div>
            <div className="timing-row highlight">
              <span>Pre-fire Offset:</span>
              <span>{formatTimeShort(firework.preFiringOffset)}</span>
            </div>
            <div className="timing-row">
              <span>Total Duration:</span>
              <span>{formatTimeShort(firework.totalDuration)}</span>
            </div>
          </div>
          <div className="size-info">
            <span>Height: {firework.maxHeight}m</span>
            <span>Burst: {firework.burstDiameter}m</span>
          </div>
        </div>
      )}
    </div>
  );
};

interface AddFireworkFormProps {
  onAdd: (firework: FireworkDefinition) => void;
  onCancel: () => void;
}

const AddFireworkForm: React.FC<AddFireworkFormProps> = ({ onAdd, onCancel }) => {
  const [formData, setFormData] = useState<Partial<FireworkDefinition>>({
    name: '',
    category: 'peony',
    manufacturer: '',
    fuseTime: 500,
    liftTime: 2500,
    effectDuration: 3000,
    colors: ['red'],
    burstDiameter: 45,
    maxHeight: 90,
    description: '',
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const preFiringOffset = (formData.fuseTime || 0) + (formData.liftTime || 0);
    const totalDuration = preFiringOffset + (formData.effectDuration || 0);

    const firework: FireworkDefinition = {
      id: `custom-${Date.now()}`,
      name: formData.name || 'Custom Firework',
      category: formData.category as FireworkCategory,
      manufacturer: formData.manufacturer || 'Custom',
      fuseTime: formData.fuseTime || 500,
      liftTime: formData.liftTime || 2500,
      effectDuration: formData.effectDuration || 3000,
      totalDuration,
      colors: formData.colors || ['red'],
      burstDiameter: formData.burstDiameter || 45,
      maxHeight: formData.maxHeight || 90,
      preFiringOffset,
      description: formData.description || '',
    };

    onAdd(firework);
  };

  return (
    <div className="modal-overlay">
      <div className="modal add-firework-modal">
        <h3>Add Custom Firework</h3>
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Name</label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              required
            />
          </div>

          <div className="form-group">
            <label>Category</label>
            <select
              value={formData.category}
              onChange={(e) =>
                setFormData({ ...formData, category: e.target.value as FireworkCategory })
              }
            >
              {Object.entries(categoryInfo).map(([key, info]) => (
                <option key={key} value={key}>
                  {info.name}
                </option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label>Manufacturer</label>
            <input
              type="text"
              value={formData.manufacturer}
              onChange={(e) => setFormData({ ...formData, manufacturer: e.target.value })}
            />
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>Fuse Time (ms)</label>
              <input
                type="number"
                value={formData.fuseTime}
                onChange={(e) => setFormData({ ...formData, fuseTime: Number(e.target.value) })}
              />
            </div>
            <div className="form-group">
              <label>Lift Time (ms)</label>
              <input
                type="number"
                value={formData.liftTime}
                onChange={(e) => setFormData({ ...formData, liftTime: Number(e.target.value) })}
              />
            </div>
          </div>

          <div className="form-group">
            <label>Effect Duration (ms)</label>
            <input
              type="number"
              value={formData.effectDuration}
              onChange={(e) =>
                setFormData({ ...formData, effectDuration: Number(e.target.value) })
              }
            />
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>Max Height (m)</label>
              <input
                type="number"
                value={formData.maxHeight}
                onChange={(e) => setFormData({ ...formData, maxHeight: Number(e.target.value) })}
              />
            </div>
            <div className="form-group">
              <label>Burst Diameter (m)</label>
              <input
                type="number"
                value={formData.burstDiameter}
                onChange={(e) =>
                  setFormData({ ...formData, burstDiameter: Number(e.target.value) })
                }
              />
            </div>
          </div>

          <div className="form-group">
            <label>Description</label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            />
          </div>

          <div className="form-actions">
            <button type="button" onClick={onCancel}>
              Cancel
            </button>
            <button type="submit" className="primary">
              Add Firework
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
