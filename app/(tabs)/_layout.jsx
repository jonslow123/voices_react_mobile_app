import React from 'react';
import { View, StyleSheet, SafeAreaView, StatusBar, Platform } from 'react-native';
import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import Constants from 'expo-constants';
import TopBanner from '../../components/TopBanner';
import MiniPlayer from '../../components/MiniPlayer';

export default function TabLayout() {
  // Get status bar height for proper padding
  const statusBarHeight = Constants.statusBarHeight || 0;
  
  return (
    <View style={styles.container}>
      <SafeAreaView style={{
        backgroundColor: 'black', // Match your TopBanner background color
        paddingTop: Platform.OS === 'ios' ? Constants.statusBarHeight || 0 : 0,
      }}>
        <TopBanner />
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
          tabBarActiveTintColor: '#007AFF',
          tabBarStyle: {
            height: Platform.OS === 'ios' ? 80 : 60, // Taller tab bar
            paddingBottom: Platform.OS === 'ios' ? 25 : 10, // Extra padding at bottom
            paddingTop: 5, // Padding at top to push icons up a bit
            // Make sure there are no borders or shadows
            borderTopWidth: 0,
            elevation: 0,
          },
          tabBarLabelStyle: {
            marginBottom: Platform.OS === 'ios' ? 8 : 5, // Move labels up
          },
          tabBarIconStyle: {
            marginTop: 5, // Move icons up
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
            title: 'Artists',
            tabBarIcon: ({ color }) => <Ionicons name="people" size={24} color={color} />,
          }}
        />
        <Tabs.Screen
          name="membership"
          options={{
            title: 'Membership',
            tabBarIcon: ({ color }) => <Ionicons name="card" size={24} color={color} />,
          }}
        />
      </Tabs>
      
      <MiniPlayer />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
}); 