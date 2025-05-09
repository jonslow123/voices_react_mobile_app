import React, { createContext, useContext, useState, useRef, useEffect } from 'react';
import { createAudioPlayer, AudioModule } from 'expo-audio';
import { Alert, Platform, Image } from 'react-native';
import { fetchWithCache } from '../utils/apiCache';
import SoundCloudAPI from '../utils/soundcloudAPI';

const PlayerContext = createContext(null);

export function PlayerContextProvider({ children }) {
  const [currentTrack, setCurrentTrack] = useState(null);
  const [activeTileIndex, setActiveTileIndex] = useState(null);
  const [activeTileId, setActiveTileId] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [miniPlayerVisible, setMiniPlayerVisible] = useState(false);
  const [currentPlayingUrl, setCurrentPlayingUrl] = useState('');
  
  // Add a state to track if the current mini player is showing an Airtime stream
  const [isAirtimeStream, setIsAirtimeStream] = useState(false);
  
  // Top Banner Radio state
  const [isHeaderPlaying, setIsHeaderPlaying] = useState(false);
  const [isLoadingHeader, setIsLoadingHeader] = useState(false);
  const [liveInfo, setLiveInfo] = useState({ current: { title: 'Voices Radio' } });
  const headerAudioRef = useRef(null);
  const webViewRef = useRef(null);

  // Add source state to track where the content is from
  const [currentSource, setCurrentSource] = useState(null); // 'mixcloud' or 'soundcloud'

  // Set up audio session for background playback
  useEffect(() => {
    const setupBackgroundAudio = async () => {
      try {
        // Configure audio mode for background playback
        await AudioModule.setAudioModeAsync({
          playsInSilentModeIOS: true,
          allowsRecordingIOS: false,
          staysActiveInBackground: true,
          interruptionModeIOS: 1, // INTERRUPTION_MODE_IOS_DUCK_OTHERS
          shouldDuckAndroid: true,
          interruptionModeAndroid: 1, // INTERRUPTION_MODE_ANDROID_DUCK_OTHERS
          playThroughEarpieceAndroid: false
        });
        
        console.log('Background audio setup complete');
      } catch (error) {
        console.error('Error setting up background audio:', error);
      }
    };

    setupBackgroundAudio();
    fetchLiveInfo();
    const interval = setInterval(fetchLiveInfo, 60000); // Update every minute
    preloadCommonData();
    
    return () => {
      clearInterval(interval);
      // Clean up audio
      if (headerAudioRef.current) {
        headerAudioRef.current.remove();
      }
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
          // Set audio mode to ignore silent switch
          await AudioModule.setAudioModeAsync({
            playsInSilentModeIOS: true,
            allowsRecordingIOS: false,
            staysActiveInBackground: true, 
            shouldDuckAndroid: true,
            playThroughEarpieceAndroid: false
          });
          
          // Clear any existing player
          if (headerAudioRef.current) {
            await headerAudioRef.current.remove();
          }
          
          // Create a new player
          headerAudioRef.current = createAudioPlayer({
            uri: 'https://voicesradio.out.airtime.pro/voicesradio_a'
          });
          
          // Set up event listener
          headerAudioRef.current.addEventListener('playbackStatusUpdate', (status) => {
            if (status.isLoaded) {
              setIsPlaying(status.playing);
              setIsHeaderPlaying(status.playing);
            } else if (status.error) {
              console.error('Playback error:', status.error);
              setIsHeaderPlaying(false);
            }
          });
          
          // Start playback
          await headerAudioRef.current.play();
          console.log('Started playing radio stream');
        } catch (error) {
          console.error('Error playing radio stream:', error);
          setIsHeaderPlaying(false);
          
          Alert.alert('Playback Error', 'Unable to play the radio stream. Please try again later.');
        }
      } else {
        // Pause/stop the stream
        if (headerAudioRef.current) {
          await headerAudioRef.current.pause();
          await headerAudioRef.current.remove();
          headerAudioRef.current = null;
        }
        console.log('Stopped radio stream');
      }
    } catch (error) {
      console.error('Error in toggleHeaderSound:', error);
      setIsHeaderPlaying(false);
    } finally {
      setIsLoadingHeader(false);
    }
  };

  // Function to handle tile press from any screen
  const handleTilePress = (tileData) => {
    // First, stop any Airtime stream that might be playing
    if (isHeaderPlaying || isAirtimeStream) {
      // Stop the Airtime stream explicitly
      if (headerAudioRef.current) {
        try {
          if (typeof headerAudioRef.current.pauseAsync === 'function') {
            headerAudioRef.current.pauseAsync();
          } else if (typeof headerAudioRef.current.pause === 'function') {
            headerAudioRef.current.pause();
          }
          
          if (typeof headerAudioRef.current.unloadAsync === 'function') {
            headerAudioRef.current.unloadAsync();
          } else if (typeof headerAudioRef.current.unload === 'function') {
            headerAudioRef.current.unload();
          } else if (typeof headerAudioRef.current.remove === 'function') {
            headerAudioRef.current.remove();
          }
        } catch (error) {
          console.log('Error stopping Airtime stream:', error);
        }
        headerAudioRef.current = null;
      }
      
      // Update state to reflect Airtime stream is stopped
      setIsHeaderPlaying(false);
      setIsAirtimeStream(false);
    }
    
    // Now update with new track data
    setCurrentTrack(tileData);
    setCurrentPlayingUrl(tileData.iframeUrl || tileData.streamUrl);
    setMiniPlayerVisible(true);
    
    // Set the source based on the tileData
    if (tileData.source) {
      setCurrentSource(tileData.source);
    } else if (tileData.iframeUrl && tileData.iframeUrl.includes('mixcloud.com')) {
      setCurrentSource('mixcloud');
    } else if (tileData.iframeUrl && tileData.iframeUrl.includes('soundcloud.com')) {
      setCurrentSource('soundcloud');
    } else {
      setCurrentSource(null);
    }
  };

  // Toggle play/pause state
  const togglePlayback = () => {
    if (isAirtimeStream) {
      toggleAirtimePlayback();
    } else {
      // Handle normal Mixcloud playback
      if (webViewRef.current) {
        const command = isPlaying ? 'pause' : 'play';
        webViewRef.current.injectJavaScript(`
          if (window.MixcloudPlayer && typeof window.MixcloudPlayer.${command} === 'function') { 
            window.MixcloudPlayer.${command}();
          }
          true;
        `);
      }
    }
  };

  // Handle play state changes from the WebView
  const handleWebViewPlayStateChange = (isPlaying) => {
    setIsPlaying(isPlaying);
  };

  // Stop playback
  const stopPlayback = async () => {
    try {
      if (isAirtimeStream) {
        try {
          if (headerAudioRef.current) {
            // Try each method with try/catch to avoid stopping on errors
            try {
              if (typeof headerAudioRef.current.pauseAsync === 'function') {
                await headerAudioRef.current.pauseAsync();
              } else if (typeof headerAudioRef.current.pause === 'function') {
                await headerAudioRef.current.pause();
              }
            } catch (pauseErr) {
              console.log('Pause error (non-critical):', pauseErr);
            }
            
            try {
              if (typeof headerAudioRef.current.stopAsync === 'function') {
                await headerAudioRef.current.stopAsync();
              } else if (typeof headerAudioRef.current.stop === 'function') {
                await headerAudioRef.current.stop();
              }
            } catch (stopErr) {
              console.log('Stop error (non-critical):', stopErr);
            }
            
            try {
              if (typeof headerAudioRef.current.unloadAsync === 'function') {
                await headerAudioRef.current.unloadAsync();
              } else if (typeof headerAudioRef.current.unload === 'function') {
                await headerAudioRef.current.unload();
              } else if (typeof headerAudioRef.current.remove === 'function') {
                await headerAudioRef.current.remove();
              }
            } catch (unloadErr) {
              console.log('Unload error (non-critical):', unloadErr);
            }
          }
        } catch (error) {
          console.log('General error stopping Airtime audio (non-critical):', error);
        } finally {
          // Always set this to null to prevent further attempts to use it
          headerAudioRef.current = null;
        }
      }
      
      // For Mixcloud tracks
      if (webViewRef.current && !isAirtimeStream) {
        webViewRef.current.injectJavaScript(`
          if (window.MixcloudPlayer && typeof window.MixcloudPlayer.pause === 'function') { 
            window.MixcloudPlayer.pause();
          }
          true;
        `);
      }
      
      // Reset player state
      setIsPlaying(false);
      setIsHeaderPlaying(false);
      setMiniPlayerVisible(false);
      setCurrentTrack(null);
      setIsAirtimeStream(false);
    } catch (error) {
      console.error('Error in stopPlayback:', error);
      // Reset state values even if there's an error
      setIsPlaying(false);
      setIsHeaderPlaying(false);
      setMiniPlayerVisible(false);
      setCurrentTrack(null); 
      setIsAirtimeStream(false);
      headerAudioRef.current = null;
    }
  };

  // Add a method to handle navigation
  const handleNavigation = () => {
    // Preserve the current state without toggling anything
    if (currentTrack && miniPlayerVisible) {
      setMiniPlayerVisible(true);
    }
  };

  // Add a function to handle Airtime stream in the mini player
  const handleAirtimeStream = async (showInfo, artistImage) => {
    try {
      // Stop any current playback
      if (miniPlayerVisible) {
        if (!isAirtimeStream) {
          stopPlayback();
        } else if (isPlaying) {
          // Just toggle existing stream rather than restarting
          toggleAirtimePlayback();
          return;
        }
      }
      
      setIsLoadingHeader(true);
      
      // Create the track object
      const airtimeTrack = {
        _id: 'airtime-stream',
        title: showInfo.title || 'Voices Radio Live',
        imageUrl: artistImage || require('../../assets/logo.png'),
        isAirtimeStream: true
      };
      
      // Update player state
      setCurrentTrack(airtimeTrack);
      setIsAirtimeStream(true);
      setMiniPlayerVisible(true);
      
      // Unload any existing audio
      if (headerAudioRef.current) {
        try {
          // Different approach for cleanup depending on what methods are available
          if (typeof headerAudioRef.current.unload === 'function') {
            await headerAudioRef.current.unload();
          } else if (typeof headerAudioRef.current.remove === 'function') {
            await headerAudioRef.current.remove();
          } else if (typeof headerAudioRef.current.stopAsync === 'function') {
            await headerAudioRef.current.stopAsync();
          }
        } catch (cleanupError) {
          console.log('Non-critical cleanup error:', cleanupError);
        }
        headerAudioRef.current = null;
      }
      
      try {
        // Create new audio player with the streaming URL
        // Using expo-av Audio as a fallback
        const { Audio } = require('expo-av');
        
        // Create sound object
        const { sound } = await Audio.Sound.createAsync(
          { uri: 'https://voicesradio.out.airtime.pro/voicesradio_a' },
          { shouldPlay: true },
          (status) => {
            // This is the status update callback
            if (status.isLoaded) {
              setIsPlaying(status.isPlaying);
              setIsHeaderPlaying(status.isPlaying);
            } else if (status.error) {
              console.error('Playback error:', status.error);
              handlePlaybackError();
            }
          }
        );
        
        headerAudioRef.current = sound;
        
        setIsPlaying(true);
        setIsHeaderPlaying(true);
      } catch (audioError) {
        console.error('Error creating audio player:', audioError);
        throw audioError;
      }
    } catch (error) {
      console.error('Error in handleAirtimeStream:', error);
      handlePlaybackError();
    } finally {
      setIsLoadingHeader(false);
    }
  };
  
  // Handle playback errors with recovery attempt
  const handlePlaybackError = async () => {
    setIsPlaying(false);
    setIsHeaderPlaying(false);
    
    try {
      // Wait a moment before attempting recovery
      setTimeout(async () => {
        if (currentTrack?.isAirtimeStream) {
          console.log('Attempting to recover stream playback...');
          
          try {
            // Clean up any existing player
            if (headerAudioRef.current) {
              try {
                if (typeof headerAudioRef.current.unload === 'function') {
                  await headerAudioRef.current.unload();
                } else if (typeof headerAudioRef.current.remove === 'function') {
                  await headerAudioRef.current.remove();
                }
              } catch (e) {
                console.log('Cleanup error during recovery (non-critical):', e);
              }
            }
            
            // Create a fresh player using expo-av
            const { Audio } = require('expo-av');
            
            // Create sound object
            const { sound } = await Audio.Sound.createAsync(
              { uri: 'https://voicesradio.out.airtime.pro/voicesradio_a' },
              { shouldPlay: true },
              (status) => {
                // Status update callback
                if (status.isLoaded) {
                  setIsPlaying(status.isPlaying);
                  setIsHeaderPlaying(status.isPlaying);
                }
              }
            );
            
            headerAudioRef.current = sound;
            
            // Update state if successful
            setIsPlaying(true);
            setIsHeaderPlaying(true);
            
            console.log('Stream playback recovered successfully');
          } catch (innerError) {
            console.error('Inner recovery error:', innerError);
          }
        }
      }, 2000);
    } catch (recoveryError) {
      console.error('Recovery attempt failed:', recoveryError);
      Alert.alert('Playback Error', 'Unable to play the radio stream. Please try again later.');
    }
  };
  
  // Toggle Airtime playback with the correct API
  const toggleAirtimePlayback = async () => {
    try {
      if (isPlaying) {
        // Pause playback
        if (headerAudioRef.current) {
          // Using pauseAsync from expo-av Sound API
          if (typeof headerAudioRef.current.pauseAsync === 'function') {
            await headerAudioRef.current.pauseAsync();
          } else if (typeof headerAudioRef.current.pause === 'function') {
            await headerAudioRef.current.pause();
          } else {
            console.error("No pause method found on audio player");
          }
        }
        setIsPlaying(false);
        setIsHeaderPlaying(false);
      } else {
        // Resume playback
        if (headerAudioRef.current) {
          // Using playAsync from expo-av Sound API
          if (typeof headerAudioRef.current.playAsync === 'function') {
            await headerAudioRef.current.playAsync();
          } else if (typeof headerAudioRef.current.play === 'function') {
            await headerAudioRef.current.play();
          } else {
            console.error("No play method found on audio player");
          }
        }
        setIsPlaying(true);
        setIsHeaderPlaying(true);
      }
    } catch (error) {
      console.error('Error toggling Airtime playback:', error);
      
      // If there's an error during toggling, recreate the player
      try {
        // If we can't toggle, let's create a new player
        if (headerAudioRef.current) {
          try {
            // Try to clean up the existing player
            if (typeof headerAudioRef.current.unloadAsync === 'function') {
              await headerAudioRef.current.unloadAsync();
            } else if (typeof headerAudioRef.current.unload === 'function') {
              await headerAudioRef.current.unload();
            }
          } catch (cleanupError) {
            console.log("Cleanup error (non-critical):", cleanupError);
          }
        }
        
        // Create new player and immediately set the desired play state
        const { Audio } = require('expo-av');
        const { sound } = await Audio.Sound.createAsync(
          { uri: 'https://voicesradio.out.airtime.pro/voicesradio_a' },
          { shouldPlay: !isPlaying }, // Play if it was paused, don't play if it was playing
          (status) => {
            if (status.isLoaded) {
              setIsPlaying(status.isPlaying);
              setIsHeaderPlaying(status.isPlaying);
            }
          }
        );
        
        headerAudioRef.current = sound;
        
        // Update state based on the new player's state
        if (!isPlaying) {
          setIsPlaying(true);
          setIsHeaderPlaying(true);
        } else {
          // If we were trying to pause, we need to explicitly pause the new player
          try {
            await sound.pauseAsync();
            setIsPlaying(false);
            setIsHeaderPlaying(false);
          } catch (pauseError) {
            console.error("Error pausing new player:", pauseError);
          }
        }
      } catch (recoveryError) {
        console.error("Recovery failed during toggle:", recoveryError);
        Alert.alert("Playback Error", "Unable to control playback. Please try again.");
      }
    }
  };

  // Update now playing info for iOS
  const updateNowPlayingInfo = async (track) => {
    if (Platform.OS !== 'ios') return;
    
    try {
      await AudioModule.setAudioModeAsync({
        // Ensure we're still in background mode
        playsInSilentModeIOS: true,
        staysActiveInBackground: true
      });

      const showTitle = track?.title || liveInfo.current.title || 'Voices Radio';
      const imageUrl = track?.imageUrl || require('../../assets/logo.png');
      
      // Set the iOS now playing info
      await AudioModule.setCurrentPlaybackInfoAsync({
        title: showTitle,
        artist: 'Voices Radio',
        artwork: imageUrl,
        duration: 0, // Live stream, no duration
        elapsedTime: 0,
        isLiveStream: true,
        // Optional: add album and source info
        album: 'Live Radio',
        source: 'Voices Radio'
      });
      
      console.log('Now playing info updated:', showTitle);
    } catch (error) {
      console.error('Error updating now playing info:', error);
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

  // Toggle Airtime stream using Expo Audio
  const toggleAirtimeStream = async (showInfo, artistImage) => {
    try {
      // Create the show info object with current show details
      if (!showInfo) {
        showInfo = {
          title: decodeHTMLEntities(currentShowName || 'Voices Radio Live')
        };
      }
      
      // Make sure miniPlayerVisible is set to true
      setMiniPlayerVisible(true);
      
      // Pass the current artist image as well
      handleAirtimeStream(showInfo, artistImage);
    } catch (error) {
      console.error('Error in toggleAirtimeStream:', error);
      Alert.alert('Playback Error', 'Unable to play the radio stream. Please try again later.');
    }
  };

  // Add this function to get the appropriate logo
  const getSourceLogo = () => {
    if (currentSource === 'soundcloud') {
      return require('../../assets/soundcloud_logo_black.png'); // You'll need to add this asset
    }
    return require('../../assets/mixcloud_logo.svg'); // Your existing Mixcloud logo
  };

  const [isLoading, setIsLoading] = useState(false);

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
      isAirtimeStream,
      handleAirtimeStream,
      
      // New source state
      currentSource,
      getSourceLogo,
      isLoading,
      setIsLoading,
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