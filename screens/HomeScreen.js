import React, { useEffect, useState, useRef } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  Dimensions,
  ImageBackground,
  Image,
  Platform,
  Modal,
  FlatList,
  ActivityIndicator,
  useWindowDimensions,
  SafeAreaView,
  StatusBar,
  Alert
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { WebView } from 'react-native-webview';
import axios from 'axios';
import { Audio } from 'expo-av'; // Import Expo Audio instead of web Audio API
import { usePlayer } from '../app/context/PlayerContext';
import { useScroll } from '../app/context/ScrollContext';
import { useRouter, usePathname, Link } from 'expo-router';
import { BRAND_COLORS } from '../app/styles/brandColors';
import eventBus from '../app/utils/eventBus';
import playerState from '../app/utils/playerState';

// Get screen width for responsive sizing
const { width, height } = Dimensions.get('window');
const CAROUSEL_TILE_WIDTH = width * 0.7; // 75% of screen width

// Fallback images
const FALLBACK_IMAGE_URL = 'https://via.placeholder.com/600x600/007AFF/FFFFFF?text=Music';
const VOICES_LOGO_URL = require('../assets/logo.png');

const HomeScreen = () => {
  const { handleTilePress, activeTileId, isPlaying, togglePlayback, miniPlayerVisible } = usePlayer();
  const [tiles, setTiles] = useState([]);
  const [liveInfo, setLiveInfo] = useState(null);
  const [isLoadingTiles, setIsLoadingTiles] = useState(true);
  const [showChat, setShowChat] = useState(false);
  const flatListRef = useRef(null);
  const { updateScrollPosition, getScrollPosition } = useScroll();
  const pathname = usePathname();
  
  // State for the live stream player
  const [showLiveStream, setShowLiveStream] = useState(false);
  const [isLiveStreamLoading, setIsLiveStreamLoading] = useState(false);
  const liveStreamWebViewRef = useRef(null);
  
  // New states for the top banner
  const [currentArtistImage, setCurrentArtistImage] = useState(null);
  const [currentShowName, setCurrentShowName] = useState('Voices Radio Live');
  const [isAirtimePlaying, setIsAirtimePlaying] = useState(false);
  const [isLoadingAirtime, setIsLoadingAirtime] = useState(false);
  const [currentTime, setCurrentTime] = useState('');
  const [nextShowTime, setNextShowTime] = useState('');
  const [nextShowName, setNextShowName] = useState('');
  const soundRef = useRef(null);

  // Add a new state to store Voices Radio hosts
  const [voicesHosts, setVoicesHosts] = useState([]);

  const router = useRouter();

  // Extract Mixcloud path
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

  // Fetch Mixcloud data
  const fetchMixcloudData = async (mixcloudPath) => {
    if (!mixcloudPath) return null;
    
    try {
      const path = mixcloudPath.startsWith('/') ? mixcloudPath.substring(1) : mixcloudPath;
      const response = await axios.get(`https://api.mixcloud.com/${path}`);
      
      if (response.data) {
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
        return { 
          _id: tile._id,
          title: tile.title,
          imageUrl: null,
          key: mixcloudPath,
          mixcloudPath: mixcloudPath,
          iframeUrl: `https://player-widget.mixcloud.com/widget/iframe/?hide_cover=1&mini=1&light=1&feed=${encodeURIComponent(mixcloudPath)}`,
          genres: []
        };
      });
      
      setTiles(initialTiles);
      
      // Then fetch each Mixcloud data in parallel
      const tileUpdatesPromises = initialTiles.map(async (tile, index) => {
        if (tile.mixcloudPath) {
          const mixcloudData = await fetchMixcloudData(tile.mixcloudPath);
          if (mixcloudData) {
            return {
              index,
              updates: {
                imageUrl: mixcloudData.imageUrl,
                mixcloudTitle: mixcloudData.title,
                mixcloudDescription: mixcloudData.description,
                genres: mixcloudData.genres || []
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

  // Fetch live info from Airtime
  const fetchLiveInfo = async () => {
    try {
      const response = await fetch('https://voicesradio.airtime.pro/api/live-info-v2');
      
      if (!response.ok) {
        throw new Error(`Server responded with ${response.status}: ${response.statusText}`);
      }
      
      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        console.warn('Server response is not JSON:', contentType);
        const text = await response.text();
        throw new Error('Server did not return JSON');
      }
      
      const data = await response.json();
      console.log("Live info API response:", JSON.stringify(data, null, 2));
        setLiveInfo(data);
      
      // Extract show information
      if (data && data.shows && data.shows.current) {
        // Decode HTML entities in the show name
        const decodedShowName = decodeHTMLEntities(data.shows.current.name);
        setCurrentShowName(decodedShowName);
        
        // Format current time
        const currentDateTime = new Date();
        setCurrentTime(currentDateTime.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}));
        
        // Better handling for next show info
        let foundNextShow = false;
        
        // Check for next show in the direct 'next' field
        if (data.shows.next && data.shows.next.name) {
          // Decode HTML entities in the next show name
          const decodedNextShowName = decodeHTMLEntities(data.shows.next.name);
          setNextShowName(decodedNextShowName);
          
          if (data.shows.next.starts) {
            try {
              const nextShowDateTime = new Date(data.shows.next.starts);
              if (!isNaN(nextShowDateTime.getTime())) {
                setNextShowTime(nextShowDateTime.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}));
                foundNextShow = true;
              }
            } catch (e) {
              console.error("Error parsing next show date:", e);
            }
          }
        }
        
        // If next show wasn't found in 'next', check the 'nextSource' or schedule data
        if (!foundNextShow && data.shows.nextSource) {
          // Some endpoints use nextSource
          const decodedNextSourceName = decodeHTMLEntities(data.shows.nextSource.name || '');
          setNextShowName(decodedNextSourceName);
          
          if (data.shows.nextSource.starts) {
            try {
              const nextShowDateTime = new Date(data.shows.nextSource.starts);
              if (!isNaN(nextShowDateTime.getTime())) {
                setNextShowTime(nextShowDateTime.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}));
                foundNextShow = true;
              }
            } catch (e) {
              console.error("Error parsing nextSource date:", e);
            }
          }
        }
        
        // Check the schedule data as a last resort
        if (!foundNextShow && data.schedulerTime) {
          try {
            // Get current time from scheduler
            const schedulerTime = new Date(data.schedulerTime);
            
            // Look through the week info for the next show
            if (data.weekInfo) {
              const weekData = Object.values(data.weekInfo).flat();
              
              // Find the next show after current time
              const upcomingShows = weekData
                .filter(item => 
                  typeof item === 'object' && 
                  item !== null && 
                  item.starts && 
                  new Date(item.starts) > schedulerTime
                )
                .sort((a, b) => new Date(a.starts) - new Date(b.starts));
              
              if (upcomingShows.length > 0) {
                const nextShow = upcomingShows[0];
                setNextShowName(nextShow.name);
                const nextShowTime = new Date(nextShow.starts);
                setNextShowTime(nextShowTime.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}));
                foundNextShow = true;
              }
            }
          } catch (e) {
            console.error("Error parsing schedule data:", e);
          }
        }
        
        // Fallback if still not found
        if (!foundNextShow) {
          // Get show data from the schedule API as a fallback
          try {
            const scheduleResponse = await fetch('https://voicesradio.airtime.pro/api/week-info?timezone=Europe/London');
            if (scheduleResponse.ok) {
              const scheduleData = await scheduleResponse.json();
              
              // Process the schedule data to find the next show
              const allShows = Object.values(scheduleData).flat()
                .filter(item => typeof item === 'object' && item !== null)
                .sort((a, b) => new Date(a.starts) - new Date(b.starts));
              
              const now = new Date();
              const upcomingShow = allShows.find(show => new Date(show.starts) > now);
              
              if (upcomingShow) {
                setNextShowName(upcomingShow.name);
                const showTime = new Date(upcomingShow.starts);
                setNextShowTime(showTime.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}));
                foundNextShow = true;
              }
            }
          } catch (scheduleError) {
            console.error("Error fetching schedule fallback:", scheduleError);
          }
        }
        
        // Final fallback if nothing else worked
        if (!foundNextShow) {
          setNextShowName('Check schedule for upcoming shows');
          setNextShowTime('');
        }
        
        // Try to extract artist name from show name
        const artistName = extractArtistFromShowName(decodedShowName);
        if (artistName) {
          fetchArtistImage(artistName);
        } else {
          setCurrentArtistImage(null);
        }
      }
    } catch (error) {
      console.error('Error fetching live info:', error);
      // Set default values on error
      setCurrentTime(new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}));
      setNextShowTime('Check schedule');
      setNextShowName('Information unavailable');
      
      setTimeout(() => {
        fetchLiveInfo();
      }, 60000);
    }
  };

  // Replace the current decodeHTMLEntities function with this version
  const decodeHTMLEntities = (text) => {
    if (!text) return '';
    
    // Use only manual replacement for HTML entities (React Native compatible)
    return text
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#039;/g, "'")
      .replace(/&#39;/g, "'");
  };

  // Extract artist name from show name
  const extractArtistFromShowName = (showName) => {
    if (!showName) return null;
    
    const patterns = [
      /^(.+?)\sShow$/i,
      /^(.+?)\sRadio$/i,
      /^(.+?)\sPresents$/i
    ];
    
    for (const pattern of patterns) {
      const match = showName.match(pattern);
      if (match && match[1]) {
        return match[1].trim();
      }
    }
    
    return showName;
  };

  // Fetch artist image from Mixcloud
  const fetchArtistImage = async (artistName) => {
    try {
      if (!artistName) {
        setCurrentArtistImage(null);
        return;
      }
      
      // If hosts haven't loaded yet, use default image
      if (!voicesHosts || voicesHosts.length === 0) {
        console.log('No hosts data available, using default image');
        setCurrentArtistImage(null);
        return;
      }
      
      // First try to match with exact username (case insensitive)
      const lowerArtistName = artistName.toLowerCase();
      console.log('Looking for artist image for:', lowerArtistName);
      
      // Find matching host from our Voices hosts list
      let matchingHost = null;
      
      for (let i = 0; i < voicesHosts.length; i++) {
        const host = voicesHosts[i];
        if (host.name.toLowerCase() === lowerArtistName || 
            host.username.toLowerCase() === lowerArtistName) {
          matchingHost = host;
          break;
        }
      }
      
      if (matchingHost && matchingHost.pictures) {
        setCurrentArtistImage(matchingHost.pictures.extra_large);
        return;
      }
      
      // If no exact match, try partial matching within our hosts
      for (let i = 0; i < voicesHosts.length; i++) {
        const host = voicesHosts[i];
        if (host.name.toLowerCase().includes(lowerArtistName) || 
            lowerArtistName.includes(host.name.toLowerCase())) {
          matchingHost = host;
          break;
        }
      }
      
      if (matchingHost && matchingHost.pictures) {
        setCurrentArtistImage(matchingHost.pictures.extra_large);
        return;
      }
      
      // If we still don't have a match, set to null
      setCurrentArtistImage(null);
    } catch (error) {
      console.error('Error in fetchArtistImage:', error);
      setCurrentArtistImage(null);
    }
  };

  // Toggle Airtime stream using Expo Audio
  const toggleAirtimeStream = async () => {
    try {
      if (isAirtimePlaying) {
        // Stopping playback
        setIsLoadingAirtime(true);
        
        if (soundRef.current) {
          await soundRef.current.stopAsync();
          await soundRef.current.unloadAsync();
          soundRef.current = null;
        }
        
        setIsAirtimePlaying(false);
        setIsLoadingAirtime(false);
      } else {
        // Starting playback
        setIsLoadingAirtime(true);
        
        // Basic audio configuration
        await Audio.setAudioModeAsync({
          playsInSilentModeIOS: true,
          staysActiveInBackground: true,
        });
        
        // Load the stream
        const { sound } = await Audio.Sound.createAsync(
          { uri: 'https://voicesradio.out.airtime.pro/voicesradio_a'},
          { shouldPlay: true },
          // This is where we set up status updates - directly on the sound object
          (status) => {
            // This is the onPlaybackStatusUpdate callback
            console.log('Playback status:', status);
            
            // Update your UI based on status if needed
            if (status.isLoaded) {
              // Sound is loaded
              if (status.isPlaying) {
                // Sound is playing
              } else {
                // Sound is paused
              }
            } else if (status.error) {
              // An error occurred
              console.error('Playback error:', status.error);
              setIsAirtimePlaying(false);
              setIsLoadingAirtime(false);
            }
          }
        );
        
        // Store the sound reference
        soundRef.current = sound;
        setIsAirtimePlaying(true);
        setIsLoadingAirtime(false);
        
        // No need to call setMetadataAsync as it doesn't exist
        // If needed, manage metadata in your app state instead
      }
    } catch (error) {
      console.error('Error in toggleAirtimeStream:', error);
      setIsAirtimePlaying(false);
      setIsLoadingAirtime(false);
    }
  };

  const toggleLiveStream = () => {
    setIsLiveStreamLoading(true);
    setShowLiveStream(true);
  };

  const toggleChat = () => {
    setShowChat(prev => !prev);
  };

  const handleWebViewMessage = (event) => {
    try {
      const data = JSON.parse(event.nativeEvent.data);
      console.log('WebView message:', data);
      
      if (data.type === 'playbackStatus') {
        setIsLiveStreamLoading(false);
      }
    } catch (e) {
      console.error('Error parsing WebView message:', e);
      setIsLiveStreamLoading(false);
    }
  };

  // Add this function to fetch Voices Radio hosts
  const fetchVoicesHosts = async () => {
    try {
      console.log('Starting to fetch Voices hosts...');
      
      // Try with axios instead of fetch
      const response = await axios.get('https://api.mixcloud.com/VoicesRadio/hosts/', {
        timeout: 10000, // 10 second timeout
        headers: {
          'Accept': 'application/json'
        }
      });
      
      console.log('Voices hosts API response status:', response.status);
      
      // Check if we have valid data
      if (response.data && response.data.data && Array.isArray(response.data.data)) {
        setVoicesHosts(response.data.data);
        console.log('Successfully fetched Voices hosts:', response.data.data.length);
      } else {
        console.warn('Unexpected response format from Voices hosts API:', response.data);
        setVoicesHosts([]);
      }
    } catch (error) {
      // More detailed error logging
      console.error('Error fetching Voices hosts:', error.message);
      if (error.response) {
        // The request was made and the server responded with a status code
        // that falls out of the range of 2xx
        console.error('Response data:', error.response.data);
        console.error('Response status:', error.response.status);
      } else if (error.request) {
        // The request was made but no response was received
        console.error('No response received:', error.request);
      }
      
      // Set empty array rather than leaving it undefined
      setVoicesHosts([]);
    }
  };

  // Handle remote control events (lock screen/notification controls)
  const setupRemoteControlEvents = async () => {
    try {
      // The global Audio.setOnPlaybackStatusUpdate doesn't exist
      // Instead, you need to set the status update handler on the Sound object directly
      
      // Don't set anything here, we'll handle this when we create the Sound object
      console.log('Remote controls setup will be handled when sound is created');
    } catch (error) {
      console.error('Error setting up remote controls:', error);
    }
  };

  // Update the useEffect to fetch hosts when component mounts
  useEffect(() => {
    fetchTiles();
    fetchLiveInfo();
    fetchVoicesHosts();
    setupRemoteControlEvents();

    // Fetch live info every minute
    const interval = setInterval(fetchLiveInfo, 60000);
    
    // Return cleanup function
    return async () => {
      clearInterval(interval);
      
      // Proper audio cleanup
      if (soundRef.current) {
        try {
          await soundRef.current.stopAsync();
          await soundRef.current.unloadAsync();
          soundRef.current = null;
          await Audio.setAudioModeAsync({ staysActiveInBackground: false });
        } catch (e) {
          console.error('Error cleaning up audio:', e);
        }
      }
    };
  }, []);

  // Add this effect to update lock screen metadata when the current show changes
  useEffect(() => {
    // We'll just update the app state, can't update system metadata directly
    if (isAirtimePlaying && currentShowName) {
      // Update any UI components that need to show this info
      // No need to call any Audio API methods here
      console.log('Now playing:', currentShowName);
    }
  }, [isAirtimePlaying, currentShowName]);

  const handleScroll = (event) => {
    const scrollX = event.nativeEvent.contentOffset.x;
    updateScrollPosition('home', scrollX);
  };

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
  }, [pathname]);

  const handleLocalTilePress = (item, index) => {
    handleTilePress(item, index);
    eventBus.emit('tile-pressed', { item, index });
    playerState.setMiniPlayer(true, item);
  };

  const getMaxScrollOffset = () => {
    return Math.max(0, (tiles.length - 1) * CAROUSEL_TILE_WIDTH);
  };

  return (
   <View style={styles.container}>
      <StatusBar barStyle="light-content" />
      
      {/* Action Buttons Container (Watch Live and Chat) */}
      <View style={styles.actionButtonsContainer}>
        <TouchableOpacity 
          style={styles.actionButton}
          onPress={toggleLiveStream}
        >
          <View style={styles.liveIndicator} />
          <Text style={styles.actionButtonText}>Watch Live</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={styles.actionButton}
          onPress={toggleChat}
        >
          <Ionicons name="chatbubble-ellipses-outline" size={18} color="#FFFFFF" />
          <Text style={styles.actionButtonText}>Chat</Text>
        </TouchableOpacity>
      </View>
      
      {/* Large Top Banner for Current Show */}
      <View style={styles.topBannerContainer}>
        <ImageBackground 
          source={currentArtistImage ? {uri: currentArtistImage} : VOICES_LOGO_URL}
          style={styles.topBannerImage}
          resizeMode="cover"
        >
          <View style={styles.topBannerOverlay}>
            {/* Show name at the top */}
            <Text style={styles.currentShowName} numberOfLines={2}>
              {decodeHTMLEntities(currentShowName || 'Voices Radio Live')}
            </Text>
            
            {/* Play button at bottom left */}
            <TouchableOpacity 
              style={styles.airtimePlayButton}
              onPress={toggleAirtimeStream}
              disabled={isLoadingAirtime}
            >
              {isLoadingAirtime ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <Ionicons 
                  name={isAirtimePlaying ? "pause" : "play"} 
                  size={36} 
                  color="#FFFFFF" 
                />
              )}
            </TouchableOpacity>
            
            {/* Schedule button at bottom right */}
            <TouchableOpacity
              style={styles.scheduleButton}
              onPress={() => router.push('/schedule')}
            >
              <Ionicons name="calendar" size={28} color="#FFFFFF" />
            </TouchableOpacity>
            
            {/* Schedule info now at bottom right, next to schedule button */}
            <View style={styles.scheduleContainer}>
              <Text style={styles.scheduleTime}>{currentTime}</Text>
              <Text style={styles.scheduleUpNext}>Up next: {nextShowTime}</Text>
              <Text style={styles.scheduleUpNextShow} numberOfLines={1}>
                {decodeHTMLEntities(nextShowName)}
              </Text>
            </View>
          </View>
        </ImageBackground>
      </View>
      
      {/* Featured Shows Section - Fixed size with absolute positioning */}
      <View style={styles.featuredSection}>
        <Text style={styles.sectionTitle}>Voices HQ Picks</Text>
        
        {isLoadingTiles ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={BRAND_COLORS.accent} />
            <Text style={styles.loadingText}>Loading shows...</Text>
          </View>
        ) : (
          <View style={styles.carouselContainer}>
            {/* FlatList */}
            <FlatList
              ref={flatListRef}
              data={tiles}
              horizontal
              pagingEnabled={true}
              showsHorizontalScrollIndicator={false}
              style={styles.flatListStyle}
              contentContainerStyle={styles.tilesCarouselContainer}
              keyExtractor={(item, index) => item._id || index.toString()}
              onScroll={handleScroll}
              scrollEventThrottle={16}
              getItemLayout={(data, index) => ({
                length: CAROUSEL_TILE_WIDTH,
                offset: CAROUSEL_TILE_WIDTH * index,
                index,
              })}
              renderItem={({ item, index }) => {
                const tileData = {
                  _id: item._id,
                  title: item.title,
                  imageUrl: item.imageUrl || FALLBACK_IMAGE_URL,
                  key: item.key,
                  iframeUrl: item.iframeUrl
                };

                const isThisTilePlaying = activeTileId === item._id && isPlaying;

                return (
                  <TouchableOpacity 
                    key={item._id || index}
                    style={styles.showCard}
                    onPress={() => handleLocalTilePress(tileData, index)}
                  >
                    <Image 
                      source={{ uri: item.imageUrl || FALLBACK_IMAGE_URL }} 
                      style={styles.showImage}
                      resizeMode="cover"
                      alignSelf="flex-start"
                    />
                    <View style={styles.showInfo}>
                      <Text style={styles.showName} numberOfLines={2}>{item.title}</Text>
                      
                      {item.genres && item.genres.length > 0 && (
                        <View style={styles.genreContainer}>
                          {item.genres.slice(0, 2).map((genre, idx) => (
                            <View key={idx} style={styles.genreTag}>
                              <Text style={styles.genreText}>{genre}</Text>
                            </View>
                          ))}
                        </View>
                      )}
                      
                      <TouchableOpacity 
                        style={styles.playButton}
                        onPress={() => handleLocalTilePress(tileData, index)}
                      >
                        <Ionicons 
                          name={isThisTilePlaying ? "pause" : "play"} 
                          size={24} 
                          color={BRAND_COLORS.primaryText} 
                        />
                      </TouchableOpacity>
                    </View>
                  </TouchableOpacity>
                );
              }}
            />
            </View>
          )}
        
        {/* Move arrows here, outside of carouselContainer but inside featuredSection */}
        {!isLoadingTiles && (
          <>
            <TouchableOpacity 
              style={[styles.arrowButton, styles.leftArrow]}
              onPress={() => {
                const currentIndex = Math.round((getScrollPosition('home') || 0) / CAROUSEL_TILE_WIDTH);
                const newIndex = currentIndex <= 0 ? tiles.length - 1 : currentIndex - 1;
                flatListRef.current?.scrollToIndex({
                  index: newIndex,
                  animated: true
                });
              }}
            >
              <Ionicons name="chevron-back" size={28} color={BRAND_COLORS.accent} />
        </TouchableOpacity>

            <TouchableOpacity 
              style={[styles.arrowButton, styles.rightArrow]}
              onPress={() => {
                const currentIndex = Math.round((getScrollPosition('home') || 0) / CAROUSEL_TILE_WIDTH);
                const newIndex = currentIndex >= tiles.length - 1 ? 0 : currentIndex + 1;
                flatListRef.current?.scrollToIndex({
                  index: newIndex,
                  animated: true
                });
              }}
            >
              <Ionicons name="chevron-forward" size={28} color={BRAND_COLORS.accent} />
            </TouchableOpacity>
          </>
        )}
      </View>

      
      <Modal
        visible={showLiveStream}
        animationType="slide"
        transparent={false}
        onRequestClose={() => setShowLiveStream(false)}
      >
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity 
              style={styles.closeButton}
              onPress={() => setShowLiveStream(false)}
            >
              <Ionicons name="arrow-back" size={24} color={BRAND_COLORS.primaryText} />
            </TouchableOpacity>
            <Text style={styles.modalTitle} numberOfLines={1}>
              Voices Radio Live
            </Text>
            <View style={styles.spacer} />
          </View>
          
          <View style={styles.liveStreamContainer}>
            <WebView
              ref={liveStreamWebViewRef}
              source={{
                uri: 'https://www.mixcloud.com/live/VoicesRadio/'
              }}
              style={styles.liveStreamWebView}
              mediaPlaybackRequiresUserAction={false}
              allowsInlineMediaPlayback={true}
              javaScriptEnabled={true}
              onMessage={handleWebViewMessage}
              injectedJavaScript={`
                (function() {
                  // Hide Mixcloud UI elements we don't need
                  const style = document.createElement('style');
                  style.textContent = \`
                    .header, .footer, .logo, 
                    .comments, .share-button, .like-button, .nav-header {
                      display: none !important;
                    }
                    
                    body, html, .player-container {
                      overflow: hidden !important;
                      background: #000 !important;
                      margin: 0 !important;
                      padding: 0 !important;
                    }
                    
                    .App {
                      margin-top: 0 !important;
                      padding-top: 0 !important;
                    }
                    
                    video {
                      object-fit: contain !important;
                      width: 100% !important;
                      height: 100% !important;
                    }
                  \`;
                  document.head.appendChild(style);
                  
                  // Monitor player status
                  function checkPlayerStatus() {
                    try {
                      const playButton = document.querySelector('.cloudcast-player-control-button');
                      if (playButton) {
                        const isPlaying = playButton.getAttribute('aria-label') === 'Pause';
                        
                        window.ReactNativeWebView.postMessage(JSON.stringify({
                          type: 'playbackStatus',
                          isPlaying: isPlaying
                        }));
                      }
                    } catch(e) {
                      console.error('Error checking player status:', e);
                    }
                  }
                  
                  // Check status frequently
                  setInterval(checkPlayerStatus, 1000);
                  
                  return true;
                })();
              `}
            />
            
            {isLiveStreamLoading && (
              <View style={styles.loadingOverlay}>
                <ActivityIndicator size="large" color="#FFFFFF" />
              </View>
            )}
          </View>
        </SafeAreaView>
      </Modal>
      
      {/* Chat Modal */}
      <Modal
        visible={showChat}
        animationType="slide"
        transparent={false}
        onRequestClose={() => setShowChat(false)}
      >
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity 
              style={styles.closeButton}
              onPress={() => setShowChat(false)}
            >
              <Ionicons name="arrow-back" size={24} color={BRAND_COLORS.primaryText} />
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Voices Radio Chat</Text>
            <View style={styles.spacer} />
          </View>
          
          <WebView
            source={{
              html: `
                <!DOCTYPE html>
                <html>
                <head>
                  <meta name="viewport" content="width=device-width, initial-scale=1.0">
                  <style>
                    body, html {
                      margin: 0;
                      padding: 0;
                      height: 100%;
                      overflow: hidden;
                    }
                    #chat-container {
                      width: 100%;
                      height: 100%;
                      position: relative;
                    }
                    .loading {
                      display: flex;
                      justify-content: center;
                      align-items: center;
                      height: 100%;
                      color: #FF9500;
                      font-family: -apple-system, BlinkMacSystemFont, sans-serif;
                    }
                  </style>
                </head>
                <body>
                  <div id="chat-container">
                    <div class="loading">Loading chat...</div>
                    <script>
                      // Load Chatango widget
                      window.onload = function() {
                        setTimeout(function() {
                          const iframe = document.createElement('iframe');
                          iframe.src = 'https://voicesradiokx.chatango.com/fullscreen';
                          iframe.style.width = '100%';
                          iframe.style.height = '100%';
                          iframe.style.border = 'none';
                          document.getElementById('chat-container').appendChild(iframe);
                          document.querySelector('.loading').style.display = 'none';
                        }, 1000);
                      };
                    </script>
                  </div>
                </body>
                </html>
              `
            }}
            style={styles.chatWebView}
            javaScriptEnabled={true}
            domStorageEnabled={true}
            cacheEnabled={false}
          />
        </SafeAreaView>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: BRAND_COLORS.background,
  },
  
  // Action Buttons (Watch Live and Chat)
  actionButtonsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    backgroundColor: BRAND_COLORS.accent,
    paddingVertical: 6,
    paddingHorizontal: 10,
    marginBottom: 0,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 4,
    paddingHorizontal: 12,
    borderRadius: 20,
  },
  actionButtonText: {
    fontSize: 14,
    color: '#FFFFFF',
    fontWeight: '600',
    marginLeft: 6,
  },
  liveIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#FF3B30',
    marginRight: 6,
  },
  
  // Top Banner
  topBannerContainer: {
    height: height * 0.35,
    width: width,
    marginTop: 0,
    marginBottom: 10,
  },
  topBannerImage: {
    width: '100%',
    height: '100%',
  },
  topBannerOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    padding: 15,
    position: 'relative', // For absolute positioning children
  },
  scheduleContainer: {
    position: 'absolute',
    bottom: 15, // Move to bottom
    right: 15, // Keep at right
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    borderRadius: 10,
    padding: 8,
    alignItems: 'center',
    zIndex: 10,
  },
  scheduleTime: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: 'bold',
  },
  scheduleUpNext: {
    color: '#FFFFFF',
    fontSize: 12,
    marginTop: 5,
  },
  scheduleUpNextShow: {
    color: '#FFFFFF',
    fontSize: 12,
    opacity: 0.8,
    maxWidth: 120,
  },
  currentShowName: {
    color: '#FFFFFF',
    fontSize: 24,
    fontWeight: 'bold',
    position: 'absolute',
    top: 15,
    left: 15,
    right: 15, // Now using full width since schedule is at bottom
    textShadowColor: 'rgba(0, 0, 0, 0.75)',
    textShadowOffset: {width: -1, height: 1},
    textShadowRadius: 10
  },
  airtimePlayButton: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#FFFFFF',
    position: 'absolute',
    bottom: 15, // Position from bottom
    left: 15, // Position from left
    zIndex: 10,
  },
  arrowButton: {
    width: 40,
    height: 40,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'absolute',
    top: '50%', // Center vertically
    marginTop: -20, // Half the height to truly center
    zIndex: 999, // Ensure high z-index to appear above all content
  },
  
  leftArrow: {
    left: 10, // 10 pixels from left screen edge
  },
  
  rightArrow: {
    right: 10, // 10 pixels from right screen edge
  },
  
  // Featured Shows Section - Fixed positioning
  featuredSection: {
    position: 'absolute',
    top: height * 0.45, // Position below the top banner
    left: 0,
    right: 0,
    bottom: -10, // Position just above the tab bar
    paddingBottom: 0,
    borderBottomWidth: 0, // Ensure no border at bottom
  },
  
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: BRAND_COLORS.primaryText,
    marginHorizontal: 15,
    marginBottom: 10,
  },
  
  carouselContainer: {
    flex: 1,
    width: '100%', // Full width of screen
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  
  flatListStyle: {
    width: CAROUSEL_TILE_WIDTH, // Exactly one tile width
  },
  
  tilesCarouselContainer: {
    // No horizontal padding so we only see one tile
  },
  
  showCard: {
    width: CAROUSEL_TILE_WIDTH,
    height: '95%', // Almost full height of container
    backgroundColor: BRAND_COLORS.background === '#FFFFFF' ? '#F5F5F5' : '#1A1A1A',
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 3,
    },
    shadowOpacity: 0.2,
    shadowRadius: 5,
    elevation: 5,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: BRAND_COLORS.background === '#FFFFFF' ? '#EEEEEE' : '#333333',
  },
  
  showImage: {
    width: '100%',
    height: '60%',
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
    overflow: 'hidden'
  },
  
  showInfo: {
    padding: 12,
    paddingBottom: 16,
  },
  
  showName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: BRAND_COLORS.primaryText,
    marginBottom: 6,
  },
  
  genreContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 8,
  },
  
  genreTag: {
    backgroundColor: BRAND_COLORS.accent + '33',
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 10,
    marginRight: 5,
    marginBottom: 3,
  },
  
  genreText: {
    color: BRAND_COLORS.primaryText,
    fontSize: 10,
  },
  
  playButton: {
    position: 'absolute',
    bottom: 12,
    right: 12,
    backgroundColor: BRAND_COLORS.accent,
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  
  // Tab Bar - Fixed at bottom
  tabBar: {
    flexDirection: 'row',
    backgroundColor: BRAND_COLORS.background,
    height: Platform.OS === 'ios' ? 80 : 60,
    paddingBottom: Platform.OS === 'ios' ? 25 : 10,
    paddingTop: 15,
    borderTopWidth: 0, // Remove the top border
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    justifyContent: 'space-around',
    alignItems: 'center',
    zIndex: 999,
  },
  
  // Modal styles
  modalContainer: {
    flex: 1,
    backgroundColor: BRAND_COLORS.background,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 15,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: BRAND_COLORS.border || '#333333',
  },
  closeButton: {
    padding: 5,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: BRAND_COLORS.primaryText,
    flex: 1,
    textAlign: 'center',
    marginHorizontal: 10,
  },
  spacer: {
    width: 24,
  },
  
  // Live Stream
  liveStreamContainer: {
    flex: 1,
    position: 'relative',
  },
  liveStreamWebView: {
    flex: 1,
    backgroundColor: '#000',
  },
  loadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  
  // Chat
  chatWebView: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  
  scheduleButton: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    position: 'absolute',
    top: 15,
    right: 15,
    zIndex: 10,
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
});

export default HomeScreen;