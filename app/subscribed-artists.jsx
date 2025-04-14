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
  SafeAreaView
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import axios from 'axios';
import { useAuth } from './context/auth';

const API_URL = `${process.env.EXPO_PUBLIC_BACKEND_URL}/api/users`;

const BRAND_COLORS = {
  beige: '#e5d7be',
  black: '#131200',
  redOrange: '#d34e24'
};

export default function SubscribedArtistsScreen() {
  const { userId } = useAuth();
  const router = useRouter();
  const [artists, setArtists] = useState([]);
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    fetchSubscribedArtists();
  }, []);
  
  const fetchSubscribedArtists = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`${API_URL}/subscribed-artists`, {
        headers: {
          Authorization: `Bearer ${userId}`
        }
      });
      
      setArtists(response.data);
    } catch (error) {
      console.error('Error fetching subscribed artists:', error);
      Alert.alert('Error', 'Failed to load subscribed artists');
    } finally {
      setLoading(false);
    }
  };
  
  const unsubscribeFromArtist = async (artistId) => {
    try {
      await axios.post(`${API_URL}/unsubscribe-artist`, 
        { artistId },
        {
          headers: {
            Authorization: `Bearer ${userId}`
          }
        }
      );
      
      // Update UI after successful unsubscribe
      setArtists(artists.filter(artist => artist._id !== artistId));
    } catch (error) {
      console.error('Error unsubscribing from artist:', error);
      Alert.alert('Error', 'Failed to unsubscribe from artist');
    }
  };
  
  const confirmUnsubscribe = (artist) => {
    Alert.alert(
      'Confirm Unsubscribe',
      `Are you sure you want to unsubscribe from ${artist.name}?`,
      [
        {
          text: 'Cancel',
          style: 'cancel'
        },
        {
          text: 'Unsubscribe',
          style: 'destructive',
          onPress: () => unsubscribeFromArtist(artist._id)
        }
      ]
    );
  };
  
  const renderArtistItem = ({ item }) => (
    <View style={styles.artistCard}>
      <Image 
        source={{ uri: item.imageUrl || 'https://via.placeholder.com/100' }} 
        style={styles.artistImage}
      />
      <View style={styles.artistInfo}>
        <Text style={styles.artistName}>{item.name}</Text>
        <Text style={styles.artistGenre}>{item.genre}</Text>
      </View>
      <TouchableOpacity 
        style={styles.unsubscribeButton}
        onPress={() => confirmUnsubscribe(item)}
      >
        <Ionicons name="close-circle" size={24} color={BRAND_COLORS.redOrange} />
      </TouchableOpacity>
    </View>
  );
  
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <Ionicons name="arrow-back" size={24} color={BRAND_COLORS.black} />
        </TouchableOpacity>
        <Text style={styles.title}>Subscribed Artists</Text>
        <View style={styles.placeholder} />
      </View>
      
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={BRAND_COLORS.redOrange} />
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
          keyExtractor={(item) => item._id}
          contentContainerStyle={styles.listContent}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: BRAND_COLORS.beige,
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
    color: BRAND_COLORS.redOrange,
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
    backgroundColor: BRAND_COLORS.redOrange,
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
  },
  browseButtonText: {
    color: BRAND_COLORS.beige,
    fontSize: 16,
    fontWeight: '600',
  },
  listContent: {
    padding: 16,
  },
  artistCard: {
    flexDirection: 'row',
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
    alignItems: 'center',
    shadowColor: BRAND_COLORS.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  artistImage: {
    width: 60,
    height: 60,
    borderRadius: 30,
  },
  artistInfo: {
    flex: 1,
    marginLeft: 12,
  },
  artistName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: BRAND_COLORS.black,
  },
  artistGenre: {
    fontSize: 14,
    color: 'gray',
    marginTop: 4,
  },
  unsubscribeButton: {
    padding: 8,
  },
}); 