import React, { createContext, useContext, useState, useRef, useEffect } from 'react';
import { Audio } from 'expo-av';

const PlayerContext = createContext(null);

export function PlayerContextProvider({ children }) {
  const [currentTrack, setCurrentTrack] = useState(null);
  const [activeTileIndex, setActiveTileIndex] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [miniPlayerVisible, setMiniPlayerVisible] = useState(false);
  const [currentPlayingUrl, setCurrentPlayingUrl] = useState('');
  
  // Top Banner Radio state
  const [isHeaderPlaying, setIsHeaderPlaying] = useState(false);
  const [isLoadingHeader, setIsLoadingHeader] = useState(false);
  const [liveInfo, setLiveInfo] = useState({ current: { title: 'Voices Radio' } });
  const headerAudioRef = useRef(new Audio.Sound());

  // Fetch live info on component mount
  useEffect(() => {
    fetchLiveInfo();
    const interval = setInterval(fetchLiveInfo, 30000); // Update every 30 seconds
    return () => {
      clearInterval(interval);
      unloadHeaderAudio();
    };
  }, []);

  // Function to fetch live info
  const fetchLiveInfo = async () => {
    try {
      // The URL is likely returning HTML or plain text, not JSON
      // Let's fetch metadata from a different endpoint
      const response = await fetch('https://voicesradio.airtime.pro/api/live-info-v2?timezone=${timeZone}');
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const text = await response.text();
      
      try {
        // Try to parse as JSON
        const data = JSON.parse(text);
        
        // Set show info with proper fallback
        setLiveInfo({
          current: {
            title: data?.shows?.current?.name || 'Voices Radio'
          }
        });
      } catch (parseError) {
        console.error('JSON Parse error:', parseError);
        
        // If we can't parse JSON, try to extract show info from HTML using regex
        const showNameMatch = text.match(/<current_show>(.*?)<\/current_show>/);
        if (showNameMatch && showNameMatch[1]) {
          setLiveInfo({
            current: {
              title: showNameMatch[1] || 'Voices Radio'
            }
          });
        } else {
          // Default to "Voices Radio" if no show info found
          setLiveInfo({ current: { title: 'Voices Radio' } });
        }
      }
    } catch (error) {
      console.error('Error fetching live info:', error);
      setLiveInfo({ current: { title: 'Voices Radio' } });
    }
  };

  // Helper function to unload header audio with error handling
  const unloadHeaderAudio = async () => {
    try {
      const status = await headerAudioRef.current.getStatusAsync();
      
      // Only attempt to stop if the sound is loaded
      if (status.isLoaded) {
        await headerAudioRef.current.stopAsync();
        await headerAudioRef.current.unloadAsync();
      }
    } catch (error) {
      // Reset state even if there's an error
      setIsHeaderPlaying(false);
      setIsLoadingHeader(false);
    }
  };

  // Function to play/pause header audio
  const toggleHeaderSound = async () => {
    try {
      setIsLoadingHeader(true);
      
      // If header is already playing, stop it
      if (isHeaderPlaying) {
        await unloadHeaderAudio();
        setIsHeaderPlaying(false);
      } else {
        // If Mixcloud player is playing, stop it first
        if (miniPlayerVisible) {
          setMiniPlayerVisible(false); 
          setIsPlaying(false);        
          setActiveTileIndex(null);   
        }
        
        // Load and play header audio
        try {
          const status = await headerAudioRef.current.getStatusAsync();
          
          // Unload if it's already loaded
          if (status.isLoaded) {
            await headerAudioRef.current.unloadAsync();
          }
        } catch (statusError) {
          // Ignore status errors, just continue to load
          console.log('Status check error, continuing to load:', statusError);
        }
        
        // Create a new Sound instance for more reliability
        headerAudioRef.current = new Audio.Sound();
        
        await headerAudioRef.current.loadAsync({ 
          uri: 'https://voicesradio.out.airtime.pro/voicesradio_a'
        });
        await headerAudioRef.current.playAsync();
        setIsHeaderPlaying(true);
      }
    } catch (error) {
      console.error('Error toggling header sound:', error);
      setIsHeaderPlaying(false);
    } finally {
      setIsLoadingHeader(false);
    }
  };

  // Clean up audio on unmount
  useEffect(() => {
    return () => {
      // Use a try-catch to prevent any errors during cleanup
      try {
        headerAudioRef.current.unloadAsync();
      } catch (error) {
        console.log('Cleanup error (can be ignored):', error);
      }
    };
  }, []);

  // Function to handle tile press from any screen
  const handleTilePress = (item, index) => {
    // If pressing currently playing track, just toggle play state
    if (currentTrack && currentTrack._id === item._id) {
      setMiniPlayerVisible(!miniPlayerVisible);
      return;
    }

    // If header is playing, stop it
    if (isHeaderPlaying) {
      unloadHeaderAudio();
      setIsHeaderPlaying(false);
    }

    // Set new track
    setCurrentTrack(item);
    setActiveTileIndex(index);
    setMiniPlayerVisible(true);
    setCurrentPlayingUrl(`https://player-widget.mixcloud.com/widget/iframe/?hide_cover=1&mini=1&light=1&feed=${encodeURIComponent(item.key)}`);
  };

  // Stop playback
  const stopPlayback = () => {
    setIsPlaying(false);
    setMiniPlayerVisible(false);
    setActiveTileIndex(null);
  };

  // Add a method to handle navigation
  const handleNavigation = () => {
    // Preserve the current state without toggling anything
    if (currentTrack && miniPlayerVisible) {
      setMiniPlayerVisible(true);
    }
  };

  return (
    <PlayerContext.Provider value={{
      // MixCloud Player context
      currentTrack,
      activeTileIndex,
      isPlaying,
      miniPlayerVisible,
      currentPlayingUrl,
      handleTilePress,
      stopPlayback,
      
      // Top Banner Radio context
      isHeaderPlaying,
      isLoadingHeader,
      toggleHeaderSound,
      liveInfo,
      handleNavigation,
    }}>
      {children}
    </PlayerContext.Provider>
  );
}

// Custom hook
export function usePlayer() {
  const context = useContext(PlayerContext);
  if (!context) {
    throw new Error('usePlayer must be used within a PlayerContextProvider');
  }
  return context;
}

export default PlayerContextProvider; 