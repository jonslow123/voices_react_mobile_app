import React from 'react';
import { View, TouchableOpacity, Text, StyleSheet } from 'react-native';

const CustomTabBar = ({ state, descriptors, navigation }) => {
  return (
    <View style={styles.tabContainer}>
      {state.routes.map((route, index) => {
        const { options } = descriptors[route.key];
        const isFocused = state.index === index;

        const onPress = () => {
          const event = navigation.emit({
            type: 'tabPress',
            target: route.key,
            canPreventDefault: true,
          });

          if (!isFocused && !event.defaultPrevented) {
            navigation.navigate(route.name);
          }
        };

        const label = options.tabBarLabel ?? route.name; // Fallback to route.name
        const displayLabel = typeof label === 'string' ? label : 'Tab'; // Ensure label is a string

        return (
          <View key={index} style={styles.tab}>
            <TouchableOpacity onPress={onPress} style={styles.tabButton}>
              <Text style={{ color: isFocused ? '#673ab7' : '#222' }}>
                {displayLabel}
              </Text>
            </TouchableOpacity>
          </View>
        );
      })}
    </View>
  );
};

const styles = StyleSheet.create({
  tabContainer: {
    flexDirection: 'row',
    height: 50, // Set height based on your needs
    backgroundColor: '#fff',
    alignItems: 'center',
  },
  tab: {
    flex: 1,
    alignItems: 'center',
  },
  tabButton: {
    paddingVertical: 10,
  },
  divider: {
    width: 1,
    height: '70%', // Adjust height as necessary
    backgroundColor: '#ccc', // Divider color
    marginVertical: 5,
  },
});

export default CustomTabBar;
