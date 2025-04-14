import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
  Image,
  SafeAreaView
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import axios from 'axios';

const API_URL = `${process.env.EXPO_PUBLIC_BACKEND_URL}/api/auth`;

const BRAND_COLORS = {
  beige: '#e5d7be',
  black: '#131200',
  redOrange: '#d34e24'
};

export default function VerifyEmailScreen() {
  const { token } = useLocalSearchParams();
  const router = useRouter();
  const [verifying, setVerifying] = useState(true);
  const [verified, setVerified] = useState(false);
  const [error, setError] = useState(null);
  
  useEffect(() => {
    if (token) {
      verifyEmail();
    } else {
      setVerifying(false);
      setError('No verification token provided');
    }
  }, [token]);
  
  const verifyEmail = async () => {
    try {
      setVerifying(true);
      const response = await axios.get(`${API_URL}/verify-email/${token}`);
      setVerified(true);
    } catch (error) {
      console.error('Verification error:', error);
      if (error.response && error.response.data) {
        setError(error.response.data.message || 'Verification failed');
      } else {
        setError('Could not verify email. Please try again.');
      }
    } finally {
      setVerifying(false);
    }
  };
  
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <Image
          source={require('../assets/logo.png')}
          style={styles.logo}
          resizeMode="contain"
        />
        
        {verifying ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={BRAND_COLORS.redOrange} />
            <Text style={styles.loadingText}>Verifying your email...</Text>
          </View>
        ) : verified ? (
          <View style={styles.successContainer}>
            <Ionicons name="checkmark-circle" size={80} color={BRAND_COLORS.redOrange} />
            <Text style={styles.title}>Email Verified!</Text>
            <Text style={styles.message}>
              Your email has been successfully verified. You can now log in to your account.
            </Text>
            <TouchableOpacity
              style={styles.button}
              onPress={() => router.push('/login')}
            >
              <Text style={styles.buttonText}>Go to Login</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.errorContainer}>
            <Ionicons name="close-circle" size={80} color={BRAND_COLORS.redOrange} />
            <Text style={styles.title}>Verification Failed</Text>
            <Text style={styles.errorMessage}>{error}</Text>
            <Text style={styles.message}>
              The link may have expired or is invalid. Try requesting a new verification link.
            </Text>
            <TouchableOpacity
              style={styles.button}
              onPress={() => router.push('/resend-verification')}
            >
              <Text style={styles.buttonText}>Resend Verification</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: BRAND_COLORS.beige,
  },
  content: {
    flex: 1,
    padding: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logo: {
    width: 150,
    height: 100,
    marginBottom: 40,
  },
  loadingContainer: {
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: BRAND_COLORS.black,
  },
  successContainer: {
    alignItems: 'center',
  },
  errorContainer: {
    alignItems: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: BRAND_COLORS.black,
    marginTop: 24,
    marginBottom: 16,
  },
  message: {
    fontSize: 16,
    color: BRAND_COLORS.black,
    textAlign: 'center',
    marginBottom: 32,
  },
  errorMessage: {
    fontSize: 16,
    color: BRAND_COLORS.redOrange,
    textAlign: 'center',
    marginBottom: 16,
  },
  button: {
    backgroundColor: BRAND_COLORS.redOrange,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  buttonText: {
    color: BRAND_COLORS.beige,
    fontSize: 16,
    fontWeight: '600',
  },
}); 