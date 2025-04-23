import React, { useState, useEffect, useRef } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator, Dimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { usePlayer } from '../app/context/PlayerContext';
import { useRouter } from 'expo-router';
import { BRAND_COLORS } from '../app/styles/brandColors';

export default function TopBanner() {
  const {
    isHeaderPlaying,
    isLoadingHeader,
    toggleHeaderSound,
    liveInfo
  } = usePlayer();
  
  const router = useRouter();
  
  // Extract show title from live info
  const showTitle = liveInfo && liveInfo.current && liveInfo.current.title 
    ? liveInfo.current.title 
    : 'Voices Radio';
  
  // Get screen dimensions
  const screenWidth = Dimensions.get('window').width;
  
  const navigateToSchedule = () => {
    try {
      // Try the different possible paths
      router.push('/schedule');
    } catch (error) {
      console.error('Navigation error:', error);
      // Fall back to another path if needed
      try {
        router.push('/(tabs)/schedule');
      } catch (fallbackError) {
        console.error('Fallback navigation error:', fallbackError);
        alert('Could not navigate to schedule screen');
      }
    }
  };

  return (
    <View style={styles.topBannerContainer}>
      <TouchableOpacity 
        style={styles.playButton}
        onPress={toggleHeaderSound}
        disabled={isLoadingHeader}
      >
        {isLoadingHeader ? (
          <ActivityIndicator size="small" color="#FF3B30" />
        ) : (
          <Ionicons 
            name={isHeaderPlaying ? "pause-circle" : "play-circle"} 
            size={32} 
            color="#FF3B30"
          />
        )}
      </TouchableOpacity>
      
      <View style={styles.liveInfoContainer}>
        <Text 
          numberOfLines={1}
          ellipsizeMode="tail"
          style={styles.liveInfoText}
        >
          {showTitle}
        </Text>
      </View>
      
      <TouchableOpacity 
        style={styles.scheduleButton} 
        onPress={navigateToSchedule}
      >
        <Ionicons name="calendar" size={24} color="white" />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  topBannerContainer: {
    backgroundColor: BRAND_COLORS.background,
    paddingVertical: 12,
    paddingHorizontal: 15,
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#333',
    margin: 0,
    width: '100%',
    position: 'relative',
  },
  playButton: {
    width: 36,
    height: 36,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
    backgroundColor: 'transparent',
  },
  liveInfoContainer: {
    flex: 1,
    justifyContent: 'center',
    paddingRight: 40, 
  },
  liveInfoText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '500',
  },
  scheduleButton: {
    position: 'absolute',
    right: 16,
    top: '75%',
    transform: [{ translateY: -12 }],
    padding: 4,
    zIndex: 10,
  },
});