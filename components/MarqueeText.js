import React, { useRef, useEffect, useState } from 'react';
import { View, Text, StyleSheet, Animated, Easing } from 'react-native';

const MarqueeText = ({ children, speed = 30, delay = 1000, style = {} }) => {
  const scrollX = useRef(new Animated.Value(0)).current;
  const textRef = useRef(null);
  const containerRef = useRef(null);
  const [containerWidth, setContainerWidth] = useState(0);
  const [textWidth, setTextWidth] = useState(0);
  const [shouldScroll, setShouldScroll] = useState(false);

  useEffect(() => {
    // Only scroll if text is wider than container
    if (shouldScroll) {
      // Reset to starting position
      scrollX.setValue(0);
      
      // Create scrolling animation
      Animated.sequence([
        // Wait a bit before starting
        Animated.delay(delay),
        // Scroll to the end
        Animated.timing(scrollX, {
          toValue: -textWidth, // Scroll the full width of text
          duration: textWidth * speed, // Duration based on text length
          easing: Easing.linear,
          useNativeDriver: true,
        }),
        // Wait at the end
        Animated.delay(delay),
      ]).start(() => {
        // Reset and restart
        scrollX.setValue(containerWidth);
        
        // Create loop animation that starts offscreen and goes to end
        Animated.loop(
          Animated.timing(scrollX, {
            toValue: -textWidth,
            duration: (textWidth + containerWidth) * speed,
            easing: Easing.linear,
            useNativeDriver: true,
          })
        ).start();
      });
    }
  }, [shouldScroll, textWidth, containerWidth]);

  return (
    <View
      ref={containerRef}
      style={[styles.container, style]}
      onLayout={(event) => {
        const width = event.nativeEvent.layout.width;
        setContainerWidth(width);
        if (textWidth > width) {
          setShouldScroll(true);
        }
      }}
    >
      <Animated.Text
        ref={textRef}
        numberOfLines={1}
        style={[
          styles.text,
          {
            transform: [{ translateX: scrollX }],
          },
        ]}
        onLayout={(event) => {
          const width = event.nativeEvent.layout.width;
          setTextWidth(width);
          if (width > containerWidth && containerWidth > 0) {
            setShouldScroll(true);
          }
        }}
      >
        {children}
      </Animated.Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    overflow: 'hidden',
    width: '100%',
    height: 20,
  },
  text: {
    color: 'white',
    fontSize: 14,
    fontWeight: '500',
  },
});

export default MarqueeText; 