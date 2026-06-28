import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.inspection.app',
  appName: 'InspectionList',
  webDir: 'dist',
  server: {
    androidScheme: 'http',
  },
};

export default config;
