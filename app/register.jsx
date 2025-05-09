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
  Alert,
  ScrollView,
  Modal
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import axios from 'axios';
import { BRAND_COLORS } from './styles/brandColors'; 
import { Dimensions } from 'react-native';
import * as WebBrowser from 'expo-web-browser';
import * as AuthSession from 'expo-auth-session';
import * as AppleAuthentication from 'expo-apple-authentication';
import Constants from 'expo-constants';
import { GoogleSignin, statusCodes } from '@react-native-google-signin/google-signin';
import auth from '@react-native-firebase/auth';
import { 
  isBiometricAvailable, 
  setBiometricAuthEnabled 
} from './utils/biometricAuth';
import * as SecureStore from 'expo-secure-store';
const { width, height } = Dimensions.get('window');


const API_URL = `${process.env.EXPO_PUBLIC_BACKEND_URL}/api/auth`;
console.log(API_URL);

// List of common countries - this can be expanded
const COUNTRIES = [
  'Australia', 'Brazil', 'Canada', 'China', 'France', 'Germany', 
  'India', 'Italy', 'Japan', 'Mexico', 'Netherlands', 'New Zealand', 
  'Russia', 'South Africa', 'Spain', 'Sweden', 'Switzerland', 'United Kingdom', 
  'United States', 'Other'
];

// Add checkbox component - using a custom checkbox for simplicity
const CheckboxItem = ({ label, value, onToggle }) => {
  return (
    <TouchableOpacity 
      style={styles.checkboxContainer} 
      onPress={onToggle}
    >
      <View style={[
        styles.checkbox, 
        value && { backgroundColor: BRAND_COLORS.accent, borderColor: BRAND_COLORS.accent }
      ]}>
        {value && <Ionicons name="checkmark" size={16} color="#fff" />}
      </View>
      <Text style={styles.checkboxLabel}>{label}</Text>
    </TouchableOpacity>
  );
};

