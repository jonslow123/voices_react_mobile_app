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
  FlatList
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { WebView } from 'react-native-webview';
import axios from 'axios';
import { usePlayer } from '../app/context/PlayerContext'; // Path with app prefix for context

// Get screen width for responsive sizing
const { width } = Dimensions.get('window');
const TILE_SIZE = width / 2 - 12; // Two tiles per row with a small gap

// First, let's define our brand colors at the top of the file
const BRAND_COLORS = {
  beige: '#e5d7be',
  black: '#131200',
  redOrange: '#d34e24'
};

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
  const { handleTilePress } = usePlayer();
  const [tiles, setTiles] = useState([]);
  const [liveInfo, setLiveInfo] = useState(null);
  const [isLoadingTiles, setIsLoadingTiles] = useState(true);
  const [headerSound, setHeaderSound] = useState(null);
  const [activeTileIndex, setActiveTileIndex] = useState(null);
  const [currentPlayingTitle, setCurrentPlayingTitle] = useState('');
  const [currentPlayingUrl, setCurrentPlayingUrl] = useState('');
  const webViewRef = useRef(null);
  const [sound, setSound] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [playerModalVisible, setPlayerModalVisible] = useState(false);
  const [loading, setLoading] = useState(false);
  const hiddenWebViewRef = useRef(null);
  const playbackInitialized = useRef(false);

  // Fetch Mixcloud image URL using their API
  const fetchMixcloudData = async (mixcloudPath) => {
    if (!mixcloudPath) return null;
    
    try {
      // Remove leading slash if present for the API
      const path = mixcloudPath.startsWith('/') ? mixcloudPath.substring(1) : mixcloudPath;
      
      // Call the Mixcloud API
      const response = await axios.get(`https://api.mixcloud.com/${path}`);
      console.log(`Mixcloud API response for ${path}:`, response.data);
      
      if (response.data && response.data.pictures && response.data.pictures.extra_large) {
        return {
          imageUrl: response.data.pictures.extra_large,
          title: response.data.name || '',
          description: response.data.description || '',
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
      console.log('Entering fetchTiles');
      const API_URL = `${process.env.EXPO_PUBLIC_BACKEND_URL}/api/featured-shows/getShows`;
      console.log(API_URL);

      const response = await axios.get(API_URL);
      console.log("Raw response from API:", response.data[0]); // Log first tile data
      
      // First set tiles with basic data and correct iframeUrl format
      const initialTiles = response.data.map(tile => {
        const mixcloudPath = extractMixcloudPath(tile.iframeUrl);
        console.log("Extracted Mixcloud path:", mixcloudPath); // Log extracted path
        
        return { 
          _id: tile._id,
          title: tile.title,
          imageUrl: null,
          key: mixcloudPath,
          mixcloudPath: mixcloudPath,
          iframeUrl: `https://player-widget.mixcloud.com/widget/iframe/?hide_cover=1&mini=1&light=1&feed=${encodeURIComponent(mixcloudPath)}`,
        };
      });
      
      console.log("Initial tile with formatted URL:", initialTiles[0]); // Log first formatted tile
      setTiles(initialTiles);
      
      // Then fetch each Mixcloud data in parallel (keep this part for images)
      const tileUpdatesPromises = initialTiles.map(async (tile, index) => {
        if (tile.mixcloudPath) {
          const mixcloudData = await fetchMixcloudData(tile.mixcloudPath);
          if (mixcloudData) {
            console.log("Mixcloud data for tile:", index, mixcloudData); // Log image data
            return {
              index,
              updates: {
                imageUrl: mixcloudData.imageUrl,
                mixcloudTitle: mixcloudData.title,
                mixcloudDescription: mixcloudData.description
              }
            };
          }
        }
        return { index, updates: { imageUrl: FALLBACK_IMAGE_URL } };
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
        console.log("Final tile with image:", newTiles[0]); // Log final tile data
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
        console.log('Server response:', text.substring(0, 200)); // Log first 200 chars
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
    console.log('Fetching tiles');
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
    console.log('togglePlayback called - using Mixcloud built-in controls instead');
  };

  // Setup effect to handle unmounting
  useEffect(() => {
    return () => {
      if (sound) {
        sound.unloadAsync();
      }
    };
  }, [sound]);


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
        console.log('Play after pause result:', data.success);
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

  return (
    <View style={styles.container}>
      {/* Replace direct TopBanner usage with SafeAreaView wrapper */}
      
      <FlatList
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
                <Text style={styles.tileTitle} numberOfLines={2}>
                  {item.title}
                </Text>
                
                <TouchableOpacity 
                  style={styles.tilePlayButton}
                  onPress={(e) => {
                    e.stopPropagation();
                    handleTilePress(item, index);
                  }}
                >
                  <Ionicons 
                    name={(activeTileIndex === index && isPlaying) ? "pause-circle" : "play-circle"} 
                    size={40} 
                    color="white" 
                  />
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
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: BRAND_COLORS.beige, 
  },
  liveInfoStrip: {
    flexDirection: 'row',
    backgroundColor: BRAND_COLORS.black,
    alignItems: 'center',
    height: 50,
    paddingHorizontal: 10,
  },
  playButton: {
    backgroundColor: BRAND_COLORS.black,
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
    color: BRAND_COLORS.beige, // Changed from 'white'
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
    color: BRAND_COLORS.black, // Changed from '#333'
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
    backgroundColor: '#fff', // Added for better contrast with beige background
    shadowColor: BRAND_COLORS.black,
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
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  tileTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: BRAND_COLORS.beige, // Changed from '#FFF'
    textAlign: 'center',
    marginTop: 'auto',
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
    backgroundColor: BRAND_COLORS.beige, // Changed from 'white'
    borderRadius: 12,
    overflow: 'hidden',
    shadowColor: BRAND_COLORS.black,
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
    borderBottomColor: BRAND_COLORS.black,
    backgroundColor: BRAND_COLORS.beige,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: BRAND_COLORS.redOrange, 
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
    backgroundColor: BRAND_COLORS.redOrange, 
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
  },
  playButtonText: {
    color: BRAND_COLORS.beige, // Changed from 'white'
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
    color: BRAND_COLORS.redOrange, // Changed to red-orange for headers
    marginBottom: 16,
  },
  tabBar: {
    flexDirection: 'row',
    backgroundColor: BRAND_COLORS.beige,
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
    color: BRAND_COLORS.redOrange, // Changed from '#007AFF'
  },
  tabLabelInactive: {
    color: BRAND_COLORS.black, // Changed from '#8E8E93'
  },
});

export default HomeScreen;