import React from 'react';
import { View, StyleSheet, SafeAreaView, StatusBar, Platform } from 'react-native';
import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import Constants from 'expo-constants';
import TopBanner from '../../components/TopBanner';
import MiniPlayer from '../../components/MiniPlayer';
import { BRAND_COLORS } from '../styles/brandColors';
import { Dimensions } from 'react-native';
import { usePlayer } from '../context/PlayerContext';
import { usePathname } from 'expo-router';
const { width, height } = Dimensions.get('window');

export default function TabsLayout() {
  const pathname = usePathname();
  const { miniPlayerVisible } = usePlayer();
  
  return (
    <View style={styles.container}>
      <Tabs
        screenOptions={({ route }) => ({
          headerShown: false,
          tabBarIcon: ({ focused, color, size }) => {
            let iconName;
            
            if (route.name === 'index') {
              iconName = focused ? 'home' : 'home-outline';
            } else if (route.name === 'artists') {
              iconName = focused ? 'people' : 'people-outline';
            } else if (route.name === 'subscribed') {
              iconName = focused ? 'heart' : 'heart-outline';
            } else if (route.name === 'settings') {
              iconName = focused ? 'cog' : 'cog-outline';
            }
            
            return <Ionicons name={iconName} size={size} color={color} />;
          },
          tabBarActiveTintColor: BRAND_COLORS.accent,
          tabBarInactiveTintColor: '#8E8E93',
          tabBarStyle: {
            height: Platform.OS === 'ios' ? 80 : 60,
            paddingBottom: Platform.OS === 'ios' ? 25 : 10,
            paddingTop: 5,
            borderTopWidth: 0,
            elevation: 8,
            backgroundColor: BRAND_COLORS.background,
            shadowColor: '#000',
            shadowOpacity: 0.1,
            shadowOffset: { height: -1, width: 0 },
            shadowRadius: 2,
            zIndex: 1000,
          },
          tabBarLabelStyle: {
            fontSize: 11,
            marginBottom: Platform.OS === 'ios' ? 8 : 5,
          },
        })}
      >
        <Tabs.Screen 
          name="index" 
          options={{ 
            title: 'Home',
            headerShown: false,
          }} 
        />
        <Tabs.Screen 
          name="artists" 
          options={{ 
            title: 'Explore',
            headerShown: false,
          }} 
        />
        <Tabs.Screen 
          name="subscribed" 
          options={{ 
            title: 'Subscribed',
            headerShown: false,
          }} 
        />
        <Tabs.Screen 
          name="settings" 
          options={{ 
            title: 'My Profile',
            headerShown: false,
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
    backgroundColor: BRAND_COLORS.background,
    width: width,
    height: height
  },
}); 