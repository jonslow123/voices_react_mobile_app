import React, { useEffect, useState, useRef } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  Dimensions,
  ImageBackground,
  Platform,
  Modal,
  FlatList,
  ActivityIndicator,
  useWindowDimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { WebView } from 'react-native-webview';
import axios from 'axios';
import { usePlayer } from '../app/context/PlayerContext'; // Path with app prefix for context
import { useScroll } from '../app/context/ScrollContext';
import { useRouter, usePathname } from 'expo-router';
import { BRAND_COLORS } from '../app/styles/brandColors';
// Get screen width for responsive sizing
const { width, height } = Dimensions.get('window');
const TILE_SIZE = width / 2 - 12; // Two tiles per row with a small gap

// First, let's define our brand colors at the top of the file

// Extract the path from Mixcloud iframe URL to get API endpoint
const extractMixcloudPath = (iframeUrl) => {
  try {
    const feedParam = iframeUrl.split('feed=')[1];
    if (feedParam) {
      return decodeURIComponent(feedParam);
    }
    return null;
  } catch (e) {
    console.error('Error extracting Mixcloud path:', e);
    return null;
  }
};

// Fallback image if API request fails
const FALLBACK_IMAGE_URL = 'https://via.placeholder.com/600x600/007AFF/FFFFFF?text=Music';

