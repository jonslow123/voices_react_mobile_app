/*import React from 'react';
import { usePlayer } from '../context/PlayerContext';
import MembershipScreen from '../../screens/MembershipScreen';
import { BRAND_COLORS } from '../styles/brandColors';
import { StyleSheet } from 'react-native';

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: BRAND_COLORS.background,
  },
  container: {
    flex: 1,
    backgroundColor: BRAND_COLORS.background,
    padding: 16,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: BRAND_COLORS.accent,
    marginBottom: 24,
  },
  membershipCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    marginBottom: 16,
    shadowColor: BRAND_COLORS.primaryText,
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  cardTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: BRAND_COLORS.accent,
    marginBottom: 8,
  },
  cardDescription: {
    fontSize: 16,
    color: BRAND_COLORS.primaryText,
    opacity: 0.8,
    lineHeight: 24,
    marginBottom: 16,
  },
  price: {
    fontSize: 24,
    fontWeight: 'bold',
    color: BRAND_COLORS.primaryText,
    marginBottom: 16,
  },
  button: {
    backgroundColor: BRAND_COLORS.accent,
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  buttonText: {
    color: BRAND_COLORS.background,
    fontSize: 16,
    fontWeight: 'bold',
  },
  tabBar: {
    backgroundColor: BRAND_COLORS.background,
    borderTopWidth: 1,
    borderTopColor: 'rgba(19, 18, 0, 0.1)',
  },
  tabLabelActive: {
    color: BRAND_COLORS.accent,
  },
  tabLabelInactive: {
    color: BRAND_COLORS.primaryText,
  }
});

export default function MembershipScreenTab() {
  const { handleTilePress } = usePlayer();
  return <MembershipScreen />
} 
*/