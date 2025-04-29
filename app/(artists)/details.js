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
  Dimensions,
  Share
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
import * as SecureStore from 'expo-secure-store';
const { width, height } = Dimensions.get('window');
const ArtistDetailsScreen = () => {
  const { username, name, imageUrl, bio } = useLocalSearchParams();
  const router = useRouter();
  const [shows, setShows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const { handleTilePress, activeTileId, isPlaying, togglePlayback, webViewRef, currentTrack } = usePlayer();
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [checkingSubscription, setCheckingSubscription] = useState(true);
  const [subscribing, setSubscribing] = useState(false);
  const [artistBio, setArtistBio] = useState(bio || "");
  const [currentPlayingKey, setCurrentPlayingKey] = useState(null);
  const mixcloudPlayerRef = useRef(null);
  
  // Get status bar height
  const statusBarHeight = Constants.statusBarHeight || 0;

  useFocusEffect(
    React.useCallback(() => {
      fetchArtistShows();
      checkSubscriptionStatus();
      // If bio wasn't passed in params, we could fetch it here
      if (!bio) {
        fetchArtistBio();
      }
    }, [username])
  );

  const fetchArtistBio = async () => {
    // This is a placeholder function - implement the actual API call to get artist bio
    // For example:
    try {
      const response = await secureApi.get(`https://api.mixcloud.com/${username}/`);
      if (response.data && response.data.biog) {
        setArtistBio(response.data.biog);
      }
    } catch (err) {
      console.error('Failed to load artist bio:', err);
    }
  };

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

  const checkAuth = async () => {
    try {
      // Try to get the token directly from storage
      let token = await AsyncStorage.getItem('userToken');
      
      // If no token in AsyncStorage, check SecureStore if available
      if (!token && SecureStore) {
        try {
          token = await SecureStore.getItemAsync('userToken');
        } catch (e) {
          console.log('SecureStore error:', e);
        }
      }
      
      // Check the token's validity manually
      if (token) {
        try {
          // Make a test API call to verify token
          const response = await axios.get(
            `${process.env.EXPO_PUBLIC_BACKEND_URL}/api/users/me`,
            {
              headers: { 
                Authorization: `Bearer ${token}`,
                'Content-Type': 'application/json'
              }
            }
          );
          
          if (response.status === 200) {
            console.log('Token valid, user authenticated');
            return token; // Return the valid token
          }
        } catch (e) {
          console.log('Token validation failed:', e);
        }
      }
      
      console.log('No valid token found in storage');
      return null;
    } catch (error) {
      console.error('Auth check error:', error);
      return null;
    }
  };

  const checkSubscriptionStatus = async () => {
    try {
      console.log('Checking subscription status for artist:', username);
      setCheckingSubscription(true);
      
      // Use our direct auth check instead of getValidToken
      const token = await checkAuth();
      
      if (!token) {
        console.log('No valid token available for subscription check');
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
      const subscribedArtists = response.data.artistsSubscribed ? response.data.artistsSubscribed.flat() : [];
      console.log('Flattened subscribed artists:', subscribedArtists);
      
      const isArtistSubscribed = subscribedArtists.includes(username);
      console.log('Is artist subscribed?:', isArtistSubscribed);

      setIsSubscribed(isArtistSubscribed);
    } catch (error) {
      console.error('Error checking subscription status:', error);
    } finally {
      setCheckingSubscription(false);
    }
  };
  
  // Update the handleSubscribe function
  const handleSubscribe = async () => {
    try {
      setSubscribing(true);
      
      // Use our direct auth check
      const token = await checkAuth();
      
      if (!token) {
        console.log('No valid token when subscribing to artist:', username);
        Alert.alert(
          'Login Required', 
          'Please log in to subscribe to artists',
          [
            { 
              text: 'Cancel', 
              style: 'cancel' 
            },
            { 
              text: 'Login', 
              onPress: () => {
                // Navigate to login using a more reliable method
                router.navigate('/login');
              } 
            }
          ]
        );
        return;
      }
  
      const endpoint = isSubscribed ? 'unsubscribe' : 'subscribe';
      console.log(`Attempting to ${endpoint} from artist:`, username);
      
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
      
      // Update subscription status
      setIsSubscribed(!isSubscribed);
      
    } catch (error) {
      console.error('Error updating subscription:', error);
      
      // Check if it's an authentication error
      if (error.response?.status === 401) {
        Alert.alert(
          'Session Expired',
          'Your session has expired. Please log in again.',
          [{ 
            text: 'OK', 
            onPress: () => router.navigate('/login')
          }]
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

  const handleShare = async () => {
    try {
      const result = await Share.share({
        message: `Check out ${name} on Voices Radio!`,
        url: `https://mixcloud.com/${username}`,
        title: `Voices Radio - ${name}`
      });
      
      if (result.action === Share.sharedAction) {
        if (result.activityType) {
          console.log('Shared with activity type:', result.activityType);
        } else {
          console.log('Shared successfully');
        }
      } else if (result.action === Share.dismissedAction) {
        console.log('Share dismissed');
      }
    } catch (error) {
      Alert.alert('Error', 'Could not share this artist');
      console.error('Share error:', error);
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

  // New function that wraps the handleTilePress from context
  const handleShowTilePress = (tileData, index) => {
    if (activeTileId === tileData._id && isPlaying) {
      // If this is the active tile and it's playing, pause it
      togglePlayback();
    } else {
      // Otherwise, play this tile using the global handler
      handleTilePress(tileData, index);
    }
  };

  // Listen for player state changes from the context
  useEffect(() => {
    // This effect syncs the global player state with our local UI
    if (activeTileId) {
      setCurrentPlayingKey(activeTileId);
    } else {
      setCurrentPlayingKey(null);
    }
  }, [activeTileId, isPlaying]);

  return (
    <View style={styles.container}>
      <SafeAreaView style={{
        backgroundColor: 'black',
        paddingTop: Platform.OS === 'ios' ? statusBarHeight : 0,
      }}>
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
            
            <View style={styles.profileActions}>
              <Text style={styles.profileName}>{name}</Text>
              
              <View style={styles.actionButtons}>
                {!checkingSubscription && (
                  <TouchableOpacity 
                    style={[
                      styles.subscribeButton,
                      isSubscribed && styles.subscribedButton
                    ]}
                    onPress={handleSubscribe}
                    disabled={subscribing}
                  >
                    {subscribing ? (
                      <ActivityIndicator size="small" color={isSubscribed ? BRAND_COLORS.background : BRAND_COLORS.accent} />
                    ) : (
                      <>
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
                      </>
                    )}
                  </TouchableOpacity>
                )}
                
                <TouchableOpacity 
                  style={styles.shareButton}
                  onPress={handleShare}
                >
                  <Ionicons 
                    name="share-social-outline" 
                    size={20} 
                    color={BRAND_COLORS.accent} 
                  />
                  <Text style={styles.shareButtonText}>Share</Text>
                </TouchableOpacity>
              </View>
              
              {artistBio ? (
                <View style={styles.bioContainer}>
                  <Text style={styles.bioTitle}>About</Text>
                  <Text style={styles.bioText}>{artistBio}</Text>
                </View>
              ) : null}
            </View>
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

              // Check if this tile is the currently playing one
              const isThisTilePlaying = activeTileId === show.key && isPlaying;

              return (
                <TouchableOpacity 
                  key={show.key}
                  style={styles.showCard}
                  onPress={() => handleShowTilePress(tileData, index)}
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
                      onPress={() => handleShowTilePress(tileData, index)}
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
    marginBottom: 10,
    position: 'relative',
  },
  backButton: {
    position: 'absolute',
    left: 10,
    top: 10,
    padding: 10,
    zIndex: 10,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    borderRadius: 20,
  },
  profileSection: {
    width: '100%',
    alignItems: 'center',
    marginTop: -20,
    marginBottom: 0,
  },
  profileImage: {
    width: width,
    height: width * 0.75,
    borderRadius: 0,
    marginBottom: -10, // No margin since profile actions will be below
    borderWidth: 0,
  },
  profileActions: {
    width: '100%',
    paddingHorizontal: 20,
    paddingVertical: 20,
    paddingBottom: 10,
  },
  profileName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: BRAND_COLORS.primaryText,
    textAlign: 'center',
    marginBottom: 16,
  },
  actionButtons: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  subscribeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'transparent',
    borderWidth: 2,
    borderColor: BRAND_COLORS.accent,
    borderRadius: 24,
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginRight: 10,
  },
  subscribedButton: {
    backgroundColor: BRAND_COLORS.accent,
    borderColor: BRAND_COLORS.accent,
  },
  subscribeText: {
    marginLeft: 8,
    fontSize: 16,
    color: BRAND_COLORS.accent,
    fontWeight: '600',
  },
  subscribedText: {
    color: BRAND_COLORS.background,
  },
  shareButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'transparent',
    borderWidth: 2,
    borderColor: BRAND_COLORS.accent,
    borderRadius: 24,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  shareButtonText: {
    marginLeft: 8,
    fontSize: 16,
    color: BRAND_COLORS.accent,
    fontWeight: '600',
  },
  bioContainer: {
    marginTop: 10,
    paddingTop: 16,
    paddingBottom: 0,
    borderTopWidth: 1,
    borderTopColor: BRAND_COLORS.background === '#FFFFFF' ? '#EEEEEE' : '#333333',
  },
  bioTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: BRAND_COLORS.primaryText,
    marginBottom: 10,
    textAlign: 'center',
  },
  bioText: {
    fontSize: 16,
    color: BRAND_COLORS.primaryText,
    lineHeight: 24,
    textAlign: 'center',
    marginBottom: 0,
  },
  sectionTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    marginTop: 0,
    marginBottom: 20,
    color: BRAND_COLORS.primaryText,
    paddingHorizontal: 20,
    textAlign: 'center',
  },
  loadingContainer: {
    paddingVertical: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#666',
  },
  errorContainer: {
    paddingVertical: 40,
    justifyContent: 'center',
    alignItems: 'center',
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
    backgroundColor: BRAND_COLORS.accent,
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
    paddingVertical: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
  },
  showsList: {
    marginBottom: 30,
    paddingHorizontal: 20,
  },
  showCard: {
    flexDirection: 'column',
    backgroundColor: BRAND_COLORS.background === '#FFFFFF' ? '#F5F5F5' : '#1A1A1A',
    borderRadius: 12,
    marginBottom: 24,
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
    height: width * 0.5,
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
  },
  showInfo: {
    padding: 16,
    paddingBottom: 20,
  },
  showName: {
    fontSize: 20,
    fontWeight: 'bold',
    color: BRAND_COLORS.primaryText,
    marginBottom: 8,
  },
  showDate: {
    fontSize: 16,
    color: BRAND_COLORS.primaryText === '#000000' ? '#666666' : '#BBBBBB',
    marginBottom: 16,
  },
  playButton: {
    alignSelf: 'flex-end',
    marginTop: 6,
  },
  scrollContent: {
    padding: 0,
    paddingTop: 0,
    paddingBottom: Platform.OS === 'ios' ? 100 : 80,
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