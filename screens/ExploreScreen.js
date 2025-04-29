import React, { useState } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity,
  Dimensions,
  StatusBar
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Constants from 'expo-constants';
import ArtistsScreen from './ArtistsScreen';
import ShowsScreen from './ShowsScreen';
import { BRAND_COLORS } from '../app/styles/brandColors';

const { width } = Dimensions.get('window');

const ExploreScreen = () => {
  const [activeTab, setActiveTab] = useState('artists'); // 'artists' or 'shows'

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />
      
      
      {/* Toggle between Artists and Shows */}
      <View style={styles.tabToggle}>
        <TouchableOpacity 
          style={[styles.tabButton, activeTab === 'artists' && styles.activeTabButton]}
          onPress={() => setActiveTab('artists')}
        >
          <Text style={[styles.tabButtonText, activeTab === 'artists' && styles.activeTabText]}>Artists</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={[styles.tabButton, activeTab === 'shows' && styles.activeTabButton]}
          onPress={() => setActiveTab('shows')}
        >
          <Text style={[styles.tabButtonText, activeTab === 'shows' && styles.activeTabText]}>Shows</Text>
        </TouchableOpacity>
      </View>
      
      {/* Content Area */}
      <View style={styles.contentContainer}>
        {activeTab === 'artists' ? (
          <ArtistsScreen />
        ) : (
          <ShowsScreen />
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: BRAND_COLORS.background,
  },
  header: {
    paddingTop: Constants.statusBarHeight || 0,
    paddingHorizontal: 15,
    paddingBottom: 10,
    backgroundColor: BRAND_COLORS.accent,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  tabToggle: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: BRAND_COLORS.border || '#333',
  },
  tabButton: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 12,
    backgroundColor: BRAND_COLORS.background,
  },
  activeTabButton: {
    borderBottomWidth: 3,
    borderBottomColor: BRAND_COLORS.accent,
  },
  tabButtonText: {
    fontSize: 16,
    fontWeight: '500',
    color: BRAND_COLORS.secondaryText || '#999',
  },
  activeTabText: {
    color: BRAND_COLORS.accent,
    fontWeight: '600',
  },
  contentContainer: {
    flex: 1,
  },
});

export default ExploreScreen;