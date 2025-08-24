import { CapacitorConfig } from '@capacitor/core';

const config: CapacitorConfig = {
  appId: 'app.lovable.53bec2cd62bf4f0892d45b257ac3c4c1',
  appName: 'Elevare',
  webDir: 'dist',
  bundledWebRuntime: false,
  server: {
    url: 'https://53bec2cd-62bf-4f08-92d4-5b257ac3c4c1.lovableproject.com?forceHideBadge=true',
    cleartext: true
  }
};

export default config;