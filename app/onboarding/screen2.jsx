import React from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  Image, 
  TouchableOpacity, 
  SafeAreaView, 
  Dimensions 
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { BRAND_COLORS } from '../styles/brandColors';

const { width, height } = Dimensions.get('window');

export default function OnboardingScreen2() {
  const router = useRouter();
  
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <View style={styles.logoContainer}>
          <Image
            source={require('../../assets/logo.png')}
            style={styles.logo}
            resizeMode="contain"
          />
        </View>
        
        <View style={styles.imageContainer}>
          <Ionicons name="chatbubbles-outline" size={120} color={BRAND_COLORS.accent} />
        </View>
        
        <View style={styles.textContainer}>
          <Text style={styles.title}>Chat with the Community</Text>
          <Text style={styles.description}>
            Join the conversation with other listeners and interact with your favorite presenters in real-time.
          </Text>
        </View>
        
        <View style={styles.paginationContainer}>
          <View style={styles.paginationDot} />
          <View style={[styles.paginationDot, styles.activeDot]} />
          <View style={styles.paginationDot} />
        </View>
      </View>
      
      <View style={styles.buttonContainer}>
        <TouchableOpacity 
          style={styles.skipButton} 
          onPress={() => router.replace('/login')}
        >
          <Text style={styles.skipButtonText}>Skip</Text>
        </TouchableOpacity>
        
        <View style={styles.navigationButtons}>
          <TouchableOpacity 
            style={styles.backButton} 
            onPress={() => router.back()}
          >
            <Ionicons name="arrow-back" size={20} color={BRAND_COLORS.secondaryText} />
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.nextButton} 
            onPress={() => router.push('./screen3')}
          >
            <Text style={styles.nextButtonText}>Next</Text>
            <Ionicons name="arrow-forward" size={20} color="white" />
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: BRAND_COLORS.background,
  },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: 40,
  },
  logo: {
    width: 150,
    height: 80,
  },
  imageContainer: {
    marginBottom: 40,
    alignItems: 'center',
    justifyContent: 'center',
    width: 200,
    height: 200,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 100,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: BRAND_COLORS.primaryText,
    marginBottom: 16,
    textAlign: 'center',
  },
  description: {
    fontSize: 16,
    color: BRAND_COLORS.secondaryText,
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 40,
  },
  paginationContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  paginationDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginHorizontal: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
  },
  activeDot: {
    backgroundColor: BRAND_COLORS.accent,
    width: 20,
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingBottom: 40,
  },
  skipButton: {
    padding: 12,
  },
  skipButtonText: {
    color: BRAND_COLORS.secondaryText,
    fontSize: 16,
  },
  nextButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: BRAND_COLORS.accent,
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 24,
  },
  nextButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
    marginRight: 8,
  },
  navigationButtons: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  backButton: {
    padding: 12,
    marginRight: 8,
  },
});