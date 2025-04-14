import React from 'react';
import { usePlayer } from '../context/PlayerContext';
import HomeScreen from '../../screens/HomeScreen';

export default function Home() {
  const { handleTilePress } = usePlayer();
  return <HomeScreen />;
} 