import React from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity,
  Platform
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { WebView } from 'react-native-webview';
import { usePlayer } from '../app/context/PlayerContext';
import { BRAND_COLORS } from '../app/styles/brandColors';

const MiniPlayer = () => {
  const { 
    currentTrack, 
    miniPlayerVisible, 
    currentPlayingUrl, 
    stopPlayback
  } = usePlayer();

  if (!miniPlayerVisible || !currentTrack || !currentPlayingUrl) {
    return null;
  }

  // Get title for header display
  const title = currentTrack.name || currentTrack.title || 'Now Playing';

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title} numberOfLines={1}>
          {title}
        </Text>
        <TouchableOpacity 
          style={styles.closeButton}
          onPress={stopPlayback}
        >
          <Ionicons name="close-circle" size={24} color={BRAND_COLORS.black} />
        </TouchableOpacity>
      </View>
      
      {/* Use the Mixcloud mini widget */}
      <WebView
        source={{ uri: currentPlayingUrl }}
        style={styles.webView}
        mediaPlaybackRequiresUserAction={false}
        allowsInlineMediaPlayback={true}
        javaScriptEnabled={true}
        onError={(e) => console.error('WebView error:', e.nativeEvent)}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: Platform.OS === 'ios' ? 80 : 60, // Match the tab bar height
    left: 0,
    right: 0,
    backgroundColor: BRAND_COLORS.beige,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: -2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
    // Remove the border radius to make it flush with the tab bar
    borderTopLeftRadius: 0,
    borderTopRightRadius: 0,
    borderTopWidth: 1,
    borderTopColor: 'rgba(19, 18, 0, 0.1)',
    padding: 10,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  title: {
    fontSize: 16,
    fontWeight: 'bold',
    color: BRAND_COLORS.black,
    flex: 1,
    marginRight: 8,
  },
  closeButton: {
    padding: 4,
  },
  webView: {
    height: 60,
    backgroundColor: 'transparent',
  },
  controls: {
    backgroundColor: BRAND_COLORS.beige,
  },
  playPauseButton: {
    color: BRAND_COLORS.redOrange,
  },
});

export default MiniPlayer; 