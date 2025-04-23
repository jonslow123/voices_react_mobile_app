// app/utils/deviceSecurity.js
/*import DeviceInfo from 'react-native-device-info';
import { Alert, BackHandler } from 'react-native';

export const checkDeviceSecurity = async () => {
  // Check if the device is jailbroken/rooted
  const isJailBroken = await DeviceInfo.isRooted();
  const isEmulator = await DeviceInfo.isEmulator();
  
  // Decide security risk level
  const isHighRisk = isJailBroken;
  const isMediumRisk = isEmulator && !isHighRisk;
  
  // Handle based on risk level
  if (isHighRisk) {
    Alert.alert(
      'Security Risk Detected',
      'This device appears to be jailbroken or rooted, which compromises security. ' +
      'Please use a secure device to protect your data.',
      [
        { 
          text: 'Exit App', 
          onPress: () => BackHandler.exitApp() 
        },
        {
          text: 'Continue Anyway',
          style: 'destructive',
        }
      ]
    );
    return { secure: false, risk: 'high' };
  }
  
  if (isMediumRisk) {
    Alert.alert(
      'Security Warning',
      'You appear to be running the app in an emulator or test environment.',
      [{ text: 'OK', style: 'default' }]
    );
    return { secure: false, risk: 'medium' };
  }
  
  return { secure: true, risk: 'none' };
};*/