const HomeScreen = () => {
  const { handleTilePress, activeTileId, isPlaying } = usePlayer();
  const [tiles, setTiles] = useState([]);
  const [liveInfo, setLiveInfo] = useState(null);
  const [isLoadingTiles, setIsLoadingTiles] = useState(true);
  const [headerSound, setHeaderSound] = useState(null);
  const [activeTileIndex, setActiveTileIndex] = useState(null);
  const [currentPlayingTitle, setCurrentPlayingTitle] = useState('');
  const [currentPlayingUrl, setCurrentPlayingUrl] = useState('');
  const webViewRef = useRef(null);
  const [sound, setSound] = useState(null);
  const [playerModalVisible, setPlayerModalVisible] = useState(false);
  const [loading, setLoading] = useState(false);
  const hiddenWebViewRef = useRef(null);
  const playbackInitialized = useRef(false);
  const flatListRef = useRef(null);
  const { updateScrollPosition, getScrollPosition } = useScroll();
  const pathname = usePathname();
  const [showLiveStream, setShowLiveStream] = useState(false);
  const [isLiveStreamPlaying, setIsLiveStreamPlaying] = useState(false);
  const liveStreamWebViewRef = useRef(null);
  const [showChat, setShowChat] = useState(false);
  const { width: windowWidth, height: windowHeight } = useWindowDimensions();
  const chatWebViewRef = useRef(null);

  // Fetch Mixcloud image URL using their API
  const fetchMixcloudData = async (mixcloudPath) => {
    if (!mixcloudPath) return null;
    
    try {
      // Remove leading slash if present for the API
      const path = mixcloudPath.startsWith('/') ? mixcloudPath.substring(1) : mixcloudPath;
      
      // Call the Mixcloud API
      const response = await axios.get(`https://api.mixcloud.com/${path}`);
      
      if (response.data) {
        // Extract genres from tags
        const genres = response.data.tags 
          ? response.data.tags.map(tag => tag.name).slice(0, 3) 
          : [];
        
        return {
          imageUrl: response.data.pictures?.extra_large,
          title: response.data.name || '',
          description: response.data.description || '',
          genres: genres
        };
      }
      return null;
    } catch (error) {
      console.error('Error fetching Mixcloud data:', error);
      return null;
    }
  };
  
  // Fetch show tiles from backend
  const fetchTiles = async () => {
    setIsLoadingTiles(true);
    try {
      const API_URL = `${process.env.EXPO_PUBLIC_BACKEND_URL}/api/featured-shows/getShows`;

      const response = await axios.get(API_URL);
      
      const initialTiles = response.data.map(tile => {
        const mixcloudPath = extractMixcloudPath(tile.iframeUrl);
        console.log("Extracted Mixcloud path:", mixcloudPath);
        
        return { 
          _id: tile._id,
          title: tile.title,
          imageUrl: null,
          key: mixcloudPath,
          mixcloudPath: mixcloudPath,
          iframeUrl: `https://player-widget.mixcloud.com/widget/iframe/?hide_cover=1&mini=1&light=1&feed=${encodeURIComponent(mixcloudPath)}`,
          genres: [] // Initialize empty genres array
        };
      });
      
      setTiles(initialTiles);
      
      // Then fetch each Mixcloud data in parallel
      const tileUpdatesPromises = initialTiles.map(async (tile, index) => {
        if (tile.mixcloudPath) {
          const mixcloudData = await fetchMixcloudData(tile.mixcloudPath);
          if (mixcloudData) {
            console.log("Mixcloud data for tile:", index, mixcloudData);
            return {
              index,
              updates: {
                imageUrl: mixcloudData.imageUrl,
                mixcloudTitle: mixcloudData.title,
                mixcloudDescription: mixcloudData.description,
                genres: mixcloudData.genres || [] // Add genres from the API response
              }
            };
          }
        }
        return { index, updates: { imageUrl: FALLBACK_IMAGE_URL, genres: [] } };
      });
      
      // Apply all updates once they're ready
      const tileUpdates = await Promise.all(tileUpdatesPromises);
      setTiles(currentTiles => {
        const newTiles = [...currentTiles];
        tileUpdates.forEach(update => {
          if (newTiles[update.index]) {
            newTiles[update.index] = {
              ...newTiles[update.index],
              ...update.updates
            };
          }
        });
        return newTiles;
      });
      
    } catch (error) {
      console.error('Error fetching tiles:', error);
      setTiles([]);
    } finally {
      setIsLoadingTiles(false);
    }
  };

  const fetchLiveInfo = async () => {
    try {
      const response = await fetch('https://voicesradio.airtime.pro/api/live-info-v2?timezone=${timeZone}');
      
      // Check if response is OK before parsing
      if (!response.ok) {
        throw new Error(`Server responded with ${response.status}: ${response.statusText}`);
      }
      
      // Check content type
      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        console.warn('Server response is not JSON:', contentType);
        // Try to get text to see what's being returned
        const text = await response.text();
        throw new Error('Server did not return JSON');
      }
      
      const data = await response.json();
        setLiveInfo(data);
    } catch (error) {
      console.error('Error fetching live info:', error);
      // Prevent constant retries if failing
      setTimeout(() => {
        fetchLiveInfo();
      }, 60000); // Try again in 1 minute instead of immediately
    }
  };

  useEffect(() => {
    fetchTiles();
    fetchLiveInfo();

    // Fetch live info every minute
    const interval = setInterval(fetchLiveInfo, 60000);
    
    return () => {
      clearInterval(interval);
      // Clean up all audio
      if (headerSound) {
        headerSound.unloadAsync();
      }
      if (sound) {
        sound.unloadAsync();
      }
    };
  }, []);

  // Keep the togglePlayback function (simplified) to avoid the reference error
  const togglePlayback = () => {
    // This is now a no-op function since we're using Mixcloud's controls
    // But we keep it to prevent the reference error
  };

  // Setup effect to handle unmounting
  useEffect(() => {
    return () => {
      if (sound) {
          sound.unloadAsync();
        }
    };
  }, [sound]);

  const handleScroll = (event) => {
    const scrollY = event.nativeEvent.contentOffset.y;
    updateScrollPosition('home', scrollY);
  };

  // Restore scroll position when pathname changes (screen is focused)
  useEffect(() => {
    const scrollPosition = getScrollPosition('home');
    if (flatListRef.current && scrollPosition > 0) {
      setTimeout(() => {
        flatListRef.current.scrollToOffset({
          offset: scrollPosition,
          animated: false
        });
      }, 100);
    }
  }, [pathname]); // This will run when the pathname changes

  // Revise the WebView rendering approach and modal structure
  const renderWebView = () => {
    if (!currentPlayingUrl) {
      return null;
    }
    
    return (
      <WebView
        ref={webViewRef}
        source={{ uri: currentPlayingUrl }}
        style={[
          styles.webViewCommon,
          // Only fully show in modal, hide when in mini player mode
          playerModalVisible ? styles.visibleWebView : styles.hiddenWebView
        ]}
        mediaPlaybackRequiresUserAction={false}
        allowsInlineMediaPlayback={true}
        javaScriptEnabled={true}
        onShouldStartLoadWithRequest={() => true}
        originWhitelist={['*']}
        onLoadEnd={() => {
          console.log('WebView loaded');
        }}
        injectedJavaScript={`
          // Initialize audio monitoring
          console.log('Initializing audio monitoring');
          
          // Function to check audio state
          function checkAudioState() {
            try {
              const audioElements = document.querySelectorAll('audio');
              if (audioElements.length > 0) {
                let anyPlaying = false;
                audioElements.forEach(audio => {
                  if (!audio.paused) anyPlaying = true;
                });
                
                window.ReactNativeWebView.postMessage(JSON.stringify({
                  type: 'audioState',
                  isPlaying: anyPlaying,
                  audioCount: audioElements.length
                }));
                
                // For debugging
                audioElements.forEach((audio, index) => {
                  console.log('Audio ' + index + ' state: ' + (audio.paused ? 'paused' : 'playing'));
                });
              } else {
                console.log('No audio elements found during check');
              }
            } catch (e) {
              console.error('Error checking audio state:', e);
            }
          }
          
          // Start playback immediately
          setTimeout(() => {
            try {
              console.log('Attempting initial audio playback');
              const audioElements = document.querySelectorAll('audio');
              if (audioElements.length > 0) {
                audioElements.forEach(audio => {
                  // Ensure audio can play
                  audio.volume = 1.0;
                  audio.muted = false;
                  audio.setAttribute('playsinline', true);
                  
                  // Try to play
                  const promise = audio.play();
                  if (promise !== undefined) {
                    promise.then(() => {
                      console.log('Initial audio playback started successfully');
                    }).catch(e => {
                      console.error('Error starting initial playback:', e);
                      
                      // If autoplay fails due to browser policies, add a user interaction handler
                      document.addEventListener('click', function playOnClick() {
                        audio.play().catch(e => console.error('Still failed to play on click:', e));
                        document.removeEventListener('click', playOnClick);
                      }, { once: true });
                    });
                  }
                });
              } else {
                console.log('No audio elements found for initial playback');
              }
            } catch (e) {
              console.error('Error in initial playback:', e);
            }
          }, 800);
          
          // Check state periodically
          setInterval(checkAudioState, 2000);
          
          // Add event listeners to all audio elements
          function addAudioListeners() {
            const audioElements = document.querySelectorAll('audio');
            audioElements.forEach(audio => {
              audio.addEventListener('play', () => {
                window.ReactNativeWebView.postMessage(JSON.stringify({
                  type: 'audioEvent',
                  event: 'play'
                }));
              });
              
              audio.addEventListener('pause', () => {
                window.ReactNativeWebView.postMessage(JSON.stringify({
                  type: 'audioEvent',
                  event: 'pause'
                }));
              });
              
              audio.addEventListener('ended', () => {
                window.ReactNativeWebView.postMessage(JSON.stringify({
                  type: 'audioEvent',
                  event: 'ended'
                }));
              });
            });
          }
          
          // Add listeners once audio elements are available
          setTimeout(addAudioListeners, 1000);
          
          // Also watch for new audio elements being added to the DOM
          const observer = new MutationObserver(function(mutations) {
            // Check if any new audio elements were added
            for (let mutation of mutations) {
              if (mutation.type === 'childList') {
                // Re-check audio state and add listeners to any new elements
                checkAudioState();
                addAudioListeners();
              }
            }
          });
          
          observer.observe(document.body, {
            childList: true,
            subtree: true
          });
          
          true;
        `}
        onMessage={onWebViewMessage}
      />
    );
  };


  const onWebViewMessage = (event) => {
    try {
      const data = JSON.parse(event.nativeEvent.data);
      console.log('WebView message:', data);
      
      if (data.type === 'aggressivePause') {
        // Handle aggressive pause feedback
        setLoading(false);
        setIsPlaying(false); // Always update UI for better responsiveness
        console.log('Aggressive pause result:', data.success);
      }
      
      if (data.type === 'playAfterPause') {
        // Handle play after pause feedback
    setLoading(false);
        setIsPlaying(true); // Always update UI for better responsiveness
      }
      
      if (data.type === 'buttonClick') {
        setLoading(false);
        if (data.button === 'play') {
          setIsPlaying(true);
        } else if (data.button === 'pause') {
          setIsPlaying(false);
        }
      }
      
      if (data.type === 'audioState' && data.audioCount > 0) {
        if (data.isPlaying && !playbackInitialized.current) {
          // First confirmation that audio is playing
          playbackInitialized.current = true;
          setIsPlaying(true);
          setLoading(false);
          console.log('Initial audio playback confirmed');
        }
        // No longer automatically updating isPlaying based on periodic checks
      }
      
      if (data.type === 'manualAction') {
        // Process feedback from manual audio control
        if (data.action === 'play') {
          if (data.success === false) {
            console.error('Failed to play audio:', data.error);
            setIsPlaying(false);
          } else {
            setIsPlaying(true);
          }
        } else if (data.action === 'pause' || data.action === 'stop') {
          setIsPlaying(false);
        }
      }
      
      if (data.type === 'error') {
        console.error('WebView error:', data.message);
        setLoading(false);
      }
    } catch (e) {
      console.error('Error parsing WebView message:', e);
      setLoading(false);
    }
  };

  const toggleLiveStream = () => {
    setShowLiveStream(prev => !prev);
    
    // If we're showing the stream, pause any other playback
    if (!showLiveStream && isPlaying) {
      // Pause the current playing show if needed
      // This depends on your existing playback control implementation
    }
  };

  const checkIfLive = async () => {
    try {
      const response = await fetch('https://www.mixcloud.com/live/VoicesRadio/');
      const html = await response.text();
      
      // If the page contains indicators that the stream is live
      const isLive = html.includes('is live now') || html.includes('LIVE');
      
      return isLive;
    } catch (error) {
      console.error('Error checking live status:', error);
      return false;
    }
  };

  useEffect(() => {
    const checkLiveStatus = async () => {
      const isLive = await checkIfLive();
      // You could add state to show "LIVE" indicator when isLive is true
    };
    
    checkLiveStatus();
    const interval = setInterval(checkLiveStatus, 60000); // Check every minute
    
    return () => clearInterval(interval);
  }, []);

  const toggleChat = () => {
    setShowChat(prev => !prev);
  };

  // Add this useEffect to detect orientation changes
  useEffect(() => {
    const updateOrientation = () => {
      const { width, height } = Dimensions.get('window');
    };
    
    Dimensions.addEventListener('change', updateOrientation);
    
    return () => {
      // Remove listener on unmount
      // For newer React Native versions, use this:
      // Dimensions.removeEventListener('change', updateOrientation);
    };
  }, []);

  return (
   <View style={styles.container}>
      {/* Replace direct TopBanner usage with SafeAreaView wrapper */}
      
      <FlatList
        ref={flatListRef}
        data={tiles}
        renderItem={({ item, index }) => (
          <TouchableOpacity
            key={item._id || index} 
            style={styles.tile}
            onPress={() => {
              console.log('Clicking tile with data:', {
                _id: item._id,
                title: item.title,
                iframeUrl: item.iframeUrl,
                // Log the entire item for comparison
                fullItem: item
              });
              handleTilePress(item, index);
            }}
          >
            <ImageBackground 
              source={{ uri: item.imageUrl || FALLBACK_IMAGE_URL }}
              style={styles.tileImage}
              resizeMode="cover"
            >
              <View style={styles.tileOverlay}>
                <View style={styles.tileTitleContainer}>
                  <Text style={styles.tileTitle} numberOfLines={0}>
                    {item.title}
                  </Text>
                </View>
                
                <TouchableOpacity 
                  style={styles.tilePlayButton}
                  onPress={(e) => {
                    e.stopPropagation();
                    handleTilePress(item, index);
                  }}
                >
                </TouchableOpacity>
              </View>
            </ImageBackground>
          </TouchableOpacity>
        )}
        contentContainerStyle={styles.listContent}
        removeClippedSubviews={true}
        maxToRenderPerBatch={10}
        windowSize={5}
        keyExtractor={(item, index) => item._id || index.toString()}
        onScroll={handleScroll}
        scrollEventThrottle={16}
        maintainVisibleContentPosition={{
          minIndexForVisible: 0,
        }}
      />
      
      {/* Modal for full player */}
      <Modal
        visible={playerModalVisible}
        transparent={true}
        animationType="slide"
        onRequestClose={() => {
          if (isPlaying) {
            switchToMiniPlayer();
          } else {
            stopPlayback();
          }
        }}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle} numberOfLines={1}>{currentPlayingTitle}</Text>
              
              <TouchableOpacity 
                style={styles.closeButton}
                onPress={() => {
                  if (isPlaying) {
                    switchToMiniPlayer();
                  } else {
                    stopPlayback();
                  }
                }}
              >
                <Ionicons name="close" size={24} color="#333" />
              </TouchableOpacity>
            </View>
            
            {/* WebView container */}
            <View style={styles.webViewContainer}>
              {currentPlayingUrl && (
                <WebView
                  ref={webViewRef}
                  source={{ uri: currentPlayingUrl }}
                  style={styles.webView}
                  mediaPlaybackRequiresUserAction={false}
                  allowsInlineMediaPlayback={true}
                  javaScriptEnabled={true}
                  onShouldStartLoadWithRequest={() => true}
                  originWhitelist={['*']}
                  injectedJavaScript={`
                    // Initialize audio monitoring
                    console.log('Initializing audio monitoring');
                    
                    // Function to check audio state
                    function checkAudioState() {
                      try {
                        const audioElements = document.querySelectorAll('audio');
                        if (audioElements.length > 0) {
                          let anyPlaying = false;
                          audioElements.forEach(audio => {
                            if (!audio.paused) anyPlaying = true;
                          });
                          
                          window.ReactNativeWebView.postMessage(JSON.stringify({
                            type: 'audioState',
                            isPlaying: anyPlaying,
                            audioCount: audioElements.length
                          }));
                          
                          // For debugging
                          audioElements.forEach((audio, index) => {
                            console.log('Audio ' + index + ' state: ' + (audio.paused ? 'paused' : 'playing'));
                          });
                        } else {
                          console.log('No audio elements found during check');
                        }
                      } catch (e) {
                        console.error('Error checking audio state:', e);
                      }
                    }
                    
                    // Start playback immediately
                    setTimeout(() => {
                      try {
                        console.log('Attempting initial audio playback');
                        const audioElements = document.querySelectorAll('audio');
                        if (audioElements.length > 0) {
                          audioElements.forEach(audio => {
                            // Ensure audio can play
                            audio.volume = 1.0;
                            audio.muted = false;
                            audio.setAttribute('playsinline', true);
                            
                            // Try to play
                            const promise = audio.play();
                            if (promise !== undefined) {
                              promise.then(() => {
                                console.log('Initial audio playback started successfully');
                              }).catch(e => {
                                console.error('Error starting initial playback:', e);
                                
                                // If autoplay fails due to browser policies, add a user interaction handler
                                document.addEventListener('click', function playOnClick() {
                                  audio.play().catch(e => console.error('Still failed to play on click:', e));
                                  document.removeEventListener('click', playOnClick);
                                }, { once: true });
                              });
                            }
                          });
                        } else {
                          console.log('No audio elements found for initial playback');
                        }
                      } catch (e) {
                        console.error('Error in initial playback:', e);
                      }
                    }, 800);
                    
                    // Check state periodically
                    setInterval(checkAudioState, 2000);
                    
                    // Add event listeners to all audio elements
                    function addAudioListeners() {
                      const audioElements = document.querySelectorAll('audio');
                      audioElements.forEach(audio => {
                        audio.addEventListener('play', () => {
                          window.ReactNativeWebView.postMessage(JSON.stringify({
                            type: 'audioEvent',
                            event: 'play'
                          }));
                        });
                        
                        audio.addEventListener('pause', () => {
                          window.ReactNativeWebView.postMessage(JSON.stringify({
                            type: 'audioEvent',
                            event: 'pause'
                          }));
                        });
                        
                        audio.addEventListener('ended', () => {
                          window.ReactNativeWebView.postMessage(JSON.stringify({
                            type: 'audioEvent',
                            event: 'ended'
                          }));
                        });
                      });
                    }
                    
                    // Add listeners once audio elements are available
                    setTimeout(addAudioListeners, 1000);
                    
                    // Also watch for new audio elements being added to the DOM
                    const observer = new MutationObserver(function(mutations) {
                      // Check if any new audio elements were added
                      for (let mutation of mutations) {
                        if (mutation.type === 'childList') {
                          // Re-check audio state and add listeners to any new elements
                          checkAudioState();
                          addAudioListeners();
                        }
                      }
                    });
                    
                    observer.observe(document.body, {
                      childList: true,
                      subtree: true
                    });
                    
                    true;
                  `}
                  onMessage={onWebViewMessage}
                />
              )}
            </View>
            
            <View style={styles.modalFooter}>
              <TouchableOpacity 
                style={styles.playButton}
                onPress={togglePlayback}
              >
                <Text style={styles.playButtonText}>
                  {isPlaying ? "Pause" : "Play"}
                </Text>
        </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      
      {/* Render the WebView outside of components but connected */}
      {renderWebView()}

      {/* Live Stream Button at the top of the screen */}
      <View style={styles.liveStreamBanner}>
        <View style={styles.actionButtons}>
          <TouchableOpacity 
            style={styles.liveStreamButton}
            onPress={toggleLiveStream}
          >
            <View style={styles.liveIndicator} />
            <Text style={styles.liveStreamButtonText}>
              {showLiveStream ? 'Hide Live Stream' : 'Watch Live'}
            </Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.chatButton}
            onPress={toggleChat}
          >
            <Ionicons name="chatbubbles" size={16} color={BRAND_COLORS.background} />
            <Text style={styles.chatButtonText}>Chat</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Live Stream WebView */}
      {showLiveStream && (
        <View style={styles.liveStreamContainer}>
          <View style={styles.liveStreamHeader}>
            <Text style={styles.liveStreamTitle}>Voices Radio Live</Text>
            <View style={styles.liveStreamControls}>
              <TouchableOpacity 
                style={styles.liveStreamChatButton}
                onPress={toggleChat}
              >
                <Ionicons name="chatbubbles" size={24} color={BRAND_COLORS.background} />
              </TouchableOpacity>
              <TouchableOpacity 
                style={styles.closeLiveStreamButton}
                onPress={() => setShowLiveStream(false)}
              >
                <Ionicons name="close" size={24} color={BRAND_COLORS.background} />
              </TouchableOpacity>
            </View>
          </View>
          
          {/* If chat is open and live stream is showing, display them side by side */}
          {showChat ? (
            <View style={getSplitContainerStyle()}>
              <View style={getLiveStreamWebViewContainerStyle()}>
                <WebView
                  ref={liveStreamWebViewRef}
                  source={{
                    uri: 'https://www.mixcloud.com/live/VoicesRadio/'
                  }}
                  style={styles.liveStreamWebView}
                  mediaPlaybackRequiresUserAction={false}
                  allowsInlineMediaPlayback={true}
                  javaScriptEnabled={true}
                  onShouldStartLoadWithRequest={() => true}
                  originWhitelist={['*']}
                  onMessage={(event) => {
                    try {
                      const data = JSON.parse(event.nativeEvent.data);
                      console.log('Live stream message:', data);
                      
                      // Handle messages from the webview
                      if (data.type === 'playbackStatus') {
                        setIsLiveStreamPlaying(data.isPlaying);
                      }
                    } catch (e) {
                      console.error('Error parsing live stream message:', e);
                    }
                  }}
                  injectedJavaScript={`
                    // Listen for play/pause events
                    document.addEventListener('play', function() {
                      window.ReactNativeWebView.postMessage(JSON.stringify({
                        type: 'playbackStatus',
                        isPlaying: true
                      }));
                    }, true);
                    
                    document.addEventListener('pause', function() {
                      window.ReactNativeWebView.postMessage(JSON.stringify({
                        type: 'playbackStatus',
                        isPlaying: false
                      }));
                    }, true);
                    
                    // Auto-play the stream when loaded
                    setTimeout(() => {
                      const playButton = document.querySelector('.play-button');
                      if (playButton) playButton.click();
                    }, 1000);
                    
                    true;
                  `}
                />
              </View>
              <View style={getLiveChatContainerStyle()}>
                <WebView
                  source={{ uri: 'https://voicesradiokx.chatango.com/m' }}
                  style={styles.chatWebView}
                  originWhitelist={['*']}
                  javaScriptEnabled={true}
                  domStorageEnabled={true}
                />
              </View>
            </View>
            
          ) : (
            // Just show the live stream if chat is not open
            <WebView
              ref={liveStreamWebViewRef}
              source={{
                uri: 'https://www.mixcloud.com/live/VoicesRadio/'
              }}
              style={styles.liveStreamWebView}
              mediaPlaybackRequiresUserAction={false}
              allowsInlineMediaPlayback={true}
              javaScriptEnabled={true}
              onShouldStartLoadWithRequest={() => true}
              originWhitelist={['*']}
              onMessage={(event) => {
                try {
                  const data = JSON.parse(event.nativeEvent.data);
                  console.log('Live stream message:', data);
                  
                  // Handle messages from the webview
                  if (data.type === 'playbackStatus') {
                    setIsLiveStreamPlaying(data.isPlaying);
                  }
                } catch (e) {
                  console.error('Error parsing live stream message:', e);
                }
              }}
              injectedJavaScript={`
                // Listen for play/pause events
                document.addEventListener('play', function() {
                  window.ReactNativeWebView.postMessage(JSON.stringify({
                    type: 'playbackStatus',
                    isPlaying: true
                  }));
                }, true);
                
                document.addEventListener('pause', function() {
                  window.ReactNativeWebView.postMessage(JSON.stringify({
                    type: 'playbackStatus',
                    isPlaying: false
                  }));
                }, true);
                
                // Auto-play the stream when loaded
                setTimeout(() => {
                  const playButton = document.querySelector('.play-button');
                  if (playButton) playButton.click();
                }, 1000);
                
                true;
              `}
            />
          )}
        </View>
      )}

      {showChat && (
        <View style={styles.chatContainer}>
          <View style={styles.chatHeader}>
            <Text style={styles.chatTitle}>Voices Radio Chat</Text>
            <TouchableOpacity 
              style={styles.closeChatButton}
              onPress={() => setShowChat(false)}
            >
              <Ionicons name="close" size={24} color={BRAND_COLORS.background} />
            </TouchableOpacity>
          </View>
          <WebView
            source={{ uri: 'https://voicesradiokx.chatango.com/m' }}
            style={styles.chatWebView}
            originWhitelist={['*']}
            javaScriptEnabled={true}
            domStorageEnabled={true}
          />
        </View>
      )}
    </View>
  );
};

