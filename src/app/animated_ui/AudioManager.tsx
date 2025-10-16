// AudioManager.tsx - Context for managing global audio state
import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';

interface AudioManagerContextType {
  currentlyPlayingId: string | null;
  setCurrentlyPlaying: (id: string | null, onPause?: () => void) => void;
  pauseCurrentAudio: () => void;
}

const AudioManagerContext = createContext<AudioManagerContextType | undefined>(undefined);

export const useAudioManager = () => {
  const context = useContext(AudioManagerContext);
  if (!context) {
    throw new Error('useAudioManager must be used within an AudioManagerProvider');
  }
  return context;
};

interface AudioManagerProviderProps {
  children: ReactNode;
}

export const AudioManagerProvider: React.FC<AudioManagerProviderProps> = ({ children }) => {
  const [currentlyPlayingId, setCurrentlyPlayingId] = useState<string | null>(null);
  const [pauseCallback, setPauseCallback] = useState<(() => void) | null>(null);

  const setCurrentlyPlaying = useCallback((id: string | null, onPause?: () => void) => {
    // If there's a currently playing audio and it's different from the new one, pause it
    if (currentlyPlayingId && currentlyPlayingId !== id && pauseCallback) {
      pauseCallback();
    }
    
    setCurrentlyPlayingId(id);
    setPauseCallback(onPause ? () => onPause : null);
  }, [currentlyPlayingId, pauseCallback]);

  const pauseCurrentAudio = useCallback(() => {
    if (pauseCallback) {
      pauseCallback();
    }
    setCurrentlyPlayingId(null);
    setPauseCallback(null);
  }, [pauseCallback]);

  return (
    <AudioManagerContext.Provider
      value={{
        currentlyPlayingId,
        setCurrentlyPlaying,
        pauseCurrentAudio,
      }}
    >
      {children}
    </AudioManagerContext.Provider>
  );
};