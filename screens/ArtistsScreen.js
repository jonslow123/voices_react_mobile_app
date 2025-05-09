import React, { useState, useEffect, useRef } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  FlatList, 
  Image, 
  TouchableOpacity, 
  ActivityIndicator,
  Alert,
  Dimensions,
  TextInput,
  Modal,
  ScrollView
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import axios from 'axios';
import { useRouter, usePathname } from 'expo-router';
import { usePlayer } from '../app/context/PlayerContext';
import Constants from 'expo-constants';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useScroll } from '../app/context/ScrollContext';
import { BRAND_COLORS } from '../app/styles/brandColors';
import { fetchWithPinning } from '../app/utils/secureNetwork';
import { getValidToken } from '../app/utils/tokenManager';
import soundcloudAPI from '../app/utils/soundcloudAPI';
const { width, height } = Dimensions.get('window');

const ArtistsScreen = ({ navigation }) => {
  const { handleTilePress } = usePlayer();
  const [hosts, setHosts] = useState([]);
  const [filteredHosts, setFilteredHosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const router = useRouter();
  const [subscribedArtists, setSubscribedArtists] = useState([]);
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [checkingSubscription, setCheckingSubscription] = useState(false);
  const [username, setUsername] = useState('');
  const flatListRef = useRef(null);
  const { updateScrollPosition, getScrollPosition } = useScroll();
  const pathname = usePathname();
  const [page, setPage] = useState(1);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMorePages, setHasMorePages] = useState(true);
  const [subscribingArtists, setSubscribingArtists] = useState([]);
  
  // Search and filter states
  const [searchQuery, setSearchQuery] = useState('');
  const [showFilterModal, setShowFilterModal] = useState(false);
  const [selectedGenres, setSelectedGenres] = useState([]);
  const [allGenres, setAllGenres] = useState([]);

  // New state variables
  const [soundcloudHosts, setSoundcloudHosts] = useState([]);
  const [loadingSoundcloud, setLoadingSoundcloud] = useState(false);
  const [combinedHosts, setCombinedHosts] = useState([]);

  // Get status bar height
  const statusBarHeight = Constants.statusBarHeight || 0;

  // Effect to extract all unique genres from hosts
  useEffect(() => {
    if (hosts.length > 0) {
      const genresSet = new Set();
      
      // Only collect genres that actually exist in the current data
      hosts.forEach(host => {
        if (host.genres && host.genres.length > 0) {
          host.genres.forEach(genre => genresSet.add(genre));
        }
      });
      
      // Convert to array and sort alphabetically
      const uniqueGenres = Array.from(genresSet).sort();
      setAllGenres(uniqueGenres);
    }
  }, [hosts]);

  // Effect to filter hosts based on search query and selected genres
  useEffect(() => {
    if (hosts.length > 0) {
      let filtered = [...hosts];
      
      // Apply search filter
      if (searchQuery.trim() !== '') {
        const query = searchQuery.toLowerCase();
        filtered = filtered.filter(host => 
          host.name.toLowerCase().includes(query)
        );
      }
      
      // Apply genre filter
      if (selectedGenres.length > 0) {
        filtered = filtered.filter(host => {
          // Check if any of the host's genres match any selected genre
          return host.genres && host.genres.some(genre => 
            selectedGenres.includes(genre)
          );
        });
      }
      
      setFilteredHosts(filtered);
    } else {
      setFilteredHosts([]);
    }
  }, [hosts, searchQuery, selectedGenres]);

  useEffect(() => {
    console.log('Screen focused - fetching data for artist:', username);
    let isActive = true;

    const fetchData = async () => {
      if (isActive) {
        await fetchHosts();
        await fetchSoundCloudTracks();
        await fetchSubscribedArtists();
        await checkSubscriptionStatus();
      }
    };

    fetchData();

    return () => {
      console.log('Screen unfocused - cleaning up');
      isActive = false;
    };
  }, [username]);

  // Fetch subscribed artists whenever the screen comes into focus
  useEffect(() => {
    fetchSubscribedArtists();
  }, [pathname]); // This will run when navigating back to the Artists screen

  const fetchHosts = async (currentPage = 1, isLoadingMore = false) => {
    try {
      // Loading state logic
      if (currentPage === 1 && !isLoadingMore) {
        setLoading(true);
      } else if (isLoadingMore) {
        setLoadingMore(true);
      }

      // Calculate offset for pagination (keep this for future pagination support)
      const limit = 20;
      const offset = (currentPage - 1) * limit;
      
      // Fetch artists from MongoDB
      // For now, we're not using pagination parameters since the API doesn't support it yet
      const response = await axios.get(
        `${process.env.EXPO_PUBLIC_BACKEND_URL}/api/artists`
      );
      
      // Ensure we have valid data
      if (!response || !response.data) {
        throw new Error('Invalid data format from server');
      }
      
      // The response is an array directly, not an object with 'artists' property
      const artistsData = response.data;
      
      console.log('Artists fetched:', artistsData.length);
      
      // Assume there's no more pages for now (can be updated when API supports pagination)
      setHasMorePages(false);
      
      // Transform data to match expected format
      const formattedArtists = artistsData.map(artist => ({
        _id: artist._id,
        username: artist.mixcloudUsername || artist._id,
        name: artist.name,
        pictures: { 
          extra_large: artist.imageUrl 
        },
        showCount: artist.shows?.length || 0,
        // Use genres directly from MongoDB
        genres: artist.genres?.slice(0, 3) || [],
        allGenres: artist.genres?.map(genre => ({ name: genre, count: 1 })) || []
      }));
      
      // Update state with the artists
      setHosts(prevHosts => {
        if (currentPage === 1) {
          return formattedArtists;
        } else {
          return [...prevHosts, ...formattedArtists];
        }
      });

      setError(null);
      setPage(currentPage);
    } catch (err) {
      console.error('Error fetching artists:', err);
      setError('Failed to load artists. Please check your internet connection and try again.');
    } finally {
      setLoading(false);
      setLoadingMore(false);
      setRefreshing(false);
    }
  };

  const fetchSubscribedArtists = async () => {
    try {
      // Get a valid token, which will refresh if needed
      const token = await getValidToken();
      
      if (!token) {
        console.log('No valid token available');
        return;
      }

      const response = await axios.get(
        `${process.env.EXPO_PUBLIC_BACKEND_URL}/api/users/me`,
        {
          headers: { 
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        }
      );
      
      if (response.data.artistsSubscribed) {
        // Flatten the nested arrays
        const flattenedArtists = response.data.artistsSubscribed.flat();
        setSubscribedArtists(flattenedArtists);
      }
    } catch (error) {
      console.error('Error fetching subscribed artists:', error);
    }
  };

  const checkSubscriptionStatus = async () => {
    try {
      console.log('Checking subscription status for artist:', username);
      
      // Get a valid token, which will refresh if needed
      const token = await getValidToken();
      
      if (!token) {
        console.log('No valid token available');
        setCheckingSubscription(false);
        return;
      }

      const response = await axios.get(
        `${process.env.EXPO_PUBLIC_BACKEND_URL}/api/users/me`,
        {
          headers: { 
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        }
      );

      setIsSubscribed(response.data.artistsSubscribed?.includes(username) || false);
      console.log('Set isSubscribed to:', response.data.artistsSubscribed?.includes(username));
    } catch (error) {
      console.error('Error checking subscription status:', {
        message: error.message,
        response: error.response?.data,
        status: error.response?.status,
        url: error.config?.url
      });
    } finally {
      setCheckingSubscription(false);
    }
  };

  const handleSubscribe = async (artistUsername) => {
    try {
      // Add artist to loading state
      setSubscribingArtists(prev => [...prev, artistUsername]);
      
      // Use getValidToken instead of AsyncStorage.getItem
      const token = await getValidToken();
      
      if (!token) {
        Alert.alert('Login Required', 'Please log in to subscribe to artists');
        router.replace('/login');
        return;
      }

      const isSubscribed = subscribedArtists.includes(artistUsername);
      const endpoint = isSubscribed ? 'unsubscribe' : 'subscribe';

      // Show loading indicator or disable button while request is in progress
      // This prevents multiple clicks
      
      const response = await axios.post(
        `${process.env.EXPO_PUBLIC_BACKEND_URL}/api/users/${endpoint}/${artistUsername}`,
        {},
        { 
          headers: { 
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json'
          } 
        }
      );

      // Update the local state with the new array from the response
      if (response.data.artistsSubscribed) {
        const flattenedArtists = response.data.artistsSubscribed.flat();
        setSubscribedArtists(flattenedArtists);
        
        // If this is in the detail view, also update the isSubscribed state
        if (username === artistUsername) {
          setIsSubscribed(endpoint === 'subscribe');
        }
        
        // Show success toast or message
        console.log(`Successfully ${endpoint}d from ${artistUsername}`);
      }
    } catch (error) {
      console.error('Subscription error details:', {
        message: error.message,
        response: error.response?.data,
        status: error.response?.status
      });
      
      // Check if it's an authorization error
      if (error.response?.status === 401) {
        Alert.alert(
          'Session Expired',
          'Your session has expired. Please log in again.',
          [
            {
              text: 'OK',
              onPress: () => router.replace('/login')
            }
          ]
        );
        return;
      }
      
      Alert.alert(
        'Error',
        error.response?.data?.message || 'Failed to update subscription'
      );
    } finally {
      // Remove artist from loading state when done
      setSubscribingArtists(prev => prev.filter(username => username !== artistUsername));
    }
  };

  const fetchSoundCloudTracks = async () => {
    console.log('Fetching SoundCloud tracks');
    setLoadingSoundcloud(true);
    
    try {
      const tracks = await soundcloudAPI.getVoicesTracks(50, 0);
      console.log(`Fetched ${tracks.length} SoundCloud tracks`);
      
      // Extract artists from track titles
      const artistsMap = new Map();
      
      tracks.forEach(track => {
        const artistName = soundcloudAPI.extractArtistFromTitle(track.title);
        if (artistName) {
          // Create or update artist in our map
          if (!artistsMap.has(artistName.toLowerCase())) {
            artistsMap.set(artistName.toLowerCase(), {
              username: artistName.toLowerCase().replace(/\s+/g, ''),
              name: artistName,
              source: 'soundcloud',
              pictures: { 
                extra_large: track.artwork_url ? track.artwork_url.replace('-large', '-t500x500') : null 
              },
              showCount: 1,
              genres: track.genre ? [track.genre] : [],
              // Store track IDs associated with this artist
              trackIds: [track.id]
            });
          } else {
            // Update existing artist
            const artist = artistsMap.get(artistName.toLowerCase());
            artist.showCount++;
            // Add genre if not already included
            if (track.genre && !artist.genres.includes(track.genre)) {
              artist.genres.push(track.genre);
            }
            // Add track ID to list
            artist.trackIds.push(track.id);
          }
        }
      });
      
      // Convert map to array
      const soundcloudArtists = Array.from(artistsMap.values());
      console.log(`Extracted ${soundcloudArtists.length} SoundCloud artists`);
      
      setSoundcloudHosts(soundcloudArtists);
    } catch (error) {
      console.error('Failed to fetch SoundCloud tracks:', error);
    } finally {
      setLoadingSoundcloud(false);
    }
  };

  const combineHosts = () => {
    // Create a map of Mixcloud hosts by lowercase name
    const mixcloudHostMap = new Map();
    hosts.forEach(host => {
      mixcloudHostMap.set(host.name.toLowerCase(), host);
    });
    
    // Start with Mixcloud hosts
    const combined = [...hosts];
    
    // Add SoundCloud hosts that don't exist in Mixcloud
    soundcloudHosts.forEach(scHost => {
      if (!mixcloudHostMap.has(scHost.name.toLowerCase())) {
        combined.push(scHost);
      }
    });
    
    setCombinedHosts(combined);
    console.log(`Combined ${hosts.length} Mixcloud + ${soundcloudHosts.length} SoundCloud hosts = ${combined.length} total`);
  };

  useEffect(() => {
    if (combinedHosts.length > 0) {
      let filtered = [...combinedHosts];
      
      // Apply search filter
      if (searchQuery.trim() !== '') {
        const query = searchQuery.toLowerCase();
        filtered = filtered.filter(host => 
          host.name.toLowerCase().includes(query)
        );
      }
      
      // Apply genre filter
      if (selectedGenres.length > 0) {
        filtered = filtered.filter(host => {
          // Check if any of the host's genres match any selected genre
          return host.genres && host.genres.some(genre => 
            selectedGenres.includes(genre)
          );
        });
      }
      
      setFilteredHosts(filtered);
    } else {
      setFilteredHosts([]);
    }
  }, [combinedHosts, searchQuery, selectedGenres]);

  const navigateToArtistDetails = (host) => {
    if (host.source === 'soundcloud') {
      // For SoundCloud artists
      router.push({
        pathname: '/(artists)/details',
        params: {
          username: host.username,
          name: host.name,
          imageUrl: host.pictures.extra_large,
          genres: host.genres ? host.genres.join(',') : '',
          source: 'soundcloud',
          trackIds: host.trackIds ? host.trackIds.join(',') : '',
          artistId: host._id
        }
      });
    } else {
      // For MongoDB artists
      router.push({
        pathname: '/(artists)/details',
        params: {
          username: host.mixcloudUsername || host.username,
          name: host.name,
          imageUrl: host.pictures.extra_large,
          genres: host.genres ? host.genres.join(',') : '',
          artistId: host._id
        }
      });
    }
  };

  const renderHost = ({ item }) => {
    const isSubscribed = subscribedArtists.includes(item.username);
    const isSubscribing = subscribingArtists.includes(item.username);

    return (
      <TouchableOpacity
        style={styles.hostCard}
        onPress={() => navigateToArtistDetails(item)}
      >
        <View style={styles.imageContainer}>
          <Image 
            source={{ uri: item.pictures.extra_large || 'https://via.placeholder.com/100' }} 
            style={styles.hostImage}
            resizeMode="cover"
          />
          {/* Display source badge if SoundCloud */}
          {item.source === 'soundcloud' && (
            <View style={styles.sourceBadge}>
              <Text style={styles.sourceBadgeText}>SoundCloud</Text>
            </View>
          )}
          <TouchableOpacity 
            style={[
              styles.subscribeButton,
              isSubscribed && styles.subscribedButton
            ]}
            onPress={(e) => {
              e.stopPropagation();
              if (!isSubscribing) {
                handleSubscribe(item.username);
              }
            }}
            disabled={isSubscribing}
          >
            {isSubscribing ? (
              <ActivityIndicator size="small" color={isSubscribed ? BRAND_COLORS.background : BRAND_COLORS.accent} />
            ) : (
              <Ionicons 
                name={isSubscribed ? "star" : "star-outline"} 
                size={20} 
                color={isSubscribed ? BRAND_COLORS.background : BRAND_COLORS.accent} 
              />
            )}
          </TouchableOpacity>
        </View>
        <View style={styles.hostInfo}>
          <Text style={styles.hostName}>{item.name}</Text>
          <Text style={styles.showCount}>
            {item.showCount} {item.showCount === 1 ? 'Show' : 'Shows'}
          </Text>
          
          {/* Display genres if available */}
          {item.genres && item.genres.length > 0 && (
            <View style={styles.genresContainer}>
              {item.genres.map((genre, index) => (
                <View key={index} style={styles.genreTag}>
                  <Text style={styles.genreText}>{genre}</Text>
                </View>
              ))}
            </View>
          )}
        </View>
      </TouchableOpacity>
    );
  };

  // Handle scroll position saving
  const handleScroll = (event) => {
    const scrollY = event.nativeEvent.contentOffset.y;
    updateScrollPosition('artists', scrollY);
  };

  // Restore scroll position when pathname changes
  useEffect(() => {
    const scrollPosition = getScrollPosition('artists');
    if (flatListRef.current && scrollPosition > 0) {
      setTimeout(() => {
        flatListRef.current.scrollToOffset({
          offset: scrollPosition,
          animated: false
        });
      }, 100);
    }
  }, [pathname]);

  // Handle loading more when reaching end of list
  const handleLoadMore = () => {
    // Only fetch more if we're not already loading and have more pages
    if (!loadingMore && hasMorePages) {
      fetchHosts(page + 1, true);
    }
  };

  // Add pull-to-refresh functionality
  const handleRefresh = () => {
    setRefreshing(true);
    fetchHosts(1);
  };

  // Toggle a genre selection
  const toggleGenreSelection = (genre) => {
    setSelectedGenres(prevSelected => 
      prevSelected.includes(genre)
        ? prevSelected.filter(g => g !== genre)
        : [...prevSelected, genre]
    );
  };

  // Clear all filters
  const clearFilters = () => {
    setSelectedGenres([]);
  };

  // Render filter modal
  const renderFilterModal = () => {
    return (
      <Modal
        visible={showFilterModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowFilterModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Filter by Genre</Text>
              <TouchableOpacity 
                onPress={() => setShowFilterModal(false)}
                style={styles.closeButton}
              >
                <Ionicons name="close" size={24} color="black" />
              </TouchableOpacity>
            </View>
            
            {selectedGenres.length > 0 && (
              <TouchableOpacity 
                style={styles.clearFiltersButton}
                onPress={clearFilters}
              >
                <Text style={styles.clearFiltersText}>Clear All Filters</Text>
              </TouchableOpacity>
            )}
            
            <ScrollView style={styles.genresList}>
              {allGenres.map((genre, index) => (
                <TouchableOpacity
                  key={index}
                  style={styles.genreItem}
                  onPress={() => toggleGenreSelection(genre)}
                >
                  <View style={styles.checkboxContainer}>
                    <View style={[
                      styles.checkbox,
                      selectedGenres.includes(genre) && styles.checkboxSelected
                    ]}>
                      {selectedGenres.includes(genre) && (
                        <Ionicons name="checkmark" size={16} color="white" />
                      )}
                    </View>
                    <Text style={styles.genreItemText}>{genre}</Text>
                  </View>
                </TouchableOpacity>
              ))}
            </ScrollView>
            
            <TouchableOpacity
              style={styles.applyButton}
              onPress={() => setShowFilterModal(false)}
            >
              <Text style={styles.applyButtonText}>Apply</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    );
  };

  // Modified to render search and filter UI
  if (loading && page === 1) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={styles.loadingText}>Loading artists...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.searchContainer}>
        <View style={styles.searchInputContainer}>
          <Ionicons name="search" size={20} color="gray" style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search artists..."
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholderTextColor="gray"
          />
          {searchQuery !== '' && (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <Ionicons name="close-circle" size={20} color="gray" />
            </TouchableOpacity>
          )}
        </View>
        
        <TouchableOpacity 
          style={styles.filterButton}
          onPress={() => setShowFilterModal(true)}
        >
          <Ionicons 
            name="options" 
            size={22} 
            color={selectedGenres.length > 0 ? BRAND_COLORS.accent : "gray"} 
          />
          {selectedGenres.length > 0 && (
            <View style={styles.filterBadge}>
              <Text style={styles.filterBadgeText}>{selectedGenres.length}</Text>
            </View>
          )}
        </TouchableOpacity>
      </View>
      
      {selectedGenres.length > 0 && (
        <View style={styles.activeFiltersContainer}>
          <ScrollView 
            horizontal 
            showsHorizontalScrollIndicator={false}
            style={styles.activeFiltersScroll}
          >
            {selectedGenres.map((genre, index) => (
              <TouchableOpacity 
                key={index} 
                style={styles.activeFilterTag}
                onPress={() => toggleGenreSelection(genre)}
              >
                <Text style={styles.activeFilterText}>{genre}</Text>
                <Ionicons name="close-circle" size={16} color="white" style={styles.removeFilterIcon} />
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      )}
      
    <FlatList
        ref={flatListRef}
        data={filteredHosts}
        renderItem={renderHost}
        keyExtractor={(item) => item.username}
        contentContainerStyle={styles.listContent}
        onEndReached={handleLoadMore}
        onEndReachedThreshold={0.5}
        onRefresh={handleRefresh}
        refreshing={refreshing}
        onScroll={handleScroll}
        ListFooterComponent={loadingMore ? (
          <View style={styles.loadingMoreContainer}>
            <ActivityIndicator size="small" color="#007AFF" />
            <Text style={styles.loadingMoreText}>Loading more artists...</Text>
          </View>
        ) : null}
        ListEmptyComponent={
          <View style={styles.emptyResultsContainer}>
            <Ionicons name="search-outline" size={64} color="gray" />
            <Text style={styles.emptyResultsText}>
              {searchQuery || selectedGenres.length > 0 
                ? "No artists match your search criteria" 
                : "No artists found"}
            </Text>
            {(searchQuery || selectedGenres.length > 0) && (
              <TouchableOpacity 
                style={styles.clearSearchButton}
                onPress={() => {
                  setSearchQuery('');
                  setSelectedGenres([]);
                }}
              >
                <Text style={styles.clearSearchButtonText}>Clear Search & Filters</Text>
              </TouchableOpacity>
            )}
          </View>
        }
      />
      
      {renderFilterModal()}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: BRAND_COLORS.background, 
    padding: 0,
    margin: 0,
    width: width,
    height: height
  },
  contentContainer: {
    flex: 1,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 16,
    color: '#333',
  },
  listContent: {
    padding: 15,
  },
  hostCard: {
    flexDirection: 'row',
    backgroundColor: 'white',
    borderRadius: 10,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 3,
    overflow: 'hidden',
  },
  imageContainer: {
    position: 'relative',
    width: 100,
    height: 100,
  },
  hostImage: {
    width: '100%',
    height: '100%',
  },
  hostInfo: {
    flex: 1,
    padding: 12,
    justifyContent: 'center',
    gap: 4,
  },
  hostName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  showCount: {
    fontSize: 14,
    color: '#666',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#666',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
    padding: 16,
  },
  errorText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginTop: 12,
    marginBottom: 24,
  },
  retryButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  retryButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  subscribeButton: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    borderRadius: 15,
    width: 30,
    height: 30,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  subscribedButton: {
    backgroundColor: BRAND_COLORS.accent,
  },
  footerLoading: {
    paddingVertical: 20,
    alignItems: 'center',
  },
  footerLoadingText: {
    fontSize: 14,
    color: '#666',
    marginTop: 8,
  },
  genresContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 4,
  },
  genreTag: {
    backgroundColor: BRAND_COLORS.accent,
    borderRadius: 16,
    paddingVertical: 2,
    paddingHorizontal: 8,
    marginRight: 4,
    marginBottom: 4,
  },
  genreText: {
    color: BRAND_COLORS.background,
    fontSize: 13,
    fontWeight: '500',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: BRAND_COLORS.background,
    borderBottomWidth: 1,
    borderBottomColor: '#2a2a2a',
  },
  searchInputContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#2a2a2a',
    borderRadius: 8,
    paddingHorizontal: 10,
    height: 40,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    color: 'white',
    height: 40,
    fontSize: 16,
  },
  filterButton: {
    marginLeft: 12,
    padding: 8,
    borderRadius: 8,
    backgroundColor: '#2a2a2a',
    position: 'relative',
  },
  filterBadge: {
    position: 'absolute',
    top: -5,
    right: -5,
    backgroundColor: BRAND_COLORS.accent,
    borderRadius: 10,
    width: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  filterBadgeText: {
    color: 'white',
    fontSize: 12,
    fontWeight: 'bold',
  },
  activeFiltersContainer: {
    backgroundColor: BRAND_COLORS.background,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#2a2a2a',
  },
  activeFiltersScroll: {
    paddingHorizontal: 12,
  },
  activeFilterTag: {
    backgroundColor: BRAND_COLORS.accent,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    marginRight: 8,
  },
  activeFilterText: {
    color: 'white',
    marginRight: 4,
    fontSize: 14,
  },
  removeFilterIcon: {
    marginLeft: 2,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: 'white',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    paddingHorizontal: 16,
    paddingBottom: 30,
    maxHeight: height * 0.7,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  closeButton: {
    padding: 4,
  },
  genresList: {
    marginVertical: 16,
  },
  genreItem: {
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  checkboxContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#ccc',
    marginRight: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxSelected: {
    backgroundColor: BRAND_COLORS.accent,
    borderColor: BRAND_COLORS.accent,
  },
  genreItemText: {
    fontSize: 16,
  },
  clearFiltersButton: {
    marginTop: 16,
    paddingVertical: 8,
    alignSelf: 'flex-start',
  },
  clearFiltersText: {
    color: BRAND_COLORS.accent,
    fontSize: 16,
  },
  applyButton: {
    backgroundColor: BRAND_COLORS.accent,
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 16,
  },
  applyButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  emptyResultsContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 60,
    paddingHorizontal: 24,
  },
  emptyResultsText: {
    color: 'gray',
    fontSize: 16,
    textAlign: 'center',
    marginTop: 12,
  },
  clearSearchButton: {
    marginTop: 20,
    paddingVertical: 10,
    paddingHorizontal: 16,
    backgroundColor: BRAND_COLORS.accent,
    borderRadius: 8,
  },
  clearSearchButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '500',
  },
  loadingMoreContainer: {
    padding: 16,
    alignItems: 'center',
  },
  loadingMoreText: {
    marginTop: 8,
    color: 'gray',
  },
  sourceBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: '#ff7700', // SoundCloud orange
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderTopLeftRadius: 6,
  },
  sourceBadgeText: {
    color: 'white',
    fontSize: 10,
    fontWeight: 'bold',
  },
});

export default ArtistsScreen;