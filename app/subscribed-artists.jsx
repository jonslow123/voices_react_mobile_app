import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Image,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  SafeAreaView, 
  Dimensions
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { BRAND_COLORS } from './styles/brandColors';
import { getValidToken } from './utils/tokenManager';
const { width, height } = Dimensions.get('window');

const API_URL = process.env.EXPO_PUBLIC_BACKEND_URL;

export default function SubscribedArtistsScreen() {
  const router = useRouter();
  const [artists, setArtists] = useState([]);
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    fetchSubscribedArtists();
  }, []);
  
  const fetchSubscribedArtists = async () => {
    try {
      setLoading(true);
      
      const token = await getValidToken();
      
      if (!token) {
        console.log('No valid token available, redirecting to login');
        setLoading(false);
        
        setTimeout(() => {
          Alert.alert(
            'Login Required', 
            'Please log in to view your subscribed artists',
            [{ text: 'OK', onPress: () => router.replace('/login') }]
          );
        }, 100);
        return;
      }

      const response = await axios.get(`${API_URL}/api/users/me`, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.data.artistsSubscribed || response.data.artistsSubscribed.length === 0) {
        setArtists([]);
        setLoading(false);
        return;
      }

      const subscribedUsernames = response.data.artistsSubscribed.flat();
      console.log('Subscribed usernames:', subscribedUsernames);

      try {
        const mainArtistsResponse = await axios.get('https://api.mixcloud.com/VoicesRadio/hosts/');
        const allArtists = mainArtistsResponse.data.data || [];
        
        const artistsMap = {};
        allArtists.forEach(artist => {
          if (artist.username) {
            artistsMap[artist.username.toLowerCase()] = artist;
          }
        });

        const artistPromises = subscribedUsernames.map(username =>
          axios.get(`https://api.mixcloud.com/VoicesRadio/hosts/${username}`)
            .catch(error => {
              console.log(`Error fetching shows for ${username}:`, error);
              return { data: { data: [] } };
            })
        );

        const artistResponses = await Promise.all(artistPromises);
        const artistsData = artistResponses.map((response, index) => {
          const username = subscribedUsernames[index];
          const lowercaseUsername = username.toLowerCase();
          
          const showCount = response.data.data ? response.data.data.length : 0;
          
          if (artistsMap[lowercaseUsername]) {
            const artist = artistsMap[lowercaseUsername];
            return {
              username,
              name: artist.name,
              imageUrl: artist.pictures.extra_large,
              showCount
            };
          }
          
          if (showCount > 0 && response.data.data[0].hosts && response.data.data[0].hosts.length > 0) {
            const hostData = response.data.data[0].hosts[0];
            return {
              username,
              name: hostData.name,
              imageUrl: hostData.pictures.extra_large,
              showCount
            };
          }
          
          const formattedName = username
            .split('-')
            .map(word => word.charAt(0).toUpperCase() + word.slice(1))
            .join(' ');
          
          return {
            username,
            name: formattedName,
            imageUrl: null,
            showCount
          };
        });

        setArtists(artistsData);
      } catch (mixcloudError) {
        console.error('Error fetching artist data from Mixcloud:', mixcloudError);
        const basicArtists = subscribedUsernames.map(username => {
          const formattedName = username
            .split('-')
            .map(word => word.charAt(0).toUpperCase() + word.slice(1))
            .join(' ');
          
          return {
            username,
            name: formattedName,
            imageUrl: null,
            showCount: 0
          };
        });
        
        setArtists(basicArtists);
      }
    } catch (error) {
      console.error('Error fetching subscribed artists:', error);
      if (error.response) {
        console.log('Error response status:', error.response.status);
        console.log('Error response data:', error.response.data);
      }
      
      Alert.alert('Error', 'Failed to load subscribed artists');
    } finally {
      setLoading(false);
    }
  };
  
  const unsubscribeFromArtist = async (username) => {
    try {
      const token = await getValidToken();
      
      if (!token) {
        Alert.alert('Login Required', 'Please log in to unsubscribe from artists');
        router.replace('/login');
        return;
      }

      console.log(`Attempting to unsubscribe from artist: ${username}`);
      
      const response = await axios.post(
        `${API_URL}/api/users/unsubscribe/${username}`,
        {},
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        }
      );
      
      console.log('Unsubscribe response:', response.data);
      
      setArtists(prevArtists => prevArtists.filter(artist => artist.username !== username));
      
      setTimeout(() => {
        fetchSubscribedArtists();
      }, 1000);
      
    } catch (error) {
      console.error('Error unsubscribing from artist:', error);
      if (error.response) {
        console.error('Response status:', error.response.status);
        console.error('Response data:', error.response.data);
      }
      
      Alert.alert('Error', 'Failed to unsubscribe from artist. Please try again.');
    }
  };
  
  const confirmUnsubscribe = (artist) => {
    Alert.alert(
      'Remove from Favorites',
      `Are you sure you want to remove ${artist.name} from your favorites?`,
      [
        {
          text: 'Cancel',
          style: 'cancel'
        },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: () => unsubscribeFromArtist(artist.username)
        }
      ]
    );
  };
  
  const renderArtistItem = ({ item }) => (
    <TouchableOpacity 
      style={styles.artistCard}
      onPress={() => router.push({
        pathname: '/(artists)/details',
        params: {
          username: item.username,
          name: item.name,
          imageUrl: item.imageUrl || require('../assets/logo.png')
        }
      })}
    >
      <Image 
        source={item.imageUrl ? { uri: item.imageUrl } : require('../assets/logo.png')}
        style={styles.artistImage}
        defaultSource={require('../assets/logo.png')}
      />
      <View style={styles.artistInfo}>
        <Text style={styles.artistName}>{item.name}</Text>
        <Text style={styles.artistGenre}>
          {item.showCount} {item.showCount === 1 ? 'Show' : 'Shows'}
        </Text>
      </View>
      <TouchableOpacity 
        style={styles.unsubscribeButton}
        onPress={(e) => {
          e.stopPropagation();
          confirmUnsubscribe(item);
        }}
      >
        <Ionicons 
          name="star"
          size={24} 
          color={BRAND_COLORS.accent} 
        />
      </TouchableOpacity>
    </TouchableOpacity>
  );
  
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <Ionicons name="arrow-back" size={24} color={BRAND_COLORS.primaryText} />
        </TouchableOpacity>
        <Text style={styles.title}>Subscribed Artists</Text>
        <View style={styles.placeholder} />
      </View>
      
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={BRAND_COLORS.accent} />
          <Text style={styles.loadingText}>Loading your subscribed artists...</Text>
        </View>
      ) : artists.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Ionicons name="people-outline" size={64} color="gray" style={styles.emptyIcon} />
          <Text style={styles.emptyText}>You haven't subscribed to any artists yet</Text>
          <TouchableOpacity
            style={styles.browseButton}
            onPress={() => router.push('/(tabs)/artists')}
          >
            <Text style={styles.browseButtonText}>Browse Artists</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={artists}
          renderItem={renderArtistItem}
          keyExtractor={(item) => item.username}
          contentContainerStyle={styles.listContent}
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
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  backButton: {
    padding: 4,
  },
  title: {
    flex: 1,
    textAlign: 'center',
    fontSize: 18,
    fontWeight: 'bold',
    color: BRAND_COLORS.accent,
  },
  placeholder: {
    width: 32,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: 'gray',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  emptyIcon: {
    marginBottom: 16,
  },
  emptyText: {
    fontSize: 18,
    color: 'gray',
    textAlign: 'center',
    marginBottom: 20,
  },
  browseButton: {
    backgroundColor: BRAND_COLORS.accent,
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
  },
  browseButtonText: {
    color: BRAND_COLORS.background,
    fontSize: 16,
    fontWeight: '600',
  },
  listContent: {
    padding: 16,
    paddingBottom: 100,
  },
  artistCard: {
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
  artistImage: {
    width: 100,
    height: 100,
  },
  artistInfo: {
    flex: 1,
    padding: 12,
    justifyContent: 'space-between',
  },
  artistName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  artistGenre: {
    fontSize: 14,
    color: '#666',
  },
  unsubscribeButton: {
    padding: 12,
    alignSelf: 'center',
    marginRight: 8,
  },
}); 