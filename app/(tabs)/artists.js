import React from 'react';
import { StyleSheet } from 'react-native';
import { usePlayer } from '../context/PlayerContext';
import ExploreScreen from '../../screens/ExploreScreen';
import { BRAND_COLORS } from '../styles/brandColors';
import { Dimensions } from 'react-native';
const { width, height } = Dimensions.get('window');

export default function ExploreTab() {
  const { handleTilePress } = usePlayer();
  return <ExploreScreen />;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: BRAND_COLORS.background,
    width: width,
    height: height
  },
  header: {
    backgroundColor: BRAND_COLORS.primaryText,
    padding: 16,
  },
  headerText: {
    color: BRAND_COLORS.background,
    fontSize: 24,
    fontWeight: 'bold',
  },
  artistCard: {
    backgroundColor: '#fff',
    margin: 8,
    borderRadius: 8,
    overflow: 'hidden',
    shadowColor: BRAND_COLORS.primaryText,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  artistName: {
    color: BRAND_COLORS.accent,
    fontSize: 18,
    fontWeight: 'bold',
    padding: 12,
  },
  tabBar: {
    backgroundColor: BRAND_COLORS.accent,
    borderTopColor: 'rgba(19, 18, 0, 0.1)',
  },
  activeTab: {
    color: BRAND_COLORS.accent,
  },
  inactiveTab: {
    color: BRAND_COLORS.accent,
  }
});