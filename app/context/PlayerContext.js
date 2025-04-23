import React, { createContext, useContext, useState, useRef, useEffect } from 'react';
import { Audio } from 'expo-av';
import { Alert } from 'react-native';
import { fetchWithCache } from '../utils/apiCache';

const PlayerContext = createContext(null);

export function PlayerContextProvider({ children }) {
  const [currentTrack, setCurrentTrack] = useState(null);
  const [activeTileIndex, setActiveTileIndex] = useState(null);
  const [activeTileId, setActiveTileId] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [miniPlayerVisible, setMiniPlayerVisible] = useState(false);
  const [currentPlayingUrl, setCurrentPlayingUrl] = useState('');
  
  // Top Banner Radio state
  const [isHeaderPlaying, setIsHeaderPlaying] = useState(false);
  const [isLoadingHeader, setIsLoadingHeader] = useState(false);
  const [liveInfo, setLiveInfo] = useState({ current: { title: 'Voices Radio' } });
  const headerAudioRef = useRef(new Audio.Sound());
  const webViewRef = useRef(null);

  // Fetch live info on component mount
  useEffect(() => {
    // Set up audio mode to ignore silent switch
    const setupAudio = async () => {
      await Audio.setAudioModeAsync({
        playsInSilentModeIOS: true,
        allowsRecordingIOS: false,
        staysActiveInBackground: true,
        interruptionModeIOS: 1,      // Use numeric value instead of constant
        shouldDuckAndroid: true,
        interruptionModeAndroid: 1,   // Use numeric value instead of constant
        playThroughEarpieceAndroid: false
      });
    };
    
    setupAudio();
    fetchLiveInfo();
    const interval = setInterval(fetchLiveInfo, 60000); // Update every minute
    preloadCommonData();
    
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
      // First check if the sound is loaded
      let status;
      try {
        status = await headerAudioRef.current.getStatusAsync();
      } catch (statusError) {
        // If we can't get status, recreate the Sound object
        headerAudioRef.current = new Audio.Sound();
        return;
      }
      
      // Only attempt to stop and unload if the sound is loaded
      if (status.isLoaded) {
        try {
          await headerAudioRef.current.stopAsync();
        } catch (stopError) {
          console.log('Stop error (non-critical):', stopError);
        }
        
        try {
          await headerAudioRef.current.unloadAsync();
        } catch (unloadError) {
          console.log('Unload error, recreating Sound object:', unloadError);
          // If unloading fails, create a new Sound object
          headerAudioRef.current = new Audio.Sound();
        }
      }
    } catch (error) {
      console.log('Error in unloadHeaderAudio:', error);
      // Reset state and recreate Sound object if anything goes wrong
      headerAudioRef.current = new Audio.Sound();
      setIsHeaderPlaying(false);
      setIsLoadingHeader(false);
    }
  };

  // Function to play/pause header audio
  const toggleHeaderSound = async () => {
    try {
      if (miniPlayerVisible) {
        // Stop mini player if it's visible
        stopPlayback();
      }
      
      setIsLoadingHeader(true);
      
      // Toggle the playing state
      const newPlayingState = !isHeaderPlaying;
      setIsHeaderPlaying(newPlayingState);
      
      // Implement logic to play/pause the header stream
      if (newPlayingState) {
        // Play the stream
        try {
          // Ensure audio is properly unloaded first
          await unloadHeaderAudio();
          
          // Set audio mode to ignore silent switch
          await Audio.setAudioModeAsync({
            playsInSilentModeIOS: true,
            allowsRecordingIOS: false,
            staysActiveInBackground: true,
            interruptionModeIOS: 1,      // Use numeric value instead of constant
            shouldDuckAndroid: true,
            interruptionModeAndroid: 1,   // Use numeric value instead of constant
            playThroughEarpieceAndroid: false
          });
          
          // Check if the Sound object is in a valid state
          let needsNewSoundObject = false;
          try {
            const status = await headerAudioRef.current.getStatusAsync();
            if (status.isLoaded) {
              // Sound is still loaded despite unload attempt
              needsNewSoundObject = true;
            }
          } catch (statusError) {
            // If we can't get status, we need a new Sound object
            needsNewSoundObject = true;
          }
          
          // Create a new Sound object if needed
          if (needsNewSoundObject) {
            headerAudioRef.current = new Audio.Sound();
          }
          
          // Load and play the stream
          await headerAudioRef.current.loadAsync(
            { uri: 'https://voicesradio.out.airtime.pro/voicesradio_a' },
            { shouldPlay: true, volume: 1.0 }
          );
          
          // Ensure playback started
          await headerAudioRef.current.playAsync();
          console.log('Started playing radio stream');
        } catch (error) {
          console.error('Error playing radio stream:', error);
          setIsHeaderPlaying(false);
          
          // Try to recover by recreating the Sound object
          try {
            headerAudioRef.current = new Audio.Sound();
          } catch (recoveryError) {
            console.error('Failed to recover Sound object:', recoveryError);
          }
          
          Alert.alert('Playback Error', 'Unable to play the radio stream. Please try again later.');
        }
      } else {
        // Pause/stop the stream
        await unloadHeaderAudio();
        console.log('Stopped radio stream');
      }
    } catch (error) {
      console.error('Error in toggleHeaderSound:', error);
      setIsHeaderPlaying(false);
      
      // Try to recover by recreating the Sound object
      try {
        headerAudioRef.current = new Audio.Sound();
      } catch (recoveryError) {
        console.error('Failed to recover Sound object:', recoveryError);
      }
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
        // Create a new Sound object to ensure clean state
        headerAudioRef.current = new Audio.Sound();
      }
    };
  }, []);

  // Function to handle tile press from any screen
  const handleTilePress = (item, index) => {
    // Check if the same track is already playing
    if (currentTrack && currentTrack._id === item._id) {
      // Toggle play/pause if it's the same track
      togglePlayback();
    } else {
      // Start playing a new track
      setCurrentTrack(item);
      setActiveTileIndex(index);
      setActiveTileId(item._id);
      setMiniPlayerVisible(true);
      setCurrentPlayingUrl(item.iframeUrl);
      setIsPlaying(true);
      
      // Stop header sound if it's playing
      if (isHeaderPlaying) {
        setIsHeaderPlaying(false);
      }
    }
  };

  // Toggle play/pause state
  const togglePlayback = () => {
    const newPlayingState = !isPlaying;
    setIsPlaying(newPlayingState);
    
    // Send message to WebView to control playback
    if (webViewRef.current) {
      const message = newPlayingState ? 'play' : 'pause';
      webViewRef.current.postMessage(message);
    }
  };

  // Handle play state changes from the WebView
  const handleWebViewPlayStateChange = (isPlaying) => {
    setIsPlaying(isPlaying);
  };

  // Stop playback
  const stopPlayback = () => {
    setIsPlaying(false);
    setMiniPlayerVisible(false);
    setActiveTileIndex(null);
    setActiveTileId(null);
    setCurrentTrack(null);
    setCurrentPlayingUrl('');
  };

  // Add a method to handle navigation
  const handleNavigation = () => {
    // Preserve the current state without toggling anything
    if (currentTrack && miniPlayerVisible) {
      setMiniPlayerVisible(true);
    }
  };

  const preloadCommonData = async () => {
    try {
      // Preload top hosts in background
      fetchWithCache('https://api.mixcloud.com/VoicesRadio/hosts/?limit=5');
      
      // Preload featured or trending shows
      fetchWithCache('https://api.mixcloud.com/VoicesRadio/cloudcasts/?limit=5');
    } catch (error) {
      console.log('Preload error:', error);
    }
  };

  return (
    <PlayerContext.Provider value={{
      // MixCloud Player context
      currentTrack,
      activeTileIndex,
      activeTileId,
      isPlaying,
      miniPlayerVisible,
      currentPlayingUrl,
      handleTilePress,
      stopPlayback,
      togglePlayback,
      handleWebViewPlayStateChange,
      
      // Top Banner Radio context
      isHeaderPlaying,
      isLoadingHeader,
      toggleHeaderSound,
      liveInfo,
      handleNavigation,
      webViewRef,
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