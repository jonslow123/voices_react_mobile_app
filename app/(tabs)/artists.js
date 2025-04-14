import React from 'react';
import { StyleSheet } from 'react-native';
import { usePlayer } from '../context/PlayerContext';
import ArtistsScreen from '../../screens/ArtistsScreen';
import { BRAND_COLORS } from '../styles/brandColors';

export default function ArtistsTab() {
  const { handleTilePress } = usePlayer();
  return <ArtistsScreen />;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: BRAND_COLORS.beige,
  },
  header: {
    backgroundColor: BRAND_COLORS.black,
    padding: 16,
  },
  headerText: {
    color: BRAND_COLORS.beige,
    fontSize: 24,
    fontWeight: 'bold',
  },
  artistCard: {
    backgroundColor: '#fff',
    margin: 8,
    borderRadius: 8,
    overflow: 'hidden',
    shadowColor: BRAND_COLORS.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  artistName: {
    color: BRAND_COLORS.redOrange,
    fontSize: 18,
    fontWeight: 'bold',
    padding: 12,
  },
  tabBar: {
    backgroundColor: BRAND_COLORS.beige,
    borderTopColor: 'rgba(19, 18, 0, 0.1)',
  },
  activeTab: {
    color: BRAND_COLORS.redOrange,
  },
  inactiveTab: {
    color: BRAND_COLORS.black,
  }
});