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
import { useRouter, Link } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from './context/auth';
import axios from 'axios';

const API_URL = `${process.env.EXPO_PUBLIC_BACKEND_URL}/api/auth`; 

const BRAND_COLORS = {
  beige: '#e5d7be',
  black: '#131200',
  redOrange: '#d34e24'
};

export default function LoginScreen() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [resendEmail, setResendEmail] = useState('');
  const router = useRouter();
  const { login } = useAuth();

  const handleLogin = async () => {
    if (!username || !password) {
      Alert.alert('Error', 'Please enter both email and password');
      return;
    }

    setIsLoading(true);

    try {
      const response = await axios.post(`${API_URL}/login`, {
        username,
        email: username,
        password
      });

      const { token, user } = response.data;
      
      await login(user, token);
      
      router.replace('/(tabs)');
    } catch (error) {
      let errorMessage = 'An error occurred during login';
      
      if (error.response) {
        if (error.response.status === 401) {
          if (error.response.data.needsVerification) {
            Alert.alert(
              'Email Not Verified',
              'Please verify your email address to log in.',
              [
                {
                  text: 'Cancel',
                  style: 'cancel'
                },
                {
                  text: 'Resend Verification',
                  onPress: () => {
                    setResendEmail(username);
                    router.push('/resend-verification');
                  }
                }
              ]
            );
            return;
          } else {
            errorMessage = 'Invalid email or password';
          }
        } else if (error.response.data && error.response.data.message) {
          errorMessage = error.response.data.message;
        }
      } else if (error.request) {
        errorMessage = 'Unable to connect to server';
      }

      console.error('Login error:', error);
      Alert.alert('Error', errorMessage);
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

        <View style={styles.inputContainer}>
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
    backgroundColor: BRAND_COLORS.beige
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: 60,
    paddingTop: Platform.OS === 'ios' ? 50 : 30,
  },
  logo: {
    width: 300,
    height: 200,
    backgroundColor: BRAND_COLORS.beige, 
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
    backgroundColor: BRAND_COLORS.redOrange,
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
    height: 50,
    justifyContent: 'center',
  },
  buttonText: {
    color: BRAND_COLORS.beige,
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
    borderColor: BRAND_COLORS.redOrange,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: '45%',
  },
  secondaryButtonText: {
    color: BRAND_COLORS.redOrange,
    fontSize: 14,
    fontWeight: '500',
  },
}); 