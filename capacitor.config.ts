import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.kmbteam.creative',
  appName: 'KMB Team Creative',
  webDir: 'public',
  server: {
    androidScheme: 'https',
    cleartext: true,
    url: 'https://3000-agqxqil7oeeuwieu6xk65qlg3m.instabox.tech',
  },

  plugins: {
    SplashScreen: {
      launchShowDuration: 1800,
      launchAutoHide: true,
      backgroundColor: '#0f172a',
      androidSplashResourceName: 'splash',
      androidScaleType: 'CENTER_CROP',
      showSpinner: false,
      splashFullScreen: true,
      splashImmersive: true,
    },
    StatusBar: {
      style: 'DARK',
      backgroundColor: '#0f172a',
    },
    LocalNotifications: {
      smallIcon: 'ic_launcher',
      iconColor: '#4f46e5',
    },
  },
};

export default config;

