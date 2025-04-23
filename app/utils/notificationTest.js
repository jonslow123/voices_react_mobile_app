export function testNotifications() {
    console.log('Testing notifications import...');
    try {
      const notificationsModule = require('expo-notifications');
      console.log('Notifications import successful:', !!notificationsModule);
      return true;
    } catch (error) {
      console.error('Notifications import failed:', error.message);
      return false;
    }
  }

export default { testNotifications };