import React, { useEffect, useState } from 'react';
import { View, Text, Button, ActivityIndicator, StyleSheet, Image } from 'react-native';
import { Audio } from 'expo-av';

const HomeScreen = () => {
    const [isPlaying, setIsPlaying] = useState(false);
    const [sound, setSound] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null); 

  
    useEffect(() => {
      return sound
        ? () => {
            console.log('Unloading Sound');
            sound.unloadAsync();
          }
        : undefined;
    }, [sound]);
  
    const togglePlayPause = async () => {
      try {
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
      } catch (err) {
        setError('Could not load sound');
        console.error('Error loading sound:', err);
      }
    };

    // Loading and error handling
    if (loading) {
        return <ActivityIndicator size="large" color="#0000ff" />;
    }

    if (error) {
        return <View><Text>Error: {error}</Text></View>;
    }

    return (
        <View style={styles.container}>
            <Image source={require('../assets/images/voices_logo.png')} style={styles.logo} />
            <Text style={styles.title}>Voices Mobile</Text>
            <Button
                title={isPlaying ? 'Pause' : 'Play'}
                onPress={togglePlayPause}
            />
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#f5f5f5',
    },
    logo: {
        width: 150,
        height: 150,
        marginBottom: 20,
    },
    title: {
        fontSize: 24,
        fontWeight: 'bold',
        marginBottom: 20,
    },
});

export default HomeScreen;
