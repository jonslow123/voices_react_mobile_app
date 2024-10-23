import React, { useEffect, useState } from 'react';
import { View, Text, Image, ActivityIndicator, StyleSheet, TouchableOpacity, SafeAreaView} from 'react-native';
import axios from "axios";
import { useNavigation } from '@react-navigation/native';
import { WebView } from 'react-native-webview';

const ArtistDetailsScreen = ({ route }) => {
  const { artistId } = route.params; 
  const [artist, setArtist] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const navigation = useNavigation(); 
  const [playing, setPlaying] = useState(false);

  const fetchArtistDetail = async (artistId) => {
    try {
      const response = await axios.get(`http://192.168.0.7:4000/api/artists/${artistId}`);
      setArtist(response.data);
    } catch (err) {
      setError('Failed to fetch artist details.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchArtistDetail(artistId);
  });

  if (loading) {
    return <ActivityIndicator size="large" color="#0000ff" />;
  }

  if (error) {
    return <Text>{error}</Text>;
  }

  const renderGenreTags = (tags) => (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginTop: 8 }}>
      {tags.map((tag) => (
        <Text
          key={tag.key}
          style={{
            marginRight: 8,
            marginBottom: 8,
            paddingHorizontal: 8,
            paddingVertical: 4,
            backgroundColor: '#e0e0e0',
            borderRadius: 4,
          }}>
          {tag.name}
        </Text>
      ))}
    </View>
  );
  
  const playShow = () => {
    Linking.openURL('https://www.mixcloud.com/widget/iframe/?feed=https%3A%2F%2Fwww.mixcloud.com%2Fspartacus%2Fparty-time%2F&amp;hide_cover=1&amp;light=1');
  };

  const ArtistShows = ({ shows }) => {
    return (
      <FlatList
        data={shows}
        keyExtractor={(item) => item.key}
        renderItem={({ item }) => <ArtistShowContainer exampleShowData={item} />}
        contentContainerStyle={{ paddingBottom: 20 }}
      />
    );
  };



  return (
    <View style={styles.container}>
      <TouchableOpacity style={styles.arrowOutline} onPress={() => navigation.goBack()}>
        <Text style={styles.arrowText}>←</Text> 
      </TouchableOpacity>
      
      <SafeAreaView style={styles.imageContainer}>
        <View style={styles.imageContainer}>
          <Image
            source={{ uri: `http://192.168.0.7:4000/api/artists/image/${artist.imageId}` }}
            style={styles.headerImage}
          />
        </View>
      </SafeAreaView>


    <Text style={styles.djName}>{artist.dj_name}</Text>
    <Text style={styles.bio}>{artist.bio}</Text>


    <View style={styles.genreContainer}>
      <Text style={styles.genre}>{artist.genre_1}</Text>
      {artist.genre_2 && (
        <Text style={styles.genre}>{artist.genre_2}</Text>
      )}
      {artist.genre_3 && (
        <Text style={styles.genre}>{artist.genre_3}</Text>
      )}
    </View>


    <View style={styles.infoContainer}>
      <Text style={styles.label}>Time:</Text>
      <Text style={styles.value}>{artist.time}</Text>
    </View>

    <View style={styles.infoContainer}>
      <Text style={styles.label}>Day:</Text>
      <Text style={styles.value}>{artist.day}</Text>
    </View>

    <View style={{ marginTop: 16, height: 200 }}>
        <WebView
          source={{
            uri: 'https://www.mixcloud.com/widget/iframe/?feed=/VoicesRadio/the-sounds-of-gem-w-jessi-181024-voices-radio/',
          }}
          allowsInlineMediaPlayback={true}
          mediaPlaybackRequiresUserAction={false}
          javaScriptEnabled={true}
        />
      </View>
  </View>

  );

};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: 0, // Remove any padding at the top
    backgroundColor: '#fff', // Ensure background color is consistent
  },
  arrowOutline: {
    position: 'absolute',
    top: 20, // Adjust as necessary to position it correctly
    left: 10, // Adjust to move it inwards from the left
    backgroundColor: 'rgba(0, 0, 0, 0.5)', // Semi-transparent background for contrast
    borderRadius: 5,
    padding: 10,
    zIndex: 1, // Ensure it is on top of the image
  },
  arrowText: {
    color: 'white', // Color for the arrow
    fontSize: 18, // Size of the arrow
  },
  imageContainer: {
    width: '100%',
    height: 300, // Adjust the height based on your design
    paddingTop: 0, // Remove any padding at the top
    backgroundColor: '#fff', // Ensure background color is consistent
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
  headerImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover', // Ensure it covers the entire area
  },
  djName: {
    fontSize: 28,
    fontWeight: 'bold',
    marginVertical: 10,
    justifyContent: 'center', 
    alignItems: 'center', 
    textAlign: 'center', // Center text within the pill
  },
  bio: {
    fontSize: 16,
    marginVertical: 10,
    textAlign: 'center', // Center text within the pill
  },
  infoContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 5,
  },
  value: {
    color: '#555',
  },
  infoCard: {
    padding: 15,
    backgroundColor: '#f9f9f9',
    borderRadius: 8,
    marginVertical: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between', // Distribute space between label and genres
  },
  label: {
    fontWeight: 'bold',
    marginRight: 10, // Space between label and genre text
  },
  genreContainer: {
    flexDirection: 'row', 
    justifyContent: 'center', 
    alignItems: 'center', 
    flexWrap: 'wrap', 
    width: '100%', 
  },
  genre: {
    backgroundColor: '#e0e0e0', // Background color for genre
    borderRadius: 20, // Increased radius for a more pronounced pill shape
    paddingVertical: 8, // Vertical padding for more space
    paddingHorizontal: 12, // Horizontal padding for more space
    marginRight: 8, // Space between genres
    textAlign: 'center', // Center text within the pill
    overflow: 'hidden', // Ensure no overflow in the pill shape
  },
});

export default ArtistDetailsScreen;
