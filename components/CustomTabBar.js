import React from 'react';
import { View, TouchableOpacity, Text, StyleSheet, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, usePathname } from 'expo-router';
import { BRAND_COLORS } from '../app/styles/brandColors';

export default function CustomTabBar() {
  const router = useRouter();
  const pathname = usePathname();
  
  const tabs = [
    { name: 'Home', route: '/(tabs)/', icon: 'home' },
    { name: 'Explore', route: '/(tabs)/artists', icon: 'people' },
    { name: 'Subscribed', route: '/(tabs)/subscribed', icon: 'heart' },
    { name: 'My Profile', route: '/(tabs)/settings', icon: 'cog' },
  ];
  
  return (
    <View style={styles.container}>
      {tabs.map((tab) => {
        const isFocused = pathname === tab.route || 
                        (pathname.startsWith(tab.route) && tab.route !== '/(tabs)/');
        
        return (
          <TouchableOpacity
            key={tab.route}
            accessibilityRole="button"
            accessibilityState={isFocused ? { selected: true } : {}}
            onPress={() => router.push(tab.route)}
            style={styles.tabButton}
          >
            <Ionicons
              name={isFocused ? tab.icon : `${tab.icon}-outline`}
              size={24}
              color={isFocused ? BRAND_COLORS.accent : '#8E8E93'}
            />
            <Text style={[
              styles.tabLabel,
              isFocused && { color: BRAND_COLORS.accent, fontWeight: '500' }
            ]}>
              {tab.name}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    backgroundColor: BRAND_COLORS.background,
    height: Platform.OS === 'ios' ? 80 : 60,
    paddingBottom: Platform.OS === 'ios' ? 25 : 10,
    paddingTop: 5,
    borderTopWidth: 0,
    elevation: 0,
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    zIndex: 999,
  },
  tabButton: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    height: '100%',
  },
  tabLabel: {
    fontSize: 11,
    color: '#8E8E93',
    marginTop: 4,
  }
});