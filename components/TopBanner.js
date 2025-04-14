import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { usePlayer } from '../app/context/PlayerContext';
import MarqueeText from './MarqueeText';
import { BRAND_COLORS } from '../app/styles/brandColors';

export default function TopBanner() {
  const {
    isHeaderPlaying,
    isLoadingHeader,
    toggleHeaderSound,
    liveInfo
  } = usePlayer();
  
  // Extract show title from live info
  const showTitle = liveInfo && liveInfo.current && liveInfo.current.title 
    ? liveInfo.current.title 
    : 'Voices Radio';
  
  return (
    <View style={styles.container}>
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
        <MarqueeText 
          speed={40}
          delay={2000}
          style={styles.liveInfoText}
        >
          {showTitle}
        </MarqueeText>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: BRAND_COLORS.black,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  playButton: {
    width: 36,
    height: 36,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
    backgroundColor: 'transparent', // Ensure transparency
  },
  liveInfoContainer: {
    flex: 1,
    justifyContent: 'center',
  },
  liveInfoText: {
    color: BRAND_COLORS.beige,
    fontSize: 14,
    fontWeight: '500',
  },
  title: {
    color: BRAND_COLORS.redOrange,
    fontSize: 20,
    fontWeight: 'bold',
  },
  subtitle: {
    color: BRAND_COLORS.beige,
    fontSize: 14,
  }
}); 