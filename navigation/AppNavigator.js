import ArtistsScreen from '../screens/ArtistsScreen';
import ArtistDetailsScreen from '../screens/ArtistDetailsScreen';

const Stack = createStackNavigator();

function AppNavigator() {
  return (
    <Stack.Navigator>
      <Stack.Screen 
        name="Artists" 
        component={ArtistsScreen} 
        options={{ headerShown: false }}
      />
      <Stack.Screen 
        name="ArtistDetails" 
        component={ArtistDetailsScreen} 
        options={{ headerShown: false }}
      />
    </Stack.Navigator>
  );
} 