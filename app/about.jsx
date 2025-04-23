// app/about.jsx
import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  ScrollView,
  Share,
  Linking,
  Image,
  Platform,
  Dimensions
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { BRAND_COLORS } from './styles/brandColors';

const { width, height } = Dimensions.get('window');

export default function AboutScreen() {
  const router = useRouter();
  
  // Replace these URLs with the actual ones for your app
  const SHOP_URL = "https://shop.voicesradio.co.uk";
  const MIXCLOUD_URL = "https://www.mixcloud.com/VoicesRadio/";
  const INSTAGRAM_URL = "https://www.instagram.com/voices_radio/";
  const INSTAGRAM_APP_URL = "instagram://user?username=voicesradio";
  const WEBSITE_URL = "https://voicesradio.co.uk";
  
  // Handler for sharing the app
  const handleShare = async () => {
    try {
      const result = await Share.share({
        message: 'Check out Voices Radio! Download the app to listen to shows, follow your favorite artists, and more. https://voicesradio.co.uk/app',
        // You can add app store URLs when your app is published
        // url: 'https://apps.apple.com/app/your-app-id'
      });
      
      if (result.action === Share.sharedAction) {
        if (result.activityType) {
          // shared with activity type of result.activityType
          console.log('Shared with activity type:', result.activityType);
        } else {
          // shared
          console.log('Shared successfully');
        }
      } else if (result.action === Share.dismissedAction) {
        // dismissed
        console.log('Share dismissed');
      }
    } catch (error) {
      console.error('Error sharing:', error);
    }
  };
  
  // Handler for opening external links
  const openLink = async (url, appUrl = null) => {
    try {
      // Try to open in app first if appUrl is provided (for Instagram)
      if (appUrl) {
        const canOpenApp = await Linking.canOpenURL(appUrl);
        if (canOpenApp) {
          await Linking.openURL(appUrl);
          return;
        }
      }
      
      // Open in browser if app can't be opened
      const canOpen = await Linking.canOpenURL(url);
      if (canOpen) {
        await Linking.openURL(url);
      } else {
        console.error('Cannot open URL:', url);
      }
    } catch (error) {
      console.error('Error opening link:', error);
    }
  };
  
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <Ionicons name="arrow-back" size={24} color={BRAND_COLORS.primaryText} />
        </TouchableOpacity>
        <Text style={styles.title}>About Voices Radio</Text>
        <View style={styles.placeholder} />
      </View>
      
      <ScrollView contentContainerStyle={styles.contentContainer}>
        {/* Logo Section */}
        <View style={styles.logoContainer}>
          <Image 
            source={require('../assets/logo.png')} 
            style={styles.logo}
            resizeMode="contain"
          />
        </View>
        
        {/* About Text */}
        <Text style={styles.aboutText}>
          Voices Radio is a London-based online radio station. We showcase the finest DJs, producers, 
          and artists from around the world, bringing you a diverse range of electronic music.
        </Text>
        
        {/* Social Links */}
        <View style={styles.socialLinksContainer}>
          <Text style={styles.sectionTitle}>Connect With Us</Text>
          
          <TouchableOpacity 
            style={styles.socialButton}
            onPress={() => openLink(SHOP_URL)}
          >
            <Ionicons name="cart" size={24} color={BRAND_COLORS.accent} />
            <Text style={styles.socialButtonText}>Shop</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.socialButton}
            onPress={() => openLink(INSTAGRAM_URL, INSTAGRAM_APP_URL)}
          >
            <Ionicons name="logo-instagram" size={24} color={BRAND_COLORS.accent} />
            <Text style={styles.socialButtonText}>Instagram</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={styles.socialButton}
            onPress={() => openLink(WEBSITE_URL, WEBSITE_URL)}
          >
            <Ionicons name="logo-web-component" size={24} color={BRAND_COLORS.accent} />
            <Text style={styles.socialButtonText}>Voices Radio Website</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.socialButton}
            onPress={() => openLink(MIXCLOUD_URL)}
          >
            <Ionicons name="cloud" size={24} color={BRAND_COLORS.accent} />
            <Text style={styles.socialButtonText}>Mixcloud</Text>
          </TouchableOpacity>
        </View>
        
        {/* Share App */}
        <View style={styles.shareContainer}>
          <Text style={styles.sectionTitle}>Share The App</Text>
          <TouchableOpacity 
            style={styles.shareButton}
            onPress={handleShare}
          >
            <Ionicons name="share-outline" size={24} color={BRAND_COLORS.background} />
            <Text style={styles.shareButtonText}>Share with Friends</Text>
          </TouchableOpacity>
        </View>
        
        {/* App Info */}
        <View style={styles.appInfoContainer}>
          <Text style={styles.appVersionText}>Voices Radio App</Text>
          <Text style={styles.appVersionText}>Version 1.0.0</Text>
          <Text style={styles.copyrightText}>© 2023 Voices Radio. All rights reserved.</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: BRAND_COLORS.background,
    width: width,
    height: height
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  backButton: {
    padding: 4,
  },
  title: {
    flex: 1,
    textAlign: 'center',
    fontSize: 18,
    fontWeight: 'bold',
    color: BRAND_COLORS.accent,
  },
  placeholder: {
    width: 32,
  },
  contentContainer: {
    padding: 20,
    paddingBottom: 40,
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: 24,
  },
  logo: {
    width: 150,
    height: 150,
  },
  aboutText: {
    fontSize: 16,
    lineHeight: 24,
    color: BRAND_COLORS.primaryText,
    textAlign: 'center',
    marginBottom: 32,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: BRAND_COLORS.primaryText,
    marginBottom: 16,
  },
  socialLinksContainer: {
    marginBottom: 32,
  },
  socialButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    padding: 16,
    borderRadius: 10,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 3,
  },
  socialButtonText: {
    fontSize: 16,
    color: BRAND_COLORS.black,
    marginLeft: 12,
  },
  shareContainer: {
    marginBottom: 32,
  },
  shareButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: BRAND_COLORS.accent,
    padding: 16,
    borderRadius: 10,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 5,
  },
  shareButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: BRAND_COLORS.background,
    marginLeft: 12,
  },
  appInfoContainer: {
    alignItems: 'center',
    marginTop: 32,
  },
  appVersionText: {
    fontSize: 14,
    color: '#888',
    marginBottom: 4,
  },
  copyrightText: {
    fontSize: 12,
    color: '#888',
    marginTop: 8,
  },
});