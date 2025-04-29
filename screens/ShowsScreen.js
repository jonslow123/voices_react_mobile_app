import React, { useState, useEffect, useRef } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  FlatList, 
  Image, 
  TouchableOpacity, 
  ActivityIndicator,
  Dimensions,
  TextInput,
  Modal,
  ScrollView
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import axios from 'axios';
import { useRouter } from 'expo-router';
import { usePlayer } from '../app/context/PlayerContext';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useScroll } from '../app/context/ScrollContext';
import { BRAND_COLORS } from '../app/styles/brandColors';
import { fetchWithPinning } from '../app/utils/secureNetwork';

const { width } = Dimensions.get('window');

const ShowsScreen = () => {
  const { handleTilePress } = usePlayer();
  const [shows, setShows] = useState([]);
  const [filteredShows, setFilteredShows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const router = useRouter();
  const flatListRef = useRef(null);
  const { updateScrollPosition, getScrollPosition } = useScroll();
  const [page, setPage] = useState(1);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMorePages, setHasMorePages] = useState(true);
  
  // Search and filter states
  const [searchQuery, setSearchQuery] = useState('');
  const [showFilterModal, setShowFilterModal] = useState(false);
  const [selectedGenres, setSelectedGenres] = useState([]);
  const [allGenres, setAllGenres] = useState([]);

  // Effect to extract all unique genres from shows
  useEffect(() => {
    if (shows.length > 0) {
      const genresSet = new Set();
      
      // Only collect genres that actually exist in the current data
      shows.forEach(show => {
        if (show.genres && show.genres.length > 0) {
          show.genres.forEach(genre => genresSet.add(genre));
        }
      });
      
      // Convert to array and sort alphabetically
      const uniqueGenres = Array.from(genresSet).sort();
      setAllGenres(uniqueGenres);
    }
  }, [shows]);

  // Effect to filter shows based on search query and selected genres
  useEffect(() => {
    if (shows.length > 0) {
      let filtered = [...shows];
      
      // Apply search filter
      if (searchQuery.trim() !== '') {
        const query = searchQuery.toLowerCase();
        filtered = filtered.filter(show => 
          show.name.toLowerCase().includes(query)
        );
      }
      
      // Apply genre filter
      if (selectedGenres.length > 0) {
        filtered = filtered.filter(show => {
          // Check if any of the show's genres match any selected genre
          return show.genres && show.genres.some(genre => 
            selectedGenres.includes(genre)
          );
        });
      }
      
      setFilteredShows(filtered);
    } else {
      setFilteredShows([]);
    }
  }, [shows, searchQuery, selectedGenres]);

  useEffect(() => {
    fetchShows();
  }, []);

  const fetchShows = async (currentPage = 1, isLoadingMore = false) => {
    try {
      // Loading state logic
      if (currentPage === 1 && !isLoadingMore) {
        setLoading(true);
      } else if (isLoadingMore) {
        setLoadingMore(true);
      }

      // Calculate offset for pagination
      const offset = (currentPage - 1) * 20;
      
      // Fetch shows data
      let response;
      try {
        response = await fetchWithPinning(`https://api.mixcloud.com/VoicesRadio/cloudcasts/?limit=20&offset=${offset}`);
      } catch (fetchError) {
        console.log('Falling back to direct fetch');
        const directResponse = await fetch(`https://api.mixcloud.com/VoicesRadio/cloudcasts/?limit=20&offset=${offset}`);
        const jsonData = await directResponse.json();
        response = { data: jsonData };
      }
      
      // Ensure we have valid data
      if (!response || !response.data || !response.data.data) {
        throw new Error('Invalid data format from server');
      }
      
      console.log('Shows fetched:', response.data.data.length);
      
      // Check if there are more pages to load
      const hasMore = response.data.paging && response.data.paging.next;
      setHasMorePages(!!hasMore);
      
      // Process shows data to extract important info
      const processedShows = response.data.data.map(show => {
        // Extract genres from tags
        const genres = show.tags 
          ? show.tags.map(tag => tag.name).slice(0, 3) 
          : [];
          
        // Create a clean object with the data we need
        return {
          id: show.key,
          name: show.name,
          username: show.user.username,
          owner: show.user.name,
          url: show.url,
          key: show.key,
          imageUrl: show.pictures?.large,
          genres: genres,
          playUrl: `https://player-widget.mixcloud.com/widget/iframe/?hide_cover=1&mini=1&light=1&feed=${encodeURIComponent(show.key)}`,
        };
      });
      
      // Update state with the processed shows
      setShows(prevShows => {
        if (currentPage === 1) {
          return processedShows;
        } else {
          return [...prevShows, ...processedShows];
        }
      });

      setError(null);
      setPage(currentPage);
    } catch (err) {
      console.error('Error fetching shows:', err);
      setError('Failed to load shows. Please check your internet connection and try again.');
    } finally {
      setLoading(false);
      setLoadingMore(false);
      setRefreshing(false);
    }
  };

  const toggleGenreSelection = (genre) => {
    setSelectedGenres(prev => {
      if (prev.includes(genre)) {
        return prev.filter(g => g !== genre);
      } else {
        return [...prev, genre];
      }
    });
  };

  const clearFilters = () => {
    setSelectedGenres([]);
    setShowFilterModal(false);
  };

  const renderFilterModal = () => {
    return (
      <Modal
        animationType="slide"
        transparent={true}
        visible={showFilterModal}
        onRequestClose={() => setShowFilterModal(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Filter by Genre</Text>
              <TouchableOpacity 
                style={styles.closeButton}
                onPress={() => setShowFilterModal(false)}
              >
                <Ionicons name="close" size={24} color={BRAND_COLORS.primaryText} />
              </TouchableOpacity>
            </View>
            
            <ScrollView style={styles.genreList}>
              {allGenres.map((genre, index) => (
                <TouchableOpacity 
                  key={index}
                  style={styles.genreItem}
                  onPress={() => toggleGenreSelection(genre)}
                >
                  <Text style={styles.genreName}>{genre}</Text>
                  {selectedGenres.includes(genre) && (
                    <Ionicons name="checkmark" size={22} color={BRAND_COLORS.accent} />
                  )}
                </TouchableOpacity>
              ))}
            </ScrollView>
            
            <View style={styles.modalFooter}>
              <TouchableOpacity 
                style={styles.clearButton}
                onPress={clearFilters}
              >
                <Text style={styles.clearButtonText}>Clear All</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={styles.applyButton}
                onPress={() => setShowFilterModal(false)}
              >
                <Text style={styles.applyButtonText}>Apply</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    );
  };

  const renderShow = ({ item }) => {
    return (
      <TouchableOpacity 
        style={styles.showCard}
        onPress={() => {
          // Create tile data compatible with the player
          const tileData = {
            _id: item.id,
            title: item.name,
            imageUrl: item.imageUrl,
            key: item.key,
            iframeUrl: item.playUrl
          };
          
          // Use the player context to handle playback
          handleTilePress(tileData);
        }}
      >
        <Image 
          source={{ uri: item.imageUrl }} 
          style={styles.showImage}
          defaultSource={require('../assets/logo.png')}
        />
        
        <View style={styles.showInfo}>
          <Text style={styles.showName} numberOfLines={2}>{item.name}</Text>
          <Text style={styles.artistName} numberOfLines={1}>by {item.owner}</Text>
          
          {item.genres && item.genres.length > 0 && (
            <View style={styles.genreContainer}>
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

  const handleLoadMore = () => {
    if (hasMorePages && !loadingMore) {
      fetchShows(page + 1, true);
    }
  };

  const handleRefresh = () => {
    setRefreshing(true);
    fetchShows(1);
  };

  const displayedShows = searchQuery.trim() !== '' || selectedGenres.length > 0 
    ? filteredShows 
    : shows;

  return (
    <View style={styles.container}>
      {/* Search Bar and Filter */}
      <View style={styles.searchContainer}>
        <View style={styles.searchBar}>
          <Ionicons name="search" size={20} color={BRAND_COLORS.secondaryText} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search shows..."
            placeholderTextColor={BRAND_COLORS.secondaryText}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery !== '' && (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <Ionicons name="close-circle" size={18} color={BRAND_COLORS.secondaryText} />
            </TouchableOpacity>
          )}
        </View>
        
        <TouchableOpacity 
          style={styles.filterButton}
          onPress={() => setShowFilterModal(true)}
        >
          <Ionicons 
            name="filter" 
            size={22} 
            color={selectedGenres.length > 0 ? BRAND_COLORS.accent : BRAND_COLORS.secondaryText} 
          />
          {selectedGenres.length > 0 && (
            <View style={styles.filterBadge}>
              <Text style={styles.filterBadgeText}>{selectedGenres.length}</Text>
            </View>
          )}
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={BRAND_COLORS.accent} />
          <Text style={styles.loadingText}>Loading shows...</Text>
        </View>
      ) : error ? (
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle" size={48} color={BRAND_COLORS.error || '#FF3B30'} />
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity 
            style={styles.retryButton}
            onPress={() => fetchShows()}
          >
            <Text style={styles.retryText}>Retry</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          ref={flatListRef}
          data={displayedShows}
          renderItem={renderShow}
          keyExtractor={(item) => item.id}
          numColumns={2}
          contentContainerStyle={styles.showsGrid}
          onEndReached={handleLoadMore}
          onEndReachedThreshold={0.5}
          refreshing={refreshing}
          onRefresh={handleRefresh}
          ListFooterComponent={
            loadingMore ? 
              <ActivityIndicator size="large" color={BRAND_COLORS.accent} style={styles.loadMoreSpinner} /> 
              : null
          }
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Ionicons name="radio-outline" size={64} color={BRAND_COLORS.secondaryText} />
              <Text style={styles.emptyText}>
                {searchQuery || selectedGenres.length > 0 
                  ? 'No shows match your search' 
                  : 'No shows available'}
              </Text>
            </View>
          }
        />
      )}

      {renderFilterModal()}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: BRAND_COLORS.background,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: BRAND_COLORS.border || '#333',
  },
  searchBar: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: BRAND_COLORS.background === '#FFFFFF' ? '#F5F5F5' : '#333333',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
    marginRight: 10,
  },
  searchInput: {
    flex: 1,
    color: BRAND_COLORS.primaryText,
    marginLeft: 8,
    fontSize: 16,
  },
  filterButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: BRAND_COLORS.background === '#FFFFFF' ? '#F5F5F5' : '#333333',
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  filterBadge: {
    position: 'absolute',
    top: 0,
    right: 0,
    backgroundColor: BRAND_COLORS.accent,
    width: 16,
    height: 16,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  filterBadgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: 'bold',
  },
  showsGrid: {
    padding: 8,
  },
  showCard: {
    width: (width - 36) / 2, // 2 columns with spacing
    backgroundColor: BRAND_COLORS.background === '#FFFFFF' ? '#F5F5F5' : '#1A1A1A',
    borderRadius: 8,
    marginHorizontal: 5,
    marginVertical: 5,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  showImage: {
    width: '100%',
    height: (width - 36) / 2,
    backgroundColor: '#333',
  },
  showInfo: {
    padding: 10,
  },
  showName: {
    color: BRAND_COLORS.primaryText,
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  artistName: {
    color: BRAND_COLORS.secondaryText || '#999',
    fontSize: 12,
    marginBottom: 6,
  },
  genreContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  genreTag: {
    backgroundColor: BRAND_COLORS.accent + '33', // 20% opacity
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 10,
    marginRight: 4,
    marginBottom: 4,
  },
  genreText: {
    color: BRAND_COLORS.primaryText,
    fontSize: 10,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: BRAND_COLORS.primaryText,
    marginTop: 12,
    fontSize: 16,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 30,
  },
  errorText: {
    color: BRAND_COLORS.primaryText,
    textAlign: 'center',
    marginTop: 12,
    fontSize: 16,
    marginBottom: 20,
  },
  retryButton: {
    backgroundColor: BRAND_COLORS.accent,
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
  },
  retryText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    fontSize: 16,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
    minHeight: 300,
  },
  emptyText: {
    color: BRAND_COLORS.primaryText,
    textAlign: 'center',
    marginTop: 16,
    fontSize: 16,
  },
  loadMoreSpinner: {
    paddingVertical: 20,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: BRAND_COLORS.background,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    paddingBottom: 30, // Extra padding for bottom area
    maxHeight: '70%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: BRAND_COLORS.border || '#333',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: BRAND_COLORS.primaryText,
  },
  closeButton: {
    padding: 5,
  },
  genreList: {
    maxHeight: '60%',
  },
  genreItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: BRAND_COLORS.border || '#333',
  },
  genreName: {
    fontSize: 16,
    color: BRAND_COLORS.primaryText,
  },
  modalFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 15,
    borderTopWidth: 1,
    borderTopColor: BRAND_COLORS.border || '#333',
  },
  clearButton: {
    paddingVertical: 10,
    paddingHorizontal: 15,
  },
  clearButtonText: {
    color: BRAND_COLORS.secondaryText || '#999',
    fontSize: 16,
  },
  applyButton: {
    backgroundColor: BRAND_COLORS.accent,
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 20,
  },
  applyButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
});

export default ShowsScreen;