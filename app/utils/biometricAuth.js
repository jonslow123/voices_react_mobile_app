// app/utils/biometricAuth.js
import * as LocalAuthentication from 'expo-local-authentication';
import AsyncStorage from '@react-native-async-storage/async-storage';

export const BIOMETRIC_AUTH_ENABLED_KEY = 'biometricAuthEnabled';

// Check if the device supports biometric authentication
export const isBiometricAvailable = async () => {
  const compatible = await LocalAuthentication.hasHardwareAsync();
  
  if (!compatible) {
    return {
      available: false,
      biometryType: null,
      error: 'This device does not support biometric authentication'
    };
  }
  
  // Check if the device has biometric enrolled (configured)
  const enrolled = await LocalAuthentication.isEnrolledAsync();
  if (!enrolled) {
    return {
      available: false,
      biometryType: null,
      error: 'No biometrics enrolled on this device'
    };
  }
  
  // Get the biometry type (Face ID or Touch ID)
  const biometryType = await LocalAuthentication.supportedAuthenticationTypesAsync();
  const biometryTypeName = biometryType.includes(LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION) 
    ? 'Face ID' 
    : 'Touch ID';
  
  return {
    available: true,
    biometryType: biometryTypeName,
    error: null
  };
};

// Save user's preference for biometric auth
export const setBiometricAuthEnabled = async (enabled) => {
  try {
    await AsyncStorage.setItem(BIOMETRIC_AUTH_ENABLED_KEY, JSON.stringify(enabled));
    return true;
  } catch (error) {
    console.error('Error saving biometric auth preference:', error);
    return false;
  }
};

// Get user's preference for biometric auth
export const getBiometricAuthEnabled = async () => {
  try {
    const value = await AsyncStorage.getItem(BIOMETRIC_AUTH_ENABLED_KEY);
    return value !== null ? JSON.parse(value) : false;
  } catch (error) {
    console.error('Error getting biometric auth preference:', error);
    return false;
  }
};

// Authenticate with biometrics
export const authenticateWithBiometrics = async () => {
  try {
    const biometricStatus = await isBiometricAvailable();
    
    if (!biometricStatus.available) {
      return {
        success: false,
        error: biometricStatus.error
      };
    }
    
    const result = await LocalAuthentication.authenticateAsync({
      promptMessage: `Authenticate with ${biometricStatus.biometryType}`,
      cancelLabel: 'Cancel',
      disableDeviceFallback: false, // Allow fallback to passcode if needed
    });
    
    return {
      success: result.success,
      error: result.success ? null : 'Authentication failed'
    };
  } catch (error) {
    return {
      success: false,
      error: error.message
    };
  }
};

export default { 
  isBiometricAvailable, 
  setBiometricAuthEnabled, 
  getBiometricAuthEnabled,
  authenticateWithBiometrics
};