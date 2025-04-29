// components/BottomPlayerBar.js
import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { usePlayer } from '../app/context/PlayerContext';
import { BRAND_COLORS } from '../app/styles/brandColors';

export default function BottomPlayerBar() {
  // Get only the essential values from context
  const { 
    miniPlayerVisible, 
    currentTrack, 
    isPlaying, 
    stopPlayback, 
    togglePlayback,
    isHeaderPlaying,
    toggleHeaderSound,
    liveInfo
  } = usePlayer();

  const [, forceUpdate] = useState({});
  
  // Force update when miniPlayerVisible changes
  useEffect(() => {
    forceUpdate({});
  }, [miniPlayerVisible]);

  // Simple console debugging - this may not work in all environments
  console.log('BottomPlayerBar render - miniPlayerVisible:', miniPlayerVisible);
  
  // VERY IMPORTANT: Alert.alert would pop up a visible message
  // This is a more reliable way to debug than console.log
  // Uncomment this line to check if the component renders and what state it has:
  // Alert.alert("State", `miniPlayerVisible: ${miniPlayerVisible}`);

  
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: Platform.OS === 'ios' ? 80 : 60,
    left: 0,
    right: 0,
    zIndex: 9999,
    backgroundColor: '#222',
  },
  text: {
    color: 'white'
  },
  innerContainer: {
    flexDirection: 'row',
    padding: 15,
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  title: {
    flex: 1,
    color: '#fff',
    fontSize: 16,
  },
  controls: {
    flexDirection: 'row',
  },
  button: {
    marginHorizontal: 10,
  }
});