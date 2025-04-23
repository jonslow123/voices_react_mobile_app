import React from 'react';
import { Stack } from 'expo-router';

export default function OnboardingLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        animation: 'slide_from_right',
      }}
    >
      <Stack.Screen name="index" />
      <Stack.Screen name="screen1" />
      <Stack.Screen name="screen2" />
      <Stack.Screen name="screen3" />
    </Stack>
  );
}