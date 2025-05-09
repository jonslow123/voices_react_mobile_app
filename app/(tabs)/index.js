import React from 'react';
import { usePlayer } from '../context/PlayerContext';
import HomeScreen from '../../screens/HomeScreen';
import { View, StyleSheet } from 'react-native';

export default function Home() {
  const { handleTilePress, miniPlayerVisible } = usePlayer();
  return (
    <View style={[styles.container, miniPlayerVisible && styles.containerWithPlayer]}>
      <HomeScreen />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  containerWithPlayer: {
    paddingBottom: 60,
  }
}); 