import { useState, useEffect } from 'react';
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
import { useRouter, Link } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from './context/auth';
import axios from 'axios';
import { BRAND_COLORS } from './styles/brandColors';
import { Dimensions } from 'react-native';
import { 
  authenticateWithBiometrics, 
  getBiometricAuthEnabled 
} from './utils/biometricAuth';
import * as SecureStore from 'expo-secure-store';
const { width, height } = Dimensions.get('window');

const API_URL = `${process.env.EXPO_PUBLIC_BACKEND_URL}/api/auth`; 


export default function LoginScreen() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [resendEmail, setResendEmail] = useState('');
  const router = useRouter();
  const { login } = useAuth();
  const [biometricAvailable, setBiometricAvailable] = useState(false);
  const [biometricType, setBiometricType] = useState('');

  useEffect(() => {
    const checkBiometricAuth = async () => {
      const enabled = await getBiometricAuthEnabled();
      
      if (enabled) {
        const savedEmail = await SecureStore.getItemAsync('userEmail');
        const hasSavedCredentials = !!savedEmail;
        
        setBiometricAvailable(hasSavedCredentials);
        
        if (hasSavedCredentials) {
          handleBiometricLogin();
        }
      }
    };
    
    checkBiometricAuth();
  }, []);

  const handleBiometricLogin = async () => {
    try {
      setIsLoading(true);
      
      const authResult = await authenticateWithBiometrics();
      
      if (authResult.success) {
        const savedEmail = await SecureStore.getItemAsync('userEmail');
        const savedPassword = await SecureStore.getItemAsync('userPassword');
        
        if (savedEmail && savedPassword) {
          setUsername(savedEmail);
          setPassword(savedPassword);
          
          await handleLogin();
        } else {
          Alert.alert('Error', 'No saved credentials found. Please login with email and password.');
        }
      } else {
        if (authResult.error) {
          console.log('Biometric auth failed:', authResult.error);
        }
      }
    } catch (error) {
      console.error('Error with biometric login:', error);
      Alert.alert('Error', 'Failed to authenticate. Please try again or use email and password.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogin = async () => {
    if (!username || !password) {
      Alert.alert('Error', 'Please enter both email and password');
      return;
    }

    setIsLoading(true);

    try {
      const response = await axios.post(`${API_URL}/login`, {
        email: username,
        password
      });

      const { token, user } = response.data;
      
      await login({ email: username, password });
      
      // On successful login, save credentials if biometric auth is enabled
      const biometricEnabled = await getBiometricAuthEnabled();
      if (biometricEnabled) {
        await SecureStore.setItemAsync('userEmail', username);
        await SecureStore.setItemAsync('userPassword', password);
      }
      
      router.replace('/(tabs)');
    } catch (error) {
      let errorMessage = 'Invalid credentials';
      
      if (error.response) {
        if (error.response.status === 401) {
          if (error.response.data.notVerified) {
            Alert.alert(
              'Email Not Verified',
              'Please verify your email to log in. Check your inbox for the verification link.',
              [
                {
                  text: 'Resend Link',
                  onPress: () => {
                    router.push({
                      pathname: '/resend-verification',
                      params: { email: username }
                    });
                  }
                },
                { text: 'OK' }
              ]
            );
            return;
          }
        }
        
        if (error.response.data && error.response.data.message) {
          errorMessage = error.response.data.message;
        }
      } else if (error.request) {
        errorMessage = 'Unable to connect to server';
      }

      console.error('Login error:', error);
      Alert.alert('Login Failed', errorMessage);
      setPassword('');
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
        <View style={styles.logoContainer}>
          <Image
            source={require('../assets/logo.png')}
            style={styles.logo}
            resizeMode="contain"
          />
        </View>

        <View style={styles.inputContainer} accessibilityLabel="Login Form" accessibilityRole="form">
          <View style={styles.inputWrapper}>
            <TextInput
              style={[styles.input, username.length === 0 && styles.placeholder]}
              value={username}
              onChangeText={setUsername}
              autoCapitalize="none"
              placeholder="Email"
              placeholderTextColor="#999"
              keyboardType="email-address"
              autoComplete="email"
              textContentType="username"
            />
          </View>

          <View style={styles.passwordContainer}>
            <TextInput
              style={[
                styles.passwordInput, 
                password.length === 0 && styles.placeholder
              ]}
              value={password}
              onChangeText={setPassword}
              secureTextEntry={!showPassword}
              placeholder="Password"
              placeholderTextColor="#999"
              autoComplete="password"
              textContentType="password"
              passwordRules="minlength: 8;"
            />
            <TouchableOpacity 
              onPress={() => setShowPassword(!showPassword)}
              style={styles.eyeIcon}
            >
              <Ionicons 
                name={showPassword ? "eye-off" : "eye"} 
                size={24} 
                color="gray"
              />
            </TouchableOpacity>
          </View>

          <TouchableOpacity 
            style={[styles.button, isLoading && styles.buttonDisabled]}
            onPress={handleLogin}
            disabled={isLoading}
            accessibilityLabel="Login Button"
            accessibilityRole="button"
            accessibilityHint="Logs you in with the provided credentials"
          >
            <Text style={styles.buttonText}>
              {isLoading ? 'Logging in...' : 'Login'}
            </Text>
          </TouchableOpacity>
          
          <View style={styles.actionsContainer}>
            <TouchableOpacity 
              onPress={() => router.push('/register')}
              style={styles.secondaryButton}
            >
              <Text style={styles.secondaryButtonText}>Create Account</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              onPress={() => router.push('/forgot-password')}
              style={styles.secondaryButton}
            >
              <Text style={styles.secondaryButtonText}>Forgot Password?</Text>
            </TouchableOpacity>
          </View>
          
          <TouchableOpacity 
            onPress={() => router.push('/change-email')}
            style={styles.changeEmailButton}
          >
            <Text style={styles.changeEmailText}>Need to change your email?</Text>
          </TouchableOpacity>

          {biometricAvailable && (
            <TouchableOpacity 
              style={styles.biometricButton}
              onPress={handleBiometricLogin}
            >
              <Ionicons 
                name={biometricType === 'Face ID' ? 'face-recognition' : 'finger-print'} 
                size={24} 
                color={BRAND_COLORS.accent} 
              />
              <Text style={styles.biometricButtonText}>
                Login with {biometricType}
              </Text>
            </TouchableOpacity>
          )}
        </View>
      </KeyboardAvoidingView>
    </TouchableWithoutFeedback>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    padding: 20,
    backgroundColor: BRAND_COLORS.background,
    width: width,
    height: height
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: 60,
    paddingTop: Platform.OS === 'ios' ? 50 : 30,
  },
  logo: {
    width: 300,
    height: 200,
    backgroundColor: BRAND_COLORS.background, 
  },
  inputContainer: {
    width: '100%',
    maxWidth: 400,
    alignSelf: 'center',
  },
  inputWrapper: {
    marginBottom: 12,
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
  placeholder: {
    fontStyle: 'italic',
  },
  passwordContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    marginBottom: 20,
    backgroundColor: '#fff',
  },
  passwordInput: {
    flex: 1,
    height: 50,
    paddingHorizontal: 15,
    fontSize: 16,
    color: BRAND_COLORS.black,
  },
  eyeIcon: {
    padding: 10,
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
  actionsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 20,
  },
  secondaryButton: {
    backgroundColor: 'rgba(211, 78, 36, 0.1)',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: BRAND_COLORS.accent,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: '45%',
  },
  secondaryButtonText: {
    color: BRAND_COLORS.accent,
    fontSize: 14,
    fontWeight: '500',
  },
  changeEmailButton: {
    alignItems: 'center',
    marginTop: 20,
    paddingVertical: 10,
  },
  changeEmailText: {
    color: BRAND_COLORS.accent,
    fontSize: 14,
    fontWeight: '500',
  },
  biometricButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 16,
    paddingVertical: 12,
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: BRAND_COLORS.accent,
    borderRadius: 8,
  },
  biometricButtonText: {
    color: BRAND_COLORS.accent,
    marginLeft: 8,
    fontSize: 16,
    fontWeight: '500',
  },
}); 