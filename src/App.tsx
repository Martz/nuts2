import React, { useCallback, useEffect, useMemo } from 'react';
import { useFireworkShow } from './hooks/useFireworkShow';
import { FireworkLibrary } from './components/FireworkLibrary';
import { Timeline } from './components/Timeline';
import { TrackList } from './components/TrackList';
import { TransportControls } from './components/TransportControls';
import { PropertyInspector } from './components/PropertyInspector';
import { FireworkDefinition } from './types';
import './App.css';

function App() {
  const {
    show,
    fireworkLibrary,
    playback,
    viewport,
    selection,
    updateShowName,
    updateShowDuration,
    exportShow,
    importShow,
    addTrack,
    removeTrack,
    updateTrack,
    addAudioClip,
    updateAudioClip,
    removeAudioClip,
    addFirework,
    updateFirework,
    removeFirework,
    duplicateFirework,
    addCustomFirework,
    handlePlay,
    handlePause,
    handleStop,
    handleSeek,
    setZoom,
    setScroll,
    selectFirework,
    selectAudioClip,
    clearSelection,
  } = useFireworkShow();

  const [selectedLibraryFirework, setSelectedLibraryFirework] = React.useState<FireworkDefinition | null>(null);

  // Combine default and custom fireworks for the library
  const fullLibrary = useMemo(
    () => [...fireworkLibrary, ...show.customFireworks],
    [fireworkLibrary, show.customFireworks]
  );

  // Get first audio track for quick audio adding
  const firstAudioTrack = show.tracks.find((t) => t.type === 'audio');

  // Get selected items for property inspector
  const selectedFireworkItems = useMemo(
    () => show.fireworks.filter((fw) => selection.selectedFireworks.includes(fw.id)),
    [show.fireworks, selection.selectedFireworks]
  );

  const selectedAudioClipItems = useMemo(
    () => show.audioClips.filter((clip) => selection.selectedAudioClips.includes(clip.id)),
    [show.audioClips, selection.selectedAudioClips]
  );

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore if typing in an input
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement
      ) {
        return;
      }

      switch (e.code) {
        case 'Space':
          e.preventDefault();
          playback.isPlaying ? handlePause() : handlePlay();
          break;
        case 'Home':
          e.preventDefault();
          handleStop();
          break;
        case 'Delete':
        case 'Backspace':
          e.preventDefault();
          selection.selectedFireworks.forEach((id) => removeFirework(id));
          selection.selectedAudioClips.forEach((id) => removeAudioClip(id));
          break;
        case 'KeyD':
          if (e.ctrlKey || e.metaKey) {
            e.preventDefault();
            selection.selectedFireworks.forEach((id) => duplicateFirework(id));
          }
          break;
        case 'Escape':
          clearSelection();
          break;
        case 'Equal':
        case 'NumpadAdd':
          if (e.ctrlKey || e.metaKey) {
            e.preventDefault();
            setZoom(Math.min(viewport.zoom + 0.2, 5));
          }
          break;
        case 'Minus':
        case 'NumpadSubtract':
          if (e.ctrlKey || e.metaKey) {
            e.preventDefault();
            setZoom(Math.max(viewport.zoom - 0.2, 0.1));
          }
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [
    playback.isPlaying,
    handlePlay,
    handlePause,
    handleStop,
    selection,
    removeFirework,
    removeAudioClip,
    duplicateFirework,
    clearSelection,
    setZoom,
    viewport.zoom,
  ]);

  const handleAddAudioToTrack = useCallback(
    async (file: File, trackId: string) => {
      try {
        await addAudioClip(file, trackId);
      } catch {
        alert('Failed to load audio file. Please try a different file.');
      }
    },
    [addAudioClip]
  );

  return (
    <div className="app">
      <header className="app-header">
        <div className="logo">
          <span className="logo-icon">🎆</span>
          <h1>Fireworks Show Designer</h1>
        </div>
        <div className="header-actions">
          <span className="save-status">
            {show.updatedAt.toLocaleTimeString()}
          </span>
        </div>
      </header>

      <TransportControls
        playback={playback}
        viewport={viewport}
        duration={show.duration}
        showName={show.name}
        onPlay={handlePlay}
        onPause={handlePause}
        onStop={handleStop}
        onSeek={handleSeek}
        onZoom={setZoom}
        onUpdateShowName={updateShowName}
        onUpdateDuration={updateShowDuration}
        onExport={exportShow}
        onImport={importShow}
        onAddAudio={handleAddAudioToTrack}
        audioTrackId={firstAudioTrack?.id}
      />

      <main className="app-main">
        <aside className="sidebar left">
          <FireworkLibrary
            library={fullLibrary}
            onSelect={setSelectedLibraryFirework}
            selectedFireworkId={selectedLibraryFirework?.id}
            onAddCustomFirework={addCustomFirework}
          />
        </aside>

        <div className="main-content">
          <div className="timeline-wrapper">
            <div className="track-list-wrapper">
              <TrackList
                tracks={show.tracks}
                selectedTrack={selection.selectedTrack}
                onUpdateTrack={updateTrack}
                onRemoveTrack={removeTrack}
                onAddTrack={addTrack}
                onSelectTrack={(id) => {}}
              />
            </div>
            <Timeline
              tracks={show.tracks}
              audioClips={show.audioClips}
              fireworks={show.fireworks}
              fireworkLibrary={fullLibrary}
              viewport={viewport}
              playback={playback}
              duration={show.duration}
              selectedFireworks={selection.selectedFireworks}
              selectedAudioClips={selection.selectedAudioClips}
              onSeek={handleSeek}
              onScroll={setScroll}
              onAddFirework={addFirework}
              onUpdateFirework={updateFirework}
              onSelectFirework={selectFirework}
              onRemoveFirework={removeFirework}
              onUpdateAudioClip={updateAudioClip}
              onSelectAudioClip={selectAudioClip}
              onRemoveAudioClip={removeAudioClip}
              onClearSelection={clearSelection}
            />
          </div>
        </div>

        <aside className="sidebar right">
          <PropertyInspector
            selectedFireworks={selectedFireworkItems}
            selectedAudioClips={selectedAudioClipItems}
            fireworkLibrary={fullLibrary}
            onUpdateFirework={updateFirework}
            onUpdateAudioClip={updateAudioClip}
            onDuplicateFirework={duplicateFirework}
            onRemoveFirework={removeFirework}
            onRemoveAudioClip={removeAudioClip}
          />
        </aside>
      </main>

      <footer className="app-footer">
        <div className="footer-info">
          <span>Tracks: {show.tracks.length}</span>
          <span>Fireworks: {show.fireworks.length}</span>
          <span>Audio Clips: {show.audioClips.length}</span>
        </div>
        <div className="footer-shortcuts">
          <span>Space: Play/Pause</span>
          <span>Home: Stop</span>
          <span>Ctrl+D: Duplicate</span>
          <span>Del: Delete</span>
          <span>Ctrl+/-: Zoom</span>
        </div>
      </footer>
    </div>
  );
}

export default App;
