import React from 'react';
import { View, StyleSheet, SafeAreaView, StatusBar, Platform } from 'react-native';
import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import Constants from 'expo-constants';
import TopBanner from '../../components/TopBanner';
import MiniPlayer from '../../components/MiniPlayer';
import { BRAND_COLORS } from '../styles/brandColors';
import { Dimensions } from 'react-native';
import { PlayerContextProvider } from '../context/PlayerContext';
const { width, height } = Dimensions.get('window');

export default function TabLayout() {
  // Get status bar height for proper padding
  const statusBarHeight = Constants.statusBarHeight || 0;
  
  return (
    <PlayerContextProvider>
      <View style={styles.container}>
        <SafeAreaView style={{
          backgroundColor: 'black', // Match your TopBanner background color
          paddingTop: Platform.OS === 'ios' ? Constants.statusBarHeight || 0 : 0,
        }}>
        </SafeAreaView>
        {/* Status bar with light content on dark background */}
        <StatusBar barStyle="light-content" backgroundColor="#000" />
        
        {/* Use SafeAreaView with proper padding */}
        <SafeAreaView style={{ 
          backgroundColor: '#000',
          paddingTop: Platform.OS === 'ios' ? statusBarHeight : 0,
        }}>
        </SafeAreaView>
        
        <Tabs
          screenOptions={{
            headerShown: false,
            tabBarActiveTintColor: BRAND_COLORS.accent,
            tabBarStyle: {
              height: Platform.OS === 'ios' ? 80 : 60, 
              paddingBottom: Platform.OS === 'ios' ? 25 : 10,
              paddingTop: 5,
              borderTopWidth: 0,
              elevation: 0,
              backgroundColor: BRAND_COLORS.background,
            },
            tabBarLabelStyle: {
              marginBottom: Platform.OS === 'ios' ? 8 : 5, 
            },
            tabBarIconStyle: {
              marginTop: 5, 
            }
          }}
        >
          <Tabs.Screen
            name="index"
            options={{
              title: 'Home',
              tabBarIcon: ({ color }) => <Ionicons name="home" size={24} color={color} />,
            }}
          />
          <Tabs.Screen
            name="artists"
            options={{
              title: 'Explore',
              tabBarIcon: ({ color }) => <Ionicons name="search" size={24} color={color} />,
            }}
          />
          <Tabs.Screen
            name="settings"
            options={{
              title: 'My Profile',
              tabBarIcon: ({ color }) => <Ionicons name="cog" size={24} color={color} />,
            }}
          />
        </Tabs>
        <MiniPlayer />
      </View>
    </PlayerContextProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: BRAND_COLORS.background,
    width: width,
    height: height
  },
}); 