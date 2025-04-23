import React, { useRef, useEffect, useState } from 'react';
import { 
  View, 
  StyleSheet, 
  TouchableOpacity,
  Platform,
  Animated,
  Easing,
  Text
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { WebView } from 'react-native-webview';
import { usePlayer } from '../app/context/PlayerContext';
import { BRAND_COLORS } from '../app/styles/brandColors';

const MiniPlayer = () => {
  const { 
    currentTrack, 
    miniPlayerVisible, 
    currentPlayingUrl, 
    stopPlayback,
    isPlaying,
    togglePlayback,
    webViewRef,
    handleWebViewPlayStateChange
  } = usePlayer();
  
  const animatedValue = useRef(new Animated.Value(0)).current;
  const [textWidth, setTextWidth] = useState(0);
  const [containerWidth, setContainerWidth] = useState(0);
  const animationRef = useRef(null);
  const [webViewLoading, setWebViewLoading] = useState(true);
  
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
    
    // Duration based on text width - longer text = slower scroll
    const duration = Math.max(10000, textWidth * 50);
    
    // Create the animation
    animationRef.current = Animated.loop(
      Animated.timing(animatedValue, {
        toValue: -textWidth,
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
  
  // JavaScript to inject into the WebView to monitor play/pause events
  const injectedJavaScript = `
    (function() {
      // Create a more efficient interface
      window.MixcloudPlayer = {
        isPlaying: false,
        
        setupListeners: function() {
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
          const button = document.querySelector('.play-button, .player-control');
          if (button && !this.isPlaying) button.click();
        },
        
        pause: function() {
          const button = document.querySelector('.play-button, .player-control');
          if (button && this.isPlaying) button.click();
        }
      };
      
      // Initialize when player is ready
      document.addEventListener('DOMContentLoaded', () => {
        // Wait a bit for the player to fully initialize
        setTimeout(() => window.MixcloudPlayer.setupListeners(), 1000);
      });
      
      // Handle messages from React Native
      window.addEventListener('message', (event) => {
        const command = event.data;
        if (command === 'play') window.MixcloudPlayer.play();
        else if (command === 'pause') window.MixcloudPlayer.pause();
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
  
  if (!miniPlayerVisible || !currentTrack || !currentPlayingUrl) {
    return null;
  }
  
  // Create a continuous title string with a spacer between repetitions
  const fullTitle = title + '     ' + title;
  
  return (
    <View style={styles.container}>
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
                {/* Render each character separately to prevent ellipsis */}
                <View 
                  style={styles.textRow}
                  onLayout={(event) => {
                    if (textWidth === 0) {
                      setTextWidth(event.nativeEvent.layout.width);
                    }
                  }}
                >
                  {Array.from(fullTitle).map((char, index) => (
                    <Text key={index} style={styles.title}>
                      {char}
                    </Text>
                  ))}
                </View>
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
      
      {/* WebView for the player */}
      <WebView
        ref={webViewRef}
        source={{ uri: currentPlayingUrl }}
        style={[
          styles.webView,
          // Hide until loaded to prevent flashing
          webViewLoading ? styles.hiddenWebView : {}  
        ]}
        mediaPlaybackRequiresUserAction={false}
        allowsInlineMediaPlayback={true}
        javaScriptEnabled={true}
        injectedJavaScript={injectedJavaScript}
        onMessage={handleWebViewMessage}
        onError={(e) => console.error('WebView error:', e.nativeEvent)}
        onLoadStart={() => setWebViewLoading(true)}
        onLoadEnd={() => setWebViewLoading(false)}
      />
    </View>
  );
};

// Skeleton loader component
const MiniPlayerSkeleton = () => (
  <View style={styles.container}>
    <View style={styles.header}>
      <View style={styles.titleContainer}>
        <View style={[styles.skeletonTitle, styles.shimmer]} />
      </View>
      <View style={styles.closeButton}>
        <Ionicons name="close-circle" size={24} color="rgba(255,255,255,0.3)" />
      </View>
    </View>
    <View style={[styles.skeletonPlayer, styles.shimmer]} />
  </View>
);

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: Platform.OS === 'ios' ? 80 : 60,
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
    padding: 10,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 8,
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
  textRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  title: {
    fontSize: 16,
    fontWeight: 'bold',
    color: BRAND_COLORS.primaryText,
  },
  playButton: {
    padding: 4,
    marginRight: 8,
  },
  closeButton: {
    padding: 4,
  },
  webView: {
    height: 60,
    backgroundColor: 'transparent',
  },
  hiddenWebView: {
    opacity: 0,
  },
  skeletonTitle: {
    height: 16,
    width: '70%',
    backgroundColor: '#e0e0e0',
    borderRadius: 4,
  },
  skeletonPlayer: {
    height: 60,
    backgroundColor: '#e0e0e0',
  },
  shimmer: {
    opacity: 0.7,
  },
});

export default MiniPlayer;