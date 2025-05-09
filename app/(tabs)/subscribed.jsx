import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  FlatList,
  Image, 
  TouchableOpacity, 
  ActivityIndicator,
  SafeAreaView,
  Platform,
  Dimensions,
  RefreshControl
} from 'react-native';
import { Link, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import axios from 'axios';
import { BRAND_COLORS } from '../styles/brandColors';
import { getValidToken } from '../utils/tokenManager';
import * as SecureStore from 'expo-secure-store';
import AsyncStorage from '@react-native-async-storage/async-storage';

const { width, height } = Dimensions.get('window');

export default function SubscribedScreen() {
  const [artists, setArtists] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const router = useRouter();

  const fetchSubscribedArtists = async (isRefreshing = false) => {
    try {
      if (!isRefreshing) {
        setLoading(true);
      }
      
      // Get a valid token
      const token = await getValidToken();
      
      if (!token) {
        console.log('No valid token available');
        setError('Please log in to view your subscribed artists');
        return;
      }

      // First, get the user's subscribed artists usernames
      const userResponse = await axios.get(
        `${process.env.EXPO_PUBLIC_BACKEND_URL}/api/users/me`,
        {
          headers: { 
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        }
      );
      
      // Check if user has subscribed artists
      if (!userResponse.data.artistsSubscribed || 
          !Array.isArray(userResponse.data.artistsSubscribed) || 
          userResponse.data.artistsSubscribed.length === 0) {
        setArtists([]);
        setError('You haven\'t subscribed to any artists yet');
        return;
      }
      
      // Flatten the nested array structure
      const subscribedUsernames = [];
      userResponse.data.artistsSubscribed.forEach(item => {
        if (Array.isArray(item)) {
          item.forEach(username => {
            if (username) subscribedUsernames.push(username);
          });
        } else if (item) {
          subscribedUsernames.push(item);
        }
      });
      
      if (subscribedUsernames.length === 0) {
        setArtists([]);
        setError('You haven\'t subscribed to any artists yet');
        return;
      }
      
      console.log('Subscribed usernames:', subscribedUsernames);
      
      // Get all artists from API
      const artistsResponse = await axios.get(
        `${process.env.EXPO_PUBLIC_BACKEND_URL}/api/artists`
      );
      
      if (!artistsResponse.data || !Array.isArray(artistsResponse.data)) {
        throw new Error('Invalid artists data format');
      }
      
      // Filter to only get the subscribed artists
      const subscribedArtists = artistsResponse.data.filter(artist => 
        subscribedUsernames.includes(artist.mixcloudUsername)
      );
      
      if (subscribedArtists.length === 0) {
        setError('None of your subscribed artists were found');
        return;
      }
      
      // Format the data for display
      const formattedArtists = subscribedArtists.map(artist => ({
        id: artist._id,
        name: artist.name,
        username: artist.mixcloudUsername,
        imageUrl: artist.imageUrl,
        bio: artist.bio || '',
        tags: artist.genres.map(genre => ({ name: genre })),
        _id: artist._id
      }));
      
      setArtists(formattedArtists);
      setError(null);
    } catch (error) {
      console.error('Error fetching subscribed artists:', error);
      setError('Failed to load subscribed artists. Please try again.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchSubscribedArtists();
  }, []);

  const handleRefresh = () => {
    setRefreshing(true);
    fetchSubscribedArtists(true);
  };

  const renderArtistCard = ({ item }) => {
    // Extract genres from tags
    const genres = item.tags
      ? item.tags.slice(0, 3).map(tag => tag.name)
      : [];
      
    return (
      <TouchableOpacity
        style={styles.artistCard}
        onPress={() => router.push({
          pathname: "../(artists)/details",
          params: {
            name: item.name,
            username: item.username,
            imageUrl: item.imageUrl,
            bio: item.bio,
            artistId: item._id
          }
        })}
      >
        <Image
          source={{ uri: item.imageUrl }}
          style={styles.artistImage}
          resizeMode="cover"
        />
        <View style={styles.artistInfo}>
          <Text style={styles.artistName} numberOfLines={2}>{item.name}</Text>
          
          {genres.length > 0 && (
            <View style={styles.genreContainer}>
              {genres.map((genre, index) => (
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

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Subscribed Artists</Text>
      </View>

      {loading && !refreshing ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={BRAND_COLORS.accent} />
          <Text style={styles.loadingText}>Loading subscribed artists...</Text>
        </View>
      ) : error ? (
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle-outline" size={64} color={BRAND_COLORS.accent} />
          <Text style={styles.errorText}>{error}</Text>
          {error !== 'You haven\'t subscribed to any artists yet' && (
            <TouchableOpacity
              style={styles.retryButton}
              onPress={() => fetchSubscribedArtists()}
            >
              <Text style={styles.retryButtonText}>Retry</Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity
            style={[styles.retryButton, {marginTop: 10}]}
            onPress={() => router.push('/(tabs)/artists')}
          >
            <Text style={styles.retryButtonText}>Browse Artists</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={artists}
          keyExtractor={(item) => item.id.toString()}
          renderItem={renderArtistCard}
          contentContainerStyle={styles.artistsList}
          numColumns={2}
          showsVerticalScrollIndicator={false}
          columnWrapperStyle={styles.columnWrapper}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              colors={[BRAND_COLORS.accent]}
              tintColor={BRAND_COLORS.accent}
            />
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: BRAND_COLORS.background,
    width: width,
    height: height
  },
  header: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: BRAND_COLORS.background === '#FFFFFF' ? '#EEEEEE' : '#333333',
    backgroundColor: BRAND_COLORS.background,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: BRAND_COLORS.primaryText,
    textAlign: 'center',
  },
  artistsList: {
    padding: 8,
    paddingBottom: Platform.OS === 'ios' ? 100 : 80,
  },
  columnWrapper: {
    justifyContent: 'space-between',
  },
  artistCard: {
    width: width / 2 - 16,
    backgroundColor: BRAND_COLORS.background === '#FFFFFF' ? '#F5F5F5' : '#1A1A1A',
    borderRadius: 12,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: BRAND_COLORS.background === '#FFFFFF' ? '#EEEEEE' : '#333333',
  },
  artistImage: {
    width: '100%',
    height: width / 2 - 16,
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
  },
  artistInfo: {
    padding: 12,
  },
  artistName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: BRAND_COLORS.primaryText,
    marginBottom: 8,
  },
  genreContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  genreTag: {
    backgroundColor: BRAND_COLORS.accent + '33', // 20% opacity
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 16,
    marginRight: 4,
    marginBottom: 4,
  },
  genreText: {
    color: BRAND_COLORS.primaryText,
    fontSize: 12,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    color: BRAND_COLORS.primaryText,
    fontSize: 16,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  errorText: {
    textAlign: 'center',
    color: BRAND_COLORS.primaryText,
    fontSize: 16,
    marginTop: 16,
    marginBottom: 24,
  },
  retryButton: {
    backgroundColor: BRAND_COLORS.accent,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 24,
  },
  retryButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
});