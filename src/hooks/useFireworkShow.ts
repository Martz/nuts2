import { useState, useCallback, useRef, useEffect } from 'react';
import {
  FireworkShow,
  FireworkDefinition,
  TimelineFirework,
  AudioClip,
  Track,
  PlaybackState,
  ViewportState,
  SelectionState,
  EditorMode,
} from '../types';
import { defaultFireworksLibrary } from '../data/fireworksDatabase';
import { getAudioPlayer, loadAudioFile, generateWaveformData } from '../utils/audioUtils';

const generateId = () => Math.random().toString(36).substring(2, 11);

const createDefaultShow = (): FireworkShow => ({
  id: generateId(),
  name: 'Untitled Show',
  createdAt: new Date(),
  updatedAt: new Date(),
  duration: 300000, // 5 minutes default
  tracks: [
    {
      id: 'audio-1',
      name: 'Audio Track 1',
      type: 'audio',
      color: '#4A90D9',
      muted: false,
      solo: false,
      height: 80,
    },
    {
      id: 'firework-1',
      name: 'Shells - Center',
      type: 'firework',
      color: '#E74C3C',
      muted: false,
      solo: false,
      height: 60,
    },
    {
      id: 'firework-2',
      name: 'Shells - Left',
      type: 'firework',
      color: '#27AE60',
      muted: false,
      solo: false,
      height: 60,
    },
    {
      id: 'firework-3',
      name: 'Shells - Right',
      type: 'firework',
      color: '#F39C12',
      muted: false,
      solo: false,
      height: 60,
    },
    {
      id: 'firework-4',
      name: 'Ground Effects',
      type: 'firework',
      color: '#9B59B6',
      muted: false,
      solo: false,
      height: 60,
    },
  ],
  audioClips: [],
  fireworks: [],
  customFireworks: [],
});

