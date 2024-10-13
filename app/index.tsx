import React, { useState, useEffect } from 'react';
import { View, Text, Button, Image, StyleSheet } from 'react-native';
import { Audio } from 'expo-av';

export default function App() {
  const [isPlaying, setIsPlaying] = useState(false);
  const [sound, setSound] = useState<Audio.Sound | null>(null);

  useEffect(() => {
    return sound
      ? () => {
          console.log('Unloading Sound');
          sound.unloadAsync();
        }
      : undefined;
  }, [sound]);

  const togglePlayPause = async () => {
    if (isPlaying && sound) {
      await sound.pauseAsync();
    } else {
      const { sound: newSound } = await Audio.Sound.createAsync(
        { uri: 'https://voicesradio.out.airtime.pro/voicesradio_a' },
        { shouldPlay: true }
      );
      setSound(newSound);
    }
    setIsPlaying(!isPlaying);
  };

  return (
    <View style={styles.container}>
      <Image source={require('../assets/images/voices_logo.png')} style={styles.logo} />
      <Text style={styles.title}>Vocies Mobile</Text>
      <Button
        title={isPlaying ? 'Pause' : 'Play'}
        onPress={togglePlayPause}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  logo: {
    width: 100,
    height: 100,
    marginBottom: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
  },
});
