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
  Alert,
  ScrollView
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import axios from 'axios';
import { BRAND_COLORS } from './styles/brandColors'; 
import { Dimensions } from 'react-native';
const { width, height } = Dimensions.get('window');

const API_URL = `${process.env.EXPO_PUBLIC_BACKEND_URL}/api/auth`;
console.log(API_URL);


export default function RegisterScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [city, setCity] = useState('');
  const [country, setCountry] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  const validateEmail = (email) => {
    const re = /^(([^<>()[\]\\.,;:\s@"]+(\.[^<>()[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
    return re.test(String(email).toLowerCase());
  };

  const validatePassword = (password) => {
    return password.length >= 6; // minimum 6 characters
  };

  const handleRegister = async () => {
    // Validate inputs
    if (!email || !password || !confirmPassword || !firstName || !lastName) {
      Alert.alert('Error', 'Please fill in all required fields');
      return;
    }

    if (!validateEmail(email)) {
      Alert.alert('Error', 'Please enter a valid email address');
      return;
    }

    if (!validatePassword(password)) {
      Alert.alert('Error', 'Password must be at least 6 characters long');
      return;
    }

    if (password !== confirmPassword) {
      Alert.alert('Error', 'Passwords do not match');
      return;
    }

    setIsLoading(true);

    try {
      // Call registration endpoint with updated user data
      const response = await axios.post(`${API_URL}/register`, {
        email,
        password,
        firstName,
        lastName,
        location: {
          city: city || '',
          country: country || '',
        },
        emailPreferences: {
          newsletters: true,
          eventUpdates: true,
          artistAlerts: true,
          marketingEmails: false
        },
        notificationPreferences: {
          newShows: true,
          artistUpdates: true,
          appUpdates: true
        }
      });

      // Clear the input fields before showing alert
      setEmail('');
      setPassword('');
      setConfirmPassword('');
      setFirstName('');
      setLastName('');
      setCity('');
      setCountry('');

      Alert.alert(
        'Account Created',
        'Check your email for a verification link to activate your account.',
        [
          { 
            text: 'OK', 
            onPress: () => router.push('/login')
          }
        ]
      );
    } catch (error) {
      let errorMessage = 'Registration failed';
      
      if (error.response) {
        if (error.response.status === 409) {
          errorMessage = 'This email is already registered';
        } else if (error.response.data && error.response.data.message) {
          errorMessage = error.response.data.message;
        }
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
        <ScrollView contentContainerStyle={styles.scrollContent}>
          <View style={styles.logoContainer}>
            <Image
              source={require('../assets/logo.png')}
              style={styles.logo}
              resizeMode="contain"
            />
          </View>

          <View style={styles.formContainer}>
            <Text style={styles.title}>Create Account</Text>
            
            {/* Personal Information */}
            <Text style={styles.sectionTitle}>Personal Information</Text>
            
            <View style={styles.row}>
              <View style={[styles.inputWrapper, styles.halfWidth]}>
                <Text style={styles.label}>First Name *</Text>
                <TextInput
                  style={styles.input}
                  value={firstName}
                  onChangeText={setFirstName}
                  placeholder="First Name"
                  placeholderTextColor="#999"
                  autoCapitalize="words"
                />
              </View>

              <View style={[styles.inputWrapper, styles.halfWidth]}>
                <Text style={styles.label}>Last Name *</Text>
                <TextInput
                  style={styles.input}
                  value={lastName}
                  onChangeText={setLastName}
                  placeholder="Last Name"
                  placeholderTextColor="#999"
                  autoCapitalize="words"
                />
              </View>
            </View>

            <View style={styles.inputWrapper}>
              <Text style={styles.label}>Email *</Text>
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

            {/* Location Information */}
            <Text style={styles.sectionTitle}>Location (Optional)</Text>
            
            <View style={styles.row}>
              <View style={[styles.inputWrapper, styles.halfWidth]}>
                <Text style={styles.label}>City</Text>
                <TextInput
                  style={styles.input}
                  value={city}
                  onChangeText={setCity}
                  placeholder="City"
                  placeholderTextColor="#999"
                />
              </View>

              <View style={[styles.inputWrapper, styles.halfWidth]}>
                <Text style={styles.label}>Country</Text>
                <TextInput
                  style={styles.input}
                  value={country}
                  onChangeText={setCountry}
                  placeholder="Country"
                  placeholderTextColor="#999"
                />
              </View>
            </View>

            {/* Password Section */}
            <Text style={styles.sectionTitle}>Set Password</Text>
            
            <View style={styles.inputWrapper}>
              <Text style={styles.label}>Password *</Text>
              <View style={styles.passwordContainer}>
                <TextInput
                  style={styles.passwordInput}
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry={!showPassword}
                  placeholder="Create a password"
                  placeholderTextColor="#999"
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
            </View>

            <View style={styles.inputWrapper}>
              <Text style={styles.label}>Confirm Password *</Text>
              <View style={styles.passwordContainer}>
                <TextInput
                  style={styles.passwordInput}
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                  secureTextEntry={!showConfirmPassword}
                  placeholder="Confirm your password"
                  placeholderTextColor="#999"
                />
                <TouchableOpacity 
                  onPress={() => setShowConfirmPassword(!showConfirmPassword)}
                  style={styles.eyeIcon}
                >
                  <Ionicons 
                    name={showConfirmPassword ? "eye-off" : "eye"} 
                    size={24} 
                    color="gray"
                  />
                </TouchableOpacity>
              </View>
              <Text style={styles.helperText}>Password must be at least 6 characters</Text>
            </View>

            <View style={styles.termsContainer}>
              <Text style={styles.termsText}>
                By creating an account, you agree to receive newsletter and artist updates.
                You can customize your preferences in settings after registration.
              </Text>
            </View>

            <TouchableOpacity 
              style={[styles.button, isLoading && styles.buttonDisabled]}
              onPress={handleRegister}
              disabled={isLoading}
            >
              <Text style={styles.buttonText}>
                {isLoading ? 'Creating Account...' : 'Create Account'}
              </Text>
            </TouchableOpacity>
            
            <View style={styles.loginLinkContainer}>
              <Text style={styles.loginText}>Already have an account? </Text>
              <TouchableOpacity onPress={() => router.replace('/login')}>
                <Text style={styles.loginLink}>Log In</Text>
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
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
  scrollContent: {
    flexGrow: 1,
    paddingVertical: 30,
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: 20,
    paddingTop: Platform.OS === 'ios' ? 30 : 10,
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
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 24,
    textAlign: 'center',
    color: BRAND_COLORS.accent,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginTop: 15,
    marginBottom: 10,
    color: BRAND_COLORS.black,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  halfWidth: {
    width: '48%',
  },
  inputWrapper: {
    marginBottom: 16,
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
  passwordContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
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
  helperText: {
    fontSize: 12,
    color: 'gray',
    marginTop: 4,
  },
  termsContainer: {
    marginBottom: 20,
  },
  termsText: {
    fontSize: 14,
    color: BRAND_COLORS.black,
    lineHeight: 20,
  },
  button: {
    backgroundColor: BRAND_COLORS.accent,
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
    height: 50,
    justifyContent: 'center',
    marginTop: 10,
  },
  buttonText: {
    color: BRAND_COLORS.background,
    fontSize: 16,
    fontWeight: '600',
  },
  buttonDisabled: {
    backgroundColor: 'rgba(211, 78, 36, 0.5)',
  },
  loginLinkContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 20,
  },
  loginText: {
    color: BRAND_COLORS.black,
  },
  loginLink: {
    color: BRAND_COLORS.accent,
    fontWeight: '500',
  },
}); 