export function useFireworkShow() {
  const [show, setShow] = useState<FireworkShow>(createDefaultShow);
  const [fireworkLibrary] = useState<FireworkDefinition[]>(defaultFireworksLibrary);
  const [audioBuffers, setAudioBuffers] = useState<Map<string, AudioBuffer>>(new Map());

  const [playback, setPlayback] = useState<PlaybackState>({
    isPlaying: false,
    currentTime: 0,
    isLooping: false,
  });

  const [viewport, setViewport] = useState<ViewportState>({
    scrollX: 0,
    scrollY: 0,
    zoom: 1,
    pixelsPerSecond: 100,
  });

  const [selection, setSelection] = useState<SelectionState>({
    selectedFireworks: [],
    selectedAudioClips: [],
  });

  const [editorMode, setEditorMode] = useState<EditorMode>('select');

  const animationRef = useRef<number>();
  const audioPlayer = useRef(getAudioPlayer());

  // Playback loop
  useEffect(() => {
    if (playback.isPlaying) {
      const updateTime = () => {
        const currentTime = audioPlayer.current.getCurrentTime();

        if (currentTime >= show.duration) {
          if (playback.isLooping && playback.loopStart !== undefined) {
            // Loop back
            handleSeek(playback.loopStart);
          } else {
            handleStop();
            return;
          }
        }

        setPlayback((prev) => ({ ...prev, currentTime }));
        animationRef.current = requestAnimationFrame(updateTime);
      };

      animationRef.current = requestAnimationFrame(updateTime);
    }

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [playback.isPlaying, show.duration]);

  // Show actions
  const updateShowName = useCallback((name: string) => {
    setShow((prev) => ({ ...prev, name, updatedAt: new Date() }));
  }, []);

  const updateShowDuration = useCallback((duration: number) => {
    setShow((prev) => ({ ...prev, duration, updatedAt: new Date() }));
  }, []);

  // Track actions
  const addTrack = useCallback((type: 'audio' | 'firework', name: string) => {
    const newTrack: Track = {
      id: generateId(),
      name,
      type,
      color: type === 'audio' ? '#4A90D9' : '#E74C3C',
      muted: false,
      solo: false,
      height: type === 'audio' ? 80 : 60,
    };
    setShow((prev) => ({
      ...prev,
      tracks: [...prev.tracks, newTrack],
      updatedAt: new Date(),
    }));
  }, []);

  const removeTrack = useCallback((trackId: string) => {
    setShow((prev) => ({
      ...prev,
      tracks: prev.tracks.filter((t) => t.id !== trackId),
      audioClips: prev.audioClips.filter((c) => c.trackId !== trackId),
      fireworks: prev.fireworks.filter((f) => f.trackId !== trackId),
      updatedAt: new Date(),
    }));
  }, []);

  const updateTrack = useCallback((trackId: string, updates: Partial<Track>) => {
    setShow((prev) => ({
      ...prev,
      tracks: prev.tracks.map((t) =>
        t.id === trackId ? { ...t, ...updates } : t
      ),
      updatedAt: new Date(),
    }));
  }, []);

  // Audio clip actions
  const addAudioClip = useCallback(
    async (file: File, trackId: string, startTime: number = 0) => {
      try {
        const buffer = await loadAudioFile(file);
        const waveformData = generateWaveformData(buffer, 2000);

        const clipId = generateId();

        setAudioBuffers((prev) => new Map(prev).set(clipId, buffer));

        const newClip: AudioClip = {
          id: clipId,
          name: file.name,
          fileName: file.name,
          startTime,
          duration: buffer.duration * 1000,
          trimStart: 0,
          trimEnd: 0,
          volume: 1,
          trackId,
          waveformData,
        };

        setShow((prev) => ({
          ...prev,
          audioClips: [...prev.audioClips, newClip],
          updatedAt: new Date(),
        }));

        return clipId;
      } catch (error) {
        console.error('Failed to load audio file:', error);
        throw error;
      }
    },
    []
  );

  const updateAudioClip = useCallback((clipId: string, updates: Partial<AudioClip>) => {
    setShow((prev) => ({
      ...prev,
      audioClips: prev.audioClips.map((c) =>
        c.id === clipId ? { ...c, ...updates } : c
      ),
      updatedAt: new Date(),
    }));
  }, []);

  const removeAudioClip = useCallback((clipId: string) => {
    setShow((prev) => ({
      ...prev,
      audioClips: prev.audioClips.filter((c) => c.id !== clipId),
      updatedAt: new Date(),
    }));
    setAudioBuffers((prev) => {
      const newMap = new Map(prev);
      newMap.delete(clipId);
      return newMap;
    });
  }, []);

  // Firework actions
  const addFirework = useCallback(
    (fireworkDefId: string, trackId: string, visualTime: number) => {
      const fireworkDef = [...fireworkLibrary, ...show.customFireworks].find(
        (f) => f.id === fireworkDefId
      );
      if (!fireworkDef) return;

      const newFirework: TimelineFirework = {
        id: generateId(),
        fireworkId: fireworkDefId,
        visualTime,
        fireTime: visualTime - fireworkDef.preFiringOffset,
        position: { x: 0, angle: 90 },
        trackId,
      };

      setShow((prev) => ({
        ...prev,
        fireworks: [...prev.fireworks, newFirework],
        updatedAt: new Date(),
      }));

      return newFirework.id;
    },
    [fireworkLibrary, show.customFireworks]
  );

  const updateFirework = useCallback(
    (fireworkId: string, updates: Partial<TimelineFirework>) => {
      setShow((prev) => {
        const firework = prev.fireworks.find((f) => f.id === fireworkId);
        if (!firework) return prev;

        // If visualTime changed, recalculate fireTime
        let newUpdates = { ...updates };
        if (updates.visualTime !== undefined) {
          const fireworkDef = [...fireworkLibrary, ...prev.customFireworks].find(
            (f) => f.id === firework.fireworkId
          );
          if (fireworkDef) {
            newUpdates.fireTime = updates.visualTime - fireworkDef.preFiringOffset;
          }
        }

        return {
          ...prev,
          fireworks: prev.fireworks.map((f) =>
            f.id === fireworkId ? { ...f, ...newUpdates } : f
          ),
          updatedAt: new Date(),
        };
      });
    },
    [fireworkLibrary]
  );

  const removeFirework = useCallback((fireworkId: string) => {
    setShow((prev) => ({
      ...prev,
      fireworks: prev.fireworks.filter((f) => f.id !== fireworkId),
      updatedAt: new Date(),
    }));
    setSelection((prev) => ({
      ...prev,
      selectedFireworks: prev.selectedFireworks.filter((id) => id !== fireworkId),
    }));
  }, []);

  const duplicateFirework = useCallback((fireworkId: string, offsetMs: number = 1000) => {
    setShow((prev) => {
      const original = prev.fireworks.find((f) => f.id === fireworkId);
      if (!original) return prev;

      const duplicate: TimelineFirework = {
        ...original,
        id: generateId(),
        visualTime: original.visualTime + offsetMs,
        fireTime: original.fireTime + offsetMs,
      };

      return {
        ...prev,
        fireworks: [...prev.fireworks, duplicate],
        updatedAt: new Date(),
      };
    });
  }, []);

  // Playback controls
  const handlePlay = useCallback(() => {
    const clips = show.audioClips
      .filter((clip) => {
        const track = show.tracks.find((t) => t.id === clip.trackId);
        return track && !track.muted;
      })
      .map((clip) => ({
        id: clip.id,
        buffer: audioBuffers.get(clip.id)!,
        startTimeMs: clip.startTime,
        volume: clip.volume,
        trimStartMs: clip.trimStart,
        trimEndMs: clip.trimEnd,
      }))
      .filter((clip) => clip.buffer);

    audioPlayer.current.play(clips, playback.currentTime);
    setPlayback((prev) => ({ ...prev, isPlaying: true }));
  }, [show.audioClips, show.tracks, audioBuffers, playback.currentTime]);

  const handlePause = useCallback(() => {
    audioPlayer.current.stop();
    setPlayback((prev) => ({
      ...prev,
      isPlaying: false,
      currentTime: audioPlayer.current.getCurrentTime(),
    }));
  }, []);

  const handleStop = useCallback(() => {
    audioPlayer.current.stop();
    setPlayback((prev) => ({
      ...prev,
      isPlaying: false,
      currentTime: 0,
    }));
  }, []);

  const handleSeek = useCallback(
    (time: number) => {
      const wasPlaying = playback.isPlaying;
      if (wasPlaying) {
        audioPlayer.current.stop();
      }
      setPlayback((prev) => ({ ...prev, currentTime: time }));
      if (wasPlaying) {
        setTimeout(() => {
          const clips = show.audioClips
            .filter((clip) => {
              const track = show.tracks.find((t) => t.id === clip.trackId);
              return track && !track.muted;
            })
            .map((clip) => ({
              id: clip.id,
              buffer: audioBuffers.get(clip.id)!,
              startTimeMs: clip.startTime,
              volume: clip.volume,
              trimStartMs: clip.trimStart,
              trimEndMs: clip.trimEnd,
            }))
            .filter((clip) => clip.buffer);

          audioPlayer.current.play(clips, time);
        }, 50);
      }
    },
    [playback.isPlaying, show.audioClips, show.tracks, audioBuffers]
  );

  // Viewport controls
  const setZoom = useCallback((zoom: number) => {
    const pixelsPerSecond = zoom * 100;
    setViewport((prev) => ({ ...prev, zoom, pixelsPerSecond }));
  }, []);

  const setScroll = useCallback((scrollX: number, scrollY: number) => {
    setViewport((prev) => ({ ...prev, scrollX, scrollY }));
  }, []);

  // Selection controls
  const selectFirework = useCallback((fireworkId: string, addToSelection: boolean = false) => {
    setSelection((prev) => ({
      ...prev,
      selectedFireworks: addToSelection
        ? [...prev.selectedFireworks, fireworkId]
        : [fireworkId],
      selectedAudioClips: [],
    }));
  }, []);

  const selectAudioClip = useCallback((clipId: string, addToSelection: boolean = false) => {
    setSelection((prev) => ({
      ...prev,
      selectedAudioClips: addToSelection
        ? [...prev.selectedAudioClips, clipId]
        : [clipId],
      selectedFireworks: [],
    }));
  }, []);

  const clearSelection = useCallback(() => {
    setSelection({
      selectedFireworks: [],
      selectedAudioClips: [],
    });
  }, []);

  // Custom firework definition
  const addCustomFirework = useCallback((firework: FireworkDefinition) => {
    setShow((prev) => ({
      ...prev,
      customFireworks: [...prev.customFireworks, firework],
      updatedAt: new Date(),
    }));
  }, []);

  // Save/Load
  const exportShow = useCallback(() => {
    const data = JSON.stringify(show, null, 2);
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${show.name.replace(/\s+/g, '_')}.fwshow`;
    a.click();
    URL.revokeObjectURL(url);
  }, [show]);

  const importShow = useCallback((data: string) => {
    try {
      const parsed = JSON.parse(data);
      setShow({
        ...parsed,
        createdAt: new Date(parsed.createdAt),
        updatedAt: new Date(),
      });
    } catch (error) {
      console.error('Failed to import show:', error);
    }
  }, []);

  return {
    // State
    show,
    fireworkLibrary,
    audioBuffers,
    playback,
    viewport,
    selection,
    editorMode,

    // Show actions
    updateShowName,
    updateShowDuration,
    exportShow,
    importShow,

    // Track actions
    addTrack,
    removeTrack,
    updateTrack,

    // Audio actions
    addAudioClip,
    updateAudioClip,
    removeAudioClip,

    // Firework actions
    addFirework,
    updateFirework,
    removeFirework,
    duplicateFirework,
    addCustomFirework,

    // Playback
    handlePlay,
    handlePause,
    handleStop,
    handleSeek,

    // Viewport
    setZoom,
    setScroll,

    // Selection
    selectFirework,
    selectAudioClip,
    clearSelection,
    setEditorMode,
  };
}
