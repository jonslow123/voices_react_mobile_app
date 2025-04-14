import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Stack } from 'expo-router';
import MiniPlayer from '../../components/MiniPlayer';

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
  },
}); 