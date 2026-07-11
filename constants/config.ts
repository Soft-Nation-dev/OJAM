// Centralized Configuration Constants

export const APP_CONFIG = {
  // PWA domain. Fallback to divinegraceunn.com.ng if environment variable is not defined.
  // Changing EXPO_PUBLIC_PWA_URL in your .env file or modifying this fallback string
  // allows you to easily switch domains/subdomains.
  pwaUrl: process.env.EXPO_PUBLIC_PWA_URL || "https://ojam.divinegraceunn.com.ng",
};
