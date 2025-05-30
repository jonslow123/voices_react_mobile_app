import { useState } from 'react';
import { 
  View, 
  TextInput, 
  StyleSheet, 
  TouchableOpacity, 
  Text,
  TouchableWithoutFeedback,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  Image,
  Alert
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import axios from 'axios';
import { BRAND_COLORS } from './styles/brandColors';
import { Dimensions } from 'react-native';
const { width, height } = Dimensions.get('window');

const API_URL = `${process.env.EXPO_PUBLIC_BACKEND_URL}/api/auth`;


export default function ForgotPasswordScreen() {
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [resetSent, setResetSent] = useState(false);
  const router = useRouter();

  const handleResetPassword = async () => {
    if (!email) {
      Alert.alert('Error', 'Please enter your email address');
      return;
    }

    setIsLoading(true);

    try {
      const response = await axios.post(`${API_URL}/forgot-password`, { email });
      
      // The backend will always return success even if email doesn't exist (for security)
      setResetSent(true);
      
    } catch (error) {
      let errorMessage = 'Failed to send password reset email';
      
      if (error.response && error.response.data && error.response.data.message) {
        errorMessage = error.response.data.message;
      } else if (error.request) {
        errorMessage = 'Unable to connect to server';
      }

      Alert.alert('Error', errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.container}
      >
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <Ionicons name="arrow-back" size={28} color={BRAND_COLORS.accent} />
        </TouchableOpacity>

        <View style={styles.logoContainer}>
          <Image
            source={require('../assets/logo.png')}
            style={styles.logo}
            resizeMode="contain"
          />
        </View>

        <View style={styles.formContainer}>
          <Text style={styles.title}>Reset Your Password</Text>
          
          {!resetSent ? (
            <>
              <Text style={styles.subtitle}>
                Enter your email address and we'll send you instructions to reset your password.
              </Text>
              
              <View style={styles.inputWrapper}>
                <Text style={styles.label}>Email</Text>
                <TextInput
                  style={styles.input}
                  value={email}
                  onChangeText={setEmail}
                  autoCapitalize="none"
                  placeholder="your.email@example.com"
                  placeholderTextColor="#999"
                  keyboardType="email-address"
                  autoComplete="email"
                />
              </View>

              <TouchableOpacity 
                style={[styles.button, isLoading && styles.buttonDisabled]}
                onPress={handleResetPassword}
                disabled={isLoading}
              >
                <Text style={styles.buttonText}>
                  {isLoading ? 'Sending...' : 'Send Reset Link'}
                </Text>
              </TouchableOpacity>
            </>
          ) : (
            <View style={styles.successContainer}>
              <Ionicons 
                name="checkmark-circle" 
                size={64} 
                color={BRAND_COLORS.accent} 
                style={styles.successIcon}
              />
              <Text style={styles.successTitle}>Email Sent</Text>
              <Text style={styles.successText}>
                We've sent password reset instructions to {email}.
                Please check your inbox.
              </Text>
              <TouchableOpacity 
                style={styles.button}
                onPress={() => router.replace('/login')}
              >
                <Text style={styles.buttonText}>Return to Login</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </KeyboardAvoidingView>
    </TouchableWithoutFeedback>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: BRAND_COLORS.background,
    width: width,
    height: height
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: 20,
    marginTop: 80,
    paddingTop: 0,
  },
  logo: {
    width: 200,
    height: 120,
    backgroundColor: BRAND_COLORS.background,
  },
  formContainer: {
    width: '85%',
    maxWidth: 400,
    alignSelf: 'center',
    padding: 20,
  },
  backButton: {
    position: 'absolute',
    top: 80, // Match the logoContainer marginTop
    left: 20,
    zIndex: 10,
    height: 40,
    width: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 16,
    color: BRAND_COLORS.accent,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    marginBottom: 24,
    color: BRAND_COLORS.primaryText,
    lineHeight: 22,
  },
  inputWrapper: {
    marginBottom: 20,
  },
  label: {
    fontSize: 16,
    marginBottom: 8,
    color: BRAND_COLORS.primaryText,
    fontWeight: '500',
  },
  input: {
    height: 50,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    paddingHorizontal: 15,
    fontSize: 16,
    backgroundColor: '#fff',
    color: BRAND_COLORS.black,
  },
  button: {
    backgroundColor: BRAND_COLORS.accent,
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
    height: 50,
    justifyContent: 'center',
  },
  buttonText: {
    color: BRAND_COLORS.background,
    fontSize: 16,
    fontWeight: '600',
  },
  buttonDisabled: {
    backgroundColor: 'rgba(211, 78, 36, 0.5)',
  },
  successContainer: {
    alignItems: 'center',
    paddingVertical: 20,
  },
  successIcon: {
    marginBottom: 16,
  },
  successTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 12,
    color: BRAND_COLORS.primaryText,
  },
  successText: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 24,
    color: BRAND_COLORS.primaryText,
    lineHeight: 22,
  },
}); 