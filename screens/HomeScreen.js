import React, { useState, useRef, useEffect } from 'react';
import { View, Text, ActivityIndicator, StyleSheet, TouchableOpacity } from 'react-native';
import axios from 'axios';
import MarqueeText from 'react-native-marquee';
import { Audio } from 'expo-av'; // For handling the player
import { format } from 'date-fns';

// Function to fetch live info using axios
const fetchLiveInfo = async () => {
  const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
  const response = await axios.get(
    `https://voicesradio.airtime.pro/api/live-info-v2?timezone=${timeZone}`
  );
  return response.data;
};

function formatDateToHour(date) {
    return format(new Date(date), 'HH:mm'); // Format as hours and minutes
}

const HomeScreen = () => {
  // State for player control
  const [playing, setPlaying] = useState(false);
  const [loading, setLoading] = useState(false);
  const [sound, setSound] = useState(null);
  const [liveInfo, setLiveInfo] = useState(null);
  const [error, setError] = useState(null);

  // Fetch live info on component mount
  useEffect(() => {
    const getLiveInfo = async () => {
      try {
        const data = await fetchLiveInfo();
        setLiveInfo(data);
      } catch (err) {
        setError('Error loading live info');
        console.error(err);
      }
    };
    getLiveInfo();
  }, []);

  // Handle play/pause of the audio stream
  const handlePlay = async () => {
    setLoading(true);
    try {
      const { sound: newSound } = await Audio.Sound.createAsync(
        { uri: 'https://voicesradio.out.airtime.pro/voicesradio_a' },
        { shouldPlay: true }
      );
      setSound(newSound);
      setPlaying(true);
    } catch (err) {
      console.error('Error playing audio stream:', err);
    }
    setLoading(false);
  };

  const handleStop = async () => {
    try {
      setLoading(true);
      setSound(null); // Clear the sound
      setPlaying(false); // Update state to reflect player stopped
    } catch (error) {
      console.error('Error stopping the player:', error);
    }
    setLoading(false); // End loading state
  };

  // Clean up the sound object on component unmount
  useEffect(() => {
    return sound
      ? () => {
          sound.unloadAsync();
        }
      : undefined;
  }, [sound]);

  // Error handling or loading state for the live info
  //if (error) return <Text>{error}</Text>;
  if (!liveInfo) return <ActivityIndicator size="large" color="#0000ff" />;

  // Extract the current show details from the API response
  const currentShow = liveInfo.shows.current ? liveInfo.shows.current.name : 'Live DJ';
  const currentTime = liveInfo.shows.current
    ? `${formatDateToHour(liveInfo.shows.current.starts)} - ${formatDateToHour(liveInfo.shows.current.ends)}`
    : 'No Show Info';

  return (
   <View style={styles.container}>
      <View style={styles.playerContainer}>
        <TouchableOpacity style={styles.playButton} onPress={playing ? handleStop : handlePlay}>
          {loading ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <View style={styles.playIconContainer}>
              {playing ? (
                <Text style={styles.stopText}>■</Text> 
              ) : (
                <View style={styles.playIcon} /> // Play icon as a sideways triangle
              )}
            </View>
          )}
        </TouchableOpacity>
        <View style={styles.bannerContainer}>
          <MarqueeText
            style={styles.bannerText}
            duration={8000}
            marqueeOnStart
            loop
            marqueeDelay={1000}
            marqueeResetDelay={1000}
          >
            {liveInfo?.shows?.current
              ? `${currentTime} | ${liveInfo.shows.current.name}`
              : 'Loading Show Info...'}
          </MarqueeText>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'flex-start', // Align to top
    paddingHorizontal: 20,
    backgroundColor: '#f5f5f5',
  },
  playerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 25, // Creates the pill shape
    paddingHorizontal: 10,
    paddingVertical: 5,
    elevation: 5, // Adds shadow for a smooth effect
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 2,
    marginTop: 20, // Optional: Add some spacing from the top
  },
  playButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  playIconContainer: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  playIcon: {
    width: 0,
    height: 0,
    borderLeftWidth: 10,
    borderRightWidth: 10,
    borderBottomWidth: 15,
    borderStyle: 'solid',
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    borderBottomColor: '#000', // Change to black for the triangle
    transform: [{ rotate: '90deg' }], // Rotate to make it sideways
  },
  stopText: {
    color: '#000',
    fontSize: 18,
  },
  bannerContainer: {
    flex: 1,
    marginLeft: 10,
  },
  bannerText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
});

export default HomeScreen;