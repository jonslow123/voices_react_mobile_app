import React, { useState, useEffect, useRef } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  Image, 
  TouchableOpacity,  
  ActivityIndicator,
  ScrollView,
  SafeAreaView,
  Platform
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import axios from 'axios';
import { useLocalSearchParams, useRouter, Link } from 'expo-router';
import Constants from 'expo-constants';
import TopBanner from '../../components/TopBanner';
import { usePlayer } from '../context/PlayerContext';

const BRAND_COLORS = {
  beige: '#e5d7be',
  black: '#131200',
  redOrange: '#d34e24'
};

const ArtistDetailsScreen = () => {
  const { username, name, imageUrl } = useLocalSearchParams();
  const router = useRouter();
  const [shows, setShows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const { 
    handleTilePress, 
    activeTileIndex,
  } = usePlayer();
  
  // Get status bar height
  const statusBarHeight = Constants.statusBarHeight || 0;

  useEffect(() => {
    fetchArtistShows();
  }, [username]);

  const fetchArtistShows = async () => {
    try {
      setLoading(true);
      // Get the shows for this artist from Mixcloud API
      const response = await axios.get(`https://api.mixcloud.com/VoicesRadio/hosts/${username}`);
      console.log('Shows fetched:', response.data.data.length);
      setShows(response.data.data);
      setError(null);
    } catch (err) {
      console.error('Error fetching shows:', err);
      setError('Failed to load shows. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const handleBack = () => {
    router.push('/(tabs)/artists');
  };

  return (
    <View style={styles.container}>
      {/* TopBanner with padding */}
      <SafeAreaView style={{
        backgroundColor: 'black',
        paddingTop: Platform.OS === 'ios' ? statusBarHeight : 0,
      }}>
        <TopBanner />
      </SafeAreaView>
      
      <ScrollView 
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Back button */}
        <TouchableOpacity 
          style={styles.backButton} 
          onPress={handleBack}
        >
          <Ionicons name="arrow-back" size={24} color="#333" />
        </TouchableOpacity>
        
        {/* Artist profile content */}
        <View style={styles.profileHeader}>
          <Image 
            source={{ uri: imageUrl }} 
            style={styles.profileImage}
            resizeMode="cover"
          />
          <View style={styles.profileTextContainer}>
            <Text style={styles.profileName}>{name}</Text>
          </View>
        </View>
        
        <Text style={styles.sectionTitle}>Shows</Text>
        
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#007AFF" />
            <Text style={styles.loadingText}>Loading shows...</Text>
          </View>
        ) : error ? (
          <View style={styles.errorContainer}>
            <Ionicons name="alert-circle" size={36} color="#FF3B30" />
            <Text style={styles.errorText}>{error}</Text>
            <TouchableOpacity
              style={styles.retryButton}
              onPress={fetchArtistShows}
            >
              <Text style={styles.retryButtonText}>Retry</Text>
            </TouchableOpacity>
          </View>
        ) : shows.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>No shows found for this artist.</Text>
          </View>
        ) : (
          <View style={styles.showsList}>
            {shows.map((show, index) => {
              // Transform show data to match the format expected by handleTilePress
              const tileData = {
                _id: show.key,
                title: show.name,
                imageUrl: show.pictures.extra_large,
                key: show.key,
                iframeUrl: `https://player-widget.mixcloud.com/widget/iframe/?hide_cover=1&mini=1&light=1&feed=${encodeURIComponent(show.key)}`
              };

              console.log('Details Screen - Playing URL:', {
                title: tileData.title,
                iframeUrl: tileData.iframeUrl
              });

              return (
                <TouchableOpacity 
                  key={show.key}
                  style={styles.showCard}
                  onPress={() => handleTilePress(tileData, index)}
                >
                  <Image 
                    source={{ uri: show.pictures.extra_large }} 
                    style={styles.showImage}
                    resizeMode="cover"
                  />
                  <View style={styles.showInfo}>
                    <Text style={styles.showName} numberOfLines={2}>{show.name}</Text>
                    <Text style={styles.showDate}>{formatDate(show.created_time)}</Text>
                    <TouchableOpacity 
                      style={styles.playButton}
                      onPress={() => handleTilePress(tileData, index)}
                    >
                      <Ionicons 
                        name={activeTileIndex === index ? "pause-circle" : "play-circle"} 
                        size={24} 
                        color="#007AFF" 
                      />
                      <Text style={styles.playButtonText}>
                        {activeTileIndex === index ? "Pause" : "Play"}
                      </Text>
                    </TouchableOpacity>
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
        )}
      </ScrollView>
      
      <View style={styles.tabBar}>
        <Link href="/(tabs)/" asChild>
          <TouchableOpacity style={styles.tabItem}>
            <Ionicons name="home" size={24} color="#8E8E93" />
            <Text style={[styles.tabLabel, styles.tabLabelInactive]}>Home</Text>
          </TouchableOpacity>
        </Link>
        
        <Link href="/(tabs)/artists" asChild>
          <TouchableOpacity style={styles.tabItem}>
            <Ionicons name="people" size={24} color="#007AFF" />
            <Text style={[styles.tabLabel, styles.tabLabelActive]}>Artists</Text>
          </TouchableOpacity>
        </Link>
        
        <Link href="/(tabs)/membership" asChild>
          <TouchableOpacity style={styles.tabItem}>
            <Ionicons name="card" size={24} color="#8E8E93" />
            <Text style={[styles.tabLabel, styles.tabLabelInactive]}>Membership</Text>
          </TouchableOpacity>
        </Link>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: BRAND_COLORS.beige,
  },
  backButton: {
    padding: 12,
    alignSelf: 'flex-start',
    marginBottom: 10,
  },
  scrollContent: {
    padding: 16,
    paddingTop: 20, // Add padding at the top for content
  },
  profileHeader: {
    alignItems: 'center',
    marginBottom: 24,
    width: '100%',
  },
  profileImage: {
    width: 150,
    height: 150,
    borderRadius: 50,
    marginBottom: 16,
  },
  profileTextContainer: {
    alignItems: 'center',
    width: '100%',
  },
  profileName: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    textAlign: 'center',
  },
  sectionTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 16,
    color: '#333',
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
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
  },
  emptyText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
  },
  showsList: {
    marginBottom: 24,
  },
  showCard: {
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
  showImage: {
    width: 100,
    height: 100,
  },
  showInfo: {
    flex: 1,
    padding: 12,
    justifyContent: 'space-between',
  },
  showName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  showDate: {
    fontSize: 14,
    color: '#666',
  },
  playButton: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  playButtonText: {
    fontSize: 14,
    color: '#007AFF',
    marginLeft: 8,
  },
  tabBar: {
    flexDirection: 'row',
    backgroundColor: 'white',
    height: Platform.OS === 'ios' ? 80 : 60,
    paddingBottom: Platform.OS === 'ios' ? 25 : 10,
    paddingTop: 5,
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    borderTopWidth: 0,
    elevation: 0,
  },
  tabItem: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 5,
  },
  tabLabel: {
    fontSize: 10,
    marginTop: 4,
    marginBottom: Platform.OS === 'ios' ? 8 : 5,
  },
  tabLabelActive: {
    color: '#007AFF',
  },
  tabLabelInactive: {
    color: '#8E8E93',
  },
});

export default ArtistDetailsScreen; 