// First, define your styles without the dynamic values
const styles = StyleSheet.create({
  container: {
    flex: 1,
    width: width,
    height: height,
    backgroundColor: BRAND_COLORS.background, 
  },
  liveInfoStrip: {
    flexDirection: 'row',
    backgroundColor: BRAND_COLORS.primaryText,
    alignItems: 'center',
    height: 50,
    paddingHorizontal: 10,
  },
  playButton: {
    backgroundColor: BRAND_COLORS.primaryText,
    marginRight: 15,
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  marqueeContainer: {
    height: 50,
    overflow: 'hidden',
  },
  marqueeText: {
    color: BRAND_COLORS.background, // Changed from 'white'
    fontSize: 16,
    fontWeight: 'bold',
    lineHeight: 50,
  },
  loadingContainer: {
    padding: 20,
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: BRAND_COLORS.primaryText, // Changed from '#333'
  },
  tilesContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    padding: 4,
  },
  tile: {
    width: TILE_SIZE,
    height: TILE_SIZE,
    margin: 4,
    borderRadius: 8, // Added slight rounding for friendlier look
    overflow: 'hidden',
    backgroundColor: '#fff', // Added for better contrast with background background
    shadowColor: BRAND_COLORS.primaryText,
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  tileImage: {
    width: '100%',
    height: '100%',
    justifyContent: 'flex-end',
  },
  tileOverlay: {
    backgroundColor: 'rgba(19, 18, 0, 0.5)', // Using brand black with opacity
    padding: 10,
    height: '100%',
    justifyContent: 'flex-end', // Changed from 'space-between' to position content at bottom
    alignItems: 'center',
  },
  tileTitleContainer: {
    width: '100%',
    justifyContent: 'center',
    padding: 5,
    marginBottom: -40, // Add margin at bottom for spacing
  },
  tileTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: BRAND_COLORS.primaryText,
    textAlign: 'center',
    flexWrap: 'wrap',
  },
  tilePlayButton: {
    marginTop: 10,
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  miniPlayerContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'white', 
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
    shadowColor: '#000',
    shadowOffset: {
    width: 0,
      height: -3,
    },
    shadowOpacity: 0.27,
    shadowRadius: 4.65,
    elevation: 6,
    zIndex: 1000,
    overflow: 'hidden', 
  },
  miniPlayerContent: {
    position: 'relative', 
    width: '100%',
    height: 60,  
  },
  miniPlayerWebView: {
    width: '100%',
    height: 60,
    backgroundColor: 'transparent',
  },
  miniPlayerCloseButton: {
    position: 'absolute',
    top: 18, 
    right: 10,
    zIndex: 10,
    elevation: 10, 
    backgroundColor: 'transparent',
  },
  playerContainer: {
    height: 40, 
    overflow: 'hidden',
    opacity: 0.01, 
    position: 'absolute', 
    width: '100%',
    top: -1000, 
  },
  hiddenPlayer: {
    width: '100%',
    height: 300, 
  },
  playbackProgress: {
    height: 3,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 1.5,
    width: '100%',
    overflow: 'hidden',
  },
  progressBar: {
    height: '100%',
    backgroundColor: '#007AFF',
  },
  playerControls: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  playPauseButton: {
    width: 36,
    height: 36,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  closeButton: {
    padding: 6,
  },
  modalContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
  },
  modalContent: {
    width: '90%',
    height: '75%',
    backgroundColor: BRAND_COLORS.background, // Changed from 'white'
    borderRadius: 12,
    overflow: 'hidden',
    shadowColor: BRAND_COLORS.primaryText,
    shadowOffset: {
    width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 10,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: BRAND_COLORS.primaryText,
    backgroundColor: BRAND_COLORS.background,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: BRAND_COLORS.accent, 
    flex: 1,
  },
  webViewContainer: {
    flex: 1,
    backgroundColor: '#f2f2f2',
  },
  webView: {
    flex: 1,
  },
  modalFooter: {
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#eee',
    alignItems: 'center',
  },
  playButton: {
    backgroundColor: BRAND_COLORS.accent, 
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
  },
  playButtonText: {
    color: BRAND_COLORS.background, // Changed from 'white'
    fontSize: 16,
    fontWeight: 'bold',
  },
  hiddenWebViewContainer: {
    position: 'absolute', 
    width: 1,
    height: 1,
    overflow: 'hidden',
    opacity: 0,
  },
  hiddenWebView: {
    width: 1,
    height: 1,
  },
  webViewCommon: {
    position: 'absolute',
    width: '100%',
    height: '100%',
    backgroundColor: '#f2f2f2',
  },
  visibleWebView: {
    zIndex: 1000,
    opacity: 1,
    // Position it over the modal content when visible
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  hiddenWebView: {
    // Keep it connected but not visible
    zIndex: -1,
    opacity: 0, 
    width: 1,
    height: 1,
    top: 0,
    left: 0,
  },
  listContent: {
    padding: 15,
  },
  sectionTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: BRAND_COLORS.accent, // Changed to red-orange for headers
    marginBottom: 16,
  },
  tabBar: {
    flexDirection: 'row',
    backgroundColor: BRAND_COLORS.background,
    height: Platform.OS === 'ios' ? 80 : 60,
    paddingBottom: Platform.OS === 'ios' ? 25 : 10,
    paddingTop: 5,
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    borderTopWidth: 1,
    borderTopColor: 'rgba(19, 18, 0, 0.1)', // Using brand black with opacity
    elevation: 0,
  },
  tabLabelActive: {
    color: BRAND_COLORS.accent, // Changed from '#007AFF'
  },
  tabLabelInactive: {
    color: BRAND_COLORS.primaryText, // Changed from '#8E8E93'
  },
  liveStreamBanner: {
    backgroundColor: BRAND_COLORS.accent,
    padding: -5,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: -5,
  },
  liveStreamButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
  },
  liveIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: 'red',
    marginRight: 6,
  },
  liveStreamButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: BRAND_COLORS.background,
  },
  liveStreamContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: BRAND_COLORS.background,
    zIndex: 100,
  },
  liveStreamHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 15,
    backgroundColor: BRAND_COLORS.accent,
  },
  liveStreamTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: BRAND_COLORS.background,
  },
  closeLiveStreamButton: {
    padding: 5,
  },
  liveStreamWebView: {
    flex: 1,
  },
  actionButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: BRAND_COLORS.accent,
    padding: 10,
    marginBottom: 10,
  },
  chatButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  chatButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: BRAND_COLORS.background,
    marginLeft: 6,
  },
  chatContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: BRAND_COLORS.background,
    zIndex: 100,
  },
  chatHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 15,
    backgroundColor: BRAND_COLORS.accent,
  },
  chatTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: BRAND_COLORS.background,
  },
  closeChatButton: {
    padding: 5,
  },
  chatWebView: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  chatLoadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
  },
  chatLoadingText: {
    marginTop: 10,
    color: BRAND_COLORS.accent,
  },
  liveStreamControls: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  liveStreamChatButton: {
    padding: 5,
    marginRight: 10,
  },
  splitContainer: {
    flex: 1,
  },
  liveStreamWebViewContainer: {
  },
  liveChatContainer: {
    borderColor: BRAND_COLORS.primaryText,
  },
  actionButtonsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    backgroundColor: BRAND_COLORS.accent,
    padding: 6,
    marginBottom: 2,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 4,
    paddingHorizontal: 12,
  },
  actionButtonText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: BRAND_COLORS.background,
    marginLeft: 6,
  },
  modalOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    zIndex: 100,
  },
  chatModal: {
    flex: 1,
    margin: 20,
    backgroundColor: BRAND_COLORS.background,
    borderRadius: 10,
    overflow: 'hidden',
  },
  liveStreamModal: {
    flex: 1,
    margin: 2,
    backgroundColor: BRAND_COLORS.background,
    borderRadius: 10,
    overflow: 'hidden',
  },
  combinedModal: {
    flex: 1,
    margin: 20,
    backgroundColor: BRAND_COLORS.background,
    borderRadius: 10,
    overflow: 'hidden',
  },
  liveStreamHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 15,
    backgroundColor: BRAND_COLORS.accent,
  },
  headerButtons: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerButton: {
    padding: 5,
    marginLeft: 10,
  },
  chatWebView: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  liveStreamWebView: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
  },
  loadingText: {
    marginTop: 10,
    color: BRAND_COLORS.accent,
  },
  splitView: {
    flex: 1,
    flexDirection: 'column', // Always vertical layout for simplicity
  },
  liveStreamSection: {
    width: '100%',
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
  chatSection: {
    width: '100%',
  },
});

// Then in your component, create a function to get dynamic styles
const getSplitContainerStyle = () => {
  return {
    ...styles.splitContainer,
    flexDirection: width > height ? 'row' : 'column',
  };
};

const getLiveStreamWebViewContainerStyle = () => {
  return {
    ...styles.liveStreamWebViewContainer,
    flex: width > height ? 1 : 0.6,
  };
};

const getLiveChatContainerStyle = () => {
  return {
    ...styles.liveChatContainer,
    width: width > height ? '40%' : '100%',
    height: width > height ? '100%' : '40%',
    borderLeftWidth: width > height ? 1 : 0,
    borderTopWidth: width > height ? 0 : 1,
  };
};

export default HomeScreen;