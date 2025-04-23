import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Stack } from 'expo-router';
import MiniPlayer from '../../components/MiniPlayer';
import { Dimensions } from 'react-native';
const { width, height } = Dimensions.get('window');

export default function ArtistDetailsLayout() {
  return (
    <View style={styles.container}>
      <Stack
        screenOptions={{
          headerShown: false,
        }}
      />
      <MiniPlayer />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
    width: width,
    height: height
  },
}); 