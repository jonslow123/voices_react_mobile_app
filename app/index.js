import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import HomeScreen from '../screens/HomeScreen.js';
import ArtistsScreen from '../screens/ArtistsScreen.js';
import ArtistDetailsScreen from '../screens/ArtistDetailsScreen.js';
import CustomTabBar from '../assets/custom/CustomTabBar.js';
import { createStackNavigator } from '@react-navigation/stack';


const Tab = createBottomTabNavigator();
const Stack = createStackNavigator();

// Artists stack navigator
const ArtistsStack = () => (
  <Stack.Navigator>
    <Stack.Screen 
      name="Artists" 
      component={ArtistsScreen} 
      options={{ headerShown: false }} 
    />
    <Stack.Screen 
      name="ArtistDetail" 
      component={ArtistDetailsScreen} 
      options={{ headerShown: false }} 
    />
  </Stack.Navigator>
);

export default function App() {
  return (
<Tab.Navigator
        tabBar={props => <CustomTabBar {...props} />}
        screenOptions={{
          tabBarStyle: {
            height: 50,
            paddingBottom: 0,
          },
          tabBarLabelStyle: {
            fontSize: 12,
          },
        }}
      >
        <Tab.Screen 
          name="Home" 
          component={HomeScreen} 
          options={{ headerShown: false, tabBarLabel: 'Home' }} 
        />
        <Tab.Screen 
          name="Artists" 
          component={ArtistsStack} 
          options={{ headerShown: false }} 
        />
      </Tab.Navigator>
  );
}