// Function to determine if app is running in Expo Go
const isExpoGo = Constants.appOwnership === 'expo';

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
  
  // Dropdown states
  const [showCountryModal, setShowCountryModal] = useState(false);
  const [showCityModal, setShowCityModal] = useState(false);
  const [filteredCities, setFilteredCities] = useState([]);
  const [citySearch, setCitySearch] = useState('');
  
  const router = useRouter();

  // In your component, add state for notification preferences
  const [notificationPrefs, setNotificationPrefs] = useState({
    artistAlerts: true,
    eventAlerts: true,
    newsletters: true
  });

  // Toggle function
  const toggleNotificationPref = (key) => {
    setNotificationPrefs(prev => ({
      ...prev,
      [key]: !prev[key]
    }));
  };

  // Get cities based on selected country
  useEffect(() => {
    if (country) {
      fetchCitiesForCountry(country);
    }
  }, [country]);

  // Fetch cities for selected country (simplified for demo)
  const fetchCitiesForCountry = async (selectedCountry) => {
    // For demo, this is a simplified approach
    // In production, you might call an API for this
    if (selectedCountry === 'United Kingdom') {
      setFilteredCities(['London', 'Manchester', 'Birmingham', 'Glasgow', 'Liverpool', 'Edinburgh', 'Bristol', 'Leeds', 'Sheffield', 'Cardiff']);
    } else if (selectedCountry === 'United States') {
      setFilteredCities(['New York', 'Los Angeles', 'Chicago', 'Houston', 'Phoenix', 'Philadelphia', 'San Antonio', 'San Diego', 'Dallas', 'San Jose']);
    } else {
      // For other countries, reset city
      setFilteredCities([]);
      setCity('');
    }
  };

  // Filter cities based on search
  useEffect(() => {
    if (citySearch && filteredCities.length > 0) {
      const lowerCaseSearch = citySearch.toLowerCase();
      const filtered = filteredCities.filter(city => 
        city.toLowerCase().includes(lowerCaseSearch)
      );
      setFilteredCities(filtered);
    } else if (country) {
      fetchCitiesForCountry(country);
    }
  }, [citySearch]);

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
        newsletters: notificationPrefs.newsletters,
        notificationPreferences: {
          artistAlerts: notificationPrefs.artistAlerts,
          eventAlerts: notificationPrefs.eventAlerts
        }
      });

      // Check if biometric authentication is available
      const biometricStatus = await isBiometricAvailable();
      
      // Clear the input fields
      const savedEmail = email;
      const savedPassword = password;
      
      setEmail('');
      setPassword('');
      setConfirmPassword('');
      setFirstName('');
      setLastName('');
      setCity('');
      setCountry('');
      
      if (biometricStatus.available) {
        // Ask if they want to enable biometric login
        Alert.alert(
          `Enable ${biometricStatus.biometryType} Login`,
          `Would you like to use ${biometricStatus.biometryType} for faster login next time?`,
          [
            {
              text: 'Not Now',
              style: 'cancel',
              onPress: () => {
                // Store preference to not ask again
                setBiometricAuthEnabled(false);
                
                // Show verification email alert and navigate to login
                Alert.alert(
                  'Account Created',
                  'Check your email for a verification link to activate your account.',
                  [{ text: 'OK', onPress: () => router.push('/login') }]
                );
              }
            },
            {
              text: 'Enable',
              onPress: async () => {
                // Save credentials securely
                await SecureStore.setItemAsync('userEmail', savedEmail);
                await SecureStore.setItemAsync('userPassword', savedPassword);
                await setBiometricAuthEnabled(true);
                
                // Show verification email alert and navigate to login
                Alert.alert(
                  'Account Created',
                  'Check your email for a verification link to activate your account.',
                  [{ text: 'OK', onPress: () => router.push('/login') }]
                );
              }
            }
          ]
        );
      } else {
        // No biometrics available, just show the regular alert
        Alert.alert(
          'Account Created',
          'Check your email for a verification link to activate your account.',
          [{ text: 'OK', onPress: () => router.push('/login') }]
        );
      }
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

  // Render country dropdown modal
  const renderCountryModal = () => (
    <Modal
      visible={showCountryModal}
      transparent={true}
      animationType="slide"
      onRequestClose={() => setShowCountryModal(false)}
    >
      <TouchableWithoutFeedback onPress={() => setShowCountryModal(false)}>
        <View style={styles.modalOverlay}>
          <TouchableWithoutFeedback onPress={e => e.stopPropagation()}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Country</Text>
                <TouchableOpacity onPress={() => setShowCountryModal(false)}>
                  <Ionicons name="close" size={24} color="black" />
                </TouchableOpacity>
              </View>
              
              <ScrollView style={styles.modalScrollView}>
                {COUNTRIES.map((item, index) => (
                  <TouchableOpacity
                    key={index}
                    style={styles.modalItem}
                    onPress={() => {
                      setCountry(item);
                      setShowCountryModal(false);
                      // Reset city if country changes
                      if (item !== country) {
                        setCity('');
                      }
                    }}
                  >
                    <Text style={[
                      styles.modalItemText,
                      item === country && styles.selectedItemText
                    ]}>
                      {item}
                    </Text>
                    {item === country && (
                      <Ionicons name="checkmark" size={20} color={BRAND_COLORS.accent} />
                    )}
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );

  // Render city dropdown modal
  const renderCityModal = () => (
    <Modal
      visible={showCityModal}
      transparent={true}
      animationType="slide"
      onRequestClose={() => setShowCityModal(false)}
    >
      <TouchableWithoutFeedback onPress={() => setShowCityModal(false)}>
        <View style={styles.modalOverlay}>
          <TouchableWithoutFeedback onPress={e => e.stopPropagation()}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>City</Text>
                <TouchableOpacity onPress={() => setShowCityModal(false)}>
                  <Ionicons name="close" size={24} color="black" />
                </TouchableOpacity>
              </View>
              
              <View style={styles.searchContainer}>
                <Ionicons name="search" size={20} color="gray" style={styles.searchIcon} />
                <TextInput
                  style={styles.searchInput}
                  placeholder="Search cities..."
                  value={citySearch}
                  onChangeText={setCitySearch}
                  placeholderTextColor="#999"
                />
                {citySearch !== '' && (
                  <TouchableOpacity onPress={() => setCitySearch('')}>
                    <Ionicons name="close-circle" size={20} color="gray" />
                  </TouchableOpacity>
                )}
              </View>
              
              <ScrollView style={styles.modalScrollView}>
                {filteredCities.length > 0 ? (
                  filteredCities.map((item, index) => (
                    <TouchableOpacity
                      key={index}
                      style={styles.modalItem}
                      onPress={() => {
                        setCity(item);
                        setShowCityModal(false);
                      }}
                    >
                      <Text style={[
                        styles.modalItemText,
                        item === city && styles.selectedItemText
                      ]}>
                        {item}
                      </Text>
                      {item === city && (
                        <Ionicons name="checkmark" size={20} color={BRAND_COLORS.accent} />
                      )}
                    </TouchableOpacity>
                  ))
                ) : (
                  <View style={styles.noResultsContainer}>
                    <Text style={styles.noResultsText}>
                      {country ? 'No cities found' : 'Please select a country first'}
                    </Text>
                    {country && (
                      <TouchableOpacity
                        style={styles.addCustomButton}
                        onPress={() => {
                          if (citySearch) {
                            setCity(citySearch);
                            setShowCityModal(false);
                          }
                        }}
                      >
                        <Text style={styles.addCustomButtonText}>
                          {citySearch ? `Use "${citySearch}"` : 'Type a city name'}
                        </Text>
                      </TouchableOpacity>
                    )}
                  </View>
                )}
              </ScrollView>
            </View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );

  // Add states for social authentication
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [isAppleLoading, setIsAppleLoading] = useState(false);
  const [appleAuthAvailable, setAppleAuthAvailable] = useState(false);
  
  // Google Authentication configuration
  const discovery = {
    authorizationEndpoint: 'https://accounts.google.com/o/oauth2/v2/auth',
    tokenEndpoint: 'https://oauth2.googleapis.com/token',
    revocationEndpoint: 'https://oauth2.googleapis.com/revoke',
  };
  
  // Check if Apple Authentication is available on the device
  useEffect(() => {
    const checkAppleAuthAvailability = async () => {
      const isAvailable = await AppleAuthentication.isAvailableAsync();
      setAppleAuthAvailable(isAvailable);
    };
    
    checkAppleAuthAvailability();
  }, []);

  // Configure Google Auth Request
  const [request, response, promptAsync] = AuthSession.useAuthRequest(
    {
      clientId: Platform.OS === 'ios' 
        ? 'YOUR_IOS_CLIENT_ID.apps.googleusercontent.com'
        : 'YOUR_ANDROID_CLIENT_ID.apps.googleusercontent.com',
      scopes: ['profile', 'email'],
      redirectUri: isExpoGo 
        ? AuthSession.makeRedirectUri({useProxy: true}) 
        : AuthSession.makeRedirectUri({native: 'voicesradio://'}),
      usePKCE: true,
      responseType: "code"
    },
    discovery
  );

  // In useEffect or app initialization
  useEffect(() => {
    // Initialize Google Sign-In for native apps
    if (!isExpoGo) {
      GoogleSignin.configure({
        webClientId: process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID,
        offlineAccess: true,
        iosClientId: '10790134127-c30c7cna9g83h8e02u1lnl26epdtaknj.apps.googleusercontent.com',
      });
    }
  }, []);

  // Google Sign-In handler
  const handleGoogleSignIn = async () => {
    try {
      setIsGoogleLoading(true);
      
      await GoogleSignin.hasPlayServices();
      const userInfo = await GoogleSignin.signIn();
      
      // Set form fields from user info
      if (userInfo.user.email) setEmail(userInfo.user.email);
      if (userInfo.user.givenName) setFirstName(userInfo.user.givenName);
      if (userInfo.user.familyName) setLastName(userInfo.user.familyName);
      
      Alert.alert(
        "Google Sign-In Successful",
        "Please complete your registration with any additional information.",
        [{ text: "OK" }]
      );
    } catch (error) {
      console.error("Google sign in error:", error);
      Alert.alert("Error", "Failed to sign in with Google. Please try again.");
    } finally {
      setIsGoogleLoading(false);
    }
  };

  // Handle Apple Sign In
  const handleAppleSignIn = async () => {
    try {
      setIsAppleLoading(true);
      const credential = await AppleAuthentication.signInAsync({
        requestedScopes: [
          AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
          AppleAuthentication.AppleAuthenticationScope.EMAIL,
        ],
      });
      
      // Use the credential
      if (credential.email) setEmail(credential.email);
      if (credential.fullName) {
        if (credential.fullName.givenName) setFirstName(credential.fullName.givenName);
        if (credential.fullName.familyName) setLastName(credential.fullName.familyName);
      }
      
      // Show a confirmation to the user
      Alert.alert(
        "Apple Sign-In Successful",
        "Please review your information and complete the registration by adding any missing details.",
        [{ text: "OK" }]
      );
    } catch (error) {
      if (error.code !== 'ERR_CANCELED') {
        console.error("Apple sign in error:", error);
        Alert.alert("Error", "Failed to sign in with Apple. Please try again.");
      }
    } finally {
      setIsAppleLoading(false);
    }
  };

  return (
    <TouchableWithoutFeedback onPress={() => {
      // Only dismiss keyboard, don't interfere with other touch events
      Keyboard.dismiss();
    }} accessible={false}>
      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.container}
      >
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.push('/')}
        >
          <Ionicons name="arrow-back" size={28} color={BRAND_COLORS.accent} />
        </TouchableOpacity>

        <ScrollView 
          contentContainerStyle={{ 
            flexGrow: 1,
            paddingTop: 20
          }}
          keyboardShouldPersistTaps="handled"
          scrollEventThrottle={16}
          alwaysBounceVertical={true}
          showsVerticalScrollIndicator={true}
          directionalLockEnabled={true}
          scrollEnabled={true}
        >
          <TouchableWithoutFeedback>
            <View style={{ width: '100%' }}>
              <View style={styles.logoContainer}>
                <Image
                  source={require('../assets/logo.png')}
                  style={styles.logo}
                  resizeMode="contain"
                />
              </View>

              <View style={styles.formContainer}>
                <Text style={styles.title}>Create Account</Text>
                
                {/* Social Authentication Buttons */}
                <View style={styles.socialAuthContainer}>
                  <Text style={styles.socialAuthText}>Sign up with:</Text>
                  
                  <TouchableOpacity 
                    style={[styles.socialButton, styles.googleButton, isGoogleLoading && styles.buttonDisabled]}
                    onPress={handleGoogleSignIn}
                    disabled={isGoogleLoading}
                  >
                    <Ionicons name="logo-google" size={20} color="#fff" />
                    <Text style={styles.socialButtonText}>
                      {isGoogleLoading ? 'Connecting...' : 'Google'}
                    </Text>
                  </TouchableOpacity>
                  
                  {appleAuthAvailable && (
                    <TouchableOpacity 
                      style={[styles.socialButton, styles.appleButton, isAppleLoading && styles.buttonDisabled]}
                      onPress={handleAppleSignIn}
                      disabled={isAppleLoading}
                    >
                      <Ionicons name="logo-apple" size={20} color="#fff" />
                      <Text style={styles.socialButtonText}>
                        {isAppleLoading ? 'Connecting...' : 'Apple'}
                      </Text>
                    </TouchableOpacity>
                  )}
                </View>
                
                <View style={styles.orContainer}>
                  <View style={styles.divider} />
                  <Text style={styles.orText}>OR</Text>
                  <View style={styles.divider} />
                </View>
                
                {/* Personal Information */}
                <Text style={[styles.sectionTitle, styles.touchableText]}>Personal Information</Text>
                
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
                    placeholder="your.email@example.com"
                    placeholderTextColor="#999"
                    keyboardType="email-address"
                    autoComplete="email"
                    textContentType="username"
                  />
                </View>

                {/* Location Information */}
                <Text style={styles.sectionTitle}>Location</Text>
                
                <View style={styles.row}>
                  <View style={[styles.inputWrapper, styles.halfWidth]}>
                    <Text style={styles.label}>Country</Text>
                    <TouchableOpacity 
                      style={styles.dropdownButton}
                      onPress={() => setShowCountryModal(true)}
                    >
                      <Text style={country ? styles.dropdownSelectedText : styles.dropdownPlaceholder}>
                        {country || "Country"}
                      </Text>
                      <Ionicons name="chevron-down" size={20} color="gray" />
                    </TouchableOpacity>
                  </View>

                  <View style={[styles.inputWrapper, styles.halfWidth]}>
                    <Text style={styles.label}>City</Text>
                    <TouchableOpacity 
                      style={[
                        styles.dropdownButton,
                        !country && styles.dropdownDisabled
                      ]}
                      onPress={() => {
                        if (country) {
                          setShowCityModal(true);
                        } else {
                          Alert.alert('Select Country', 'Please select a country first');
                        }
                      }}
                    >
                      <Text style={city ? styles.dropdownSelectedText : styles.dropdownPlaceholder}>
                        {city || "City"}
                      </Text>
                      <Ionicons name="chevron-down" size={20} color="gray" />
                    </TouchableOpacity>
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
                      autoComplete="new-password"
                      textContentType="newPassword"
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
                </View>

                <View style={styles.inputWrapper}>
                  <Text style={styles.label}>Confirm Password *</Text>
                  <View style={styles.passwordContainer}>
                    <TextInput
                      style={styles.passwordInput}
                      value={confirmPassword}
                      onChangeText={setConfirmPassword}
                      secureTextEntry={!showConfirmPassword}
                      placeholder="Confirm password"
                      placeholderTextColor="#999"
                      autoComplete="new-password"
                      textContentType="newPassword"
                      passwordRules="minlength: 8;"
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
                  <Text style={styles.helperText}>Password must be at least 8 characters</Text>
                </View>

                {/* Notification Preferences */}
                <View style={styles.notificationSection}>
                  <Text style={styles.sectionTitle}>Notification Preferences</Text>
                  <Text style={styles.notificationDescription}>
                    Let us know how you'd like to stay updated:
                  </Text>
                  
                  <View style={styles.notificationGroup}>
                    <Text style={styles.notificationGroupTitle}>App Notifications</Text>
                    <CheckboxItem 
                      label="Artist Alerts" 
                      value={notificationPrefs.artistAlerts}
                      onToggle={() => toggleNotificationPref('artistAlerts')}
                    />
                    <CheckboxItem 
                      label="Event Alerts" 
                      value={notificationPrefs.eventAlerts}
                      onToggle={() => toggleNotificationPref('eventAlerts')}
                    />
                  </View>
                  
                  <View style={styles.notificationGroup}>
                    <Text style={styles.notificationGroupTitle}>Email Notifications</Text>
                    <CheckboxItem 
                      label="Newsletters" 
                      value={notificationPrefs.newsletters}
                      onToggle={() => toggleNotificationPref('newsletters')}
                    />
                  </View>
                </View>

                <View style={styles.termsContainer}>
                  <Text style={styles.termsText}>
                    If selected above, you agree to receive newsletter and event updates.
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
            </View>
          </TouchableWithoutFeedback>
        </ScrollView>
        
        {/* Render modals */}
        {renderCountryModal()}
        {renderCityModal()}
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
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
    marginTop: 80, // Increased to move content down
    paddingHorizontal: 20, // Add padding to account for the back button
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
    pointerEvents: 'box-none',
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
    color: BRAND_COLORS.primaryText,
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
    backgroundColor: 'transparent',
  },
  label: {
    fontSize: 16,
    marginBottom: 8,
    color: BRAND_COLORS.primaryText,
    fontWeight: '500',
    pointerEvents: 'box-none',
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
    color: BRAND_COLORS.primaryText,
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
    color: BRAND_COLORS.primaryText,
  },
  loginLink: {
    color: BRAND_COLORS.accent,
    fontWeight: '500',
  },
  dropdownButton: {
    height: 50,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    paddingHorizontal: 15,
    backgroundColor: '#fff',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  dropdownDisabled: {
    backgroundColor: '#f5f5f5',
    borderColor: '#eee',
  },
  dropdownPlaceholder: {
    color: '#999',
    fontSize: 16,
  },
  dropdownSelectedText: {
    color: BRAND_COLORS.black,
    fontSize: 16,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: 'white',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    paddingBottom: 30,
    maxHeight: height * 0.7,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: BRAND_COLORS.black,
  },
  modalScrollView: {
    maxHeight: height * 0.5,
  },
  modalItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  modalItemText: {
    fontSize: 16,
    color: BRAND_COLORS.black,
  },
  selectedItemText: {
    color: BRAND_COLORS.accent,
    fontWeight: '500',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
    margin: 16,
    marginTop: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#eee',
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    height: 40,
    color: BRAND_COLORS.black,
    fontSize: 16,
  },
  noResultsContainer: {
    padding: 20,
    alignItems: 'center',
  },
  noResultsText: {
    color: 'gray',
    fontSize: 16,
    marginBottom: 12,
  },
  addCustomButton: {
    backgroundColor: BRAND_COLORS.accent,
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
  },
  addCustomButtonText: {
    color: 'white',
    fontWeight: '500',
  },
  notificationSection: {
    marginVertical: 15,
  },
  notificationDescription: {
    fontSize: 14,
    color: BRAND_COLORS.secondaryText || '#666',
    marginBottom: 10,
  },
  notificationGroup: {
    marginBottom: 15,
  },
  notificationGroupTitle: {
    fontSize: 15,
    fontWeight: 'bold',
    color: BRAND_COLORS.primaryText,
    marginBottom: 8,
  },
  checkboxContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 4,
    borderWidth: 2,
    borderColor: '#ccc',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  checkboxLabel: {
    fontSize: 15,
    color: BRAND_COLORS.primaryText,
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
  touchableText: {
    backgroundColor: 'transparent'
  },
  socialAuthContainer: {
    marginBottom: 25,
    alignItems: 'center',
  },
  socialAuthText: {
    fontSize: 16,
    marginBottom: 15,
    color: BRAND_COLORS.primaryText,
  },
  socialButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 8,
    marginBottom: 12,
    width: '100%',
  },
  googleButton: {
    backgroundColor: '#4285F4',
  },
  appleButton: {
    backgroundColor: '#000',
  },
  socialButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 10,
  },
  orContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  divider: {
    flex: 1,
    height: 1,
    backgroundColor: '#ddd',
  },
  orText: {
    paddingHorizontal: 10,
    color: BRAND_COLORS.secondaryText || '#666',
    fontSize: 14,
  },
}); 