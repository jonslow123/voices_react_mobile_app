import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { View, Text } from 'react-native';
import HomeScreen from '../screens/HomeScreen.js';
import ArtistsScreen from '../screens/ArtistsScreen.js';

const Tab = createBottomTabNavigator();

console.log("Check");

export default function App() {
  console.log("Success");
  console.log(HomeScreen);
  return (
    <Tab.Navigator>
      <Tab.Screen name="Home" component={HomeScreen} />
      <Tab.Screen name="Artists" component={ArtistsScreen} />
    </Tab.Navigator>
  ); 
}