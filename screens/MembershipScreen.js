import React, { useState, useRef, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  TouchableOpacity, 
  Animated, 
  Easing
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useFocusEffect } from 'expo-router';
import { usePlayer } from '../app/context/PlayerContext';

const INITIAL_SPEED = 8000; // 8 seconds for a full rotation

const MembershipScreen = () => {
  const router = useRouter();
  
  // Animation values
  const rotateValue = useRef(new Animated.Value(0)).current;
  const scaleValue = useRef(new Animated.Value(1)).current;
  const [currentColorIndex, setCurrentColorIndex] = useState(0);
  const [animationSpeed, setAnimationSpeed] = useState(INITIAL_SPEED);
  
  const [membershipData] = useState({
    firstName: 'John',
    lastName: 'Doe',
    membershipNumber: `JD-VOICES-${Math.floor(1000 + Math.random() * 9000)}`
  });

  const colors = [
    '#4CAF50', // green
    '#2196F3', // blue
    '#9C27B0', // purple
    '#F44336', // red
    '#FF9800', // orange
    '#FFEB3B', // yellow
  ];

  const {
    isHeaderPlaying,
    toggleHeaderSound,
    liveInfo
  } = usePlayer();

  // Reset animations when navigating away from screen
  useFocusEffect(
    React.useCallback(() => {
      return () => {
        setAnimationSpeed(INITIAL_SPEED);
        setCurrentColorIndex(0);
        rotateValue.setValue(0);
        scaleValue.setValue(1);
      };
    }, [])
  );

  // Set up the animations
  useEffect(() => {
    const transformAnimation = Animated.parallel([
      Animated.loop(
        Animated.timing(rotateValue, {
          toValue: 1,
          duration: animationSpeed,
          easing: Easing.linear,
          useNativeDriver: true,
        })
      ),
      Animated.loop(
        Animated.sequence([
          Animated.timing(scaleValue, {
            toValue: 1.2,
            duration: animationSpeed / 2,
            useNativeDriver: true,
          }),
          Animated.timing(scaleValue, {
            toValue: 1,
            duration: animationSpeed / 2,
            useNativeDriver: true,
          }),
        ])
      ),
    ]);

    transformAnimation.start();

    const colorInterval = setInterval(() => {
      setCurrentColorIndex((prev) => (prev + 1) % colors.length);
    }, animationSpeed / colors.length);

    return () => {
      transformAnimation.stop();
      clearInterval(colorInterval);
    };
  }, [animationSpeed]);

  const handlePress = () => {
    setAnimationSpeed(prev => Math.max(prev * 0.7, 500));
  };

  const spin = rotateValue.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  return (
    <View style={styles.container}>
      
      <ScrollView style={styles.content}>
        <Text style={styles.heading}>Membership</Text>
        {/* Membership Card */}
        <View style={styles.cardContainer}>
          <TouchableOpacity activeOpacity={0.8} onPress={handlePress}>
            <Animated.View 
              style={[
                styles.membershipCard,
                { 
                  backgroundColor: colors[currentColorIndex],
                  transform: [
                    { rotate: spin },
                    { scale: scaleValue }
                  ] 
                }
              ]}
            >
              <View style={styles.cardContent}>
                <Text style={styles.cardTitle}>VOICES RADIO</Text>
                <Text style={styles.memberName}>
                  {membershipData.firstName} {membershipData.lastName}
                </Text>
                <Text style={styles.membershipNumber}>
                  {membershipData.membershipNumber}
                </Text>
                <Text style={styles.tapText}>Tap card to activate</Text>
              </View>
            </Animated.View>
          </TouchableOpacity>
        </View>

        {/* Membership Benefits */}
        <View style={styles.sectionContainer}>
          <Text style={styles.sectionTitle}>Membership Benefits</Text>
          <Text style={styles.description}>
            As a Voices Radio member, you enjoy exclusive access to:
          </Text>
          
          <View style={styles.benefitItem}>
            <Ionicons name="musical-notes" size={24} color="#007AFF" style={styles.benefitIcon} />
            <Text style={styles.benefitText}>Exclusive monthly mixes</Text>
          </View>
          
          <View style={styles.benefitItem}>
            <Ionicons name="ticket" size={24} color="#007AFF" style={styles.benefitIcon} />
            <Text style={styles.benefitText}>Discounted event tickets</Text>
          </View>
          
          <View style={styles.benefitItem}>
            <Ionicons name="headset" size={24} color="#007AFF" style={styles.benefitIcon} />
            <Text style={styles.benefitText}>Behind-the-scenes content</Text>
          </View>
          
          <View style={styles.benefitItem}>
            <Ionicons name="people" size={24} color="#007AFF" style={styles.benefitIcon} />
            <Text style={styles.benefitText}>Community forum access</Text>
          </View>
        </View>
        
        {/* Upgrade Button */}
        <TouchableOpacity 
          style={styles.upgradeButton}
          onPress={() => {
            // Navigate or just show an alert for now
            alert('Upgrade options coming soon!');
          }}
        >
          <Text style={styles.buttonText}>Upgrade Membership</Text>
          <Ionicons name="arrow-forward" size={20} color="white" />
        </TouchableOpacity>
      </ScrollView>
      
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  content: {
    flex: 1,
    padding: 15,
  },
  heading: {
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 15,
  },
  cardContainer: {
    alignItems: 'center',
    marginBottom: 24,
    padding: 10,
  },
  membershipCard: {
    width: 300,
    height: 180,
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 4.65,
    elevation: 8,
  },
  cardContent: {
    flex: 1,
    justifyContent: 'space-between',
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: 'rgba(255, 255, 255, 0.8)',
    marginBottom: 10,
  },
  memberName: {
    fontSize: 22,
    fontWeight: 'bold',
    color: 'white',
    marginBottom: 5,
  },
  membershipNumber: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.8)',
  },
  tapText: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.6)',
    fontStyle: 'italic',
    marginTop: 10,
    textAlign: 'center',
  },
  sectionContainer: {
    backgroundColor: 'white',
    borderRadius: 8,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 3,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 8,
    color: '#333',
  },
  description: {
    fontSize: 16,
    color: '#666',
    lineHeight: 24,
    marginBottom: 16,
  },
  benefitItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  benefitIcon: {
    marginRight: 12,
  },
  benefitText: {
    fontSize: 16,
    color: '#333',
  },
  upgradeButton: {
    backgroundColor: '#007AFF',
    borderRadius: 8,
    paddingVertical: 14,
    paddingHorizontal: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
});

export default MembershipScreen; 