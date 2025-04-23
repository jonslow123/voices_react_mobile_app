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
  Platform,
  Alert,
  Dimensions
} from 'react-native';
import { getValidToken } from '../utils/tokenManager';
import { Ionicons } from '@expo/vector-icons';
import axios from 'axios';
import { useLocalSearchParams, useRouter, Link, useFocusEffect } from 'expo-router';
import Constants from 'expo-constants';
import TopBanner from '../../components/TopBanner';
import { usePlayer } from '../context/PlayerContext';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { BRAND_COLORS } from '../styles/brandColors';
import secureApi from '../../app/utils/api';
const { width, height } = Dimensions.get('window');
const ArtistDetailsScreen = () => {
  const { username, name, imageUrl } = useLocalSearchParams();
  const router = useRouter();
  const [shows, setShows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const { handleTilePress, activeTileId, isPlaying } = usePlayer();
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [checkingSubscription, setCheckingSubscription] = useState(true);
  const [subscribing, setSubscribing] = useState(false);

  
  // Get status bar height
  const statusBarHeight = Constants.statusBarHeight || 0;

  useFocusEffect(
    React.useCallback(() => {
      fetchArtistShows();
      checkSubscriptionStatus();
    }, [username])
  );

  const fetchArtistShows = async () => {
    try {
      setLoading(true);
      const response = await secureApi.get(`https://api.mixcloud.com/VoicesRadio/hosts/${username}`);
      setShows(response.data.data);
      setError(null);
    } catch (err) {
      setError('Failed to load shows. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const checkSubscriptionStatus = async () => {
    try {
      console.log('Checking subscription status for artist:', username);
      setCheckingSubscription(true);
      
      // Use getValidToken instead of AsyncStorage.getItem
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
      
      // Flatten the nested arrays and check if the username exists
      const subscribedArtists = response.data.artistsSubscribed.flat();
      console.log('Flattened subscribed artists:', subscribedArtists);
      
      const isArtistSubscribed = subscribedArtists.includes(username);
      console.log('Is artist subscribed?:', isArtistSubscribed);
  
      setIsSubscribed(isArtistSubscribed);
    } catch (error) {
      console.error('Error checking subscription status:', error);
      
      // Check if it's an authentication error
      if (error.response?.status === 401) {
        router.replace('/login');
      }
    } finally {
      setCheckingSubscription(false);
    }
  };
  
  // Update the handleSubscribe function
  const handleSubscribe = async () => {
    try {
      setSubscribing(true);
      
      // Use getValidToken instead of AsyncStorage.getItem
      const token = await getValidToken();
      
      if (!token) {
        Alert.alert('Login Required', 'Please log in to subscribe to artists');
        router.replace('/login');
        return;
      }
  
      const endpoint = isSubscribed ? 'unsubscribe' : 'subscribe';
      const response = await axios.post(
        `${process.env.EXPO_PUBLIC_BACKEND_URL}/api/users/${endpoint}/${username}`,
        {},
        { 
          headers: { 
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json'
          } 
        }
      );
      
      console.log(`${endpoint} response:`, response.data);
      
      // Update the subscription status
      setIsSubscribed(!isSubscribed);
    } catch (error) {
      console.error('Error updating subscription:', error);
      
      // Check if it's an authentication error
      if (error.response?.status === 401) {
        Alert.alert(
          'Session Expired',
          'Your session has expired. Please log in again.',
          [{ text: 'OK', onPress: () => router.replace('/login') }]
        );
        return;
      }
      
      Alert.alert(
        'Error',
        error.response?.data?.message || 'Failed to update subscription'
      );
    } finally {
      setSubscribing(false);
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

  const handleTabPress = (tabName) => {
    router.push(`/(tabs)/${tabName}`);
  };

  return (
    <View style={styles.container}>
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
        <View style={styles.headerSection}>
          <TouchableOpacity 
            style={styles.backButton} 
            onPress={handleBack}
          >
            <Ionicons name="arrow-back" size={24} color={BRAND_COLORS.primaryText} />
          </TouchableOpacity>
          
          <View style={styles.profileSection}>
            <Image 
              source={{ uri: imageUrl }} 
              style={styles.profileImage}
              resizeMode="cover"
            />
            
            <Text style={styles.profileName}>{name}</Text>
            
            {!checkingSubscription && (
              <TouchableOpacity 
                style={[
                  styles.subscribeButton,
                  isSubscribed && styles.subscribedButton
                ]}
                onPress={handleSubscribe}
              >
                <Ionicons 
                  name={isSubscribed ? "heart" : "heart-outline"} 
                  size={20} 
                  color={isSubscribed ? BRAND_COLORS.background : BRAND_COLORS.accent} 
                />
                <Text style={[
                  styles.subscribeText,
                  isSubscribed && styles.subscribedText
                ]}>
                  {isSubscribed ? 'Subscribed' : 'Subscribe'}
                </Text>
              </TouchableOpacity>
            )}
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
            <Ionicons 
              name="home"
              size={24}
              color="#8E8E93"
            />
            <Text style={styles.tabLabel}>Home</Text>
          </TouchableOpacity>
        </Link>
        
        <Link href="/(tabs)/artists" asChild>
          <TouchableOpacity style={styles.tabItem}>
            <Ionicons 
              name="people"
              size={24}
              color={BRAND_COLORS.accent}
            />
            <Text style={[styles.tabLabel, styles.activeTabLabel]}>Artists</Text>
          </TouchableOpacity>
        </Link>
        
        <Link href="/(tabs)/settings" asChild>
          <TouchableOpacity style={styles.tabItem}>
            <Ionicons 
              name="cog"
              size={24}
              color="#8E8E93"
            />
            <Text style={styles.tabLabel}>Settings</Text>
          </TouchableOpacity>
        </Link>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: BRAND_COLORS.background,
    width: width,
    height: height
  },
  headerSection: {
    width: '100%',
    marginBottom: 20,
    position: 'relative',
  },
  backButton: {
    position: 'absolute',
    left: 0,
    top: 0,
    padding: 12,
    zIndex: 10,  // Ensure it's above other content
  },
  profileSection: {
    width: '100%',
    alignItems: 'center',
    paddingTop: 10,
    marginBottom: 10,
  },
  profileImage: {
    width: 120,  // Larger size since it's the main profile image
    height: 120,
    borderRadius: 60,
    marginBottom: 16,
  },
  profileName: {
    fontSize: 20,
    fontWeight: 'bold',
    color: BRAND_COLORS.primaryText,
    textAlign: 'center',
  },
  sectionTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 16,
    color: BRAND_COLORS.primaryText,
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
  subscribeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: BRAND_COLORS.accent,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginTop: 12,
  },
  subscribedButton: {
    backgroundColor: BRAND_COLORS.accent,
    borderColor: BRAND_COLORS.accent,
  },
  subscribeText: {
    marginLeft: 6,
    fontSize: 16,
    color: BRAND_COLORS.accent,
    fontWeight: '600',
  },
  subscribedText: {
    color: BRAND_COLORS.background,
  },
  scrollContent: {
    padding: 16,
    paddingTop: 20, // Add padding at the top for content
    paddingBottom: Platform.OS === 'ios' ? 100 : 80, // Add padding for tab bar
  },
  tabBar: {
    flexDirection: 'row',
    backgroundColor: BRAND_COLORS.background,
    height: Platform.OS === 'ios' ? 80 : 60,
    paddingBottom: Platform.OS === 'ios' ? 25 : 10,
    paddingTop: 15,
    borderTopWidth: 0,
    elevation: 0,
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    justifyContent: 'space-around',
    alignItems: 'center',
  },
  tabItem: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    height: '100%',
    marginTop: 5,
  },
  tabLabel: {
    fontSize: 11,
    marginBottom: Platform.OS === 'ios' ? 8 : 5,
    color: '#8E8E93',
  },
  activeTabLabel: {
    color: BRAND_COLORS.accent,
    fontWeight: '500',
  },
});

export default ArtistDetailsScreen; 