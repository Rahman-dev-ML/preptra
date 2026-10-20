import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.preptra.app',
  appName: 'PrepTra',
  webDir: 'public',
  server: {
    url: 'https://preptra-peach.vercel.app',
    cleartext: false,
  },
  plugins: {
    SplashScreen: {
      launchAutoHide: true,
      backgroundColor: '#0B1220',
    },
    StatusBar: {
      style: 'DARK',
    },
  },
};

export default config;
