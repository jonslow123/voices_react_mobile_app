import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  FlatList, 
  Image, 
  TouchableOpacity, 
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import axios from 'axios';
import { useRouter } from 'expo-router';
import { usePlayer } from '../app/context/PlayerContext';
import Constants from 'expo-constants';

const BRAND_COLORS = {
  beige: '#e5d7be',
  black: '#131200',
  redOrange: '#d34e24'
};

const ArtistsScreen = ({ navigation }) => {
  const { handleTilePress } = usePlayer();
  const [hosts, setHosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const router = useRouter();

  // Get status bar height
  const statusBarHeight = Constants.statusBarHeight || 0;

  useEffect(() => {
    fetchHosts();
  }, []);

  const fetchHosts = async () => {
    try {
      setLoading(true);
      const response = await axios.get('https://api.mixcloud.com/VoicesRadio/hosts/');
      console.log('Hosts fetched:', response.data.data.length);
      setHosts(response.data.data);
      setError(null);
    } catch (err) {
      console.error('Error fetching hosts:', err);
      setError('Failed to load artists. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const navigateToArtistDetails = (host) => {
    router.push({
      pathname: '/(artists)/details',
      params: {
        username: host.username,
        name: host.name,
        imageUrl: host.pictures.extra_large
      }
    });
  };

  const renderHost = ({ item }) => (
    <TouchableOpacity 
      style={styles.hostCard}
      onPress={() => navigateToArtistDetails(item)}
    >
      <Image 
        source={{ uri: item.pictures.extra_large }} 
        style={styles.hostImage}
        resizeMode="cover"
      />
      <View style={styles.hostInfo}>
        <Text style={styles.hostName}>{item.name}</Text>
        <TouchableOpacity 
          style={styles.viewProfileButton}
          onPress={() => navigateToArtistDetails(item)}
        >
          <Text style={styles.viewProfileText}>View Profile</Text>
          <Ionicons name="arrow-forward" size={16} color="#007AFF" />
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={styles.loadingText}>Loading artists...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.errorContainer}>
        <Ionicons name="alert-circle" size={48} color="#FF3B30" />
        <Text style={styles.errorText}>{error}</Text>
        <TouchableOpacity
          style={styles.retryButton}
          onPress={fetchHosts}
        >
          <Text style={styles.retryButtonText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      
      <View style={styles.contentContainer}>
        <FlatList
          data={hosts}
          renderItem={renderHost}
          keyExtractor={(item) => item.key}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
        />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: BRAND_COLORS.beige, 
    padding: 0,
    margin: 0,
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
  hostImage: {
    width: 100,
    height: 100,
  },
  hostInfo: {
    flex: 1,
    padding: 12,
    justifyContent: 'space-between',
  },
  hostName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  viewProfileButton: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  viewProfileText: {
    fontSize: 14,
    color: '#007AFF',
    marginRight: 4,
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
});

export default ArtistsScreen;