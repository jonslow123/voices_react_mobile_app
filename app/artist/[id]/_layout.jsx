import React from 'react';
import { View, StyleSheet, SafeAreaView, StatusBar, Platform } from 'react-native';
import { Stack, Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import Constants from 'expo-constants';
import MiniPlayer from '../../../components/MiniPlayer';
import { Dimensions } from 'react-native';
const { width, height } = Dimensions.get('window');

export default function ArtistDetailLayout() {
  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#000" />
      
      <Stack
        screenOptions={{
          headerShown: false,
        }}
      />
      
      {/* Tabs at the bottom - same as in main layout */}
      <View style={styles.tabBarContainer}>
        <Tabs.Navigator
          screenOptions={{
            headerShown: false,
            tabBarActiveTintColor: '#007AFF',
            tabBarStyle: styles.tabBar,
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
            name="settings"
            options={{
              title: 'My Profile',
              tabBarIcon: ({ color }) => <Ionicons name="cog" size={24} color={color} />,
            }}
          />
        </Tabs.Navigator>
      </View>
      
      <MiniPlayer />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
    width: width,
    height: height
  },
  tabBarContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 60,
    backgroundColor: 'white',
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  tabBar: {
    height: 60,
    paddingBottom: Platform.OS === 'ios' ? 20 : 0,
  },
}); 