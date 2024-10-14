import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, ActivityIndicator, StyleSheet } from 'react-native';
import axios from "axios";

const ArtistsScreen = () => {
  const [artists, setArtists] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchArtist = async () => {
    try {
  
      const response = await axios.get('http://192.168.0.7:4000/api/artists', {
        headers: {
          'Content-Type': 'application/json',
          'Connection': 'keep-alive'
        }
      });
  
      const data = response.data; 
      console.log('Fetched Artist Data:', data); 
  
      if (data.length > 0) {
        setArtists(response.data); 
      } else {
        setArtists('No artist found');
      }
    } catch (error) {
      // Different ways the error object can manifest:
      if (error.response) {
        // Server responded with a status other than 200 range
        console.error('Error response:', error.response.data);
        setError(`Error: ${error.response.status} - ${error.response.data.message || 'Server Error'}`);
      }
    } finally {
       setLoading(false);
    }
  };

  useEffect(() => {
    fetchArtist();
  }, []);

  if (loading) {
    return <ActivityIndicator size="large" color="#0000ff" />;
  }

  if (error) {
    return <Text>Error: {error}</Text>;
  }

  // Function to render each artist item
  const renderArtistItem = ({ item }) => {
    const { dj_name, genre_1, genre_2, genre_3 } = item;
    const genres = [genre_1, genre_2, genre_3].filter(Boolean); // Filter out any empty genres

    return (
      <View style={styles.artistItem}>
        <Text style={styles.artistName}>{dj_name}</Text>
        <View style={styles.genreContainer}>
          {genres.map((genre, index) => (
            <View key={index} style={styles.genreTab}>
              <Text style={styles.genreText}>{genre}</Text>
            </View>
          ))}
        </View>
      </View>
    );
  };

  return (
    <FlatList
      data={artists}
      keyExtractor={(item) => item._id}
      renderItem={renderArtistItem}
      contentContainerStyle={styles.listContainer}
    />
  );
};

// Styles for the component
const styles = StyleSheet.create({
  listContainer: {
    padding: 20,
  },
  artistItem: {
    marginBottom: 20,
    padding: 10,
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 10,
    backgroundColor: '#f9f9f9',
  },
  artistName: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  genreContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  genreTab: {
    backgroundColor: '#e0e0e0',
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 5,
    marginRight: 8,
    marginBottom: 8,
  },
  genreText: {
    fontSize: 14,
    color: '#333',
  },
});

export default ArtistsScreen;