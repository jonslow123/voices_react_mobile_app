import React, { useState } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity,
  Dimensions,
  StatusBar,
  Platform
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import ArtistsScreen from './ArtistsScreen';
import ShowsScreen from './ShowsScreen';
import { BRAND_COLORS } from '../app/styles/brandColors';
import SoundCloudAPI from '../app/utils/soundcloudAPI';
import axios from 'axios';

const ExploreScreen = () => {
  const [activeTab, setActiveTab] = useState('artists'); // 'artists' or 'shows'
  const insets = useSafeAreaInsets();
  
  // Calculate proper status bar height
  const statusBarHeight = Platform.OS === 'ios' ? insets.top : 0;

  const [mixcloudHosts, setMixcloudHosts] = useState([]);
  const [soundcloudTracks, setSoundcloudTracks] = useState([]);
  const [combinedArtists, setCombinedArtists] = useState([]);
  const [loadingSoundcloud, setLoadingSoundcloud] = useState(false);

  // Fetch both Mixcloud and SoundCloud data
  const fetchData = async () => {
    console.log('📢 DEBUG: Fetching data');
    setLoading(true);
    
    try {
      // Fetch Mixcloud hosts (your existing code)
      const mixcloudResponse = await axios.get('https://api.mixcloud.com/VoicesRadio/hosts/');
      const mixcloudData = mixcloudResponse.data.data;
      setMixcloudHosts(mixcloudData);
      
      // Fetch SoundCloud tracks
      setLoadingSoundcloud(true);
      console.log('📢 DEBUG: Fetching SoundCloud tracks');
      const soundcloudData = await SoundCloudAPI.getVoicesTracks(50, 0);
      console.log('📢 DEBUG: SoundCloud tracks fetched:', soundcloudData.length);
      // Transform to consistent format
      const transformedTracks = soundcloudData.map(track => 
        SoundCloudAPI.transformTrackToMixcloudFormat(track)
      );
      setSoundcloudTracks(transformedTracks);
      
      // Combine and deduplicate artists
      combineArtists(mixcloudData, transformedTracks);
    } catch (error) {
      console.error('Error fetching data:', error);
      setError('Failed to load content. Please try again.');
    } finally {
      setLoading(false);
      setLoadingSoundcloud(false);
    }
  };

  // Combine artists from both sources, prioritizing Mixcloud
  const combineArtists = (mixcloudHosts, soundcloudTracks) => {
    // Extract unique artist names from SoundCloud tracks
    console.log('📢 DEBUG: Combining artists');
    const soundcloudArtists = {};
    soundcloudTracks.forEach(track => {
      const artistName = SoundCloudAPI.extractArtistFromTitle(track.title);
      if (artistName) {
        if (!soundcloudArtists[artistName.toLowerCase()]) {
          soundcloudArtists[artistName.toLowerCase()] = {
            name: artistName,
            username: artistName.toLowerCase().replace(/\s+/g, ''),
            pictures: { extra_large: track.pictures.extra_large },
            source: 'soundcloud',
            soundcloudTrackId: track._id.replace('sc-', ''),
            key: `sc-artist-${artistName.toLowerCase().replace(/\s+/g, '')}`
          };
        }
      }
    });
    
    // Create a map of Mixcloud artists by lowercase name for deduplication
    const mixcloudArtistMap = {};
    mixcloudHosts.forEach(host => {
      mixcloudArtistMap[host.name.toLowerCase()] = host;
    });
    
    // Combine the lists, prioritizing Mixcloud
    const combined = [...mixcloudHosts];
    
    Object.values(soundcloudArtists).forEach(scArtist => {
      // Only add if not already in Mixcloud
      if (!mixcloudArtistMap[scArtist.name.toLowerCase()]) {
        combined.push({
          ...scArtist,
          source: 'soundcloud'
        });
      }
    });
    
    setCombinedArtists(combined);
  };

  // Use combinedArtists instead of hosts in your render
  // and update your fetchArtistShows function to handle both sources
  const fetchArtistShows = async (artist) => {
    setShowsLoading(true);
    
    try {
      // Handle different sources
      if (artist.source === 'soundcloud') {
        // Search for tracks by this artist on SoundCloud
        const tracks = await SoundCloudAPI.searchTracksByArtist(artist.name);
        const transformedTracks = tracks.map(track => 
          SoundCloudAPI.transformTrackToMixcloudFormat(track)
        );
        setArtistShows(transformedTracks);
      } else {
        // Mixcloud - use your existing code
        const response = await axios.get(`https://api.mixcloud.com/VoicesRadio/hosts/${artist.username}`);
        setArtistShows(response.data.data);
      }
    } catch (error) {
      console.error('Error fetching artist shows:', error);
      setShowsError('Failed to load shows');
    } finally {
      setShowsLoading(false);
    }
  };

  return (
    <View style={[styles.container, { paddingTop: statusBarHeight }]}>
      <StatusBar barStyle="light-content" />
      
      {/* Toggle between Artists and Shows */}
      <View style={styles.tabToggle}>
        <TouchableOpacity 
          style={[styles.tabButton, activeTab === 'artists' && styles.activeTabButton]}
          onPress={() => setActiveTab('artists')}
        >
          <Text style={[styles.tabButtonText, activeTab === 'artists' && styles.activeTabText]}>Artists</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={[styles.tabButton, activeTab === 'shows' && styles.activeTabButton]}
          onPress={() => setActiveTab('shows')}
        >
          <Text style={[styles.tabButtonText, activeTab === 'shows' && styles.activeTabText]}>Shows</Text>
        </TouchableOpacity>
      </View>
      
      {/* Content Area */}
      <View style={styles.contentContainer}>
        {activeTab === 'artists' ? (
          <ArtistsScreen />
        ) : (
          <ShowsScreen />
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: BRAND_COLORS.background,
  },
  header: {
    paddingHorizontal: 15,
    paddingBottom: 10,
    backgroundColor: BRAND_COLORS.accent,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  tabToggle: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: BRAND_COLORS.border || '#333',
  },
  tabButton: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 12,
    backgroundColor: BRAND_COLORS.background,
  },
  activeTabButton: {
    borderBottomWidth: 3,
    borderBottomColor: BRAND_COLORS.accent,
  },
  tabButtonText: {
    fontSize: 16,
    fontWeight: '500',
    color: BRAND_COLORS.secondaryText || '#999',
  },
  activeTabText: {
    color: BRAND_COLORS.accent,
    fontWeight: '600',
  },
  contentContainer: {
    flex: 1,
  },
});

export default ExploreScreen;