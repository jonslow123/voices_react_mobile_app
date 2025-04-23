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
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import axios from 'axios';
import { BRAND_COLORS } from './styles/brandColors';

const API_URL = `${process.env.EXPO_PUBLIC_BACKEND_URL}/api/auth`;


export default function ResetPasswordScreen() {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [resetComplete, setResetComplete] = useState(false);
  const router = useRouter();
  const { token } = useLocalSearchParams();

  const handleResetPassword = async () => {
    if (!password || !confirmPassword) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }

    if (password !== confirmPassword) {
      Alert.alert('Error', 'Passwords do not match');
      return;
    }

    if (password.length < 8) {
      Alert.alert('Error', 'Password must be at least 8 characters long');
      return;
    }

    setIsLoading(true);

    try {
      const response = await axios.post(`${API_URL}/reset-password/${token}`, {
        password
      });

      setResetComplete(true);
      
      // Automatically redirect to login after 2 seconds
      setTimeout(() => {
        router.replace('/login');
      }, 2000);

    } catch (error) {
      let errorMessage = 'Failed to reset password';
      
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
        <View style={styles.logoContainer}>
          <Image
            source={require('../assets/logo.png')}
            style={styles.logo}
            resizeMode="contain"
          />
        </View>

        <View style={styles.formContainer}>
          {!resetComplete ? (
            <>
              <Text style={styles.title}>Reset Your Password</Text>
              <Text style={styles.subtitle}>
                Please enter your new password below.
              </Text>

              <View style={styles.inputWrapper}>
                <Text style={styles.label}>New Password</Text>
                <View style={styles.passwordContainer}>
                  <TextInput
                    style={styles.passwordInput}
                    value={password}
                    onChangeText={setPassword}
                    secureTextEntry={!showPassword}
                    placeholder="Enter new password"
                    placeholderTextColor="#999"
                  />
                  <TouchableOpacity
                    style={styles.eyeIcon}
                    onPress={() => setShowPassword(!showPassword)}
                  >
                    <Ionicons
                      name={showPassword ? 'eye-off' : 'eye'}
                      size={24}
                      color={BRAND_COLORS.primaryText}
                    />
                  </TouchableOpacity>
                </View>
              </View>

              <View style={styles.inputWrapper}>
                <Text style={styles.label}>Confirm Password</Text>
                <TextInput
                  style={styles.input}
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                  secureTextEntry={!showPassword}
                  placeholder="Confirm new password"
                  placeholderTextColor="#999"
                />
              </View>

              <TouchableOpacity 
                style={[styles.button, isLoading && styles.buttonDisabled]}
                onPress={handleResetPassword}
                disabled={isLoading}
              >
                <Text style={styles.buttonText}>
                  {isLoading ? 'Resetting...' : 'Reset Password'}
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
              <Text style={styles.successTitle}>Password Reset Complete</Text>
              <Text style={styles.successText}>
                Your password has been successfully reset. You will be redirected to login.
              </Text>
            </View>
          )}
        </View>
      </KeyboardAvoidingView>
    </TouchableWithoutFeedback>
  );
}

const styles = StyleSheet.create({
  // ... Copy the styles from forgot-password.jsx and add these new ones:
  passwordContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 50,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    backgroundColor: '#fff',
  },
  passwordInput: {
    flex: 1,
    height: '100%',
    paddingHorizontal: 15,
    fontSize: 16,
    color: BRAND_COLORS.primaryText,
  },
  eyeIcon: {
    padding: 10,
  },
});