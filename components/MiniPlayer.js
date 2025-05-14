import React, { useRef, useEffect, useState } from 'react';
import { 
  View, 
  StyleSheet, 
  TouchableOpacity,
  Platform,
  Animated,
  Easing,
  Text,
  Dimensions,
  Image
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { WebView } from 'react-native-webview';
import { usePlayer } from '../app/context/PlayerContext';
import { BRAND_COLORS } from '../app/styles/brandColors';
import SoundCloudLogo from '../assets/soundcloud_logo_black.png';
import MixcloudLogo from '../assets/mixcloud_logo.svg';
import { usePathname } from 'expo-router';
import SoundCloudPlayer from './SoundCloudPlayer';

const MiniPlayer = () => {
  const { 
    currentTrack, 
    miniPlayerVisible, 
    currentPlayingUrl, 
    stopPlayback,
    isPlaying,
    togglePlayback,
    webViewRef,
    handleWebViewPlayStateChange,
    isAirtimeStream,
    currentSource,
    isHeaderPlaying,
    getSourceLogo
  } = usePlayer();

  // Check if we're on the details screen
  const pathname = usePathname();
  const isDetailsScreen = pathname.includes('/(artists)/details');
  
  console.log('MiniPlayer:', {
    currentTrack,
    miniPlayerVisible,
    currentPlayingUrl,
    isAirtimeStream,
    currentSource,
    isDetailsScreen
  });
  
  const animatedValue = useRef(new Animated.Value(0)).current;
  const [textWidth, setTextWidth] = useState(0);
  const [containerWidth, setContainerWidth] = useState(0);
  const animationRef = useRef(null);
  const [webViewLoading, setWebViewLoading] = useState(true);
  const soundCloudPlayerRef = useRef(null);
  
  // Get title for header display
  const title = currentTrack?.name || currentTrack?.title || 'Now Playing';
  
  // Determine if text needs to scroll
  const needsToScroll = textWidth > containerWidth - 40 || title.length > 20;
  
  // Function to start the scrolling animation
  const startScrolling = () => {
    // Stop any existing animation
    if (animationRef.current) {
      animationRef.current.stop();
    }
    
    // Reset to initial position
    animatedValue.setValue(0);
    
    // Calculate the distance to scroll (container width + small extra)
    // This ensures the text doesn't completely disappear before looping back
    const scrollDistance = containerWidth + 20;
    
    // Duration based on text width - longer text = slower scroll
    const duration = Math.max(10000, scrollDistance * 40);
    
    // Create the animation
    animationRef.current = Animated.loop(
      Animated.timing(animatedValue, {
        toValue: -scrollDistance,
        duration: duration,
        easing: Easing.linear,
        useNativeDriver: true,
      })
    );
    
    // Start animation
    animationRef.current.start();
  };
  
  // Clean up animation
  const stopScrolling = () => {
    if (animationRef.current) {
      animationRef.current.stop();
      animationRef.current = null;
    }
  };
  
  // Start scrolling when track changes or player becomes visible
  useEffect(() => {
    if (miniPlayerVisible && needsToScroll && textWidth > 0) {
      // Add a small delay to ensure text width is calculated
      const timer = setTimeout(() => {
        startScrolling();
      }, 500);
      
      return () => {
        clearTimeout(timer);
        stopScrolling();
      };
    }
    
    return stopScrolling;
  }, [currentTrack, miniPlayerVisible, textWidth, containerWidth, needsToScroll]);
  
  // Clean up on unmount
  useEffect(() => {
    let isActive = true;
    
    return () => {
      isActive = false;
      
      // Cancel any pending animations
      stopScrolling();
      
      // Clear WebView reference
      if (webViewRef.current) {
        webViewRef.current = null;
      }
    };
  }, []);
  
  // Add a preloading mechanism
  useEffect(() => {
    if (currentPlayingUrl) {
      // Precache the iframe URL for faster loading
      const preloadUrl = currentPlayingUrl.replace('mini=1', 'mini=1&preload=1');
      fetch(preloadUrl)
        .then(response => response.text())
        .catch(error => console.log('Preload error:', error));
    }
  }, [currentPlayingUrl]);

  // Extract SoundCloud track ID from URL
  const extractSoundCloudTrackId = (url) => {
    if (!url || !url.includes('soundcloud.com')) return null;
    
    // For direct track URLs like https://soundcloud.com/username/track-name
    // This format returns the username/track-name format which works better with the widget
    const fullPathMatch = url.match(/soundcloud\.com\/([^\/]+\/[^\/\?]+)/);
    if (fullPathMatch && fullPathMatch[1]) {
      return fullPathMatch[1];
    }
    
    // For player URLs with track IDs
    const idMatch = url.match(/tracks\/(\d+)/);
    if (idMatch && idMatch[1]) {
      return idMatch[1];
    }
    
    return null;
  };
  
  // Handle SoundCloud player events
  const handleSoundCloudPlay = () => {
    handleWebViewPlayStateChange(true);
  };
  
  const handleSoundCloudPause = () => {
    handleWebViewPlayStateChange(false);
  };
  
  const handleSoundCloudEnded = () => {
    handleWebViewPlayStateChange(false);
  };
  
  // Handle SoundCloud player errors
  const handleSoundCloudError = (error) => {
    console.error('SoundCloud player error:', error);
    // You could add more error handling here if needed
  };
  
  // JavaScript to inject into the WebView to monitor play/pause events
  const injectedJavaScript = `
    (function() {
      // Create a more efficient interface for both players
      window.PlayerInterface = {
        isPlaying: false,
        
        setupListeners: function() {
          // Check if this is SoundCloud or Mixcloud
          const isSoundCloud = window.location.href.includes('soundcloud.com');
          
          if (isSoundCloud) {
            // SoundCloud player setup
            this.setupSoundCloudListeners();
          } else {
            // Mixcloud player setup (existing code)
            this.setupMixcloudListeners();
          }
        },
        
        setupSoundCloudListeners: function() {
          // Wait for SoundCloud widget API to be available
          const checkForWidget = setInterval(() => {
            if (window.SC && window.SC.Widget) {
              clearInterval(checkForWidget);
              
              try {
                // Get the iframe element
                const iframeElement = document.querySelector('iframe');
                if (!iframeElement) {
                  console.error('SoundCloud iframe not found');
                  return;
                }
                
                // Initialize the widget
                const widget = SC.Widget(iframeElement);
                
                // Set up event listeners
                widget.bind(SC.Widget.Events.PLAY, () => {
                  this.isPlaying = true;
                  this.sendState();
                });
                
                widget.bind(SC.Widget.Events.PAUSE, () => {
                  this.isPlaying = false;
                  this.sendState();
                });
                
                widget.bind(SC.Widget.Events.FINISH, () => {
                  this.isPlaying = false;
                  this.sendState();
                });
                
                // Store widget reference for play/pause controls
                window.scWidget = widget;
                
                // Get initial state
                widget.isPaused((isPaused) => {
                  this.isPlaying = !isPaused;
                  this.sendState();
                });
              } catch (e) {
                console.error('Error setting up SoundCloud widget:', e);
              }
            }
          }, 500);
        },
        
        setupMixcloudListeners: function() {
          // More efficient event listeners with throttling
          const playPauseButton = document.querySelector('.play-button, .player-control');
          if (playPauseButton) {
            // Use MutationObserver instead of polling
            const observer = new MutationObserver((mutations) => {
              for (const mutation of mutations) {
                const newState = playPauseButton.classList.contains('playing');
                if (this.isPlaying !== newState) {
                  this.isPlaying = newState;
                  this.sendState();
                }
              }
            });
            
            observer.observe(playPauseButton, { 
              attributes: true, 
              attributeFilter: ['class'] 
            });
            
            // Initial state
            this.isPlaying = playPauseButton.classList.contains('playing');
            this.sendState();
          }
        },
        
        sendState: function() {
          window.ReactNativeWebView.postMessage(JSON.stringify({
            type: 'playStateChange',
            isPlaying: this.isPlaying
          }));
        },
        
        play: function() {
          const isSoundCloud = window.location.href.includes('soundcloud.com');
          
          if (isSoundCloud && window.scWidget) {
            window.scWidget.play();
          } else {
            const button = document.querySelector('.play-button, .player-control');
            if (button && !this.isPlaying) button.click();
          }
        },
        
        pause: function() {
          const isSoundCloud = window.location.href.includes('soundcloud.com');
          
          if (isSoundCloud && window.scWidget) {
            window.scWidget.pause();
          } else {
            const button = document.querySelector('.play-button, .player-control');
            if (button && this.isPlaying) button.click();
          }
        }
      };
      
      // Initialize when player is ready
      document.addEventListener('DOMContentLoaded', () => {
        // Wait a bit for the player to fully initialize
        setTimeout(() => window.PlayerInterface.setupListeners(), 1000);
      });
      
      // Handle messages from React Native
      window.addEventListener('message', (event) => {
        const command = event.data;
        if (command === 'play') window.PlayerInterface.play();
        else if (command === 'pause') window.PlayerInterface.pause();
      });
    })();
  `;

  // Handle WebView messages
  const handleWebViewMessage = (event) => {
    try {
      const data = JSON.parse(event.nativeEvent.data);
      if (data.type === 'playStateChange') {
        handleWebViewPlayStateChange(data.isPlaying);
      }
    } catch (error) {
      console.error('Error parsing WebView message:', error);
    }
  };
  
  // Effect to sync refs between components
  useEffect(() => {
    if (currentSource === 'soundcloud' && soundCloudPlayerRef.current) {
      // Expose SoundCloudPlayer methods to webViewRef for consistent API
      webViewRef.current = {
        injectJavaScript: (script) => {
          try {
            if (script.includes('play')) {
              soundCloudPlayerRef.current.play();
            } else if (script.includes('pause')) {
              soundCloudPlayerRef.current.pause();
            } else if (script.includes('toggle')) {
              soundCloudPlayerRef.current.toggle();
            }
          } catch (error) {
            console.error('Error calling SoundCloud player method:', error);
          }
          return true;
        }
      };
    }
  }, [currentSource, soundCloudPlayerRef.current]);
  
  if (!miniPlayerVisible || !currentTrack) {
    return null;
  }
  
  // Extract track ID for SoundCloud
  const soundCloudTrackId = currentSource === 'soundcloud' ? 
    currentTrack.soundcloudId || extractSoundCloudTrackId(currentTrack.soundcloudUrl || currentPlayingUrl) : 
    null;
  
  console.log('MiniPlayer Debug:', { 
    currentSource, 
    soundCloudTrackId,
    trackId: currentTrack.soundcloudId,
    trackUrl: currentTrack.soundcloudUrl,
    currentPlayingUrl
  });
  
  return (
    <View style={[
      styles.container,
      isDetailsScreen && styles.detailsContainer
    ]}>
      <View style={styles.header}>
      {/* Title container */}
      <View 
        style={styles.titleContainer}
        onLayout={(event) => {
          setContainerWidth(event.nativeEvent.layout.width);
        }}
      >
        {needsToScroll ? (
          // Scrolling text implementation
          <View style={styles.marqueeWrapper}>
            <Animated.View 
              style={[
                styles.marqueeTextWrapper,
                {
                  transform: [{ translateX: animatedValue }]
                }
              ]}
            >
              {/* First copy of the title */}
              <Text 
                style={styles.title}
                onLayout={(event) => {
                  if (textWidth === 0) {
                    setTextWidth(event.nativeEvent.layout.width);
                  }
                }}
              >
                {title}
              </Text>
              
              {/* Gap between repetitions */}
              <Text style={styles.title}>        </Text>
              
              {/* Second copy of the title */}
              <Text style={styles.title}>{title}</Text>
              
              {/* Gap at the end */}
              <Text style={styles.title}>        </Text>
            </Animated.View>
          </View>
        ) : (
          // Static text for short titles
          <Text style={styles.title} numberOfLines={1}>{title}</Text>
        )}
      </View>
      
      {/* Close button */}
      <TouchableOpacity 
        style={styles.closeButton}
        onPress={stopPlayback}
      >
        <Ionicons name="close-circle" size={24} color={BRAND_COLORS.primaryText} />
      </TouchableOpacity>
    </View>
    
    {/* Conditional rendering based on stream type */}
    {isAirtimeStream ? (
      // Airtime Stream - Show custom control bar
      <View style={styles.controlBar}>
        {/* Play/pause button */}
        <TouchableOpacity 
          style={styles.playButton}
          onPress={togglePlayback}
        >
          <Ionicons 
            name={isPlaying ? "pause" : "play"} 
            size={24} 
            color={BRAND_COLORS.accent} 
          />
        </TouchableOpacity>
        
        {/* Source indicator */}
        <Text style={styles.sourceText}>Live Radio Stream</Text>
      </View>
    ) : currentSource === 'soundcloud' ? (
      // SoundCloud Stream - Use SoundCloudPlayer component
      <View style={styles.soundCloudContainer}>
        <SoundCloudPlayer
          ref={soundCloudPlayerRef}
          trackId={currentTrack.soundcloudId || soundCloudTrackId || ''}
          onReady={() => setWebViewLoading(false)}
          onPlay={handleSoundCloudPlay}
          onPause={handleSoundCloudPause}
          onEnded={handleSoundCloudEnded}
          onError={handleSoundCloudError}
        />
      </View>
    ) : (
      // Mixcloud Stream - Show WebView
      <WebView
        ref={webViewRef}
        source={{ 
          uri: currentPlayingUrl,
          headers: {
            'Referer': 'https://voicesradio.co.uk/'
          }
        }}
        style={{ height: 65, backgroundColor: BRAND_COLORS.background, marginBottom: 0 }}
        onError={e => {
          console.error('WebView error:', e.nativeEvent);
        }}
        onLoad={() => {
          console.log('WebView loaded:', currentPlayingUrl);
          setWebViewLoading(false);
        }}
        javaScriptEnabled={true}
        allowsInlineMediaPlayback={true}
        mediaPlaybackRequiresUserAction={false}
        scrollEnabled={false}
        bounces={false}
        onMessage={handleWebViewMessage}
        injectedJavaScript={injectedJavaScript}
      />
    )}
  </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: Platform.OS === 'ios' ? 79 : 59,
    left: 0,
    right: 0,
    backgroundColor: BRAND_COLORS.background,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: -2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
    borderTopWidth: 1,
    borderTopColor: 'rgba(19, 18, 0, 0.1)',
    padding: 0,
    paddingTop: 10,
    zIndex: 998,
  },
  detailsContainer: {
    bottom: Platform.OS === 'ios' ? 109 : 89,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 8,
    paddingBottom: 4,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  titleContainer: {
    flex: 1,
    height: 24,
    marginRight: 8,
    overflow: 'hidden',
  },
  marqueeWrapper: {
    height: '100%',
    overflow: 'hidden',
  },
  marqueeTextWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  title: {
    fontSize: 16,
    fontWeight: 'bold',
    color: BRAND_COLORS.primaryText,
  },
  playButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.05)',
  },
  closeButton: {
    padding: 4,
  },
  controlBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: BRAND_COLORS.background,
    height: 80, // Match the WebView height
  },
  sourceText: {
    marginLeft: 12,
    fontSize: 14,
    color: BRAND_COLORS.secondaryText || '#999',
  },
  soundCloudContainer: {
    height: 80,
    backgroundColor: BRAND_COLORS.background,
  }
});

export default MiniPlayer;