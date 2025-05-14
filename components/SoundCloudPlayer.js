import React, { useRef, useState, useEffect, forwardRef, useImperativeHandle } from 'react';
import { View, StyleSheet, ActivityIndicator, Text } from 'react-native';
import { WebView } from 'react-native-webview';
import { BRAND_COLORS } from '../app/styles/brandColors';

const SoundCloudPlayer = forwardRef(({ trackId, onReady, onPlay, onPause, onEnded, onError }, ref) => {
  const webViewRef = useRef(null);
  const [loading, setLoading] = useState(true);
  const [errorState, setError] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);
  
  console.log('SoundCloudPlayer mounted with trackId:', trackId);
  
  // Expose methods via ref
  useImperativeHandle(ref, () => ({
    play: () => {
      webViewRef.current?.injectJavaScript(`
        try {
          if (window.player && typeof window.player.play === 'function') {
            window.player.play();
          }
        } catch(e) {
          console.error("Play error:", e);
        }
        true;
      `);
    },
    pause: () => {
      webViewRef.current?.injectJavaScript(`
        try {
          if (window.player && typeof window.player.pause === 'function') {
            window.player.pause();
          }
        } catch(e) {
          console.error("Pause error:", e);
        }
        true;
      `);
    },
    toggle: () => {
      webViewRef.current?.injectJavaScript(`
        try {
          if (window.player) {
            if (window.isPlaying) {
              window.player.pause();
            } else {
              window.player.play();
            }
          }
        } catch(e) {
          console.error("Toggle error:", e);
        }
        true;
      `);
    }
  }));
  
  // Check if we have a valid trackId
  useEffect(() => {
    if (!trackId) {
      const error = 'No track ID provided';
      setError(error);
      setLoading(false);
      if (onError) onError(error);
    } else {
      setError(null);
      
      // Add a timeout to hide the loading indicator after a few seconds
      // in case we don't receive the 'ready' message
      const timer = setTimeout(() => {
        setLoading(false);
      }, 5000);
      
      return () => clearTimeout(timer);
    }
  }, [trackId]);
  
  // Determine the correct URL for the embed
  const getEmbedUrl = (id) => {
    // If the ID is numeric, use it as a track ID
    if (/^\d+$/.test(id)) {
      return `https://api.soundcloud.com/tracks/${id}`;
    }
    
    // If it's a path (username/track-name), use it directly
    if (id.includes('/')) {
      return `https://soundcloud.com/${id}`;
    }
    
    // Default fallback
    return `https://api.soundcloud.com/tracks/${id}`;
  };
  
  // Create a direct iframe embed for SoundCloud
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <style>
        body, html {
          margin: 0;
          padding: 0;
          overflow: hidden;
          background: transparent;
          display: flex;
          align-items: center;
          justify-content: center;
          height: 100%;
          width: 100%;
        }
        iframe {
          width: 100%;
          height: 100%;
          border: none;
        }
        .error {
          color: #ff5500;
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
          padding: 10px;
          text-align: center;
          font-size: 14px;
        }
        .soundcloud-player {
          width: 100%;
          height: 100%;
          position: relative;
        }
      </style>
    </head>
    <body>
      <div id="player-container" class="soundcloud-player"></div>
      
      <script>
        // Track loading and playing state
        window.isPlaying = false;
        window.isLoaded = false;
        
        // Create a direct iframe and use it without requiring the SC Widget API
        function createDirectEmbed() {
          try {
            // Log the track we're trying to load
            console.log("Setting up direct SoundCloud embed for: ${trackId}");
            
            // First check if it's a numeric ID (more reliable)
            let trackUrl = '';
            const idNum = parseInt("${trackId}");
            
            if (!isNaN(idNum)) {
              // It's a numeric ID, use the API format
              trackUrl = "https://api.soundcloud.com/tracks/" + idNum;
            } else {
              // It's a path format, use the full URL
              trackUrl = "https://soundcloud.com/${trackId}";
            }
            
            console.log("Track URL:", trackUrl);
            
            // Create iframe element
            const container = document.getElementById('player-container');
            
            const iframe = document.createElement('iframe');
            
            // Configure iframe with SoundCloud parameters
            iframe.src = 'https://w.soundcloud.com/player/?url=' + encodeURIComponent(trackUrl) +
              '&color=%23ff5500' +
              '&auto_play=false' +
              '&hide_related=true' +
              '&show_comments=false' +
              '&show_user=true' +
              '&show_reposts=false' +
              '&show_teaser=false' +
              '&visual=false';
            
            iframe.allow = 'autoplay';
            iframe.id = 'soundcloud-iframe';
            
            // Add to container
            container.appendChild(iframe);
            
            // Notify React Native that the player is ready
            setTimeout(function() {
              window.ReactNativeWebView.postMessage(JSON.stringify({
                type: 'ready'
              }));
              window.isLoaded = true;
            }, 1000);
            
            return iframe;
          } catch (e) {
            console.error('Error creating direct embed:', e);
            document.getElementById('player-container').innerHTML = 
              '<div class="error">Error loading SoundCloud player: ' + e.message + '</div>';
            
            window.ReactNativeWebView.postMessage(JSON.stringify({
              type: 'error',
              error: e.message
            }));
            return null;
          }
        }
        
        function setupPlayerWithAPI(iframe) {
          try {
            if (!window.SC || !window.SC.Widget) {
              throw new Error('SoundCloud Widget API not loaded correctly');
            }
            
            // Initialize SoundCloud Widget API
            window.player = SC.Widget(iframe);
            
            // Set up event listeners
            window.player.bind(SC.Widget.Events.READY, function() {
              window.isLoaded = true;
              window.ReactNativeWebView.postMessage(JSON.stringify({
                type: 'ready'
              }));
            });
            
            window.player.bind(SC.Widget.Events.PLAY, function() {
              window.isPlaying = true;
              window.ReactNativeWebView.postMessage(JSON.stringify({
                type: 'play'
              }));
            });
            
            window.player.bind(SC.Widget.Events.PAUSE, function() {
              window.isPlaying = false;
              window.ReactNativeWebView.postMessage(JSON.stringify({
                type: 'pause'
              }));
            });
            
            window.player.bind(SC.Widget.Events.FINISH, function() {
              window.isPlaying = false;
              window.ReactNativeWebView.postMessage(JSON.stringify({
                type: 'ended'
              }));
            });
            
            window.player.bind(SC.Widget.Events.ERROR, function(error) {
              window.ReactNativeWebView.postMessage(JSON.stringify({
                type: 'error',
                error: JSON.stringify(error)
              }));
            });
          } catch (e) {
            console.error('Error setting up SoundCloud Widget API:', e);
            window.ReactNativeWebView.postMessage(JSON.stringify({
              type: 'error',
              error: 'SoundCloud Widget API error: ' + e.message
            }));
          }
        }
        
        // Main initialization function
        function init() {
          try {
            // Create the direct embed first
            const iframe = createDirectEmbed();
            if (!iframe) return;
            
            // Set up message handling for iframe events
            window.addEventListener('message', function(e) {
              if (e.origin === 'https://w.soundcloud.com') {
                try {
                  const data = JSON.parse(e.data);
                  
                  if (data.eventName === 'ready') {
                    window.isLoaded = true;
                    window.ReactNativeWebView.postMessage(JSON.stringify({
                      type: 'ready'
                    }));
                  }
                  
                  if (data.eventName === 'play') {
                    window.isPlaying = true;
                    window.ReactNativeWebView.postMessage(JSON.stringify({
                      type: 'play'
                    }));
                  }
                  
                  if (data.eventName === 'pause') {
                    window.isPlaying = false;
                    window.ReactNativeWebView.postMessage(JSON.stringify({
                      type: 'pause'
                    }));
                  }
                  
                  if (data.eventName === 'finish') {
                    window.isPlaying = false;
                    window.ReactNativeWebView.postMessage(JSON.stringify({
                      type: 'ended'
                    }));
                  }
                  
                  if (data.eventName === 'error') {
                    window.ReactNativeWebView.postMessage(JSON.stringify({
                      type: 'error',
                      error: JSON.stringify(data)
                    }));
                  }
                } catch (err) {
                  console.error('Error handling postMessage:', err);
                }
              }
            });
            
            // Try to use the SC Widget API if loaded
            if (window.SC && window.SC.Widget) {
              setupPlayerWithAPI(iframe);
            }
            
            // Set up a timeout to check if player loaded correctly
            setTimeout(function() {
              if (!window.isLoaded) {
                // If not loaded after 5 seconds, try to notify ready anyway
                // (we might not receive the ready event but the player might work)
                window.ReactNativeWebView.postMessage(JSON.stringify({
                  type: 'ready'
                }));
              }
            }, 3000);
            
          } catch (e) {
            console.error('Error in init:', e);
            document.getElementById('player-container').innerHTML = 
              '<div class="error">Error initializing SoundCloud player: ' + e.message + '</div>';
            
            window.ReactNativeWebView.postMessage(JSON.stringify({
              type: 'error',
              error: e.message
            }));
          }
        }
        
        // Start the initialization
        init();
        
        // Load SoundCloud Widget API (optional - we'll use direct embed if this fails)
        const scScript = document.createElement('script');
        scScript.src = 'https://w.soundcloud.com/player/api.js';
        scScript.onload = function() {
          if (window.SC && window.SC.Widget) {
            const iframe = document.getElementById('soundcloud-iframe');
            if (iframe) {
              setupPlayerWithAPI(iframe);
            }
          }
        };
        scScript.onerror = function(e) {
          console.warn('Failed to load SoundCloud API, using direct embed only:', e);
        };
        document.head.appendChild(scScript);
      </script>
    </body>
    </html>
  `;
  
  const handleMessage = (event) => {
    try {
      const data = JSON.parse(event.nativeEvent.data);
      console.log('SoundCloudPlayer message:', data);
      
      switch (data.type) {
        case 'ready':
          // When the player is ready, remove the loading spinner
          setLoading(false);
          setError(null);
          onReady && onReady();
          break;
        case 'play':
          // Once we're playing, clear any errors
          setIsPlaying(true);
          setError(null);
          onPlay && onPlay();
          break;
        case 'pause':
          setIsPlaying(false);
          onPause && onPause();
          break;
        case 'ended':
          setIsPlaying(false);
          onEnded && onEnded();
          break;
        case 'error':
          const errorMsg = data.error || 'Unknown error';
          // Don't set error state if we're already playing - might be a non-critical error
          if (!isPlaying) {
            setError(errorMsg);
          }
          setLoading(false);
          console.error('SoundCloud player error:', errorMsg);
          if (onError) onError(errorMsg);
          break;
      }
    } catch (error) {
      console.error('Error handling SoundCloud player message:', error);
      setError('Failed to parse player message');
      setLoading(false);
      if (onError) onError('Failed to parse player message');
    }
  };
  
  if (errorState && !trackId) {
    return (
      <View style={[styles.container, styles.errorContainer]}>
        <Text style={styles.errorText}>
          {errorState}
        </Text>
      </View>
    );
  }
  
  return (
    <View style={styles.container}>
      <WebView
        ref={webViewRef}
        originWhitelist={['*']}
        source={{ html }}
        style={styles.webView}
        onMessage={handleMessage}
        javaScriptEnabled={true}
        mediaPlaybackRequiresUserAction={false}
        allowsInlineMediaPlayback={true}
        scrollEnabled={false}
        bounces={false}
        onLoad={() => {
          // When the WebView loads, start a timer to hide the loading indicator
          setTimeout(() => {
            setLoading(false);
          }, 3000);
        }}
        onError={(e) => {
          const errorMsg = 'WebView error: ' + e.nativeEvent.description;
          console.error(errorMsg, e.nativeEvent);
          setError(errorMsg);
          setLoading(false);
          if (onError) onError(errorMsg);
        }}
      />
      
      {loading && (
        <View style={[styles.loadingContainer, { backgroundColor: 'rgba(0, 0, 0, 0.1)' }]}>
          <ActivityIndicator size="small" color={BRAND_COLORS.accent} />
        </View>
      )}
      
      {errorState && trackId && !isPlaying && (
        <View style={styles.errorOverlay}>
          <Text style={styles.errorText}>
            {errorState}
          </Text>
        </View>
      )}
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'transparent',
    position: 'relative',
    width: '100%',
  },
  webView: {
    backgroundColor: 'transparent',
    width: '100%',
  },
  loadingContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
  },
  errorContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    padding: 10,
  },
  errorOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    padding: 10,
  },
  errorText: {
    color: BRAND_COLORS.accent,
    fontSize: 14,
    textAlign: 'center',
    fontWeight: '500',
  }
});

export default SoundCloudPlayer;